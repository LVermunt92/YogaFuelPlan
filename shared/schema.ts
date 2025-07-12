import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  weight: integer("weight").default(60), // kg
  activityLevel: text("activity_level").default("high"), // high or low
  proteinTarget: integer("protein_target").default(130), // grams
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
  prepTime: integer("prep_time").default(30), // minutes
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  weight: true,
  activityLevel: true,
  proteinTarget: true,
});

export const insertMealPlanSchema = createInsertSchema(mealPlans).omit({
  id: true,
  createdAt: true,
});

export const insertMealSchema = createInsertSchema(meals).omit({
  id: true,
});

export const mealPlanRequestSchema = z.object({
  activityLevel: z.enum(["high", "low"]),
  weekStart: z.string(),
  userId: z.number().optional(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type MealPlan = typeof mealPlans.$inferSelect;
export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
export type Meal = typeof meals.$inferSelect;
export type InsertMeal = z.infer<typeof insertMealSchema>;
export type MealPlanRequest = z.infer<typeof mealPlanRequestSchema>;

export interface MealPlanWithMeals extends MealPlan {
  meals: Meal[];
}
