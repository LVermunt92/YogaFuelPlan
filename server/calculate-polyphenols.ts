import { db } from './db';
import { recipes } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Polyphenol content per 100g (in mg) - comprehensive database
// Sources: USDA, Phenol-Explorer database, research literature
const POLYPHENOL_DATABASE: Record<string, number> = {
  // Berries (very high polyphenols)
  'blueberries': 560,
  'blueberry': 560,
  'blackberries': 260,
  'blackberry': 260,
  'raspberries': 215,
  'raspberry': 215,
  'strawberries': 235,
  'strawberry': 235,
  'cranberries': 315,
  'cranberry': 315,
  'pomegranate': 285,
  'açaí': 1500,
  'acai': 1500,
  'goji berries': 355,
  'goji': 355,
  
  // Dark chocolate & cocoa (extremely high)
  'dark chocolate': 1660,
  'cocoa powder': 3450,
  'cocoa': 3450,
  'cacao': 3450,
  'cacao powder': 3450,
  'cacao nibs': 2800,
  'chocolate chips': 800,
  
  // Tea & coffee
  'green tea': 180,
  'matcha': 1384,
  'black tea': 120,
  'coffee': 200,
  
  // Nuts & seeds (per 100g)
  'walnuts': 1556,
  'walnut': 1556,
  'hazelnuts': 494,
  'hazelnut': 494,
  'almonds': 187,
  'almond': 187,
  'pecans': 493,
  'pecan': 493,
  'chestnuts': 1200,
  'chestnut': 1200,
  'flaxseed': 130,
  'flax seeds': 130,
  'chia seeds': 85,
  'chia': 85,
  'hemp seeds': 45,
  'hemp hearts': 45,
  'sunflower seeds': 120,
  'pumpkin seeds': 80,
  'sesame seeds': 130,
  'pine nuts': 35,
  
  // Legumes
  'black beans': 75,
  'kidney beans': 57,
  'lentils': 112,
  'lentil': 112,
  'chickpeas': 69,
  'chickpea': 69,
  'edamame': 45,
  'soybeans': 90,
  'tempeh': 94,
  'tofu': 35,
  'miso': 85,
  
  // Vegetables (rich in polyphenols)
  'spinach': 119,
  'kale': 165,
  'broccoli': 98,
  'red cabbage': 314,
  'purple cabbage': 314,
  'artichoke': 260,
  'red onion': 76,
  'onion': 54,
  'garlic': 59,
  'asparagus': 29,
  'eggplant': 57,
  'aubergine': 57,
  'beetroot': 72,
  'beet': 72,
  'carrot': 29,
  'tomatoes': 29,
  'tomato': 29,
  'cherry tomatoes': 35,
  'bell pepper': 27,
  'sweet potato': 51,
  'potato': 23,
  'cauliflower': 37,
  'cauliflower rice': 37,
  'zucchini': 24,
  'courgette': 24,
  'cucumber': 15,
  'mushrooms': 22,
  'shiitake': 70,
  'portobello': 35,
  'pak choi': 39,
  'bok choy': 39,
  'swiss chard': 89,
  'arugula': 105,
  'rocket': 105,
  'lettuce': 15,
  'celery': 29,
  'leek': 32,
  'fennel': 28,
  
  // Fruits
  'apple': 136,
  'pear': 42,
  'grape': 181,
  'grapes': 181,
  'red grapes': 210,
  'plum': 377,
  'cherry': 274,
  'cherries': 274,
  'orange': 61,
  'lemon': 83,
  'lime': 75,
  'grapefruit': 58,
  'banana': 27,
  'mango': 68,
  'pineapple': 30,
  'kiwi': 34,
  'watermelon': 9,
  'melon': 12,
  'peach': 59,
  'nectarine': 48,
  'apricot': 49,
  'fig': 67,
  'date': 99,
  'dates': 99,
  'avocado': 27,
  'passion fruit': 85,
  
  // Whole grains
  'quinoa': 45,
  'oats': 37,
  'oatmeal': 37,
  'buckwheat': 65,
  'brown rice': 25,
  'wild rice': 38,
  'whole wheat': 32,
  'barley': 52,
  'rye': 65,
  'millet': 25,
  'farro': 35,
  
  // Herbs & spices (per 100g - extremely concentrated)
  'turmeric': 2117,
  'cumin': 1535,
  'cinnamon': 8108,
  'cloves': 15188,
  'oregano': 2319,
  'thyme': 1815,
  'rosemary': 2518,
  'basil': 322,
  'parsley': 1584,
  'cilantro': 287,
  'coriander': 287,
  'mint': 500,
  'dill': 450,
  'sage': 2850,
  'ginger': 202,
  'paprika': 985,
  'chili': 452,
  'cayenne': 1025,
  'black pepper': 1000,
  'cardamom': 395,
  'nutmeg': 520,
  
  // Olive oil & healthy fats
  'olive oil': 62,
  'extra virgin olive oil': 62,
  
  // Vinegars & condiments
  'red wine vinegar': 45,
  'balsamic vinegar': 69,
  'apple cider vinegar': 32,
  'soy sauce': 42,
  'tahini': 95,
};

