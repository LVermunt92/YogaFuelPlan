// Enhanced Unit Conversion System for Recipe Ingredients
// Automatically converts US measurements to metric for European users

export interface ConversionRule {
  pattern: RegExp;
  convert: (amount: number, unit: string) => { amount: number; unit: string };
  category: 'liquid' | 'dry' | 'weight' | 'temperature';
}

// Comprehensive conversion rules for recipe ingredients
export const CONVERSION_RULES: ConversionRule[] = [
  // Liquid conversions - prioritize milliliters for European users
  {
    pattern: /(\d+(?:\.\d+)?)\s*cups?\s+(milk|almond milk|coconut milk|oat milk|soy milk|plant milk)/i,
    convert: (amount, unit) => ({ amount: Math.round(amount * 240), unit: 'ml' }),
    category: 'liquid'
  },
  {
    pattern: /(\d+(?:\.\d+)?)\s*cups?\s+(oil|olive oil|coconut oil|avocado oil|vegetable oil)/i,
    convert: (amount, unit) => ({ amount: Math.round(amount * 240), unit: 'ml' }),
    category: 'liquid'
  },
  {
    pattern: /(\d+(?:\.\d+)?)\s*cups?\s+(water|stock|broth|juice)/i,
    convert: (amount, unit) => ({ amount: Math.round(amount * 240), unit: 'ml' }),
    category: 'liquid'
  },
  {
    pattern: /(\d+(?:\.\d+)?)\s*fl\.?\s*oz\.?\s+(.*)/i,
    convert: (amount, unit) => ({ amount: Math.round(amount * 30), unit: 'ml' }),
    category: 'liquid'
  },

  // Dry ingredient conversions - prioritize grams for accuracy
  {
    pattern: /(\d+(?:\.\d+)?)\s*cups?\s+(flour|oats|quinoa|rice|pasta|lentils|chickpeas|steel-cut oats)/i,
    convert: (amount, unit) => ({ amount: Math.round(amount * 120), unit: 'g' }),
    category: 'dry'
  },
  {
    pattern: /(\d+(?:\.\d+)?)\s*cups?\s+(sugar|coconut sugar|brown sugar)/i,
    convert: (amount, unit) => ({ amount: Math.round(amount * 200), unit: 'g' }),
    category: 'dry'
  },
  {
    pattern: /(\d+(?:\.\d+)?)\s*cups?\s+(nuts|almonds|walnuts|pecans|cashews|raw almonds|mixed nuts)/i,
    convert: (amount, unit) => ({ amount: Math.round(amount * 140), unit: 'g' }),
    category: 'dry'
  },
  {
    pattern: /(\d+(?:\.\d+)?)\s*cups?\s+(chopped|diced|sliced)\s+(vegetables?|tomatoes?|onions?|carrots?)/i,
    convert: (amount, unit) => ({ amount: Math.round(amount * 150), unit: 'g' }),
    category: 'dry'
  },
  {
    pattern: /(\d+(?:\.\d+)?)\s*cups?\s+(berries|blueberries|strawberries|mixed berries|fresh berries)/i,
    convert: (amount, unit) => ({ amount: Math.round(amount * 140), unit: 'g' }),
    category: 'dry'
  },
  {
    pattern: /(\d+(?:\.\d+)?)\s*cups?\s+(spinach|baby spinach|lettuce|mixed greens|kale)/i,
    convert: (amount, unit) => ({ amount: Math.round(amount * 60), unit: 'g' }),
    category: 'dry'
  },
  {
    pattern: /(\d+(?:\.\d+)?)\s*cups?\s+(cooked|raw)\s+(.*)/i,
    convert: (amount, unit) => ({ amount: Math.round(amount * 150), unit: 'g' }),
    category: 'dry'
  },
  {
    pattern: /(\d+(?:\.\d+)?)\s*cups?\s+(.*)/i,
    convert: (amount, unit) => ({ amount: Math.round(amount * 150), unit: 'g' }),
    category: 'dry'
  },

  // Lemon-specific conversions - convert to ml of juice
  {
    pattern: /(\d+(?:\.\d+)?)\s*g\s+(lemon|lemons)/i,
    convert: (amount, unit) => ({ amount: Math.round(amount), unit: 'ml' }),
    category: 'liquid'
  },
  {
    pattern: /(\d+(?:\.\d+)?)\s*(lemon|lemons)\s*\(.*?\)/i,
    convert: (amount, unit) => ({ amount: Math.round(amount * 60), unit: 'ml' }),
    category: 'liquid'
  },

  // Garlic-specific conversions - keep cloves as cloves
  {
    pattern: /(\d+(?:\.\d+)?)\s*cloves?\s+(garlic)/i,
    convert: (amount, unit) => ({ 
      amount: Math.round(amount), 
      unit: Math.round(amount) === 1 ? 'clove' : 'cloves' 
    }),
    category: 'count'
  },
  {
    pattern: /(\d+(?:\.\d+)?)\s*g\s+(garlic)/i,
    convert: (amount, unit) => ({ amount: Math.max(1, Math.round(amount / 3)), unit: 'cloves' }),
    category: 'count'
  },

  // Fresh herb-specific conversions - keep natural units for herbs
  {
    pattern: /(\d+(?:\.\d+)?)\s*tbsp\.?\s+(fresh\s+(?:parsley|basil|cilantro|dill|mint|herbs))/i,
    convert: (amount, unit) => ({ 
      amount: Math.round(amount), 
      unit: Math.round(amount) === 1 ? 'tbsp' : 'tbsp' 
    }),
    category: 'herb'
  },
  {
    pattern: /(\d+(?:\.\d+)?)\s*tsp\.?\s+(fresh\s+(?:parsley|basil|cilantro|dill|mint|herbs))/i,
    convert: (amount, unit) => ({ 
      amount: Math.round(amount), 
      unit: Math.round(amount) === 1 ? 'tsp' : 'tsp' 
    }),
    category: 'herb'
  },
  {
    pattern: /(\d+(?:\.\d+)?)\s*sprigs?\s+(fresh\s+(?:rosemary|thyme|sage|oregano))/i,
    convert: (amount, unit) => ({ 
      amount: Math.round(amount), 
      unit: Math.round(amount) === 1 ? 'sprig' : 'sprigs' 
    }),
    category: 'herb'
  },
  {
    pattern: /(\d+(?:\.\d+)?)\s*ml\s+(fresh\s+(?:parsley|basil|cilantro|dill|mint|herbs))/i,
    convert: (amount, unit) => ({ 
      amount: Math.max(1, Math.round(amount / 15)), 
      unit: Math.round(amount / 15) === 1 ? 'tbsp' : 'tbsp' 
    }),
    category: 'herb'
  },

  // Tablespoon and teaspoon conversions
  {
    pattern: /(\d+(?:\.\d+)?)\s*tbsp\.?\s+(.*)/i,
    convert: (amount, unit) => ({ amount: Math.round(amount * 15), unit: 'ml' }),
    category: 'liquid'
  },
  {
    pattern: /(\d+(?:\.\d+)?)\s*tsp\.?\s+(.*)/i,
    convert: (amount, unit) => ({ amount: Math.round(amount * 5), unit: 'ml' }),
    category: 'liquid'
  },

  // Weight conversions
  {
    pattern: /(\d+(?:\.\d+)?)\s*lbs?\s+(.*)/i,
    convert: (amount, unit) => ({ amount: Math.round(amount * 454), unit: 'g' }),
    category: 'weight'
  },
  {
    pattern: /(\d+(?:\.\d+)?)\s*oz\.?\s+(.*)/i,
    convert: (amount, unit) => ({ amount: Math.round(amount * 28), unit: 'g' }),
    category: 'weight'
  },

  // Temperature conversions
  {
    pattern: /(\d+(?:\.\d+)?)\s*°?F/i,
    convert: (amount, unit) => ({ amount: Math.round((amount - 32) * 5/9), unit: '°C' }),
    category: 'temperature'
  }
];

