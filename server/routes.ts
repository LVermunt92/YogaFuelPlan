import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateWeeklyMealPlan, formatMealPlanForNotion } from "./meal-generator";
import { mealPlanRequestSchema } from "@shared/schema";
import { notion, createDatabaseIfNotExists, findDatabaseByTitle } from "./notion";
import { generateShoppingList } from "./nutrition";
import { OuraService } from "./oura";
import { updateUserProfileSchema, authRegisterSchema, authLoginSchema } from "@shared/schema";
import cron from 'node-cron';

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
  
  // Generate meal plan
  app.post("/api/meal-plans/generate", async (req, res) => {
    try {
      const request = mealPlanRequestSchema.parse(req.body);
      
      // Fetch user data for caloric adjustments
      const user = request.userId ? await storage.getUser(request.userId) : undefined;
      
      const generated = generateWeeklyMealPlan(request, user);
      
      // Save to storage
      const savedMealPlan = await storage.createMealPlan(generated.mealPlan);
      const savedMeals = await storage.createMeals(savedMealPlan.id, generated.meals);
      
      res.json({
        mealPlan: savedMealPlan,
        meals: savedMeals,
      });
    } catch (error) {
      console.error("Error generating meal plan:", error);
      res.status(500).json({ message: "Failed to generate meal plan" });
    }
  });

  // Get meal plans
  app.get("/api/meal-plans", async (req, res) => {
    try {
      const mealPlans = await storage.getMealPlans();
      res.json(mealPlans);
    } catch (error) {
      console.error("Error fetching meal plans:", error);
      res.status(500).json({ message: "Failed to fetch meal plans" });
    }
  });

  // Get specific meal plan with meals
  app.get("/api/meal-plans/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const mealPlan = await storage.getMealPlanWithMeals(id);
      
      if (!mealPlan) {
        return res.status(404).json({ message: "Meal plan not found" });
      }
      
      res.json(mealPlan);
    } catch (error) {
      console.error("Error fetching meal plan:", error);
      res.status(500).json({ message: "Failed to fetch meal plan" });
    }
  });

  // Sync meal plan to Notion
  app.post("/api/meal-plans/:id/sync-notion", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const mealPlan = await storage.getMealPlanWithMeals(id);
      
      if (!mealPlan) {
        return res.status(404).json({ message: "Meal plan not found" });
      }

      // Ensure meal plan database exists in Notion
      const database = await createDatabaseIfNotExists("Meal Plans", {
        Date: { date: {} },
        Meal: {
          select: {
            options: [
              { name: "Breakfast", color: "yellow" },
              { name: "Lunch", color: "green" },
              { name: "Dinner", color: "blue" }
            ]
          }
        },
        Food: { title: {} },
        Portion: { rich_text: {} },
        "Protein (g)": { number: {} }
      });

      // Format and upload meal plan data
      const notionData = formatMealPlanForNotion(mealPlan, mealPlan.meals);
      
      for (const meal of notionData) {
        await notion.pages.create({
          parent: { database_id: database.id },
          properties: {
            Date: { date: { start: meal.Date } },
            Meal: { select: { name: meal.Meal } },
            Food: { title: [{ text: { content: meal.Food } }] },
            Portion: { rich_text: [{ text: { content: meal.Portion } }] },
            "Protein (g)": { number: meal["Protein (g)"] }
          }
        });
      }

      // Update sync status
      await storage.updateMealPlanSyncStatus(id, true);
      
      res.json({ message: "Successfully synced to Notion", databaseId: database.id });
    } catch (error) {
      console.error("Error syncing to Notion:", error);
      res.status(500).json({ message: "Failed to sync to Notion", error: (error as Error).message });
    }
  });

  // Check Notion connection status
  app.get("/api/notion/status", async (req, res) => {
    try {
      // Try to access the user info to verify connection
      const user = await notion.users.me({});
      res.json({ 
        connected: true, 
        user: user.name || "Connected",
        message: "Notion integration is working"
      });
    } catch (error) {
      console.error("Notion connection error:", error);
      res.status(500).json({ 
        connected: false, 
        message: "Notion integration not configured or invalid credentials"
      });
    }
  });

  // Auto-generate weekly meal plan (for Sunday automation)
  app.post("/api/meal-plans/auto-generate", async (req, res) => {
    try {
      // Get next Monday's date
      const nextMonday = new Date();
      const daysUntilMonday = (8 - nextMonday.getDay()) % 7 || 7;
      nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
      const weekStart = nextMonday.toISOString().split('T')[0];
      
      // Use high activity level by default (130g protein)
      const request = {
        activityLevel: "high" as const,
        weekStart,
        userId: 1,
      };

      // Fetch user data for caloric adjustments
      const user = await storage.getUser(request.userId);
      
      const generated = generateWeeklyMealPlan(request, user);
      
      // Save to storage
      const savedMealPlan = await storage.createMealPlan(generated.mealPlan);
      const savedMeals = await storage.createMeals(savedMealPlan.id, generated.meals);
      
      // Auto-sync to Notion if configured
      let notionSynced = false;
      let databaseId = null;
      
      try {
        // Check if Notion is configured
        await notion.users.me({});
        
        // Create database and sync
        const database = await createDatabaseIfNotExists("Meal Plans", {
          Date: { date: {} },
          Meal: {
            select: {
              options: [
                { name: "Breakfast", color: "yellow" },
                { name: "Lunch", color: "green" },
                { name: "Dinner", color: "blue" }
              ]
            }
          },
          Food: { title: {} },
          Portion: { rich_text: {} },
          "Protein (g)": { number: {} }
        });

        // Format and upload meal plan data
        const notionData = formatMealPlanForNotion(savedMealPlan, savedMeals);
        
        for (const meal of notionData) {
          await notion.pages.create({
            parent: { database_id: database.id },
            properties: {
              Date: { date: { start: meal.Date } },
              Meal: { select: { name: meal.Meal } },
              Food: { title: [{ text: { content: meal.Food } }] },
              Portion: { rich_text: [{ text: { content: meal.Portion } }] },
              "Protein (g)": { number: meal["Protein (g)"] }
            }
          });
        }

        // Update sync status
        await storage.updateMealPlanSyncStatus(savedMealPlan.id, true);
        notionSynced = true;
        databaseId = database.id;
      } catch (notionError) {
        console.log("Notion sync skipped - not configured:", (notionError as Error).message);
      }
      
      res.json({
        mealPlan: savedMealPlan,
        meals: savedMeals,
        notionSynced,
        databaseId,
        message: "Weekly meal plan generated successfully"
      });
    } catch (error) {
      console.error("Error auto-generating meal plan:", error);
      res.status(500).json({ message: "Failed to auto-generate meal plan" });
    }
  });

  // Get recipe for a meal
  app.get("/api/meals/:mealId/recipe", async (req, res) => {
    try {
      const mealId = parseInt(req.params.mealId);
      const mealPlan = await storage.getMealPlanWithMeals(mealId);
      
      if (!mealPlan) {
        return res.status(404).json({ message: "Meal plan not found" });
      }

      // Find the specific meal by searching through meal plans
      let targetMeal = null;
      for (const meal of mealPlan.meals) {
        if (meal.id === mealId) {
          targetMeal = meal;
          break;
        }
      }

      if (!targetMeal) {
        // Try finding in all meal plans
        const allMealPlans = await storage.getMealPlans();
        for (const plan of allMealPlans) {
          const planWithMeals = await storage.getMealPlanWithMeals(plan.id);
          if (planWithMeals) {
            for (const meal of planWithMeals.meals) {
              if (meal.id === mealId) {
                targetMeal = meal;
                break;
              }
            }
          }
          if (targetMeal) break;
        }
      }

      if (!targetMeal) {
        return res.status(404).json({ message: "Meal not found" });
      }

      // Find the recipe from the meal database
      const { MEAL_DATABASE } = await import("./nutrition");
      const mealOption = MEAL_DATABASE.find(option => 
        option.name === targetMeal.foodDescription
      );

      if (!mealOption || !mealOption.recipe) {
        return res.status(404).json({ message: "Recipe not found for this meal" });
      }

      res.json({
        meal: targetMeal,
        recipe: mealOption.recipe,
        ingredients: mealOption.ingredients,
        tags: mealOption.tags,
        vegetableContent: mealOption.vegetableContent,
        nutrition: mealOption.nutrition
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
      const mealPlan = await storage.getMealPlanWithMeals(id);
      
      if (!mealPlan) {
        return res.status(404).json({ message: "Meal plan not found" });
      }

      const shoppingList = generateShoppingList(mealPlan.meals);
      
      res.json({
        mealPlanId: id,
        weekStart: mealPlan.weekStart,
        shoppingList,
        totalItems: shoppingList.length,
        categories: Array.from(new Set(shoppingList.map(item => item.category))).sort()
      });
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

  app.patch('/api/users/:id/profile', async (req, res) => {
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

      const generated = generateWeeklyMealPlan(request, user);
      
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
        
        // Get next Monday's date
        const nextMonday = new Date();
        const daysUntilMonday = (8 - nextMonday.getDay()) % 7 || 7;
        nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
        const weekStart = nextMonday.toISOString().split('T')[0];
        
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

        const generated = generateWeeklyMealPlan(request, user);
        
        // Save to storage
        const savedMealPlan = await storage.createMealPlan(generated.mealPlan);
        await storage.createMeals(savedMealPlan.id, generated.meals);
        
        console.log(`Weekly meal plan generated successfully for ${weekStart} with ${activityLevel} activity level`);
      } catch (error) {
        console.error('Weekly meal plan generation failed:', error);
      }
    });
  }

  const httpServer = createServer(app);
  return httpServer;
}
