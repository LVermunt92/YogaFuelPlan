/**
 * Sugar Classification System
 * Distinguishes between added sugars (from sweeteners) and natural sugars (from whole foods)
 */

// Ingredients that contribute ADDED sugars (sweeteners)
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

// Ingredients that contribute NATURAL sugars (whole foods)
const NATURAL_SUGAR_INGREDIENTS = [
  // Fruits
  'apple', 'banana', 'orange', 'mango', 'pineapple', 'grape', 'strawberry', 'blueberry',
  'raspberry', 'blackberry', 'cherry', 'peach', 'pear', 'plum', 'apricot', 'kiwi',
  'melon', 'watermelon', 'cantaloupe', 'honeydew', 'papaya', 'passion fruit', 'fig',
  'date', 'raisin', 'prune', 'cranberry', 'goji', 'acai', 'pomegranate', 'lychee',
  'appel', 'banaan', 'sinaasappel', 'aardbei', 'framboos', 'kers', 'perzik', 'peer',
  // Dried fruits
  'dried fruit', 'dried mango', 'dried apricot', 'dried cranberry', 'sultana', 'currant',
  // Vegetables with natural sugars
  'sweet potato', 'carrot', 'beet', 'beetroot', 'corn', 'pea', 'tomato', 'bell pepper',
  'red pepper', 'onion', 'squash', 'butternut', 'pumpkin', 'parsnip',
  'zoete aardappel', 'wortel', 'biet', 'mais', 'erwt', 'tomaat', 'paprika', 'ui',
  // Dairy (lactose)
  'milk', 'yogurt', 'yoghurt', 'kefir', 'buttermilk',
  'melk', 'yoghurt', 'karnemelk',
  // Plant milks with natural sugars
  'oat milk', 'rice milk', 'coconut milk',
  'havermelk', 'rijstmelk', 'kokosmelk'
];

// Estimated sugar content per 100g for common ingredients
const SUGAR_ESTIMATES: Record<string, { added: number; natural: number }> = {
  // Added sugars (per 100g of ingredient)
  'sugar': { added: 100, natural: 0 },
  'honey': { added: 82, natural: 0 },
  'maple syrup': { added: 67, natural: 0 },
  'agave': { added: 68, natural: 0 },
  'chocolate': { added: 48, natural: 0 },
  'dark chocolate': { added: 24, natural: 0 },
  'jam': { added: 49, natural: 0 },
  'coconut sugar': { added: 100, natural: 0 },
  'brown sugar': { added: 97, natural: 0 },
  'date syrup': { added: 66, natural: 0 },
  'molasses': { added: 55, natural: 0 },
  
  // Natural sugars (per 100g of ingredient)
  'banana': { added: 0, natural: 12 },
  'apple': { added: 0, natural: 10 },
  'mango': { added: 0, natural: 14 },
  'grape': { added: 0, natural: 16 },
  'orange': { added: 0, natural: 9 },
  'strawberry': { added: 0, natural: 5 },
  'blueberry': { added: 0, natural: 10 },
  'raspberry': { added: 0, natural: 4 },
  'pineapple': { added: 0, natural: 10 },
  'sweet potato': { added: 0, natural: 4 },
  'carrot': { added: 0, natural: 5 },
  'beet': { added: 0, natural: 7 },
  'beetroot': { added: 0, natural: 7 },
  'onion': { added: 0, natural: 4 },
  'tomato': { added: 0, natural: 3 },
  'bell pepper': { added: 0, natural: 4 },
  'corn': { added: 0, natural: 3 },
  'pea': { added: 0, natural: 5 },
  'milk': { added: 0, natural: 5 },
  'yogurt': { added: 0, natural: 4 },
  'date': { added: 0, natural: 66 },
  'raisin': { added: 0, natural: 59 },
  'dried mango': { added: 0, natural: 73 },
  'dried apricot': { added: 0, natural: 53 },
  'fig': { added: 0, natural: 16 },
  'pear': { added: 0, natural: 10 },
  'peach': { added: 0, natural: 8 },
  'cherry': { added: 0, natural: 13 },
  'watermelon': { added: 0, natural: 6 },
  'butternut': { added: 0, natural: 2 },
  'pumpkin': { added: 0, natural: 3 },
  'oat milk': { added: 0, natural: 4 },
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
 * Classify sugar content of a single ingredient
 */
function classifyIngredientSugar(ingredient: string): { added: number; natural: number } {
  const lowerIngredient = ingredient.toLowerCase();
  const amount = parseIngredientAmount(lowerIngredient);
  
  // Check for added sugar ingredients first
  for (const addedItem of ADDED_SUGAR_INGREDIENTS) {
    if (lowerIngredient.includes(addedItem)) {
      const estimate = SUGAR_ESTIMATES[addedItem] || { added: 50, natural: 0 };
      return {
        added: (amount / 100) * estimate.added,
        natural: 0
      };
    }
  }
  
  // Check for natural sugar ingredients
  for (const naturalItem of NATURAL_SUGAR_INGREDIENTS) {
    if (lowerIngredient.includes(naturalItem)) {
      const estimate = SUGAR_ESTIMATES[naturalItem] || { added: 0, natural: 5 };
      return {
        added: 0,
        natural: (amount / 100) * estimate.natural
      };
    }
  }
  
  return { added: 0, natural: 0 };
}

/**
 * Calculate added and natural sugar content from recipe ingredients
 * @param ingredients Array of ingredient strings
 * @param totalSugar Total sugar from nutrition data (for validation)
 * @returns Object with addedSugar and naturalSugar in grams
 */
export function classifySugarContent(
  ingredients: string[],
  totalSugar: number = 0
): { addedSugar: number; naturalSugar: number } {
  let addedSugar = 0;
  let naturalSugar = 0;
  
  for (const ingredient of ingredients) {
    const classification = classifyIngredientSugar(ingredient);
    addedSugar += classification.added;
    naturalSugar += classification.natural;
  }
  
  // Round to 1 decimal place
  addedSugar = Math.round(addedSugar * 10) / 10;
  naturalSugar = Math.round(naturalSugar * 10) / 10;
  
  // If we have total sugar data, use it to validate/adjust
  if (totalSugar > 0) {
    const calculatedTotal = addedSugar + naturalSugar;
    
    // If our calculation is way off, distribute proportionally
    if (calculatedTotal > 0 && Math.abs(calculatedTotal - totalSugar) > totalSugar * 0.5) {
      const ratio = totalSugar / calculatedTotal;
      addedSugar = Math.round(addedSugar * ratio * 10) / 10;
      naturalSugar = Math.round(naturalSugar * ratio * 10) / 10;
    } else if (calculatedTotal === 0 && totalSugar > 0) {
      // If we couldn't classify any ingredients, assume all natural
      naturalSugar = totalSugar;
    }
  }
  
  return { addedSugar, naturalSugar };
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
