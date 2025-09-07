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
import { calculateMealFreshnessPriority, getRecommendedDayForMeal, logMealFreshnessAnalysis, sortMealsByFreshness } from "./ingredient-freshness";
import { normalizeToSunday } from "./date-utils";
import { storage } from "./storage";
import { applyDietarySubstitutions } from "./ingredient-substitution";
import { getIntelligentRecipeRecommendation } from './intelligent-ingredient-matcher';

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
}

/**
 * Calculate BMI from weight and height
 */
function calculateBMI(weight: number, height: number): number {
  return weight / ((height / 100) ** 2);
}

/**
 * Calculate caloric adjustment factor based on user's goals, BMI, and timeline
 */
function calculateCaloricAdjustment(user: User): number {
  if (!user.weight) return 1.0;

  // Start with baseline adjustment
  let adjustment = 1.0;

  // Weight goal adjustment
  if (user.goalWeight) {
    const weightDifference = user.goalWeight - user.weight;
    const isLosingWeight = weightDifference < 0;
    const isGainingWeight = weightDifference > 0;

    if (isLosingWeight) {
      adjustment = 0.85; // Reduce portions for weight loss
    } else if (isGainingWeight) {
      adjustment = 1.15; // Increase portions for weight gain
    }
  }

  // BMI-based adjustment (if height available)
  if (user.height) {
    const bmi = calculateBMI(user.weight, user.height);
    if (bmi < 18.5) {
      adjustment *= 1.1; // Increase portions for underweight
    } else if (bmi > 25) {
      adjustment *= 0.9; // Reduce portions for overweight
    }
  }

  return Math.max(0.7, Math.min(1.3, adjustment)); // Keep within reasonable bounds
}

/**
 * Calculate serving multiplier based on cooking vs eating frequency
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
  
  // Cap at reasonable limits (max 4 servings per recipe)
  return Math.min(servingMultiplier, 4);
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
    'bleekselderij': 'celery',
    'spinazie': 'spinach',
    'zoete aardappel': 'sweet potato',
    'erwten': 'peas',
    'wortel': 'carrot',
    'ui': 'onion',
    'knoflook': 'garlic',
    'tomaat': 'tomato',
    'courgette': 'zucchini',
    'aubergine': 'eggplant',
    'paprika': 'bell pepper',
    'broccoli': 'broccoli',
    'bloemkool': 'cauliflower',
    'champignons': 'mushrooms',
    'rode kool': 'red cabbage',
    'witte kool': 'white cabbage',
    'boerenkool': 'kale',
    'rucola': 'arugula',
    'basilicum': 'basil',
    'peterselie': 'parsley',
    'tijm': 'thyme',
    'rozemarijn': 'rosemary'
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
  
  console.log(`🔍 INGREDIENT MATCH: Checking "${leftoverIngredient}" (English: "${englishEquivalent}") against meal "${meal.name}"`);
  
  // Direct ingredient match (highest score) - check both original and translated
  const hasDirectMatch = mealIngredients.some(ing => 
    ing.includes(leftoverLower) || leftoverLower.includes(ing) ||
    ing.includes(englishLower) || englishLower.includes(ing) ||
    mealName.includes(leftoverLower) || mealName.includes(englishLower)
  );
  
  if (hasDirectMatch) {
    score += 10;
    console.log(`✅ DIRECT MATCH: Found "${leftoverIngredient}" in "${meal.name}" (score +10)`);
  }
  
  // Cuisine and cooking style compatibility - check both original and translated
  const cuisineMatches = {
    'spinach': ['mediterranean', 'italian', 'greek', 'pasta', 'lasagna', 'curry', 'stir'],
    'celery': ['soup', 'stew', 'broth', 'base', 'mirepoix', 'aromatics'],
    'sweet potato': ['roasted', 'baked', 'mash', 'curry', 'african', 'autumn'],
    'peas': ['asian', 'stir', 'curry', 'fresh', 'spring', 'snap'],
    'cauliflower': ['indian', 'curry', 'roasted', 'mash', 'rice', 'keto', 'low-carb'],
    'sugar snap': ['asian', 'stir', 'chinese', 'thai', 'steam', 'crisp']
  };
  
  // Check cuisine compatibility using translated ingredient
  for (const [ingredient, cuisines] of Object.entries(cuisineMatches)) {
    if (englishLower.includes(ingredient) || leftoverLower.includes(ingredient)) {
      for (const cuisine of cuisines) {
        if (mealName.includes(cuisine) || mealIngredients.some(ing => ing.includes(cuisine))) {
          score += 3;
          console.log(`🍽️ CUISINE MATCH: "${leftoverIngredient}" matches "${cuisine}" cuisine (score +3)`);
        }
      }
    }
  }
  
  // Cooking method compatibility - check both original and translated
  const cookingMethodMatches = {
    'spinach': ['sauté', 'steam', 'wilt', 'fresh', 'raw'],
    'celery': ['sauté', 'soup', 'stew', 'braise', 'aromatics'],
    'sweet potato': ['roast', 'bake', 'mash', 'cube', 'dice'],
    'peas': ['steam', 'stir', 'fresh', 'snap', 'quick'],
    'cauliflower': ['roast', 'steam', 'mash', 'rice', 'grain'],
    'sugar snap': ['stir', 'steam', 'crisp', 'crunch', 'fresh']
  };
  
  for (const [ingredient, methods] of Object.entries(cookingMethodMatches)) {
    if (englishLower.includes(ingredient) || leftoverLower.includes(ingredient)) {
      for (const method of methods) {
        if (mealName.includes(method) || mealIngredients.some(ing => ing.includes(method))) {
          score += 2;
          console.log(`👨‍🍳 COOKING MATCH: "${leftoverIngredient}" matches "${method}" method (score +2)`);
        }
      }
    }
  }
  
  // Nutritional profile compatibility
  if (mealIngredients.some(ing => ing.includes('vegetable') || ing.includes('green'))) {
    score += 1;
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
 * Get recently used meals from meal history to prevent week-to-week repetition
 */
