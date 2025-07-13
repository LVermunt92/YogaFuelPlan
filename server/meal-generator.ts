import { MealOption, selectMealsForDay, calculateProteinTarget, getMealsForCategoryAndDiet, MEAL_DATABASE } from './nutrition';
import { InsertMeal, InsertMealPlan, MealPlanRequest } from '@shared/schema';

export interface GeneratedMealPlan {
  mealPlan: InsertMealPlan;
  meals: InsertMeal[];
}

export function generateWeeklyMealPlan(request: MealPlanRequest): GeneratedMealPlan {
  const targetProtein = calculateProteinTarget(request.activityLevel);
  const meals: InsertMeal[] = [];
  let totalWeeklyProtein = 0;
  const dietaryTags = request.dietaryTags || [];

  // Generate meals for 7 days
  for (let day = 1; day <= 7; day++) {
    let dailyProtein = 0;

    // Generate meals for each meal type (breakfast, lunch, dinner)
    ['breakfast', 'lunch', 'dinner'].forEach((mealType, index) => {
      const mealCategory = mealType as 'breakfast' | 'lunch' | 'dinner';
      
      // Get available meals for this category that match dietary preferences
      const availableMeals = getMealsForCategoryAndDiet(mealCategory, dietaryTags);
      
      if (availableMeals.length === 0) {
        // Fallback to all meals in category if no matches found
        const fallbackMeals = getMealsForCategoryAndDiet(mealCategory, []);
        console.warn(`No meals found for ${mealCategory} with dietary tags: ${dietaryTags.join(', ')}. Using fallback meals.`);
        availableMeals.push(...fallbackMeals);
      }

      // Add variety by rotating meals based on day
      const dayOffset = Math.floor((day - 1) / 2);
      const mealIndex = (dayOffset + index) % availableMeals.length;
      const selectedMeal = availableMeals[mealIndex];

      const meal: InsertMeal = {
        mealPlanId: 0, // Will be set later
        day,
        mealType: mealCategory,
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