// Cocoa flavanol database (mg per 100g)
const COCOA_FLAVANOL_DATABASE: Record<string, number> = {
  'dark chocolate': 200,
  'cocoa powder': 900,
  'cocoa': 900,
  'cacao': 900,
  'cacao powder': 900,
  'cacao nibs': 700,
  'chocolate chips': 100,
  'matcha': 25,
};

function parseIngredientAmount(ingredient: string): { amount: number; unit: string; name: string } {
  const cleanIngredient = ingredient.trim().toLowerCase();
  
  // Pattern: amount unit name (e.g., "100g spinach", "2 cloves garlic")
  const match = cleanIngredient.match(/^(\d+(?:\.\d+)?(?:\/\d+)?)\s*(g|ml|kg|l|tsp|tbsp|cloves?|pieces?|cups?)?\s*(.+)/i);
  
  if (match) {
    let amount = parseFloat(match[1]);
    // Handle fractions
    if (match[1].includes('/')) {
      const [num, denom] = match[1].split('/');
      amount = parseFloat(num) / parseFloat(denom);
    }
    const unit = (match[2] || '').toLowerCase();
    const name = match[3].trim();
    
    // Convert to grams for calculation
    let amountInGrams = amount;
    if (unit === 'kg') amountInGrams = amount * 1000;
    else if (unit === 'ml' || unit === 'l') amountInGrams = unit === 'l' ? amount * 1000 : amount;
    else if (unit === 'tsp') amountInGrams = amount * 5;
    else if (unit === 'tbsp') amountInGrams = amount * 15;
    else if (unit === 'clove' || unit === 'cloves') amountInGrams = amount * 5; // ~5g per clove
    else if (unit === 'piece' || unit === 'pieces') amountInGrams = amount * 100; // rough estimate
    else if (unit === 'cup' || unit === 'cups') amountInGrams = amount * 150; // rough estimate
    
    return { amount: amountInGrams, unit, name };
  }
  
  // Fallback: try to extract just the name
  return { amount: 100, unit: '', name: cleanIngredient };
}

function findPolyphenolValue(ingredientName: string): number | null {
  const name = ingredientName.toLowerCase();
  
  // Direct match
  if (POLYPHENOL_DATABASE[name]) {
    return POLYPHENOL_DATABASE[name];
  }
  
  // Partial match - check if ingredient contains any known polyphenol source
  for (const [key, value] of Object.entries(POLYPHENOL_DATABASE)) {
    if (name.includes(key) || key.includes(name)) {
      return value;
    }
  }
  
  return null;
}

function findCocoaFlavanolValue(ingredientName: string): number | null {
  const name = ingredientName.toLowerCase();
  
  for (const [key, value] of Object.entries(COCOA_FLAVANOL_DATABASE)) {
    if (name.includes(key) || key.includes(name)) {
      return value;
    }
  }
  
  return null;
}

function calculatePolyphenolsForRecipe(ingredients: string[]): { polyphenols: number; cocoaFlavanols: number } {
  let totalPolyphenols = 0;
  let totalCocoaFlavanols = 0;
  
  for (const ingredient of ingredients) {
    const parsed = parseIngredientAmount(ingredient);
    
    // Skip very small amounts (seasonings) except for spices which are concentrated
    const polyphenolValue = findPolyphenolValue(parsed.name);
    if (polyphenolValue !== null) {
      // Calculate polyphenols: (amount in grams / 100) * polyphenol per 100g
      const contribution = (parsed.amount / 100) * polyphenolValue;
      totalPolyphenols += contribution;
    }
    
    const cocoaFlavanolValue = findCocoaFlavanolValue(parsed.name);
    if (cocoaFlavanolValue !== null) {
      const contribution = (parsed.amount / 100) * cocoaFlavanolValue;
      totalCocoaFlavanols += contribution;
    }
  }
  
  // Round to 1 decimal place
  return {
    polyphenols: Math.round(totalPolyphenols * 10) / 10,
    cocoaFlavanols: Math.round(totalCocoaFlavanols * 10) / 10
  };
}

export async function updateAllRecipePolyphenols(): Promise<void> {
  console.log('Starting polyphenol calculation for all recipes...');
  
  const allRecipes = await db.select({
    id: recipes.id,
    name: recipes.name,
    ingredients: recipes.ingredients,
  }).from(recipes);
  
  console.log(`Found ${allRecipes.length} recipes to update`);
  
  let updatedCount = 0;
  for (const recipe of allRecipes) {
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      continue;
    }
    
    const { polyphenols, cocoaFlavanols } = calculatePolyphenolsForRecipe(recipe.ingredients);
    
    await db.update(recipes)
      .set({
        polyphenols,
        cocoaFlavanols
      })
      .where(eq(recipes.id, recipe.id));
    
    updatedCount++;
    if (updatedCount % 50 === 0) {
      console.log(`Updated ${updatedCount}/${allRecipes.length} recipes...`);
    }
  }
  
  console.log(`Finished updating ${updatedCount} recipes with polyphenol data`);
}

// Export for use in routes
export { calculatePolyphenolsForRecipe, POLYPHENOL_DATABASE, COCOA_FLAVANOL_DATABASE };
