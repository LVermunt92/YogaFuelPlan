import { storage } from './storage';

async function addSweetPotatoBowl() {
  console.log('Adding Roasted Sweet Potato & Chickpea Bowl recipe...');

  const recipe = {
    id: "310243",
    name: "Roasted sweet potato & chickpea bowl",
    category: "lunch" as const,
    portion: "1 serving",
    wholeFoodLevel: "high" as const,
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Lactose-Free", "High-Protein", "Longevity", "Anti-Aging", "Whole30"],
    ingredients: [
      "150g chickpeas",
      "150g sweet potato",
      "40g fresh spinach",
      "1/2 avocado",
      "15g sunflower seeds",
      "1 lemon",
      "30ml olive oil",
      "5g paprika powder",
      "2.5g ground cumin",
      "2.5g garlic powder",
      "2g salt",
      "1g black pepper",
      "15ml tahini",
      "15ml water"
    ],
    instructions: [
      "Preheat oven to 200°C",
      "Toss sweet potato cubes with 15ml olive oil, paprika powder, salt and pepper, spread on a baking tray lined with parchment paper",
      "Toss chickpeas with 15ml olive oil, cumin, garlic powder, salt and pepper, spread on the same tray next to the sweet potatoes",
      "Roast for 20-25 minutes until sweet potato is soft and lightly browned and chickpeas are slightly crispy, stir once halfway",
      "Mix tahini, 15ml olive oil, lemon juice (about 23ml from 1 lemon), and water in a small bowl until smooth, add more water if too thick",
      "Place spinach in a bowl and top with roasted sweet potato and chickpeas",
      "Add sliced avocado, lemon slices, and sunflower seeds",
      "Drizzle with remaining lemon juice and tahini dressing",
      "Adjust seasoning with extra salt and pepper if needed"
    ],
    recipeTips: [
      "Stir the vegetables halfway through roasting for even cooking",
      "Make the dressing while the vegetables are roasting to save time",
      "Add water gradually to the tahini dressing until you reach desired consistency",
      "Can be meal prepped - store components separately and assemble when ready to eat"
    ],
    recipeNotes: "Nutrient-dense bowl packed with plant-based protein, healthy fats from avocado and tahini, and complex carbs from sweet potato. Rich in fiber, vitamins, and minerals.",
    prepTime: 30,
    vegetableContent: {
      servings: 2,
      vegetables: ["sweet potato", "spinach", "avocado"],
      benefits: ["High in fiber", "Rich in vitamins A and C", "Good source of healthy fats", "Anti-inflammatory properties"]
    }
  };

  // Get AI nutritional analysis
  const nutritionIngredients = [
    "150g chickpeas",
    "150g sweet potato",
    "40g fresh spinach",
    "1/2 avocado",
    "15g sunflower seeds",
    "1 lemon",
    "30ml olive oil",
    "15ml tahini"
  ];

  console.log('Getting AI nutritional analysis...');
  const { analyzeRecipeNutrition } = await import('./ai-nutrition-analyzer');
  const nutrition = await analyzeRecipeNutrition(nutritionIngredients, recipe.name);

  console.log('\nNutrition analysis:');
  console.log(`Calories: ${nutrition.calories} kcal`);
  console.log(`Protein: ${nutrition.protein}g`);
  console.log(`Carbs: ${nutrition.carbohydrates}g`);
  console.log(`Fats: ${nutrition.fats}g`);
  console.log(`Fiber: ${nutrition.fiber}g`);
  console.log(`Cost: €${nutrition.costEuros}`);

  const recipeWithNutrition = {
    ...recipe,
    nutrition: nutrition
  };

  console.log('\n📝 Adding recipe to database...');
  await storage.createRecipe(recipeWithNutrition as any);
  console.log('✅ Recipe added successfully!');

  // Invalidate recipe cache
  const { recipeCache } = await import('./recipe-cache');
  recipeCache.invalidate();
  console.log('✅ Recipe cache invalidated');
  
  console.log('\n✨ Roasted Sweet Potato & Chickpea Bowl added to database!');
}

addSweetPotatoBowl().catch(console.error);
