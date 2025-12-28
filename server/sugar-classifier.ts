/**
 * Sugar Classification System (WHO Guidelines)
 * 
 * Three categories:
 * 1. ADDED SUGAR: Sugars added during cooking/processing (sugar, honey, syrups)
 * 2. FREE SUGAR: Added sugars + sugars from fruit juices, smoothies, dried fruits (not bound in cell walls)
 * 3. INTRINSIC SUGAR: Sugars naturally bound in whole fruits, vegetables, and dairy
 */

// Ingredients that contribute ADDED sugars (sweeteners added during processing)
const ADDED_SUGAR_INGREDIENTS = [
  // Pure sugars
  'sugar', 'caster sugar', 'brown sugar', 'coconut sugar', 'raw sugar', 'demerara sugar',
  'icing sugar', 'powdered sugar', 'muscovado sugar', 'palm sugar', 'suiker',
  // Syrups
  'maple syrup', 'honey', 'agave', 'agave syrup', 'golden syrup', 'corn syrup',
  'rice syrup', 'date syrup', 'molasses', 'treacle', 'stroop', 'honing',
  // Concentrated sweeteners
  'stevia', 'monk fruit', 'erythritol', 'xylitol', 'sweetener',
  // Chocolate/cocoa with sugar
  'chocolate chips', 'dark chocolate', 'milk chocolate', 'white chocolate',
  'chocolate', 'cacao nibs with sugar',
  // Jams/preserves
  'jam', 'jelly', 'marmalade', 'preserve', 'fruit spread',
  // Other
  'caramel', 'toffee', 'condensed milk', 'sweet chili sauce'
];

// Ingredients that contribute FREE sugars (added + naturally occurring but not bound)
// These are sugars NOT bound within cell structure - includes juices, dried fruits, etc.
const FREE_SUGAR_INGREDIENTS = [
  // Fruit juices (sugars extracted from fruit, not bound in cells)
  'orange juice', 'apple juice', 'grape juice', 'fruit juice', 'juice',
  'sinaasappelsap', 'appelsap', 'druivensap', 'vruchtensap', 'sap',
  // Smoothies and purees
  'smoothie', 'fruit puree', 'apple sauce', 'applesauce',
  // Dried fruits (concentrated, cell walls broken)
  'dried fruit', 'dried mango', 'dried apricot', 'dried cranberry', 'sultana', 'currant',
  'raisin', 'date', 'prune', 'dried fig', 'dried banana',
  'gedroogd fruit', 'rozijn', 'dadel', 'pruim',
  // Fruit concentrates
  'fruit concentrate', 'apple concentrate', 'grape concentrate'
];

// Ingredients that contribute INTRINSIC sugars (bound within whole food cell structure)
const INTRINSIC_SUGAR_INGREDIENTS = [
  // Whole fruits (sugars bound in cell walls)
  'apple', 'banana', 'orange', 'mango', 'pineapple', 'grape', 'strawberry', 'blueberry',
  'raspberry', 'blackberry', 'cherry', 'peach', 'pear', 'plum', 'apricot', 'kiwi',
  'melon', 'watermelon', 'cantaloupe', 'honeydew', 'papaya', 'passion fruit', 'fig',
  'pomegranate', 'lychee', 'goji', 'acai',
  'appel', 'banaan', 'sinaasappel', 'aardbei', 'framboos', 'kers', 'perzik', 'peer',
  // Vegetables with natural sugars (bound in cell structure)
  'sweet potato', 'carrot', 'beet', 'beetroot', 'corn', 'pea', 'tomato', 'bell pepper',
  'red pepper', 'onion', 'squash', 'butternut', 'pumpkin', 'parsnip',
  'zoete aardappel', 'wortel', 'biet', 'mais', 'erwt', 'tomaat', 'paprika', 'ui',
  // Dairy (lactose is intrinsic)
  'milk', 'yogurt', 'yoghurt', 'kefir', 'buttermilk',
  'melk', 'yoghurt', 'karnemelk',
  // Plant milks with natural sugars
  'oat milk', 'rice milk', 'coconut milk',
  'havermelk', 'rijstmelk', 'kokosmelk'
];

