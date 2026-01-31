import { pgTable, text, serial, integer, boolean, timestamp, real, date, unique, varchar, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  gender: text("gender"), // male, female, other
  weight: integer("weight"), // kg
  goalWeight: integer("goal_weight"), // target weight in kg
  height: integer("height"), // cm
  age: integer("age"), // years
  waistline: real("waistline"), // cm
  goalWaistline: real("goal_waistline"), // target waistline in cm
  targetDate: date("target_date"), // when to reach goals by
  activityLevel: text("activity_level"), // sedentary, light, moderate, high, athlete
  trainingType: text("training_type"), // mobility, endurance, strength, mixed
  goal: text("goal").default("maintain"), // lose_fat, maintain, bulk
  proteinTarget: integer("protein_target").default(130), // grams
  dietaryTags: text("dietary_tags").array().default([]),
  householdSize: integer("household_size").default(1),
  includeBreakfast: boolean("include_breakfast").default(false),
  includeLunch: boolean("include_lunch").default(true),
  includeDinner: boolean("include_dinner").default(true),
  cookingDaysPerWeek: integer("cooking_days_per_week").default(7),
  eatingDaysAtHome: integer("eating_days_at_home").default(7),
  language: text("language").default("en"), // en, nl
  leftovers: text("leftovers").array().default([]), // current leftovers to use in meal planning
  useOnlyMyRecipes: boolean("use_only_my_recipes").default(false), // preference for meal plan generation
  cycleSupportRecipes: boolean("cycle_support_recipes").default(false),
  menstrualPhase: text("menstrual_phase").default("off"), // off, menstrual, follicular, ovulation, luteal
  longevityFocusedRecipes: boolean("longevity_focused_recipes").default(false), // enable longevity-focused recipes
  dinnerLowCarbMaxCarbs: integer("dinner_low_carb_max_carbs"), // max carbs for dinner (null = no limit, e.g. 20 for low-carb dinners)
  hasSeenWelcome: boolean("has_seen_welcome").default(false), // track if user has seen welcome message
  lastLoginAt: timestamp("last_login_at"), // track when user last logged in
  weightLossWeekNumber: integer("weight_loss_week_number").default(1), // track current week for weight loss journey (resets maintenance weeks)
  weightLossStartDate: date("weight_loss_start_date"), // when user started weight loss journey
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Unified recipes table - stores all recipes (base, variants, custom, AI-generated)
export const recipes = pgTable("recipes", {
  id: text("id").primaryKey(), // String ID to support various ID formats
  name: text("name").notNull(),
  category: text("category").notNull(), // breakfast, lunch, dinner, snack, dessert, smoothie
  ingredients: text("ingredients").array().notNull(),
  instructions: text("instructions").array().notNull(),
  portion: text("portion").notNull().default("1 serving"),
  
  // Nutrition data stored as JSONB
  nutrition: jsonb("nutrition").notNull(), // NutritionInfo object
  
  // Tags and metadata
  tags: text("tags").array().default([]),
  wholeFoodLevel: text("whole_food_level").default("moderate"), // minimal, moderate, high
  
  // Vegetable content stored as JSONB
  vegetableContent: jsonb("vegetable_content"), // { servings, vegetables[], benefits[] }
  
  // Recipe benefits and tips
  recipeBenefits: text("recipe_benefits").array(),
  recipeTips: text("recipe_tips").array(),
  recipeNotes: text("recipe_notes"),
  
  // Preparation time
  prepTime: integer("prep_time").default(30), // minutes
  
  // Serving information
  defaultBatchServings: integer("default_batch_servings").default(1), // Base recipe servings (default 1, meal generator multiplies as needed)
  
  // Source tracking
  source: text("source").notNull().default("base"), // base, variant, custom, ai
  variantOf: text("variant_of"), // Reference to base recipe ID for variants
  variantType: text("variant_type"), // gluten_free, lactose_free, vegetarian
  
  // Status
  active: boolean("active").default(true),
  
  // Dutch translations (cached from OpenAI)
  dutchName: text("dutch_name"),
  dutchIngredients: text("dutch_ingredients").array(),
  dutchInstructions: text("dutch_instructions").array(),
  
  // Audit fields
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const mealPlans = pgTable("meal_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  weekStart: text("week_start").notNull(), // YYYY-MM-DD format
  activityLevel: text("activity_level").notNull(),
  totalProtein: real("total_protein").notNull(),
  createdAt: timestamp("created_at").defaultNow(),

  planName: text("plan_name"), // Optional name for the plan like "Week 1" or "Backup Plan"
  planType: text("plan_type").default("current"), // 'current', 'next', 'saved', 'backup'
  isActive: boolean("is_active").default(true), // Whether this plan is currently being used
  weekendMealPrepEnabled: boolean("weekend_meal_prep_enabled").default(false), // Whether to generate weekend prep list
});

export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  mealPlanId: integer("meal_plan_id").references(() => mealPlans.id),
  recipeId: integer("recipe_id"), // Numerical ID of the recipe in the enhanced meal database
  day: integer("day").notNull(), // 1-7
  mealType: text("meal_type").notNull(), // breakfast, lunch, dinner, snack
  foodDescription: text("food_description").notNull(),
  portion: text("portion").notNull(),
  protein: real("protein").notNull(), // grams
  calories: real("calories").default(0), // kcal
  carbohydrates: real("carbohydrates").default(0), // grams
  fats: real("fats").default(0), // grams
  fiber: real("fiber").default(0), // grams
  sugar: real("sugar").default(0), // grams (total sugar - kept for backwards compatibility)
  addedSugar: real("added_sugar").default(0), // grams (from sweeteners: honey, maple syrup, sugar, etc.)
  freeSugar: real("free_sugar").default(0), // grams (added + juices/dried fruits - not bound in cell walls)
  intrinsicSugar: real("intrinsic_sugar").default(0), // grams (naturally bound in whole fruits, vegetables, dairy)
  sodium: real("sodium").default(0), // mg
  vitaminK: real("vitamin_k").default(0), // mcg (micrograms)
  zinc: real("zinc").default(0), // mg (milligrams)
  calcium: real("calcium").default(0), // mg (milligrams)
  potassium: real("potassium").default(0), // mg (milligrams)
  iron: real("iron").default(0), // mg (milligrams)
  vitaminC: real("vitamin_c").default(0), // mg (milligrams)
  omega3: real("omega_3").default(0), // mg (milligrams) - ALA, EPA, DHA combined
  polyphenols: real("polyphenols").default(0), // mg (milligrams) - total polyphenols from plant foods
  prepTime: integer("prep_time").default(30), // minutes
  costEuros: real("cost_euros"), // cost in euros
  proteinPerEuro: real("protein_per_euro"), // protein grams per euro
  isLeftover: boolean("is_leftover").default(false), // true if this meal uses leftover ingredients
});

