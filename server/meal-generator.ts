import { 
  type MealPlanRequest, 
  type InsertMealPlan, 
  type InsertMeal, 
  type User 
} from "@shared/schema";
import { 
  getEnhancedMealsForCategoryAndDiet, 
  type MealOption 
} from "./nutrition-enhanced";
import { calculateProteinTarget } from "./nutrition";

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
 * Adjust meal portion based on caloric needs
 */
function adjustMealPortion(originalPortion: string, adjustmentFactor: number): string {
  if (adjustmentFactor === 1.0) return originalPortion;
  
  const multiplier = adjustmentFactor > 1 ? `${adjustmentFactor.toFixed(1)}x ` : '';
  const note = adjustmentFactor > 1.05 ? ' (larger portions)' : 
               adjustmentFactor < 0.95 ? ' (smaller portions)' : '';
  
  return `${multiplier}${originalPortion}${note}`;
}

/**
 * Check if a meal can incorporate leftover ingredients and modify description
 */
function incorporateLeftoverIngredients(meal: MealOption, ingredientsToUseUp: string[]): { modifiedMeal: MealOption, usedIngredients: string[] } {
  if (!ingredientsToUseUp.length) return { modifiedMeal: meal, usedIngredients: [] };
  
  const mealIngredients = meal.ingredients.map(i => i.toLowerCase());
  const usedIngredients: string[] = [];
  
  // Check which leftover ingredients can be incorporated
  for (const leftoverIngredient of ingredientsToUseUp) {
    const leftoverLower = leftoverIngredient.toLowerCase();
    
    // Check if this ingredient or similar can be used in this meal
    const canIncorporate = mealIngredients.some(ingredient => 
      ingredient.includes(leftoverLower) || 
      leftoverLower.includes(ingredient) ||
      // Common ingredient matches (English and Dutch)
      ((leftoverLower.includes('celery') || leftoverLower.includes('bleekselderij')) && 
       (ingredient.includes('vegetable') || ingredient.includes('soup') || ingredient.includes('broth') || 
        ingredient.includes('stir') || ingredient.includes('onion') || ingredient.includes('mushroom') || 
        ingredient.includes('quinoa') || ingredient.includes('herbs'))) ||
      ((leftoverLower.includes('carrot') || leftoverLower.includes('wortel')) && 
       (ingredient.includes('vegetable') || ingredient.includes('soup') || ingredient.includes('stir') || 
        ingredient.includes('roasted') || ingredient.includes('quinoa'))) ||
      ((leftoverLower.includes('onion') || leftoverLower.includes('ui')) && 
       (ingredient.includes('vegetable') || ingredient.includes('soup') || ingredient.includes('stir') || 
        ingredient.includes('mushroom') || ingredient.includes('quinoa'))) ||
      ((leftoverLower.includes('pepper') || leftoverLower.includes('paprika')) && 
       (ingredient.includes('vegetable') || ingredient.includes('stir') || ingredient.includes('roasted'))) ||
      ((leftoverLower.includes('spinach') || leftoverLower.includes('spinazie')) && 
       (ingredient.includes('leafy') || ingredient.includes('green') || ingredient.includes('spinach') || 
        ingredient.includes('vegetable'))) ||
      ((leftoverLower.includes('tomato') || leftoverLower.includes('tomaat')) && 
       (ingredient.includes('vegetable') || ingredient.includes('sauce') || ingredient.includes('tomato')))
    );
    
    if (canIncorporate) {
      usedIngredients.push(leftoverIngredient);
    }
  }
  
  // If we can use leftover ingredients, modify the meal description
  if (usedIngredients.length > 0) {
    const modifiedMeal = {
      ...meal,
      name: `${meal.name} (incorporating leftover ${usedIngredients.join(', ')})`,
      ingredients: [...meal.ingredients, ...usedIngredients.map(ing => `leftover ${ing}`)]
    };
    return { modifiedMeal, usedIngredients };
  }
  
  return { modifiedMeal: meal, usedIngredients: [] };
}

