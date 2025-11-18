import { storage } from './storage';

async function updateCurryWithEdamame() {
  console.log('Adding edamame beans to coconut curry dumpling recipes...');

  // Get both recipes
  const veganCurry = await storage.getRecipeById('10500');
  const gfCurry = await storage.getRecipeById('10501');

  if (!veganCurry || !gfCurry) {
    console.error('Could not find curry recipes!');
    return;
  }

  // Add 80g edamame beans to ingredients (adds ~9g protein)
  const updatedVeganIngredients = [
    "10g red curry paste",
    "1 garlic clove",
    "100g broccoli",
    "75g red pepper",
    "40g baby corn",
    "80g edamame beans",
    "7g fresh ginger",
    "110ml coconut milk",
    "1 kaffir lime leaf",
    "60g vegan dumplings (5-6 pieces)",
    "10g fresh coriander",
    "2.5g sesame seeds",
    "5ml crispy chili oil",
    "40g rice",
    "2g salt"
  ];

  const updatedGFIngredients = [
    "10g red curry paste",
    "1 garlic clove",
    "100g broccoli",
    "75g red pepper",
    "40g baby corn",
    "80g edamame beans",
    "7g fresh ginger",
    "110ml coconut milk",
    "1 kaffir lime leaf",
    "60g gluten-free vegan dumplings (5-6 pieces)",
    "10g fresh coriander",
    "2.5g sesame seeds",
    "5ml crispy chili oil",
    "40g rice",
    "2g salt"
  ];

  // Get AI nutrition analysis for updated recipes
  const { analyzeRecipeNutrition } = await import('./ai-nutrition-analyzer');
  
  console.log('\n=== VEGAN DUMPLINGS VERSION ===');
  const veganNutrition = await analyzeRecipeNutrition(updatedVeganIngredients, veganCurry.name);
  console.log('Updated nutrition:', veganNutrition);

  console.log('\n=== GLUTEN-FREE DUMPLINGS VERSION ===');
  const gfNutrition = await analyzeRecipeNutrition(updatedGFIngredients, gfCurry.name);
  console.log('Updated nutrition:', gfNutrition);

  // Update instructions to include edamame
  const updatedInstructions = [
    "Cook rice according to package instructions and set aside",
    "Heat a pan or wok over medium heat and add red curry paste",
    "Mince garlic and grate ginger, add to pan and fry for 1-2 minutes",
    "Add broccoli florets, sliced red pepper, baby corn, and edamame beans",
    "Stir-fry vegetables for 3-4 minutes until slightly tender",
    "Pour in coconut milk and add kaffir lime leaf",
    "Bring to a gentle simmer and cook for 5-7 minutes",
    "Add dumplings and cook for another 3-4 minutes until heated through",
    "Season with salt to taste",
    "Serve over rice, garnish with fresh coriander, sesame seeds, and crispy chili oil"
  ];

  // Update both recipes
  console.log('\n📝 Updating vegan dumplings version...');
  await storage.updateRecipe('10500', {
    ingredients: updatedVeganIngredients,
    instructions: updatedInstructions,
    nutrition: veganNutrition
  });
  console.log('✅ Vegan version updated!');

  console.log('\n📝 Updating gluten-free dumplings version...');
  await storage.updateRecipe('10501', {
    ingredients: updatedGFIngredients,
    instructions: updatedInstructions,
    nutrition: gfNutrition
  });
  console.log('✅ Gluten-free version updated!');

  // Invalidate recipe cache
  const { recipeCache } = await import('./recipe-cache');
  recipeCache.invalidate();
  console.log('✅ Recipe cache invalidated');

  console.log('\n✨ Both curry recipes now include edamame beans for extra protein!');
  console.log(`Previous protein: ~15g → New protein: ~${veganNutrition.protein}g`);
}

updateCurryWithEdamame().catch(console.error);