// Seasonal fruit specification system
export const SEASONAL_FRUIT_REPLACEMENTS = {
  spring: ['strawberries', 'rhubarb', 'early apples'],
  summer: ['mixed berries', 'peaches', 'plums', 'cherries'],
  autumn: ['apples', 'pears', 'late berries'],
  winter: ['citrus fruits', 'stored apples', 'dried fruits']
};

export function getCurrentSeason(): 'spring' | 'summer' | 'autumn' | 'winter' {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

export function convertIngredientUnits(ingredient: string): string {
  let convertedIngredient = ingredient;

  // Apply all conversion rules
  for (const rule of CONVERSION_RULES) {
    const match = convertedIngredient.match(rule.pattern);
    if (match) {
      const amount = parseFloat(match[1]);
      const restOfIngredient = match[2] || '';
      const converted = rule.convert(amount, restOfIngredient);
      
      // Replace the matched portion with converted values
      convertedIngredient = convertedIngredient.replace(
        rule.pattern,
        `${converted.amount} ${converted.unit} ${restOfIngredient}`.trim()
      );
      
      console.log(`🔄 Unit conversion: "${ingredient}" → "${convertedIngredient}"`);
      break; // Apply only the first matching rule
    }
  }

  return convertedIngredient;
}

export function specifySeasonalFruit(ingredient: string): string {
  const currentSeason = getCurrentSeason();
  const seasonalFruits = SEASONAL_FRUIT_REPLACEMENTS[currentSeason];
  
  // Replace vague "seasonal fruit" with specific Netherlands-appropriate fruits
  const seasonalPatterns = [
    /seasonal fruits?/i,
    /fresh fruits?/i,
    /mixed fruits?/i,
    /fruit of choice/i
  ];

  for (const pattern of seasonalPatterns) {
    if (pattern.test(ingredient)) {
      const specificFruit = seasonalFruits[Math.floor(Math.random() * seasonalFruits.length)];
      const converted = ingredient.replace(pattern, specificFruit);
      console.log(`🍎 Seasonal fruit specification: "${ingredient}" → "${converted}" (${currentSeason} season)`);
      return converted;
    }
  }

  return ingredient;
}

export function processRecipeIngredients(ingredients: string[]): string[] {
  return ingredients.map(ingredient => {
    // Step 1: Convert units to metric
    let processed = convertIngredientUnits(ingredient);
    
    // Step 2: Specify seasonal fruits
    processed = specifySeasonalFruit(processed);
    
    return processed;
  });
}

// Main conversion workflow for new recipes
export function applyConversionWorkflow(recipe: {
  name: string;
  ingredients: string[];
  [key: string]: any;
}): typeof recipe {
  console.log(`🔧 Applying conversion workflow to recipe: ${recipe.name}`);
  
  return {
    ...recipe,
    ingredients: processRecipeIngredients(recipe.ingredients)
  };
}

// Validation function to check if conversions were applied
export function validateConversions(ingredients: string[]): {
  hasMetricUnits: boolean;
  hasSpecificFruits: boolean;
  unconvertedItems: string[];
} {
  const unconvertedItems: string[] = [];
  let hasMetricUnits = false;
  let hasSpecificFruits = true;

  for (const ingredient of ingredients) {
    // Check for unconverted US units
    if (/\d+\s*(cups?|tbsp|tsp|fl\.?\s*oz|lbs?|°F)/i.test(ingredient)) {
      unconvertedItems.push(ingredient);
    }
    
    // Check for metric units
    if (/\d+\s*(ml|g|kg|°C)/i.test(ingredient)) {
      hasMetricUnits = true;
    }
    
    // Check for vague seasonal fruit references
    if (/seasonal fruits?|fresh fruits?|mixed fruits?|fruit of choice/i.test(ingredient)) {
      hasSpecificFruits = false;
    }
  }

  return {
    hasMetricUnits,
    hasSpecificFruits,
    unconvertedItems
  };
}