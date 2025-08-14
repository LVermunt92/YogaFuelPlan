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
  ],
  2: [
    // New batch - September 2025 - Adding major variety
    {
      name: "Viral Cloud Bread (Social Media Phenomenon)",
      portion: "2 pieces",
      nutrition: { 
        protein: 12, 
        prepTime: 35, 
        calories: 160,
        carbohydrates: 4,
        fats: 11,
        fiber: 1,
        sugar: 2,
        sodium: 220,
        costEuros: 1.80, 
        proteinPerEuro: 6.7 
      },
      category: "breakfast",
      tags: ["viral", "social-media", "vegetarian", "gluten-free", "low-carb", "keto-friendly"],
      ingredients: [
        "3 egg whites",
        "2 tbsp cream cheese",
        "1 tbsp honey",
        "½ tsp vanilla extract",
        "Pinch of salt"
      ],
      wholeFoodLevel: "moderate",
      vegetableContent: {
        servings: 0,
        vegetables: [],
        benefits: ["Viral for fluffy texture", "Zero carb bread alternative", "Perfect for food photography"]
      },
      recipe: {
        instructions: [
          "Separate eggs and ensure bowl is completely clean",
          "Whip egg whites until stiff peaks form (crucial for viral texture)",
          "In separate bowl, mix cream cheese, honey, vanilla until smooth",
          "Gently fold cream cheese mixture into egg whites",
          "Spoon onto parchment-lined baking sheet in cloud shapes",
          "Bake at 150°C for 30 minutes until golden",
          "Cool completely before handling - they're very delicate"
        ],
        tips: [
          "Any fat will prevent egg whites from whipping properly",
          "Don't overmix or clouds will deflate",
          "Viral because they look like actual clouds"
        ],
        notes: "This bread went viral for looking like fluffy clouds and being nearly carb-free"
      }
    },
    {
      name: "Viral Baked Oats (TikTok Breakfast Trend)",
      portion: "1 ramekin",
      nutrition: { 
        protein: 16, 
        prepTime: 20, 
        calories: 290,
        carbohydrates: 38,
        fats: 8,
        fiber: 6,
        sugar: 12,
        sodium: 180,
        costEuros: 2.20, 
        proteinPerEuro: 7.3 
      },
      category: "breakfast",
      tags: ["viral", "social-media", "vegetarian", "gluten-free", "high-protein"],
      ingredients: [
        "½ cup rolled oats",
        "1 scoop vanilla protein powder", 
        "½ mashed banana",
        "¼ cup almond milk",
        "1 tbsp almond butter",
        "1 tsp cinnamon",
        "¼ cup blueberries",
        "1 tbsp maple syrup"
      ],
      wholeFoodLevel: "high",
      vegetableContent: {
        servings: 1,
        vegetables: ["banana", "blueberries"],
        benefits: ["Viral for cake-like texture", "High protein breakfast", "Instagram-worthy presentation"]
      },
      recipe: {
        instructions: [
          "Preheat oven to 180°C",
          "Mash banana in oven-safe ramekin",
          "Mix in oats, protein powder, cinnamon",
          "Add almond milk and almond butter, stir well",
          "Fold in half the blueberries",
          "Bake for 15-18 minutes until set and golden",
          "Top with remaining blueberries and maple syrup drizzle",
          "Serve warm directly from ramekin"
        ],
        tips: [
          "Use frozen blueberries to prevent them from sinking",
          "Add extra liquid if mixture seems too thick",
          "Viral because it tastes like cake for breakfast"
        ],
        notes: "This became viral for transforming healthy oats into dessert-like breakfast"
      }
    },
    {
      name: "Viral Nature's Cereal (Health Trend Bowl)",
      portion: "1 large bowl",
      nutrition: { 
        protein: 8, 
        prepTime: 5, 
        calories: 180,
        carbohydrates: 28,
        fats: 6,
        fiber: 8,
        sugar: 22,
        sodium: 15,
        costEuros: 3.80, 
        proteinPerEuro: 2.1 
      },
      category: "breakfast",
      tags: ["viral", "social-media", "vegan", "gluten-free", "refreshing", "quick"],
      ingredients: [
        "1 cup fresh blueberries",
        "½ cup fresh strawberries (sliced)",
        "¼ cup fresh blackberries",
        "2 tbsp pomegranate seeds",
        "1 cup coconut water",
        "Ice cubes",
        "Fresh mint leaves"
      ],
      wholeFoodLevel: "high",
      vegetableContent: {
        servings: 3,
        vegetables: ["blueberries", "strawberries", "blackberries"],
        benefits: ["Viral for natural sweetness", "Antioxidant powerhouse", "Hydrating and refreshing"]
      },
      recipe: {
        instructions: [
          "Add ice cubes to large bowl",
          "Pour coconut water over ice",
          "Add blueberries and let them float",
          "Arrange sliced strawberries artistically",
          "Scatter blackberries and pomegranate seeds",
          "Garnish with fresh mint leaves",
          "Eat with a spoon like cereal",
          "Add more coconut water as needed"
        ],
        tips: [
          "Use frozen berries for extra chill factor",
          "Make it photogenic by arranging colors",
          "Viral for being nature's candy in a bowl"
        ],
        notes: "This trend went viral as the healthiest 'cereal' alternative using only fresh fruit"
      }
    },
    {
      name: "Viral Pasta Chips (Crunchy Social Media Hit)",
      portion: "1 serving (100g)",
      nutrition: { 
        protein: 14, 
        prepTime: 15, 
        calories: 320,
        carbohydrates: 45,
        fats: 10,
        fiber: 3,
        sugar: 2,
        sodium: 380,
        costEuros: 2.40, 
        proteinPerEuro: 5.8 
      },
      category: "lunch",
      tags: ["viral", "social-media", "vegetarian", "crispy", "snack-like"],
      ingredients: [
        "2 cups cooked pasta (any shape)",
        "2 tbsp olive oil",
        "2 tbsp parmesan cheese",
        "1 tsp garlic powder",
        "1 tsp paprika",
        "½ tsp oregano",
        "Salt and pepper",
        "Marinara sauce for dipping"
      ],
      wholeFoodLevel: "moderate",
      vegetableContent: {
        servings: 1,
        vegetables: ["tomatoes in sauce"],
        benefits: ["Viral for unexpected crunch", "Carb snack revolution", "Perfect for sharing"]
      },
      recipe: {
        instructions: [
          "Cook pasta until al dente, drain completely",
          "Preheat oven to 200°C",
          "Toss warm pasta with olive oil until coated",
          "Add parmesan, garlic powder, paprika, oregano",
          "Season with salt and pepper",
          "Spread on baking sheet in single layer",
          "Bake 10-12 minutes until golden and crispy",
          "Serve immediately with marinara for dipping"
        ],
        tips: [
          "Make sure pasta is completely dry before baking",
          "Don't overcrowd the baking sheet",
          "Viral because it transforms pasta into chips"
        ],
        notes: "This trend went viral for turning leftover pasta into addictive crispy snacks"
      }
    },
    {
      name: "Viral Salmon Rice Bowl (TikTok Sensation)",
      portion: "1 bowl",
      nutrition: { 
        protein: 28, 
        prepTime: 15, 
        calories: 420,
        carbohydrates: 35,
        fats: 18,
        fiber: 4,
        sugar: 8,
        sodium: 450,
        costEuros: 6.20, 
        proteinPerEuro: 4.5 
      },
      category: "dinner",
      tags: ["viral", "social-media", "gluten-free", "high-protein", "omega-3"],
      ingredients: [
        "150g salmon fillet",
        "1 cup cooked sushi rice",
        "½ avocado (sliced)",
        "¼ cup cucumber (diced)",
        "2 tbsp soy sauce",
        "1 tbsp mayo",
        "1 tsp sriracha",
        "1 tsp sesame oil",
        "Sesame seeds",
        "Nori sheets (cut into strips)"
      ],
      wholeFoodLevel: "high",
      vegetableContent: {
        servings: 1,
        vegetables: ["avocado", "cucumber"],
        benefits: ["Viral for umami flavor combo", "Restaurant-quality at home", "Perfect macro balance"]
      },
      recipe: {
        instructions: [
          "Season salmon with salt and pepper",
          "Pan-sear salmon 3-4 minutes each side until flaky",
          "Flake salmon into bite-sized pieces",
          "Mix soy sauce, mayo, sriracha for viral sauce",
          "Place warm rice in bowl as base",
          "Top with flaked salmon and avocado slices",
          "Add diced cucumber for crunch",
          "Drizzle with sauce and sesame oil",
          "Garnish with sesame seeds and nori strips"
        ],
        tips: [
          "Don't overcook salmon - it should be tender",
          "Make extra sauce - it's addictive",
          "Viral for restaurant-quality results at home"
        ],
        notes: "This bowl went viral for combining all the best Japanese flavors in one satisfying meal"
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
  
  // USE ALL AVAILABLE BATCHES for maximum variety instead of cycling
  const availableBatches = Object.keys(VIRAL_RECIPE_BATCHES).length;
  console.log(`🔥 Viral recipes: Using ALL ${availableBatches} batches for maximum variety (${weeksElapsed} cycles since start)`);
  
  // Combine all viral recipe batches for better variety
  const allViralRecipes: MealOption[] = [];
  for (let i = 1; i <= availableBatches; i++) {
    if (VIRAL_RECIPE_BATCHES[i]) {
      allViralRecipes.push(...VIRAL_RECIPE_BATCHES[i]);
    }
  }
  
  // Apply conversion workflow to all viral recipes
  const convertedRecipes = allViralRecipes.map(recipe => {
    const converted = applyConversionWorkflow(recipe);
    const validation = validateConversions(converted.ingredients);
    
    if (validation.unconvertedItems.length > 0) {
      console.log(`⚠️ Unconverted items in ${recipe.name}:`, validation.unconvertedItems);
    }
    
    return converted;
  });
  
  console.log(`🔧 Applied conversion workflow to ${convertedRecipes.length} viral recipes`);
  console.log(`🔥 Currently serving ${convertedRecipes.length} viral recipes in meal database`);
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
  "Viral Whipped Coffee Bowl (Social craze)",
  "Viral Stuffed Dates (Healthy dessert trend)",
  "Viral Cheese Board Pasta (Social hit)",
  "Viral Pesto Eggs (Breakfast trend)",
  "Viral Feta Pasta (TikTok famous)",
  "Viral Green Goddess Salad (Instagram trend)"
];

export default {
  getCurrentViralRecipes,
  shouldUpdateViralRecipes,
  addViralRecipeBatch,
  VIRAL_RECIPE_BATCHES,
  UPCOMING_VIRAL_RECIPES
};