async function getRecentMealHistory(userId: number, weeksBack: number = 2): Promise<string[]> {
  try {
    const storage = await getStorage();
    const recentHistory = await storage.getMealHistory(userId, weeksBack * 21); // 3 meals per day × 7 days × weeks
    const recentMealNames = recentHistory.map(h => h.mealName);
    
    if (recentMealNames.length > 0) {
      console.log(`📊 HISTORY CHECK: Found ${recentMealNames.length} recent meals from last ${weeksBack} weeks`);
      console.log(`📊 Recent meals: ${recentMealNames.slice(0, 5).join(', ')}${recentMealNames.length > 5 ? '...' : ''}`);
    }
    
    return recentMealNames;
  } catch (error) {
    console.warn('Failed to fetch meal history for variety checking:', error);
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
  userId?: number
): Promise<{ meal: MealOption; usedIngredients: string[] }> {
  if (availableMeals.length === 0) {
    throw new Error('No available meals to select from');
  }
  
  // Get recent meal history to prevent week-to-week repetition
  const recentMealHistory = userId ? await getRecentMealHistory(userId, 2) : [];
  
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
        
        // Check if this meal is available - more strict checking
        const isUsed = usedMeals.has(candidateMeal.name);
        const isSimilarToGlobal = allSelectedMeals && Array.from(allSelectedMeals).some(selectedMeal => 
          areMealsSimilar(candidateMeal.name, selectedMeal));
        const isInAvailableList = availableMeals.some(meal => meal.name === candidateMeal.name);
        
        console.log(`🔍 Availability check for "${candidateMeal.name}": used=${isUsed}, similar=${isSimilarToGlobal}, available=${isInAvailableList}`);
        
        const isAvailable = !isUsed && !isSimilarToGlobal && isInAvailableList;
            
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
    const selectedMeal = selectedMeals[0] || extraShuffled[0];
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
  // Normalize weekStart to Sunday for consistent week boundaries
  const normalizedWeekStart = normalizeToSunday(request.weekStart);
  console.log(`📅 Week normalized: ${request.weekStart} → ${normalizedWeekStart} (Sunday start)`);
  
  // Calculate personalized protein target based on user profile
  let dailyProteinTarget: number;
  if (user) {
    dailyProteinTarget = calculateUserProteinTarget(user);
    console.log(`🎯 Using personalized protein target: ${dailyProteinTarget}g/day (based on user profile)`);
  } else {
    dailyProteinTarget = calculateProteinTarget(request.activityLevel);
    console.log(`🎯 Using activity-based protein target: ${dailyProteinTarget}g/day (fallback)`);
  }
  
  const meals: InsertMeal[] = [];
  let totalWeeklyProtein = 0;
  let dietaryTags = request.dietaryTags || [];
  
  // Add menstrual phase as a dietary tag if user has selected a phase (not 'off')
  if (user?.menstrualPhase && user.menstrualPhase !== 'off') {
    dietaryTags = [...dietaryTags, user.menstrualPhase];
    console.log(`🩸 Added menstrual phase "${user.menstrualPhase}" to dietary tags: [${dietaryTags.join(', ')}]`);
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
  
  // Check if we should use meal prep mode (cooking days < eating days)
  console.log(`🍳 Meal prep mode check: ${userCookingDays} cooking < ${userEatingDays} eating? ${userCookingDays < userEatingDays}`);
  if (userCookingDays < userEatingDays) {
    console.log(`🎯 ENTERING MEAL PREP MODE: ${userCookingDays} cooking days for ${userEatingDays} eating days`);
    console.log(`🔍 CALLING MEAL PREP with user: ${user?.id}, useOnlyMyRecipes: ${user?.useOnlyMyRecipes}`);
    console.log(`🔍 MEAL PREP USER OBJECT:`, JSON.stringify(user, null, 2));
    
    // Force custom recipe mode for User 2 for testing
    if (user && user.id === 2) {
      console.log(`🎯 FORCING useOnlyMyRecipes=true for User 2 testing`);
      user.useOnlyMyRecipes = true;
      console.log(`🎯 User after forcing:`, JSON.stringify(user, null, 2));
    }
    
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
      origin: 'user-recipe'
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

  // Track which meals to use as leftovers
  let sundayDinnerMeal: MealOption | null = null;
  let mondayDinnerMeal: MealOption | null = null;
  let tuesdayDinnerMeal: MealOption | null = null;
  let wednesdayDinnerMeal: MealOption | null = null;
  let thursdayDinnerMeal: MealOption | null = null;
  
  // Get user settings for meal planning
  const eatingDaysAtHome = user?.eatingDaysAtHome || 7;
  const mealsPerDay = user?.mealsPerDay || 2; // 2 = lunch+dinner, 3 = breakfast+lunch+dinner
  
  console.log(`🎯 USER SETTINGS: ${eatingDaysAtHome} eating days, ${mealsPerDay} meals/day`);
  
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
      // Day 1: Sunday evening - only dinner (start of meal plan)
      mealsToGenerate = ['dinner'];
      console.log(`🌅 Day ${day} (Sunday evening): ONLY dinner`);
    } else {
      // Other days: Generate meals based on mealsPerDay setting
      if (mealsPerDay === 3) {
        mealsToGenerate = ['breakfast', 'lunch', 'dinner'];
        console.log(`🌅 Day ${day}: all 3 meals (breakfast, lunch, dinner)`);
      } else {
        mealsToGenerate = ['lunch', 'dinner'];
        console.log(`🌅 Day ${day}: 2 meals (lunch, dinner)`);
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
      
      // Apply 45-minute cooking time limit for weekdays (Monday-Friday)
      const isWeekday = day >= 2 && day <= 6; // Days 2-6 are Monday-Friday (Day 1 = Sunday)
      if (isWeekday && (mealCategory === 'lunch' || mealCategory === 'dinner')) {
        const originalCount = availableMeals.length;
        availableMeals = availableMeals.filter(meal => meal.nutrition.prepTime <= 45);
        console.log(`Weekday time filter: ${originalCount} → ${availableMeals.length} ${mealCategory} meals (≤45min)`);
      }
      
      if (availableMeals.length === 0) {
        console.error(`CRITICAL: No ${mealCategory} meals available for dietary restrictions: ${dietaryTags.join(', ')}. Skipping this meal.`);
        return; // Skip this meal instead of using inappropriate fallback
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
      } else {
        // Fallback to activity-level based optimization if no user data
        const shouldOptimizeProtein = request.activityLevel === 'high';
        if (shouldOptimizeProtein) {
          availableMeals = selectProteinOptimizedMeals(availableMeals, availableMeals.length, true);
          console.log(`🥩 Applied fallback protein optimization for high activity level`);
        }
      }

      // Implement Sunday night cooking pattern logic
      let isLeftover = false;
      let selectedMeal: MealOption;
      
      if (day === 1 && mealCategory === 'dinner') {
        // Day 1: Sunday dinner - FIRST cooking moment (only meal on Sunday)
        const sundayDinnerResult = await selectUnusedMealIntelligently(availableMeals, usedDinnerMeals, allSelectedMealNames, false, ingredientsToUseUp, 'dinner', dietaryTags, dailyProteinTarget, user?.id);
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
        const mondayDinnerResult = await selectUnusedMealIntelligently(availableMeals, usedDinnerMeals, allSelectedMealNames, false, ingredientsToUseUp, 'dinner', dietaryTags, dailyProteinTarget, user?.id);
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
        const tuesdayDinnerResult = await selectUnusedMealIntelligently(availableMeals, usedDinnerMeals, allSelectedMealNames, false, ingredientsToUseUp, 'dinner', dietaryTags, dailyProteinTarget, user?.id);
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
        selectedMeal = await selectUnusedMealIntelligently(availableMeals, usedDinnerMeals, allSelectedMealNames, false, ingredientsToUseUp, 'dinner', dietaryTags, dailyProteinTarget);
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
        const thursdayDinnerResult = await selectUnusedMealIntelligently(availableMeals, usedDinnerMeals, allSelectedMealNames, false, ingredientsToUseUp, 'dinner', dietaryTags, dailyProteinTarget);
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
        const fridayDinnerResult = await selectUnusedMealIntelligently(availableMeals, usedDinnerMeals, allSelectedMealNames, false, ingredientsToUseUp, 'dinner', dietaryTags, dailyProteinTarget);
        selectedMeal = fridayDinnerResult.meal;
        let fridayDinnerMeal = selectedMeal;
        usedDinnerMeals.add(selectedMeal.name);
        allSelectedMealNames.add(selectedMeal.name);
      } else if (day === 7 && mealCategory === 'lunch') {
        // Day 7: Saturday lunch - only add eating out if user doesn't eat at home
        if (!daysWithRealMeals.has(day)) {
          selectedMeal = {
            name: "Eating out",
            portion: "",
            nutrition: { protein: 0, prepTime: 30, calories: 0, carbohydrates: 0, fats: 0, fiber: 0, sugar: 0, sodium: 0 },
            ingredients: [],
            tags: [],
            recipe: { instructions: [], tips: [] }
          };
        } else {
          // User eats at home - select proper meal
          const saturdayLunchResult = await selectUnusedMealIntelligently(availableMeals, usedLunchMeals, allSelectedMealNames, false, ingredientsToUseUp, 'lunch', dietaryTags, dailyProteinTarget);
          selectedMeal = saturdayLunchResult.meal;
          usedLunchMeals.add(selectedMeal.name);
          allSelectedMealNames.add(selectedMeal.name);
        }
      } else if (day === 7 && mealCategory === 'dinner') {
        // Day 7: Saturday dinner - only add eating out if different from lunch
        if (!daysWithRealMeals.has(day)) {
          // Only add "Eating out" for dinner if lunch wasn't already "Eating out"
          const lunchMeal = meals.find(m => m.day === day && m.mealType === 'lunch');
          if (!lunchMeal || lunchMeal.foodDescription !== 'Eating out') {
            selectedMeal = {
              name: "Eating out",
              portion: "",
              nutrition: { protein: 0, prepTime: 30, calories: 0, carbohydrates: 0, fats: 0, fiber: 0, sugar: 0, sodium: 0 },
              ingredients: [],
              tags: [],
              recipe: { instructions: [], tips: [] }
            };
          } else {
            // Skip duplicate eating out - generate actual meal instead
            const saturdayDinnerAltResult = await selectUnusedMealIntelligently(availableMeals, usedDinnerMeals, allSelectedMealNames, false, ingredientsToUseUp, 'dinner', dietaryTags, dailyProteinTarget, user?.id);
            selectedMeal = saturdayDinnerAltResult.meal;
            usedDinnerMeals.add(selectedMeal.name);
            allSelectedMealNames.add(selectedMeal.name);
          }
        } else {
          // User eats at home - select proper meal
          const saturdayDinnerResult = await selectUnusedMealIntelligently(availableMeals, usedDinnerMeals, allSelectedMealNames, false, ingredientsToUseUp, 'dinner', dietaryTags, dailyProteinTarget, user?.id);
          selectedMeal = saturdayDinnerResult.meal;
          usedDinnerMeals.add(selectedMeal.name);
          allSelectedMealNames.add(selectedMeal.name);
        }
      } else if (mealCategory === 'breakfast') {
        // Smart breakfast scheduling: easy options for weekdays, elaborate for weekends
        const isWeekend = day === 6 || day === 7; // Saturday or Sunday
        
        if (isWeekend) {
          // Weekend breakfasts: pancakes, elaborate options (higher prep time)
          const weekendBreakfasts = availableMeals.filter(meal => 
            meal.nutrition.prepTime >= 15 || 
            meal.name.toLowerCase().includes('pancake') ||
            meal.name.toLowerCase().includes('bowl') ||
            meal.name.toLowerCase().includes('quinoa')
          );
          
          if (weekendBreakfasts.length > 0) {
            const weekendBreakfastResult = await selectUnusedMealIntelligently(weekendBreakfasts, usedBreakfastMeals, allSelectedMealNames, false, ingredientsToUseUp, 'breakfast', dietaryTags, dailyProteinTarget, user?.id);
            selectedMeal = weekendBreakfastResult.meal;
            usedBreakfastMeals.add(selectedMeal.name);
            allSelectedMealNames.add(selectedMeal.name);
            console.log(`Day ${day} (weekend) breakfast: ${selectedMeal.name} (prep: ${selectedMeal.nutrition.prepTime}min)`);
          } else {
            const fallbackWeekendBreakfastResult = await selectUnusedMealIntelligently(availableMeals, usedBreakfastMeals, allSelectedMealNames, false, ingredientsToUseUp, 'breakfast', dietaryTags, dailyProteinTarget, user?.id);
            selectedMeal = fallbackWeekendBreakfastResult.meal;
            usedBreakfastMeals.add(selectedMeal.name);
            allSelectedMealNames.add(selectedMeal.name);
          }
        } else {
          // Weekday breakfasts: quick and easy options (lower prep time)
          const weekdayBreakfasts = availableMeals.filter(meal => 
            meal.nutrition.prepTime <= 10 ||
            meal.name.toLowerCase().includes('overnight') ||
            meal.name.toLowerCase().includes('chia') ||
            meal.name.toLowerCase().includes('smoothie') ||
            meal.name.toLowerCase().includes('kefir')
          );
          
          if (weekdayBreakfasts.length > 0) {
            const weekdayBreakfastResult = await selectUnusedMealIntelligently(weekdayBreakfasts, usedBreakfastMeals, allSelectedMealNames, false, ingredientsToUseUp, 'breakfast', dietaryTags, dailyProteinTarget);
            selectedMeal = weekdayBreakfastResult.meal;
            usedBreakfastMeals.add(selectedMeal.name);
            allSelectedMealNames.add(selectedMeal.name);
            console.log(`Day ${day} (weekday) breakfast: ${selectedMeal.name} (prep: ${selectedMeal.nutrition.prepTime}min)`);
          } else {
            const fallbackWeekdayBreakfastResult = await selectUnusedMealIntelligently(availableMeals, usedBreakfastMeals, allSelectedMealNames, false, ingredientsToUseUp, 'breakfast', dietaryTags, dailyProteinTarget, user?.id);
            selectedMeal = fallbackWeekdayBreakfastResult.meal;
            usedBreakfastMeals.add(selectedMeal.name);
            allSelectedMealNames.add(selectedMeal.name);
          }
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
        
        const mealSelection = await selectUnusedMealIntelligently(mealsToSelectFrom, mealCategory === 'lunch' ? usedLunchMeals : usedDinnerMeals, allSelectedMealNames, false, remainingIngredientsToUseUp, mealCategory as 'lunch' | 'dinner', dietaryTags, dailyProteinTarget, user?.id);
        
        selectedMeal = mealSelection.meal;
        const intelligentlyUsedIngredients = mealSelection.usedIngredients;
        
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
      if (isLeftover && remainingIngredientsToUseUp.length > 0) {
        const naturallyUsedIngredients = checkNaturalIngredientUsage(selectedMeal, remainingIngredientsToUseUp);
        if (naturallyUsedIngredients.length > 0) {
          // Remove used ingredients from the list
          remainingIngredientsToUseUp = remainingIngredientsToUseUp.filter(ing => !naturallyUsedIngredients.includes(ing));
          console.log(`✅ Recipe naturally uses up ingredients: ${naturallyUsedIngredients.join(', ')} from ${selectedMeal.name}`);
        }
      }

      // Adjust portion based on caloric goals and household size
      let portionMultiplier = caloricAdjustment;
      if (user?.householdSize && user.householdSize > 1) {
        portionMultiplier *= user.householdSize;
      }
      
      const adjustedPortion = adjustMealPortion(selectedMeal.portion, portionMultiplier, servingMultiplier);
      const adjustedProtein = Math.round(selectedMeal.nutrition.protein * portionMultiplier);
      const prepTimeForDay = isLeftover ? 5 : selectedMeal.nutrition.prepTime;
      
      // Create descriptive meal name with seasonal adaptation
      let mealDescription = selectedMeal.name;
      
      // No need for seasonal name adaptation since warming recipes are already excluded during summer
      // Keep original recipe names for proper recipe lookup
      
      if (isLeftover) {
        mealDescription = `${mealDescription} (leftover)`;
      }

      const meal: InsertMeal = {
        mealPlanId: 0,
        day,
        mealType: mealCategory,
        foodDescription: mealDescription,
        portion: adjustedPortion,
        protein: adjustedProtein,
        prepTime: prepTimeForDay,
      };

      meals.push(meal);
      dailyProtein += adjustedProtein;
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
  
  console.log(`🎯 Protein optimization results: ${totalWeeklyProtein}g total / ${totalDaysWithRealMeals} full meal days = ${averageProteinPerDay.toFixed(1)}g per day`);
  console.log(`🎯 Personal protein target: ${dailyProteinTarget}g/day | Achievement: ${((averageProteinPerDay / dailyProteinTarget) * 100).toFixed(1)}%`);

  const mealPlan: InsertMealPlan = {
    userId: request.userId || 1,
    weekStart: normalizedWeekStart,
    activityLevel: request.activityLevel,
    totalProtein: Math.round(averageProteinPerDay), // Average protein per day
  };

  return { mealPlan, meals };
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
      
      const baseRecipe = {
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
      
      // Apply dietary substitutions to user recipes
      return applyDietarySubstitutions(baseRecipe, dietaryTags);
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
  
  // Declare dinner meal variables
  let sundayDinnerMeal: MealOption | null = null;
  let mondayDinnerMeal: MealOption | null = null;
  let tuesdayDinnerMeal: MealOption | null = null;
  let wednesdayDinnerMeal: MealOption | null = null;
  let thursdayDinnerMeal: MealOption | null = null;
  
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
  
  // Smart fallback for breakfast variety - prioritize meal variety for better user experience
  if (breakfastOptions.length < 4) {
    console.log('⚠️ Limited breakfast variety, applying smart fallback for better meal rotation');
    // Keep critical dietary restrictions (vegetarian) but relax others for breakfast variety
    const criticalTags = dietaryTags.filter(tag => ['vegetarian', 'vegan', 'kosher', 'halal'].includes(tag));
    
    // Directly get breakfast meals with only critical restrictions
    // Import already available at top of file
    const allBreakfasts = getEnhancedMealsByCategory('breakfast');
    const fallbackBreakfasts = filterEnhancedMealsByDietaryTags(allBreakfasts, criticalTags);
    
    if (fallbackBreakfasts.length > breakfastOptions.length) {
      breakfastOptions = fallbackBreakfasts;
      console.log(`✓ Breakfast fallback: Found ${breakfastOptions.length} breakfast options respecting critical dietary restrictions: ${criticalTags.join(', ')}`);
    }
  }
  
  // Create smart breakfast pool respecting weekday/weekend preferences
  const breakfastPool = [];
  
  // Separate weekday and weekend breakfast options with more flexible filtering
  const weekdayBreakfasts = breakfastOptions.filter(meal => {
    // Weekday: prefer quick options but be more inclusive
    const name = meal.name.toLowerCase();
    const isWeekendSpecific = name.includes('pancake') || name.includes('quinoa breakfast bowl');
    const hasQuickPrep = meal.nutrition.prepTime <= 15; // Increased from 10 to 15
    const isQuickOption = name.includes('overnight') || name.includes('chia') || 
                         name.includes('smoothie') || name.includes('kefir') ||
                         name.includes('bowl') || name.includes('yogurt');
    
    return !isWeekendSpecific && (hasQuickPrep || isQuickOption);
  });
  
  const weekendBreakfasts = breakfastOptions.filter(meal => {
    // Weekend: include elaborate options and weekend-specific items
    const name = meal.name.toLowerCase();
    const isWeekendSpecific = name.includes('pancake') || name.includes('quinoa breakfast bowl');
    const hasElaboratePrep = meal.nutrition.prepTime >= 10; // Decreased from 15 to 10
    
    return isWeekendSpecific || hasElaboratePrep;
  });
  
  console.log(`📋 Weekday breakfasts (≤15min): ${weekdayBreakfasts.map(b => `${b.name} (${b.nutrition.prepTime}min)`).join(' | ')}`);
  console.log(`🥞 Weekend breakfasts (≥10min): ${weekendBreakfasts.map(b => `${b.name} (${b.nutrition.prepTime}min)`).join(' | ')}`);
  
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
      const weekendBreakfastResult = await selectUnusedMealIntelligently(weekendBreakfasts, usedBreakfastMeals, allSelectedMealNames, false, ingredientsToUseUp, 'breakfast', dietaryTags, dailyProteinTarget);
      const selectedBreakfast = weekendBreakfastResult.meal;
      usedBreakfastMeals.add(selectedBreakfast.name);
      allSelectedMealNames.add(selectedBreakfast.name);
      breakfastPool.push(selectedBreakfast);
    } else if (!isWeekend && weekdayBreakfasts.length > 0) {
      // Weekday: use quick breakfasts with variety
      const weekdayBreakfastResult = await selectUnusedMealIntelligently(weekdayBreakfasts, usedBreakfastMeals, allSelectedMealNames, false, ingredientsToUseUp, 'breakfast', dietaryTags, dailyProteinTarget);
      const selectedBreakfast = weekdayBreakfastResult.meal;
      usedBreakfastMeals.add(selectedBreakfast.name);
      allSelectedMealNames.add(selectedBreakfast.name);
      breakfastPool.push(selectedBreakfast);
    } else {
      // Fallback: try to use appropriate category if possible
      console.log(`⚠️ Fallback needed for day ${day} (${isWeekend ? 'weekend' : 'weekday'}). Weekday: ${weekdayBreakfasts.length}, Weekend: ${weekendBreakfasts.length}`);
      
      if (isWeekend && weekendBreakfasts.length === 0 && weekdayBreakfasts.length > 0) {
        // Weekend but no weekend options - use weekday as fallback
        const fallbackWeekdayResult = await selectUnusedMealIntelligently(weekdayBreakfasts, usedBreakfastMeals, allSelectedMealNames, false, ingredientsToUseUp, 'breakfast', dietaryTags, dailyProteinTarget);
        const selectedBreakfast = fallbackWeekdayResult.meal;
        usedBreakfastMeals.add(selectedBreakfast.name);
        allSelectedMealNames.add(selectedBreakfast.name);
        breakfastPool.push(selectedBreakfast);
      } else if (!isWeekend && weekdayBreakfasts.length === 0 && weekendBreakfasts.length > 0) {
        // Weekday but no weekday options - use weekend as fallback  
        const fallbackWeekendResult = await selectUnusedMealIntelligently(weekendBreakfasts, usedBreakfastMeals, allSelectedMealNames, false, ingredientsToUseUp, 'breakfast', dietaryTags, dailyProteinTarget);
        const selectedBreakfast = fallbackWeekendResult.meal;
        usedBreakfastMeals.add(selectedBreakfast.name);
        allSelectedMealNames.add(selectedBreakfast.name);
        breakfastPool.push(selectedBreakfast);
      } else {
        // General fallback
        const generalBreakfastResult = await selectUnusedMealIntelligently(breakfastOptions, usedBreakfastMeals, allSelectedMealNames, false, ingredientsToUseUp, 'breakfast', dietaryTags, dailyProteinTarget);
        const selectedBreakfast = generalBreakfastResult.meal;
        usedBreakfastMeals.add(selectedBreakfast.name);
        allSelectedMealNames.add(selectedBreakfast.name);
        breakfastPool.push(selectedBreakfast);
      }
    }
  }
  
  console.log(`✓ Breakfast pool: ${breakfastPool.map(b => b.name).join(' | ')}`);
  
  for (let day = 1; day <= 7; day++) {
    // BREAKFAST: Skip Day 1 (Sunday evening only has dinner), start from Day 2
    if (day !== 1) {
      const selectedBreakfast = breakfastPool[day - 2]; // Adjust index since breakfastPool starts from day 2
      const isWeekend = day === 6 || day === 7; // Saturday or Sunday
      
      if (selectedBreakfast) {
        console.log(`Day ${day} (${isWeekend ? 'weekend' : 'weekday'}) breakfast: ${selectedBreakfast.name} (prep: ${selectedBreakfast.nutrition.prepTime}min)`);
        const householdSize = user?.householdSize || 1;
        let adjustedPortion = adjustMealPortion(selectedBreakfast.portion, caloricAdjustment, servingMultiplier);
        let adjustedProtein = Math.round(selectedBreakfast.nutrition.protein * caloricAdjustment);
        
        // Apply household size multiplier
        if (householdSize > 1) {
          adjustedPortion = adjustMealPortion(selectedBreakfast.portion, caloricAdjustment * householdSize, servingMultiplier);
          adjustedProtein = Math.round(selectedBreakfast.nutrition.protein * caloricAdjustment * householdSize);
        }
        
        // Create descriptive meal name
        const mealDescription = selectedBreakfast.name;
        
        meals.push({
          mealPlanId: 0,
          day,
          mealType: 'breakfast',
          foodDescription: mealDescription,
          portion: adjustedPortion,
          protein: adjustedProtein,
          prepTime: selectedBreakfast.nutrition.prepTime,
        });
        
        totalWeeklyProtein += adjustedProtein;
      }
    }
    
    // LUNCH & DINNER: Use Sunday night cooking pattern
    if (daysWithMeals.includes(day)) {
      // Days with home cooking - use Sunday night pattern
      
      // LUNCH LOGIC
      let lunchMeal = null;
      let isLunchLeftover = false;
      
      if (day === 2 && sundayDinnerMeal) {
        // Day 2: Monday lunch - leftover from Sunday dinner
        lunchMeal = sundayDinnerMeal;
        isLunchLeftover = true;
      } else if (day === 3 && mondayDinnerMeal) {
        // Day 3: Tuesday lunch - leftover from Monday dinner
        lunchMeal = mondayDinnerMeal;
        isLunchLeftover = true;
      } else if (day === 4 && tuesdayDinnerMeal) {
        // Day 4: Wednesday lunch - leftover from Tuesday dinner
        lunchMeal = tuesdayDinnerMeal;
        isLunchLeftover = true;
      } else if (day === 5 && wednesdayDinnerMeal) {
        // Day 5: Thursday lunch - leftover from Wednesday dinner
        lunchMeal = wednesdayDinnerMeal;
        isLunchLeftover = true;
      } else if (day === 6 && thursdayDinnerMeal) {
        // Day 6: Friday lunch - leftover from Thursday dinner
        lunchMeal = thursdayDinnerMeal;
        isLunchLeftover = true;
      } else if (day !== 1) {
        // Fresh lunch (Day 7, or when no previous dinner) - use unique meals
        // Skip Day 1 (Sunday evening has no lunch)
        // Apply weekday time limit (Monday-Friday = days 2-6)
        const isWeekday = day >= 2 && day <= 6;
        const mealOptions = isWeekday ? weekdayLunchOptions : lunchOptions;
        const lunchResult = await selectUnusedMealIntelligently(mealOptions, usedLunchMeals, allSelectedMealNames, false, ingredientsToUseUp, 'lunch', dietaryTags, dailyProteinTarget);
        lunchMeal = lunchResult.meal;
        usedLunchMeals.add(lunchMeal.name);
        allSelectedMealNames.add(lunchMeal.name);
      }
      
      if (lunchMeal) {
        const householdSize = user?.householdSize || 1;
        let adjustedPortion = adjustMealPortion(lunchMeal.portion, caloricAdjustment, servingMultiplier);
        let adjustedProtein = Math.round(lunchMeal.nutrition.protein * caloricAdjustment);
        const prepTime = isLunchLeftover ? 5 : lunchMeal.nutrition.prepTime;
        
        // Apply household size multiplier for fresh meals
        if (householdSize > 1 && !isLunchLeftover) {
          adjustedPortion = adjustMealPortion(lunchMeal.portion, caloricAdjustment * householdSize, servingMultiplier);
          adjustedProtein = Math.round(lunchMeal.nutrition.protein * caloricAdjustment * householdSize);
        }
        
        // Create descriptive meal name (no seasonal adaptation needed since warming recipes are filtered out)
        let mealDescription = lunchMeal.name;
        
        if (isLunchLeftover) {
          mealDescription = `${mealDescription} (leftover)`;
        }
        
        meals.push({
          mealPlanId: 0,
          day,
          mealType: 'lunch',
          foodDescription: mealDescription,
          portion: adjustedPortion,
          protein: adjustedProtein,
          prepTime: prepTime,
        });
        
        totalWeeklyProtein += adjustedProtein;
      }
      
      // DINNER LOGIC  
      let dinnerMeal = null;
      let isDinnerLeftover = false;
      
      if (day === 1) {
        // Day 1: Sunday dinner - FIRST cooking moment (use unique meals)
        // Apply weekday time limit (Monday-Friday = days 2-6)
        const isWeekday = day >= 2 && day <= 6;
        const mealOptions = isWeekday ? weekdayDinnerOptions : dinnerOptions;
        const selectedDinnerResult = await selectUnusedMealIntelligently(mealOptions, usedDinnerMeals, allSelectedMealNames, false, ingredientsToUseUp, 'dinner', dietaryTags, dailyProteinTarget);
        let selectedDinnerMeal = selectedDinnerResult.meal;
        usedDinnerMeals.add(selectedDinnerMeal.name);
        allSelectedMealNames.add(selectedDinnerMeal.name);
        
        // Leftover ingredients are now handled by the intelligent ingredient matching system
        
        sundayDinnerMeal = selectedDinnerMeal;
        dinnerMeal = sundayDinnerMeal;
      } else if (day === 2) {
        // Day 2: Monday dinner - fresh cooking (use unique meals)
        // Apply weekday time limit (Monday-Friday = days 2-6)
        const isWeekday = day >= 2 && day <= 6;
        const mealOptions = isWeekday ? weekdayDinnerOptions : dinnerOptions;
        const selectedMondayDinnerResult = await selectUnusedMealIntelligently(mealOptions, usedDinnerMeals, allSelectedMealNames, false, ingredientsToUseUp, 'dinner', dietaryTags, dailyProteinTarget);
        let selectedDinnerMeal = selectedMondayDinnerResult.meal;
        usedDinnerMeals.add(selectedDinnerMeal.name);
        allSelectedMealNames.add(selectedDinnerMeal.name);
        
        // Leftover ingredients are now handled by the intelligent ingredient matching system
        
        mondayDinnerMeal = selectedDinnerMeal;
        dinnerMeal = mondayDinnerMeal;
      } else if (day === 3) {
        // Day 3: Tuesday dinner - fresh cooking (use unique meals)
        // Apply weekday time limit (Monday-Friday = days 2-6)
        const isWeekday = day >= 2 && day <= 6;
        const mealOptions = isWeekday ? weekdayDinnerOptions : dinnerOptions;
        const selectedTuesdayDinnerResult = await selectUnusedMealIntelligently(mealOptions, usedDinnerMeals, allSelectedMealNames, false, ingredientsToUseUp, 'dinner', dietaryTags, dailyProteinTarget);
        let selectedDinnerMeal = selectedTuesdayDinnerResult.meal;
        usedDinnerMeals.add(selectedDinnerMeal.name);
        allSelectedMealNames.add(selectedDinnerMeal.name);
        
        // Leftover ingredients are now handled by the intelligent ingredient matching system
        
        tuesdayDinnerMeal = selectedDinnerMeal;
        dinnerMeal = tuesdayDinnerMeal;
      } else if (day === 4) {
        // Day 4: Wednesday dinner - fresh cooking (use unique meals)
        // Apply weekday time limit (Monday-Friday = days 2-6)
        const isWeekday = day >= 2 && day <= 6;
        const mealOptions = isWeekday ? weekdayDinnerOptions : dinnerOptions;
        const wednesdayDinnerResult = await selectUnusedMealIntelligently(mealOptions, usedDinnerMeals, allSelectedMealNames, false, ingredientsToUseUp, 'dinner', dietaryTags, dailyProteinTarget);
        wednesdayDinnerMeal = wednesdayDinnerResult.meal;
        usedDinnerMeals.add(wednesdayDinnerMeal.name);
        allSelectedMealNames.add(wednesdayDinnerMeal.name);
        dinnerMeal = wednesdayDinnerMeal;
      } else if (day === 5) {
        // Day 5: Thursday dinner - fresh cooking (use unique meals)
        // Apply weekday time limit (Monday-Friday = days 2-6)
        const isWeekday = day >= 2 && day <= 6;
        const mealOptions = isWeekday ? weekdayDinnerOptions : dinnerOptions;
        const thursdayDinnerResult = await selectUnusedMealIntelligently(mealOptions, usedDinnerMeals, allSelectedMealNames, false, ingredientsToUseUp, 'dinner', dietaryTags, dailyProteinTarget);
        thursdayDinnerMeal = thursdayDinnerResult.meal;
        usedDinnerMeals.add(thursdayDinnerMeal.name);
        allSelectedMealNames.add(thursdayDinnerMeal.name);
        dinnerMeal = thursdayDinnerMeal;
      } else if (day === 6) {
        // Day 6: Friday dinner - fresh cooking (3rd cooking day, use unique meals)
        // Apply weekday time limit (Monday-Friday = days 2-6)
        const isWeekday = day >= 2 && day <= 6;
        const mealOptions = isWeekday ? weekdayDinnerOptions : dinnerOptions;
        const fridayDinnerResult = await selectUnusedMealIntelligently(mealOptions, usedDinnerMeals, allSelectedMealNames, false, ingredientsToUseUp, 'dinner', dietaryTags, dailyProteinTarget);
        dinnerMeal = fridayDinnerResult.meal;
        usedDinnerMeals.add(dinnerMeal.name);
        allSelectedMealNames.add(dinnerMeal.name);
      } else if (day === 7 && thursdayDinnerMeal) {
        // Day 7: Saturday dinner - leftover from Thursday
        dinnerMeal = thursdayDinnerMeal;
        isDinnerLeftover = true;
      } else {
        // Fallback dinner - use unique meals
        // Apply weekday time limit (Monday-Friday = days 2-6)
        const isWeekday = day >= 2 && day <= 6;
        const mealOptions = isWeekday ? weekdayDinnerOptions : dinnerOptions;
        const fallbackDinnerResult = await selectUnusedMealIntelligently(mealOptions, usedDinnerMeals, allSelectedMealNames, false, ingredientsToUseUp, 'dinner', dietaryTags, dailyProteinTarget);
        dinnerMeal = fallbackDinnerResult.meal;
        usedDinnerMeals.add(dinnerMeal.name);
        allSelectedMealNames.add(dinnerMeal.name);
      }
      
      if (dinnerMeal) {
        // Check if this dinner will be used for tomorrow's lunch (batch cooking)
        const willBeLeftover = (day === 1 && daysWithMeals.includes(2)) || // Sunday dinner → Monday lunch
                               (day === 2 && daysWithMeals.includes(3)) || // Monday dinner → Tuesday lunch
                               (day === 3 && daysWithMeals.includes(4)) || // Tuesday dinner → Wednesday lunch
                               (day === 4 && daysWithMeals.includes(5)) || // Wednesday dinner → Thursday lunch
                               (day === 5 && daysWithMeals.includes(6));   // Thursday dinner → Friday lunch
        
        let adjustedPortion = adjustMealPortion(dinnerMeal.portion, caloricAdjustment, servingMultiplier);
        let adjustedProtein = Math.round(dinnerMeal.nutrition.protein * caloricAdjustment);
        const prepTime = isDinnerLeftover ? 5 : dinnerMeal.nutrition.prepTime;
        
        // Calculate total portions needed (household size + leftovers)
        const householdSize = user?.householdSize || 1;
        let totalPortions = householdSize;
        
        // If cooking for leftovers, add portions for tomorrow's lunch
        if (willBeLeftover && !isDinnerLeftover) {
          totalPortions += householdSize; // Double for leftovers
        }
        
        // Apply total portion multiplier
        if (totalPortions > 1 && !isDinnerLeftover) {
          adjustedPortion = adjustMealPortion(dinnerMeal.portion, caloricAdjustment * totalPortions, servingMultiplier);
          adjustedProtein = Math.round(dinnerMeal.nutrition.protein * caloricAdjustment * totalPortions);
        }
        
        // Create descriptive meal name (no seasonal adaptation needed since warming recipes are filtered out)
        let mealDescription = dinnerMeal.name;
        
        if (isDinnerLeftover) {
          mealDescription = `${mealDescription} (leftover)`;
        }
        
        meals.push({
          mealPlanId: 0,
          day,
          mealType: 'dinner',
          foodDescription: mealDescription,
          portion: adjustedPortion,
          protein: adjustedProtein,
          prepTime: prepTime,
        });
        
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
  
  console.log(`🥩 Protein calculation: ${totalWeeklyProtein}g total / ${totalDaysWithMeals} full meal days = ${averageProteinPerDay.toFixed(1)}g per day`);

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

  const mealPlan: InsertMealPlan = {
    userId: request.userId || 1,
    weekStart: normalizedWeekStart,
    activityLevel: request.activityLevel,
    totalProtein: Math.round(averageProteinPerDay), // Average daily protein for days with meals
  };

  return { mealPlan, meals };
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