/**
 * Plant Diversity Tracking - Client-side utilities
 * 
 * Tracks unique plant foods consumed per week (target: 30+)
 * Based on American Gut Project research
 */

export type PlantType = 'vegetable' | 'fruit' | 'grain' | 'legume' | 'nut' | 'seed' | 'herb' | 'spice';

interface PlantMapping {
  [key: string]: PlantType;
}

// Comprehensive plant categorization mapping
const PLANT_TYPES: PlantMapping = {
  // Vegetables
  'spinach': 'vegetable', 'kale': 'vegetable', 'broccoli': 'vegetable',
  'cauliflower': 'vegetable', 'carrot': 'vegetable', 'beetroot': 'vegetable',
  'sweet potato': 'vegetable', 'bell pepper': 'vegetable', 'tomato': 'vegetable',
  'cucumber': 'vegetable', 'zucchini': 'vegetable', 'eggplant': 'vegetable',
  'mushroom': 'vegetable', 'onion': 'vegetable', 'garlic': 'vegetable',
  'asparagus': 'vegetable', 'brussels sprouts': 'vegetable', 'cabbage': 'vegetable',
  'lettuce': 'vegetable', 'arugula': 'vegetable', 'celery': 'vegetable',
  'leek': 'vegetable', 'radish': 'vegetable', 'bok choy': 'vegetable',
  'potato': 'vegetable', 'pumpkin': 'vegetable', 'squash': 'vegetable',
  
  // Fruits
  'apple': 'fruit', 'banana': 'fruit', 'blueberry': 'fruit',
  'strawberry': 'fruit', 'raspberry': 'fruit', 'blackberry': 'fruit',
  'mango': 'fruit', 'avocado': 'fruit', 'orange': 'fruit',
  'lemon': 'fruit', 'lime': 'fruit', 'grape': 'fruit',
  'pear': 'fruit', 'peach': 'fruit', 'plum': 'fruit',
  'cherry': 'fruit', 'pineapple': 'fruit', 'watermelon': 'fruit',
  'kiwi': 'fruit', 'pomegranate': 'fruit', 'berries': 'fruit',
  
  // Grains
  'oats': 'grain', 'quinoa': 'grain', 'brown rice': 'grain',
  'white rice': 'grain', 'rice': 'grain', 'whole wheat': 'grain',
  'barley': 'grain', 'buckwheat': 'grain', 'millet': 'grain',
  'amaranth': 'grain', 'bulgur': 'grain', 'farro': 'grain',
  'spelt': 'grain', 'rye': 'grain', 'corn': 'grain',
  
  // Legumes
  'lentils': 'legume', 'chickpeas': 'legume', 'black beans': 'legume',
  'kidney beans': 'legume', 'white beans': 'legume', 'pinto beans': 'legume',
  'edamame': 'legume', 'green peas': 'legume', 'split peas': 'legume',
  'beans': 'legume', 'peas': 'legume', 'tofu': 'legume', 'tempeh': 'legume',
  
  // Nuts
  'almonds': 'nut', 'walnuts': 'nut', 'cashews': 'nut',
  'pecans': 'nut', 'pistachios': 'nut', 'macadamia': 'nut',
  'hazelnuts': 'nut', 'brazil nuts': 'nut', 'pine nuts': 'nut',
  
  // Seeds
  'chia seeds': 'seed', 'flax seeds': 'seed', 'hemp seeds': 'seed',
  'pumpkin seeds': 'seed', 'sunflower seeds': 'seed', 'sesame seeds': 'seed',
  'poppy seeds': 'seed', 'chia': 'seed', 'flax': 'seed',
  
  // Herbs
  'basil': 'herb', 'parsley': 'herb', 'cilantro': 'herb',
  'mint': 'herb', 'thyme': 'herb', 'rosemary': 'herb',
  'oregano': 'herb', 'dill': 'herb', 'sage': 'herb',
  'chives': 'herb', 'coriander': 'herb',
  
  // Spices
  'cinnamon': 'spice', 'turmeric': 'spice', 'cumin': 'spice',
  'paprika': 'spice', 'ginger': 'spice', 'pepper': 'spice',
  'cayenne': 'spice', 'chili': 'spice', 'cardamom': 'spice',
  'nutmeg': 'spice', 'cloves': 'spice', 'fennel': 'spice',
  'mustard': 'spice',
};

/**
 * Normalize an ingredient string for plant detection
 */
