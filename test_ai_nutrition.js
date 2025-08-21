// Test AI nutrition analysis endpoint
const testData = {
  name: "Test Recipe",
  portion: "1 serving",
  ingredients: [
    "100g chicken breast",
    "50g brown rice",
    "1 tbsp olive oil",
    "100g broccoli",
    "1 small apple"
  ],
  instructions: ["Cook the chicken", "Steam the rice", "Sauté the broccoli"],
  tips: [],
  notes: "A healthy balanced meal",
  prepTime: 20,
  cookTime: 15,
  servings: 1,
  mealTypes: ["lunch"],
  costEuros: 5,
  tags: ["healthy", "balanced"],
  difficulty: "easy",
  cuisine: "healthy"
};

console.log('Testing AI nutrition analysis...');
console.log('Ingredients:', testData.ingredients);
console.log('Servings:', testData.servings);
console.log('Portion:', testData.portion);