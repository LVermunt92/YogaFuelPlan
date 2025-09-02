/**
 * Fiber validation and enhancement system for recipes
 * Targets 10g fiber per meal using priority system: nuts/seeds → greens → beans
 */

interface FiberSource {
  name: string;
  fiberPer100g: number; // grams of fiber per 100g
  category: 'nuts_seeds' | 'greens' | 'beans_legumes' | 'whole_grains' | 'vegetables' | 'fruits';
  dietaryCompatibility: string[];
  typicalAmount: string; // Typical serving size for enhancement
}

const FIBER_SOURCES: FiberSource[] = [
  // Priority 1: Nuts and Seeds (preferred enhancement)
  { name: 'chia seeds', fiberPer100g: 34.4, category: 'nuts_seeds', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '15g' },
  { name: 'ground flaxseed', fiberPer100g: 27.3, category: 'nuts_seeds', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '15g' },
  { name: 'hemp hearts', fiberPer100g: 4.0, category: 'nuts_seeds', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '30g' },
  { name: 'psyllium husk', fiberPer100g: 88.0, category: 'nuts_seeds', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '5g' },
  { name: 'almonds', fiberPer100g: 12.5, category: 'nuts_seeds', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '30g' },
  { name: 'sunflower seeds', fiberPer100g: 8.6, category: 'nuts_seeds', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '30g' },
  
  // Priority 2: Greens and Vegetables
  { name: 'spinach', fiberPer100g: 2.2, category: 'greens', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '100g' },
  { name: 'kale', fiberPer100g: 3.6, category: 'greens', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '100g' },
  { name: 'broccoli', fiberPer100g: 2.6, category: 'vegetables', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '150g' },
  { name: 'brussels sprouts', fiberPer100g: 3.8, category: 'vegetables', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '150g' },
  { name: 'artichoke hearts', fiberPer100g: 8.6, category: 'vegetables', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '100g' },
  
  // Priority 3: Beans and Legumes (fallback)
  { name: 'black beans', fiberPer100g: 8.7, category: 'beans_legumes', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '100g' },
  { name: 'chickpeas', fiberPer100g: 8.0, category: 'beans_legumes', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '100g' },
  { name: 'lentils', fiberPer100g: 10.7, category: 'beans_legumes', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '100g' },
  { name: 'kidney beans', fiberPer100g: 6.4, category: 'beans_legumes', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '100g' },
  
  // Whole Grains
  { name: 'oats', fiberPer100g: 10.6, category: 'whole_grains', dietaryCompatibility: ['vegan', 'vegetarian'], typicalAmount: '50g' },
  { name: 'quinoa', fiberPer100g: 2.8, category: 'whole_grains', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '100g' },
  { name: 'buckwheat', fiberPer100g: 10.0, category: 'whole_grains', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '100g' },
  { name: 'brown rice', fiberPer100g: 1.8, category: 'whole_grains', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '100g' },
  
  // Fruits
  { name: 'raspberries', fiberPer100g: 6.5, category: 'fruits', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '100g' },
  { name: 'pear', fiberPer100g: 3.1, category: 'fruits', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '150g' },
  { name: 'apple', fiberPer100g: 2.4, category: 'fruits', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '150g' },
];

/**
 * Extract amount from ingredient string (rough estimation)
 */
function extractAmount(ingredient: string): number {
  const match = ingredient.match(/(\d+(?:\.\d+)?)\s*g/i);
  if (match) return parseFloat(match[1]);
  
  // Fallback estimates for common measurements
  if (ingredient.includes('cup')) return 100;
  if (ingredient.includes('tbsp')) return 15;
  if (ingredient.includes('tsp')) return 5;
  if (ingredient.includes('handful')) return 30;
  
  return 50; // Default estimate
}

/**
 * Check if a recipe has adequate fiber sources in its ingredients
 */