// Estimated sugar content per 100g for common ingredients
const SUGAR_ESTIMATES: Record<string, { added: number; free: number; intrinsic: number }> = {
  // ADDED sugars (per 100g of ingredient)
  'sugar': { added: 100, free: 0, intrinsic: 0 },
  'honey': { added: 82, free: 0, intrinsic: 0 },
  'maple syrup': { added: 67, free: 0, intrinsic: 0 },
  'agave': { added: 68, free: 0, intrinsic: 0 },
  'chocolate': { added: 48, free: 0, intrinsic: 0 },
  'dark chocolate': { added: 24, free: 0, intrinsic: 0 },
  'jam': { added: 49, free: 0, intrinsic: 0 },
  'coconut sugar': { added: 100, free: 0, intrinsic: 0 },
  'brown sugar': { added: 97, free: 0, intrinsic: 0 },
  'date syrup': { added: 66, free: 0, intrinsic: 0 },
  'molasses': { added: 55, free: 0, intrinsic: 0 },
  
  // FREE sugars - from juices, dried fruits (not bound in cells)
  'orange juice': { added: 0, free: 8, intrinsic: 0 },
  'apple juice': { added: 0, free: 10, intrinsic: 0 },
  'grape juice': { added: 0, free: 15, intrinsic: 0 },
  'fruit juice': { added: 0, free: 10, intrinsic: 0 },
  'date': { added: 0, free: 66, intrinsic: 0 }, // Dried dates - very concentrated
  'raisin': { added: 0, free: 59, intrinsic: 0 },
  'dried mango': { added: 0, free: 73, intrinsic: 0 },
  'dried apricot': { added: 0, free: 53, intrinsic: 0 },
  'dried fig': { added: 0, free: 48, intrinsic: 0 },
  'prune': { added: 0, free: 38, intrinsic: 0 },
  'sultana': { added: 0, free: 59, intrinsic: 0 },
  'currant': { added: 0, free: 67, intrinsic: 0 },
  
  // INTRINSIC sugars - bound within whole food cell structure
  'banana': { added: 0, free: 0, intrinsic: 12 },
  'apple': { added: 0, free: 0, intrinsic: 10 },
  'mango': { added: 0, free: 0, intrinsic: 14 },
  'grape': { added: 0, free: 0, intrinsic: 16 },
  'orange': { added: 0, free: 0, intrinsic: 9 },
  'strawberry': { added: 0, free: 0, intrinsic: 5 },
  'blueberry': { added: 0, free: 0, intrinsic: 10 },
  'raspberry': { added: 0, free: 0, intrinsic: 4 },
  'pineapple': { added: 0, free: 0, intrinsic: 10 },
  'sweet potato': { added: 0, free: 0, intrinsic: 4 },
  'carrot': { added: 0, free: 0, intrinsic: 5 },
  'beet': { added: 0, free: 0, intrinsic: 7 },
  'beetroot': { added: 0, free: 0, intrinsic: 7 },
  'onion': { added: 0, free: 0, intrinsic: 4 },
  'tomato': { added: 0, free: 0, intrinsic: 3 },
  'bell pepper': { added: 0, free: 0, intrinsic: 4 },
  'corn': { added: 0, free: 0, intrinsic: 3 },
  'pea': { added: 0, free: 0, intrinsic: 5 },
  'milk': { added: 0, free: 0, intrinsic: 5 },
  'yogurt': { added: 0, free: 0, intrinsic: 4 },
  'fig': { added: 0, free: 0, intrinsic: 16 }, // Fresh fig (dried is free sugar)
  'pear': { added: 0, free: 0, intrinsic: 10 },
  'peach': { added: 0, free: 0, intrinsic: 8 },
  'cherry': { added: 0, free: 0, intrinsic: 13 },
  'watermelon': { added: 0, free: 0, intrinsic: 6 },
  'butternut': { added: 0, free: 0, intrinsic: 2 },
  'pumpkin': { added: 0, free: 0, intrinsic: 3 },
  'oat milk': { added: 0, free: 0, intrinsic: 4 },
};

/**
 * Parse ingredient amount from string (e.g., "100g banana" -> 100)
 */
function parseIngredientAmount(ingredient: string): number {
  const match = ingredient.match(/(\d+(?:\.\d+)?)\s*(?:g|ml|gram)/i);
  if (match) {
    return parseFloat(match[1]);
  }
  // Default estimates for common units
  if (ingredient.match(/\d+\s*tbsp/i)) {
    const tbsp = parseInt(ingredient.match(/(\d+)\s*tbsp/i)?.[1] || '1');
    return tbsp * 15; // 1 tbsp ≈ 15g
  }
  if (ingredient.match(/\d+\s*tsp/i)) {
    const tsp = parseInt(ingredient.match(/(\d+)\s*tsp/i)?.[1] || '1');
    return tsp * 5; // 1 tsp ≈ 5g
  }
  // For pieces (1 banana, 1 apple, etc.)
  if (ingredient.match(/^\d+\s+/)) {
    const pieces = parseInt(ingredient.match(/^(\d+)/)?.[1] || '1');
    // Estimate weight per piece
    if (ingredient.includes('banana')) return pieces * 120;
    if (ingredient.includes('apple')) return pieces * 180;
    if (ingredient.includes('orange')) return pieces * 130;
    if (ingredient.includes('date')) return pieces * 8;
    if (ingredient.includes('sweet potato')) return pieces * 200;
    if (ingredient.includes('carrot')) return pieces * 60;
    if (ingredient.includes('onion')) return pieces * 110;
    if (ingredient.includes('tomato')) return pieces * 120;
  }
  return 50; // Default estimate
}

