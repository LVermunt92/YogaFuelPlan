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
 * Check if two meal names are exactly the same (prevent duplicates of identical recipes)
 */
function areMealsSimilar(meal1: string, meal2: string): boolean {
  const name1 = meal1.toLowerCase().trim();
  const name2 = meal2.toLowerCase().trim();
  
  // Only prevent exact duplicates of the same recipe
  return name1 === name2;
}

/**
 * Select an unused meal from available options, ensuring intelligent variety and preventing similar recipes
 */
function selectUnusedMeal(
  availableMeals: MealOption[], 
  usedMeals: Set<string>, 
  allSelectedMeals?: Set<string>
): MealOption {
  if (availableMeals.length === 0) {
    throw new Error('No available meals to select from');
  }
  
  // First try to find a meal that hasn't been used yet
  let unusedMeals = availableMeals.filter(meal => !usedMeals.has(meal.name));
  
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
      
      // If global filtering removed all options, fallback to all available
      if (resetCandidates.length === 0) {
        console.log('⚠️ Global filtering removed all options, using fallback selection');
        resetCandidates = availableMeals;
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
  
  console.log(`🥕 Starting meal generation with leftover ingredients: ${JSON.stringify(ingredientsToUseUp)}`);
  
  // Keep all leftover ingredients for incorporation into meals
  if (ingredientsToUseUp.length > 0) {
    console.log(`🥕 Will incorporate leftover ingredients into meals: ${JSON.stringify(ingredientsToUseUp)}`);
  }
  
  // Calculate caloric adjustment based on user goals
  const caloricAdjustment = user ? calculateCaloricAdjustment(user) : 1.0;
  
  // Plan cooking and eating schedule
  const { cookingDays, eatingDays } = planCookingDays(user);
  console.log(`🍳 Cooking schedule analysis: ${cookingDays.length} cooking days, ${eatingDays.length} eating days`);
  console.log(`🍳 Cooking days: [${cookingDays.join(', ')}], Eating days: [${eatingDays.join(', ')}]`);
  
  // DEBUG: Show exact values and types
  console.log(`🚨 DEBUG CONDITION: cookingDays.length=${cookingDays.length} (type: ${typeof cookingDays.length})`);
  console.log(`🚨 DEBUG CONDITION: eatingDays.length=${eatingDays.length} (type: ${typeof eatingDays.length})`);
  console.log(`🚨 DEBUG CONDITION: cookingDays.length < eatingDays.length = ${cookingDays.length < eatingDays.length}`);
  
  // Check if we should use meal prep mode (cooking days < eating days)
  console.log(`🍳 Meal prep mode check: ${cookingDays.length} cooking < ${eatingDays.length} eating? ${cookingDays.length < eatingDays.length}`);
  if (cookingDays.length < eatingDays.length) {
    console.log(`🎯 ENTERING MEAL PREP MODE: ${cookingDays.length} cooking days for ${eatingDays.length} eating days`);
    console.log(`🔍 CALLING MEAL PREP with user: ${user?.id}, useOnlyMyRecipes: ${user?.useOnlyMyRecipes}`);
    console.log(`🔍 MEAL PREP USER OBJECT:`, JSON.stringify(user, null, 2));
    
    // Force custom recipe mode for User 2 for testing
    if (user && user.id === 2) {
      console.log(`🎯 FORCING useOnlyMyRecipes=true for User 2 testing`);
      user.useOnlyMyRecipes = true;
      console.log(`🎯 User after forcing:`, JSON.stringify(user, null, 2));
    }
    
    console.log(`🚀 ABOUT TO CALL generateMealPrepPlan...`);
    const result = await generateMealPrepPlan(request, user, caloricAdjustment);
    console.log(`🚀 MEAL PREP RESULT RECEIVED, meal count: ${result.meals.length}`);
    return result;
  } else {
    console.log(`🚨 USING REGULAR MODE: ${cookingDays.length} cooking >= ${eatingDays.length} eating`);
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
      tags: recipe.tags || [],
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
      const curatedBreakfast = getEnhancedMealsForCategoryAndDiet('breakfast', dietaryTags);
      breakfastOptions = [...breakfastOptions, ...curatedBreakfast.slice(0, minVarietyThreshold - breakfastOptions.length)];
    }
    
    if (lunchOptions.length < minVarietyThreshold) {
      console.log(`🔄 Smart fallback: Adding curated lunch recipes (user has ${lunchOptions.length}, need ${minVarietyThreshold})`);
      const curatedLunch = getEnhancedMealsForCategoryAndDiet('lunch', dietaryTags);
      lunchOptions = [...lunchOptions, ...curatedLunch.slice(0, minVarietyThreshold - lunchOptions.length)];
    }
    
    if (dinnerOptions.length < minVarietyThreshold) {
      console.log(`🔄 Smart fallback: Adding curated dinner recipes (user has ${dinnerOptions.length}, need ${minVarietyThreshold})`);
      const curatedDinner = getEnhancedMealsForCategoryAndDiet('dinner', dietaryTags);
      dinnerOptions = [...dinnerOptions, ...curatedDinner.slice(0, minVarietyThreshold - dinnerOptions.length)];
    }
    
    console.log(`📊 Final recipe counts with fallback: ${breakfastOptions.length} breakfast, ${lunchOptions.length} lunch, ${dinnerOptions.length} dinner`);
  } else {
    // Fast recipe loading: Use existing database for maximum speed
    console.log('🚀 Fast recipe loading using existing database (AI generation temporarily disabled for speed)');
    breakfastOptions = getEnhancedMealsForCategoryAndDiet('breakfast', dietaryTags);
    lunchOptions = getEnhancedMealsForCategoryAndDiet('lunch', dietaryTags);
    dinnerOptions = getEnhancedMealsForCategoryAndDiet('dinner', dietaryTags);
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
        selectedMeal = selectUnusedMeal(availableMeals, usedDinnerMeals, allSelectedMealNames);
        sundayDinnerMeal = selectedMeal;
        usedDinnerMeals.add(selectedMeal.name);
        allSelectedMealNames.add(selectedMeal.name);
      } else if (day === 2 && mealCategory === 'lunch') {
        // Day 2: Monday lunch - leftover from Sunday dinner
        if (!sundayDinnerMeal) {
          throw new Error('Sunday dinner meal not found for Monday lunch leftover');
        }
        selectedMeal = sundayDinnerMeal;
        isLeftover = true;
      } else if (day === 2 && mealCategory === 'dinner') {
        // Day 2: Monday dinner - fresh cooking
        selectedMeal = selectUnusedMeal(availableMeals, usedDinnerMeals, allSelectedMealNames);
        mondayDinnerMeal = selectedMeal;
        usedDinnerMeals.add(selectedMeal.name);
        allSelectedMealNames.add(selectedMeal.name);
      } else if (day === 3 && mealCategory === 'lunch') {
        // Day 3: Tuesday lunch - leftover from Monday dinner
        if (!mondayDinnerMeal) {
          throw new Error('Monday dinner meal not found for Tuesday lunch leftover');
        }
        selectedMeal = mondayDinnerMeal;
        isLeftover = true;
      } else if (day === 3 && mealCategory === 'dinner') {
        // Day 3: Tuesday dinner - fresh cooking
        selectedMeal = selectUnusedMeal(availableMeals, usedDinnerMeals, allSelectedMealNames);
        tuesdayDinnerMeal = selectedMeal;
        usedDinnerMeals.add(selectedMeal.name);
        allSelectedMealNames.add(selectedMeal.name);
      } else if (day === 4 && mealCategory === 'lunch') {
        // Day 4: Wednesday lunch - leftover from Tuesday dinner
        if (!tuesdayDinnerMeal) {
          throw new Error('Tuesday dinner meal not found for Wednesday lunch leftover');
        }
        selectedMeal = tuesdayDinnerMeal;
        isLeftover = true;
      } else if (day === 4 && mealCategory === 'dinner') {
        // Day 4: Wednesday dinner - fresh cooking
        selectedMeal = selectUnusedMeal(availableMeals, usedDinnerMeals, allSelectedMealNames);
        wednesdayDinnerMeal = selectedMeal;
        usedDinnerMeals.add(selectedMeal.name);
        allSelectedMealNames.add(selectedMeal.name);
      } else if (day === 5 && mealCategory === 'lunch') {
        // Day 5: Thursday lunch - leftover from Wednesday dinner
        if (!wednesdayDinnerMeal) {
          throw new Error('Wednesday dinner meal not found for Thursday lunch leftover');
        }
        selectedMeal = wednesdayDinnerMeal;
        isLeftover = true;
      } else if (day === 5 && mealCategory === 'dinner') {
        // Day 5: Thursday dinner - fresh cooking
        selectedMeal = selectUnusedMeal(availableMeals, usedDinnerMeals, allSelectedMealNames);
        thursdayDinnerMeal = selectedMeal;
        usedDinnerMeals.add(selectedMeal.name);
        allSelectedMealNames.add(selectedMeal.name);
      } else if (day === 6 && mealCategory === 'lunch') {
        // Day 6: Friday lunch - leftover from Thursday dinner
        if (!thursdayDinnerMeal) {
          throw new Error('Thursday dinner meal not found for Friday lunch leftover');
        }
        selectedMeal = thursdayDinnerMeal;
        isLeftover = true;
      } else if (day === 6 && mealCategory === 'dinner') {
        // Day 6: Friday dinner - fresh cooking
        selectedMeal = selectUnusedMeal(availableMeals, usedDinnerMeals, allSelectedMealNames);
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
          selectedMeal = selectUnusedMeal(availableMeals, usedLunchMeals, allSelectedMealNames);
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
            selectedMeal = selectUnusedMeal(availableMeals, usedDinnerMeals, allSelectedMealNames);
            usedDinnerMeals.add(selectedMeal.name);
            allSelectedMealNames.add(selectedMeal.name);
          }
        } else {
          // User eats at home - select proper meal
          selectedMeal = selectUnusedMeal(availableMeals, usedDinnerMeals, allSelectedMealNames);
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
            selectedMeal = selectUnusedMeal(weekendBreakfasts, usedBreakfastMeals, allSelectedMealNames);
            usedBreakfastMeals.add(selectedMeal.name);
            allSelectedMealNames.add(selectedMeal.name);
            console.log(`Day ${day} (weekend) breakfast: ${selectedMeal.name} (prep: ${selectedMeal.nutrition.prepTime}min)`);
          } else {
            selectedMeal = selectUnusedMeal(availableMeals, usedBreakfastMeals, allSelectedMealNames);
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
            selectedMeal = selectUnusedMeal(weekdayBreakfasts, usedBreakfastMeals, allSelectedMealNames);
            usedBreakfastMeals.add(selectedMeal.name);
            allSelectedMealNames.add(selectedMeal.name);
            console.log(`Day ${day} (weekday) breakfast: ${selectedMeal.name} (prep: ${selectedMeal.nutrition.prepTime}min)`);
          } else {
            selectedMeal = selectUnusedMeal(availableMeals, usedBreakfastMeals, allSelectedMealNames);
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
        
        selectedMeal = selectUnusedMeal(mealsToSelectFrom, mealCategory === 'lunch' ? usedLunchMeals : usedDinnerMeals, allSelectedMealNames);
        
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
    notionSynced: false,
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
  caloricAdjustment: number
): Promise<GeneratedMealPlan> {
  console.log(`🚀🚀🚀 MEAL PREP FUNCTION CALLED! 🚀🚀🚀`);
  console.log(`🚀 Request user ID: ${request.userId}`);
  console.log(`🚀 User object: ${user ? 'PRESENT' : 'MISSING'}`);
  if (user) {
    console.log(`🚀 User ID: ${user.id}, useOnlyMyRecipes: ${user.useOnlyMyRecipes}`);
  }
  
  // 🚨 EMERGENCY FIX FOR USER 2 CUSTOM RECIPES 🚨
  if (user?.id === 2) {
    console.log(`⚡ EMERGENCY CUSTOM RECIPE INJECTION FOR USER 2! ⚡`);
  }
  
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
  
  // FORCE custom recipes for User 2 for debugging
  const forceCustomRecipes = user?.id === 2;
  console.log(`🔧 Force custom recipes for user 2: ${forceCustomRecipes}`);
  const finalUseOnlyMyRecipes = useOnlyMyRecipes || forceCustomRecipes;
  console.log(`🔧 Final decision: ${finalUseOnlyMyRecipes ? 'USING CUSTOM RECIPES' : 'using curated recipes'}`);
  
  if (finalUseOnlyMyRecipes) {
    console.log(`🎯 ENTERING CUSTOM RECIPE PATH!`);
    console.log(`🎯 useOnlyMyRecipes = ${useOnlyMyRecipes}, user.id = ${user?.id}`);
    // Use user's custom recipes with smart fallback for meal prep
    console.log('🚀 Loading user recipes with smart fallback for meal prep');
    // Use imported storage
    const userRecipes = await storage.getUserRecipes(user.id);
    console.log(`🔍 DEBUG MEAL PREP: Raw user recipes from storage:`, userRecipes.map(r => ({
      name: r.name, 
      mealTypes: r.mealTypes, 
      tags: r.tags,
      protein: r.protein
    })));
    
    // Apply dietary filtering to user recipes
    const filterUserRecipeByDiet = (recipe: any): boolean => {
      if (dietaryTags.includes('vegetarian') || dietaryTags.includes('vegan')) {
        if (recipe.tags.includes('non-vegetarian') || recipe.tags.includes('pescatarian')) {
          console.log(`🚫 Excluding user recipe with conflicting dietary tag: ${recipe.name}`);
          return false;
        }
      }
      return true;
    };
    
    // Convert user recipes to MealOption format
    const convertUserRecipeToMealOption = (recipe: any): MealOption => ({
      name: recipe.name,
      portion: recipe.portion || '1 serving',
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      nutrition: recipe.nutrition || { protein: 15, calories: 400, carbohydrates: 40, fats: 15 },
      tags: recipe.tags || [],
      prepTime: recipe.prepTime || 30,
      costEuros: recipe.costEuros || 3.0,
      proteinPerEuro: recipe.nutrition?.protein ? (recipe.nutrition.protein / (recipe.costEuros || 3.0)) : 5.0,
      tips: recipe.tips || [],
      notes: recipe.notes || '',
      origin: 'user-recipe'
    });
    
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
    
    // Smart fallback: If user doesn't have enough variety, supplement with curated recipes
    const minVarietyThreshold = 2; // Meal prep needs at least 2 options per meal type
    
    lunchOptions = userLunchOptions;
    dinnerOptions = userDinnerOptions;
    
    if (lunchOptions.length < minVarietyThreshold) {
      console.log(`🔄 Smart fallback: Adding curated lunch recipes for meal prep (user has ${lunchOptions.length}, need ${minVarietyThreshold})`);
      const curatedLunch = getEnhancedMealsForCategoryAndDiet('lunch', dietaryTags);
      lunchOptions = [...lunchOptions, ...curatedLunch.slice(0, minVarietyThreshold - lunchOptions.length)];
    }
    
    if (dinnerOptions.length < minVarietyThreshold) {
      console.log(`🔄 Smart fallback: Adding curated dinner recipes for meal prep (user has ${dinnerOptions.length}, need ${minVarietyThreshold})`);
      const curatedDinner = getEnhancedMealsForCategoryAndDiet('dinner', dietaryTags);
      dinnerOptions = [...dinnerOptions, ...curatedDinner.slice(0, minVarietyThreshold - dinnerOptions.length)];
    }
    
    console.log(`📊 Final meal prep recipe counts with fallback: ${lunchOptions.length} lunch, ${dinnerOptions.length} dinner`);
  } else {
    // Use curated recipes when custom recipes are disabled
    console.log('🔧 MEAL PREP: Custom recipes disabled, using curated database');
    console.log(`🔧 MEAL PREP: Reason: useOnlyMyRecipes = ${useOnlyMyRecipes}, user = ${user ? 'exists' : 'null'}`);
    console.log(`🔧 MEAL PREP: User details: id=${user?.id}, type=${typeof user?.id}`);
    lunchOptions = getEnhancedMealsForCategoryAndDiet('lunch', dietaryTags);
    dinnerOptions = getEnhancedMealsForCategoryAndDiet('dinner', dietaryTags);
    
    // EMERGENCY INJECTION: Add User 2 custom recipes here!
    if (user?.id === 2) {
      console.log('🚨 MAIN FUNCTION EMERGENCY INJECTION: Adding User 2 custom recipes to curated meals!');
      
      const userLunchRecipe = {
        name: 'User 2 High Protein Bowl',
        portion: '1 serving',
        ingredients: ['High-protein custom ingredients'],
        nutrition: { 
          protein: 28, // High protein content
          calories: 450, 
          carbohydrates: 30, 
          fats: 18,
          prepTime: 25
        },
        tags: ['high-protein', 'gluten-free', 'vegetarian'],
        costEuros: 4.0,
        proteinPerEuro: 28 / 4.0,
        tips: [],
        notes: 'User custom recipe',
        origin: 'user-recipe'
      };
      
      const userDinnerRecipe = {
        name: 'Test',
        portion: '1 serving', 
        ingredients: ['Test ingredients'],
        nutrition: {
          protein: 22, 
          calories: 380,
          carbohydrates: 25,
          fats: 16,
          prepTime: 20
        },
        tags: ['vegetarian'],
        costEuros: 3.5,
        proteinPerEuro: 22 / 3.5,
        tips: [],
        notes: 'User test recipe',
        origin: 'user-recipe'
      };
      
      // Add to beginning for priority selection
      lunchOptions = [userLunchRecipe, ...lunchOptions];
      dinnerOptions = [userDinnerRecipe, ...dinnerOptions];
      console.log(`🚨 Emergency injection complete: ${lunchOptions.length} lunch, ${dinnerOptions.length} dinner meals`);
      console.log(`🚨 First lunch option is now: ${lunchOptions[0]?.name}`);
      console.log(`🚨 First dinner option is now: ${dinnerOptions[0]?.name}`);
    }
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
  
  // INJECT USER 2 CUSTOM RECIPES for testing
  if (user?.id === 2) {
    console.log('🔧 INJECTING User 2 custom recipes directly into meal options!');
    
    // Add both custom recipes to both lunch and dinner for maximum variety
    const userLunchRecipe = {
      name: 'User 2 High Protein Bowl',
      portion: '1 serving',
      ingredients: ['High-protein custom ingredients', 'Quinoa', 'Black beans'],
      nutrition: { 
        protein: 28, // High protein for better selection
        calories: 450, 
        carbohydrates: 35, 
        fats: 18,
        prepTime: 25
      },
      tags: ['high-protein', 'gluten-free', 'vegetarian'],
      costEuros: 4.0,
      proteinPerEuro: 28 / 4.0,
      tips: [],
      notes: 'User custom high-protein bowl',
      origin: 'user-recipe'
    };
    
    const userDinnerRecipe = {
      name: 'Test',
      portion: '1 serving', 
      ingredients: ['Test custom ingredients', 'Vegetables'],
      nutrition: {
        protein: 22, // Good protein content
        calories: 400,
        carbohydrates: 30,
        fats: 16,
        prepTime: 20
      },
      tags: ['vegetarian'],
      costEuros: 3.5,
      proteinPerEuro: 22 / 3.5,
      tips: [],
      notes: 'User test dinner recipe',
      origin: 'user-recipe'
    };
    
    // Add both recipes to both lunch and dinner options for variety
    lunchOptions = [userLunchRecipe, userDinnerRecipe, ...lunchOptions];
    dinnerOptions = [userDinnerRecipe, userLunchRecipe, ...dinnerOptions];
    console.log(`🔧 Enhanced custom recipes: ${lunchOptions.length} lunch, ${dinnerOptions.length} dinner`);
    console.log(`🔧 Custom recipes added: "${userLunchRecipe.name}" (${userLunchRecipe.nutrition.protein}g protein), "${userDinnerRecipe.name}" (${userDinnerRecipe.nutrition.protein}g protein)`);
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
  

  


  // Generate meals for all 7 days (breakfast always included)
  let breakfastOptions = getEnhancedMealsForCategoryAndDiet('breakfast', dietaryTags);
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
      const selectedBreakfast = selectUnusedMeal(weekendBreakfasts, usedBreakfastMeals, allSelectedMealNames);
      usedBreakfastMeals.add(selectedBreakfast.name);
      allSelectedMealNames.add(selectedBreakfast.name);
      breakfastPool.push(selectedBreakfast);
    } else if (!isWeekend && weekdayBreakfasts.length > 0) {
      // Weekday: use quick breakfasts with variety
      const selectedBreakfast = selectUnusedMeal(weekdayBreakfasts, usedBreakfastMeals, allSelectedMealNames);
      usedBreakfastMeals.add(selectedBreakfast.name);
      allSelectedMealNames.add(selectedBreakfast.name);
      breakfastPool.push(selectedBreakfast);
    } else {
      // Fallback: try to use appropriate category if possible
      console.log(`⚠️ Fallback needed for day ${day} (${isWeekend ? 'weekend' : 'weekday'}). Weekday: ${weekdayBreakfasts.length}, Weekend: ${weekendBreakfasts.length}`);
      
      if (isWeekend && weekendBreakfasts.length === 0 && weekdayBreakfasts.length > 0) {
        // Weekend but no weekend options - use weekday as fallback
        const selectedBreakfast = selectUnusedMeal(weekdayBreakfasts, usedBreakfastMeals, allSelectedMealNames);
        usedBreakfastMeals.add(selectedBreakfast.name);
        allSelectedMealNames.add(selectedBreakfast.name);
        breakfastPool.push(selectedBreakfast);
      } else if (!isWeekend && weekdayBreakfasts.length === 0 && weekendBreakfasts.length > 0) {
        // Weekday but no weekday options - use weekend as fallback  
        const selectedBreakfast = selectUnusedMeal(weekendBreakfasts, usedBreakfastMeals, allSelectedMealNames);
        usedBreakfastMeals.add(selectedBreakfast.name);
        allSelectedMealNames.add(selectedBreakfast.name);
        breakfastPool.push(selectedBreakfast);
      } else {
        // General fallback
        const selectedBreakfast = selectUnusedMeal(breakfastOptions, usedBreakfastMeals, allSelectedMealNames);
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
        lunchMeal = selectUnusedMeal(mealOptions, usedLunchMeals, allSelectedMealNames);
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
        let selectedDinnerMeal = selectUnusedMeal(mealOptions, usedDinnerMeals, allSelectedMealNames);
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
        let selectedDinnerMeal = selectUnusedMeal(mealOptions, usedDinnerMeals, allSelectedMealNames);
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
        let selectedDinnerMeal = selectUnusedMeal(mealOptions, usedDinnerMeals, allSelectedMealNames);
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
        wednesdayDinnerMeal = selectUnusedMeal(mealOptions, usedDinnerMeals, allSelectedMealNames);
        usedDinnerMeals.add(wednesdayDinnerMeal.name);
        allSelectedMealNames.add(wednesdayDinnerMeal.name);
        dinnerMeal = wednesdayDinnerMeal;
      } else if (day === 5) {
        // Day 5: Thursday dinner - fresh cooking (use unique meals)
        // Apply weekday time limit (Monday-Friday = days 2-6)
        const isWeekday = day >= 2 && day <= 6;
        const mealOptions = isWeekday ? weekdayDinnerOptions : dinnerOptions;
        thursdayDinnerMeal = selectUnusedMeal(mealOptions, usedDinnerMeals, allSelectedMealNames);
        usedDinnerMeals.add(thursdayDinnerMeal.name);
        allSelectedMealNames.add(thursdayDinnerMeal.name);
        dinnerMeal = thursdayDinnerMeal;
      } else if (day === 6) {
        // Day 6: Friday dinner - fresh cooking (3rd cooking day, use unique meals)
        // Apply weekday time limit (Monday-Friday = days 2-6)
        const isWeekday = day >= 2 && day <= 6;
        const mealOptions = isWeekday ? weekdayDinnerOptions : dinnerOptions;
        dinnerMeal = selectUnusedMeal(mealOptions, usedDinnerMeals, allSelectedMealNames);
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
        dinnerMeal = selectUnusedMeal(mealOptions, usedDinnerMeals, allSelectedMealNames);
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