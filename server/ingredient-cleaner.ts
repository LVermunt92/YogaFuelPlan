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
 * Normalizes pantry items to have specific amounts instead of vague descriptions
 * Examples:
 * "salt to taste" → "2g salt"
 * "pinch of pepper" → "0.5g black pepper"
 * "olive oil for drizzling" → "10ml olive oil"
 * "handful fresh parsley" → "20g fresh parsley"
 */
export function normalizePantryItems(ingredient: string): string {
  if (!ingredient) return ingredient;
  
  let normalized = ingredient;
  
  // Fix "to taste" patterns
  if (/salt\s*(and\s+pepper\s*)?to\s+taste/i.test(normalized)) {
    normalized = '2g salt';
  } else if (/pepper\s*to\s+taste/i.test(normalized) || /black pepper,?\s+to\s+taste/i.test(normalized)) {
    normalized = '1g black pepper';
  } else if (/stevia\s+to\s+taste/i.test(normalized)) {
    normalized = '1g stevia';
  } else if (/to\s+taste/i.test(normalized)) {
    // Generic "to taste" - remove it
    normalized = normalized.replace(/,?\s*to\s+taste/gi, '').trim();
  }
  
  // Fix "pinch of" patterns
  if (/pinch\s+(of\s+)?salt/i.test(normalized)) {
    normalized = '1g salt';
  } else if (/pinch\s+(of\s+)?sea\s+salt/i.test(normalized)) {
    normalized = '1g sea salt';
  } else if (/pinch\s+(of\s+)?(black\s+)?pepper/i.test(normalized)) {
    normalized = '0.5g black pepper';
  } else if (/pinch\s+(of\s+)?dried\s+(\w+)/i.test(normalized)) {
    normalized = normalized.replace(/pinch\s+(of\s+)?/i, '1g ');
  } else if (/pinch\s+(of\s+)?/i.test(normalized)) {
    normalized = normalized.replace(/pinch\s+(of\s+)?/i, '0.5g ');
  }
  
  // Fix "for drizzling/cooking" patterns
  if (/olive\s+oil\s+(for\s+)?(drizzling|cooking)/i.test(normalized)) {
    normalized = '10ml olive oil';
  } else if (/coconut\s+oil\s+for\s+cooking/i.test(normalized)) {
    normalized = '15ml coconut oil';
  } else if (/oil\s+for\s+cooking/i.test(normalized)) {
    normalized = '15ml sunflower oil';
  } else if (/drizzle\s+of\s+(toasted\s+)?sesame\s+oil/i.test(normalized)) {
    normalized = '5ml sesame oil';
  } else if (/extra\s+honey\s+for\s+drizzling/i.test(normalized)) {
    normalized = '10ml honey';
  } else if (/for\s+(drizzling|cooking)/i.test(normalized)) {
    normalized = normalized.replace(/\s+for\s+(drizzling|cooking)/gi, '').trim();
  }
  
  // Fix "handful" patterns
  if (/handful\s+(of\s+)?(fresh\s+)?parsley/i.test(normalized)) {
    normalized = '20g fresh parsley';
  } else if (/handful\s+(of\s+)?(fresh\s+)?cilantro/i.test(normalized)) {
    normalized = '20g fresh cilantro';
  } else if (/handful\s+(of\s+)?(fresh\s+)?basil/i.test(normalized)) {
    normalized = '20g fresh basil';
  } else if (/handful\s+(of\s+)?(fresh\s+)?mint/i.test(normalized)) {
    normalized = '20g fresh mint';
  } else if (/handfuls?\s+(of\s+)?kale/i.test(normalized)) {
    normalized = '60g kale';
  } else if (/handfuls?\s+(of\s+)?(fresh\s+)?spinach/i.test(normalized)) {
    normalized = '30g spinach';
  } else if (/handful\s+(of\s+)?/i.test(normalized)) {
    normalized = normalized.replace(/(\d+\s+)?(large\s+)?handfuls?\s+(of\s+)?/i, '20g ');
  }
  
  // Fix bare "Salt" or "Pepper" without amounts (exact matches)
  if (/^salt$/i.test(normalized) || /^sea salt$/i.test(normalized)) {
    normalized = '2g salt';
  } else if (/^pepper$/i.test(normalized) || /^black pepper$/i.test(normalized)) {
    normalized = '1g black pepper';
  } else if (/^salt and pepper$/i.test(normalized) || /^salt and black pepper$/i.test(normalized)) {
    normalized = '2g salt, 1g black pepper';
  }
  
  return normalized.trim();
}

/**
 * Cleans an entire array of ingredient strings
 * Applies: citrus conversion, avocado conversion, pantry normalization, parenthetical removal
 */
export function cleanIngredientList(ingredients: string[]): string[] {
  return ingredients.map(ingredient => {
    let cleaned = convertCitrusTopieces(ingredient);
    cleaned = convertAvocadoToPieces(cleaned);
    cleaned = normalizePantryItems(cleaned);
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