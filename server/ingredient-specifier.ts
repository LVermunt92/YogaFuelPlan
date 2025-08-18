/**
 * Ingredient Specification System
 * Replaces generic ingredient names with specific ones for better shopping lists and clearer recipes
 */

export interface IngredientSpecification {
  generic: string;
  specific: string[];
  category: 'vegetables' | 'fruits' | 'herbs' | 'spices' | 'proteins' | 'grains';
  seasonalPreference?: boolean;
}

// Comprehensive mapping of generic to specific ingredients
export const INGREDIENT_SPECIFICATIONS: IngredientSpecification[] = [
  // Vegetables
  { generic: 'mixed vegetables', specific: ['bell peppers', 'zucchini', 'carrots', 'onions'], category: 'vegetables' },
  { generic: 'fresh vegetables', specific: ['bell peppers', 'cherry tomatoes', 'spinach', 'zucchini'], category: 'vegetables' },
  { generic: 'roasted vegetables', specific: ['bell peppers', 'zucchini', 'cherry tomatoes', 'red onion'], category: 'vegetables' },
  { generic: 'seasonal vegetables', specific: ['bell peppers', 'zucchini', 'cherry tomatoes', 'spinach'], category: 'vegetables' },
  { generic: 'root vegetables', specific: ['carrots', 'sweet potatoes', 'onions'], category: 'vegetables' },
  { generic: 'leafy greens', specific: ['spinach', 'kale', 'arugula'], category: 'vegetables' },
  { generic: 'vegetables', specific: ['bell peppers', 'zucchini', 'spinach'], category: 'vegetables' },

  // Fruits  
  { generic: 'mixed berries', specific: ['blueberries', 'strawberries', 'raspberries'], category: 'fruits' },
  { generic: 'fresh berries', specific: ['blueberries', 'strawberries'], category: 'fruits' },
  { generic: 'seasonal fruit', specific: ['apples', 'pears', 'berries'], category: 'fruits', seasonalPreference: true },
  { generic: 'fresh fruit', specific: ['apples', 'banana', 'berries'], category: 'fruits', seasonalPreference: true },
  { generic: 'citrus fruit', specific: ['lemon', 'lime', 'orange'], category: 'fruits' },
  { generic: 'fruit', specific: ['apple', 'banana', 'berries'], category: 'fruits' },

  // Fresh Herbs
  { generic: 'fresh herbs', specific: ['fresh parsley', 'fresh basil', 'fresh cilantro'], category: 'herbs' },
  { generic: 'mixed herbs', specific: ['fresh parsley', 'fresh thyme', 'fresh oregano'], category: 'herbs' },
  { generic: 'herbs', specific: ['fresh parsley', 'fresh basil'], category: 'herbs' },
  { generic: 'Mediterranean herbs', specific: ['fresh oregano', 'fresh thyme', 'fresh rosemary'], category: 'herbs' },
  { generic: 'Italian herbs', specific: ['fresh basil', 'fresh oregano', 'fresh parsley'], category: 'herbs' },

  // Spices
  { generic: 'mixed spices', specific: ['cumin', 'paprika', 'turmeric'], category: 'spices' },
  { generic: 'warming spices', specific: ['cinnamon', 'ginger', 'cardamom'], category: 'spices' },
  { generic: 'curry spices', specific: ['turmeric', 'cumin', 'coriander'], category: 'spices' },

  // Proteins
  { generic: 'plant protein', specific: ['tofu', 'tempeh', 'chickpeas'], category: 'proteins' },
  { generic: 'legumes', specific: ['chickpeas', 'black beans', 'lentils'], category: 'proteins' },
  { generic: 'beans', specific: ['chickpeas', 'black beans', 'white beans'], category: 'proteins' },

  // Grains
  { generic: 'whole grains', specific: ['quinoa', 'brown rice', 'rolled oats'], category: 'grains' },
  { generic: 'ancient grains', specific: ['quinoa', 'bulgur wheat', 'farro'], category: 'grains' },
];

// Seasonal fruit mapping (enhanced from existing system)
export const SEASONAL_FRUITS = {
  spring: ['strawberries', 'rhubarb', 'early apples'],
  summer: ['blueberries', 'strawberries', 'peaches', 'cherries'],
  autumn: ['apples', 'pears', 'late berries'],
  winter: ['citrus fruits', 'stored apples', 'kiwi']
};

export function getCurrentSeason(): keyof typeof SEASONAL_FRUITS {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

/**
 * Replace generic ingredient names with specific ones
 */
export function specifyIngredients(ingredients: string[]): string[] {
  const currentSeason = getCurrentSeason();
  
  return ingredients.map(ingredient => {
    let processed = ingredient.toLowerCase().trim();
    
    // Find matching specification
    for (const spec of INGREDIENT_SPECIFICATIONS) {
      if (processed.includes(spec.generic.toLowerCase())) {
        let specificIngredients: string[];
        
        // Use seasonal preference for fruits
        if (spec.seasonalPreference && spec.category === 'fruits') {
          specificIngredients = SEASONAL_FRUITS[currentSeason];
        } else {
          specificIngredients = spec.specific;
        }
        
        // Select appropriate specific ingredient(s)
        const selected = selectSpecificIngredients(specificIngredients, spec.category);
        const replacement = selected.join(', ');
        
        // Replace the generic term while preserving quantities and formatting
        const result = ingredient.replace(new RegExp(spec.generic, 'gi'), replacement);
        
        console.log(`🎯 Ingredient specification: "${ingredient}" → "${result}"`);
        return result;
      }
    }
    
    return ingredient;
  });
}

/**
 * Select specific ingredients based on category and context
 */
function selectSpecificIngredients(options: string[], category: string): string[] {
  switch (category) {
    case 'vegetables':
      // For vegetables, select 2-3 common ones that work well together
      return options.slice(0, 3);
    
    case 'fruits':
      // For fruits, select 1-2 to avoid overwhelming
      return options.slice(0, 2);
    
    case 'herbs':
      // For herbs, select 1 main herb (parsley is most versatile)
      return [options[0]];
    
    case 'spices':
      // For spices, select 2-3 complementary ones
      return options.slice(0, 3);
    
    default:
      return [options[0]]; // Default to first option
  }
}

/**
 * Update a single recipe's ingredients to be more specific
 */
export function updateRecipeIngredients(recipe: { ingredients: string[] }): { ingredients: string[] } {
  return {
    ...recipe,
    ingredients: specifyIngredients(recipe.ingredients)
  };
}

/**
 * Validate that ingredients are specific (not generic)
 */
export function validateIngredientSpecificity(ingredients: string[]): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  for (const ingredient of ingredients) {
    const lower = ingredient.toLowerCase();
    
    // Check for generic terms
    const genericTerms = [
      'mixed vegetables', 'fresh vegetables', 'vegetables',
      'mixed fruits', 'fresh fruits', 'seasonal fruit', 
      'mixed herbs', 'fresh herbs', 'herbs',
      'mixed spices', 'spices'
    ];
    
    for (const term of genericTerms) {
      if (lower.includes(term)) {
        issues.push(`"${ingredient}" contains generic term "${term}" - should be specific`);
      }
    }
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}