// Refresh tokens for JWT authentication
export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const ouraData = pgTable("oura_data", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  date: date("date").notNull(),
  activityScore: real("activity_score"),
  steps: integer("steps"),
  calories: real("calories"),
  activeCalories: real("active_calories"),
  workoutMinutes: integer("workout_minutes"),
  readinessScore: real("readiness_score"),
  sleepScore: real("sleep_score"),
  periodPhase: text("period_phase"), // menstrual, follicular, ovulation, luteal
  activityLevel: text("activity_level"), // high, low based on calculated threshold
  syncedAt: timestamp("synced_at").notNull().defaultNow(),
}, (table) => ({
  uniqueUserDate: unique().on(table.userId, table.date),
}));

export const recipeRatings = pgTable("recipe_ratings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  recipeName: text("recipe_name").notNull(),
  rating: integer("rating").notNull(), // 1-5 stars
  feedback: text("feedback"), // optional text feedback
  mealType: text("meal_type").notNull(), // breakfast, lunch, dinner, snack
  ratedAt: timestamp("rated_at").notNull().defaultNow(),
}, (table) => ({
  uniqueUserRecipe: unique().on(table.userId, table.recipeName),
}));

export const mealHistory = pgTable("meal_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  mealName: text("meal_name").notNull(),
  mealType: text("meal_type").notNull(), // breakfast, lunch, dinner, snack
  portion: text("portion").notNull(),
  protein: real("protein").notNull(),
  prepTime: integer("prep_time").notNull(),
  costEuros: real("cost_euros"),
  proteinPerEuro: real("protein_per_euro"),
  consumedAt: timestamp("consumed_at").notNull().defaultNow(),
  fromMealPlanId: integer("from_meal_plan_id").references(() => mealPlans.id),
});

