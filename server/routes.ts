import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateWeeklyMealPlan, formatMealPlanForNotion } from "./meal-generator";
import { mealPlanRequestSchema } from "@shared/schema";
import { notion, createDatabaseIfNotExists, findDatabaseByTitle } from "./notion";
import { generateShoppingList } from "./nutrition";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Generate meal plan
  app.post("/api/meal-plans/generate", async (req, res) => {
    try {
      const request = mealPlanRequestSchema.parse(req.body);
      const generated = generateWeeklyMealPlan(request);
      
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

      const generated = generateWeeklyMealPlan(request);
      
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
        tags: mealOption.tags
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

  const httpServer = createServer(app);
  return httpServer;
}
