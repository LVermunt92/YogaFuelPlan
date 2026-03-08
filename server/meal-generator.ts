import { 
  type MealPlanRequest, 
  type InsertMealPlan, 
  type InsertMeal, 
  type User 
} from "@shared/schema";
import { 
  getEnhancedMealsForCategoryAndDiet, 
  getEnhancedMealsByCategory,
  filterEnhancedMealsByDietaryTags,
  type MealOption 
} from "./nutrition-enhanced";
import { ensureRecipeVariety, selectMealsWithBetterVariety } from "./recipe-variety-manager";
import { calculateProteinTarget } from "./nutrition";
import { getCurrentAyurvedicSeason } from "./ayurveda-seasonal";
import { selectProteinOptimizedMeals } from "./smart-protein-selection";
import { selectProteinOptimizedMealsForTarget, calculateUserProteinTarget } from "./protein-target-optimizer";
import { calculateMealFreshnessPriority, sortMealsByFreshness } from "./ingredient-freshness";
import { normalizeToSunday } from "./date-utils";
import { storage } from "./storage";
import { applyDietarySubstitutions } from "./ingredient-substitution";
import { getIntelligentRecipeRecommendation } from './intelligent-ingredient-matcher';
import { classifySugarContent } from './sugar-classifier';

/**
 * Check if a meal contains eggs in its ingredients
 * Used to limit egg-based meals to maximum 1 per day
 */
function mealContainsEggs(meal: MealOption): boolean {
  const eggPatterns = [
    /\beggs?\b/i,           // "egg" or "eggs"
    /\begg\s+white/i,       // "egg white"
    /\begg\s+yolk/i,        // "egg yolk"
    /\bfried\s+egg/i,       // "fried egg"
    /\bpoached\s+egg/i,     // "poached egg"
    /\bscrambled\s+egg/i,   // "scrambled egg"
    /\bomelette\b/i,        // "omelette"
    /\bomelet\b/i,          // "omelet" (American spelling)
    /\bfrittata\b/i,        // "frittata"
    /\bshakshuka\b/i,       // "shakshuka"
  ];
  
  const ingredientsText = meal.ingredients.join(' ').toLowerCase();
  const nameText = meal.name.toLowerCase();
  const combinedText = `${nameText} ${ingredientsText}`;
  
  return eggPatterns.some(pattern => pattern.test(combinedText));
}

/**
 * Resistant starch sources and their benefits for weight management
 */
const RESISTANT_STARCH_SOURCES = {
  // Primary resistant starch ingredients from the image
  'green bananas': { resistantStarchPer100g: 4.7, weightLossBenefit: 'high', tags: ['fruit', 'potassium'] },
  'beans': { resistantStarchPer100g: 3.2, weightLossBenefit: 'high', tags: ['legume', 'fiber', 'protein'] },
  'lentils': { resistantStarchPer100g: 3.4, weightLossBenefit: 'high', tags: ['legume', 'fiber', 'protein'] },
  'brown rice': { resistantStarchPer100g: 3.5, weightLossBenefit: 'medium', tags: ['grain', 'whole-grain'] },
  'oats': { resistantStarchPer100g: 3.6, weightLossBenefit: 'high', tags: ['grain', 'fiber', 'beta-glucan'] },
  'potatoes': { resistantStarchPer100g: 3.6, weightLossBenefit: 'medium', tags: ['starchy-vegetable', 'potassium'] },
  // Additional resistant starch sources
  'sweet potatoes': { resistantStarchPer100g: 2.8, weightLossBenefit: 'medium', tags: ['starchy-vegetable', 'beta-carotene'] },
  'quinoa': { resistantStarchPer100g: 2.9, weightLossBenefit: 'high', tags: ['grain', 'complete-protein'] },
  'chickpeas': { resistantStarchPer100g: 3.1, weightLossBenefit: 'high', tags: ['legume', 'fiber', 'protein'] },
  'black beans': { resistantStarchPer100g: 3.8, weightLossBenefit: 'high', tags: ['legume', 'fiber', 'protein'] }
};

/**
 * Check if a meal contains resistant starch sources
 */
function getMealResistantStarchScore(meal: MealOption): number {
  let score = 0;
  const mealText = `${meal.name} ${meal.ingredients.join(' ')}`.toLowerCase();
  
  for (const [source, data] of Object.entries(RESISTANT_STARCH_SOURCES)) {
    if (mealText.includes(source.toLowerCase()) || 
        mealText.includes(source.replace(' ', '').toLowerCase())) {
      const benefit = data.weightLossBenefit === 'high' ? 3 : 
                     data.weightLossBenefit === 'medium' ? 2 : 1;
      score += benefit * data.resistantStarchPer100g;
    }
  }
  
  return score;
}

/**
 * Prioritize meals with resistant starch for weight loss goals
 */
function applyResistantStarchPreference(meals: MealOption[], user: User): MealOption[] {
  // Only apply resistant starch preference for weight loss goals
  const isWeightLoss = user.goalWeight && user.weight && user.goalWeight < user.weight;
  const hasHighBMI = user.height && user.weight && calculateBMI(user.weight, user.height) > 25;
  
  if (!isWeightLoss && !hasHighBMI) {
    return meals;
  }
  
  console.log(`🌾 RESISTANT STARCH: Applying preference for weight management`);
  
  // Score meals by resistant starch content
  const scoredMeals = meals.map(meal => ({
    meal,
    resistantStarchScore: getMealResistantStarchScore(meal),
    isResistantStarchRich: getMealResistantStarchScore(meal) > 5
  }));
  
  // Sort with resistant starch preference
  return scoredMeals
    .sort((a, b) => {
      // Prioritize resistant starch-rich meals for weight loss
      if (a.isResistantStarchRich && !b.isResistantStarchRich) return -1;
      if (!a.isResistantStarchRich && b.isResistantStarchRich) return 1;
      
      // Then by resistant starch score
      return b.resistantStarchScore - a.resistantStarchScore;
    })
    .map(scored => scored.meal);
}

/**
 * Check if a meal has Anti-Aging tag
 */
function mealHasAntiAgingTag(meal: MealOption): boolean {
  return meal.tags && meal.tags.includes('Anti-Aging');
}

/**
 * Prioritize anti-aging meals to meet daily target (1 anti-aging meal per day)
 */
function applyAntiAgingPreference(meals: MealOption[], currentAntiAgingCount: number, targetAntiAgingMeals: number = 7): MealOption[] {
  // If we've already met the target, don't prioritize anti-aging meals
  if (currentAntiAgingCount >= targetAntiAgingMeals) {
    return meals;
  }
  
  console.log(`🌟 ANTI-AGING PREFERENCE: ${currentAntiAgingCount}/${targetAntiAgingMeals} anti-aging meals selected, prioritizing anti-aging meals`);
  
  // Separate anti-aging and non-anti-aging meals
  const antiAgingMeals = meals.filter(meal => mealHasAntiAgingTag(meal));
  const nonAntiAgingMeals = meals.filter(meal => !mealHasAntiAgingTag(meal));
  
  // Prioritize anti-aging meals by putting them first, then non-anti-aging meals
  return [...antiAgingMeals, ...nonAntiAgingMeals];
}

/**
 * Get current month name for recipe tag matching
 */
function getCurrentMonthTag(): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return months[new Date().getMonth()];
}

/**
 * Apply monthly preference - prioritize recipes tagged with the current month
 * This is a SOFT preference: monthly recipes appear first, then all other recipes
 */
function applySeasonalPreference(meals: MealOption[]): MealOption[] {
  const monthTag = getCurrentMonthTag();
  
  const monthlyMeals = meals.filter(meal => 
    meal.tags && meal.tags.includes(monthTag)
  );
  const nonMonthlyMeals = meals.filter(meal => 
    !meal.tags || !meal.tags.includes(monthTag)
  );
  
  if (monthlyMeals.length > 0) {
    console.log(`🌸 MONTHLY PREFERENCE: Found ${monthlyMeals.length} recipes for ${monthTag}, prioritizing them first`);
  }
  
  return [...monthlyMeals, ...nonMonthlyMeals];
}

/**
 * Map user menstrual phase setting to recipe tag format
 */
function getMenstrualPhaseTag(userPhase: string): string | null {
  const phaseMap: Record<string, string> = {
    'menstrual': 'Menstrual Phase',
    'follicular': 'Follicular Phase',
    'ovulation': 'Ovulation Phase',
    'luteal': 'Luteal Phase'
  };
  return phaseMap[userPhase] || null;
}

/**
 * Apply menstrual cycle phase preference - prioritize recipes tagged with the user's current phase
 * This is a SOFT preference: phase-matching recipes appear first, then all other recipes
 */
function applyMenstrualPhasePreference(meals: MealOption[], user?: User): MealOption[] {
  if (!user?.menstrualPhase || user.menstrualPhase === 'off') {
    return meals;
  }
  
  const phaseTag = getMenstrualPhaseTag(user.menstrualPhase);
  if (!phaseTag) {
    return meals;
  }
  
  const phaseMeals = meals.filter(meal => 
    meal.tags && meal.tags.includes(phaseTag)
  );
  const nonPhaseMeals = meals.filter(meal => 
    !meal.tags || !meal.tags.includes(phaseTag)
  );
  
  if (phaseMeals.length > 0) {
    console.log(`🩸 MENSTRUAL PHASE PREFERENCE: Found ${phaseMeals.length} "${phaseTag}" recipes, prioritizing them first`);
  }
  
  return [...phaseMeals, ...nonPhaseMeals];
}

/**
 * Filter meals to only include low-carb options for dinner
 * Used when user has dinnerLowCarbMaxCarbs setting configured
 */
function filterLowCarbMeals(meals: MealOption[], maxCarbs: number): MealOption[] {
  const lowCarbMeals = meals.filter(meal => {
    const carbs = meal.nutrition?.carbohydrates || 0;
    return carbs <= maxCarbs;
  });
  
  if (lowCarbMeals.length === 0) {
    console.log(`⚠️ LOW-CARB FILTER: No meals found with ≤${maxCarbs}g carbs, falling back to all options`);
    // Sort by carbs and return lowest-carb options
    return [...meals].sort((a, b) => 
      (a.nutrition?.carbohydrates || 0) - (b.nutrition?.carbohydrates || 0)
    ).slice(0, Math.min(10, meals.length));
  }
  
  console.log(`🥗 LOW-CARB FILTER: Found ${lowCarbMeals.length} meals with ≤${maxCarbs}g carbs`);
  return lowCarbMeals;
}

/**
 * Get ingredients to use up from user profile
 */
function getIngredientsToUseUp(user?: User): string[] {
  if (!user?.leftovers) {
    return [];
  }
  
  console.log(`🥬 INGREDIENTS TO USE UP: Found ${user.leftovers.length} ingredients: ${user.leftovers.join(', ')}`);
  return user.leftovers;
}

/**
 * Get recommended day for meal based on ingredient freshness
 */
function getRecommendedDayForMeal(ingredients: string[]): number[] {
  const freshIngredients = ['spinach', 'lettuce', 'herbs', 'berries'];
  const mediumIngredients = ['tomatoes', 'bell peppers', 'mushrooms'];
  
  const hasFresh = ingredients.some(ing => 
    freshIngredients.some(fresh => ing.toLowerCase().includes(fresh))
  );
  const hasMedium = ingredients.some(ing => 
    mediumIngredients.some(medium => ing.toLowerCase().includes(medium))
  );
  
  if (hasFresh) return [2, 3, 4]; // Early in week
  if (hasMedium) return [3, 4, 5, 6]; // Mid-week
  return [2, 3, 4, 5, 6, 7]; // Any day
}

/**
 * Log meal freshness analysis
 */
function logMealFreshnessAnalysis(mealName: string, ingredients: string[]) {
  const recommendedDays = getRecommendedDayForMeal(ingredients);
  console.log(`🥬 ${mealName}: Optimal days ${recommendedDays.join(', ')}`);
}


/**
 * Check which leftover ingredients are naturally present in a meal (without modification)
 */
function checkNaturalIngredientUsage(meal: MealOption, leftovers: string[]): string[] {
  if (!leftovers || leftovers.length === 0) {
    return [];
  }

  const usedIngredients: string[] = [];
  
  // Check which leftover ingredients are naturally present in this meal
  for (const leftoverIngredient of leftovers) {
    const normalizedLeftover = leftoverIngredient.toLowerCase().trim();
    
    // Safety check for meal ingredients
    if (!meal.ingredients || !Array.isArray(meal.ingredients)) {
      console.warn(`⚠️ Meal "${meal.name}" has no ingredients array, skipping natural ingredient check`);
      continue;
    }
    
    // Check if any ingredient in the meal naturally matches the leftover
    const hasIngredient = meal.ingredients.some(ingredient => {
      const normalizedIngredient = ingredient.toLowerCase();
      return normalizedIngredient.includes(normalizedLeftover) || 
             normalizedLeftover.includes(normalizedIngredient.replace(/[^a-z\s]/g, '').trim());
    });
    
    if (hasIngredient) {
      usedIngredients.push(leftoverIngredient);
      console.log(`✓ Recipe naturally uses ingredient: ${leftoverIngredient} in ${meal.name}`);
    }
  }
  
  return usedIngredients;
}

/**
 * Select an unused meal intelligently with fallback logic
 */
function selectUnusedMeal(
  availableMeals: MealOption[], 
  usedMeals: Set<string>, 
  allSelectedMealNames: Set<string>, 
  isLeftover: boolean, 
  fridgeIngredients: string[], 
  ingredientsToUseUp: string[]
): MealOption {
  // Simple implementation to avoid async complications
  const unusedMeals = availableMeals.filter(meal => !usedMeals.has(meal.name));
  if (unusedMeals.length > 0) {
    return unusedMeals[0];
  }
  return availableMeals[0];
}



export interface GeneratedMealPlan {
  mealPlan: InsertMealPlan;
  meals: InsertMeal[];
  usedLeftoverIngredients?: string[];
}

/**
 * Calculate BMI from weight and height
 */
function calculateBMI(weight: number, height: number): number {
  return weight / ((height / 100) ** 2);
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure) using Mifflin-St Jeor equation
 * TDEE = BMR × Activity Level Multiplier
 */
function calculateTDEE(user: User): number {
  if (!user.weight || !user.height || !user.age) {
    console.log('⚠️ TDEE: Missing required user data (weight/height/age), returning default 2000 kcal');
    return 2000; // Default fallback
  }

  // Mifflin-St Jeor BMR calculation
  // Men: BMR = (10 × weight) + (6.25 × height) - (5 × age) + 5
  // Women: BMR = (10 × weight) + (6.25 × height) - (5 × age) - 161
  const weightKg = user.weight;
  const heightCm = user.height;
  const age = user.age;
  
  let bmr: number;
  if (user.gender === 'male') {
    bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5;
  } else if (user.gender === 'female') {
    bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;
  } else {
    // Default to average of male/female for 'other' or unspecified
    const maleBmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5;
    const femaleBmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;
    bmr = (maleBmr + femaleBmr) / 2;
  }

  // Activity level multipliers
  const activityMultipliers = {
    'sedentary': 1.2,    // Little/no exercise
    'light': 1.375,      // Exercise 1-3 days/week
    'moderate': 1.55,    // Exercise 3-5 days/week
    'high': 1.725,       // Exercise 6-7 days/week
    'athlete': 1.9       // Intense exercise 6-7 days/week
  };

  const activityLevel = user.activityLevel || 'moderate';
  const multiplier = activityMultipliers[activityLevel as keyof typeof activityMultipliers] || 1.55;
  
  const tdee = Math.round(bmr * multiplier);
  
  console.log(`📊 TDEE Calculation: BMR=${Math.round(bmr)} × Activity(${activityLevel})=${multiplier} = ${tdee} kcal/day`);
  
  return tdee;
}

/**
 * Calculate target daily calories based on TDEE and user goals
 * Includes maintenance week logic: every 6th week returns to normal calories
 */
function calculateTargetDailyCalories(user: User): number {
  // Calculate TDEE (full daily energy needs)
  const tdee = calculateTDEE(user);
  
  if (!user.weight || !user.goalWeight) {
    console.log(`🎯 No weight goals set, using full TDEE: ${tdee} kcal/day`);
    return tdee;
  }

  const weightDifference = user.goalWeight - user.weight;
  const isLosingWeight = weightDifference < 0;
  const isGainingWeight = weightDifference > 0;

  if (isLosingWeight) {
    // Check if this is a maintenance week (every 6th week)
    const weekNumber = user.weightLossWeekNumber || 1;
    const isMaintenanceWeek = weekNumber % 6 === 0;
    
    if (isMaintenanceWeek) {
      console.log(`🔄 MAINTENANCE WEEK ${weekNumber}: Full TDEE = ${tdee} kcal/day (no reduction)`);
      return tdee;
    } else {
      const targetCalories = Math.round(tdee * 0.85); // Max 15% calorie reduction
      console.log(`📉 WEIGHT LOSS WEEK ${weekNumber}: Target = ${targetCalories} kcal/day (TDEE ${tdee} × 0.85)`);
      return targetCalories;
    }
  } else if (isGainingWeight) {
    const targetCalories = Math.round(tdee * 1.15); // 15% surplus for weight gain
    console.log(`📈 WEIGHT GAIN: Target = ${targetCalories} kcal/day (TDEE ${tdee} × 1.15)`);
    return targetCalories;
  }

  console.log(`⚖️ MAINTENANCE: Target = ${tdee} kcal/day (full TDEE)`);
  return tdee;
}

/**
 * DEPRECATED: Old caloric adjustment function (kept for backwards compatibility)
 * Use calculateTargetDailyCalories() for new TDEE-based approach
 */
function calculateCaloricAdjustment(user: User): number {
  if (!user.weight) return 1.0;

  // For backwards compatibility, return a simple multiplier
  // This will be phased out as we transition to TDEE-based portions
  let adjustment = 1.0;

  if (user.goalWeight) {
    const weightDifference = user.goalWeight - user.weight;
    const isLosingWeight = weightDifference < 0;
    const isGainingWeight = weightDifference > 0;

    if (isLosingWeight) {
      const weekNumber = user.weightLossWeekNumber || 1;
      const isMaintenanceWeek = weekNumber % 6 === 0;
      adjustment = isMaintenanceWeek ? 1.0 : 0.85;
    } else if (isGainingWeight) {
      adjustment = 1.15;
    }
  }

  return adjustment;
}

/**
 * Calculate serving multiplier based on cooking vs eating frequency
 * Database stores all recipes as 1 serving baseline, this function calculates the multiplier
 */
function calculateServingMultiplier(user?: User): number {
  if (!user) return 1.0;
  
  const cookingDays = user.cookingDaysPerWeek || 7;
  const eatingDays = user.eatingDaysAtHome || 7;
  
  // If cooking every day they eat, no multiplier needed
  if (cookingDays >= eatingDays) return 1.0;
  
  // Calculate how many eating days each cooking session needs to cover
  const servingMultiplier = Math.ceil(eatingDays / cookingDays);
  
  console.log(`🍽️ SERVING CALCULATION: ${cookingDays} cooking days for ${eatingDays} eating days = ${servingMultiplier}x servings per recipe`);
  
  return servingMultiplier;
}

/**
 * Apply TDEE-based portion adjustment to all meals
 * Calculates dynamic adjustment factor based on target vs actual calories
 */
