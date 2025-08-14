// Unit conversion system for recipe ingredients
// Converts imperial measurements (cups, tbsp, tsp) to metric (grams, ml)

interface ConversionRule {
  pattern: RegExp;
  convert: (amount: number, ingredient?: string) => string;
}

// Density-based conversions for common ingredients (grams per cup)
const ingredientDensities: Record<string, number> = {
  // Flour and grains
  'flour': 120,
  'all-purpose flour': 120,
  'whole wheat flour': 130,
  'bread flour': 125,
  'cake flour': 115,
  'rice': 185,
  'brown rice': 195,
  'quinoa': 170,
  'oats': 80,
  'rolled oats': 80,
  'oat flour': 100,
  'almond flour': 100,
  'coconut flour': 60,
  
  // Sugars and sweeteners
  'sugar': 200,
  'brown sugar': 220,
  'powdered sugar': 120,
  'honey': 340,
  'maple syrup': 320,
  'agave': 330,
  
  // Nuts and seeds
  'almonds': 140,
  'walnuts': 120,
  'pecans': 110,
  'cashews': 135,
  'peanuts': 150,
  'sunflower seeds': 140,
  'pumpkin seeds': 130,
  'chia seeds': 160,
  'flax seeds': 170,
  'sesame seeds': 150,
  
  // Dairy and proteins
  'milk': 240, // ml
  'yogurt': 245,
  'cream': 240,
  'butter': 227,
  'cheese': 110,
  'parmesan': 100,
  'cottage cheese': 225,
  
  // Vegetables (chopped)
  'onion': 160,
  'carrots': 130,
  'celery': 120,
  'bell pepper': 150,
  'tomatoes': 180,
  'spinach': 30,
  'kale': 65,
  'broccoli': 90,
  'cauliflower': 100,
  'mushrooms': 70,
  
  // Beans and legumes (cooked)
  'black beans': 180,
  'kidney beans': 185,
  'chickpeas': 160,
  'lentils': 200,
  'white beans': 180,
  
  // Oils and liquids
  'oil': 220,
  'olive oil': 220,
  'coconut oil': 220,
  'water': 240, // ml
  'broth': 240, // ml
  'stock': 240, // ml
  
  // Default for unknown ingredients
  'default': 140
};

// Get density for ingredient (case-insensitive, partial matching)
function getIngredientDensity(ingredient: string): number {
  const normalized = ingredient.toLowerCase();
  
  // Direct match
  if (ingredientDensities[normalized]) {
    return ingredientDensities[normalized];
  }
  
  // Partial match
  for (const [key, density] of Object.entries(ingredientDensities)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return density;
    }
  }
  
  return ingredientDensities.default;
}

// Check if ingredient is primarily liquid
function isLiquid(ingredient: string): boolean {
  const liquidKeywords = [
    // Milk and dairy liquids
    'milk', 'almond milk', 'soy milk', 'oat milk', 'coconut milk', 'rice milk',
    'cashew milk', 'hemp milk', 'buttermilk', 'heavy cream', 'light cream',
    'half and half', 'whipping cream', 'sour cream', 'yogurt drink', 'kefir',
    
    // Water and basic liquids
    'water', 'sparkling water', 'coconut water', 'ice water',
    
    // Broths and stocks
    'broth', 'stock', 'chicken broth', 'vegetable broth', 'beef broth',
    'bone broth', 'fish stock', 'mushroom broth', 'miso broth', 'dashi',
    
    // Juices
    'juice', 'lemon juice', 'lime juice', 'orange juice', 'apple juice',
    'cranberry juice', 'tomato juice', 'vegetable juice', 'grapefruit juice',
    'pineapple juice', 'grape juice', 'pomegranate juice',
    
    // Alcoholic beverages
    'wine', 'white wine', 'red wine', 'cooking wine', 'sake', 'mirin',
    'beer', 'rum', 'vodka', 'brandy', 'whiskey',
    
    // Vinegars
    'vinegar', 'apple cider vinegar', 'white vinegar', 'balsamic vinegar',
    'rice vinegar', 'red wine vinegar', 'champagne vinegar', 'sherry vinegar',
    
    // Oils
    'oil', 'olive oil', 'vegetable oil', 'coconut oil', 'avocado oil',
    'sesame oil', 'canola oil', 'sunflower oil', 'grapeseed oil',
    'melted butter', 'ghee',
    
    // Sauces and condiments
    'sauce', 'soy sauce', 'tamari', 'fish sauce', 'worcestershire sauce',
    'hot sauce', 'sriracha', 'teriyaki sauce', 'hoisin sauce',
    
    // Syrups and sweeteners
    'syrup', 'maple syrup', 'corn syrup', 'agave syrup', 'honey',
    'molasses', 'brown rice syrup', 'date syrup',
    
    // Extracts
    'extract', 'vanilla extract', 'almond extract', 'lemon extract',
    'rum extract', 'orange extract', 'peppermint extract',
    
    // Beverages
    'coffee', 'tea', 'espresso', 'cold brew', 'kombucha', 'smoothie',
    
    // Other liquids
    'liquid smoke', 'rose water', 'orange blossom water'
  ];
  
  const normalized = ingredient.toLowerCase();
  return liquidKeywords.some(keyword => normalized.includes(keyword));
}

