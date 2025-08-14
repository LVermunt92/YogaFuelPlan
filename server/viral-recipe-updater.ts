import { MealOption } from './nutrition-enhanced';
import { applyConversionWorkflow, validateConversions } from './unit-converter';

// Track when viral recipes were last updated
export interface ViralRecipeUpdate {
  lastUpdated: Date;
  version: number;
  addedRecipes: string[];
}

// Current viral recipes - updated every 2 weeks
export const VIRAL_RECIPE_BATCHES: { [version: number]: MealOption[] } = {
  1: [
    // Current batch - August 2025
    {
      name: "Viral Protein Ice Cream Bowl (TikTok sensation)",
      portion: "1 large bowl",
      nutrition: { 
        protein: 28, 
        prepTime: 5, 
        calories: 220,
        carbohydrates: 15,
        fats: 8,
        fiber: 6,
        sugar: 12,
        sodium: 150,
        costEuros: 3.20, 
        proteinPerEuro: 8.8 
      },
      category: "breakfast",
      tags: ["viral", "social-media", "high-protein", "gluten-free", "vegetarian", "quick"],
      ingredients: [
        "1 cup frozen mixed berries",
        "1 scoop vanilla protein powder",
        "½ cup Greek yogurt",
        "2 tbsp almond butter",
        "1 tbsp chia seeds",
        "Fresh strawberries for topping",
        "Crushed almonds"
      ],
      wholeFoodLevel: "high",
      vegetableContent: {
        servings: 2,
        vegetables: ["berries", "strawberries"],
        benefits: ["Instagram-worthy swirls", "Viral for incredible protein content", "Tastes like dessert but healthy"]
      },
      recipe: {
        instructions: [
          "Blend frozen berries, protein powder, and Greek yogurt until thick like soft serve",
          "Swirl in almond butter for viral marbled effect",
          "Transfer to chilled bowl for best presentation",
          "Top with fresh strawberries arranged in Instagram pattern",
          "Sprinkle chia seeds and crushed almonds",
          "Serve immediately while frozen texture is perfect"
        ],
        tips: [
          "Use frozen fruit for thick ice cream texture",
          "Swirl technique is key for viral aesthetic",
          "Film the swirl creation for social media"
        ],
        notes: "This protein ice cream went viral for looking like dessert while packing 28g protein"
      }
    },
    {
      name: "Viral Walking Taco Salad (Social media hit)",
      portion: "1 serving bowl",
      nutrition: { 
        protein: 25, 
        prepTime: 10, 
        calories: 420,
        carbohydrates: 32,
        fats: 22,
        fiber: 12,
        sugar: 8,
        sodium: 380,
        costEuros: 4.80, 
        proteinPerEuro: 5.2 
      },
      category: "lunch",
      tags: ["viral", "social-media", "vegetarian", "gluten-free", "quick", "high-protein"],
      ingredients: [
        "2 cups mixed greens",
        "½ cup black beans",
        "½ cup corn kernels",
        "¼ cup shredded cheese",
        "1 avocado (diced)",
        "2 tbsp Greek yogurt",
        "1 tbsp lime juice",
        "Crushed tortilla chips",
        "Fresh cilantro",
        "Salsa for drizzling"
      ],
      wholeFoodLevel: "high",
      vegetableContent: {
        servings: 3,
        vegetables: ["mixed greens", "corn", "avocado", "cilantro"],
        benefits: ["Viral for portability", "Perfect macro balance", "Satisfying crunch factor"]
      },
      recipe: {
        instructions: [
          "Layer mixed greens as base in portable bowl",
          "Add black beans and corn in separate sections",
          "Dice avocado and arrange artistically",
          "Mix Greek yogurt with lime juice for viral creamy dressing",
          "Sprinkle cheese and crushed tortilla chips on top",
          "Garnish with fresh cilantro",
          "Drizzle salsa in pattern for social media appeal"
        ],
        tips: [
          "Assemble just before eating for best crunch",
          "Perfect for meal prep - pack dressing separately",
          "Viral because it's a complete meal in a bowl"
        ],
        notes: "This salad became viral for being a healthy version of walking tacos"
      }
    },
    {
      name: "Viral Marry Me Chickpea Curry (Plant-based viral hit)",
      portion: "1.5 cups curry",
      nutrition: { 
        protein: 18, 
        prepTime: 25, 
        calories: 380,
        carbohydrates: 42,
        fats: 16,
        fiber: 14,
        sugar: 12,
        sodium: 420,
        costEuros: 3.60, 
        proteinPerEuro: 5.0 
      },
      category: "dinner",
      tags: ["viral", "social-media", "vegan", "gluten-free", "anti-inflammatory"],
      ingredients: [
        "1 cup chickpeas (cooked)",
        "1 can coconut milk",
        "1 cup diced tomatoes",
        "1 onion (diced)",
        "3 cloves garlic (minced)",
        "1 tsp turmeric",
        "1 tsp garam masala",
        "Fresh spinach",
        "Fresh cilantro",
        "Basmati rice for serving"
      ],
      wholeFoodLevel: "high",
      vegetableContent: {
        servings: 2,
        vegetables: ["tomatoes", "onion", "spinach", "cilantro"],
        benefits: ["Viral for incredible flavor", "Anti-inflammatory spices", "So good people propose over it"]
      },
      recipe: {
        instructions: [
          "Sauté onion and garlic until fragrant",
          "Add turmeric and garam masala, cook for viral aromatic effect",
          "Add diced tomatoes and cook until thick",
          "Pour in coconut milk and bring to gentle simmer",
          "Add chickpeas and simmer for 15 minutes",
          "Stir in fresh spinach until wilted",
          "Garnish with fresh cilantro",
          "Serve over fluffy basmati rice"
        ],
        tips: [
          "Don't skip the spice blooming step - it's what makes it viral",
          "Coconut milk should be full-fat for richness",
          "Viral because the flavor is so incredible"
        ],
        notes: "This curry went viral because people joked it was so good you'd want to marry whoever made it"
      }
    }
  ],
  
  2: [
    // Next batch - to be released in 2 weeks
    {
      name: "Viral Cottage Cheese Flatbread (Social media craze)",
      portion: "1 flatbread",
      nutrition: { 
        protein: 24, 
        prepTime: 12, 
        calories: 280,
        carbohydrates: 18,
        fats: 14,
        fiber: 4,
        sugar: 6,
        sodium: 320,
        costEuros: 2.80, 
        proteinPerEuro: 8.6 
      },
      category: "lunch",
      tags: ["viral", "social-media", "vegetarian", "gluten-free", "high-protein", "quick"],
      ingredients: [
        "½ cup cottage cheese",
        "1 egg",
        "2 tbsp almond flour",
        "1 tsp oregano",
        "Cherry tomatoes",
        "Fresh basil",
        "Mozzarella cheese",
        "Balsamic glaze"
      ],
      wholeFoodLevel: "high",
      vegetableContent: {
        servings: 1,
        vegetables: ["tomatoes", "basil"],
        benefits: ["Viral protein hack", "Gluten-free bread alternative", "Perfect for food photography"]
      },
      recipe: {
        instructions: [
          "Mix cottage cheese, egg, almond flour, and oregano",
          "Spread mixture on parchment-lined baking sheet",
          "Bake at 180°C for 10 minutes until set",
          "Top with cherry tomatoes and mozzarella",
          "Bake 2 more minutes until cheese melts",
          "Garnish with fresh basil and balsamic drizzle"
        ],
        tips: [
          "Don't make mixture too thick - viral texture is key",
          "Pre-heat baking sheet for crispier bottom"
        ],
        notes: "This cottage cheese hack went viral for being an incredible protein-packed bread substitute"
      }
    }
  ]
};

