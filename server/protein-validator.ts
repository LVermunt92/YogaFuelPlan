/**
 * Protein Source Validation and Enhancement System
 * Ensures every recipe has adequate protein sources automatically
 */

export interface ProteinSource {
  name: string;
  proteinPer100g: number;
  category: 'legumes' | 'nuts_seeds' | 'dairy' | 'meat' | 'seafood' | 'grains' | 'vegetables';
  dietaryCompatibility: string[];
}

// Comprehensive protein source database
export const PROTEIN_SOURCES: ProteinSource[] = [
  // Legumes & Beans
  { name: 'red lentils', proteinPer100g: 24, category: 'legumes', dietaryCompatibility: ['vegetarian', 'vegan', 'plant-based', 'gluten-free'] },
  { name: 'green lentils', proteinPer100g: 25, category: 'legumes', dietaryCompatibility: ['vegetarian', 'vegan', 'plant-based', 'gluten-free'] },
  { name: 'chickpeas', proteinPer100g: 19, category: 'legumes', dietaryCompatibility: ['vegetarian', 'vegan', 'plant-based', 'gluten-free'] },
  { name: 'black beans', proteinPer100g: 22, category: 'legumes', dietaryCompatibility: ['vegetarian', 'vegan', 'plant-based', 'gluten-free'] },
  { name: 'white cannellini beans', proteinPer100g: 23, category: 'legumes', dietaryCompatibility: ['vegetarian', 'vegan', 'plant-based', 'gluten-free'] },
  { name: 'edamame beans', proteinPer100g: 11, category: 'legumes', dietaryCompatibility: ['vegetarian', 'vegan', 'plant-based', 'gluten-free'] },
  { name: 'firm tofu', proteinPer100g: 15, category: 'legumes', dietaryCompatibility: ['vegetarian', 'vegan', 'plant-based', 'gluten-free'] },
  { name: 'tempeh', proteinPer100g: 19, category: 'legumes', dietaryCompatibility: ['vegetarian', 'vegan', 'plant-based', 'gluten-free'] },

  // Nuts & Seeds
  { name: 'hemp hearts', proteinPer100g: 31, category: 'nuts_seeds', dietaryCompatibility: ['vegetarian', 'vegan', 'plant-based', 'gluten-free'] },
  { name: 'pumpkin seeds', proteinPer100g: 19, category: 'nuts_seeds', dietaryCompatibility: ['vegetarian', 'vegan', 'plant-based', 'gluten-free'] },
  { name: 'almonds', proteinPer100g: 21, category: 'nuts_seeds', dietaryCompatibility: ['vegetarian', 'vegan', 'plant-based', 'gluten-free'] },
  { name: 'walnuts', proteinPer100g: 15, category: 'nuts_seeds', dietaryCompatibility: ['vegetarian', 'vegan', 'plant-based', 'gluten-free'] },
  { name: 'cashews', proteinPer100g: 18, category: 'nuts_seeds', dietaryCompatibility: ['vegetarian', 'vegan', 'plant-based', 'gluten-free'] },
  { name: 'tahini', proteinPer100g: 17, category: 'nuts_seeds', dietaryCompatibility: ['vegetarian', 'vegan', 'plant-based', 'gluten-free'] },
  { name: 'almond butter', proteinPer100g: 21, category: 'nuts_seeds', dietaryCompatibility: ['vegetarian', 'vegan', 'plant-based', 'gluten-free'] },

  // Dairy
  { name: 'Greek yogurt', proteinPer100g: 10, category: 'dairy', dietaryCompatibility: ['vegetarian'] },
  { name: 'cottage cheese', proteinPer100g: 11, category: 'dairy', dietaryCompatibility: ['vegetarian'] },
  { name: 'ricotta cheese', proteinPer100g: 11, category: 'dairy', dietaryCompatibility: ['vegetarian'] },
  { name: 'parmesan cheese', proteinPer100g: 35, category: 'dairy', dietaryCompatibility: ['vegetarian'] },
  { name: 'mozzarella cheese', proteinPer100g: 22, category: 'dairy', dietaryCompatibility: ['vegetarian'] },
  { name: 'feta cheese', proteinPer100g: 14, category: 'dairy', dietaryCompatibility: ['vegetarian'] },

  // Protein powders & supplements
  { name: 'plant protein powder', proteinPer100g: 80, category: 'nuts_seeds', dietaryCompatibility: ['vegetarian', 'vegan', 'plant-based', 'gluten-free'] },
  { name: 'pea protein powder', proteinPer100g: 85, category: 'legumes', dietaryCompatibility: ['vegetarian', 'vegan', 'plant-based', 'gluten-free'] },

  // Grains with protein
  { name: 'quinoa', proteinPer100g: 14, category: 'grains', dietaryCompatibility: ['vegetarian', 'vegan', 'plant-based', 'gluten-free'] },
  { name: 'buckwheat', proteinPer100g: 13, category: 'grains', dietaryCompatibility: ['vegetarian', 'vegan', 'plant-based', 'gluten-free'] },

  // Meat & seafood (for non-vegetarian recipes)
  { name: 'chicken breast', proteinPer100g: 31, category: 'meat', dietaryCompatibility: [] },
  { name: 'ground turkey', proteinPer100g: 27, category: 'meat', dietaryCompatibility: [] },
  { name: 'salmon', proteinPer100g: 25, category: 'seafood', dietaryCompatibility: [] },
  { name: 'tuna', proteinPer100g: 30, category: 'seafood', dietaryCompatibility: [] },
];

