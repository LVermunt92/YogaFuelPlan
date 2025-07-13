import { MealOption, selectMealsForDay, calculateProteinTarget, getMealsForCategoryAndDiet, MEAL_DATABASE } from './nutrition';
import { InsertMeal, InsertMealPlan, MealPlanRequest, User } from '@shared/schema';

export interface GeneratedMealPlan {
  mealPlan: InsertMealPlan;
  meals: InsertMeal[];
}

/**
 * Calculate caloric adjustment factor based on user's goals
 * Returns a multiplier for portion sizes (1.0 = no change, <1.0 = smaller portions, >1.0 = larger portions)
 */
function calculateCaloricAdjustment(user: User): number {
  let adjustmentFactor = 1.0;
  
  // Weight goal adjustment
  if (user.weight && user.goalWeight) {
    const weightDifference = user.goalWeight - user.weight;
    const weightChangePercent = weightDifference / user.weight;
    
    // If goal weight is lower (weight loss), reduce calories by up to 15%
    // If goal weight is higher (weight gain), increase calories by up to 15%
    adjustmentFactor += weightChangePercent * 0.5; // 50% of the percentage change, capped
    adjustmentFactor = Math.max(0.85, Math.min(1.15, adjustmentFactor)); // Cap between 85% and 115%
  }
  
  // Waistline goal adjustment (additional refinement)
  if (user.waistline && user.goalWaistline) {
    const waistlineDifference = user.goalWaistline - user.waistline;
    const waistlineChangePercent = waistlineDifference / user.waistline;
    
    // Waistline reduction typically correlates with calorie reduction
    // Apply a smaller adjustment factor for waistline goals
    const waistlineAdjustment = waistlineChangePercent * 0.3; // 30% of the percentage change
    adjustmentFactor += waistlineAdjustment;
    adjustmentFactor = Math.max(0.85, Math.min(1.15, adjustmentFactor)); // Keep within reasonable bounds
  }
  
  return adjustmentFactor;
}

/**
 * Adjust meal portion based on caloric needs
 */
function adjustMealPortion(originalPortion: string, adjustmentFactor: number): string {
  if (adjustmentFactor === 1.0) return originalPortion;
  
  // Extract numeric values from portions where possible
  const numericMatch = originalPortion.match(/(\d+(?:\.\d+)?)/);
  if (numericMatch) {
    const originalValue = parseFloat(numericMatch[1]);
    const adjustedValue = (originalValue * adjustmentFactor).toFixed(1);
    return originalPortion.replace(numericMatch[1], adjustedValue);
  }
  
  // For non-numeric portions, provide descriptive adjustments
  if (adjustmentFactor < 0.95) {
    return `Small ${originalPortion.toLowerCase()}`;
  } else if (adjustmentFactor > 1.05) {
    return `Large ${originalPortion.toLowerCase()}`;
  }
  
  return originalPortion;
}

/**
 * Determine which days the user will be cooking and eating at home
 */
