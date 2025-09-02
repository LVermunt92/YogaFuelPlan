/**
 * Fiber validation and enhancement system for recipes
 * Targets 10g fiber per meal using priority system: nuts/seeds → greens → beans
 * Balances soluble vs insoluble fiber for optimal health benefits
 */

// Fiber health benefits for different sources
const FIBER_BENEFITS = {
  soluble: [
    "Helps stabilize blood sugar levels",
    "Supports healthy cholesterol levels", 
    "Promotes satiety and weight management",
    "Feeds beneficial gut bacteria",
    "May reduce inflammation"
  ],
  insoluble: [
    "Supports healthy bowel movements",
    "Promotes digestive regularity", 
    "Helps prevent constipation",
    "May reduce risk of colorectal issues",
    "Adds bulk to stool for easier passage"
  ],
  mixed: [
    "Provides comprehensive digestive support",
    "Supports both blood sugar and bowel health",
    "Contributes to overall gut health",
    "May help with weight management"
  ]
};

// Fiber tips for different meal types
const FIBER_TIPS = {
  breakfast: [
    "Start your day with fiber to help control blood sugar throughout the morning",
    "Soluble fiber from seeds helps you feel full until lunch",
    "Ground flax and chia provide omega-3s along with fiber"
  ],
  lunch: [
    "Mid-day fiber helps maintain stable energy levels", 
    "Leafy greens provide insoluble fiber for digestive health",
    "Beans and legumes offer protein plus cholesterol-lowering soluble fiber"
  ],
  dinner: [
    "Evening fiber supports overnight digestive processes",
    "Whole grains provide sustained energy and fiber",
    "Vegetables add fiber while keeping calories in check"
  ],
  gradual: [
    "⚠️ IMPORTANT: Increase fiber gradually over 2-3 weeks to avoid bloating, gas, or digestive discomfort",
    "Start with small amounts and drink plenty of water when increasing fiber intake",
    "If you experience digestive issues, slow down the increase and let your gut adjust"
  ]
};

interface FiberSource {
  name: string;
  fiberPer100g: number; // grams of fiber per 100g
  category: 'nuts_seeds' | 'greens' | 'beans_legumes' | 'whole_grains' | 'vegetables' | 'fruits';
  fiberType: 'soluble' | 'insoluble' | 'mixed'; // Type of fiber for balanced enhancement
  dietaryCompatibility: string[];
  typicalAmount: string; // Typical serving size for enhancement
}

