// Utility functions to clean and standardize recipe ingredients and portions

/**
 * Removes parenthetical descriptions from ingredient strings
 * Examples:
 * "1 ripe nectarine (150g), sliced" → "1 ripe nectarine, sliced" 
 * "200g oat milk (unsweetened)" → "200g oat milk"
 * "Fresh mint leaves for garnish (optional)" → "Fresh mint leaves for garnish"
 */
export function cleanIngredientDescription(ingredient: string): string {
  if (!ingredient) return ingredient;
  
  // Remove all content within parentheses, including the parentheses themselves
  // This regex matches opening parenthesis, any content, and closing parenthesis
  const cleaned = ingredient.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  
  // Clean up any double spaces that might result from the replacement
  return cleaned.replace(/\s+/g, ' ');
}

/**
 * Cleans an entire array of ingredient strings
 */
export function cleanIngredientList(ingredients: string[]): string[] {
  return ingredients.map(ingredient => cleanIngredientDescription(ingredient));
}

/**
 * Normalizes portion descriptions to "1 serving" format
 * Examples:
 * "1 serving (300g)" → "1 serving"
 * "2 servings" → "1 serving" 
 * "1 large portion" → "1 serving"
 * "3 pancakes" → "1 serving"
 */
export function normalizePortionToOneServing(portion: string): string {
  if (!portion || portion.trim() === '') {
    return '1 serving';
  }
  
  // Always return "1 serving" regardless of input
  return '1 serving';
}

/**
 * Processes a complete recipe to clean ingredients and normalize portion
 */
export function cleanRecipeData(recipe: any): any {
  return {
    ...recipe,
    ingredients: cleanIngredientList(recipe.ingredients || []),
    portion: normalizePortionToOneServing(recipe.portion || ''),
  };
}

/**
 * Test function to validate cleaning works correctly
 */
export function testIngredientCleaning(): void {
  const testCases = [
    "1 ripe nectarine (150g), sliced",
    "200ml oat milk (unsweetened)", 
    "15ml coconut chips (toasted)",
    "Fresh mint leaves for garnish (optional)",
    "2.5ml fennel seeds (ground)",
    "40g steel-cut oats",
    "Hemp hearts (30g) for protein"
  ];
  
  console.log("Testing ingredient cleaning:");
  testCases.forEach(ingredient => {
    const cleaned = cleanIngredientDescription(ingredient);
    console.log(`"${ingredient}" → "${cleaned}"`);
  });
  
  const testPortions = [
    "1 serving (300g)",
    "2 servings", 
    "1 large portion",
    "3 pancakes",
    "1 bowl"
  ];
  
  console.log("\nTesting portion normalization:");
  testPortions.forEach(portion => {
    const normalized = normalizePortionToOneServing(portion);
    console.log(`"${portion}" → "${normalized}"`);
  });
}