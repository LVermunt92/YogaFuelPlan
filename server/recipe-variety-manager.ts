import { MealOption, getCompleteEnhancedMealDatabase, getEnhancedMealsForCategoryAndDiet } from './nutrition-enhanced';
import { generateRecipeWithAI, generateMultipleRecipes, RecipeGenerationRequest } from './ai-recipe-generator';

// Minimum recipes needed to avoid repetition (3 weeks worth)
const MIN_RECIPES_PER_CATEGORY = {
  breakfast: 21, // 7 days × 3 weeks
  lunch: 21,
  dinner: 21
};

// Track generated recipes to avoid regenerating the same ones
const generatedRecipeCache = new Map<string, MealOption[]>();

export interface VarietyAnalysis {
  category: 'breakfast' | 'lunch' | 'dinner';
  dietaryTags: string[];
  availableCount: number;
  minimumNeeded: number;
  hasEnoughVariety: boolean;
  needsGeneration: number;
}

export async function analyzeRecipeVariety(
  category: 'breakfast' | 'lunch' | 'dinner',
  dietaryTags: string[]
): Promise<VarietyAnalysis> {
  const availableRecipes = await getEnhancedMealsForCategoryAndDiet(category, dietaryTags);
  const minimumNeeded = MIN_RECIPES_PER_CATEGORY[category];
  const hasEnoughVariety = availableRecipes.length >= minimumNeeded;
  const needsGeneration = Math.max(0, minimumNeeded - availableRecipes.length);

  console.log(`📊 Recipe variety analysis for ${category} with tags [${dietaryTags.join(', ')}]: ${availableRecipes.length}/${minimumNeeded} recipes`);

  return {
    category,
    dietaryTags,
    availableCount: availableRecipes.length,
    minimumNeeded,
    hasEnoughVariety,
    needsGeneration
  };
}

export async function analyzeAllRecipeVariety(dietaryTags: string[]): Promise<VarietyAnalysis[]> {
  const results = await Promise.all(['breakfast', 'lunch', 'dinner'].map(category => 
    analyzeRecipeVariety(category as any, dietaryTags)
  ));
  return results;
}

export async function ensureRecipeVariety(
  category: 'breakfast' | 'lunch' | 'dinner',
  dietaryTags: string[],
  targetProtein: number = 20
): Promise<MealOption[]> {
  const analysis = await analyzeRecipeVariety(category, dietaryTags);
  
  if (analysis.hasEnoughVariety) {
    console.log(`✅ Sufficient recipe variety for ${category} with tags [${dietaryTags.join(', ')}]`);
    return await getEnhancedMealsForCategoryAndDiet(category, dietaryTags);
  }

  console.log(`⚠️ Insufficient variety for ${category} with tags [${dietaryTags.join(', ')}] - generating ${analysis.needsGeneration} new recipes`);

  // Check cache first
  const cacheKey = `${category}-${dietaryTags.sort().join(',')}-${targetProtein}`;
  if (generatedRecipeCache.has(cacheKey)) {
    console.log(`🎯 Using cached generated recipes for ${cacheKey}`);
    return [...await getEnhancedMealsForCategoryAndDiet(category, dietaryTags), ...generatedRecipeCache.get(cacheKey)!];
  }

  // Generate needed recipes with AI
  const generationRequests: RecipeGenerationRequest[] = [];
  
  for (let i = 0; i < analysis.needsGeneration; i++) {
    generationRequests.push({
      category,
      dietaryTags,
      targetProtein: targetProtein + (Math.random() * 10 - 5), // Vary protein slightly
      prepTimeLimit: category === 'breakfast' ? 15 : 45,
      cuisine: getRandomCuisine(),
      season: getCurrentSeason()
    });
  }

  try {
    const newRecipes = await generateMultipleRecipes(generationRequests);
    
    if (newRecipes.length > 0) {
      // Cache the generated recipes
      generatedRecipeCache.set(cacheKey, newRecipes);
      console.log(`✨ Generated ${newRecipes.length} new recipes for ${category} with tags [${dietaryTags.join(', ')}]`);
      
      // Return existing + new recipes
      return [...await getEnhancedMealsForCategoryAndDiet(category, dietaryTags), ...newRecipes];
    }
  } catch (error) {
    console.error(`❌ Failed to generate recipes for ${category}:`, error);
  }

  // Fallback: return what we have
  console.log(`⚠️ Using available recipes despite limited variety for ${category}`);
  return await getEnhancedMealsForCategoryAndDiet(category, dietaryTags);
}

