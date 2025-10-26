import type { Express } from "express";
import { createServer, type Server } from "http";
import "./types"; // Import session types
import { storage } from "./storage";
import { generateWeeklyMealPlan } from "./meal-generator";
import { mealPlanRequestSchema } from "@shared/schema";
import { generateAccessToken, generateRefreshToken, verifyToken, extractTokenFromHeader } from "./jwt-utils";

import { generateEnhancedShoppingList, updateAllRecipesWithSpecificIngredients, validateAllRecipeIngredients, getDefaultPortion, multiplyIngredientAmount, getCompleteEnhancedMealDatabase, invalidateEnhancedMealDatabaseCache, type MealOption } from "./nutrition-enhanced";
import { OuraService } from "./oura";
import { updateUserProfileSchema, authRegisterSchema, authLoginSchema } from "@shared/schema";
import { z } from "zod";
import { albertHeijnService, type ShoppingListExport } from "./albert-heijn";
import { translateRecipe, translateMealPlan, translateShoppingList } from './recipe-translator';
import { translateRecipeEnhanced, getTranslationStatus } from './ai-enhanced-translator';
import { getTopRecipeBenefits } from './recipe-benefits-analyzer';
import { adminRouter } from './admin-routes';
import { calculateNutritionTargets, type NutritionProfile } from './nutrition-calculator';
import { analyzeRecipeNutrition } from './ai-nutrition-analyzer';
import { hasAdequateProteinSource, enhanceRecipeWithProtein } from './protein-validator';
import { hasAdequateFiberSource, enhanceRecipeWithFiber } from './fiber-validator';
import cron from 'node-cron';
import { normalizeToSunday, getNextSunday, getCurrentWeekSunday, isValidWeekStart, getAllowedWeekStarts } from './date-utils';
import { isExemptFromMealPlanRequirements } from '@shared/admin-utils';
import { getSeasonalInfo, getCurrentSeasonMonths, AMSTERDAM_MONTHLY_PRODUCE } from './seasonal-advisor';

// Helper function to parse quantity and unit from totalAmount string (e.g., "200g" -> {quantity: 200, unit: "g"})
function parseQuantityAndUnit(totalAmount: string): { quantity: number; unit: string } {
  if (!totalAmount || totalAmount === '') {
    return { quantity: 1, unit: '' };
  }

  // Handle cases where totalAmount is already clean (just numbers)
  const cleanAmount = totalAmount.trim();
  
  // Match patterns like "200g", "2 pieces", "300ml", "1.5 L", etc.
  const match = cleanAmount.match(/^(\d+(?:\.\d+)?)\s*(.*)/);
  
  if (match) {
    const quantity = parseFloat(match[1]);
    const unit = match[2].trim();
    return { quantity, unit };
  }

  // If no numeric pattern found, return 1 with the entire string as unit
  return { quantity: 1, unit: cleanAmount };
}

