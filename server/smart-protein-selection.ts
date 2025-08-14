import { type MealOption } from "./nutrition-enhanced";

/**
 * Smart protein prioritization system
 * Intelligently enhances meals with good protein content without requiring strict "high-protein" tags
 */

interface ProteinThresholds {
  excellent: number;  // 18+ grams
  good: number;       // 12+ grams  
  moderate: number;   // 8+ grams
}

const PROTEIN_THRESHOLDS: ProteinThresholds = {
  excellent: 18,
  good: 12,
  moderate: 8
};

/**
 * Score a meal based on its protein content
 */
function scoreProteinContent(protein: number): number {
  if (protein >= PROTEIN_THRESHOLDS.excellent) return 4; // Excellent protein
  if (protein >= PROTEIN_THRESHOLDS.good) return 3;      // Good protein  
  if (protein >= PROTEIN_THRESHOLDS.moderate) return 2;  // Moderate protein
  return 1; // Lower protein - still valid but deprioritized
}

/**
 * Create protein-enhanced meal with smart additions
 */
function enhanceWithProtein(meal: MealOption): MealOption {
  const currentProtein = meal.nutrition.protein;
  
  // If already has excellent protein, return as-is
  if (currentProtein >= PROTEIN_THRESHOLDS.excellent) {
    return meal;
  }
  
  // Smart protein enhancement suggestions for vegetarian meals
  const proteinBoosts: { [key: string]: { protein: number; ingredient: string; instruction: string } } = {
    // Bean/legume dishes - add seeds/nuts
    'bean': { protein: 5, ingredient: '2 tbsp hemp hearts', instruction: 'Sprinkle hemp hearts on top for extra protein' },
    'lentil': { protein: 4, ingredient: '15g pumpkin seeds', instruction: 'Top with toasted pumpkin seeds' },
    'chickpea': { protein: 3, ingredient: '1 tbsp tahini', instruction: 'Drizzle with tahini for creamy protein boost' },
    
    // Grain dishes - add protein-rich ingredients  
    'quinoa': { protein: 4, ingredient: '30ml Greek yogurt', instruction: 'Serve with a dollop of Greek yogurt' },
    'oats': { protein: 6, ingredient: '1 tbsp almond butter', instruction: 'Stir in almond butter for protein and richness' },
    'rice': { protein: 5, ingredient: '60g edamame', instruction: 'Mix in shelled edamame for protein and color' },
    
    // Vegetable dishes - add protein sources
    'vegetable': { protein: 8, ingredient: '100g firm tofu', instruction: 'Add cubed tofu for complete protein' },
    'salad': { protein: 6, ingredient: '30g mixed nuts', instruction: 'Top with mixed nuts and seeds' },
    'soup': { protein: 5, ingredient: '2 tbsp nutritional yeast', instruction: 'Stir in nutritional yeast for cheesy protein boost' },
    
    // Default boost for any meal
    'default': { protein: 4, ingredient: '2 tbsp ground flaxseed', instruction: 'Add ground flaxseed for omega-3s and protein' }
  };
  
  // Find appropriate protein boost
  let boost = proteinBoosts['default'];
  for (const [key, value] of Object.entries(proteinBoosts)) {
    if (meal.name.toLowerCase().includes(key) || 
        meal.ingredients.some(ing => ing.toLowerCase().includes(key))) {
      boost = value;
      break;
    }
  }
  
  // Only enhance if it would bring us to "good" protein level
  const potentialProtein = currentProtein + boost.protein;
  if (potentialProtein < PROTEIN_THRESHOLDS.good) {
    return meal; // Not worth the enhancement
  }
  
  // Create enhanced meal
  const enhancedMeal: MealOption = {
    ...meal,
    name: `${meal.name} (protein-enhanced)`,
    nutrition: {
      ...meal.nutrition,
      protein: potentialProtein,
      calories: meal.nutrition.calories + Math.round(boost.protein * 4), // Approximate calorie increase
    },
    ingredients: [...meal.ingredients, boost.ingredient],
    recipe: meal.recipe ? {
      ...meal.recipe,
      instructions: [...meal.recipe.instructions, boost.instruction],
      tips: [...(meal.recipe.tips || []), `Protein boost adds ${boost.protein}g protein per serving`]
    } : {
      instructions: [boost.instruction],
      tips: [`Protein boost adds ${boost.protein}g protein per serving`]
    }
  };
  
  return enhancedMeal;
}

