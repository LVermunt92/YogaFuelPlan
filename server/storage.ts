import { 
  users, 
  mealPlans, 
  meals,
  refreshTokens,
  ouraData,
  mealHistory,
  mealFavorites,
  userRecipes,
  shoppingLists,
  shoppingListItems,
  shoppingListNames,
  ingredientMappings,
  recipeTranslations,
  mealPrepComponents,
  recipeMealPrepComponents,

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
  type MealPrepComponent,
  type InsertMealPrepComponent,
  type UpdateMealPrepComponent,
  type RecipeMealPrepComponent,
  type InsertRecipeMealPrepComponent,

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

  recipes,
  type Recipe,
  type InsertRecipe,
  type UpdateRecipe,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, inArray, sql, or } from "drizzle-orm";
import bcrypt from "bcrypt";
import { autoCorrectIngredientUnits } from './nutrition-enhanced';

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  deleteUser(userId: number): Promise<void>;
  authenticateUser(username: string, password: string): Promise<User | null>;
  updateUserPassword(userId: number, newPassword: string): Promise<void>;
  createPasswordResetCode(userId: number, resetCode: string): Promise<void>;
  verifyPasswordResetCode(userId: number, resetCode: string): Promise<boolean>;
  deletePasswordResetCode(userId: number): Promise<void>;
  updateUserProfile(userId: number, profileData: UpdateUserProfile): Promise<User>;
  
  // Refresh Token methods for JWT authentication
  saveRefreshToken(userId: number, token: string, expiresAt: Date): Promise<void>;
  getRefreshToken(token: string): Promise<{ userId: number } | null>;
  deleteRefreshToken(token: string): Promise<void>;
  deleteAllUserRefreshTokens(userId: number): Promise<void>;
  createMealPlan(mealPlan: InsertMealPlan): Promise<MealPlan>;
  getMealPlans(userId?: number): Promise<MealPlan[]>;
  getMealPlanWithMeals(id: number): Promise<MealPlanWithMeals | undefined>;
  createMeals(mealPlanId: number, meals: InsertMeal[]): Promise<Meal[]>;

  deleteMealPlan(id: number): Promise<boolean>;
  cleanupOldMealPlans(userId: number, keepCount?: number): Promise<number>;
  cleanupAllOldMealPlans(keepCount?: number): Promise<number>;
  deleteOldMealPlans(): Promise<number>; // Delete all meal plans before today
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
  getRecipeModifications(): Promise<any[]>;
  
  // Deleted Tags methods
  saveDeletedTag(tag: string, deletedBy?: number): Promise<void>;
  getDeletedTags(): Promise<string[]>;

  // Recipe Translation methods
  getRecipeTranslation(recipeId: string, language: string): Promise<RecipeTranslation | undefined>;
  upsertRecipeTranslation(data: InsertRecipeTranslation): Promise<RecipeTranslation>;
  getBatchRecipeTranslations(recipeIds: string[], language: string): Promise<RecipeTranslation[]>;
  getMissingTranslations(recipeIds: string[], language: string): Promise<string[]>;

  // Recipe CRUD methods (unified database)
  getAllRecipes(activeOnly?: boolean): Promise<Recipe[]>;
  getRecipeById(id: string): Promise<Recipe | undefined>;
  getRecipesByCategory(category: string, activeOnly?: boolean): Promise<Recipe[]>;
  getRecipesByTags(tags: string[], activeOnly?: boolean): Promise<Recipe[]>;
  createRecipe(data: InsertRecipe): Promise<Recipe>;
  updateRecipe(id: string, updates: UpdateRecipe): Promise<Recipe>;
  deleteRecipe(id: string): Promise<void>;
  
  // AI Recipe methods
  upsertAiRecipe(data: InsertAiRecipe): Promise<AiRecipe>;
  getAiRecipeByHash(recipeHash: string): Promise<AiRecipe | undefined>;
  getAiRecipeById(id: number): Promise<AiRecipe | undefined>;
  incrementAiRecipeUsage(id: number): Promise<void>;
  
  // Recipe Seeding methods
  seedRecipesFromFile(): Promise<{ imported: number; skipped: number }>;
  getRecipeCount(): Promise<number>;
  
  // Meal Prep Component methods
  createMealPrepComponent(data: InsertMealPrepComponent): Promise<MealPrepComponent>;
  getAllMealPrepComponents(activeOnly?: boolean): Promise<MealPrepComponent[]>;
  getMealPrepComponentById(id: number): Promise<MealPrepComponent | undefined>;
  updateMealPrepComponent(id: number, updates: UpdateMealPrepComponent): Promise<MealPrepComponent>;
  deleteMealPrepComponent(id: number): Promise<void>;
  
  // Recipe-Component Link methods
  linkRecipeToComponent(data: InsertRecipeMealPrepComponent): Promise<RecipeMealPrepComponent>;
  unlinkRecipeFromComponent(recipeId: string, componentId: number): Promise<void>;
  getComponentsForRecipe(recipeId: string): Promise<Array<RecipeMealPrepComponent & { component: MealPrepComponent }>>;
  getRecipesUsingComponent(componentId: number): Promise<Array<RecipeMealPrepComponent & { recipe: Recipe }>>;
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;
    return Array.from(this.users.values()).find(
      (user) => user.email?.toLowerCase() === email.toLowerCase(),
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
      weight: insertUser.weight || null,
      goalWeight: insertUser.goalWeight || null,
      height: insertUser.height || null,
      age: insertUser.age || null,
      waistline: insertUser.waistline || null,
      goalWaistline: insertUser.goalWaistline || null,
      targetDate: null,
      activityLevel: insertUser.activityLevel || null,
      trainingType: insertUser.trainingType || null,
      goal: insertUser.goal || 'maintain',
      proteinTarget: insertUser.proteinTarget || 130,
      dietaryTags: insertUser.dietaryTags || [],
      householdSize: 1,
      includeBreakfast: false,
      includeLunch: true,
      includeDinner: true,
      cookingDaysPerWeek: 7,
      eatingDaysAtHome: 7,
      language: insertUser.language || 'en',
      leftovers: [],
      useOnlyMyRecipes: false,
      cycleSupportRecipes: false,
      menstrualPhase: 'off',
      longevityFocusedRecipes: false,
      hasSeenWelcome: false,
      lastLoginAt: null,
      weightLossWeekNumber: 1,
      weightLossStartDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async deleteUser(userId: number): Promise<void> {
    this.users.delete(userId);
    // Also clean up related data
    this.passwordResetCodes = this.passwordResetCodes.filter(code => code.userId !== userId);
    for (const [token, data] of this.refreshTokenStorage.entries()) {
      if (data.userId === userId) {
        this.refreshTokenStorage.delete(token);
      }
    }
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

  // Refresh Token methods (in-memory storage)
  private refreshTokenStorage: Map<string, { userId: number; expiresAt: Date }> = new Map();

  async saveRefreshToken(userId: number, token: string, expiresAt: Date): Promise<void> {
    this.refreshTokenStorage.set(token, { userId, expiresAt });
  }

  async getRefreshToken(token: string): Promise<{ userId: number } | null> {
    const tokenData = this.refreshTokenStorage.get(token);
    
    if (!tokenData) {
      return null;
    }
    
    // Check if token has expired
    if (new Date() > tokenData.expiresAt) {
      this.refreshTokenStorage.delete(token);
      return null;
    }
    
    return { userId: tokenData.userId };
  }

  async deleteRefreshToken(token: string): Promise<void> {
    this.refreshTokenStorage.delete(token);
  }

  async deleteAllUserRefreshTokens(userId: number): Promise<void> {
    for (const [token, data] of this.refreshTokenStorage.entries()) {
      if (data.userId === userId) {
        this.refreshTokenStorage.delete(token);
      }
    }
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

  async cleanupAllOldMealPlans(keepCount: number = 3): Promise<number> {
    const users = await this.getAllUsers();
    let totalDeleted = 0;
    
    for (const user of users) {
      const deleted = await this.cleanupOldMealPlans(user.id, keepCount);
      totalDeleted += deleted;
    }
    
    console.log(`🧹 Total cleanup: Deleted ${totalDeleted} old meal plans across ${users.length} users`);
    return totalDeleted;
  }

  async deleteOldMealPlans(): Promise<number> {
    // Keep any meal plan from the last 14 days (2 weeks)
    // This ensures we keep: current week + next week (if generated in advance)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 14);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    
    const allMealPlans = Array.from(this.mealPlans.values());
    
    let deletedCount = 0;
    for (const plan of allMealPlans) {
      // Delete if week_start is more than 14 days ago
      if (plan.weekStart < cutoffStr) {
        const success = await this.deleteMealPlan(plan.id);
        if (success) deletedCount++;
      }
    }
    
    console.log(`🧹 Deleted ${deletedCount} meal plans older than 14 days (before ${cutoffStr})`);
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

  async getRecipeModifications(): Promise<any[]> {
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

  // Recipe CRUD methods (MemStorage - not implemented)
  async getAllRecipes(activeOnly?: boolean): Promise<Recipe[]> {
    throw new Error("Recipe database requires DatabaseStorage implementation");
  }

  async getRecipeById(id: string): Promise<Recipe | undefined> {
    throw new Error("Recipe database requires DatabaseStorage implementation");
  }

  async getRecipesByCategory(category: string, activeOnly?: boolean): Promise<Recipe[]> {
    throw new Error("Recipe database requires DatabaseStorage implementation");
  }

  async getRecipesByTags(tags: string[], activeOnly?: boolean): Promise<Recipe[]> {
    throw new Error("Recipe database requires DatabaseStorage implementation");
  }

  async createRecipe(data: InsertRecipe): Promise<Recipe> {
    throw new Error("Recipe database requires DatabaseStorage implementation");
  }

  async updateRecipe(id: string, updates: UpdateRecipe): Promise<Recipe> {
    throw new Error("Recipe database requires DatabaseStorage implementation");
  }

  async deleteRecipe(id: string): Promise<void> {
    throw new Error("Recipe database requires DatabaseStorage implementation");
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

  async getRecipeCount(): Promise<number> {
    return 0; // MemStorage doesn't store recipes
  }

  async seedRecipesFromFile(): Promise<{ imported: number; skipped: number }> {
    return { imported: 0, skipped: 0 }; // No-op for MemStorage
  }

  // Meal Prep Component methods (MemStorage - not implemented)
  async createMealPrepComponent(data: InsertMealPrepComponent): Promise<MealPrepComponent> {
    throw new Error("Meal prep components require DatabaseStorage implementation");
  }

  async getAllMealPrepComponents(activeOnly?: boolean): Promise<MealPrepComponent[]> {
    throw new Error("Meal prep components require DatabaseStorage implementation");
  }

  async getMealPrepComponentById(id: number): Promise<MealPrepComponent | undefined> {
    throw new Error("Meal prep components require DatabaseStorage implementation");
  }

  async updateMealPrepComponent(id: number, updates: UpdateMealPrepComponent): Promise<MealPrepComponent> {
    throw new Error("Meal prep components require DatabaseStorage implementation");
  }

  async deleteMealPrepComponent(id: number): Promise<void> {
    throw new Error("Meal prep components require DatabaseStorage implementation");
  }

  // Recipe-Component Link methods (MemStorage - not implemented)
  async linkRecipeToComponent(data: InsertRecipeMealPrepComponent): Promise<RecipeMealPrepComponent> {
    throw new Error("Recipe-component links require DatabaseStorage implementation");
  }

  async unlinkRecipeFromComponent(recipeId: string, componentId: number): Promise<void> {
    throw new Error("Recipe-component links require DatabaseStorage implementation");
  }

  async getComponentsForRecipe(recipeId: string): Promise<Array<RecipeMealPrepComponent & { component: MealPrepComponent }>> {
    throw new Error("Recipe-component links require DatabaseStorage implementation");
  }

  async getRecipesUsingComponent(componentId: number): Promise<Array<RecipeMealPrepComponent & { recipe: Recipe }>> {
    throw new Error("Recipe-component links require DatabaseStorage implementation");
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;
    // Use case-insensitive comparison to prevent duplicate emails with different cases
    const [user] = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.email}) = LOWER(${email})`);
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

  async deleteUser(userId: number): Promise<void> {
    // Delete user and all related data (cascade delete)
    await db.delete(passwordResetCodes).where(eq(passwordResetCodes.userId, userId));
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
    await db.delete(mealHistory).where(eq(mealHistory.userId, userId));
    await db.delete(mealFavorites).where(eq(mealFavorites.userId, userId));
    await db.delete(userRecipes).where(eq(userRecipes.userId, userId));
    await db.delete(ouraData).where(eq(ouraData.userId, userId));
    
    // Delete meal plans and their meals
    const userMealPlans = await db.select().from(mealPlans).where(eq(mealPlans.userId, userId));
    for (const plan of userMealPlans) {
      await db.delete(meals).where(eq(meals.mealPlanId, plan.id));
    }
    await db.delete(mealPlans).where(eq(mealPlans.userId, userId));
    
    // Finally delete the user
    await db.delete(users).where(eq(users.id, userId));
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

  // Refresh Token methods (database storage)
  async saveRefreshToken(userId: number, token: string, expiresAt: Date): Promise<void> {
    await db.insert(refreshTokens).values({
      userId,
      token,
      expiresAt,
    });
  }

  async getRefreshToken(token: string): Promise<{ userId: number } | null> {
    const [tokenRecord] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, token));
    
    if (!tokenRecord) {
      return null;
    }
    
    // Check if token has expired
    if (new Date() > tokenRecord.expiresAt) {
      await db.delete(refreshTokens).where(eq(refreshTokens.id, tokenRecord.id));
      return null;
    }
    
    return { userId: tokenRecord.userId };
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
  }

  async deleteAllUserRefreshTokens(userId: number): Promise<void> {
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
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
      isLeftover: meals.isLeftover,
      vitaminK: meals.vitaminK,
      zinc: meals.zinc,
      calcium: meals.calcium,
      potassium: meals.potassium,
      iron: meals.iron,
      vitaminC: meals.vitaminC,
      addedSugar: meals.addedSugar,
      freeSugar: meals.freeSugar,
      intrinsicSugar: meals.intrinsicSugar,
      recipeTags: recipes.tags
    }).from(meals)
      .leftJoin(recipes, or(
        eq(sql`${meals.recipeId}::text`, recipes.id),
        eq(recipes.variantOf, sql`${meals.recipeId}::text`),
        eq(meals.foodDescription, recipes.name)
      ))
      .where(eq(meals.mealPlanId, id));
    
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
      // First delete associated shopping lists
      await db.delete(shoppingLists).where(eq(shoppingLists.mealPlanId, id));
      
      // Then delete associated meals
      await db.delete(meals).where(eq(meals.mealPlanId, id));
      
      // Finally delete the meal plan
      const result = await db.delete(mealPlans).where(eq(mealPlans.id, id));
      
      console.log(`🗑️ Deleted meal plan ID ${id}, its meals, and shopping lists`);
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

  async cleanupAllOldMealPlans(keepCount: number = 3): Promise<number> {
    try {
      const users = await this.getAllUsers();
      let totalDeleted = 0;
      
      for (const user of users) {
        const deleted = await this.cleanupOldMealPlans(user.id, keepCount);
        totalDeleted += deleted;
      }
      
      console.log(`🧹 Total cleanup: Deleted ${totalDeleted} old meal plans across ${users.length} users`);
      return totalDeleted;
    } catch (error) {
      console.error('Failed to cleanup all meal plans:', error);
      return 0;
    }
  }

  async deleteOldMealPlans(): Promise<number> {
    try {
      // Calculate cutoff: 14 days ago from today
      // This keeps any meal plan from the last 14 days (current week + next week)
      // Ensures we don't delete next week's plan if user generates it in advance
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 14);
      const cutoffStr = cutoffDate.toISOString().split('T')[0];
      
      // Get all meal plans that started more than 14 days ago
      const oldMealPlans = await db.select().from(mealPlans)
        .where(sql`${mealPlans.weekStart}::date < ${cutoffStr}::date`);
      
      let deletedCount = 0;
      for (const plan of oldMealPlans) {
        const success = await this.deleteMealPlan(plan.id);
        if (success) deletedCount++;
      }
      
      console.log(`🧹 Deleted ${deletedCount} meal plans older than 14 days (before ${cutoffStr}) - keeping current and next week`);
      return deletedCount;
    } catch (error) {
      console.error('Failed to delete old meal plans:', error);
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
  async getRecipeTranslation(recipeId: string, language: string): Promise<RecipeTranslation | undefined> {
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

  async getBatchRecipeTranslations(recipeIds: string[], language: string): Promise<RecipeTranslation[]> {
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

  async getMissingTranslations(recipeIds: string[], language: string): Promise<string[]> {
    if (recipeIds.length === 0) return [];
    
    const existing = await this.getBatchRecipeTranslations(recipeIds, language);
    const existingIds = new Set(existing.map(t => t.recipeId));
    
    return recipeIds.filter(id => !existingIds.has(id));
  }

  // Recipe CRUD methods (unified database)
  async getAllRecipes(activeOnly: boolean = true): Promise<Recipe[]> {
    const query = db.select().from(recipes);
    
    if (activeOnly) {
      return await query.where(eq(recipes.active, true));
    }
    
    return await query;
  }

  async getRecipeById(id: string): Promise<Recipe | undefined> {
    const [recipe] = await db
      .select()
      .from(recipes)
      .where(eq(recipes.id, id))
      .limit(1);
    
    return recipe;
  }

  async getRecipesByCategory(category: string, activeOnly: boolean = true): Promise<Recipe[]> {
    const query = db
      .select()
      .from(recipes)
      .where(eq(recipes.category, category));
    
    if (activeOnly) {
      return await query.where(and(
        eq(recipes.category, category),
        eq(recipes.active, true)
      ));
    }
    
    return await query;
  }

  async getRecipesByTags(tags: string[], activeOnly: boolean = true): Promise<Recipe[]> {
    if (tags.length === 0) return [];
    
    // Use SQL to check if any of the provided tags exist in the recipe's tags array
    let query = db
      .select()
      .from(recipes)
      .where(sql`${recipes.tags} && ARRAY[${tags.map(t => sql`${t}`).join(',')}]::text[]`);
    
    if (activeOnly) {
      query = query.where(eq(recipes.active, true));
    }
    
    return await query;
  }

  async createRecipe(data: InsertRecipe): Promise<Recipe> {
    // Auto-correct ingredient units (e.g., aubergine grams to pieces)
    const correctedData = {
      ...data,
      ingredients: autoCorrectIngredientUnits(data.ingredients)
    };
    
    const [recipe] = await db
      .insert(recipes)
      .values(correctedData)
      .returning();
    
    return recipe;
  }

  async updateRecipe(id: string, updates: UpdateRecipe): Promise<Recipe> {
    // Auto-correct ingredient units if ingredients are being updated
    const correctedUpdates = updates.ingredients 
      ? { ...updates, ingredients: autoCorrectIngredientUnits(updates.ingredients) }
      : updates;
    
    const [recipe] = await db
      .update(recipes)
      .set({ ...correctedUpdates, updatedAt: new Date() })
      .where(eq(recipes.id, id))
      .returning();
    
    return recipe;
  }

  async deleteRecipe(id: string): Promise<void> {
    await db
      .delete(recipes)
      .where(eq(recipes.id, id));
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

  // Recipe Seeding methods
  async getRecipeCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(recipes)
      .where(eq(recipes.active, true));
    
    return result[0]?.count || 0;
  }

  async seedRecipesFromFile(): Promise<{ imported: number; skipped: number }> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const seedFilePath = path.join(process.cwd(), 'server', 'recipe-seeds.json');
    
    try {
      const fileContent = await fs.readFile(seedFilePath, 'utf-8');
      const seedData = JSON.parse(fileContent);
      const recipesToSeed = Array.isArray(seedData) ? seedData : (seedData[0] || []);
      
      let imported = 0;
      let skipped = 0;
      
      for (const recipeData of recipesToSeed) {
        try {
          // Check if recipe already exists
          const existing = await this.getRecipeById(recipeData.id);
          
          if (existing) {
            skipped++;
            continue;
          }
          
          // Insert recipe with all fields from seed file
          await db.insert(recipes).values({
            id: recipeData.id,
            name: recipeData.name,
            category: recipeData.category,
            ingredients: recipeData.ingredients,
            instructions: recipeData.instructions,
            portion: recipeData.portion,
            nutrition: recipeData.nutrition,
            tags: recipeData.tags || [],
            wholeFoodLevel: recipeData.whole_food_level || recipeData.wholeFoodLevel,
            vegetableContent: recipeData.vegetable_content || recipeData.vegetableContent,
            recipeBenefits: recipeData.recipe_benefits || recipeData.recipeBenefits || [],
            recipeTips: recipeData.recipe_tips || recipeData.recipeTips || [],
            recipeNotes: recipeData.recipe_notes || recipeData.recipeNotes,
            source: recipeData.source,
            variantOf: recipeData.variant_of || recipeData.variantOf,
            variantType: recipeData.variant_type || recipeData.variantType,
            active: recipeData.active !== false,
            prepTime: recipeData.prep_time || recipeData.prepTime || 30,
            defaultBatchServings: recipeData.default_batch_servings || recipeData.defaultBatchServings || 1,
          });
          
          imported++;
        } catch (err) {
          console.error(`Failed to seed recipe ${recipeData.id}:`, err);
          skipped++;
        }
      }
      
      return { imported, skipped };
    } catch (error) {
      console.error('Failed to read recipe seed file:', error);
      throw new Error('Recipe seeding failed');
    }
  }

  // Meal Prep Component methods
  async createMealPrepComponent(data: InsertMealPrepComponent): Promise<MealPrepComponent> {
    const [component] = await db
      .insert(mealPrepComponents)
      .values(data)
      .returning();
    
    return component;
  }

  async getAllMealPrepComponents(activeOnly: boolean = true): Promise<MealPrepComponent[]> {
    const query = db.select().from(mealPrepComponents);
    
    if (activeOnly) {
      return await query.where(eq(mealPrepComponents.active, true));
    }
    
    return await query;
  }

  async getMealPrepComponentById(id: number): Promise<MealPrepComponent | undefined> {
    const [component] = await db
      .select()
      .from(mealPrepComponents)
      .where(eq(mealPrepComponents.id, id))
      .limit(1);
    
    return component;
  }

  async updateMealPrepComponent(id: number, updates: UpdateMealPrepComponent): Promise<MealPrepComponent> {
    const [component] = await db
      .update(mealPrepComponents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(mealPrepComponents.id, id))
      .returning();
    
    if (!component) {
      throw new Error(`Meal prep component with id ${id} not found`);
    }
    
    return component;
  }

  async deleteMealPrepComponent(id: number): Promise<void> {
    await db
      .delete(mealPrepComponents)
      .where(eq(mealPrepComponents.id, id));
  }

  // Recipe-Component Link methods
  async linkRecipeToComponent(data: InsertRecipeMealPrepComponent): Promise<RecipeMealPrepComponent> {
    const [link] = await db
      .insert(recipeMealPrepComponents)
      .values(data)
      .returning();
    
    return link;
  }

  async unlinkRecipeFromComponent(recipeId: string, componentId: number): Promise<void> {
    await db
      .delete(recipeMealPrepComponents)
      .where(
        and(
          eq(recipeMealPrepComponents.recipeId, recipeId),
          eq(recipeMealPrepComponents.componentId, componentId)
        )
      );
  }

  async getComponentsForRecipe(recipeId: string): Promise<Array<RecipeMealPrepComponent & { component: MealPrepComponent }>> {
    const results = await db
      .select({
        id: recipeMealPrepComponents.id,
        recipeId: recipeMealPrepComponents.recipeId,
        componentId: recipeMealPrepComponents.componentId,
        amount: recipeMealPrepComponents.amount,
        notes: recipeMealPrepComponents.notes,
        createdAt: recipeMealPrepComponents.createdAt,
        component: mealPrepComponents
      })
      .from(recipeMealPrepComponents)
      .innerJoin(
        mealPrepComponents,
        eq(recipeMealPrepComponents.componentId, mealPrepComponents.id)
      )
      .where(eq(recipeMealPrepComponents.recipeId, recipeId));
    
    return results;
  }

  async getRecipesUsingComponent(componentId: number): Promise<Array<RecipeMealPrepComponent & { recipe: Recipe }>> {
    const results = await db
      .select({
        id: recipeMealPrepComponents.id,
        recipeId: recipeMealPrepComponents.recipeId,
        componentId: recipeMealPrepComponents.componentId,
        amount: recipeMealPrepComponents.amount,
        notes: recipeMealPrepComponents.notes,
        createdAt: recipeMealPrepComponents.createdAt,
        recipe: recipes
      })
      .from(recipeMealPrepComponents)
      .innerJoin(
        recipes,
        eq(recipeMealPrepComponents.recipeId, recipes.id)
      )
      .where(eq(recipeMealPrepComponents.componentId, componentId));
    
    return results;
  }

}

export const storage = new DatabaseStorage();
