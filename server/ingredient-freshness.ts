/**
 * Ingredient Freshness Management System
 * Prioritizes meals based on ingredient shelf life for optimal freshness throughout the week
 */

export interface IngredientFreshness {
  ingredient: string;
  shelfLifeDays: number;
  category: 'very_fresh' | 'fresh' | 'moderate' | 'shelf_stable';
  priority: number; // 1-4, where 1 = use first, 4 = can wait
}

/**
 * Comprehensive ingredient freshness database
 * Based on typical grocery shopping on Sunday, how long ingredients stay fresh
 */
const INGREDIENT_FRESHNESS_DB: IngredientFreshness[] = [
  // Very Fresh (1-2 days) - Priority 1: Use Monday-Tuesday
  { ingredient: 'fresh herbs', shelfLifeDays: 1, category: 'very_fresh', priority: 1 },
  { ingredient: 'basil', shelfLifeDays: 1, category: 'very_fresh', priority: 1 },
  { ingredient: 'cilantro', shelfLifeDays: 1, category: 'very_fresh', priority: 1 },
  { ingredient: 'parsley', shelfLifeDays: 2, category: 'very_fresh', priority: 1 },
  { ingredient: 'lettuce', shelfLifeDays: 2, category: 'very_fresh', priority: 1 },
  { ingredient: 'spinach', shelfLifeDays: 2, category: 'very_fresh', priority: 1 },
  { ingredient: 'arugula', shelfLifeDays: 2, category: 'very_fresh', priority: 1 },
  { ingredient: 'mushrooms', shelfLifeDays: 2, category: 'very_fresh', priority: 1 },
  { ingredient: 'fresh berries', shelfLifeDays: 2, category: 'very_fresh', priority: 1 },
  { ingredient: 'strawberries', shelfLifeDays: 2, category: 'very_fresh', priority: 1 },
  { ingredient: 'raspberries', shelfLifeDays: 2, category: 'very_fresh', priority: 1 },
  { ingredient: 'blueberries', shelfLifeDays: 2, category: 'very_fresh', priority: 1 },
  { ingredient: 'avocado', shelfLifeDays: 2, category: 'very_fresh', priority: 1 },
  { ingredient: 'bananas', shelfLifeDays: 2, category: 'very_fresh', priority: 1 },
  { ingredient: 'fish', shelfLifeDays: 1, category: 'very_fresh', priority: 1 },
  { ingredient: 'salmon', shelfLifeDays: 1, category: 'very_fresh', priority: 1 },
  { ingredient: 'fresh seafood', shelfLifeDays: 1, category: 'very_fresh', priority: 1 },

  // Fresh (3-4 days) - Priority 2: Use Wednesday-Thursday
  { ingredient: 'broccoli', shelfLifeDays: 4, category: 'fresh', priority: 2 },
  { ingredient: 'cauliflower', shelfLifeDays: 4, category: 'fresh', priority: 2 },
  { ingredient: 'asparagus', shelfLifeDays: 3, category: 'fresh', priority: 2 },
  { ingredient: 'green beans', shelfLifeDays: 4, category: 'fresh', priority: 2 },
  { ingredient: 'zucchini', shelfLifeDays: 4, category: 'fresh', priority: 2 },
  { ingredient: 'cucumber', shelfLifeDays: 4, category: 'fresh', priority: 2 },
  { ingredient: 'tomatoes', shelfLifeDays: 4, category: 'fresh', priority: 2 },
  { ingredient: 'cherry tomatoes', shelfLifeDays: 4, category: 'fresh', priority: 2 },
  { ingredient: 'bell peppers', shelfLifeDays: 4, category: 'fresh', priority: 2 },
  { ingredient: 'peppers', shelfLifeDays: 4, category: 'fresh', priority: 2 },
  { ingredient: 'chicken breast', shelfLifeDays: 3, category: 'fresh', priority: 2 },
  { ingredient: 'chicken', shelfLifeDays: 3, category: 'fresh', priority: 2 },
  { ingredient: 'ground beef', shelfLifeDays: 3, category: 'fresh', priority: 2 },
  { ingredient: 'fresh meat', shelfLifeDays: 3, category: 'fresh', priority: 2 },
  { ingredient: 'tofu', shelfLifeDays: 4, category: 'fresh', priority: 2 },
  { ingredient: 'yogurt', shelfLifeDays: 4, category: 'fresh', priority: 2 },
  { ingredient: 'milk', shelfLifeDays: 4, category: 'fresh', priority: 2 },

  // Moderate (5-7 days) - Priority 3: Use Friday-Saturday
  { ingredient: 'carrots', shelfLifeDays: 7, category: 'moderate', priority: 3 },
  { ingredient: 'celery', shelfLifeDays: 7, category: 'moderate', priority: 3 },
  { ingredient: 'cabbage', shelfLifeDays: 7, category: 'moderate', priority: 3 },
  { ingredient: 'kale', shelfLifeDays: 5, category: 'moderate', priority: 3 },
  { ingredient: 'brussels sprouts', shelfLifeDays: 6, category: 'moderate', priority: 3 },
  { ingredient: 'sweet potatoes', shelfLifeDays: 7, category: 'moderate', priority: 3 },
  { ingredient: 'apples', shelfLifeDays: 7, category: 'moderate', priority: 3 },
  { ingredient: 'oranges', shelfLifeDays: 7, category: 'moderate', priority: 3 },
  { ingredient: 'lemons', shelfLifeDays: 7, category: 'moderate', priority: 3 },
  { ingredient: 'limes', shelfLifeDays: 7, category: 'moderate', priority: 3 },
  { ingredient: 'eggs', shelfLifeDays: 7, category: 'moderate', priority: 3 },
  { ingredient: 'cheese', shelfLifeDays: 7, category: 'moderate', priority: 3 },
  { ingredient: 'hard cheese', shelfLifeDays: 7, category: 'moderate', priority: 3 },

  // Shelf Stable (7+ days) - Priority 4: Can use anytime
  { ingredient: 'onions', shelfLifeDays: 14, category: 'shelf_stable', priority: 4 },
  { ingredient: 'garlic', shelfLifeDays: 21, category: 'shelf_stable', priority: 4 },
  { ingredient: 'ginger', shelfLifeDays: 14, category: 'shelf_stable', priority: 4 },
  { ingredient: 'potatoes', shelfLifeDays: 14, category: 'shelf_stable', priority: 4 },
  { ingredient: 'winter squash', shelfLifeDays: 21, category: 'shelf_stable', priority: 4 },
  { ingredient: 'butternut squash', shelfLifeDays: 21, category: 'shelf_stable', priority: 4 },
  { ingredient: 'rice', shelfLifeDays: 365, category: 'shelf_stable', priority: 4 },
  { ingredient: 'pasta', shelfLifeDays: 365, category: 'shelf_stable', priority: 4 },
  { ingredient: 'quinoa', shelfLifeDays: 365, category: 'shelf_stable', priority: 4 },
  { ingredient: 'beans', shelfLifeDays: 365, category: 'shelf_stable', priority: 4 },
  { ingredient: 'lentils', shelfLifeDays: 365, category: 'shelf_stable', priority: 4 },
  { ingredient: 'chickpeas', shelfLifeDays: 365, category: 'shelf_stable', priority: 4 },
  { ingredient: 'canned tomatoes', shelfLifeDays: 365, category: 'shelf_stable', priority: 4 },
  { ingredient: 'coconut milk', shelfLifeDays: 365, category: 'shelf_stable', priority: 4 },
  { ingredient: 'olive oil', shelfLifeDays: 365, category: 'shelf_stable', priority: 4 },
  { ingredient: 'vinegar', shelfLifeDays: 365, category: 'shelf_stable', priority: 4 },
  { ingredient: 'spices', shelfLifeDays: 365, category: 'shelf_stable', priority: 4 },
  { ingredient: 'dried herbs', shelfLifeDays: 365, category: 'shelf_stable', priority: 4 },
  { ingredient: 'nuts', shelfLifeDays: 30, category: 'shelf_stable', priority: 4 },
  { ingredient: 'seeds', shelfLifeDays: 30, category: 'shelf_stable', priority: 4 },
];