/**
 * Select an unused meal from available options, ensuring variety
 */
function selectUnusedMeal(availableMeals: MealOption[], usedMeals: Set<string>): MealOption {
  // First try to find a meal that hasn't been used yet
  const unusedMeals = availableMeals.filter(meal => !usedMeals.has(meal.name));
  
  if (unusedMeals.length > 0) {
    // Select a random unused meal for variety
    return unusedMeals[Math.floor(Math.random() * unusedMeals.length)];
  }
  
  // If all meals have been used, reset and start over (should rarely happen)
  console.log('All meals used, resetting for continued variety');
  usedMeals.clear();
  return availableMeals[Math.floor(Math.random() * availableMeals.length)];
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

export function generateWeeklyMealPlan(request: MealPlanRequest, user?: User): GeneratedMealPlan {
  const targetProtein = calculateProteinTarget(request.activityLevel);
  const meals: InsertMeal[] = [];
  let totalWeeklyProtein = 0;
  const dietaryTags = request.dietaryTags || [];
  const ingredientsToUseUp = user?.leftovers || [];
  let remainingIngredientsToUseUp = [...ingredientsToUseUp];
  
  console.log(`🥕 Starting meal generation with leftover ingredients: ${JSON.stringify(ingredientsToUseUp)}`);
  
  // Calculate caloric adjustment based on user goals
  const caloricAdjustment = user ? calculateCaloricAdjustment(user) : 1.0;
  
  // Plan cooking and eating schedule
  const { cookingDays, eatingDays } = planCookingDays(user);
  
  // Check if we should use meal prep mode (cooking days < eating days)
  if (cookingDays.length < eatingDays.length) {
    console.log(`Using meal prep mode: ${cookingDays.length} cooking days for ${eatingDays.length} eating days`);
    return generateMealPrepPlan(request, user, caloricAdjustment);
  }

  // Use regular 8-day Sunday cooking pattern for other cases
  console.log('Using 8-day Sunday cooking pattern');

  // Track used meals to ensure variety in cooking moments
  const usedBreakfastMeals: Set<string> = new Set();
  const usedLunchMeals: Set<string> = new Set();
  const usedDinnerMeals: Set<string> = new Set();

  // Track which meals to use as leftovers
  let sundayDinnerMeal: MealOption | null = null;
  let mondayDinnerMeal: MealOption | null = null;
  let tuesdayDinnerMeal: MealOption | null = null;
  let wednesdayDinnerMeal: MealOption | null = null;
  let thursdayDinnerMeal: MealOption | null = null;
  
  for (let day = 1; day <= 8; day++) {
    let dailyProtein = 0;
    
    // Determine which meals to generate for this day
    let mealsToGenerate: ('breakfast' | 'lunch' | 'dinner')[] = [];
    if (day === 1) {
      // Day 1: Sunday dinner only (FIRST cooking moment)
      mealsToGenerate = ['dinner'];
    } else if (day === 8) {
      // Day 8: Sunday breakfast only
      mealsToGenerate = ['breakfast'];
    } else {
      // Days 2-7: Full days
      mealsToGenerate = ['breakfast', 'lunch', 'dinner'];
    }

    mealsToGenerate.forEach(mealCategory => {
      let availableMeals = getEnhancedMealsForCategoryAndDiet(mealCategory, dietaryTags);
      
      // Apply 30-minute cooking time limit for weekdays (Monday-Friday)
      const isWeekday = day >= 2 && day <= 6; // Days 2-6 are Monday-Friday
      if (isWeekday && (mealCategory === 'lunch' || mealCategory === 'dinner')) {
        const originalCount = availableMeals.length;
        availableMeals = availableMeals.filter(meal => meal.nutrition.prepTime <= 30);
        console.log(`Weekday time filter: ${originalCount} → ${availableMeals.length} ${mealCategory} meals (≤30min)`);
      }
      
      if (availableMeals.length === 0) {
        console.error(`CRITICAL: No ${mealCategory} meals available for dietary restrictions: ${dietaryTags.join(', ')}. Skipping this meal.`);
        return; // Skip this meal instead of using inappropriate fallback
      }

      // Implement Sunday night cooking pattern logic
      let isLeftover = false;
      let selectedMeal: MealOption;
      
      if (day === 1 && mealCategory === 'dinner') {
        // Day 1: Sunday dinner - FIRST cooking moment
        selectedMeal = selectUnusedMeal(availableMeals, usedDinnerMeals);
        sundayDinnerMeal = selectedMeal;
        usedDinnerMeals.add(selectedMeal.name);
      } else if (day === 2 && mealCategory === 'lunch') {
        // Day 2: Monday lunch - leftover from Sunday dinner
        if (!sundayDinnerMeal) {
          throw new Error('Sunday dinner meal not found for Monday lunch leftover');
        }
        selectedMeal = sundayDinnerMeal;
        isLeftover = true;
      } else if (day === 2 && mealCategory === 'dinner') {
        // Day 2: Monday dinner - fresh cooking
        selectedMeal = selectUnusedMeal(availableMeals, usedDinnerMeals);
        mondayDinnerMeal = selectedMeal;
        usedDinnerMeals.add(selectedMeal.name);
      } else if (day === 3 && mealCategory === 'lunch') {
        // Day 3: Tuesday lunch - leftover from Monday dinner
        if (!mondayDinnerMeal) {
          throw new Error('Monday dinner meal not found for Tuesday lunch leftover');
        }
        selectedMeal = mondayDinnerMeal;
        isLeftover = true;
      } else if (day === 3 && mealCategory === 'dinner') {
        // Day 3: Tuesday dinner - fresh cooking
        selectedMeal = selectUnusedMeal(availableMeals, usedDinnerMeals);
        tuesdayDinnerMeal = selectedMeal;
        usedDinnerMeals.add(selectedMeal.name);
      } else if (day === 4 && mealCategory === 'lunch') {
        // Day 4: Wednesday lunch - leftover from Tuesday dinner
        if (!tuesdayDinnerMeal) {
          throw new Error('Tuesday dinner meal not found for Wednesday lunch leftover');
        }
        selectedMeal = tuesdayDinnerMeal;
        isLeftover = true;
      } else if (day === 4 && mealCategory === 'dinner') {
        // Day 4: Wednesday dinner - fresh cooking
        selectedMeal = selectUnusedMeal(availableMeals, usedDinnerMeals);
        wednesdayDinnerMeal = selectedMeal;
        usedDinnerMeals.add(selectedMeal.name);
      } else if (day === 5 && mealCategory === 'lunch') {
        // Day 5: Thursday lunch - leftover from Wednesday dinner
        if (!wednesdayDinnerMeal) {
          throw new Error('Wednesday dinner meal not found for Thursday lunch leftover');
        }
        selectedMeal = wednesdayDinnerMeal;
        isLeftover = true;
      } else if (day === 5 && mealCategory === 'dinner') {
        // Day 5: Thursday dinner - fresh cooking
        selectedMeal = selectUnusedMeal(availableMeals, usedDinnerMeals);
        thursdayDinnerMeal = selectedMeal;
        usedDinnerMeals.add(selectedMeal.name);
      } else if (day === 6 && (mealCategory === 'lunch' || mealCategory === 'dinner')) {
        // Day 6: Friday lunch and dinner - leftovers from Thursday
        if (!thursdayDinnerMeal) {
          throw new Error('Thursday dinner meal not found for Friday leftovers');
        }
        selectedMeal = thursdayDinnerMeal;
        isLeftover = true;
      } else if (day === 7 && mealCategory === 'lunch') {
        // Day 7: Saturday lunch - leftover from Friday dinner
        if (!thursdayDinnerMeal) {
          throw new Error('Thursday dinner meal not found for Saturday lunch leftover');
        }
        selectedMeal = thursdayDinnerMeal;
        isLeftover = true;
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
            selectedMeal = selectUnusedMeal(weekendBreakfasts, usedBreakfastMeals);
            usedBreakfastMeals.add(selectedMeal.name);
            console.log(`Day ${day} (weekend) breakfast: ${selectedMeal.name} (prep: ${selectedMeal.nutrition.prepTime}min)`);
          } else {
            selectedMeal = selectUnusedMeal(availableMeals, usedBreakfastMeals);
            usedBreakfastMeals.add(selectedMeal.name);
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
            selectedMeal = selectUnusedMeal(weekdayBreakfasts, usedBreakfastMeals);
            usedBreakfastMeals.add(selectedMeal.name);
            console.log(`Day ${day} (weekday) breakfast: ${selectedMeal.name} (prep: ${selectedMeal.nutrition.prepTime}min)`);
          } else {
            selectedMeal = selectUnusedMeal(availableMeals, usedBreakfastMeals);
            usedBreakfastMeals.add(selectedMeal.name);
          }
        }
      } else {
        // Fresh lunch/dinner for other days - use variety tracking
        selectedMeal = selectUnusedMeal(availableMeals, mealCategory === 'lunch' ? usedLunchMeals : usedDinnerMeals);
        if (mealCategory === 'lunch') {
          usedLunchMeals.add(selectedMeal.name);
        } else {
          usedDinnerMeals.add(selectedMeal.name);
        }
      }

      // Adjust portion based on caloric goals and household size
      let portionMultiplier = caloricAdjustment;
      if (user?.householdSize && user.householdSize > 1) {
        portionMultiplier *= user.householdSize;
      }
      
      const adjustedPortion = adjustMealPortion(selectedMeal.portion, portionMultiplier);
      const adjustedProtein = Math.round(selectedMeal.nutrition.protein * portionMultiplier);
      const prepTimeForDay = isLeftover ? 5 : selectedMeal.nutrition.prepTime;
      
      // Create descriptive meal name
      let mealDescription = selectedMeal.name;
      
      if (isLeftover) {
        mealDescription = `${selectedMeal.name} (leftover)`;
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
    });

    totalWeeklyProtein += dailyProtein;
  }

  const mealPlan: InsertMealPlan = {
    userId: request.userId || 1,
    weekStart: request.weekStart,
    activityLevel: request.activityLevel,
    totalProtein: totalWeeklyProtein / 7, // Average daily protein
    notionSynced: false,
  };

  return { mealPlan, meals };
}