// Store app start time as version identifier
const APP_VERSION = Date.now().toString();

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Version endpoint for auto-update detection
  app.get("/api/version", (req, res) => {
    res.json({ version: APP_VERSION });
  });
  
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = authRegisterSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      // Check if email already exists (if provided)
      if (userData.email) {
        const existingEmailUser = await storage.getUserByEmail(userData.email);
        if (existingEmailUser) {
          return res.status(409).json({ 
            message: "An account with this email already exists. Please log in instead.",
            field: "email"
          });
        }
      }

      const user = await storage.createUser(userData);
      
      // Generate JWT tokens
      const accessToken = generateAccessToken({ userId: user.id, username: user.username });
      const refreshToken = generateRefreshToken({ userId: user.id, username: user.username });
      
      // Store refresh token (30 days expiry)
      const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await storage.saveRefreshToken(user.id, refreshToken, refreshTokenExpiry);
      
      console.log('✅ JWT tokens generated for new user:', user.id);
      
      // Don't return password in response
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json({
        message: "Account created successfully",
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password, rememberMe } = authLoginSchema.parse(req.body);
      
      const user = await storage.authenticateUser(username, password);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Update last login timestamp
      await storage.updateUserProfile(user.id, {
        lastLoginAt: new Date()
      });

      // Generate JWT tokens
      const accessToken = generateAccessToken({ userId: user.id, username: user.username });
      const refreshToken = generateRefreshToken({ userId: user.id, username: user.username });
      
      // Store refresh token (30 days expiry - remember me stays logged in)
      const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await storage.saveRefreshToken(user.id, refreshToken, refreshTokenExpiry);
      
      console.log('✅ JWT tokens generated for user:', user.id, rememberMe ? '(30 days)' : '(session)');

      // Don't return password in response
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({
        message: "Login successful",
        user: userWithoutPassword,
        accessToken,
        refreshToken,
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

  // Check current authentication status (JWT-based)
  app.get("/api/auth/me", async (req, res) => {
    try {
      const token = extractTokenFromHeader(req);
      
      if (!token) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const payload = verifyToken(token);
      
      if (!payload) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }
      
      const user = await storage.getUser(payload.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ message: "Authentication check failed" });
    }
  });

  // Refresh access token using refresh token
  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const { refreshToken } = z.object({
        refreshToken: z.string(),
      }).parse(req.body);
      
      // Verify the refresh token exists and is valid
      const tokenData = await storage.getRefreshToken(refreshToken);
      
      if (!tokenData) {
        return res.status(401).json({ message: "Invalid or expired refresh token" });
      }
      
      // Get user to include in new access token
      const user = await storage.getUser(tokenData.userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Generate new access token
      const accessToken = generateAccessToken({ userId: user.id, username: user.username });
      
      res.json({
        accessToken,
      });
    } catch (error) {
      console.error("Token refresh error:", error);
      res.status(401).json({ message: "Token refresh failed" });
    }
  });

  // Logout route (JWT-based)
  app.post("/api/auth/logout", async (req, res) => {
    try {
      const { refreshToken } = z.object({
        refreshToken: z.string().optional(),
      }).parse(req.body);
      
      if (refreshToken) {
        // Delete the refresh token from storage
        await storage.deleteRefreshToken(refreshToken);
        console.log('✅ Refresh token deleted');
      }
      
      res.json({ message: "Logout successful" });
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
      
      // Auto-generate shopping list for the meal plan
      if (request.userId) {
        try {
          const user = await storage.getUser(request.userId);
          const dietaryTags = user?.dietaryTags || [];
          const leftoverIngredients = user?.leftovers || [];
          
          let shoppingList = await generateEnhancedShoppingList(savedMeals, 'en', dietaryTags, leftoverIngredients);
          
          // Convert shopping list to persistent format and save it
          const itemsToSave = shoppingList.map((item, index) => {
            // Parse quantity and unit from totalAmount (e.g., "200g" -> quantity: 200, unit: "g")
            const { quantity, unit } = parseQuantityAndUnit(item.totalAmount);
            
            return {
              productName: item.ingredient,
              quantity: quantity,
              unit: unit,
              price: 0,
              category: item.category,
              sortOrder: index
            };
          });
          
          // Save the shopping list
          await storage.createShoppingList({
            userId: request.userId,
            mealPlanId: savedMealPlan.id,
            title: `Shopping List - Week ${savedMealPlan.weekStart}`,
            listType: 'regular',
            totalItems: shoppingList.length,
            checkedItems: 0,
            isActive: true
          });
          
          // Get the saved shopping list to add items
          const savedShoppingList = await storage.getShoppingList(request.userId, savedMealPlan.id, 'regular');
          if (savedShoppingList) {
            await storage.addShoppingListItems(savedShoppingList.id, itemsToSave);
            console.log('🛒 Auto-generated shopping list with', shoppingList.length, 'items');
          }
        } catch (error) {
          console.error('Failed to auto-generate shopping list:', error);
          // Don't fail the meal plan creation if shopping list fails
        }
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
      
      // Check if user is admin and exempt from meal plan requirements
      if (isExemptFromMealPlanRequirements(user)) {
        console.log('🔧 Admin user detected - generating meal plan with basic defaults');
        // For admin users, create a simple meal plan without complex profile requirements
        const adminRequest = {
          ...request,
          activityLevel: request.activityLevel || 'moderate',
          dietaryTags: request.dietaryTags || ['Vegetarian'], // Safe default
          leftovers: request.leftovers || []
        };
        const generated = await generateWeeklyMealPlan(adminRequest, null); // Pass null user for admin
        
        // Save to storage and return immediately without shopping list generation
        const savedMealPlan = await storage.createMealPlan(generated.mealPlan);
        const savedMeals = await storage.createMeals(savedMealPlan.id, generated.meals);
        
        return res.json({
          mealPlan: savedMealPlan,
          meals: savedMeals,
          adminMode: true
        });
      }
      
      const generated = await generateWeeklyMealPlan(request, user);
      
      // Save to storage
      const savedMealPlan = await storage.createMealPlan(generated.mealPlan);
      const savedMeals = await storage.createMeals(savedMealPlan.id, generated.meals);
      
      // Automatically cleanup old meal plans, keeping only 3 most recent
      await storage.cleanupOldMealPlans(request.userId, 3);
      
      // Increment weight loss week number for users with weight loss goals
      if (user && user.goalWeight && user.weight && user.goalWeight < user.weight) {
        const currentWeek = user.weightLossWeekNumber || 1;
        const nextWeek = currentWeek + 1;
        
        // Initialize start date if not set
        if (!user.weightLossStartDate) {
          await storage.updateUserProfile(user.id, {
            weightLossStartDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
            weightLossWeekNumber: 1
          });
          console.log(`🎯 WEIGHT LOSS JOURNEY: Starting week 1 for user ${user.id}`);
        } else {
          await storage.updateUserProfile(user.id, {
            weightLossWeekNumber: nextWeek
          });
          console.log(`🎯 WEIGHT LOSS JOURNEY: Advanced to week ${nextWeek} for user ${user.id}`);
        }
      }
      
      // Auto-generate shopping list for the meal plan
      try {
        const dietaryTags = user?.dietaryTags || [];
        const leftoverIngredients = user?.leftovers || [];
        
        let shoppingList = await generateEnhancedShoppingList(savedMeals, 'en', dietaryTags, leftoverIngredients);
        
        // Convert shopping list to persistent format and save it
        const itemsToSave = shoppingList.map((item, index) => {
          // Parse quantity and unit from totalAmount (e.g., "200g" -> quantity: 200, unit: "g")
          const { quantity, unit } = parseQuantityAndUnit(item.totalAmount);
          
          return {
            productName: item.ingredient,
            quantity: quantity,
            unit: unit,
            price: 0,
            category: item.category,
            sortOrder: index
          };
        });
        
        // Save the shopping list
        await storage.createShoppingList({
          userId: request.userId,
          mealPlanId: savedMealPlan.id,
          title: `Shopping List - Week ${savedMealPlan.weekStart}`,
          listType: 'regular',
          totalItems: shoppingList.length,
          checkedItems: 0,
          isActive: true
        });
        
        // Get the saved shopping list to add items
        const savedShoppingList = await storage.getShoppingList(request.userId, savedMealPlan.id, 'regular');
        if (savedShoppingList) {
          await storage.addShoppingListItems(savedShoppingList.id, itemsToSave);
          console.log('🛒 Auto-generated shopping list with', shoppingList.length, 'items');
        }
      } catch (error) {
        console.error('Failed to auto-generate shopping list:', error);
        // Don't fail the meal plan creation if shopping list fails
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

  // Get meal plans (filter by current user)
  app.get("/api/meal-plans", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : 2; // Default to user 2
      const mealPlans = await storage.getMealPlans(userId);
      
      // Enhance meal plans with meal count for accurate daily protein calculation
      const enhancedPlans = await Promise.all(mealPlans.map(async (plan) => {
        const planWithMeals = await storage.getMealPlanWithMeals(plan.id);
        const mealCount = planWithMeals?.meals?.length || 0;
        return {
          ...plan,
          mealCount
        };
      }));
      
      res.json(enhancedPlans);
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
      
      // Enhance meals with recipe ingredients for rainbow chart calculation
      if (mealPlan.meals) {
        const mealsWithIngredients = await Promise.all(mealPlan.meals.map(async meal => {
          if (meal.recipeId) {
            try {
              // Convert integer recipeId to string for lookup
              const recipe = await storage.getRecipeById(String(meal.recipeId));
              if (recipe) {
                return {
                  ...meal,
                  ingredients: recipe.ingredients || []
                };
              }
            } catch (error) {
              console.error(`Failed to fetch ingredients for recipe ${meal.recipeId}:`, error);
            }
          }
          return meal;
        }));
        mealPlan.meals = mealsWithIngredients;
      }
      
      // Translate meal names and types if Dutch is requested
      if (language === 'nl' && mealPlan.meals) {
        // Collect unique recipe IDs for batch translation lookup
        const recipeIds = mealPlan.meals
          .map(meal => meal.recipeId)
          .filter((id): id is string => id != null && id !== undefined);
        
        // Batch fetch pre-translated recipes from database
        const preTranslatedRecipes = recipeIds.length > 0
          ? await storage.getBatchRecipeTranslations(recipeIds, language)
          : [];
        
        // Create a lookup map for quick access
        const translationMap = new Map(
          preTranslatedRecipes.map(tr => [tr.recipeId, tr.name])
        );
        
        // Translate meals using pre-translated database or fallback to on-demand
        const translatedMeals = await Promise.all(mealPlan.meals.map(async meal => {
          let translatedName = meal.foodDescription;
          
          // Check if we have a pre-translated version in the database
          if (meal.recipeId && translationMap.has(meal.recipeId)) {
            translatedName = translationMap.get(meal.recipeId)!;
            console.log(`✅ Using pre-translated recipe: ${meal.recipeId} -> ${translatedName}`);
          } else {
            // Fall back to on-demand translation
            console.log(`🔄 Translating recipe ID: ${meal.recipeId} - ${meal.foodDescription}`);
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
            translatedName = translatedRecipe.name;
          }
          
          return {
            ...meal,
            foodDescription: translatedName,
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
      const allRecipes = await getCompleteEnhancedMealDatabase();
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

  // Automated Translation Endpoints
  app.post("/api/translate/manual", async (req, res) => {
    try {
      const { translateRecipesNow } = await import("./recipe-translator");
      const maxRecipes = req.body.maxRecipes ? parseInt(req.body.maxRecipes as string) : 3;
      
      console.log(`🚀 Manual translation triggered for ${maxRecipes} recipes`);
      const translatedRecipes = await translateRecipesNow(maxRecipes);
      
      res.json({
        success: true,
        message: `Successfully translated ${translatedRecipes.length} recipes`,
        translatedRecipes: translatedRecipes.map(recipe => ({
          originalId: recipe.originalId,
          translatedName: recipe.translatedName,
          language: recipe.language,
          languageCode: recipe.languageCode,
          translatedAt: recipe.translatedAt
        }))
      });
    } catch (error) {
      console.error('Manual translation failed:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to translate recipes', 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/translate/schedule", async (req, res) => {
    try {
      const { getNextTranslationDate, getAutomatedLanguages } = await import("./recipe-translator");
      
      const nextDate = getNextTranslationDate();
      const supportedLanguages = getAutomatedLanguages();
      
      res.json({
        nextScheduledTranslation: nextDate,
        supportedLanguages,
        schedule: {
          monthly: "1st of each month at 2:00 AM UTC",
          weeklyTest: "Every Sunday at 3:00 AM UTC"
        }
      });
    } catch (error) {
      console.error('Translation schedule status error:', error);
      res.status(500).json({ message: 'Failed to get translation schedule status' });
    }
  });

  // Batch fetch pre-translated recipes from database
  app.post("/api/recipes/translations/batch", async (req, res) => {
    try {
      const { recipeIds, language } = req.body;
      
      if (!recipeIds || !Array.isArray(recipeIds)) {
        return res.status(400).json({ message: "recipeIds array is required" });
      }
      
      if (!language || !['en', 'nl'].includes(language)) {
        return res.status(400).json({ message: "Valid language (en or nl) is required" });
      }

      console.log(`📚 Fetching ${recipeIds.length} recipe translations for language: ${language}`);
      
      const translations = await storage.getBatchRecipeTranslations(recipeIds, language);
      
      // Create a map for quick lookup
      const translationMap: Record<string, any> = {};
      translations.forEach(t => {
        translationMap[t.recipeId] = {
          recipeId: t.recipeId,
          language: t.language,
          name: t.name,
          ingredients: t.ingredients,
          instructions: t.instructions,
          tips: t.tips || [],
          notes: t.notes || [],
          translatedAt: t.translatedAt
        };
      });

      res.json({
        translations: translationMap,
        found: translations.length,
        requested: recipeIds.length
      });
    } catch (error) {
      console.error("Batch translation fetch error:", error);
      res.status(500).json({ message: "Failed to fetch translations" });
    }
  });

  // Get missing translations for a set of recipe IDs
  app.post("/api/recipes/translations/missing", async (req, res) => {
    try {
      const { recipeIds, language } = req.body;
      
      if (!recipeIds || !Array.isArray(recipeIds)) {
        return res.status(400).json({ message: "recipeIds array is required" });
      }
      
      if (!language || !['en', 'nl'].includes(language)) {
        return res.status(400).json({ message: "Valid language (en or nl) is required" });
      }

      const missingIds = await storage.getMissingTranslations(recipeIds, language);
      
      res.json({
        missingIds,
        count: missingIds.length,
        total: recipeIds.length
      });
    } catch (error) {
      console.error("Missing translations check error:", error);
      res.status(500).json({ message: "Failed to check missing translations" });
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

      // Find recipe by stored ID from meal database
      const { getCompleteEnhancedMealDatabase, findRecipeByName } = await import("./nutrition-enhanced");
      
      console.log(`🔄 Translating recipe ID: ${targetMeal.recipeId} - ${targetMeal.foodDescription}`);
      
      let mealOption = null;
      
      // If meal has a stored recipe ID, use it for fast lookup
      if (targetMeal.recipeId) {
        const allRecipes = await getCompleteEnhancedMealDatabase();
        mealOption = allRecipes.find(recipe => recipe.id === targetMeal.recipeId);
        
        if (mealOption) {
          console.log(`✅ Found recipe by ID: ${mealOption.id} - ${mealOption.name}`);
        } else {
          console.log(`⚠️  Recipe ID ${targetMeal.recipeId} not found in database, trying name lookup...`);
        }
      }
      
      // Fallback: Check admin modifications or lookup by name
      if (!mealOption) {
        const modifiedRecipes = await getModifiedRecipeDatabase();
        mealOption = modifiedRecipes.find(recipe => 
          recipe.name === targetMeal.foodDescription || recipe.id === targetMeal.foodDescription
        );
        
        if (!mealOption) {
          mealOption = await findRecipeByName(targetMeal.foodDescription);
        }
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
          
          const mealType = targetMeal.mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert' | 'smoothie';
          
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
          
          // Multiply AI-generated ingredients by portion size (2 servings) for cooking batch
          const PORTION_SIZE = 2;
          const multipliedAIIngredients = translatedAIRecipe.ingredients.map(ingredient => 
            multiplyIngredientAmount(ingredient, PORTION_SIZE)
          );
          
          return res.json({
            ...aiRecipe,
            name: translatedAIRecipe.name,
            portion: `${PORTION_SIZE} servings (cooking batch)`,
            ingredients: multipliedAIIngredients,
            instructions: translatedAIRecipe.instructions,
            tips: translatedAIRecipe.tips,
            notes: translatedAIRecipe.notes.join('\n'),
            vegetableContent: aiRecipe.vegetableContent || { servings: 0, vegetables: [], benefits: [] },
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
            tags: ["fallback"],
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
            portion: targetMeal.portion,
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
            id: mealOption.id,
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
          
          // Multiply AI-enhanced ingredients by portion size (2 servings) for cooking batch
          const PORTION_SIZE = 2;
          const multipliedEnhancedIngredients = translatedEnhancedRecipe.ingredients.map(ingredient => 
            multiplyIngredientAmount(ingredient, PORTION_SIZE)
          );
          
          return res.json({
            ...enhancedRecipe,
            name: translatedEnhancedRecipe.name,
            portion: `${PORTION_SIZE} servings (cooking batch)`,
            ingredients: multipliedEnhancedIngredients,
            instructions: translatedEnhancedRecipe.instructions,
            tips: translatedEnhancedRecipe.tips,
            notes: translatedEnhancedRecipe.notes.join('\n'),
            vegetableContent: enhancedRecipe.vegetableContent || { servings: 0, vegetables: [], benefits: [] },
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

      // Try to fetch pre-translated recipe from database first
      let translatedRecipe;
      
      if (mealOption.id && language !== 'en') {
        console.log(`🔍 Checking for pre-translated recipe: ${mealOption.id} in ${language}`);
        const preTranslated = await storage.getRecipeTranslation(mealOption.id, language);
        
        if (preTranslated) {
          console.log(`✅ Using pre-translated recipe from database for ${mealOption.id}`);
          translatedRecipe = {
            name: preTranslated.name,
            ingredients: finalIngredients.length > 0 && finalIngredients !== mealOption.ingredients 
              ? finalIngredients  // Use modified ingredients with leftovers
              : preTranslated.ingredients,
            instructions: finalInstructions.length > 0 && finalInstructions !== mealOption.recipe?.instructions
              ? finalInstructions  // Use modified instructions with leftovers
              : preTranslated.instructions,
            tips: preTranslated.tips || [],
            notes: preTranslated.notes || []
          };
        }
      }
      
      // Fallback to on-demand translation if no pre-translation exists
      if (!translatedRecipe) {
        console.log(`⏳ No pre-translation found, using on-demand translation for ${mealOption.id || mealOption.name}`);
        translatedRecipe = await translateRecipeEnhanced({
          id: mealOption.id,
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
      }

      // Use the MEAL'S adjusted nutrition values, not the original recipe values
      // This ensures the recipe dialog shows what the user is actually eating
      const mealNutrition = {
        protein: targetMeal.protein || 0,
        calories: targetMeal.calories || 0,
        carbohydrates: targetMeal.carbohydrates || 0,
        fats: targetMeal.fats || 0,
        fiber: targetMeal.fiber || 0,
        sugar: targetMeal.sugar || 0,
        sodium: targetMeal.sodium || 0,
        costEuros: targetMeal.costEuros || 0,
        proteinPerEuro: targetMeal.proteinPerEuro
      };

      // Calculate the scaling ratio for ingredients based on adjusted vs original nutrition
      // Use calories as the primary indicator of portion adjustment
      // CAP at 1.0 - TDEE adjustments should only reduce portions, never increase them
      const originalCalories = mealOption.nutrition?.calories || 1;
      const adjustedCalories = targetMeal.calories || originalCalories;
      const rawScalingRatio = adjustedCalories / originalCalories;
      const ingredientScalingRatio = Math.min(1.0, rawScalingRatio); // Cap at 1.0
      
      console.log(`📊 Ingredient scaling: ${adjustedCalories} kcal / ${originalCalories} kcal = ${rawScalingRatio.toFixed(2)}x → capped at ${ingredientScalingRatio.toFixed(2)}x`);

      // Recipes are stored with "1 serving" as the base in the database
      // Conversion logic (replit.md line 26: "All recipes display ingredients for 2 servings (cooking batch)"):
      // - Fresh lunch/dinner: Show "2 servings" (multiply by 2 for cooking batch)
      // - Breakfast: Show "1 serving" (multiply by 1, breakfast doesn't batch cook)
      // - Leftovers: Show "1 serving (leftover)" (multiply by 1, already cooked portion)
      const isBreakfast = targetMeal.mealType === 'breakfast';
      const BATCH_MULTIPLIER = targetMeal.isLeftover ? 1 : (isBreakfast ? 1 : 2);
      const portionLabel = targetMeal.isLeftover ? '1 serving (leftover)' : 
                           (isBreakfast ? '1 serving' : '2 servings (cooking batch)');
      
      // Scaling order: 1) Batch cooking (2x for lunch/dinner), 2) TDEE adjustment
      const adjustedIngredients = translatedRecipe.ingredients.map(ingredient => {
        // First apply batch cooking multiplier (2x for fresh lunch/dinner)
        const batchScaledIngredient = multiplyIngredientAmount(ingredient, BATCH_MULTIPLIER);
        // Then scale for TDEE adjustment (e.g., 1.1 for slight caloric increase)
        return multiplyIngredientAmount(batchScaledIngredient, ingredientScalingRatio);
      });
      
      // Add note about portion adjustment if ingredients were scaled down
      let portionAdjustmentNote = '';
      if (ingredientScalingRatio < 0.99) {  // Allow 1% tolerance for rounding
        const percentageReduction = Math.round((1 - ingredientScalingRatio) * 100);
        if (language === 'nl') {
          portionAdjustmentNote = `${percentageReduction}% kleinere porties voor betere voedingswaarde`;
        } else {
          portionAdjustmentNote = `${percentageReduction}% smaller portions for better nutritional balance`;
        }
      }
      
      res.json({
        name: translatedRecipe.name,
        portion: portionLabel,
        ingredients: adjustedIngredients,  // Adjusted for both portion size and cooking batch
        instructions: translatedRecipe.instructions,
        tips: translatedRecipe.tips,
        notes: translatedRecipe.notes.join('\n'),
        portionAdjustmentNote: portionAdjustmentNote,  // Separate field for portion adjustment message
        prepTime: targetMeal.prepTime || mealOption.nutrition?.prepTime || 30,
        nutrition: mealNutrition,  // Use meal's adjusted nutrition values
        tags: mealOption.tags || [],
        vegetableContent: mealOption.vegetableContent || { servings: 0, vegetables: [], benefits: [] },
        recipeBenefits: getTopRecipeBenefits(
          finalIngredients,
          mealNutrition,
          mealOption.tags || [],
          6
        )
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
      console.log(`🌐 SHOPPING LIST: Received language parameter: "${language}" (from query: ${req.query.language})`);
      const mealPlan = await storage.getMealPlanWithMeals(id);
      
      if (!mealPlan) {
        return res.status(404).json({ message: "Meal plan not found" });
      }

      // Get user dietary preferences for vegan egg alternatives
      const user = await storage.getUser(mealPlan.userId);
      const dietaryTags = user?.dietaryTags || [];
      const leftoverIngredients = user?.leftovers || [];

      // ALWAYS generate shopping list with English recipes first
      let shoppingList = await generateEnhancedShoppingList(mealPlan.meals, 'en', dietaryTags, leftoverIngredients);
      
      // Then translate individual ingredient names if Dutch is requested
      if (language === 'nl') {
        shoppingList = translateShoppingList(shoppingList, 'nl');
      }

      // Ensure shopping list is an array
      if (!Array.isArray(shoppingList)) {
        console.error(`❌ Shopping list is not an array:`, typeof shoppingList, shoppingList);
        return res.status(500).json({ message: "Failed to generate shopping list" });
      }

      // VALIDATION: Ensure no shopping list items have empty amounts
      const itemsWithEmptyAmounts = shoppingList.filter(item => !item.totalAmount || item.totalAmount === '' || item.totalAmount === '0');
      if (itemsWithEmptyAmounts.length > 0) {
        console.warn(`⚠️ SHOPPING LIST VALIDATION: Found ${itemsWithEmptyAmounts.length} items with empty amounts, fixing...`);
        itemsWithEmptyAmounts.forEach(item => {
          console.warn(`  - Fixing empty amount for: ${item.ingredient} (${item.category})`);
          const defaultPortion = getDefaultPortion(item.ingredient);
          item.totalAmount = defaultPortion.amount.toString();
          item.unit = defaultPortion.unit;
        });
        console.log(`✅ SHOPPING LIST VALIDATION: Fixed all empty amounts`);
      }
      
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
      console.log(`🌐 SHOPPING LIST TRANSLATION: Applying language "${language}" to shopping list`);
      const translatedResponse = translateShoppingList(shoppingListResponse, language);
      console.log(`🌐 SHOPPING LIST RESULT: Translated ${translatedResponse.categories?.length || 0} categories for language "${language}"`);
      
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
      
      // Exclude password from response for security
      const { password, ...userProfile } = user;
      res.json(userProfile);
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
      
      // Exclude password from response for security
      const { password, ...userProfile } = updatedUser;
      res.json(userProfile);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ message: 'Failed to update user profile' });
    }
  };

  app.patch('/api/users/:id/profile', handleProfileUpdate);
  app.put('/api/users/:id/profile', handleProfileUpdate);

  // Mark welcome message as seen
  app.post('/api/users/:id/welcome-seen', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Check if user is authenticated and matches the ID
      if (!req.session?.userId || req.session.userId !== userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const updatedUser = await storage.updateUserProfile(userId, { hasSeenWelcome: true });
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({ success: true, hasSeenWelcome: true });
    } catch (error) {
      console.error('Error marking welcome as seen:', error);
      res.status(500).json({ message: 'Failed to update welcome status' });
    }
  });

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
      
      // Auto-generate shopping list for the meal plan
      try {
        const dietaryTags = user?.dietaryTags || [];
        const leftoverIngredients = user?.leftovers || [];
        
        let shoppingList = await generateEnhancedShoppingList(savedMeals, 'en', dietaryTags, leftoverIngredients);
        
        // Convert shopping list to persistent format and save it
        const itemsToSave = shoppingList.map((item, index) => {
          // Parse quantity and unit from totalAmount (e.g., "200g" -> quantity: 200, unit: "g")
          const { quantity, unit } = parseQuantityAndUnit(item.totalAmount);
          
          return {
            productName: item.ingredient,
            quantity: quantity,
            unit: unit,
            price: 0,
            category: item.category,
            sortOrder: index
          };
        });
        
        // Save the shopping list
        await storage.createShoppingList({
          userId: userId,
          mealPlanId: savedMealPlan.id,
          title: `Shopping List - Week ${savedMealPlan.weekStart}`,
          listType: 'regular',
          totalItems: shoppingList.length,
          checkedItems: 0,
          isActive: true
        });
        
        // Get the saved shopping list to add items
        const savedShoppingList = await storage.getShoppingList(userId, savedMealPlan.id, 'regular');
        if (savedShoppingList) {
          await storage.addShoppingListItems(savedShoppingList.id, itemsToSave);
          console.log('🛒 Auto-generated shopping list with', shoppingList.length, 'items');
        }
      } catch (error) {
        console.error('Failed to auto-generate shopping list:', error);
        // Don't fail the meal plan creation if shopping list fails
      }
      
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

  // Persistent Shopping Lists API
  
  // Get existing shopping list for user and meal plan
  app.get("/api/shopping-lists/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const mealPlanId = req.query.mealPlanId ? parseInt(req.query.mealPlanId as string) : undefined;
      const listType = (req.query.listType as string) || "regular";
      const language = (req.query.language as 'en' | 'nl') || 'en';
      console.log(`🌐 SAVED SHOPPING LIST: Received language parameter: "${language}" for user ${userId}`);
      
      const shoppingList = await storage.getShoppingList(userId, mealPlanId, listType);
      
      if (!shoppingList) {
        return res.json({ shoppingList: null, message: "No saved shopping list found" });
      }
      
      // Translate shopping list categories and item names if Dutch is requested
      if (language === 'nl') {
        console.log(`🌐 SAVED LIST TRANSLATION: Translating saved shopping list with ${shoppingList.items.length} items`);
        
        // Transform the saved list format to match the translation function expected format
        const translationFormat = {
          shoppingList: shoppingList.items.map(item => ({
            ingredient: item.productName,
            category: item.category,
            totalAmount: `${item.quantity}${item.unit}`,
            isChecked: item.isChecked
          })),
          categories: [...new Set(shoppingList.items.map(item => item.category))]
        };
        
        const translatedList = translateShoppingList(translationFormat, language);
        
        // Transform back to the saved list format with translated data
        const translatedItems = shoppingList.items.map((item, index) => ({
          ...item,
          productName: translatedList.shoppingList[index]?.ingredient || item.productName,
          category: translatedList.shoppingList[index]?.category || item.category
        }));
        
        console.log(`🌐 SAVED LIST RESULT: Translated ${translatedList.categories?.length || 0} categories`);
        
        res.json({ 
          shoppingList: {
            ...shoppingList,
            items: translatedItems
          },
          message: `Found saved shopping list with ${shoppingList.items.length} items (translated to Dutch)`
        });
      } else {
        res.json({ 
          shoppingList,
          message: `Found saved shopping list with ${shoppingList.items.length} items`
        });
      }
    } catch (error) {
      console.error("Error retrieving shopping list:", error);
      res.status(500).json({ message: "Failed to retrieve shopping list" });
    }
  });
  
  // Create/save a new shopping list
  app.post("/api/shopping-lists", async (req, res) => {
    try {
      const { userId, mealPlanId, title, listType, items } = req.body;
      
      if (!userId || !items || !Array.isArray(items)) {
        return res.status(400).json({ message: "userId and items array are required" });
      }
      
      // Check if a shopping list already exists for this user/meal plan/type
      const existingList = await storage.getShoppingList(userId, mealPlanId, listType || "regular");
      
      let shoppingList;
      if (existingList) {
        // Update existing shopping list
        await storage.clearShoppingListItems(existingList.id);
        shoppingList = await storage.updateShoppingList(existingList.id, {
          title: title || existingList.title,
          totalItems: items.length,
          checkedItems: 0,
          lastUpdated: new Date()
        });
      } else {
        // Create new shopping list
        shoppingList = await storage.createShoppingList({
          userId,
          mealPlanId,
          title: title || "Shopping List",
          listType: listType || "regular",
          totalItems: items.length,
          checkedItems: 0
        });
      }
      
      // Add all items to the shopping list
      if (items.length > 0) {
        await storage.addShoppingListItems(shoppingList.id, items.map((item: any, index: number) => ({
          productName: item.productName || item.name || item.item,
          quantity: item.quantity || 1,
          unit: item.unit || "piece",
          price: item.price || 0,
          category: item.category || "Other",
          sortOrder: index,
          productId: item.productId,
          imageUrl: item.imageUrl,
          deepLink: item.deepLink
        })));
      }
      
      // Get the complete shopping list with items
      const completeList = await storage.getShoppingList(userId, mealPlanId, listType || "regular");
      
      res.status(201).json({
        shoppingList: completeList,
        message: `Shopping list saved with ${items.length} items`
      });
    } catch (error) {
      console.error("Error saving shopping list:", error);
      res.status(500).json({ message: "Failed to save shopping list" });
    }
  });
  
  // Update shopping list item (check/uncheck)
  app.put("/api/shopping-lists/:listId/items/:itemId", async (req, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const updates = req.body;
      
      const updatedItem = await storage.updateShoppingListItem(itemId, updates);
      
      res.json({
        item: updatedItem,
        message: `Item ${updates.isChecked ? 'checked' : 'unchecked'}`
      });
    } catch (error) {
      console.error("Error updating shopping list item:", error);
      res.status(500).json({ message: "Failed to update item" });
    }
  });
  
  // Delete shopping list
  app.delete("/api/shopping-lists/:id", async (req, res) => {
    try {
      const listId = parseInt(req.params.id);
      
      await storage.deleteShoppingList(listId);
      
      res.json({ message: "Shopping list deleted successfully" });
    } catch (error) {
      console.error("Error deleting shopping list:", error);
      res.status(500).json({ message: "Failed to delete shopping list" });
    }
  });

  // Analyze ingredients to show their shopping categories
  app.post("/api/analyze-ingredients", async (req, res) => {
    try {
      const { ingredients } = req.body;
      
      if (!Array.isArray(ingredients)) {
        return res.status(400).json({ message: "Ingredients must be an array" });
      }

      const categorizeIngredient = (ingredient: string): string => {
        const cleaned = ingredient
          .replace(/\d+g?/g, '') // Remove quantities
          .replace(/\([^)]*\)/g, '') // Remove parentheses
          .replace(/,.*$/g, '') // Remove everything after comma
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();

        // Enhanced categorization logic matching albert-heijn.ts
        if (cleaned.includes('mushroom') || cleaned.includes('champignon') || 
            cleaned.includes('garlic') || cleaned.includes('onion') || 
            cleaned.includes('tomato') || cleaned.includes('pepper') ||
            cleaned.includes('lettuce') || cleaned.includes('spinach') ||
            cleaned.includes('kale') || cleaned.includes('broccoli') ||
            cleaned.includes('cauliflower') || cleaned.includes('carrot') ||
            cleaned.includes('celery') || cleaned.includes('cucumber') ||
            cleaned.includes('zucchini') || cleaned.includes('eggplant') ||
            cleaned.includes('squash') || cleaned.includes('pumpkin') ||
            cleaned.includes('sweet potato') || cleaned.includes('potato') ||
            cleaned.includes('beet') || cleaned.includes('radish') ||
            cleaned.includes('cabbage') || cleaned.includes('bok choy') ||
            cleaned.includes('brussels') || cleaned.includes('asparagus') ||
            cleaned.includes('artichoke') || cleaned.includes('leek') ||
            cleaned.includes('fennel') || cleaned.includes('turnip') ||
            cleaned.includes('parsnip') || cleaned.includes('rutabaga') ||
            cleaned.includes('apple') || cleaned.includes('banana') ||
            cleaned.includes('orange') || cleaned.includes('grape') ||
            cleaned.includes('strawberry') || cleaned.includes('blueberry') ||
            cleaned.includes('raspberry') || cleaned.includes('blackberry') ||
            cleaned.includes('cherry') || cleaned.includes('peach') ||
            cleaned.includes('pear') || cleaned.includes('plum') ||
            cleaned.includes('kiwi') || cleaned.includes('mango') ||
            cleaned.includes('pineapple') || cleaned.includes('lime') ||
            cleaned.includes('lemon')) {
          return 'Groente & fruit';
        } else if (cleaned.includes('milk') || cleaned.includes('cheese') ||
                  cleaned.includes('egg') || cleaned.includes('yogurt') ||
                  cleaned.includes('kefir') || cleaned.includes('cream') ||
                  cleaned.includes('butter') || cleaned.includes('ghee') ||
                  cleaned.includes('feta') || cleaned.includes('mozzarella') ||
                  cleaned.includes('parmesan') || cleaned.includes('cheddar') ||
                  cleaned.includes('goat cheese') || cleaned.includes('ricotta') ||
                  cleaned.includes('skyr') || cleaned.includes('quark')) {
          return 'Zuivel & eieren';
        } else if (cleaned.includes('chicken') || cleaned.includes('beef') ||
                  cleaned.includes('fish') || cleaned.includes('meat') ||
                  cleaned.includes('tofu') || cleaned.includes('tempeh') ||
                  cleaned.includes('salmon') || cleaned.includes('tuna') ||
                  cleaned.includes('shrimp') || cleaned.includes('turkey') ||
                  cleaned.includes('pork') || cleaned.includes('ham') ||
                  cleaned.includes('bacon') || cleaned.includes('sausage') ||
                  cleaned.includes('edamame') || cleaned.includes('chickpea') ||
                  cleaned.includes('lentil') || cleaned.includes('bean')) {
          return 'Vlees, vis & vega';
        } else if (cleaned.includes('peanut butter') || cleaned.includes('nut butter') ||
                  cleaned.includes('jam') || cleaned.includes('honey') ||
                  cleaned.includes('maple syrup') || cleaned.includes('marmalade') ||
                  cleaned.includes('hazelnut spread') || cleaned.includes('almond butter')) {
          return 'Ontbijt & beleg';
        } else if (cleaned.includes('bread') || cleaned.includes('pastry') ||
                  cleaned.includes('croissant') || cleaned.includes('baguette') ||
                  cleaned.includes('roll') || cleaned.includes('bun')) {
          return 'Brood & gebak';
        } else if (cleaned.includes('rice') || cleaned.includes('pasta') ||
                  cleaned.includes('quinoa') || cleaned.includes('noodle') ||
                  cleaned.includes('couscous') || cleaned.includes('bulgur')) {
          return 'Pasta, rijst & wereldkeuken';
        } else if (cleaned.includes('sauce') || cleaned.includes('stock') ||
                  cleaned.includes('broth') || cleaned.includes('paste') ||
                  cleaned.includes('curry paste') || cleaned.includes('tomato paste')) {
          return 'Soepen, sauzen & kruiden';
        } else if (cleaned.includes('chocolate') || cleaned.includes('cookie') ||
                  cleaned.includes('cake') || cleaned.includes('candy')) {
          return 'Snoep, koek & chips';
        } else if (cleaned.includes('protein powder') || cleaned.includes('supplement')) {
          return 'Bewuste voeding';
        } else if (cleaned.includes('water') || cleaned.includes('juice') ||
                  cleaned.includes('tea') || cleaned.includes('coffee')) {
          return 'Dranken';
        }
        
        return 'Te zoeken'; // Default/uncategorized
      };

      // Helper function to normalize ingredient name
      const normalizeIngredient = (ingredient: string): string => {
        return ingredient
          .replace(/\d+g?/g, '') // Remove quantities
          .replace(/\([^)]*\)/g, '') // Remove parentheses
          .replace(/,.*$/g, '') // Remove everything after comma
          .replace(/\s+/g, ' ')
          .trim();
      };

      const analysis = ingredients.map((ingredient: string) => ({
        ingredient,
        normalizedIngredient: normalizeIngredient(ingredient),
        category: categorizeIngredient(ingredient)
      }));

      res.json({ analysis });
    } catch (error) {
      console.error("Error analyzing ingredients:", error);
      res.status(500).json({ message: "Failed to analyze ingredients" });
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
      
      // Create shopping list with ingredient mapping support
      const shoppingList = await albertHeijnService.createShoppingListFromMealPlan(dutchIngredients, storage);
      
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
      
      const shoppingList = await albertHeijnService.createShoppingListFromMealPlan(dutchIngredients, storage);
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
      
      // Recipe measurements are automatically converted in the unified database system
      console.log('📏 Recipe measurements are automatically converted to metric in the enhanced database');
      const validation = await validateAllRecipeIngredients();
      
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
      const validation = await validateAllRecipeIngredients();
      
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
  (async () => {
    try {
      console.log('🚀 Server startup: Skipping ingredient validation (database-first architecture)');
      console.log('📏 Recipe measurements are automatically converted to metric in the enhanced database');
      console.log('📊 Ingredient validation: All recipes loaded from database');
      // Note: Ingredient validation disabled to prevent database timeout on startup
      // Use /api/recipes/validate-ingredients endpoint to manually trigger validation if needed
    } catch (error) {
      console.error("Error running startup ingredient update:", error);
    }
  })();

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
      
      // AUTOMATIC FIBER VALIDATION: Ensure user recipe has adequate fiber content (after protein enhancement)
      console.log('🌾 VALIDATING FIBER SOURCES: Checking custom recipe for adequate fiber content');
      const targetFiber = 10; // Target 10g fiber per meal
      const fiberAnalysis = hasAdequateFiberSource(finalIngredients, targetFiber);
      
      if (!fiberAnalysis.hasFiber) {
        console.log(`⚠️ Custom recipe "${formData.name}" has insufficient fiber (${fiberAnalysis.estimatedFiber}g < ${targetFiber}g). Auto-enhancing...`);
        
        const fiberEnhancement = enhanceRecipeWithFiber(
          formData.name,
          finalIngredients,
          formData.tags || [],
          targetFiber
        );
        
        if (fiberEnhancement.addedFibers.length > 0) {
          finalIngredients = fiberEnhancement.enhancedIngredients;
          // Update fiber in nutrition if enhanced
          if (finalNutrition) {
            finalNutrition.fiber = Math.max(finalNutrition.fiber || 0, (finalNutrition.fiber || 0) + fiberEnhancement.fiberIncrease);
          }
          
          // Add fiber benefits and tips to user recipe
          let fiberNotes = '';
          if (fiberEnhancement.fiberBenefits.length > 0) {
            fiberNotes += `Fiber benefits: ${fiberEnhancement.fiberBenefits.join(', ')}. `;
          }
          if (fiberEnhancement.fiberTips.length > 0) {
            fiberNotes += fiberEnhancement.fiberTips.join('. ');
          }
          
          // Store fiber enhancement info for later use in recipe data
          formData.fiberEnhancementNotes = fiberNotes;
          
          console.log(`✅ Enhanced custom recipe with ${fiberEnhancement.addedFibers.map(f => f.name).join(', ')} (+${fiberEnhancement.fiberIncrease}g fiber)`);
        }
      } else {
        console.log(`✅ Custom recipe "${formData.name}" has adequate fiber (${fiberAnalysis.estimatedFiber}g)`);
      }
      
      // Add seasonal month tags to the recipe before saving
      const { addSeasonalMonthTagsToRecipe } = await import("./nutrition-enhanced");
      
      // Create a temporary recipe object for seasonal tagging
      const tempRecipe = {
        id: "temp",
        name: formData.name,
        ingredients: finalIngredients,
        tags: formData.tags || [],
        nutrition: {
          protein: finalNutrition?.protein || 0,
          calories: finalNutrition?.calories || 0,
          prepTime: formData.prepTime || 30
        }
      };
      
      // Add seasonal month tags based on ingredients and characteristics
      const recipeWithSeasonalTags = await addSeasonalMonthTagsToRecipe(tempRecipe);
      
      // Combine form data with AI-generated nutrition and seasonal tags
      const recipeData = {
        ...formData,
        ...nutritionAnalysis,
        ingredients: finalIngredients, // Use protein-enhanced ingredients if needed
        nutrition: finalNutrition, // Use protein-enhanced nutrition if needed
        tags: recipeWithSeasonalTags.tags, // Include seasonal month tags
        portion: "1 serving", // Set default portion
        cookTime: 0, // Set default cookTime since we merged it into prepTime
        difficulty: "easy", // Set default difficulty since we removed the field
        userId: req.session.userId
      };
      
      console.log('✅ AI nutrition analysis complete:', nutritionAnalysis);
      console.log('🗓️ Added seasonal month tags:', recipeWithSeasonalTags.tags.filter(tag => 
        ['January', 'February', 'March', 'April', 'May', 'June', 
         'July', 'August', 'September', 'October', 'November', 'December'].includes(tag)
      ));
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
        
        // AUTOMATIC FIBER VALIDATION: Ensure updated recipe has adequate fiber content (after protein enhancement)
        console.log('🌾 VALIDATING FIBER SOURCES: Re-checking updated recipe for adequate fiber content');
        const targetFiber = 10; // Target 10g fiber per meal
        const fiberAnalysis = hasAdequateFiberSource(finalIngredients, targetFiber);
        
        if (!fiberAnalysis.hasFiber) {
          console.log(`⚠️ Updated recipe has insufficient fiber (${fiberAnalysis.estimatedFiber}g < ${targetFiber}g). Auto-enhancing...`);
          
          const fiberEnhancement = enhanceRecipeWithFiber(
            updateData.name || "Updated recipe",
            finalIngredients,
            updateData.tags || [],
            targetFiber
          );
          
          if (fiberEnhancement.addedFibers.length > 0) {
            finalIngredients = fiberEnhancement.enhancedIngredients;
            if (finalNutrition) {
              finalNutrition.fiber = Math.max(finalNutrition.fiber || 0, (finalNutrition.fiber || 0) + fiberEnhancement.fiberIncrease);
            }
            
            // Add fiber enhancement notes to updated recipe
            let fiberNotes = '';
            if (fiberEnhancement.fiberBenefits.length > 0) {
              fiberNotes += `Fiber benefits: ${fiberEnhancement.fiberBenefits.join(', ')}. `;
            }
            if (fiberEnhancement.fiberTips.length > 0) {
              fiberNotes += fiberEnhancement.fiberTips.join('. ');
            }
            
            updateData.fiberEnhancementNotes = fiberNotes;
            
            console.log(`✅ Enhanced updated recipe with ${fiberEnhancement.addedFibers.map(f => f.name).join(', ')} (+${fiberEnhancement.fiberIncrease}g fiber)`);
          }
        }
        
        // Add seasonal month tags to the updated recipe
        const { addSeasonalMonthTagsToRecipe } = await import("./nutrition-enhanced");
        
        // Create a temporary recipe object for seasonal tagging
        const tempUpdatedRecipe = {
          id: "temp",
          name: updateData.name || "Updated recipe",
          ingredients: finalIngredients,
          tags: updateData.tags || [],
          nutrition: {
            protein: finalNutrition?.protein || 0,
            calories: finalNutrition?.calories || 0,
            prepTime: updateData.prepTime || 30
          }
        };
        
        // Add seasonal month tags based on updated ingredients and characteristics
        const updatedRecipeWithSeasonalTags = await addSeasonalMonthTagsToRecipe(tempUpdatedRecipe);
        
        // Include AI-generated nutrition and protein/fiber validation in update
        const dataWithNutrition = {
          ...updateData,
          ...nutritionAnalysis,
          ingredients: finalIngredients,
          nutrition: finalNutrition,
          tags: updatedRecipeWithSeasonalTags.tags // Include updated seasonal month tags
        };
        
        console.log('✅ AI nutrition re-analysis complete:', nutritionAnalysis);
        console.log('🗓️ Updated seasonal month tags:', updatedRecipeWithSeasonalTags.tags.filter(tag => 
          ['January', 'February', 'March', 'April', 'May', 'June', 
           'July', 'August', 'September', 'October', 'November', 'December'].includes(tag)
        ));
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

      // Auto-detect weight loss goal from weight loss tracking
      // If user has started weight loss journey (weightLossWeekNumber > 0), use lose_fat goal
      let userGoal = (user.goal as any) || 'maintain';
      if (user.weightLossWeekNumber && user.weightLossWeekNumber > 0) {
        userGoal = 'lose_fat';
        console.log(`🎯 Auto-detected lose_fat goal for user ${userId} (week ${user.weightLossWeekNumber} of weight loss)`);
      }

      // Create nutrition profile from user data
      const profile: NutritionProfile = {
        age: user.age || 30,
        weight: user.weight || 70,
        gender: (user.gender as 'male' | 'female' | 'other') || 'other',
        activityLevel: (user.activityLevel as any) || 'moderate',
        trainingType: (user.trainingType as any) || 'endurance',
        goal: userGoal,
        weightLossWeekNumber: user.weightLossWeekNumber || undefined
      };

      // Calculate comprehensive nutrition targets
      const targets = calculateNutritionTargets(profile, user.height || undefined);
      
      res.json(targets);
    } catch (error) {
      console.error("Error calculating nutrition targets:", error);
      res.status(500).json({ message: "Failed to calculate nutrition targets" });
    }
  });

  // Editable Content routes
  // Get all editable content
  app.get("/api/editable-content", async (req, res) => {
    try {
      const content = await storage.getEditableContent();
      res.json(content);
    } catch (error) {
      console.error("Error fetching editable content:", error);
      res.status(500).json({ message: "Failed to fetch editable content" });
    }
  });

  // Get specific editable content by key
  app.get("/api/editable-content/:contentKey", async (req, res) => {
    try {
      const contentKey = req.params.contentKey;
      const content = await storage.getEditableContent(contentKey);
      
      if (content.length === 0) {
        return res.status(404).json({ message: "Content not found" });
      }
      
      res.json(content[0]);
    } catch (error) {
      console.error("Error fetching editable content:", error);
      res.status(500).json({ message: "Failed to fetch editable content" });
    }
  });

  // Update editable content (admin only)
  app.put("/api/editable-content/:contentKey", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Check if user is admin
      const user = await storage.getUser(req.session.userId);
      const isAdmin = user?.username === 'admin' || user?.email?.includes('admin');
      
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const contentKey = req.params.contentKey;
      const updates = req.body;
      updates.updatedBy = req.session.userId;

      const updatedContent = await storage.updateEditableContent(contentKey, updates);
      res.json(updatedContent);
    } catch (error) {
      console.error("Error updating editable content:", error);
      res.status(500).json({ message: "Failed to update editable content" });
    }
  });

  // ============================================
  // RECIPE MANAGEMENT API ENDPOINTS (ADMIN ONLY)
  // ============================================

  // Helper function to get modified recipe database
  // NOW SIMPLIFIED: Recipes table is the source of truth (no overlay needed)
  async function getModifiedRecipeDatabase(): Promise<MealOption[]> {
    // Database is now the source of truth - all modifications are saved directly to recipes table
    return await getCompleteEnhancedMealDatabase();
  }

  // Helper function to extract userId from JWT token
  function getUserIdFromToken(req: any): number | null {
    const token = extractTokenFromHeader(req);
    if (!token) return null;
    
    const payload = verifyToken(token);
    return payload?.userId || null;
  }

  // Helper function to check admin access
  async function isAdminUser(userId: number): Promise<boolean> {
    const user = await storage.getUser(userId);
    return user?.username === 'admin' || user?.email?.includes('admin') || false;
  }

  // GET /api/admin/stats - Get system statistics
  app.get("/api/admin/stats", async (req, res) => {
    try {
      const userId = getUserIdFromToken(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const isAdmin = await isAdminUser(userId);
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get total users
      const allUsers = await storage.getAllUsers();
      const totalUsers = allUsers.length;

      // Get active users in last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const activeUsers7Days = allUsers.filter(u => u.lastLoginAt && new Date(u.lastLoginAt) > sevenDaysAgo).length;

      // Get total meal plans (all users)
      const allMealPlans = await storage.getMealPlans();
      const totalMealPlans = allMealPlans.length;

      // Get total recipes
      const allRecipes = await storage.getAllRecipes(true);
      const totalRecipes = allRecipes.length;

      // Calculate average protein target
      const usersWithProtein = allUsers.filter(u => u.proteinTarget);
      const avgProteinTarget = usersWithProtein.length > 0
        ? usersWithProtein.reduce((sum, u) => sum + (u.proteinTarget || 0), 0) / usersWithProtein.length
        : 0;

      // Get popular activity levels
      const activityCounts = allUsers.reduce((acc, user) => {
        const level = user.activityLevel || 'unknown';
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const popularActivityLevels = Object.entries(activityCounts)
        .map(([level, count]) => ({ level, count }))
        .sort((a, b) => b.count - a.count);

      // Get recent generations (last 7 days)
      const recentGenerations = allMealPlans.filter(mp => {
        const createdAt = new Date(mp.createdAt);
        return createdAt > sevenDaysAgo;
      }).length;

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
      console.error("Error getting admin stats:", error);
      res.status(500).json({ message: "Failed to get statistics" });
    }
  });

  // GET /api/admin/users - Get all users (admin only)
  app.get("/api/admin/users", async (req, res) => {
    try {
      const userId = getUserIdFromToken(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const isAdmin = await isAdminUser(userId);
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error) {
      console.error("Error getting users:", error);
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  // DELETE /api/admin/users/:id - Delete a user (admin only)
  app.delete("/api/admin/users/:id", async (req, res) => {
    try {
      const userId = getUserIdFromToken(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const isAdmin = await isAdminUser(userId);
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const userIdToDelete = parseInt(req.params.id);
      
      // Prevent deleting the admin user (yourself)
      if (userIdToDelete === userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      await storage.deleteUser(userIdToDelete);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Get current in-memory modifications (admin only)
  app.get("/api/admin/recipe-modifications", async (req, res) => {
    try {
      const userId = getUserIdFromToken(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const isAdmin = await isAdminUser(userId);
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const modifications = Array.from(recipeModifications.entries()).map(([id, recipe]) => ({
        id,
        recipe: {
          name: recipe.name,
          ingredients: recipe.ingredients,
          instructions: recipe.recipe?.instructions || [],
          nutrition: recipe.nutrition
        }
      }));

      const deleted = Array.from(deletedRecipes);

      res.json({
        modifications: modifications,
        deletedRecipes: deleted,
        totalModifications: modifications.length,
        totalDeleted: deleted.length
      });
    } catch (error) {
      console.error("Error getting recipe modifications:", error);
      res.status(500).json({ message: "Failed to get modifications" });
    }
  });

  // Save current modifications to database permanently (admin only)
  app.post("/api/admin/save-recipe-modifications", async (req, res) => {
    try {
      const userId = getUserIdFromToken(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const isAdmin = await isAdminUser(userId);
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      let savedCount = 0;
      let deletedCount = 0;

      // Save all current modifications to database
      for (const [recipeId, recipe] of recipeModifications.entries()) {
        try {
          await storage.saveRecipeModification(recipeId, {
            name: recipe.name,
            ingredients: recipe.ingredients,
            instructions: recipe.recipe?.instructions || [],
            nutrition: recipe.nutrition,
            category: recipe.category,
            tags: recipe.tags,
            portion: recipe.portion,
            modifiedBy: req.session.userId,
            modifiedAt: new Date()
          });
          savedCount++;
        } catch (error) {
          console.error(`Failed to save modification for recipe ${recipeId}:`, error);
        }
      }

      // Save deleted recipes to database
      for (const recipeId of deletedRecipes) {
        try {
          await storage.saveRecipeDeletion(recipeId, req.session.userId);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to save deletion for recipe ${recipeId}:`, error);
        }
      }

      res.json({
        message: "Recipe modifications saved to database",
        savedModifications: savedCount,
        savedDeletions: deletedCount,
        totalProcessed: savedCount + deletedCount
      });
    } catch (error) {
      console.error("Error saving recipe modifications:", error);
      res.status(500).json({ message: "Failed to save modifications to database" });
    }
  });

  // GET /api/admin/unified-recipes - Get all recipes from database (admin view)
  app.get("/api/admin/unified-recipes", async (req, res) => {
    try {
      const userId = getUserIdFromToken(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const isAdmin = await isAdminUser(userId);
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get all active recipes directly from database (bypass enhanced database processing)
      const dbRecipes = await storage.getAllRecipes(true); // Only active recipes
      
      // Convert database Recipe format to MealOption format for admin panel
      const allRecipes = dbRecipes.map(recipe => {
        const nutritionData = recipe.nutrition as any || {};
        const vegContent = recipe.vegetableContent as any || {};
        
        return {
          id: recipe.id, // Keep as text string
          name: recipe.name,
          category: recipe.category as any,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          portion: recipe.portion,
          wholeFoodLevel: recipe.wholeFoodLevel || 'moderate',
          nutrition: nutritionData,
          vegetableContent: vegContent,
          tags: recipe.tags || [],
          prepTime: recipe.prepTime
        } as MealOption;
      });
      
      // Sort by ID for consistent ordering
      const sortedRecipes = allRecipes.sort((a, b) => {
        const aId = a.id ? parseInt(String(a.id)) : 0;
        const bId = b.id ? parseInt(String(b.id)) : 0;
        return aId - bId;
      });

      res.json({
        recipes: sortedRecipes,
        total: sortedRecipes.length,
        breakdown: {
          base: sortedRecipes.filter(r => r.id && parseInt(String(r.id)) < 100000).length,
          glutenFree: sortedRecipes.filter(r => r.id && parseInt(String(r.id)) >= 100000 && parseInt(String(r.id)) < 200000).length,
          lactoseFree: sortedRecipes.filter(r => r.id && parseInt(String(r.id)) >= 200000 && parseInt(String(r.id)) < 300000).length,
          vegetarian: sortedRecipes.filter(r => r.id && parseInt(String(r.id)) >= 300000).length
        }
      });
    } catch (error) {
      console.error("Error getting unified recipes:", error);
      res.status(500).json({ message: "Failed to get recipes" });
    }
  });

  // DELETE /api/admin/unified-recipes/:id - Delete a recipe from unified database
  app.delete("/api/admin/unified-recipes/:id", async (req, res) => {
    const { recipeDeletionCache } = await import('./recipe-deletion-cache.js');
    
    try {
      const userId = getUserIdFromToken(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const isAdmin = await isAdminUser(userId);
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ message: "Recipe ID is required" });
      }

      // Save deletion to database FIRST
      await storage.saveRecipeDeletion(id, req.session.userId);

      // Only update cache after successful DB write
      recipeDeletionCache.addDeletion(id);

      res.json({
        message: "Recipe deleted successfully",
        recipeId: id
      });
    } catch (error) {
      console.error("Error deleting recipe:", error);
      res.status(500).json({ message: "Failed to delete recipe" });
    } finally {
      // Always invalidate caches to ensure consistency
      invalidateEnhancedMealDatabaseCache();
      recipeDeletionCache.invalidate();
    }
  });

  // POST /api/admin/unified-recipes/:id/restore - Restore a deleted recipe
  app.post("/api/admin/unified-recipes/:id/restore", async (req, res) => {
    const { recipeDeletionCache } = await import('./recipe-deletion-cache.js');
    
    try {
      const userId = getUserIdFromToken(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const isAdmin = await isAdminUser(userId);
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ message: "Recipe ID is required" });
      }

      // Remove deletion from database FIRST
      await storage.removeRecipeDeletion(id);

      // Only update cache after successful DB write
      recipeDeletionCache.removeDeletion(id);

      res.json({
        message: "Recipe restored successfully",
        recipeId: id
      });
    } catch (error) {
      console.error("Error restoring recipe:", error);
      res.status(500).json({ message: "Failed to restore recipe" });
    } finally {
      // Always invalidate caches to ensure consistency
      invalidateEnhancedMealDatabaseCache();
      recipeDeletionCache.invalidate();
    }
  });

  // GET /api/recipes - List all recipes with optional search and filtering
  app.get("/api/recipes", async (req, res) => {
    try {
      const userId = getUserIdFromToken(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const isAdmin = await isAdminUser(userId);
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const {
        search = '',
        category = '',
        tags = '',
        minProtein = '',
        maxProtein = '',
        minPrepTime = '',
        maxPrepTime = '',
        page = '1',
        limit = '50'
      } = req.query;

      let recipes = await getModifiedRecipeDatabase();

      // Apply filters
      if (search) {
        const searchTerm = search.toString().toLowerCase();
        recipes = recipes.filter(recipe => 
          recipe.name.toLowerCase().includes(searchTerm) ||
          recipe.ingredients.some(ing => ing.toLowerCase().includes(searchTerm))
        );
      }

      if (category) {
        recipes = recipes.filter(recipe => recipe.category === category);
      }

      if (tags) {
        const tagList = tags.toString().split(',').map(tag => tag.trim());
        recipes = recipes.filter(recipe => 
          tagList.every(tag => recipe.tags.includes(tag))
        );
      }

      if (minProtein) {
        recipes = recipes.filter(recipe => recipe.nutrition.protein >= parseInt(minProtein.toString()));
      }

      if (maxProtein) {
        recipes = recipes.filter(recipe => recipe.nutrition.protein <= parseInt(maxProtein.toString()));
      }

      if (minPrepTime) {
        recipes = recipes.filter(recipe => recipe.nutrition.prepTime >= parseInt(minPrepTime.toString()));
      }

      if (maxPrepTime) {
        recipes = recipes.filter(recipe => recipe.nutrition.prepTime <= parseInt(maxPrepTime.toString()));
      }

      // Pagination
      const pageNum = parseInt(page.toString());
      const limitNum = parseInt(limit.toString());
      const startIndex = (pageNum - 1) * limitNum;
      const paginatedRecipes = recipes.slice(startIndex, startIndex + limitNum);

      res.json({
        recipes: paginatedRecipes,
        total: recipes.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(recipes.length / limitNum)
      });
    } catch (error) {
      console.error("Error fetching recipes:", error);
      res.status(500).json({ message: "Failed to fetch recipes" });
    }
  });

  // GET /api/recipes/stats - Get recipe statistics
  app.get("/api/recipes/stats", async (req, res) => {
    try {
      const userId = getUserIdFromToken(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const isAdmin = await isAdminUser(userId);
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get recipes directly from database (bypass heavy processing)
      const dbRecipes = await storage.getAllRecipes(true);
      
      const stats = {
        total: dbRecipes.length,
        byCategory: {
          breakfast: dbRecipes.filter(r => r.category === 'breakfast').length,
          lunch: dbRecipes.filter(r => r.category === 'lunch').length,
          dinner: dbRecipes.filter(r => r.category === 'dinner').length,
          snack: dbRecipes.filter(r => r.category === 'snack').length,
          dessert: dbRecipes.filter(r => r.category === 'dessert').length,
          smoothie: dbRecipes.filter(r => r.category === 'smoothie').length
        },
        byTags: dbRecipes.reduce((acc, recipe) => {
          recipe.tags.forEach(tag => {
            acc[tag] = (acc[tag] || 0) + 1;
          });
          return acc;
        }, {} as Record<string, number>),
        proteinRange: {
          min: Math.min(...dbRecipes.map(r => (r.nutrition as any)?.protein || 0)),
          max: Math.max(...dbRecipes.map(r => (r.nutrition as any)?.protein || 0)),
          average: dbRecipes.reduce((sum, r) => sum + ((r.nutrition as any)?.protein || 0), 0) / dbRecipes.length
        },
        modifications: 0, // No longer using overlay modifications
        deleted: 0 // Soft deletes are tracked via active flag in database
      };

      res.json(stats);
    } catch (error) {
      console.error("Error getting recipe stats:", error);
      res.status(500).json({ message: "Failed to get recipe statistics" });
    }
  });

  // GET /api/recipes/usage - Get recipe usage statistics (how often each recipe is used in meal plans)
  app.get("/api/recipes/usage", async (req, res) => {
    try {
      const userId = getUserIdFromToken(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const isAdmin = await isAdminUser(userId);
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Query database to count how many times each recipe appears in meals
      const usageCounts = await db
        .select({
          recipeId: meals.recipeId,
          count: sql<number>`count(*)::int`,
        })
        .from(meals)
        .where(sql`${meals.recipeId} IS NOT NULL`)
        .groupBy(meals.recipeId);

      // Convert to a map for easy lookup: recipeId -> count
      const usageMap = usageCounts.reduce((acc, { recipeId, count }) => {
        if (recipeId !== null) {
          acc[recipeId] = count;
        }
        return acc;
      }, {} as Record<number, number>);

      res.json(usageMap);
    } catch (error) {
      console.error("Error getting recipe usage:", error);
      res.status(500).json({ message: "Failed to get recipe usage statistics" });
    }
  });

  // GET /api/recipes/:id - Get a specific recipe by ID
  app.get("/api/recipes/:id", async (req, res) => {
    try {
      const userId = getUserIdFromToken(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const isAdmin = await isAdminUser(userId);
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const recipeId = req.params.id;
      const recipes = await getCompleteEnhancedMealDatabase();
      const recipe = recipes.find(r => (r.id || r.name) === recipeId);

      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }

      res.json(recipe);
    } catch (error) {
      console.error("Error fetching recipe:", error);
      res.status(500).json({ message: "Failed to fetch recipe" });
    }
  });

  // PUT /api/recipes/:id - Update a recipe (writes directly to database)
  app.put("/api/recipes/:id", async (req, res) => {
    try {
      const userId = getUserIdFromToken(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const isAdmin = await isAdminUser(userId);
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const recipeId = req.params.id;
      const updates = req.body;

      console.log(`📝 UPDATE REQUEST: Recipe ID ${recipeId}`);

      // Validate the updates (basic validation)
      if (!updates.name || !updates.category || !updates.ingredients || !updates.nutrition) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      try {
        // Update recipe directly in database
        const updatedRecipe = await storage.updateRecipe(recipeId, {
          name: updates.name,
          category: updates.category,
          ingredients: updates.ingredients,
          instructions: updates.instructions || updates.recipe?.instructions || [],
          portion: updates.portion || "1 serving",
          nutrition: updates.nutrition,
          tags: updates.tags || [],
          wholeFoodLevel: updates.wholeFoodLevel || "moderate",
          vegetableContent: updates.vegetableContent || {},
          recipeBenefits: updates.recipeBenefits || [],
          recipeTips: updates.recipeTips || updates.recipe?.tips || [],
          recipeNotes: updates.recipeNotes || (updates.recipe?.notes || []).join('; '),
          updatedBy: req.session.userId
        });

        console.log(`✅ Updated recipe in database: ${updatedRecipe.name} (ID: ${updatedRecipe.id})`);

        // Automatically translate to Dutch and save to database
        try {
          console.log(`🌐 AUTO-TRANSLATE: Updating Dutch translation for recipe ${recipeId}: ${updatedRecipe.name}`);
          
          // Create MealOption format for translation
          const mealOption: MealOption = {
            id: updatedRecipe.id,
            name: updatedRecipe.name,
            category: updatedRecipe.category as any,
            ingredients: updatedRecipe.ingredients,
            instructions: updatedRecipe.instructions,
            portion: updatedRecipe.portion,
            nutrition: updatedRecipe.nutrition as any,
            tags: updatedRecipe.tags || [],
            wholeFoodLevel: updatedRecipe.wholeFoodLevel as any,
            vegetableContent: [],
            recipe: {
              name: updatedRecipe.name,
              instructions: updatedRecipe.instructions,
              tips: updatedRecipe.recipeTips || [],
              notes: updatedRecipe.recipeNotes ? [updatedRecipe.recipeNotes] : []
            }
          };
          
          const translated = translateRecipe(mealOption, 'nl');
          
          // Store Dutch translation in database (recipeId is now text, supports any ID format)
          await storage.upsertRecipeTranslation({
            recipeId: recipeId,
            language: 'nl',
            name: translated.name,
            ingredients: translated.ingredients,
            instructions: translated.instructions || [],
            tips: translated.tips || [],
            notes: translated.notes || []
          });
          
          console.log(`✅ Dutch translation updated: ${updatedRecipe.name} → ${translated.name}`);
        } catch (translationError) {
          console.error(`⚠️  Failed to auto-translate recipe ${recipeId}:`, translationError);
          // Don't fail the whole request if translation fails
        }

        // Invalidate cache to ensure updated recipes are visible
        invalidateEnhancedMealDatabaseCache();

        res.json(updatedRecipe);
      } catch (updateError) {
        console.error(`❌ Failed to update recipe ${recipeId}:`, updateError);
        res.status(500).json({ message: "Failed to update recipe in database" });
      }
    } catch (error) {
      console.error("Error updating recipe:", error);
      res.status(500).json({ message: "Failed to update recipe" });
    }
  });

  // POST /api/recipes - Create a new recipe (writes directly to database)
  app.post("/api/recipes", async (req, res) => {
    try {
      const userId = getUserIdFromToken(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const isAdmin = await isAdminUser(userId);
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const recipeData = req.body;

      // Validate required fields
      if (!recipeData.name || !recipeData.category || !recipeData.ingredients || !recipeData.nutrition) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      try {
        // Generate unique numeric ID for custom recipe using timestamp
        // This ensures uniqueness and compatibility with translation table
        const customId = String(Date.now());
        
        // Create recipe directly in database
        const newRecipe = await storage.createRecipe({
          id: customId,
          name: recipeData.name,
          category: recipeData.category,
          ingredients: recipeData.ingredients,
          instructions: recipeData.recipe?.instructions || recipeData.instructions || [],
          portion: recipeData.portion || "1 serving",
          nutrition: recipeData.nutrition,
          tags: recipeData.tags || [],
          wholeFoodLevel: recipeData.wholeFoodLevel || "moderate",
          vegetableContent: recipeData.vegetableContent || {},
          recipeBenefits: recipeData.recipeBenefits || [],
          recipeTips: recipeData.recipe?.tips || recipeData.recipeTips || [],
          recipeNotes: recipeData.recipe?.notes?.join('; ') || recipeData.recipeNotes,
          source: "custom",
          active: recipeData.active !== false,
          createdBy: req.session.userId
        });

        console.log(`✅ Created new recipe in database: ${newRecipe.name} (ID: ${newRecipe.id})`);

        // Automatically translate to Dutch and save to database
        try {
          console.log(`🌐 AUTO-TRANSLATE: Creating Dutch translation for new recipe ${newRecipe.id}: ${newRecipe.name}`);
          
          const mealOption: MealOption = {
            id: newRecipe.id,
            name: newRecipe.name,
            category: newRecipe.category as any,
            ingredients: newRecipe.ingredients,
            instructions: newRecipe.instructions,
            portion: newRecipe.portion,
            nutrition: newRecipe.nutrition as any,
            tags: newRecipe.tags || [],
            wholeFoodLevel: newRecipe.wholeFoodLevel as any,
            vegetableContent: [],
            recipe: {
              name: newRecipe.name,
              instructions: newRecipe.instructions,
              tips: newRecipe.recipeTips || [],
              notes: newRecipe.recipeNotes ? [newRecipe.recipeNotes] : []
            }
          };
          
          const translated = translateRecipe(mealOption, 'nl');
          
          // Store Dutch translation in database (recipeId is now text, supports any ID format)
          await storage.upsertRecipeTranslation({
            recipeId: customId,
            language: 'nl',
            name: translated.name,
            ingredients: translated.ingredients,
            instructions: translated.instructions || [],
            tips: translated.tips || [],
            notes: translated.notes || []
          });
          
          console.log(`✅ Dutch translation created: ${newRecipe.name} → ${translated.name}`)
        } catch (translationError) {
          console.error(`⚠️  Failed to auto-translate new recipe ${newRecipe.id}:`, translationError);
          // Don't fail the whole request if translation fails
        }

        // Invalidate cache to ensure new recipe is visible
        invalidateEnhancedMealDatabaseCache();

        res.status(201).json(newRecipe);
      } catch (createError) {
        console.error(`❌ Failed to create recipe:`, createError);
        res.status(500).json({ message: "Failed to create recipe in database" });
      }
    } catch (error) {
      console.error("Error creating recipe:", error);
      res.status(500).json({ message: "Failed to create recipe" });
    }
  });

  // DELETE /api/recipes/:id - Delete a recipe (soft delete: marks as inactive)
  app.delete("/api/recipes/:id", async (req, res) => {
    try {
      const userId = getUserIdFromToken(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const isAdmin = await isAdminUser(userId);
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const recipeId = req.params.id;

      try {
        // Soft delete: mark recipe as inactive in database
        await storage.updateRecipe(recipeId, {
          active: false,
          updatedBy: req.session.userId
        });

        console.log(`🗑️  Soft-deleted recipe: ${recipeId} (marked as inactive)`);

        // Invalidate cache to ensure deleted recipe is hidden
        invalidateEnhancedMealDatabaseCache();

        res.status(204).send();
      } catch (deleteError) {
        console.error(`❌ Failed to delete recipe ${recipeId}:`, deleteError);
        res.status(404).json({ message: "Recipe not found" });
      }
    } catch (error) {
      console.error("Error deleting recipe:", error);
      res.status(500).json({ message: "Failed to delete recipe" });
    }
  });

  // POST /api/recipes/bulk-update - Bulk update multiple recipes
  app.post("/api/recipes/bulk-update", async (req, res) => {
    try {
      const userId = getUserIdFromToken(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const isAdmin = await isAdminUser(userId);
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { recipeIds, updates } = req.body;

      if (!recipeIds || !Array.isArray(recipeIds) || !updates) {
        return res.status(400).json({ message: "Invalid bulk update data" });
      }

      try {
        const recipes = await getCompleteEnhancedMealDatabase();
        const updatedRecipes: MealOption[] = [];

        for (const recipeId of recipeIds) {
          const recipe = recipes.find(r => (r.id || r.name) === recipeId);
          if (recipe) {
            const updatedRecipe = { ...recipe, ...updates };
            
            // Save to database for persistence
            await storage.saveRecipeModification(recipeId, {
              name: updatedRecipe.name,
              ingredients: updatedRecipe.ingredients,
              instructions: updatedRecipe.recipe?.instructions || [],
              nutrition: updatedRecipe.nutrition,
              category: updatedRecipe.category,
              tags: updatedRecipe.tags,
              portion: updatedRecipe.portion,
              modifiedBy: req.session.userId
            });
            
            // Also keep in memory for immediate access
            recipeModifications.set(recipeId, updatedRecipe);
            updatedRecipes.push(updatedRecipe);
          }
        }

        res.json({
          message: `Updated ${updatedRecipes.length} recipes`,
          recipes: updatedRecipes
        });
      } finally {
        // Always invalidate cache to ensure updated recipes are visible
        invalidateEnhancedMealDatabaseCache();
      }
    } catch (error) {
      console.error("Error bulk updating recipes:", error);
      res.status(500).json({ message: "Failed to bulk update recipes" });
    }
  });

  // GET /api/recipes/export - Export all recipes as JSON
  app.get("/api/recipes/export", async (req, res) => {
    try {
      const userId = getUserIdFromToken(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const isAdmin = await isAdminUser(userId);
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const recipes = await getModifiedRecipeDatabase();
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="recipes-export.json"');
      res.json({
        exportDate: new Date().toISOString(),
        totalRecipes: recipes.length,
        recipes: recipes
      });
    } catch (error) {
      console.error("Error exporting recipes:", error);
      res.status(500).json({ message: "Failed to export recipes" });
    }
  });

  // ============================================================================
  // ADMIN: Shopping List Name Management
  // ============================================================================

  // GET /api/admin/shopping-list-names - Get all shopping list names
  app.get("/api/admin/shopping-list-names", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || user.username !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const shoppingListNames = await storage.getShoppingListNames();
      res.json(shoppingListNames);
    } catch (error) {
      console.error("Error fetching shopping list names:", error);
      res.status(500).json({ message: "Failed to fetch shopping list names" });
    }
  });

  // POST /api/admin/shopping-list-names - Create shopping list name
  app.post("/api/admin/shopping-list-names", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || user.username !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { name, category, defaultUnit } = req.body;
      if (!name || !category) {
        return res.status(400).json({ message: "Name and category are required" });
      }

      const shoppingListName = await storage.createShoppingListName({
        name,
        category,
        defaultUnit: defaultUnit || 'g'
      });

      res.json(shoppingListName);
    } catch (error) {
      console.error("Error creating shopping list name:", error);
      res.status(500).json({ message: "Failed to create shopping list name" });
    }
  });

  // PUT /api/admin/shopping-list-names/:id - Update shopping list name
  app.put("/api/admin/shopping-list-names/:id", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || user.username !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const updates = req.body;

      const shoppingListName = await storage.updateShoppingListName(parseInt(id), updates);
      res.json(shoppingListName);
    } catch (error) {
      console.error("Error updating shopping list name:", error);
      res.status(500).json({ message: "Failed to update shopping list name" });
    }
  });

  // DELETE /api/admin/shopping-list-names/:id - Delete shopping list name
  app.delete("/api/admin/shopping-list-names/:id", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || user.username !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      await storage.deleteShoppingListName(parseInt(id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting shopping list name:", error);
      res.status(500).json({ message: "Failed to delete shopping list name" });
    }
  });

  // POST /api/admin/shopping-list-names/bulk - Bulk create shopping list names
  app.post("/api/admin/shopping-list-names/bulk", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || user.username !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ message: "Items must be an array" });
      }

      const results: Array<{status: 'success' | 'duplicate' | 'error', item: any, error?: string}> = [];
      
      for (const item of items) {
        // Validate required fields
        if (!item.name || !item.category) {
          results.push({
            status: 'error',
            item,
            error: 'Missing required fields: name and category'
          });
          continue;
        }

        try {
          const created = await storage.createShoppingListName({
            name: item.name,
            category: item.category,
            defaultUnit: item.defaultUnit || 'g'
          });
          results.push({
            status: 'success',
            item: created
          });
        } catch (err: any) {
          // Distinguish duplicates from other errors
          if (err.message && err.message.includes('unique')) {
            results.push({
              status: 'duplicate',
              item,
              error: 'Item already exists'
            });
          } else {
            results.push({
              status: 'error',
              item,
              error: err.message || 'Unknown error'
            });
          }
        }
      }

      const successCount = results.filter(r => r.status === 'success').length;
      const duplicateCount = results.filter(r => r.status === 'duplicate').length;
      const errorCount = results.filter(r => r.status === 'error').length;

      res.json({ 
        summary: {
          total: items.length,
          success: successCount,
          duplicates: duplicateCount,
          errors: errorCount
        },
        results 
      });
    } catch (error) {
      console.error("Error bulk creating shopping list names:", error);
      res.status(500).json({ message: "Failed to bulk create shopping list names" });
    }
  });

  // GET /api/admin/all-recipe-ingredients - Get all unique ingredients from all recipes
  app.get("/api/admin/all-recipe-ingredients", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || user.username !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get all recipes
      const recipes = await getCompleteEnhancedMealDatabase();
      
      // Single-pass extraction with normalization
      // Map: normalized ingredient -> { originalForms: Set, recipes: Set, count: number }
      const ingredientMap = new Map<string, {
        normalizedName: string;
        originalForms: Set<string>;
        recipes: Set<string>;
        count: number;
      }>();
      
      recipes.forEach(recipe => {
        if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
          recipe.ingredients.forEach((originalIngredient: string) => {
            // Normalize ingredient (strip quantities, clean up)
            const normalized = cleanIngredientName(originalIngredient);
            
            if (!ingredientMap.has(normalized)) {
              ingredientMap.set(normalized, {
                normalizedName: normalized,
                originalForms: new Set(),
                recipes: new Set(),
                count: 0
              });
            }
            
            const entry = ingredientMap.get(normalized)!;
            entry.originalForms.add(originalIngredient);
            entry.recipes.add(recipe.name);
            entry.count = entry.recipes.size;
          });
        }
      });

      // Convert to array and sort by usage count (most used first)
      const ingredientDetails = Array.from(ingredientMap.values())
        .map(entry => ({
          ingredient: entry.normalizedName,
          originalForms: Array.from(entry.originalForms),
          recipes: Array.from(entry.recipes),
          count: entry.count
        }))
        .sort((a, b) => b.count - a.count);

      res.json({
        total: ingredientDetails.length,
        ingredients: ingredientDetails
      });
    } catch (error) {
      console.error("Error fetching all recipe ingredients:", error);
      res.status(500).json({ message: "Failed to fetch recipe ingredients" });
    }
  });

  // ============================================================================
  // ADMIN: Ingredient Mapping Management
  // ============================================================================

  // GET /api/admin/ingredient-mappings - Get all ingredient mappings
  app.get("/api/admin/ingredient-mappings", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || user.username !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const mappings = await storage.getIngredientMappings();
      res.json(mappings);
    } catch (error) {
      console.error("Error fetching ingredient mappings:", error);
      res.status(500).json({ message: "Failed to fetch ingredient mappings" });
    }
  });

  // POST /api/admin/ingredient-mappings - Create ingredient mapping
  app.post("/api/admin/ingredient-mappings", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || user.username !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { originalIngredient, normalizedIngredient, shoppingListNameId, quantity, unit, isManualOverride } = req.body;
      
      if (!originalIngredient || !normalizedIngredient) {
        return res.status(400).json({ message: "Original and normalized ingredients are required" });
      }

      const mapping = await storage.createIngredientMapping({
        originalIngredient,
        normalizedIngredient,
        shoppingListNameId,
        quantity,
        unit,
        isManualOverride: isManualOverride || false
      });

      res.json(mapping);
    } catch (error) {
      console.error("Error creating ingredient mapping:", error);
      res.status(500).json({ message: "Failed to create ingredient mapping" });
    }
  });

  // PUT /api/admin/ingredient-mappings/:id - Update ingredient mapping
  app.put("/api/admin/ingredient-mappings/:id", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || user.username !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const updates = req.body;

      const mapping = await storage.updateIngredientMapping(parseInt(id), updates);
      res.json(mapping);
    } catch (error) {
      console.error("Error updating ingredient mapping:", error);
      res.status(500).json({ message: "Failed to update ingredient mapping" });
    }
  });

  // DELETE /api/admin/ingredient-mappings/:id - Delete ingredient mapping
  app.delete("/api/admin/ingredient-mappings/:id", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || user.username !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      await storage.deleteIngredientMapping(parseInt(id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting ingredient mapping:", error);
      res.status(500).json({ message: "Failed to delete ingredient mapping" });
    }
  });

  // ============================================================================
  // SEASONAL ADVISOR API
  // ============================================================================

  // GET /api/seasonal - Get seasonal food advice based on location
  app.get("/api/seasonal", async (req, res) => {
    try {
      // Get coordinates from query params if provided
      const latitude = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
      const longitude = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
      const language = req.query.language as string || 'nl'; // Default to Dutch
      
      let coords;
      if (latitude !== undefined && longitude !== undefined) {
        coords = { latitude, longitude };
      }
      
      const seasonalInfo = getSeasonalInfo(coords, language);
      res.json(seasonalInfo);
    } catch (error) {
      console.error("Error getting seasonal advice:", error);
      res.status(500).json({ message: "Failed to get seasonal advice" });
    }
  });

  // GET /api/seasonal/current-months - Get current season months based on location
  app.get("/api/seasonal/current-months", async (req, res) => {
    try {
      // Get coordinates from query params if provided
      const latitude = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
      const longitude = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
      
      let coords;
      if (latitude !== undefined && longitude !== undefined) {
        coords = { latitude, longitude };
      }
      
      const currentMonths = getCurrentSeasonMonths(coords);
      res.json({ currentSeasonMonths: currentMonths });
    } catch (error) {
      console.error("Error getting current season months:", error);
      res.status(500).json({ message: "Failed to get current season months" });
    }
  });

  // GET /api/seasonal/ingredients-for-month - Get seasonal ingredients for a specific month
  app.get("/api/seasonal/ingredients-for-month", async (req, res) => {
    try {
      const month = req.query.month as string;
      const ingredientsParam = req.query.ingredients as string;
      
      if (!month || !ingredientsParam) {
        return res.status(400).json({ message: "Month and ingredients parameters are required" });
      }

      // Parse ingredients (they come as a JSON string)
      let ingredients: string[];
      try {
        ingredients = JSON.parse(ingredientsParam);
      } catch {
        return res.status(400).json({ message: "Invalid ingredients format" });
      }

      // Map month names to indices (support both English and Dutch)
      const monthMap: { [key: string]: number } = {
        'january': 0, 'januari': 0,
        'february': 1, 'februari': 1,
        'march': 2, 'maart': 2,
        'april': 3,
        'may': 4, 'mei': 4,
        'june': 5, 'juni': 5,
        'july': 6, 'juli': 6,
        'august': 7, 'augustus': 7,
        'september': 8,
        'october': 9, 'oktober': 9,
        'november': 10,
        'december': 11
      };

      const monthIndex = monthMap[month.toLowerCase()];
      if (monthIndex === undefined) {
        return res.status(400).json({ message: "Invalid month name" });
      }

      // Get seasonal vegetables for the month
      const monthData = AMSTERDAM_MONTHLY_PRODUCE[monthIndex as keyof typeof AMSTERDAM_MONTHLY_PRODUCE];
      if (!monthData) {
        return res.json({ matchingIngredients: [] });
      }

      // Match ingredients with seasonal vegetables (case-insensitive, partial matching)
      const matchingIngredients: string[] = [];
      
      for (const ingredient of ingredients) {
        const ingredientLower = ingredient.toLowerCase();
        
        for (const vegetable of monthData.vegetables) {
          const vegetableLower = vegetable.toLowerCase();
          
          // Check if ingredient contains vegetable name or vice versa
          if (ingredientLower.includes(vegetableLower) || vegetableLower.includes(ingredientLower)) {
            // Add the vegetable (seasonal name) to the results if not already added
            if (!matchingIngredients.includes(vegetable)) {
              matchingIngredients.push(vegetable);
            }
          }
        }
      }

      res.json({ matchingIngredients });
    } catch (error) {
      console.error("Error getting seasonal ingredients:", error);
      res.status(500).json({ message: "Failed to get seasonal ingredients" });
    }
  });

  // POST /api/admin/analyze-ingredients - Analyze meal plan ingredients for mapping
  app.post("/api/admin/analyze-ingredients", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || user.username !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { mealPlanId } = req.body;
      
      if (!mealPlanId) {
        return res.status(400).json({ message: "Meal plan ID is required" });
      }

      // Get meal plan with meals
      const mealPlan = await storage.getMealPlanWithMeals(mealPlanId);
      if (!mealPlan) {
        return res.status(404).json({ message: "Meal plan not found" });
      }

      // Get all recipes for the meals
      const { getCompleteEnhancedMealDatabase } = await import("./nutrition-enhanced");
      const allRecipes = await getCompleteEnhancedMealDatabase();
      
      // Process ingredients to show how they would be mapped
      const ingredientAnalysis = [];
      
      for (const meal of mealPlan.meals) {
        const recipe = allRecipes.find(r => r.name === meal.foodDescription);
        if (recipe) {
          for (const ingredient of recipe.ingredients) {
            // Parse ingredient using the existing logic
            const parseQuantityAndUnit = (ingredient: string): { quantity: number; unit: string; productName: string } => {
              if (!ingredient || ingredient === '') {
                return { quantity: 1, unit: '', productName: ingredient };
              }
              const cleanIngredient = ingredient.trim();
              const match = cleanIngredient.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]*)\s+(.+)/);
              if (match) {
                const quantity = parseFloat(match[1]);
                const unit = match[2].trim();
                const productName = match[3].trim();
                return { quantity, unit, productName };
              }
              return { quantity: 1, unit: '', productName: cleanIngredient };
            };

            const { quantity, unit, productName } = parseQuantityAndUnit(ingredient);
            
            // Clean the ingredient name
            const cleanedIngredient = productName
              .replace(/\([^)]*\)/g, '') // Remove parentheses
              .replace(/,.*$/g, '') // Remove everything after comma
              .replace(/\s+/g, ' ') // Normalize spaces
              .trim();

            // Check if there's already a mapping
            const existingMapping = await storage.getIngredientMappingByIngredient(cleanedIngredient);
            
            ingredientAnalysis.push({
              originalIngredient: ingredient,
              normalizedIngredient: cleanedIngredient,
              extractedQuantity: quantity,
              extractedUnit: unit,
              hasMapping: !!existingMapping,
              mappingId: existingMapping?.id,
              shoppingListNameId: existingMapping?.shoppingListNameId,
              isManualOverride: existingMapping?.isManualOverride,
              recipeName: recipe.name,
              mealType: meal.mealType
            });
          }
        }
      }

      res.json({
        mealPlan: {
          id: mealPlan.id,
          weekStart: mealPlan.weekStart,
          totalMeals: mealPlan.meals.length
        },
        ingredientAnalysis,
        totalIngredients: ingredientAnalysis.length,
        mappedIngredients: ingredientAnalysis.filter(i => i.hasMapping).length,
        unmappedIngredients: ingredientAnalysis.filter(i => !i.hasMapping).length
      });
    } catch (error) {
      console.error("Error analyzing ingredients:", error);
      res.status(500).json({ message: "Failed to analyze ingredients" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
