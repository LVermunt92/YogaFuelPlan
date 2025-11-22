import { storage } from './storage';

async function scanRecipes() {
  console.log('🔍 Scanning all recipes for quality issues...\n');
  
  const allRecipes = await storage.getAllRecipes(true);
  const toRemove: any[] = [];
  const toReview: any[] = [];
  
  for (const recipe of allRecipes) {
    const issues: string[] = [];
    let shouldRemove = false;
    
    // Critical issues - should remove
    if (!recipe.nutrition) {
      issues.push('Missing nutrition data');
      shouldRemove = true;
    } else {
      const nutrition = recipe.nutrition as any;
      if (!nutrition.protein || !nutrition.calories) {
        issues.push('Missing protein or calories');
        shouldRemove = true;
      }
    }
    
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      issues.push('No ingredients');
      shouldRemove = true;
    }
    
    if (!recipe.instructions || recipe.instructions.length === 0) {
      issues.push('No instructions');
      shouldRemove = true;
    }
    
    // Check for placeholder instructions
    if (recipe.instructions && recipe.instructions.length > 0) {
      const hasRealInstructions = recipe.instructions.some(inst => inst.length > 20);
      if (!hasRealInstructions) {
        issues.push('Only placeholder instructions');
        shouldRemove = true;
      }
    }
    
    // Quality issues - review
    if (recipe.ingredients) {
      const hasImperial = recipe.ingredients.some(ing => 
        /\b(cup|cups|tbsp|tsp|oz|lb|fl oz)\b/i.test(ing)
      );
      if (hasImperial) {
        issues.push('Uses imperial measurements');
      }
      
      const hasVague = recipe.ingredients.some(ing =>
        /(to taste|handful|pinch|splash|drizzle)/i.test(ing)
      );
      if (hasVague) {
        issues.push('Vague ingredient descriptions');
      }
    }
    
    if (issues.length > 0) {
      const entry = {
        id: recipe.id,
        name: recipe.name,
        category: recipe.category,
        issues
      };
      
      if (shouldRemove) {
        toRemove.push(entry);
      } else {
        toReview.push(entry);
      }
    }
  }
  
  console.log(`Total recipes: ${allRecipes.length}`);
  console.log(`Recipes to remove: ${toRemove.length}`);
  console.log(`Recipes to review: ${toReview.length}\n`);
  
  if (toRemove.length > 0) {
    console.log('🔴 SHOULD REMOVE (Critical Issues):');
    console.log('='.repeat(80));
    toRemove.forEach((r, i) => {
      console.log(`${i + 1}. ID: ${r.id} | ${r.name}`);
      console.log(`   Issues: ${r.issues.join(', ')}\n`);
    });
  }
  
  if (toReview.length > 0) {
    console.log('\n🟡 REVIEW (Quality Issues):');
    console.log('='.repeat(80));
    toReview.slice(0, 20).forEach((r, i) => {
      console.log(`${i + 1}. ID: ${r.id} | ${r.name}`);
      console.log(`   Issues: ${r.issues.join(', ')}\n`);
    });
    if (toReview.length > 20) {
      console.log(`... and ${toReview.length - 20} more\n`);
    }
  }
  
  // Create deletion list
  if (toRemove.length > 0) {
    const recipeIds = toRemove.map(r => r.id);
    console.log('\n📋 Recipe IDs to delete:');
    console.log(JSON.stringify(recipeIds, null, 2));
  }
}

scanRecipes().catch(console.error);