export const mealFavorites = pgTable("meal_favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  mealName: text("meal_name").notNull(),
  mealType: text("meal_type").notNull(), // breakfast, lunch, dinner, snack
  portion: text("portion").notNull(),
  protein: real("protein").notNull(),
  prepTime: integer("prep_time").notNull(),
  costEuros: real("cost_euros"),
  proteinPerEuro: real("protein_per_euro"),
  tags: text("tags").array().default([]),
  favoritedAt: timestamp("favorited_at").notNull().defaultNow(),
  notes: text("notes"), // user's personal notes about the meal
}, (table) => ({
  uniqueUserMeal: unique().on(table.userId, table.mealName),
}));

// User-created custom recipes
export const userRecipes = pgTable("user_recipes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  portion: text("portion").notNull(),
  ingredients: text("ingredients").array().notNull(), // array of ingredient strings
  instructions: text("instructions").array().notNull(), // array of instruction steps
  tips: text("tips").array().default([]), // optional cooking tips
  notes: text("notes"), // user's personal notes
  
  // Nutrition information
  protein: real("protein").notNull(), // grams
  calories: real("calories").notNull(), // kcal
  carbohydrates: real("carbohydrates").default(0), // grams
  fats: real("fats").default(0), // grams
  fiber: real("fiber").default(0), // grams
  sugar: real("sugar").default(0), // grams
  sodium: real("sodium").default(0), // mg
  cocoaFlavanols: real("cocoa_flavanols").default(0), // mg
  
  // Meal info
  prepTime: integer("prep_time").notNull(), // minutes
  cookTime: integer("cook_time").default(0), // minutes
  servings: integer("servings").default(1), // number of servings
  mealTypes: text("meal_types").array().notNull(), // breakfast, lunch, dinner, snack
  costEuros: real("cost_euros"), // estimated cost in euros
  
  // Categorization
  tags: text("tags").array().default([]), // dietary tags, cuisine types, etc.
  difficulty: text("difficulty").default("easy"), // easy, medium, hard
  cuisine: text("cuisine"), // Italian, Asian, Mediterranean, etc.
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isActive: boolean("is_active").default(false), // Default inactive - recipes must be explicitly activated to be used in meal plans
}, (table) => ({
  uniqueUserRecipe: unique().on(table.userId, table.name),
}));

// Meal prep components - reusable components that can be prepped in advance
export const mealPrepComponents = pgTable("meal_prep_components", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // e.g., "Roasted vegetables", "Cooked quinoa", "Marinated tofu"
  description: text("description"), // What it is and how it's used
  prepInstructions: text("prep_instructions").array().notNull(), // Step-by-step prep instructions
  storageInstructions: text("storage_instructions"), // How to store (e.g., "Refrigerate in airtight container for up to 5 days")
  prepTime: integer("prep_time").notNull(), // minutes to prepare
  yield: text("yield"), // e.g., "4 cups", "500g"
  tags: text("tags").array().default([]), // vegetarian, vegan, gluten-free, etc.
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Links recipes to their prep components
export const recipeMealPrepComponents = pgTable("recipe_meal_prep_components", {
  id: serial("id").primaryKey(),
  recipeId: text("recipe_id").references(() => recipes.id, { onDelete: "cascade" }).notNull(),
  componentId: integer("component_id").references(() => mealPrepComponents.id, { onDelete: "cascade" }).notNull(),
  amount: text("amount"), // e.g., "200g", "1 cup" - how much of the component this recipe uses
  notes: text("notes"), // Optional notes about how the component is used in this recipe
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueRecipeComponent: unique().on(table.recipeId, table.componentId),
}));

