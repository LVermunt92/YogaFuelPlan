// Simulated cleanIngredientName function test
const ingredient = "180g gluten-free pasta";

// Step 1: Remove measurements 
let cleaned = ingredient.toLowerCase().trim();
cleaned = cleaned.replace(/^[\d\.\/½¼¾⅓⅔⅛⅜⅝⅞]+\s*(cup|cups|tbsp|tsp|tablespoons?|teaspoons?|g|grams?|lb|lbs|pounds?|oz|ounces?|pieces?|slices?|cloves?|sprigs?|medium|large|small|ml|mL)\s*of\s*/i, '');
cleaned = cleaned.replace(/^[\d\.\/½¼¾⅓⅔⅛⅜⅝⅞]+\s*(cup|cups|tbsp|tsp|tablespoons?|teaspoons?|g|grams?|lb|lbs|pounds?|oz|ounces?|pieces?|slices?|cloves?|sprigs?|medium|large|small|ml|mL)\s*/i, '');
cleaned = cleaned.replace(/^[\d\.\/½¼¾⅓⅔⅛⅜⅝⅞]+\s*/, '');

console.log("After removing measurements:", cleaned);

// Step 2: Check gluten-free preservation
const hasGlutenFree = cleaned.includes('gluten-free') || cleaned.includes('gluten free');
console.log("Has gluten-free:", hasGlutenFree);

// Simulate specifyIngredients mapping that would convert "gluten-free pasta" to "pasta" if not handled
if (cleaned === "gluten-free pasta") {
  console.log("Would be preserved by our new mapping");
} else {
  console.log("Would get converted to 'pasta' by old mapping"); 
}
