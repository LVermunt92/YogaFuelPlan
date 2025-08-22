// Test script to check auto-conversion system
const { getCompleteEnhancedMealDatabase } = require('./server/nutrition-enhanced.ts');

async function testAutoConversion() {
  try {
    console.log('🧪 Testing auto-conversion system...');
    
    // Load the database
    const allRecipes = getCompleteEnhancedMealDatabase();
    
    console.log(`📊 Total recipes in database: ${allRecipes.length}`);
    
    // Check for recipes with gluten-free substitution notes
    const recipesWithGlutenFreeNotes = allRecipes.filter(recipe => 
      recipe.notes?.toLowerCase().includes('gluten-free pasta') ||
      (recipe.notes?.toLowerCase().includes('substitute') && recipe.notes?.toLowerCase().includes('gluten'))
    );
    
    console.log(`🔍 Recipes with gluten-free notes: ${recipesWithGlutenFreeNotes.length}`);
    recipesWithGlutenFreeNotes.forEach(recipe => {
      console.log(`  - "${recipe.name}": ${recipe.notes?.substring(0, 100)}...`);
    });
    
    // Check for pasta recipes
    const pastaRecipes = allRecipes.filter(recipe => 
      recipe.ingredients?.some(ing => ing.toLowerCase().includes('pasta'))
    );
    
    console.log(`🍝 Recipes with pasta ingredients: ${pastaRecipes.length}`);
    pastaRecipes.slice(0, 5).forEach(recipe => {
      console.log(`  - "${recipe.name}": ${recipe.ingredients?.find(ing => ing.toLowerCase().includes('pasta'))}`);
    });
    
    // Check for auto-converted recipes (should have "Gluten-free" prefix)
    const autoConverted = allRecipes.filter(recipe => 
      recipe.name.toLowerCase().startsWith('gluten-free') &&
      recipe.tags.includes('gluten-free')
    );
    
    console.log(`🔄 Auto-converted recipes found: ${autoConverted.length}`);
    autoConverted.forEach(recipe => {
      console.log(`  - "${recipe.name}"`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAutoConversion();