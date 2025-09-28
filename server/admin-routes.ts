import { Router } from 'express';
import { storage } from './storage';
import type { User, MealPlan } from '@shared/schema';

const adminRouter = Router();

// System statistics endpoint
adminRouter.get('/stats', async (req, res) => {
  try {
    const users: User[] = await storage.getAllUsers();
    const mealPlans: MealPlan[] = await storage.getAllMealPlans();
    
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
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));
    
    res.json({ users: safeUsers });
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

export { adminRouter };