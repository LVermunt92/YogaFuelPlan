import { storage } from './storage';

async function addTomatoGnocchiRecipes() {
  console.log('Adding Tomato Gnocchi recipes...\n');

  // Base recipe - Regular version
  const baseRecipe = {
    id: '10950',
    name: 'Creamy tomato gnocchi',
    category: 'dinner',
    portion: '1 serving',
    ingredients: [
      '250g potato gnocchi',
      '1/2 red onion',
      '1 clove garlic',
      '200g cherry tomatoes',
      '15g tomato paste',
      '60ml heavy cream',
      '50g mozzarella',
      '10g fresh basil',
      '10ml olive oil',
      '2g salt',
      '1g black pepper',
      '0.5g chili flakes'
    ],
    instructions: [
      'Bring a pot of salted water to a boil. Add the gnocchi and cook for 2-3 minutes until they float. Before draining, scoop out about 60ml of the cooking water and set aside.',
      'In a large non-stick skillet, heat the olive oil over medium heat. Add the chopped red onion and cook for 2-3 minutes until softened.',
      'Stir in the minced garlic and cook for another 30 seconds until fragrant.',
      'Add the cherry tomatoes to the pan and cook for 4-5 minutes, stirring occasionally, until they start to burst and release their juices.',
      'Stir in the tomato paste and chili flakes, then season with salt and pepper. Cook for another minute to deepen the flavor.',
      'Pour in the heavy cream and a splash of the reserved gnocchi cooking water. Stir gently and let the sauce simmer for 1-2 minutes until slightly thickened and glossy.',
      'Add the cooked gnocchi straight to the skillet and toss gently to coat in the sauce. If the sauce feels too thick, add a little more pasta water to loosen it up.',
      'Tear the mozzarella into pieces and scatter over the gnocchi. Let it melt slightly into the warm sauce.',
      'Taste and adjust seasoning if needed. Garnish with fresh basil leaves and serve immediately.'
    ],
    recipeTips: [
      'Save some gnocchi cooking water - the starchy water helps bind the sauce to the gnocchi',
      'Let the cherry tomatoes burst naturally for the best flavor',
      'Tear the mozzarella by hand for those irresistible cheese pulls'
    ],
    recipeNotes: 'Store-bought potato gnocchi works perfectly for this quick one-pan recipe. The combination of burst cherry tomatoes, cream, and melted mozzarella creates a restaurant-quality dish in under 20 minutes.',
    nutrition: {
      protein: 18,
      calories: 520,
      carbohydrates: 68,
      fats: 18,
      fiber: 6,
      sugar: 8,
      sodium: 580,
      potassium: 650,
      calcium: 220,
      iron: 3.2,
      magnesium: 48,
      zinc: 2.1,
      vitaminA: 850,
      vitaminC: 32,
      vitaminD: 0.3,
      vitaminE: 2.8,
      vitaminK: 28,
      vitaminB6: 0.35,
      vitaminB12: 0.4,
      folate: 62,
      prepTime: 20
    },
    tags: ['quick-meals', 'comfort-food', 'one-pan', 'italian'],
    wholeFoodLevel: 'moderate',
    vegetableContent: {
      vegetables: ['cherry tomatoes', 'red onion', 'garlic', 'fresh basil'],
      containsLeafyGreens: true,
      colorDiversity: ['red', 'green']
    },
    active: true,
    createdBy: 1,
    updatedBy: 1
  };

  console.log('Creating base recipe...');
  await storage.createRecipe(baseRecipe);
  console.log('✅ Base recipe created!');

  // Gluten-free + Lactose-free version
  const gfLfRecipe = {
    id: '110950',
    name: 'Creamy tomato gnocchi',
    category: 'dinner',
    portion: '1 serving',
    ingredients: [
      '250g gluten-free gnocchi',
      '1/2 red onion',
      '1 clove garlic',
      '200g cherry tomatoes',
      '15g tomato paste',
      '60ml coconut cream',
      '50g dairy-free mozzarella',
      '10g fresh basil',
      '10ml olive oil',
      '2g salt',
      '1g black pepper',
      '0.5g chili flakes'
    ],
    instructions: [
      'Bring a pot of salted water to a boil. Add the gluten-free gnocchi and cook according to package instructions (usually 2-3 minutes until they float). Before draining, scoop out about 60ml of the cooking water and set aside.',
      'In a large non-stick skillet, heat the olive oil over medium heat. Add the chopped red onion and cook for 2-3 minutes until softened.',
      'Stir in the minced garlic and cook for another 30 seconds until fragrant.',
      'Add the cherry tomatoes to the pan and cook for 4-5 minutes, stirring occasionally, until they start to burst and release their juices.',
      'Stir in the tomato paste and chili flakes, then season with salt and pepper. Cook for another minute to deepen the flavor.',
      'Pour in the coconut cream and a splash of the reserved gnocchi cooking water. Stir gently and let the sauce simmer for 1-2 minutes until slightly thickened and glossy.',
      'Add the cooked gnocchi straight to the skillet and toss gently to coat in the sauce. If the sauce feels too thick, add a little more pasta water to loosen it up.',
      'Tear the dairy-free mozzarella into pieces and scatter over the gnocchi. Let it melt slightly into the warm sauce.',
      'Taste and adjust seasoning if needed. Garnish with fresh basil leaves and serve immediately.'
    ],
    recipeTips: [
      'Gluten-free gnocchi may cook faster than regular gnocchi, so watch carefully',
      'Coconut cream gives a subtle tropical undertone that pairs beautifully with tomatoes',
      'Choose a good quality dairy-free mozzarella that melts well'
    ],
    recipeNotes: 'This gluten-free and lactose-free version uses potato-based gluten-free gnocchi, coconut cream for richness, and dairy-free mozzarella. The result is just as creamy and delicious as the original.',
    nutrition: {
      protein: 14,
      calories: 510,
      carbohydrates: 68,
      fats: 19,
      fiber: 7,
      sugar: 8,
      sodium: 560,
      potassium: 630,
      calcium: 180,
      iron: 3.5,
      magnesium: 52,
      zinc: 1.8,
      vitaminA: 840,
      vitaminC: 32,
      vitaminD: 0,
      vitaminE: 2.6,
      vitaminK: 28,
      vitaminB6: 0.35,
      vitaminB12: 0,
      folate: 58,
      prepTime: 20
    },
    tags: ['gluten-free', 'lactose-free', 'dairy-free', 'quick-meals', 'comfort-food', 'one-pan', 'italian'],
    wholeFoodLevel: 'moderate',
    vegetableContent: {
      vegetables: ['cherry tomatoes', 'red onion', 'garlic', 'fresh basil'],
      containsLeafyGreens: true,
      colorDiversity: ['red', 'green']
    },
    active: true,
    createdBy: 1,
    updatedBy: 1
  };

  console.log('Creating gluten-free + lactose-free version...');
  await storage.createRecipe(gfLfRecipe);
  console.log('✅ Gluten-free + lactose-free version created!');

  // Add Dutch translations
  const { translateRecipe } = await import('./recipe-translator');

  console.log('\nAdding Dutch translations...');
  
  const baseTranslated = translateRecipe(baseRecipe, 'nl');
  await storage.upsertRecipeTranslation({
    recipeId: baseRecipe.id,
    language: 'nl',
    name: baseTranslated.name,
    ingredients: baseTranslated.ingredients,
    instructions: baseTranslated.instructions,
    tips: baseTranslated.tips || [],
    notes: baseTranslated.notes || []
  });
  console.log(`✅ Dutch translation created: ${baseRecipe.name} → ${baseTranslated.name}`);

  const gfLfTranslated = translateRecipe(gfLfRecipe, 'nl');
  await storage.upsertRecipeTranslation({
    recipeId: gfLfRecipe.id,
    language: 'nl',
    name: gfLfTranslated.name,
    ingredients: gfLfTranslated.ingredients,
    instructions: gfLfTranslated.instructions,
    tips: gfLfTranslated.tips || [],
    notes: gfLfTranslated.notes || []
  });
  console.log(`✅ Dutch translation created: ${gfLfRecipe.name} → ${gfLfTranslated.name}`);

  // Invalidate recipe cache
  const { recipeCache } = await import('./recipe-cache');
  recipeCache.invalidate();
  console.log('✅ Recipe cache invalidated');
  
  console.log('\n✨ Both Tomato Gnocchi recipes added successfully!');
}

addTomatoGnocchiRecipes().catch(console.error);
