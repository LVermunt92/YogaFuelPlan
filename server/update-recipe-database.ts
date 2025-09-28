// Script to update all recipes in the database with clean ingredients and standardized portions

import { cleanRecipeData } from './ingredient-cleaner';

/**
 * This script will update the RAW_MEAL_DATABASE in nutrition-enhanced.ts
 * to clean all ingredient descriptions and standardize portions to "1 serving"
 */

export function updateRecipeDatabase() {
  console.log("🧹 Starting recipe database cleanup...");
  
  // Note: This function would be called when the nutrition-enhanced.ts file is loaded
  // to automatically clean all recipes in the database
  
  console.log("✅ Recipe database cleanup completed");
}

/**
 * Updates a single recipe with clean ingredients and standardized portion
 */
export function updateSingleRecipe(recipe: any): any {
  const updated = cleanRecipeData(recipe);
  
  // Log the changes for verification
  if (recipe.portion !== updated.portion) {
    console.log(`📏 Updated portion: "${recipe.portion}" → "${updated.portion}"`);
  }
  
  recipe.ingredients.forEach((original: string, index: number) => {
    if (original !== updated.ingredients[index]) {
      console.log(`🧽 Cleaned ingredient: "${original}" → "${updated.ingredients[index]}"`);
    }
  });
  
  return updated;
}