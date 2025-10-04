/**
 * Smart Ingredient Substitution System
 * Automatically substitutes ingredients based on dietary restrictions
 */

export interface IngredientSubstitution {
  original: string;
  substitute: string;
  ratio: number; // 1.0 = same amount, 0.75 = use 75% of original amount
  note?: string;
}

// Lactose-free substitutions
const LACTOSE_FREE_SUBSTITUTIONS: IngredientSubstitution[] = [
  // Milk substitutions
  { original: 'milk', substitute: 'oat milk', ratio: 1.0, note: 'Oat milk provides similar texture' },
  { original: 'whole milk', substitute: 'oat milk', ratio: 1.0 },
  { original: 'skim milk', substitute: 'almond milk', ratio: 1.0 },
  { original: '2% milk', substitute: 'oat milk', ratio: 1.0 },
  { original: 'sweet potato milk', substitute: 'sweet potato milk', ratio: 1.0, note: 'Naturally lactose-free plant milk' },
  
  // Cheese substitutions (allow aged cheeses which are naturally lactose-free)
  { original: 'cheddar cheese', substitute: 'dairy-free cheddar cheese', ratio: 1.0 },
  { original: 'cheddar', substitute: 'dairy-free cheddar', ratio: 1.0 },
  { original: 'cheese', substitute: 'dairy-free cheese', ratio: 1.0 },
  { original: 'mozzarella', substitute: 'dairy-free mozzarella', ratio: 1.0 },
  { original: 'parmesan', substitute: 'parmesan cheese', ratio: 1.0, note: 'Aged parmesan is naturally lactose-free' },
  { original: 'aged cheese', substitute: 'aged Dutch cheese', ratio: 1.0, note: 'Aged Dutch cheese is naturally lactose-free' },
  { original: 'old cheese', substitute: 'aged Dutch cheese', ratio: 1.0, note: 'Old cheese is naturally lactose-free' },
  { original: 'feta cheese', substitute: 'Violife feta', ratio: 1.0, note: 'Plant-based feta alternative' },
  { original: 'feta', substitute: 'Violife feta', ratio: 1.0, note: 'Plant-based feta alternative' },
  { original: 'cream cheese', substitute: 'dairy-free cream cheese', ratio: 1.0 },
  { original: 'cottage cheese', substitute: 'dairy-free cottage cheese', ratio: 1.0 },
  
  // Yogurt substitutions
  { original: 'greek yogurt', substitute: 'coconut yogurt', ratio: 1.0 },
  { original: 'yogurt', substitute: 'coconut yogurt', ratio: 1.0 },
  { original: 'plain yogurt', substitute: 'unsweetened coconut yogurt', ratio: 1.0 },
  
  // Cream and butter substitutions
  { original: 'heavy cream', substitute: 'coconut cream', ratio: 1.0 },
  { original: 'sour cream', substitute: 'dairy-free sour cream', ratio: 1.0 },
  { original: 'butter', substitute: 'vegan butter', ratio: 1.0 },
  { original: 'clarified butter', substitute: 'coconut oil', ratio: 1.0 },
  
  // Other dairy
  { original: 'buttermilk', substitute: 'oat milk + 15ml lemon juice', ratio: 1.0, note: 'Let mixture sit 5 minutes before using' },
  { original: 'ricotta', substitute: 'dairy-free ricotta', ratio: 1.0 },
  { original: 'cottage cheese', substitute: 'dairy-free cottage cheese', ratio: 1.0 },
  
  // Additional comprehensive dairy substitutions
  { original: 'cow milk', substitute: 'oat milk', ratio: 1.0 },
  { original: 'dairy milk', substitute: 'oat milk', ratio: 1.0 },
  { original: 'semi-skimmed milk', substitute: 'oat milk', ratio: 1.0 },
  { original: 'full-fat milk', substitute: 'oat milk', ratio: 1.0 },
  { original: 'low-fat milk', substitute: 'almond milk', ratio: 1.0 },
  { original: 'fresh milk', substitute: 'oat milk', ratio: 1.0 },
  { original: 'organic milk', substitute: 'organic oat milk', ratio: 1.0 },
  
  // Cheese variations
  { original: 'fresh mozzarella', substitute: 'dairy-free mozzarella', ratio: 1.0 },
  { original: 'goat cheese', substitute: 'dairy-free soft cheese', ratio: 1.0 },
  { original: 'goats cheese', substitute: 'dairy-free soft cheese', ratio: 1.0 },
  { original: 'brie', substitute: 'dairy-free brie', ratio: 1.0 },
  { original: 'camembert', substitute: 'dairy-free soft cheese', ratio: 1.0 },
  { original: 'halloumi', substitute: 'dairy-free halloumi', ratio: 1.0 },
  { original: 'mascarpone', substitute: 'dairy-free cream cheese', ratio: 1.0 },
  { original: 'fresh cheese', substitute: 'dairy-free cheese', ratio: 1.0 },
  
  // Cream variations  
  { original: 'double cream', substitute: 'coconut cream', ratio: 1.0 },
  { original: 'single cream', substitute: 'oat cooking cream', ratio: 1.0 },
  { original: 'whipping cream', substitute: 'coconut whipping cream', ratio: 1.0 },
  { original: 'cooking cream', substitute: 'oat cooking cream', ratio: 1.0 },
  { original: 'fresh cream', substitute: 'coconut cream', ratio: 1.0 },
  
  // Yogurt variations
  { original: 'natural yogurt', substitute: 'unsweetened coconut yogurt', ratio: 1.0 },
  { original: 'greek style yogurt', substitute: 'coconut greek style yogurt', ratio: 1.0 },
  { original: 'thick yogurt', substitute: 'thick coconut yogurt', ratio: 1.0 },
  { original: 'bio yogurt', substitute: 'probiotic coconut yogurt', ratio: 1.0 },
  { original: 'organic yogurt', substitute: 'organic coconut yogurt', ratio: 1.0 },
  
  // Butter variations
  { original: 'salted butter', substitute: 'vegan salted butter', ratio: 1.0 },
  { original: 'unsalted butter', substitute: 'vegan unsalted butter', ratio: 1.0 },
  { original: 'organic butter', substitute: 'organic vegan butter', ratio: 1.0 },
  { original: 'grass-fed butter', substitute: 'vegan butter', ratio: 1.0 },
  
  // Ice cream and frozen dairy
  { original: 'ice cream', substitute: 'dairy-free ice cream', ratio: 1.0 },
  { original: 'vanilla ice cream', substitute: 'dairy-free vanilla ice cream', ratio: 1.0 },
  { original: 'chocolate ice cream', substitute: 'dairy-free chocolate ice cream', ratio: 1.0 },
  
  // Condensed and evaporated milk
  { original: 'condensed milk', substitute: 'coconut condensed milk', ratio: 1.0 },
  { original: 'evaporated milk', substitute: 'coconut milk', ratio: 1.0 },
  { original: 'sweetened condensed milk', substitute: 'dairy-free condensed milk', ratio: 1.0 }
];

