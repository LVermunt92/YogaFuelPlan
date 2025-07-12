import { MealOption, selectMealsForDay, calculateProteinTarget, MEAL_DATABASE } from './nutrition';
import { InsertMeal, InsertMealPlan, MealPlanRequest } from '@shared/schema';

export interface GeneratedMealPlan {
  mealPlan: InsertMealPlan;
  meals: InsertMeal[];
}

export function generateWeeklyMealPlan(request: MealPlanRequest): GeneratedMealPlan {
  const targetProtein = calculateProteinTarget(request.activityLevel);
  const meals: InsertMeal[] = [];
  let totalWeeklyProtein = 0;

  // Generate meals for 7 days
  for (let day = 1; day <= 7; day++) {
    const dailyMeals = selectMealsForDay(targetProtein);
    let dailyProtein = 0;

    // Add some variety by rotating meals every few days
    const dayOffset = Math.floor((day - 1) / 2);
    
    dailyMeals.forEach((mealOption, index) => {
      const mealType = ['breakfast', 'lunch', 'dinner'][index] as 'breakfast' | 'lunch' | 'dinner';
      
      // Add variety by cycling through options
      let selectedMeal = mealOption;
      if (day > 1) {
        const categoryMeals = MEAL_DATABASE.filter(m => m.category === mealType);
        const mealIndex = (dayOffset + index) % categoryMeals.length;
        selectedMeal = categoryMeals[mealIndex];
      }

      const meal: InsertMeal = {
        mealPlanId: 0, // Will be set later
        day,
        mealType,
        foodDescription: selectedMeal.name,
        portion: selectedMeal.portion,
        protein: selectedMeal.nutrition.protein,
        prepTime: selectedMeal.nutrition.prepTime,
      };

      meals.push(meal);
      dailyProtein += selectedMeal.nutrition.protein;
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
