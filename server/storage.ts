import { 
  users, 
  mealPlans, 
  meals,
  ouraData,
  mealHistory,
  mealFavorites,
  userRecipes,
  shoppingLists,
  shoppingListItems,
  shoppingListNames,
  ingredientMappings,
  recipeTranslations,

  type User, 
  type InsertUser,
  type UpdateUserProfile, 
  type MealPlan, 
  type InsertMealPlan,
  type Meal,
  type InsertMeal,
  type MealPlanWithMeals,
  type OuraData,
  type InsertOuraData,
  type MealHistory,
  type InsertMealHistory,
  type MealFavorite,
  type InsertMealFavorite,
  type MealFavoriteUpdate,
  type UserRecipe,
  type InsertUserRecipe,
  type UpdateUserRecipe,
  type ShoppingList,
  type InsertShoppingList,
  type ShoppingListItem,
  type InsertShoppingListItem,
  type UpdateShoppingListItem,
  type ShoppingListWithItems,
  type ShoppingListName,
  type InsertShoppingListName,
  type UpdateShoppingListName,
  type IngredientMapping,
  type InsertIngredientMapping,
  type UpdateIngredientMapping,
  type RecipeTranslation,
  type InsertRecipeTranslation,

  passwordResetCodes,
  type PasswordResetCode,
  type InsertPasswordResetCode,
  
  editableContent,
  type EditableContent,
  type InsertEditableContent,
  type UpdateEditableContent,

  recipeModifications,
  recipeDeletions,
  deletedTags,
  type RecipeModification,
  type InsertRecipeModification,
  type RecipeDeletion,
  type InsertRecipeDeletion,
  type DeletedTag,
  type InsertDeletedTag,

  aiRecipes,
  type AiRecipe,
  type InsertAiRecipe,
  type UpdateAiRecipe,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, inArray, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  authenticateUser(username: string, password: string): Promise<User | null>;
  updateUserPassword(userId: number, newPassword: string): Promise<void>;
  createPasswordResetCode(userId: number, resetCode: string): Promise<void>;
  verifyPasswordResetCode(userId: number, resetCode: string): Promise<boolean>;
  deletePasswordResetCode(userId: number): Promise<void>;
  updateUserProfile(userId: number, profileData: UpdateUserProfile): Promise<User>;
  createMealPlan(mealPlan: InsertMealPlan): Promise<MealPlan>;
  getMealPlans(userId?: number): Promise<MealPlan[]>;
  getMealPlanWithMeals(id: number): Promise<MealPlanWithMeals | undefined>;
  createMeals(mealPlanId: number, meals: InsertMeal[]): Promise<Meal[]>;

  deleteMealPlan(id: number): Promise<boolean>;
  cleanupOldMealPlans(userId: number, keepCount?: number): Promise<number>;
  createOuraData(data: InsertOuraData): Promise<OuraData>;
  getOuraData(userId: number, startDate: string, endDate?: string): Promise<OuraData[]>;
  getLatestOuraData(userId: number): Promise<OuraData | undefined>;
  getOuraDataByDate(userId: number, date: string): Promise<OuraData | undefined>;
  // Meal History methods
  addToMealHistory(data: InsertMealHistory): Promise<MealHistory>;
  getMealHistory(userId: number, limit?: number): Promise<MealHistory[]>;
  // Meal Favorites methods
  addToFavorites(data: InsertMealFavorite): Promise<MealFavorite>;
  removeFromFavorites(userId: number, mealName: string): Promise<void>;
  getFavorites(userId: number): Promise<MealFavorite[]>;
  updateFavorite(userId: number, mealName: string, updates: MealFavoriteUpdate): Promise<MealFavorite>;
  isFavorite(userId: number, mealName: string): Promise<boolean>;
  // User Recipe methods
  createUserRecipe(data: InsertUserRecipe): Promise<UserRecipe>;
  getUserRecipes(userId: number): Promise<UserRecipe[]>;
  getUserRecipe(id: number, userId: number): Promise<UserRecipe | undefined>;
  updateUserRecipe(id: number, userId: number, updates: UpdateUserRecipe): Promise<UserRecipe>;
  deleteUserRecipe(id: number, userId: number): Promise<void>;

  // Shopping List methods
  createShoppingList(data: InsertShoppingList): Promise<ShoppingList>;
  getShoppingList(userId: number, mealPlanId?: number, listType?: string): Promise<ShoppingListWithItems | undefined>;
  updateShoppingList(id: number, updates: Partial<ShoppingList>): Promise<ShoppingList>;
  deleteShoppingList(id: number): Promise<void>;
  addShoppingListItems(shoppingListId: number, items: InsertShoppingListItem[]): Promise<ShoppingListItem[]>;
  updateShoppingListItem(id: number, updates: UpdateShoppingListItem): Promise<ShoppingListItem>;
  deleteShoppingListItem(id: number): Promise<void>;
  clearShoppingListItems(shoppingListId: number): Promise<void>;

  // Shopping List Name methods for admin control
  createShoppingListName(data: InsertShoppingListName): Promise<ShoppingListName>;
  getShoppingListNames(): Promise<ShoppingListName[]>;
  updateShoppingListName(id: number, updates: UpdateShoppingListName): Promise<ShoppingListName>;
  deleteShoppingListName(id: number): Promise<void>;

  // Ingredient Mapping methods for admin control
  createIngredientMapping(data: InsertIngredientMapping): Promise<IngredientMapping>;
  getIngredientMappings(): Promise<IngredientMapping[]>;
  getIngredientMappingByIngredient(normalizedIngredient: string): Promise<IngredientMapping | undefined>;
  updateIngredientMapping(id: number, updates: UpdateIngredientMapping): Promise<IngredientMapping>;
  deleteIngredientMapping(id: number): Promise<void>;

  // Editable Content methods
  getEditableContent(contentKey?: string): Promise<EditableContent[]>;
  updateEditableContent(contentKey: string, updates: UpdateEditableContent): Promise<EditableContent>;
  createEditableContent(data: InsertEditableContent): Promise<EditableContent>;

  // Recipe Modification methods
  saveRecipeModification(recipeId: string, modification: any): Promise<void>;
  saveRecipeDeletion(recipeId: string, userId: number): Promise<void>;
  getRecipeModifications(): Promise<any[]>;
  getRecipeDeletions(): Promise<string[]>;
  
  // Deleted Tags methods
  saveDeletedTag(tag: string, deletedBy?: number): Promise<void>;
  getDeletedTags(): Promise<string[]>;

  // Recipe Translation methods
  getRecipeTranslation(recipeId: string, language: string): Promise<RecipeTranslation | undefined>;
  upsertRecipeTranslation(data: InsertRecipeTranslation): Promise<RecipeTranslation>;
  getBatchRecipeTranslations(recipeIds: string[], language: string): Promise<RecipeTranslation[]>;
  getMissingTranslations(recipeIds: string[], language: string): Promise<string[]>;

  // AI Recipe methods
  upsertAiRecipe(data: InsertAiRecipe): Promise<AiRecipe>;
  getAiRecipeByHash(recipeHash: string): Promise<AiRecipe | undefined>;
  getAiRecipeById(id: number): Promise<AiRecipe | undefined>;
  incrementAiRecipeUsage(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private mealPlans: Map<number, MealPlan>;
  private meals: Map<number, Meal>;
  private passwordResetCodes: PasswordResetCode[] = [];
  private currentUserId: number;
  private currentMealPlanId: number;
  private currentMealId: number;
  private currentResetCodeId: number;

  constructor() {
    this.users = new Map();
    this.mealPlans = new Map();
    this.meals = new Map();
    this.currentUserId = 1;
    this.currentMealPlanId = 1;
    this.currentMealId = 1;
    this.currentResetCodeId = 1;

    // Create default user with enhanced profile
    const defaultUser: User = {
      id: 1,
      username: "user",
      password: "password", 
      email: null,
      weight: 60,
      goalWeight: null,
      waistline: 75,
      goalWaistline: null,
      activityLevel: "high",
      proteinTarget: 130,
      dietaryTags: [],
      householdSize: 1,
      cookingDaysPerWeek: 7,
      eatingDaysAtHome: 7,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Add user with id=2 to match frontend expectations
    const user2: User = {
      id: 2,
      username: "LVermunt",
      password: "password", 
      email: "l.vermunt@example.com",
      firstName: "L",
      lastName: "Vermunt",
      height: 175,
      age: 35,
      weight: 70,
      goalWeight: 65,
      waistline: 85,
      goalWaistline: 80,
      targetDate: "2025-12-31",
      activityLevel: "high",
      proteinTarget: 120,
      dietaryTags: ["Vegetarian"],
      householdSize: 2,
      cookingDaysPerWeek: 5,
      eatingDaysAtHome: 6,
      meatFishMealsPerWeek: 0,
      language: "en",
      leftovers: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.users.set(1, defaultUser);
    this.users.set(2, user2);
    this.currentUserId = 3;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      id,
      username: insertUser.username,
      password: insertUser.password,
      email: insertUser.email || null,
      firstName: null,
      lastName: null,
      weight: insertUser.weight || 60,
      goalWeight: insertUser.goalWeight || null,
      height: insertUser.height || null,
      age: insertUser.age || null,
      waistline: insertUser.waistline || 75,
      goalWaistline: insertUser.goalWaistline || null,
      targetDate: null,
      activityLevel: insertUser.activityLevel || "high",
      proteinTarget: insertUser.proteinTarget || 130,
      dietaryTags: insertUser.dietaryTags || [],
      householdSize: 1,
      cookingDaysPerWeek: 7,
      eatingDaysAtHome: 7,
      meatFishMealsPerWeek: 0,
      language: insertUser.language || 'en',
      leftovers: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async authenticateUser(username: string, password: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.username === username && user.password === password) {
        return user;
      }
    }
    return null;
  }

  async updateUserPassword(userId: number, newPassword: string): Promise<void> {
    const user = this.users.get(userId);
    
    if (!user) {
      throw new Error("User not found");
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the password
    this.users.set(userId, {
      ...user,
      password: hashedPassword,
      updatedAt: new Date(),
    });
  }

  async createPasswordResetCode(userId: number, resetCode: string): Promise<void> {
    // Delete any existing reset codes for this user
    this.passwordResetCodes = this.passwordResetCodes.filter(code => code.userId !== userId);
    
    // Create new reset code (expires in 15 minutes)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const id = this.currentResetCodeId++;
    
    this.passwordResetCodes.push({
      id,
      userId,
      resetCode,
      expiresAt,
      createdAt: new Date(),
    });
  }

  async verifyPasswordResetCode(userId: number, resetCode: string): Promise<boolean> {
    const codeRecord = this.passwordResetCodes.find(
      code => code.userId === userId && code.resetCode === resetCode
    );
    
    if (!codeRecord) {
      return false;
    }
    
    // Check if code has expired
    if (new Date() > codeRecord.expiresAt) {
      // Remove expired code
      this.passwordResetCodes = this.passwordResetCodes.filter(code => code.id !== codeRecord.id);
      return false;
    }
    
    return true;
  }

  async deletePasswordResetCode(userId: number): Promise<void> {
    this.passwordResetCodes = this.passwordResetCodes.filter(code => code.userId !== userId);
  }

  async updateUserProfile(userId: number, profileData: UpdateUserProfile): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const updatedUser: User = {
      ...user,
      ...profileData,
      updatedAt: new Date(),
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async createMealPlan(insertMealPlan: InsertMealPlan): Promise<MealPlan> {
    const id = this.currentMealPlanId++;
    
    // Auto-cleanup: Keep only the latest 3 meal plans per user to manage memory
    await this.cleanupOldMealPlans(insertMealPlan.userId || 1);
    
    const mealPlan: MealPlan = {
      ...insertMealPlan,
      id,
      createdAt: new Date(),
      userId: insertMealPlan.userId || 1,

    };
    this.mealPlans.set(id, mealPlan);
    return mealPlan;
  }



  async deleteMealPlan(id: number): Promise<boolean> {
    // Remove associated meals first
    const mealsToRemove = Array.from(this.meals.entries())
      .filter(([_, meal]) => meal.mealPlanId === id)
      .map(([mealId, _]) => mealId);
    
    mealsToRemove.forEach(mealId => this.meals.delete(mealId));
    
    // Remove the meal plan
    const deleted = this.mealPlans.delete(id);
    
    if (deleted) {
      console.log(`🗑️ Deleted meal plan ID ${id}`);
    }
    
    return deleted;
  }

  async cleanupOldMealPlans(userId: number, keepCount: number = 3): Promise<number> {
    // Get all meal plans for the user, sorted by ID (newest first)
    const userMealPlans = Array.from(this.mealPlans.values())
      .filter(plan => plan.userId === userId)
      .sort((a, b) => b.id - a.id);
    
    if (userMealPlans.length <= keepCount) {
      console.log(`👍 User ${userId} has ${userMealPlans.length} meal plans, no cleanup needed`);
      return 0;
    }
    
    // Get meal plans to delete (everything beyond keepCount)
    const plansToDelete = userMealPlans.slice(keepCount);
    let deletedCount = 0;
    
    for (const plan of plansToDelete) {
      const success = await this.deleteMealPlan(plan.id);
      if (success) deletedCount++;
    }
    
    console.log(`🧹 Cleaned up ${deletedCount} old meal plans for user ${userId}, keeping ${keepCount} most recent`);
    return deletedCount;
  }

  async getMealPlans(userId?: number): Promise<MealPlan[]> {
    let plans = Array.from(this.mealPlans.values());
    if (userId) {
      plans = plans.filter(plan => plan.userId === userId);
    }
    return plans.sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  // Get meal plans by type (current, next, saved, backup)
  async getMealPlansByType(userId: number, planType: string): Promise<MealPlan[]> {
    return Array.from(this.mealPlans.values())
      .filter(plan => plan.userId === userId && (plan as any).planType === planType)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  // Get active meal plans (multiple plans can be active for alternating)
  async getActiveMealPlans(userId: number): Promise<MealPlan[]> {
    return Array.from(this.mealPlans.values())
      .filter(plan => plan.userId === userId && (plan as any).isActive === true)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  // Set meal plan as active/inactive
  async setMealPlanActive(mealPlanId: number, isActive: boolean): Promise<void> {
    const mealPlan = this.mealPlans.get(mealPlanId);
    if (mealPlan) {
      (mealPlan as any).isActive = isActive;
      this.mealPlans.set(mealPlanId, mealPlan);
    }
  }

  // Duplicate a meal plan for next week or backup
  async duplicateMealPlan(mealPlanId: number, newWeekStart: string, planType: string, planName?: string): Promise<MealPlan> {
    const originalPlan = this.mealPlans.get(mealPlanId);
    if (!originalPlan) throw new Error('Meal plan not found');

    // Create new meal plan
    const newPlanId = this.currentMealPlanId++;
    const newPlan: MealPlan = {
      ...originalPlan,
      id: newPlanId,
      weekStart: newWeekStart,
      createdAt: new Date(),
      ...(planName && { planName }),
      planType,
      isActive: planType === 'current' || planType === 'backup'
    } as any;

    this.mealPlans.set(newPlanId, newPlan);

    // Copy all meals from original plan
    const originalMeals = Array.from(this.meals.values())
      .filter(meal => meal.mealPlanId === mealPlanId);
    
    for (const originalMeal of originalMeals) {
      const newMealId = this.currentMealId++;
      const newMeal: Meal = {
        ...originalMeal,
        id: newMealId,
        mealPlanId: newPlanId
      };
      this.meals.set(newMealId, newMeal);
    }

    return newPlan;
  }

  async getMealPlanWithMeals(id: number): Promise<MealPlanWithMeals | undefined> {
    const mealPlan = this.mealPlans.get(id);
    if (!mealPlan) return undefined;

    const planMeals = Array.from(this.meals.values())
      .filter(meal => meal.mealPlanId === id)
      .sort((a, b) => {
        if (a.day !== b.day) return a.day - b.day;
        const mealOrder = { breakfast: 1, lunch: 2, dinner: 3 };
        return mealOrder[a.mealType as keyof typeof mealOrder] - 
               mealOrder[b.mealType as keyof typeof mealOrder];
      });

    return {
      ...mealPlan,
      meals: planMeals,
    };
  }

  async createMeals(mealPlanId: number, insertMeals: InsertMeal[]): Promise<Meal[]> {
    const createdMeals: Meal[] = [];
    
    for (const insertMeal of insertMeals) {
      const id = this.currentMealId++;
      const meal: Meal = {
        ...insertMeal,
        id,
        mealPlanId,
        prepTime: insertMeal.prepTime || 30,
      };
      this.meals.set(id, meal);
      createdMeals.push(meal);
    }
    
    return createdMeals;
  }



  // Oura data methods (MemStorage)
  async createOuraData(data: InsertOuraData): Promise<OuraData> {
    // Note: MemStorage doesn't persist Oura data - use DatabaseStorage for production
    throw new Error("Oura data storage requires DatabaseStorage implementation");
  }

  async getOuraData(userId: number, startDate: string, endDate?: string): Promise<OuraData[]> {
    // Note: MemStorage doesn't persist Oura data - use DatabaseStorage for production
    return [];
  }

  async getLatestOuraData(userId: number): Promise<OuraData | undefined> {
    // Note: MemStorage doesn't persist Oura data - use DatabaseStorage for production
    return undefined;
  }

  async getOuraDataByDate(userId: number, date: string): Promise<OuraData | undefined> {
    // Note: MemStorage doesn't persist Oura data - use DatabaseStorage for production
    return undefined;
  }

  // Meal History methods (MemStorage - not implemented)
  async addToMealHistory(data: InsertMealHistory): Promise<MealHistory> {
    throw new Error("Meal history storage requires DatabaseStorage implementation");
  }

  async getMealHistory(userId: number, limit?: number): Promise<MealHistory[]> {
    return [];
  }

  // Meal Favorites methods (MemStorage - not implemented) 
  async addToFavorites(data: InsertMealFavorite): Promise<MealFavorite> {
    throw new Error("Meal favorites storage requires DatabaseStorage implementation");
  }

  async removeFromFavorites(userId: number, mealName: string): Promise<void> {
    // No-op for MemStorage
  }

  async getFavorites(userId: number): Promise<MealFavorite[]> {
    return [];
  }

  async updateFavorite(userId: number, mealName: string, updates: MealFavoriteUpdate): Promise<MealFavorite> {
    throw new Error("Meal favorites storage requires DatabaseStorage implementation");
  }

  async isFavorite(userId: number, mealName: string): Promise<boolean> {
    return false;
  }

  // User Recipe methods (MemStorage - not implemented)
  async createUserRecipe(data: InsertUserRecipe): Promise<UserRecipe> {
    throw new Error("User recipes storage requires DatabaseStorage implementation");
  }

  async getUserRecipes(userId: number): Promise<UserRecipe[]> {
    return [];
  }

  async getUserRecipe(id: number, userId: number): Promise<UserRecipe | undefined> {
    return undefined;
  }

  async updateUserRecipe(id: number, userId: number, updates: UpdateUserRecipe): Promise<UserRecipe> {
    throw new Error("User recipes storage requires DatabaseStorage implementation");
  }

  async deleteUserRecipe(id: number, userId: number): Promise<void> {
    // No-op for MemStorage
  }

  // Recipe Modification methods (MemStorage - not implemented)
  async saveRecipeModification(recipeId: string, modification: any): Promise<void> {
    // No-op for MemStorage - requires DatabaseStorage implementation
  }

  async saveRecipeDeletion(recipeId: string, userId: number): Promise<void> {
    // No-op for MemStorage - requires DatabaseStorage implementation
  }

  async getRecipeModifications(): Promise<any[]> {
    return [];
  }

  async getRecipeDeletions(): Promise<string[]> {
    return [];
  }
  
  // Deleted Tags methods (MemStorage - not implemented)
  async saveDeletedTag(tag: string, deletedBy?: number): Promise<void> {
    // No-op for MemStorage - requires DatabaseStorage implementation
  }

  async getDeletedTags(): Promise<string[]> {
    return [];
  }

  // Shopping List methods (MemStorage - not implemented)
  async createShoppingList(data: InsertShoppingList): Promise<ShoppingList> {
    throw new Error("Shopping list storage requires DatabaseStorage implementation");
  }

  async getShoppingList(userId: number, mealPlanId?: number, listType?: string): Promise<ShoppingListWithItems | undefined> {
    return undefined;
  }

  async updateShoppingList(id: number, updates: Partial<ShoppingList>): Promise<ShoppingList> {
    throw new Error("Shopping list storage requires DatabaseStorage implementation");
  }

  async deleteShoppingList(id: number): Promise<void> {
    // No-op for MemStorage
  }

  async addShoppingListItems(shoppingListId: number, items: InsertShoppingListItem[]): Promise<ShoppingListItem[]> {
    return [];
  }

  async updateShoppingListItem(id: number, updates: UpdateShoppingListItem): Promise<ShoppingListItem> {
    throw new Error("Shopping list storage requires DatabaseStorage implementation");
  }

  async deleteShoppingListItem(id: number): Promise<void> {
    // No-op for MemStorage
  }

  async clearShoppingListItems(shoppingListId: number): Promise<void> {
    // No-op for MemStorage
  }

  // Shopping List Name methods (MemStorage - not implemented)
  async createShoppingListName(data: InsertShoppingListName): Promise<ShoppingListName> {
    throw new Error("Shopping list name storage requires DatabaseStorage implementation");
  }

  async getShoppingListNames(): Promise<ShoppingListName[]> {
    return [];
  }

  async updateShoppingListName(id: number, updates: UpdateShoppingListName): Promise<ShoppingListName> {
    throw new Error("Shopping list name storage requires DatabaseStorage implementation");
  }

  async deleteShoppingListName(id: number): Promise<void> {
    // No-op for MemStorage
  }

  // Ingredient Mapping methods (MemStorage - not implemented)
  async createIngredientMapping(data: InsertIngredientMapping): Promise<IngredientMapping> {
    throw new Error("Ingredient mapping storage requires DatabaseStorage implementation");
  }

  async getIngredientMappings(): Promise<IngredientMapping[]> {
    return [];
  }

  async getIngredientMappingByIngredient(normalizedIngredient: string): Promise<IngredientMapping | undefined> {
    return undefined;
  }

  async updateIngredientMapping(id: number, updates: UpdateIngredientMapping): Promise<IngredientMapping> {
    throw new Error("Ingredient mapping storage requires DatabaseStorage implementation");
  }

  async deleteIngredientMapping(id: number): Promise<void> {
    // No-op for MemStorage
  }

  // Editable Content methods (MemStorage - not implemented)
  async getEditableContent(contentKey?: string): Promise<EditableContent[]> {
    return [];
  }

  async updateEditableContent(contentKey: string, updates: UpdateEditableContent): Promise<EditableContent> {
    throw new Error("Editable content storage requires DatabaseStorage implementation");
  }

  async createEditableContent(data: InsertEditableContent): Promise<EditableContent> {
    throw new Error("Editable content storage requires DatabaseStorage implementation");
  }

  // Recipe Translation methods (MemStorage - not implemented)
  async getRecipeTranslation(recipeId: string, language: string): Promise<RecipeTranslation | undefined> {
    return undefined;
  }

  async upsertRecipeTranslation(data: InsertRecipeTranslation): Promise<RecipeTranslation> {
    throw new Error("Recipe translation storage requires DatabaseStorage implementation");
  }

  async getBatchRecipeTranslations(recipeIds: string[], language: string): Promise<RecipeTranslation[]> {
    return [];
  }

  async getMissingTranslations(recipeIds: string[], language: string): Promise<string[]> {
    return recipeIds; // All are missing in MemStorage
  }

  // AI Recipe methods (MemStorage - not implemented)
  async upsertAiRecipe(data: InsertAiRecipe): Promise<AiRecipe> {
    throw new Error("AI recipe storage requires DatabaseStorage implementation");
  }

  async getAiRecipeByHash(recipeHash: string): Promise<AiRecipe | undefined> {
    return undefined;
  }

  async getAiRecipeById(id: number): Promise<AiRecipe | undefined> {
    return undefined;
  }

  async incrementAiRecipeUsage(id: number): Promise<void> {
    // No-op for MemStorage
  }

}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword,
      })
      .returning();
    return user;
  }

  async authenticateUser(username: string, password: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    
    if (!user) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    return isValidPassword ? user : null;
  }

  async updateUserPassword(userId: number, newPassword: string): Promise<void> {
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the password in database
    await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updateUserProfile(userId: number, profileData: UpdateUserProfile): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...profileData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (!user) {
      throw new Error("User not found");
    }
    
    return user;
  }

  async createPasswordResetCode(userId: number, resetCode: string): Promise<void> {
    // Delete any existing reset codes for this user
    await db.delete(passwordResetCodes).where(eq(passwordResetCodes.userId, userId));
    
    // Create new reset code (expires in 15 minutes)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    
    await db.insert(passwordResetCodes).values({
      userId,
      resetCode,
      expiresAt,
    });
  }

  async verifyPasswordResetCode(userId: number, resetCode: string): Promise<boolean> {
    const [codeRecord] = await db
      .select()
      .from(passwordResetCodes)
      .where(
        and(
          eq(passwordResetCodes.userId, userId),
          eq(passwordResetCodes.resetCode, resetCode)
        )
      );
    
    if (!codeRecord) {
      return false;
    }
    
    // Check if code has expired
    if (new Date() > codeRecord.expiresAt) {
      // Remove expired code
      await db.delete(passwordResetCodes).where(eq(passwordResetCodes.id, codeRecord.id));
      return false;
    }
    
    return true;
  }

  async deletePasswordResetCode(userId: number): Promise<void> {
    await db.delete(passwordResetCodes).where(eq(passwordResetCodes.userId, userId));
  }

  async updateUserProfile(userId: number, profileData: UpdateUserProfile): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...profileData, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async createMealPlan(insertMealPlan: InsertMealPlan): Promise<MealPlan> {
    const [mealPlan] = await db
      .insert(mealPlans)
      .values(insertMealPlan)
      .returning();
    return mealPlan;
  }

  async getMealPlans(userId?: number): Promise<MealPlan[]> {
    if (userId) {
      return await db.select().from(mealPlans)
        .where(eq(mealPlans.userId, userId))
        .orderBy(desc(mealPlans.id));
    }
    return await db.select().from(mealPlans).orderBy(desc(mealPlans.id));
  }

  async getMealPlanWithMeals(id: number): Promise<MealPlanWithMeals | undefined> {
    const [mealPlan] = await db.select().from(mealPlans).where(eq(mealPlans.id, id));
    if (!mealPlan) return undefined;

    const mealList = await db.select({
      id: meals.id,
      mealPlanId: meals.mealPlanId,
      recipeId: meals.recipeId,
      day: meals.day,
      mealType: meals.mealType,
      foodDescription: meals.foodDescription,
      portion: meals.portion,
      protein: meals.protein,
      calories: meals.calories,
      carbohydrates: meals.carbohydrates,
      fats: meals.fats,
      fiber: meals.fiber,
      sugar: meals.sugar,
      sodium: meals.sodium,
      prepTime: meals.prepTime,
      costEuros: meals.costEuros,
      proteinPerEuro: meals.proteinPerEuro,
      isLeftover: meals.isLeftover // Explicitly select isLeftover
    }).from(meals).where(eq(meals.mealPlanId, id));
    
    return {
      ...mealPlan,
      meals: mealList
    };
  }

  async createMeals(mealPlanId: number, insertMeals: InsertMeal[]): Promise<Meal[]> {
    const mealsWithPlanId = insertMeals.map(meal => ({
      ...meal,
      mealPlanId
    }));
    
    return await db
      .insert(meals)
      .values(mealsWithPlanId)
      .returning();
  }



  async deleteMealPlan(id: number): Promise<boolean> {
    try {
      // First delete associated meals
      await db.delete(meals).where(eq(meals.mealPlanId, id));
      
      // Then delete the meal plan
      const result = await db.delete(mealPlans).where(eq(mealPlans.id, id));
      
      console.log(`🗑️ Deleted meal plan ID ${id} and its meals`);
      return true;
    } catch (error) {
      console.error(`Failed to delete meal plan ${id}:`, error);
      return false;
    }
  }

  async cleanupOldMealPlans(userId: number, keepCount: number = 3): Promise<number> {
    try {
      // Get all meal plans for the user, ordered by creation date (newest first)
      const userMealPlans = await db.select().from(mealPlans)
        .where(eq(mealPlans.userId, userId))
        .orderBy(desc(mealPlans.createdAt));
      
      if (userMealPlans.length <= keepCount) {
        console.log(`👍 User ${userId} has ${userMealPlans.length} meal plans, no cleanup needed`);
        return 0;
      }
      
      // Get meal plans to delete (everything beyond keepCount)
      const plansToDelete = userMealPlans.slice(keepCount);
      let deletedCount = 0;
      
      for (const plan of plansToDelete) {
        const success = await this.deleteMealPlan(plan.id);
        if (success) deletedCount++;
      }
      
      console.log(`🧹 Cleaned up ${deletedCount} old meal plans for user ${userId}, keeping ${keepCount} most recent`);
      return deletedCount;
    } catch (error) {
      console.error(`Failed to cleanup meal plans for user ${userId}:`, error);
      return 0;
    }
  }

  // Get meal plans by type (current, next, saved, backup)
  async getMealPlansByType(userId: number, planType: string): Promise<MealPlan[]> {
    return await db.select().from(mealPlans)
      .where(and(eq(mealPlans.userId, userId), eq(mealPlans.planType, planType)))
      .orderBy(desc(mealPlans.createdAt));
  }

  // Get active meal plans (multiple plans can be active for alternating)
  async getActiveMealPlans(userId: number): Promise<MealPlan[]> {
    return await db.select().from(mealPlans)
      .where(and(eq(mealPlans.userId, userId), eq(mealPlans.isActive, true)))
      .orderBy(desc(mealPlans.createdAt));
  }

  // Set meal plan as active/inactive
  async setMealPlanActive(mealPlanId: number, isActive: boolean): Promise<void> {
    await db.update(mealPlans)
      .set({ isActive })
      .where(eq(mealPlans.id, mealPlanId));
  }

  // Duplicate a meal plan for next week or backup
  async duplicateMealPlan(mealPlanId: number, newWeekStart: string, planType: string, planName?: string): Promise<MealPlan> {
    // Get original meal plan
    const [originalPlan] = await db.select().from(mealPlans).where(eq(mealPlans.id, mealPlanId));
    if (!originalPlan) throw new Error('Meal plan not found');

    // Create new meal plan
    const [newPlan] = await db.insert(mealPlans).values({
      userId: originalPlan.userId,
      weekStart: newWeekStart,
      activityLevel: originalPlan.activityLevel,
      totalProtein: originalPlan.totalProtein,
      planName: planName || `${planType} plan`,
      planType,
      isActive: planType === 'current' || planType === 'backup'
    }).returning();

    // Copy all meals from original plan
    const originalMeals = await db.select().from(meals).where(eq(meals.mealPlanId, mealPlanId));
    
    if (originalMeals.length > 0) {
      const newMeals = originalMeals.map(meal => ({
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
        mealPlanId: newPlan.id
      }));
      
      await db.insert(meals).values(newMeals);
    }

    return newPlan;
  }

  // Oura data methods (DatabaseStorage)
  async createOuraData(data: InsertOuraData): Promise<OuraData> {
    const [ouraRecord] = await db
      .insert(ouraData)
      .values(data)
      .onConflictDoUpdate({
        target: [ouraData.userId, ouraData.date],
        set: {
          activityScore: data.activityScore,
          steps: data.steps,
          calories: data.calories,
          activeCalories: data.activeCalories,
          workoutMinutes: data.workoutMinutes,
          readinessScore: data.readinessScore,
          sleepScore: data.sleepScore,
          periodPhase: data.periodPhase,
          activityLevel: data.activityLevel,
          syncedAt: new Date(),
        }
      })
      .returning();
    return ouraRecord;
  }

  async getOuraData(userId: number, startDate: string, endDate?: string): Promise<OuraData[]> {
    let query = db
      .select()
      .from(ouraData)
      .where(
        and(
          eq(ouraData.userId, userId),
          gte(ouraData.date, startDate)
        )
      );

    if (endDate) {
      query = db
        .select()
        .from(ouraData)
        .where(
          and(
            eq(ouraData.userId, userId),
            gte(ouraData.date, startDate),
            lte(ouraData.date, endDate)
          )
        );
    }

    return await query.orderBy(ouraData.date);
  }

  async getLatestOuraData(userId: number): Promise<OuraData | undefined> {
    const [latest] = await db
      .select()
      .from(ouraData)
      .where(eq(ouraData.userId, userId))
      .orderBy(desc(ouraData.date))
      .limit(1);
    
    return latest || undefined;
  }

  async getOuraDataByDate(userId: number, date: string): Promise<OuraData | undefined> {
    const [data] = await db
      .select()
      .from(ouraData)
      .where(
        and(
          eq(ouraData.userId, userId),
          eq(ouraData.date, date)
        )
      );
    
    return data || undefined;
  }

  // Meal History methods
  async addToMealHistory(data: InsertMealHistory): Promise<MealHistory> {
    const [history] = await db
      .insert(mealHistory)
      .values(data)
      .returning();
    return history;
  }

  async getMealHistory(userId: number, limit: number = 50): Promise<MealHistory[]> {
    return await db
      .select()
      .from(mealHistory)
      .where(eq(mealHistory.userId, userId))
      .orderBy(desc(mealHistory.consumedAt))
      .limit(limit);
  }

  // Meal Favorites methods
  async addToFavorites(data: InsertMealFavorite): Promise<MealFavorite> {
    const [favorite] = await db
      .insert(mealFavorites)
      .values(data)
      .returning();
    return favorite;
  }

  async removeFromFavorites(userId: number, mealName: string): Promise<void> {
    await db
      .delete(mealFavorites)
      .where(and(
        eq(mealFavorites.userId, userId),
        eq(mealFavorites.mealName, mealName)
      ));
  }

  async getFavorites(userId: number): Promise<MealFavorite[]> {
    return await db
      .select()
      .from(mealFavorites)
      .where(eq(mealFavorites.userId, userId))
      .orderBy(desc(mealFavorites.favoritedAt));
  }

  async updateFavorite(userId: number, mealName: string, updates: MealFavoriteUpdate): Promise<MealFavorite> {
    const [favorite] = await db
      .update(mealFavorites)
      .set(updates)
      .where(and(
        eq(mealFavorites.userId, userId),
        eq(mealFavorites.mealName, mealName)
      ))
      .returning();
    return favorite;
  }

  async isFavorite(userId: number, mealName: string): Promise<boolean> {
    const [favorite] = await db
      .select()
      .from(mealFavorites)
      .where(and(
        eq(mealFavorites.userId, userId),
        eq(mealFavorites.mealName, mealName)
      ))
      .limit(1);
    return !!favorite;
  }

  // User Recipe methods
  async createUserRecipe(data: InsertUserRecipe): Promise<UserRecipe> {
    const [recipe] = await db
      .insert(userRecipes)
      .values({
        ...data,
        updatedAt: new Date()
      })
      .returning();
    return recipe;
  }

  async getUserRecipes(userId: number): Promise<UserRecipe[]> {
    return await db
      .select()
      .from(userRecipes)
      .where(and(
        eq(userRecipes.userId, userId),
        eq(userRecipes.isActive, true)
      ))
      .orderBy(desc(userRecipes.updatedAt));
  }

  async getUserRecipe(id: number, userId: number): Promise<UserRecipe | undefined> {
    const [recipe] = await db
      .select()
      .from(userRecipes)
      .where(and(
        eq(userRecipes.id, id),
        eq(userRecipes.userId, userId),
        eq(userRecipes.isActive, true)
      ));
    return recipe || undefined;
  }

  async updateUserRecipe(id: number, userId: number, updates: UpdateUserRecipe): Promise<UserRecipe> {
    const [recipe] = await db
      .update(userRecipes)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(and(
        eq(userRecipes.id, id),
        eq(userRecipes.userId, userId)
      ))
      .returning();
    return recipe;
  }

  async deleteUserRecipe(id: number, userId: number): Promise<void> {
    // Soft delete by setting isActive to false
    await db
      .update(userRecipes)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(and(
        eq(userRecipes.id, id),
        eq(userRecipes.userId, userId)
      ));
  }

  // Shopping List methods
  async createShoppingList(data: InsertShoppingList): Promise<ShoppingList> {
    const [shoppingList] = await db
      .insert(shoppingLists)
      .values(data)
      .returning();
    return shoppingList;
  }

  async getShoppingList(userId: number, mealPlanId?: number, listType: string = "regular"): Promise<ShoppingListWithItems | undefined> {
    // Get the most recent shopping list for this user/meal plan/type
    const [shoppingList] = await db
      .select()
      .from(shoppingLists)
      .where(and(
        eq(shoppingLists.userId, userId),
        mealPlanId ? eq(shoppingLists.mealPlanId, mealPlanId) : undefined,
        eq(shoppingLists.listType, listType),
        eq(shoppingLists.isActive, true)
      ))
      .orderBy(desc(shoppingLists.generatedAt))
      .limit(1);

    if (!shoppingList) {
      return undefined;
    }

    // Get all items for this shopping list
    const items = await db
      .select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.shoppingListId, shoppingList.id))
      .orderBy(shoppingListItems.sortOrder, shoppingListItems.category);

    return {
      ...shoppingList,
      items
    };
  }

  async updateShoppingList(id: number, updates: Partial<ShoppingList>): Promise<ShoppingList> {
    const [shoppingList] = await db
      .update(shoppingLists)
      .set({
        ...updates,
        lastUpdated: new Date()
      })
      .where(eq(shoppingLists.id, id))
      .returning();
    return shoppingList;
  }

  async deleteShoppingList(id: number): Promise<void> {
    // Hard delete shopping list (items will be deleted by cascade)
    await db
      .delete(shoppingLists)
      .where(eq(shoppingLists.id, id));
  }

  async addShoppingListItems(shoppingListId: number, items: InsertShoppingListItem[]): Promise<ShoppingListItem[]> {
    if (items.length === 0) return [];
    
    const insertedItems = await db
      .insert(shoppingListItems)
      .values(items.map(item => ({
        ...item,
        shoppingListId
      })))
      .returning();
    
    // Update the total items count
    await db
      .update(shoppingLists)
      .set({
        totalItems: items.length,
        lastUpdated: new Date()
      })
      .where(eq(shoppingLists.id, shoppingListId));

    return insertedItems;
  }

  async updateShoppingListItem(id: number, updates: UpdateShoppingListItem): Promise<ShoppingListItem> {
    const updateData: any = { ...updates };
    
    // If checking/unchecking an item, set the timestamp
    if (updates.isChecked !== undefined) {
      updateData.checkedAt = updates.isChecked ? new Date() : null;
    }

    const [item] = await db
      .update(shoppingListItems)
      .set(updateData)
      .where(eq(shoppingListItems.id, id))
      .returning();

    // Update the checked items count in the shopping list
    if (updates.isChecked !== undefined) {
      const [shoppingList] = await db
        .select({ id: shoppingLists.id })
        .from(shoppingLists)
        .where(eq(shoppingLists.id, item.shoppingListId));

      if (shoppingList) {
        const checkedCount = await db
          .select()
          .from(shoppingListItems)
          .where(and(
            eq(shoppingListItems.shoppingListId, item.shoppingListId),
            eq(shoppingListItems.isChecked, true)
          ));

        await db
          .update(shoppingLists)
          .set({
            checkedItems: checkedCount.length,
            lastUpdated: new Date()
          })
          .where(eq(shoppingLists.id, item.shoppingListId));
      }
    }

    return item;
  }

  async deleteShoppingListItem(id: number): Promise<void> {
    await db
      .delete(shoppingListItems)
      .where(eq(shoppingListItems.id, id));
  }

  async clearShoppingListItems(shoppingListId: number): Promise<void> {
    await db
      .delete(shoppingListItems)
      .where(eq(shoppingListItems.shoppingListId, shoppingListId));
    
    // Reset the counts
    await db
      .update(shoppingLists)
      .set({
        totalItems: 0,
        checkedItems: 0,
        lastUpdated: new Date()
      })
      .where(eq(shoppingLists.id, shoppingListId));
  }

  // Shopping List Name methods for admin control
  async createShoppingListName(data: InsertShoppingListName): Promise<ShoppingListName> {
    const [created] = await db
      .insert(shoppingListNames)
      .values(data)
      .returning();
    return created;
  }

  async getShoppingListNames(): Promise<ShoppingListName[]> {
    return await db
      .select()
      .from(shoppingListNames)
      .orderBy(shoppingListNames.category, shoppingListNames.name);
  }

  async updateShoppingListName(id: number, updates: UpdateShoppingListName): Promise<ShoppingListName> {
    const [updated] = await db
      .update(shoppingListNames)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(shoppingListNames.id, id))
      .returning();
    return updated;
  }

  async deleteShoppingListName(id: number): Promise<void> {
    await db
      .delete(shoppingListNames)
      .where(eq(shoppingListNames.id, id));
  }

  // Ingredient Mapping methods for admin control
  async createIngredientMapping(data: InsertIngredientMapping): Promise<IngredientMapping> {
    const [created] = await db
      .insert(ingredientMappings)
      .values(data)
      .returning();
    return created;
  }

  async getIngredientMappings(): Promise<IngredientMapping[]> {
    return await db
      .select()
      .from(ingredientMappings)
      .orderBy(ingredientMappings.normalizedIngredient);
  }

  async getIngredientMappingByIngredient(normalizedIngredient: string): Promise<IngredientMapping | undefined> {
    const [mapping] = await db
      .select()
      .from(ingredientMappings)
      .where(eq(ingredientMappings.normalizedIngredient, normalizedIngredient))
      .limit(1);
    return mapping;
  }

  async updateIngredientMapping(id: number, updates: UpdateIngredientMapping): Promise<IngredientMapping> {
    const [updated] = await db
      .update(ingredientMappings)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(ingredientMappings.id, id))
      .returning();
    return updated;
  }

  async deleteIngredientMapping(id: number): Promise<void> {
    await db
      .delete(ingredientMappings)
      .where(eq(ingredientMappings.id, id));
  }

  // Editable Content methods
  async getEditableContent(contentKey?: string): Promise<EditableContent[]> {
    const query = db.select().from(editableContent);
    
    if (contentKey) {
      return await query.where(eq(editableContent.contentKey, contentKey));
    }
    
    return await query;
  }

  async updateEditableContent(contentKey: string, updates: UpdateEditableContent): Promise<EditableContent> {
    const [updated] = await db
      .update(editableContent)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(editableContent.contentKey, contentKey))
      .returning();

    return updated;
  }

  async createEditableContent(data: InsertEditableContent): Promise<EditableContent> {
    const [created] = await db
      .insert(editableContent)
      .values(data)
      .returning();

    return created;
  }

  // Recipe Modification methods
  async saveRecipeModification(recipeId: string, modification: any): Promise<void> {
    // Upsert: update if exists, insert if not
    await db
      .insert(recipeModifications)
      .values({
        recipeId,
        name: modification.name,
        ingredients: modification.ingredients,
        instructions: modification.instructions,
        nutrition: JSON.stringify(modification.nutrition),
        category: modification.category,
        tags: modification.tags,
        portion: modification.portion,
        modifiedBy: modification.modifiedBy
      })
      .onConflictDoUpdate({
        target: [recipeModifications.recipeId],
        set: {
          name: modification.name,
          ingredients: modification.ingredients,
          instructions: modification.instructions,
          nutrition: JSON.stringify(modification.nutrition),
          category: modification.category,
          tags: modification.tags,
          portion: modification.portion,
          modifiedBy: modification.modifiedBy,
          modifiedAt: new Date()
        }
      });
  }

  async saveRecipeDeletion(recipeId: string, userId: number): Promise<void> {
    await db
      .insert(recipeDeletions)
      .values({
        recipeId,
        deletedBy: userId
      })
      .onConflictDoNothing(); // Don't duplicate deletions
  }

  async getRecipeModifications(): Promise<any[]> {
    const modifications = await db.select().from(recipeModifications);
    return modifications.map(mod => ({
      recipeId: mod.recipeId,
      name: mod.name,
      ingredients: mod.ingredients,
      instructions: mod.instructions,
      nutrition: JSON.parse(mod.nutrition),
      category: mod.category,
      tags: mod.tags,
      portion: mod.portion,
      modifiedBy: mod.modifiedBy,
      modifiedAt: mod.modifiedAt
    }));
  }

  async getRecipeDeletions(): Promise<string[]> {
    const deletions = await db.select().from(recipeDeletions);
    return deletions.map(del => del.recipeId);
  }
  
  // Deleted Tags methods
  async saveDeletedTag(tag: string, deletedBy?: number): Promise<void> {
    await db
      .insert(deletedTags)
      .values({
        tag,
        deletedBy: deletedBy || null
      })
      .onConflictDoNothing(); // Don't duplicate tag deletions
  }

  async getDeletedTags(): Promise<string[]> {
    const deleted = await db.select().from(deletedTags);
    return deleted.map(dt => dt.tag);
  }

  // Recipe Translation methods
  async getRecipeTranslation(recipeId: number, language: string): Promise<RecipeTranslation | undefined> {
    const result = await db
      .select()
      .from(recipeTranslations)
      .where(and(
        eq(recipeTranslations.recipeId, recipeId),
        eq(recipeTranslations.language, language)
      ))
      .limit(1);
    
    return result[0];
  }

  async upsertRecipeTranslation(data: InsertRecipeTranslation): Promise<RecipeTranslation> {
    const result = await db
      .insert(recipeTranslations)
      .values(data)
      .onConflictDoUpdate({
        target: [recipeTranslations.recipeId, recipeTranslations.language],
        set: {
          name: data.name,
          ingredients: data.ingredients,
          instructions: data.instructions,
          tips: data.tips || [],
          notes: data.notes || [],
          translatedAt: new Date()
        }
      })
      .returning();
    
    return result[0];
  }

  async getBatchRecipeTranslations(recipeIds: number[], language: string): Promise<RecipeTranslation[]> {
    if (recipeIds.length === 0) return [];
    
    const results = await db
      .select()
      .from(recipeTranslations)
      .where(and(
        eq(recipeTranslations.language, language),
        inArray(recipeTranslations.recipeId, recipeIds)
      ));
    
    return results;
  }

  async getMissingTranslations(recipeIds: number[], language: string): Promise<number[]> {
    if (recipeIds.length === 0) return [];
    
    const existing = await this.getBatchRecipeTranslations(recipeIds, language);
    const existingIds = new Set(existing.map(t => t.recipeId));
    
    return recipeIds.filter(id => !existingIds.has(id));
  }

  // AI Recipe methods
  async upsertAiRecipe(data: InsertAiRecipe): Promise<AiRecipe> {
    const result = await db
      .insert(aiRecipes)
      .values(data)
      .onConflictDoUpdate({
        target: [aiRecipes.recipeHash],
        set: {
          usageCount: data.usageCount || 1,
          lastUsedAt: new Date(),
          updatedAt: new Date()
        }
      })
      .returning();
    
    return result[0];
  }

  async getAiRecipeByHash(recipeHash: string): Promise<AiRecipe | undefined> {
    const [recipe] = await db
      .select()
      .from(aiRecipes)
      .where(eq(aiRecipes.recipeHash, recipeHash))
      .limit(1);
    
    return recipe;
  }

  async getAiRecipeById(id: number): Promise<AiRecipe | undefined> {
    const [recipe] = await db
      .select()
      .from(aiRecipes)
      .where(eq(aiRecipes.id, id))
      .limit(1);
    
    return recipe;
  }

  async incrementAiRecipeUsage(id: number): Promise<void> {
    await db
      .update(aiRecipes)
      .set({
        usageCount: sql`${aiRecipes.usageCount} + 1`,
        lastUsedAt: new Date()
      })
      .where(eq(aiRecipes.id, id));
  }

}

export const storage = new DatabaseStorage();
