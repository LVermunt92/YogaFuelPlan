import { pgTable, text, serial, integer, boolean, timestamp, real, date, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  weight: integer("weight").default(60), // kg
  goalWeight: integer("goal_weight"), // target weight in kg
  height: integer("height"), // cm
  waistline: real("waistline").default(75), // cm
  goalWaistline: real("goal_waistline"), // target waistline in cm
  targetDate: date("target_date"), // when to reach goals by
  activityLevel: text("activity_level").default("high"), // high or low
  proteinTarget: integer("protein_target").default(130), // grams
  dietaryTags: text("dietary_tags").array().default([]),
  householdSize: integer("household_size").default(1),
  cookingDaysPerWeek: integer("cooking_days_per_week").default(7),
  eatingDaysAtHome: integer("eating_days_at_home").default(7),
  meatFishMealsPerWeek: integer("meat_fish_meals_per_week").default(0),
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
  notionSynced: boolean("notion_synced").default(false),
});

export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  mealPlanId: integer("meal_plan_id").references(() => mealPlans.id),
  day: integer("day").notNull(), // 1-7
  mealType: text("meal_type").notNull(), // breakfast, lunch, dinner
  foodDescription: text("food_description").notNull(),
  portion: text("portion").notNull(),
  protein: real("protein").notNull(), // grams
  calories: real("calories").default(0), // kcal
  carbohydrates: real("carbohydrates").default(0), // grams
  fats: real("fats").default(0), // grams
  fiber: real("fiber").default(0), // grams
  sugar: real("sugar").default(0), // grams
  sodium: real("sodium").default(0), // mg
  prepTime: integer("prep_time").default(30), // minutes
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
  mealType: text("meal_type").notNull(), // breakfast, lunch, dinner
  ratedAt: timestamp("rated_at").notNull().defaultNow(),
}, (table) => ({
  uniqueUserRecipe: unique().on(table.userId, table.recipeName),
}));

export const mealHistory = pgTable("meal_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  mealName: text("meal_name").notNull(),
  mealType: text("meal_type").notNull(), // breakfast, lunch, dinner
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
  mealType: text("meal_type").notNull(), // breakfast, lunch, dinner
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

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  weight: true,
  goalWeight: true,
  waistline: true,
  goalWaistline: true,
  activityLevel: true,
  proteinTarget: true,
  dietaryTags: true,
});

export const authRegisterSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

export const authLoginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export const updateUserProfileSchema = createInsertSchema(users).pick({
  weight: true,
  goalWeight: true,
  height: true,
  waistline: true,
  goalWaistline: true,
  targetDate: true,
  activityLevel: true,
  proteinTarget: true,
  dietaryTags: true,
  householdSize: true,
  cookingDaysPerWeek: true,
  eatingDaysAtHome: true,
  meatFishMealsPerWeek: true,
});

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
  "paleo",
  "mediterranean",
  "anti-inflammatory",
  "high-protein",
  "low-sodium",
  "sugar-free",
  "whole30",
  "raw",
  "pescatarian",
  "ayurvedic",
  "viral",
  "social-media"
] as const;

export const mealPlanRequestSchema = z.object({
  activityLevel: z.enum(["high", "low"]),
  weekStart: z.string(),
  userId: z.number().optional(),
  dietaryTags: z.array(z.enum(DIETARY_TAGS)).optional(),
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
  mealType: z.enum(["breakfast", "lunch", "dinner"]),
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

export interface MealPlanWithMeals extends MealPlan {
  meals: Meal[];
}