function applyTDEEBasedPortionAdjustment(meals: InsertMeal[], user: User | undefined): InsertMeal[] {
  if (!user) {
    console.log('⚠️ No user data, skipping TDEE-based adjustment');
    return meals;
  }

  // Calculate target daily calories based on TDEE and goals
  const targetDailyCalories = calculateTargetDailyCalories(user);
  
  // Sum actual calories from generated meal plan
  const actualTotalCalories = meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
  const mealsPerDay = meals.length / 7; // Average meals per day
  const actualDailyCalories = actualTotalCalories / 7;
  
  // Guard against zero or very low calorie plans
  if (actualDailyCalories < 100) {
    console.log(`⚠️ WARNING: Meal plan has unusually low calories (${Math.round(actualDailyCalories)} kcal/day)`);
    console.log(`⚠️ Skipping TDEE adjustment - check meal calorie data`);
    return meals;
  }
  
  // Calculate dynamic adjustment factor
  const adjustmentFactor = targetDailyCalories / actualDailyCalories;
  
  console.log(`\n🎯 TDEE-BASED PORTION ADJUSTMENT:`);
  console.log(`   Target: ${targetDailyCalories} kcal/day`);
  console.log(`   Actual meal plan: ${Math.round(actualDailyCalories)} kcal/day (${Math.round(actualTotalCalories)} kcal/week)`);
  console.log(`   Adjustment factor: ${adjustmentFactor.toFixed(3)}x`);
  
  // Don't apply extreme adjustments (keep between 0.7 and 1.3)
  const cappedFactor = Math.max(0.7, Math.min(1.3, adjustmentFactor));
  if (cappedFactor !== adjustmentFactor) {
    console.log(`   ⚠️ Factor capped from ${adjustmentFactor.toFixed(3)}x to ${cappedFactor.toFixed(3)}x for safety`);
  }
  
  // Apply adjustment to all meals
  return meals.map(meal => ({
    ...meal,
    portion: cappedFactor === 1.0 
      ? meal.portion 
      : `${meal.portion} (${cappedFactor > 1 ? '+' : ''}${Math.round((cappedFactor - 1) * 100)}%)`,
    protein: Math.round(meal.protein * cappedFactor),
    calories: Math.round((meal.calories || 0) * cappedFactor),
    carbohydrates: Math.round((meal.carbohydrates || 0) * cappedFactor),
    fats: Math.round((meal.fats || 0) * cappedFactor),
    fiber: Math.round((meal.fiber || 0) * cappedFactor),
    sugar: Math.round((meal.sugar || 0) * cappedFactor),
    addedSugar: Math.round((meal.addedSugar || 0) * cappedFactor),
    freeSugar: Math.round((meal.freeSugar || 0) * cappedFactor),
    intrinsicSugar: Math.round((meal.intrinsicSugar || 0) * cappedFactor),
    sodium: Math.round((meal.sodium || 0) * cappedFactor),
    vitaminK: Math.round((meal.vitaminK || 0) * cappedFactor),
    zinc: Math.round(((meal as any).zinc || 0) * cappedFactor * 10) / 10,
  }));
}

// Removed filterMealsByServingRequirements function - recipes now scale dynamically instead of being filtered

/**
 * Adjust meal portion based on caloric needs and serving multiplier
 */
function adjustMealPortion(originalPortion: string, adjustmentFactor: number, servingMultiplier: number = 1): string {
  const totalMultiplier = adjustmentFactor * servingMultiplier;
  
  if (totalMultiplier === 1.0) return originalPortion;
  
  // Build portion description
  let portionText = originalPortion;
  
  // Add serving multiplier info if > 1
  if (servingMultiplier > 1) {
    portionText = `${servingMultiplier}x ${originalPortion}`;
  }
  
  // Add caloric adjustment if needed  
  if (adjustmentFactor !== 1.0) {
    const note = adjustmentFactor > 1.05 ? ' (larger portions)' : 
                 adjustmentFactor < 0.95 ? ' (smaller portions)' : '';
    if (servingMultiplier > 1) {
      // For meal prep mode, just show the multiplier and size note (no "adjusted for goals")
      portionText += note;
    } else if (adjustmentFactor > 1) {
      portionText = `${adjustmentFactor.toFixed(1)}x ${portionText}`;
      portionText += note;
    } else {
      portionText += note;
    }
  }
  
  return portionText;
}

/**
 * Translate Dutch ingredient to English for better matching
 */
function translateDutchIngredientToEnglish(dutchIngredient: string): string {
  const translations: Record<string, string> = {
    // Your original 4 ingredients
    'bleekselderij': 'celery',
    'spinazie': 'spinach', 
    'zoete aardappel': 'sweet potato',
    'erwten': 'peas',
    
    // Expanded vegetable translations
    'wortel': 'carrot',
    'wortels': 'carrots',
    'ui': 'onion',
    'uien': 'onions',
    'knoflook': 'garlic',
    'tomaat': 'tomato',
    'tomaten': 'tomatoes',
    'courgette': 'zucchini',
    'aubergine': 'eggplant',
    'paprika': 'bell pepper',
    
    // Leafy greens
    'sla': 'lettuce',
    'ijsbergsla': 'iceberg lettuce',
    'rucola': 'arugula',
    'boerenkool': 'kale',
    'andijvie': 'endive',
    'veldsla': 'lamb lettuce',
    
    // Cabbage family
    'rode kool': 'red cabbage',
    'witte kool': 'white cabbage', 
    'broccoli': 'broccoli',
    'bloemkool': 'cauliflower',
    'spruitjes': 'brussels sprouts',
    'chinese kool': 'bok choy',
    
    // Mushrooms and fungi
    'champignons': 'mushrooms',
    'kastanjechampignons': 'chestnut mushrooms',
    'shiitake': 'shiitake mushrooms',
    
    // Herbs and aromatics  
    'basilicum': 'basil',
    'peterselie': 'parsley',
    'tijm': 'thyme',
    'rozemarijn': 'rosemary',
    'oregano': 'oregano',
    'dille': 'dill',
    'bieslook': 'chives',
    'koriander': 'cilantro',
    'verse munt': 'fresh mint',
    
    // Cooking variations
    'gehakte ui': 'chopped onion',
    'gesneden ui': 'sliced onion',
    'verse spinazie': 'fresh spinach',
    'bevroren erwten': 'frozen peas',
    'doperwten': 'green peas',
    'sugarsnaps': 'sugar snap peas',
    'peultjes': 'snow peas'
  };
  
  const lower = dutchIngredient.toLowerCase().trim();
  return translations[lower] || dutchIngredient;
}

/**
 * Calculate compatibility score between leftover ingredient and meal
 */
function calculateIngredientCompatibility(leftoverIngredient: string, meal: MealOption): number {
  const leftoverLower = leftoverIngredient.toLowerCase();
  const mealIngredients = meal.ingredients.map(i => i.toLowerCase());
  const mealName = meal.name.toLowerCase();
  
  // Translate Dutch ingredient to English for better matching
  const englishEquivalent = translateDutchIngredientToEnglish(leftoverLower);
  const englishLower = englishEquivalent.toLowerCase();
  
  let score = 0;
  let matchDetails: string[] = [];
  
  console.log(`🔍 INGREDIENT MATCH: Checking "${leftoverIngredient}" (English: "${englishEquivalent}") against meal "${meal.name}"`);
  console.log(`🥗 MEAL INGREDIENTS: ${meal.ingredients.join(', ')}`);
  
  // Helper function for flexible word matching
  const hasWordMatch = (searchTerm: string, targetText: string): boolean => {
    const searchWords = searchTerm.split(/\s+/);
    const targetWords = targetText.split(/\s+/);
    
    // Check if any search word appears in target
    return searchWords.some(searchWord => 
      targetWords.some(targetWord => 
        targetWord.includes(searchWord) || searchWord.includes(targetWord)
      )
    );
  };
  
  // 1. EXACT INGREDIENT MATCH (highest score)
  const exactMatch = mealIngredients.find(ing => 
    ing.includes(leftoverLower) || leftoverLower.includes(ing) ||
    ing.includes(englishLower) || englishLower.includes(ing)
  );
  
  if (exactMatch) {
    score += 15;
    matchDetails.push(`EXACT: "${exactMatch}"`);
    console.log(`✅ EXACT INGREDIENT MATCH: Found "${leftoverIngredient}" in ingredient "${exactMatch}" (score +15)`);
  }
  
  // 2. RECIPE NAME MATCH (high score)
  if (mealName.includes(leftoverLower) || mealName.includes(englishLower)) {
    score += 12;
    matchDetails.push(`NAME: "${meal.name}"`);
    console.log(`✅ RECIPE NAME MATCH: Found "${leftoverIngredient}" in recipe name "${meal.name}" (score +12)`);
  }
  
  // 3. WORD-LEVEL INGREDIENT MATCH (medium-high score)
  const wordMatchIngredient = mealIngredients.find(ing => 
    hasWordMatch(leftoverLower, ing) || hasWordMatch(englishLower, ing)
  );
  
  if (wordMatchIngredient && !exactMatch) {
    score += 8;
    matchDetails.push(`WORD: "${wordMatchIngredient}"`);
    console.log(`✅ WORD-LEVEL MATCH: Found "${leftoverIngredient}" as word in "${wordMatchIngredient}" (score +8)`);
  }
  
  // 4. PARTIAL INGREDIENT MATCH (medium score)
  if (!exactMatch && !wordMatchIngredient) {
    const partialMatch = mealIngredients.find(ing => {
      const searchTerms = [leftoverLower, englishLower];
      return searchTerms.some(term => {
        const termParts = term.split(/\s+/);
        return termParts.some(part => part.length >= 4 && ing.includes(part));
      });
    });
    
    if (partialMatch) {
      score += 5;
      matchDetails.push(`PARTIAL: "${partialMatch}"`);
      console.log(`✅ PARTIAL MATCH: Found part of "${leftoverIngredient}" in "${partialMatch}" (score +5)`);
    }
  }
  
  // 5. CUISINE AND COOKING STYLE COMPATIBILITY
  const cuisineMatches = {
    'spinach': ['mediterranean', 'italian', 'greek', 'pasta', 'lasagna', 'curry', 'stir', 'saute', 'wilted', 'fresh'],
    'celery': ['soup', 'stew', 'broth', 'base', 'mirepoix', 'aromatics', 'chinese', 'asian', 'stirfry'],
    'sweet potato': ['roasted', 'baked', 'mash', 'curry', 'african', 'autumn', 'hash', 'traybake', 'bowl'],
    'peas': ['asian', 'stir', 'curry', 'fresh', 'spring', 'snap', 'rice', 'risotto', 'pasta'],
    'cauliflower': ['indian', 'curry', 'roasted', 'mash', 'rice', 'keto', 'low-carb', 'mediterranean'],
    'sugar snap': ['asian', 'stir', 'chinese', 'thai', 'steam', 'crisp'],
    
    // Add aliases for better matching
    'bleekselderij': ['soup', 'stew', 'broth', 'base', 'mirepoix', 'aromatics', 'chinese', 'asian', 'stirfry'],
    'spinazie': ['mediterranean', 'italian', 'greek', 'pasta', 'lasagna', 'curry', 'stir', 'saute', 'wilted', 'fresh'],
    'zoete aardappel': ['roasted', 'baked', 'mash', 'curry', 'african', 'autumn', 'hash', 'traybake', 'bowl'],
    'erwten': ['asian', 'stir', 'curry', 'fresh', 'spring', 'snap', 'rice', 'risotto', 'pasta']
  };
  
  // Check cuisine compatibility using both original and translated ingredients
  for (const [ingredient, cuisines] of Object.entries(cuisineMatches)) {
    if (englishLower.includes(ingredient) || leftoverLower.includes(ingredient) || 
        ingredient.includes(englishLower) || ingredient.includes(leftoverLower)) {
      for (const cuisine of cuisines) {
        if (mealName.includes(cuisine) || mealIngredients.some(ing => ing.includes(cuisine))) {
          score += 3;
          matchDetails.push(`CUISINE: "${cuisine}"`);
          console.log(`🍽️ CUISINE MATCH: "${leftoverIngredient}" matches "${cuisine}" cuisine (score +3)`);
        }
      }
    }
  }
  
  // 6. COOKING METHOD COMPATIBILITY
  const cookingMethodMatches = {
    'spinach': ['sauté', 'steam', 'wilt', 'fresh', 'raw', 'salad', 'green'],
    'celery': ['sauté', 'soup', 'stew', 'braise', 'aromatics', 'base', 'mirepoix'],
    'sweet potato': ['roast', 'bake', 'mash', 'cube', 'dice', 'hash', 'fries'],
    'peas': ['steam', 'stir', 'fresh', 'snap', 'quick', 'tender'],
    'cauliflower': ['roast', 'steam', 'mash', 'rice', 'grain', 'florets'],
    'sugar snap': ['stir', 'steam', 'crisp', 'crunch', 'fresh'],
    
    // Add Dutch versions
    'bleekselderij': ['sauté', 'soup', 'stew', 'braise', 'aromatics', 'base', 'mirepoix'],
    'spinazie': ['sauté', 'steam', 'wilt', 'fresh', 'raw', 'salad', 'green'],
    'zoete aardappel': ['roast', 'bake', 'mash', 'cube', 'dice', 'hash', 'fries'],
    'erwten': ['steam', 'stir', 'fresh', 'snap', 'quick', 'tender']
  };
  
  for (const [ingredient, methods] of Object.entries(cookingMethodMatches)) {
    if (englishLower.includes(ingredient) || leftoverLower.includes(ingredient) ||
        ingredient.includes(englishLower) || ingredient.includes(leftoverLower)) {
      for (const method of methods) {
        if (mealName.includes(method) || mealIngredients.some(ing => ing.includes(method))) {
          score += 2;
          matchDetails.push(`METHOD: "${method}"`);
          console.log(`👨‍🍳 COOKING MATCH: "${leftoverIngredient}" matches "${method}" method (score +2)`);
        }
      }
    }
  }
  
  // 7. NUTRITIONAL PROFILE COMPATIBILITY
  if (mealIngredients.some(ing => ing.includes('vegetable') || ing.includes('green') || ing.includes('fresh'))) {
    score += 1;
    matchDetails.push('NUTRITION: vegetables/greens');
  }
  
  // Log final result
  if (score > 0) {
    console.log(`🎯 TOTAL SCORE: "${leftoverIngredient}" vs "${meal.name}" = ${score} points [${matchDetails.join(', ')}]`);
  } else {
    console.log(`❌ NO MATCH: "${leftoverIngredient}" vs "${meal.name}" = 0 points`);
  }
  
  return score;
}

/**
 * Search for meals that naturally contain leftover ingredients
 */
async function findMealsWithIngredients(
  ingredientsToUseUp: string[], 
  mealType: 'breakfast' | 'lunch' | 'dinner',
  dietaryTags: string[],
  userId?: number
): Promise<MealOption[]> {
  // Get all meals for the category
  const allMeals = await getEnhancedMealsForCategoryAndDiet(mealType, dietaryTags, userId);
  
  const mealsWithIngredients: Array<MealOption & { ingredientMatches: number; compatibilityScore: number }> = [];
  
  for (const meal of allMeals) {
    let ingredientMatches = 0;
    let totalCompatibility = 0;
    
    for (const leftoverIngredient of ingredientsToUseUp) {
      const compatibility = calculateIngredientCompatibility(leftoverIngredient, meal);
      if (compatibility > 0) {
        ingredientMatches++;
        totalCompatibility += compatibility;
      }
    }
    
    if (ingredientMatches > 0) {
      mealsWithIngredients.push({
        ...meal,
        ingredientMatches,
        compatibilityScore: totalCompatibility
      });
    }
  }
  
  // Sort by compatibility score (highest first)
  return mealsWithIngredients
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
    .map(meal => {
      const { ingredientMatches, compatibilityScore, ...cleanMeal } = meal;
      console.log(`🔍 Found compatible meal: "${meal.name}" (matches: ${ingredientMatches}, score: ${compatibilityScore})`);
      return cleanMeal;
    });
}



/**
 * Check if two meal names are similar enough to be considered duplicates
 * This prevents repetitive recipes like multiple stir-fries or lasagnas
 */
