// Automatic dietary tag detection based on ingredients

const GLUTEN_CONTAINING = [
  'wheat', 'flour', 'bread', 'pasta', 'noodles', 'udon', 'ramen', 'spaghetti', 
  'penne', 'fusilli', 'fettuccine', 'lasagna', 'macaroni', 'couscous', 'bulgur',
  'barley', 'rye', 'seitan', 'soy sauce', 'teriyaki', 'panko', 'breadcrumbs',
  'croissant', 'bagel', 'pita', 'naan', 'tortilla', 'wrap', 'cracker',
  'cookie', 'cake', 'muffin', 'pastry', 'puff pastry', 'pie crust', 'dough',
  'beer', 'malt', 'sourdough', 'brioche', 'ciabatta', 'baguette', 'focaccia',
  'gnocchi', 'orzo', 'farro', 'spelt', 'semolina', 'durum'
];

const GLUTEN_FREE_EXCEPTIONS = [
  'gluten-free', 'gf ', 'rice noodles', 'rice pasta', 'buckwheat noodles', 
  'soba', 'chickpea pasta', 'lentil pasta', 'quinoa pasta', 'corn tortilla',
  'cassava', 'tamari', 'coconut aminos', 'gluten free'
];

const LACTOSE_CONTAINING = [
  'milk', 'cream', 'cheese', 'yogurt', 'yoghurt', 'butter', 'mozzarella',
  'parmesan', 'cheddar', 'feta', 'ricotta', 'mascarpone', 'brie', 'camembert',
  'gouda', 'gruyère', 'gruyere', 'halloumi', 'paneer', 'cottage cheese',
  'sour cream', 'crème fraîche', 'creme fraiche', 'whey', 'casein',
  'ice cream', 'custard', 'bechamel', 'alfredo', 'quark', 'kefir',
  'pecorino', 'romano', 'gorgonzola', 'blue cheese', 'cream cheese',
  'heavy cream', 'double cream', 'single cream', 'whipping cream',
  'condensed milk', 'evaporated milk', 'buttermilk', 'semi-skimmed milk',
  'whole milk', 'skimmed milk'
];

const LACTOSE_FREE_EXCEPTIONS = [
  'lactose-free', 'dairy-free', 'plant-based', 'vegan', 'almond milk',
  'oat milk', 'soy milk', 'coconut milk', 'rice milk', 'cashew milk',
  'hemp milk', 'plant milk', 'non-dairy', 'coconut cream', 'coconut yogurt',
  'vegan cheese', 'nutritional yeast', 'ghee' // ghee is essentially lactose-free
];

export function containsGluten(ingredients: string[]): boolean {
  const ingredientsLower = ingredients.map(i => i.toLowerCase()).join(' ');
  
  // Check for gluten-free exceptions first
  for (const exception of GLUTEN_FREE_EXCEPTIONS) {
    if (ingredientsLower.includes(exception)) {
      // If it's a gluten-free version, check the rest of ingredients
      continue;
    }
  }
  
  // Check for gluten-containing ingredients
  for (const glutenItem of GLUTEN_CONTAINING) {
    // Need to be careful with partial matches
    const regex = new RegExp(`\\b${glutenItem}\\b`, 'i');
    for (const ingredient of ingredients) {
      const ingredientLower = ingredient.toLowerCase();
      // Skip if this specific ingredient is marked as gluten-free
      const hasException = GLUTEN_FREE_EXCEPTIONS.some(ex => ingredientLower.includes(ex));
      if (hasException) continue;
      
      if (regex.test(ingredientLower)) {
        return true;
      }
    }
  }
  
  return false;
}

export function containsLactose(ingredients: string[]): boolean {
  for (const ingredient of ingredients) {
    const ingredientLower = ingredient.toLowerCase();
    
    // Check for lactose-free exceptions first
    const hasException = LACTOSE_FREE_EXCEPTIONS.some(ex => ingredientLower.includes(ex));
    if (hasException) continue;
    
    // Check for lactose-containing ingredients
    for (const lactoseItem of LACTOSE_CONTAINING) {
      const regex = new RegExp(`\\b${lactoseItem}\\b`, 'i');
      if (regex.test(ingredientLower)) {
        return true;
      }
    }
  }
  
  return false;
}

export function detectDietaryTags(ingredients: string[], existingTags: string[]): string[] {
  const newTags = [...existingTags];
  
  // Check Gluten-Free
  if (!newTags.includes('Gluten-Free') && !containsGluten(ingredients)) {
    newTags.push('Gluten-Free');
  }
  
  // Check Lactose-Free
  if (!newTags.includes('Lactose-Free') && !containsLactose(ingredients)) {
    newTags.push('Lactose-Free');
  }
  
  return newTags;
}

export function getMissingDietaryTags(ingredients: string[], existingTags: string[]): string[] {
  const missing: string[] = [];
  
  if (!existingTags.includes('Gluten-Free') && !containsGluten(ingredients)) {
    missing.push('Gluten-Free');
  }
  
  if (!existingTags.includes('Lactose-Free') && !containsLactose(ingredients)) {
    missing.push('Lactose-Free');
  }
  
  return missing;
}
