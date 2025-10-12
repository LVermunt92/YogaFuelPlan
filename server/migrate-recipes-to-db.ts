import { db } from './db';
import { recipes } from '../shared/schema';
import { getCompleteEnhancedMealDatabase } from './nutrition-enhanced';
import { MealOption } from './nutrition-enhanced';

/**
 * One-time migration script to move all recipes from code to database
 * Run with: npx tsx server/migrate-recipes-to-db.ts
 */

async function migrateRecipesToDatabase() {
  try {
    console.log('🚀 Starting recipe migration to database...');
    
    // Get all recipes from code-based database
    const allRecipes = await getCompleteEnhancedMealDatabase();
    console.log(`📊 Found ${allRecipes.length} recipes to migrate`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const recipe of allRecipes) {
      try {
        // Determine source and variant info based on ID
        let source = 'base';
        let variantOf: string | null = null;
        let variantType: string | null = null;
        
        if (recipe.id) {
          const recipeId = typeof recipe.id === 'string' ? parseInt(recipe.id) : recipe.id;
          
          if (recipeId >= 10000 && recipeId < 100000) {
            source = 'custom';
          } else if (recipeId >= 100000 && recipeId < 200000) {
            source = 'variant';
            variantType = 'gluten_free';
            variantOf = String(recipeId - 100000);
          } else if (recipeId >= 200000 && recipeId < 300000) {
            source = 'variant';
            variantType = 'lactose_free';
            variantOf = String(recipeId - 200000);
          } else if (recipeId >= 300000) {
            source = 'variant';
            variantType = 'vegetarian';
            variantOf = String(recipeId - 300000);
          }
        }
        
        // Prepare recipe data for database
        const recipeData = {
          id: recipe.id ? String(recipe.id) : recipe.name, // Use ID or name as primary key
          name: recipe.name,
          category: recipe.category,
          ingredients: recipe.ingredients,
          instructions: recipe.recipe?.instructions || [],
          portion: recipe.portion || '1 serving',
          nutrition: recipe.nutrition, // Store as JSONB
          tags: recipe.tags || [],
          wholeFoodLevel: recipe.wholeFoodLevel || 'moderate',
          vegetableContent: recipe.vegetableContent || null, // Store as JSONB
          recipeBenefits: recipe.recipeBenefits || [],
          recipeTips: recipe.recipe?.tips || [],
          recipeNotes: recipe.recipe?.notes || null,
          source,
          variantOf,
          variantType,
          active: recipe.active !== false, // Default to true
          createdBy: null, // System-created recipes
          updatedBy: null,
        };
        
        // Insert recipe into database
        await db.insert(recipes).values(recipeData);
        successCount++;
        
        if (successCount % 50 === 0) {
          console.log(`✅ Migrated ${successCount}/${allRecipes.length} recipes...`);
        }
      } catch (error) {
        console.error(`❌ Error migrating recipe ${recipe.name}:`, error);
        errorCount++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully migrated: ${successCount} recipes`);
    console.log(`❌ Errors: ${errorCount} recipes`);
    console.log(`📈 Total: ${allRecipes.length} recipes`);
    
    // Verify migration
    const count = await db.select().from(recipes);
    console.log(`\n🔍 Database verification: ${count.length} recipes in database`);
    
    console.log('\n🎉 Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateRecipesToDatabase();
