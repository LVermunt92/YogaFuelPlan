import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateWeeklyMealPlan, formatMealPlanForNotion } from "./meal-generator";
import { mealPlanRequestSchema } from "@shared/schema";
import { notion, createDatabaseIfNotExists, findDatabaseByTitle } from "./notion";
import { generateEnhancedShoppingList } from "./nutrition-enhanced";
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

      const request = {
        userId,
        weekStart: weekStart || new Date().toISOString().split('T')[0],
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

  // Update viral recipes manually
  app.post("/api/admin/update-viral-recipes", async (req, res) => {
    try {
      const { getCurrentViralRecipes, addViralRecipeBatch, UPCOMING_VIRAL_RECIPES } = await import("./viral-recipe-updater");
      
      const currentRecipes = getCurrentViralRecipes();
      console.log(`🔥 Current viral recipes: ${currentRecipes.length} recipes`);
      
      // Log upcoming viral recipes that will be added in future cycles
      console.log(`🔥 Upcoming viral recipes scheduled: ${UPCOMING_VIRAL_RECIPES.slice(0, 3).join(', ')}...`);
      
      res.json({
        success: true,
        message: `Viral recipes updated! Currently serving ${currentRecipes.length} viral recipes`,
        currentRecipes: currentRecipes.map(r => r.name),
        upcomingRecipes: UPCOMING_VIRAL_RECIPES.slice(0, 5)
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
      const userId = req.query.userId ? parseInt(req.query.userId as string) : 2;
      
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
      
      const generated = await generateWeeklyMealPlan(request, user);
      
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
        weekStart: weekStart || new Date().toISOString().split('T')[0],
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
  app.get("/api/meals/:mealId/recipe", async (req, res) => {
    try {
      const mealId = parseInt(req.params.mealId);
      console.log(`Looking for meal ID: ${mealId}`);
      
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
          const mealPlan = await storage.getMealPlanWithMeals(targetMeal.mealPlanId);
          const user = mealPlan ? await storage.getUser(mealPlan.userId) : null;
          const dietaryTags = user?.dietaryTags || [];
          
          const mealType = targetMeal.mealType as 'breakfast' | 'lunch' | 'dinner';
          
          const aiRecipe = await generateRecipeWithAI(cleanMealName, dietaryTags, mealType);
          
          return res.json({
            ...aiRecipe,
            isAIGenerated: true,
            message: "Recipe generated by AI based on your dietary preferences"
          });
        } catch (aiError) {
          console.error("AI recipe generation failed:", aiError);
          return res.status(404).json({ 
            message: "Recipe not found and AI generation unavailable. Please check your OpenAI API key." 
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
          
          return res.json({
            ...enhancedRecipe,
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

      res.json({
        name: mealOption.name,
        portion: mealOption.portion,
        ingredients: finalIngredients,
        instructions: finalInstructions,
        tips: mealOption.recipe?.tips || [],
        notes: (mealOption.recipe?.notes || "") + incorporationNote,
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
      const mealPlan = await storage.getMealPlanWithMeals(id);
      
      if (!mealPlan) {
        return res.status(404).json({ message: "Meal plan not found" });
      }

      const shoppingList = generateEnhancedShoppingList(mealPlan.meals);
      
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

  const httpServer = createServer(app);
  return httpServer;
}
