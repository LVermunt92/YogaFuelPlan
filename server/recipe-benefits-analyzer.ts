/**
 * Comprehensive Recipe Benefits Analyzer
 * Generates health benefits for entire recipes based on ingredients, nutrition, and components
 */

interface RecipeBenefits {
  health: string[];
  longevity: string[];
  performance: string[];
  wellness: string[];
}

interface NutritionInfo {
  protein?: number;
  calories?: number;
  carbohydrates?: number;
  fats?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

// Comprehensive ingredient benefits database
const INGREDIENT_BENEFITS = {
  // Protein Sources
  'chicken': ['Complete protein for muscle maintenance', 'B vitamins for energy metabolism'],
  'salmon': ['Omega-3 fatty acids for heart health', 'High-quality protein for muscle recovery'],
  'tuna': ['Lean protein for weight management', 'Selenium for antioxidant protection'],
  'eggs': ['Complete amino acid profile', 'Choline for brain function'],
  'tofu': ['Plant-based complete protein', 'Isoflavones for hormonal balance'],
  'tempeh': ['Fermented protein for gut health', 'Probiotics for digestive wellness'],
  'lentils': ['Plant protein with fiber', 'Folate for cellular health', 'Iron for energy'],
  'chickpeas': ['Protein and fiber combination', 'Magnesium for muscle function'],
  'quinoa': ['Complete protein grain', 'All essential amino acids'],
  'hemp hearts': ['Omega-3 and omega-6 balance', 'Magnesium for relaxation'],
  
  // Healthy Fats
  'avocado': ['Monounsaturated fats for heart health', 'Potassium for blood pressure'],
  'olive oil': ['Anti-inflammatory compounds', 'Vitamin E for cell protection'],
  'nuts': ['Healthy fats and protein', 'Vitamin E for antioxidant protection'],
  'seeds': ['Essential fatty acids', 'Mineral density for bone health'],
  'tahini': ['Calcium from sesame seeds', 'Healthy fats for satiety'],
  
  // Vegetables & Fruits
  'spinach': ['Iron for energy', 'Folate for cellular health', 'Vitamin K for bone health'],
  'kale': ['Vitamin C for immune support', 'Calcium for bone strength'],
  'broccoli': ['Vitamin C and fiber', 'Sulforaphane for detoxification'],
  'sweet potato': ['Beta-carotene for eye health', 'Complex carbs for sustained energy'],
  'bell pepper': ['Vitamin C for collagen production', 'Antioxidants for cellular protection'],
  'tomato': ['Lycopene for heart health', 'Vitamin C for immune function'],
  'carrot': ['Beta-carotene for vision', 'Fiber for digestive health'],
  'garlic': ['Allicin for immune support', 'Anti-inflammatory properties'],
  'ginger': ['Anti-inflammatory compounds', 'Digestive support'],
  'berries': ['Antioxidants for brain health', 'Vitamin C for immune support'],
  'banana': ['Potassium for heart health', 'Natural energy from carbohydrates'],
  
  // Whole Grains
  'oats': ['Beta-glucan fiber for cholesterol', 'Sustained energy release'],
  'brown rice': ['Complex carbohydrates', 'B vitamins for energy metabolism'],
  
  // Legumes
  'beans': ['Plant protein and fiber', 'Resistant starch for gut health'],
  'peas': ['Plant protein and fiber', 'Vitamin K for bone health'],
  
  // Herbs & Spices
  'turmeric': ['Curcumin for anti-inflammation', 'Antioxidant properties'],
  'cinnamon': ['Blood sugar regulation', 'Anti-inflammatory compounds'],
  'basil': ['Anti-inflammatory properties', 'Vitamin K for bone health'],
  'oregano': ['Antioxidant compounds', 'Anti-microbial properties']
};

// Nutritional thresholds for benefit triggers
const NUTRITION_THRESHOLDS = {
  highProtein: 20, // grams
  highFiber: 8, // grams  
  moderateFats: 15, // grams
  lowSodium: 600, // mg
  highCalcium: 200, // mg (estimated from ingredients)
  highIron: 3 // mg (estimated from ingredients)
};

/**
 * Analyze ingredients and extract potential benefits
 */
function analyzeIngredientBenefits(ingredients: string[]): string[] {
  const benefits: string[] = [];
  
  for (const ingredient of ingredients) {
    const lowerIngredient = ingredient.toLowerCase();
    
    // Check each benefit category
    for (const [food, foodBenefits] of Object.entries(INGREDIENT_BENEFITS)) {
      if (lowerIngredient.includes(food)) {
        benefits.push(...foodBenefits);
      }
    }
    
    // Additional pattern matching for common ingredient patterns
    if (lowerIngredient.includes('greek yogurt') || lowerIngredient.includes('yogurt')) {
      benefits.push('Probiotics for gut health');
      benefits.push('Protein and calcium combination');
    }
    
    if (lowerIngredient.includes('cottage cheese')) {
      benefits.push('High protein for muscle maintenance');
      benefits.push('Casein protein for sustained amino acids');
    }
    
    if (lowerIngredient.includes('coconut')) {
      benefits.push('Medium-chain fatty acids for energy');
      benefits.push('Natural antimicrobial properties');
    }
  }
  
  // Remove duplicates
  return Array.from(new Set(benefits));
}

/**
 * Analyze nutrition profile and generate benefits
 */
function analyzeNutritionBenefits(nutrition: NutritionInfo): string[] {
  const benefits: string[] = [];
  
  if ((nutrition.protein || 0) >= NUTRITION_THRESHOLDS.highProtein) {
    benefits.push('High protein supports muscle maintenance and satiety');
  }
  
  if ((nutrition.fiber || 0) >= NUTRITION_THRESHOLDS.highFiber) {
    benefits.push('High fiber promotes digestive health and blood sugar stability');
  }
  
  if ((nutrition.fats || 0) >= NUTRITION_THRESHOLDS.moderateFats) {
    benefits.push('Healthy fats support hormone production and nutrient absorption');
  }
  
  if ((nutrition.sodium || 0) <= NUTRITION_THRESHOLDS.lowSodium) {
    benefits.push('Low sodium supports healthy blood pressure');
  }
  
  // Calculate protein-to-calorie ratio for additional benefits
  const proteinCalories = (nutrition.protein || 0) * 4;
  const totalCalories = nutrition.calories || 1;
  const proteinRatio = proteinCalories / totalCalories;
  
  if (proteinRatio > 0.25) {
    benefits.push('High protein density supports weight management');
  }
  
  return benefits;
}

/**
 * Analyze dietary tags for additional benefits
 */
function analyzeDietaryBenefits(tags: string[]): string[] {
  const benefits: string[] = [];
  
  if (tags.includes('gluten-free')) {
    benefits.push('Suitable for gluten sensitivity and celiac disease');
  }
  
  if (tags.includes('lactose-free')) {
    benefits.push('Gentle on lactose-sensitive digestive systems');
  }
  
  if (tags.includes('vegan')) {
    benefits.push('Plant-based nutrition supports environmental sustainability');
  }
  
  if (tags.includes('vegetarian')) {
    benefits.push('Vegetarian protein sources with lower environmental impact');
  }
  
  if (tags.includes('keto')) {
    benefits.push('Low carb approach supports ketosis and fat burning');
  }
  
  if (tags.includes('high-fiber')) {
    benefits.push('Supports healthy cholesterol levels and blood sugar control');
  }
  
  if (tags.includes('longevity')) {
    benefits.push('Nutrient-dense ingredients support healthy aging');
  }
  
  return benefits;
}

/**
 * Generate comprehensive recipe benefits covering nutrition, ingredients, and dietary aspects
 */
export function generateRecipeBenefits(
  ingredients: string[],
  nutrition: NutritionInfo,
  tags: string[]
): RecipeBenefits {
  
  const ingredientBenefits = analyzeIngredientBenefits(ingredients);
  const nutritionBenefits = analyzeNutritionBenefits(nutrition);
  const dietaryBenefits = analyzeDietaryBenefits(tags);
  
  // Categorize benefits
  const health: string[] = [];
  const longevity: string[] = [];
  const performance: string[] = [];
  const wellness: string[] = [];
  
  // Categorize ingredient benefits
  ingredientBenefits.forEach(benefit => {
    if (benefit.includes('immune') || benefit.includes('antioxidant') || benefit.includes('vitamin')) {
      health.push(benefit);
    } else if (benefit.includes('anti-inflammatory') || benefit.includes('cellular') || benefit.includes('aging')) {
      longevity.push(benefit);
    } else if (benefit.includes('energy') || benefit.includes('muscle') || benefit.includes('protein')) {
      performance.push(benefit);
    } else {
      wellness.push(benefit);
    }
  });
  
  // Categorize nutrition benefits
  nutritionBenefits.forEach(benefit => {
    if (benefit.includes('blood pressure') || benefit.includes('cholesterol') || benefit.includes('blood sugar')) {
      health.push(benefit);
    } else if (benefit.includes('weight') || benefit.includes('muscle') || benefit.includes('satiety')) {
      performance.push(benefit);
    } else {
      wellness.push(benefit);
    }
  });
  
  // Add dietary benefits to appropriate categories
  dietaryBenefits.forEach(benefit => {
    if (benefit.includes('environmental') || benefit.includes('sustainability')) {
      longevity.push(benefit);
    } else if (benefit.includes('sensitivity') || benefit.includes('digestive')) {
      health.push(benefit);
    } else if (benefit.includes('ketosis') || benefit.includes('fat burning')) {
      performance.push(benefit);
    } else {
      wellness.push(benefit);
    }
  });
  
  return {
    health: Array.from(new Set(health)), // Remove duplicates
    longevity: Array.from(new Set(longevity)),
    performance: Array.from(new Set(performance)),
    wellness: Array.from(new Set(wellness))
  };
}

/**
 * Generate a combined list of top benefits for display
 */
export function getTopRecipeBenefits(
  ingredients: string[],
  nutrition: NutritionInfo,
  tags: string[],
  maxBenefits: number = 6
): string[] {
  
  const benefits = generateRecipeBenefits(ingredients, nutrition, tags);
  
  // Combine all benefits and prioritize by category
  const allBenefits: string[] = [
    ...benefits.health,
    ...benefits.performance,
    ...benefits.longevity,
    ...benefits.wellness
  ];
  
  // Remove duplicates and limit to maxBenefits
  const uniqueBenefits = Array.from(new Set(allBenefits));
  return uniqueBenefits.slice(0, maxBenefits);
}