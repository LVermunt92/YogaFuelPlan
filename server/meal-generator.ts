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

/**
 * Get priority ingredients from user's fridge inventory
 */
async function getFridgeInventoryIngredients(userId: number): Promise<string[]> {
  try {
    console.log(`🧊 DEBUG: Fetching fridge items for user ${userId}`);
    // Get fresh fridge items (not used yet) ordered by priority and expiration
    const fridgeItems = await storage.getFridgeItems(userId, false);
    console.log(`🧊 DEBUG: Raw fridge items:`, JSON.stringify(fridgeItems, null, 2));
    
    // Convert fridge items to ingredient names, prioritizing high priority and soon-to-expire items
    const priorityIngredients = fridgeItems
      .filter(item => {
        const isHighPriority = (typeof item.priority === 'string' && item.priority === 'high') || 
                              (typeof item.priority === 'number' && item.priority >= 3);
        const isExpiringSoon = item.expirationDate && new Date(item.expirationDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        console.log(`🧊 DEBUG: Item "${item.ingredient}" - priority: ${item.priority} (${typeof item.priority}), isHighPriority: ${isHighPriority}, isExpiringSoon: ${isExpiringSoon}`);
        return isHighPriority || isExpiringSoon;
      })
      .map(item => item.ingredient.toLowerCase());
    
    console.log(`🧊 Found ${fridgeItems.length} fridge items, ${priorityIngredients.length} priority ingredients: ${JSON.stringify(priorityIngredients)}`);
    return priorityIngredients;
  } catch (error) {
    console.error('🧊 ERROR fetching fridge inventory:', error);
    return [];
  }
}

/**
 * Score meals based on fridge inventory matches
 */
function scoreMealsByFridgeInventory(meals: MealOption[], fridgeIngredients: string[]): MealOption[] {
  if (fridgeIngredients.length === 0) return meals;
  
  return meals.map(meal => {
    const ingredientMatches = meal.ingredients.filter(ingredient => 
      fridgeIngredients.some(fridgeItem => {
        const lowerIngredient = ingredient.toLowerCase();
        const lowerFridgeItem = fridgeItem.toLowerCase();
        
        // Direct substring match
        if (lowerIngredient.includes(lowerFridgeItem) || lowerFridgeItem.includes(lowerIngredient)) {
          return true;
        }
        
        // Word-based matching for compound ingredients like "cauliflower rice"
        const fridgeWords = lowerFridgeItem.split(' ');
        const ingredientWords = lowerIngredient.split(' ');
        
        // Check if all words from fridge item appear in meal ingredient
        const allWordsMatch = fridgeWords.every(fridgeWord => 
          ingredientWords.some(ingredientWord => 
            ingredientWord.includes(fridgeWord) || fridgeWord.includes(ingredientWord)
          )
        );
        
        return allWordsMatch;
      })
    );
    
    const fridgeScore = ingredientMatches.length;
    if (fridgeScore > 0) {
      console.log(`🎯 Fridge match: "${meal.name}" uses ${fridgeScore} fridge ingredients: ${ingredientMatches.join(', ')}`);
    }
    
    return {
      ...meal,
      fridgeScore
    };
  }).sort((a, b) => (b as any).fridgeScore - (a as any).fridgeScore);
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
 * Calculate compatibility score between leftover ingredient and meal
 */
function calculateIngredientCompatibility(leftoverIngredient: string, meal: MealOption): number {
  const leftoverLower = leftoverIngredient.toLowerCase();
  const mealIngredients = meal.ingredients.map(i => i.toLowerCase());
  const mealName = meal.name.toLowerCase();
  let score = 0;
  
  // Direct ingredient match (highest score)
  if (mealIngredients.some(ing => ing.includes(leftoverLower) || leftoverLower.includes(ing))) {
    score += 10;
  }
  
  // Cuisine and cooking style compatibility
  const cuisineMatches = {
    'spinach': ['mediterranean', 'italian', 'greek', 'pasta', 'lasagna', 'curry', 'stir'],
    'spinazie': ['mediterranean', 'italian', 'greek', 'pasta', 'lasagna', 'curry', 'stir'],
    'cauliflower': ['indian', 'curry', 'roasted', 'mash', 'rice', 'keto', 'low-carb'],
    'bloemkool': ['indian', 'curry', 'roasted', 'mash', 'rice', 'keto', 'low-carb'],
    'sugar snap': ['asian', 'stir', 'chinese', 'thai', 'steam', 'crisp'],
    'sugarsnap': ['asian', 'stir', 'chinese', 'thai', 'steam', 'crisp']
  };
  
  // Check cuisine compatibility
  for (const [ingredient, cuisines] of Object.entries(cuisineMatches)) {
    if (leftoverLower.includes(ingredient)) {
      for (const cuisine of cuisines) {
        if (mealName.includes(cuisine) || mealIngredients.some(ing => ing.includes(cuisine))) {
          score += 3;
        }
      }
    }
  }
  
  // Cooking method compatibility
  const cookingMethodMatches = {
    'spinach': ['sauté', 'steam', 'wilt', 'fresh', 'raw'],
    'cauliflower': ['roast', 'steam', 'mash', 'rice', 'grain'],
    'sugar snap': ['stir', 'steam', 'crisp', 'crunch', 'fresh']
  };
  
  for (const [ingredient, methods] of Object.entries(cookingMethodMatches)) {
    if (leftoverLower.includes(ingredient)) {
      for (const method of methods) {
        if (mealName.includes(method) || mealIngredients.some(ing => ing.includes(method))) {
          score += 2;
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
 * Check if a meal can incorporate leftover ingredients and modify description
 */
function incorporateLeftoverIngredients(meal: MealOption, ingredientsToUseUp: string[]): { modifiedMeal: MealOption, usedIngredients: string[] } {
  if (!ingredientsToUseUp.length) return { modifiedMeal: meal, usedIngredients: [] };
  
  const usedIngredients: string[] = [];
  
  // Check which leftover ingredients are compatible with this meal
  for (const leftoverIngredient of ingredientsToUseUp) {
    const compatibility = calculateIngredientCompatibility(leftoverIngredient, meal);
    
    // Only incorporate if compatibility score is reasonable (> 1)
    if (compatibility > 1) {
      usedIngredients.push(leftoverIngredient);
      console.log(`✓ Incorporating "${leftoverIngredient}" into "${meal.name}" (compatibility: ${compatibility})`);
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
 * Check if two meal names are exactly the same (prevent duplicates of identical recipes)
 */
function areMealsSimilar(meal1: string, meal2: string): boolean {
  const name1 = meal1.toLowerCase().trim();
  const name2 = meal2.toLowerCase().trim();
  
  // Clean both names by removing dietary tags and leftover indicators
  const cleanName1 = name1
    .replace(/ \(incorporating leftover.*?\)/g, '')
    .replace(/ \([^)]*\)/g, '') // Remove all parenthetical tags
    .replace(/ \(leftover\)/g, '')
    .trim();
  
  const cleanName2 = name2
    .replace(/ \(incorporating leftover.*?\)/g, '')
    .replace(/ \([^)]*\)/g, '') // Remove all parenthetical tags  
    .replace(/ \(leftover\)/g, '')
    .trim();
  
  // Prevent exact duplicates of the same base recipe
  return cleanName1 === cleanName2;
}

/**
 * Select an unused meal from available options, ensuring intelligent variety and preventing similar recipes
 */
function selectUnusedMeal(
  availableMeals: MealOption[], 
  usedMeals: Set<string>, 
  allSelectedMeals?: Set<string>,
  prioritizeCustom: boolean = false,
  fridgeIngredients: string[] = [],
  leftoverIngredients: string[] = []
): MealOption {
  if (availableMeals.length === 0) {
    throw new Error('No available meals to select from');
  }
  
  // First try to find a meal that hasn't been used yet
  let unusedMeals = availableMeals.filter(meal => !usedMeals.has(meal.name));
  
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
    unusedMeals = unusedMeals.filter(candidateMeal => {
      const isSimilar = Array.from(allSelectedMeals).some(selectedMeal => 
        areMealsSimilar(candidateMeal.name, selectedMeal)
      );
      if (isSimilar) {
        console.log(`🚫 Global filter blocked: ${candidateMeal.name} (similar to existing meals)`);
      }
      return !isSimilar;
    });
    if (beforeFilter !== unusedMeals.length) {
      console.log(`🔍 Global filter: ${beforeFilter} → ${unusedMeals.length} meals after similarity filtering`);
    }
  }
  
  if (unusedMeals.length > 0) {
    // First priority: meals that naturally contain leftover ingredients
    if (leftoverIngredients.length > 0) {
      const mealsWithLeftovers: Array<MealOption & { compatibilityScore: number }> = [];
      
      for (const meal of unusedMeals) {
        let totalCompatibility = 0;
        for (const leftoverIngredient of leftoverIngredients) {
          totalCompatibility += calculateIngredientCompatibility(leftoverIngredient, meal);
        }
        
        if (totalCompatibility > 5) { // High compatibility threshold for natural incorporation
          mealsWithLeftovers.push({
            ...meal,
            compatibilityScore: totalCompatibility
          });
        }
      }
      
      if (mealsWithLeftovers.length > 0) {
        // Sort by compatibility and use the best match
        const bestMatch = mealsWithLeftovers.sort((a, b) => b.compatibilityScore - a.compatibilityScore)[0];
        console.log(`🎯 Found meal that naturally uses leftovers: "${bestMatch.name}" (score: ${bestMatch.compatibilityScore})`);
        return bestMatch;
      }
    }
    
    // Second priority: meals that use fridge ingredients
    if (fridgeIngredients.length > 0) {
      const fridgeScoredMeals = scoreMealsByFridgeInventory(unusedMeals, fridgeIngredients);
      const topFridgeMatches = fridgeScoredMeals.filter((meal: any) => meal.fridgeScore > 0);
      
      if (topFridgeMatches.length > 0) {
        console.log(`🧊 Found ${topFridgeMatches.length} meals using fridge ingredients, prioritizing them`);
        unusedMeals = topFridgeMatches;
      }
    }
    
    // Use intelligent variety selection instead of pure random
    const selectedMeals = selectMealsWithBetterVariety(unusedMeals, 1, Array.from(usedMeals));
    const selectedMeal = selectedMeals[0] || unusedMeals[0];
    console.log(`📋 Selected unused meal: ${selectedMeal.name} (${unusedMeals.length} unused options available)`);
    return selectedMeal;
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
    
    // Use intelligent selection after reset
    const selectedMeals = selectMealsWithBetterVariety(resetCandidates, 1);
    const selectedMeal = selectedMeals[0] || resetCandidates[0];
    console.log(`📋 Reset and selected: ${selectedMeal.name} (from ${resetCandidates.length} filtered options)`);
    return selectedMeal;
  } else {
    // Only one meal available, use it
    console.log(`⚠️ Only one meal option available: ${availableMeals[0].name}`);
    return availableMeals[0];
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
  const dietaryTags = request.dietaryTags || [];
  const ingredientsToUseUp = user?.leftovers || [];
  let remainingIngredientsToUseUp = [...ingredientsToUseUp];
  
  // Fetch fridge inventory for meal prioritization
  let fridgeIngredients: string[] = [];
  console.log(`🧊 DEBUG: User object:`, JSON.stringify(user ? { id: user.id, username: user.username } : null));
  if (user?.id) {
    console.log(`🧊 DEBUG: About to fetch fridge inventory for user ${user.id}`);
    fridgeIngredients = await getFridgeInventoryIngredients(user.id);
  } else {
    console.log(`🧊 DEBUG: No user ID found, skipping fridge inventory`);
  }
  
  console.log(`🥕 Starting meal generation with leftover ingredients: ${JSON.stringify(ingredientsToUseUp)}`);
  console.log(`🧊 Fridge inventory ingredients to prioritize: ${JSON.stringify(fridgeIngredients)}`);
  
  // Keep all leftover ingredients for incorporation into meals
  if (ingredientsToUseUp.length > 0) {
    console.log(`🥕 Will incorporate leftover ingredients into meals: ${JSON.stringify(ingredientsToUseUp)}`);
  }
  
  // Calculate caloric adjustment based on user goals
  const caloricAdjustment = user ? calculateCaloricAdjustment(user) : 1.0;
  
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
    const result = await generateMealPrepPlan(request, user, caloricAdjustment, fridgeIngredients);
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
    
    // Smart fallback: If user doesn't have enough variety, supplement with curated recipes
    const minVarietyThreshold = 3; // Need at least 3 options per meal type for good variety
    
    breakfastOptions = userBreakfastOptions;
    lunchOptions = userLunchOptions;
    dinnerOptions = userDinnerOptions;
    
    if (breakfastOptions.length < minVarietyThreshold) {
      console.log(`🔄 Smart fallback: Adding curated breakfast recipes (user has ${breakfastOptions.length}, need ${minVarietyThreshold})`);
      const curatedBreakfast = await getEnhancedMealsForCategoryAndDiet('breakfast', dietaryTags, user?.id);
      breakfastOptions = [...breakfastOptions, ...curatedBreakfast.slice(0, minVarietyThreshold - breakfastOptions.length)];
    }
    
    if (lunchOptions.length < minVarietyThreshold) {
      console.log(`🔄 Smart fallback: Adding curated lunch recipes (user has ${lunchOptions.length}, need ${minVarietyThreshold})`);
      const curatedLunch = await getEnhancedMealsForCategoryAndDiet('lunch', dietaryTags, user?.id);
      lunchOptions = [...lunchOptions, ...curatedLunch.slice(0, minVarietyThreshold - lunchOptions.length)];
    }
    
    if (dinnerOptions.length < minVarietyThreshold) {
      console.log(`🔄 Smart fallback: Adding curated dinner recipes (user has ${dinnerOptions.length}, need ${minVarietyThreshold})`);
      const curatedDinner = await getEnhancedMealsForCategoryAndDiet('dinner', dietaryTags, user?.id);
      dinnerOptions = [...dinnerOptions, ...curatedDinner.slice(0, minVarietyThreshold - dinnerOptions.length)];
    }
    
    console.log(`📊 Final recipe counts with fallback: ${breakfastOptions.length} breakfast, ${lunchOptions.length} lunch, ${dinnerOptions.length} dinner`);
  } else {
    // Fast recipe loading: Use existing database for maximum speed + custom recipes
    console.log('🚀 Fast recipe loading using existing database + custom recipes');
    breakfastOptions = await getEnhancedMealsForCategoryAndDiet('breakfast', dietaryTags, user?.id);
    lunchOptions = await getEnhancedMealsForCategoryAndDiet('lunch', dietaryTags, user?.id);
    dinnerOptions = await getEnhancedMealsForCategoryAndDiet('dinner', dietaryTags, user?.id);
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
  
  // Loop through days 1-7 (Sunday through Saturday)
  // Day 1 = Sunday, Day 2 = Monday, Day 3 = Tuesday, Day 4 = Wednesday, Day 5 = Thursday, Day 6 = Friday, Day 7 = Saturday
  for (let day = 1; day <= 7; day++) {
    let dailyProtein = 0;
    
    // Determine which meals to generate for this day
    let mealsToGenerate: ('breakfast' | 'lunch' | 'dinner')[] = [];
    if (day === 1) {
      // Day 1: Sunday evening - only dinner (start of meal plan)
      mealsToGenerate = ['dinner'];
      console.log(`🌅 Day ${day} (Sunday evening): ONLY dinner`);
    } else if (day === 7) {
      // Day 7: Saturday - eating out options
      mealsToGenerate = ['breakfast', 'lunch', 'dinner'];
      console.log(`🌅 Day ${day} (Saturday): all meals`);
    } else {
      // Days 2-6: Monday through Friday - full meal planning
      mealsToGenerate = ['breakfast', 'lunch', 'dinner'];
      console.log(`🌅 Day ${day}: all meals`);
    }

    mealsToGenerate.forEach(mealCategory => {
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
        selectedMeal = selectUnusedMeal(availableMeals, usedDinnerMeals, allSelectedMealNames, false, fridgeIngredients, ingredientsToUseUp);
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
        selectedMeal = selectUnusedMeal(availableMeals, usedDinnerMeals, allSelectedMealNames, false, fridgeIngredients, ingredientsToUseUp);
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
        selectedMeal = selectUnusedMeal(availableMeals, usedDinnerMeals, allSelectedMealNames, false, fridgeIngredients, ingredientsToUseUp);
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
        selectedMeal = selectUnusedMeal(availableMeals, usedDinnerMeals, allSelectedMealNames, false, fridgeIngredients, ingredientsToUseUp);
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
        selectedMeal = selectUnusedMeal(availableMeals, usedDinnerMeals, allSelectedMealNames, false, fridgeIngredients, ingredientsToUseUp);
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
        selectedMeal = selectUnusedMeal(availableMeals, usedDinnerMeals, allSelectedMealNames, false, fridgeIngredients, ingredientsToUseUp);
        let fridayDinnerMeal = selectedMeal;
        usedDinnerMeals.add(selectedMeal.name);
        allSelectedMealNames.add(selectedMeal.name);
      } else if (day === 7 && mealCategory === 'lunch') {
        // Day 7: Saturday lunch - only add eating out if user doesn't eat at home
        if (!daysWithMeals.includes(day)) {
          selectedMeal = {
            name: "Eating out",
            portion: "",
            nutrition: { protein: 0, prepTime: 30 },
            ingredients: [],
            tags: [],
            recipe: { instructions: [], tips: [] }
          };
        } else {
          // User eats at home - select proper meal
          selectedMeal = selectUnusedMeal(availableMeals, usedLunchMeals, allSelectedMealNames, false, fridgeIngredients, ingredientsToUseUp);
          usedLunchMeals.add(selectedMeal.name);
          allSelectedMealNames.add(selectedMeal.name);
        }
      } else if (day === 7 && mealCategory === 'dinner') {
        // Day 7: Saturday dinner - only add eating out if different from lunch
        if (!daysWithMeals.includes(day)) {
          // Only add "Eating out" for dinner if lunch wasn't already "Eating out"
          const lunchMeal = meals.find(m => m.day === day && m.mealType === 'lunch');
          if (!lunchMeal || lunchMeal.foodDescription !== 'Eating out') {
            selectedMeal = {
              name: "Eating out",
              portion: "",
              nutrition: { protein: 0, prepTime: 30 },
              ingredients: [],
              tags: [],
              recipe: { instructions: [], tips: [] }
            };
          } else {
            // Skip duplicate eating out - generate actual meal instead
            selectedMeal = selectUnusedMeal(availableMeals, usedDinnerMeals, allSelectedMealNames, false, fridgeIngredients, ingredientsToUseUp);
            usedDinnerMeals.add(selectedMeal.name);
            allSelectedMealNames.add(selectedMeal.name);
          }
        } else {
          // User eats at home - select proper meal
          selectedMeal = selectUnusedMeal(availableMeals, usedDinnerMeals, allSelectedMealNames, false, fridgeIngredients, ingredientsToUseUp);
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
            selectedMeal = selectUnusedMeal(weekendBreakfasts, usedBreakfastMeals, allSelectedMealNames, false, fridgeIngredients, ingredientsToUseUp);
            usedBreakfastMeals.add(selectedMeal.name);
            allSelectedMealNames.add(selectedMeal.name);
            console.log(`Day ${day} (weekend) breakfast: ${selectedMeal.name} (prep: ${selectedMeal.nutrition.prepTime}min)`);
          } else {
            selectedMeal = selectUnusedMeal(availableMeals, usedBreakfastMeals, allSelectedMealNames, false, fridgeIngredients, ingredientsToUseUp);
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
            selectedMeal = selectUnusedMeal(weekdayBreakfasts, usedBreakfastMeals, allSelectedMealNames, false, fridgeIngredients, ingredientsToUseUp);
            usedBreakfastMeals.add(selectedMeal.name);
            allSelectedMealNames.add(selectedMeal.name);
            console.log(`Day ${day} (weekday) breakfast: ${selectedMeal.name} (prep: ${selectedMeal.nutrition.prepTime}min)`);
          } else {
            selectedMeal = selectUnusedMeal(availableMeals, usedBreakfastMeals, allSelectedMealNames, false, fridgeIngredients, ingredientsToUseUp);
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
        
        selectedMeal = selectUnusedMeal(mealsToSelectFrom, mealCategory === 'lunch' ? usedLunchMeals : usedDinnerMeals, allSelectedMealNames, false, fridgeIngredients, ingredientsToUseUp);
        
        // Log freshness analysis for the selected meal
        logMealFreshnessAnalysis(selectedMeal.name, selectedMeal.ingredients || []);
        
        if (mealCategory === 'lunch') {
          usedLunchMeals.add(selectedMeal.name);
        } else {
          usedDinnerMeals.add(selectedMeal.name);
        }
        allSelectedMealNames.add(selectedMeal.name);
      }
      
      // Try to incorporate leftover ingredients for cooking moments (not leftovers)
      if (!isLeftover && remainingIngredientsToUseUp.length > 0) {
        const { modifiedMeal, usedIngredients } = incorporateLeftoverIngredients(selectedMeal, remainingIngredientsToUseUp);
        if (usedIngredients.length > 0) {
          selectedMeal = modifiedMeal;
          remainingIngredientsToUseUp = remainingIngredientsToUseUp.filter(ing => !usedIngredients.includes(ing));
          console.log(`✓ Incorporated leftover ingredients: ${usedIngredients.join(', ')} into ${selectedMeal.name}`);
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
    });

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
  fridgeIngredients: string[] = []
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
    
    // Use streamlined approach: load all recipes (custom + curated) in unified pool
    console.log(`🎯 MEAL PREP: Using streamlined approach for unified recipe loading`);
    lunchOptions = await getEnhancedMealsForCategoryAndDiet('lunch', dietaryTags, user?.id);
    console.log(`🎯 MEAL PREP: Loaded ${lunchOptions.length} total lunch options (custom + curated)`);
    console.log(`🎯 MEAL PREP: Custom lunch recipes in pool: ${lunchOptions.filter(m => m.tags.includes('custom')).map(m => m.name).join(', ')}`);
    console.log(`🎯 MEAL PREP: Curated lunch recipes in pool: ${lunchOptions.filter(m => !m.tags.includes('custom')).map(m => m.name).join(', ')}`);
    
    // Note: Custom recipes are already prioritized by being added first in the unified pool
    
    dinnerOptions = await getEnhancedMealsForCategoryAndDiet('dinner', dietaryTags, user?.id);
    console.log(`🎯 MEAL PREP: Loaded ${dinnerOptions.length} total dinner options (custom + curated)`);
    console.log(`🎯 MEAL PREP: Custom dinner recipes in pool: ${dinnerOptions.filter(m => m.tags.includes('custom')).map(m => m.name).join(', ')}`);
    console.log(`🎯 MEAL PREP: Curated dinner recipes in pool: ${dinnerOptions.filter(m => !m.tags.includes('custom')).map(m => m.name).join(', ')}`);
    
    // Note: Custom recipes are automatically prioritized by the unified pool approach
    
    console.log(`📊 Final meal prep recipe counts with custom + fallback: ${lunchOptions.length} lunch, ${dinnerOptions.length} dinner`);
  } else {
    // No custom recipes found - use only curated database
    console.log('🔧 No custom recipes found, using curated database only');
    lunchOptions = await getEnhancedMealsForCategoryAndDiet('lunch', dietaryTags, user?.id);
    dinnerOptions = await getEnhancedMealsForCategoryAndDiet('dinner', dietaryTags, user?.id);
    
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
    const extraCuratedLunch = await getEnhancedMealsForCategoryAndDiet('lunch', dietaryTags);
    lunchOptions = [...lunchOptions, ...extraCuratedLunch.slice(0, 3 - lunchOptions.length)];
  }
  
  if (dinnerOptions.length < 3) {
    console.log(`🔄 Smart fallback: Adding more curated dinner recipes (current: ${dinnerOptions.length}, target: 3+)`);
    const extraCuratedDinner = await getEnhancedMealsForCategoryAndDiet('dinner', dietaryTags);
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

  // Use Sunday night cooking pattern with proper leftover linking
  // Track which meals to use as leftovers
  let sundayDinnerMeal: any = null;
  let mondayDinnerMeal: any = null;
  let tuesdayDinnerMeal: any = null;
  let wednesdayDinnerMeal: any = null;
  let thursdayDinnerMeal: any = null;
  

  


  // Generate meals for all 7 days (breakfast always included) - using streamlined approach
  let breakfastOptions = await getEnhancedMealsForCategoryAndDiet('breakfast', dietaryTags, user?.id);
  console.log(`✓ Breakfast variety: Found ${breakfastOptions.length} breakfast options for dietary tags: ${dietaryTags.join(', ')}`);
  
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
  // Start from Day 2 because Day 1 = Sunday evening (dinner only)
  for (let day = 2; day <= 7; day++) {
    const isWeekend = day === 6 || day === 7; // Saturday or Sunday
    
    if (isWeekend && weekendBreakfasts.length > 0) {
      // Weekend: use elaborate breakfasts with variety
      const selectedBreakfast = selectUnusedMeal(weekendBreakfasts, usedBreakfastMeals, allSelectedMealNames, false, fridgeIngredients, ingredientsToUseUp);
      usedBreakfastMeals.add(selectedBreakfast.name);
      allSelectedMealNames.add(selectedBreakfast.name);
      breakfastPool.push(selectedBreakfast);
    } else if (!isWeekend && weekdayBreakfasts.length > 0) {
      // Weekday: use quick breakfasts with variety
      const selectedBreakfast = selectUnusedMeal(weekdayBreakfasts, usedBreakfastMeals, allSelectedMealNames, false, fridgeIngredients, ingredientsToUseUp);
      usedBreakfastMeals.add(selectedBreakfast.name);
      allSelectedMealNames.add(selectedBreakfast.name);
      breakfastPool.push(selectedBreakfast);
    } else {
      // Fallback: try to use appropriate category if possible
      console.log(`⚠️ Fallback needed for day ${day} (${isWeekend ? 'weekend' : 'weekday'}). Weekday: ${weekdayBreakfasts.length}, Weekend: ${weekendBreakfasts.length}`);
      
      if (isWeekend && weekendBreakfasts.length === 0 && weekdayBreakfasts.length > 0) {
        // Weekend but no weekend options - use weekday as fallback
        const selectedBreakfast = selectUnusedMeal(weekdayBreakfasts, usedBreakfastMeals, allSelectedMealNames, false, fridgeIngredients, ingredientsToUseUp);
        usedBreakfastMeals.add(selectedBreakfast.name);
        allSelectedMealNames.add(selectedBreakfast.name);
        breakfastPool.push(selectedBreakfast);
      } else if (!isWeekend && weekdayBreakfasts.length === 0 && weekendBreakfasts.length > 0) {
        // Weekday but no weekday options - use weekend as fallback  
        const selectedBreakfast = selectUnusedMeal(weekendBreakfasts, usedBreakfastMeals, allSelectedMealNames, false, fridgeIngredients, ingredientsToUseUp);
        usedBreakfastMeals.add(selectedBreakfast.name);
        allSelectedMealNames.add(selectedBreakfast.name);
        breakfastPool.push(selectedBreakfast);
      } else {
        // General fallback
        const selectedBreakfast = selectUnusedMeal(breakfastOptions, usedBreakfastMeals, allSelectedMealNames, false, fridgeIngredients, ingredientsToUseUp);
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
        lunchMeal = selectUnusedMeal(mealOptions, usedLunchMeals, allSelectedMealNames, false, fridgeIngredients, ingredientsToUseUp);
        usedLunchMeals.add(lunchMeal.name);
        allSelectedMealNames.add(lunchMeal.name);
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
        let selectedDinnerMeal = selectUnusedMeal(mealOptions, usedDinnerMeals, allSelectedMealNames, false, fridgeIngredients, ingredientsToUseUp);
        usedDinnerMeals.add(selectedDinnerMeal.name);
        allSelectedMealNames.add(selectedDinnerMeal.name);
        
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
        let selectedDinnerMeal = selectUnusedMeal(mealOptions, usedDinnerMeals, allSelectedMealNames, false, fridgeIngredients, ingredientsToUseUp);
        usedDinnerMeals.add(selectedDinnerMeal.name);
        allSelectedMealNames.add(selectedDinnerMeal.name);
        
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
        let selectedDinnerMeal = selectUnusedMeal(mealOptions, usedDinnerMeals, allSelectedMealNames, false, fridgeIngredients, ingredientsToUseUp);
        usedDinnerMeals.add(selectedDinnerMeal.name);
        allSelectedMealNames.add(selectedDinnerMeal.name);
        
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
        wednesdayDinnerMeal = selectUnusedMeal(mealOptions, usedDinnerMeals, allSelectedMealNames, false, fridgeIngredients, ingredientsToUseUp);
        usedDinnerMeals.add(wednesdayDinnerMeal.name);
        allSelectedMealNames.add(wednesdayDinnerMeal.name);
        dinnerMeal = wednesdayDinnerMeal;
      } else if (day === 5) {
        // Day 5: Thursday dinner - fresh cooking (use unique meals)
        // Apply weekday time limit (Monday-Friday = days 2-6)
        const isWeekday = day >= 2 && day <= 6;
        const mealOptions = isWeekday ? weekdayDinnerOptions : dinnerOptions;
        thursdayDinnerMeal = selectUnusedMeal(mealOptions, usedDinnerMeals, allSelectedMealNames, false, fridgeIngredients, ingredientsToUseUp);
        usedDinnerMeals.add(thursdayDinnerMeal.name);
        allSelectedMealNames.add(thursdayDinnerMeal.name);
        dinnerMeal = thursdayDinnerMeal;
      } else if (day === 6) {
        // Day 6: Friday dinner - fresh cooking (3rd cooking day, use unique meals)
        // Apply weekday time limit (Monday-Friday = days 2-6)
        const isWeekday = day >= 2 && day <= 6;
        const mealOptions = isWeekday ? weekdayDinnerOptions : dinnerOptions;
        dinnerMeal = selectUnusedMeal(mealOptions, usedDinnerMeals, allSelectedMealNames, false, fridgeIngredients, ingredientsToUseUp);
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
        dinnerMeal = selectUnusedMeal(mealOptions, usedDinnerMeals, allSelectedMealNames, false, fridgeIngredients, ingredientsToUseUp);
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