export function hasAdequateFiberSource(ingredients: string[], targetFiber: number = 10): {
  hasFiber: boolean;
  detectedFibers: FiberSource[];
  estimatedFiber: number;
  suggestions: FiberSource[];
} {
  const detectedFibers: FiberSource[] = [];
  let estimatedFiber = 0;

  // Check each ingredient against fiber source database
  for (const ingredient of ingredients) {
    const lowerIngredient = ingredient.toLowerCase();
    
    for (const fiberSource of FIBER_SOURCES) {
      if (lowerIngredient.includes(fiberSource.name.toLowerCase())) {
        detectedFibers.push(fiberSource);
        // Estimate fiber contribution (rough calculation)
        const amount = extractAmount(ingredient);
        estimatedFiber += (amount / 100) * fiberSource.fiberPer100g;
        break; // Avoid double counting
      }
    }
  }

  const hasAdequateFiber = estimatedFiber >= targetFiber * 0.7; // At least 70% of target

  // Generate suggestions if fiber is insufficient (following priority system)
  const suggestions: FiberSource[] = [];
  if (!hasAdequateFiber) {
    // Priority 1: Nuts and seeds
    suggestions.push(...FIBER_SOURCES.filter(f => f.category === 'nuts_seeds').slice(0, 2));
    // Priority 2: Greens
    suggestions.push(...FIBER_SOURCES.filter(f => f.category === 'greens').slice(0, 2));
    // Priority 3: Beans (fallback)
    suggestions.push(...FIBER_SOURCES.filter(f => f.category === 'beans_legumes').slice(0, 1));
  }

  return {
    hasFiber: hasAdequateFiber,
    detectedFibers,
    estimatedFiber: Math.round(estimatedFiber * 10) / 10, // Round to 1 decimal
    suggestions
  };
}

/**
 * Enhance recipe with fiber-rich ingredients following priority system
 * Priority: nuts/seeds → greens → beans as fallback
 */
