import type { Express } from "express";
import { createServer, type Server } from "http";
import "./types"; // Import session types
import { storage } from "./storage";
import { generateWeeklyMealPlan } from "./meal-generator";
import { mealPlanRequestSchema } from "@shared/schema";

import { generateEnhancedShoppingList, updateAllRecipesWithSpecificIngredients, validateAllRecipeIngredients } from "./nutrition-enhanced";
import { OuraService } from "./oura";
import { updateUserProfileSchema, authRegisterSchema, authLoginSchema } from "@shared/schema";
import { z } from "zod";
import { albertHeijnService, type ShoppingListExport } from "./albert-heijn";
import { translateRecipe, translateMealPlan, translateShoppingList } from './recipe-translator';
import { translateRecipeEnhanced, getTranslationStatus } from './ai-enhanced-translator';
import { adminRouter } from './admin-routes';
import { calculateNutritionTargets, type NutritionProfile } from './nutrition-calculator';
import { analyzeRecipeNutrition } from './ai-nutrition-analyzer';
import { hasAdequateProteinSource, enhanceRecipeWithProtein } from './protein-validator';
import cron from 'node-cron';
import { normalizeToSunday, getNextSunday, getCurrentWeekSunday, isValidWeekStart, getAllowedWeekStarts } from './date-utils';

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = authRegisterSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      const user = await storage.createUser(userData);
      
      // Set session for newly registered user
      req.session.userId = user.id;
      console.log('Session set for new user:', user.id);
      
      // Don't return password in response
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json({
        message: "Account created successfully",
        user: userWithoutPassword,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = authLoginSchema.parse(req.body);
      
      const user = await storage.authenticateUser(username, password);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Set session for authenticated user
      req.session.userId = user.id;
      console.log('Session set for user:', user.id);

      // Don't return password in response
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({
        message: "Login successful",
        user: userWithoutPassword,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/request-reset", async (req, res) => {
    try {
      const { username } = z.object({
        username: z.string(),
      }).parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        // Don't reveal if username exists for security
        return res.json({
          message: "If the username exists and has an email, a reset code will be sent.",
        });
      }

      if (!user.email) {
        return res.status(400).json({ 
          message: "This account doesn't have an email address. Please contact support or create a new account." 
        });
      }

      // Generate 6-digit reset code
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      await storage.createPasswordResetCode(user.id, resetCode);
      
      // In a real app, you'd send this via email
      // For development, we'll log it to console
      console.log(`🔐 Password reset code for ${username}: ${resetCode}`);
      
      res.json({
        message: "Reset code has been sent to your email address.",
        // In development, include the code in response
        ...(process.env.NODE_ENV === 'development' && { resetCode }),
      });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(400).json({ message: "Password reset request failed" });
    }
  });

  app.post("/api/auth/verify-reset", async (req, res) => {
    try {
      const { username, resetCode, newPassword } = z.object({
        username: z.string(),
        resetCode: z.string().length(6, "Reset code must be 6 digits"),
        newPassword: z.string().min(6, "Password must be at least 6 characters"),
      }).parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(404).json({ message: "Invalid reset code or username" });
      }

      const isValidCode = await storage.verifyPasswordResetCode(user.id, resetCode);
      
      if (!isValidCode) {
        return res.status(400).json({ message: "Invalid or expired reset code" });
      }

      await storage.updateUserPassword(user.id, newPassword);
      await storage.deletePasswordResetCode(user.id);
      
      res.json({
        message: "Password reset successful. You can now log in with your new password.",
      });
    } catch (error) {
      console.error("Password reset verification error:", error);
      res.status(400).json({ message: "Password reset failed" });
    }
  });

  // Check current authentication status
  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        // Session points to non-existent user, clear session
        req.session.destroy(() => {});
        return res.status(401).json({ message: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ message: "Authentication check failed" });
    }
  });

  // Logout route
  app.post("/api/auth/logout", async (req, res) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destroy error:', err);
          return res.status(500).json({ message: "Logout failed" });
        }
        res.clearCookie('connect.sid'); // Clear session cookie
        res.json({ message: "Logout successful" });
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });
  
  // Create/Generate meal plan
  app.post("/api/meal-plans", async (req, res) => {
    try {
      const request = mealPlanRequestSchema.parse(req.body);
      
      // Fetch user data for meal prep logic and caloric adjustments
      const user = request.userId ? await storage.getUser(request.userId) : undefined;
      
      const generated = await generateWeeklyMealPlan(request, user);
      
      // Save to storage
      const savedMealPlan = await storage.createMealPlan(generated.mealPlan);
      const savedMeals = await storage.createMeals(savedMealPlan.id, generated.meals);
      
      // Automatically cleanup old meal plans, keeping only 3 most recent
      if (request.userId) {
        await storage.cleanupOldMealPlans(request.userId, 3);
      }
      
      res.json({
        mealPlan: savedMealPlan,
        meals: savedMeals,
      });
    } catch (error) {
      console.error("Error generating meal plan:", error);
      res.status(500).json({ message: "Failed to generate meal plan" });
    }
  });

  // Generate meal plan with leftovers support
  app.post("/api/meal-plans/generate", async (req, res) => {
    try {
      const { userId, weekStart, activityLevel, dietaryTags, leftovers } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const normalizedWeekStart = weekStart ? normalizeToSunday(weekStart) : getCurrentWeekSunday();
      
      // Validate that the week start is within allowed range (current week or next week only)
      if (!isValidWeekStart(normalizedWeekStart)) {
        const allowedWeeks = getAllowedWeekStarts();
        return res.status(400).json({ 
          message: `Week start must be current week (${allowedWeeks[0]}) or next week (${allowedWeeks[1]})`,
          allowedWeekStarts: allowedWeeks 
        });
      }

      const request = {
        userId,
        weekStart: normalizedWeekStart,
        activityLevel: activityLevel || 'high',
        dietaryTags: dietaryTags || [],
        leftovers: leftovers || [],
      };
      
      // Fetch user data for meal prep logic and caloric adjustments
      const user = await storage.getUser(request.userId);
      
      const generated = await generateWeeklyMealPlan(request, user);
      
      // Save to storage
      const savedMealPlan = await storage.createMealPlan(generated.mealPlan);
      const savedMeals = await storage.createMeals(savedMealPlan.id, generated.meals);
      
      // Automatically cleanup old meal plans, keeping only 3 most recent
      await storage.cleanupOldMealPlans(request.userId, 3);
      
      res.json({
        mealPlan: savedMealPlan,
        meals: savedMeals,
      });
    } catch (error) {
      console.error("Error generating meal plan:", error);
      res.status(500).json({ message: "Failed to generate meal plan" });
    }
  });

  // Get meal plans (filter by current user)
  app.get("/api/meal-plans", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : 2; // Default to user 2
      const mealPlans = await storage.getMealPlans(userId);
      res.json(mealPlans);
    } catch (error) {
      console.error("Error fetching meal plans:", error);
      res.status(500).json({ message: "Failed to fetch meal plans" });
    }
  });

  // Delete meal plan
  app.delete("/api/meal-plans/:id", async (req, res) => {
    try {
      const mealPlanId = parseInt(req.params.id);
      const userId = req.query.userId ? parseInt(req.query.userId as string) : 2; // Default to user 2
      
      if (!mealPlanId) {
        return res.status(400).json({ message: "Meal plan ID is required" });
      }
      
      // Verify the meal plan belongs to the user before deleting
      const mealPlan = await storage.getMealPlanWithMeals(mealPlanId);
      if (!mealPlan || mealPlan.userId !== userId) {
        return res.status(404).json({ message: "Meal plan not found or access denied" });
      }
      
      const success = await storage.deleteMealPlan(mealPlanId);
      
      if (success) {
        res.json({ message: "Meal plan deleted successfully" });
      } else {
        res.status(404).json({ message: "Meal plan not found" });
      }
    } catch (error) {
      console.error("Error deleting meal plan:", error);
      res.status(500).json({ message: "Failed to delete meal plan" });
    }
  });

  // Save meal plan with label (for current week, next week, etc.)
  app.post("/api/meal-plans/save", async (req, res) => {
    try {
      const { mealPlanId, label } = req.body;
      
      if (!mealPlanId) {
        return res.status(400).json({ message: "Meal plan ID is required" });
      }

      // Get the existing meal plan
      const mealPlan = await storage.getMealPlanWithMeals(mealPlanId);
      if (!mealPlan) {
        return res.status(404).json({ message: "Meal plan not found" });
      }

      // Create a copy with the new label
      const savedMealPlan = await storage.createMealPlan({
        userId: mealPlan.userId,
        weekStart: mealPlan.weekStart,
        activityLevel: mealPlan.activityLevel,
        totalProtein: mealPlan.totalProtein,

        planName: label || `Saved plan - ${new Date().toLocaleDateString()}`,
      });

      // Copy all the meals
      const savedMeals = await storage.createMeals(savedMealPlan.id, 
        mealPlan.meals.map(meal => ({
          day: meal.day,
          mealType: meal.mealType,
          foodDescription: meal.foodDescription,
          portion: meal.portion,
          protein: meal.protein,
          calories: meal.calories,
          carbohydrates: meal.carbohydrates,
          fats: meal.fats,
          fiber: meal.fiber,
          sugar: meal.sugar,
          sodium: meal.sodium,
          prepTime: meal.prepTime,
        }))
      );

      // Automatically cleanup old meal plans, keeping only 3 most recent
      await storage.cleanupOldMealPlans(mealPlan.userId, 3);

      res.json({
        message: "Meal plan saved successfully",
        mealPlan: savedMealPlan,
        meals: savedMeals,
      });
    } catch (error) {
      console.error("Error saving meal plan:", error);
      res.status(500).json({ message: "Failed to save meal plan" });
    }
  });

  // Manual cleanup endpoint for testing
  app.post("/api/cleanup-meal-plans", async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const deletedCount = await storage.cleanupOldMealPlans(userId, 3);
      
      res.json({
        message: `Cleaned up ${deletedCount} old meal plans`,
        deletedCount,
      });
    } catch (error) {
      console.error("Error cleaning up meal plans:", error);
      res.status(500).json({ message: "Failed to cleanup meal plans" });
    }
  });

  // Delete specific meal plan
  app.delete("/api/meal-plans/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.query.userId ? parseInt(req.query.userId as string) : 2;
      
      // Verify meal plan belongs to user before deletion
      const mealPlan = await storage.getMealPlanWithMeals(id);
      if (!mealPlan || mealPlan.userId !== userId) {
        return res.status(404).json({ message: "Meal plan not found" });
      }

      // Delete the meal plan (meals will be cleaned up automatically by the storage layer)
      await storage.deleteMealPlan(id);
      
      res.json({ message: "Meal plan deleted successfully" });
    } catch (error) {
      console.error("Error deleting meal plan:", error);
      res.status(500).json({ message: "Failed to delete meal plan" });
    }
  });

  // Get specific meal plan with meals
  app.get("/api/meal-plans/:id", async (req, res) => {
    try {
      const idParam = req.params.id;
      const id = !isNaN(parseInt(idParam)) ? parseInt(idParam) : 0;
      
      if (id === 0) {
        return res.status(400).json({ message: "Invalid meal plan ID" });
      }
      
      const language = (req.query.language as 'en' | 'nl') || 'en';
      const mealPlan = await storage.getMealPlanWithMeals(id);
      
      if (!mealPlan) {
        return res.status(404).json({ message: "Meal plan not found" });
      }
      
      // Translate meal names and types if Dutch is requested
      if (language === 'nl' && mealPlan.meals) {
        const translatedMeals = await Promise.all(mealPlan.meals.map(async meal => {
          const translatedRecipe = await translateRecipeEnhanced({
            name: meal.foodDescription,
            ingredients: [],
            instructions: [],
            tips: [],
            notes: []
          }, language).catch(() => {
            // Fallback to pattern-based translation if AI fails
            return translateRecipe({
              name: meal.foodDescription,
              ingredients: [],
              instructions: [],
              tips: [],
              notes: []
            }, language);
          });
          
          return {
            ...meal,
            foodDescription: translatedRecipe.name,
            mealType: meal.mealType === 'breakfast' ? 'ontbijt' : 
                     meal.mealType === 'lunch' ? 'lunch' : 
                     meal.mealType === 'dinner' ? 'diner' : meal.mealType
          };
        }));
        
        res.json({
          ...mealPlan,
          meals: translatedMeals
        });
      } else {
        res.json(mealPlan);
      }
    } catch (error) {
      console.error("Error fetching meal plan:", error);
      res.status(500).json({ message: "Failed to fetch meal plan" });
    }
  });



  // Update viral recipes manually
  app.post("/api/admin/update-viral-recipes", async (req, res) => {
    try {
      // Viral recipes are now integrated directly into the unified database
      const { getCompleteEnhancedMealDatabase } = await import("./nutrition-enhanced");
      const allRecipes = getCompleteEnhancedMealDatabase();
      const currentRecipes = allRecipes.filter(recipe => recipe.tags.includes('viral'));
      console.log(`🔥 Unified database viral recipes: ${currentRecipes.length} recipes`);
      
      // All recipes are now permanently in the unified database
      console.log(`📊 Total unified database recipes: ${allRecipes.length}`);
      
      res.json({
        success: true,
        message: `Unified database active! Currently serving ${currentRecipes.length} viral recipes from ${allRecipes.length} total recipes`,
        currentRecipes: currentRecipes.map(r => r.name),
        totalRecipes: allRecipes.length,
        viralRecipes: currentRecipes.length
      });
    } catch (error) {
      console.error("Error updating viral recipes:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to update viral recipes",
        error: (error as Error).message 
      });
    }
  });

  // Analyze recipe variety and generate missing recipes
  app.post("/api/admin/analyze-recipe-variety", async (req, res) => {
    try {
      const { dietaryTags = [] } = req.body;
      const { analyzeAllRecipeVariety, ensureRecipeVariety } = await import("./recipe-variety-manager");
      
      console.log(`🔍 Analyzing recipe variety for dietary tags: [${dietaryTags.join(', ')}]`);
      
      const analysis = analyzeAllRecipeVariety(dietaryTags);
      const improvements = [];
      
      // Check if we need to generate recipes for any category
      for (const categoryAnalysis of analysis) {
        if (!categoryAnalysis.hasEnoughVariety) {
          console.log(`🚀 Generating ${categoryAnalysis.needsGeneration} recipes for ${categoryAnalysis.category}`);
          
          try {
            await ensureRecipeVariety(categoryAnalysis.category, dietaryTags, 22);
            improvements.push({
              category: categoryAnalysis.category,
              generated: categoryAnalysis.needsGeneration,
              success: true
            });
          } catch (error) {
            console.error(`Failed to generate recipes for ${categoryAnalysis.category}:`, error);
            improvements.push({
              category: categoryAnalysis.category,
              generated: 0,
              success: false,
              error: (error as Error).message
            });
          }
        }
      }
      
      res.json({
        success: true,
        analysis,
        improvements,
        message: `Recipe variety analysis complete. Generated ${improvements.reduce((sum, imp) => sum + imp.generated, 0)} new recipes.`
      });
    } catch (error) {
      console.error("Error analyzing recipe variety:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to analyze recipe variety",
        error: (error as Error).message 
      });
    }
  });

  // Meal plan management endpoints
  
  // Get meal plans by type (current, next, backup, saved)
  app.get("/api/meal-plans/type/:planType", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : 2;
      const planType = req.params.planType;
      
      const mealPlans = await storage.getMealPlansByType(userId, planType);
      res.json(mealPlans);
    } catch (error) {
      console.error("Error fetching meal plans by type:", error);
      res.status(500).json({ message: "Failed to fetch meal plans" });
    }
  });

  // Get active meal plans (for alternating between plans)
  app.get("/api/meal-plans/active", async (req, res) => {
    try {
      const userIdParam = req.query.userId as string;
      const userId = userIdParam && !isNaN(parseInt(userIdParam)) ? parseInt(userIdParam) : 2;
      
      const activePlans = await storage.getActiveMealPlans(userId);
      res.json({
        activePlans,
        canAlternate: activePlans.length >= 2,
        message: activePlans.length >= 2 ? 
          "Multiple active plans available for alternating" : 
          "Create a backup plan to enable alternating"
      });
    } catch (error) {
      console.error("Error fetching active meal plans:", error);
      res.status(500).json({ message: "Failed to fetch active meal plans" });
    }
  });

  // Toggle meal plan active status
  app.patch("/api/meal-plans/:id/toggle-active", async (req, res) => {
    try {
      const mealPlanId = parseInt(req.params.id);
      const { isActive } = req.body;
      
      await storage.setMealPlanActive(mealPlanId, isActive);
      res.json({ 
        success: true, 
        message: `Meal plan ${isActive ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error("Error toggling meal plan status:", error);
      res.status(500).json({ message: "Failed to update meal plan status" });
    }
  });

  // Duplicate meal plan for next week or backup
  app.post("/api/meal-plans/:id/duplicate", async (req, res) => {
    try {
      const mealPlanId = parseInt(req.params.id);
      const { newWeekStart, planType, planName } = req.body;
      
      if (!newWeekStart || !planType) {
        return res.status(400).json({ 
          message: "New week start date and plan type are required" 
        });
      }
      
      const duplicatedPlan = await storage.duplicateMealPlan(
        mealPlanId, 
        newWeekStart, 
        planType, 
        planName
      );
      
      // Get the duplicated plan with its meals
      const planWithMeals = await storage.getMealPlanWithMeals(duplicatedPlan.id);
      
      res.status(201).json({
        mealPlan: duplicatedPlan,
        meals: planWithMeals?.meals || [],
        message: `Meal plan duplicated as ${planType} plan for ${newWeekStart}`
      });
    } catch (error) {
      console.error("Error duplicating meal plan:", error);
      res.status(500).json({ message: "Failed to duplicate meal plan" });
    }
  });

  // Create backup plan from current plan (convenience endpoint)
  app.post("/api/meal-plans/:id/create-backup", async (req, res) => {
    try {
      const mealPlanId = parseInt(req.params.id);
      
      // Get next Sunday's date for backup plan
      const nextSunday = new Date();
      const daysUntilSunday = 7 - nextSunday.getDay();
      nextSunday.setDate(nextSunday.getDate() + daysUntilSunday);
      const newWeekStart = nextSunday.toISOString().split('T')[0];
      
      const backupPlan = await storage.duplicateMealPlan(
        mealPlanId, 
        newWeekStart, 
        'backup',
        'Weekend Grocery Backup Plan'
      );
      
      const planWithMeals = await storage.getMealPlanWithMeals(backupPlan.id);
      
      res.status(201).json({
        mealPlan: backupPlan,
        meals: planWithMeals?.meals || [],
        message: "Backup plan created for weekend grocery alternating",
        tip: "You can now alternate between your current and backup plans when doing weekend groceries"
      });
    } catch (error) {
      console.error("Error creating backup plan:", error);
      res.status(500).json({ message: "Failed to create backup plan" });
    }
  });

  // Create next week's plan from current plan
  app.post("/api/meal-plans/:id/create-next-week", async (req, res) => {
    try {
      const mealPlanId = parseInt(req.params.id);
      
      // Get the current plan to determine next week's start date
      const currentPlan = await storage.getMealPlanWithMeals(mealPlanId);
      if (!currentPlan) {
        return res.status(404).json({ message: "Current meal plan not found" });
      }
      
      // Calculate next week's start date (add 7 days to current week start)
      const currentWeekStart = new Date(currentPlan.weekStart);
      const nextWeekStart = new Date(currentWeekStart);
      nextWeekStart.setDate(currentWeekStart.getDate() + 7);
      const nextWeekStartStr = nextWeekStart.toISOString().split('T')[0];
      
      const nextWeekPlan = await storage.duplicateMealPlan(
        mealPlanId, 
        nextWeekStartStr, 
        'next',
        'Next Week Plan'
      );
      
      const planWithMeals = await storage.getMealPlanWithMeals(nextWeekPlan.id);
      
      res.status(201).json({
        mealPlan: nextWeekPlan,
        meals: planWithMeals?.meals || [],
        message: "Next week's plan created for weekend grocery planning",
        tip: "You now have both this week (for remaining cooking) and next week (for grocery shopping) available"
      });
    } catch (error) {
      console.error("Error creating next week plan:", error);
      res.status(500).json({ message: "Failed to create next week plan" });
    }
  });

  // Weekend grocery mode - get current + next week plans
  app.get("/api/meal-plans/weekend-grocery/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Get all active plans for the user
      const activePlans = await storage.getActiveMealPlans(userId);
      
      // Separate current week and next week plans
      const currentDate = new Date().toISOString().split('T')[0];
      const currentWeekPlans = activePlans.filter(plan => {
        const planDate = new Date(plan.weekStart);
        const currentWeekDate = new Date(currentDate);
        return planDate <= currentWeekDate;
      });
      
      const nextWeekPlans = activePlans.filter(plan => {
        const planDate = new Date(plan.weekStart);
        const currentWeekDate = new Date(currentDate);
        return planDate > currentWeekDate;
      });
      
      res.json({
        weekendGroceryMode: true,
        currentWeekPlans: currentWeekPlans.slice(0, 2), // Max 2 current week plans
        nextWeekPlans: nextWeekPlans.slice(0, 2), // Max 2 next week plans
        totalActivePlans: activePlans.length,
        canAlternate: activePlans.length >= 2,
        message: activePlans.length >= 2 ? 
          "Ready for weekend grocery shopping with multiple plan options" : 
          "Create additional plans to enable alternating during grocery shopping"
      });
    } catch (error) {
      console.error("Error fetching weekend grocery plans:", error);
      res.status(500).json({ message: "Failed to fetch weekend grocery plans" });
    }
  });



  // Auto-generate weekly meal plan (for Sunday automation)
  app.post("/api/meal-plans/auto-generate", async (req, res) => {
    try {
      // Calculate next Sunday for Sunday night cooking pattern
      const nextSunday = new Date();
      const daysUntilSunday = (7 - nextSunday.getDay()) % 7;
      if (daysUntilSunday === 0 && nextSunday.getHours() < 18) {
        // If it's Sunday before 6 PM, use today as the start
        // Otherwise use next Sunday
      } else {
        nextSunday.setDate(nextSunday.getDate() + daysUntilSunday);
      }
      const weekStart = nextSunday.toISOString().split('T')[0];
      
      // Use high activity level by default (130g protein)
      const request = {
        activityLevel: "high" as const,
        weekStart,
        userId: 1,
      };

      // Fetch user data for caloric adjustments
      const user = await storage.getUser(request.userId);
      
      const generated = await generateWeeklyMealPlan(request, user);
      
      // Save to storage
      const savedMealPlan = await storage.createMealPlan(generated.mealPlan);
      const savedMeals = await storage.createMeals(savedMealPlan.id, generated.meals);
      
      res.json({
        mealPlan: savedMealPlan,
        meals: savedMeals,
        message: "Weekly meal plan generated successfully"
      });
    } catch (error) {
      console.error("Error auto-generating meal plan:", error);
      res.status(500).json({ message: "Failed to auto-generate meal plan" });
    }
  });

  // Regenerate meal plan based on updated user preferences
  app.post("/api/meal-plans/regenerate", async (req, res) => {
    try {
      const { userId, weekStart, activityLevel, dietaryTags } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      // Get updated user profile
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const request = {
        userId,
        weekStart: weekStart ? normalizeToSunday(weekStart) : getCurrentWeekSunday(),
        activityLevel: activityLevel || user.activityLevel || 'high',
        dietaryTags: dietaryTags || user.dietaryTags || [],
        leftovers: user.leftovers || []
      };
      
      const generatedPlan = await generateWeeklyMealPlan(request, user);
      
      // Create new meal plan
      const mealPlan = await storage.createMealPlan(generatedPlan.mealPlan);
      
      // Set mealPlanId for all meals and create them
      const mealsWithPlanId = generatedPlan.meals.map(meal => ({
        ...meal,
        mealPlanId: mealPlan.id
      }));
      
      const meals = await storage.createMeals(mealPlan.id, mealsWithPlanId);
      
      res.status(201).json({ 
        mealPlan, 
        meals,
        message: "Meal plan regenerated with updated preferences"
      });
    } catch (error) {
      console.error("Error regenerating meal plan:", error);
      res.status(500).json({ message: "Failed to regenerate meal plan" });
    }
  });

  // Get recipe for a meal
  // Get translation status endpoint
  app.get("/api/translation/status", async (req, res) => {
    try {
      const status = getTranslationStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting translation status:", error);
      res.status(500).json({ message: "Failed to get translation status" });
    }
  });

  app.get("/api/meals/:mealId/recipe", async (req, res) => {
    try {
      const mealId = parseInt(req.params.mealId);
      const language = (req.query.language as 'en' | 'nl') || 'en';
      console.log(`Looking for meal ID: ${mealId}, language: ${language}`);
      
      // Search through all meal plans to find the specific meal
      let targetMeal = null;
      const allMealPlans = await storage.getMealPlans();
      console.log(`Found ${allMealPlans.length} meal plans to search`);
      
      for (const plan of allMealPlans) {
        const planWithMeals = await storage.getMealPlanWithMeals(plan.id);
        if (planWithMeals) {
          console.log(`Plan ${plan.id} has ${planWithMeals.meals.length} meals`);
          for (const meal of planWithMeals.meals) {
            if (meal.id === mealId) {
              targetMeal = meal;
              console.log(`Found meal: "${meal.foodDescription}"`);
              break;
            }
          }
        }
        if (targetMeal) break;
      }

      if (!targetMeal) {
        console.log(`Meal with ID ${mealId} not found`);
        return res.status(404).json({ message: "Meal not found" });
      }

      // Find the recipe from the enhanced meal database including viral recipes
      const { getCompleteEnhancedMealDatabase } = await import("./nutrition-enhanced");
      const ENHANCED_MEAL_DATABASE = getCompleteEnhancedMealDatabase();
      
      // Clean the meal name by removing portion scaling and leftover indicators
      let cleanMealName = targetMeal.foodDescription
        .replace(" (leftover)", "")
        .replace(/ \(\d+x portions[^)]*\)/, "") // Remove "(2x portions - batch cook)" etc.
        .replace(/ \(batch cook\)/, "") // Remove standalone "(batch cook)"
        .replace(/ \(incorporating leftover [^)]+\)/, "") // Remove "(incorporating leftover ingredient)"
        .replace(/ \(protein-enhanced\)/, "") // Remove "(protein-enhanced)" suffix
        .trim();
      
      console.log(`Looking for recipe: "${cleanMealName}" (original: "${targetMeal.foodDescription}")`);
      
      let mealOption = ENHANCED_MEAL_DATABASE.find(option => 
        option.name === cleanMealName
      );
      
      // If not found, try looking for recipes with seasonal name adaptations
      if (!mealOption) {
        // Try finding by seasonal variations (e.g., "fresh" vs "warming")
        const alternativeNames = [
          cleanMealName.replace(/^fresh\s+/i, 'Warming '),
          cleanMealName.replace(/^Fresh\s+/i, 'Warming '),
          cleanMealName.replace(/^warming\s+/i, 'fresh '),
          cleanMealName.replace(/^Warming\s+/i, 'fresh ')
        ];
        
        for (const altName of alternativeNames) {
          mealOption = ENHANCED_MEAL_DATABASE.find(option => option.name === altName);
          if (mealOption) {
            console.log(`Found recipe using alternative name: "${altName}"`);
            break;
          }
        }
      }
      
      console.log(`Recipe found: ${mealOption ? 'YES' : 'NO'}`);
      if (!mealOption) {
        console.log(`Available recipes: ${ENHANCED_MEAL_DATABASE.slice(0, 5).map(m => m.name).join(', ')}...`);
      }

      // If recipe not found in database, generate with AI
      if (!mealOption || !mealOption.recipe) {
        console.log(`Recipe not found for ${targetMeal.foodDescription}, generating with AI...`);
        
        try {
          const { generateRecipeWithAI } = await import("./ai-recipe-generator");
          
          // Get user's dietary preferences for AI generation
          const mealPlan = targetMeal.mealPlanId ? await storage.getMealPlanWithMeals(targetMeal.mealPlanId) : null;
          const user = mealPlan ? await storage.getUser(mealPlan.userId) : null;
          const dietaryTags = user?.dietaryTags || [];
          
          const mealType = targetMeal.mealType as 'breakfast' | 'lunch' | 'dinner';
          
          const aiRecipe = await generateRecipeWithAI({
            category: mealType,
            dietaryTags: dietaryTags,
            targetProtein: 25, // Default protein target
            prepTimeLimit: 30,
            excludeIngredients: [],
            cuisine: undefined,
            season: undefined
          });
          
          // Translate AI-generated recipe if Dutch is requested (with AI enhancement when available)
          const translatedAIRecipe = await translateRecipeEnhanced({
            name: aiRecipe.name,
            ingredients: aiRecipe.ingredients || [],
            instructions: aiRecipe.instructions || [],
            tips: aiRecipe.tips || [],
            notes: aiRecipe.notes ? [aiRecipe.notes] : []
          }, language).catch(() => {
            // Fallback to pattern-based translation if AI fails
            return translateRecipe({
              name: aiRecipe.name,
              ingredients: aiRecipe.ingredients || [],
              instructions: aiRecipe.instructions || [],
              tips: aiRecipe.tips || [],
              notes: aiRecipe.notes ? [aiRecipe.notes] : []
            }, language);
          });
          
          return res.json({
            ...aiRecipe,
            name: translatedAIRecipe.name,
            ingredients: translatedAIRecipe.ingredients,
            instructions: translatedAIRecipe.instructions,
            tips: translatedAIRecipe.tips,
            notes: translatedAIRecipe.notes.join('\n'),
            isAIGenerated: true,
            message: "Recipe generated by AI based on your dietary preferences"
          });
        } catch (aiError) {
          console.error("AI recipe generation failed:", aiError);
          
          // Generate a fallback recipe when AI fails
          const fallbackRecipe = {
            name: targetMeal.foodDescription || "Simple protein-rich meal",
            portion: targetMeal.portion || "1 serving",
            nutrition: {
              protein: targetMeal.protein || 25,
              prepTime: targetMeal.prepTime || 20,
              calories: targetMeal.calories || 300,
              carbohydrates: targetMeal.carbohydrates || 25,
              fats: targetMeal.fats || 12,
              fiber: 8,
              sugar: 6,
              sodium: 300,
              potassium: 400,
              calcium: 80,
              iron: 3,
              vitaminC: 15,
              costEuros: 3.5,
              proteinPerEuro: (targetMeal.protein || 25) / 3.5
            },
            category: targetMeal.mealType,
            tags: ["ai-generated", "fallback"],
            ingredients: ["See meal description for ingredients"],
            wholeFoodLevel: "moderate",
            vegetableContent: {
              servings: 1,
              vegetables: ["mixed vegetables"],
              benefits: ["Balanced nutrition", "Quick preparation"]
            },
            recipe: {
              instructions: [
                "Follow the meal description: " + targetMeal.foodDescription,
                "Use available ingredients from your kitchen",
                "Cook according to standard preparation methods"
              ],
              tips: [
                "This is a fallback recipe when detailed instructions aren't available",
                "Customize with available ingredients",
                "Adjust portions as needed"
              ],
              notes: "Generated automatically when detailed recipe is unavailable"
            },
            instructions: [],
            tips: [],
            notes: "",
            isAIGenerated: true,
            message: "Fallback recipe when AI generation is unavailable"
          };
          
          // Translate fallback recipe
          const translatedFallback = await translateRecipe({
            name: fallbackRecipe.name,
            ingredients: fallbackRecipe.ingredients,
            instructions: fallbackRecipe.recipe.instructions,
            tips: fallbackRecipe.recipe.tips,
            notes: [fallbackRecipe.recipe.notes]
          }, language);
          
          return res.json({
            ...fallbackRecipe,
            name: translatedFallback.name,
            ingredients: translatedFallback.ingredients,
            instructions: translatedFallback.instructions,
            tips: translatedFallback.tips,
            notes: translatedFallback.notes.join('\n')
          });
        }
      }

      // Check if recipe needs AI enhancement
      const hasCompleteRecipe = mealOption.recipe?.instructions?.length > 0 && 
                                mealOption.ingredients?.length > 0;
      
      if (!hasCompleteRecipe) {
        console.log(`Enhancing incomplete recipe for ${mealOption.name} with AI...`);
        
        try {
          const { enhanceExistingRecipe } = await import("./ai-recipe-generator");
          
          // Get user's dietary preferences for AI enhancement
          const mealPlan = await storage.getMealPlanWithMeals(targetMeal.mealPlanId);
          const user = mealPlan ? await storage.getUser(mealPlan.userId) : null;
          const dietaryTags = user?.dietaryTags || [];
          
          const enhancedRecipe = await enhanceExistingRecipe(mealOption, dietaryTags);
          
          // Translate AI-enhanced recipe if Dutch is requested (with AI enhancement when available)
          const translatedEnhancedRecipe = await translateRecipeEnhanced({
            name: enhancedRecipe.name,
            ingredients: enhancedRecipe.ingredients || [],
            instructions: enhancedRecipe.instructions || [],
            tips: enhancedRecipe.tips || [],
            notes: enhancedRecipe.notes ? [enhancedRecipe.notes] : []
          }, language).catch(() => {
            // Fallback to pattern-based translation if AI fails
            return translateRecipe({
              name: enhancedRecipe.name,
              ingredients: enhancedRecipe.ingredients || [],
              instructions: enhancedRecipe.instructions || [],
              tips: enhancedRecipe.tips || [],
              notes: enhancedRecipe.notes ? [enhancedRecipe.notes] : []
            }, language);
          });
          
          return res.json({
            ...enhancedRecipe,
            name: translatedEnhancedRecipe.name,
            ingredients: translatedEnhancedRecipe.ingredients,
            instructions: translatedEnhancedRecipe.instructions,
            tips: translatedEnhancedRecipe.tips,
            notes: translatedEnhancedRecipe.notes.join('\n'),
            isAIEnhanced: true,
            message: "Recipe enhanced by AI with detailed instructions"
          });
        } catch (aiError) {
          console.error("AI recipe enhancement failed:", aiError);
          // Fall through to return original recipe
        }
      }

      // Check if this meal incorporates leftover ingredients
      const incorporatedIngredients = [];
      console.log(`DEBUG: Checking for incorporated ingredients in: "${targetMeal.foodDescription}"`);
      const incorporateMatch = targetMeal.foodDescription.match(/\(incorporating leftover ([^)]+)\)/);
      if (incorporateMatch) {
        const leftoverIngredient = incorporateMatch[1];
        console.log(`DEBUG: Found incorporated ingredient: ${leftoverIngredient}`);
        incorporatedIngredients.push(leftoverIngredient);
      } else {
        console.log(`DEBUG: No incorporated ingredients found in this meal`);
      }

      // Add incorporated ingredients to the recipe ingredients list and instructions
      let finalIngredients = [...(mealOption.ingredients || [])];
      let finalInstructions = [...(mealOption.recipe?.instructions || ["Instructions not available"])];
      let incorporationNote = "";
      
      if (incorporatedIngredients.length > 0) {
        console.log(`DEBUG: Adding ${incorporatedIngredients.length} leftover ingredients to recipe`);
        
        // Add the leftover ingredients to the top of the list with a note
        incorporatedIngredients.forEach(ingredient => {
          const ingredientNote = `${ingredient} (leftover ingredient - diced)`;
          if (!finalIngredients.some(ing => ing.toLowerCase().includes(ingredient.toLowerCase()))) {
            finalIngredients.unshift(ingredientNote);
            console.log(`DEBUG: Added ${ingredient} to ingredients list`);
          }
        });
        
        // Enhance instructions to include leftover ingredient incorporation
        const recipeType = mealOption.name.toLowerCase();
        let incorporationStep = "";
        
        if (recipeType.includes('pasta')) {
          incorporationStep = `Add diced ${incorporatedIngredients.join(', ')} to the sauce during the last 3-4 minutes of cooking for fresh crunch and flavor.`;
        } else if (recipeType.includes('quinoa') || recipeType.includes('roasted vegetables')) {
          incorporationStep = `Dice ${incorporatedIngredients.join(', ')} and add to vegetables during roasting, or stir into quinoa just before serving for fresh texture.`;
        } else if (recipeType.includes('curry') || recipeType.includes('stir')) {
          incorporationStep = `Add diced ${incorporatedIngredients.join(', ')} to the dish 2-3 minutes before serving to maintain crispness.`;
        } else if (recipeType.includes('salad')) {
          incorporationStep = `Finely dice ${incorporatedIngredients.join(', ')} and mix into the salad for added crunch and freshness.`;
        } else {
          incorporationStep = `Incorporate diced ${incorporatedIngredients.join(', ')} into the dish according to your preference - add early for softer texture or late for more crunch.`;
        }
        
        // Add the incorporation step to instructions
        finalInstructions.push(`LEFTOVER INGREDIENT: ${incorporationStep}`);
        
        incorporationNote = ` This recipe has been adapted to include ${incorporatedIngredients.join(', ')} from your leftover ingredients.`;
      }

      // Translate recipe content based on language preference (with AI enhancement when available)
      const translatedRecipe = await translateRecipeEnhanced({
        name: mealOption.name,
        ingredients: finalIngredients,
        instructions: finalInstructions,
        tips: mealOption.recipe?.tips || [],
        notes: [(mealOption.recipe?.notes || "") + incorporationNote]
      }, language).catch(() => {
        // Fallback to pattern-based translation if AI fails
        return translateRecipe({
          name: mealOption.name,
          ingredients: finalIngredients,
          instructions: finalInstructions,
          tips: mealOption.recipe?.tips || [],
          notes: [(mealOption.recipe?.notes || "") + incorporationNote]
        }, language);
      });

      res.json({
        name: translatedRecipe.name,
        portion: mealOption.portion,
        ingredients: translatedRecipe.ingredients,
        instructions: translatedRecipe.instructions,
        tips: translatedRecipe.tips,
        notes: translatedRecipe.notes.join('\n'),
        prepTime: mealOption.nutrition?.prepTime || 30,
        nutrition: {
          protein: mealOption.nutrition?.protein || 0,
          calories: mealOption.nutrition?.calories || 0,
          carbohydrates: mealOption.nutrition?.carbohydrates || 0,
          fats: mealOption.nutrition?.fats || 0,
          fiber: mealOption.nutrition?.fiber || 0,
          sugar: mealOption.nutrition?.sugar || 0,
          sodium: mealOption.nutrition?.sodium || 0,
          costEuros: mealOption.nutrition?.costEuros,
          proteinPerEuro: mealOption.nutrition?.proteinPerEuro
        },
        tags: mealOption.tags || [],
        vegetableContent: mealOption.vegetableContent || { servings: 0, vegetables: [], benefits: [] }
      });
    } catch (error) {
      console.error("Error getting meal recipe:", error);
      res.status(500).json({ message: "Failed to get meal recipe" });
    }
  });

  // Generate shopping list for meal plan
  app.get("/api/meal-plans/:id/shopping-list", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const language = (req.query.language as 'en' | 'nl') || 'en';
      const mealPlan = await storage.getMealPlanWithMeals(id);
      
      if (!mealPlan) {
        return res.status(404).json({ message: "Meal plan not found" });
      }

      // Get user dietary preferences for vegan egg alternatives
      const user = await storage.getUser(mealPlan.userId);
      const dietaryTags = user?.dietaryTags || [];

      let shoppingList = generateEnhancedShoppingList(mealPlan.meals, language, dietaryTags);
      
      // Create proper structure for translation
      // Define supermarket shopping order - must match nutrition-enhanced.ts
      const categoryOrder = [
        'Vegetables',
        'Fresh Herbs', 
        'Fruits',
        'Protein',
        'Plant-Based Alternatives',
        'Dairy & Cheese',
        'Dairy & Eggs',
        'Pantry Essentials',
        'Grains, Pasta & Canned Goods',
        'Baking & Cooking Basics',
        'Nuts, Seeds & Spreads',
        'Other Dry Goods',
        'Other'
      ];
      
      // Get categories in the order they appear in the properly sorted shopping list
      const categoriesInOrder = [];
      const seenCategories = new Set();
      
      for (const item of shoppingList) {
        if (!seenCategories.has(item.category)) {
          categoriesInOrder.push(item.category);
          seenCategories.add(item.category);
        }
      }
      
      const shoppingListResponse = {
        mealPlanId: id,
        weekStart: mealPlan.weekStart,
        shoppingList: shoppingList,
        totalItems: shoppingList.length,
        categories: categoriesInOrder
      };
      
      // Translate shopping list if Dutch is requested
      const translatedResponse = translateShoppingList(shoppingListResponse, language);
      
      res.json(translatedResponse);
    } catch (error) {
      console.error("Error generating shopping list:", error);
      res.status(500).json({ message: "Failed to generate shopping list" });
    }
  });

  // User profile routes
  app.get('/api/users/:id/profile', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ message: 'Failed to fetch user profile' });
    }
  });

  // Handle both PATCH and PUT for user profile updates
  const handleProfileUpdate = async (req: any, res: any) => {
    try {
      const userId = parseInt(req.params.id);
      const profileData = req.body;
      
      // Validate the request body
      const validatedData = updateUserProfileSchema.parse(profileData);
      
      const updatedUser = await storage.updateUserProfile(userId, validatedData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ message: 'Failed to update user profile' });
    }
  };

  app.patch('/api/users/:id/profile', handleProfileUpdate);
  app.put('/api/users/:id/profile', handleProfileUpdate);

  // Protein calculation endpoint using advanced system
  app.post("/api/protein/calculate", async (req, res) => {
    try {
      const { age, weightKg, activityLevel, goal, strategy } = req.body;
      
      const { proteinRangePerDay, getDetailedProteinRecommendation } = await import("./proteinRange");
      
      if (age && weightKg) {
        // Use advanced calculation
        const result = proteinRangePerDay(age, weightKg, activityLevel || "moderate", goal || "maintenance", strategy || "auto");
        res.json({
          success: true,
          result,
          method: "advanced_calculation"
        });
      } else {
        // Fallback for missing data
        const fallback = getDetailedProteinRecommendation(
          age || 30, 
          weightKg || 70, 
          activityLevel || "high", 
          []
        );
        res.json({
          success: true,
          result: fallback,
          method: "fallback_calculation"
        });
      }
    } catch (error) {
      console.error("Error calculating protein:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to calculate protein requirements",
        error: error.message 
      });
    }
  });

  // Oura Ring Integration Endpoints
  
  // Test Oura connection
  app.get("/api/oura/status", async (req, res) => {
    try {
      const ouraToken = process.env.OURA_ACCESS_TOKEN;
      
      if (!ouraToken) {
        return res.status(400).json({ 
          connected: false, 
          message: "Oura access token not configured" 
        });
      }

      const ouraService = new OuraService(ouraToken);
      const isConnected = await ouraService.testConnection();
      
      if (isConnected) {
        res.json({ 
          connected: true, 
          message: "Oura Ring connected successfully" 
        });
      } else {
        res.status(400).json({ 
          connected: false, 
          message: "Invalid Oura access token or connection failed" 
        });
      }
    } catch (error) {
      console.error("Oura connection error:", error);
      res.status(500).json({ 
        connected: false, 
        message: "Failed to test Oura connection" 
      });
    }
  });

  // Sync Oura data for a specific date
  app.post("/api/oura/sync", async (req, res) => {
    try {
      const { date, userId = 1 } = req.body;
      const ouraToken = process.env.OURA_ACCESS_TOKEN;
      
      if (!ouraToken) {
        return res.status(400).json({ message: "Oura access token not configured" });
      }

      if (!date) {
        return res.status(400).json({ message: "Date is required (YYYY-MM-DD format)" });
      }

      const ouraService = new OuraService(ouraToken);
      const ouraData = await ouraService.transformOuraData(userId, date);
      const savedData = await storage.createOuraData(ouraData);
      
      res.json({
        message: "Oura data synced successfully",
        data: savedData
      });
    } catch (error) {
      console.error("Error syncing Oura data:", error);
      res.status(500).json({ message: "Failed to sync Oura data" });
    }
  });

  // Get Oura data for date range
  app.get("/api/oura/data", async (req, res) => {
    try {
      const { userId = 1, startDate, endDate } = req.query;
      
      if (!startDate) {
        return res.status(400).json({ message: "startDate is required" });
      }

      const ouraData = await storage.getOuraData(
        Number(userId), 
        startDate as string, 
        endDate as string
      );
      
      res.json({
        data: ouraData,
        count: ouraData.length
      });
    } catch (error) {
      console.error("Error fetching Oura data:", error);
      res.status(500).json({ message: "Failed to fetch Oura data" });
    }
  });

  // Get latest Oura data
  app.get("/api/oura/latest", async (req, res) => {
    try {
      const { userId = 1 } = req.query;
      const latestData = await storage.getLatestOuraData(Number(userId));
      
      if (!latestData) {
        return res.status(404).json({ message: "No Oura data found" });
      }

      res.json(latestData);
    } catch (error) {
      console.error("Error fetching latest Oura data:", error);
      res.status(500).json({ message: "Failed to fetch latest Oura data" });
    }
  });

  // Generate smart meal plan based on Oura activity
  app.post("/api/meal-plans/smart-generate", async (req, res) => {
    try {
      const { weekStart, userId = 1 } = req.body;
      
      if (!weekStart) {
        return res.status(400).json({ message: "weekStart is required" });
      }

      // Get Oura data for the week to determine activity levels
      const weekStartDate = new Date(weekStart);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      
      const ouraData = await storage.getOuraData(
        userId,
        weekStart,
        weekEndDate.toISOString().split('T')[0]
      );

      // Determine activity level based on Oura data
      let activityLevel: "high" | "low" = "high"; // Default
      
      if (ouraData.length > 0) {
        // Calculate average activity indicators
        const avgActivityScore = ouraData.reduce((sum, d) => sum + (d.activityScore || 0), 0) / ouraData.length;
        const avgSteps = ouraData.reduce((sum, d) => sum + (d.steps || 0), 0) / ouraData.length;
        const totalWorkoutMinutes = ouraData.reduce((sum, d) => sum + (d.workoutMinutes || 0), 0);
        
        // Decision logic for activity level
        if (avgActivityScore < 70 || avgSteps < 6000 || totalWorkoutMinutes < 150) {
          activityLevel = "low";
        }
      }

      const request = {
        activityLevel,
        weekStart,
        userId,
      };

      // Fetch user data for caloric adjustments
      const user = await storage.getUser(userId);

      const generated = await generateWeeklyMealPlan(request, user);
      
      // Save to storage
      const savedMealPlan = await storage.createMealPlan(generated.mealPlan);
      const savedMeals = await storage.createMeals(savedMealPlan.id, generated.meals);
      
      res.json({
        mealPlan: savedMealPlan,
        meals: savedMeals,
        determinedActivityLevel: activityLevel,
        ouraDataUsed: ouraData.length > 0,
        message: `Meal plan generated based on ${ouraData.length > 0 ? 'Oura activity data' : 'default settings'}`
      });
    } catch (error) {
      console.error("Error generating smart meal plan:", error);
      res.status(500).json({ message: "Failed to generate smart meal plan" });
    }
  });

  // Setup automatic daily Oura sync (runs every day at 6 AM)
  if (process.env.NODE_ENV !== 'test') {
    cron.schedule('0 6 * * *', async () => {
      try {
        console.log('Running daily Oura sync...');
        const ouraToken = process.env.OURA_ACCESS_TOKEN;
        
        if (!ouraToken) {
          console.log('Oura sync skipped - no access token configured');
          return;
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];

        const ouraService = new OuraService(ouraToken);
        const ouraData = await ouraService.transformOuraData(1, dateStr); // Default user ID 1
        await storage.createOuraData(ouraData);
        
        console.log(`Oura data synced successfully for ${dateStr}`);
      } catch (error) {
        console.error('Daily Oura sync failed:', error);
      }
    });

    // Setup weekly smart meal plan generation (runs every Sunday at 8 PM)
    cron.schedule('0 20 * * 0', async () => {
      try {
        console.log('Running weekly smart meal plan generation...');
        
        // Get next Sunday's date (start of next week)
        const weekStart = getNextSunday();
        
        // Get past week's Oura data to determine activity level
        const pastWeekStart = new Date();
        pastWeekStart.setDate(pastWeekStart.getDate() - 7);
        const pastWeekEnd = new Date();
        pastWeekEnd.setDate(pastWeekEnd.getDate() - 1);
        
        const ouraData = await storage.getOuraData(
          1, // Default user ID
          pastWeekStart.toISOString().split('T')[0],
          pastWeekEnd.toISOString().split('T')[0]
        );

        // Determine activity level based on past week's data
        let activityLevel: "high" | "low" = "high";
        
        if (ouraData.length > 0) {
          const avgActivityScore = ouraData.reduce((sum, d) => sum + (d.activityScore || 0), 0) / ouraData.length;
          const avgSteps = ouraData.reduce((sum, d) => sum + (d.steps || 0), 0) / ouraData.length;
          const totalWorkoutMinutes = ouraData.reduce((sum, d) => sum + (d.workoutMinutes || 0), 0);
          
          if (avgActivityScore < 70 || avgSteps < 6000 || totalWorkoutMinutes < 150) {
            activityLevel = "low";
          }
        }

        const request = {
          activityLevel,
          weekStart,
          userId: 1,
        };

        // Fetch user data for caloric adjustments
        const user = await storage.getUser(1);

        const generated = await generateWeeklyMealPlan(request, user);
        
        // Save to storage
        const savedMealPlan = await storage.createMealPlan(generated.mealPlan);
        await storage.createMeals(savedMealPlan.id, generated.meals);
        
        console.log(`Weekly meal plan generated successfully for ${weekStart} with ${activityLevel} activity level`);
      } catch (error) {
        console.error('Weekly meal plan generation failed:', error);
      }
    });
  }

  // Test endpoint for recipe unit conversion workflow
  app.get('/api/test/conversions', async (req, res) => {
    try {
      const { applyConversionWorkflow, validateConversions, getCurrentSeason } = await import('./unit-converter');
      
      // Test recipe with various US units
      const testRecipe = {
        name: "Test Recipe for Unit Conversion",
        ingredients: [
          "2 cups flour",
          "1 cup milk", 
          "3 tbsp olive oil",
          "1 tsp vanilla",
          "1 lb chicken breast",
          "2 cups seasonal fruit",
          "1 cup chopped vegetables",
          "350°F oven temperature",
          "½ cup nuts",
          "4 fl oz water"
        ]
      };
      
      console.log('🧪 Testing unit conversion workflow...');
      const converted = applyConversionWorkflow(testRecipe);
      const validation = validateConversions(converted.ingredients);
      const currentSeason = getCurrentSeason();
      
      res.json({
        original: testRecipe,
        converted: converted,
        validation: validation,
        currentSeason: currentSeason,
        conversionsApplied: {
          hasMetricUnits: validation.hasMetricUnits,
          hasSpecificFruits: validation.hasSpecificFruits,
          unconvertedCount: validation.unconvertedItems.length
        },
        message: 'Unit conversion test completed successfully'
      });
    } catch (error) {
      console.error('Unit conversion test error:', error);
      res.status(500).json({ message: 'Unit conversion test failed', error: error.message });
    }
  });

  // Meal History endpoints
  app.post("/api/meal-history", async (req, res) => {
    try {
      const result = req.body;
      const history = await storage.addToMealHistory(result);
      res.json(history);
    } catch (error) {
      console.error("Error adding to meal history:", error);
      res.status(500).json({ message: "Failed to add to meal history" });
    }
  });

  app.get("/api/meal-history/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      const history = await storage.getMealHistory(userId, limit);
      res.json(history);
    } catch (error) {
      console.error("Error fetching meal history:", error);
      res.status(500).json({ message: "Failed to fetch meal history" });
    }
  });

  // Meal Favorites endpoints
  app.post("/api/meal-favorites", async (req, res) => {
    try {
      const result = req.body;
      const favorite = await storage.addToFavorites(result);
      res.json(favorite);
    } catch (error) {
      console.error("Error adding to favorites:", error);
      res.status(500).json({ message: "Failed to add to favorites" });
    }
  });

  app.delete("/api/meal-favorites/:userId/:mealName", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const mealName = decodeURIComponent(req.params.mealName);
      
      await storage.removeFromFavorites(userId, mealName);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing from favorites:", error);
      res.status(500).json({ message: "Failed to remove from favorites" });
    }
  });

  app.get("/api/meal-favorites/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const favorites = await storage.getFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.get("/api/meal-favorites/:userId/:mealName/check", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const mealName = decodeURIComponent(req.params.mealName);
      
      const isFavorite = await storage.isFavorite(userId, mealName);
      res.json({ isFavorite });
    } catch (error) {
      console.error("Error checking favorite status:", error);
      res.status(500).json({ message: "Failed to check favorite status" });
    }
  });

  app.patch("/api/meal-favorites/:userId/:mealName", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const mealName = decodeURIComponent(req.params.mealName);
      
      const result = req.body;
      const favorite = await storage.updateFavorite(userId, mealName, result);
      res.json(favorite);
    } catch (error) {
      console.error("Error updating favorite:", error);
      res.status(500).json({ message: "Failed to update favorite" });
    }
  });

  // Albert Heijn Shopping List Integration
  app.post("/api/shopping-list/albert-heijn", async (req, res) => {
    try {
      const { ingredients, mealPlanId } = req.body;
      
      if (!ingredients || !Array.isArray(ingredients)) {
        return res.status(400).json({ message: "Invalid ingredients list" });
      }

      console.log(`🛒 Creating Albert Heijn shopping list from ${ingredients.length} ingredients`);
      
      // Map ingredients to Dutch terms
      const dutchIngredients = albertHeijnService.mapIngredientsToAH(ingredients);
      
      // Create shopping list
      const shoppingList = await albertHeijnService.createShoppingListFromMealPlan(dutchIngredients);
      
      // Optimize store route
      shoppingList.items = await albertHeijnService.optimizeShoppingRoute(shoppingList.items);
      
      res.json({
        success: true,
        shoppingList,
        message: `Shopping list created with ${shoppingList.totalItems} items`
      });
    } catch (error) {
      console.error("Error creating Albert Heijn shopping list:", error);
      res.status(500).json({ message: "Failed to create shopping list" });
    }
  });

  app.get("/api/shopping-list/albert-heijn/:format", async (req, res) => {
    try {
      const { format } = req.params;
      const { ingredients } = req.query;
      
      if (!ingredients) {
        return res.status(400).json({ message: "Missing ingredients parameter" });
      }
      
      const ingredientsList = (ingredients as string).split(',');
      const dutchIngredients = albertHeijnService.mapIngredientsToAH(ingredientsList);
      
      const shoppingList = await albertHeijnService.createShoppingListFromMealPlan(dutchIngredients);
      shoppingList.items = await albertHeijnService.optimizeShoppingRoute(shoppingList.items);
      
      const exportData = await albertHeijnService.exportShoppingList(shoppingList, format as 'json' | 'text' | 'csv');
      
      // Set appropriate content type
      switch (format) {
        case 'text':
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.setHeader('Content-Disposition', `attachment; filename="albert-heijn-shopping-list.txt"`);
          break;
        case 'csv':
          res.setHeader('Content-Type', 'text/csv; charset=utf-8');
          res.setHeader('Content-Disposition', `attachment; filename="albert-heijn-shopping-list.csv"`);
          break;
        default:
          res.setHeader('Content-Type', 'application/json');
      }
      
      res.send(exportData);
    } catch (error) {
      console.error("Error exporting Albert Heijn shopping list:", error);
      res.status(500).json({ message: "Failed to export shopping list" });
    }
  });

  app.post("/api/shopping-list/albert-heijn/search", async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({ message: "Search query required" });
      }
      
      const products = await albertHeijnService.searchProduct(query);
      
      res.json({
        success: true,
        products,
        count: products.length
      });
    } catch (error) {
      console.error("Error searching Albert Heijn products:", error);
      res.status(500).json({ message: "Failed to search products" });
    }
  });

  // Recipe ingredient specification routes
  app.post("/api/recipes/update-ingredients", async (req, res) => {
    try {
      console.log('🔄 Manual trigger: Updating all recipe ingredients to be specific...');
      updateAllRecipesWithSpecificIngredients();
      
      // Also convert all measurements to metric units
      console.log('🔢 Converting all recipe measurements to metric units...');
      const { convertAllRecipeUnits } = await import('./bulk-unit-converter');
      const { ENHANCED_MEAL_DATABASE } = await import('./nutrition-enhanced');
      const convertedRecipes = convertAllRecipeUnits(ENHANCED_MEAL_DATABASE);
      ENHANCED_MEAL_DATABASE.splice(0, ENHANCED_MEAL_DATABASE.length, ...convertedRecipes);
      console.log('✅ All recipe measurements converted to metric units');
      const validation = validateAllRecipeIngredients();
      
      res.json({
        message: "Recipe ingredients updated successfully",
        validation: {
          totalRecipes: validation.totalRecipes,
          validRecipes: validation.validRecipes,
          issuesFound: validation.issuesFound.length,
          remainingIssues: validation.issuesFound
        }
      });
    } catch (error) {
      console.error("Error updating recipe ingredients:", error);
      res.status(500).json({ message: "Failed to update recipe ingredients" });
    }
  });

  app.get("/api/recipes/validate-ingredients", async (req, res) => {
    try {
      const validation = validateAllRecipeIngredients();
      
      res.json({
        message: "Recipe ingredient validation complete",
        validation: {
          totalRecipes: validation.totalRecipes,
          validRecipes: validation.validRecipes,
          issuesFound: validation.issuesFound.length,
          remainingIssues: validation.issuesFound
        }
      });
    } catch (error) {
      console.error("Error validating recipe ingredients:", error);
      res.status(500).json({ message: "Failed to validate recipe ingredients" });
    }
  });

  // Run ingredient specification update on server startup
  try {
    console.log('🚀 Server startup: Running ingredient specification update...');
    updateAllRecipesWithSpecificIngredients();
    
    // Also convert all measurements to metric units
    console.log('🔢 Converting all recipe measurements to metric units...');
    const { convertAllRecipeUnits } = await import('./bulk-unit-converter');
    const { ENHANCED_MEAL_DATABASE } = await import('./nutrition-enhanced');
    const convertedRecipes = convertAllRecipeUnits(ENHANCED_MEAL_DATABASE);
    ENHANCED_MEAL_DATABASE.splice(0, ENHANCED_MEAL_DATABASE.length, ...convertedRecipes);
    console.log('✅ All recipe measurements converted to metric units');
    
    const validation = validateAllRecipeIngredients();
    console.log(`📊 Ingredient validation: ${validation.validRecipes}/${validation.totalRecipes} recipes have specific ingredients`);
    if (validation.issuesFound.length > 0) {
      console.log('⚠️  Recipes still needing attention:');
      validation.issuesFound.forEach(recipe => {
        console.log(`   - ${recipe.recipeName}: ${recipe.issues.length} issues`);
      });
    }
  } catch (error) {
    console.error("Error running startup ingredient update:", error);
  }

  // Admin routes
  app.use('/api/admin', adminRouter);

  // User Recipe routes
  // Get all user recipes
  app.get("/api/user-recipes", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const recipes = await storage.getUserRecipes(req.session.userId);
      res.json(recipes);
    } catch (error) {
      console.error("Error fetching user recipes:", error);
      res.status(500).json({ message: "Failed to fetch recipes" });
    }
  });

  // Get single user recipe
  app.get("/api/user-recipes/:id", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const id = parseInt(req.params.id);
      const recipe = await storage.getUserRecipe(id, req.session.userId);
      
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      
      res.json(recipe);
    } catch (error) {
      console.error("Error fetching user recipe:", error);
      res.status(500).json({ message: "Failed to fetch recipe" });
    }
  });

  // Create new user recipe with AI nutrition analysis
  app.post("/api/user-recipes", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const formData = req.body;
      
      // Generate nutrition data using AI
      console.log('🤖 Analyzing recipe nutrition with AI...');
      const nutritionAnalysis = await analyzeRecipeNutrition(
        formData.ingredients,
        formData.servings,
        "1 serving" // Default portion since we removed the field
      );
      
      // AUTOMATIC PROTEIN VALIDATION: Ensure user recipe has adequate protein
      console.log('🥩 VALIDATING PROTEIN SOURCES: Checking custom recipe for adequate protein content');
      const proteinTarget = nutritionAnalysis.nutrition?.protein || 20; // Use AI calculated protein or default
      const proteinAnalysis = hasAdequateProteinSource(formData.ingredients, proteinTarget);
      
      let finalIngredients = formData.ingredients;
      let finalNutrition = nutritionAnalysis.nutrition;
      
      if (!proteinAnalysis.hasProtein) {
        console.log(`⚠️ Custom recipe "${formData.name}" has insufficient protein (${proteinAnalysis.estimatedProtein}g < ${proteinTarget}g). Auto-enhancing...`);
        
        const enhancement = enhanceRecipeWithProtein(
          formData.name,
          formData.ingredients,
          formData.tags || [],
          proteinTarget
        );
        
        if (enhancement.addedProteins.length > 0) {
          finalIngredients = enhancement.enhancedIngredients;
          // Update protein in nutrition if enhanced
          if (finalNutrition) {
            finalNutrition.protein = Math.max(finalNutrition.protein, finalNutrition.protein + enhancement.proteinIncrease);
          }
          console.log(`✅ Enhanced custom recipe with ${enhancement.addedProteins.map(p => p.name).join(', ')} (+${enhancement.proteinIncrease}g protein)`);
        }
      } else {
        console.log(`✅ Custom recipe "${formData.name}" has adequate protein (${proteinAnalysis.estimatedProtein}g)`);
      }
      
      // Combine form data with AI-generated nutrition and protein validation
      const recipeData = {
        ...formData,
        ...nutritionAnalysis,
        ingredients: finalIngredients, // Use protein-enhanced ingredients if needed
        nutrition: finalNutrition, // Use protein-enhanced nutrition if needed
        portion: "1 serving", // Set default portion
        cookTime: 0, // Set default cookTime since we merged it into prepTime
        difficulty: "easy", // Set default difficulty since we removed the field
        userId: req.session.userId
      };
      
      console.log('✅ AI nutrition analysis complete:', nutritionAnalysis);
      const recipe = await storage.createUserRecipe(recipeData);
      res.status(201).json(recipe);
    } catch (error) {
      console.error("Error creating user recipe:", error);
      res.status(500).json({ message: "Failed to create recipe" });
    }
  });

  // Update user recipe with AI nutrition re-analysis
  app.patch("/api/user-recipes/:id", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      // If ingredients or servings changed, regenerate nutrition
      if (updateData.ingredients || updateData.servings) {
        console.log('🤖 Re-analyzing recipe nutrition with AI...');
        const nutritionAnalysis = await analyzeRecipeNutrition(
          updateData.ingredients,
          updateData.servings || 1,
          "1 serving" // Default portion since we removed the field
        );
        
        // AUTOMATIC PROTEIN VALIDATION: Ensure updated recipe has adequate protein
        console.log('🥩 VALIDATING PROTEIN SOURCES: Re-checking updated recipe for adequate protein content');
        const proteinTarget = nutritionAnalysis.nutrition?.protein || 20;
        const proteinAnalysis = hasAdequateProteinSource(updateData.ingredients, proteinTarget);
        
        let finalIngredients = updateData.ingredients;
        let finalNutrition = nutritionAnalysis.nutrition;
        
        if (!proteinAnalysis.hasProtein) {
          console.log(`⚠️ Updated recipe has insufficient protein (${proteinAnalysis.estimatedProtein}g < ${proteinTarget}g). Auto-enhancing...`);
          
          const enhancement = enhanceRecipeWithProtein(
            updateData.name || "Updated recipe",
            updateData.ingredients,
            updateData.tags || [],
            proteinTarget
          );
          
          if (enhancement.addedProteins.length > 0) {
            finalIngredients = enhancement.enhancedIngredients;
            if (finalNutrition) {
              finalNutrition.protein = Math.max(finalNutrition.protein, finalNutrition.protein + enhancement.proteinIncrease);
            }
            console.log(`✅ Enhanced updated recipe with ${enhancement.addedProteins.map(p => p.name).join(', ')} (+${enhancement.proteinIncrease}g protein)`);
          }
        }
        
        // Include AI-generated nutrition and protein validation in update
        const dataWithNutrition = {
          ...updateData,
          ...nutritionAnalysis,
          ingredients: finalIngredients,
          nutrition: finalNutrition
        };
        
        console.log('✅ AI nutrition re-analysis complete:', nutritionAnalysis);
        const recipe = await storage.updateUserRecipe(id, req.session.userId, dataWithNutrition);
        res.json(recipe);
      } else {
        // No ingredients change, just update other fields
        const recipe = await storage.updateUserRecipe(id, req.session.userId, updateData);
        res.json(recipe);
      }
    } catch (error) {
      console.error("Error updating user recipe:", error);
      res.status(500).json({ message: "Failed to update recipe" });
    }
  });

  // Delete user recipe
  app.delete("/api/user-recipes/:id", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const id = parseInt(req.params.id);
      await storage.deleteUserRecipe(id, req.session.userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user recipe:", error);
      res.status(500).json({ message: "Failed to delete recipe" });
    }
  });



  // Nutrition calculation endpoint
  app.get("/api/nutrition/targets/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create nutrition profile from user data
      const profile: NutritionProfile = {
        age: user.age || 30,
        weight: user.weight || 70,
        gender: (user.gender as 'male' | 'female' | 'other') || 'other',
        activityLevel: (user.activityLevel as any) || 'moderate',
        trainingType: (user.trainingType as any) || 'endurance',
        goal: (user.goal as any) || 'maintain'
      };

      // Calculate comprehensive nutrition targets
      const targets = calculateNutritionTargets(profile, user.height || undefined);
      
      res.json(targets);
    } catch (error) {
      console.error("Error calculating nutrition targets:", error);
      res.status(500).json({ message: "Failed to calculate nutrition targets" });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}
