// Vitamin K content mapping (mcg per 100g)
// Based on USDA nutritional data

export const vitaminKContent: Record<string, number> = {
  // Leafy greens (very high in Vitamin K)
  'spinach': 483,
  'kale': 705,
  'collard greens': 437,
  'swiss chard': 830,
  'mustard greens': 593,
  'turnip greens': 251,
  'arugula': 109,
  'lettuce': 126,
  'romaine lettuce': 102,
  'iceberg lettuce': 24,
  'watercress': 250,
  
  // Cruciferous vegetables
  'broccoli': 102,
  'brussels sprouts': 177,
  'cabbage': 76,
  'cauliflower': 16,
  'bok choy': 46,
  
  // Herbs (extremely high)
  'parsley': 1640,
  'basil': 415,
  'cilantro': 310,
  'oregano': 622,
  'thyme': 1715,
  'sage': 1715,
  
  // Vegetables
  'asparagus': 42,
  'green beans': 43,
  'peas': 24,
  'cucumber': 17,
  'celery': 29,
  'carrot': 13,
  'bell pepper': 5,
  'tomato': 8,
  'zucchini': 5,
  'eggplant': 4,
  'pumpkin': 1,
  'sweet potato': 2,
  'potato': 2,
  
  // Fruits
  'avocado': 21,
  'kiwi': 40,
  'blueberries': 19,
  'grapes': 15,
  'pomegranate': 16,
  'figs': 5,
  'strawberries': 2,
  'banana': 1,
  'apple': 2,
  'orange': 0,
  
  // Oils and fats
  'olive oil': 60,
  'canola oil': 71,
  'soybean oil': 184,
  'avocado oil': 0,
  'coconut oil': 1,
  
  // Legumes and nuts
  'edamame': 27,
  'chickpeas': 9,
  'lentils': 5,
  'kidney beans': 19,
  'black beans': 0,
  'almonds': 0,
  'cashews': 34,
  'pine nuts': 54,
  'pistachios': 13,
  'walnuts': 3,
  
  // Soy products
  'tofu': 2,
  'tempeh': 30,
  'soy milk': 3,
  'natto': 1103,
  
  // Grains
  'oats': 2,
  'quinoa': 0,
  'brown rice': 2,
  'white rice': 0,
  'whole wheat': 2,
  
  // Other
  'seaweed': 66,
  'nori': 1700,
  'egg': 31,
  'cheese': 3,
  'milk': 0,
  'yogurt': 0,
  'dark chocolate': 7,
};

/**
 * Calculate Vitamin K content for a recipe based on ingredients
 * @param ingredients Array of ingredient strings
 * @returns Estimated Vitamin K in micrograms (mcg)
 */
export function calculateVitaminK(ingredients: string[]): number {
  if (!ingredients || ingredients.length === 0) return 0;

  let totalVitaminK = 0;
  let matchedIngredients = 0;

  ingredients.forEach(ingredient => {
    const lowerIngredient = ingredient.toLowerCase();
    
    // Try to match ingredient with vitamin K database
    for (const [food, vitaminK] of Object.entries(vitaminKContent)) {
      if (lowerIngredient.includes(food)) {
        // Extract quantity - supports formats like:
        // "150g", "150 g", "37.5g", "150 grams", "100 gm", etc.
        // Explicitly match gram units: g, grams, gm, gms
        // Exclude all metric prefixes: k(g), m(g), mc(g), u(g), µ(g), μ(g)
        const quantityMatch = ingredient.match(/(\d+(?:\.\d+)?)\s*(?:grams?|gms?|(?<![kmcuµμ])g)(?![a-z])/i);
        const quantity = quantityMatch ? parseFloat(quantityMatch[1]) : 100;
        
        // Calculate vitamin K for this ingredient
        const ingredientVitaminK = (vitaminK * quantity) / 100;
        totalVitaminK += ingredientVitaminK;
        matchedIngredients++;
        break; // Only match once per ingredient
      }
    }
  });

  // Round to 1 decimal place
  return Math.round(totalVitaminK * 10) / 10;
}

/**
 * Get Vitamin K category for a given amount
 */
export function getVitaminKCategory(vitaminK: number): string {
  if (vitaminK >= 100) return 'excellent'; // >100 mcg
  if (vitaminK >= 50) return 'good';       // 50-99 mcg
  if (vitaminK >= 20) return 'moderate';   // 20-49 mcg
  return 'low';                             // <20 mcg
}

/**
 * Daily Vitamin K recommendations (mcg)
 */
export const vitaminKRecommendations = {
  men: 120,      // Adult men
  women: 90,     // Adult women
  pregnant: 90,  // Pregnant women
  lactating: 90  // Lactating women
};