/**
 * Check if a recipe has adequate protein sources in its ingredients
 */
export function hasAdequateProteinSource(ingredients: string[], targetProtein: number = 20): {
  hasProtein: boolean;
  detectedProteins: ProteinSource[];
  estimatedProtein: number;
  suggestions: ProteinSource[];
} {
  const detectedProteins: ProteinSource[] = [];
  let estimatedProtein = 0;

  // Check each ingredient against protein source database
  for (const ingredient of ingredients) {
    const lowerIngredient = ingredient.toLowerCase();
    
    for (const proteinSource of PROTEIN_SOURCES) {
      if (lowerIngredient.includes(proteinSource.name.toLowerCase())) {
        detectedProteins.push(proteinSource);
        // Estimate protein contribution (rough calculation)
        const amount = extractAmount(ingredient);
        estimatedProtein += (amount / 100) * proteinSource.proteinPer100g;
        break; // Avoid double counting
      }
    }
  }

  const hasAdequateProtein = estimatedProtein >= targetProtein * 0.7; // At least 70% of target

  // Generate suggestions if protein is insufficient
  const suggestions: ProteinSource[] = [];
  if (!hasAdequateProtein) {
    suggestions.push(
      ...PROTEIN_SOURCES
        .filter(p => p.category === 'legumes' || p.category === 'nuts_seeds')
        .slice(0, 3)
    );
  }

  return {
    hasProtein: hasAdequateProtein,
    detectedProteins,
    estimatedProtein: Math.round(estimatedProtein),
    suggestions
  };
}

/**
 * Extract amount from ingredient string (rough estimation)
 */
function extractAmount(ingredient: string): number {
  const match = ingredient.match(/(\d+)g/);
  if (match) {
    return parseInt(match[1]);
  }
  
  // Default amounts for common ingredient patterns
  if (ingredient.includes('tbsp') || ingredient.includes('tablespoon')) return 15;
  if (ingredient.includes('tsp') || ingredient.includes('teaspoon')) return 5;
  if (ingredient.includes('cup')) return 120;
  
  return 100; // Default assumption
}

/**
 * Enhance a recipe by adding appropriate protein sources
 */