function planCookingDays(user?: User): { cookingDays: number[], eatingDays: number[] } {
  const cookingDaysPerWeek = user?.cookingDaysPerWeek || 7;
  const eatingDaysAtHome = user?.eatingDaysAtHome || 7;
  
  // Default to all days if no preferences specified
  if (cookingDaysPerWeek >= 7 && eatingDaysAtHome >= 7) {
    return {
      cookingDays: [1, 2, 3, 4, 5, 6, 7],
      eatingDays: [1, 2, 3, 4, 5, 6, 7]
    };
  }
  
  // Prioritize weekdays for cooking (Sunday prep + weekdays)
  const cookingDays: number[] = [];
  if (cookingDaysPerWeek >= 1) cookingDays.push(7); // Sunday prep
  if (cookingDaysPerWeek >= 2) cookingDays.push(1); // Monday
  if (cookingDaysPerWeek >= 3) cookingDays.push(3); // Wednesday
  if (cookingDaysPerWeek >= 4) cookingDays.push(5); // Friday
  if (cookingDaysPerWeek >= 5) cookingDays.push(2); // Tuesday
  if (cookingDaysPerWeek >= 6) cookingDays.push(4); // Thursday
  if (cookingDaysPerWeek >= 7) cookingDays.push(6); // Saturday
  
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
  
  // Calculate caloric adjustment based on user goals
  const caloricAdjustment = user ? calculateCaloricAdjustment(user) : 1.0;
  
  // Plan cooking and eating schedule
  const { cookingDays, eatingDays } = planCookingDays(user);
  const meatFishMealsPerWeek = user?.meatFishMealsPerWeek || 0;
  let meatFishMealsAdded = 0;

  // Generate meals for 7 days
  for (let day = 1; day <= 7; day++) {
    let dailyProtein = 0;
    const isEatingDay = eatingDays.includes(day);
    const isCookingDay = cookingDays.includes(day);

    // Skip meal generation for days not eating at home
    if (!isEatingDay) {
      // Add a placeholder note meal for tracking
      const placeholderMeal: InsertMeal = {
        mealPlanId: 0,
        day,
        mealType: 'lunch',
        foodDescription: 'Eating out / External meal',
        portion: 'N/A',
        protein: 0,
        prepTime: 0,
      };
      meals.push(placeholderMeal);
      continue;
    }

    // Generate meals for each meal type (breakfast, lunch, dinner)
    ['breakfast', 'lunch', 'dinner'].forEach((mealType, index) => {
      const mealCategory = mealType as 'breakfast' | 'lunch' | 'dinner';
      
      // Determine if this meal should include meat/fish
      const shouldAddMeatFish = meatFishMealsAdded < meatFishMealsPerWeek && 
                                (mealCategory === 'lunch' || mealCategory === 'dinner');
      
      // Get base dietary tags
      let mealDietaryTags = [...dietaryTags];
      
      // Remove vegetarian tag if this meal should have meat/fish
      if (shouldAddMeatFish) {
        mealDietaryTags = mealDietaryTags.filter(tag => tag !== 'vegetarian');
        meatFishMealsAdded++;
      }
      
      // Get available meals for this category that match dietary preferences
      const availableMeals = getMealsForCategoryAndDiet(mealCategory, mealDietaryTags);
      
      if (availableMeals.length === 0) {
        // Fallback to all meals in category if no matches found
        const fallbackMeals = getMealsForCategoryAndDiet(mealCategory, []);
        console.warn(`No meals found for ${mealCategory} with dietary tags: ${mealDietaryTags.join(', ')}. Using fallback meals.`);
        availableMeals.push(...fallbackMeals);
      }

      // For non-cooking days, prefer simpler meals or leftovers
      let selectedMeal: MealOption;
      if (!isCookingDay && availableMeals.length > 0) {
        // Prefer meals with shorter prep times for non-cooking days
        const quickMeals = availableMeals.filter(meal => meal.nutrition.prepTime <= 15);
        if (quickMeals.length > 0) {
          const mealIndex = (day + index) % quickMeals.length;
          selectedMeal = quickMeals[mealIndex];
        } else {
          // Fallback to regular meal rotation
          const dayOffset = Math.floor((day - 1) / 2);
          const mealIndex = (dayOffset + index) % availableMeals.length;
          selectedMeal = availableMeals[mealIndex];
        }
      } else {
        // Regular meal rotation for cooking days
        const dayOffset = Math.floor((day - 1) / 2);
        const mealIndex = (dayOffset + index) % availableMeals.length;
        selectedMeal = availableMeals[mealIndex];
      }

      // Adjust portion based on caloric goals and household size
      let portionMultiplier = caloricAdjustment;
      if (user?.householdSize && user.householdSize > 1) {
        portionMultiplier *= user.householdSize;
      }
      
      const adjustedPortion = adjustMealPortion(selectedMeal.portion, portionMultiplier);
      const adjustedProtein = Math.round(selectedMeal.nutrition.protein * caloricAdjustment);

      const meal: InsertMeal = {
        mealPlanId: 0, // Will be set later
        day,
        mealType: mealCategory,
        foodDescription: selectedMeal.name,
        portion: adjustedPortion,
        protein: adjustedProtein,
        prepTime: selectedMeal.nutrition.prepTime,
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