const FIBER_SOURCES: FiberSource[] = [
  // Priority 1: Nuts and Seeds (preferred enhancement)
  { name: 'chia seeds', fiberPer100g: 34.4, category: 'nuts_seeds', fiberType: 'soluble', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '15g' },
  { name: 'ground flaxseed', fiberPer100g: 27.3, category: 'nuts_seeds', fiberType: 'soluble', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '15g' },
  { name: 'hemp hearts', fiberPer100g: 4.0, category: 'nuts_seeds', fiberType: 'insoluble', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '30g' },
  { name: 'psyllium husk', fiberPer100g: 88.0, category: 'nuts_seeds', fiberType: 'soluble', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '5g' },
  { name: 'almonds', fiberPer100g: 12.5, category: 'nuts_seeds', fiberType: 'insoluble', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '30g' },
  { name: 'sunflower seeds', fiberPer100g: 8.6, category: 'nuts_seeds', fiberType: 'insoluble', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '30g' },
  
  // Priority 2: Greens and Vegetables (mostly insoluble)
  { name: 'spinach', fiberPer100g: 2.2, category: 'greens', fiberType: 'insoluble', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '100g' },
  { name: 'kale', fiberPer100g: 3.6, category: 'greens', fiberType: 'insoluble', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '100g' },
  { name: 'broccoli', fiberPer100g: 2.6, category: 'vegetables', fiberType: 'insoluble', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '150g' },
  { name: 'brussels sprouts', fiberPer100g: 3.8, category: 'vegetables', fiberType: 'insoluble', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '150g' },
  { name: 'artichoke hearts', fiberPer100g: 8.6, category: 'vegetables', fiberType: 'mixed', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '100g' },
  
  // Priority 3: Beans and Legumes (high soluble fiber)
  { name: 'black beans', fiberPer100g: 8.7, category: 'beans_legumes', fiberType: 'soluble', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '100g' },
  { name: 'chickpeas', fiberPer100g: 8.0, category: 'beans_legumes', fiberType: 'soluble', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '100g' },
  { name: 'lentils', fiberPer100g: 10.7, category: 'beans_legumes', fiberType: 'soluble', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '100g' },
  { name: 'kidney beans', fiberPer100g: 6.4, category: 'beans_legumes', fiberType: 'soluble', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '100g' },
  
  // Whole Grains (mixed fiber types)
  { name: 'oats', fiberPer100g: 10.6, category: 'whole_grains', fiberType: 'soluble', dietaryCompatibility: ['vegan', 'vegetarian'], typicalAmount: '50g' },
  { name: 'quinoa', fiberPer100g: 2.8, category: 'whole_grains', fiberType: 'insoluble', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '100g' },
  { name: 'buckwheat', fiberPer100g: 10.0, category: 'whole_grains', fiberType: 'insoluble', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '100g' },
  { name: 'brown rice', fiberPer100g: 1.8, category: 'whole_grains', fiberType: 'insoluble', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '100g' },
  
  // Fruits (mixed fiber types)
  { name: 'raspberries', fiberPer100g: 6.5, category: 'fruits', fiberType: 'mixed', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '100g' },
  { name: 'pear', fiberPer100g: 3.1, category: 'fruits', fiberType: 'mixed', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '150g' },
  { name: 'apple', fiberPer100g: 2.4, category: 'fruits', fiberType: 'mixed', dietaryCompatibility: ['vegan', 'vegetarian', 'gluten-free'], typicalAmount: '150g' },
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
 * Check if a recipe has adequate fiber sources with balanced soluble/insoluble types
 */
export function hasAdequateFiberSource(ingredients: string[], targetFiber: number = 10): {
  hasFiber: boolean;
  detectedFibers: FiberSource[];
  estimatedFiber: number;
  solubleFiber: number;
  insolubleFiber: number;
  hasBalancedFiber: boolean;
  suggestions: FiberSource[];
} {
  const detectedFibers: FiberSource[] = [];
  let estimatedFiber = 0;
  let solubleFiber = 0;
  let insolubleFiber = 0;

  // Check each ingredient against fiber source database
  for (const ingredient of ingredients) {
    const lowerIngredient = ingredient.toLowerCase();
    
    for (const fiberSource of FIBER_SOURCES) {
      if (lowerIngredient.includes(fiberSource.name.toLowerCase())) {
        detectedFibers.push(fiberSource);
        // Estimate fiber contribution (rough calculation)
        const amount = extractAmount(ingredient);
        const fiberContribution = (amount / 100) * fiberSource.fiberPer100g;
        estimatedFiber += fiberContribution;
        
        // Track soluble vs insoluble fiber
        if (fiberSource.fiberType === 'soluble') {
          solubleFiber += fiberContribution;
        } else if (fiberSource.fiberType === 'insoluble') {
          insolubleFiber += fiberContribution;
        } else { // mixed type
          solubleFiber += fiberContribution * 0.5;
          insolubleFiber += fiberContribution * 0.5;
        }
        break; // Avoid double counting
      }
    }
  }

  const hasAdequateFiber = estimatedFiber >= targetFiber * 0.7; // At least 70% of target
  
  // Check for balanced fiber types (aim for roughly 40-60% of each type)
  const totalFiber = solubleFiber + insolubleFiber;
  const solublePct = totalFiber > 0 ? (solubleFiber / totalFiber) : 0;
  const hasBalancedFiber = totalFiber >= 3 && solublePct >= 0.25 && solublePct <= 0.75;

  // Generate suggestions if fiber is insufficient or unbalanced
  const suggestions: FiberSource[] = [];
  if (!hasAdequateFiber || !hasBalancedFiber) {
    // Prioritize the fiber type that's lacking
    const needsMoreSoluble = solubleFiber < insolubleFiber || solublePct < 0.4;
    const needsMoreInsoluble = insolubleFiber < solubleFiber || solublePct > 0.6;
    
    if (needsMoreSoluble) {
      // Suggest soluble fiber sources
      suggestions.push(...FIBER_SOURCES.filter(f => f.fiberType === 'soluble').slice(0, 2));
    }
    if (needsMoreInsoluble) {
      // Suggest insoluble fiber sources
      suggestions.push(...FIBER_SOURCES.filter(f => f.fiberType === 'insoluble').slice(0, 2));
    }
    // Add mixed sources as backup
    suggestions.push(...FIBER_SOURCES.filter(f => f.fiberType === 'mixed').slice(0, 1));
  }

  return {
    hasFiber: hasAdequateFiber && hasBalancedFiber,
    detectedFibers,
    estimatedFiber: Math.round(estimatedFiber * 10) / 10,
    solubleFiber: Math.round(solubleFiber * 10) / 10,
    insolubleFiber: Math.round(insolubleFiber * 10) / 10,
    hasBalancedFiber,
    suggestions
  };
}

/**
 * Enhance recipe with fiber-rich ingredients following priority system
 * Priority: nuts/seeds → greens → beans as fallback
 * Balances soluble vs insoluble fiber for optimal health benefits
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
    if (dietaryTags.includes('Vegan') || dietaryTags.includes('Plant-Based')) {
      return fiber.dietaryCompatibility.includes('Vegan');
    }
    if (dietaryTags.includes('Vegetarian')) {
      return fiber.dietaryCompatibility.includes('Vegetarian') || fiber.dietaryCompatibility.includes('Vegan');
    }
    if (dietaryTags.includes('Gluten-Free')) {
      return fiber.dietaryCompatibility.includes('Gluten-Free');
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

  // Analyze current fiber balance to determine what type is needed
  const needsMoreSoluble = analysis.solubleFiber < analysis.insolubleFiber || 
                          (analysis.estimatedFiber > 0 && analysis.solubleFiber / analysis.estimatedFiber < 0.4);
  const needsMoreInsoluble = analysis.insolubleFiber < analysis.solubleFiber || 
                            (analysis.estimatedFiber > 0 && analysis.solubleFiber / analysis.estimatedFiber > 0.6);

  // Priority-based fiber enhancement with balance consideration
  let fiberAdded = false;
  let addedSoluble = 0;
  let addedInsoluble = 0;

  // Priority 1: Nuts and seeds (always try first, but choose type based on balance)
  if (!fiberAdded && fiberNeeded > 0) {
    let preferredSeeds: FiberSource[] = [];
    
    if (isBreakfast) {
      // Breakfast: prefer chia seeds (soluble), ground flax (soluble) for blood sugar stability
      if (needsMoreSoluble) {
        preferredSeeds = compatibleFibers.filter(f => 
          f.category === 'nuts_seeds' && f.fiberType === 'soluble' &&
          (f.name.includes('chia') || f.name.includes('flax'))
        );
      } else {
        // Add hemp hearts (insoluble) for balance
        preferredSeeds = compatibleFibers.filter(f => 
          f.category === 'nuts_seeds' && f.fiberType === 'insoluble' &&
          f.name.includes('hemp')
        );
      }
    } else {
      // Lunch/dinner: choose based on fiber balance needed
      if (needsMoreSoluble) {
        preferredSeeds = compatibleFibers.filter(f => 
          f.category === 'nuts_seeds' && f.fiberType === 'soluble'
        );
      } else {
        preferredSeeds = compatibleFibers.filter(f => 
          f.category === 'nuts_seeds' && f.fiberType === 'insoluble' &&
          (f.name.includes('hemp') || f.name.includes('sunflower') || f.name.includes('almonds'))
        );
      }
    }
    
    // Fallback to any nuts/seeds if specific type not available
    if (preferredSeeds.length === 0) {
      preferredSeeds = compatibleFibers.filter(f => f.category === 'nuts_seeds');
    }
    
    if (preferredSeeds.length > 0) {
      const seed = preferredSeeds[0];
      const amount = Math.min(30, Math.ceil(fiberNeeded / seed.fiberPer100g * 100)); // Max 30g
      const fiberContribution = (amount / 100) * seed.fiberPer100g;
      
      enhancedIngredients.push(`${amount}g ${seed.name}`);
      addedFibers.push(seed);
      fiberIncrease += fiberContribution;
      
      // Track fiber type added
      if (seed.fiberType === 'soluble') {
        addedSoluble += fiberContribution;
      } else if (seed.fiberType === 'insoluble') {
        addedInsoluble += fiberContribution;
      } else {
        addedSoluble += fiberContribution * 0.5;
        addedInsoluble += fiberContribution * 0.5;
      }
      
      fiberAdded = true;
      console.log(`🌱 Added ${seed.name} (${seed.fiberType} fiber) for +${Math.round(fiberIncrease * 10) / 10}g fiber`);
    }
  }

  // Priority 2: Greens and vegetables (mostly insoluble fiber for bowel regularity)
  const stillNeedsFiber = (analysis.estimatedFiber + fiberIncrease) < targetFiber * 0.9;
  const stillNeedsBalance = needsMoreInsoluble && addedInsoluble < 2;
  
  if (!fiberAdded && (stillNeedsFiber || stillNeedsBalance) && fiberNeeded > 3) {
    const greens = compatibleFibers.filter(f => 
      (f.category === 'greens' || f.category === 'vegetables') &&
      (needsMoreInsoluble ? f.fiberType === 'insoluble' : true)
    );
    
    if (greens.length > 0 && (isLunch || isDinner)) {
      const green = greens[0];
      const amount = Math.min(150, Math.ceil((fiberNeeded - fiberIncrease) / green.fiberPer100g * 100)); // Max 150g
      const fiberContribution = (amount / 100) * green.fiberPer100g;
      
      enhancedIngredients.push(`${amount}g ${green.name} (for fiber boost)`);
      addedFibers.push(green);
      fiberIncrease += fiberContribution;
      
      if (green.fiberType === 'insoluble') {
        addedInsoluble += fiberContribution;
      }
      
      fiberAdded = true;
      console.log(`🥬 Added ${green.name} (${green.fiberType} fiber) for +${Math.round(fiberIncrease * 10) / 10}g fiber`);
    }
  }

  // Priority 3: Beans/legumes (high soluble fiber for cholesterol and blood sugar)
  const finallyNeedsFiber = (analysis.estimatedFiber + fiberIncrease) < targetFiber * 0.8;
  const finallyNeedsBalance = needsMoreSoluble && addedSoluble < 3;
  
  if (!fiberAdded && (finallyNeedsFiber || finallyNeedsBalance) && fiberNeeded > 5) {
    const beans = compatibleFibers.filter(f => 
      f.category === 'beans_legumes' &&
      f.fiberType === 'soluble' // Beans are excellent soluble fiber sources
    );
    
    if (beans.length > 0 && (isLunch || isDinner)) {
      const bean = beans[0];
      const amount = Math.min(100, Math.ceil((fiberNeeded - fiberIncrease) / bean.fiberPer100g * 100)); // Max 100g
      const fiberContribution = (amount / 100) * bean.fiberPer100g;
      
      enhancedIngredients.push(`${amount}g ${bean.name} (cooked, for soluble fiber)`);
      addedFibers.push(bean);
      fiberIncrease += fiberContribution;
      addedSoluble += fiberContribution; // Beans are primarily soluble
      fiberAdded = true;
      
      console.log(`🫘 Added ${bean.name} (soluble fiber for cholesterol & blood sugar) for +${Math.round(fiberIncrease * 10) / 10}g fiber`);
    }
  }

  if (addedFibers.length > 0) {
    const finalSoluble = analysis.solubleFiber + addedSoluble;
    const finalInsoluble = analysis.insolubleFiber + addedInsoluble;
    const finalTotal = finalSoluble + finalInsoluble;
    const solublePct = finalTotal > 0 ? Math.round((finalSoluble / finalTotal) * 100) : 0;
    
    console.log(`🌾 Enhanced "${recipeName}" with balanced fiber: +${Math.round(fiberIncrease * 10) / 10}g from ${addedFibers.map(f => f.name).join(', ')}`);
    console.log(`📊 Fiber balance: ${Math.round(finalSoluble * 10) / 10}g soluble (${solublePct}%) + ${Math.round(finalInsoluble * 10) / 10}g insoluble (${100 - solublePct}%)`);
  }

  // Generate fiber-related tips and benefits for enhanced recipes
  const fiberTips: string[] = [];
  const fiberBenefits: string[] = [];
  
  if (addedFibers.length > 0) {
    const finalSoluble = analysis.solubleFiber + addedSoluble;
    const finalInsoluble = analysis.insolubleFiber + addedInsoluble;
    const finalTotal = finalSoluble + finalInsoluble;
    
    // Add specific benefits based on fiber types enhanced
    const uniqueFiberTypes = Array.from(new Set(addedFibers.map(f => f.fiberType)));
    uniqueFiberTypes.forEach(type => {
      if (type === 'soluble') {
        fiberBenefits.push(FIBER_BENEFITS.soluble[0]); // Blood sugar
        fiberBenefits.push(FIBER_BENEFITS.soluble[1]); // Cholesterol
      } else if (type === 'insoluble') {
        fiberBenefits.push(FIBER_BENEFITS.insoluble[0]); // Bowel movements
        fiberBenefits.push(FIBER_BENEFITS.insoluble[1]); // Regularity
      } else {
        fiberBenefits.push(FIBER_BENEFITS.mixed[0]); // Comprehensive support
      }
    });
    
    // Add meal-specific tip
    if (isBreakfast) {
      fiberTips.push(FIBER_TIPS.breakfast[0]);
    } else if (isLunch) {
      fiberTips.push(FIBER_TIPS.lunch[0]);
    } else if (isDinner) {
      fiberTips.push(FIBER_TIPS.dinner[0]);
    }
    
    // Add enhancement-specific tip
    const addedIngredients = addedFibers.map(f => f.name).join(', ');
    fiberTips.push(`Enhanced with ${addedIngredients} for ${Math.round(fiberIncrease * 10) / 10}g additional fiber`);
    
    // Add gradual transition warning for fiber increases > 5g
    if (fiberIncrease >= 5) {
      fiberTips.push(FIBER_TIPS.gradual[0]); // Gradual increase warning
    }
    
    // Add balance tip if well-balanced
    const solublePct = finalTotal > 0 ? finalSoluble / finalTotal : 0;
    if (solublePct >= 0.3 && solublePct <= 0.7) {
      fiberTips.push("This recipe provides a balanced mix of soluble and insoluble fiber for optimal digestive health");
    }
  }

  return {
    enhancedIngredients,
    addedFibers,
    fiberIncrease: Math.round(fiberIncrease * 10) / 10,
    fiberTips,
    fiberBenefits
  } as {
    enhancedIngredients: string[];
    addedFibers: FiberSource[];
    fiberIncrease: number;
    fiberTips: string[];
    fiberBenefits: string[];
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
        // Add fiber benefits to existing vegetable content benefits
        const existingBenefits = meal.vegetableContent?.benefits || [];
        const newBenefits = [...existingBenefits, ...(enhancement as any).fiberBenefits];
        
        // Add fiber tips to existing recipe tips
        const existingTips = meal.recipe?.tips || [];
        const newTips = [...existingTips, ...(enhancement as any).fiberTips];
        
        return {
          ...meal,
          ingredients: enhancement.enhancedIngredients,
          nutrition: {
            ...meal.nutrition,
            fiber: Math.max(meal.nutrition.fiber || 0, (meal.nutrition.fiber || 0) + enhancement.fiberIncrease)
          },
          vegetableContent: {
            ...meal.vegetableContent,
            benefits: newBenefits
          },
          recipe: {
            ...meal.recipe,
            tips: newTips
          }
        };
      }
    }
    
    return meal;
  });
}