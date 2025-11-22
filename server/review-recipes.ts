import { storage } from './storage';

async function reviewRecipes() {
  // Get the critical one
  const switchel = await storage.getRecipeById('10257');
  
  // Get a few quality issue examples
  const examples = await Promise.all([
    storage.getRecipeById('10107'), // Gluten-free pasta
    storage.getRecipeById('10179'), // Aubergine Parmigiana
    storage.getRecipeById('10165'), // Power Oats
  ]);
  
  console.log('🔴 CRITICAL ISSUE:\n');
  console.log(`Recipe: ${switchel?.name}`);
  console.log(`Nutrition:`, switchel?.nutrition);
  console.log(`\n${'='.repeat(80)}\n`);
  
  console.log('🟡 QUALITY ISSUE EXAMPLES:\n');
  
  for (const recipe of examples) {
    if (!recipe) continue;
    console.log(`\n📝 ${recipe.name} (ID: ${recipe.id})`);
    console.log(`Category: ${recipe.category}`);
    console.log(`\nIngredients (first 5):`);
    recipe.ingredients.slice(0, 5).forEach((ing, i) => {
      console.log(`  ${i + 1}. ${ing}`);
    });
    if (recipe.ingredients.length > 5) {
      console.log(`  ... and ${recipe.ingredients.length - 5} more`);
    }
    console.log(`\n${'='.repeat(80)}`);
  }
}

reviewRecipes().catch(console.error);