/**
 * Generate meal prep plan based on cooking/eating days configuration
 * Always prioritize removing weekend days first, then weekdays if needed
 */
function generateMealPrepPlan(
  request: MealPlanRequest, 
  user: User | undefined, 
  caloricAdjustment: number
): GeneratedMealPlan {
  const meals: InsertMeal[] = [];
  let totalWeeklyProtein = 0;
  const dietaryTags = request.dietaryTags || [];
  const ingredientsToUseUp = user?.leftovers || [];
  let remainingIngredientsToUseUp = [...ingredientsToUseUp];
  
  console.log(`🥕 Starting meal prep plan with leftover ingredients: ${JSON.stringify(ingredientsToUseUp)}`);
  
  // Get meal options for lunch and dinner with dietary filters
  let lunchOptions = getEnhancedMealsForCategoryAndDiet('lunch', dietaryTags);
  let dinnerOptions = getEnhancedMealsForCategoryAndDiet('dinner', dietaryTags);
  
  // Apply 30-minute cooking time limit for weekday meals
  const weekdayLunchOptions = lunchOptions.filter(meal => meal.nutrition.prepTime <= 30);
  const weekdayDinnerOptions = dinnerOptions.filter(meal => meal.nutrition.prepTime <= 30);
  
  console.log(`Weekday time filter: ${lunchOptions.length} → ${weekdayLunchOptions.length} lunch meals (≤30min)`);
  console.log(`Weekday time filter: ${dinnerOptions.length} → ${weekdayDinnerOptions.length} dinner meals (≤30min)`);
  
  // Initialize meal variety tracking for meal prep mode
  const usedBreakfastMeals: Set<string> = new Set();
  const usedLunchMeals: Set<string> = new Set();
  const usedDinnerMeals: Set<string> = new Set();
  
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
  
  console.log(`Meal prep plan: ${cookingDaysPerWeek} cooking days, ${eatingDaysAtHome} eating days = ${totalMealsNeeded} meals`);
  console.log(`Days with meals: ${daysWithMeals.join(', ')}, Days skipped: ${daysToSkip.join(', ')}`);
  
  // Variables already declared above - use shuffled options for variety

  // Use Sunday night cooking pattern with proper leftover linking
  // Track which meals to use as leftovers
  let sundayDinnerMeal: any = null;
  let mondayDinnerMeal: any = null;
  let tuesdayDinnerMeal: any = null;
  let wednesdayDinnerMeal: any = null;
  let thursdayDinnerMeal: any = null;
  

  
  // Generate meals for all 7 days (breakfast always included)
  let breakfastOptions = getEnhancedMealsForCategoryAndDiet('breakfast', dietaryTags);
  console.log(`✓ Breakfast variety: Found ${breakfastOptions.length} breakfast options for dietary tags: ${dietaryTags.join(', ')}`);
  
  // Smart fallback for breakfast variety - prioritize meal variety for better user experience
  if (breakfastOptions.length < 4) {
    console.log('⚠️ Limited breakfast variety, applying smart fallback for better meal rotation');
    // Keep critical dietary restrictions (vegetarian) but relax others for breakfast variety
    const criticalTags = dietaryTags.filter(tag => ['vegetarian', 'vegan', 'kosher', 'halal'].includes(tag));
    
    // Directly get breakfast meals with only critical restrictions
    const { getEnhancedMealsByCategory, filterEnhancedMealsByDietaryTags } = require('./nutrition-enhanced');
    const allBreakfasts = getEnhancedMealsByCategory('breakfast');
    const fallbackBreakfasts = filterEnhancedMealsByDietaryTags(allBreakfasts, criticalTags);
    
    if (fallbackBreakfasts.length > breakfastOptions.length) {
      breakfastOptions = fallbackBreakfasts;
      console.log(`✓ Breakfast fallback: Found ${breakfastOptions.length} breakfast options respecting critical dietary restrictions: ${criticalTags.join(', ')}`);
    }
  }
  
  // Create smart breakfast pool respecting weekday/weekend preferences
  const breakfastPool = [];
  
  // Separate weekday and weekend breakfast options
  const weekdayBreakfasts = breakfastOptions.filter(meal => {
    // Explicitly exclude pancakes and other weekend-specific items
    const name = meal.name.toLowerCase();
    const isWeekendSpecific = name.includes('pancake') || name.includes('quinoa breakfast bowl');
    const hasQuickPrep = meal.nutrition.prepTime <= 10;
    const isQuickOption = name.includes('overnight') || name.includes('chia') || 
                         name.includes('smoothie') || name.includes('kefir');
    
    return !isWeekendSpecific && (hasQuickPrep || isQuickOption);
  });
  
  const weekendBreakfasts = breakfastOptions.filter(meal => {
    // Weekend breakfasts: pancakes, quinoa bowls, or elaborate options (15+ min prep)
    const name = meal.name.toLowerCase();
    const isWeekendSpecific = name.includes('pancake') || name.includes('quinoa breakfast bowl');
    const hasElaboratePrep = meal.nutrition.prepTime >= 15;
    
    return isWeekendSpecific || hasElaboratePrep;
  });
  
  console.log(`📋 Weekday breakfasts (≤10min): ${weekdayBreakfasts.map(b => `${b.name} (${b.nutrition.prepTime}min)`).join(' | ')}`);
  console.log(`🥞 Weekend breakfasts (≥15min): ${weekendBreakfasts.map(b => `${b.name} (${b.nutrition.prepTime}min)`).join(' | ')}`);
  
  // Assign breakfasts to each day with variety tracking
  for (let day = 1; day <= 7; day++) {
    const isWeekend = day === 6 || day === 7; // Saturday or Sunday
    
    if (isWeekend && weekendBreakfasts.length > 0) {
      // Weekend: use elaborate breakfasts with variety
      const selectedBreakfast = selectUnusedMeal(weekendBreakfasts, usedBreakfastMeals);
      usedBreakfastMeals.add(selectedBreakfast.name);
      breakfastPool.push(selectedBreakfast);
    } else if (!isWeekend && weekdayBreakfasts.length > 0) {
      // Weekday: use quick breakfasts with variety
      const selectedBreakfast = selectUnusedMeal(weekdayBreakfasts, usedBreakfastMeals);
      usedBreakfastMeals.add(selectedBreakfast.name);
      breakfastPool.push(selectedBreakfast);
    } else {
      // Fallback: try to use appropriate category if possible
      console.log(`⚠️ Fallback needed for day ${day} (${isWeekend ? 'weekend' : 'weekday'}). Weekday: ${weekdayBreakfasts.length}, Weekend: ${weekendBreakfasts.length}`);
      
      if (isWeekend && weekendBreakfasts.length === 0 && weekdayBreakfasts.length > 0) {
        // Weekend but no weekend options - use weekday as fallback
        const selectedBreakfast = selectUnusedMeal(weekdayBreakfasts, usedBreakfastMeals);
        usedBreakfastMeals.add(selectedBreakfast.name);
        breakfastPool.push(selectedBreakfast);
      } else if (!isWeekend && weekdayBreakfasts.length === 0 && weekendBreakfasts.length > 0) {
        // Weekday but no weekday options - use weekend as fallback  
        const selectedBreakfast = selectUnusedMeal(weekendBreakfasts, usedBreakfastMeals);
        usedBreakfastMeals.add(selectedBreakfast.name);
        breakfastPool.push(selectedBreakfast);
      } else {
        // General fallback
        const selectedBreakfast = selectUnusedMeal(breakfastOptions, usedBreakfastMeals);
        usedBreakfastMeals.add(selectedBreakfast.name);
        breakfastPool.push(selectedBreakfast);
      }
    }
  }
  
  console.log(`✓ Breakfast pool: ${breakfastPool.map(b => b.name).join(' | ')}`);
  
  for (let day = 1; day <= 7; day++) {
    // BREAKFAST: Always include for every day with smart weekday/weekend scheduling
    const selectedBreakfast = breakfastPool[day - 1];
    const isWeekend = day === 6 || day === 7; // Saturday or Sunday
    
    console.log(`Day ${day} (${isWeekend ? 'weekend' : 'weekday'}) breakfast: ${selectedBreakfast.name} (prep: ${selectedBreakfast.nutrition.prepTime}min)`);
    
    if (selectedBreakfast) {
      const householdSize = user?.householdSize || 1;
      let adjustedPortion = adjustMealPortion(selectedBreakfast.portion, caloricAdjustment);
      let adjustedProtein = Math.round(selectedBreakfast.nutrition.protein * caloricAdjustment);
      
      // Apply household size multiplier
      if (householdSize > 1) {
        adjustedPortion = adjustMealPortion(selectedBreakfast.portion, caloricAdjustment * householdSize);
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
      } else {
        // Fresh lunch (Day 1, 7, or when no previous dinner) - use unique meals
        // Apply weekday time limit (Monday-Friday = days 2-6)
        const isWeekday = day >= 2 && day <= 6;
        const mealOptions = isWeekday ? weekdayLunchOptions : lunchOptions;
        lunchMeal = selectUnusedMeal(mealOptions, usedLunchMeals);
        usedLunchMeals.add(lunchMeal.name);
      }
      
      if (lunchMeal) {
        const householdSize = user?.householdSize || 1;
        let adjustedPortion = adjustMealPortion(lunchMeal.portion, caloricAdjustment);
        let adjustedProtein = Math.round(lunchMeal.nutrition.protein * caloricAdjustment);
        const prepTime = isLunchLeftover ? 5 : lunchMeal.nutrition.prepTime;
        
        // Apply household size multiplier for fresh meals
        if (householdSize > 1 && !isLunchLeftover) {
          adjustedPortion = adjustMealPortion(lunchMeal.portion, caloricAdjustment * householdSize);
          adjustedProtein = Math.round(lunchMeal.nutrition.protein * caloricAdjustment * householdSize);
        }
        
        // Create descriptive meal name
        let mealDescription = lunchMeal.name;
        if (isLunchLeftover) {
          mealDescription = `${lunchMeal.name} (leftover)`;
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
        let selectedDinnerMeal = selectUnusedMeal(mealOptions, usedDinnerMeals);
        usedDinnerMeals.add(selectedDinnerMeal.name);
        
        // Try to incorporate leftover ingredients
        if (remainingIngredientsToUseUp.length > 0) {
          const { modifiedMeal, usedIngredients } = incorporateLeftoverIngredients(selectedDinnerMeal, remainingIngredientsToUseUp);
          if (usedIngredients.length > 0) {
            selectedDinnerMeal = modifiedMeal;
            remainingIngredientsToUseUp = remainingIngredientsToUseUp.filter(ing => !usedIngredients.includes(ing));
            console.log(`✓ Incorporated leftover ingredients: ${usedIngredients.join(', ')} into ${selectedDinnerMeal.name}`);
          }
        }
        
        sundayDinnerMeal = selectedDinnerMeal;
        dinnerMeal = sundayDinnerMeal;
      } else if (day === 2) {
        // Day 2: Monday dinner - fresh cooking (use unique meals)
        // Apply weekday time limit (Monday-Friday = days 2-6)
        const isWeekday = day >= 2 && day <= 6;
        const mealOptions = isWeekday ? weekdayDinnerOptions : dinnerOptions;
        let selectedDinnerMeal = selectUnusedMeal(mealOptions, usedDinnerMeals);
        usedDinnerMeals.add(selectedDinnerMeal.name);
        
        // Try to incorporate leftover ingredients
        if (remainingIngredientsToUseUp.length > 0) {
          const { modifiedMeal, usedIngredients } = incorporateLeftoverIngredients(selectedDinnerMeal, remainingIngredientsToUseUp);
          if (usedIngredients.length > 0) {
            selectedDinnerMeal = modifiedMeal;
            remainingIngredientsToUseUp = remainingIngredientsToUseUp.filter(ing => !usedIngredients.includes(ing));
            console.log(`✓ Incorporated leftover ingredients: ${usedIngredients.join(', ')} into ${selectedDinnerMeal.name}`);
          }
        }
        
        mondayDinnerMeal = selectedDinnerMeal;
        dinnerMeal = mondayDinnerMeal;
      } else if (day === 3) {
        // Day 3: Tuesday dinner - fresh cooking (use unique meals)
        // Apply weekday time limit (Monday-Friday = days 2-6)
        const isWeekday = day >= 2 && day <= 6;
        const mealOptions = isWeekday ? weekdayDinnerOptions : dinnerOptions;
        let selectedDinnerMeal = selectUnusedMeal(mealOptions, usedDinnerMeals);
        usedDinnerMeals.add(selectedDinnerMeal.name);
        
        // Try to incorporate leftover ingredients
        if (remainingIngredientsToUseUp.length > 0) {
          const { modifiedMeal, usedIngredients } = incorporateLeftoverIngredients(selectedDinnerMeal, remainingIngredientsToUseUp);
          if (usedIngredients.length > 0) {
            selectedDinnerMeal = modifiedMeal;
            remainingIngredientsToUseUp = remainingIngredientsToUseUp.filter(ing => !usedIngredients.includes(ing));
            console.log(`✓ Incorporated leftover ingredients: ${usedIngredients.join(', ')} into ${selectedDinnerMeal.name}`);
          }
        }
        
        tuesdayDinnerMeal = selectedDinnerMeal;
        dinnerMeal = tuesdayDinnerMeal;
      } else if (day === 4) {
        // Day 4: Wednesday dinner - fresh cooking (use unique meals)
        // Apply weekday time limit (Monday-Friday = days 2-6)
        const isWeekday = day >= 2 && day <= 6;
        const mealOptions = isWeekday ? weekdayDinnerOptions : dinnerOptions;
        wednesdayDinnerMeal = selectUnusedMeal(mealOptions, usedDinnerMeals);
        usedDinnerMeals.add(wednesdayDinnerMeal.name);
        dinnerMeal = wednesdayDinnerMeal;
      } else if (day === 5) {
        // Day 5: Thursday dinner - fresh cooking (use unique meals)
        // Apply weekday time limit (Monday-Friday = days 2-6)
        const isWeekday = day >= 2 && day <= 6;
        const mealOptions = isWeekday ? weekdayDinnerOptions : dinnerOptions;
        thursdayDinnerMeal = selectUnusedMeal(mealOptions, usedDinnerMeals);
        usedDinnerMeals.add(thursdayDinnerMeal.name);
        dinnerMeal = thursdayDinnerMeal;
      } else if (day === 6) {
        // Day 6: Friday dinner - fresh cooking (3rd cooking day, use unique meals)
        // Apply weekday time limit (Monday-Friday = days 2-6)
        const isWeekday = day >= 2 && day <= 6;
        const mealOptions = isWeekday ? shuffledWeekdayDinnerOptions : shuffledDinnerOptions;
        dinnerMeal = mealOptions[dinnerIndex % mealOptions.length];
        dinnerIndex++;
      } else if (day === 7 && thursdayDinnerMeal) {
        // Day 7: Saturday dinner - leftover from Thursday
        dinnerMeal = thursdayDinnerMeal;
        isDinnerLeftover = true;
      } else {
        // Fallback dinner - use unique meals
        // Apply weekday time limit (Monday-Friday = days 2-6)
        const isWeekday = day >= 2 && day <= 6;
        const mealOptions = isWeekday ? shuffledWeekdayDinnerOptions : shuffledDinnerOptions;
        dinnerMeal = mealOptions[dinnerIndex % mealOptions.length];
        dinnerIndex++;
      }
      
      if (dinnerMeal) {
        // Check if this dinner will be used for tomorrow's lunch (batch cooking)
        const willBeLeftover = (day === 1 && daysWithMeals.includes(2)) || // Sunday dinner → Monday lunch
                               (day === 2 && daysWithMeals.includes(3)) || // Monday dinner → Tuesday lunch
                               (day === 3 && daysWithMeals.includes(4)) || // Tuesday dinner → Wednesday lunch
                               (day === 4 && daysWithMeals.includes(5)) || // Wednesday dinner → Thursday lunch
                               (day === 5 && daysWithMeals.includes(6));   // Thursday dinner → Friday lunch
        
        let adjustedPortion = adjustMealPortion(dinnerMeal.portion, caloricAdjustment);
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
          adjustedPortion = adjustMealPortion(dinnerMeal.portion, caloricAdjustment * totalPortions);
          adjustedProtein = Math.round(dinnerMeal.nutrition.protein * caloricAdjustment * totalPortions);
        }
        
        // Create descriptive meal name
        let mealDescription = dinnerMeal.name;
        if (isDinnerLeftover) {
          mealDescription = `${dinnerMeal.name} (leftover)`;
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
      // Days with eating out - add "eating out" placeholder meals
      meals.push({
        mealPlanId: 0,
        day,
        mealType: 'lunch',
        foodDescription: 'Eating out',
        portion: '',
        protein: 0,
        prepTime: 0,
      });
      
      meals.push({
        mealPlanId: 0,
        day,
        mealType: 'dinner',
        foodDescription: 'Eating out',
        portion: '',
        protein: 0,
        prepTime: 0,
      });
    }
  }

  const mealPlan: InsertMealPlan = {
    userId: request.userId || 1,
    weekStart: request.weekStart,
    activityLevel: request.activityLevel,
    totalProtein: totalWeeklyProtein / (7 + totalMealsNeeded), // 7 breakfasts + variable lunch/dinner
    notionSynced: false,
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