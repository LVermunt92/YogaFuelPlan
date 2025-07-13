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
      const availableMeals = getEnhancedMealsForCategoryAndDiet(mealCategory, dietaryTags);
      
      if (availableMeals.length === 0) {
        console.log(`No ${mealCategory} meals found for dietary tags: ${dietaryTags.join(', ')}. Falling back to all ${mealCategory} meals.`);
        // Fallback to all meals in category if no matches
        const allMeals = getEnhancedMealsForCategoryAndDiet(mealCategory, []);
        availableMeals.push(...allMeals);
      }

      // Implement Sunday night cooking pattern logic
      let isLeftover = false;
      let selectedMeal: MealOption;
      
      if (day === 1 && mealCategory === 'dinner') {
        // Day 1: Sunday dinner - FIRST cooking moment
        selectedMeal = availableMeals[0];
        sundayDinnerMeal = selectedMeal;
      } else if (day === 2 && mealCategory === 'lunch') {
        // Day 2: Monday lunch - leftover from Sunday dinner
        if (!sundayDinnerMeal) {
          throw new Error('Sunday dinner meal not found for Monday lunch leftover');
        }
        selectedMeal = sundayDinnerMeal;
        isLeftover = true;
      } else if (day === 2 && mealCategory === 'dinner') {
        // Day 2: Monday dinner - fresh cooking
        selectedMeal = availableMeals[1] || availableMeals[0];
        mondayDinnerMeal = selectedMeal;
      } else if (day === 3 && mealCategory === 'lunch') {
        // Day 3: Tuesday lunch - leftover from Monday dinner
        if (!mondayDinnerMeal) {
          throw new Error('Monday dinner meal not found for Tuesday lunch leftover');
        }
        selectedMeal = mondayDinnerMeal;
        isLeftover = true;
      } else if (day === 3 && mealCategory === 'dinner') {
        // Day 3: Tuesday dinner - fresh cooking
        selectedMeal = availableMeals[2] || availableMeals[0];
        tuesdayDinnerMeal = selectedMeal;
      } else if (day === 4 && mealCategory === 'lunch') {
        // Day 4: Wednesday lunch - leftover from Tuesday dinner
        if (!tuesdayDinnerMeal) {
          throw new Error('Tuesday dinner meal not found for Wednesday lunch leftover');
        }
        selectedMeal = tuesdayDinnerMeal;
        isLeftover = true;
      } else if (day === 4 && mealCategory === 'dinner') {
        // Day 4: Wednesday dinner - fresh cooking
        selectedMeal = availableMeals[3] || availableMeals[0];
        wednesdayDinnerMeal = selectedMeal;
      } else if (day === 5 && mealCategory === 'lunch') {
        // Day 5: Thursday lunch - leftover from Wednesday dinner
        if (!wednesdayDinnerMeal) {
          throw new Error('Wednesday dinner meal not found for Thursday lunch leftover');
        }
        selectedMeal = wednesdayDinnerMeal;
        isLeftover = true;
      } else if (day === 5 && mealCategory === 'dinner') {
        // Day 5: Thursday dinner - fresh cooking
        selectedMeal = availableMeals[4] || availableMeals[0];
        thursdayDinnerMeal = selectedMeal;
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
        // Breakfast is always fresh (different each day)
        const breakfastIndex = (day - 1) % availableMeals.length;
        selectedMeal = availableMeals[breakfastIndex];
      } else {
        // Fresh lunch/dinner for other days
        const mealIndex = (day + mealCategory.length) % availableMeals.length;
        selectedMeal = availableMeals[mealIndex];
      }

      // Adjust portion based on caloric goals and household size
      let portionMultiplier = caloricAdjustment;
      if (user?.householdSize && user.householdSize > 1) {
        portionMultiplier *= user.householdSize;
      }
      
      const adjustedPortion = adjustMealPortion(selectedMeal.portion, portionMultiplier);
      const adjustedProtein = Math.round(selectedMeal.nutrition.protein * caloricAdjustment);
      const prepTimeForDay = isLeftover ? 5 : selectedMeal.nutrition.prepTime;

      const meal: InsertMeal = {
        mealPlanId: 0,
        day,
        mealType: mealCategory,
        foodDescription: isLeftover ? `${selectedMeal.name} (leftover)` : selectedMeal.name,
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
  
  // Get meal options for lunch and dinner with dietary filters
  const lunchOptions = getEnhancedMealsForCategoryAndDiet('lunch', dietaryTags);
  const dinnerOptions = getEnhancedMealsForCategoryAndDiet('dinner', dietaryTags);
  
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
  
  // Create a cooking schedule: track which meals are fresh vs leftovers
  // For 3 cooking days and 12 meals: cook 4 meals fresh, repeat each 3 times (4*3=12)
  const mealsPerCookingDay = Math.ceil(totalMealsNeeded / cookingDaysPerWeek);
  const cookingSchedule = new Map<string, { mealOption: any, isLeftover: boolean }>();
  
  // Plan fresh cooking moments
  let cookingMealIndex = 0;
  let usedLunchMeals = 0;
  let usedDinnerMeals = 0;
  
  daysWithMeals.forEach((day, dayIndex) => {
    const lunchKey = `${day}-lunch`;
    const dinnerKey = `${day}-dinner`;
    
    // Determine if this should be a fresh cooking day
    const shouldCookLunch = dayIndex % 2 === 0; // Cook lunch every other day
    const shouldCookDinner = dayIndex % 2 === 1; // Cook dinner on alternate days
    
    if (shouldCookLunch && usedLunchMeals < cookingDaysPerWeek) {
      cookingSchedule.set(lunchKey, { 
        mealOption: lunchOptions[usedLunchMeals % lunchOptions.length], 
        isLeftover: false 
      });
      usedLunchMeals++;
    } else if (usedLunchMeals > 0) {
      // Use previous lunch meal as leftover
      const prevMealIndex = Math.max(0, usedLunchMeals - 1);
      cookingSchedule.set(lunchKey, { 
        mealOption: lunchOptions[prevMealIndex % lunchOptions.length], 
        isLeftover: true 
      });
    }
    
    if (shouldCookDinner && usedDinnerMeals < cookingDaysPerWeek) {
      cookingSchedule.set(dinnerKey, { 
        mealOption: dinnerOptions[usedDinnerMeals % dinnerOptions.length], 
        isLeftover: false 
      });
      usedDinnerMeals++;
    } else if (usedDinnerMeals > 0) {
      // Use previous dinner meal as leftover
      const prevMealIndex = Math.max(0, usedDinnerMeals - 1);
      cookingSchedule.set(dinnerKey, { 
        mealOption: dinnerOptions[prevMealIndex % dinnerOptions.length], 
        isLeftover: true 
      });
    }
  });
  
  // Generate meals for all 7 days (breakfast always included)
  for (let day = 1; day <= 7; day++) {
    // BREAKFAST: Always include for every day (no meal prep needed)
    const breakfastOptions = getEnhancedMealsForCategoryAndDiet('breakfast', dietaryTags);
    const selectedBreakfast = breakfastOptions[(day - 1) % breakfastOptions.length];
    
    if (selectedBreakfast) {
      const adjustedPortion = adjustMealPortion(selectedBreakfast.portion, caloricAdjustment);
      const adjustedProtein = Math.round(selectedBreakfast.nutrition.protein * caloricAdjustment);
      
      meals.push({
        mealPlanId: 0,
        day,
        mealType: 'breakfast',
        foodDescription: selectedBreakfast.name,
        portion: adjustedPortion,
        protein: adjustedProtein,
        prepTime: selectedBreakfast.nutrition.prepTime,
      });
      
      totalWeeklyProtein += adjustedProtein;
    }
    
    // LUNCH & DINNER: Generate for all days, mark "eating out" for excluded days
    if (daysWithMeals.includes(day)) {
      // Days with home cooking - use the cooking schedule
      const lunchKey = `${day}-lunch`;
      const dinnerKey = `${day}-dinner`;
      
      // Generate lunch
      const lunchSchedule = cookingSchedule.get(lunchKey);
      if (lunchSchedule) {
        const { mealOption, isLeftover } = lunchSchedule;
        const adjustedPortion = adjustMealPortion(mealOption.portion, caloricAdjustment);
        const adjustedProtein = Math.round(mealOption.nutrition.protein * caloricAdjustment);
        const prepTime = isLeftover ? 5 : mealOption.nutrition.prepTime;
        
        meals.push({
          mealPlanId: 0,
          day,
          mealType: 'lunch',
          foodDescription: isLeftover ? `${mealOption.name} (leftover)` : mealOption.name,
          portion: adjustedPortion,
          protein: adjustedProtein,
          prepTime: prepTime,
        });
        
        totalWeeklyProtein += adjustedProtein;
      }
      
      // Generate dinner
      const dinnerSchedule = cookingSchedule.get(dinnerKey);
      if (dinnerSchedule) {
        const { mealOption, isLeftover } = dinnerSchedule;
        const adjustedPortion = adjustMealPortion(mealOption.portion, caloricAdjustment);
        const adjustedProtein = Math.round(mealOption.nutrition.protein * caloricAdjustment);
        const prepTime = isLeftover ? 5 : mealOption.nutrition.prepTime;
        
        meals.push({
          mealPlanId: 0,
          day,
          mealType: 'dinner',
          foodDescription: isLeftover ? `${mealOption.name} (leftover)` : mealOption.name,
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