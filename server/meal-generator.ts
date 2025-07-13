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

export function generateWeeklyMealPlan(request: MealPlanRequest, user?: User): GeneratedMealPlan {
  const targetProtein = calculateProteinTarget(request.activityLevel);
  const meals: InsertMeal[] = [];
  let totalWeeklyProtein = 0;
  const dietaryTags = request.dietaryTags || [];
  
  // Calculate caloric adjustment based on user goals
  const caloricAdjustment = user ? calculateCaloricAdjustment(user) : 1.0;

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

      // Adjust portion based on caloric goals
      const adjustedPortion = adjustMealPortion(selectedMeal.portion, caloricAdjustment);
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