// Gluten-free substitutions
const GLUTEN_FREE_SUBSTITUTIONS: IngredientSubstitution[] = [
  // Flour substitutions
  { original: 'all-purpose flour', substitute: 'gluten-free flour blend', ratio: 1.0, note: 'Use 1:1 gluten-free flour blend' },
  { original: 'wheat flour', substitute: 'gluten-free flour blend', ratio: 1.0 },
  { original: 'bread flour', substitute: 'gluten-free bread flour', ratio: 1.0 },
  { original: 'self-rising flour', substitute: 'gluten-free self-rising flour', ratio: 1.0 },
  
  // Bread and pasta
  { original: 'bread', substitute: 'gluten-free bread', ratio: 1.0 },
  { original: 'pasta', substitute: 'gluten-free pasta', ratio: 1.0 },
  { original: 'spaghetti', substitute: 'gluten-free spaghetti', ratio: 1.0 },
  { original: 'penne', substitute: 'gluten-free penne', ratio: 1.0 },
  { original: 'fusilli', substitute: 'gluten-free fusilli', ratio: 1.0 },
  
  // Grains and cereals
  { original: 'oats', substitute: 'certified gluten-free oats', ratio: 1.0 },
  { original: 'rolled oats', substitute: 'certified gluten-free rolled oats', ratio: 1.0 },
  { original: 'steel-cut oats', substitute: 'certified gluten-free steel-cut oats', ratio: 1.0 },
  { original: 'barley', substitute: 'quinoa', ratio: 1.0, note: 'Quinoa provides similar texture' },
  { original: 'bulgur', substitute: 'quinoa', ratio: 1.0 },
  { original: 'couscous', substitute: 'quinoa', ratio: 1.0 },
  
  // Baking ingredients
  { original: 'breadcrumbs', substitute: 'gluten-free breadcrumbs', ratio: 1.0 },
  { original: 'panko', substitute: 'gluten-free panko', ratio: 1.0 },
  
  // Sauces and condiments that may contain gluten
  { original: 'soy sauce', substitute: 'tamari', ratio: 1.0, note: 'Tamari is naturally gluten-free' },
  { original: 'worcestershire sauce', substitute: 'gluten-free worcestershire sauce', ratio: 1.0 },
  { original: 'malt vinegar', substitute: 'apple cider vinegar', ratio: 1.0 }
];

/**
 * Apply ingredient substitutions based on dietary tags
 */
