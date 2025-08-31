/**
 * Intelligent Ingredient Matcher
 * Finds recipes that naturally contain ingredients the user wants to use up
 */

import { MealOption, ENHANCED_MEAL_DATABASE } from './nutrition-enhanced';
import { generateRecipeWithAI } from './ai-recipe-generator';

interface IngredientMatch {
  recipe: MealOption;
  matchedIngredients: string[];
  matchScore: number;
}

/**
 * Find recipes that naturally contain the ingredients user wants to use up
 */
export function findRecipesWithIngredients(
  ingredientsToUse: string[],
  category: 'breakfast' | 'lunch' | 'dinner',
  dietaryTags: string[] = []
): IngredientMatch[] {
  if (!ingredientsToUse || ingredientsToUse.length === 0) {
    return [];
  }

  console.log(`🔍 INTELLIGENT MATCHING: Looking for ${category} recipes containing: ${ingredientsToUse.join(', ')}`);

  // Filter recipes by category and dietary requirements
  const categoryRecipes = ENHANCED_MEAL_DATABASE.filter(recipe => 
    recipe.category === category && 
    (dietaryTags.length === 0 || dietaryTags.every(tag => recipe.tags.includes(tag)))
  );

  const matches: IngredientMatch[] = [];

  for (const recipe of categoryRecipes) {
    const matchedIngredients: string[] = [];
    let matchScore = 0;

    // Check each ingredient the user wants to use up
    for (const userIngredient of ingredientsToUse) {
      const normalizedUserIngredient = normalizeIngredient(userIngredient);
      
      // Check if this ingredient appears in the recipe
      for (const recipeIngredient of recipe.ingredients) {
        const normalizedRecipeIngredient = normalizeIngredient(recipeIngredient);
        
        if (ingredientsMatch(normalizedUserIngredient, normalizedRecipeIngredient)) {
          matchedIngredients.push(userIngredient);
          matchScore += calculateMatchScore(normalizedUserIngredient, normalizedRecipeIngredient);
          break; // Don't double-count the same user ingredient
        }
      }
    }

    // Only include recipes that match at least one ingredient
    if (matchedIngredients.length > 0) {
      matches.push({
        recipe,
        matchedIngredients,
        matchScore
      });
    }
  }

  // Sort by match score (higher is better)
  matches.sort((a, b) => b.matchScore - a.matchScore);

  console.log(`✅ FOUND MATCHES: ${matches.length} recipes found with ingredients to use up`);
  matches.slice(0, 3).forEach(match => {
    console.log(`   📋 "${match.recipe.name}" matches: [${match.matchedIngredients.join(', ')}] (score: ${match.matchScore})`);
  });

  return matches;
}

/**
 * Generate AI recipe when no existing recipes match the ingredients
 */
export async function generateRecipeForIngredients(
  ingredientsToUse: string[],
  category: 'breakfast' | 'lunch' | 'dinner',
  dietaryTags: string[] = [],
  targetProtein: number = 25
): Promise<MealOption | null> {
  try {
    console.log(`🤖 AI GENERATION: Creating ${category} recipe to use up: ${ingredientsToUse.join(', ')}`);

    // Create specific prompt to incorporate the ingredients
    const ingredientPrompt = `Create a delicious ${category} recipe that specifically incorporates these ingredients that need to be used up: ${ingredientsToUse.join(', ')}. The recipe should make good use of these ingredients as key components, not just minor additions.`;

    const aiRecipe = await generateRecipeWithAI({
      category: category,
      targetProtein,
      dietaryTags,
      excludeIngredients: [],
      prepTimeLimit: category === 'breakfast' ? 15 : 45,
      season: getCurrentSeason()
    });

    if (aiRecipe) {
      console.log(`✅ AI RECIPE CREATED: "${aiRecipe.name}" incorporating ingredients to use up`);
    }

    return aiRecipe;
  } catch (error) {
    console.error('Error generating AI recipe for ingredients:', error);
    return null;
  }
}

/**
 * Get intelligent recipe recommendation that uses a subset of specified ingredients
 * This promotes better distribution across multiple recipes
 */
