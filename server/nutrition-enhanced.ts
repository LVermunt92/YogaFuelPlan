export interface NutritionInfo {
  protein: number;
  prepTime: number;
  calories: number;
  carbohydrates: number; // grams
  fats: number; // grams
  fiber: number; // grams
  sugar: number; // grams
  sodium: number; // mg
  potassium?: number; // mg
  calcium?: number; // mg
  iron?: number; // mg
  vitaminC?: number; // mg
  costEuros?: number;
  proteinPerEuro?: number;
}

export interface MealOption {
  name: string;
  portion: string;
  nutrition: NutritionInfo;
  category: 'breakfast' | 'lunch' | 'dinner';
  tags: string[];
  ingredients: string[];
  wholeFoodLevel: 'minimal' | 'moderate' | 'high'; // How processed the ingredients are
  vegetableContent: {
    servings: number;
    vegetables: string[];
    benefits: string[];
  };
  recipe?: {
    instructions: string[];
    tips?: string[];
    notes?: string;
  };
}

// Enhanced meal database focusing on whole foods and minimal processing
export const ENHANCED_MEAL_DATABASE: MealOption[] = [
  // Breakfast options - Whole Foods Focus
  {
    name: "Steel-cut oats with raw nuts, fresh berries, and ground flax",
    portion: "1 bowl (250g)",
    nutrition: { 
      protein: 18, 
      prepTime: 20, 
      calories: 420,
      carbohydrates: 58,
      fats: 16,
      fiber: 12,
      sugar: 14,
      sodium: 8,
      potassium: 580,
      calcium: 85,
      iron: 4.2,
      vitaminC: 12,
      costEuros: 2.20, 
      proteinPerEuro: 8.2 
    },
    category: "breakfast",
    tags: ["vegetarian", "gluten-free", "dairy-free", "high-protein", "anti-inflammatory", "whole30"],
    ingredients: ["steel-cut oats", "raw almonds", "raw walnuts", "fresh blueberries", "fresh strawberries", "ground flaxseed", "cinnamon", "raw honey"],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1,
      vegetables: ["berries"],
      benefits: ["High in antioxidants", "Rich in omega-3 fatty acids", "Supports heart health"]
    },
    recipe: {
      instructions: [
        "Soak 1/2 cup steel-cut oats overnight in water",
        "Drain and rinse oats, then cook in 1.5 cups water for 15-20 minutes",
        "Stir occasionally until creamy and tender",
        "Top with 1/4 cup mixed raw nuts (roughly chopped)",
        "Add 1/2 cup fresh mixed berries",
        "Sprinkle 1 tbsp ground flaxseed and cinnamon",
        "Drizzle with 1 tsp raw honey if desired"
      ],
      tips: [
        "Cook larger batches and reheat throughout the week",
        "Add nuts just before serving to maintain crunch"
      ],
      notes: "Steel-cut oats retain more nutrients than processed instant oats"
    }
  },
  {
    name: "Fresh vegetable and herb scrambled eggs with avocado",
    portion: "3 eggs + vegetables",
    nutrition: { 
      protein: 24, 
      prepTime: 15, 
      calories: 380,
      carbohydrates: 12,
      fats: 28,
      fiber: 8,
      sugar: 6,
      sodium: 420,
      potassium: 720,
      calcium: 110,
      iron: 3.8,
      vitaminC: 45,
      costEuros: 3.50, 
      proteinPerEuro: 6.9 
    },
    category: "breakfast",
    tags: ["vegetarian", "gluten-free", "lactose-free", "keto", "paleo", "high-protein"],
    ingredients: ["free-range eggs", "fresh spinach", "cherry tomatoes", "fresh herbs (parsley, chives)", "red bell pepper", "avocado", "olive oil", "sea salt"],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2.5,
      vegetables: ["spinach", "tomatoes", "bell pepper"],
      benefits: ["High in folate", "Rich in vitamin C", "Supports eye health"]
    },
    recipe: {
      instructions: [
        "Heat 1 tsp olive oil in non-stick pan over medium heat",
        "Add 1/4 cup diced bell pepper and cook 2 minutes",
        "Add 1 cup fresh spinach and 1/4 cup halved cherry tomatoes",
        "Whisk 3 eggs with salt and pour into pan",
        "Gently scramble, stirring frequently for 3-4 minutes",
        "Remove from heat when still slightly creamy",
        "Top with fresh herbs and serve with 1/2 sliced avocado"
      ],
      tips: [
        "Use the freshest eggs possible for best flavour",
        "Don't overcook - eggs continue cooking off the heat"
      ],
      notes: "Free-range eggs provide better omega-3 content than conventional eggs"
    }
  },
  {
    name: "Homemade chia pudding with fresh fruit and raw nuts",
    portion: "1 large serving (200g)",
    nutrition: { protein: 16, prepTime: 5, costEuros: 2.80, proteinPerEuro: 5.7 },
    category: "breakfast",
    tags: ["vegetarian", "vegan", "gluten-free", "dairy-free", "raw", "anti-inflammatory"],
    ingredients: ["chia seeds", "unsweetened almond milk", "fresh mango", "fresh kiwi", "raw cashews", "raw coconut flakes", "vanilla extract", "maple syrup"],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1.5,
      vegetables: ["fruit"],
      benefits: ["High in vitamin C", "Rich in fiber", "Supports digestive health"]
    },
    recipe: {
      instructions: [
        "Mix 3 tbsp chia seeds with 3/4 cup almond milk",
        "Add 1/4 tsp vanilla extract and 1 tsp maple syrup",
        "Stir well and refrigerate overnight (or 4+ hours)",
        "Top with 1/2 cup fresh diced mango and kiwi",
        "Sprinkle with 2 tbsp raw cashews and coconut flakes",
        "Serve chilled"
      ],
      tips: [
        "Make several portions at once for the week",
        "Stir again before serving if mixture has separated"
      ],
      notes: "Chia seeds provide complete protein and healthy omega-3 fats"
    }
  },

  // Lunch options - Whole Foods Focus
  {
    name: "Wild-caught salmon with roasted root vegetables",
    portion: "150g salmon + 200g vegetables",
    nutrition: { protein: 35, prepTime: 25, costEuros: 8.50, proteinPerEuro: 4.1 },
    category: "lunch",
    tags: ["pescatarian", "gluten-free", "dairy-free", "paleo", "anti-inflammatory", "high-protein"],
    ingredients: ["wild salmon fillet", "sweet potato", "carrots", "parsnips", "red onion", "fresh rosemary", "olive oil", "lemon", "sea salt"],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["sweet potato", "carrots", "parsnips", "onion"],
      benefits: ["High in beta-carotene", "Rich in fiber", "Supports immune system"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 200°C",
        "Dice 1 medium sweet potato, 2 carrots, 1 parsnip into 2cm pieces",
        "Toss vegetables with 1 tbsp olive oil, salt, and fresh rosemary",
        "Roast vegetables for 20 minutes",
        "Season salmon with salt and lemon juice",
        "Add salmon to oven for final 12-15 minutes",
        "Serve with lemon wedges"
      ],
      tips: [
        "Choose wild-caught salmon for better omega-3 content",
        "Don't overcook salmon - it should flake easily"
      ],
      notes: "Wild salmon provides superior nutrition compared to farmed varieties"
    }
  },
  {
    name: "Lentil and fresh vegetable curry with brown rice",
    portion: "1.5 cups curry + 1 cup rice",
    nutrition: { protein: 22, prepTime: 35, costEuros: 3.20, proteinPerEuro: 6.9 },
    category: "lunch",
    tags: ["vegetarian", "vegan", "gluten-free", "dairy-free", "ayurvedic", "anti-inflammatory"],
    ingredients: ["green lentils", "brown rice", "fresh ginger", "fresh turmeric", "onion", "garlic", "tomatoes", "spinach", "coconut milk", "cumin seeds", "coriander seeds"],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2.5,
      vegetables: ["onion", "tomatoes", "spinach", "ginger"],
      benefits: ["High in iron", "Anti-inflammatory", "Supports digestion"]
    },
    recipe: {
      instructions: [
        "Rinse 3/4 cup green lentils and 1/2 cup brown rice separately",
        "Cook rice in 1 cup water for 25-30 minutes",
        "Heat 1 tbsp coconut oil, add 1 tsp cumin seeds until they splutter",
        "Add diced onion, 1 tbsp fresh ginger, 2 cloves garlic",
        "Add 1 tsp fresh turmeric, cook 2 minutes",
        "Add lentils, diced tomatoes, 1 cup coconut milk, 1 cup water",
        "Simmer 20 minutes until lentils are tender",
        "Stir in fresh spinach last 2 minutes",
        "Serve over brown rice"
      ],
      tips: [
        "Use fresh spices for better flavour and health benefits",
        "Cook lentils and rice in bulk for meal prep"
      ],
      notes: "Fresh turmeric provides more curcumin than dried powder"
    }
  },
  {
    name: "Grass-fed beef with roasted seasonal vegetables",
    portion: "150g beef + mixed vegetables",
    nutrition: { protein: 42, prepTime: 30, costEuros: 9.80, proteinPerEuro: 4.3 },
    category: "lunch",
    tags: ["paleo", "gluten-free", "dairy-free", "high-protein", "anti-inflammatory"],
    ingredients: ["grass-fed beef sirloin", "seasonal vegetables (zucchini, eggplant, bell peppers)", "fresh thyme", "garlic", "olive oil", "balsamic vinegar", "sea salt"],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["zucchini", "eggplant", "bell peppers"],
      benefits: ["High in antioxidants", "Low in calories", "Supports heart health"]
    },
    recipe: {
      instructions: [
        "Let beef come to room temperature for 30 minutes",
        "Preheat oven to 220°C",
        "Cut vegetables into similar-sized pieces",
        "Toss vegetables with olive oil, salt, and fresh thyme",
        "Roast vegetables 20 minutes",
        "Season beef with salt and sear in hot pan 2-3 minutes each side",
        "Rest beef 5 minutes before slicing",
        "Drizzle with balsamic vinegar"
      ],
      tips: [
        "Choose grass-fed beef for better nutrient profile",
        "Use a meat thermometer for perfect doneness"
      ],
      notes: "Grass-fed beef contains more omega-3 fatty acids than grain-fed"
    }
  },

  // Dinner options - Whole Foods Focus
  {
    name: "Free-range chicken thighs with roasted Brussels sprouts and sweet potato",
    portion: "2 thighs + vegetables",
    nutrition: { protein: 38, prepTime: 40, costEuros: 6.50, proteinPerEuro: 5.8 },
    category: "dinner",
    tags: ["gluten-free", "dairy-free", "paleo", "high-protein"],
    ingredients: ["free-range chicken thighs", "Brussels sprouts", "sweet potato", "red onion", "fresh sage", "olive oil", "lemon", "garlic", "sea salt"],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2.5,
      vegetables: ["Brussels sprouts", "sweet potato", "onion"],
      benefits: ["High in vitamin K", "Rich in fiber", "Supports bone health"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 200°C",
        "Season chicken thighs with salt, pepper, and fresh sage",
        "Halve Brussels sprouts and cube sweet potato",
        "Toss vegetables with olive oil and garlic",
        "Roast vegetables 15 minutes",
        "Add chicken thighs to pan, roast 25-30 minutes",
        "Check internal temperature reaches 75°C",
        "Squeeze fresh lemon over everything before serving"
      ],
      tips: [
        "Free-range chicken has better flavour and nutrition",
        "Don't overcrowd the pan for better roasting"
      ],
      notes: "Chicken thighs stay more moist than breasts during roasting"
    }
  },
  {
    name: "Wild mushroom and herb quinoa with roasted vegetables",
    portion: "1.5 cups quinoa + vegetables",
    nutrition: { protein: 18, prepTime: 35, costEuros: 4.80, proteinPerEuro: 3.8 },
    category: "dinner",
    tags: ["vegetarian", "vegan", "gluten-free", "dairy-free", "anti-inflammatory"],
    ingredients: ["quinoa", "mixed wild mushrooms", "fresh herbs (parsley, thyme)", "zucchini", "red bell pepper", "red onion", "garlic", "olive oil", "vegetable broth"],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["mushrooms", "zucchini", "bell pepper", "onion"],
      benefits: ["High in antioxidants", "Supports immune system", "Rich in B vitamins"]
    },
    recipe: {
      instructions: [
        "Rinse 1 cup quinoa until water runs clear",
        "Sauté sliced mushrooms until golden, set aside",
        "Cook quinoa in 2 cups vegetable broth for 15 minutes",
        "Meanwhile, roast diced vegetables with olive oil at 200°C for 20 minutes",
        "Fluff quinoa and stir in mushrooms and fresh herbs",
        "Top with roasted vegetables",
        "Drizzle with olive oil and lemon juice"
      ],
      tips: [
        "Use a variety of mushrooms for complex flavour",
        "Toast quinoa in dry pan before cooking for nuttier taste"
      ],
      notes: "Wild mushrooms provide more nutrients than cultivated varieties"
    }
  },
  {
    name: "Baked cod with Mediterranean vegetables and fresh herbs",
    portion: "180g cod + vegetables",
    nutrition: { protein: 32, prepTime: 30, costEuros: 7.20, proteinPerEuro: 4.4 },
    category: "dinner",
    tags: ["pescatarian", "gluten-free", "dairy-free", "mediterranean", "anti-inflammatory"],
    ingredients: ["fresh cod fillet", "cherry tomatoes", "zucchini", "red onion", "black olives", "fresh basil", "fresh oregano", "olive oil", "lemon", "capers"],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2.5,
      vegetables: ["tomatoes", "zucchini", "onion"],
      benefits: ["High in lycopene", "Low in calories", "Supports heart health"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 190°C",
        "Slice zucchini and red onion, halve cherry tomatoes",
        "Arrange vegetables in baking dish with olives",
        "Drizzle with olive oil and season with herbs",
        "Bake vegetables 15 minutes",
        "Season cod with salt, pepper, and lemon juice",
        "Place cod on vegetables, bake 12-15 minutes",
        "Garnish with fresh basil and capers"
      ],
      tips: [
        "Choose thick cod fillets for even cooking",
        "Fish is done when it flakes easily with a fork"
      ],
      notes: "Fresh herbs provide more flavour and nutrients than dried"
    }
  }
];

// Function to get meals from enhanced database filtered by dietary requirements
export function getEnhancedMealsByCategory(category: 'breakfast' | 'lunch' | 'dinner'): MealOption[] {
  return ENHANCED_MEAL_DATABASE.filter(meal => meal.category === category);
}

export function filterEnhancedMealsByDietaryTags(meals: MealOption[], dietaryTags: string[]): MealOption[] {
  if (dietaryTags.length === 0) return meals;
  
  return meals.filter(meal => 
    dietaryTags.some(tag => meal.tags.includes(tag))
  );
}

export function getEnhancedMealsForCategoryAndDiet(category: 'breakfast' | 'lunch' | 'dinner', dietaryTags: string[] = []): MealOption[] {
  const categoryMeals = getEnhancedMealsByCategory(category);
  const filteredMeals = filterEnhancedMealsByDietaryTags(categoryMeals, dietaryTags);
  
  // If no meals match dietary tags, return all meals from category (with console warning)
  if (filteredMeals.length === 0) {
    console.log(`No ${category} meals found for dietary tags: ${dietaryTags.join(', ')}. Falling back to all ${category} meals.`);
    return categoryMeals;
  }
  
  return filteredMeals;
}