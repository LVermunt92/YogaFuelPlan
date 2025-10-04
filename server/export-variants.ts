// Temporary script to export all dietary variants as permanent recipes
import { getCompleteEnhancedMealDatabase } from './nutrition-enhanced.js';

async function exportVariants() {
  const allRecipes = await getCompleteEnhancedMealDatabase();
  
  // Filter to only get variants (ID > 100000)
  const variants = allRecipes.filter(recipe => recipe.id && recipe.id >= 100000);
  
  console.log(`Found ${variants.length} dietary variants to export\n`);
  console.log('// DIETARY VARIANTS - AUTO-GENERATED FROM BASE RECIPES');
  console.log('// These were previously dynamically generated but are now permanent\n');
  
  variants.forEach((recipe, index) => {
    // Output as TypeScript object
    console.log('  {');
    console.log(`    name: "${recipe.name}",`);
    console.log(`    portion: "${recipe.portion}",`);
    console.log(`    nutrition: {`);
    console.log(`      protein: ${recipe.nutrition.protein},`);
    console.log(`      prepTime: ${recipe.nutrition.prepTime},`);
    console.log(`      calories: ${recipe.nutrition.calories},`);
    console.log(`      carbohydrates: ${recipe.nutrition.carbohydrates},`);
    console.log(`      fats: ${recipe.nutrition.fats},`);
    console.log(`      fiber: ${recipe.nutrition.fiber},`);
    console.log(`      sugar: ${recipe.nutrition.sugar},`);
    console.log(`      sodium: ${recipe.nutrition.sodium},`);
    console.log(`      costEuros: ${recipe.nutrition.costEuros},`);
    console.log(`      proteinPerEuro: ${recipe.nutrition.proteinPerEuro}`);
    console.log(`    },`);
    console.log(`    category: "${recipe.category}",`);
    console.log(`    tags: ${JSON.stringify(recipe.tags)},`);
    console.log(`    ingredients: ${JSON.stringify(recipe.ingredients, null, 6).replace(/\n/g, '\n    ')},`);
    console.log(`    wholeFoodLevel: "${recipe.wholeFoodLevel}",`);
    
    if (recipe.vegetableContent) {
      console.log(`    vegetableContent: {`);
      console.log(`      servings: ${recipe.vegetableContent.servings},`);
      console.log(`      vegetables: ${JSON.stringify(recipe.vegetableContent.vegetables)},`);
      console.log(`      benefits: ${JSON.stringify(recipe.vegetableContent.benefits)}`);
      console.log(`    },`);
    }
    
    if (recipe.recipeBenefits) {
      console.log(`    recipeBenefits: ${JSON.stringify(recipe.recipeBenefits, null, 6).replace(/\n/g, '\n    ')},`);
    }
    
    if (recipe.recipe) {
      console.log(`    recipe: {`);
      console.log(`      instructions: ${JSON.stringify(recipe.recipe.instructions, null, 8).replace(/\n/g, '\n      ')},`);
      if (recipe.recipe.tips) {
        console.log(`      tips: ${JSON.stringify(recipe.recipe.tips, null, 8).replace(/\n/g, '\n      ')},`);
      }
      if (recipe.recipe.notes) {
        console.log(`      notes: "${recipe.recipe.notes}"`);
      }
      console.log(`    },`);
    }
    
    console.log(`    createdAt: new Date('2025-10-04'),`);
    console.log(`    active: true`);
    console.log(`  }${index < variants.length - 1 ? ',' : ''}\n`);
  });
  
  console.log(`\n// Total: ${variants.length} dietary variant recipes`);
}

exportVariants().catch(console.error);