/**
 * Calculate freshness priority for a meal based on its ingredients
 */
export function calculateMealFreshnessPriority(ingredients: string[]): number {
  let totalPriority = 0;
  let matchedIngredients = 0;

  ingredients.forEach(ingredient => {
    const lowerIngredient = ingredient.toLowerCase();
    
    // Find matching freshness data
    const freshnessMatch = INGREDIENT_FRESHNESS_DB.find(item => 
      lowerIngredient.includes(item.ingredient.toLowerCase()) ||
      item.ingredient.toLowerCase().includes(lowerIngredient)
    );

    if (freshnessMatch) {
      totalPriority += freshnessMatch.priority;
      matchedIngredients++;
    } else {
      // Default to moderate priority for unknown ingredients
      totalPriority += 3;
      matchedIngredients++;
    }
  });

  // Return average priority (1 = highest priority, 4 = lowest priority)
  return matchedIngredients > 0 ? totalPriority / matchedIngredients : 3;
}

/**
 * Get ingredient freshness details for a list of ingredients
 */
export function getIngredientFreshnessDetails(ingredients: string[]): IngredientFreshness[] {
  const details: IngredientFreshness[] = [];

  ingredients.forEach(ingredient => {
    const lowerIngredient = ingredient.toLowerCase();
    
    const freshnessMatch = INGREDIENT_FRESHNESS_DB.find(item => 
      lowerIngredient.includes(item.ingredient.toLowerCase()) ||
      item.ingredient.toLowerCase().includes(lowerIngredient)
    );

    if (freshnessMatch) {
      details.push({
        ...freshnessMatch,
        ingredient: ingredient // Use original ingredient name
      });
    } else {
      // Default for unknown ingredients
      details.push({
        ingredient: ingredient,
        shelfLifeDays: 5,
        category: 'moderate',
        priority: 3
      });
    }
  });

  return details;
}

