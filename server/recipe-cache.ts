interface CacheEntry {
  data: any[];
  timestamp: number;
}

interface MealOption {
  id: number | string;
  name: string;
  category: string;
  ingredients: string[];
  instructions: string[];
  portion: string;
  wholeFoodLevel?: string;
  nutrition: any;
  tags: string[];
  vegetableContent: string[];
  specificIngredients: string[];
  recipe: {
    name: string;
    instructions: string[];
    tips: string[];
    notes: string[];
  };
}

class RecipeCache {
  private cache: CacheEntry | null = null;
  private cachePromise: Promise<MealOption[]> | null = null;
  private readonly CACHE_TTL = 1000 * 60 * 60; // 1 hour

  async getRecipes(): Promise<MealOption[]> {
    const now = Date.now();
    
    // Return cached data if valid
    if (this.cache && (now - this.cache.timestamp) < this.CACHE_TTL) {
      console.log('📦 Recipe cache HIT - returning cached recipes');
      return this.cache.data;
    }

    // If cache is being built, wait for it
    if (this.cachePromise) {
      return this.cachePromise;
    }

    // Cache miss or expired - load fresh data
    console.log('🔄 Recipe cache MISS - loading fresh recipes from database');
    console.time('⏱️  Recipe load time');
    
    this.cachePromise = (async () => {
      // Load all active recipes from database
      const { storage } = await import('./storage');
      // Lightweight load — excludes instructions/Dutch/tips/notes not needed for generation
      const dbRecipes = await storage.getRecipesForGeneration();
      
      // Convert database Recipe format to MealOption format
      const mealOptions: MealOption[] = dbRecipes.map(recipe => {
        const nutritionData = recipe.nutrition as any || {};
        const vegContent = recipe.vegetableContent as any || {};
        
        return {
          id: parseInt(recipe.id) || recipe.id as any,
          name: recipe.name,
          category: recipe.category as any,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          portion: recipe.portion,
          wholeFoodLevel: recipe.wholeFoodLevel || 'moderate',
          nutrition: nutritionData,
          tags: recipe.tags || [],
          vegetableContent: vegContent.vegetables || [],
          specificIngredients: [],
          recipe: {
            name: recipe.name,
            instructions: recipe.instructions,
            tips: recipe.recipeTips || [],
            notes: recipe.recipeNotes ? [recipe.recipeNotes] : []
          }
        } as MealOption;
      });
      
      console.timeEnd('⏱️  Recipe load time');
      console.log(`📚 Loaded ${mealOptions.length} recipes into cache`);

      this.cache = {
        data: mealOptions,
        timestamp: now
      };

      this.cachePromise = null;
      return mealOptions;
    })();

    return this.cachePromise;
  }

  invalidate(): void {
    console.log('🗑️  Recipe cache invalidated');
    this.cache = null;
    this.cachePromise = null;
  }

  getStats(): { isCached: boolean; recipeCount: number; age: number } {
    if (!this.cache) {
      return { isCached: false, recipeCount: 0, age: 0 };
    }

    return {
      isCached: true,
      recipeCount: this.cache.data.length,
      age: Date.now() - this.cache.timestamp
    };
  }
}

export const recipeCache = new RecipeCache();
