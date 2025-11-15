import { storage } from './storage';

async function addGnocchiRecipes() {
  console.log('Adding Creamy Mushroom Spinach Gnocchi recipes...');

  // Base recipe with lactose (original version)
  const baseRecipe = {
    id: "310240",
    name: "Creamy mushroom spinach gnocchi",
    category: "dinner" as const,
    portion: "1 serving",
    wholeFoodLevel: "moderate" as const,
    tags: ["Vegetarian", "High-Protein"],
    ingredients: [
      "5ml olive oil",
      "1/4 onion",
      "2 cloves black garlic",
      "7g unsalted butter",
      "1 sprig fresh rosemary",
      "125g mixed mushrooms",
      "5ml white wine vinegar",
      "2g salt",
      "1g black pepper",
      "60ml heavy cream",
      "15g grated pecorino romano",
      "100g fresh spinach",
      "125g fresh gnocchi"
    ],
    instructions: [
      "Heat olive oil in a pan and sauté the chopped onion until soft",
      "Add mashed black garlic and fry for about 2 minutes",
      "Add half of the butter and rosemary, cook briefly on low heat, then add remaining butter",
      "Add mushrooms and cook until golden brown and moisture has released, season with salt and pepper",
      "Add white wine vinegar and stir, then remove half the mushrooms and the rosemary, set aside for serving",
      "Pour cream into the pan and stir in grated pecorino",
      "Cook gnocchi according to package instructions, reserve 60ml cooking water",
      "Add cooking water to the sauce and cook over medium heat until slightly thickened",
      "Add spinach in batches and cook until wilted",
      "Add drained gnocchi to the pan and cook for a few minutes to coat in sauce",
      "Serve topped with reserved mushrooms and extra pecorino romano"
    ],
    recipeTips: [
      "Black garlic adds a deep, umami-rich flavor but regular garlic works well too",
      "Use a mix of mushroom varieties for complex flavor (chestnut, oyster, shiitake)",
      "Reserve some mushrooms for topping to add texture contrast",
      "Fresh gnocchi cooks faster than dried - check package instructions"
    ],
    recipeNotes: "Rich and comforting Italian-style gnocchi with earthy mushrooms and fresh spinach. The pecorino adds a salty, tangy finish.",
    prepTime: 25,
    vegetableContent: {
      servings: 1.5,
      vegetables: ["mushrooms", "spinach", "onion"],
      benefits: ["High in iron from spinach", "Rich in B vitamins from mushrooms", "Good source of antioxidants"]
    }
  };

  // Lactose-free version - replace cream with plant-based cream, keep pecorino
  const lactoseFreeRecipe = {
    ...baseRecipe,
    id: "310241",
    name: "Creamy mushroom spinach gnocchi (lactose-free)",
    tags: ["Vegetarian", "Lactose-Free", "High-Protein"],
    ingredients: [
      "5ml olive oil",
      "1/4 onion",
      "2 cloves black garlic",
      "7g unsalted butter",
      "1 sprig fresh rosemary",
      "125g mixed mushrooms",
      "5ml white wine vinegar",
      "2g salt",
      "1g black pepper",
      "60ml plant-based cream",
      "15g grated pecorino romano",
      "100g fresh spinach",
      "125g fresh gnocchi"
    ]
  };

  // Get AI nutritional analysis for both versions
  const { analyzeRecipeNutrition } = await import('./ai-nutrition-analyzer');
  
  console.log('\n=== REGULAR VERSION ===');
  const regularNutritionIngredients = [
    "5ml olive oil",
    "1/4 onion",
    "2 cloves black garlic",
    "7g unsalted butter",
    "125g mixed mushrooms",
    "60ml heavy cream",
    "15g grated pecorino romano",
    "100g fresh spinach",
    "125g fresh gnocchi"
  ];
  
  const regularNutrition = await analyzeRecipeNutrition(regularNutritionIngredients, baseRecipe.name);
  console.log('Regular version nutrition:', regularNutrition);

  console.log('\n=== LACTOSE-FREE VERSION ===');
  const lactoseFreeNutritionIngredients = [
    "5ml olive oil",
    "1/4 onion",
    "2 cloves black garlic",
    "7g unsalted butter",
    "125g mixed mushrooms",
    "60ml plant-based cream",
    "15g grated pecorino romano",
    "100g fresh spinach",
    "125g fresh gnocchi"
  ];
  
  const lactoseFreeNutrition = await analyzeRecipeNutrition(lactoseFreeNutritionIngredients, lactoseFreeRecipe.name);
  console.log('Lactose-free version nutrition:', lactoseFreeNutrition);

  // Add both recipes
  const regularRecipeWithNutrition = {
    ...baseRecipe,
    nutrition: regularNutrition
  };

  const lactoseFreeRecipeWithNutrition = {
    ...lactoseFreeRecipe,
    nutrition: lactoseFreeNutrition
  };

  console.log('\n📝 Adding regular version...');
  await storage.createRecipe(regularRecipeWithNutrition as any);
  console.log('✅ Regular version added!');

  console.log('\n📝 Adding lactose-free version...');
  await storage.createRecipe(lactoseFreeRecipeWithNutrition as any);
  console.log('✅ Lactose-free version added!');

  // Invalidate recipe cache
  const { recipeCache } = await import('./recipe-cache');
  recipeCache.invalidate();
  console.log('✅ Recipe cache invalidated');
  
  console.log('\n✨ Both gnocchi recipes added successfully!');
}

addGnocchiRecipes().catch(console.error);
