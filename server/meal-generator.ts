import { MealOption, selectMealsForDay, calculateProteinTarget, getMealsForCategoryAndDiet, MEAL_DATABASE } from './nutrition';
import { InsertMeal, InsertMealPlan, MealPlanRequest, User } from '@shared/schema';

export interface GeneratedMealPlan {
  mealPlan: InsertMealPlan;
  meals: InsertMeal[];
}

/**
 * Calculate BMI from weight and height
 */
function calculateBMI(weight: number, height: number): number {
  return weight / Math.pow(height / 100, 2);
}

/**
 * Calculate caloric adjustment factor based on user's goals, BMI, and timeline
 * Returns a multiplier for portion sizes (1.0 = no change, <1.0 = smaller portions, >1.0 = larger portions)
 */
function calculateCaloricAdjustment(user: User): number {
  let adjustmentFactor = 1.0;
  const currentDate = new Date();
  
  // Calculate timeline factor if target date is set
  let timelineMultiplier = 1.0;
  if (user.targetDate) {
    const targetDate = new Date(user.targetDate);
    const daysUntilTarget = Math.max(1, (targetDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    const weeksUntilTarget = daysUntilTarget / 7;
    
    // More aggressive adjustments for shorter timelines
    if (weeksUntilTarget < 8) {
      timelineMultiplier = 1.3; // 30% more aggressive for < 2 months
    } else if (weeksUntilTarget < 16) {
      timelineMultiplier = 1.2; // 20% more aggressive for < 4 months
    } else if (weeksUntilTarget < 24) {
      timelineMultiplier = 1.1; // 10% more aggressive for < 6 months
    }
  }
  
  // Weight goal adjustment with timeline consideration
  if (user.weight && user.goalWeight) {
    const weightDifference = user.goalWeight - user.weight;
    const weightChangePercent = Math.abs(weightDifference) / user.weight;
    
    // Safe weight loss: 0.5-1kg per week, weight gain: 0.25-0.5kg per week
    const weeksToTarget = user.targetDate ? 
      Math.max(4, (new Date(user.targetDate).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 7)) : 24;
    const weeklyChange = Math.abs(weightDifference) / weeksToTarget;
    
    if (weightDifference < -2) {
      // Weight loss goal
      const maxAdjustment = Math.min(0.25, weeklyChange * 0.12 * timelineMultiplier);
      adjustmentFactor -= maxAdjustment;
    } else if (weightDifference > 2) {
      // Weight gain goal  
      const maxAdjustment = Math.min(0.2, weeklyChange * 0.08 * timelineMultiplier);
      adjustmentFactor += maxAdjustment;
    }
  }
  
  // BMI-based adjustments if height is available
  if (user.height && user.weight) {
    const currentBMI = calculateBMI(user.weight, user.height);
    
    if (currentBMI > 25 && user.goalWeight && user.goalWeight < user.weight) {
      adjustmentFactor *= 0.92; // Additional reduction for overweight individuals
    } else if (currentBMI < 18.5 && user.goalWeight && user.goalWeight > user.weight) {
      adjustmentFactor *= 1.08; // Additional increase for underweight individuals
    } else if (currentBMI > 30) {
      adjustmentFactor *= 0.88; // Stronger reduction for obesity
    }
  }
  
  // Waistline goal adjustment with timeline consideration
  if (user.waistline && user.goalWaistline) {
    const waistDifference = user.goalWaistline - user.waistline;
    if (waistDifference < -2) {
      const waistAdjustment = Math.min(0.12, Math.abs(waistDifference) * 0.008 * timelineMultiplier);
      adjustmentFactor -= waistAdjustment;
    }
  }
  
  return Math.max(0.7, Math.min(1.3, adjustmentFactor)); // Keep within reasonable bounds
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

  // Determine if meal prep is needed (cooking fewer days than eating)
  const needsMealPrep = cookingDays.length < eatingDays.length;
  
  // If meal prep is needed, plan batch cooking for lunch and dinner
  if (needsMealPrep) {
    return generateMealPrepPlan(request, user, cookingDays, eatingDays, dietaryTags, caloricAdjustment);
  }

  // Generate meals for 7 days (normal cooking)
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

      // Add cooking status to meal description for visual identification
      const cookingStatus = isCookingDay ? 'fresh' : 'reheat';
      const prepTimeForDay = isCookingDay ? selectedMeal.nutrition.prepTime : 5; // 5 min to reheat
      
      const meal: InsertMeal = {
        mealPlanId: 0, // Will be set later
        day,
        mealType: mealCategory,
        foodDescription: isCookingDay ? selectedMeal.name : `${selectedMeal.name} (leftover)`,
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
 * Generate meal prep plan when cooking days < eating days
 */
function generateMealPrepPlan(
  request: MealPlanRequest, 
  user: User | undefined, 
  cookingDays: number[], 
  eatingDays: number[],
  dietaryTags: string[],
  caloricAdjustment: number
): GeneratedMealPlan {
  const targetProtein = calculateProteinTarget(request.activityLevel);
  const meals: InsertMeal[] = [];
  let totalWeeklyProtein = 0;
  
  // Calculate household portion multiplier
  const householdSize = user?.householdSize || 1;
  const householdMultiplier = householdSize;
  
  // Reduce meal variety for efficient meal prep - use fewer unique meals
  const maxMealVariety = Math.max(1, Math.ceil(cookingDays.length / 2));
  
  // Get meal options for each category with dietary filters
  const breakfastOptions = getMealsForCategoryAndDiet('breakfast', dietaryTags);
  const lunchOptions = getMealsForCategoryAndDiet('lunch', dietaryTags).slice(0, maxMealVariety);
  const dinnerOptions = getMealsForCategoryAndDiet('dinner', dietaryTags).slice(0, maxMealVariety);
  
  // Select specific meals for the week to minimize variety
  const selectedLunchMeal = lunchOptions[0] || lunchOptions[Math.floor(Math.random() * lunchOptions.length)];
  const selectedDinnerMeal = dinnerOptions[0] || dinnerOptions[Math.floor(Math.random() * dinnerOptions.length)];
  
  // Plan meal prep schedule - distribute eating days across cooking days
  const mealSchedule: Map<number, { cookingDay: number, isLeftover: boolean }> = new Map();
  const mealsPerCookingDay = Math.ceil(eatingDays.length / cookingDays.length);
  
  let cookingDayIndex = 0;
  for (let i = 0; i < eatingDays.length; i++) {
    const eatingDay = eatingDays[i];
    const cookingDay = cookingDays[cookingDayIndex % cookingDays.length];
    const isLeftover = eatingDay !== cookingDay;
    
    mealSchedule.set(eatingDay, { cookingDay, isLeftover });
    
    // Move to next cooking day every mealsPerCookingDay eating days
    if ((i + 1) % mealsPerCookingDay === 0) {
      cookingDayIndex++;
    }
  }
  
  // Generate meals for all 7 days
  for (let day = 1; day <= 7; day++) {
    let dailyProtein = 0;
    const dailyProteinTarget = targetProtein / 3; // Distribute evenly across 3 meals

    // Always include breakfast (quick daily meal)
    const breakfastMeal = breakfastOptions[Math.floor(Math.random() * breakfastOptions.length)];
    if (!breakfastMeal) {
      console.error("No breakfast options available for dietary tags:", dietaryTags);
      // Create placeholder breakfast if no options available
      meals.push({
        mealPlanId: 0,
        day,
        mealType: 'breakfast',
        foodDescription: 'Simple breakfast (customize to preferences)',
        portion: '1 serving',
        protein: 20,
        prepTime: 10
      });
      continue;
    }
    // Apply both caloric and household size adjustments for breakfast
    const totalAdjustment = caloricAdjustment * householdMultiplier;
    const adjustedBreakfastPortion = adjustMealPortion(breakfastMeal.portion, totalAdjustment);
    const breakfastProtein = breakfastMeal.nutrition.protein * caloricAdjustment;
    
    meals.push({
      mealPlanId: 0, // Will be set later
      day,
      mealType: 'breakfast',
      foodDescription: breakfastMeal.name,
      portion: adjustedBreakfastPortion,
      protein: Math.round(breakfastProtein),
      prepTime: breakfastMeal.nutrition.prepTime
    });
    
    dailyProtein += breakfastProtein;

    // Handle lunch and dinner based on eating/cooking schedule
    if (eatingDays.includes(day)) {
      const schedule = mealSchedule.get(day);
      const isCookingDay = cookingDays.includes(day);
      
      // Use selected lunch meal for consistency (same meal all week)
      if (!selectedLunchMeal) {
        console.error("No lunch options available for dietary tags:", dietaryTags);
        continue; // Skip this day if no meals available
      }
      
      let lunchPortion = adjustMealPortion(selectedLunchMeal.portion, totalAdjustment);
      let lunchPrepTime = selectedLunchMeal.nutrition.prepTime;
      
      if (schedule?.isLeftover) {
        // This is a leftover day - adjust portion description and prep time
        lunchPortion = `${selectedLunchMeal.portion} (leftover)`;
        lunchPrepTime = 5; // Just reheating time
      } else if (isCookingDay && mealsPerCookingDay > 1) {
        // Cooking day with batch cooking - adjust portion for multiple servings
        lunchPortion = `${mealsPerCookingDay}x ${selectedLunchMeal.portion} (batch cook)`;
        lunchPrepTime += 10; // Extra time for batch cooking
      }
      
      const lunchProtein = selectedLunchMeal.nutrition.protein * caloricAdjustment;
      meals.push({
        mealPlanId: 0,
        day,
        mealType: 'lunch',
        foodDescription: selectedLunchMeal.name,
        portion: lunchPortion,
        protein: Math.round(lunchProtein),
        prepTime: lunchPrepTime
      });
      
      dailyProtein += lunchProtein;

      // Use selected dinner meal for consistency (same meal all week)
      if (!selectedDinnerMeal) {
        console.error("No dinner options available for dietary tags:", dietaryTags);
        continue; // Skip this day if no meals available
      }
      
      let dinnerPortion = adjustMealPortion(selectedDinnerMeal.portion, totalAdjustment);
      let dinnerPrepTime = selectedDinnerMeal.nutrition.prepTime;
      
      if (schedule?.isLeftover) {
        // This is a leftover day
        dinnerPortion = `${selectedDinnerMeal.portion} (leftover)`;
        dinnerPrepTime = 5; // Just reheating time
      } else if (isCookingDay && mealsPerCookingDay > 1) {
        // Cooking day with batch cooking
        dinnerPortion = `${mealsPerCookingDay}x ${selectedDinnerMeal.portion} (batch cook)`;
        dinnerPrepTime += 10; // Extra time for batch cooking
      }
      
      const dinnerProtein = selectedDinnerMeal.nutrition.protein * caloricAdjustment;
      meals.push({
        mealPlanId: 0,
        day,
        mealType: 'dinner',
        foodDescription: selectedDinnerMeal.name,
        portion: dinnerPortion,
        protein: Math.round(dinnerProtein),
        prepTime: dinnerPrepTime
      });
      
      dailyProtein += dinnerProtein;
    } else {
      // Not an eating day - no lunch/dinner at home
      const placeholderLunch: InsertMeal = {
        mealPlanId: 0,
        day,
        mealType: 'lunch',
        foodDescription: 'Eating out or packed lunch',
        portion: 'Various',
        protein: 0,
        prepTime: 0
      };
      
      const placeholderDinner: InsertMeal = {
        mealPlanId: 0,
        day,
        mealType: 'dinner',
        foodDescription: 'Eating out or social dining',
        portion: 'Various',
        protein: 0,
        prepTime: 0
      };
      
      meals.push(placeholderLunch, placeholderDinner);
    }

    totalWeeklyProtein += dailyProtein;
  }

  const mealPlan: InsertMealPlan = {
    userId: request.userId,
    weekStart: request.weekStart,
    activityLevel: request.activityLevel,
    totalProtein: Math.round(totalWeeklyProtein),
    notionSynced: false
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
