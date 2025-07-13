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
  
  // Get meal options for each category with dietary filters
  const breakfastOptions = getMealsForCategoryAndDiet('breakfast', dietaryTags);
  const lunchOptions = getMealsForCategoryAndDiet('lunch', dietaryTags);
  const dinnerOptions = getMealsForCategoryAndDiet('dinner', dietaryTags);
  
  // Select 3 unique lunch and dinner meals for variety (3 cooking moments)
  const selectedLunchMeals = [
    lunchOptions[0] || lunchOptions[Math.floor(Math.random() * lunchOptions.length)],
    lunchOptions[1] || lunchOptions[Math.floor(Math.random() * lunchOptions.length)],
    lunchOptions[2] || lunchOptions[Math.floor(Math.random() * lunchOptions.length)]
  ];
  
  const selectedDinnerMeals = [
    dinnerOptions[0] || dinnerOptions[Math.floor(Math.random() * dinnerOptions.length)],
    dinnerOptions[1] || dinnerOptions[Math.floor(Math.random() * dinnerOptions.length)],
    dinnerOptions[2] || dinnerOptions[Math.floor(Math.random() * dinnerOptions.length)]
  ];
  
  // Define which meals are used on which days (3 cooking moments spread across week)
  const mealSchedule = new Map();
  
  // Day 1: Cook meal set 1 (fresh - green)
  mealSchedule.set(1, { lunchMealIndex: 0, dinnerMealIndex: 0, isFreshCooking: true });
  // Day 2: Eat leftovers from day 1 (leftover - blue)
  mealSchedule.set(2, { lunchMealIndex: 0, dinnerMealIndex: 0, isFreshCooking: false });
  
  // Day 3: Cook meal set 2 (fresh - green)
  mealSchedule.set(3, { lunchMealIndex: 1, dinnerMealIndex: 1, isFreshCooking: true });
  // Day 4: Eat leftovers from day 3 (leftover - blue)
  mealSchedule.set(4, { lunchMealIndex: 1, dinnerMealIndex: 1, isFreshCooking: false });
  
  // Day 5: Eat leftovers from day 3 (leftover - blue)
  mealSchedule.set(5, { lunchMealIndex: 1, dinnerMealIndex: 1, isFreshCooking: false });
  
  // Day 6: Cook meal set 3 (fresh - green)  
  mealSchedule.set(6, { lunchMealIndex: 2, dinnerMealIndex: 2, isFreshCooking: true });
  // Day 7: Eat leftovers from day 6 (leftover - blue)
  mealSchedule.set(7, { lunchMealIndex: 2, dinnerMealIndex: 2, isFreshCooking: false });
  
  // Generate meals for all 7 days
  for (let day = 1; day <= 7; day++) {
    let dailyProtein = 0;
    const totalAdjustment = caloricAdjustment * householdMultiplier;

    // BREAKFAST: Different every day (7 unique breakfasts)
    const breakfastMeal = breakfastOptions[(day - 1) % breakfastOptions.length];
    if (breakfastMeal) {
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
    }

    // LUNCH: Based on meal schedule (3 cooking moments)
    const daySchedule = mealSchedule.get(day);
    if (daySchedule) {
      const lunchMeal = selectedLunchMeals[daySchedule.lunchMealIndex];
      if (lunchMeal) {
        let lunchPortion = adjustMealPortion(lunchMeal.portion, totalAdjustment);
        let lunchPrepTime = lunchMeal.nutrition.prepTime;
        
        if (!daySchedule.isFreshCooking) {
          // This is a leftover day - mark as leftover for blue highlighting
          lunchPortion = `${lunchPortion} (leftover)`;
          lunchPrepTime = 5; // Just reheating time
        }
        
        const lunchProtein = lunchMeal.nutrition.protein * caloricAdjustment;
        meals.push({
          mealPlanId: 0,
          day,
          mealType: 'lunch',
          foodDescription: lunchMeal.name,
          portion: lunchPortion,
          protein: Math.round(lunchProtein),
          prepTime: lunchPrepTime
        });
        
        dailyProtein += lunchProtein;
      }
    }

    // DINNER: Based on meal schedule (3 cooking moments)
    if (daySchedule) {
      const dinnerMeal = selectedDinnerMeals[daySchedule.dinnerMealIndex];
      if (dinnerMeal) {
        let dinnerPortion = adjustMealPortion(dinnerMeal.portion, totalAdjustment);
        let dinnerPrepTime = dinnerMeal.nutrition.prepTime;
        
        if (!daySchedule.isFreshCooking) {
          // This is a leftover day - mark as leftover for blue highlighting
          dinnerPortion = `${dinnerPortion} (leftover)`;
          dinnerPrepTime = 5; // Just reheating time
        }
        
        const dinnerProtein = dinnerMeal.nutrition.protein * caloricAdjustment;
        meals.push({
          mealPlanId: 0,
          day,
          mealType: 'dinner',
          foodDescription: dinnerMeal.name,
          portion: dinnerPortion,
          protein: Math.round(dinnerProtein),
          prepTime: dinnerPrepTime
        });
        
        dailyProtein += dinnerProtein;
      }
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