// AI-generated recipes storage
export const aiRecipes = pgTable("ai_recipes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  portion: text("portion").notNull(),
  ingredients: text("ingredients").array().notNull(),
  instructions: text("instructions").array().notNull(),
  tips: text("tips").array().default([]),
  notes: text("notes"),
  
  // Nutrition information
  protein: real("protein").notNull(),
  calories: real("calories").notNull(),
  carbohydrates: real("carbohydrates").default(0),
  fats: real("fats").default(0),
  fiber: real("fiber").default(0),
  sugar: real("sugar").default(0),
  sodium: real("sodium").default(0),
  cocoaFlavanols: real("cocoa_flavanols").default(0), // mg
  
  // Meal info
  prepTime: integer("prep_time").notNull(),
  cookTime: integer("cook_time").default(0),
  servings: integer("servings").default(1),
  mealTypes: text("meal_types").array().notNull(),
  costEuros: real("cost_euros"),
  
  // Categorization
  tags: text("tags").array().default([]),
  difficulty: text("difficulty").default("easy"),
  cuisine: text("cuisine"),
  
  // AI-specific metadata
  source: text("source").default("ai").notNull(),
  generatedForUserId: integer("generated_for_user_id").references(() => users.id),
  usageCount: integer("usage_count").default(1),
  recipeHash: text("recipe_hash").notNull().unique(), // for deduplication based on name + tags
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastUsedAt: timestamp("last_used_at").defaultNow(),
});

// Shopping list name standardization table
export const shoppingListNames = pgTable("shopping_list_names", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // standardized grocery name e.g. "Kipfilet" 
  category: text("category").notNull(), // e.g. "Proteins", "Vegetables", "Fruits"
  defaultUnit: text("default_unit").default("g"), // default unit for this item
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ingredient to shopping list name mappings for admin control
export const ingredientMappings = pgTable("ingredient_mappings", {
  id: serial("id").primaryKey(),
  originalIngredient: text("original_ingredient").notNull(), // e.g. "200g chicken breast"
  normalizedIngredient: text("normalized_ingredient").notNull(), // e.g. "chicken breast" 
  shoppingListNameId: integer("shopping_list_name_id").references(() => shoppingListNames.id),
  quantity: real("quantity"), // extracted quantity e.g. 200
  unit: text("unit"), // extracted unit e.g. "g"
  isManualOverride: boolean("is_manual_override").default(false), // admin manually set this mapping
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueIngredient: unique().on(table.normalizedIngredient),
}));

