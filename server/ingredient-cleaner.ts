// Utility functions to clean and standardize recipe ingredients and portions

/**
 * Converts lemon/lime juice ml measurements to pieces
 * Examples:
 * "30ml lemon juice" → "juice of 1 lemon"
 * "15ml lemon juice" → "juice of 1/2 lemon"
 * "45ml lime juice" → "juice of 1.5 limes"
 */
export function convertCitrusTopieces(ingredient: string): string {
  if (!ingredient) return ingredient;
  
  // Match patterns like "30ml lemon juice", "15ml lime juice", "15ml fresh lime juice"
  // Allow optional "fresh" between ml and lemon/lime
  const citrusPattern = /(\d+(?:\.\d+)?)\s*ml\s+(?:fresh\s+)?(lemon|lime)\s+juice/i;
  const match = ingredient.match(citrusPattern);
  
  if (match) {
    const mlAmount = parseFloat(match[1]);
    const citrusType = match[2].toLowerCase();
    
    // Approximate: 1 lemon/lime = 30ml juice
    const pieces = mlAmount / 30;
    
    if (pieces <= 0.5) {
      return `1/2 ${citrusType}`;
    } else if (pieces <= 1) {
      return `1 ${citrusType}`;
    } else if (pieces <= 1.5) {
      return `1.5 ${citrusType}s`;
    } else {
      return `${Math.round(pieces)} ${citrusType}s`;
    }
  }
  
  return ingredient;
}

/**
 * Converts avocado gram measurements to pieces
 * Examples:
 * "70g avocado" → "1/2 avocado"
 * "150g avocado" → "1 avocado"
 * "35g avocado" → "1/4 avocado"
 */
export function convertAvocadoToPieces(ingredient: string): string {
  if (!ingredient) return ingredient;
  
  // Match patterns like "70g avocado", "100g ripe avocado"
  const avocadoPattern = /(\d+(?:\.\d+)?)\s*g\s+(?:ripe\s+)?avocado/i;
  const match = ingredient.match(avocadoPattern);
  
  if (match) {
    const grams = parseFloat(match[1]);
    
    // 1 avocado ≈ 150g edible flesh
    if (grams <= 40) {
      return '1/4 avocado';
    } else if (grams <= 90) {
      return '1/2 avocado';
    } else if (grams <= 170) {
      return '1 avocado';
    } else if (grams <= 250) {
      return '1.5 avocados';
    } else {
      return `${Math.round(grams / 150)} avocados`;
    }
  }
  
  return ingredient;
}

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
 * Applies: citrus conversion, avocado conversion, parenthetical removal
 */
export function cleanIngredientList(ingredients: string[]): string[] {
  return ingredients.map(ingredient => {
    let cleaned = convertCitrusTopieces(ingredient);
    cleaned = convertAvocadoToPieces(cleaned);
    cleaned = cleanIngredientDescription(cleaned);
    return cleaned;
  });
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