/**
 * Sort meals by freshness priority for optimal weekly scheduling
 * Returns meals sorted by freshness priority (most perishable first)
 */
export function sortMealsByFreshness(meals: any[]): any[] {
  return meals.sort((a, b) => {
    const priorityA = calculateMealFreshnessPriority(a.ingredients || []);
    const priorityB = calculateMealFreshnessPriority(b.ingredients || []);
    
    // Lower priority number = higher freshness priority (use first)
    return priorityA - priorityB;
  });
}

/**
 * Get recommended day for a meal based on ingredient freshness
 * Days 1-2 (Mon-Tue): Very fresh ingredients
 * Days 3-4 (Wed-Thu): Fresh ingredients  
 * Days 5-6 (Fri-Sat): Moderate shelf life
 * Day 7 (Sun): Shelf stable or eating out
 */
export function getRecommendedDayForMeal(ingredients: string[]): number[] {
  const priority = calculateMealFreshnessPriority(ingredients);
  
  if (priority <= 1.5) {
    return [2, 3]; // Monday-Tuesday (very fresh)
  } else if (priority <= 2.5) {
    return [4, 5]; // Wednesday-Thursday (fresh)
  } else if (priority <= 3.5) {
    return [6, 7]; // Friday-Saturday (moderate)
  } else {
    return [1, 7]; // Sunday or any day (shelf stable)
  }
}

/**
 * Log freshness analysis for debugging
 */
export function logMealFreshnessAnalysis(mealName: string, ingredients: string[]): void {
  const priority = calculateMealFreshnessPriority(ingredients);
  const recommendedDays = getRecommendedDayForMeal(ingredients);
  const freshnessDetails = getIngredientFreshnessDetails(ingredients);
  
  const veryFreshIngredients = freshnessDetails.filter(d => d.priority === 1);
  const freshIngredients = freshnessDetails.filter(d => d.priority === 2);
  
  console.log(`🥬 Freshness Analysis: ${mealName}`);
  console.log(`   Priority: ${priority.toFixed(1)} | Recommended days: ${recommendedDays.join(',')}`);
  
  if (veryFreshIngredients.length > 0) {
    console.log(`   Very fresh: ${veryFreshIngredients.map(d => d.ingredient).join(', ')}`);
  }
  if (freshIngredients.length > 0) {
    console.log(`   Fresh: ${freshIngredients.map(d => d.ingredient).join(', ')}`);
  }
}