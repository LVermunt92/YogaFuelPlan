import { 
  users, 
  mealPlans, 
  meals,
  type User, 
  type InsertUser, 
  type MealPlan, 
  type InsertMealPlan,
  type Meal,
  type InsertMeal,
  type MealPlanWithMeals
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createMealPlan(mealPlan: InsertMealPlan): Promise<MealPlan>;
  getMealPlans(): Promise<MealPlan[]>;
  getMealPlanWithMeals(id: number): Promise<MealPlanWithMeals | undefined>;
  createMeals(mealPlanId: number, meals: InsertMeal[]): Promise<Meal[]>;
  updateMealPlanSyncStatus(id: number, synced: boolean): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private mealPlans: Map<number, MealPlan>;
  private meals: Map<number, Meal>;
  private currentUserId: number;
  private currentMealPlanId: number;
  private currentMealId: number;

  constructor() {
    this.users = new Map();
    this.mealPlans = new Map();
    this.meals = new Map();
    this.currentUserId = 1;
    this.currentMealPlanId = 1;
    this.currentMealId = 1;

    // Create default user
    const defaultUser: User = {
      id: 1,
      username: "default",
      password: "password",
      weight: 60,
      activityLevel: "high",
      proteinTarget: 130,
    };
    this.users.set(1, defaultUser);
    this.currentUserId = 2;
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
      ...insertUser, 
      id,
      weight: insertUser.weight || 60,
      activityLevel: insertUser.activityLevel || "high",
      proteinTarget: insertUser.proteinTarget || 130,
    };
    this.users.set(id, user);
    return user;
  }

  async createMealPlan(insertMealPlan: InsertMealPlan): Promise<MealPlan> {
    const id = this.currentMealPlanId++;
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

  async getMealPlans(): Promise<MealPlan[]> {
    return Array.from(this.mealPlans.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
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
}

export const storage = new MemStorage();