function normalizeIngredient(ingredient: string): string {
  return ingredient
    .toLowerCase()
    .replace(/\d+(\.\d+)?\s*(g|ml|kg|tbsp|tsp|cup|cups|oz|lb|lbs|tablespoon|teaspoon|gram|milliliter|kilogram)/gi, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[,]/g, '')
    .replace(/\b(fresh|frozen|dried|raw|cooked|chopped|diced|sliced|minced|grated|whole|ground)\b/gi, '')
    .trim();
}

/**
 * Identify plant type for an ingredient
 */
function identifyPlant(ingredient: string): { name: string; type: PlantType } | null {
  const normalized = normalizeIngredient(ingredient);
  
  // Check for direct matches in our plant database
  for (const [plantName, plantType] of Object.entries(PLANT_TYPES)) {
    if (normalized.includes(plantName) || plantName.includes(normalized)) {
      return { name: plantName, type: plantType };
    }
  }
  
  return null;
}

/**
 * Extract gram amount from an ingredient string
 */
function extractGrams(ingredient: string): number {
  const normalized = ingredient.toLowerCase();
  
  // Match patterns like "150g", "150 g", "150ml", "150 ml"
  const gramMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:g|gram|grams)\b/i);
  if (gramMatch) {
    return parseFloat(gramMatch[1]);
  }
  
  // For pieces, estimate weight based on common vegetables
  const pieceEstimates: Record<string, number> = {
    'bell pepper': 150,
    'pepper': 150,
    'onion': 150,
    'zucchini': 200,
    'aubergine': 300,
    'eggplant': 300,
    'carrot': 80,
    'tomato': 150,
    'cucumber': 200,
    'potato': 150,
    'sweet potato': 200,
  };
  
  // Check for piece-based ingredients (e.g., "1 bell pepper", "1/2 onion")
  const pieceMatch = normalized.match(/^(\d+(?:\/\d+)?)\s+(.+)/);
  if (pieceMatch) {
    let quantity = pieceMatch[1].includes('/') 
      ? eval(pieceMatch[1]) // Safe here as it's just fractions like "1/2"
      : parseFloat(pieceMatch[1]);
    
    for (const [vegName, weight] of Object.entries(pieceEstimates)) {
      if (normalized.includes(vegName)) {
        return quantity * weight;
      }
    }
  }
  
  return 0;
}

/**
 * Calculate total vegetable grams from a list of ingredients
 */
export function calculateVegetableGrams(allIngredients: string[]): number {
  let totalGrams = 0;
  
  const vegetableKeywords = [
    'spinach', 'kale', 'broccoli', 'cauliflower', 'carrot', 'beetroot', 'beet',
    'sweet potato', 'bell pepper', 'pepper', 'tomato', 'cucumber', 'zucchini', 
    'eggplant', 'aubergine', 'mushroom', 'onion', 'garlic', 'asparagus', 
    'brussels sprout', 'cabbage', 'lettuce', 'arugula', 'rocket', 'celery',
    'leek', 'radish', 'bok choy', 'pak choi', 'potato', 'pumpkin', 'squash',
    'courgette', 'fennel', 'artichoke', 'spring onion', 'scallion', 'shallot',
    'turnip', 'parsnip', 'celeriac', 'kohlrabi', 'watercress', 'endive',
    'radicchio', 'chicory', 'swiss chard', 'collard', 'mustard green'
  ];
  
  allIngredients.forEach(ingredient => {
    const lowerIngredient = ingredient.toLowerCase();
    
    // Check if this ingredient is a vegetable
    const isVegetable = vegetableKeywords.some(veg => lowerIngredient.includes(veg));
    
    if (isVegetable) {
      const grams = extractGrams(ingredient);
      if (grams > 0) {
        totalGrams += grams;
      }
    }
  });
  
  return Math.round(totalGrams);
}

/**
 * Count unique plants from a list of ingredients
 */
export function countUniquePlants(allIngredients: string[]): {
  count: number;
  uniquePlants: Set<string>;
  byType: Record<PlantType, Set<string>>;
} {
  const uniquePlants = new Set<string>();
  const byType: Record<PlantType, Set<string>> = {
    vegetable: new Set(),
    fruit: new Set(),
    grain: new Set(),
    legume: new Set(),
    nut: new Set(),
    seed: new Set(),
    herb: new Set(),
    spice: new Set(),
  };
  
  allIngredients.forEach(ingredient => {
    const plant = identifyPlant(ingredient);
    if (plant) {
      uniquePlants.add(plant.name);
      byType[plant.type].add(plant.name);
    }
  });
  
  return {
    count: uniquePlants.size,
    uniquePlants,
    byType,
  };
}
