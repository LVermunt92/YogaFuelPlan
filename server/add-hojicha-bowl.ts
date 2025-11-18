import { storage } from './storage';

async function addHojichaBowl() {
  console.log('Adding Hojicha Chia Yogurt Bowl recipe...');

  const recipe = {
    id: "310244",
    name: "Hojicha chia yogurt bowl",
    category: "breakfast" as const,
    portion: "1 serving",
    wholeFoodLevel: "high" as const,
    tags: ["Vegetarian", "Gluten-Free", "High-Protein", "Longevity", "Anti-Aging", "Follicular", "Ovulation"],
    ingredients: [
      "100ml plant-based milk",
      "2g hojicha powder",
      "15g chia seeds",
      "10ml maple syrup",
      "1 plum",
      "3ml lemon juice",
      "15ml water",
      "15g raw buckwheat groats",
      "5g chopped nuts",
      "2g sesame seeds",
      "1g salt",
      "150g plant-based yogurt",
      "1/2 fresh fig",
      "10g red currants"
    ],
    instructions: [
      "Mix plant-based milk with hojicha powder until dissolved, or steep 1 hojicha tea bag in warm milk and let cool",
      "Stir in chia seeds and 5ml maple syrup, refrigerate for at least 2 hours or overnight until thickened",
      "Make plum sauce by combining chopped plum, 2.5ml maple syrup, lemon juice, and water in a small pan",
      "Simmer plum mixture for 5-7 minutes until soft and syrupy, set aside to cool",
      "Prepare buckwheat crunch by mixing raw buckwheat groats, chopped nuts, sesame seeds, 2.5ml maple syrup, and a pinch of salt",
      "Toast the buckwheat mixture in a dry pan over medium heat for 3-5 minutes until golden and fragrant, stirring frequently",
      "Let buckwheat crunch cool completely to become crispy",
      "Spoon plant-based yogurt into a bowl",
      "Top with hojicha chia pudding, plum sauce, and buckwheat crunch",
      "Garnish with fresh fig halves and red currants"
    ],
    recipeTips: [
      "Make the chia pudding the night before for a quick morning assembly",
      "Hojicha powder gives a unique roasted tea flavor - substitute with matcha if unavailable",
      "Buckwheat crunch can be made in larger batches and stored in an airtight container",
      "Any seasonal berries work well in place of red currants",
      "Use regular yogurt if plant-based is not preferred"
    ],
    recipeNotes: "A sophisticated Japanese-inspired breakfast bowl featuring roasted green tea, chia pudding, and homemade plum sauce. Rich in omega-3s from chia seeds and antioxidants from hojicha.",
    prepTime: 15,
    vegetableContent: {
      servings: 1,
      vegetables: ["plum", "fig", "red currants"],
      benefits: ["High in omega-3 fatty acids", "Rich in antioxidants from hojicha", "Good source of fiber", "Probiotic benefits from yogurt"]
    }
  };

  // Get AI nutritional analysis
  const nutritionIngredients = [
    "100ml plant-based milk",
    "15g chia seeds",
    "10ml maple syrup",
    "1 plum",
    "15g raw buckwheat groats",
    "5g chopped nuts",
    "2g sesame seeds",
    "150g plant-based yogurt",
    "1/2 fresh fig",
    "10g red currants"
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
  
  console.log('\n✨ Hojicha Chia Yogurt Bowl added to database!');
}

addHojichaBowl().catch(console.error);