// Function to get current viral recipes based on date with unit conversion applied
export function getCurrentViralRecipes(): MealOption[] {
  const currentDate = new Date();
  const startDate = new Date('2025-08-14'); // When we started tracking
  const daysSinceStart = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const weeksElapsed = Math.floor(daysSinceStart / 14); // Every 2 weeks
  
  // Determine which batch to use (cycle through available batches)
  const availableBatches = Object.keys(VIRAL_RECIPE_BATCHES).length;
  const currentBatch = (weeksElapsed % availableBatches) + 1;
  
  console.log(`🔥 Viral recipes: Using batch ${currentBatch} (${weeksElapsed} cycles since start)`);
  
  const rawRecipes = VIRAL_RECIPE_BATCHES[currentBatch] || VIRAL_RECIPE_BATCHES[1];
  
  // Apply conversion workflow to all viral recipes
  const convertedRecipes = rawRecipes.map(recipe => {
    const converted = applyConversionWorkflow(recipe);
    const validation = validateConversions(converted.ingredients);
    
    if (validation.unconvertedItems.length > 0) {
      console.log(`⚠️ Unconverted items in ${recipe.name}:`, validation.unconvertedItems);
    }
    
    return converted;
  });
  
  console.log(`🔧 Applied conversion workflow to ${convertedRecipes.length} viral recipes`);
  return convertedRecipes;
}

// Function to check if viral recipes need updating
export function shouldUpdateViralRecipes(lastUpdate: Date): boolean {
  const currentDate = new Date();
  const daysSinceUpdate = Math.floor((currentDate.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
  return daysSinceUpdate >= 14; // Update every 2 weeks
}

// Function to add new viral recipe batch with automatic conversion workflow
export function addViralRecipeBatch(version: number, recipes: MealOption[]): void {
  // Apply conversion workflow to new recipes before adding them
  const convertedRecipes = recipes.map(recipe => {
    const converted = applyConversionWorkflow(recipe);
    const validation = validateConversions(converted.ingredients);
    
    console.log(`🔧 Converting recipe: ${recipe.name}`);
    if (validation.hasMetricUnits) {
      console.log(`✅ Recipe has metric units: ${recipe.name}`);
    }
    if (!validation.hasSpecificFruits) {
      console.log(`🍎 Recipe needs seasonal fruit specification: ${recipe.name}`);
    }
    if (validation.unconvertedItems.length > 0) {
      console.log(`⚠️ Unconverted items in ${recipe.name}:`, validation.unconvertedItems);
    }
    
    return converted;
  });
  
  VIRAL_RECIPE_BATCHES[version] = convertedRecipes;
  console.log(`🔥 Added viral recipe batch ${version} with ${convertedRecipes.length} converted recipes`);
}

// Simulate upcoming viral recipes (to be added in future batches)
export const UPCOMING_VIRAL_RECIPES = [
  "Viral Protein Pancake Cereal (TikTok trend)",
  "Viral Cloud Eggs (Instagram famous)",
  "Viral Pasta Chips (Social media hit)",
  "Viral Salmon Rice Bowl (TikTok sensation)",
  "Viral Baked Oats (Breakfast trend)",
  "Viral Nature's Cereal (Health trend)",
  "Viral Whipped Coffee Bowl (Social craze)",
  "Viral Stuffed Dates (Healthy dessert trend)"
];

export default {
  getCurrentViralRecipes,
  shouldUpdateViralRecipes,
  addViralRecipeBatch,
  VIRAL_RECIPE_BATCHES,
  UPCOMING_VIRAL_RECIPES
};