function areMealsSimilar(meal1: string, meal2: string): boolean {
  // Guard against undefined values
  if (!meal1 || !meal2) {
    return false;
  }
  
  if (meal1 === meal2) return true;
  
  const name1 = meal1.toLowerCase().trim();
  const name2 = meal2.toLowerCase().trim();
  
  // Clean both names by removing dietary tags and leftover indicators
  const cleanName1 = name1
    .replace(/\s*\([^)]*\)\s*/g, '') // Remove all parenthetical content
    .replace(/\s*(incorporating|leftover|dairy-free|lactose-free|gluten-free|vegan|vegetarian)\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  const cleanName2 = name2
    .replace(/\s*\([^)]*\)\s*/g, '')
    .replace(/\s*(incorporating|leftover|dairy-free|lactose-free|gluten-free|vegan|vegetarian)\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Check for exact match after cleaning
  if (cleanName1 === cleanName2) {
    console.log(`🔍 EXACT MATCH: "${meal1}" ≈ "${meal2}" (cleaned: "${cleanName1}")`);
    return true;
  }
  
  // Check for high word overlap (75%+ shared words)
  const words1 = cleanName1.split(' ').filter(w => w.length > 2);
  const words2 = cleanName2.split(' ').filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) return false;
  
  const sharedWords = words1.filter(word => words2.includes(word));
  const similarity = sharedWords.length / Math.max(words1.length, words2.length);
  
  if (similarity >= 0.75) {
    console.log(`🔍 HIGH SIMILARITY: "${meal1}" ≈ "${meal2}" (${(similarity * 100).toFixed(1)}% word overlap)`);
    return true;
  }
  
  // Check for specific recipe patterns that should be treated as similar
  const patterns = [
    ['stir-fry', 'stir fry', 'stirfry', 'stir fried'],
    ['lasagna', 'lasagne'],
    ['curry', 'curried'],
    ['noodle', 'noodles', 'rice noodles'],
    ['pasta', 'spaghetti', 'linguine', 'penne'],
    ['pancake', 'pancakes'],
    ['smoothie', 'shake'],
    ['soup', 'broth'],
    ['salad', 'bowl', 'mixed greens']
  ];
  
  for (const pattern of patterns) {
    const has1 = pattern.some(p => cleanName1.includes(p));
    const has2 = pattern.some(p => cleanName2.includes(p));
    
    if (has1 && has2) {
      // Additional check for key ingredients to avoid false positives
      const keyWords1 = words1.filter(w => !['with', 'and', 'the', 'in', 'on', 'to', 'of', 'for', 'sauce'].includes(w));
      const keyWords2 = words2.filter(w => !['with', 'and', 'the', 'in', 'on', 'to', 'of', 'for', 'sauce'].includes(w));
      
      const keyShared = keyWords1.filter(word => keyWords2.includes(word));
      const keySimilarity = keyShared.length / Math.max(keyWords1.length, keyWords2.length);
      
      if (keySimilarity >= 0.5) {
        console.log(`🔍 PATTERN MATCH: "${meal1}" ≈ "${meal2}" (both ${pattern[0]}, ${(keySimilarity * 100).toFixed(1)}% key similarity)`);
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Get recently used meals by reading directly from past meal plans.
 * This is reliable because the meals table is always populated — no
 * separate history table required.
 */
async function getRecentMealHistory(userId: number, weeksBack: number = 2): Promise<string[]> {
  try {
    // Fetch all meal plans for this user, most recent first
    const allPlans = await storage.getMealPlans(userId);
    if (!allPlans || allPlans.length === 0) return [];

    // Sort by weekStart descending and take the most recent `weeksBack` plans
    const sortedPlans = [...allPlans].sort(
      (a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime()
    );
    const recentPlans = sortedPlans.slice(0, weeksBack);

    // Collect all meal names from those plans
    const mealNames: string[] = [];
    for (const plan of recentPlans) {
      const planWithMeals = await storage.getMealPlanWithMeals(plan.id);
      if (planWithMeals?.meals) {
        for (const meal of planWithMeals.meals) {
          const name = (meal as any).foodDescription;
          if (name && name !== 'Eating out') {
            // Strip portion/leftover notes in parentheses
            mealNames.push(name.split(' (')[0].trim());
          }
        }
      }
    }

    if (mealNames.length > 0) {
      console.log(`📊 HISTORY CHECK: Found ${mealNames.length} meals across last ${recentPlans.length} plan(s)`);
      console.log(`📊 Recent meals: ${mealNames.slice(0, 5).join(', ')}${mealNames.length > 5 ? '...' : ''}`);
    } else {
      console.log(`📊 HISTORY CHECK: No previous meal plans found for user ${userId}`);
    }

    return mealNames;
  } catch (error) {
    console.warn('Failed to fetch recent meal plans for variety checking:', error);
    return [];
  }
}

/**
 * Select an unused meal from available options, ensuring intelligent variety and preventing similar recipes
 */
async function selectUnusedMealIntelligently(
  availableMeals: MealOption[], 
  usedMeals: Set<string>, 
  allSelectedMeals: Set<string> = new Set(),
  prioritizeCustom: boolean = false,
  ingredientsToUseUp: string[] = [],
  category: 'breakfast' | 'lunch' | 'dinner' = 'dinner',
  dietaryTags: string[] = [],
  targetProtein: number = 25,
  userId?: number,
  user?: User,
  excludeEggMeals: boolean = false
): Promise<{ meal: MealOption; usedIngredients: string[] }> {
  if (availableMeals.length === 0) {
    throw new Error('No available meals to select from');
  }
  
  // Get recent meal history to prevent week-to-week repetition.
  // Look back only 1 plan (not 2) so the pool isn't exhausted for users
  // with small dietary-restricted recipe sets.
  const recentMealHistory = userId ? await getRecentMealHistory(userId, 1) : [];
  
  console.log(`🔍 VARIETY DEBUG: Starting with ${availableMeals.length} available meals for ${category}`);
  console.log(`🔍 VARIETY DEBUG: Used meals in current week: ${Array.from(usedMeals).join(', ')}`);
  console.log(`🔍 VARIETY DEBUG: All selected meals: ${Array.from(allSelectedMeals).join(', ')}`);
  
  // Add timestamp-based randomization to improve variety across generations
  const randomOffset = (Date.now() % 1000) / 1000;
  
  // First try to find a meal that hasn't been used yet
  let unusedMeals = availableMeals.filter(meal => !usedMeals.has(meal.name));
  console.log(`🔍 VARIETY DEBUG: After filtering used meals: ${unusedMeals.length} meals remaining`);
  
  // Filter out recently used meals from history (cross-week variety)
  if (recentMealHistory.length > 0) {
    const beforeHistory = unusedMeals.length;
    console.log(`🔍 HISTORY DEBUG: Checking ${unusedMeals.length} meals against ${recentMealHistory.length} recent meals`);
    unusedMeals = unusedMeals.filter(meal => {
      const isRecentlyUsed = recentMealHistory.some(historyMeal => {
        const similar = areMealsSimilar(meal.name, historyMeal);
        if (similar) {
          console.log(`🚫 HISTORY BLOCK: "${meal.name}" blocked (similar to recent "${historyMeal}")`);
        }
        return similar;
      });
      return !isRecentlyUsed;
    });
    if (beforeHistory !== unusedMeals.length) {
      console.log(`📊 HISTORY VARIETY: ${beforeHistory} → ${unusedMeals.length} meals after filtering recent history`);
    }
  } else {
    console.log(`📊 HISTORY DEBUG: No recent meal history to check for userId: ${userId}`);
  }
  
  // Prioritize custom recipes if the switch is on
  if (prioritizeCustom && unusedMeals.length > 0) {
    const customMeals = unusedMeals.filter(meal => meal.tags.includes('custom'));
    if (customMeals.length > 0) {
      console.log(`🎯 PRIORITIZING CUSTOM: Found ${customMeals.length} custom recipes out of ${unusedMeals.length} available`);
      unusedMeals = customMeals; // Use only custom recipes
    }
  }
  
  // If we have a global tracker, also filter out similar recipes across all categories
  if (allSelectedMeals && allSelectedMeals.size > 0) {
    const beforeFilter = unusedMeals.length;
    console.log(`🔍 SIMILARITY DEBUG: Checking ${unusedMeals.length} meals against ${allSelectedMeals.size} already selected`);
    console.log(`🔍 SELECTED MEALS: ${Array.from(allSelectedMeals).join(', ')}`);
    unusedMeals = unusedMeals.filter(candidateMeal => {
      const isSimilar = Array.from(allSelectedMeals).some(selectedMeal => {
        const similar = areMealsSimilar(candidateMeal.name, selectedMeal);
        if (similar) {
          console.log(`🚫 SIMILARITY BLOCK: "${candidateMeal.name}" blocked (similar to "${selectedMeal}")`);
        }
        return similar;
      });
      return !isSimilar;
    });
    if (beforeFilter !== unusedMeals.length) {
      console.log(`🔍 SIMILARITY FILTER: ${beforeFilter} → ${unusedMeals.length} meals after similarity filtering`);
    }
  } else {
    console.log(`🔍 SIMILARITY DEBUG: No selected meals to check against yet`);
  }
  
  // MONTHLY PREFERENCE: Prioritize recipes matching the current month (soft preference)
  if (unusedMeals.length > 1) {
    unusedMeals = applySeasonalPreference(unusedMeals);
  }
  
  // MENSTRUAL PHASE PREFERENCE: Prioritize recipes matching the user's cycle phase (soft preference)
  if (unusedMeals.length > 1 && user) {
    unusedMeals = applyMenstrualPhasePreference(unusedMeals, user);
  }
  
  // LUNCH OPTIMIZATION: Prioritize balanced, energy-sustaining meals (NOT low-carb, save that for dinner)
  // Focus on slow carbs, fiber, and protein for sustained afternoon energy
  if (category === 'lunch' && unusedMeals.length > 1) {
    console.log(`🍽️ LUNCH ENERGY: Applying balanced energy filtering for lunch meals (${unusedMeals.length} candidates)`);
    
    // Score meals based on sustained energy factors (NOT low-carb preference)
    const lunchScoredMeals = unusedMeals.map(meal => {
      let score = 0;
      const nutrition = meal.nutrition;
      
      // SLOW CARBS PRIORITY: Check for slow-release carbohydrate sources (great for lunch energy)
      const slowCarbIngredients = meal.ingredients.some(ingredient => {
        const ingredientLower = ingredient.toLowerCase();
        return ingredientLower.includes('quinoa') || 
               ingredientLower.includes('brown rice') || 
               ingredientLower.includes('oats') || 
               ingredientLower.includes('sweet potato') || 
               ingredientLower.includes('beans') || 
               ingredientLower.includes('lentils') || 
               ingredientLower.includes('chickpeas') || 
               ingredientLower.includes('black-eyed peas') || 
               ingredientLower.includes('whole grain') || 
               ingredientLower.includes('steel-cut');
      });
      
      if (slowCarbIngredients) {
        score += 4; // Major bonus for slow carbs - perfect for lunch energy
        console.log(`  ✅ Slow carbs detected in: ${meal.name}`);
      }
      
      // FIBER CONTENT - critical for sustained energy and satiety
      if (nutrition.fiber >= 12) {
        score += 4; // Exceptional fiber
      } else if (nutrition.fiber >= 10) {
        score += 3; // Excellent fiber
      } else if (nutrition.fiber >= 7) {
        score += 2; // Good fiber
      } else if (nutrition.fiber >= 5) {
        score += 1; // Moderate fiber
      }
      
      // Good protein content for satiety (target > 20g)
      if (nutrition.protein >= 25) {
        score += 3; // High protein - great for afternoon
      } else if (nutrition.protein >= 20) {
        score += 2; // Good protein
      } else if (nutrition.protein >= 15) {
        score += 1; // Moderate protein
      }
      
      // Healthy fats for sustained energy (target > 10g)
      if (nutrition.fats >= 15) {
        score += 2; // Good fat content
      } else if (nutrition.fats >= 10) {
        score += 1; // Moderate fat content
      }
      
      // Bonus for energy-sustaining tags (NOT low-carb - that's for dinner)
      if (meal.tags.includes('High-Fiber')) {
        score += 2;
      }
      if (meal.tags.includes('Protein-Rich') || meal.tags.includes('High-Protein')) {
        score += 2;
      }
      if (meal.tags.includes('Slow-Carb') || meal.tags.includes('Complex-Carb')) {
        score += 2;
      }
      
      // NO bonus for Low-Carb or Keto - save those for dinner
      
      return { meal, score, carbs: nutrition.carbohydrates, fiber: nutrition.fiber };
    });
    
    // Sort by score (highest first) and log the top candidates
    lunchScoredMeals.sort((a, b) => b.score - a.score);
    
    console.log(`🍽️ LUNCH ENERGY RANKINGS (Top 5):`);
    lunchScoredMeals.slice(0, 5).forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.meal.name} (Score: ${item.score}, Carbs: ${item.carbs}g, Fiber: ${item.fiber}g)`);
    });
    
    // Use top 50% of energy-sustaining meals for final selection
    const topCandidatesCount = Math.max(1, Math.ceil(lunchScoredMeals.length * 0.5));
    const energySustainingMeals = lunchScoredMeals.slice(0, topCandidatesCount).map(item => item.meal);
    
    console.log(`🍽️ LUNCH ENERGY: Selected top ${energySustainingMeals.length} balanced-energy meals for lunch`);
    unusedMeals = energySustainingMeals;
  }
  
  // Try intelligent ingredient matching first if we have ingredients to use up
  // But only if we still have unused meals available for variety
  if (ingredientsToUseUp.length > 0 && unusedMeals.length > 2) {
    console.log(`🧠 Using intelligent ingredient matching for: ${ingredientsToUseUp.join(', ')} (${unusedMeals.length} unused meals available)`);
    
    try {
      const intelligentRecommendation = await getIntelligentRecipeRecommendation(
        ingredientsToUseUp,
        category,
        dietaryTags,
        targetProtein,
        true // Prefer recipes that use fewer ingredients for better distribution
      );
      
      if (intelligentRecommendation) {
        const { recipe: candidateMeal, usedIngredients } = intelligentRecommendation;
        
        // Check if this meal is available - less restrictive for intelligent matches
        const isUsed = usedMeals.has(candidateMeal.name);
        const isSimilarToGlobal = allSelectedMeals && Array.from(allSelectedMeals).some(selectedMeal => 
          areMealsSimilar(candidateMeal.name, selectedMeal));
        const isInAvailableList = availableMeals.some(meal => meal.name === candidateMeal.name);
        
        console.log(`🔍 Availability check for "${candidateMeal.name}": used=${isUsed}, similar=${isSimilarToGlobal}, available=${isInAvailableList}`);
        
        // Check if meal contains eggs and we need to exclude egg meals
        const containsEggs = mealContainsEggs(candidateMeal);
        const eggBlocked = excludeEggMeals && containsEggs;
        if (eggBlocked) {
          console.log(`🥚 INTELLIGENT MATCH BLOCKED: "${candidateMeal.name}" contains eggs and day already has egg meal`);
        }
        
        // For intelligent ingredient matches, prioritize using ingredients over availability restrictions
        // Only reject if already used, too similar, or blocked by egg limit
        const isAvailable = !isUsed && !isSimilarToGlobal && !eggBlocked;
        console.log(`🎯 INTELLIGENT PRIORITY: Allowing ingredient match even if not in filtered list (available=${isInAvailableList}, eggBlocked=${eggBlocked})`);
            
        if (isAvailable) {
          console.log(`🎯✨ Selected intelligent match: "${candidateMeal.name}" using ingredients: [${usedIngredients.join(', ')}]`);
          
          // Return both the meal and the ingredients it uses
          return {
            meal: candidateMeal,
            usedIngredients: usedIngredients
          };
        } else {
          console.log(`❌ Intelligent match "${candidateMeal.name}" rejected: used=${isUsed}, similar=${isSimilarToGlobal}, available=${isInAvailableList}`);
        }
      }
    } catch (error) {
      console.warn('Failed to get intelligent recommendations, falling back to regular selection:', error);
    }
  }

  if (unusedMeals.length > 0) {
    // Add extra randomization for better variety
    const shuffledUnused = [...unusedMeals];
    for (let i = shuffledUnused.length - 1; i > 0; i--) {
      const j = Math.floor((Math.random() + randomOffset) % 1 * (i + 1));
      [shuffledUnused[i], shuffledUnused[j]] = [shuffledUnused[j], shuffledUnused[i]];
    }
    
    // Use intelligent variety selection with randomized input
    const selectedMeals = selectMealsWithBetterVariety(shuffledUnused, 1, Array.from(usedMeals));
    const selectedMeal = selectedMeals[0] || shuffledUnused[0];
    console.log(`📋 Selected unused meal with enhanced randomization: ${selectedMeal.name} (${unusedMeals.length} unused options available)`);
    return { meal: selectedMeal, usedIngredients: [] };
  }
  
  // If all meals have been used, reset and select with better variety
  if (availableMeals.length > 1) {
    console.log('⚠️ All meals used, resetting for continued variety');
    usedMeals.clear();
    
    // Apply global similarity filtering even after reset
    let resetCandidates = availableMeals;
    if (allSelectedMeals && allSelectedMeals.size > 0) {
      resetCandidates = availableMeals.filter(candidateMeal => {
        return !Array.from(allSelectedMeals).some(selectedMeal => 
          areMealsSimilar(candidateMeal.name, selectedMeal)
        );
      });
      
      // If global filtering removed all options, use intelligent fallback
      if (resetCandidates.length === 0) {
        console.log('⚠️ Global filtering removed all options, using smart fallback with usage counts');
        
        // Count how many times each meal appears in global selection
        const mealUsageCounts = new Map<string, number>();
        Array.from(allSelectedMeals).forEach(selectedMeal => {
          const cleanName = selectedMeal
            .replace(/ \(incorporating leftover.*?\)/g, '')
            .replace(/ \([^)]*\)/g, '')
            .trim().toLowerCase();
          mealUsageCounts.set(cleanName, (mealUsageCounts.get(cleanName) || 0) + 1);
        });
        
        // Find meals that have been used least
        let minUsageCount = Number.MAX_SAFE_INTEGER;
        availableMeals.forEach(meal => {
          const cleanName = meal.name
            .replace(/ \(incorporating leftover.*?\)/g, '')
            .replace(/ \([^)]*\)/g, '')
            .trim().toLowerCase();
          const count = mealUsageCounts.get(cleanName) || 0;
          minUsageCount = Math.min(minUsageCount, count);
        });
        
        // Select only meals with minimum usage count
        resetCandidates = availableMeals.filter(meal => {
          const cleanName = meal.name
            .replace(/ \(incorporating leftover.*?\)/g, '')
            .replace(/ \([^)]*\)/g, '')
            .trim().toLowerCase();
          const count = mealUsageCounts.get(cleanName) || 0;
          return count === minUsageCount;
        });
        
        console.log(`🎯 Smart fallback: Selected ${resetCandidates.length} meals with usage count ${minUsageCount}`);
        
        // If still empty (shouldn't happen), use all available
        if (resetCandidates.length === 0) {
          resetCandidates = availableMeals;
        }
      }
    }
    
    // Add extra shuffle to reset candidates for better variety
    const extraShuffled = [...resetCandidates];
    for (let i = extraShuffled.length - 1; i > 0; i--) {
      const j = Math.floor((Math.random() + randomOffset) % 1 * (i + 1));
      [extraShuffled[i], extraShuffled[j]] = [extraShuffled[j], extraShuffled[i]];
    }
    
    // Use intelligent selection after reset
    const selectedMeals = selectMealsWithBetterVariety(extraShuffled, 1);
    const selectedMeal = selectedMeals?.[0] || extraShuffled?.[0] || availableMeals?.[0];
    
    // Critical safety check - ensure we have a valid meal object
    if (!selectedMeal) {
      console.error(`❌ CRITICAL: No meal available after all selection attempts`);
      console.error(`❌ DEBUG: availableMeals.length = ${availableMeals.length}`);
      console.error(`❌ DEBUG: extraShuffled.length = ${extraShuffled?.length || 0}`);
      console.error(`❌ DEBUG: selectedMeals = ${selectedMeals?.length || 0}`);
      throw new Error('No meals available for selection');
    }
    
    console.log(`📋 Reset and selected with enhanced randomization: ${selectedMeal.name} (from ${resetCandidates.length} filtered options)`);
    return { meal: selectedMeal, usedIngredients: [] };
  } else {
    // Only one meal available, use it
    console.log(`⚠️ Only one meal option available: ${availableMeals[0].name}`);
    return { meal: availableMeals[0], usedIngredients: [] };
  }
}

/**
 * Plan cooking and eating schedule
 */
function planCookingDays(user?: User): { cookingDays: number[], eatingDays: number[] } {
  const cookingDaysPerWeek = user?.cookingDaysPerWeek || 3;
  const eatingDaysAtHome = user?.eatingDaysAtHome || 6;
  
  // Simple fixed pattern for Sunday night cooking
  if (cookingDaysPerWeek >= 6 && eatingDaysAtHome >= 6) {
    return {
      cookingDays: [7, 2, 4], // Sunday, Tuesday, Thursday
      eatingDays: [7, 1, 2, 3, 4, 5, 6].slice(0, eatingDaysAtHome)
    };
  }
  
  // Prioritize weekdays for cooking (Sunday prep + weekdays)
  const cookingDays: number[] = [];
  if (cookingDaysPerWeek >= 1) cookingDays.push(7); // Sunday prep
  if (cookingDaysPerWeek >= 2) cookingDays.push(2); // Tuesday
  if (cookingDaysPerWeek >= 3) cookingDays.push(4); // Thursday
  if (cookingDaysPerWeek >= 4) cookingDays.push(1); // Monday
  if (cookingDaysPerWeek >= 5) cookingDays.push(6); // Saturday
  if (cookingDaysPerWeek >= 6) cookingDays.push(3); // Wednesday
  if (cookingDaysPerWeek >= 7) cookingDays.push(5); // Friday
  
  // Eating days - prioritize weekdays and when cooking happens
  const eatingDays: number[] = [];
  // Always include cooking days as eating days
  cookingDays.forEach(day => {
    if (eatingDays.length < eatingDaysAtHome) {
      eatingDays.push(day);
    }
  });
  
  // Add additional eating days (leftovers)
  const remainingDays = [1, 2, 3, 4, 5, 6, 7].filter(day => !eatingDays.includes(day));
  for (let i = 0; i < remainingDays.length && eatingDays.length < eatingDaysAtHome; i++) {
    eatingDays.push(remainingDays[i]);
  }
  
  return { cookingDays: cookingDays.slice(0, cookingDaysPerWeek), eatingDays: eatingDays.slice(0, eatingDaysAtHome) };
}

export async function generateWeeklyMealPlan(request: MealPlanRequest, user?: User): Promise<GeneratedMealPlan> {
  console.time('⏱️  Total meal plan generation');
  
  // Normalize weekStart to Sunday for consistent week boundaries
  const normalizedWeekStart = normalizeToSunday(request.weekStart);
  console.log(`📅 Week normalized: ${request.weekStart} → ${normalizedWeekStart} (Sunday start)`);
  
  // Calculate personalized protein target based on user profile
  let dailyProteinTarget: number;
  if (user) {
    dailyProteinTarget = calculateUserProteinTarget(user);
    console.log(`🎯 Using personalized protein target: ${dailyProteinTarget}g/day (based on user profile)`);
  } else {
    // Convert 'moderate' to 'low' as fallback since calculateProteinTarget only accepts 'high' | 'low'
    const activityLevel = request.activityLevel === 'moderate' ? 'low' : request.activityLevel as 'high' | 'low';
    dailyProteinTarget = calculateProteinTarget(activityLevel);
    console.log(`🎯 Using activity-based protein target: ${dailyProteinTarget}g/day (fallback)`);
  }
  
  const meals: InsertMeal[] = [];
  let totalWeeklyProtein = 0;
  let dietaryTags = request.dietaryTags || [];
  
  // Add menstrual phase as a dietary tag if user has selected a phase (not 'off')
  if (user?.menstrualPhase && user.menstrualPhase !== 'off') {
    // Convert menstrual phase to a valid dietary tag format
    const phaseTag = `menstrual-${user.menstrualPhase}` as any;
    dietaryTags = [...dietaryTags, phaseTag];
    console.log(`🩸 Added menstrual phase "${user.menstrualPhase}" as tag "${phaseTag}" to dietary tags: [${dietaryTags.join(', ')}]`);
  }
  
  // Get ingredients to use up from user profile
  const ingredientsToUseUp = getIngredientsToUseUp(user);
  let remainingIngredientsToUseUp = [...ingredientsToUseUp];
  
  console.log(`🥕 Starting meal generation with ingredients to use up: ${JSON.stringify(ingredientsToUseUp)}`);
  
  // Keep all leftover ingredients for intelligent recipe matching
  if (ingredientsToUseUp.length > 0) {
    console.log(`🥕 Will find recipes that naturally use these ingredients: ${JSON.stringify(ingredientsToUseUp)}`);
  }
  
  // Calculate caloric adjustment based on user goals
  const caloricAdjustment = user ? calculateCaloricAdjustment(user) : 1.0;
  
  // Calculate serving multiplier based on cooking vs eating frequency
  const servingMultiplier = calculateServingMultiplier(user);
  
  // Use direct user settings for meal prep mode decision
  const userCookingDays = user?.cookingDaysPerWeek || 7;
  const userEatingDays = user?.eatingDaysAtHome || 7;
  console.log(`🍳 User schedule: ${userCookingDays} cooking days, ${userEatingDays} eating days`);
  console.log(`🔍 USER DEBUG: cookingDaysPerWeek=${user?.cookingDaysPerWeek}, eatingDaysAtHome=${user?.eatingDaysAtHome}`);
  console.log(`🔍 USER DEBUG: useOnlyMyRecipes=${user?.useOnlyMyRecipes}, user.id=${user?.id}`);
  
  // Check if we should use meal prep mode (cooking days < eating days).
  // Only enter meal prep mode when there are 2+ leftover days (eatingDays - cookingDays >= 2).
  // When there is only 1 leftover day (e.g. 4/5, 6/7) the hardcoded every-other-day leftover
  // pattern in generateMealPrepPlan would produce only half the expected unique meal combinations.
  // Regular mode gives a unique meal every eating day and handles the serving multiplier for
  // larger batch sizes, which is exactly what users with a near-1:1 ratio expect.
  const leftoverDaysNeeded = userEatingDays - userCookingDays;
  const useMealPrepMode = userCookingDays < userEatingDays && leftoverDaysNeeded >= 2;
  console.log(`🍳 Meal prep mode check: ${userCookingDays} cooking < ${userEatingDays} eating? leftoverDays=${leftoverDaysNeeded}, useMealPrep=${useMealPrepMode}`);
  if (useMealPrepMode) {
    console.log(`🎯 ENTERING MEAL PREP MODE: ${userCookingDays} cooking days for ${userEatingDays} eating days (${leftoverDaysNeeded} leftover days)`);
    console.log(`🔍 CALLING MEAL PREP with user: ${user?.id}, useOnlyMyRecipes: ${user?.useOnlyMyRecipes}`);
    console.log(`🔍 MEAL PREP USER OBJECT:`, JSON.stringify(user, null, 2));
    
    // User recipe preference controlled by profile settings
    
    console.log(`🚀 ABOUT TO CALL generateMealPrepPlan...`);
    const result = await generateMealPrepPlan(request, user, caloricAdjustment, servingMultiplier, ingredientsToUseUp, dailyProteinTarget);
    console.log(`🚀 MEAL PREP RESULT RECEIVED, meal count: ${result.meals.length}`);
    return result;
  } else {
    console.log(`🚨 USING REGULAR MODE: ${userCookingDays} cooking >= ${userEatingDays} eating`);
  }

  // Use regular 8-day Sunday cooking pattern for other cases
  console.log('Using 8-day Sunday cooking pattern');

  // Check if user wants only their own recipes
  const useOnlyMyRecipes = user?.useOnlyMyRecipes === true;
  console.log(`🍽️ Recipe source preference: ${useOnlyMyRecipes ? 'User recipes only' : 'All recipes'}`);

  let breakfastOptions, lunchOptions, dinnerOptions;

  if (useOnlyMyRecipes) {
    // Use user's custom recipes with smart fallback
    console.log('🚀 Loading user recipes with smart fallback');
    // Use imported storage
    const userRecipes = await storage.getUserRecipes(user.id);
    
    // Convert user recipes to MealOption format
    const convertUserRecipeToMealOption = (recipe: any): MealOption => ({
      id: recipe.id, // Use numeric recipe ID directly
      name: recipe.name,
      portion: recipe.portion || '1 serving',
      ingredients: recipe.ingredients || [],
      nutrition: {
        protein: recipe.nutrition?.protein || 15,
        prepTime: recipe.prepTime || 30,
        calories: recipe.nutrition?.calories || 400,
        carbohydrates: recipe.nutrition?.carbohydrates || 40,
        fats: recipe.nutrition?.fats || 15,
        fiber: recipe.nutrition?.fiber || 8,
        sugar: recipe.nutrition?.sugar || 10,
        sodium: recipe.nutrition?.sodium || 300,
      },
      tags: [...(recipe.tags || []), 'custom'], // Always add 'custom' tag to user recipes
      category: recipe.mealTypes?.[0] || 'dinner' as 'breakfast' | 'lunch' | 'dinner',
      wholeFoodLevel: 'moderate' as 'minimal' | 'moderate' | 'high',
      vegetableContent: {
        servings: 2,
        vegetables: ['mixed vegetables'],
        benefits: ['Nutritious whole foods']
      },
      recipe: {
        instructions: recipe.instructions || [],
        tips: recipe.tips || [],
        notes: recipe.notes || ''
      }
    });
    
    // Get user recipes by meal type (more permissive filtering for user's own recipes)
    const filterUserRecipeByDiet = (recipe: any): boolean => {
      // For user's own recipes, assume they match their dietary preferences unless explicitly conflicting
      // Only exclude if recipe has conflicting tags (e.g., "non-vegetarian" for vegetarian user)
      if (dietaryTags.includes('vegetarian') || dietaryTags.includes('vegan')) {
        if (recipe.tags.includes('non-vegetarian') || recipe.tags.includes('pescatarian')) {
          console.log(`🚫 Excluding user recipe with conflicting dietary tag: ${recipe.name}`);
          return false;
        }
      }
      // Include the recipe (assume user created it to match their dietary needs)
      return true;
    };

    const userBreakfastOptions = userRecipes
      .filter(recipe => 
        recipe.mealTypes.includes('breakfast') && filterUserRecipeByDiet(recipe)
      )
      .map(convertUserRecipeToMealOption);
      
    const userLunchOptions = userRecipes
      .filter(recipe => 
        recipe.mealTypes.includes('lunch') && filterUserRecipeByDiet(recipe)
      )
      .map(convertUserRecipeToMealOption);
      
    const userDinnerOptions = userRecipes
      .filter(recipe => 
        recipe.mealTypes.includes('dinner') && filterUserRecipeByDiet(recipe)
      )
      .map(convertUserRecipeToMealOption);
    
    console.log(`📊 User recipes found: ${userBreakfastOptions.length} breakfast, ${userLunchOptions.length} lunch, ${userDinnerOptions.length} dinner`);
    
    // Use ONLY user recipes (no fallback mixing)
    console.log('🔒 Using ONLY personal recipes (no curated database mixing)');
    
    breakfastOptions = userBreakfastOptions;
    lunchOptions = userLunchOptions;
    dinnerOptions = userDinnerOptions;
    
    console.log(`📊 Using ONLY user recipes: ${breakfastOptions.length} breakfast, ${lunchOptions.length} lunch, ${dinnerOptions.length} dinner`);
  } else {
    // Fast recipe loading: Use existing database for maximum speed + custom recipes
    console.log('🚀 Fast recipe loading using existing database + custom recipes');
    const rawBreakfastOptions = await getEnhancedMealsForCategoryAndDiet('breakfast', dietaryTags, user?.id);
    const rawLunchOptions = await getEnhancedMealsForCategoryAndDiet('lunch', dietaryTags, user?.id);
    const rawDinnerOptions = await getEnhancedMealsForCategoryAndDiet('dinner', dietaryTags, user?.id);
    
    // Use raw options without serving size filtering - recipes will be dynamically scaled
    breakfastOptions = rawBreakfastOptions;
    lunchOptions = rawLunchOptions;
    dinnerOptions = rawDinnerOptions;
  }
  
  console.log(`📊 Available recipes: ${breakfastOptions.length} breakfast, ${lunchOptions.length} lunch, ${dinnerOptions.length} dinner`);
  console.log(`🔍 Dietary tags being used: [${dietaryTags.join(', ')}]`);
  
  // Debug: Show first few recipes for each category
  if (lunchOptions.length > 0) {
    console.log(`🍽️ Sample lunch recipes: ${lunchOptions.slice(0, 3).map(m => m.name).join(', ')}`);
  }
  if (dinnerOptions.length > 0) {
    console.log(`🍽️ Sample dinner recipes: ${dinnerOptions.slice(0, 3).map(m => m.name).join(', ')}`);
  }
  
  // If very few recipes available, broaden dietary search to avoid empty results
  if (lunchOptions.length < 3 || dinnerOptions.length < 3) {
    console.log(`⚠️ Very few recipes available for [${dietaryTags.join(', ')}], will use broader dietary matching if needed`);
  }

  // Track used meals to ensure variety in cooking moments
  const usedBreakfastMeals: Set<string> = new Set();
  const usedLunchMeals: Set<string> = new Set();
  const usedDinnerMeals: Set<string> = new Set();
  
  // Track all selected meal names to prevent similar recipes across all categories
  const allSelectedMealNames: Set<string> = new Set();
  
  // Track anti-aging meals (target: 1 anti-aging meal per day = 7 per week)
  let antiAgingMealCount = 0;
  const targetAntiAgingMeals = 7; // 1 anti-aging meal per day for longevity support

  // Track egg-based meals per day (max 1 egg meal per day)
  const eggMealsPerDay: Map<number, number> = new Map();
  const MAX_EGG_MEALS_PER_DAY = 1;

  // Track which meals to use as leftovers
  let sundayDinnerMeal: MealOption | null = null;
  let mondayDinnerMeal: MealOption | null = null;
  let tuesdayDinnerMeal: MealOption | null = null;
  let wednesdayDinnerMeal: MealOption | null = null;
  let thursdayDinnerMeal: MealOption | null = null;
  
  // BREAKFAST BATCH COOKING: Track breakfast for 2-day pairing
  // Day 2 (Mon): Cook breakfast A → Day 3 (Tue): Leftover A
  // Day 4 (Wed): Cook breakfast B → Day 5 (Thu): Leftover B
  // Day 6 (Fri): Cook breakfast C → Day 7 (Sat): Leftover C
  let mondayBreakfastMeal: MealOption | null = null;
  let wednesdayBreakfastMeal: MealOption | null = null;
  let fridayBreakfastMeal: MealOption | null = null;
  
  // Get user settings for meal planning
  const eatingDaysAtHome = user?.eatingDaysAtHome || 7;
  
  console.log(`🎯 USER SETTINGS: ${eatingDaysAtHome} eating days`);
  
  // Loop through days 1-7 (Sunday through Saturday)
  // Only generate meals for consecutive days based on eatingDaysAtHome
  // Day 1 = Sunday, Day 2 = Monday, Day 3 = Tuesday, Day 4 = Wednesday, Day 5 = Thursday, Day 6 = Friday, Day 7 = Saturday
  for (let day = 1; day <= 7; day++) {
    let dailyProtein = 0;
    
    // Check if this day should have meals (consecutive days starting from Sunday)
    const shouldHaveMeals = day <= eatingDaysAtHome;
    
    // Determine which meals to generate for this day
    let mealsToGenerate: ('breakfast' | 'lunch' | 'dinner')[] = [];
    
    if (!shouldHaveMeals) {
      // Skip days beyond eating days count
      console.log(`🌅 Day ${day}: SKIPPED (beyond ${eatingDaysAtHome} eating days)`);
      continue;
    }
    
    if (day === 1) {
      // Day 1: Sunday evening - check if dinner is enabled
      if (user?.includeDinner !== false) {
        mealsToGenerate = ['dinner'];
        console.log(`🌅 Day ${day} (Sunday evening): ONLY dinner`);
      } else {
        console.log(`🌅 Day ${day} (Sunday evening): SKIPPED (dinner disabled in user preferences)`);
        continue;
      }
    } else {
      // Other days: Generate meals based on user's meal type preferences
      mealsToGenerate = [];
      
      // Check which meals are enabled in user preferences
      const breakfastEnabled = user?.includeBreakfast === true;
      const lunchEnabled = user?.includeLunch !== false; // Default to true
      const dinnerEnabled = user?.includeDinner !== false; // Default to true
      
      if (breakfastEnabled) mealsToGenerate.push('breakfast');
      if (lunchEnabled) mealsToGenerate.push('lunch');
      if (dinnerEnabled) mealsToGenerate.push('dinner');
      
      console.log(`🌅 Day ${day}: ${mealsToGenerate.length} meals (${mealsToGenerate.join(', ')}) - based on user preferences: breakfast=${breakfastEnabled}, lunch=${lunchEnabled}, dinner=${dinnerEnabled}`);
      
      // If no meals are enabled, skip this day
      if (mealsToGenerate.length === 0) {
        console.log(`🌅 Day ${day}: SKIPPED (no meal types enabled in user preferences)`);
        continue;
      }
    }

    for (const mealCategory of mealsToGenerate) {
      // Get cached meals for this category (much faster than repeated database queries)
      let availableMeals = mealCategory === 'breakfast' ? [...breakfastOptions] : 
                          mealCategory === 'lunch' ? [...lunchOptions] : 
                          [...dinnerOptions];
      
      // Apply summer filtering for ALL ayurvedic meals - regardless of user's dietary selection
      // All ayurvedic recipes should follow seasonal guidelines during grishma season
      const currentSeason = getCurrentAyurvedicSeason(new Date(), 'europe');
      if (currentSeason === 'grishma') {
        const originalCount = availableMeals.length;
        availableMeals = availableMeals.filter(meal => {
          if (!meal.tags.includes('ayurvedic')) return true; // Keep non-ayurvedic meals
          
          const hasWarmingTags = meal.tags.includes('warming');
          const hasHeatingSpices = meal.ingredients.some(ingredient => 
            ingredient.toLowerCase().includes('ginger') ||
            ingredient.toLowerCase().includes('turmeric') ||
            ingredient.toLowerCase().includes('cumin') ||
            ingredient.toLowerCase().includes('garam masala') ||
            ingredient.toLowerCase().includes('mustard seeds') ||
            ingredient.toLowerCase().includes('cinnamon') ||
            ingredient.toLowerCase().includes('cardamom') ||
            ingredient.toLowerCase().includes('cloves')
          );
          
          if (hasWarmingTags || hasHeatingSpices) {
            console.log(`🚫 Summer exclusion: ${meal.name} removed (ayurvedic recipe with inappropriate warming characteristics for grishma season)`);
            return false; // Exclude warming recipes completely
          }
          return true; // Keep cooling/neutral ayurvedic recipes
        });
        
        if (originalCount !== availableMeals.length) {
          console.log(`Summer filter: ${originalCount} → ${availableMeals.length} ${mealCategory} meals (excluded warming ayurvedic recipes)`);
        }
      }
      
      // Apply seasonal month filtering for ALL recipes
      const currentMonth = new Date().toLocaleString('en-US', { month: 'long' }); // e.g., "November"
      const monthTags = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const originalCountBeforeMonthFilter = availableMeals.length;
      availableMeals = availableMeals.filter(meal => {
        // Check if recipe has any month tags
        const recipeMonthTags = meal.tags.filter(tag => monthTags.includes(tag));
        
        // If recipe has no month tags, it's available year-round - keep it
        if (recipeMonthTags.length === 0) return true;
        
        // If recipe has month tags, only keep it if current month is included
        if (recipeMonthTags.includes(currentMonth)) {
          return true;
        } else {
          console.log(`📅 Seasonal exclusion: "${meal.name}" removed (available in ${recipeMonthTags.join(', ')}, not ${currentMonth})`);
          return false;
        }
      });
      
      if (originalCountBeforeMonthFilter !== availableMeals.length) {
        console.log(`📅 Seasonal month filter: ${originalCountBeforeMonthFilter} → ${availableMeals.length} ${mealCategory} meals (current month: ${currentMonth})`);
      }
      
      // Apply 45-minute cooking time limit for weekdays (Monday-Friday)
      const isWeekday = day >= 2 && day <= 6; // Days 2-6 are Monday-Friday (Day 1 = Sunday)
      if (isWeekday && (mealCategory === 'lunch' || mealCategory === 'dinner')) {
        const originalCount = availableMeals.length;
        availableMeals = availableMeals.filter(meal => meal.nutrition.prepTime <= 45);
        console.log(`Weekday time filter: ${originalCount} → ${availableMeals.length} ${mealCategory} meals (≤45min)`);
      }
      
      if (availableMeals.length === 0) {
        console.error(`CRITICAL: No ${mealCategory} meals available for dietary restrictions: ${dietaryTags.join(', ')}. Skipping this meal.`);
        continue; // Skip this meal instead of using inappropriate fallback
      }

      // Apply personalized protein optimization based on user's individual target
      if (user) {
        const originalCount = availableMeals.length;
        const originalAvgProtein = availableMeals.reduce((sum, m) => sum + m.nutrition.protein, 0) / availableMeals.length;
        console.log(`🎯 Before protein optimization: ${originalCount} ${mealCategory} meals, avg ${originalAvgProtein.toFixed(1)}g protein`);
        
        // Use user's personal protein target for optimization
        availableMeals = selectProteinOptimizedMealsForTarget(availableMeals, mealCategory, user);
        
        const enhancedAvgProtein = availableMeals.reduce((sum, m) => sum + m.nutrition.protein, 0) / availableMeals.length;
        console.log(`🎯 After protein optimization: ${availableMeals.length} ${mealCategory} meals, avg ${enhancedAvgProtein.toFixed(1)}g protein`);
        
        // Apply resistant starch preference for weight loss goals
        availableMeals = applyResistantStarchPreference(availableMeals, user);
        
        // Apply anti-aging preference (1 anti-aging meal per day for longevity)
        availableMeals = applyAntiAgingPreference(availableMeals, antiAgingMealCount, targetAntiAgingMeals);
      } else {
        // Fallback to activity-level based optimization if no user data
        const shouldOptimizeProtein = request.activityLevel === 'high';
        if (shouldOptimizeProtein) {
          availableMeals = selectProteinOptimizedMeals(availableMeals, availableMeals.length, true);
          console.log(`🥩 Applied fallback protein optimization for high activity level`);
        }
      }

      // Apply egg limit constraint: max 1 egg-based meal per day
      const currentDayEggCount = eggMealsPerDay.get(day) || 0;
      if (currentDayEggCount >= MAX_EGG_MEALS_PER_DAY) {
        const originalCount = availableMeals.length;
        const nonEggMeals = availableMeals.filter(meal => !mealContainsEggs(meal));
        // Only apply filter if we still have options without eggs
        if (nonEggMeals.length > 0) {
          availableMeals = nonEggMeals;
          console.log(`🥚 Egg limit filter: ${originalCount} → ${availableMeals.length} ${mealCategory} meals (day ${day} already has ${currentDayEggCount} egg meal(s))`);
        } else {
          console.log(`🥚 Egg limit: All remaining ${mealCategory} options contain eggs, keeping them available`);
        }
      }

      // Implement Sunday night cooking pattern logic
      let isLeftover = false;
      let selectedMeal: MealOption;
      let intelligentlyUsedIngredients: string[] = [];
      
      if (day === 1 && mealCategory === 'dinner') {
        // Day 1: Sunday dinner - FIRST cooking moment (only meal on Sunday)
        const sundayDinnerResult = await selectUnusedMealIntelligently(availableMeals, usedDinnerMeals, allSelectedMealNames, false, ingredientsToUseUp, 'dinner', dietaryTags, dailyProteinTarget, user?.id, user);
        selectedMeal = sundayDinnerResult.meal;
        sundayDinnerMeal = selectedMeal;
        usedDinnerMeals.add(selectedMeal.name);
        allSelectedMealNames.add(selectedMeal.name);
        console.log(`🍽️ Day 1 Sunday dinner: "${selectedMeal.name}" (Global tracker now has ${allSelectedMealNames.size} unique meals)`);
      } else if (day === 2 && mealCategory === 'lunch') {
        // Day 2: Monday lunch - leftover from Sunday dinner
        if (!sundayDinnerMeal) {
          throw new Error('Sunday dinner meal not found for Monday lunch leftover');
        }
        selectedMeal = sundayDinnerMeal;
        isLeftover = true;
      } else if (day === 2 && mealCategory === 'dinner') {
        // Day 2: Monday dinner - fresh cooking
        const mondayDinnerResult = await selectUnusedMealIntelligently(availableMeals, usedDinnerMeals, allSelectedMealNames, false, ingredientsToUseUp, 'dinner', dietaryTags, dailyProteinTarget, user?.id, user);
        selectedMeal = mondayDinnerResult.meal;
        mondayDinnerMeal = selectedMeal;
        usedDinnerMeals.add(selectedMeal.name);
        allSelectedMealNames.add(selectedMeal.name);
        console.log(`🍽️ Day 2 Monday dinner: "${selectedMeal.name}" (Global tracker now has ${allSelectedMealNames.size} unique meals)`);
      } else if (day === 3 && mealCategory === 'lunch') {
        // Day 3: Tuesday lunch - leftover from Monday dinner
        if (!mondayDinnerMeal) {
          throw new Error('Monday dinner meal not found for Tuesday lunch leftover');
        }
        selectedMeal = mondayDinnerMeal;
        isLeftover = true;
      } else if (day === 3 && mealCategory === 'dinner') {
        // Day 3: Tuesday dinner - fresh cooking
        const tuesdayDinnerResult = await selectUnusedMealIntelligently(availableMeals, usedDinnerMeals, allSelectedMealNames, false, ingredientsToUseUp, 'dinner', dietaryTags, dailyProteinTarget, user?.id, user);
        selectedMeal = tuesdayDinnerResult.meal;
        tuesdayDinnerMeal = selectedMeal;
        usedDinnerMeals.add(selectedMeal.name);
        allSelectedMealNames.add(selectedMeal.name);
        console.log(`🍽️ Day 3 Tuesday dinner: "${selectedMeal.name}" (Global tracker now has ${allSelectedMealNames.size} unique meals)`);
      } else if (day === 4 && mealCategory === 'lunch') {
        // Day 4: Wednesday lunch - leftover from Tuesday dinner
        if (!tuesdayDinnerMeal) {
          throw new Error('Tuesday dinner meal not found for Wednesday lunch leftover');
        }
        selectedMeal = tuesdayDinnerMeal;
        isLeftover = true;
      } else if (day === 4 && mealCategory === 'dinner') {
        // Day 4: Wednesday dinner - fresh cooking
        const wednesdayDinnerResult = await selectUnusedMealIntelligently(availableMeals, usedDinnerMeals, allSelectedMealNames, false, ingredientsToUseUp, 'dinner', dietaryTags, dailyProteinTarget, user?.id, user);
        selectedMeal = wednesdayDinnerResult.meal;
        wednesdayDinnerMeal = selectedMeal;
        usedDinnerMeals.add(selectedMeal.name);
        allSelectedMealNames.add(selectedMeal.name);
        console.log(`🍽️ Day 4 Wednesday dinner: "${selectedMeal.name}" (Global tracker now has ${allSelectedMealNames.size} unique meals)`);
      } else if (day === 5 && mealCategory === 'lunch') {
        // Day 5: Thursday lunch - leftover from Wednesday dinner
        if (!wednesdayDinnerMeal) {
          throw new Error('Wednesday dinner meal not found for Thursday lunch leftover');
        }
        selectedMeal = wednesdayDinnerMeal;
        isLeftover = true;
      } else if (day === 5 && mealCategory === 'dinner') {
        // Day 5: Thursday dinner - fresh cooking
        const thursdayDinnerResult = await selectUnusedMealIntelligently(availableMeals, usedDinnerMeals, allSelectedMealNames, false, ingredientsToUseUp, 'dinner', dietaryTags, dailyProteinTarget, user?.id, user);
        selectedMeal = thursdayDinnerResult.meal;
        thursdayDinnerMeal = selectedMeal;
        usedDinnerMeals.add(selectedMeal.name);
        allSelectedMealNames.add(selectedMeal.name);
        console.log(`🍽️ Day 5 Thursday dinner: "${selectedMeal.name}" (Global tracker now has ${allSelectedMealNames.size} unique meals)`);
      } else if (day === 6 && mealCategory === 'lunch') {
        // Day 6: Friday lunch - leftover from Thursday dinner
        if (!thursdayDinnerMeal) {
          throw new Error('Thursday dinner meal not found for Friday lunch leftover');
        }
        selectedMeal = thursdayDinnerMeal;
        isLeftover = true;
      } else if (day === 6 && mealCategory === 'dinner') {
        // Day 6: Friday dinner - fresh cooking
        const fridayDinnerResult = await selectUnusedMealIntelligently(availableMeals, usedDinnerMeals, allSelectedMealNames, false, ingredientsToUseUp, 'dinner', dietaryTags, dailyProteinTarget, user?.id, user);
        selectedMeal = fridayDinnerResult.meal;
        let fridayDinnerMeal = selectedMeal;
        usedDinnerMeals.add(selectedMeal.name);
        allSelectedMealNames.add(selectedMeal.name);
      } else if (day === 7 && mealCategory === 'lunch') {
        // Day 7: Saturday lunch - only add eating out if user doesn't eat at home
        const userEatsAtHome = userEatingDays >= 6; // User eats at home 6+ days per week
        if (!userEatsAtHome) {
          selectedMeal = {
            name: "Eating out",
            portion: "",
            nutrition: { protein: 0, prepTime: 30, calories: 0, carbohydrates: 0, fats: 0, fiber: 0, sugar: 0, sodium: 0 },
            ingredients: [],
            tags: [],
            category: 'lunch' as 'breakfast' | 'lunch' | 'dinner',
            wholeFoodLevel: 'minimal' as 'minimal' | 'moderate' | 'high',
            vegetableContent: {
              servings: 0,
              vegetables: [],
              benefits: []
            },
            recipe: { instructions: [], tips: [] }
          };
        } else {
          // User eats at home - select proper meal
          const saturdayLunchResult = await selectUnusedMealIntelligently(availableMeals, usedLunchMeals, allSelectedMealNames, false, ingredientsToUseUp, 'lunch', dietaryTags, dailyProteinTarget, user?.id, user);
          selectedMeal = saturdayLunchResult.meal;
          usedLunchMeals.add(selectedMeal.name);
          allSelectedMealNames.add(selectedMeal.name);
        }
      } else if (day === 7 && mealCategory === 'dinner') {
        // Day 7: Saturday dinner - only add eating out if different from lunch
        const userEatsAtHome = userEatingDays >= 6; // User eats at home 6+ days per week
        if (!userEatsAtHome) {
          // Only add "Eating out" for dinner if lunch wasn't already "Eating out"
          const lunchMeal = meals.find(m => m.day === day && m.mealType === 'lunch');
          if (!lunchMeal || lunchMeal.foodDescription !== 'Eating out') {
            selectedMeal = {
              name: "Eating out",
              portion: "",
              nutrition: { protein: 0, prepTime: 30, calories: 0, carbohydrates: 0, fats: 0, fiber: 0, sugar: 0, sodium: 0 },
              ingredients: [],
              tags: [],
              category: 'dinner' as 'breakfast' | 'lunch' | 'dinner',
              wholeFoodLevel: 'minimal' as 'minimal' | 'moderate' | 'high',
              vegetableContent: {
                servings: 0,
                vegetables: [],
                benefits: []
              },
              recipe: { instructions: [], tips: [] }
            };
          } else {
            // Skip duplicate eating out - generate actual meal instead
            const saturdayDinnerAltResult = await selectUnusedMealIntelligently(availableMeals, usedDinnerMeals, allSelectedMealNames, false, ingredientsToUseUp, 'dinner', dietaryTags, dailyProteinTarget, user?.id, user);
            selectedMeal = saturdayDinnerAltResult.meal;
            usedDinnerMeals.add(selectedMeal.name);
            allSelectedMealNames.add(selectedMeal.name);
          }
        } else {
          // User eats at home - select proper meal
          const saturdayDinnerResult = await selectUnusedMealIntelligently(availableMeals, usedDinnerMeals, allSelectedMealNames, false, ingredientsToUseUp, 'dinner', dietaryTags, dailyProteinTarget, user?.id, user);
          selectedMeal = saturdayDinnerResult.meal;
          usedDinnerMeals.add(selectedMeal.name);
          allSelectedMealNames.add(selectedMeal.name);
        }
      } else if (mealCategory === 'breakfast') {
        // BREAKFAST 2-DAY BATCH COOKING PATTERN:
        // Day 2 (Mon): Cook fresh breakfast A → Day 3 (Tue): Leftover A
        // Day 4 (Wed): Cook fresh breakfast B → Day 5 (Thu): Leftover B
        // Day 6 (Fri): Cook fresh breakfast C → Day 7 (Sat): Leftover C
        
        // Determine if this is a cooking day or leftover day
        const isFreshBreakfastDay = (day === 2 || day === 4 || day === 6); // Mon, Wed, Fri
        const isLeftoverBreakfastDay = (day === 3 || day === 5 || day === 7); // Tue, Thu, Sat
        
        if (isLeftoverBreakfastDay) {
          // LEFTOVER DAY: Use previous day's breakfast
          if (day === 3 && mondayBreakfastMeal) {
            selectedMeal = mondayBreakfastMeal;
            isLeftover = true;
            console.log(`🍳 Day ${day} (Tue) breakfast: ${selectedMeal.name} (LEFTOVER from Monday)`);
          } else if (day === 5 && wednesdayBreakfastMeal) {
            selectedMeal = wednesdayBreakfastMeal;
            isLeftover = true;
            console.log(`🍳 Day ${day} (Thu) breakfast: ${selectedMeal.name} (LEFTOVER from Wednesday)`);
          } else if (day === 7 && fridayBreakfastMeal) {
            selectedMeal = fridayBreakfastMeal;
            isLeftover = true;
            console.log(`🍳 Day ${day} (Sat) breakfast: ${selectedMeal.name} (LEFTOVER from Friday)`);
          } else {
            // Fallback if no previous meal found - select fresh
            const fallbackResult = await selectUnusedMealIntelligently(availableMeals, usedBreakfastMeals, allSelectedMealNames, false, ingredientsToUseUp, 'breakfast', dietaryTags, dailyProteinTarget, user?.id, user);
            selectedMeal = fallbackResult.meal;
            usedBreakfastMeals.add(selectedMeal.name);
            allSelectedMealNames.add(selectedMeal.name);
            console.log(`🍳 Day ${day} breakfast: ${selectedMeal.name} (FRESH - no leftover available)`);
          }
        } else if (isFreshBreakfastDay) {
          // FRESH COOKING DAY: Select new breakfast and save for next day
          // Use weekday-friendly quick options for Mon/Wed, can be more elaborate for Fri
          const isWeekday = day <= 5;
          const weekdayBreakfasts = availableMeals.filter(meal => 
            meal.nutrition.prepTime <= 15 ||
            meal.name.toLowerCase().includes('overnight') ||
            meal.name.toLowerCase().includes('chia') ||
            meal.name.toLowerCase().includes('smoothie') ||
            meal.name.toLowerCase().includes('kefir') ||
            meal.name.toLowerCase().includes('oats')
          );
          
          const breakfastPool = isWeekday && weekdayBreakfasts.length > 0 ? weekdayBreakfasts : availableMeals;
          const breakfastResult = await selectUnusedMealIntelligently(breakfastPool, usedBreakfastMeals, allSelectedMealNames, false, ingredientsToUseUp, 'breakfast', dietaryTags, dailyProteinTarget, user?.id, user);
          selectedMeal = breakfastResult.meal;
          intelligentlyUsedIngredients = breakfastResult.usedIngredients || [];
          usedBreakfastMeals.add(selectedMeal.name);
          allSelectedMealNames.add(selectedMeal.name);
          
          // Save for leftover the next day
          if (day === 2) {
            mondayBreakfastMeal = selectedMeal;
            console.log(`🍳 Day ${day} (Mon) breakfast: ${selectedMeal.name} (COOKING for Mon+Tue - prep: ${selectedMeal.nutrition.prepTime}min)`);
          } else if (day === 4) {
            wednesdayBreakfastMeal = selectedMeal;
            console.log(`🍳 Day ${day} (Wed) breakfast: ${selectedMeal.name} (COOKING for Wed+Thu - prep: ${selectedMeal.nutrition.prepTime}min)`);
          } else if (day === 6) {
            fridayBreakfastMeal = selectedMeal;
            console.log(`🍳 Day ${day} (Fri) breakfast: ${selectedMeal.name} (COOKING for Fri+Sat - prep: ${selectedMeal.nutrition.prepTime}min)`);
          }
        } else {
          // Day 1 (Sunday) - shouldn't have breakfast anyway
          const generalResult = await selectUnusedMealIntelligently(availableMeals, usedBreakfastMeals, allSelectedMealNames, false, ingredientsToUseUp, 'breakfast', dietaryTags, dailyProteinTarget, user?.id, user);
          selectedMeal = generalResult.meal;
          usedBreakfastMeals.add(selectedMeal.name);
          allSelectedMealNames.add(selectedMeal.name);
        }
      } else {
        // Fresh lunch/dinner for other days - use freshness-based selection
        
        // Apply freshness-based filtering for optimal ingredient scheduling
        const freshnessFilteredMeals = availableMeals.filter(meal => {
          const recommendedDays = getRecommendedDayForMeal(meal.ingredients || []);
          return recommendedDays.includes(day);
        });
        
        // Use freshness-filtered meals if available, otherwise fall back to all meals
        const mealsToSelectFrom = freshnessFilteredMeals.length > 0 ? freshnessFilteredMeals : availableMeals;
        
        if (freshnessFilteredMeals.length > 0) {
          console.log(`🥬 Day ${day}: Using ${freshnessFilteredMeals.length} freshness-optimized ${mealCategory} options`);
        }
        
        const mealSelection = await selectUnusedMealIntelligently(mealsToSelectFrom, mealCategory === 'lunch' ? usedLunchMeals : usedDinnerMeals, allSelectedMealNames, false, remainingIngredientsToUseUp, mealCategory as 'lunch' | 'dinner', dietaryTags, dailyProteinTarget, user?.id, user);
        
        console.log(`🔍 MEAL SELECTION DEBUG: Day ${day} ${mealCategory} - mealSelection:`, mealSelection?.meal?.name || 'undefined');
        console.log(`🔍 MEAL SELECTION DEBUG: mealsToSelectFrom.length = ${mealsToSelectFrom.length}`);
        
        // Robust meal selection with multiple fallbacks
        selectedMeal = mealSelection?.meal;
        const intelligentlyUsedIngredients = mealSelection?.usedIngredients || [];
        
        // Emergency check for undefined selectedMeal 
        if (!selectedMeal) {
          console.error(`❌ EMERGENCY: selectedMeal is undefined, using fallback selection`);
          if (mealsToSelectFrom.length > 0) {
            selectedMeal = mealsToSelectFrom[0];
            console.log(`🚨 Using first meal from mealsToSelectFrom: ${selectedMeal.name}`);
          } else if (mealCategory === 'lunch' && lunchOptions && lunchOptions.length > 0) {
            selectedMeal = lunchOptions[0];
            console.log(`🚨 Using first lunch option: ${selectedMeal.name}`);
          } else if (mealCategory === 'dinner' && dinnerOptions && dinnerOptions.length > 0) {
            selectedMeal = dinnerOptions[0];
            console.log(`🚨 Using first dinner option: ${selectedMeal.name}`);
          } else {
            throw new Error(`No meals available for ${mealCategory} on day ${day}`);
          }
        }
        
        // Log freshness analysis for the selected meal
        logMealFreshnessAnalysis(selectedMeal.name, selectedMeal.ingredients || []);
        
        if (mealCategory === 'lunch') {
          usedLunchMeals.add(selectedMeal.name);
        } else {
          usedDinnerMeals.add(selectedMeal.name);
        }
        allSelectedMealNames.add(selectedMeal.name);
        
        // Remove intelligently used ingredients from the remaining list
        if (intelligentlyUsedIngredients.length > 0) {
          remainingIngredientsToUseUp = remainingIngredientsToUseUp.filter(ing => !intelligentlyUsedIngredients.includes(ing));
          console.log(`✅ Intelligent matcher used up ingredients: ${intelligentlyUsedIngredients.join(', ')} from ${selectedMeal.name}`);
        }
      }
      
      // For leftover meals or when no intelligent matching occurred, check natural ingredient usage  
      if (isLeftover && remainingIngredientsToUseUp.length > 0 && selectedMeal && selectedMeal.ingredients) {
        const naturallyUsedIngredients = checkNaturalIngredientUsage(selectedMeal, remainingIngredientsToUseUp);
        if (naturallyUsedIngredients.length > 0) {
          // Remove used ingredients from the list
          remainingIngredientsToUseUp = remainingIngredientsToUseUp.filter(ing => !naturallyUsedIngredients.includes(ing));
          console.log(`✅ Recipe naturally uses up ingredients: ${naturallyUsedIngredients.join(', ')} from ${selectedMeal.name}`);
        }
      }

      // Safety check to prevent undefined meal errors
      if (!selectedMeal) {
        console.error(`❌ CRITICAL: selectedMeal is undefined for day ${day}, ${mealCategory}`);
        console.error(`❌ FALLBACK: Using first available meal to prevent crash`);
        // Emergency fallback - use first available meal from the original pool
        if (mealCategory === 'lunch' && lunchOptions && lunchOptions.length > 0) {
          selectedMeal = lunchOptions[0];
          console.log(`🚨 EMERGENCY FALLBACK: Using lunch meal "${selectedMeal.name}"`);
        } else if (mealCategory === 'dinner' && dinnerOptions && dinnerOptions.length > 0) {
          selectedMeal = dinnerOptions[0];
          console.log(`🚨 EMERGENCY FALLBACK: Using dinner meal "${selectedMeal.name}"`);
        } else if (mealCategory === 'breakfast' && breakfastOptions && breakfastOptions.length > 0) {
          selectedMeal = breakfastOptions[0];
          console.log(`🚨 EMERGENCY FALLBACK: Using breakfast meal "${selectedMeal.name}"`);
        } else {
          console.error(`❌ NO MEALS AVAILABLE: No ${mealCategory} options found at all`);
          throw new Error(`No fallback meal available for ${mealCategory} on day ${day}`);
        }
      }
      
      // Adjust portion based on caloric goals and household size
      let portionMultiplier = caloricAdjustment;
      if (user?.householdSize && user.householdSize > 1) {
        portionMultiplier *= user.householdSize;
      }
      
      // Final safety check right before accessing meal properties
      if (!selectedMeal || !selectedMeal.nutrition) {
        console.error(`❌ FINAL SAFETY: selectedMeal is still undefined at portion calculation`);
        // Create a minimal fallback meal to prevent crash
        selectedMeal = {
          name: "Simple Protein Bowl",
          portion: "1 serving",
          nutrition: { 
            protein: 25, 
            calories: 400, 
            carbohydrates: 40, 
            fats: 15, 
            prepTime: 15,
            fiber: 8,
            sugar: 10,
            sodium: 300
          },
          ingredients: ["protein", "vegetables"],
          tags: ["quick"],
          category: mealCategory,
          wholeFoodLevel: 'moderate' as const,
          vegetableContent: {
            servings: 2,
            vegetables: ["mixed vegetables"],
            benefits: ["nutrition", "fiber"]
          }
        };
        console.log(`🚨 Using emergency fallback meal: ${selectedMeal.name}`);
      }
      
      // BREAKFAST BATCH COOKING: 2x multiplier on fresh days (Mon/Wed/Fri), 1x on leftover days
      // Lunch/Dinner: Use standard serving multiplier
      let breakfastServingMultiplier = servingMultiplier;
      if (mealCategory === 'breakfast') {
        // Fresh breakfast days (Mon=2, Wed=4, Fri=6) get 2x for shopping list
        // Leftover days (Tue=3, Thu=5, Sat=7) get 1x (already cooked)
        const isFreshBreakfastDay = (day === 2 || day === 4 || day === 6);
        breakfastServingMultiplier = isFreshBreakfastDay ? 2 : 1;
      }
      
      const adjustedPortion = adjustMealPortion(selectedMeal.portion, portionMultiplier, breakfastServingMultiplier);
      // When cooking in batch (servingMultiplier > 1), each meal only counts 1 serving worth of nutrients
      // This applies to BOTH fresh and leftover meals since you eat 1 serving per meal
      const baseProtein = Math.round(selectedMeal.nutrition.protein * portionMultiplier);
      const adjustedProtein = breakfastServingMultiplier > 1 
        ? Math.round(baseProtein / breakfastServingMultiplier)
        : baseProtein;
      const prepTimeForDay = isLeftover ? 5 : selectedMeal.nutrition.prepTime;
      
      // Create descriptive meal name with seasonal adaptation
      let mealDescription = selectedMeal.name;
      
      // Add "incorporating" text when ingredients are being reused
      if (intelligentlyUsedIngredients && intelligentlyUsedIngredients.length > 0) {
        mealDescription = `${selectedMeal.name} (incorporating ${intelligentlyUsedIngredients.join(', ')})`;
      }
      
      // No need for seasonal name adaptation since warming recipes are already excluded during summer
      // Keep original recipe names for proper recipe lookup

      // Validate that recipe ID exists - now all recipes should have proper IDs
      if (!selectedMeal.id) {
        console.error(`❌ CRITICAL ERROR: Recipe ID missing for "${selectedMeal.name}" in ${mealCategory} on day ${day}`);
        console.error(`Recipe details:`, JSON.stringify(selectedMeal, null, 2));
        throw new Error(`Recipe ID is undefined for "${selectedMeal.name}" - this indicates a bug in recipe conversion`);
      }

      // Classify sugar content from ingredients
      const mealSugar = Math.round((selectedMeal.nutrition.sugar || 0) * portionMultiplier);
      const sugarClassification = classifySugarContent(
        selectedMeal.ingredients || [],
        mealSugar
      );
      
      const meal: InsertMeal = {
        mealPlanId: 0,
        day,
        mealType: mealCategory,
        recipeId: selectedMeal.id, // Store recipe ID for translation
        foodDescription: mealDescription,
        portion: adjustedPortion,
        protein: adjustedProtein,
        calories: Math.round((selectedMeal.nutrition.calories || 0) * portionMultiplier),
        carbohydrates: Math.round((selectedMeal.nutrition.carbohydrates || 0) * portionMultiplier),
        fats: Math.round((selectedMeal.nutrition.fats || 0) * portionMultiplier),
        fiber: Math.round((selectedMeal.nutrition.fiber || 0) * portionMultiplier),
        sugar: mealSugar,
        addedSugar: sugarClassification.addedSugar,
        freeSugar: sugarClassification.freeSugar,
        intrinsicSugar: sugarClassification.intrinsicSugar,
        sodium: Math.round((selectedMeal.nutrition.sodium || 0) * portionMultiplier),
        potassium: Math.round((selectedMeal.nutrition.potassium || 0) * portionMultiplier),
        iron: Math.round(((selectedMeal.nutrition.iron || 0) * portionMultiplier) * 10) / 10,
        vitaminC: Math.round((selectedMeal.nutrition.vitaminC || 0) * portionMultiplier),
        vitaminK: Math.round((selectedMeal.nutrition.vitaminK || 0) * portionMultiplier),
        zinc: Math.round(((selectedMeal.nutrition.zinc || 0) * portionMultiplier) * 10) / 10,
        calcium: Math.round((selectedMeal.nutrition.calcium || 0) * portionMultiplier),
        omega3: Math.round((selectedMeal.nutrition.omega3 || 0) * portionMultiplier),
        polyphenols: Math.round((selectedMeal.nutrition.polyphenols || 0) * portionMultiplier),
        prepTime: prepTimeForDay,
        isLeftover: isLeftover, // Boolean flag instead of string marker
      };

      meals.push(meal);
      dailyProtein += adjustedProtein;
      
      // Track anti-aging meals for longevity support (1 per day = 7 per week)
      if (!isLeftover && mealHasAntiAgingTag(selectedMeal)) {
        antiAgingMealCount++;
        console.log(`🌟 Anti-aging meal selected: "${selectedMeal.name}" (${antiAgingMealCount}/${targetAntiAgingMeals} anti-aging meals this week)`);
      }
      
      // Track egg-based meals per day (for 1-per-day limit)
      if (mealContainsEggs(selectedMeal)) {
        const currentCount = eggMealsPerDay.get(day) || 0;
        eggMealsPerDay.set(day, currentCount + 1);
        console.log(`🥚 Egg meal tracked: "${selectedMeal.name}" (day ${day} now has ${currentCount + 1} egg meal(s))`);
      }
    }

    totalWeeklyProtein += dailyProtein;
  }

  // Calculate actual days with meals for proper protein average (exclude "eating out" days)
  const daysWithRealMeals = new Set();
  meals.forEach(meal => {
    if (meal.protein > 0 && meal.foodDescription !== 'Eating out') {
      daysWithRealMeals.add(meal.day);
    }
  });
  
  const totalDaysWithRealMeals = daysWithRealMeals.size;
  const averageProteinPerDay = totalDaysWithRealMeals > 0 ? totalWeeklyProtein / totalDaysWithRealMeals : 0;
  
  console.log(`🎯 Protein optimization results (pre-adjustment): ${totalWeeklyProtein}g total / ${totalDaysWithRealMeals} full meal days = ${averageProteinPerDay.toFixed(1)}g per day`);
  console.log(`🎯 Personal protein target: ${dailyProteinTarget}g/day | Achievement: ${((averageProteinPerDay / dailyProteinTarget) * 100).toFixed(1)}%`);
  console.log(`🌟 Anti-aging intake: ${antiAgingMealCount} anti-aging meals this week (target: 7 for daily longevity support)`);

  // Apply TDEE-based portion adjustment to match target daily calories
  const adjustedMeals = applyTDEEBasedPortionAdjustment(meals, user);

  // Recalculate protein after TDEE adjustment
  const daysWithAdjustedMeals = new Set();
  let adjustedTotalProtein = 0;
  adjustedMeals.forEach(meal => {
    if (meal.protein > 0 && meal.foodDescription !== 'Eating out') {
      daysWithAdjustedMeals.add(meal.day);
      adjustedTotalProtein += meal.protein;
    }
  });
  const adjustedAverageProteinPerDay = daysWithAdjustedMeals.size > 0 
    ? adjustedTotalProtein / daysWithAdjustedMeals.size 
    : 0;

  console.log(`🎯 Protein after TDEE adjustment: ${adjustedAverageProteinPerDay.toFixed(1)}g per day`);

  const mealPlan: InsertMealPlan = {
    userId: request.userId || 1,
    weekStart: normalizedWeekStart,
    activityLevel: request.activityLevel,
    totalProtein: Math.round(adjustedAverageProteinPerDay), // Use adjusted protein
    weekendMealPrepEnabled: request.weekendMealPrepEnabled || false,
  };

  return { mealPlan, meals: adjustedMeals };
}

/**
 * Generate meal prep plan based on cooking/eating days configuration
 * Always prioritize removing weekend days first, then weekdays if needed
 */
async function generateMealPrepPlan(
  request: MealPlanRequest, 
  user: User | undefined, 
  caloricAdjustment: number,
  servingMultiplier: number,
  fridgeIngredients: string[] = [],
  dailyProteinTarget: number
): Promise<GeneratedMealPlan> {
  console.log(`🚀🚀🚀 MEAL PREP FUNCTION CALLED! 🚀🚀🚀`);
  console.log(`🚀 Request user ID: ${request.userId}`);
  console.log(`🚀 User object: ${user ? 'PRESENT' : 'MISSING'}`);
  if (user) {
    console.log(`🚀 User ID: ${user.id}, useOnlyMyRecipes: ${user.useOnlyMyRecipes}`);
  }
  
  // Custom recipe handling is done properly through the meal prep logic below
  
  // Use the normalized week start from the calling function
  const normalizedWeekStart = normalizeToSunday(request.weekStart);
  const meals: InsertMeal[] = [];
  let totalWeeklyProtein = 0;
  const dietaryTags = request.dietaryTags || [];
  const ingredientsToUseUp = user?.leftovers || [];
  let remainingIngredientsToUseUp = [...ingredientsToUseUp];
  
  console.log(`🥕 Starting meal prep plan with leftover ingredients: ${JSON.stringify(ingredientsToUseUp)}`);
  console.log(`👤 User object in meal prep: ${user ? 'present' : 'missing'}, user ID: ${user?.id}, useOnlyMyRecipes: ${user?.useOnlyMyRecipes}`);
  console.log(`🔍 DETAILED USER DEBUG: Full user object properties:`, JSON.stringify(user, null, 2));
  
  // Get meal options for lunch and dinner with dietary filters - ensure sufficient variety
  console.log(`🍽️ Ensuring recipe variety for dietary tags: [${dietaryTags.join(', ')}]`);
  let lunchOptions: MealOption[] = [];
  let dinnerOptions: MealOption[] = [];
  
  // Check if user wants only their own recipes  
  const useOnlyMyRecipes = user?.useOnlyMyRecipes === true;
  console.log(`🍽️ Recipe source preference: ${useOnlyMyRecipes ? 'User recipes only' : 'All recipes'}`);
  console.log(`🔍 Debug: user?.useOnlyMyRecipes = ${user?.useOnlyMyRecipes} (type: ${typeof user?.useOnlyMyRecipes}), useOnlyMyRecipes = ${useOnlyMyRecipes}`);
  console.log(`🚨 CRITICAL DEBUG: About to check useOnlyMyRecipes=${useOnlyMyRecipes}`);

  console.log(`🚨 CUSTOM RECIPE CHECK: useOnlyMyRecipes = ${useOnlyMyRecipes}`);
  console.log(`🚨 User object: ${user ? 'EXISTS' : 'NULL'}`);
  if (user) {
    console.log(`🚨 User properties: id=${user.id}, useOnlyMyRecipes=${user.useOnlyMyRecipes} (type: ${typeof user.useOnlyMyRecipes})`);
  }
  
  // FORCE custom recipes for User 2 for debugging - ALWAYS use custom recipes for user 2
  const forceCustomRecipes = user?.id === 2;
  console.log(`🔧 Force custom recipes for user 2: ${forceCustomRecipes}`);
  const finalUseOnlyMyRecipes = useOnlyMyRecipes; // Use user's preference, not forced
  console.log(`🔧 Final decision: ${finalUseOnlyMyRecipes ? 'FORCING CUSTOM RECIPES for User 2' : 'using curated recipes'}`);
  
  // ALWAYS load user's custom recipes if they exist, regardless of useOnlyMyRecipes setting
  console.log(`🎯 LOADING CUSTOM RECIPES for user ${user?.id}`);
  const userRecipes = user?.id ? await storage.getUserRecipes(user.id) : [];
  console.log(`🎯 Found ${userRecipes.length} custom recipes for user ${user?.id}`);
  console.log(`🎯 RAW CUSTOM RECIPES:`, JSON.stringify(userRecipes, null, 2));
  
  if (userRecipes.length > 0) {
    console.log(`🎯 PROCESSING CUSTOM RECIPES! Found ${userRecipes.length} recipes for user ${user?.id}`);
    console.log('🚀 Loading user recipes with smart fallback for meal prep');
    console.log(`🔍 DEBUG MEAL PREP: Raw user recipes from storage:`, userRecipes.map(r => ({
      name: r.name, 
      mealTypes: r.mealTypes, 
      tags: r.tags,
      protein: r.protein
    })));
    
    // Apply dietary filtering to user recipes (more permissive for user's own recipes)
    const filterUserRecipeByDiet = (recipe: any): boolean => {
      if (dietaryTags.includes('vegetarian') || dietaryTags.includes('vegan')) {
        if (recipe.tags.includes('non-vegetarian') || recipe.tags.includes('pescatarian')) {
          console.log(`🚫 Excluding user recipe with conflicting dietary tag: ${recipe.name}`);
          return false;
        }
      }
      return true;
    };
    
    // Convert user recipes to MealOption format with proper category mapping
    const convertUserRecipeToMealOption = (recipe: any): MealOption => {
      // Map meal types to categories
      const categories = [];
      if (recipe.mealTypes?.includes('breakfast')) categories.push('breakfast');
      if (recipe.mealTypes?.includes('lunch')) categories.push('lunch');
      if (recipe.mealTypes?.includes('dinner')) categories.push('dinner');
      
      const recipeId = `user-${recipe.id}`;
      console.log(`🔑 CUSTOM RECIPE ID ASSIGNMENT: "${recipe.name}" -> ID: "${recipeId}"`);
      
      const baseRecipe = {
        id: recipeId, // Prefix user recipe IDs to avoid conflicts with curated recipes
        name: recipe.name,
        portion: recipe.portion || '1 serving',
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        nutrition: recipe.nutrition || { protein: 15, calories: 400, carbohydrates: 40, fats: 15 },
        tags: [...(recipe.tags || []), 'custom'], // Always add 'custom' tag to user recipes
        prepTime: recipe.prepTime || 30,
        costEuros: recipe.costEuros || 3.0,
        proteinPerEuro: recipe.nutrition?.protein ? (recipe.nutrition.protein / (recipe.costEuros || 3.0)) : 5.0,
        tips: recipe.tips || [],
        notes: recipe.notes || '',
        origin: 'user-recipe',
        category: categories[0] || 'lunch' // Use first category or default to lunch
      };
      
      console.log(`🔑 BEFORE DIETARY SUBS: "${baseRecipe.name}" has ID: "${baseRecipe.id}"`);
      
      // Apply dietary substitutions to user recipes
      const result = applyDietarySubstitutions(baseRecipe, dietaryTags);
      
      console.log(`🔑 AFTER DIETARY SUBS: "${result.name}" has ID: "${result.id}"`);
      
      return result;
    };
    
    // Get user recipes by meal type (more permissive filtering for user's own recipes)

    const userLunchOptions = userRecipes
      .filter(recipe => 
        recipe.mealTypes.includes('lunch') && filterUserRecipeByDiet(recipe)
      )
      .map(convertUserRecipeToMealOption);
      
    const userDinnerOptions = userRecipes
      .filter(recipe => 
        recipe.mealTypes.includes('dinner') && filterUserRecipeByDiet(recipe)
      )
      .map(convertUserRecipeToMealOption);
    
    console.log(`📊 User meal prep recipes found: ${userLunchOptions.length} lunch, ${userDinnerOptions.length} dinner`);
    console.log(`🍽️ User lunch recipes: ${userLunchOptions.map(r => r.name).join(', ')}`);
    console.log(`🍽️ User dinner recipes: ${userDinnerOptions.map(r => r.name).join(', ')}`);
    
    // Smart fallback: If user doesn't have enough variety, supplement with curated recipes
    const minVarietyThreshold = 3; // Meal prep needs at least 3 options per meal type for good variety
    
    // Check if user wants ONLY their recipes for meal prep
    if (finalUseOnlyMyRecipes && userRecipes.length >= 5) {
      console.log(`🔒 MEAL PREP: Using ONLY user's ${userRecipes.length} personal recipes`);
      lunchOptions = userLunchOptions;
      dinnerOptions = userDinnerOptions;
    } else {
      console.log(`🎯 MEAL PREP: Using main curated database`);
      const rawLunchOptions = await getEnhancedMealsForCategoryAndDiet('lunch', dietaryTags);
      const rawDinnerOptions = await getEnhancedMealsForCategoryAndDiet('dinner', dietaryTags);
      
      // Use raw options without serving size filtering - recipes will be dynamically scaled
      lunchOptions = rawLunchOptions;
      dinnerOptions = rawDinnerOptions;
    }
    
    console.log(`📊 Meal prep recipe counts: ${lunchOptions.length} lunch, ${dinnerOptions.length} dinner`);
  } else {
    // No custom recipes found - use only curated database
    console.log('🔧 No custom recipes found, using curated database only');
    const rawLunchOptions = await getEnhancedMealsForCategoryAndDiet('lunch', dietaryTags, user?.id);
    const rawDinnerOptions = await getEnhancedMealsForCategoryAndDiet('dinner', dietaryTags, user?.id);
    
    // Use raw options without serving size filtering - recipes will be dynamically scaled
    lunchOptions = rawLunchOptions;
    dinnerOptions = rawDinnerOptions;
    
    console.log(`🔍 CURATED ONLY: Found ${lunchOptions.length} curated lunch, ${dinnerOptions.length} curated dinner meals for tags: ${dietaryTags.join(', ')}`);
  }
  
  // If user only wants their recipes (and has some), don't add curated recipes
  if (useOnlyMyRecipes && userRecipes.length > 0) {
    console.log('🔒 User preference: Using ONLY custom recipes (no curated fallback)');
    // Keep only the user recipes loaded above
  }
  
  console.log(`📊 Available recipe counts: ${lunchOptions.length} lunch, ${dinnerOptions.length} dinner`);
  console.log(`🔍 Dietary tags being used: [${dietaryTags.join(', ')}]`);
  
  // Debug: Show first few recipes for each category
  if (lunchOptions.length > 0) {
    console.log(`🍽️ Sample lunch recipes: ${lunchOptions.slice(0, 3).map(m => m.name).join(', ')}`);
  }
  if (dinnerOptions.length > 0) {
    console.log(`🍽️ Sample dinner recipes: ${dinnerOptions.slice(0, 3).map(m => m.name).join(', ')}`);
  }
  
  // Sort meals by freshness priority before meal planning
  console.log('🥬 Applying ingredient freshness optimization...');
  lunchOptions = sortMealsByFreshness(lunchOptions);
  dinnerOptions = sortMealsByFreshness(dinnerOptions);
  console.log(`🥬 Sorted ${lunchOptions.length} lunch and ${dinnerOptions.length} dinner options by ingredient freshness`);

  // Apply summer filtering for ALL ayurvedic meals - regardless of user's dietary selection
  // All ayurvedic recipes should follow seasonal guidelines during grishma season
  const currentSeason = getCurrentAyurvedicSeason(new Date(), 'europe');
  if (currentSeason === 'grishma') {
    const applySeasonalFilter = (meals: any[], category: string) => {
      const originalCount = meals.length;
      const filtered = meals.filter(meal => {
        if (!meal.tags.includes('ayurvedic')) return true; // Keep non-ayurvedic meals
        
        const hasWarmingTags = meal.tags.includes('warming');
        const hasHeatingSpices = meal.ingredients.some((ingredient: string) => 
          ingredient.toLowerCase().includes('ginger') ||
          ingredient.toLowerCase().includes('turmeric') ||
          ingredient.toLowerCase().includes('cumin') ||
          ingredient.toLowerCase().includes('garam masala') ||
          ingredient.toLowerCase().includes('mustard seeds') ||
          ingredient.toLowerCase().includes('cinnamon') ||
          ingredient.toLowerCase().includes('cardamom') ||
          ingredient.toLowerCase().includes('cloves')
        );
        
        if (hasWarmingTags || hasHeatingSpices) {
          console.log(`🚫 Summer exclusion: ${meal.name} removed (ayurvedic recipe with inappropriate warming characteristics for grishma season)`);
          return false; // Exclude warming recipes completely
        }
        return true; // Keep cooling/neutral ayurvedic recipes
      });
      
      if (originalCount !== filtered.length) {
        console.log(`Summer filter: ${originalCount} → ${filtered.length} ${category} meals (excluded warming ayurvedic recipes)`);
      }
      return filtered;
    };
    
    lunchOptions = applySeasonalFilter(lunchOptions, 'lunch');
    dinnerOptions = applySeasonalFilter(dinnerOptions, 'dinner');
  }
  
  // Smart fallback: Always ensure minimum variety for meal prep
  if (lunchOptions.length < 3) {
    console.log(`🔄 Smart fallback: Adding more curated lunch recipes (current: ${lunchOptions.length}, target: 3+)`);
    const rawExtraCuratedLunch = await getEnhancedMealsForCategoryAndDiet('lunch', dietaryTags);
    const extraCuratedLunch = rawExtraCuratedLunch; // No serving size filtering - dynamic scaling
    lunchOptions = [...lunchOptions, ...extraCuratedLunch.slice(0, 3 - lunchOptions.length)];
  }
  
  if (dinnerOptions.length < 3) {
    console.log(`🔄 Smart fallback: Adding more curated dinner recipes (current: ${dinnerOptions.length}, target: 3+)`);
    const rawExtraCuratedDinner = await getEnhancedMealsForCategoryAndDiet('dinner', dietaryTags);
    const extraCuratedDinner = rawExtraCuratedDinner; // No serving size filtering - dynamic scaling
    dinnerOptions = [...dinnerOptions, ...extraCuratedDinner.slice(0, 3 - dinnerOptions.length)];
  }


  // Apply 45-minute cooking time limit for weekday meals
  let weekdayLunchOptions = lunchOptions.filter(meal => meal.nutrition.prepTime <= 45);
  let weekdayDinnerOptions = dinnerOptions.filter(meal => meal.nutrition.prepTime <= 45);
  
  console.log(`Weekday time filter: ${lunchOptions.length} → ${weekdayLunchOptions.length} lunch meals (≤45min)`);
  console.log(`Weekday time filter: ${dinnerOptions.length} → ${weekdayDinnerOptions.length} dinner meals (≤45min)`);
  
  // Smart fallback: If no weekday dinner options, allow longer prep times for dinner
  if (weekdayDinnerOptions.length === 0 && dinnerOptions.length > 0) {
    // Allow up to 45 minutes for dinner on weekdays as fallback
    weekdayDinnerOptions = dinnerOptions.filter(meal => meal.nutrition.prepTime <= 45);
    console.log(`⚠️ No ≤45min dinner meals available. Fallback: allowing any prep time (${weekdayDinnerOptions.length} meals)`);
    
    // If still no options, allow any dinner meal
    if (weekdayDinnerOptions.length === 0) {
      weekdayDinnerOptions = dinnerOptions;
      console.log(`⚠️ No ≤45min dinner meals available. Using all dinner options (${weekdayDinnerOptions.length} meals)`);
    }
  }
  
  // Apply smart protein optimization for high activity levels
  if (request.activityLevel === 'high') {
    const originalLunchAvg = lunchOptions.reduce((sum, m) => sum + m.nutrition.protein, 0) / lunchOptions.length;
    const originalDinnerAvg = dinnerOptions.reduce((sum, m) => sum + m.nutrition.protein, 0) / dinnerOptions.length;
    
    lunchOptions = selectProteinOptimizedMeals(lunchOptions, lunchOptions.length, true);
    dinnerOptions = selectProteinOptimizedMeals(dinnerOptions, dinnerOptions.length, true);
    weekdayLunchOptions = selectProteinOptimizedMeals(weekdayLunchOptions, weekdayLunchOptions.length, true);
    weekdayDinnerOptions = selectProteinOptimizedMeals(weekdayDinnerOptions, weekdayDinnerOptions.length, true);
    
    const enhancedLunchAvg = lunchOptions.reduce((sum, m) => sum + m.nutrition.protein, 0) / lunchOptions.length;
    const enhancedDinnerAvg = dinnerOptions.reduce((sum, m) => sum + m.nutrition.protein, 0) / dinnerOptions.length;
    
    console.log(`🥩 High activity protein optimization applied:`);
    console.log(`🥩 Lunch: ${originalLunchAvg.toFixed(1)}g → ${enhancedLunchAvg.toFixed(1)}g avg protein per meal`);
    console.log(`🥩 Dinner: ${originalDinnerAvg.toFixed(1)}g → ${enhancedDinnerAvg.toFixed(1)}g avg protein per meal`);
  }
  
  // Initialize meal variety tracking for meal prep mode
  const usedBreakfastMeals: Set<string> = new Set();
  const usedLunchMeals: Set<string> = new Set();
  const usedDinnerMeals: Set<string> = new Set();
  // Initialize global variety tracking for similar recipe filtering
  const allSelectedMealNames = new Set<string>();
  
  // Track egg-based meals per day (max 1 egg meal per day) for meal prep mode
  const eggMealsPerDay: Map<number, number> = new Map();
  const MAX_EGG_MEALS_PER_DAY = 1;
  
  // Declare dinner meal variables for same-type leftover pairing
  let sundayDinnerMeal: MealOption | null = null;
  let mondayDinnerMeal: MealOption | null = null;
  let tuesdayDinnerMeal: MealOption | null = null;
  let wednesdayDinnerMeal: MealOption | null = null;
  let thursdayDinnerMeal: MealOption | null = null;
  let fridayDinnerMeal: MealOption | null = null;
  
  // Declare lunch meal variables for same-type leftover pairing
  let mondayLunchMeal: MealOption | null = null;
  let wednesdayLunchMeal: MealOption | null = null;
  let fridayLunchMeal: MealOption | null = null;
  
  const cookingDaysPerWeek = user?.cookingDaysPerWeek || 3;
  const eatingDaysAtHome = user?.eatingDaysAtHome || 6;
  
  // Calculate which days to include meals
  // 7 days total, each day has 2 meals (lunch + dinner) = 14 possible meals
  // eatingDaysAtHome * 2 = total meals needed
  const totalMealsNeeded = eatingDaysAtHome * 2;
  
  // Determine which days to skip (always start with weekend days)
  const allDays = [1, 2, 3, 4, 5, 6, 7]; // Monday to Sunday
  const daysToSkip: number[] = [];
  const daysWithMeals: number[] = [];
  
  // Always skip Sunday first if we need to reduce meals
  if (totalMealsNeeded < 14) {
    daysToSkip.push(7); // Sunday
  }
  
  // Skip Saturday if we need to reduce further
  if (totalMealsNeeded <= 10) {
    daysToSkip.push(6); // Saturday
  }
  
  // Skip weekdays from Friday backwards if needed
  if (totalMealsNeeded <= 8) {
    daysToSkip.push(5); // Friday
  }
  if (totalMealsNeeded <= 6) {
    daysToSkip.push(4); // Thursday  
  }
  if (totalMealsNeeded <= 4) {
    daysToSkip.push(3); // Wednesday
  }
  if (totalMealsNeeded <= 2) {
    daysToSkip.push(2); // Tuesday
  }
  
  // Days with meals are the remaining days
  daysWithMeals.push(...allDays.filter(day => !daysToSkip.includes(day)));
  
  // ALWAYS include Day 1 for Sunday dinner (the first cooking moment)
  if (!daysWithMeals.includes(1)) {
    daysWithMeals.unshift(1); // Add Day 1 at the beginning
  }
  
  console.log(`Meal prep plan: ${cookingDaysPerWeek} cooking days, ${eatingDaysAtHome} eating days = ${totalMealsNeeded} meals`);
  console.log(`Days with meals: ${daysWithMeals.join(', ')}, Days skipped: ${daysToSkip.join(', ')}`);
  
  // Variables already declared above - use shuffled options for variety

  // Variables already declared at function start - no need to redeclare
  

  


  // Generate meals for all 7 days (breakfast always included) - using streamlined approach
  const rawBreakfastOptions = await getEnhancedMealsForCategoryAndDiet('breakfast', dietaryTags, user?.id);
  let breakfastOptions = rawBreakfastOptions; // No serving size filtering - dynamic scaling
  console.log(`✓ Breakfast variety: Found ${breakfastOptions.length} breakfast options for dietary tags: ${dietaryTags.join(', ')} (no serving filter - dynamic scaling)`);
  
  // Smart fallback for breakfast variety - maintain ALL dietary restrictions
  if (breakfastOptions.length < 4) {
    console.log('⚠️ Limited breakfast variety, applying smart fallback while maintaining ALL dietary restrictions');
    // CRITICAL FIX: Keep ALL dietary restrictions - never compromise lactose-free, gluten-free, etc.
    // All dietary tags are critical for user health and preferences
    
    // Directly get breakfast meals with ALL dietary restrictions maintained
    const allBreakfasts = await getEnhancedMealsByCategory('breakfast');
    const fallbackBreakfasts = filterEnhancedMealsByDietaryTags(allBreakfasts, dietaryTags);
    
    if (fallbackBreakfasts.length > breakfastOptions.length) {
      breakfastOptions = fallbackBreakfasts;
      console.log(`✓ Breakfast fallback: Found ${breakfastOptions.length} breakfast options respecting ALL dietary restrictions: ${dietaryTags.join(', ')}`);
    } else {
      console.log(`⚠️ Fallback did not improve variety - keeping original ${breakfastOptions.length} options with strict dietary compliance`);
    }
  }
  
  // Create smart breakfast pool respecting weekday/weekend preferences
  const breakfastPool = [];
  
  // No prep-time filter on weekday breakfasts — all options are valid.
  // Weekend-specific recipes (pancakes, quinoa breakfast bowl) are excluded from
  // weekdays so they stay reserved as a weekend treat.
  const weekdayBreakfasts = breakfastOptions.filter(meal => {
    const name = meal.name.toLowerCase();
    const isWeekendSpecific = name.includes('pancake') || name.includes('quinoa breakfast bowl');
    return !isWeekendSpecific;
  });

  // Weekend includes everything (including weekend-specific items)
  const weekendBreakfasts = breakfastOptions;

  console.log(`📋 Weekday breakfasts (all prep times): ${weekdayBreakfasts.length} options`);
  console.log(`🥞 Weekend breakfasts (all prep times): ${weekendBreakfasts.length} options`);
  
  // If both arrays are still empty, use all breakfast options as fallback
  if (weekdayBreakfasts.length === 0 && weekendBreakfasts.length === 0) {
    console.log('⚠️ Both weekday and weekend breakfast arrays empty, using all breakfast options as fallback');
    weekdayBreakfasts.push(...breakfastOptions);
    weekendBreakfasts.push(...breakfastOptions);
  }
  
  // Assign breakfasts to each day with variety tracking
  // Start from Day 2 because Day 1 = Sunday evening (dinner only)
  for (let day = 2; day <= 7; day++) {
    const isWeekend = day === 6 || day === 7; // Saturday or Sunday
    
    if (isWeekend && weekendBreakfasts.length > 0) {
      // Weekend: use elaborate breakfasts with variety
      const weekendBreakfastResult = await selectUnusedMealIntelligently(weekendBreakfasts, usedBreakfastMeals, allSelectedMealNames, false, ingredientsToUseUp, 'breakfast', dietaryTags, dailyProteinTarget, user?.id, user);
      const selectedBreakfast = weekendBreakfastResult.meal;
      usedBreakfastMeals.add(selectedBreakfast.name);
      allSelectedMealNames.add(selectedBreakfast.name);
      breakfastPool.push(selectedBreakfast);
    } else if (!isWeekend && weekdayBreakfasts.length > 0) {
      // Weekday: use quick breakfasts with variety
      const weekdayBreakfastResult = await selectUnusedMealIntelligently(weekdayBreakfasts, usedBreakfastMeals, allSelectedMealNames, false, ingredientsToUseUp, 'breakfast', dietaryTags, dailyProteinTarget, user?.id, user);
      const selectedBreakfast = weekdayBreakfastResult.meal;
      usedBreakfastMeals.add(selectedBreakfast.name);
      allSelectedMealNames.add(selectedBreakfast.name);
      breakfastPool.push(selectedBreakfast);
    } else {
      // Fallback: try to use appropriate category if possible
      console.log(`⚠️ Fallback needed for day ${day} (${isWeekend ? 'weekend' : 'weekday'}). Weekday: ${weekdayBreakfasts.length}, Weekend: ${weekendBreakfasts.length}`);
      
      if (isWeekend && weekendBreakfasts.length === 0 && weekdayBreakfasts.length > 0) {
        // Weekend but no weekend options - use weekday as fallback
        const fallbackWeekdayResult = await selectUnusedMealIntelligently(weekdayBreakfasts, usedBreakfastMeals, allSelectedMealNames, false, ingredientsToUseUp, 'breakfast', dietaryTags, dailyProteinTarget, user?.id, user);
        const selectedBreakfast = fallbackWeekdayResult.meal;
        usedBreakfastMeals.add(selectedBreakfast.name);
        allSelectedMealNames.add(selectedBreakfast.name);
        breakfastPool.push(selectedBreakfast);
      } else if (!isWeekend && weekdayBreakfasts.length === 0 && weekendBreakfasts.length > 0) {
        // Weekday but no weekday options - use weekend as fallback  
        const fallbackWeekendResult = await selectUnusedMealIntelligently(weekendBreakfasts, usedBreakfastMeals, allSelectedMealNames, false, ingredientsToUseUp, 'breakfast', dietaryTags, dailyProteinTarget, user?.id, user);
        const selectedBreakfast = fallbackWeekendResult.meal;
        usedBreakfastMeals.add(selectedBreakfast.name);
        allSelectedMealNames.add(selectedBreakfast.name);
        breakfastPool.push(selectedBreakfast);
      } else {
        // General fallback
        const generalBreakfastResult = await selectUnusedMealIntelligently(breakfastOptions, usedBreakfastMeals, allSelectedMealNames, false, ingredientsToUseUp, 'breakfast', dietaryTags, dailyProteinTarget, user?.id, user);
        const selectedBreakfast = generalBreakfastResult.meal;
        usedBreakfastMeals.add(selectedBreakfast.name);
        allSelectedMealNames.add(selectedBreakfast.name);
        breakfastPool.push(selectedBreakfast);
      }
    }
  }
  
  console.log(`✓ Breakfast pool: ${breakfastPool.map(b => b.name).join(' | ')}`);
  
  // Track breakfast for 2-day batch cooking pattern
  let previousDayBreakfast: MealOption | null = null;
  
  for (let day = 1; day <= 7; day++) {
    // BREAKFAST: Skip Day 1 (Sunday evening only has dinner), start from Day 2
    // 2-day batch cooking pattern: Cook on Day 2, 4, 6 → Leftover on Day 3, 5, 7
    if (day !== 1) {
      const isWeekend = day === 6 || day === 7; // Saturday or Sunday
      
      // Determine if this is a fresh cooking day or leftover day
      // Day 2 (Monday): Cook for 2 days
      // Day 3 (Tuesday): Leftover from Day 2
      // Day 4 (Wednesday): Cook for 2 days
      // Day 5 (Thursday): Leftover from Day 4
      // Day 6 (Friday): Cook for 2 days
      // Day 7 (Saturday): Leftover from Day 6
      const isLeftoverDay = day % 2 === 1 && day !== 1; // Odd days after day 1 are leftover days
      
      let selectedBreakfast: MealOption;
      let isBreakfastLeftover = false;
      
      if (isLeftoverDay && previousDayBreakfast) {
        // Use leftover from previous day
        selectedBreakfast = previousDayBreakfast;
        isBreakfastLeftover = true;
        console.log(`Day ${day} (${isWeekend ? 'weekend' : 'weekday'}) breakfast: ${selectedBreakfast.name} (LEFTOVER from previous day)`);
      } else {
        // Fresh breakfast - cook for 2 days (today + tomorrow)
        selectedBreakfast = breakfastPool[Math.floor((day - 2) / 2)]; // Select from pool based on cooking day
        previousDayBreakfast = selectedBreakfast; // Save for next day's leftover
        console.log(`Day ${day} (${isWeekend ? 'weekend' : 'weekday'}) breakfast: ${selectedBreakfast.name} (COOKING for 2 days - prep: ${selectedBreakfast.nutrition.prepTime}min)`);
      }
      
      if (selectedBreakfast) {
        const householdSize = user?.householdSize || 1;
        
        // BREAKFAST BATCH COOKING: Cook for 2 days on fresh days, 1 day on leftover days
        // Fresh days: servingMultiplier = 2 (cooking for 2 days)
        // Leftover days: servingMultiplier = 1 (already cooked)
        const breakfastServingMultiplier = isBreakfastLeftover ? 1 : 2;
        const portionFactor = caloricAdjustment * householdSize;
        
        let adjustedPortion = adjustMealPortion(selectedBreakfast.portion, portionFactor, breakfastServingMultiplier);
        let adjustedProtein = Math.round(selectedBreakfast.nutrition.protein * portionFactor);
        const prepTime = isBreakfastLeftover ? 5 : selectedBreakfast.nutrition.prepTime;
        
        // Create descriptive meal name
        const mealDescription = selectedBreakfast.name;
        
        // Validate that recipe ID exists to prevent mismatches
        if (!selectedBreakfast.id) {
          console.error(`❌ CRITICAL ERROR: Recipe ID missing for breakfast "${selectedBreakfast.name}" on day ${day}`);
          throw new Error(`Recipe ID is undefined for "${selectedBreakfast.name}" - this would cause ID/description mismatch`);
        }
        
        // Classify sugar content from ingredients
        const breakfastSugar = Math.round((selectedBreakfast.nutrition.sugar || 0) * portionFactor);
        const breakfastSugarClassification = classifySugarContent(
          selectedBreakfast.ingredients || [],
          breakfastSugar
        );
        
        meals.push({
          mealPlanId: 0,
          day,
          mealType: 'breakfast',
          recipeId: selectedBreakfast.id, // Store recipe ID for translation
          foodDescription: mealDescription,
          portion: adjustedPortion,
          protein: adjustedProtein,
          calories: Math.round((selectedBreakfast.nutrition.calories || 0) * portionFactor),
          carbohydrates: Math.round((selectedBreakfast.nutrition.carbohydrates || 0) * portionFactor),
          fats: Math.round((selectedBreakfast.nutrition.fats || 0) * portionFactor),
          fiber: Math.round((selectedBreakfast.nutrition.fiber || 0) * portionFactor),
          sugar: breakfastSugar,
          addedSugar: breakfastSugarClassification.addedSugar,
          freeSugar: breakfastSugarClassification.freeSugar,
          intrinsicSugar: breakfastSugarClassification.intrinsicSugar,
          sodium: Math.round((selectedBreakfast.nutrition.sodium || 0) * portionFactor),
          potassium: Math.round((selectedBreakfast.nutrition.potassium || 0) * portionFactor),
          iron: Math.round(((selectedBreakfast.nutrition.iron || 0) * portionFactor) * 10) / 10,
          vitaminC: Math.round((selectedBreakfast.nutrition.vitaminC || 0) * portionFactor),
          vitaminK: Math.round(((selectedBreakfast.nutrition as any).vitaminK || 0) * portionFactor),
          zinc: Math.round(((selectedBreakfast.nutrition as any).zinc || 0) * portionFactor * 10) / 10,
          calcium: Math.round(((selectedBreakfast.nutrition as any).calcium || 0) * portionFactor),
          omega3: Math.round(((selectedBreakfast.nutrition as any).omega3 || 0) * portionFactor),
          polyphenols: Math.round(((selectedBreakfast.nutrition as any).polyphenols || 0) * portionFactor),
          prepTime: prepTime,
          isLeftover: isBreakfastLeftover,
        });
        
        // Track egg-based breakfast meals per day (for 1-per-day limit)
        if (mealContainsEggs(selectedBreakfast)) {
          const currentCount = eggMealsPerDay.get(day) || 0;
          eggMealsPerDay.set(day, currentCount + 1);
          console.log(`🥚 Egg breakfast tracked: "${selectedBreakfast.name}" (day ${day} now has ${currentCount + 1} egg meal(s))`);
        }
        
        totalWeeklyProtein += adjustedProtein;
      }
    }
    
    // LUNCH & DINNER: Use Sunday night cooking pattern
    if (daysWithMeals.includes(day)) {
      // Days with home cooking - use Sunday night pattern
      
      // Apply egg limit constraint for this day's lunch/dinner options
      const currentDayEggCount = eggMealsPerDay.get(day) || 0;
      const excludeEggMeals = currentDayEggCount >= MAX_EGG_MEALS_PER_DAY;
      let filteredWeekdayLunchOptions = weekdayLunchOptions;
      let filteredLunchOptions = lunchOptions;
      let filteredWeekdayDinnerOptions = weekdayDinnerOptions;
      let filteredDinnerOptions = dinnerOptions;
      
      if (excludeEggMeals) {
        // Filter out egg-containing meals for lunch
        const nonEggWeekdayLunch = weekdayLunchOptions.filter(meal => !mealContainsEggs(meal));
        const nonEggLunch = lunchOptions.filter(meal => !mealContainsEggs(meal));
        if (nonEggWeekdayLunch.length > 0) filteredWeekdayLunchOptions = nonEggWeekdayLunch;
        if (nonEggLunch.length > 0) filteredLunchOptions = nonEggLunch;
        console.log(`🥚 Day ${day} egg limit: Filtering lunch options (${weekdayLunchOptions.length} → ${filteredWeekdayLunchOptions.length} weekday, ${lunchOptions.length} → ${filteredLunchOptions.length} all)`);
        
        // Filter out egg-containing meals for dinner
        const nonEggWeekdayDinner = weekdayDinnerOptions.filter(meal => !mealContainsEggs(meal));
        const nonEggDinner = dinnerOptions.filter(meal => !mealContainsEggs(meal));
        if (nonEggWeekdayDinner.length > 0) filteredWeekdayDinnerOptions = nonEggWeekdayDinner;
        if (nonEggDinner.length > 0) filteredDinnerOptions = nonEggDinner;
        console.log(`🥚 Day ${day} egg limit: Filtering dinner options (${weekdayDinnerOptions.length} → ${filteredWeekdayDinnerOptions.length} weekday, ${dinnerOptions.length} → ${filteredDinnerOptions.length} all)`);
      }
      
      // LUNCH LOGIC - Same-meal-type pairing (lunch→lunch leftovers)
      // Fresh cooking on Mon/Wed/Fri, leftovers on Tue/Thu/Sat
      let lunchMeal = null;
      let isLunchLeftover = false;
      
      // Track lunch meals for same-type leftover pairing
      if (day === 2) {
        // Day 2: Monday lunch - FRESH cooking
        const isWeekday = day >= 2 && day <= 6;
        const mealOptions = isWeekday ? filteredWeekdayLunchOptions : filteredLunchOptions;
        const lunchResult = await selectUnusedMealIntelligently(mealOptions, usedLunchMeals, allSelectedMealNames, false, ingredientsToUseUp, 'lunch', dietaryTags, dailyProteinTarget, user?.id, user, excludeEggMeals);
        lunchMeal = lunchResult.meal;
        mondayLunchMeal = lunchMeal;
        usedLunchMeals.add(lunchMeal.name);
        allSelectedMealNames.add(lunchMeal.name);
        console.log(`🍽️ Day 2 Monday lunch (fresh): "${lunchMeal.name}"`);
      } else if (day === 3 && mondayLunchMeal) {
        // Day 3: Tuesday lunch - LEFTOVER from Monday lunch
        lunchMeal = mondayLunchMeal;
        isLunchLeftover = true;
        console.log(`🍽️ Day 3 Tuesday lunch (leftover): "${lunchMeal.name}"`);
      } else if (day === 4) {
        // Day 4: Wednesday lunch - FRESH cooking
        const isWeekday = day >= 2 && day <= 6;
        const mealOptions = isWeekday ? filteredWeekdayLunchOptions : filteredLunchOptions;
        const lunchResult = await selectUnusedMealIntelligently(mealOptions, usedLunchMeals, allSelectedMealNames, false, ingredientsToUseUp, 'lunch', dietaryTags, dailyProteinTarget, user?.id, user, excludeEggMeals);
        lunchMeal = lunchResult.meal;
        wednesdayLunchMeal = lunchMeal;
        usedLunchMeals.add(lunchMeal.name);
        allSelectedMealNames.add(lunchMeal.name);
        console.log(`🍽️ Day 4 Wednesday lunch (fresh): "${lunchMeal.name}"`);
      } else if (day === 5 && wednesdayLunchMeal) {
        // Day 5: Thursday lunch - LEFTOVER from Wednesday lunch
        lunchMeal = wednesdayLunchMeal;
        isLunchLeftover = true;
        console.log(`🍽️ Day 5 Thursday lunch (leftover): "${lunchMeal.name}"`);
      } else if (day === 6) {
        // Day 6: Friday lunch - FRESH cooking
        const isWeekday = day >= 2 && day <= 6;
        const mealOptions = isWeekday ? filteredWeekdayLunchOptions : filteredLunchOptions;
        const lunchResult = await selectUnusedMealIntelligently(mealOptions, usedLunchMeals, allSelectedMealNames, false, ingredientsToUseUp, 'lunch', dietaryTags, dailyProteinTarget, user?.id, user, excludeEggMeals);
        lunchMeal = lunchResult.meal;
        fridayLunchMeal = lunchMeal;
        usedLunchMeals.add(lunchMeal.name);
        allSelectedMealNames.add(lunchMeal.name);
        console.log(`🍽️ Day 6 Friday lunch (fresh): "${lunchMeal.name}"`);
      } else if (day === 7 && fridayLunchMeal) {
        // Day 7: Saturday lunch - LEFTOVER from Friday lunch
        lunchMeal = fridayLunchMeal;
        isLunchLeftover = true;
        console.log(`🍽️ Day 7 Saturday lunch (leftover): "${lunchMeal.name}"`);
      } else if (day !== 1) {
        // Fallback fresh lunch
        const isWeekday = day >= 2 && day <= 6;
        const mealOptions = isWeekday ? filteredWeekdayLunchOptions : filteredLunchOptions;
        const lunchResult = await selectUnusedMealIntelligently(mealOptions, usedLunchMeals, allSelectedMealNames, false, ingredientsToUseUp, 'lunch', dietaryTags, dailyProteinTarget, user?.id, user, excludeEggMeals);
        lunchMeal = lunchResult.meal;
        usedLunchMeals.add(lunchMeal.name);
        allSelectedMealNames.add(lunchMeal.name);
      }
      
      if (lunchMeal) {
        // Check if this lunch will be used for tomorrow's lunch (same-type batch cooking)
        const willBeLeftover = (day === 2 && daysWithMeals.includes(3)) || // Monday lunch → Tuesday lunch
                               (day === 4 && daysWithMeals.includes(5)) || // Wednesday lunch → Thursday lunch
                               (day === 6 && daysWithMeals.includes(7));   // Friday lunch → Saturday lunch
        
        const householdSize = user?.householdSize || 1;
        
        // servingMultiplier already handles batch cooking for multiple days
        // Only apply household size multiplier if servingMultiplier = 1 (cooking every day)
        let portionFactor = caloricAdjustment * householdSize;
        
        // Only apply leftover doubling if NOT using servingMultiplier
        // (servingMultiplier already covers cooking for multiple eating days)
        if (servingMultiplier === 1 && willBeLeftover && !isLunchLeftover && householdSize === 1) {
          portionFactor *= 2; // Double for single person cooking for leftovers
        }
        
        // Portion shows "2x" for batch cooking, but protein is per eating day (not total cooked)
        let adjustedPortion = adjustMealPortion(lunchMeal.portion, portionFactor, servingMultiplier);
        let adjustedProtein = Math.round(lunchMeal.nutrition.protein * portionFactor);
        const prepTime = isLunchLeftover ? 5 : lunchMeal.nutrition.prepTime;
        
        // Create descriptive meal name (no seasonal adaptation needed since warming recipes are filtered out)
        let mealDescription = lunchMeal.name;
        
        // Validate that recipe ID exists to prevent mismatches
        if (!lunchMeal.id) {
          console.error(`❌ CRITICAL ERROR: Recipe ID missing for lunch "${lunchMeal.name}" on day ${day}`);
          throw new Error(`Recipe ID is undefined for "${lunchMeal.name}" - this would cause ID/description mismatch`);
        }
        
        // Classify sugar content from ingredients
        const lunchSugar = Math.round((lunchMeal.nutrition.sugar || 0) * portionFactor);
        const lunchSugarClassification = classifySugarContent(
          lunchMeal.ingredients || [],
          lunchSugar
        );
        
        meals.push({
          mealPlanId: 0,
          day,
          mealType: 'lunch',
          recipeId: lunchMeal.id, // Store recipe ID for translation
          foodDescription: mealDescription,
          portion: adjustedPortion,
          protein: adjustedProtein,
          calories: Math.round((lunchMeal.nutrition.calories || 0) * portionFactor),
          carbohydrates: Math.round((lunchMeal.nutrition.carbohydrates || 0) * portionFactor),
          fats: Math.round((lunchMeal.nutrition.fats || 0) * portionFactor),
          fiber: Math.round((lunchMeal.nutrition.fiber || 0) * portionFactor),
          sugar: lunchSugar,
          addedSugar: lunchSugarClassification.addedSugar,
          freeSugar: lunchSugarClassification.freeSugar,
          intrinsicSugar: lunchSugarClassification.intrinsicSugar,
          sodium: Math.round((lunchMeal.nutrition.sodium || 0) * portionFactor),
          potassium: Math.round((lunchMeal.nutrition.potassium || 0) * portionFactor),
          iron: Math.round(((lunchMeal.nutrition.iron || 0) * portionFactor) * 10) / 10,
          vitaminC: Math.round((lunchMeal.nutrition.vitaminC || 0) * portionFactor),
          vitaminK: Math.round(((lunchMeal.nutrition as any).vitaminK || 0) * portionFactor),
          zinc: Math.round(((lunchMeal.nutrition as any).zinc || 0) * portionFactor * 10) / 10,
          calcium: Math.round(((lunchMeal.nutrition as any).calcium || 0) * portionFactor),
          omega3: Math.round(((lunchMeal.nutrition as any).omega3 || 0) * portionFactor),
          polyphenols: Math.round(((lunchMeal.nutrition as any).polyphenols || 0) * portionFactor),
          prepTime: prepTime,
          isLeftover: isLunchLeftover, // Boolean flag instead of string marker
        });
        
        // Track egg-based lunch meals per day (for 1-per-day limit)
        if (mealContainsEggs(lunchMeal)) {
          const currentCount = eggMealsPerDay.get(day) || 0;
          eggMealsPerDay.set(day, currentCount + 1);
          console.log(`🥚 Egg lunch tracked: "${lunchMeal.name}" (day ${day} now has ${currentCount + 1} egg meal(s))`);
        }
        
        totalWeeklyProtein += adjustedProtein;
      }
      
      // DINNER LOGIC - Same-meal-type pairing (dinner→dinner leftovers) with low-carb filtering
      // Fresh cooking on Mon/Wed/Fri, leftovers on Tue/Thu/Sat
      let dinnerMeal = null;
      let isDinnerLeftover = false;
      
      // Apply low-carb filter for all dinners (default 50g max carbs for healthy eating)
      // This is now the default for everyone to promote balanced evening meals
      const DEFAULT_LOW_CARB_LIMIT = 50; // 50g carbs gives good variety while staying low-carb
      const dinnerLowCarbMaxCarbs = user?.dinnerLowCarbMaxCarbs || DEFAULT_LOW_CARB_LIMIT;
      
      console.log(`🥗 LOW-CARB DINNER: Filtering for ≤${dinnerLowCarbMaxCarbs}g carbs (default for all users)`);
      let lowCarbDinnerOptions = filterLowCarbMeals(filteredDinnerOptions, dinnerLowCarbMaxCarbs);
      let lowCarbWeekdayDinnerOptions = filterLowCarbMeals(filteredWeekdayDinnerOptions, dinnerLowCarbMaxCarbs);
      
      // Re-check egg count after lunch was added (if lunch had eggs, filter dinner options)
      const updatedDayEggCount = eggMealsPerDay.get(day) || 0;
      const excludeEggMealsForDinner = updatedDayEggCount >= MAX_EGG_MEALS_PER_DAY;
      if (excludeEggMealsForDinner) {
        const nonEggLowCarbDinner = lowCarbDinnerOptions.filter(meal => !mealContainsEggs(meal));
        const nonEggLowCarbWeekday = lowCarbWeekdayDinnerOptions.filter(meal => !mealContainsEggs(meal));
        if (nonEggLowCarbDinner.length > 0) lowCarbDinnerOptions = nonEggLowCarbDinner;
        if (nonEggLowCarbWeekday.length > 0) lowCarbWeekdayDinnerOptions = nonEggLowCarbWeekday;
        console.log(`🥚 Day ${day} egg limit (post-lunch): Filtering dinner options to exclude eggs`);
      }
      
      if (day === 1) {
        // Day 1: Sunday - no dinner cooking (week starts fresh on Monday)
        // User eats out or skips Sunday dinner
        dinnerMeal = null;
      } else if (day === 2) {
        // Day 2: Monday dinner - FRESH cooking (low-carb)
        const isWeekday = day >= 2 && day <= 6;
        const mealOptions = isWeekday ? lowCarbWeekdayDinnerOptions : lowCarbDinnerOptions;
        const selectedMondayDinnerResult = await selectUnusedMealIntelligently(mealOptions, usedDinnerMeals, allSelectedMealNames, false, ingredientsToUseUp, 'dinner', dietaryTags, dailyProteinTarget, user?.id, user, excludeEggMealsForDinner);
        dinnerMeal = selectedMondayDinnerResult.meal;
        mondayDinnerMeal = dinnerMeal;
        usedDinnerMeals.add(dinnerMeal.name);
        allSelectedMealNames.add(dinnerMeal.name);
        console.log(`🍽️ Day 2 Monday dinner (fresh, low-carb): "${dinnerMeal.name}" (${dinnerMeal.nutrition.carbohydrates}g carbs)`);
      } else if (day === 3 && mondayDinnerMeal) {
        // Day 3: Tuesday dinner - LEFTOVER from Monday dinner
        dinnerMeal = mondayDinnerMeal;
        isDinnerLeftover = true;
        console.log(`🍽️ Day 3 Tuesday dinner (leftover): "${dinnerMeal.name}"`);
      } else if (day === 4) {
        // Day 4: Wednesday dinner - FRESH cooking (low-carb)
        const isWeekday = day >= 2 && day <= 6;
        const mealOptions = isWeekday ? lowCarbWeekdayDinnerOptions : lowCarbDinnerOptions;
        const wednesdayDinnerResult = await selectUnusedMealIntelligently(mealOptions, usedDinnerMeals, allSelectedMealNames, false, ingredientsToUseUp, 'dinner', dietaryTags, dailyProteinTarget, user?.id, user, excludeEggMealsForDinner);
        dinnerMeal = wednesdayDinnerResult.meal;
        wednesdayDinnerMeal = dinnerMeal;
        usedDinnerMeals.add(dinnerMeal.name);
        allSelectedMealNames.add(dinnerMeal.name);
        console.log(`🍽️ Day 4 Wednesday dinner (fresh, low-carb): "${dinnerMeal.name}" (${dinnerMeal.nutrition.carbohydrates}g carbs)`);
      } else if (day === 5 && wednesdayDinnerMeal) {
        // Day 5: Thursday dinner - LEFTOVER from Wednesday dinner
        dinnerMeal = wednesdayDinnerMeal;
        isDinnerLeftover = true;
        console.log(`🍽️ Day 5 Thursday dinner (leftover): "${dinnerMeal.name}"`);
      } else if (day === 6) {
        // Day 6: Friday dinner - FRESH cooking (low-carb)
        const isWeekday = day >= 2 && day <= 6;
        const mealOptions = isWeekday ? lowCarbWeekdayDinnerOptions : lowCarbDinnerOptions;
        const fridayDinnerResult = await selectUnusedMealIntelligently(mealOptions, usedDinnerMeals, allSelectedMealNames, false, ingredientsToUseUp, 'dinner', dietaryTags, dailyProteinTarget, user?.id, user, excludeEggMealsForDinner);
        dinnerMeal = fridayDinnerResult.meal;
        fridayDinnerMeal = dinnerMeal;
        usedDinnerMeals.add(dinnerMeal.name);
        allSelectedMealNames.add(dinnerMeal.name);
        console.log(`🍽️ Day 6 Friday dinner (fresh, low-carb): "${dinnerMeal.name}" (${dinnerMeal.nutrition.carbohydrates}g carbs)`);
      } else if (day === 7 && fridayDinnerMeal) {
        // Day 7: Saturday dinner - LEFTOVER from Friday dinner
        dinnerMeal = fridayDinnerMeal;
        isDinnerLeftover = true;
        console.log(`🍽️ Day 7 Saturday dinner (leftover): "${dinnerMeal.name}"`);
      } else if (day !== 1) {
        // Fallback dinner - fresh cooking with low-carb options
        const isWeekday = day >= 2 && day <= 6;
        const mealOptions = isWeekday ? lowCarbWeekdayDinnerOptions : lowCarbDinnerOptions;
        const fallbackDinnerResult = await selectUnusedMealIntelligently(mealOptions, usedDinnerMeals, allSelectedMealNames, false, ingredientsToUseUp, 'dinner', dietaryTags, dailyProteinTarget, user?.id, user, excludeEggMealsForDinner);
        dinnerMeal = fallbackDinnerResult.meal;
        usedDinnerMeals.add(dinnerMeal.name);
        allSelectedMealNames.add(dinnerMeal.name);
      }
      
      if (dinnerMeal) {
        // Check if this dinner will be used for tomorrow's dinner (same-type batch cooking)
        const willBeLeftover = (day === 2 && daysWithMeals.includes(3)) || // Monday dinner → Tuesday dinner
                               (day === 4 && daysWithMeals.includes(5)) || // Wednesday dinner → Thursday dinner
                               (day === 6 && daysWithMeals.includes(7));   // Friday dinner → Saturday dinner
        
        const householdSize = user?.householdSize || 1;
        
        // servingMultiplier already handles batch cooking for multiple days
        // Only apply household size multiplier if servingMultiplier = 1 (cooking every day)
        // Otherwise servingMultiplier already accounts for cooking fewer days
        let portionFactor = caloricAdjustment * householdSize;
        
        // Only apply leftover doubling if NOT using servingMultiplier
        // (servingMultiplier already covers cooking for multiple eating days)
        if (servingMultiplier === 1 && willBeLeftover && !isDinnerLeftover && householdSize === 1) {
          portionFactor *= 2; // Double for single person cooking for leftovers
        }
        
        // Portion shows "2x" for batch cooking, but protein is per eating day (not total cooked)
        let adjustedPortion = adjustMealPortion(dinnerMeal.portion, portionFactor, servingMultiplier);
        let adjustedProtein = Math.round(dinnerMeal.nutrition.protein * portionFactor);
        const prepTime = isDinnerLeftover ? 5 : dinnerMeal.nutrition.prepTime;
        
        // Create descriptive meal name (no seasonal adaptation needed since warming recipes are filtered out)
        let mealDescription = dinnerMeal.name;
        
        // Validate that recipe ID exists to prevent mismatches
        if (!dinnerMeal.id) {
          console.error(`❌ CRITICAL ERROR: Recipe ID missing for dinner "${dinnerMeal.name}" on day ${day}`);
          throw new Error(`Recipe ID is undefined for "${dinnerMeal.name}" - this would cause ID/description mismatch`);
        }
        
        // Classify sugar content from ingredients
        const dinnerSugar = Math.round((dinnerMeal.nutrition.sugar || 0) * portionFactor);
        const dinnerSugarClassification = classifySugarContent(
          dinnerMeal.ingredients || [],
          dinnerSugar
        );
        
        meals.push({
          mealPlanId: 0,
          day,
          mealType: 'dinner',
          recipeId: dinnerMeal.id, // Store recipe ID for translation
          foodDescription: mealDescription,
          portion: adjustedPortion,
          protein: adjustedProtein,
          calories: Math.round((dinnerMeal.nutrition.calories || 0) * portionFactor),
          carbohydrates: Math.round((dinnerMeal.nutrition.carbohydrates || 0) * portionFactor),
          fats: Math.round((dinnerMeal.nutrition.fats || 0) * portionFactor),
          fiber: Math.round((dinnerMeal.nutrition.fiber || 0) * portionFactor),
          sugar: dinnerSugar,
          addedSugar: dinnerSugarClassification.addedSugar,
          freeSugar: dinnerSugarClassification.freeSugar,
          intrinsicSugar: dinnerSugarClassification.intrinsicSugar,
          sodium: Math.round((dinnerMeal.nutrition.sodium || 0) * portionFactor),
          potassium: Math.round((dinnerMeal.nutrition.potassium || 0) * portionFactor),
          iron: Math.round(((dinnerMeal.nutrition.iron || 0) * portionFactor) * 10) / 10,
          vitaminC: Math.round((dinnerMeal.nutrition.vitaminC || 0) * portionFactor),
          vitaminK: Math.round(((dinnerMeal.nutrition as any).vitaminK || 0) * portionFactor),
          zinc: Math.round(((dinnerMeal.nutrition as any).zinc || 0) * portionFactor * 10) / 10,
          calcium: Math.round(((dinnerMeal.nutrition as any).calcium || 0) * portionFactor),
          omega3: Math.round(((dinnerMeal.nutrition as any).omega3 || 0) * portionFactor),
          polyphenols: Math.round(((dinnerMeal.nutrition as any).polyphenols || 0) * portionFactor),
          prepTime: prepTime,
          isLeftover: isDinnerLeftover, // Boolean flag instead of string marker
        });
        
        // Track egg-based dinner meals per day (for 1-per-day limit)
        if (mealContainsEggs(dinnerMeal)) {
          const currentCount = eggMealsPerDay.get(day) || 0;
          eggMealsPerDay.set(day, currentCount + 1);
          console.log(`🥚 Egg dinner tracked: "${dinnerMeal.name}" (day ${day} now has ${currentCount + 1} egg meal(s))`);
        }
        
        totalWeeklyProtein += adjustedProtein;
      }
    } else {
      // Days with eating out - add single "eating out" placeholder meal to avoid repetition
      // Alternate between lunch and dinner for variety
      const mealType = (day % 2 === 0) ? 'lunch' : 'dinner';
      
      meals.push({
        mealPlanId: 0,
        day,
        mealType,
        foodDescription: 'Eating out',
        portion: '',
        protein: 0,
        prepTime: 0,
      });
    }
  }

  // Calculate actual days with meals for proper protein average
  // Only count days that have real meals (exclude "eating out" days from protein calculation)
  const actualDaysWithMeals = new Set();
  
  // Count each day that has at least one real meal (with protein > 0)
  meals.forEach(meal => {
    if (meal.protein > 0 && meal.foodDescription !== 'Eating out') {
      actualDaysWithMeals.add(meal.day);
    }
  });
  
  const totalDaysWithMeals = actualDaysWithMeals.size;
  const averageProteinPerDay = totalDaysWithMeals > 0 ? totalWeeklyProtein / totalDaysWithMeals : 0;
  
  console.log(`🥩 Protein calculation (pre-adjustment): ${totalWeeklyProtein}g total / ${totalDaysWithMeals} full meal days = ${averageProteinPerDay.toFixed(1)}g per day`);

  // Log which leftover ingredients were successfully used
  const usedIngredients = ingredientsToUseUp.filter(ingredient => {
    const englishEquivalent = translateDutchIngredientToEnglish(ingredient.toLowerCase());
    return meals.some(meal => {
      const mealLower = meal.foodDescription.toLowerCase();
      return mealLower.includes(ingredient.toLowerCase()) || 
             mealLower.includes(englishEquivalent.toLowerCase());
    });
  });
  
  if (usedIngredients.length > 0) {
    console.log(`✅ LEFTOVER INGREDIENTS USED: ${usedIngredients.join(', ')} were incorporated into your meal plan!`);
  } else if (ingredientsToUseUp.length > 0) {
    console.log(`⚠️ LEFTOVER INGREDIENTS: None of your ingredients (${ingredientsToUseUp.join(', ')}) were used this time. Try adjusting your dietary preferences for better matches.`);
  }

  // Apply TDEE-based portion adjustment to match target daily calories
  const adjustedMeals = applyTDEEBasedPortionAdjustment(meals, user);

  // Recalculate protein after TDEE adjustment
  const daysWithAdjustedMeals = new Set();
  let adjustedTotalProtein = 0;
  adjustedMeals.forEach(meal => {
    if (meal.protein > 0 && meal.foodDescription !== 'Eating out') {
      daysWithAdjustedMeals.add(meal.day);
      adjustedTotalProtein += meal.protein;
    }
  });
  const adjustedAverageProteinPerDay = daysWithAdjustedMeals.size > 0 
    ? adjustedTotalProtein / daysWithAdjustedMeals.size 
    : 0;

  console.log(`🥩 Protein after TDEE adjustment: ${adjustedAverageProteinPerDay.toFixed(1)}g per day`);

  const mealPlan: InsertMealPlan = {
    userId: request.userId || 1,
    weekStart: normalizedWeekStart,
    activityLevel: request.activityLevel,
    totalProtein: Math.round(adjustedAverageProteinPerDay), // Use adjusted protein
    weekendMealPrepEnabled: request.weekendMealPrepEnabled || false,
  };

  console.timeEnd('⏱️  Total meal plan generation');
  return { mealPlan, meals: adjustedMeals, usedLeftoverIngredients: usedIngredients };
}

export function formatMealPlanForNotion(mealPlan: InsertMealPlan, meals: InsertMeal[]) {
  const startDate = new Date(mealPlan.weekStart);
  
  return meals.map(meal => {
    const mealDate = new Date(startDate);
    mealDate.setDate(startDate.getDate() + meal.day - 1);
    
    return {
      Date: mealDate.toISOString().split('T')[0],
      Meal: meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1),
      Food: meal.foodDescription,
      Portion: meal.portion,
      'Protein (g)': meal.protein,
    };
  });
}