/**
 * Classify sugar content of a single ingredient into added, free, and intrinsic
 */
function classifyIngredientSugar(ingredient: string): { added: number; free: number; intrinsic: number } {
  const lowerIngredient = ingredient.toLowerCase();
  const amount = parseIngredientAmount(lowerIngredient);
  
  // Check for added sugar ingredients first (highest priority)
  for (const addedItem of ADDED_SUGAR_INGREDIENTS) {
    if (lowerIngredient.includes(addedItem)) {
      const estimate = SUGAR_ESTIMATES[addedItem] || { added: 50, free: 0, intrinsic: 0 };
      return {
        added: (amount / 100) * estimate.added,
        free: 0,
        intrinsic: 0
      };
    }
  }
  
  // Check for free sugar ingredients (juices, dried fruits)
  for (const freeItem of FREE_SUGAR_INGREDIENTS) {
    if (lowerIngredient.includes(freeItem)) {
      const estimate = SUGAR_ESTIMATES[freeItem] || { added: 0, free: 30, intrinsic: 0 };
      return {
        added: 0,
        free: (amount / 100) * estimate.free,
        intrinsic: 0
      };
    }
  }
  
  // Check for intrinsic sugar ingredients (whole fruits, vegetables, dairy)
  for (const intrinsicItem of INTRINSIC_SUGAR_INGREDIENTS) {
    if (lowerIngredient.includes(intrinsicItem)) {
      const estimate = SUGAR_ESTIMATES[intrinsicItem] || { added: 0, free: 0, intrinsic: 5 };
      return {
        added: 0,
        free: 0,
        intrinsic: (amount / 100) * estimate.intrinsic
      };
    }
  }
  
  return { added: 0, free: 0, intrinsic: 0 };
}

/**
 * Calculate added, free, and intrinsic sugar content from recipe ingredients
 * @param ingredients Array of ingredient strings
 * @param totalSugar Total sugar from nutrition data (for validation)
 * @returns Object with addedSugar, freeSugar, and intrinsicSugar in grams
 */
export function classifySugarContent(
  ingredients: string[],
  totalSugar: number = 0
): { addedSugar: number; freeSugar: number; intrinsicSugar: number } {
  let addedSugar = 0;
  let freeSugar = 0;
  let intrinsicSugar = 0;
  
  for (const ingredient of ingredients) {
    const classification = classifyIngredientSugar(ingredient);
    addedSugar += classification.added;
    freeSugar += classification.free;
    intrinsicSugar += classification.intrinsic;
  }
  
  // Round to 1 decimal place
  addedSugar = Math.round(addedSugar * 10) / 10;
  freeSugar = Math.round(freeSugar * 10) / 10;
  intrinsicSugar = Math.round(intrinsicSugar * 10) / 10;
  
  // If we have total sugar data, use it to validate/adjust
  if (totalSugar > 0) {
    const calculatedTotal = addedSugar + freeSugar + intrinsicSugar;
    
    // If our calculation is way off, distribute proportionally
    if (calculatedTotal > 0 && Math.abs(calculatedTotal - totalSugar) > totalSugar * 0.5) {
      const ratio = totalSugar / calculatedTotal;
      addedSugar = Math.round(addedSugar * ratio * 10) / 10;
      freeSugar = Math.round(freeSugar * ratio * 10) / 10;
      intrinsicSugar = Math.round(intrinsicSugar * ratio * 10) / 10;
    } else if (calculatedTotal === 0 && totalSugar > 0) {
      // If we couldn't classify any ingredients, assume all intrinsic (healthier default)
      intrinsicSugar = totalSugar;
    }
  }
  
  return { addedSugar, freeSugar, intrinsicSugar };
}

/**
 * Check if a recipe contains added sugars
 */
export function hasAddedSugars(ingredients: string[]): boolean {
  return ingredients.some(ingredient => {
    const lower = ingredient.toLowerCase();
    return ADDED_SUGAR_INGREDIENTS.some(item => lower.includes(item));
  });
}

/**
 * Get natural sugar (intrinsic + free from whole foods, excluding added)
 * This is for backward compatibility
 */
export function getNaturalSugar(ingredients: string[], totalSugar: number = 0): number {
  const classification = classifySugarContent(ingredients, totalSugar);
  return classification.freeSugar + classification.intrinsicSugar;
}
