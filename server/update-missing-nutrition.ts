import { db } from './db';
import { recipes } from '@shared/schema';
import { sql } from 'drizzle-orm';
import { analyzeRecipeNutrition } from './ai-nutrition-analyzer';

async function updateMissingNutrition() {
  console.log('🔍 Finding recipes with missing nutrition values...');
  
  const recipesWithMissingData = await db.select({
    id: recipes.id,
    name: recipes.name,
    ingredients: recipes.ingredients,
    portion: recipes.portion,
    nutrition: recipes.nutrition
  })
  .from(recipes)
  .where(sql`
    active = true AND (
      (nutrition->>'potassium')::numeric IS NULL OR (nutrition->>'potassium')::numeric = 0 OR
      (nutrition->>'calcium')::numeric IS NULL OR (nutrition->>'calcium')::numeric = 0 OR
      (nutrition->>'iron')::numeric IS NULL OR (nutrition->>'iron')::numeric = 0 OR
      (nutrition->>'vitaminC')::numeric IS NULL OR (nutrition->>'vitaminC')::numeric = 0
    )
  `)
  .limit(10);

  console.log(`Found ${recipesWithMissingData.length} recipes to update (processing first 10)`);

  for (const recipe of recipesWithMissingData) {
    try {
      console.log(`\n📝 Analyzing: ${recipe.name}`);
      
      const ingredients = recipe.ingredients || [];
      const nutrition = await analyzeRecipeNutrition(ingredients, 1, recipe.portion || '1 serving');
      
      const existingNutrition = recipe.nutrition as any || {};
      const updatedNutrition = {
        ...existingNutrition,
        potassium: nutrition.potassium,
        calcium: nutrition.calcium,
        iron: nutrition.iron,
        vitaminC: nutrition.vitaminC,
        costEuros: existingNutrition.costEuros || nutrition.costEuros
      };

      await db.update(recipes)
        .set({ nutrition: updatedNutrition })
        .where(sql`id = ${recipe.id}`);

      console.log(`✅ Updated ${recipe.name}: K=${nutrition.potassium}mg, Ca=${nutrition.calcium}mg, Fe=${nutrition.iron}mg, VitC=${nutrition.vitaminC}mg`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error: any) {
      console.error(`❌ Error updating ${recipe.name}:`, error.message);
    }
  }

  console.log('\n✅ Batch update complete!');
}

updateMissingNutrition().catch(console.error);