/**
 * Sort meals by protein content while maintaining variety
 */
export function prioritizeByProteinContent(meals: MealOption[]): MealOption[] {
  // Score each meal by protein content
  const scoredMeals = meals.map(meal => ({
    meal: meal,
    proteinScore: scoreProteinContent(meal.nutrition.protein)
  }));
  
  // Sort by protein score (highest first) but maintain some randomness within each tier
  scoredMeals.sort((a, b) => {
    if (a.proteinScore !== b.proteinScore) {
      return b.proteinScore - a.proteinScore;
    }
    // Within same protein tier, maintain variety by sorting by name
    return a.meal.name.localeCompare(b.meal.name);
  });
  
  return scoredMeals.map(item => item.meal);
}

/**
 * Smart meal selection that balances protein content with variety
 */
export function selectProteinOptimizedMeals(
  availableMeals: MealOption[], 
  count: number,
  enhanceWithProteinIfNeeded: boolean = true
): MealOption[] {
  if (availableMeals.length === 0) return [];
  
  // Enhance lower-protein meals if requested
  const processedMeals = enhanceWithProteinIfNeeded 
    ? availableMeals.map(enhanceWithProtein)
    : availableMeals;
  
  // Prioritize by protein content
  const prioritizedMeals = prioritizeByProteinContent(processedMeals);
  
  // Select top meals ensuring we get good protein across the selection
  const selected: MealOption[] = [];
  const excellentProtein = prioritizedMeals.filter(m => m.nutrition.protein >= PROTEIN_THRESHOLDS.excellent);
  const goodProtein = prioritizedMeals.filter(m => 
    m.nutrition.protein >= PROTEIN_THRESHOLDS.good && 
    m.nutrition.protein < PROTEIN_THRESHOLDS.excellent
  );
  const moderateProtein = prioritizedMeals.filter(m => 
    m.nutrition.protein >= PROTEIN_THRESHOLDS.moderate && 
    m.nutrition.protein < PROTEIN_THRESHOLDS.good
  );
  
  // Balanced selection: prioritize excellent and good protein meals
  const targetExcellent = Math.ceil(count * 0.4); // 40% excellent protein
  const targetGood = Math.ceil(count * 0.4);      // 40% good protein
  const targetModerate = count - targetExcellent - targetGood; // Remaining
  
  // Add excellent protein meals
  selected.push(...excellentProtein.slice(0, Math.min(targetExcellent, excellentProtein.length)));
  
  // Add good protein meals  
  const remainingCount = count - selected.length;
  selected.push(...goodProtein.slice(0, Math.min(targetGood, goodProtein.length, remainingCount)));
  
  // Fill remaining with moderate protein if needed
  const stillNeeded = count - selected.length;
  if (stillNeeded > 0) {
    selected.push(...moderateProtein.slice(0, Math.min(stillNeeded, moderateProtein.length)));
  }
  
  // If still not enough, fill with any remaining meals
  const finallyNeeded = count - selected.length;
  if (finallyNeeded > 0) {
    const remaining = prioritizedMeals.filter(m => !selected.includes(m));
    selected.push(...remaining.slice(0, finallyNeeded));
  }
  
  console.log(`🥩 Smart protein selection: ${selected.length} meals selected`);
  const avgProtein = selected.reduce((sum, m) => sum + m.nutrition.protein, 0) / selected.length;
  console.log(`🥩 Average protein: ${avgProtein.toFixed(1)}g (excellent: ${excellentProtein.length}, good: ${goodProtein.length}, moderate: ${moderateProtein.length})`);
  
  return selected.slice(0, count);
}

/**
 * Check if dietary tags indicate user wants higher protein
 */
export function wantsHigherProtein(dietaryTags: string[]): boolean {
  const proteinIndicators = ['high-protein', 'protein', 'athletic', 'muscle', 'fitness'];
  return dietaryTags.some(tag => 
    proteinIndicators.some(indicator => tag.toLowerCase().includes(indicator))
  );
}