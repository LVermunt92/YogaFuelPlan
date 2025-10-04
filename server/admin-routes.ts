import { Router } from 'express';
import { storage } from './storage';
import type { User, MealPlan } from '@shared/schema';

const adminRouter = Router();

// System statistics endpoint
adminRouter.get('/stats', async (req, res) => {
  try {
    const users: User[] = await storage.getAllUsers();
    const mealPlans: MealPlan[] = await storage.getMealPlans();
    
    // Calculate statistics
    const totalUsers = users.length;
    const totalMealPlans = mealPlans.length;
    const totalRecipes = 76; // Our current recipe count
    
    // Active users in last 7 days (mock data for now)
    const activeUsers7Days = Math.floor(totalUsers * 0.6);
    
    // Average protein target
    const avgProteinTarget = users.reduce((sum, user) => {
      // Calculate protein based on weight and activity
      const weight = user.weight || 70;
      const activityMultiplier = user.activityLevel === 'high' ? 1.8 : 1.6;
      return sum + (weight * activityMultiplier);
    }, 0) / totalUsers;
    
    // Activity level distribution
    const activityCounts = users.reduce((acc, user) => {
      const level = user.activityLevel || 'moderate';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const popularActivityLevels = Object.entries(activityCounts).map(([level, count]) => ({
      level,
      count
    }));
    
    // Recent generations (mock data)
    const recentGenerations = Math.floor(totalMealPlans * 0.3);
    
    res.json({
      totalUsers,
      totalMealPlans,
      totalRecipes,
      activeUsers7Days,
      avgProteinTarget: Math.round(avgProteinTarget),
      popularActivityLevels,
      recentGenerations
    });
  } catch (error) {
    console.error('Error getting admin stats:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Users list endpoint
adminRouter.get('/users', async (req, res) => {
  try {
    const users = await storage.getAllUsers();
    
    // Remove sensitive data (passwords) from response
    const safeUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      activityLevel: user.activityLevel,
      dietaryTags: user.dietaryTags,
      proteinTarget: user.proteinTarget,
      weight: user.weight,
      goalWeight: user.goalWeight,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));
    
    // Sort by last login (most recent first, nulls at the end)
    const sortedUsers = safeUsers.sort((a, b) => {
      if (!a.lastLoginAt && !b.lastLoginAt) return 0;
      if (!a.lastLoginAt) return 1;
      if (!b.lastLoginAt) return -1;
      return new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime();
    });
    
    res.json({ users: sortedUsers });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Nutrition configuration endpoints
adminRouter.get('/nutrition-config', async (req, res) => {
  try {
    // Return the complete nutrition configuration
    const configs = [
      // Protein factors
      {
        id: 'protein_sedentary_mobility',
        category: 'protein',
        subcategory: 'activity_training_factors',
        parameter: 'sedentary_mobility',
        value: 1.0,
        unit: 'g/kg',
        description: 'Protein requirement for sedentary individuals doing mobility training',
        source: 'International Association of Athletics Federations',
        lastUpdated: new Date().toISOString(),
        updatedBy: 'system'
      },
      {
        id: 'protein_sedentary_endurance',
        category: 'protein',
        subcategory: 'activity_training_factors',
        parameter: 'sedentary_endurance',
        value: 1.2,
        unit: 'g/kg',
        description: 'Protein requirement for sedentary individuals doing endurance training',
        source: 'International Association of Athletics Federations',
        lastUpdated: new Date().toISOString(),
        updatedBy: 'system'
      },
      {
        id: 'protein_sedentary_strength',
        category: 'protein',
        subcategory: 'activity_training_factors',
        parameter: 'sedentary_strength',
        value: 1.4,
        unit: 'g/kg',
        description: 'Protein requirement for sedentary individuals doing strength training',
        source: 'International Association of Athletics Federations',
        lastUpdated: new Date().toISOString(),
        updatedBy: 'system'
      },
      {
        id: 'protein_moderate_endurance',
        category: 'protein',
        subcategory: 'activity_training_factors',
        parameter: 'moderate_endurance',
        value: 1.6,
        unit: 'g/kg',
        description: 'Protein requirement for moderately active individuals doing endurance training',
        source: 'International Association of Athletics Federations',
        lastUpdated: new Date().toISOString(),
        updatedBy: 'system'
      },
      {
        id: 'protein_high_strength',
        category: 'protein',
        subcategory: 'activity_training_factors',
        parameter: 'high_strength',
        value: 2.0,
        unit: 'g/kg',
        description: 'Protein requirement for highly active individuals doing strength training',
        source: 'International Association of Athletics Federations',
        lastUpdated: new Date().toISOString(),
        updatedBy: 'system'
      },
      
      // PAL values
      {
        id: 'pal_sedentary',
        category: 'calories',
        subcategory: 'physical_activity_level',
        parameter: 'sedentary',
        value: 1.35,
        unit: 'ratio',
        description: 'Physical Activity Level for sedentary lifestyle',
        source: 'WHO/FAO Expert Consultation',
        lastUpdated: new Date().toISOString(),
        updatedBy: 'system'
      },
      {
        id: 'pal_moderate',
        category: 'calories',
        subcategory: 'physical_activity_level',
        parameter: 'moderate',
        value: 1.75,
        unit: 'ratio',
        description: 'Physical Activity Level for moderate activity',
        source: 'WHO/FAO Expert Consultation',
        lastUpdated: new Date().toISOString(),
        updatedBy: 'system'
      },
      {
        id: 'pal_high',
        category: 'calories',
        subcategory: 'physical_activity_level',
        parameter: 'high',
        value: 1.95,
        unit: 'ratio',
        description: 'Physical Activity Level for high activity',
        source: 'WHO/FAO Expert Consultation',
        lastUpdated: new Date().toISOString(),
        updatedBy: 'system'
      },
      
      // Carbohydrate targets
      {
        id: 'carb_endurance',
        category: 'carbohydrates',
        subcategory: 'training_type_targets',
        parameter: 'endurance',
        value: 6.5,
        unit: 'g/kg',
        description: 'Carbohydrate target for endurance training (midpoint of 5-8 g/kg range)',
        source: 'International Olympic Committee Consensus',
        lastUpdated: new Date().toISOString(),
        updatedBy: 'system'
      },
      {
        id: 'carb_strength',
        category: 'carbohydrates',
        subcategory: 'training_type_targets',
        parameter: 'strength',
        value: 4.0,
        unit: 'g/kg',
        description: 'Carbohydrate target for strength training (midpoint of 3-5 g/kg range)',
        source: 'International Olympic Committee Consensus',
        lastUpdated: new Date().toISOString(),
        updatedBy: 'system'
      },
      {
        id: 'carb_mixed',
        category: 'carbohydrates',
        subcategory: 'training_type_targets',
        parameter: 'mixed',
        value: 5.0,
        unit: 'g/kg',
        description: 'Carbohydrate target for mixed training (midpoint of 4-6 g/kg range)',
        source: 'International Olympic Committee Consensus',
        lastUpdated: new Date().toISOString(),
        updatedBy: 'system'
      },
      
      // Fat percentages
      {
        id: 'fat_endurance',
        category: 'fats',
        subcategory: 'training_type_percentages',
        parameter: 'endurance',
        value: 25.0,
        unit: '% of calories',
        description: 'Fat percentage target for endurance training',
        source: 'Sports Nutrition Guidelines',
        lastUpdated: new Date().toISOString(),
        updatedBy: 'system'
      },
      {
        id: 'fat_strength',
        category: 'fats',
        subcategory: 'training_type_percentages',
        parameter: 'strength',
        value: 30.0,
        unit: '% of calories',
        description: 'Fat percentage target for strength training',
        source: 'Sports Nutrition Guidelines',
        lastUpdated: new Date().toISOString(),
        updatedBy: 'system'
      },
      {
        id: 'fat_mixed',
        category: 'fats',
        subcategory: 'training_type_percentages',
        parameter: 'mixed',
        value: 27.5,
        unit: '% of calories',
        description: 'Fat percentage target for mixed training',
        source: 'Sports Nutrition Guidelines',
        lastUpdated: new Date().toISOString(),
        updatedBy: 'system'
      }
    ];
    
    res.json(configs);
  } catch (error) {
    console.error('Error getting nutrition config:', error);
    res.status(500).json({ error: 'Failed to get configuration' });
  }
});

adminRouter.post('/nutrition-config', async (req, res) => {
  try {
    const config = {
      id: `${req.body.category}_${req.body.subcategory}_${req.body.parameter}`,
      ...req.body,
      lastUpdated: new Date().toISOString()
    };
    
    // In a real implementation, you'd save this to a database
    // For now, we'll just return success
    res.json(config);
  } catch (error) {
    console.error('Error adding nutrition config:', error);
    res.status(500).json({ error: 'Failed to add configuration' });
  }
});

adminRouter.put('/nutrition-config/:id', async (req, res) => {
  try {
    const config = {
      ...req.body,
      id: req.params.id,
      lastUpdated: new Date().toISOString()
    };
    
    // In a real implementation, you'd update this in a database
    res.json(config);
  } catch (error) {
    console.error('Error updating nutrition config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

adminRouter.delete('/nutrition-config/:id', async (req, res) => {
  try {
    // In a real implementation, you'd delete from database
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting nutrition config:', error);
    res.status(500).json({ error: 'Failed to delete configuration' });
  }
});

// Backfill translations endpoint - translates all recipes to specified language
adminRouter.post('/translations/backfill', async (req, res) => {
  try {
    const { language = 'nl', limit } = req.body;
    
    if (!['en', 'nl'].includes(language)) {
      return res.status(400).json({ error: 'Language must be "en" or "nl"' });
    }

    const { getCompleteEnhancedMealDatabase } = await import('./nutrition-enhanced');
    const { batchTranslator } = await import('./batch-translator');
    
    // Check if translation is already running
    if (batchTranslator.isRunning()) {
      return res.status(409).json({ 
        error: 'Translation already in progress',
        queueLength: batchTranslator.getQueueLength()
      });
    }

    // Get all recipe IDs
    const allRecipes = await getCompleteEnhancedMealDatabase();
    let recipeIds = allRecipes.map(r => r.id).filter((id): id is number => id !== undefined);
    
    // Apply limit if specified
    if (limit && typeof limit === 'number' && limit > 0) {
      recipeIds = recipeIds.slice(0, limit);
    }

    console.log(`🚀 Admin triggered backfill translation: ${recipeIds.length} recipes to ${language}`);

    // Check which recipes are missing translations
    const missingIds = await storage.getMissingTranslations(recipeIds, language);
    
    if (missingIds.length === 0) {
      return res.json({
        message: 'All recipes already translated',
        total: recipeIds.length,
        alreadyTranslated: recipeIds.length,
        toTranslate: 0
      });
    }

    // Start background translation (non-blocking)
    batchTranslator.translateRecipes(missingIds, language as 'en' | 'nl')
      .then(results => {
        console.log(`✅ Backfill complete: ${results.filter(r => r.success).length}/${results.length} successful`);
      })
      .catch(error => {
        console.error('❌ Backfill translation error:', error);
      });

    res.json({
      message: 'Translation started in background',
      total: recipeIds.length,
      alreadyTranslated: recipeIds.length - missingIds.length,
      toTranslate: missingIds.length,
      language
    });

  } catch (error) {
    console.error('Error starting backfill translation:', error);
    res.status(500).json({ error: 'Failed to start translation backfill' });
  }
});

// Get translation backfill status
adminRouter.get('/translations/status', async (req, res) => {
  try {
    const { language = 'nl' } = req.query;
    
    if (!['en', 'nl'].includes(language as string)) {
      return res.status(400).json({ error: 'Language must be "en" or "nl"' });
    }

    const { getCompleteEnhancedMealDatabase } = await import('./nutrition-enhanced');
    const { batchTranslator } = await import('./batch-translator');
    
    const allRecipes = await getCompleteEnhancedMealDatabase();
    const totalRecipes = allRecipes.length;
    
    const missingIds = await storage.getMissingTranslations(
      allRecipes.map(r => r.id).filter((id): id is number => id !== undefined),
      language as string
    );
    
    const translated = totalRecipes - missingIds.length;
    const percentComplete = Math.round((translated / totalRecipes) * 100);

    res.json({
      language,
      totalRecipes,
      translated,
      missing: missingIds.length,
      percentComplete,
      isRunning: batchTranslator.isRunning(),
      queueLength: batchTranslator.getQueueLength()
    });

  } catch (error) {
    console.error('Error getting translation status:', error);
    res.status(500).json({ error: 'Failed to get translation status' });
  }
});

// Tag management endpoints
adminRouter.get('/tags', async (req, res) => {
  try {
    const { getCompleteEnhancedMealDatabase } = await import('./nutrition-enhanced');
    const recipes = await getCompleteEnhancedMealDatabase();
    
    // Get deleted tags from database
    const deletedTagsList = await storage.getDeletedTags();
    const deletedTagsSet = new Set(deletedTagsList);
    
    // Count tag occurrences across all recipes, filtering out deleted tags
    const tagCounts: Record<string, number> = {};
    
    recipes.forEach(recipe => {
      if (recipe.tags && Array.isArray(recipe.tags)) {
        recipe.tags.forEach(tag => {
          // Skip deleted tags
          if (!deletedTagsSet.has(tag)) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          }
        });
      }
    });
    
    // Convert to array and sort by count descending
    const tagsArray = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
    
    res.json(tagsArray);
  } catch (error) {
    console.error('Error getting tags:', error);
    res.status(500).json({ error: 'Failed to get tags' });
  }
});

adminRouter.delete('/tags', async (req, res) => {
  try {
    const { tag } = req.body;
    
    if (!tag || typeof tag !== 'string') {
      return res.status(400).json({ error: 'Tag is required' });
    }
    
    // Get current user ID from session (if available)
    const userId = (req.user as any)?.id || undefined;
    
    // Count how many recipes currently have this tag
    const { getCompleteEnhancedMealDatabase } = await import('./nutrition-enhanced');
    const recipes = await getCompleteEnhancedMealDatabase();
    const recipesUpdated = recipes.filter(recipe => 
      recipe.tags && Array.isArray(recipe.tags) && recipe.tags.includes(tag)
    ).length;
    
    // Save the tag deletion to database
    await storage.saveDeletedTag(tag, userId);
    
    res.json({ 
      success: true, 
      recipesUpdated,
      message: `Tag "${tag}" will be hidden from ${recipesUpdated} recipe(s).`
    });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

export { adminRouter };