// Conversion rules
const conversionRules: ConversionRule[] = [
  // Cups to grams/ml
  {
    pattern: /(\d+(?:\.\d+)?)\s*cups?\s+(.+)/gi,
    convert: (amount: number, ingredient: string = '') => {
      if (isLiquid(ingredient)) {
        return `${Math.round(amount * 240)} ml ${ingredient}`;
      } else {
        const density = getIngredientDensity(ingredient);
        return `${Math.round(amount * density)} g ${ingredient}`;
      }
    }
  },
  
  // Tablespoons to grams/ml
  {
    pattern: /(\d+(?:\.\d+)?)\s*(?:tbsp|tablespoons?)\s+(.+)/gi,
    convert: (amount: number, ingredient: string = '') => {
      if (isLiquid(ingredient)) {
        return `${Math.round(amount * 15)} ml ${ingredient}`;
      } else {
        const density = getIngredientDensity(ingredient);
        return `${Math.round(amount * density / 16)} g ${ingredient}`;
      }
    }
  },
  
  // Teaspoons to grams/ml
  {
    pattern: /(\d+(?:\.\d+)?)\s*(?:tsp|teaspoons?)\s+(.+)/gi,
    convert: (amount: number, ingredient: string = '') => {
      if (isLiquid(ingredient)) {
        return `${Math.round(amount * 5)} ml ${ingredient}`;
      } else {
        const density = getIngredientDensity(ingredient);
        return `${Math.round(amount * density / 48)} g ${ingredient}`;
      }
    }
  },
  
  // Ounces to grams
  {
    pattern: /(\d+(?:\.\d+)?)\s*oz\s+(.+)/gi,
    convert: (amount: number, ingredient: string = '') => {
      return `${Math.round(amount * 28.35)} g ${ingredient}`;
    }
  },
  
  // Pounds to grams
  {
    pattern: /(\d+(?:\.\d+)?)\s*lbs?\s+(.+)/gi,
    convert: (amount: number, ingredient: string = '') => {
      return `${Math.round(amount * 453.592)} g ${ingredient}`;
    }
  },
  
  // Fluid ounces to ml
  {
    pattern: /(\d+(?:\.\d+)?)\s*fl\s*oz\s+(.+)/gi,
    convert: (amount: number, ingredient: string = '') => {
      return `${Math.round(amount * 29.5735)} ml ${ingredient}`;
    }
  },
  
  // Pints to ml
  {
    pattern: /(\d+(?:\.\d+)?)\s*pints?\s+(.+)/gi,
    convert: (amount: number, ingredient: string = '') => {
      return `${Math.round(amount * 473.176)} ml ${ingredient}`;
    }
  },
  
  // Quarts to ml
  {
    pattern: /(\d+(?:\.\d+)?)\s*quarts?\s+(.+)/gi,
    convert: (amount: number, ingredient: string = '') => {
      return `${Math.round(amount * 946.353)} ml ${ingredient}`;
    }
  }
];

// Convert all imperial measurements in a text to metric
export function convertToMetric(text: string): string {
  let converted = text;
  
  for (const rule of conversionRules) {
    converted = converted.replace(rule.pattern, (match, amountStr, ingredient) => {
      const amount = parseFloat(amountStr);
      if (isNaN(amount)) return match;
      
      try {
        return rule.convert(amount, ingredient);
      } catch (error) {
        console.error('Conversion error:', error);
        return match;
      }
    });
  }
  
  return converted;
}

// Convert measurements in recipe ingredients list
export function convertIngredientsToMetric(ingredients: string[]): string[] {
  return ingredients.map(ingredient => convertToMetric(ingredient));
}

// Convert measurements in recipe instructions
export function convertInstructionsToMetric(instructions: string[]): string[] {
  return instructions.map(instruction => convertToMetric(instruction));
}