import { processRecipeIngredients } from './unit-converter';

// Function to apply unit conversion to all recipes in the database
export function convertAllRecipeUnits(recipes: any[]): any[] {
  return recipes.map(recipe => {
    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
      recipe.ingredients = processRecipeIngredients(recipe.ingredients);
    }
    
    // Also convert instructions if they contain measurements
    if (recipe.recipe?.instructions && Array.isArray(recipe.recipe.instructions)) {
      recipe.recipe.instructions = recipe.recipe.instructions.map((instruction: string) => {
        // Convert common measurements in instructions
        let converted = instruction;
        
        // Convert cup measurements in instructions
        converted = converted.replace(/(\d+\/\d+|\d+(?:\.\d+)?)\s*cups?\s+([^,.\s]+(?:\s+[^,.\s]+)*)/gi, 
          (match, amount, ingredient) => {
            const numAmount = amount.includes('/') ? eval(amount) : parseFloat(amount);
            // Use appropriate conversion based on ingredient
            if (ingredient.match(/water|milk|oil|stock|broth|juice/i)) {
              return `${Math.round(numAmount * 240)}ml ${ingredient}`;
            } else if (ingredient.match(/oats|flour|rice|quinoa|nuts|berries/i)) {
              return `${Math.round(numAmount * 120)}g ${ingredient}`;
            } else {
              return `${Math.round(numAmount * 150)}g ${ingredient}`;
            }
          });
        
        // Convert tablespoons and teaspoons
        converted = converted.replace(/(\d+)\s*tbsp\.?\s+([^,.\s]+(?:\s+[^,.\s]+)*)/gi, 
          (match, amount, ingredient) => `${Math.round(parseInt(amount) * 15)}ml ${ingredient}`);
        
        converted = converted.replace(/(\d+(?:\.\d+)?)\s*tsp\.?\s+([^,.\s]+(?:\s+[^,.\s]+)*)/gi, 
          (match, amount, ingredient) => `${Math.round(parseFloat(amount) * 5)}ml ${ingredient}`);
        
        return converted;
      });
    }
    
    return recipe;
  });
}