export function substituteIngredients(ingredients: string[], dietaryTags: string[]): {
  ingredients: string[];
  substitutions: IngredientSubstitution[];
  notes: string[];
} {
  let substitutedIngredients = [...ingredients];
  const appliedSubstitutions: IngredientSubstitution[] = [];
  const notes: string[] = [];
  
  // Apply lactose-free substitutions
  if (dietaryTags.includes('lactose-free') || dietaryTags.includes('dairy-free')) {
    for (const substitution of LACTOSE_FREE_SUBSTITUTIONS) {
      substitutedIngredients = substitutedIngredients.map(ingredient => {
        const lowerIngredient = ingredient.toLowerCase();
        const lowerOriginal = substitution.original.toLowerCase();
        
        // Prevent double substitution (e.g., 'oat milk' → 'oat oat milk')
        if (lowerIngredient.includes(lowerOriginal) && !lowerIngredient.includes(substitution.substitute.toLowerCase())) {
          appliedSubstitutions.push(substitution);
          
          // Handle ratio adjustments for measurements
          let newIngredient = ingredient.replace(new RegExp(substitution.original, 'gi'), substitution.substitute);
          
          // Adjust quantities if ratio is not 1.0
          if (substitution.ratio !== 1.0) {
            const measurementRegex = /(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/;
            const match = newIngredient.match(measurementRegex);
            if (match) {
              const [, amount, unit] = match;
              const newAmount = (parseFloat(amount) * substitution.ratio).toFixed(1);
              newIngredient = newIngredient.replace(measurementRegex, `${newAmount} ${unit}`);
            }
          }
          
          if (substitution.note) {
            notes.push(`${substitution.original} → ${substitution.substitute}: ${substitution.note}`);
          }
          
          console.log(`🔄 LACTOSE-FREE SUBSTITUTION: "${ingredient}" → "${newIngredient}"`);
          return newIngredient;
        }
        return ingredient;
      });
    }
  }
  
  // Apply gluten-free substitutions
  if (dietaryTags.includes('gluten-free')) {
    for (const substitution of GLUTEN_FREE_SUBSTITUTIONS) {
      substitutedIngredients = substitutedIngredients.map(ingredient => {
        const lowerIngredient = ingredient.toLowerCase();
        const lowerOriginal = substitution.original.toLowerCase();
        
        // Prevent double substitution (e.g., 'oat milk' → 'oat oat milk')
        if (lowerIngredient.includes(lowerOriginal) && !lowerIngredient.includes(substitution.substitute.toLowerCase())) {
          appliedSubstitutions.push(substitution);
          
          // Handle ratio adjustments for measurements
          let newIngredient = ingredient.replace(new RegExp(substitution.original, 'gi'), substitution.substitute);
          
          // Adjust quantities if ratio is not 1.0
          if (substitution.ratio !== 1.0) {
            const measurementRegex = /(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/;
            const match = newIngredient.match(measurementRegex);
            if (match) {
              const [, amount, unit] = match;
              const newAmount = (parseFloat(amount) * substitution.ratio).toFixed(1);
              newIngredient = newIngredient.replace(measurementRegex, `${newAmount} ${unit}`);
            }
          }
          
          if (substitution.note) {
            notes.push(`${substitution.original} → ${substitution.substitute}: ${substitution.note}`);
          }
          
          console.log(`🔄 GLUTEN-FREE SUBSTITUTION: "${ingredient}" → "${newIngredient}"`);
          return newIngredient;
        }
        return ingredient;
      });
    }
  }
  
  return {
    ingredients: substitutedIngredients,
    substitutions: appliedSubstitutions,
    notes
  };
}

/**
 * Apply substitutions to a meal's ingredients and add notes to the recipe
 */
export function applyDietarySubstitutions(meal: any, dietaryTags: string[]): any {
  if (!meal.ingredients || !Array.isArray(meal.ingredients)) {
    return meal;
  }
  
  const result = substituteIngredients(meal.ingredients, dietaryTags);
  
  if (result.substitutions.length > 0) {
    console.log(`🔄 Applied ${result.substitutions.length} dietary substitutions to "${meal.name}"`);
    
    // Create a modified meal with substituted ingredients - explicitly preserve id
    const modifiedMeal = {
      ...meal,
      id: meal.id, // Explicitly preserve recipe ID
      ingredients: result.ingredients
    };
    
    // Add substitution notes to the recipe tips
    if (result.notes.length > 0) {
      const existingTips = meal.tips || [];
      modifiedMeal.tips = [...existingTips, ...result.notes.map(note => `Dietary substitution: ${note}`)];
    }
    
    // Add a note about dietary adaptations
    const dietaryNote = `Recipe adapted for: ${dietaryTags.filter(tag => ['lactose-free', 'dairy-free', 'gluten-free'].includes(tag)).join(', ')}`;
    modifiedMeal.notes = meal.notes ? `${meal.notes}. ${dietaryNote}` : dietaryNote;
    
    return modifiedMeal;
  }
  
  return meal;
}