// Plant diversity categorization for tracking unique plant foods per week
export const plantCategories = pgTable("plant_categories", {
  id: serial("id").primaryKey(),
  canonicalName: text("canonical_name").notNull().unique(), // e.g. "spinach"
  displayName: text("display_name").notNull(), // e.g. "Spinach"
  plantType: text("plant_type").notNull(), // vegetable, fruit, grain, legume, nut, seed, herb, spice
  synonyms: text("synonyms").array().default([]), // e.g. ["baby spinach", "raw spinach"]
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pre-translated recipe storage for multi-language support
export const recipeTranslations = pgTable("recipe_translations", {
  id: serial("id").primaryKey(),
  recipeId: text("recipe_id").notNull(), // Text ID matching recipes.id (supports both numeric and string IDs)
  language: varchar("language", { length: 5 }).notNull(), // 'en', 'nl'
  name: text("name").notNull(), // Translated recipe name
  ingredients: text("ingredients").array().notNull(), // Translated ingredients array
  instructions: text("instructions").array().notNull(), // Translated instructions array
  tips: text("tips").array().default([]), // Translated tips array
  notes: text("notes").array().default([]), // Translated notes array
  translatedAt: timestamp("translated_at").defaultNow(),
}, (table) => ({
  uniqueRecipeLanguage: unique().on(table.recipeId, table.language),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  weight: true,
  goalWeight: true,
  height: true,
  age: true,
  waistline: true,
  goalWaistline: true,
  activityLevel: true,
  proteinTarget: true,
  dietaryTags: true,
  language: true,
  leftovers: true,
});

export const authRegisterSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

export const authLoginSchema = z.object({
  username: z.string(),
  password: z.string(),
  rememberMe: z.boolean().optional(),
});

export const updateUserProfileSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  firstName: true,
  lastName: true,
  gender: true,
  weight: true,
  goalWeight: true,
  height: true,
  age: true,
  waistline: true,
  goalWaistline: true,
  targetDate: true,
  activityLevel: true,
  trainingType: true,
  goal: true,
  proteinTarget: true,
  dietaryTags: true,
  householdSize: true,
  includeBreakfast: true,
  includeLunch: true,
  includeDinner: true,
  cookingDaysPerWeek: true,
  eatingDaysAtHome: true,
  language: true,
  leftovers: true,
  useOnlyMyRecipes: true,
  cycleSupportRecipes: true,
  menstrualPhase: true,
}).partial();

export const insertMealPlanSchema = createInsertSchema(mealPlans).omit({
  id: true,
  createdAt: true,
});

export const insertMealSchema = createInsertSchema(meals).omit({
  id: true,
});

// Available dietary tags for user selection
export const DIETARY_TAGS = [
  "vegetarian",
  "vegan", 
  "gluten-free",
  "lactose-free",
  "dairy-free",
  "nut-free",
  "soy-free",
  "low-carb",
  "keto",
  "pescatarian",
  "ayurvedic",
  "viral",
  "social-media"
] as const;

export const mealPlanRequestSchema = z.object({
  activityLevel: z.enum(["high", "low", "moderate"]),
  weekStart: z.string(),
  userId: z.number().optional(),
  dietaryTags: z.array(z.enum(DIETARY_TAGS)).optional(),
  leftovers: z.array(z.string()).optional(),
  weekendMealPrepEnabled: z.boolean().optional(),
});

export const insertOuraDataSchema = createInsertSchema(ouraData).omit({
  id: true,
  syncedAt: true,
});

export const insertRecipeRatingSchema = createInsertSchema(recipeRatings).omit({
  id: true,
  ratedAt: true,
});

export const recipeRatingSchema = z.object({
  recipeName: z.string().min(1),
  rating: z.number().min(1).max(5),
  feedback: z.string().optional(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack", "dessert", "smoothie"]),
});

export const insertMealHistorySchema = createInsertSchema(mealHistory).omit({
  id: true,
  consumedAt: true,
});

export const insertMealFavoriteSchema = createInsertSchema(mealFavorites).omit({
  id: true,
  favoritedAt: true,
});

export const mealFavoriteUpdateSchema = z.object({
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
export type AuthRegister = z.infer<typeof authRegisterSchema>;
export type AuthLogin = z.infer<typeof authLoginSchema>;
export type MealPlan = typeof mealPlans.$inferSelect;
export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
export type RecipeRating = typeof recipeRatings.$inferSelect;
export type InsertRecipeRating = z.infer<typeof insertRecipeRatingSchema>;
export type Meal = typeof meals.$inferSelect;
export type InsertMeal = z.infer<typeof insertMealSchema>;
export type MealPlanRequest = z.infer<typeof mealPlanRequestSchema>;
export type OuraData = typeof ouraData.$inferSelect;
export type InsertOuraData = z.infer<typeof insertOuraDataSchema>;
export type MealHistory = typeof mealHistory.$inferSelect;
export type InsertMealHistory = z.infer<typeof insertMealHistorySchema>;
export type MealFavorite = typeof mealFavorites.$inferSelect;
export type InsertMealFavorite = z.infer<typeof insertMealFavoriteSchema>;
export type MealFavoriteUpdate = z.infer<typeof mealFavoriteUpdateSchema>;

// Unified recipe schemas
export const insertRecipeSchema = createInsertSchema(recipes).omit({
  createdAt: true,
  updatedAt: true,
});

export const updateRecipeSchema = createInsertSchema(recipes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export type Recipe = typeof recipes.$inferSelect;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type UpdateRecipe = z.infer<typeof updateRecipeSchema>;

// User recipe schemas
export const insertUserRecipeSchema = createInsertSchema(userRecipes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserRecipeSchema = createInsertSchema(userRecipes).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export type UserRecipe = typeof userRecipes.$inferSelect;
export type InsertUserRecipe = z.infer<typeof insertUserRecipeSchema>;
export type UpdateUserRecipe = z.infer<typeof updateUserRecipeSchema>;

// AI recipe schemas
export const insertAiRecipeSchema = createInsertSchema(aiRecipes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUsedAt: true,
  usageCount: true,
});

export const updateAiRecipeSchema = createInsertSchema(aiRecipes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  recipeHash: true,
}).partial();

export type AiRecipe = typeof aiRecipes.$inferSelect;
export type InsertAiRecipe = z.infer<typeof insertAiRecipeSchema>;
export type UpdateAiRecipe = z.infer<typeof updateAiRecipeSchema>;

// Shopping Lists for persistent storage of shopping list data and crossed-off items
export const shoppingLists = pgTable("shopping_lists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  mealPlanId: integer("meal_plan_id").references(() => mealPlans.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Shopping List"),
  listType: text("list_type").notNull().default("regular"), // 'regular', 'albert_heijn'
  totalItems: integer("total_items").default(0),
  checkedItems: integer("checked_items").default(0),
  generatedAt: timestamp("generated_at").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow(),
  isActive: boolean("is_active").default(true),
}, (table) => ({
  uniqueUserMealPlan: unique().on(table.userId, table.mealPlanId, table.listType),
}));

export const shoppingListItems = pgTable("shopping_list_items", {
  id: serial("id").primaryKey(),
  shoppingListId: integer("shopping_list_id").references(() => shoppingLists.id, { onDelete: "cascade" }).notNull(),
  productName: text("product_name").notNull(),
  quantity: real("quantity").default(1),
  unit: text("unit").default("piece"),
  price: real("price").default(0),
  category: text("category").default("Other"),
  isChecked: boolean("is_checked").default(false),
  checkedAt: timestamp("checked_at"),
  sortOrder: integer("sort_order").default(0),
  // Albert Heijn specific fields
  productId: text("product_id"), // AH product ID
  imageUrl: text("image_url"), // AH product image
  deepLink: text("deep_link"), // AH app deep link
});

export const passwordResetCodes = pgTable("password_reset_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  resetCode: varchar("reset_code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPasswordResetCodeSchema = createInsertSchema(passwordResetCodes).omit({
  id: true,
  createdAt: true,
});

export type PasswordResetCode = typeof passwordResetCodes.$inferSelect;
export type InsertPasswordResetCode = z.infer<typeof insertPasswordResetCodeSchema>;

// Shopping List schemas
export const insertShoppingListSchema = createInsertSchema(shoppingLists).omit({
  id: true,
  generatedAt: true,
  lastUpdated: true,
});

export const insertShoppingListItemSchema = createInsertSchema(shoppingListItems).omit({
  id: true,
  checkedAt: true,
});

export const updateShoppingListItemSchema = z.object({
  isChecked: z.boolean().optional(),
  quantity: z.number().optional(),
  productName: z.string().optional(),
  category: z.string().optional(),
});

export type ShoppingList = typeof shoppingLists.$inferSelect;
export type InsertShoppingList = z.infer<typeof insertShoppingListSchema>;
export type ShoppingListItem = typeof shoppingListItems.$inferSelect;
export type InsertShoppingListItem = z.infer<typeof insertShoppingListItemSchema>;
export type UpdateShoppingListItem = z.infer<typeof updateShoppingListItemSchema>;

export interface ShoppingListWithItems extends ShoppingList {
  items: ShoppingListItem[];
}

export interface MealPlanWithMeals extends MealPlan {
  meals: Meal[];
}

// Editable page content for admin management
export const editableContent = pgTable("editable_content", {
  id: serial("id").primaryKey(),
  contentKey: text("content_key").notNull().unique(), // e.g., 'aboutSubtitle', 'philosophyStatement'
  contentEn: text("content_en").notNull(), // English content
  contentNl: text("content_nl").notNull(), // Dutch content
  contentType: text("content_type").default("text"), // 'text', 'title', 'description'
  pageSection: text("page_section").default("about"), // 'about', 'header', 'features', etc.
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Editable content schemas
export const insertEditableContentSchema = createInsertSchema(editableContent).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateEditableContentSchema = createInsertSchema(editableContent).omit({
  id: true,
  contentKey: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export type EditableContent = typeof editableContent.$inferSelect;
export type InsertEditableContent = z.infer<typeof insertEditableContentSchema>;
export type UpdateEditableContent = z.infer<typeof updateEditableContentSchema>;

// Recipe modifications table for storing admin changes to recipes
export const recipeModifications = pgTable("recipe_modifications", {
  id: serial("id").primaryKey(),
  recipeId: text("recipe_id").notNull().unique(), // Original recipe ID or name - must be unique for upsert
  name: text("name").notNull(),
  ingredients: text("ingredients").array().notNull(),
  instructions: text("instructions").array().notNull(),
  nutrition: text("nutrition").notNull(), // JSON string of nutrition object
  category: text("category"),
  tags: text("tags").array(),
  portion: text("portion"),
  modifiedBy: integer("modified_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  modifiedAt: timestamp("modified_at").defaultNow(),
});

// Recipe deletions table for tracking which recipes admins have deleted
export const recipeDeletions = pgTable("recipe_deletions", {
  id: serial("id").primaryKey(),
  recipeId: text("recipe_id").notNull().unique(), // Recipe ID that was deleted
  deletedBy: integer("deleted_by").references(() => users.id).notNull(),
  deletedAt: timestamp("deleted_at").defaultNow(),
});

// Deleted tags table for tracking which tags have been removed from all recipes
export const deletedTags = pgTable("deleted_tags", {
  id: serial("id").primaryKey(),
  tag: text("tag").notNull().unique(), // Tag that was deleted
  deletedBy: integer("deleted_by").references(() => users.id),
  deletedAt: timestamp("deleted_at").defaultNow(),
});

// Recipe modification schemas
export const insertRecipeModificationSchema = createInsertSchema(recipeModifications).omit({
  id: true,
  createdAt: true,
  modifiedAt: true,
});

export const insertRecipeDeletionSchema = createInsertSchema(recipeDeletions).omit({
  id: true,
  deletedAt: true,
});

export const insertDeletedTagSchema = createInsertSchema(deletedTags).omit({
  id: true,
  deletedAt: true,
});

export type RecipeModification = typeof recipeModifications.$inferSelect;
export type InsertRecipeModification = z.infer<typeof insertRecipeModificationSchema>;
export type RecipeDeletion = typeof recipeDeletions.$inferSelect;
export type InsertRecipeDeletion = z.infer<typeof insertRecipeDeletionSchema>;
export type DeletedTag = typeof deletedTags.$inferSelect;
export type InsertDeletedTag = z.infer<typeof insertDeletedTagSchema>;

// Shopping list name schemas
export const insertShoppingListNameSchema = createInsertSchema(shoppingListNames).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateShoppingListNameSchema = createInsertSchema(shoppingListNames).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

// Ingredient mapping schemas
export const insertIngredientMappingSchema = createInsertSchema(ingredientMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateIngredientMappingSchema = createInsertSchema(ingredientMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export type ShoppingListName = typeof shoppingListNames.$inferSelect;
export type InsertShoppingListName = z.infer<typeof insertShoppingListNameSchema>;
export type UpdateShoppingListName = z.infer<typeof updateShoppingListNameSchema>;

export type IngredientMapping = typeof ingredientMappings.$inferSelect;
export type InsertIngredientMapping = z.infer<typeof insertIngredientMappingSchema>;
export type UpdateIngredientMapping = z.infer<typeof updateIngredientMappingSchema>;

// Recipe translation schemas
export const insertRecipeTranslationSchema = createInsertSchema(recipeTranslations).omit({
  id: true,
  translatedAt: true,
});

export type RecipeTranslation = typeof recipeTranslations.$inferSelect;
export type InsertRecipeTranslation = z.infer<typeof insertRecipeTranslationSchema>;

// Meal prep component schemas
export const insertMealPrepComponentSchema = createInsertSchema(mealPrepComponents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateMealPrepComponentSchema = createInsertSchema(mealPrepComponents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export type MealPrepComponent = typeof mealPrepComponents.$inferSelect;
export type InsertMealPrepComponent = z.infer<typeof insertMealPrepComponentSchema>;
export type UpdateMealPrepComponent = z.infer<typeof updateMealPrepComponentSchema>;

// Recipe meal prep component schemas
export const insertRecipeMealPrepComponentSchema = createInsertSchema(recipeMealPrepComponents).omit({
  id: true,
  createdAt: true,
});

export type RecipeMealPrepComponent = typeof recipeMealPrepComponents.$inferSelect;
export type InsertRecipeMealPrepComponent = z.infer<typeof insertRecipeMealPrepComponentSchema>;