export function enhanceRecipeWithProtein(
  recipeName: string,
  ingredients: string[],
  dietaryTags: string[] = [],
  targetProtein: number = 20
): {
  enhancedIngredients: string[];
  addedProteins: ProteinSource[];
  proteinIncrease: number;
} {
  const analysis = hasAdequateProteinSource(ingredients, targetProtein);
  
  if (analysis.hasProtein) {
    return {
      enhancedIngredients: ingredients,
      addedProteins: [],
      proteinIncrease: 0
    };
  }

  const enhancedIngredients = [...ingredients];
  const addedProteins: ProteinSource[] = [];
  let proteinIncrease = 0;

  // Find compatible protein sources based on dietary tags
  const compatibleProteins = PROTEIN_SOURCES.filter(protein => {
    if (dietaryTags.includes('vegan') || dietaryTags.includes('plant-based')) {
      return protein.dietaryCompatibility.includes('vegan') || protein.dietaryCompatibility.includes('plant-based');
    }
    if (dietaryTags.includes('vegetarian')) {
      return protein.dietaryCompatibility.includes('vegetarian') || protein.dietaryCompatibility.includes('vegan');
    }
    return true; // No dietary restrictions
  });

  // Add protein based on recipe type
  const isBreakfast = recipeName.toLowerCase().includes('breakfast') || 
                     recipeName.toLowerCase().includes('smoothie') ||
                     recipeName.toLowerCase().includes('bowl') ||
                     recipeName.toLowerCase().includes('oats') ||
                     recipeName.toLowerCase().includes('chia');

  const isSoup = recipeName.toLowerCase().includes('soup') ||
                 recipeName.toLowerCase().includes('broth');

  const isStirfry = recipeName.toLowerCase().includes('stir-fry') ||
                    recipeName.toLowerCase().includes('stir fry');

  const isSalad = recipeName.toLowerCase().includes('salad');

  // Select appropriate protein enhancement
  if (isBreakfast) {
    // Add protein powder or nuts/seeds for breakfast
    const proteinPowder = compatibleProteins.find(p => p.name.includes('protein powder'));
    const nuts = compatibleProteins.find(p => p.name === 'hemp hearts' || p.name === 'almonds');
    
    if (proteinPowder && targetProtein >= 25) {
      const amount = Math.ceil((targetProtein - analysis.estimatedProtein) / proteinPowder.proteinPer100g * 100);
      enhancedIngredients.push(`${Math.min(amount, 30)}g ${proteinPowder.name}`);
      addedProteins.push(proteinPowder);
      proteinIncrease += (amount / 100) * proteinPowder.proteinPer100g;
    } else if (nuts) {
      enhancedIngredients.push(`30g ${nuts.name}`);
      addedProteins.push(nuts);
      proteinIncrease += 9; // Approximate
    }
  } else if (isSoup) {
    // Add lentils or beans to soups
    const lentils = compatibleProteins.find(p => p.name.includes('lentils'));
    if (lentils) {
      const amount = Math.min(100, Math.ceil((targetProtein - analysis.estimatedProtein) / lentils.proteinPer100g * 100));
      enhancedIngredients.push(`${amount}g ${lentils.name} (dried)`);
      addedProteins.push(lentils);
      proteinIncrease += (amount / 100) * lentils.proteinPer100g;
    }
  } else if (isStirfry) {
    // Add tofu or tempeh to stir-fries
    const tofu = compatibleProteins.find(p => p.name === 'firm tofu');
    if (tofu) {
      const amount = Math.min(200, Math.ceil((targetProtein - analysis.estimatedProtein) / tofu.proteinPer100g * 100));
      enhancedIngredients.push(`${amount}g ${tofu.name}`);
      addedProteins.push(tofu);
      proteinIncrease += (amount / 100) * tofu.proteinPer100g;
    }
  } else if (isSalad) {
    // Add beans or seeds to salads
    const edamame = compatibleProteins.find(p => p.name === 'edamame beans');
    const seeds = compatibleProteins.find(p => p.name === 'pumpkin seeds');
    
    if (edamame) {
      enhancedIngredients.push(`80g ${edamame.name}`);
      addedProteins.push(edamame);
      proteinIncrease += 9;
    }
    if (seeds) {
      enhancedIngredients.push(`30g ${seeds.name}`);
      addedProteins.push(seeds);
      proteinIncrease += 6;
    }
  } else {
    // General enhancement - add versatile protein
    const beans = compatibleProteins.find(p => p.name === 'white cannellini beans' || p.name === 'chickpeas');
    if (beans) {
      const amount = Math.min(120, Math.ceil((targetProtein - analysis.estimatedProtein) / beans.proteinPer100g * 100));
      enhancedIngredients.push(`${amount}g ${beans.name} (cooked)`);
      addedProteins.push(beans);
      proteinIncrease += (amount / 100) * beans.proteinPer100g;
    }
  }

  console.log(`🥩 Enhanced "${recipeName}" with protein: +${Math.round(proteinIncrease)}g from ${addedProteins.map(p => p.name).join(', ')}`);

  return {
    enhancedIngredients,
    addedProteins,
    proteinIncrease: Math.round(proteinIncrease)
  };
}

/**
 * Validate and enhance all recipes in a meal database to ensure adequate protein
 */
export function validateAndEnhanceMealDatabase(meals: any[]): any[] {
  return meals.map(meal => {
    const analysis = hasAdequateProteinSource(meal.ingredients, meal.nutrition.protein);
    
    if (!analysis.hasProtein) {
      console.log(`⚠️ Low protein detected in "${meal.name}": ${analysis.estimatedProtein}g (target: ${meal.nutrition.protein}g)`);
      
      const enhancement = enhanceRecipeWithProtein(
        meal.name,
        meal.ingredients,
        meal.tags,
        meal.nutrition.protein
      );
      
      if (enhancement.addedProteins.length > 0) {
        return {
          ...meal,
          id: meal.id, // Explicitly preserve ID
          ingredients: enhancement.enhancedIngredients,
          nutrition: {
            ...meal.nutrition,
            protein: Math.max(meal.nutrition.protein, meal.nutrition.protein + enhancement.proteinIncrease)
          }
        };
      }
    }
    
    return meal;
  });
}