export async function getIntelligentRecipeRecommendation(
  ingredientsToUse: string[],
  category: 'breakfast' | 'lunch' | 'dinner',
  dietaryTags: string[] = [],
  targetProtein: number = 25,
  preferFewerIngredients: boolean = true
): Promise<{ recipe: MealOption; usedIngredients: string[] } | null> {
  if (!ingredientsToUse || ingredientsToUse.length === 0) {
    return null;
  }

  // Find existing recipes that match some of the ingredients
  const matches = findRecipesWithIngredients(ingredientsToUse, category, dietaryTags);
  
  if (matches.length > 0) {
    // If we want better distribution, prefer recipes that use fewer ingredients
    // This allows other recipes to use the remaining ingredients
    let selectedMatch;
    
    if (preferFewerIngredients && matches.length > 1) {
      // Sort by number of matched ingredients (ascending) then by score (descending)
      matches.sort((a, b) => {
        const ingredientDiff = a.matchedIngredients.length - b.matchedIngredients.length;
        if (ingredientDiff !== 0) return ingredientDiff;
        return b.matchScore - a.matchScore;
      });
      selectedMatch = matches[0];
      console.log(`🎯 SMART DISTRIBUTION: Selected recipe with ${selectedMatch.matchedIngredients.length} ingredients for better distribution`);
    } else {
      selectedMatch = matches[0]; // Best match by score
    }
    
    console.log(`✅ RECIPE SELECTED: "${selectedMatch.recipe.name}" uses: [${selectedMatch.matchedIngredients.join(', ')}]`);
    
    return {
      recipe: selectedMatch.recipe,
      usedIngredients: selectedMatch.matchedIngredients
    };
  }

  // No existing recipes found, try to generate one with AI (but only for a subset of ingredients)
  if (ingredientsToUse.length > 0) {
    console.log(`🤖 FALLBACK: No existing recipes found, generating AI recipe`);
    
    try {
      // Limit to 2-3 ingredients for better distribution
      const ingredientsForAI = ingredientsToUse.slice(0, Math.min(3, ingredientsToUse.length));
      
      const aiRecipe = await generateRecipeForIngredients(
        ingredientsForAI,
        category,
        dietaryTags,
        targetProtein
      );
      
      if (aiRecipe) {
        return {
          recipe: aiRecipe,
          usedIngredients: ingredientsForAI
        };
      }
    } catch (error) {
      console.warn('Failed to generate AI recipe for ingredients:', error);
    }
  }

  return null;
}

/**
 * Normalize ingredient names for better matching
 */
function normalizeIngredient(ingredient: string): string {
  return ingredient
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\b(fresh|dried|frozen|chopped|diced|sliced|minced|grated|cooked|raw)\b/g, '') // Remove preparation methods
    .replace(/\b\d+g?\b/g, '') // Remove quantities
    .replace(/\b(ml|cups?|tbsp|tsp|tablespoons?|teaspoons?)\b/g, '') // Remove units
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Check if two normalized ingredients match
 */
function ingredientsMatch(ingredient1: string, ingredient2: string): boolean {
  // Direct match
  if (ingredient1 === ingredient2) return true;
  
  // Check if one contains the other (for partial matches)
  if (ingredient1.includes(ingredient2) || ingredient2.includes(ingredient1)) {
    return true;
  }
  
  // Check for common ingredient variations
  const variations: { [key: string]: string[] } = {
    'spinach': ['baby spinach', 'fresh spinach', 'spinach leaves'],
    'mushrooms': ['mushroom', 'button mushrooms', 'cremini mushrooms', 'shiitake mushrooms'],
    'tomatoes': ['tomato', 'cherry tomatoes', 'roma tomatoes', 'fresh tomatoes'],
    'bell peppers': ['bell pepper', 'red bell pepper', 'green bell pepper', 'yellow bell pepper'],
    'onions': ['onion', 'red onion', 'white onion', 'yellow onion', 'sweet onion'],
    'carrots': ['carrot', 'baby carrots'],
    'broccoli': ['broccoli florets', 'fresh broccoli'],
    'cauliflower': ['cauliflower florets', 'fresh cauliflower', 'cauliflower rice'],
    'tofu': ['firm tofu', 'extra firm tofu', 'silken tofu', 'tofu cubes', 'cubed tofu'],
    'rice': ['brown rice', 'white rice', 'jasmine rice', 'basmati rice', 'cauliflower rice', 'cooked rice'],
    'herbs': ['fresh herbs', 'parsley', 'cilantro', 'basil', 'thyme', 'rosemary']
  };

  // Check variations
  for (const [base, variants] of Object.entries(variations)) {
    if ((ingredient1.includes(base) || variants.some(v => ingredient1.includes(v))) &&
        (ingredient2.includes(base) || variants.some(v => ingredient2.includes(v)))) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate match score based on how well ingredients align
 */
function calculateMatchScore(userIngredient: string, recipeIngredient: string): number {
  // Exact match gets highest score
  if (userIngredient === recipeIngredient) return 100;
  
  // Partial matches get lower scores based on overlap
  const userWords = userIngredient.split(' ');
  const recipeWords = recipeIngredient.split(' ');
  
  const commonWords = userWords.filter(word => 
    recipeWords.some(recipeWord => 
      word.length > 2 && recipeWord.includes(word)
    )
  );
  
  // Score based on percentage of matching words
  return Math.round((commonWords.length / Math.max(userWords.length, recipeWords.length)) * 80);
}

/**
 * Get current season for AI recipe generation context
 */
function getCurrentSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}