function getRandomCuisine(): string {
  const cuisines = [
    'Mediterranean', 'Asian', 'Mexican', 'Italian', 'Thai', 
    'Indian', 'Middle Eastern', 'European', 'American', 'Japanese'
  ];
  return cuisines[Math.floor(Math.random() * cuisines.length)];
}

function getCurrentSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

// Function to pre-generate recipes for common dietary combinations
export async function preGenerateCommonRecipes(): Promise<void> {
  const commonDietaryCombinations = [
    ['vegetarian'],
    ['vegan'],
    ['gluten-free'],
    ['lactose-free'],
    ['vegetarian', 'gluten-free'],
    ['vegan', 'gluten-free'],
    ['keto'],
    ['paleo'],
    ['high-protein']
  ];

  console.log('🚀 Pre-generating recipes for common dietary combinations...');

  for (const dietaryTags of commonDietaryCombinations) {
    for (const category of ['breakfast', 'lunch', 'dinner'] as const) {
      try {
        await ensureRecipeVariety(category, dietaryTags, 22);
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Failed to pre-generate recipes for ${category} with tags ${dietaryTags.join(', ')}:`, error);
      }
    }
  }

  console.log('✅ Recipe pre-generation completed');
}

// Enhanced meal selection with better variety, viral recipe balancing, and smart similarity filtering
export function selectMealsWithBetterVariety(
  availableMeals: MealOption[],
  count: number,
  previousMeals: string[] = []
): MealOption[] {
  if (availableMeals.length === 0) return [];
  
  // Filter out previously used meals if we have enough variety
  let candidateMeals = availableMeals.filter(meal => 
    !previousMeals.includes(meal.name)
  );

  // Smart similarity filtering: avoid similar recipe names (like multiple "Marry Me" recipes)
  const selectedNames: string[] = [];
  const diverseCandidates = candidateMeals.filter(meal => {
    const mealNameLower = meal.name.toLowerCase();
    
    // Check if this meal is too similar to already selected ones
    const hasSimilarName = selectedNames.some(selectedName => {
      const selectedLower = selectedName.toLowerCase();
      
      // Check for common pattern words that indicate similar recipes
      const patternWords = ['marry me', 'viral cottage', 'viral protein', 'viral cloud'];
      for (const pattern of patternWords) {
        if (mealNameLower.includes(pattern) && selectedLower.includes(pattern)) {
          return true; // Skip this meal as it's too similar
        }
      }
      
      // Check for exact cuisine/style matches
      const cuisineWords = ['chickpea curry', 'mushroom pasta', 'cottage cheese', 'protein ice cream'];
      for (const cuisine of cuisineWords) {
        if (mealNameLower.includes(cuisine) && selectedLower.includes(cuisine)) {
          return true; // Skip similar cuisine styles
        }
      }
      
      return false;
    });
    
    if (!hasSimilarName) {
      selectedNames.push(meal.name);
      return true;
    }
    return false;
  });

  // Use diverse candidates if we have enough, otherwise fall back to regular filtering
  if (diverseCandidates.length >= count) {
    candidateMeals = diverseCandidates;
  } else if (candidateMeals.length < count) {
    // If we filtered too aggressively, use all meals
    candidateMeals = availableMeals;
  }

  // Equal treatment for viral and regular recipes - no prioritization
  // Use Fisher-Yates shuffle for better randomization
  const shuffled = [...candidateMeals];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  console.log(`🎲 Shuffled ${candidateMeals.length} meals for better variety. Selected: ${shuffled.slice(0, count).map(m => m.name).join(', ')}`);
  return shuffled.slice(0, count);
}

export default {
  analyzeRecipeVariety,
  analyzeAllRecipeVariety,
  ensureRecipeVariety,
  preGenerateCommonRecipes,
  selectMealsWithBetterVariety
};