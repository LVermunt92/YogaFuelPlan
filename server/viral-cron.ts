import * as cron from 'node-cron';
import { getCurrentViralRecipes, shouldUpdateViralRecipes, UPCOMING_VIRAL_RECIPES } from './viral-recipe-updater';

// Last update tracking (in production, this would be stored in database)
let lastViralUpdate = new Date('2025-08-14'); // When we started tracking

// Schedule viral recipe updates every 2 weeks (Sundays at 3 AM)
export function initializeViralRecipeScheduler() {
  console.log('🔥 Initializing viral recipe auto-updater...');
  
  // Check and update viral recipes every Sunday at 3 AM
  // Cron pattern: "0 3 * * 0" = every Sunday at 3:00 AM
  const task = cron.schedule('0 3 * * 0', () => {
    try {
      console.log('🔥 Checking if viral recipes need updating...');
      
      if (shouldUpdateViralRecipes(lastViralUpdate)) {
        console.log('🔥 Time to update viral recipes! Refreshing with latest trends...');
        
        // Get current batch of viral recipes
        const currentRecipes = getCurrentViralRecipes();
        console.log(`🔥 Updated viral recipe database with ${currentRecipes.length} trending recipes`);
        
        // Log some upcoming recipes to show what's coming
        console.log(`🔥 Next batch will include: ${UPCOMING_VIRAL_RECIPES.slice(0, 3).join(', ')}...`);
        
        // Update tracking
        lastViralUpdate = new Date();
        
        console.log('🔥 Viral recipes auto-update completed successfully!');
      } else {
        console.log('🔥 Viral recipes are up to date - no update needed');
      }
    } catch (error) {
      console.error('❌ Error during viral recipe auto-update:', error);
    }
  }, {
    timezone: "Europe/Amsterdam" // Netherlands timezone
  });

  // Start the scheduler
  task.start();
  console.log('🔥 Viral recipe auto-updater started! Updates every 2 weeks on Sundays at 3 AM');
  
  // Log current status
  const currentRecipes = getCurrentViralRecipes();
  console.log(`🔥 Currently serving ${currentRecipes.length} viral recipes in meal database`);
  
  return task;
}

// Function to manually trigger viral recipe update (for testing)
export function triggerViralRecipeUpdate() {
  console.log('🔥 Manually triggering viral recipe update...');
  const currentRecipes = getCurrentViralRecipes();
  lastViralUpdate = new Date();
  
  console.log(`🔥 Manual update complete: ${currentRecipes.length} viral recipes loaded`);
  console.log(`🔥 Current viral recipes: ${currentRecipes.map(r => r.name).join(', ')}`);
  
  return {
    success: true,
    recipesCount: currentRecipes.length,
    recipes: currentRecipes.map(r => r.name),
    lastUpdate: lastViralUpdate
  };
}

export default {
  initializeViralRecipeScheduler,
  triggerViralRecipeUpdate
};