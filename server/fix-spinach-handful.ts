import { storage } from './storage';

async function fixSpinachHandful() {
  console.log('🔄 Finding recipes with "handful" of spinach...');
  
  // Get all active recipes
  const allRecipes = await storage.getAllRecipes(true);
  
  // Find recipes with "handful" in spinach ingredient
  const recipesToUpdate = allRecipes.filter(recipe => 
    recipe.ingredients.some(ing => 
      /handful.*spinach|spinach.*handful/i.test(ing)
    )
  );
  
  console.log(`📊 Found ${recipesToUpdate.length} recipes to update`);
  
  let updated = 0;
  
  for (const recipe of recipesToUpdate) {
    // Update ingredients: replace "handful" variations with "30g"
    const updatedIngredients = recipe.ingredients.map(ing => {
      if (/handful.*spinach|spinach.*handful/i.test(ing)) {
        // Replace various handful formats with 30g
        return ing
          .replace(/1 handful fresh spinach/gi, '30g fresh spinach')
          .replace(/handful fresh spinach/gi, '30g fresh spinach')
          .replace(/handful spinach/gi, '30g fresh spinach');
      }
      return ing;
    });
    
    // Update the recipe
    await storage.updateRecipe(recipe.id, {
      ingredients: updatedIngredients
    });
    
    updated++;
    console.log(`✅ Updated: ${recipe.name} (${recipe.id})`);
  }
  
  console.log(`\n🎉 Successfully updated ${updated} recipes`);
  console.log('   "handful of spinach" → "30g fresh spinach"');
}

// Run the fix
fixSpinachHandful()
  .then(() => {
    console.log('\n✨ Spinach measurement standardization complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