export function enhanceRecipeWithFiber(
  recipeName: string,
  ingredients: string[],
  dietaryTags: string[] = [],
  targetFiber: number = 10
): {
  enhancedIngredients: string[];
  addedFibers: FiberSource[];
  fiberIncrease: number;
} {
  const analysis = hasAdequateFiberSource(ingredients, targetFiber);
  
  if (analysis.hasFiber) {
    return {
      enhancedIngredients: ingredients,
      addedFibers: [],
      fiberIncrease: 0
    };
  }

  const enhancedIngredients = [...ingredients];
  const addedFibers: FiberSource[] = [];
  let fiberIncrease = 0;
  const fiberNeeded = targetFiber - analysis.estimatedFiber;

  // Find compatible fiber sources based on dietary tags
  const compatibleFibers = FIBER_SOURCES.filter(fiber => {
    if (dietaryTags.includes('vegan') || dietaryTags.includes('plant-based')) {
      return fiber.dietaryCompatibility.includes('vegan');
    }
    if (dietaryTags.includes('vegetarian')) {
      return fiber.dietaryCompatibility.includes('vegetarian') || fiber.dietaryCompatibility.includes('vegan');
    }
    if (dietaryTags.includes('gluten-free')) {
      return fiber.dietaryCompatibility.includes('gluten-free');
    }
    return true; // No dietary restrictions
  });

  // Determine recipe type for meal-specific enhancements
  const isBreakfast = recipeName.toLowerCase().includes('breakfast') || 
                     recipeName.toLowerCase().includes('smoothie') ||
                     recipeName.toLowerCase().includes('bowl') ||
                     recipeName.toLowerCase().includes('oats') ||
                     recipeName.toLowerCase().includes('chia') ||
                     recipeName.toLowerCase().includes('porridge');

  const isLunch = recipeName.toLowerCase().includes('lunch') ||
                  recipeName.toLowerCase().includes('salad') ||
                  recipeName.toLowerCase().includes('wrap') ||
                  recipeName.toLowerCase().includes('sandwich');

  const isDinner = recipeName.toLowerCase().includes('dinner') ||
                   recipeName.toLowerCase().includes('curry') ||
                   recipeName.toLowerCase().includes('stew') ||
                   recipeName.toLowerCase().includes('pasta') ||
                   recipeName.toLowerCase().includes('rice');

  // Priority-based fiber enhancement
  let fiberAdded = false;

  // Priority 1: Nuts and seeds (always try first)
  if (!fiberAdded && fiberNeeded > 0) {
    let preferredSeeds: FiberSource[] = [];
    
    if (isBreakfast) {
      // Breakfast: prefer chia seeds, ground flax
      preferredSeeds = compatibleFibers.filter(f => 
        f.category === 'nuts_seeds' && 
        (f.name.includes('chia') || f.name.includes('flax'))
      );
    } else {
      // Lunch/dinner: prefer hemp hearts, sunflower seeds
      preferredSeeds = compatibleFibers.filter(f => 
        f.category === 'nuts_seeds' && 
        (f.name.includes('hemp') || f.name.includes('sunflower') || f.name.includes('almonds'))
      );
    }
    
    // Fallback to any nuts/seeds
    if (preferredSeeds.length === 0) {
      preferredSeeds = compatibleFibers.filter(f => f.category === 'nuts_seeds');
    }
    
    if (preferredSeeds.length > 0) {
      const seed = preferredSeeds[0];
      const amount = Math.min(30, Math.ceil(fiberNeeded / seed.fiberPer100g * 100)); // Max 30g
      
      enhancedIngredients.push(`${amount}g ${seed.name}`);
      addedFibers.push(seed);
      fiberIncrease += (amount / 100) * seed.fiberPer100g;
      fiberAdded = true;
      
      console.log(`🌱 Added ${seed.name} (Priority 1: nuts/seeds) for +${Math.round(fiberIncrease * 10) / 10}g fiber`);
    }
  }

  // Priority 2: Greens (if still need more fiber)
  if (!fiberAdded && fiberNeeded > 3) {
    const greens = compatibleFibers.filter(f => f.category === 'greens' || f.category === 'vegetables');
    
    if (greens.length > 0 && (isLunch || isDinner)) {
      const green = greens[0];
      const amount = Math.min(150, Math.ceil(fiberNeeded / green.fiberPer100g * 100)); // Max 150g
      
      enhancedIngredients.push(`${amount}g ${green.name} (for fiber boost)`);
      addedFibers.push(green);
      fiberIncrease += (amount / 100) * green.fiberPer100g;
      fiberAdded = true;
      
      console.log(`🥬 Added ${green.name} (Priority 2: greens) for +${Math.round(fiberIncrease * 10) / 10}g fiber`);
    }
  }

  // Priority 3: Beans/legumes (last resort for substantial fiber needs)
  if (!fiberAdded && fiberNeeded > 5) {
    const beans = compatibleFibers.filter(f => f.category === 'beans_legumes');
    
    if (beans.length > 0 && (isLunch || isDinner)) {
      const bean = beans[0];
      const amount = Math.min(100, Math.ceil(fiberNeeded / bean.fiberPer100g * 100)); // Max 100g
      
      enhancedIngredients.push(`${amount}g ${bean.name} (cooked, for fiber)`);
      addedFibers.push(bean);
      fiberIncrease += (amount / 100) * bean.fiberPer100g;
      fiberAdded = true;
      
      console.log(`🫘 Added ${bean.name} (Priority 3: beans fallback) for +${Math.round(fiberIncrease * 10) / 10}g fiber`);
    }
  }

  if (addedFibers.length > 0) {
    console.log(`🌾 Enhanced "${recipeName}" with fiber: +${Math.round(fiberIncrease * 10) / 10}g from ${addedFibers.map(f => f.name).join(', ')}`);
  }

  return {
    enhancedIngredients,
    addedFibers,
    fiberIncrease: Math.round(fiberIncrease * 10) / 10
  };
}

/**
 * Validate and enhance all recipes in a meal database to ensure adequate fiber
 */
export function validateAndEnhanceMealsForFiber(meals: any[], targetFiber: number = 10): any[] {
  return meals.map(meal => {
    const analysis = hasAdequateFiberSource(meal.ingredients, targetFiber);
    
    if (!analysis.hasFiber) {
      const enhancement = enhanceRecipeWithFiber(
        meal.name,
        meal.ingredients,
        meal.tags || [],
        targetFiber
      );
      
      if (enhancement.addedFibers.length > 0) {
        return {
          ...meal,
          ingredients: enhancement.enhancedIngredients,
          nutrition: {
            ...meal.nutrition,
            fiber: Math.max(meal.nutrition.fiber || 0, (meal.nutrition.fiber || 0) + enhancement.fiberIncrease)
          }
        };
      }
    }
    
    return meal;
  });
}