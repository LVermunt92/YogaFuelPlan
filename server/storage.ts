import { 
  users, 
  mealPlans, 
  meals,
  ouraData,
  mealHistory,
  mealFavorites,
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
  passwordResetCodes,
  type PasswordResetCode,
  type InsertPasswordResetCode,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
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
  updateMealPlanSyncStatus(id: number, synced: boolean): Promise<void>;
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
      weight: 70,
      goalWeight: 65,
      waistline: 85,
      goalWaistline: 80,
      targetDate: "2025-12-31",
      activityLevel: "high",
      proteinTarget: 120,
      dietaryTags: ["vegetarian", "high-protein"],
      householdSize: 2,
      cookingDaysPerWeek: 5,
      eatingDaysAtHome: 6,
      meatFishMealsPerWeek: 0,
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      id,
      username: insertUser.username,
      password: insertUser.password,
      email: insertUser.email || null,
      weight: insertUser.weight || 60,
      goalWeight: insertUser.goalWeight || null,
      waistline: insertUser.waistline || 75,
      goalWaistline: insertUser.goalWaistline || null,
      activityLevel: insertUser.activityLevel || "high",
      proteinTarget: insertUser.proteinTarget || 130,
      dietaryTags: insertUser.dietaryTags || [],
      householdSize: 1,
      cookingDaysPerWeek: 7,
      eatingDaysAtHome: 7,
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

  async createMealPlan(insertMealPlan: InsertMealPlan): Promise<MealPlan> {
    const id = this.currentMealPlanId++;
    
    // Auto-cleanup: Keep only the latest 3 meal plans per user to manage memory
    await this.cleanupOldMealPlans(insertMealPlan.userId || 1);
    
    const mealPlan: MealPlan = {
      ...insertMealPlan,
      id,
      createdAt: new Date(),
      userId: insertMealPlan.userId || 1,
      notionSynced: insertMealPlan.notionSynced || false,
    };
    this.mealPlans.set(id, mealPlan);
    return mealPlan;
  }

  // Auto-cleanup: Remove oldest meal plans, keeping only latest 3 per user
  private async cleanupOldMealPlans(userId: number): Promise<void> {
    const userMealPlans = Array.from(this.mealPlans.values())
      .filter(plan => plan.userId === userId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
    
    // If user has 3 or more meal plans, remove the oldest ones
    if (userMealPlans.length >= 3) {
      const plansToRemove = userMealPlans.slice(2); // Keep latest 2, remove rest
      
      for (const planToRemove of plansToRemove) {
        // Remove associated meals first
        const mealsToRemove = Array.from(this.meals.entries())
          .filter(([_, meal]) => meal.mealPlanId === planToRemove.id)
          .map(([mealId, _]) => mealId);
        
        mealsToRemove.forEach(mealId => this.meals.delete(mealId));
        
        // Remove the meal plan
        this.mealPlans.delete(planToRemove.id);
        console.log(`🗑️ Cleaned up old meal plan ID ${planToRemove.id} for user ${userId}`);
      }
    }
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
      notionSynced: false,
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

  async updateMealPlanSyncStatus(id: number, synced: boolean): Promise<void> {
    const mealPlan = this.mealPlans.get(id);
    if (mealPlan) {
      mealPlan.notionSynced = synced;
      this.mealPlans.set(id, mealPlan);
    }
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

    const mealList = await db.select().from(meals).where(eq(meals.mealPlanId, id));
    
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

  async updateMealPlanSyncStatus(id: number, synced: boolean): Promise<void> {
    await db
      .update(mealPlans)
      .set({ notionSynced: synced })
      .where(eq(mealPlans.id, id));
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
      notionSynced: false,
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
}

export const storage = new DatabaseStorage();
