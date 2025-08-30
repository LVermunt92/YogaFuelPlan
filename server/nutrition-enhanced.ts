import { getCurrentSeasonalGuidance, adaptRecipeForSeason, getCurrentAyurvedicSeason } from './ayurveda-seasonal';
import { applyDietarySubstitutions, substituteIngredients } from './ingredient-substitution';
import { selectProteinOptimizedMeals } from './smart-protein-selection';
import { specifyIngredients, validateIngredientSpecificity, updateRecipeIngredients } from './ingredient-specifier';
import { standardizePortion } from './portion-standardizer';
import { convertAllRecipeUnits } from './bulk-unit-converter';
import { validateAndEnhanceMealDatabase } from './protein-validator';

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
// Note: All recipes in this database are automatically validated for protein content
export const ENHANCED_MEAL_DATABASE: MealOption[] = [
  // Breakfast options - Whole Foods Focus
  {
    name: "Steel-cut oats with raw nuts, fresh berries, and ground flax",
    portion: "1 serving",
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
    tags: ["vegetarian", "gluten-free", "dairy-free", "high-protein", "anti-inflammatory", "whole30", "ayurvedic"],
    ingredients: [
      "60g steel-cut oats",
      "35g raw almonds and walnuts (chopped)",
      "70g fresh blueberries and strawberries",
      "15ml ground flaxseed",
      "2.5ml cinnamon",
      "5ml raw honey (optional)",
      "360ml water for cooking"
    ],
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
    portion: "1 serving",
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
    ingredients: [
      "3 large free-range eggs",
      "60g fresh spinach leaves",
      "40g cherry tomatoes (halved)",
      "30ml fresh parsley (chopped)",
      "40g red bell pepper (diced)",
      "½ medium avocado (sliced)",
      "5ml extra virgin olive oil",
      "Pinch of sea salt and black pepper"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2.5,
      vegetables: ["spinach", "tomatoes", "bell pepper"],
      benefits: ["High in folate", "Rich in vitamin C", "Supports eye health"]
    },
    recipe: {
      instructions: [
        "Heat 5ml olive oil in non-stick pan over medium heat",
        "Add 40g diced bell pepper and cook 2 minutes",
        "Add 60g fresh spinach and 40g halved cherry tomatoes",
        "Whisk 3 eggs with salt and pour into pan",
        "Gently scramble, stirring frequently for 3-4 minutes",
        "Remove from heat when still slightly creamy",
        "Top with fresh herbs and serve with 75g sliced avocado"
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
    portion: "1 serving",
    nutrition: { 
      protein: 16, 
      prepTime: 5, 
      calories: 285,
      carbohydrates: 25,
      fats: 18,
      fiber: 14,
      sugar: 12,
      sodium: 180,
      costEuros: 2.80, 
      proteinPerEuro: 5.7 
    },
    category: "breakfast",
    tags: ["vegetarian", "vegan", "gluten-free", "lactose-free", "dairy-free", "raw", "anti-inflammatory", "ayurvedic"],
    ingredients: [
      "3 tbsp chia seeds",
      "¾ cup unsweetened almond milk",
      "½ cup fresh mango (diced)",
      "½ cup fresh kiwi (diced)",
      "2 tbsp raw cashews (chopped)",
      "1 tbsp raw coconut flakes",
      "¼ tsp vanilla extract",
      "1 tsp pure maple syrup"
    ],
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

  // Additional gluten-free, lactose-free, vegetarian breakfast options
  {
    name: "Overnight gluten-free oats with almond milk and berries",
    portion: "1 serving",
    nutrition: {
      protein: 15,
      prepTime: 5,
      calories: 320,
      carbohydrates: 45,
      fats: 8,
      fiber: 12,
      sugar: 15,
      sodium: 150,
      costEuros: 2.2,
      proteinPerEuro: 6.8
    },
    category: "breakfast",
    tags: ["vegetarian", "gluten-free", "lactose-free", "high-fiber", "make-ahead", "ayurvedic"],
    ingredients: [
      "½ cup gluten-free rolled oats",
      "½ cup unsweetened almond milk",
      "1 tbsp chia seeds",
      "1 tbsp almond butter",
      "½ cup mixed berries",
      "1 tsp vanilla extract",
      "Stevia to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1,
      vegetables: ["berries"],
      benefits: ["antioxidants", "vitamin C", "fiber"]
    },
    recipe: {
      instructions: [
        "Mix oats, almond milk, chia seeds, and vanilla in a jar",
        "Add almond butter and stevia, stir well",
        "Refrigerate overnight (minimum 4 hours)",
        "Top with fresh berries before serving",
        "Can be eaten cold or warmed up"
      ],
      tips: [
        "Prepare multiple jars for the week",
        "Add more liquid if you prefer thinner consistency"
      ],
      notes: "Perfect make-ahead breakfast that's naturally gluten-free and dairy-free"
    }
  },

  {
    name: "Quinoa breakfast bowl with coconut yogurt and nuts",
    portion: "1 serving",
    nutrition: {
      protein: 18,
      prepTime: 15,
      calories: 380,
      carbohydrates: 42,
      fats: 12,
      fiber: 8,
      sugar: 12,
      sodium: 120,
      costEuros: 3.5,
      proteinPerEuro: 5.1
    },
    category: "breakfast",
    tags: ["vegetarian", "gluten-free", "lactose-free", "high-protein", "superfood", "ayurvedic"],
    ingredients: [
      "½ cup cooked quinoa",
      "½ cup coconut yogurt",
      "2 tbsp mixed nuts (almonds, walnuts)",
      "1 tbsp hemp seeds",
      "½ sliced banana",
      "1 tsp maple syrup",
      "Cinnamon to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 0.5,
      vegetables: ["banana"],
      benefits: ["potassium", "natural sugars"]
    },
    recipe: {
      instructions: [
        "Cook quinoa according to package directions and let cool",
        "Layer coconut yogurt in a bowl",
        "Add cooked quinoa on top",
        "Sprinkle with hemp seeds and chopped nuts",
        "Arrange banana slices and drizzle with maple syrup",
        "Add a pinch of cinnamon"
      ],
      tips: [
        "Cook quinoa in batches for the week",
        "Toast nuts for extra flavor"
      ],
      notes: "Complete protein breakfast with all essential amino acids"
    }
  },

  {
    name: "Coconut flour pancakes with dairy-free protein powder",
    portion: "1 serving",
    nutrition: {
      protein: 22,
      prepTime: 20,
      calories: 285,
      carbohydrates: 18,
      fats: 15,
      fiber: 10,
      sugar: 8,
      sodium: 280,
      costEuros: 3.8,
      proteinPerEuro: 5.8
    },
    category: "breakfast",
    tags: ["vegetarian", "gluten-free", "lactose-free", "high-protein", "low-carb"],
    ingredients: [
      "¼ cup coconut flour",
      "1 scoop plant protein powder",
      "3 eggs",
      "¼ cup almond milk",
      "1 tbsp coconut oil",
      "1 tsp vanilla extract",
      "½ tsp baking powder",
      "Pinch of salt"
    ],
    wholeFoodLevel: "moderate",
    vegetableContent: {
      servings: 0,
      vegetables: [],
      benefits: []
    },
    recipe: {
      instructions: [
        "Mix coconut flour, protein powder, baking powder, and salt",
        "Whisk eggs, almond milk, and vanilla in separate bowl",
        "Combine wet and dry ingredients, let batter rest 5 minutes",
        "Heat coconut oil in non-stick pan over medium-low heat",
        "Pour batter to form 3-inch pancakes",
        "Cook 3-4 minutes per side until golden"
      ],
      tips: [
        "Coconut flour absorbs a lot of liquid, don't add more flour",
        "Keep heat low to prevent burning"
      ],
      notes: "High-protein, low-carb pancakes that are naturally gluten and dairy-free"
    }
  },

  {
    name: "Green smoothie bowl with hemp hearts, coconut and protein powder",
    portion: "1 serving",
    nutrition: {
      protein: 28,
      prepTime: 12,
      calories: 375,
      carbohydrates: 36,
      fats: 12,
      fiber: 16,
      sugar: 20,
      sodium: 110,
      costEuros: 5.40,
      proteinPerEuro: 5.2
    },
    category: "breakfast",
    tags: ["vegetarian", "gluten-free", "lactose-free", "high-fiber", "antioxidant", "ayurvedic", "high-protein"],
    ingredients: [
      "1 cup spinach",
      "½ frozen banana",
      "½ cup unsweetened almond milk",
      "1 tbsp almond butter",
      "1 scoop plant protein powder (vanilla)",
      "2 tbsp hemp hearts",
      "1 tbsp coconut flakes",
      "½ cup frozen mango",
      "1 tsp spirulina (optional)"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["spinach", "mango"],
      benefits: ["iron", "folate", "vitamin C", "beta-carotene"]
    },
    recipe: {
      instructions: [
        "Blend spinach, banana, almond milk, and almond butter until smooth",
        "Add protein powder and blend until fully incorporated",
        "Add frozen mango and blend until thick consistency",
        "Pour into bowl",
        "Top with hemp hearts and coconut flakes",
        "Add spirulina for extra nutrients if desired"
      ],
      tips: [
        "Use less liquid for thicker consistency",
        "Freeze fruits in portions for convenience"
      ],
      notes: "Nutrient-dense breakfast packed with plant-based protein and greens"
    }
  },

  {
    name: "Fermented kefir bowl with gluten-free granola and berries",
    portion: "1 serving",
    nutrition: { 
      protein: 20, 
      prepTime: 5, 
      calories: 380,
      carbohydrates: 42,
      fats: 14,
      fiber: 8,
      sugar: 28,
      sodium: 120,
      potassium: 450,
      calcium: 350,
      iron: 2.8,
      vitaminC: 35,
      costEuros: 2.60, 
      proteinPerEuro: 7.7 
    },
    category: "breakfast",
    tags: ["vegetarian", "gluten-free", "lactose-free", "probiotic", "fermented", "high-protein", "ayurvedic"],
    ingredients: [
      "200ml long-fermented kefir (24+ hours)",
      "¼ cup gluten-free oat granola", 
      "½ cup mixed fresh berries",
      "2 tbsp chopped almonds",
      "1 tbsp ground flaxseed",
      "1 tsp honey (optional)"
    ],
    wholeFoodLevel: "moderate",
    vegetableContent: {
      servings: 0.5,
      vegetables: ["berries"],
      benefits: ["Probiotics for gut health", "Antioxidants from berries", "Omega-3s from flaxseed"]
    },
    recipe: {
      instructions: [
        "Use kefir that has been fermented for 24+ hours (lactose-free)",
        "Pour 200ml fermented kefir into a bowl",
        "Top with ¼ cup gluten-free granola",
        "Add ½ cup mixed fresh berries",
        "Sprinkle with chopped almonds and ground flaxseed",
        "Drizzle with 1 tsp honey if desired"
      ],
      tips: [
        "Long fermentation (24+ hours) breaks down lactose completely",
        "Check that granola is certified gluten-free",
        "Kefir provides more probiotics than regular yogurt"
      ],
      notes: "Extended fermentation makes kefir naturally lactose-free while preserving beneficial probiotics"
    }
  },

  // Lunch options - Whole Foods Focus
  {
    name: "Protein-packed lentil and roasted root vegetable bowl",
    portion: "2 servings",
    nutrition: { 
      protein: 24, 
      prepTime: 35, 
      calories: 420,
      carbohydrates: 55,
      fats: 8,
      fiber: 18,
      sugar: 12,
      sodium: 280,
      costEuros: 4.50, 
      proteinPerEuro: 5.3 
    },
    category: "lunch",
    tags: ["vegetarian", "vegan", "gluten-free", "dairy-free", "anti-inflammatory", "high-protein"],
    ingredients: [
      "1 cup red lentils",
      "1 medium sweet potato (diced)",
      "2 large carrots (diced)",
      "1 parsnip (diced)",
      "½ red onion (sliced)",
      "2 sprigs fresh rosemary",
      "2 tbsp extra virgin olive oil",
      "1 lemon (juiced)",
      "Sea salt to taste",
      "2 tbsp tahini"
    ],
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
        "Roast vegetables for 35 minutes until tender",
        "Cook 1 cup red lentils in 2 cups water for 15 minutes",
        "Make tahini dressing with lemon juice and herbs",
        "Serve lentils over roasted vegetables with tahini drizzle"
      ],
      tips: [
        "Red lentils cook faster than other varieties",
        "Roast vegetables until edges are caramelized for best flavor"
      ],
      notes: "Red lentils provide complete protein and cook quickly for meal prep"
    }
  },
  {
    name: "Simple protein bowl",
    portion: "1 serving",
    nutrition: { 
      protein: 25, 
      prepTime: 15, 
      calories: 420,
      carbohydrates: 45,
      fats: 18,
      fiber: 12,
      sugar: 8,
      sodium: 320,
      potassium: 650,
      calcium: 120,
      iron: 6.2,
      vitaminC: 25,
      costEuros: 4.20, 
      proteinPerEuro: 6.0 
    },
    category: "lunch",
    tags: ["vegetarian", "gluten-free", "high-protein", "quick", "meal-prep"],
    ingredients: [
      "1 cup cooked quinoa",
      "½ cup black beans (cooked)",
      "½ avocado (sliced)",
      "¼ cup hemp seeds",
      "1 cup fresh spinach",
      "½ cup cherry tomatoes (halved)",
      "¼ cup red onion (diced)",
      "2 tbsp tahini",
      "1 tbsp lemon juice",
      "1 tsp olive oil",
      "Salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2.5,
      vegetables: ["spinach", "tomatoes", "onion"],
      benefits: ["High in plant protein", "Rich in healthy fats", "Complete amino acid profile"]
    },
    recipe: {
      instructions: [
        "Cook quinoa according to package directions and let cool slightly",
        "Rinse and drain black beans if using canned",
        "Wash and dry spinach leaves thoroughly",
        "Halve cherry tomatoes and dice red onion",
        "Slice avocado just before serving",
        "In a bowl, layer quinoa as the base",
        "Top with fresh spinach, black beans, and vegetables",
        "Add sliced avocado and sprinkle hemp seeds on top",
        "Whisk tahini with lemon juice and olive oil for dressing",
        "Drizzle dressing over bowl and season with salt and pepper"
      ],
      tips: [
        "Prepare quinoa and beans in advance for quick assembly",
        "Add avocado just before eating to prevent browning",
        "Double the recipe to meal prep for tomorrow's lunch"
      ],
      notes: "Perfect balance of plant proteins, healthy fats, and complex carbohydrates"
    }
  },
  {
    name: "Wild-caught salmon with roasted root vegetables",
    portion: "150g salmon + 200g vegetables",
    nutrition: { 
      protein: 35, 
      prepTime: 25, 
      calories: 485,
      carbohydrates: 35,
      fats: 18,
      fiber: 8,
      sugar: 14,
      sodium: 320,
      costEuros: 8.50, 
      proteinPerEuro: 4.1 
    },
    category: "lunch",
    tags: ["pescatarian", "gluten-free", "dairy-free", "paleo", "anti-inflammatory", "high-protein"],
    ingredients: [
      "150g wild salmon fillet",
      "1 medium sweet potato (chunked)",
      "2 large carrots (chunked)",
      "1 parsnip (chunked)",
      "½ red onion (wedged)",
      "2 sprigs fresh rosemary",
      "1 tbsp extra virgin olive oil",
      "1 lemon (juiced + wedges)",
      "Sea salt to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["sweet potato", "carrots", "parsnips", "onion"],
      benefits: ["High in beta-carotene", "Rich in omega-3 fatty acids", "Supports heart health", "Anti-inflammatory properties"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 200°C",
        "Cut sweet potato, carrots, and parsnips into 2cm chunks",
        "Slice red onion into wedges",
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
    portion: "2 servings",
    nutrition: { 
      protein: 22, 
      prepTime: 35, 
      calories: 395,
      carbohydrates: 58,
      fats: 8,
      fiber: 15,
      sugar: 8,
      sodium: 240,
      costEuros: 3.20, 
      proteinPerEuro: 6.9 
    },
    category: "lunch",
    tags: ["vegetarian", "vegan", "gluten-free", "dairy-free", "ayurvedic", "anti-inflammatory"],
    ingredients: [
      "¾ cup green lentils",
      "½ cup brown rice", 
      "1 tbsp fresh ginger (minced)",
      "1 tsp fresh turmeric (grated)",
      "1 medium onion (diced)",
      "2 cloves garlic (minced)",
      "2 medium tomatoes (diced)",
      "2 cups fresh spinach",
      "1 cup coconut milk",
      "1 tsp cumin seeds",
      "1 tsp coriander seeds",
      "1 tbsp coconut oil"
    ],
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
    name: "Herb-marinated tempeh with roasted seasonal vegetables and seed mix",
    portion: "200g tempeh + mixed vegetables",
    nutrition: { 
      protein: 33, 
      prepTime: 30, 
      calories: 455,
      carbohydrates: 22,
      fats: 22,
      fiber: 8,
      sugar: 10,
      sodium: 420,
      costEuros: 6.80, 
      proteinPerEuro: 4.9 
    },
    category: "lunch",
    tags: ["vegetarian", "vegan", "gluten-free", "dairy-free", "high-protein", "anti-inflammatory", "ayurvedic"],
    ingredients: [
      "200g tempeh (sliced)",
      "1 medium zucchini (sliced)",
      "1 small eggplant (cubed)",
      "2 bell peppers (strips)",
      "2 sprigs fresh thyme",
      "2 sprigs fresh oregano", 
      "¼ cup fresh basil (chopped)",
      "3 cloves garlic (minced)",
      "2 tbsp extra virgin olive oil",
      "1 tbsp balsamic vinegar",
      "Sea salt to taste",
      "2 tbsp tamari",
      "1 tbsp sunflower seeds",
      "1 tbsp pumpkin seeds",
      "1 tbsp sesame seeds"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["zucchini", "eggplant", "bell peppers"],
      benefits: ["High in antioxidants", "Low in calories", "Supports heart health"]
    },
    recipe: {
      instructions: [
        "Slice tempeh into 1cm thick pieces",
        "Marinate tempeh in tamari, minced garlic, and chopped fresh herbs for 15 minutes",
        "Preheat oven to 220°C",
        "Cut vegetables into similar-sized pieces",
        "Toss vegetables with olive oil, salt, fresh thyme, and oregano",
        "Roast vegetables 20 minutes",
        "Pan-fry marinated tempeh until golden, 3-4 minutes each side",
        "Toast seed mix (sunflower, pumpkin, sesame) in dry pan until fragrant",
        "Serve tempeh over roasted vegetables",
        "Sprinkle with toasted seed mix and fresh basil",
        "Drizzle with balsamic vinegar"
      ],
      tips: [
        "Marinating tempeh enhances flavor absorption",
        "Toast seeds just before serving for maximum crunch"
      ],
      notes: "Fresh herb marinade and toasted seeds add layers of flavor and nutrition"
    }
  },

  // Dinner options - Whole Foods Focus
  {
    name: "Herb-crusted stuffed portobello mushrooms with Brussels sprouts and sweet potato",
    portion: "2 large mushrooms + vegetables",
    nutrition: { 
      protein: 24, 
      prepTime: 40, 
      calories: 385,
      carbohydrates: 42,
      fats: 16,
      fiber: 12,
      sugar: 18,
      sodium: 280,
      costEuros: 5.50, 
      proteinPerEuro: 4.4 
    },
    category: "dinner",
    tags: ["vegetarian", "gluten-free", "dairy-free", "high-protein"],
    ingredients: [
      "2 large portobello mushrooms (stems removed)",
      "200g Brussels sprouts (halved)",
      "1 medium sweet potato (cubed)",
      "½ red onion (sliced)",
      "2 sprigs fresh sage",
      "2 sprigs fresh thyme",
      "1 sprig fresh rosemary",
      "3 tbsp extra virgin olive oil",
      "1 lemon (juiced)",
      "3 cloves garlic (minced)",
      "¼ cup toasted walnuts (chopped)",
      "2 tbsp toasted pine nuts",
      "2 tbsp pumpkin seeds",
      "2 tbsp nutritional yeast",
      "¼ cup fresh parsley (chopped)"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3.5,
      vegetables: ["mushrooms", "Brussels sprouts", "sweet potato", "onion"],
      benefits: ["High in vitamin K", "Rich in fiber", "Supports bone health"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 200°C",
        "Remove stems from mushrooms, brush caps with olive oil and fresh herb blend",
        "Halve Brussels sprouts and cube sweet potato",
        "Toss vegetables with olive oil, minced garlic, fresh sage, and thyme",
        "Roast vegetables 15 minutes",
        "Add mushroom caps gill-side up, roast 20 minutes",
        "Make herb-nut topping: mix chopped walnuts, pine nuts, pumpkin seeds with fresh rosemary and parsley",
        "Fill mushrooms with roasted vegetables and herb-nut mixture",
        "Sprinkle with nutritional yeast and squeeze lemon over all"
      ],
      tips: [
        "Toast nuts and seeds beforehand for deeper flavor",
        "Mix herbs just before serving to maintain bright color"
      ],
      notes: "Fresh herbs and toasted nuts elevate this dish with complex flavors and textures"
    }
  },
  {
    name: "Free-range chicken thighs with herb crust and roasted vegetables",
    portion: "2 thighs + vegetables",
    nutrition: { 
      protein: 38, 
      prepTime: 40, 
      calories: 520,
      carbohydrates: 35,
      fats: 28,
      fiber: 8,
      sugar: 14,
      sodium: 420,
      costEuros: 6.50, 
      proteinPerEuro: 5.8 
    },
    category: "dinner",
    tags: ["non-vegetarian", "gluten-free", "dairy-free", "paleo", "high-protein"],
    ingredients: ["free-range chicken thighs", "Brussels sprouts", "sweet potato", "red onion", "fresh sage", "fresh thyme", "fresh rosemary", "olive oil", "lemon", "garlic", "toasted almonds", "sea salt"],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2.5,
      vegetables: ["Brussels sprouts", "sweet potato", "onion"],
      benefits: ["High in vitamin K", "Rich in fiber", "Supports bone health"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 200°C",
        "Make herb blend: finely chop sage, thyme, and rosemary",
        "Season chicken thighs with salt, pepper, and herb blend",
        "Halve Brussels sprouts and cube sweet potato",
        "Toss vegetables with olive oil, garlic, and remaining herbs",
        "Roast vegetables 15 minutes",
        "Add chicken thighs to pan, roast 25-30 minutes",
        "Sprinkle toasted sliced almonds over vegetables",
        "Check internal temperature reaches 75°C",
        "Squeeze fresh lemon over everything before serving"
      ],
      tips: [
        "Free-range chicken has better flavour and nutrition",
        "Toast almonds separately to prevent burning"
      ],
      notes: "Fresh herbs create an aromatic crust while almonds add delightful crunch"
    }
  },
  {
    name: "Wild mushroom and herb quinoa with roasted vegetables",
    portion: "2 servings",
    nutrition: { 
      protein: 32, 
      prepTime: 35, 
      calories: 520,
      carbohydrates: 48,
      fats: 22,
      fiber: 14,
      sugar: 8,
      sodium: 380,
      costEuros: 6.40, 
      proteinPerEuro: 5.0 
    },
    category: "dinner",
    tags: ["vegetarian", "gluten-free", "anti-inflammatory", "high-protein"],
    ingredients: ["quinoa", "mixed wild mushrooms", "fresh herbs (parsley, thyme)", "zucchini", "red bell pepper", "carrots", "red onion", "pine nuts", "olive oil", "vegetable broth", "tahini", "lemon juice", "parmesan cheese", "hemp hearts", "pumpkin seeds", "chickpeas", "nutritional yeast"],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 4,
      vegetables: ["mushrooms", "zucchini", "bell pepper", "carrots", "onion"],
      benefits: ["High in antioxidants", "Supports immune system", "Rich in B vitamins", "High in beta-carotene"]
    },
    recipe: {
      instructions: [
        "Rinse 1 cup quinoa until water runs clear",
        "Toast quinoa in dry pan for 2-3 minutes for nuttier taste",
        "Sauté sliced mushrooms in 1 tbsp olive oil until golden, set aside",
        "Cook quinoa in 2 cups vegetable broth with 1 tbsp olive oil for 15 minutes",
        "Meanwhile, dice zucchini, bell pepper, carrots, and onion",
        "Drain and rinse 1 can chickpeas, pat dry",
        "Toss vegetables and chickpeas with 2 tbsp olive oil, salt, and pepper",
        "Roast vegetables and chickpeas at 200°C for 25 minutes until tender and slightly caramelized",
        "Toast pine nuts and pumpkin seeds in dry pan for 2-3 minutes until golden",
        "Make protein-rich tahini dressing: whisk 2 tbsp tahini, 2 tbsp lemon juice, 1 tbsp olive oil, 1 tbsp nutritional yeast, and 2-3 tbsp water until smooth",
        "Fluff cooked quinoa and mix with extra 1 tbsp olive oil and 2 tbsp hemp hearts",
        "Stir in mushrooms, fresh herbs, and half the tahini dressing",
        "Top with roasted vegetables, chickpeas, toasted pine nuts and pumpkin seeds",
        "Drizzle with remaining tahini dressing and extra olive oil",
        "Finish with freshly grated parmesan cheese and extra nutritional yeast to taste"
      ],
      tips: [
        "Use a variety of mushrooms for complex flavour",
        "Make extra tahini dressing - it keeps quinoa moist and adds protein",
        "Add vegetables while quinoa is still warm so flavors meld together",
        "Hemp hearts and nutritional yeast boost protein while adding nutty flavor",
        "Roasted chickpeas add satisfying crunch and substantial protein"
      ],
      notes: "This protein-enhanced version delivers 32g protein through quinoa, chickpeas, hemp hearts, tahini, and parmesan. The tahini dressing prevents quinoa from being dry while adding healthy fats. Nutritional yeast provides B-vitamins and umami depth. The combination creates a deeply satisfying and appetizing meal."
    }
  },
  {
    name: "Baked cod with Mediterranean vegetables and fresh herbs",
    portion: "180g cod + vegetables",
    nutrition: { 
      protein: 32, 
      prepTime: 30, 
      calories: 420,
      carbohydrates: 18,
      fats: 14,
      fiber: 6,
      sugar: 12,
      sodium: 380,
      costEuros: 7.20, 
      proteinPerEuro: 4.4 
    },
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
  },

  // VIRAL SOCIAL MEDIA RECIPES - Trendy & Instagram-worthy meals
  {
    name: "Green Goddess Salad Bowl",
    portion: "1 serving",
    nutrition: { 
      protein: 22, 
      prepTime: 15, 
      calories: 380,
      carbohydrates: 28,
      fats: 24,
      fiber: 12,
      sugar: 8,
      sodium: 420,
      potassium: 650,
      calcium: 180,
      iron: 3.8,
      vitaminC: 45,
      costEuros: 4.50, 
      proteinPerEuro: 4.9 
    },
    category: "lunch",
    tags: ["vegetarian", "gluten-free", "viral", "social-media", "anti-inflammatory", "keto"],
    ingredients: ["mixed greens", "cucumber", "avocado", "hemp seeds", "pumpkin seeds", "tahini", "lemon", "fresh herbs", "olive oil", "nutritional yeast"],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["mixed greens", "cucumber", "fresh herbs"],
      benefits: ["Instagram-worthy presentation", "Packed with healthy fats", "Viral for good reason - incredibly satisfying"]
    },
    recipe: {
      instructions: [
        "Make viral green goddess dressing: blend tahini, lemon juice, herbs, olive oil, garlic",
        "Arrange mixed greens as base in photogenic bowl",
        "Add sliced cucumber in rows for visual appeal",
        "Fan out avocado slices artistically",
        "Sprinkle hemp seeds and pumpkin seeds generously",
        "Drizzle green goddess dressing in Instagram-worthy pattern",
        "Finish with nutritional yeast for umami flavor"
      ],
      tips: ["Use a white bowl for best photo contrast", "Arrange ingredients in sections for viral aesthetic", "This recipe went viral for its incredible taste and nutrition"],
      notes: "This salad became TikTok famous for being both incredibly photogenic and satisfying"
    }
  },

  {
    name: "Cottage Cheese Bowl",
    portion: "1 serving",
    nutrition: { 
      protein: 34, 
      prepTime: 5, 
      calories: 420,
      carbohydrates: 32,
      fats: 18,
      fiber: 8,
      sugar: 24,
      sodium: 380,
      potassium: 480,
      calcium: 280,
      iron: 2.1,
      vitaminC: 35,
      costEuros: 3.20, 
      proteinPerEuro: 10.6 
    },
    category: "breakfast",
    tags: ["vegetarian", "viral", "social-media", "high-protein", "probiotic", "dairy"],
    ingredients: ["cottage cheese", "fresh berries", "honey", "granola", "chia seeds", "cinnamon", "vanilla extract"],
    wholeFoodLevel: "moderate",
    vegetableContent: {
      servings: 1,
      vegetables: ["berries"],
      benefits: ["Viral protein powerhouse", "Perfect for content creators", "Trending for incredible protein content"]
    },
    recipe: {
      instructions: [
        "Place 200g cottage cheese in aesthetic bowl",
        "Mix in vanilla extract and cinnamon for flavor",
        "Top with fresh mixed berries in pretty arrangement",
        "Drizzle honey in decorative pattern",
        "Sprinkle granola and chia seeds for crunch",
        "Style for photo before eating!"
      ],
      tips: ["This went viral for having 34g protein in one bowl", "Perfect for fitness influencers", "The trend started because it's incredibly filling"],
      notes: "Cottage cheese bowls exploded on social media for their incredible protein content and versatility"
    }
  },

  {
    name: "Marry Me Mushroom Pasta",
    portion: "1 serving",
    nutrition: { 
      protein: 28, 
      prepTime: 25, 
      calories: 520,
      carbohydrates: 48,
      fats: 26,
      fiber: 8,
      sugar: 8,
      sodium: 580,
      potassium: 920,
      calcium: 180,
      iron: 4.2,
      vitaminC: 12,
      costEuros: 4.80, 
      proteinPerEuro: 5.8 
    },
    category: "dinner",
    tags: ["vegetarian", "viral", "social-media", "high-protein", "comfort-food"],
    ingredients: ["king oyster mushrooms", "pasta", "sun-dried tomatoes", "cashew cream", "nutritional yeast", "garlic", "herbs", "vegetable broth"],
    wholeFoodLevel: "moderate",
    vegetableContent: {
      servings: 2,
      vegetables: ["mushrooms", "sun-dried tomatoes", "garlic", "herbs"],
      benefits: ["Social media sensation adapted for vegetarians", "Named for being so good it'll make someone propose", "Viral comfort food at its finest"]
    },
    recipe: {
      instructions: [
        "Make cashew cream: Soak 1/2 cup raw cashews in hot water for 30 minutes, then drain and blend with 1/3 cup water until smooth and creamy",
        "Slice king oyster mushrooms thick and sear until golden (viral technique for meaty texture)",
        "Remove mushrooms, sauté garlic in same pan",
        "Add sun-dried tomatoes and a splash of vegetable broth",
        "Pour in the prepared cashew cream, add nutritional yeast for viral creamy sauce",
        "Return mushrooms to pan, simmer until heated through",
        "Serve over pasta with fresh herbs for Instagram appeal"
      ],
      tips: ["Called 'Marry Me' because it's proposal-worthy", "This vegetarian version went viral for being just as good as the original", "Perfect for date night content"],
      notes: "This plant-based version maintains all the viral appeal while being completely vegetarian. For gluten-free diets, simply substitute with gluten-free pasta (rice, corn, or chickpea pasta work perfectly)."
    }
  },

  {
    name: "Cucumber Salad with Edamame and Hemp Hearts",
    portion: "1 serving",
    nutrition: { 
      protein: 16, 
      prepTime: 12, 
      calories: 265,
      carbohydrates: 16,
      fats: 16,
      fiber: 8,
      sugar: 8,
      sodium: 540,
      potassium: 420,
      calcium: 85,
      iron: 2.8,
      vitaminC: 28,
      costEuros: 3.20, 
      proteinPerEuro: 5.0 
    },
    category: "lunch",
    tags: ["vegetarian", "gluten-free", "viral", "social-media", "protein-rich", "refreshing"],
    ingredients: [
      "2 large cucumbers (sliced)",
      "80g cooked edamame beans", 
      "2 tbsp hemp hearts",
      "3 tbsp rice vinegar", 
      "2 tbsp soy sauce", 
      "1 tbsp sesame oil", 
      "2 cloves garlic (minced)", 
      "1/2 tsp chili flakes", 
      "1 tbsp sesame seeds"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["cucumbers"],
      benefits: ["TikTok viral sensation", "Incredibly refreshing and hydrating", "Perfect for hot weather content"]
    },
    recipe: {
      instructions: [
        "Slice cucumbers thin using viral TikTok technique",
        "Salt cucumbers and let drain for 10 minutes",
        "If using frozen edamame, cook according to package directions and cool",
        "Mix rice vinegar, soy sauce, sesame oil, minced garlic",
        "Toss cucumbers and edamame with dressing",
        "Top with hemp hearts, chili flakes and sesame seeds",
        "Let marinate for viral flavor development"
      ],
      tips: ["This salad broke TikTok for being addictively delicious", "The key is the perfect balance of salty, sour, and spicy", "Many creators make this daily"],
      notes: "This cucumber salad went massively viral on TikTok for being incredibly simple yet addictive"
    }
  },

  {
    name: "Cloud Bread",
    portion: "4 pieces",
    nutrition: { 
      protein: 24, 
      prepTime: 35, 
      calories: 280,
      carbohydrates: 4,
      fats: 18,
      fiber: 0,
      sugar: 2,
      sodium: 380,
      potassium: 180,
      calcium: 85,
      iron: 1.8,
      vitaminC: 0,
      costEuros: 1.80, 
      proteinPerEuro: 13.3 
    },
    category: "breakfast",
    tags: ["vegetarian", "gluten-free", "viral", "social-media", "keto", "low-carb"],
    ingredients: ["eggs", "cream cheese", "baking powder", "salt"],
    wholeFoodLevel: "minimal",
    vegetableContent: {
      servings: 0,
      vegetables: [],
      benefits: ["Instagram sensation for cloud-like appearance", "Keto community favorite", "Viral for looking impossible"]
    },
    recipe: {
      instructions: [
        "Separate 3 eggs (viral technique: use the shell to separate)",
        "Whip egg whites to stiff peaks for viral cloud effect",
        "Mix egg yolks with softened cream cheese until smooth",
        "Gently fold yolk mixture into whites to maintain fluffiness",
        "Bake at 300°F for 30 minutes until golden and cloud-like",
        "Cool before serving for best viral texture"
      ],
      tips: ["Went viral for looking like literal clouds", "The folding technique is crucial for viral fluffiness", "Perfect for keto and low-carb content creators"],
      notes: "Cloud bread became a social media sensation for its impossible cloud-like appearance and keto-friendly nature"
    }
  },

  // Additional herb-enhanced options for balanced variety
  {
    name: "Herb-marinated chicken breast with roasted vegetables and pine nuts",
    portion: "150g chicken + vegetables",
    nutrition: { 
      protein: 36, 
      calories: 420, 
      carbohydrates: 15, 
      fats: 18, 
      fiber: 8, 
      sugar: 4, 
      sodium: 320,
      prepTime: 30, 
      costEuros: 6.80, 
      proteinPerEuro: 5.3 
    },
    category: "lunch",
    tags: ["non-vegetarian", "gluten-free", "dairy-free", "paleo", "high-protein"],
    ingredients: ["free-range chicken breast", "mixed vegetables", "fresh rosemary", "fresh thyme", "fresh sage", "garlic", "olive oil", "lemon", "toasted pine nuts", "sea salt", "black pepper"],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2.5,
      vegetables: ["mixed seasonal vegetables"],
      benefits: ["High in vitamins", "Lean protein source", "Supports muscle health"]
    },
    recipe: {
      instructions: [
        "Marinate chicken in herbs, garlic, olive oil and lemon for 20 minutes",
        "Preheat oven to 200°C",
        "Cut vegetables into similar-sized pieces",
        "Toss vegetables with olive oil, salt, and fresh herbs",
        "Roast vegetables 15 minutes",
        "Sear marinated chicken in pan until golden, 2-3 minutes each side",
        "Transfer chicken to oven with vegetables, roast 15-20 minutes",
        "Toast pine nuts until golden and fragrant",
        "Slice chicken and serve over vegetables with toasted pine nuts",
        "Check internal temperature reaches 75°C"
      ],
      tips: [
        "Marinating with fresh herbs creates deeper flavor",
        "Toast pine nuts just before serving for maximum crunch"
      ],
      notes: "Fresh herb marinade and toasted pine nuts elevate simple chicken to restaurant quality"
    }
  },

  // Quick weekday dinner options for complex dietary restrictions
  {
    name: "Quick veggie stir-fry with rice noodles, tofu and tahini sauce",
    portion: "2 servings",
    nutrition: { 
      protein: 28, 
      prepTime: 25, 
      calories: 520,
      carbohydrates: 58,
      fats: 18,
      fiber: 9,
      sugar: 12,
      sodium: 420,
      costEuros: 5.40, 
      proteinPerEuro: 5.2 
    },
    category: "dinner",
    tags: ["vegetarian", "vegan", "gluten-free", "lactose-free", "quick", "colorful", "high-protein"],
    ingredients: [
      "200g rice noodles",
      "200g firm tofu (cubed)",
      "1 red bell pepper (sliced)",
      "1 zucchini (sliced)",
      "150g sugar snaps",
      "2 carrots (julienned)",
      "3 tbsp tahini",
      "2 tbsp gluten-free soy sauce",
      "1 tbsp rice vinegar",
      "2 tsp sesame oil",
      "2 cloves garlic (minced)",
      "1 tsp fresh ginger (grated)",
      "2 green onions (chopped)",
      "1 tbsp cornstarch (for tofu coating)"
    ],
    wholeFoodLevel: "moderate",
    vegetableContent: {
      servings: 4,
      vegetables: ["bell pepper", "zucchini", "sugar snaps", "carrots"],
      benefits: ["High in vitamin C", "Rich in beta-carotene", "Good source of fiber"]
    },
    recipe: {
      instructions: [
        "Soak rice noodles in hot water for 8-10 minutes until tender",
        "Press tofu to remove excess water, then cube and toss with cornstarch",
        "Heat 1 tsp sesame oil in large wok over high heat",
        "Cook tofu cubes until golden and crispy on all sides, about 4 minutes - remove and set aside",
        "Add remaining sesame oil to wok, stir-fry bell pepper and carrots for 2 minutes",
        "Add zucchini and sugar snaps, stir-fry 3 minutes more",
        "Add minced garlic and ginger, cook 30 seconds",
        "Return crispy tofu to wok with vegetables",
        "Whisk tahini, soy sauce, and rice vinegar in small bowl",
        "Drain noodles and add to wok with vegetables and tofu",
        "Pour tahini sauce over noodles and toss until coated",
        "Garnish with chopped green onions and serve immediately"
      ],
      tips: [
        "Press tofu for at least 15 minutes for best texture",
        "Cornstarch coating makes tofu extra crispy",
        "Keep vegetables crisp by cooking on high heat"
      ],
      notes: "Protein-packed stir-fry with crispy tofu ready in 25 minutes"
    }
  },

  {
    name: "Speedy chickpea curry with coconut milk and quinoa",
    portion: "2 servings",
    nutrition: { 
      protein: 22, 
      prepTime: 25, 
      calories: 480,
      carbohydrates: 62,
      fats: 16,
      fiber: 12,
      sugar: 8,
      sodium: 420,
      costEuros: 3.80, 
      proteinPerEuro: 5.8 
    },
    category: "dinner",
    tags: ["vegetarian", "vegan", "gluten-free", "lactose-free", "quick", "protein-rich"],
    ingredients: [
      "1 cup quinoa",
      "1 can (400g) chickpeas (drained)",
      "1 can (200ml) coconut milk",
      "1 onion (diced)",
      "2 cloves garlic (minced)",
      "1 tsp curry powder",
      "1/2 tsp turmeric",
      "1/2 tsp cumin",
      "1 can (400g) diced tomatoes",
      "2 tbsp olive oil",
      "1 tsp fresh ginger (grated)",
      "Fresh cilantro for garnish"
    ],
    wholeFoodLevel: "moderate",
    vegetableContent: {
      servings: 2,
      vegetables: ["onion", "tomatoes"],
      benefits: ["Anti-inflammatory", "Rich in lycopene", "Immune supporting"]
    },
    recipe: {
      instructions: [
        "Cook quinoa in 2 cups water for 15 minutes",
        "Heat olive oil in large pan over medium heat",
        "Sauté diced onion until soft, about 4 minutes",
        "Add garlic, ginger, curry powder, turmeric, and cumin - cook 1 minute",
        "Add diced tomatoes and simmer 5 minutes",
        "Stir in drained chickpeas and coconut milk",
        "Simmer 8-10 minutes until thickened",
        "Season with salt and pepper to taste",
        "Serve over quinoa, garnish with fresh cilantro"
      ],
      tips: [
        "Toast spices briefly for deeper flavor",
        "Use lite coconut milk for lighter version"
      ],
      notes: "Protein-packed comfort food ready in 25 minutes"
    }
  },

  {
    name: "Mediterranean quinoa bowl with roasted vegetables",
    portion: "2 servings",
    nutrition: { 
      protein: 16, 
      prepTime: 30, 
      calories: 440,
      carbohydrates: 58,
      fats: 18,
      fiber: 10,
      sugar: 14,
      sodium: 320,
      costEuros: 4.60, 
      proteinPerEuro: 3.5 
    },
    category: "dinner",
    tags: ["vegetarian", "vegan", "gluten-free", "lactose-free", "mediterranean", "colorful"],
    ingredients: [
      "1 cup quinoa",
      "1 zucchini (diced)",
      "1 red bell pepper (diced)",
      "1 red onion (sliced)",
      "150g cherry tomatoes (halved)",
      "3 tbsp olive oil",
      "2 tbsp tahini",
      "1 lemon (juiced)",
      "2 cloves garlic (minced)",
      "1/4 cup pine nuts",
      "2 tbsp fresh parsley (chopped)",
      "1 tsp oregano"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["zucchini", "bell pepper", "onion", "tomatoes"],
      benefits: ["High in antioxidants", "Rich in vitamin C", "Heart healthy"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 200°C",
        "Cook quinoa in 2 cups water for 15 minutes",
        "Toss diced vegetables with 2 tbsp olive oil, salt, and oregano",
        "Roast vegetables for 20 minutes until tender",
        "Whisk tahini, lemon juice, garlic, and remaining olive oil",
        "Toast pine nuts in dry pan for 2 minutes",
        "Fluff cooked quinoa and mix with roasted vegetables",
        "Drizzle with tahini dressing",
        "Top with toasted pine nuts and fresh parsley"
      ],
      tips: [
        "Cut vegetables evenly for consistent cooking",
        "Don't overcrowd the roasting pan"
      ],
      notes: "Fresh Mediterranean flavors in 30 minutes"
    }
  },

  {
    name: "Quick black bean and sweet potato hash",
    portion: "2 servings",
    nutrition: { 
      protein: 20, 
      prepTime: 25, 
      calories: 460,
      carbohydrates: 68,
      fats: 12,
      fiber: 16,
      sugar: 18,
      sodium: 380,
      costEuros: 3.20, 
      proteinPerEuro: 6.3 
    },
    category: "dinner",
    tags: ["vegetarian", "vegan", "gluten-free", "lactose-free", "quick", "high-fiber"],
    ingredients: [
      "1 large sweet potato (cubed)",
      "1 can (400g) black beans (drained)",
      "1 red bell pepper (diced)",
      "1 onion (diced)",
      "2 cloves garlic (minced)",
      "3 tbsp olive oil",
      "1 tsp cumin",
      "1/2 tsp paprika",
      "1/4 tsp chili powder",
      "2 tbsp fresh lime juice",
      "1/4 cup fresh cilantro (chopped)",
      "1 avocado (sliced)"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["sweet potato", "bell pepper", "onion"],
      benefits: ["High in beta-carotene", "Rich in potassium", "Anti-inflammatory"]
    },
    recipe: {
      instructions: [
        "Heat olive oil in large skillet over medium-high heat",
        "Add cubed sweet potato and cook 10 minutes, stirring occasionally",
        "Add diced onion and bell pepper, cook 5 minutes",
        "Add garlic, cumin, paprika, and chili powder - cook 1 minute",
        "Add drained black beans and cook 5 minutes until heated",
        "Season with salt, pepper, and lime juice",
        "Garnish with fresh cilantro and sliced avocado",
        "Serve immediately while hot"
      ],
      tips: [
        "Cut sweet potato small for faster cooking",
        "Don't overcook vegetables - keep them slightly crisp"
      ],
      notes: "Satisfying one-pan dinner with complete protein from beans"
    }
  },

  {
    name: "Asian-style vegetable fried rice with tofu",
    portion: "2 servings",
    nutrition: { 
      protein: 24, 
      prepTime: 20, 
      calories: 440,
      carbohydrates: 52,
      fats: 16,
      fiber: 6,
      sugar: 8,
      sodium: 480,
      costEuros: 4.40, 
      proteinPerEuro: 5.5 
    },
    category: "dinner",
    tags: ["vegetarian", "vegan", "gluten-free", "lactose-free", "quick", "asian"],
    ingredients: [
      "2 cups cooked brown rice (day-old preferred)",
      "200g firm tofu (cubed)",
      "2 eggs or flax eggs for vegan option",
      "1 cup frozen mixed vegetables",
      "2 green onions (chopped)",
      "2 cloves garlic (minced)",
      "1 tsp fresh ginger (grated)",
      "3 tbsp gluten-free soy sauce",
      "2 tbsp sesame oil",
      "1 tbsp rice vinegar",
      "1 tsp sesame seeds"
    ],
    wholeFoodLevel: "moderate",
    vegetableContent: {
      servings: 2,
      vegetables: ["mixed vegetables", "green onions"],
      benefits: ["Balanced nutrition", "Quick energy", "Good source of fiber"]
    },
    recipe: {
      instructions: [
        "Heat 1 tbsp sesame oil in large wok or skillet",
        "Add cubed tofu and cook until golden, about 5 minutes",
        "Push tofu to one side, scramble eggs on other side",
        "Add garlic and ginger, cook 30 seconds",
        "Add day-old rice, breaking up clumps",
        "Stir in frozen vegetables and cook 3 minutes",
        "Add soy sauce, remaining sesame oil, and rice vinegar",
        "Toss everything together for 2 minutes",
        "Garnish with green onions and sesame seeds"
      ],
      tips: [
        "Use day-old rice for best texture",
        "Keep heat high for proper 'wok hei' flavor"
      ],
      notes: "Quick takeout-style dinner made healthy at home"
    }
  },

  // Quick Ayurvedic lunch and dinner options
  {
    name: "Ayurvedic spiced lentil dal with cumin and turmeric",
    portion: "2 servings",
    nutrition: { 
      protein: 22, 
      prepTime: 25, 
      calories: 380,
      carbohydrates: 58,
      fats: 8,
      fiber: 14,
      sugar: 6,
      sodium: 320,
      costEuros: 2.80, 
      proteinPerEuro: 7.9 
    },
    category: "dinner",
    tags: ["vegetarian", "vegan", "gluten-free", "lactose-free", "ayurvedic", "quick", "warming"],
    ingredients: [
      "1 cup red lentils (masoor dal)",
      "1/2 cup basmati rice",
      "1 tsp turmeric",
      "1 tsp cumin seeds",
      "1/2 tsp coriander seeds",
      "1 tsp fresh ginger (grated)",
      "2 cloves garlic (minced)",
      "1 tbsp ghee or coconut oil",
      "1/2 tsp asafoetida (hing)",
      "1 tsp mustard seeds",
      "Fresh cilantro for garnish",
      "1 lemon (juiced)"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1,
      vegetables: ["garlic", "ginger"],
      benefits: ["Digestive support", "Anti-inflammatory", "Warming for constitution"]
    },
    recipe: {
      instructions: [
        "Rinse lentils and cook with turmeric in 3 cups water for 15 minutes",
        "Cook basmati rice separately in 1 cup water for 12 minutes",
        "Heat ghee in pan, add mustard seeds until they pop",
        "Add cumin and coriander seeds, toast 30 seconds",
        "Add ginger, garlic, and asafoetida, cook 1 minute",
        "Add cooked lentils and simmer 5 minutes",
        "Season with salt and lemon juice",
        "Serve over rice, garnish with fresh cilantro"
      ],
      tips: [
        "Toast whole spices for deeper flavor",
        "Add ghee at the end for better digestion according to Ayurveda"
      ],
      notes: "Classical Ayurvedic meal that balances all three doshas"
    }
  },

  {
    name: "Quick Ayurvedic kitchari with mung beans and basmati rice",
    portion: "2 servings",
    nutrition: { 
      protein: 18, 
      prepTime: 30, 
      calories: 360,
      carbohydrates: 55,
      fats: 10,
      fiber: 12,
      sugar: 4,
      sodium: 280,
      costEuros: 3.20, 
      proteinPerEuro: 5.6 
    },
    category: "lunch",
    tags: ["vegetarian", "vegan", "gluten-free", "lactose-free", "ayurvedic", "digestive", "warming"],
    ingredients: [
      "1/2 cup split mung beans (moong dal)",
      "1/2 cup basmati rice",
      "1 tsp turmeric",
      "1 tsp cumin seeds",
      "1 tsp fresh ginger (grated)",
      "1 tbsp ghee or coconut oil",
      "1/2 tsp rock salt or sea salt",
      "1 tsp coriander seeds",
      "1/2 tsp fennel seeds",
      "Fresh cilantro leaves",
      "1 lime (juiced)"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1,
      vegetables: ["ginger"],
      benefits: ["Easy to digest", "Cleansing properties", "Balances all doshas"]
    },
    recipe: {
      instructions: [
        "Rinse mung beans and rice together until water runs clear",
        "Heat ghee in heavy-bottomed pot",
        "Add cumin, coriander, and fennel seeds, toast until fragrant",
        "Add ginger and turmeric, cook 30 seconds",
        "Add mung beans and rice, stir to coat with spices",
        "Add 4 cups water and bring to boil",
        "Reduce heat and simmer 20-25 minutes until creamy",
        "Season with salt and lime juice",
        "Garnish with fresh cilantro"
      ],
      tips: [
        "Consistency should be like a thick soup",
        "Perfect one-pot meal for digestive rest"
      ],
      notes: "Traditional Ayurvedic healing food, excellent for detox and easy digestion"
    }
  },

  {
    name: "Warm spiced quinoa bowl with roasted root vegetables",
    portion: "2 servings",
    nutrition: { 
      protein: 16, 
      prepTime: 28, 
      calories: 420,
      carbohydrates: 62,
      fats: 14,
      fiber: 10,
      sugar: 16,
      sodium: 300,
      costEuros: 4.20, 
      proteinPerEuro: 3.8 
    },
    category: "dinner",
    tags: ["vegetarian", "vegan", "gluten-free", "lactose-free", "ayurvedic", "warming", "grounding"],
    ingredients: [
      "1 cup quinoa",
      "1 large sweet potato (cubed)",
      "2 large carrots (sliced)",
      "1 beet (cubed)",
      "2 tbsp ghee or coconut oil",
      "1 tsp cumin powder",
      "1/2 tsp cinnamon",
      "1/2 tsp turmeric",
      "1 tsp fresh ginger (grated)",
      "2 tbsp tahini",
      "1 lemon (juiced)",
      "Fresh mint leaves"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["sweet potato", "carrots", "beet"],
      benefits: ["Grounding for Vata", "Warming spices", "Rich in beta-carotene"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 200°C",
        "Cube root vegetables evenly",
        "Toss vegetables with ghee, cumin, cinnamon, and turmeric",
        "Roast for 25 minutes until tender",
        "Meanwhile, cook quinoa in 2 cups water for 15 minutes",
        "Whisk tahini with lemon juice and ginger",
        "Combine warm quinoa with roasted vegetables",
        "Drizzle with tahini dressing",
        "Garnish with fresh mint"
      ],
      tips: [
        "Sweet warming spices balance Vata dosha",
        "Eat warm for better digestion"
      ],
      notes: "Grounding meal perfect for fall and winter seasons in Ayurveda"
    }
  },

  {
    name: "Quick Ayurvedic mung bean and vegetable curry",
    portion: "2 servings",
    nutrition: { 
      protein: 20, 
      prepTime: 22, 
      calories: 340,
      carbohydrates: 48,
      fats: 10,
      fiber: 14,
      sugar: 8,
      sodium: 350,
      costEuros: 3.40, 
      proteinPerEuro: 5.9 
    },
    category: "lunch",
    tags: ["vegetarian", "vegan", "gluten-free", "lactose-free", "ayurvedic", "quick", "digestive"],
    ingredients: [
      "1 cup whole mung beans (soaked overnight)",
      "1 zucchini (diced)",
      "1 carrot (diced)",
      "1 tsp turmeric",
      "1 tsp cumin seeds",
      "1 tsp coriander powder",
      "1/2 tsp garam masala",
      "1 tbsp ghee or coconut oil",
      "1 tsp fresh ginger (grated)",
      "2 cloves garlic (minced)",
      "1 tomato (chopped)",
      "Fresh curry leaves (optional)"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["zucchini", "carrot", "tomato"],
      benefits: ["Easy to digest protein", "Anti-inflammatory", "Balancing for Pitta"]
    },
    recipe: {
      instructions: [
        "Drain soaked mung beans and pressure cook 10 minutes",
        "Heat ghee in pan, add cumin seeds until fragrant",
        "Add ginger, garlic, and curry leaves, cook 1 minute",
        "Add diced vegetables and cook 5 minutes",
        "Add turmeric, coriander, and garam masala",
        "Add cooked mung beans with cooking liquid",
        "Add chopped tomato and simmer 8 minutes",
        "Season with salt and serve warm"
      ],
      tips: [
        "Soaking mung beans overnight improves digestibility",
        "Fresh curry leaves add authentic Ayurvedic flavor"
      ],
      notes: "Light but nourishing curry ideal for Pitta constitution"
    }
  },

  {
    name: "Warming ginger-turmeric vegetable stir-fry with brown rice",
    portion: "1.5 cups stir-fry with rice",
    nutrition: { 
      protein: 14, 
      prepTime: 20, 
      calories: 380,
      carbohydrates: 58,
      fats: 12,
      fiber: 8,
      sugar: 10,
      sodium: 320,
      costEuros: 3.80, 
      proteinPerEuro: 3.7 
    },
    category: "dinner",
    tags: ["vegetarian", "vegan", "gluten-free", "lactose-free", "ayurvedic", "quick", "warming"],
    ingredients: [
      "1 cup cooked brown rice",
      "1 bell pepper (sliced)",
      "1 zucchini (sliced)",
      "150g green beans",
      "2 tbsp ghee or coconut oil",
      "1 tbsp fresh ginger (julienned)",
      "1 tsp turmeric",
      "1 tsp cumin seeds",
      "1/2 tsp black mustard seeds",
      "1/4 tsp asafoetida",
      "2 tbsp fresh cilantro",
      "1 lime (juiced)"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["bell pepper", "zucchini", "green beans"],
      benefits: ["Warming spices", "Digestive fire boost", "Antioxidant-rich"]
    },
    recipe: {
      instructions: [
        "Heat ghee in large wok or skillet",
        "Add mustard seeds and cumin seeds, let pop",
        "Add julienned ginger and asafoetida, cook 30 seconds",
        "Add green beans first, stir-fry 3 minutes",
        "Add bell pepper and zucchini, stir-fry 4 minutes",
        "Sprinkle turmeric and mix well",
        "Add pre-cooked brown rice and toss 2 minutes",
        "Season with salt and lime juice",
        "Garnish with fresh cilantro"
      ],
      tips: [
        "Keep vegetables slightly crisp for better texture",
        "Fresh ginger is essential for digestive fire"
      ],
      notes: "Warming meal that kindles digestive fire according to Ayurveda"
    }
  },

  // Cooling summer ayurvedic meals for grishma season
  {
    name: "Cooling cucumber and mint quinoa salad with coconut",
    portion: "1.5 cups quinoa salad",
    nutrition: { 
      protein: 18, 
      prepTime: 20, 
      calories: 340,
      carbohydrates: 48,
      fats: 11,
      fiber: 7,
      sugar: 6,
      sodium: 220,
      costEuros: 3.60, 
      proteinPerEuro: 5.0 
    },
    category: "lunch",
    tags: ["vegetarian", "vegan", "gluten-free", "lactose-free", "ayurvedic", "cooling", "quick"],
    ingredients: [
      "1 cup cooked quinoa (cooled)",
      "1 cucumber (diced)",
      "1/2 cup fresh mint leaves",
      "1/4 cup coconut flakes",
      "2 tbsp coconut oil",
      "1 lime (juiced)",
      "1/2 tsp ground coriander",
      "1/4 tsp fennel powder",
      "Fresh cilantro",
      "Sea salt to taste",
      "1/4 cup pumpkin seeds"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["cucumber"],
      benefits: ["Hydrating cucumber", "Cooling mint", "Alkalizing quinoa"]
    },
    recipe: {
      instructions: [
        "Cook quinoa and let cool completely",
        "Dice cucumber and mix with lime juice",
        "Chop fresh mint and cilantro finely",
        "Combine quinoa, cucumber, herbs, and coconut flakes",
        "Mix coriander and fennel with coconut oil",
        "Toss salad with spiced oil dressing",
        "Top with pumpkin seeds for protein",
        "Serve at room temperature or chilled"
      ],
      tips: [
        "Prepare ahead and serve cool for maximum cooling effect",
        "Add extra mint for enhanced pitta-balancing properties"
      ],
      notes: "Perfect cooling meal for grishma season following Ayurvedic summer principles"
    }
  },

  {
    name: "Fresh coconut and herb steamed vegetables with basmati rice",
    portion: "1.5 cups vegetables with rice",
    nutrition: { 
      protein: 14, 
      prepTime: 25, 
      calories: 330,
      carbohydrates: 52,
      fats: 10,
      fiber: 8,
      sugar: 8,
      sodium: 240,
      costEuros: 3.40, 
      proteinPerEuro: 4.1 
    },
    category: "dinner",
    tags: ["vegetarian", "vegan", "gluten-free", "lactose-free", "ayurvedic", "cooling"],
    ingredients: [
      "1 cup basmati rice",
      "2 cups mixed green vegetables (zucchini, green beans, spinach)",
      "1/4 cup fresh coconut (grated)",
      "2 tbsp coconut oil",
      "1/2 tsp ground coriander",
      "1/4 tsp fennel seeds",
      "Fresh mint leaves",
      "Fresh cilantro",
      "1 lime (juiced)",
      "Sea salt to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["zucchini", "green beans", "spinach"],
      benefits: ["Cooling green vegetables", "Fresh coconut", "Light steaming preserves nutrients"]
    },
    recipe: {
      instructions: [
        "Steam basmati rice until fluffy",
        "Steam vegetables lightly to retain cooling properties",
        "Heat coconut oil gently, add fennel seeds",
        "Add coriander powder and cook 30 seconds",
        "Toss steamed vegetables with spiced oil",
        "Mix in fresh coconut and herbs",
        "Serve over rice with lime juice",
        "Garnish with fresh mint for cooling effect"
      ],
      tips: [
        "Steam vegetables minimally to preserve cooling qualities",
        "Serve at moderate temperature, not hot"
      ],
      notes: "Authentic summer Ayurvedic preparation emphasizing cooling and fresh ingredients"
    }
  },

  {
    name: "Cooling mung bean and fresh vegetable curry with coconut milk",
    portion: "2 servings",
    nutrition: { 
      protein: 20, 
      prepTime: 28, 
      calories: 380,
      carbohydrates: 45,
      fats: 12,
      fiber: 15,
      sugar: 8,
      sodium: 290,
      costEuros: 3.80, 
      proteinPerEuro: 5.3 
    },
    category: "dinner",
    tags: ["vegetarian", "vegan", "gluten-free", "lactose-free", "ayurvedic", "cooling", "quick"],
    ingredients: [
      "1 cup whole mung beans (soaked 4 hours)",
      "1 zucchini (diced)",
      "1 cup spinach leaves",
      "1/2 cup coconut milk",
      "1/2 tsp ground coriander",
      "1/4 tsp fennel powder",
      "2 tbsp coconut oil",
      "Fresh cilantro",
      "Fresh mint leaves",
      "1 lime (juiced)",
      "Sea salt to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2.5,
      vegetables: ["zucchini", "spinach"],
      benefits: ["Easy to digest protein", "Cooling vegetables", "Balancing for Pitta"]
    },
    recipe: {
      instructions: [
        "Cook soaked mung beans until tender (15 minutes)",
        "Heat coconut oil gently in pan",
        "Add coriander and fennel powder, cook 30 seconds",
        "Add diced zucchini and cook 3 minutes",
        "Add cooked mung beans with cooking liquid",
        "Simmer 5 minutes, add coconut milk",
        "Stir in spinach during last minute",
        "Finish with lime juice and fresh herbs"
      ],
      tips: [
        "Keep cooking gentle to maintain cooling qualities",
        "Coconut milk provides natural cooling properties"
      ],
      notes: "Summer-appropriate Ayurvedic curry designed for pitta-balancing during grishma season"
    }
  },

  // Fresh summer vegetable and coconut milk soup (ayurvedic cooling)
  {
    name: "Fresh summer vegetable and coconut milk soup with lentils",
    portion: "1 portion (large bowl with quinoa)",
    nutrition: {
      protein: 20,
      prepTime: 25,
      calories: 365,
      carbohydrates: 48,
      fats: 10,
      fiber: 14,
      sugar: 12,
      sodium: 340,
      costEuros: 3.60,
      proteinPerEuro: 5.6
    },
    category: 'lunch',
    tags: ['vegetarian', 'vegan', 'gluten-free', 'lactose-free', 'ayurvedic', 'cooling', 'quick', 'high-protein'],
    ingredients: [
      '1 cup mixed summer vegetables (zucchini, cucumber, fresh corn)',
      '1/2 cup coconut milk',
      '1/4 cup cooked quinoa',
      '1/2 cup cooked red lentils',
      '1 tbsp coconut oil',
      '1/2 tsp fennel seeds',
      '1 cup vegetable broth',
      '2 tbsp fresh cilantro',
      '1 tbsp fresh mint',
      '1/2 lime (juice)',
      'Sea salt to taste'
    ],
    wholeFoodLevel: 'high',
    vegetableContent: {
      servings: 2,
      vegetables: ['zucchini', 'cucumber', 'fresh corn'],
      benefits: ['hydrating vegetables', 'cooling nature', 'easy digestion']
    },
    recipe: {
      instructions: [
        'Heat coconut oil gently, add fennel seeds until fragrant',
        'Add diced summer vegetables, sauté lightly for 3 minutes',
        'Pour in vegetable broth, bring to gentle simmer',
        'Add cooked red lentils and coconut milk, warm through',
        'Stir in cooked quinoa to heat through',
        'Stir in fresh herbs and lime juice off heat',
        'Serve warm or at room temperature'
      ],
      tips: [
        'Keep vegetables slightly crisp for cooling properties',
        'Can be served at room temperature in hot weather',
        'Fresh herbs preserve cooling qualities when added last'
      ],
      notes: 'Light, cooling soup perfect for summer. The combination of fresh vegetables, coconut milk, and cooling herbs supports digestion while providing hydration.'
    }
  },

  // Cooling cucumber and mint raita with quinoa (ayurvedic summer)
  {
    name: "Cooling cucumber and mint raita with quinoa",
    portion: "1 serving",
    nutrition: {
      protein: 14,
      prepTime: 15,
      calories: 245,
      carbohydrates: 35,
      fats: 6,
      fiber: 8,
      sugar: 8,
      sodium: 280,
      costEuros: 2.20,
      proteinPerEuro: 6.4
    },
    category: 'lunch',
    tags: ['vegetarian', 'gluten-free', 'lactose-free', 'ayurvedic', 'cooling', 'quick'],
    ingredients: [
      '1 large cucumber, diced',
      '1/2 cup cooked quinoa',
      '1/2 cup coconut yogurt',
      '2 tbsp fresh mint leaves',
      '1 tbsp fresh cilantro',
      '1/2 tsp fennel powder',
      '1/4 tsp rock salt',
      '1/2 lime (juice)',
      '1 tbsp hemp hearts',
      '1 tsp coconut oil'
    ],
    wholeFoodLevel: 'high',
    vegetableContent: {
      servings: 2,
      vegetables: ['cucumber'],
      benefits: ['extremely cooling', 'hydrating', 'digestive support']
    },
    recipe: {
      instructions: [
        'Cook quinoa and let cool to room temperature',
        'Dice cucumber finely, sprinkle with rock salt, set aside 5 minutes',
        'Whisk coconut yogurt with fennel powder and lime juice',
        'Drain excess water from cucumber',
        'Mix quinoa, cucumber, yogurt mixture, and fresh herbs',
        'Top with hemp hearts and a drizzle of coconut oil'
      ],
      tips: [
        'Salt the cucumber to remove excess water and concentrate cooling properties',
        'Serve chilled or at room temperature',
        'Best consumed fresh for maximum cooling effect'
      ],
      notes: 'Extremely cooling dish perfect for hot summer days. Cucumber and mint provide immediate cooling while fennel supports gentle digestion.'
    }
  },

  // Fresh summer fruit and coconut quinoa bowl (ayurvedic cooling)
  {
    name: "Fresh summer fruit and coconut quinoa bowl",
    portion: "1 serving",
    nutrition: {
      protein: 16,
      prepTime: 18,
      calories: 365,
      carbohydrates: 52,
      fats: 11,
      fiber: 12,
      sugar: 18,
      sodium: 150,
      costEuros: 3.50,
      proteinPerEuro: 4.6
    },
    category: 'dinner',
    tags: ['vegetarian', 'vegan', 'gluten-free', 'lactose-free', 'ayurvedic', 'cooling'],
    ingredients: [
      '1/2 cup cooked quinoa',
      '1/2 cup fresh seasonal fruit (melon, pear, berries)',
      '1/4 cup coconut milk',
      '2 tbsp coconut flakes',
      '1 tbsp hemp hearts',
      '1 tbsp pumpkin seeds',
      '1 tsp coconut oil',
      '1/4 tsp fennel powder',
      '1 tbsp fresh mint',
      'Pinch of rock salt'
    ],
    wholeFoodLevel: 'high',
    vegetableContent: {
      servings: 1,
      vegetables: ['fresh herbs'],
      benefits: ['cooling fruits', 'hydrating', 'satisfying']
    },
    recipe: {
      instructions: [
        'Cook quinoa and let cool to room temperature',
        'Prepare fresh fruit - dice larger fruits, keep berries whole',
        'Mix quinoa with coconut milk and fennel powder',
        'Arrange fruit over quinoa base',
        'Sprinkle with coconut flakes, hemp hearts, and pumpkin seeds',
        'Drizzle with coconut oil, garnish with fresh mint'
      ],
      tips: [
        'Use seasonal cooling fruits like melon or pears',
        'Serve at room temperature or slightly chilled',
        'Mix gently to preserve fruit texture'
      ],
      notes: 'Light, nourishing meal combining cooling fruits with protein-rich quinoa. Perfect for summer evenings when appetite is naturally lighter.'
    }
  },

  // Cooling coconut and herb rice noodle soup (ayurvedic summer)
  {
    name: "Cooling coconut and herb rice noodle soup with tempeh",
    portion: "1 serving",
    nutrition: {
      protein: 22,
      prepTime: 25,
      calories: 425,
      carbohydrates: 48,
      fats: 14,
      fiber: 8,
      sugar: 8,
      sodium: 420,
      costEuros: 4.20,
      proteinPerEuro: 5.2
    },
    category: 'dinner',
    tags: ['vegetarian', 'vegan', 'gluten-free', 'lactose-free', 'ayurvedic', 'cooling', 'quick', 'high-protein'],
    ingredients: [
      '2 oz rice noodles',
      '80g tempeh (cubed)',
      '1/2 cup coconut milk',
      '1 cup vegetable broth',
      '1/4 cup fresh vegetables (cucumber, zucchini)',
      '2 tbsp fresh cilantro',
      '1 tbsp fresh mint',
      '1/2 tsp fennel seeds',
      '1 tbsp coconut oil',
      '1/2 lime (juice)',
      'Sea salt to taste'
    ],
    wholeFoodLevel: 'moderate',
    vegetableContent: {
      servings: 1,
      vegetables: ['cucumber', 'zucchini', 'fresh herbs'],
      benefits: ['cooling vegetables', 'hydrating', 'light and digestible']
    },
    recipe: {
      instructions: [
        'Cook rice noodles according to package directions, drain',
        'Steam or pan-fry tempeh cubes until golden, about 4 minutes each side',
        'Heat coconut oil gently, add fennel seeds until fragrant',
        'Add vegetable broth and coconut milk, bring to gentle simmer',
        'Add fresh vegetables, cook 2-3 minutes until just tender',
        'Add cooked noodles and tempeh to warm through',
        'Remove from heat, stir in herbs and lime juice'
      ],
      tips: [
        'Keep vegetables barely cooked for cooling effect',
        'Fresh herbs added at end preserve cooling properties',
        'Can be served warm or at room temperature'
      ],
      notes: 'Light, cooling soup with rice noodles. The combination of coconut milk and fresh herbs creates a soothing meal perfect for summer.'
    }
  },

  // Cooling barley water and vegetable soup (ayurvedic summer)
  {
    name: "Cooling barley water and vegetable soup with white beans",
    portion: "1 serving",
    nutrition: {
      protein: 18,
      prepTime: 30,
      calories: 320,
      carbohydrates: 48,
      fats: 6,
      fiber: 12,
      sugar: 6,
      sodium: 360,
      costEuros: 2.60,
      proteinPerEuro: 6.9
    },
    category: 'lunch',
    tags: ['vegetarian', 'vegan', 'gluten-free', 'lactose-free', 'ayurvedic', 'cooling', 'high-protein'],
    ingredients: [
      '1/2 cup pearl barley',
      '1/2 cup cooked white cannellini beans',
      '1 cup cooling vegetables (cucumber, bottle gourd, fresh greens)',
      '2 cups water',
      '1 tbsp coconut oil',
      '1/2 tsp fennel seeds',
      '2 tbsp fresh cilantro',
      '1 tbsp fresh mint',
      '1/2 lime (juice)',
      'Rock salt to taste'
    ],
    wholeFoodLevel: 'high',
    vegetableContent: {
      servings: 2,
      vegetables: ['cucumber', 'bottle gourd', 'fresh greens'],
      benefits: ['extremely cooling', 'hydrating', 'cleansing']
    },
    recipe: {
      instructions: [
        'Cook pearl barley in water until soft (20 minutes)',
        'Heat coconut oil gently, add fennel seeds',
        'Add cooling vegetables, cook very lightly 2 minutes',
        'Add cooked barley with cooking water and cooked white beans',
        'Simmer gently 3 minutes to warm beans through',
        'Remove from heat, stir in fresh herbs and lime juice'
      ],
      tips: [
        'Barley water is traditionally very cooling',
        'Keep vegetables barely cooked for maximum cooling effect',
        'Can be consumed warm or at room temperature'
      ],
      notes: 'Traditional Ayurvedic cooling soup using barley water, which is naturally cooling and purifying. Perfect for very hot days.'
    }
  },

  // Instagram-inspired recipes with healthy indulgent sauces
  {
    name: "Herb-infused chicken lasagna with avocado oil drizzle",
    portion: "1 generous serving (250g)",
    nutrition: {
      protein: 42,
      calories: 485,
      carbohydrates: 35,
      fats: 22,
      fiber: 6,
      sugar: 8,
      sodium: 620,
      potassium: 580,
      calcium: 250,
      iron: 3.2,
      vitaminC: 15,
      prepTime: 45,
      costEuros: 7.20,
      proteinPerEuro: 5.8
    },
    category: "dinner",
    tags: ["viral", "social-media", "high-protein", "comfort-food", "instagram-inspired"],
    ingredients: [
      "lasagna sheets", "chicken stock", "cottage cheese", "light cream cheese", 
      "mozzarella", "parmesan", "chicken breast", "mushrooms", "broccoli", 
      "avocado oil", "garlic", "Italian herbs", "butter", "plain flour", "salt", "pepper"
    ],
    wholeFoodLevel: "moderate",
    vegetableContent: {
      servings: 2,
      vegetables: ["mushrooms", "broccoli"],
      benefits: ["Rich in vitamin K", "Supports immune system", "High in antioxidants"]
    },
    recipe: {
      instructions: [
        "Slice chicken breast in half and pan-fry both sides (5-6 mins) until golden",
        "Shred chicken and set aside to cool",
        "Sauté onion, garlic, and mushrooms in butter until fragrant", 
        "Add flour, then chicken stock and cheeses to create creamy sauce",
        "Blanch broccoli until bright green and tender-crisp",
        "Layer lasagna: sauce, chicken, cheese, broccoli, repeat",
        "Top with mozzarella and grill for 3-5 minutes until bubbly",
        "Drizzle with herb-infused avocado oil before serving"
      ],
      tips: [
        "The avocado oil drizzle adds richness without heavy cream", 
        "Make herb oil by warming avocado oil with fresh thyme and rosemary"
      ],
      notes: "Instagram viral comfort food elevated with healthy avocado oil drizzle that adds indulgent flavor"
    }
  },

  {
    name: "Chicken and basil pesto lasagna with creamy cottage cheese sauce",
    portion: "1 serving (280g)",
    nutrition: {
      protein: 38,
      calories: 465,
      carbohydrates: 32,
      fats: 24,
      fiber: 4,
      sugar: 6,
      sodium: 580,
      potassium: 520,
      calcium: 280,
      iron: 2.8,
      vitaminC: 12,
      prepTime: 40,
      costEuros: 6.50,
      proteinPerEuro: 5.8
    },
    category: "dinner", 
    tags: ["viral", "social-media", "high-protein", "italian-inspired", "instagram-inspired"],
    ingredients: [
      "chicken breast mince", "brown onion", "basil pesto", "broccoli", "spinach",
      "cottage cheese", "skim milk", "garlic cloves", "lasagna sheets", "mozzarella", "salt"
    ],
    wholeFoodLevel: "moderate",
    vegetableContent: {
      servings: 2.5,
      vegetables: ["broccoli", "spinach", "onion"],
      benefits: ["High in folate", "Rich in iron", "Supports eye health"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 180°C and prepare baking dish",
        "Cook onions until translucent, add chicken mince and brown",
        "Add pesto and cook until chicken is broken down (5 minutes)",
        "Steam broccoli and spinach until tender",
        "Blend cottage cheese, skim milk, garlic and salt for creamy white sauce",
        "Layer: pesto chicken, vegetables, cottage cheese sauce, repeat",
        "Cover with foil and bake 15 minutes, remove foil and bake 5-10 minutes",
        "Let rest before serving for perfect slice consistency"
      ],
      tips: [
        "Cottage cheese sauce is protein-rich alternative to heavy cream",
        "Fresh basil pesto adds indulgent flavor while providing antioxidants"
      ],
      notes: "Viral Instagram recipe featuring protein-packed cottage cheese sauce that tastes indulgent but stays healthy"
    }
  },

  {
    name: "Pasta with roasted zucchini cream and burrata topping",
    portion: "200g pasta + toppings",
    nutrition: {
      protein: 28,
      calories: 520,
      carbohydrates: 58,
      fats: 18,
      fiber: 8,
      sugar: 12,
      sodium: 420,
      potassium: 680,
      calcium: 320,
      iron: 3.5,
      vitaminC: 25,
      prepTime: 35,
      costEuros: 5.80,
      proteinPerEuro: 4.8
    },
    category: "dinner",
    tags: ["viral", "social-media", "vegetarian", "italian-inspired", "instagram-inspired", "creamy"],
    ingredients: [
      "pasta", "zucchini", "burrata cheese", "mozzarella", "garlic cloves",
      "olive oil", "pine nuts", "fresh basil", "salt", "pepper"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["zucchini"],
      benefits: ["High in potassium", "Low in calories", "Rich in vitamin C"]
    },
    recipe: {
      instructions: [
        "Cook pasta until al dente and reserve 1 cup pasta water",
        "Roast sliced zucchini with olive oil until golden and caramelized",
        "Blend roasted zucchini with garlic, olive oil and basil for creamy sauce",
        "Heat pan on medium, add zucchini cream with pasta water to thin",
        "Toss cooked pasta with zucchini cream sauce until well coated",
        "Serve in bowls topped with torn burrata and toasted pine nuts",
        "Finish with fresh basil leaves and cracked black pepper"
      ],
      tips: [
        "Roasting zucchini concentrates flavors for naturally creamy sauce",
        "Burrata adds luxurious creaminess without heavy cream",
        "Toast pine nuts for added crunch and healthy fats"
      ],
      notes: "French-inspired viral recipe where roasted vegetables create indulgent cream sauce, topped with protein-rich burrata"
    }
  },

  // Dairy-free/lactose-free and vegetarian versions of viral recipes
  {
    name: "Herb-infused vegetable lasagna with avocado oil drizzle (Plant-Based)",
    portion: "1 generous serving (250g)",
    nutrition: {
      protein: 22,
      calories: 420,
      carbohydrates: 38,
      fats: 18,
      fiber: 8,
      sugar: 8,
      sodium: 480,
      potassium: 620,
      calcium: 180,
      iron: 3.8,
      vitaminC: 18,
      prepTime: 45,
      costEuros: 6.20,
      proteinPerEuro: 3.5
    },
    category: "dinner",
    tags: ["viral", "social-media", "vegetarian", "lactose-free", "dairy-free", "high-protein", "comfort-food", "instagram-inspired"],
    ingredients: [
      "lasagna sheets", "vegetable stock", "cashew cream", "nutritional yeast", 
      "firm tofu", "mushrooms", "broccoli", "spinach", "zucchini",
      "avocado oil", "garlic", "Italian herbs", "olive oil", "plain flour", "salt", "pepper"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["mushrooms", "broccoli", "spinach", "zucchini"],
      benefits: ["Rich in vitamin K", "Supports immune system", "High in antioxidants", "Plant protein"]
    },
    recipe: {
      instructions: [
        "Press and crumble tofu, season with nutritional yeast and herbs",
        "Sauté onion, garlic, and mushrooms in olive oil until fragrant", 
        "Add flour, then vegetable stock and cashew cream to create dairy-free sauce",
        "Blanch broccoli and spinach until bright green and tender-crisp",
        "Layer lasagna: sauce, tofu, vegetables, repeat with dairy-free layers",
        "Cover and bake at 180°C for 25 minutes until bubbly",
        "Drizzle with herb-infused avocado oil before serving"
      ],
      tips: [
        "Cashew cream creates rich texture without dairy", 
        "Make herb oil by warming avocado oil with fresh thyme and rosemary",
        "Press tofu well to remove moisture for better texture"
      ],
      notes: "Plant-based version of viral Instagram lasagna with dairy-free cashew cream and herb oil drizzle"
    }
  },

  {
    name: "Lentil and basil pesto lasagna with cashew cream sauce (Dairy-Free)",
    portion: "1 serving (280g)",
    nutrition: {
      protein: 28,
      calories: 445,
      carbohydrates: 42,
      fats: 18,
      fiber: 12,
      sugar: 6,
      sodium: 520,
      potassium: 680,
      calcium: 120,
      iron: 5.2,
      vitaminC: 15,
      prepTime: 40,
      costEuros: 5.50,
      proteinPerEuro: 5.1
    },
    category: "dinner", 
    tags: ["viral", "social-media", "vegetarian", "lactose-free", "dairy-free", "high-protein", "italian-inspired", "instagram-inspired"],
    ingredients: [
      "cooked green lentils", "brown onion", "dairy-free basil pesto", "broccoli", "spinach",
      "cashew cream", "unsweetened plant milk", "garlic cloves", "lasagna sheets", "nutritional yeast", "salt"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2.5,
      vegetables: ["broccoli", "spinach", "onion"],
      benefits: ["High in folate", "Rich in iron", "Supports eye health", "Plant-based protein"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 180°C and prepare baking dish",
        "Cook onions until translucent, add cooked lentils and warm through",
        "Add dairy-free pesto and cook for 5 minutes until well combined",
        "Steam broccoli and spinach until tender",
        "Blend cashew cream, plant milk, garlic, nutritional yeast and salt for creamy sauce",
        "Layer: pesto lentils, vegetables, cashew cream sauce, repeat",
        "Cover with foil and bake 15 minutes, remove foil and bake 5-10 minutes",
        "Let rest before serving for perfect slice consistency"
      ],
      tips: [
        "Cashew cream sauce is protein-rich dairy-free alternative",
        "Lentils provide complete protein when combined with grains",
        "Fresh basil pesto adds indulgent flavor with healthy fats"
      ],
      notes: "Dairy-free version of viral Instagram lasagna with protein-packed lentils and cashew cream sauce"
    }
  },

  {
    name: "Pasta with roasted zucchini cream and cashew cheese topping (Dairy-Free)",
    portion: "200g pasta + toppings",
    nutrition: {
      protein: 18,
      calories: 480,
      carbohydrates: 62,
      fats: 16,
      fiber: 9,
      sugar: 12,
      sodium: 380,
      potassium: 680,
      calcium: 80,
      iron: 3.5,
      vitaminC: 25,
      prepTime: 35,
      costEuros: 5.20,
      proteinPerEuro: 3.5
    },
    category: "dinner",
    tags: ["viral", "social-media", "vegetarian", "lactose-free", "dairy-free", "italian-inspired", "instagram-inspired", "creamy"],
    ingredients: [
      "pasta", "zucchini", "cashew cheese", "nutritional yeast", "garlic cloves",
      "olive oil", "pine nuts", "fresh basil", "salt", "pepper", "lemon juice"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["zucchini"],
      benefits: ["High in potassium", "Low in calories", "Rich in vitamin C"]
    },
    recipe: {
      instructions: [
        "Cook pasta until al dente and reserve 1 cup pasta water",
        "Roast sliced zucchini with olive oil until golden and caramelized",
        "Blend roasted zucchini with garlic, olive oil and basil for creamy sauce",
        "Heat pan on medium, add zucchini cream with pasta water to thin",
        "Toss cooked pasta with zucchini cream sauce until well coated",
        "Serve in bowls topped with cashew cheese and toasted pine nuts",
        "Finish with fresh basil leaves, nutritional yeast, and cracked black pepper"
      ],
      tips: [
        "Roasting zucchini concentrates flavors for naturally creamy sauce",
        "Cashew cheese adds protein and creaminess without dairy",
        "Toast pine nuts for added crunch and healthy fats",
        "Nutritional yeast adds cheesy umami flavor"
      ],
      notes: "Dairy-free version of viral recipe with cashew cheese providing protein and indulgent creaminess"
    }
  },

  // ============ VIRAL RECIPES - INTEGRATED INTO UNIFIED DATABASE ============
  {
    name: "Protein Ice Cream Bowl",
    portion: "1 serving",
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
      "150g frozen mixed berries",
      "1 scoop vanilla protein powder",
      "120g Greek yogurt",
      "30ml almond butter",
      "15ml chia seeds",
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
    name: "Fluffy Cloud Bread",
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
      "30ml cream cheese",
      "15ml honey",
      "2ml vanilla extract",
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
    name: "Baked Oats",
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
      "50g rolled oats",
      "1 scoop vanilla protein powder", 
      "1/2 mashed banana",
      "60ml almond milk",
      "15ml almond butter",
      "5ml cinnamon",
      "25g blueberries",
      "15ml maple syrup"
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
    name: "Salmon Rice Bowl",
    portion: "1 serving",
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
      "160g cooked sushi rice",
      "1/2 avocado (sliced)",
      "60g cucumber (diced)",
      "30ml soy sauce",
      "15ml mayo",
      "5ml sriracha",
      "5ml sesame oil",
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
  },

  // ============ ADDITIONAL RECIPES - INTEGRATED INTO UNIFIED DATABASE ============
  {
    name: "Protein-packed chia pudding with almond butter",
    portion: "1 bowl (200g)",
    nutrition: { 
      protein: 22, 
      prepTime: 10, 
      calories: 340,
      carbohydrates: 24,
      fats: 20,
      fiber: 12,
      sugar: 8,
      sodium: 120,
      potassium: 450,
      calcium: 180,
      iron: 3.5,
      vitaminC: 8,
      costEuros: 2.80, 
      proteinPerEuro: 7.9 
    },
    category: "breakfast",
    tags: ["vegetarian", "vegan", "gluten-free", "lactose-free", "high-protein", "overnight"],
    ingredients: [
      "45ml chia seeds",
      "240ml almond milk",
      "30ml almond butter",
      "15ml maple syrup",
      "2ml vanilla extract",
      "60g fresh berries",
      "15ml chopped almonds"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1,
      vegetables: ["berries"],
      benefits: ["High fiber", "Omega-3 rich", "Antioxidant-packed"]
    },
    recipe: {
      instructions: [
        "Mix chia seeds with almond milk in bowl",
        "Whisk in almond butter, maple syrup, and vanilla",
        "Refrigerate overnight or 4+ hours",
        "Stir before serving to break up any clumps",
        "Top with fresh berries and chopped almonds"
      ],
      tips: [
        "Make multiple servings at once for easy weekday breakfasts",
        "Adjust thickness by adding more liquid if needed"
      ],
      notes: "Perfect make-ahead breakfast with sustained energy"
    }
  },
  {
    name: "Mediterranean vegetable frittata",
    portion: "1 slice (150g)",
    nutrition: { 
      protein: 20, 
      prepTime: 25, 
      calories: 280,
      carbohydrates: 8,
      fats: 22,
      fiber: 3,
      sugar: 5,
      sodium: 380,
      potassium: 420,
      calcium: 150,
      iron: 2.8,
      vitaminC: 25,
      costEuros: 3.20, 
      proteinPerEuro: 6.3 
    },
    category: "breakfast",
    tags: ["vegetarian", "gluten-free", "high-protein", "mediterranean"],
    ingredients: [
      "6 large eggs",
      "80g spinach",
      "100g cherry tomatoes (halved)",
      "60g feta cheese",
      "15ml olive oil",
      "1 small onion (diced)",
      "2 cloves garlic (minced)",
      "Fresh herbs (basil, oregano)",
      "Salt and pepper"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["spinach", "tomatoes", "onion"],
      benefits: ["Rich in folate", "Mediterranean antioxidants", "Heart-healthy"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 180°C",
        "Heat olive oil in oven-safe skillet",
        "Sauté onion and garlic until fragrant",
        "Add spinach and cook until wilted",
        "Whisk eggs with salt, pepper, and herbs",
        "Pour eggs over vegetables",
        "Add cherry tomatoes and feta on top",
        "Cook on stovetop for 3-4 minutes",
        "Transfer to oven for 12-15 minutes until set"
      ],
      tips: [
        "Don't overcook - center should be slightly jiggly",
        "Great for meal prep - stores well in fridge"
      ],
      notes: "Perfect for weekend brunch or make-ahead breakfast option"
    }
  },

  // ============ MISSING VIRAL RECIPES - ADDING ALL REMAINING ONES ============
  {
    name: "Walking Taco Salad",
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
      "120g mixed greens",
      "100g black beans",
      "80g corn kernels",
      "30g shredded cheese",
      "1 avocado (diced)",
      "30ml Greek yogurt",
      "15ml lime juice",
      "Crushed tortilla chips",
      "Fresh cilantro"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["greens", "avocado", "corn"],
      benefits: ["Viral walking taco trend", "Perfect portable meal", "Instagram-worthy presentation"]
    },
    recipe: {
      instructions: [
        "Layer mixed greens in bowl as viral base",
        "Top with seasoned black beans and corn",
        "Add diced avocado for creaminess",
        "Mix Greek yogurt with lime juice for viral dressing",
        "Sprinkle cheese and crushed tortilla chips",
        "Garnish with fresh cilantro",
        "Serve immediately for best crunch"
      ],
      tips: [
        "Viral because it's handheld taco flavors in salad form",
        "Perfect for content creators and busy lifestyles",
        "The crunch factor is what made this trend explode"
      ],
      notes: "This salad went viral for combining all the best taco flavors in a healthy, portable format"
    }
  },
  {
    name: "Marry Me Chickpea Curry",
    portion: "1 serving",
    nutrition: { 
      protein: 22, 
      prepTime: 20, 
      calories: 380,
      carbohydrates: 45,
      fats: 14,
      fiber: 12,
      sugar: 8,
      sodium: 420,
      costEuros: 3.60, 
      proteinPerEuro: 6.1 
    },
    category: "dinner",
    tags: ["viral", "social-media", "vegetarian", "vegan", "gluten-free", "high-protein"],
    ingredients: [
      "120g chickpeas (cooked)",
      "150g diced tomatoes",
      "120ml coconut milk",
      "1 onion (diced)",
      "3 garlic cloves",
      "5ml turmeric",
      "5ml garam masala",
      "Fresh cilantro",
      "Basmati rice"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["tomatoes", "onion", "garlic"],
      benefits: ["Plant-based viral sensation", "Proposal-worthy comfort food", "Perfect for food content"]
    },
    recipe: {
      instructions: [
        "Sauté diced onion until golden",
        "Add minced garlic, turmeric, garam masala",
        "Pour in diced tomatoes and cook until thick",
        "Add chickpeas and coconut milk",
        "Simmer until creamy and flavorful",
        "Garnish with fresh cilantro",
        "Serve over basmati rice"
      ],
      tips: [
        "Called 'Marry Me' because it's so good it'll get you proposed to",
        "This vegan version went viral for being incredibly satisfying",
        "Perfect for cozy content and date nights"
      ],
      notes: "This plant-based curry maintains all the viral appeal while being completely vegan"
    }
  },
  {
    name: "Nature's Cereal with Greek Yogurt",
    portion: "1 serving",
    nutrition: { 
      protein: 18, 
      prepTime: 7, 
      calories: 280,
      carbohydrates: 38,
      fats: 6,
      fiber: 8,
      sugar: 30,
      sodium: 85,
      costEuros: 4.50, 
      proteinPerEuro: 4.0 
    },
    category: "breakfast",
    tags: ["viral", "social-media", "vegetarian", "gluten-free", "refreshing", "high-protein"],
    ingredients: [
      "150g fresh blueberries",
      "30ml pomegranate seeds",
      "120ml coconut water",
      "120ml Greek yogurt (plain)",
      "Ice cubes",
      "Optional: mint leaves"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["blueberries", "pomegranate"],
      benefits: ["TikTok health trend", "Natural hydration", "Antioxidant powerhouse"]
    },
    recipe: {
      instructions: [
        "Add Greek yogurt as base layer in bowl",
        "Fill with fresh blueberries on top of yogurt",
        "Sprinkle pomegranate seeds over fruit",
        "Pour chilled coconut water around the sides",
        "Add ice cubes for viral crunch",
        "Garnish with mint if desired",
        "Eat immediately for best texture"
      ],
      tips: [
        "Went viral as 'nature's cereal'",
        "Perfect for hot summer mornings",
        "The ice creates the satisfying crunch that made this trend explode"
      ],
      notes: "This simple combination became a massive TikTok trend for being refreshing and naturally sweet"
    }
  },
  {
    name: "Pasta Chips",
    portion: "1 serving",
    nutrition: { 
      protein: 12, 
      prepTime: 15, 
      calories: 290,
      carbohydrates: 38,
      fats: 11,
      fiber: 3,
      sugar: 2,
      sodium: 380,
      costEuros: 2.40, 
      proteinPerEuro: 5.0 
    },
    category: "lunch",
    tags: ["viral", "social-media", "vegetarian", "crispy", "snack"],
    ingredients: [
      "300g cooked pasta (any shape)",
      "30ml olive oil",
      "30ml parmesan cheese",
      "5ml garlic powder",
      "5ml paprika",
      "Salt and pepper",
      "Marinara sauce for dipping"
    ],
    wholeFoodLevel: "moderate",
    vegetableContent: {
      servings: 0,
      vegetables: [],
      benefits: ["Viral for incredible crunch", "Perfect snack or side", "Social media gold"]
    },
    recipe: {
      instructions: [
        "Cook pasta until al dente, drain well",
        "Toss hot pasta with olive oil",
        "Sprinkle with parmesan, garlic powder, paprika",
        "Air fry at 200°C for 10-12 minutes until crispy",
        "Season with salt and pepper",
        "Serve immediately with marinara for dipping"
      ],
      tips: [
        "Went viral for transforming leftover pasta into chips",
        "The key is getting them really crispy",
        "Perfect for using up leftover pasta"
      ],
      notes: "This trend exploded because it's such a creative way to repurpose pasta into a crunchy snack"
    }
  },

  // ============ MISSING ADDITIONAL RECIPES ============
  {
    name: "High-protein smoothie bowl with granola",
    portion: "1 serving",
    nutrition: { 
      protein: 26, 
      prepTime: 8, 
      calories: 380,
      carbohydrates: 42,
      fats: 12,
      fiber: 8,
      sugar: 18,
      sodium: 180,
      costEuros: 3.40, 
      proteinPerEuro: 7.6 
    },
    category: "breakfast",
    tags: ["vegetarian", "high-protein", "post-workout", "energizing"],
    ingredients: [
      "1 scoop vanilla protein powder",
      "150g frozen berries",
      "120ml almond milk",
      "60g granola",
      "15ml almond butter",
      "30g fresh strawberries",
      "15ml chia seeds"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["berries", "strawberries"],
      benefits: ["Post-workout recovery", "Sustained energy", "Antioxidant rich"]
    },
    recipe: {
      instructions: [
        "Blend protein powder, frozen berries, almond milk until thick",
        "Pour into bowl with thick smoothie consistency",
        "Top with granola in decorative pattern",
        "Add fresh strawberry slices",
        "Drizzle with almond butter",
        "Sprinkle chia seeds for extra nutrition"
      ],
      tips: [
        "Use frozen fruit for thick texture",
        "Add granola just before eating to maintain crunch",
        "Perfect post-workout breakfast"
      ],
      notes: "Ideal for active mornings when you need sustained energy and protein"
    }
  },
  {
    name: "Savory quinoa breakfast bowl",
    portion: "1 serving",
    nutrition: { 
      protein: 18, 
      prepTime: 20, 
      calories: 340,
      carbohydrates: 38,
      fats: 14,
      fiber: 6,
      sugar: 4,
      sodium: 420,
      costEuros: 3.60, 
      proteinPerEuro: 5.0 
    },
    category: "breakfast",
    tags: ["vegetarian", "gluten-free", "high-protein", "savory"],
    ingredients: [
      "80g quinoa",
      "2 eggs",
      "60g spinach",
      "1/2 avocado",
      "30g feta cheese",
      "15ml olive oil",
      "Everything bagel seasoning"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["spinach", "avocado"],
      benefits: ["Complete protein", "Savory breakfast option", "Nutrient dense"]
    },
    recipe: {
      instructions: [
        "Cook quinoa according to package directions",
        "Sauté spinach in olive oil until wilted",
        "Fry eggs to desired doneness",
        "Layer warm quinoa in bowl",
        "Top with sautéed spinach and fried eggs",
        "Add avocado slices and crumbled feta",
        "Finish with everything bagel seasoning"
      ],
      tips: [
        "Cook quinoa in vegetable broth for extra flavor",
        "Perfect for those who prefer savory breakfasts",
        "Make quinoa ahead for quick assembly"
      ],
      notes: "A protein-rich savory alternative to sweet breakfast options"
    }
  },
  {
    name: "Protein pancakes with berry compote",
    portion: "3 pancakes",
    nutrition: { 
      protein: 24, 
      prepTime: 15, 
      calories: 320,
      carbohydrates: 28,
      fats: 12,
      fiber: 5,
      sugar: 14,
      sodium: 280,
      costEuros: 2.80, 
      proteinPerEuro: 8.6 
    },
    category: "breakfast",
    tags: ["vegetarian", "high-protein", "weekend-treat"],
    ingredients: [
      "2 eggs",
      "1 scoop vanilla protein powder",
      "30g oat flour",
      "120ml almond milk",
      "5ml baking powder",
      "150g mixed berries",
      "15ml maple syrup"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1,
      vegetables: ["berries"],
      benefits: ["High protein weekend treat", "Natural fruit sweetness", "Satisfying breakfast"]
    },
    recipe: {
      instructions: [
        "Mix eggs, protein powder, oat flour, almond milk",
        "Add baking powder and whisk until smooth",
        "Heat non-stick pan over medium heat",
        "Pour batter to form 3 pancakes",
        "Cook until bubbles form, flip carefully",
        "Simmer berries with maple syrup for compote",
        "Serve pancakes topped with warm berry compote"
      ],
      tips: [
        "Don't overmix the batter to keep pancakes fluffy",
        "Use low heat to prevent protein powder from burning",
        "Make extra compote - it keeps well in fridge"
      ],
      notes: "Weekend-worthy pancakes that don't compromise on nutrition"
    }
  },

  // Quick Vegetarian High-Protein Lunch/Dinner Options for Weekday Variety
  {
    name: "Quick tofu and vegetable stir-fry with quinoa",
    portion: "1.5 cups stir-fry with quinoa",
    nutrition: { 
      protein: 24, 
      prepTime: 18, 
      calories: 380,
      carbohydrates: 35,
      fats: 16,
      fiber: 8,
      sugar: 6,
      sodium: 420,
      costEuros: 3.20, 
      proteinPerEuro: 7.5 
    },
    category: "lunch",
    tags: ["vegetarian", "vegan", "gluten-free", "high-protein", "quick", "asian-inspired"],
    ingredients: [
      "150g firm tofu (cubed)",
      "½ cup cooked quinoa",
      "1 bell pepper (sliced)",
      "100g broccoli florets",
      "1 carrot (julienned)",
      "2 tbsp soy sauce",
      "1 tbsp sesame oil",
      "1 tsp fresh ginger (grated)",
      "2 cloves garlic (minced)",
      "1 tsp sesame seeds"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["bell pepper", "broccoli", "carrot"],
      benefits: ["High in antioxidants", "Rich in vitamin C", "Supports immune system"]
    },
    recipe: {
      instructions: [
        "Cook quinoa according to package instructions",
        "Heat sesame oil in large pan over medium-high heat",
        "Add tofu cubes and cook until golden, about 4 minutes",
        "Add garlic and ginger, stir for 30 seconds",
        "Add vegetables and stir-fry for 5-6 minutes until tender-crisp",
        "Stir in soy sauce and sesame seeds",
        "Serve over quinoa"
      ],
      tips: [
        "Press tofu beforehand for better texture",
        "Keep vegetables crisp for optimal nutrition"
      ]
    }
  },

  {
    name: "Mediterranean white bean and spinach bowl",
    portion: "1.5 cups bean bowl",
    nutrition: { 
      protein: 22, 
      prepTime: 15, 
      calories: 340,
      carbohydrates: 38,
      fats: 12,
      fiber: 14,
      sugar: 4,
      sodium: 380,
      costEuros: 2.80, 
      proteinPerEuro: 7.9 
    },
    category: "lunch",
    tags: ["vegetarian", "vegan", "gluten-free", "high-protein", "quick", "mediterranean"],
    ingredients: [
      "1 can (400g) white beans (drained)",
      "200g fresh spinach",
      "1 large tomato (diced)",
      "½ cucumber (diced)",
      "2 tbsp olive oil",
      "2 tbsp lemon juice",
      "2 cloves garlic (minced)",
      "¼ cup fresh herbs (parsley, basil)",
      "2 tbsp pine nuts",
      "Salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2.5,
      vegetables: ["spinach", "tomato", "cucumber"],
      benefits: ["High in iron", "Rich in folate", "Supports heart health"]
    },
    recipe: {
      instructions: [
        "Heat 1 tbsp olive oil in large pan",
        "Add garlic and cook for 30 seconds",
        "Add spinach and cook until wilted, about 2 minutes",
        "Add white beans and heat through",
        "Remove from heat, add tomato and cucumber",
        "Drizzle with remaining olive oil and lemon juice",
        "Top with fresh herbs and pine nuts"
      ],
      tips: [
        "Can be served warm or cold",
        "Add feta cheese for extra protein if not vegan"
      ]
    }
  },

  {
    name: "Quick chickpea and sweet potato curry",
    portion: "2 servings",
    nutrition: { 
      protein: 20, 
      prepTime: 25, 
      calories: 420,
      carbohydrates: 58,
      fats: 14,
      fiber: 16,
      sugar: 12,
      sodium: 350,
      costEuros: 2.60, 
      proteinPerEuro: 7.7 
    },
    category: "dinner",
    tags: ["vegetarian", "vegan", "gluten-free", "high-protein", "quick", "indian-inspired"],
    ingredients: [
      "1 can (400g) chickpeas (drained)",
      "1 medium sweet potato (cubed)",
      "1 can (400ml) coconut milk",
      "1 onion (diced)",
      "2 cloves garlic (minced)",
      "1 tsp fresh ginger (grated)",
      "1 tsp curry powder",
      "½ tsp turmeric",
      "½ tsp cumin",
      "1 tbsp coconut oil",
      "Fresh cilantro for garnish"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1.5,
      vegetables: ["sweet potato", "onion"],
      benefits: ["High in beta-carotene", "Rich in fiber", "Supports immune system"]
    },
    recipe: {
      instructions: [
        "Heat coconut oil in large pot over medium heat",
        "Add onion and cook until soft, about 5 minutes",
        "Add garlic, ginger, and spices; cook for 1 minute",
        "Add sweet potato and cook for 5 minutes",
        "Add chickpeas and coconut milk",
        "Simmer for 12-15 minutes until sweet potato is tender",
        "Garnish with fresh cilantro"
      ],
      tips: [
        "Serve with brown rice or quinoa",
        "Adjust spices to taste preference"
      ]
    }
  },

  {
    name: "Protein-packed lentil and vegetable soup",
    portion: "1.5 cups soup",
    nutrition: { 
      protein: 18, 
      prepTime: 22, 
      calories: 320,
      carbohydrates: 42,
      fats: 8,
      fiber: 18,
      sugar: 8,
      sodium: 420,
      costEuros: 2.20, 
      proteinPerEuro: 8.2 
    },
    category: "lunch",
    tags: ["vegetarian", "vegan", "gluten-free", "high-protein", "quick", "comfort-food"],
    ingredients: [
      "1 cup red lentils",
      "1 carrot (diced)",
      "1 celery stalk (diced)",
      "1 onion (diced)",
      "2 cloves garlic (minced)",
      "1 can (400g) diced tomatoes",
      "3 cups vegetable broth",
      "1 tsp cumin",
      "½ tsp paprika",
      "1 tbsp olive oil",
      "Fresh parsley for garnish"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["carrot", "celery", "onion", "tomatoes"],
      benefits: ["High in fiber", "Rich in folate", "Supports digestive health"]
    },
    recipe: {
      instructions: [
        "Heat olive oil in large pot over medium heat",
        "Add onion, carrot, and celery; cook for 5 minutes",
        "Add garlic and spices; cook for 1 minute",
        "Add lentils, tomatoes, and vegetable broth",
        "Bring to boil, then reduce heat and simmer for 15 minutes",
        "Stir occasionally until lentils are tender",
        "Garnish with fresh parsley"
      ],
      tips: [
        "Red lentils cook quickly and don't need soaking",
        "Add extra broth if too thick"
      ]
    }
  },

  {
    name: "Quick tempeh and vegetable noodle bowl",
    portion: "1 serving",
    nutrition: { 
      protein: 26, 
      prepTime: 20, 
      calories: 450,
      carbohydrates: 45,
      fats: 18,
      fiber: 8,
      sugar: 8,
      sodium: 480,
      costEuros: 4.20, 
      proteinPerEuro: 6.2 
    },
    category: "dinner",
    tags: ["vegetarian", "vegan", "high-protein", "quick", "asian-inspired"],
    ingredients: [
      "150g tempeh (sliced)",
      "100g rice noodles",
      "1 red bell pepper (sliced)",
      "100g snap peas",
      "1 carrot (julienned)",
      "2 tbsp soy sauce",
      "1 tbsp rice vinegar",
      "1 tsp sesame oil",
      "1 tsp fresh ginger (grated)",
      "2 green onions (chopped)",
      "1 tbsp peanuts (crushed)"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["bell pepper", "snap peas", "carrot"],
      benefits: ["High in antioxidants", "Rich in vitamin A", "Supports eye health"]
    },
    recipe: {
      instructions: [
        "Cook rice noodles according to package instructions",
        "Heat oil in large pan over medium-high heat",
        "Add tempeh slices and cook until golden, about 4 minutes per side",
        "Add vegetables and stir-fry for 5 minutes",
        "Mix soy sauce, rice vinegar, sesame oil, and ginger",
        "Toss noodles with vegetables and sauce",
        "Top with tempeh, green onions, and crushed peanuts"
      ],
      tips: [
        "Steam tempeh briefly before cooking for better texture",
        "Keep vegetables crisp for best nutrition"
      ]
    }
  },

  {
    name: "Mediterranean quinoa and chickpea stuffed peppers",
    portion: "2 stuffed pepper halves",
    nutrition: { 
      protein: 19, 
      prepTime: 28, 
      calories: 390,
      carbohydrates: 52,
      fats: 14,
      fiber: 12,
      sugar: 10,
      sodium: 380,
      costEuros: 3.40, 
      proteinPerEuro: 5.6 
    },
    category: "dinner",
    tags: ["vegetarian", "vegan", "gluten-free", "high-protein", "mediterranean"],
    ingredients: [
      "2 large bell peppers (halved and seeded)",
      "½ cup cooked quinoa",
      "½ can chickpeas (drained)",
      "1 tomato (diced)",
      "¼ cup olives (chopped)",
      "2 tbsp pine nuts",
      "2 cloves garlic (minced)",
      "2 tbsp olive oil",
      "1 tbsp lemon juice",
      "Fresh herbs (parsley, basil)"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["bell peppers", "tomato"],
      benefits: ["High in vitamin C", "Rich in antioxidants", "Supports immune system"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 200°C",
        "Mix quinoa, chickpeas, tomato, olives, and pine nuts",
        "Add garlic, olive oil, lemon juice, and herbs",
        "Stuff pepper halves with mixture",
        "Place in baking dish with little water at bottom",
        "Cover with foil and bake for 25 minutes",
        "Remove foil and bake 5 more minutes"
      ],
      tips: [
        "Choose peppers that can stand upright",
        "Can be made ahead and reheated"
      ]
    }
  },

  // === KETOGENIC + GLUTEN-FREE RECIPES COLLECTION ===
  
  // Breakfast Options
  {
    name: "Keto avocado and bacon egg cups",
    portion: "2 egg cups",
    nutrition: { 
      protein: 24, 
      prepTime: 20, 
      calories: 420,
      carbohydrates: 4,
      fats: 36,
      fiber: 6,
      sugar: 2,
      sodium: 380,
      costEuros: 3.20, 
      proteinPerEuro: 7.5 
    },
    category: "breakfast",
    tags: ["keto", "gluten-free", "high-protein", "low-carb"],
    ingredients: [
      "2 large avocados (halved, pitted)",
      "4 eggs",
      "4 strips bacon (chopped)",
      "2 tbsp heavy cream",
      "1 tbsp chives (chopped)",
      "Salt and pepper to taste",
      "1 tbsp olive oil"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["avocado", "chives"],
      benefits: ["High healthy fats", "Complete protein", "Fiber rich"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 200°C",
        "Scoop out some avocado flesh to create deeper wells",
        "Brush avocado halves with olive oil, season with salt",
        "Cook bacon until crispy, set aside",
        "Crack one egg into each avocado half",
        "Drizzle with heavy cream, add bacon pieces",
        "Bake 12-15 minutes until eggs are set to preference",
        "Garnish with chives and serve immediately"
      ],
      tips: [
        "Choose ripe but firm avocados for best structure",
        "Pre-cook bacon for crispier texture"
      ],
      notes: "Perfect keto breakfast combining healthy fats with high-quality protein"
    }
  },

  {
    name: "Coconut flour keto pancakes",
    portion: "4 small pancakes",
    nutrition: { 
      protein: 18, 
      prepTime: 15, 
      calories: 280,
      carbohydrates: 8,
      fats: 22,
      fiber: 6,
      sugar: 3,
      sodium: 290,
      costEuros: 2.80, 
      proteinPerEuro: 6.4 
    },
    category: "breakfast",
    tags: ["keto", "gluten-free", "vegetarian", "low-carb"],
    ingredients: [
      "¼ cup coconut flour",
      "4 eggs",
      "¼ cup almond milk",
      "2 tbsp cream cheese (softened)",
      "1 tsp vanilla extract",
      "½ tsp baking powder",
      "2 tbsp erythritol",
      "Pinch of salt",
      "2 tbsp coconut oil for cooking"
    ],
    wholeFoodLevel: "moderate",
    vegetableContent: {
      servings: 0,
      vegetables: [],
      benefits: ["Grain-free", "High fiber", "Sustained energy"]
    },
    recipe: {
      instructions: [
        "Mix coconut flour, baking powder, erythritol, and salt",
        "Blend eggs, cream cheese, almond milk, and vanilla until smooth",
        "Combine wet and dry ingredients, let rest 5 minutes",
        "Heat coconut oil in non-stick pan over medium-low heat",
        "Pour small amounts of batter for 3-inch pancakes",
        "Cook 3 minutes per side until golden brown",
        "Serve with sugar-free syrup or berries"
      ],
      tips: [
        "Coconut flour absorbs liquid quickly - don't add more flour",
        "Keep heat low to prevent burning"
      ],
      notes: "Fluffy keto pancakes that taste like the real thing without the carbs"
    }
  },

  {
    name: "Keto chia pudding with berries",
    portion: "1 serving",
    nutrition: { 
      protein: 12, 
      prepTime: 5, 
      calories: 320,
      carbohydrates: 9,
      fats: 28,
      fiber: 12,
      sugar: 4,
      sodium: 180,
      costEuros: 2.60, 
      proteinPerEuro: 4.6 
    },
    category: "breakfast",
    tags: ["keto", "gluten-free", "vegetarian", "vegan", "low-carb", "overnight"],
    ingredients: [
      "3 tbsp chia seeds",
      "200ml coconut milk (full-fat)",
      "1 tbsp almond butter",
      "1 tsp vanilla extract",
      "1 tbsp erythritol",
      "¼ cup mixed berries",
      "1 tbsp unsweetened coconut flakes"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 0.5,
      vegetables: ["berries"],
      benefits: ["Omega-3 rich", "High fiber", "Antioxidants"]
    },
    recipe: {
      instructions: [
        "Mix chia seeds with coconut milk in bowl",
        "Add almond butter, vanilla, and erythritol",
        "Whisk well to prevent clumping",
        "Refrigerate overnight or minimum 4 hours",
        "Stir before serving, adjust thickness with more milk if needed",
        "Top with berries and coconut flakes"
      ],
      tips: [
        "Make multiple servings at once for the week",
        "Stir after 30 minutes to prevent seed clumping"
      ],
      notes: "Make-ahead keto breakfast loaded with healthy fats and fiber"
    }
  },

  // Lunch Options
  {
    name: "Keto Caesar salad with grilled chicken",
    portion: "1 large salad",
    nutrition: { 
      protein: 32, 
      prepTime: 25, 
      calories: 520,
      carbohydrates: 8,
      fats: 42,
      fiber: 4,
      sugar: 4,
      sodium: 680,
      costEuros: 4.80, 
      proteinPerEuro: 6.7 
    },
    category: "lunch",
    tags: ["keto", "gluten-free", "high-protein", "low-carb"],
    ingredients: [
      "150g chicken breast",
      "4 cups romaine lettuce (chopped)",
      "¼ cup parmesan cheese (grated)",
      "3 tbsp olive oil",
      "2 tbsp mayonnaise",
      "1 clove garlic (minced)",
      "1 tbsp lemon juice",
      "1 tsp Dijon mustard",
      "2 anchovies (optional)",
      "Salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["romaine lettuce"],
      benefits: ["High in vitamin K", "Hydrating", "Crunchy texture"]
    },
    recipe: {
      instructions: [
        "Season chicken breast with salt, pepper, and olive oil",
        "Grill chicken 6-7 minutes per side until cooked through",
        "Let rest 5 minutes, then slice",
        "For dressing: whisk mayo, garlic, lemon juice, mustard",
        "Add minced anchovies if using, whisk until smooth",
        "Toss romaine with dressing until well coated",
        "Top with sliced chicken and parmesan cheese",
        "Serve immediately"
      ],
      tips: [
        "Don't overdress - add dressing gradually",
        "Use freshly grated parmesan for best flavor"
      ],
      notes: "Classic Caesar flavors with high protein and minimal carbs"
    }
  },

  {
    name: "Keto zucchini boats with ground beef",
    portion: "2 stuffed zucchini halves",
    nutrition: { 
      protein: 28, 
      prepTime: 35, 
      calories: 450,
      carbohydrates: 10,
      fats: 32,
      fiber: 4,
      sugar: 6,
      sodium: 520,
      costEuros: 3.60, 
      proteinPerEuro: 7.8 
    },
    category: "lunch",
    tags: ["keto", "gluten-free", "high-protein", "low-carb"],
    ingredients: [
      "2 medium zucchini (halved lengthwise)",
      "200g ground beef (80/20)",
      "½ onion (diced)",
      "2 cloves garlic (minced)",
      "¼ cup mozzarella cheese (shredded)",
      "2 tbsp tomato paste",
      "1 tbsp olive oil",
      "1 tsp Italian seasoning",
      "Salt and pepper to taste",
      "Fresh basil for garnish"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["zucchini", "onion"],
      benefits: ["High water content", "Vitamin C", "Potassium rich"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 190°C",
        "Scoop out zucchini flesh, leaving ½ inch border",
        "Brush zucchini boats with olive oil, season with salt",
        "Sauté onion and garlic until soft",
        "Add ground beef, cook until browned",
        "Stir in tomato paste and Italian seasoning",
        "Fill zucchini boats with meat mixture",
        "Top with mozzarella cheese",
        "Bake 25-30 minutes until zucchini is tender",
        "Garnish with fresh basil"
      ],
      tips: [
        "Save scooped zucchini flesh for other recipes",
        "Don't overfill boats to prevent spillage"
      ],
      notes: "Satisfying keto meal that feels like comfort food without the carbs"
    }
  },

  {
    name: "Keto salmon and avocado salad",
    portion: "1 large salad",
    nutrition: { 
      protein: 30, 
      prepTime: 20, 
      calories: 480,
      carbohydrates: 12,
      fats: 36,
      fiber: 8,
      sugar: 4,
      sodium: 420,
      costEuros: 5.20, 
      proteinPerEuro: 5.8 
    },
    category: "lunch",
    tags: ["keto", "gluten-free", "high-protein", "omega-3", "low-carb"],
    ingredients: [
      "150g salmon fillet",
      "1 large avocado (sliced)",
      "3 cups mixed greens",
      "½ cucumber (sliced)",
      "¼ red onion (thinly sliced)",
      "2 tbsp olive oil",
      "1 tbsp lemon juice",
      "1 tsp Dijon mustard",
      "2 tbsp capers",
      "Salt and pepper to taste",
      "Fresh dill for garnish"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["mixed greens", "cucumber", "red onion"],
      benefits: ["Omega-3 fatty acids", "Heart healthy", "Anti-inflammatory"]
    },
    recipe: {
      instructions: [
        "Season salmon with salt, pepper, and olive oil",
        "Pan-sear salmon 4-5 minutes per side until cooked through",
        "Let cool, then flake into large pieces",
        "Whisk together olive oil, lemon juice, and mustard for dressing",
        "Arrange mixed greens on plate",
        "Top with avocado slices, cucumber, and red onion",
        "Add flaked salmon and capers",
        "Drizzle with dressing and garnish with dill"
      ],
      tips: [
        "Don't overcook salmon - it should flake easily",
        "Add avocado just before serving to prevent browning"
      ],
      notes: "Restaurant-quality salad loaded with healthy fats and premium protein"
    }
  },

  // Dinner Options
  {
    name: "Keto beef and broccoli stir-fry",
    portion: "1.5 cups",
    nutrition: { 
      protein: 35, 
      prepTime: 25, 
      calories: 520,
      carbohydrates: 8,
      fats: 38,
      fiber: 4,
      sugar: 4,
      sodium: 580,
      costEuros: 4.20, 
      proteinPerEuro: 8.3 
    },
    category: "dinner",
    tags: ["keto", "gluten-free", "high-protein", "low-carb", "quick"],
    ingredients: [
      "200g beef sirloin (sliced thin)",
      "3 cups broccoli florets",
      "2 tbsp coconut oil",
      "3 cloves garlic (minced)",
      "1 tbsp fresh ginger (grated)",
      "3 tbsp gluten-free soy sauce",
      "1 tbsp sesame oil",
      "1 tsp erythritol",
      "1 tbsp rice vinegar",
      "2 green onions (sliced)",
      "1 tbsp sesame seeds"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["broccoli", "green onions"],
      benefits: ["High in vitamin C", "Cruciferous vegetables", "Anti-inflammatory"]
    },
    recipe: {
      instructions: [
        "Heat coconut oil in large wok over high heat",
        "Stir-fry beef slices 2-3 minutes until browned",
        "Remove beef, set aside",
        "Add broccoli to wok, stir-fry 3-4 minutes until crisp-tender",
        "Add garlic and ginger, cook 30 seconds",
        "Return beef to wok",
        "Mix soy sauce, sesame oil, erythritol, and vinegar",
        "Pour sauce over beef and broccoli, toss to coat",
        "Garnish with green onions and sesame seeds"
      ],
      tips: [
        "Keep heat high for proper stir-fry texture",
        "Don't overcook broccoli - it should stay bright green"
      ],
      notes: "Classic takeout flavors made keto-friendly and gluten-free"
    }
  },

  {
    name: "Keto stuffed bell peppers",
    portion: "2 stuffed peppers",
    nutrition: { 
      protein: 26, 
      prepTime: 40, 
      calories: 420,
      carbohydrates: 12,
      fats: 28,
      fiber: 6,
      sugar: 8,
      sodium: 480,
      costEuros: 3.80, 
      proteinPerEuro: 6.8 
    },
    category: "dinner",
    tags: ["keto", "gluten-free", "high-protein", "low-carb"],
    ingredients: [
      "2 large bell peppers (tops cut, seeds removed)",
      "200g ground turkey",
      "½ cup cauliflower rice",
      "¼ cup onion (diced)",
      "2 cloves garlic (minced)",
      "¼ cup cheddar cheese (shredded)",
      "2 tbsp tomato paste",
      "1 tbsp olive oil",
      "1 tsp paprika",
      "½ tsp cumin",
      "Salt and pepper to taste",
      "Fresh parsley for garnish"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["bell peppers", "cauliflower", "onion"],
      benefits: ["High vitamin C", "Antioxidants", "Fiber rich"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 180°C",
        "Blanch bell peppers in boiling water 3 minutes, drain",
        "Heat olive oil, sauté onion and garlic until soft",
        "Add ground turkey, cook until browned",
        "Stir in cauliflower rice, tomato paste, paprika, cumin",
        "Cook 5 minutes, season with salt and pepper",
        "Stuff peppers with turkey mixture",
        "Top with cheddar cheese",
        "Bake 25-30 minutes until peppers are tender",
        "Garnish with fresh parsley"
      ],
      tips: [
        "Choose peppers that stand upright for easier stuffing",
        "Make cauliflower rice by pulsing florets in food processor"
      ],
      notes: "Comfort food made keto with cauliflower rice instead of grains"
    }
  },

  {
    name: "Keto lemon herb chicken thighs",
    portion: "2 chicken thighs",
    nutrition: { 
      protein: 34, 
      prepTime: 35, 
      calories: 540,
      carbohydrates: 4,
      fats: 42,
      fiber: 1,
      sugar: 2,
      sodium: 420,
      costEuros: 3.40, 
      proteinPerEuro: 10.0 
    },
    category: "dinner",
    tags: ["keto", "gluten-free", "high-protein", "low-carb"],
    ingredients: [
      "4 chicken thighs (bone-in, skin-on)",
      "2 lemons (juiced and zested)",
      "3 tbsp olive oil",
      "4 cloves garlic (minced)",
      "2 tbsp fresh rosemary (chopped)",
      "2 tbsp fresh thyme",
      "1 tsp paprika",
      "Salt and pepper to taste",
      "2 cups green beans",
      "1 tbsp butter"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["green beans"],
      benefits: ["Vitamin K", "Fiber", "Low calorie"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 200°C",
        "Mix olive oil, lemon juice, zest, garlic, herbs, paprika",
        "Season chicken thighs with salt and pepper",
        "Marinate chicken in herb mixture 15 minutes",
        "Place chicken skin-side up in baking dish with marinade",
        "Roast 25-30 minutes until skin is golden and crispy",
        "Meanwhile, sauté green beans with butter until tender-crisp",
        "Rest chicken 5 minutes before serving",
        "Serve with pan juices and green beans"
      ],
      tips: [
        "Don't flip chicken - keep skin side up for crispiness",
        "Use meat thermometer - internal temp should reach 74°C"
      ],
      notes: "Juicy, flavorful chicken with crispy skin and minimal carbs"
    }
  },

  {
    name: "Keto cauliflower mac and cheese",
    portion: "1 serving",
    nutrition: { 
      protein: 18, 
      prepTime: 30, 
      calories: 380,
      carbohydrates: 8,
      fats: 32,
      fiber: 4,
      sugar: 4,
      sodium: 520,
      costEuros: 2.80, 
      proteinPerEuro: 6.4 
    },
    category: "dinner",
    tags: ["keto", "gluten-free", "vegetarian", "low-carb", "comfort-food"],
    ingredients: [
      "1 large head cauliflower (cut into florets)",
      "1 cup sharp cheddar cheese (shredded)",
      "¼ cup cream cheese",
      "¼ cup heavy cream",
      "2 tbsp butter",
      "1 tsp garlic powder",
      "½ tsp paprika",
      "¼ tsp mustard powder",
      "Salt and pepper to taste",
      "2 tbsp chives (chopped)"
    ],
    wholeFoodLevel: "moderate",
    vegetableContent: {
      servings: 3,
      vegetables: ["cauliflower", "chives"],
      benefits: ["High vitamin C", "Cruciferous benefits", "Lower carb alternative"]
    },
    recipe: {
      instructions: [
        "Steam cauliflower florets until very tender, 12-15 minutes",
        "Drain well and pat dry with paper towels",
        "In saucepan, melt butter over medium heat",
        "Add cream cheese and heavy cream, whisk until smooth",
        "Add garlic powder, paprika, mustard powder",
        "Gradually add cheddar cheese, whisking until melted",
        "Add cooked cauliflower to cheese sauce",
        "Gently fold together, season with salt and pepper",
        "Garnish with chives and serve hot"
      ],
      tips: [
        "Make sure cauliflower is very well drained to prevent watery sauce",
        "Don't overheat cheese sauce to prevent breaking"
      ],
      notes: "All the comfort of mac and cheese with a fraction of the carbs"
    }
  },

  // HIGH-PROTEIN BREAKFAST OPTIONS
  {
    name: "Greek yogurt protein power bowl",
    portion: "1 large bowl",
    nutrition: { 
      protein: 32, 
      prepTime: 5, 
      calories: 485,
      carbohydrates: 38,
      fats: 22,
      fiber: 8,
      sugar: 24,
      sodium: 120,
      costEuros: 3.20, 
      proteinPerEuro: 10.0 
    },
    category: "breakfast",
    tags: ["vegetarian", "gluten-free", "high-protein", "quick", "probiotic"],
    ingredients: [
      "1 cup Greek yogurt (2% fat)",
      "2 tbsp almond butter",
      "1 tbsp chia seeds",
      "1 tbsp hemp hearts",
      "½ cup mixed berries",
      "1 tbsp honey",
      "2 tbsp crushed walnuts",
      "1 tsp vanilla extract"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1,
      vegetables: ["berries"],
      benefits: ["Antioxidants", "Natural sugars", "Vitamin C"]
    },
    recipe: {
      instructions: [
        "Place Greek yogurt in a large bowl",
        "Swirl in almond butter and vanilla extract",
        "Top with chia seeds and hemp hearts",
        "Add mixed berries on top",
        "Drizzle with honey",
        "Finish with crushed walnuts"
      ],
      tips: [
        "Use thick Greek yogurt for best texture",
        "Let chia seeds sit for 5 minutes to absorb moisture"
      ],
      notes: "Creamy, protein-packed breakfast that feels indulgent"
    }
  },

  {
    name: "Cottage cheese and eggs scramble with spinach",
    portion: "1 large serving",
    nutrition: { 
      protein: 38, 
      prepTime: 10, 
      calories: 420,
      carbohydrates: 8,
      fats: 26,
      fiber: 3,
      sugar: 6,
      sodium: 580,
      costEuros: 2.80, 
      proteinPerEuro: 13.6 
    },
    category: "breakfast",
    tags: ["vegetarian", "gluten-free", "high-protein", "keto", "quick"],
    ingredients: [
      "3 large eggs",
      "½ cup cottage cheese",
      "2 cups fresh spinach",
      "1 tbsp butter",
      "¼ cup shredded cheddar cheese",
      "2 tbsp chives (chopped)",
      "Salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["spinach", "chives"],
      benefits: ["Iron", "Folate", "Vitamin K"]
    },
    recipe: {
      instructions: [
        "Heat butter in non-stick pan over medium heat",
        "Add spinach, cook until wilted",
        "Beat eggs and add to pan",
        "As eggs begin to set, add cottage cheese",
        "Gently scramble, adding cheddar cheese",
        "Cook until eggs are set but still creamy",
        "Season with salt, pepper, and chives"
      ],
      tips: [
        "Don't overcook - eggs should remain creamy",
        "Add cottage cheese when eggs are half set"
      ],
      notes: "Restaurant-quality protein breakfast in minutes"
    }
  },

  {
    name: "Protein pancakes with almond flour",
    portion: "3 medium pancakes",
    nutrition: { 
      protein: 28, 
      prepTime: 15, 
      calories: 390,
      carbohydrates: 18,
      fats: 24,
      fiber: 6,
      sugar: 8,
      sodium: 280,
      costEuros: 3.50, 
      proteinPerEuro: 8.0 
    },
    category: "breakfast",
    tags: ["vegetarian", "gluten-free", "high-protein", "weekend"],
    ingredients: [
      "3 large eggs",
      "1 scoop vanilla protein powder",
      "½ cup almond flour",
      "2 tbsp Greek yogurt",
      "1 tsp baking powder",
      "1 tsp vanilla extract",
      "1 tbsp maple syrup",
      "2 tbsp butter for cooking",
      "Fresh berries for topping"
    ],
    wholeFoodLevel: "moderate",
    vegetableContent: {
      servings: 1,
      vegetables: ["berries"],
      benefits: ["Antioxidants", "Natural sweetness"]
    },
    recipe: {
      instructions: [
        "Whisk eggs, protein powder, and Greek yogurt",
        "Add almond flour, baking powder, vanilla, maple syrup",
        "Let batter rest 5 minutes to thicken",
        "Heat butter in non-stick pan over medium-low heat",
        "Pour ¼ cup batter per pancake",
        "Cook 2-3 minutes until bubbles form, flip carefully",
        "Cook 1-2 minutes more until golden",
        "Serve with fresh berries"
      ],
      tips: [
        "Keep heat medium-low to prevent burning",
        "Batter will be thicker than regular pancakes"
      ],
      notes: "Fluffy, protein-rich weekend breakfast treat"
    }
  },

  // HIGH-PROTEIN LUNCH OPTIONS
  {
    name: "Lentil and turkey meatball power bowl",
    portion: "1 large bowl",
    nutrition: { 
      protein: 42, 
      prepTime: 25, 
      calories: 520,
      carbohydrates: 35,
      fats: 18,
      fiber: 14,
      sugar: 8,
      sodium: 680,
      costEuros: 4.20, 
      proteinPerEuro: 10.0 
    },
    category: "lunch",
    tags: ["gluten-free", "high-protein", "meal-prep"],
    ingredients: [
      "150g ground turkey (93% lean)",
      "¾ cup cooked green lentils",
      "2 cups baby spinach",
      "1 medium roasted sweet potato (cubed)",
      "¼ cup feta cheese",
      "2 tbsp tahini",
      "1 tbsp lemon juice",
      "1 tbsp olive oil",
      "1 tsp cumin",
      "1 tsp paprika",
      "2 cloves garlic (minced)",
      "Fresh herbs (parsley, mint)"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["spinach", "sweet potato", "herbs"],
      benefits: ["Beta carotene", "Iron", "Complex carbs"]
    },
    recipe: {
      instructions: [
        "Season turkey with cumin, paprika, salt, pepper",
        "Form into small meatballs, brown in olive oil",
        "Cook meatballs through, about 10 minutes",
        "Whisk tahini, lemon juice, water to make dressing",
        "Layer spinach in bowl",
        "Top with warm lentils and sweet potato",
        "Add meatballs and crumbled feta",
        "Drizzle with tahini dressing",
        "Garnish with fresh herbs"
      ],
      tips: [
        "Don't overwork meatballs to keep them tender",
        "Roast sweet potato at 400°F for 25 minutes"
      ],
      notes: "Mediterranean-inspired power lunch with complete proteins"
    }
  },

  {
    name: "Chickpea tuna salad protein wrap",
    portion: "1 large wrap",
    nutrition: { 
      protein: 35, 
      prepTime: 15, 
      calories: 480,
      carbohydrates: 52,
      fats: 16,
      fiber: 12,
      sugar: 8,
      sodium: 720,
      costEuros: 3.80, 
      proteinPerEuro: 9.2 
    },
    category: "lunch",
    tags: ["vegetarian", "high-protein", "meal-prep", "quick"],
    ingredients: [
      "1 can (400g) chickpeas (drained, mashed)",
      "2 tbsp hemp hearts",
      "2 tbsp nutritional yeast",
      "2 tbsp tahini",
      "1 tbsp lemon juice",
      "1 large whole wheat tortilla",
      "2 cups mixed greens",
      "1 medium avocado (sliced)",
      "¼ cup shredded carrots",
      "2 tbsp pumpkin seeds",
      "1 tsp kelp granules (for umami)",
      "Salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["mixed greens", "carrots", "avocado"],
      benefits: ["Fiber", "Healthy fats", "Vitamins A, K"]
    },
    recipe: {
      instructions: [
        "Mash chickpeas leaving some texture",
        "Mix in hemp hearts, nutritional yeast, tahini",
        "Add lemon juice, kelp granules, salt, pepper",
        "Lay tortilla flat, spread chickpea mixture",
        "Layer with greens, avocado, carrots",
        "Sprinkle with pumpkin seeds",
        "Roll tightly, slice in half"
      ],
      tips: [
        "Don't over-mash chickpeas - texture is key",
        "Wrap in foil for easier eating"
      ],
      notes: "Plant-based protein powerhouse that tastes like tuna salad"
    }
  },

  // HIGH-PROTEIN DINNER OPTIONS
  {
    name: "Herb-crusted salmon with quinoa pilaf",
    portion: "1 fillet with 1 cup pilaf",
    nutrition: { 
      protein: 45, 
      prepTime: 30, 
      calories: 580,
      carbohydrates: 42,
      fats: 26,
      fiber: 6,
      sugar: 4,
      sodium: 480,
      costEuros: 6.80, 
      proteinPerEuro: 6.6 
    },
    category: "dinner",
    tags: ["pescatarian", "gluten-free", "high-protein", "omega-3"],
    ingredients: [
      "180g salmon fillet",
      "¾ cup cooked quinoa",
      "2 tbsp fresh dill (chopped)",
      "2 tbsp fresh parsley (chopped)",
      "1 tbsp capers",
      "2 tbsp olive oil",
      "1 lemon (zested and juiced)",
      "¼ cup toasted pine nuts",
      "2 cups steamed broccoli",
      "2 cloves garlic (minced)",
      "Salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["broccoli", "herbs"],
      benefits: ["Vitamin C", "Antioxidants", "Anti-inflammatory"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 400°F",
        "Mix herbs, capers, olive oil, lemon zest",
        "Season salmon, top with herb mixture",
        "Bake 12-15 minutes until flakes easily",
        "Sauté garlic, add cooked quinoa",
        "Stir in lemon juice and pine nuts",
        "Steam broccoli until bright green",
        "Serve salmon over quinoa with broccoli"
      ],
      tips: [
        "Don't overcook salmon - internal temp 145°F",
        "Toast pine nuts in dry pan for extra flavor"
      ],
      notes: "Restaurant-quality high-protein dinner with omega-3s"
    }
  },

  {
    name: "Lean beef and black bean power chili",
    portion: "1.5 cups",
    nutrition: { 
      protein: 38, 
      prepTime: 35, 
      calories: 420,
      carbohydrates: 28,
      fats: 16,
      fiber: 12,
      sugar: 8,
      sodium: 680,
      costEuros: 4.50, 
      proteinPerEuro: 8.4 
    },
    category: "dinner",
    tags: ["gluten-free", "high-protein", "meal-prep", "comfort-food"],
    ingredients: [
      "200g lean ground beef (93/7)",
      "1 can (400g) black beans (drained)",
      "1 can (400g) diced tomatoes",
      "1 bell pepper (diced)",
      "1 onion (diced)",
      "3 cloves garlic (minced)",
      "2 tbsp tomato paste",
      "1 tbsp olive oil",
      "2 tsp chili powder",
      "1 tsp cumin",
      "1 tsp smoked paprika",
      "1 cup beef broth",
      "¼ cup Greek yogurt for serving",
      "2 tbsp cilantro (chopped)"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["bell pepper", "onion", "tomatoes"],
      benefits: ["Vitamin C", "Lycopene", "Fiber"]
    },
    recipe: {
      instructions: [
        "Heat olive oil in large pot over medium-high heat",
        "Brown ground beef, breaking into small pieces",
        "Add onion and bell pepper, cook 5 minutes",
        "Add garlic, cook 1 minute",
        "Stir in tomato paste, spices, cook 1 minute",
        "Add tomatoes, black beans, broth",
        "Simmer 20 minutes until thickened",
        "Serve topped with Greek yogurt and cilantro"
      ],
      tips: [
        "Brown meat well for deeper flavor",
        "Chili tastes better the next day"
      ],
      notes: "Hearty, protein-packed chili perfect for meal prep"
    }
  },

  {
    name: "Gluten-free pasta with roasted vegetables and pesto",
    portion: "2 cups pasta with vegetables",
    nutrition: { 
      protein: 22, 
      prepTime: 30, 
      calories: 450,
      carbohydrates: 65,
      fats: 18,
      fiber: 8,
      sugar: 8,
      sodium: 420,
      costEuros: 4.50, 
      proteinPerEuro: 4.9 
    },
    category: "dinner",
    tags: ["vegetarian", "gluten-free", "mediterranean", "colorful"],
    ingredients: [
      "200g gluten-free pasta (rice or chickpea)",
      "2 cups mixed vegetables (zucchini, bell peppers, cherry tomatoes)",
      "3 tbsp basil pesto (dairy-free)",
      "2 tbsp pine nuts",
      "2 tbsp nutritional yeast",
      "45ml olive oil",
      "2 cloves garlic (minced)",
      "1 cup fresh spinach",
      "Salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["zucchini", "bell peppers", "tomatoes", "spinach"],
      benefits: ["Vitamin C", "Folate", "Antioxidants"]
    },
    recipe: {
      instructions: [
        "Cook gluten-free pasta according to package instructions",
        "Heat olive oil in large pan over medium-high heat",
        "Add garlic and mixed vegetables, roast for 8-10 minutes",
        "Add cooked pasta to pan with vegetables",
        "Stir in pesto, pine nuts, and nutritional yeast",
        "Add fresh spinach until wilted",
        "Season with salt and pepper"
      ],
      tips: [
        "Don't overcook gluten-free pasta - check frequently",
        "Toast pine nuts for extra flavor"
      ],
      notes: "Naturally gluten-free and packed with colorful vegetables"
    }
  },

  {
    name: "Creamy gluten-free pasta carbonara with dairy-free sauce",
    portion: "1.5 cups pasta with sauce",
    nutrition: { 
      protein: 26, 
      prepTime: 25, 
      calories: 520,
      carbohydrates: 62,
      fats: 22,
      fiber: 6,
      sugar: 4,
      sodium: 480,
      costEuros: 3.80, 
      proteinPerEuro: 6.8 
    },
    category: "dinner",
    tags: ["vegetarian", "gluten-free", "lactose-free", "comfort-food"],
    ingredients: [
      "180g gluten-free pasta",
      "200ml coconut cream",
      "100g plant-based protein (tempeh or tofu)",
      "50g nutritional yeast",
      "2 cloves garlic (minced)",
      "30ml olive oil",
      "1 onion (diced)",
      "2 tbsp fresh parsley",
      "Black pepper and sea salt"
    ],
    wholeFoodLevel: "moderate",
    vegetableContent: {
      servings: 1,
      vegetables: ["onion", "garlic"],
      benefits: ["Prebiotic fiber", "Antioxidants"]
    },
    recipe: {
      instructions: [
        "Cook gluten-free pasta al dente",
        "Cube and pan-fry protein until golden",
        "Sauté onion and garlic in olive oil",
        "Add coconut cream and nutritional yeast",
        "Toss hot pasta with creamy sauce",
        "Add protein and fresh parsley",
        "Season generously with black pepper"
      ],
      tips: [
        "Remove pan from heat when adding pasta to prevent curdling",
        "Save pasta water to adjust sauce consistency"
      ],
      notes: "Rich, creamy texture without dairy - perfect comfort food"
    }
  },

  {
    name: "Mediterranean gluten-free pasta salad with olives",
    portion: "2 cups pasta salad",
    nutrition: { 
      protein: 18, 
      prepTime: 20, 
      calories: 420,
      carbohydrates: 55,
      fats: 16,
      fiber: 7,
      sugar: 6,
      sodium: 390,
      costEuros: 3.60, 
      proteinPerEuro: 5.0 
    },
    category: "lunch",
    tags: ["vegetarian", "gluten-free", "mediterranean", "fresh", "make-ahead"],
    ingredients: [
      "180g gluten-free pasta (small shapes)",
      "1 cup cherry tomatoes (halved)",
      "100g mixed olives",
      "1 cucumber (diced)",
      "100g dairy-free feta cheese",
      "60ml extra virgin olive oil",
      "30ml lemon juice",
      "2 tbsp fresh basil (chopped)",
      "1 tsp dried oregano",
      "Salt to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["tomatoes", "cucumber"],
      benefits: ["Lycopene", "Hydration", "Vitamin K"]
    },
    recipe: {
      instructions: [
        "Cook pasta and rinse with cold water",
        "Halve tomatoes and dice cucumber",
        "Whisk olive oil, lemon juice, oregano, and salt",
        "Combine pasta, vegetables, and olives",
        "Add dressing and toss well",
        "Crumble in dairy-free feta",
        "Garnish with fresh basil before serving"
      ],
      tips: [
        "Chill for 30 minutes before serving for best flavor",
        "Add extra lemon juice if pasta absorbs dressing"
      ],
      notes: "Perfect make-ahead lunch, flavors improve over time"
    }
  },

  {
    name: "Protein-packed vegetarian lentil bolognese",
    portion: "1.5 cups sauce with 100g pasta",
    nutrition: { 
      protein: 32, 
      prepTime: 40, 
      calories: 520,
      carbohydrates: 78,
      fats: 12,
      fiber: 16,
      sugar: 12,
      sodium: 580,
      costEuros: 3.20, 
      proteinPerEuro: 10.0 
    },
    category: "dinner",
    tags: ["vegetarian", "high-protein", "meal-prep", "comfort-food"],
    ingredients: [
      "1 cup red lentils (dried)",
      "100g whole wheat pasta",
      "1 can (400g) crushed tomatoes",
      "1 large carrot (finely diced)",
      "1 celery stalk (finely diced)",
      "1 onion (finely diced)",
      "4 cloves garlic (minced)",
      "2 tbsp tomato paste",
      "3 tbsp nutritional yeast",
      "2 tbsp olive oil",
      "1 tsp dried oregano",
      "1 tsp dried basil",
      "2 cups vegetable broth",
      "¼ cup fresh parsley (chopped)",
      "Salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["carrot", "celery", "onion", "tomatoes"],
      benefits: ["Beta carotene", "Lycopene", "Complex carbs"]
    },
    recipe: {
      instructions: [
        "Heat olive oil in large pot over medium heat",
        "Sauté onion, carrot, celery until soft, 8 minutes",
        "Add garlic, cook 1 minute",
        "Stir in tomato paste, cook 2 minutes",
        "Add lentils, crushed tomatoes, broth, herbs",
        "Simmer 25 minutes until lentils are tender",
        "Stir in nutritional yeast",
        "Cook pasta according to package directions",
        "Serve sauce over pasta, garnish with parsley"
      ],
      tips: [
        "Dice vegetables very fine for authentic texture",
        "Add water if sauce gets too thick"
      ],
      notes: "Meaty texture from lentils, packed with plant protein"
    }
  },
  {
    name: "Rustic Tomato Pasta Bake with Herbed Breadcrumbs",
    portion: "1 generous serving (about 350g)",
    nutrition: {
      protein: 32,
      prepTime: 35,
      calories: 580,
      carbohydrates: 65,
      fats: 22,
      fiber: 8,
      sugar: 12,
      sodium: 850,
      potassium: 680,
      calcium: 180,
      iron: 4.2,
      vitaminC: 25,
      costEuros: 3.80,
      proteinPerEuro: 8.4
    },
    category: "dinner",
    tags: ["vegetarian", "comfort-food", "baked", "italian", "high-protein"],
    ingredients: [
      "400g penne pasta",
      "2 slices sourdough bread (for breadcrumbs)",
      "1 large onion, diced",
      "4 garlic cloves, minced",
      "6 sun-dried tomatoes, chopped",
      "5ml dried oregano",
      "15ml tomato paste",
      "400g canned chopped tomatoes",
      "15ml balsamic vinegar",
      "60ml olive oil",
      "60ml plain flour",
      "500ml oat milk",
      "30g nutritional yeast",
      "5ml Dijon mustard",
      "150g firm tofu, crumbled",
      "Sea salt and black pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2.5,
      vegetables: ["onion", "garlic", "sun-dried tomatoes", "canned tomatoes"],
      benefits: ["lycopene from tomatoes", "antioxidants from garlic", "fiber from vegetables"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 180°C fan / 390°F, grill setting",
        "Make breadcrumbs by pulsing bread in blender until coarse crumbs form",
        "Heat 30ml olive oil in large pan over medium heat",
        "Add diced onion, garlic, and sun-dried tomatoes with pinch of salt",
        "Cook 5-10 minutes until onions soften, stirring through oregano",
        "Add tomato paste, canned tomatoes, and balsamic vinegar",
        "Mix well and simmer 10-15 minutes until sauce thickens",
        "Meanwhile, cook pasta according to package instructions and drain",
        "For white sauce: heat remaining oil and flour in medium pan",
        "Whisk to form smooth paste, cook 2-3 minutes over medium-high heat",
        "Gradually stream in oat milk, whisking constantly until smooth and thick",
        "Add nutritional yeast, mustard, crumbled tofu, salt and pepper",
        "Combine pasta with tomato sauce in baking dish",
        "Spoon white sauce over top and scatter with breadcrumbs",
        "Bake 5-10 minutes until golden and bubbling"
      ],
      tips: [
        "Use good-quality sourdough for best breadcrumb texture",
        "Don't let the flour burn when making the white sauce",
        "Crumble tofu finely for better integration"
      ],
      notes: "A comforting pasta bake with rich tomato sauce and creamy protein-packed white sauce"
    },
    createdAt: new Date('2025-08-30'),
    active: true
  },
  {
    name: "Rustic Tomato Pasta Bake with Herbed Breadcrumbs (Gluten-Free)",
    portion: "1 generous serving (about 350g)",
    nutrition: {
      protein: 28,
      prepTime: 35,
      calories: 540,
      carbohydrates: 62,
      fats: 20,
      fiber: 7,
      sugar: 11,
      sodium: 820,
      potassium: 650,
      calcium: 160,
      iron: 3.8,
      vitaminC: 25,
      costEuros: 4.20,
      proteinPerEuro: 6.7
    },
    category: "dinner",
    tags: ["vegetarian", "gluten-free", "comfort-food", "baked", "italian"],
    ingredients: [
      "400g gluten-free penne pasta",
      "2 slices gluten-free bread (for breadcrumbs)",
      "1 large onion, diced",
      "4 garlic cloves, minced",
      "6 sun-dried tomatoes, chopped",
      "5ml dried oregano",
      "15ml tomato paste",
      "400g canned chopped tomatoes",
      "15ml balsamic vinegar",
      "60ml olive oil",
      "40ml rice flour + 15ml tapioca starch + 5ml xanthan gum (for better binding)",
      "500ml oat milk",
      "30g nutritional yeast",
      "5ml Dijon mustard",
      "120g cooked lentils",
      "30g hemp hearts",
      "Sea salt and black pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2.5,
      vegetables: ["onion", "garlic", "sun-dried tomatoes", "canned tomatoes"],
      benefits: ["lycopene from tomatoes", "antioxidants from garlic", "fiber from vegetables"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 180°C fan / 390°F, grill setting",
        "Make breadcrumbs by pulsing gluten-free bread in blender until coarse crumbs form",
        "Heat 30ml olive oil in large pan over medium heat",
        "Add diced onion, garlic, and sun-dried tomatoes with pinch of salt",
        "Cook 5-10 minutes until onions soften, stirring through oregano",
        "Add tomato paste, canned tomatoes, and balsamic vinegar",
        "Mix well and simmer 10-15 minutes until sauce thickens",
        "Meanwhile, cook gluten-free pasta according to package instructions and drain",
        "For white sauce: heat remaining oil and rice flour mixture in medium pan",
        "Whisk to form smooth paste, cook 2-3 minutes over medium-high heat (rice flour creates better texture)",
        "Gradually stream in oat milk, whisking constantly until smooth and thick",
        "Add nutritional yeast, mustard, cooked lentils, hemp hearts, salt and pepper",
        "Combine pasta with tomato sauce in baking dish",
        "Spoon white sauce over top and scatter with breadcrumbs",
        "Bake 5-10 minutes until golden and bubbling"
      ],
      tips: [
        "Use certified gluten-free bread for safe breadcrumbs",
        "Rice flour + tapioca starch + xanthan gum creates better texture than single flour",
        "Pre-cooked lentils work best - canned or leftover home-cooked",
        "Hemp hearts add extra protein and nutty flavor"
      ],
      notes: "Gluten-free version using rice flour blend with xanthan gum for optimal texture, plus lentils and hemp hearts for extra plant protein"
    },
    createdAt: new Date('2025-08-30'),
    active: true
  },
  {
    name: "Protein-Packed Quinoa Breakfast Porridge with Banana & Peanut Butter",
    portion: "1 bowl (about 300g)",
    nutrition: {
      protein: 26,
      prepTime: 8,
      calories: 420,
      carbohydrates: 52,
      fats: 14,
      fiber: 9,
      sugar: 18,
      sodium: 120,
      potassium: 580,
      calcium: 140,
      iron: 3.2,
      vitaminC: 8,
      costEuros: 2.60,
      proteinPerEuro: 10.0
    },
    category: "breakfast",
    tags: ["vegetarian", "gluten-free", "high-protein", "quick", "wholesome"],
    ingredients: [
      "30ml quinoa (uncooked)",
      "30g porridge oats",
      "100ml oat milk",
      "30ml frozen blueberries",
      "1 ripe banana, sliced",
      "15ml peanut butter",
      "15ml ground flaxseeds",
      "30g vanilla protein powder",
      "Pinch of cinnamon"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1.5,
      vegetables: ["banana", "blueberries"],
      benefits: ["antioxidants from blueberries", "potassium from banana", "omega-3 from flaxseeds"]
    },
    recipe: {
      instructions: [
        "Place cooked quinoa, porridge oats, oat milk, and frozen blueberries in small saucepan",
        "Cook over medium heat, stirring frequently until oat milk is absorbed and oats are tender (4-5 minutes)",
        "Alternatively, microwave on high for 1 minute at a time, stirring between intervals until tender",
        "Slice half the banana into the pan and gently mash with fork while stirring through porridge",
        "Transfer to serving bowl and top with remaining banana slices",
        "Add dollop of peanut butter and sprinkle with ground flaxseeds",
        "Dust with cinnamon and serve immediately while warm"
      ],
      tips: [
        "Use pre-cooked quinoa to save time - cook a batch ahead",
        "Frozen blueberries work better than fresh as they break down slightly",
        "Adjust liquid if porridge becomes too thick"
      ],
      notes: "A protein-rich breakfast combining quinoa's complete amino acids with oats for sustained energy"
    },
    createdAt: new Date('2025-08-30'),
    active: true
  },
  {
    name: "One-Pan Masala Mushroom Rice with Cashews",
    portion: "1 generous serving (about 400g)",
    nutrition: {
      protein: 24,
      prepTime: 60,
      calories: 485,
      carbohydrates: 58,
      fats: 18,
      fiber: 6,
      sugar: 8,
      sodium: 680,
      potassium: 720,
      calcium: 85,
      iron: 4.8,
      vitaminC: 12,
      costEuros: 4.20,
      proteinPerEuro: 5.7
    },
    category: "dinner",
    tags: ["vegetarian", "gluten-free", "one-pan", "indian", "aromatic", "high-protein"],
    ingredients: [
      "300g chestnut mushrooms, halved",
      "60ml coconut yogurt",
      "20g fresh ginger, finely chopped",
      "2 garlic cloves, minced",
      "1 brown onion, thinly sliced",
      "5ml garam masala",
      "150g basmati rice, rinsed",
      "270ml boiling water",
      "Pinch of saffron",
      "Pinch of sea salt",
      "15ml olive oil",
      "15g fresh coriander, chopped",
      "50g cashews, toasted",
      "120g cooked chickpeas",
      "30g hemp hearts"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["mushrooms", "onion", "ginger", "garlic"],
      benefits: ["umami from mushrooms", "anti-inflammatory ginger", "prebiotics from onion"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 180°C fan / 350°F",
        "In large bowl, combine halved mushrooms, coconut yogurt, chopped ginger, and pinch of salt",
        "Set mushroom mixture aside to marinate",
        "Heat olive oil in medium oven-safe casserole dish over medium heat",
        "Add sliced onion and garam masala, cook 8-10 minutes until softened and fragrant",
        "Remove pan from heat and stir in marinated mushroom mixture",
        "Cover with lid and place in oven for 30 minutes until mushrooms are tender",
        "Remove from oven and stir in rinsed rice, boiling water, cooked chickpeas, and salt",
        "Scatter saffron over top and replace lid",
        "Return to oven for 15 minutes until rice is just cooked",
        "Let stand 5-10 minutes to absorb steam and make rice light and fluffy",
        "Fluff with fork and top with fresh coriander, toasted cashews, and hemp hearts before serving"
      ],
      tips: [
        "Rinse basmati rice until water runs clear for best texture",
        "Toast cashews in dry pan for 2-3 minutes for extra flavor",
        "Add handful of spinach or peas before serving for extra greens as suggested"
      ],
      notes: "Protein-enhanced version with chickpeas and hemp hearts to meet high-protein requirements"
    },
    createdAt: new Date('2025-08-30'),
    active: true
  },
  {
    name: "Chickpea, Tofu & Harissa Stew",
    portion: "1 generous serving (about 350g)",
    nutrition: {
      protein: 28,
      prepTime: 30,
      calories: 395,
      carbohydrates: 42,
      fats: 16,
      fiber: 12,
      sugar: 14,
      sodium: 720,
      potassium: 890,
      calcium: 165,
      iron: 6.2,
      vitaminC: 35,
      costEuros: 3.20,
      proteinPerEuro: 8.8
    },
    category: "dinner",
    tags: ["vegetarian", "gluten-free", "high-protein", "spicy", "north-african", "hearty", "ayurvedic", "warming"],
    ingredients: [
      "15ml toasted sesame oil",
      "5ml ground cumin",
      "5ml hot smoked paprika",
      "400g canned chopped tomatoes",
      "3 garlic cloves, minced",
      "30ml tomato paste",
      "1 onion, diced",
      "240g canned chickpeas, drained",
      "100g fresh spinach",
      "200g firm tofu, cubed",
      "30ml harissa paste",
      "5ml tamari",
      "2.5ml maple syrup",
      "Half lemon, juiced",
      "30ml coconut yogurt",
      "Sea salt and black pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["onion", "garlic", "tomatoes", "spinach"],
      benefits: ["lycopene from tomatoes", "iron from spinach", "fiber from chickpeas"]
    },
    recipe: {
      instructions: [
        "Heat sesame oil in large frying pan over medium heat",
        "Add diced onion with pinch of salt, cook stirring often until softened (about 10 minutes)",
        "Reduce heat to low if necessary to prevent browning",
        "Add minced garlic and cook, stirring frequently, for 2 minutes",
        "Stir in cumin and paprika, cook stirring throughout until fragrant (about 1 minute)",
        "Add chickpeas, cubed tofu, chopped tomatoes, tomato paste, and harissa paste",
        "Cook stirring often until tomatoes have darkened and reduced (10-15 minutes)",
        "Stir in fresh spinach and allow to wilt (1-2 minutes)",
        "Add tamari, maple syrup, and lemon juice",
        "Taste and season with salt and pepper as needed",
        "Remove from heat and stir in coconut yogurt before serving"
      ],
      tips: [
        "Harissa spice levels vary by brand - taste yours first and adjust amount accordingly",
        "If stew becomes too spicy, add more coconut yogurt to mellow it out",
        "Serve with roasted sweet potatoes, rice noodles, or brown rice as suggested"
      ],
      notes: "A hearty plant-based stew packed with protein from chickpeas and tofu, with warming North African spices"
    },
    createdAt: new Date('2025-08-30'),
    active: true
  },
  {
    name: "Oat & Quinoa Porridge with Apple & Cinnamon",
    portion: "1 bowl (about 250g)",
    nutrition: {
      protein: 22,
      prepTime: 10,
      calories: 385,
      carbohydrates: 48,
      fats: 12,
      fiber: 8,
      sugar: 16,
      sodium: 85,
      potassium: 420,
      calcium: 150,
      iron: 3.8,
      vitaminC: 6,
      costEuros: 2.40,
      proteinPerEuro: 9.2
    },
    category: "breakfast",
    tags: ["vegetarian", "gluten-free", "high-protein", "quick", "wholesome", "winter", "ayurvedic"],
    ingredients: [
      "30ml cooked quinoa",
      "30g porridge oats",
      "15ml shelled hemp seeds",
      "100ml oat milk",
      "1 apple, roughly grated",
      "Small handful almonds, chopped",
      "15ml raisins",
      "2.5ml ground cinnamon",
      "30g vanilla protein powder"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1,
      vegetables: ["apple"],
      benefits: ["fiber from apple", "omega-3 from hemp seeds", "antioxidants from cinnamon"]
    },
    recipe: {
      instructions: [
        "Place cooked quinoa, porridge oats, hemp seeds, and oat milk in small saucepan over medium heat",
        "Cook, stirring frequently, until oat milk has been absorbed and oats are tender (about 5 minutes)",
        "Alternatively, microwave on high for 1 minute at a time, stopping to stir until oats are tender (3-4 minutes total)",
        "Add grated apple, chopped almonds, raisins, and cinnamon to the pan",
        "Cook until heated through, stirring gently to combine",
        "Stir in protein powder until well mixed",
        "Serve immediately while warm, or place apple, raisins, and almonds on top as garnish and dust with cinnamon"
      ],
      tips: [
        "Pre-cook quinoa in batches for quick breakfast prep throughout the week",
        "Grate apple just before adding to prevent browning",
        "Perfect for winter meal prep - quinoa adds protein and creamy texture"
      ],
      notes: "Enhanced with protein powder and hemp seeds to boost protein content while maintaining the satisfying winter breakfast appeal"
    },
    createdAt: new Date('2025-08-30'),
    active: true
  },
  {
    name: "Chickpea & Potato Pancakes with Warm Veggie Salsa",
    portion: "2 medium pancakes with salsa (about 300g)",
    nutrition: {
      protein: 26,
      prepTime: 25,
      calories: 420,
      carbohydrates: 52,
      fats: 14,
      fiber: 11,
      sugar: 9,
      sodium: 650,
      potassium: 890,
      calcium: 120,
      iron: 4.8,
      vitaminC: 45,
      costEuros: 2.80,
      proteinPerEuro: 9.3
    },
    category: "dinner",
    tags: ["vegetarian", "gluten-free", "hearty", "one-pan", "protein-rich", "mediterranean"],
    ingredients: [
      "60g gram flour (chickpea flour)",
      "5ml olive oil (for batter)",
      "5ml fine sea salt",
      "75g potatoes, cut into 1cm pieces",
      "Half large red onion, finely chopped",
      "Half sweet red pepper, finely chopped",
      "70g cherry tomatoes, halved",
      "Handful fresh spinach",
      "120g cooked chickpeas",
      "30g hemp hearts",
      "60ml water",
      "Pinch sea salt and black pepper",
      "7.5ml olive oil (for drizzling)",
      "Extra olive oil for cooking"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["potatoes", "onion", "red pepper", "cherry tomatoes", "spinach"],
      benefits: ["vitamin C from peppers", "lycopene from tomatoes", "iron from spinach"]
    },
    recipe: {
      instructions: [
        "Make pancake batter by whisking gram flour, 5ml olive oil, and salt with 60ml water until combined with no lumps",
        "Set batter aside to rest",
        "Heat generous drizzle of olive oil in non-stick frying pan over medium heat",
        "Add potato pieces with pinch of salt, cook stirring frequently until golden brown and tender (about 10 minutes)",
        "Transfer cooked potatoes to plate",
        "Return pan to heat with small drizzle of oil",
        "Spoon pancake batter into pan - make 2 medium pancakes or 1 large",
        "Sprinkle cooked potato pieces and chickpeas on top",
        "Cook until golden brown on both sides (about 2 minutes per side, add 1-2 minutes if making 1 large pancake)",
        "Transfer pancakes to serving plate",
        "Add another drizzle of oil to pan and add onion, pepper, and tomatoes",
        "Cook until hot and juicy (about 3 minutes)",
        "Stir in spinach and cook until wilted (1-2 minutes)",
        "Season veggie salsa with salt and pepper",
        "Spoon warm veggie salsa on top of pancakes and sprinkle with hemp hearts",
        "Serve immediately"
      ],
      tips: [
        "Potato sizes vary - you only need enough to scatter across pancake surface",
        "Let batter rest while preparing vegetables for better texture",
        "Don't overcook the vegetables - they should remain vibrant and juicy"
      ],
      notes: "Protein-enhanced with chickpeas and hemp hearts, inspired by socca (Southern French chickpea pancakes)"
    },
    createdAt: new Date('2025-08-30'),
    active: true
  },
  {
    name: "Chickpea & Potato Pancakes with Warm Veggie Salsa (Gluten-Free)",
    portion: "2 medium pancakes with salsa (about 300g)",
    nutrition: {
      protein: 24,
      prepTime: 25,
      calories: 395,
      carbohydrates: 49,
      fats: 13,
      fiber: 10,
      sugar: 8,
      sodium: 620,
      potassium: 860,
      calcium: 110,
      iron: 4.5,
      vitaminC: 45,
      costEuros: 2.90,
      proteinPerEuro: 8.3
    },
    category: "dinner",
    tags: ["vegetarian", "gluten-free", "hearty", "one-pan", "protein-rich", "mediterranean"],
    ingredients: [
      "60g gram flour (chickpea flour, certified gluten-free)",
      "5ml olive oil (for batter)",
      "5ml fine sea salt",
      "75g potatoes, cut into 1cm pieces",
      "Half large red onion, finely chopped",
      "Half sweet red pepper, finely chopped",
      "70g cherry tomatoes, halved",
      "Handful fresh spinach",
      "100g cooked lentils",
      "25g hemp hearts",
      "60ml water",
      "Pinch sea salt and black pepper",
      "7.5ml olive oil (for drizzling)",
      "Extra olive oil for cooking"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["potatoes", "onion", "red pepper", "cherry tomatoes", "spinach"],
      benefits: ["vitamin C from peppers", "lycopene from tomatoes", "iron from spinach"]
    },
    recipe: {
      instructions: [
        "Make pancake batter by whisking certified gluten-free gram flour, 5ml olive oil, and salt with 60ml water until combined with no lumps",
        "Set batter aside to rest",
        "Heat generous drizzle of olive oil in non-stick frying pan over medium heat",
        "Add potato pieces with pinch of salt, cook stirring frequently until golden brown and tender (about 10 minutes)",
        "Transfer cooked potatoes to plate",
        "Return pan to heat with small drizzle of oil",
        "Spoon pancake batter into pan - make 2 medium pancakes or 1 large",
        "Sprinkle cooked potato pieces and lentils on top",
        "Cook until golden brown on both sides (about 2 minutes per side, add 1-2 minutes if making 1 large pancake)",
        "Transfer pancakes to serving plate",
        "Add another drizzle of oil to pan and add onion, pepper, and tomatoes",
        "Cook until hot and juicy (about 3 minutes)",
        "Stir in spinach and cook until wilted (1-2 minutes)",
        "Season veggie salsa with salt and pepper",
        "Spoon warm veggie salsa on top of pancakes and sprinkle with hemp hearts",
        "Serve immediately"
      ],
      tips: [
        "Use certified gluten-free gram flour to ensure safety",
        "Cooked lentils provide excellent protein and fiber",
        "Gram flour is naturally gluten-free but check certification for celiac safety"
      ],
      notes: "Gluten-free version using certified chickpea flour with lentils and hemp hearts for protein"
    },
    createdAt: new Date('2025-08-30'),
    active: true
  },
  {
    name: "High Protein Sweet Potato Traybake with Tahini Mustard Dressing",
    portion: "1 generous serving (about 350g)",
    nutrition: {
      protein: 24,
      prepTime: 45,
      calories: 420,
      carbohydrates: 48,
      fats: 16,
      fiber: 12,
      sugar: 14,
      sodium: 580,
      potassium: 920,
      calcium: 180,
      iron: 5.2,
      vitaminC: 35,
      costEuros: 3.80,
      proteinPerEuro: 6.3
    },
    category: "dinner",
    tags: ["vegetarian", "gluten-free", "high-protein", "colorful", "meal-prep", "traybake"],
    ingredients: [
      "130g sweet potato, cut into 2cm cubes",
      "5ml ground cumin",
      "2.5ml ground cinnamon",
      "2.5ml smoked paprika",
      "480g canned black beans (2 x 400g cans), drained and rinsed",
      "100g frozen edamame beans, defrosted",
      "2 large handfuls kale, stalks removed and torn into bite-sized pieces",
      "15ml olive oil (for roasting)",
      "Pinch of sea salt and black pepper",
      "30ml tahini",
      "Half lemon, juiced",
      "5ml smooth Dijon mustard",
      "5ml maple syrup",
      "30ml boiling water",
      "5ml sesame seeds (optional)"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["sweet potato", "kale"],
      benefits: ["beta-carotene from sweet potato", "iron and calcium from kale", "antioxidants from spices"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 200°C fan / 390°F",
        "Place sweet potato cubes on baking tray and drizzle lightly with olive oil",
        "Sprinkle with ground cumin, cinnamon, smoked paprika and pinch of salt",
        "Using clean hands, rub oil and spices into sweet potatoes until evenly coated",
        "Bake for 40-45 minutes, turning halfway through to ensure even cooking",
        "While sweet potatoes roast, make tahini mustard dressing in medium bowl",
        "Whisk together tahini, lemon juice, Dijon mustard, maple syrup and boiling water until smooth and creamy",
        "Add salt to taste and set aside",
        "Place kale in medium bowl and add 2.5ml olive oil",
        "Massage gently for 1 minute until kale darkens and reduces in size",
        "Add drained black beans and edamame beans to massaged kale and toss to combine",
        "Once sweet potatoes have been cooking for 30 minutes, add kale and bean mixture to tray",
        "Bake for further 10 minutes until kale is slightly crispy",
        "Remove from oven and serve half portion in bowl",
        "Drizzle with half of tahini mustard dressing and sprinkle with sesame seeds if desired",
        "Reserve remainder for lunch on day 7 of meal plan"
      ],
      tips: [
        "Chopping sweet potato into small 2cm pieces ensures quick cooking",
        "Massaging kale with oil helps break down tough fibers",
        "Perfect for meal prep - makes 2 servings as suggested"
      ],
      notes: "Vibrant no-fuss midweek meal packed with plant-based protein from black beans and edamame, finished with creamy tahini dressing"
    },
    createdAt: new Date('2025-08-30'),
    active: true
  },
  {
    name: "Creamy Black-Eyed Beans & Mushrooms",
    portion: "1 generous serving (about 400g with rice)",
    nutrition: {
      protein: 22,
      prepTime: 40,
      calories: 450,
      carbohydrates: 68,
      fats: 12,
      fiber: 14,
      sugar: 8,
      sodium: 520,
      potassium: 850,
      calcium: 140,
      iron: 6.2,
      vitaminC: 15,
      costEuros: 3.60,
      proteinPerEuro: 6.1
    },
    category: "dinner",
    tags: ["vegetarian", "gluten-free", "high-protein", "curry-style", "creamy", "wholesome", "ayurvedic"],
    ingredients: [
      "75g brown rice (per serving)",
      "1 medium white onion, finely sliced",
      "1 clove garlic, minced",
      "5ml ground turmeric",
      "100g mushrooms, finely sliced (mix of brown chestnut & shiitake)",
      "120g black-eyed peas (half 400g tin), drained and rinsed",
      "100ml light coconut milk",
      "7.5g fresh coriander",
      "1 lemon, zested and juiced",
      "15ml olive oil",
      "Pinch of sea salt and black pepper",
      "Red chilli flakes (optional)"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["onion", "garlic", "mushrooms"],
      benefits: ["umami from mushrooms", "anti-inflammatory turmeric", "prebiotics from onion"]
    },
    recipe: {
      instructions: [
        "Place brown rice in saucepan with 150ml water and pinch of salt (2.5ml)",
        "Cover and bring to gentle simmer, bubble gently for 20 minutes until most water is absorbed",
        "Turn off heat and allow rice to steam gently in residual heat",
        "Meanwhile, heat drizzle of olive oil in heavy-bottomed frying pan over medium-high heat",
        "Add sliced onions and cook 10-12 minutes until softened, translucent and beginning to caramelise",
        "Add minced garlic and turmeric, stir until onions have absorbed turmeric and are bright yellow",
        "Add sliced mushrooms and cook 5-6 minutes until softened and reduced",
        "Add black-eyed peas and coconut milk, bring to gentle simmer",
        "Leave to bubble gently for further 5-6 minutes until thickened and reduced",
        "Scatter with fresh coriander and top with lemon zest and juice",
        "Sprinkle with red chilli flakes if desired",
        "Serve in bowls with portions of brown rice"
      ],
      tips: [
        "Brown rice can be cooked ahead and reheated",
        "Mix of mushroom varieties adds depth of flavor",
        "Don't rush the onion caramelisation - it builds the flavor base"
      ],
      notes: "Veggie-packed dish similar to a delicate curry - light, fresh, zesty but also creamy and satisfying"
    },
    createdAt: new Date('2025-08-30'),
    active: true
  },
  {
    name: "Warming Sweet Potato & Lentil Stew",
    portion: "1 generous serving (about 400g)",
    nutrition: {
      protein: 20,
      prepTime: 30,
      calories: 420,
      carbohydrates: 72,
      fats: 8,
      fiber: 16,
      sugar: 12,
      sodium: 480,
      potassium: 950,
      calcium: 120,
      iron: 7.2,
      vitaminC: 25,
      costEuros: 3.20,
      proteinPerEuro: 6.3
    },
    category: "dinner",
    tags: ["vegetarian", "gluten-free", "high-protein", "one-pan", "warming", "ayurvedic", "hearty"],
    ingredients: [
      "1 medium white onion, finely chopped",
      "2 cloves garlic, minced",
      "2 sweet potatoes, peeled and cut into small 1cm pieces",
      "150g dried red lentils",
      "800g canned chopped tomatoes (2 x 400g cans)",
      "100g quinoa",
      "200g baby leaf spinach, finely sliced",
      "45ml rose harissa paste",
      "45ml tahini",
      "15ml olive oil",
      "Pinch of sea salt and black pepper"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["onion", "garlic", "sweet potatoes", "tomatoes", "spinach"],
      benefits: ["beta-carotene from sweet potato", "iron from spinach and lentils", "lycopene from tomatoes"]
    },
    recipe: {
      instructions: [
        "Place large heavy-bottomed pan over medium-high heat and add drizzle of olive oil",
        "Add chopped onion, garlic and sprinkle of salt and pepper",
        "Cook, stirring frequently, for 3-4 minutes until softened and translucent",
        "Add chopped sweet potato, red lentils, canned tomatoes and quinoa to pan",
        "Fill each empty tomato tin with water and pour into the pan",
        "Stir well and bring to gentle simmer",
        "Leave to bubble gently for 20-25 minutes, stirring occasionally, until everything is tender and cooked",
        "Add finely sliced spinach several minutes before end of cooking time",
        "Once spinach is wilted, stir through rose harissa and tahini",
        "Adjust seasoning to taste and serve"
      ],
      tips: [
        "Chop sweet potato into small 1cm pieces to ensure speedy cooking",
        "Once cooked, keep in fridge for up to 3 days - perfect for meal prep",
        "Rose harissa adds warming spice - adjust amount to taste preference"
      ],
      notes: "One-pan wonder similar to dhal in texture and body - quick, easy but flavoursome supper with warming Ayurvedic spices"
    },
    createdAt: new Date('2025-08-30'),
    active: true
  },
  {
    name: "Super-Charged Peanut Noodles",
    portion: "1 generous serving (about 400g)",
    nutrition: {
      protein: 24,
      prepTime: 30,
      calories: 485,
      carbohydrates: 58,
      fats: 18,
      fiber: 12,
      sugar: 14,
      sodium: 650,
      potassium: 720,
      calcium: 95,
      iron: 4.8,
      vitaminC: 45,
      costEuros: 3.80,
      proteinPerEuro: 6.3
    },
    category: "dinner",
    tags: ["vegetarian", "dairy-free", "high-protein", "asian-fusion", "quick", "one-pan", "nutritious"],
    ingredients: [
      "120g cashews",
      "60g sunflower seeds", 
      "250ml boiling water",
      "30ml peanut butter",
      "2 limes, juiced",
      "15ml tamari",
      "1.25ml dried red chilli flakes",
      "15ml maple syrup",
      "15ml sriracha",
      "300g rice noodles",
      "1 x 5cm piece ginger, peeled & finely chopped",
      "1 clove garlic, minced",
      "200g chestnut mushrooms, finely sliced",
      "1 red pepper, deseeded & chopped into bite-sized pieces",
      "Half Savoy cabbage, cored & finely sliced",
      "100g frozen edamame beans, defrosted",
      "15ml toasted sesame oil",
      "Pinch of sea salt"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["ginger", "garlic", "mushrooms", "red pepper", "cabbage"],
      benefits: ["vitamin C from red pepper", "fiber from cabbage", "antioxidants from mushrooms"]
    },
    recipe: {
      instructions: [
        "Add cashews and sunflower seeds to bowl and cover with freshly boiled water",
        "Allow to soak for 5 minutes, then place into blender with soaking water",
        "Add peanut butter, lime juice, tamari, maple syrup and sriracha to blender",
        "Blitz until smooth and creamy, then set aside",
        "Fill medium saucepan with water and place over medium-high heat",
        "Bring to boil, cook rice noodles according to packet instructions then drain",
        "Heat frying pan over medium-high heat, add drizzle of sesame oil",
        "Add chopped ginger and garlic, along with pinch of salt",
        "Cook for 1 minute until fragrant, then add sliced mushrooms",
        "Cook for 7-8 minutes until darkened and reduced",
        "Add red pepper, cabbage and edamame and cook for 2-3 minutes until tender and reduced",
        "Toss cooked noodles with creamy sauce and vegetables",
        "Ensure all vegetables and noodles are coated in the creamy sauce",
        "If pan isn't large enough, mix everything in large bowl with boiling water poured away first"
      ],
      tips: [
        "Soaking cashews makes them blend smoother for creamier sauce",
        "Feel free to use whatever vegetables you have - defrosted mixed vegetables or stir-fry mix work well",
        "Adjust sriracha and chilli flakes to taste preference"
      ],
      notes: "DIY 'fakeaway' noodle dish full of nutritious veggies and packed with plant-based protein from cashews, sunflower seeds and edamame"
    },
    createdAt: new Date('2025-08-30'),
    active: true
  }
];

// Function to automatically generate dietary variants for every recipe
function generateDietaryVariants(recipes: MealOption[]): MealOption[] {
  const variants: MealOption[] = [];
  
  for (const recipe of recipes) {
    // Skip if already a variant (to avoid infinite loops)
    if (recipe.name.toLowerCase().includes('gluten-free') || 
        recipe.name.toLowerCase().includes('lactose-free') || 
        recipe.name.toLowerCase().includes('vegetarian version')) {
      continue;
    }
    
    console.log(`🔄 GENERATING VARIANTS for: "${recipe.name}"`);
    
    // 1. GLUTEN-FREE VERSION - Only if recipe contains gluten ingredients
    const hasGlutenIngredients = recipe.ingredients?.some(ing => 
      (ing.toLowerCase().includes('pasta') && !ing.toLowerCase().includes('gluten-free')) ||
      (ing.toLowerCase().includes('flour') && !ing.toLowerCase().includes('gluten-free')) ||
      (ing.toLowerCase().includes('bread') && !ing.toLowerCase().includes('gluten-free')) ||
      (ing.toLowerCase().includes('soy sauce') && !ing.toLowerCase().includes('gluten-free')) ||
      ing.toLowerCase().includes('wheat')
    );
    
    let glutenFreeVersion: MealOption;
    
    if (hasGlutenIngredients) {
      // Create modified version for recipes with gluten
      glutenFreeVersion = {
        ...recipe,
        name: `${recipe.name} (Gluten-Free)`,
        tags: [...recipe.tags.filter(tag => tag !== 'wheat'), 'gluten-free'],
        ingredients: recipe.ingredients?.map(ingredient => {
          // Convert gluten-containing ingredients
          if (ingredient.toLowerCase().includes('pasta') && !ingredient.toLowerCase().includes('gluten-free')) {
            return ingredient.replace('pasta', 'gluten-free pasta (rice or chickpea)');
          }
          if (ingredient.toLowerCase().includes('flour') && !ingredient.toLowerCase().includes('gluten-free')) {
            return ingredient.replace('flour', 'gluten-free flour blend');
          }
          if (ingredient.toLowerCase().includes('bread') && !ingredient.toLowerCase().includes('gluten-free')) {
            return ingredient.replace('bread', 'gluten-free bread');
          }
          if (ingredient.toLowerCase().includes('soy sauce') && !ingredient.toLowerCase().includes('gluten-free')) {
            return ingredient.replace('soy sauce', 'gluten-free tamari');
          }
          if (ingredient.toLowerCase().includes('wheat')) {
            return ingredient.replace(/wheat/gi, 'gluten-free grain');
          }
          return ingredient;
        }),
        recipe: recipe.recipe ? {
          ...recipe.recipe,
          notes: `Gluten-free version using alternative grains and flours. ${recipe.recipe.notes || ''}`.trim(),
          tips: [
            ...(recipe.recipe.tips || []),
            "Gluten-free products may need different cooking times",
            "Check labels to ensure all ingredients are certified gluten-free"
          ]
        } : undefined,

      };
    } else {
      // Recipe is naturally gluten-free - just add the tag
      glutenFreeVersion = {
        ...recipe,
        tags: [...recipe.tags, 'gluten-free']
      };
    }
    
    // 2. LACTOSE-FREE VERSION - Only if recipe contains dairy ingredients
    const hasDairyIngredients = recipe.ingredients?.some(ing => 
      (ing.toLowerCase().includes('milk') && !ing.toLowerCase().includes('almond') && !ing.toLowerCase().includes('coconut') && !ing.toLowerCase().includes('oat')) ||
      (ing.toLowerCase().includes('cream') && !ing.toLowerCase().includes('coconut')) ||
      (ing.toLowerCase().includes('butter') && !ing.toLowerCase().includes('nut') && !ing.toLowerCase().includes('peanut')) ||
      (ing.toLowerCase().includes('cheese') && !ing.toLowerCase().includes('vegan')) ||
      (ing.toLowerCase().includes('yogurt') && !ing.toLowerCase().includes('coconut')) ||
      ing.toLowerCase().includes('parmesan')
    );
    
    let lactoseFreeVersion: MealOption;
    
    if (hasDairyIngredients) {
      // Create modified version for recipes with dairy
      lactoseFreeVersion = {
        ...recipe,
        name: `${recipe.name} (Lactose-Free)`,
        tags: [...recipe.tags, 'lactose-free', 'dairy-free'],
        ingredients: recipe.ingredients?.map(ingredient => {
          // Convert dairy ingredients
          if (ingredient.toLowerCase().includes('milk') && !ingredient.toLowerCase().includes('almond') && !ingredient.toLowerCase().includes('coconut') && !ingredient.toLowerCase().includes('oat')) {
            return ingredient.replace(/milk/gi, 'oat milk');
          }
          if (ingredient.toLowerCase().includes('cream') && !ingredient.toLowerCase().includes('coconut')) {
            return ingredient.replace(/cream/gi, 'coconut cream');
          }
          if (ingredient.toLowerCase().includes('butter') && !ingredient.toLowerCase().includes('nut') && !ingredient.toLowerCase().includes('peanut')) {
            return ingredient.replace(/butter/gi, 'vegan butter');
          }
          if (ingredient.toLowerCase().includes('cheese') && !ingredient.toLowerCase().includes('vegan')) {
            return ingredient.replace(/cheese/gi, 'vegan cheese');
          }
          if (ingredient.toLowerCase().includes('yogurt') && !ingredient.toLowerCase().includes('coconut')) {
            return ingredient.replace(/yogurt/gi, 'coconut yogurt');
          }
          if (ingredient.toLowerCase().includes('parmesan')) {
            return ingredient.replace(/parmesan/gi, 'nutritional yeast');
          }
          return ingredient;
        }),
        recipe: recipe.recipe ? {
          ...recipe.recipe,
          notes: `Lactose-free version using plant-based dairy alternatives. ${recipe.recipe.notes || ''}`.trim(),
          tips: [
            ...(recipe.recipe.tips || []),
            "Plant-based milks may have different consistencies",
            "Coconut cream works best for rich, creamy textures"
          ]
        } : undefined,

      };
    } else {
      // Recipe is naturally lactose-free - just add the tag
      lactoseFreeVersion = {
        ...recipe,
        tags: [...recipe.tags, 'lactose-free', 'dairy-free']
      };
    }
    
    // 3. VEGETARIAN VERSION (for meat-containing recipes, excluding fish/seafood)
    const hasMeat = recipe.ingredients?.some(ing => 
      ing.toLowerCase().includes('chicken') || 
      ing.toLowerCase().includes('beef') || 
      ing.toLowerCase().includes('pork') || 
      ing.toLowerCase().includes('lamb') || 
      ing.toLowerCase().includes('turkey') || 
      ing.toLowerCase().includes('bacon') || 
      ing.toLowerCase().includes('ham') || 
      ing.toLowerCase().includes('sausage')
    );
    
    // Check if recipe contains fish/seafood (we won't create vegetarian versions for these)
    const hasFish = recipe.ingredients?.some(ing => 
      ing.toLowerCase().includes('fish') || 
      ing.toLowerCase().includes('salmon') || 
      ing.toLowerCase().includes('tuna') || 
      ing.toLowerCase().includes('shrimp') ||
      ing.toLowerCase().includes('crab') ||
      ing.toLowerCase().includes('cod') ||
      ing.toLowerCase().includes('halibut')
    );
    
    if (hasMeat && !hasFish && !recipe.tags.includes('vegetarian')) {
      const vegetarianVersion: MealOption = {
        ...recipe,
        name: `${recipe.name} (Vegetarian)`,
        tags: [...recipe.tags.filter(tag => !['non-vegetarian'].includes(tag)), 'vegetarian'],
        ingredients: recipe.ingredients?.map(ingredient => {
          // Convert meat ingredients using Dutch vegetarian substitutes
          if (ingredient.toLowerCase().includes('chicken')) {
            return ingredient.replace(/chicken/gi, 'kipstukjes van vegetarische slager');
          }
          if (ingredient.toLowerCase().includes('beef') || ingredient.toLowerCase().includes('ground beef')) {
            return ingredient.replace(/beef|ground beef/gi, 'Beyond Meat gehakt');
          }
          if (ingredient.toLowerCase().includes('pork')) {
            return ingredient.replace(/pork/gi, 'vegetarische spekjes');
          }
          if (ingredient.toLowerCase().includes('bacon')) {
            return ingredient.replace(/bacon/gi, 'vegetarische spek');
          }
          if (ingredient.toLowerCase().includes('ham')) {
            return ingredient.replace(/ham/gi, 'vegetarische ham');
          }
          if (ingredient.toLowerCase().includes('sausage')) {
            return ingredient.replace(/sausage/gi, 'vegetarische worst');
          }
          return ingredient;
        }),
        recipe: recipe.recipe ? {
          ...recipe.recipe,
          notes: `Vegetarian version using plant-based meat alternatives from vegetarische slager and Beyond Meat. ${recipe.recipe.notes || ''}`.trim(),
          tips: [
            ...(recipe.recipe.tips || []),
            "Vegetarian meat substitutes may cook faster than traditional meat",
            "Season well as plant-based proteins absorb flavors differently"
          ]
        } : undefined,

      };
      variants.push(vegetarianVersion);
    } else if (hasFish) {
      console.log(`🐟 SKIPPING vegetarian variant for "${recipe.name}" - contains fish/seafood (no widely available plant-based alternative)`);
    }
    
    // Add all applicable variants (but only if they're different from the original)
    if (hasGlutenIngredients || !recipe.tags.includes('gluten-free')) {
      variants.push(glutenFreeVersion);
    }
    if (hasDairyIngredients || !recipe.tags.includes('lactose-free')) {
      variants.push(lactoseFreeVersion);
    }
  }
  
  console.log(`🔄 AUTO-GENERATED: Created ${variants.length} dietary variants (gluten-free, lactose-free, vegetarian versions)`);
  return variants;
}

// Function to get complete unified meal database (now contains all recipes in one place)
export function getCompleteEnhancedMealDatabase(): MealOption[] {
  // Get base recipes
  const baseRecipes = [...ENHANCED_MEAL_DATABASE];
  
  // Auto-generate dietary variants for EVERY recipe (gluten-free, lactose-free, vegetarian versions)
  const dietaryVariants = generateDietaryVariants(baseRecipes);
  
  // Combine all recipes
  const allRecipes = [...baseRecipes, ...dietaryVariants];
  
  console.log(`📊 UNIVERSAL VARIANTS: ${baseRecipes.length} base recipes + ${dietaryVariants.length} dietary variants = ${allRecipes.length} total recipes`);
  console.log(`📊 DEVELOPER FRIENDLY: Every recipe now has gluten-free, lactose-free, and vegetarian versions using kipstukjes & Beyond Meat`);
  return allRecipes;
}

// Function to get meals from unified database filtered by dietary requirements
export function getEnhancedMealsByCategory(category: 'breakfast' | 'lunch' | 'dinner'): MealOption[] {
  const unifiedDatabase = getCompleteEnhancedMealDatabase();
  const categoryMeals = unifiedDatabase.filter(meal => meal.category === category);
  
  console.log(`📋 ${category.charAt(0).toUpperCase() + category.slice(1)} recipes available: ${categoryMeals.length}`);
  console.log(`📋 ${category} sample recipes: ${categoryMeals.slice(0, 5).map(m => m.name).join(', ')}`);
  return categoryMeals;
}

export function filterEnhancedMealsByDietaryTags(meals: MealOption[], dietaryTags: string[]): MealOption[] {
  // For users with no dietary restrictions, prioritize non-vegetarian options
  if (dietaryTags.length === 0) {
    const nonVegetarianMeals = meals.filter(meal => 
      meal.tags.includes('non-vegetarian') || meal.tags.includes('pescatarian')
    );
    const vegetarianMeals = meals.filter(meal => 
      meal.tags.includes('vegetarian') && !meal.tags.includes('non-vegetarian') && !meal.tags.includes('pescatarian')
    );
    
    // Return balanced mix: 70% meat/fish, 30% vegetarian for variety
    const meatCount = Math.ceil(nonVegetarianMeals.length * 0.7);
    const vegCount = Math.ceil(vegetarianMeals.length * 0.3);
    
    console.log(`🥩 Non-vegetarian user: Prioritizing ${meatCount} meat/fish recipes + ${vegCount} vegetarian recipes for variety`);
    
    return [
      ...nonVegetarianMeals.slice(0, meatCount),
      ...vegetarianMeals.slice(0, vegCount)
    ];
  }
  
  return meals.filter(meal => {
    // Handle critical dietary restrictions that must be enforced
    const criticalTags = ['vegetarian', 'vegan', 'gluten-free', 'lactose-free', 'dairy-free'];
    const userCriticalTags = dietaryTags.filter(tag => criticalTags.includes(tag));
    
    // SMART VEGETARIAN FILTERING: Include meals that either:
    // 1. Are tagged as vegetarian/vegan, OR
    // 2. Don't contain any meat/fish ingredients (naturally vegetarian - like pancakes)
    if (dietaryTags.includes('vegetarian') || dietaryTags.includes('vegan')) {
      // Always exclude explicitly non-vegetarian tagged meals
      if (meal.tags.includes('non-vegetarian') || meal.tags.includes('pescatarian')) {
        console.log(`🚫 SMART VEGETARIAN: "${meal.name}" excluded - tagged as non-vegetarian`);
        return false;
      }
      
      // Check for meat/fish ingredients in meals not tagged as vegetarian
      const meatIngredients = ['chicken', 'beef', 'pork', 'turkey', 'fish', 'salmon', 'tuna', 'cod', 'shrimp', 'meat', 'ground meat', 'bacon', 'ham', 'sausage', 'anchovy', 'prosciutto', 'lamb', 'duck', 'crab', 'lobster', 'ground turkey'];
      const hasMeat = meal.ingredients.some(ingredient => 
        meatIngredients.some(meat => ingredient.toLowerCase().includes(meat))
      );
      
      // If meal contains meat ingredients, exclude it
      if (hasMeat) {
        const meatFound = meal.ingredients.filter(ing => meatIngredients.some(meat => ing.toLowerCase().includes(meat)));
        console.log(`🚫 SMART VEGETARIAN: "${meal.name}" excluded - contains meat/fish: ${meatFound.join(', ')}`);
        return false;
      }
      
      // If meal doesn't contain meat and isn't tagged as vegetarian, include it (naturally vegetarian)
      if (!meal.tags.includes('vegetarian') && !meal.tags.includes('vegan') && !hasMeat) {
        console.log(`✅ SMART VEGETARIAN: "${meal.name}" included - no meat/fish found, naturally vegetarian`);
      }
    }
    
    // All critical dietary tags must be satisfied with smart lactose-free logic
    if (userCriticalTags.length > 0) {
      // Smart lactose-free filtering: include meals that don't contain dairy ingredients
      const hasDairyIngredients = meal.ingredients && meal.ingredients.some(ingredient => 
        ingredient.toLowerCase().includes('milk') ||
        ingredient.toLowerCase().includes('cheese') ||
        ingredient.toLowerCase().includes('yogurt') ||
        ingredient.toLowerCase().includes('cream') ||
        ingredient.toLowerCase().includes('butter') ||
        ingredient.toLowerCase().includes('dairy')
      );
      
      // For lactose-free requirement, check if meal has lactose-free tag OR doesn't contain dairy
      const lactoseFreeRequirement = dietaryTags.includes('lactose-free');
      const lactoseFreeSatisfied = !lactoseFreeRequirement || 
        meal.tags.includes('lactose-free') || 
        meal.tags.includes('dairy-free') || 
        !hasDairyIngredients;
      
      // Check other critical tags (vegetarian, gluten-free, etc.)
      const otherCriticalTags = userCriticalTags.filter(tag => tag !== 'lactose-free');
      
      // Smart gluten-free filtering: include meals that don't contain gluten ingredients
      let glutenFreeSatisfied = true;
      if (dietaryTags.includes('gluten-free')) {
        const hasGlutenIngredients = meal.ingredients && meal.ingredients.some(ingredient => 
          ingredient.toLowerCase().includes('flour') && !ingredient.toLowerCase().includes('gluten-free') ||
          ingredient.toLowerCase().includes('wheat') ||
          ingredient.toLowerCase().includes('bread') && !ingredient.toLowerCase().includes('gluten-free') ||
          ingredient.toLowerCase().includes('pasta') && !ingredient.toLowerCase().includes('gluten-free') ||
          ingredient.toLowerCase().includes('soy sauce') && !ingredient.toLowerCase().includes('gluten-free')
        );
        
        glutenFreeSatisfied = meal.tags.includes('gluten-free') || !hasGlutenIngredients;
      }
      
      // Check other critical tags (but allow smart gluten-free logic)
      const remainingCriticalTags = otherCriticalTags.filter(tag => tag !== 'gluten-free');
      const otherCriticalSatisfied = remainingCriticalTags.every(tag => meal.tags.includes(tag));
      
      if (!lactoseFreeSatisfied || !glutenFreeSatisfied || !otherCriticalSatisfied) {
        console.log(`🚫 "${meal.name}" excluded - lactose: ${lactoseFreeSatisfied}, gluten: ${glutenFreeSatisfied}, other: ${otherCriticalSatisfied}`);
        return false;
      }
    }
    
    // For preference tags (ayurvedic, etc.), be more flexible
    const preferenceTags = dietaryTags.filter(tag => !criticalTags.includes(tag));
    if (preferenceTags.length === 0) return true; // Only critical tags were specified
    
    // Be flexible with preference tags - if ANY preference tag matches, include the meal
    const matchingPreferenceTags = preferenceTags.filter(tag => meal.tags.includes(tag));
    return matchingPreferenceTags.length > 0;
  });
}

export async function getEnhancedMealsForCategoryAndDiet(category: 'breakfast' | 'lunch' | 'dinner', dietaryTags: string[] = [], userId?: number): Promise<MealOption[]> {
  console.log(`🎯 STREAMLINED APPROACH: category=${category}, userId=${userId}, tags=[${dietaryTags.join(', ')}]`);
  
  // Start with curated database meals
  let allMeals: MealOption[] = getEnhancedMealsByCategory(category);
  
  // Add custom recipes to the unified pool with "custom" tag
  if (userId) {
    try {
      const { storage } = await import('./storage');
      const userRecipes = await storage.getUserRecipes(userId);
      console.log(`🎯 CUSTOM RECIPES: Found ${userRecipes.length} user recipes for user ${userId}`);
      console.log(`🎯 CUSTOM RECIPES DETAILS:`, userRecipes.map(r => ({ name: r.name, mealTypes: r.mealTypes, tags: r.tags })));
      
      if (userRecipes.length > 0) {
        const customMealsForCategory = userRecipes
          .filter(recipe => recipe.mealTypes && recipe.mealTypes.includes(category))
          .map(recipe => {
            try {
              const convertedRecipe: MealOption = {
                name: recipe.name,
                portion: recipe.portion || '1 serving',
                ingredients: recipe.ingredients || [],
                nutrition: { 
                  protein: (recipe as any).nutrition?.protein || 15, 
                  calories: (recipe as any).nutrition?.calories || 400, 
                  carbohydrates: (recipe as any).nutrition?.carbohydrates || 40, 
                  fats: (recipe as any).nutrition?.fats || 15,
                  fiber: (recipe as any).nutrition?.fiber || 5,
                  sugar: (recipe as any).nutrition?.sugar || 10,
                  sodium: (recipe as any).nutrition?.sodium || 400,
                  prepTime: (recipe as any).prepTime || 30,
                  costEuros: (recipe as any).costEuros || 3.0,
                  proteinPerEuro: ((recipe as any).nutrition?.protein || 15) / ((recipe as any).costEuros || 3.0)
                },
                category: category,
                tags: [...(recipe.tags || []), 'custom'], // Add "custom" tag for priority handling
                wholeFoodLevel: 'moderate',
                vegetableContent: {
                  servings: 1,
                  vegetables: ['mixed vegetables'],
                  benefits: ['User created recipe']
                },
                recipe: {
                  instructions: recipe.instructions || [],
                  tips: (recipe as any).tips || [],
                  notes: (recipe as any).notes || ''
                }
              };
              return convertedRecipe;
            } catch (error) {
              console.warn(`Failed to convert recipe ${recipe.name}:`, error);
              return null;
            }
          })
          .filter(recipe => recipe !== null) as MealOption[];
          
        console.log(`🎯 CUSTOM RECIPES: Adding ${customMealsForCategory.length} custom ${category} recipes: ${customMealsForCategory.map(m => m.name).join(', ')}`);
        
        // Add custom recipes to unified pool with higher priority by putting them first
        allMeals = [...customMealsForCategory, ...allMeals];
        
        // Custom recipe prioritization: Move all "custom" tagged meals to the front
        const customMeals = allMeals.filter(m => m.tags.includes('custom'));
        const nonCustomMeals = allMeals.filter(m => !m.tags.includes('custom'));
        allMeals = [...customMeals, ...nonCustomMeals];
        
        console.log(`🎯 PRIORITIZED: ${customMeals.length} custom recipes moved to front of ${allMeals.length} total meals`);
      }
    } catch (error) {
      console.warn(`Failed to load custom recipes for user ${userId}:`, error);
    }
  }
  
  console.log(`🔍 UNIFIED POOL: ${allMeals.length} total ${category} meals (${allMeals.filter(m => m.tags.includes('custom')).length} custom + ${allMeals.filter(m => !m.tags.includes('custom')).length} curated)`);
  
  // CUSTOM RECIPE PROTECTION: Separate custom recipes before filtering to ensure they're preserved
  const customRecipesBeforeFiltering = allMeals.filter(m => m.tags.includes('custom'));
  const curatedRecipes = allMeals.filter(m => !m.tags.includes('custom'));
  
  console.log(`🛡️ PROTECTING: ${customRecipesBeforeFiltering.length} custom recipes before dietary filtering`);
  
  // Filter only curated recipes by dietary tags (be more lenient with custom recipes)
  let filteredCuratedMeals = filterEnhancedMealsByDietaryTags(curatedRecipes, dietaryTags);
  
  // For custom recipes, apply more lenient filtering (assume user knows their dietary needs)
  let filteredCustomMeals = customRecipesBeforeFiltering.filter(meal => {
    // Only exclude custom recipes if they explicitly conflict with critical dietary restrictions
    if (dietaryTags.includes('vegetarian') && meal.tags.includes('non-vegetarian')) {
      console.log(`🚫 CUSTOM EXCLUDED: "${meal.name}" - explicitly non-vegetarian`);
      return false;
    }
    if (dietaryTags.includes('vegan') && meal.tags.includes('non-vegan')) {
      console.log(`🚫 CUSTOM EXCLUDED: "${meal.name}" - explicitly non-vegan`);
      return false;
    }
    // Otherwise, assume user's custom recipes match their dietary needs
    console.log(`✅ CUSTOM PRESERVED: "${meal.name}" - user recipe trusted`);
    return true;
  });
  
  // Combine filtered meals with custom recipes prioritized first
  let filteredMeals = [...filteredCustomMeals, ...filteredCuratedMeals];
  
  console.log(`🔍 AFTER DIETARY FILTERING: ${filteredCustomMeals.length} custom + ${filteredCuratedMeals.length} curated = ${filteredMeals.length} total ${category} meals`);
  if (filteredMeals.length > 0) {
    console.log(`🍽️ Sample ${category} recipes: ${filteredMeals.slice(0, 5).map(m => m.name).join(', ')}`);
  }
  
  // Apply smart ingredient substitutions for dietary restrictions
  if (dietaryTags.some(tag => ['lactose-free', 'dairy-free', 'gluten-free'].includes(tag))) {
    console.log(`🔄 Applying dietary substitutions for: ${dietaryTags.filter(tag => ['lactose-free', 'dairy-free', 'gluten-free'].includes(tag)).join(', ')}`);
    filteredMeals = filteredMeals.map(meal => applyDietarySubstitutions(meal, dietaryTags));
  }
  
  
  // Apply seasonal adaptations for ayurvedic meals
  if (dietaryTags.includes('ayurvedic') && filteredMeals.length > 0) {
    const currentSeason = getCurrentAyurvedicSeason(new Date(), 'europe');
    const seasonalGuidance = getCurrentSeasonalGuidance(new Date(), 'europe');
    
    // During summer (grishma), completely exclude warming ayurvedic recipes
    // This follows authentic Ayurvedic principles for seasonal eating
    if (currentSeason === 'grishma') {
      const originalCount = filteredMeals.length;
      filteredMeals = filteredMeals.filter(meal => {
        if (!meal.tags.includes('ayurvedic')) return true; // Keep non-ayurvedic meals
        
        const hasWarmingTags = meal.tags.includes('warming');
        const hasHeatingSpices = meal.ingredients.some(ingredient => 
          ingredient.toLowerCase().includes('ginger') && !ingredient.toLowerCase().includes('fresh ginger') ||
          ingredient.toLowerCase().includes('cumin seeds') ||
          ingredient.toLowerCase().includes('garam masala') ||
          ingredient.toLowerCase().includes('mustard seeds')
        );
        

        
        if (hasWarmingTags || hasHeatingSpices) {
          console.log(`🚫 Summer exclusion: ${meal.name} removed (inappropriate warming characteristics for grishma season)`);
          return false; // Exclude warming recipes completely
        }
        return true; // Keep cooling/neutral ayurvedic recipes
      });
      
      if (originalCount !== filteredMeals.length) {
        console.log(`Summer filter: ${originalCount} → ${filteredMeals.length} ayurvedic meals (excluded warming recipes)`);
      }
    }
    
    filteredMeals = filteredMeals.map(meal => {
      if (meal.tags.includes('ayurvedic')) {
        const adaptedMeal = adaptRecipeForSeason(meal, currentSeason);
        // Add seasonal context to the portion for display, keep original name for recipe lookup
        adaptedMeal.portion = `${meal.portion} (${seasonalGuidance.season} season)`;
        return adaptedMeal;
      }
      return meal;
    });
  }
  
  // If no meals match dietary tags, implement smart fallback
  if (filteredMeals.length === 0) {
    console.log(`No ${category} meals found for dietary tags: ${dietaryTags.join(', ')}. Attempting smart fallback.`);
    
    // Define critical dietary restrictions that should never be violated
    const criticalTags = ['vegetarian', 'vegan', 'kosher', 'halal'];
    const criticalUserTags = dietaryTags.filter(tag => criticalTags.includes(tag));
    
    // If user has critical dietary restrictions, only respect those in fallback
    if (criticalUserTags.length > 0) {
      const criticalFilteredMeals = filterEnhancedMealsByDietaryTags(curatedRecipes, criticalUserTags);
      if (criticalFilteredMeals.length > 0) {
        console.log(`Fallback: Found ${criticalFilteredMeals.length} ${category} meals respecting critical dietary restrictions: ${criticalUserTags.join(', ')}`);
        
        // Additional safety check: Verify no non-vegetarian meals for vegetarian users
        if (criticalUserTags.includes('vegetarian')) {
          const safetyFilteredMeals = criticalFilteredMeals.filter(meal => {
            const containsFish = meal.name.toLowerCase().includes('cod') || 
                               meal.name.toLowerCase().includes('salmon') || 
                               meal.name.toLowerCase().includes('tuna') || 
                               meal.name.toLowerCase().includes('fish') ||
                               meal.tags.includes('pescatarian') ||
                               meal.tags.includes('non-vegetarian');
            if (containsFish) {
              console.error(`🚨 CRITICAL SAFETY BLOCK: Prevented ${meal.name} from being served to vegetarian user (contains fish/meat)`);
              return false;
            }
            return true;
          });
          return safetyFilteredMeals;
        }
        
        return criticalFilteredMeals;
      }
    }
    
    // If even critical fallback fails, log error and return empty array to prevent inappropriate meals
    console.error(`CRITICAL: No ${category} meals found that respect dietary restrictions. This should not happen.`);
    return [];
  }
  
  // Protein optimization is now handled automatically based on activity level targets
  // No special "high-protein" tag filtering needed
  
  console.log(`🔄 ABOUT TO RETURN: ${filteredMeals.length} filtered meals`);
  
  // AUTOMATIC PROTEIN VALIDATION: Ensure all meals have adequate protein sources
  console.log(`🥩 VALIDATING PROTEIN SOURCES: Checking ${filteredMeals.length} meals for adequate protein content`);
  const proteinValidatedMeals = validateAndEnhanceMealDatabase(filteredMeals);
  
  if (proteinValidatedMeals.length !== filteredMeals.length) {
    console.log(`🥩 PROTEIN ENHANCEMENT: Enhanced ${proteinValidatedMeals.length - filteredMeals.length} meals with additional protein sources`);
  }
  
  return proteinValidatedMeals;
}

// Function to identify water-related ingredients that should be excluded from shopping lists
function isWaterIngredient(ingredient: string): boolean {
  const lowerIngredient = ingredient.toLowerCase().trim();
  
  const waterKeywords = [
    'water',
    'water for cooking',
    'cooking water',
    'boiling water',
    'hot water',
    'cold water',
    'tap water',
    'filtered water',
    'warm water',
    'pasta water',
    'rice water',
    'barley water'
  ];
  
  return waterKeywords.some(keyword => lowerIngredient === keyword || lowerIngredient.includes(keyword));
}

// Shopping list interfaces and functions
export interface ShoppingListItem {
  ingredient: string;
  category: string;
  count: number;
  totalAmount: string;
  unit: string;
}

export function generateEnhancedShoppingList(meals: { foodDescription: string }[], language: string = 'en', dietaryTags: string[] = []): ShoppingListItem[] {
  const ingredientAmounts = new Map<string, { totalAmount: number; unit: string; count: number }>();
  
  // Debug: log that we're applying substitutions
  console.log(`🔄 SHOPPING LIST: Applying dietary substitutions for tags: ${JSON.stringify(dietaryTags)}`);
  
  // Parse actual recipe amounts from meal instructions
  meals.forEach(meal => {
    // Strip any leftover suffix and portion scaling for meal matching
    const cleanMealName = meal.foodDescription
      .replace(/\s*\(incorporating leftover.*?\)/gi, '') // Remove leftover incorporation text
      .replace(/ \(leftover\)$/, '')
      .replace(/ \(2\.0x.*?\)$/, '')
      .replace(/ \- batch cook$/, '')
      .replace(/ \(protein-enhanced\)$/, '')
      .replace(/\s*\(Gluten-Free\)/gi, '') // Remove dietary tags
      .replace(/\s*\(Lactose-Free\)/gi, '') 
      .replace(/\s*\(Dairy-Free\)/gi, '')
      .replace(/\s*\(Vegetarian\)/gi, '')
      .replace(/\s*\(Plant-Based\)/gi, '')
      .replace(/\s*\(Vegan\)/gi, '')
      .trim();
    
    const mealOption = ENHANCED_MEAL_DATABASE.find(m => m.name === cleanMealName);
    if (mealOption) {
      // Apply dietary substitutions to ingredients before processing
      const substitutionResult = substituteIngredients(mealOption.ingredients, dietaryTags);
      const substitutedIngredients = substitutionResult.ingredients;
      
      // Log substitutions for debugging
      if (substitutionResult.substitutions.length > 0) {
        console.log(`🔄 Applied ${substitutionResult.substitutions.length} dietary substitutions for ${cleanMealName}`);
      }
      
      // Use substituted ingredients for shopping list
      substitutedIngredients.forEach(ingredient => {
        // Extract clean ingredient name from formatted text like "3 large free-range eggs" -> "eggs"
        const cleanIngredient = cleanIngredientName(ingredient);
        
        // Skip water-related ingredients - people have tap water
        if (isWaterIngredient(cleanIngredient)) {
          return;
        }
        
        // Skip empty ingredient names
        if (!cleanIngredient || cleanIngredient.trim() === '') {
          return;
        }
        
        const existing = ingredientAmounts.get(cleanIngredient);
        if (existing) {
          existing.count += 1;
          // Smart aggregation: calculate reasonable weekly amount based on count
          const defaultPortion = getDefaultPortion(cleanIngredient);
          // For weekly shopping, use reasonable multipliers based on ingredient type
          let weeklyMultiplier = Math.min(existing.count, 3); // Max 3x for vegetables
          if (cleanIngredient.includes('oil') || cleanIngredient.includes('spice') || cleanIngredient.includes('seasoning')) {
            weeklyMultiplier = 1; // Pantry items don't multiply
          }
          existing.totalAmount = defaultPortion.amount * weeklyMultiplier;
        } else {
          const defaultPortion = getDefaultPortion(cleanIngredient);
          ingredientAmounts.set(cleanIngredient, { 
            totalAmount: defaultPortion.amount, 
            unit: defaultPortion.unit, 
            count: 1 
          });
        }
      });
    } else {
      // Log missing meal recipes to help debug grocery list issues
      console.warn(`⚠️ GROCERY LIST WARNING: Recipe not found for meal "${cleanMealName}" (original: "${meal.foodDescription}"). This meal's ingredients will be missing from shopping list!`);
      
      // Try fallback search with more flexible matching
      const fallbackMeal = ENHANCED_MEAL_DATABASE.find(m => 
        m.name.toLowerCase().includes(cleanMealName.split(' ').slice(0, 2).join(' ').toLowerCase()) ||
        cleanMealName.toLowerCase().includes(m.name.split(' ').slice(0, 2).join(' ').toLowerCase())
      );
      
      if (fallbackMeal) {
        console.log(`🔄 FALLBACK: Found similar recipe "${fallbackMeal.name}" for "${cleanMealName}"`);
        
        // Apply dietary substitutions to fallback ingredients as well
        const substitutionResult = substituteIngredients(fallbackMeal.ingredients, dietaryTags);
        const substitutedIngredients = substitutionResult.ingredients;
        
        // Log substitutions for debugging
        if (substitutionResult.substitutions.length > 0) {
          console.log(`🔄 Applied ${substitutionResult.substitutions.length} dietary substitutions for fallback ${fallbackMeal.name}`);
        }
        
        substitutedIngredients.forEach(ingredient => {
          const cleanIngredient = cleanIngredientName(ingredient);
          
          // Skip water-related ingredients - people have tap water
          if (isWaterIngredient(cleanIngredient)) {
            return;
          }
          
          // Skip empty ingredient names
          if (!cleanIngredient || cleanIngredient.trim() === '') {
            return;
          }
          
          const existing = ingredientAmounts.get(cleanIngredient);
          if (existing) {
            existing.count += 1;
            // Smart aggregation: calculate reasonable weekly amount based on count
            const defaultPortion = getDefaultPortion(cleanIngredient);
            // For weekly shopping, use reasonable multipliers based on ingredient type
            let weeklyMultiplier = Math.min(existing.count, 3); // Max 3x for vegetables
            if (cleanIngredient.includes('oil') || cleanIngredient.includes('spice') || cleanIngredient.includes('seasoning')) {
              weeklyMultiplier = 1; // Pantry items don't multiply
            }
            existing.totalAmount = defaultPortion.amount * weeklyMultiplier;
          } else {
            const defaultPortion = getDefaultPortion(cleanIngredient);
            ingredientAmounts.set(cleanIngredient, { 
              totalAmount: defaultPortion.amount, 
              unit: defaultPortion.unit, 
              count: 1 
            });
          }
        });
      } else {
        console.error(`❌ CRITICAL: No fallback recipe found for "${cleanMealName}". User will be missing ingredients!`);
      }
    }
  });

  // Categorize ingredients following supermarket layout order
  const ingredientCategories: Record<string, string> = {
    // Lemon standardization in categories - all lemon forms go to Fruits as "pieces of lemon"
    'lemon': 'Fruits',
    'lemons': 'Fruits', 
    'lemon juice': 'Fruits',
    'fresh lemon juice': 'Fruits',
    'lime juice': 'Fruits',
    'fresh lime juice': 'Fruits',
    'lemon zest': 'Fruits',
    'pieces of lemon': 'Fruits',
    
    // Vegetables (Fresh Produce section 1)
    'fresh spinach': 'Vegetables',
    'spinach': 'Vegetables',
    'bell peppers': 'Vegetables',
    'onions': 'Vegetables',
    'onion': 'Vegetables',
    'red onion': 'Vegetables',
    'red onions': 'Vegetables',
    'brown onion': 'Vegetables',
    'brown onions': 'Vegetables',
    'white onion': 'Vegetables',
    'white onions': 'Vegetables',
    'yellow onion': 'Vegetables',
    'yellow onions': 'Vegetables',
    'sweet onion': 'Vegetables',
    'sweet onions': 'Vegetables',
    'garlic': 'Vegetables',
    'garlic cloves': 'Vegetables',
    'ginger': 'Vegetables',
    'carrots': 'Vegetables',
    'carrot': 'Vegetables',
    'head cauliflower': 'Vegetables',
    'cauliflower': 'Vegetables',
    'celery': 'Vegetables',
    'cucumber': 'Vegetables',
    'cherry tomatoes': 'Vegetables',
    'tomatoes': 'Vegetables',
    'crushed tomatoes': 'Vegetables',
    'sun-dried tomatoes': 'Vegetables',
    'fresh tomatoes': 'Vegetables',
    'tomato': 'Vegetables',
    'fresh tomato': 'Vegetables',
    'broccoli': 'Vegetables',
    'sugar snaps': 'Vegetables',
    'brussels sprouts': 'Vegetables',
    'zucchini': 'Vegetables',
    'kale': 'Vegetables',
    'mixed greens': 'Vegetables',
    'lettuce': 'Vegetables',
    'purple cabbage': 'Vegetables',
    'beets': 'Vegetables',
    'mushrooms': 'Vegetables',
    'portobello mushrooms': 'Vegetables',
    'sprouts': 'Vegetables',
    'green onions': 'Vegetables',
    'scallions': 'Vegetables',
    'spring onions': 'Vegetables',
    'sweet potato': 'Vegetables',
    
    // Fruits (Fresh Produce section 2)
    'banana': 'Fruits',
    'avocado': 'Fruits',
    'lime': 'Fruits',
    'mango': 'Fruits',
    'frozen berries': 'Fruits',
    'mixed berries': 'Fruits',
    'blueberries': 'Fruits',
    'strawberries': 'Fruits',
    'blueberries, strawberries': 'Fruits',
    'fresh fruit': 'Fruits',
    'kiwi': 'Fruits',
    
    // Fresh Herbs (Fresh Department)
    'fresh herbs': 'Fresh Herbs',
    'fresh parsley': 'Fresh Herbs',
    'parsley': 'Fresh Herbs',
    'cilantro': 'Fresh Herbs',
    'fresh cilantro': 'Fresh Herbs',
    'fresh basil': 'Fresh Herbs',
    'basil': 'Fresh Herbs',
    'fresh oregano': 'Fresh Herbs',
    'oregano': 'Fresh Herbs',
    'fresh thyme': 'Fresh Herbs',
    'thyme': 'Fresh Herbs',
    'fresh rosemary': 'Fresh Herbs',
    'rosemary': 'Fresh Herbs',
    'fresh mint': 'Fresh Herbs',
    'mint': 'Fresh Herbs',
    'fresh dill': 'Fresh Herbs',
    'dill': 'Fresh Herbs',
    'fresh chives': 'Fresh Herbs',
    'chives': 'Fresh Herbs',
    
    // Dairy & Cheese (Fresh Department) - Only actual dairy products
    'parmesan cheese': 'Dairy & Cheese', // Aged, naturally lactose-free
    'aged dutch cheese': 'Dairy & Cheese', // Aged, naturally lactose-free
    
    // Plant-Based Alternatives - Lactose-free substitutes
    'dairy-free cheddar cheese': 'Plant-Based Alternatives',
    'dairy-free cheddar': 'Plant-Based Alternatives',
    'dairy-free cheese': 'Plant-Based Alternatives',
    'dairy-free mozzarella': 'Plant-Based Alternatives',
    'violife feta': 'Plant-Based Alternatives',
    'dairy-free feta': 'Plant-Based Alternatives',
    'dairy-free cream cheese': 'Plant-Based Alternatives',
    'dairy-free cottage cheese': 'Plant-Based Alternatives',
    'dairy-free ricotta': 'Plant-Based Alternatives',
    'coconut yogurt': 'Plant-Based Alternatives',
    'coconut coconut yogurt': 'Plant-Based Alternatives',
    'unsweetened coconut yogurt': 'Plant-Based Alternatives',
    'oat milk': 'Plant-Based Alternatives',
    'almond milk': 'Plant-Based Alternatives',
    'almond oat milk': 'Plant-Based Alternatives',
    'coconut oat milk': 'Plant-Based Alternatives',
    'plant oat milk': 'Plant-Based Alternatives',
    'vegan butter': 'Plant-Based Alternatives',
    'almond vegan butter': 'Plant-Based Alternatives',
    'coconut cream': 'Plant-Based Alternatives',
    'dairy-free sour cream': 'Plant-Based Alternatives',
    
    // Legacy dairy items (only include if no substitution is applied)
    'cheese': 'Dairy & Cheese',
    'feta cheese': 'Dairy & Cheese',
    'goat cheese': 'Dairy & Cheese',
    'mozzarella': 'Dairy & Cheese',
    'parmesan': 'Dairy & Cheese',
    'cheddar': 'Dairy & Cheese',
    'cottage cheese': 'Dairy & Cheese',
    'cream cheese': 'Dairy & Cheese',
    'ricotta': 'Dairy & Cheese',
    'greek yogurt': 'Dairy & Cheese',
    'yogurt': 'Dairy & Cheese',
    'milk': 'Dairy & Cheese',
    'butter': 'Dairy & Cheese',
    'sour cream': 'Dairy & Cheese',
    'heavy cream': 'Dairy & Cheese',
    
    // Protein (Meat and Plant-Based Meat Alternatives)
    'chicken': 'Protein',
    'chicken breast': 'Protein',
    'ground chicken': 'Protein',
    'turkey': 'Protein',
    'ground turkey': 'Protein',
    'beef': 'Protein',
    'ground beef': 'Protein',
    'pork': 'Protein',
    'fish': 'Protein',
    'salmon': 'Protein',
    'cod': 'Protein',
    'tuna': 'Protein',
    'tofu': 'Protein',
    'extra firm tofu': 'Protein',
    'firm tofu': 'Protein',
    'tempeh': 'Protein',
    'seitan': 'Protein',
    'plant-based meat': 'Protein',
    'vegan meat': 'Protein',
    'beyond meat': 'Protein',
    'impossible meat': 'Protein',
    
    // Plant-Based Alternatives (Additional dairy alternatives)
    'hummus': 'Plant-Based Alternatives',
    'coconut milk': 'Plant-Based Alternatives',
    'fermented kefir': 'Plant-Based Alternatives',
    
    // Eggs (Dairy & Eggs section)
    'eggs': 'Dairy & Eggs',
    
    // Pantry & Dry Goods (includes grains, legumes, nuts, canned goods, spices, oils)
    'quinoa': 'Grains, Pasta & Canned Goods',
    'brown rice': 'Grains, Pasta & Canned Goods',
    'rolled oats': 'Grains, Pasta & Canned Goods',
    'gluten-free oats': 'Grains, Pasta & Canned Goods',
    'gluten-free pasta': 'Grains, Pasta & Canned Goods',
    'gluten-free tortilla': 'Other Dry Goods',
    'chickpea flour': 'Baking & Cooking Basics',
    'coconut flour': 'Baking & Cooking Basics',
    'sweet potatoes': 'Vegetables',
    'gluten-free granola': 'Other Dry Goods',
    'red lentils': 'Grains, Pasta & Canned Goods',
    'green lentils': 'Grains, Pasta & Canned Goods',
    'lentils': 'Grains, Pasta & Canned Goods',
    'chickpeas': 'Grains, Pasta & Canned Goods',
    'black beans': 'Grains, Pasta & Canned Goods',
    'white beans': 'Grains, Pasta & Canned Goods',
    'kidney beans': 'Grains, Pasta & Canned Goods',
    'mung beans': 'Grains, Pasta & Canned Goods',
    'edamame': 'Other Dry Goods',
    'pea protein powder': 'Other Dry Goods',
    'vanilla protein powder': 'Other Dry Goods',
    'plant protein powder': 'Other Dry Goods',
    'almond butter': 'Nuts, Seeds & Spreads',
    'chia seeds': 'Nuts, Seeds & Spreads',
    'hemp hearts': 'Nuts, Seeds & Spreads',
    'hemp seeds': 'Nuts, Seeds & Spreads',
    'flax seeds': 'Nuts, Seeds & Spreads',
    'flaxseeds': 'Nuts, Seeds & Spreads',
    'ground flax': 'Nuts, Seeds & Spreads',
    'pumpkin seeds': 'Nuts, Seeds & Spreads',
    'sunflower seeds': 'Nuts, Seeds & Spreads',
    'sesame seeds': 'Nuts, Seeds & Spreads',
    'pine nuts': 'Nuts, Seeds & Spreads',
    'mixed nuts': 'Nuts, Seeds & Spreads',
    'almonds': 'Nuts, Seeds & Spreads',
    'walnuts': 'Nuts, Seeds & Spreads',
    'cashews': 'Nuts, Seeds & Spreads',
    'cashew nuts': 'Nuts, Seeds & Spreads',

    'baking powder': 'Baking & Cooking Basics',
    'salt': 'Baking & Cooking Basics',
    'pepper': 'Baking & Cooking Basics',
    'black pepper': 'Baking & Cooking Basics',
    'cinnamon': 'Pantry Essentials',
    'stevia': 'Baking & Cooking Basics',
    'chili powder': 'Pantry Essentials',
    'fennel powder': 'Pantry Essentials',
    'garlic powder': 'Pantry Essentials',
    'onion powder': 'Pantry Essentials',
    'paprika': 'Pantry Essentials',
    'cumin': 'Pantry Essentials',
    'ground coriander': 'Pantry Essentials',
    'turmeric': 'Pantry Essentials',
    'curry powder': 'Pantry Essentials',
    'garam masala': 'Pantry Essentials',
    'smoked paprika': 'Pantry Essentials',
    'cayenne pepper': 'Pantry Essentials',
    'red pepper flakes': 'Pantry Essentials',
    'chili flakes': 'Pantry Essentials',
    'dried oregano': 'Pantry Essentials',
    'dried basil': 'Pantry Essentials',
    'dried thyme': 'Pantry Essentials',
    'bay leaves': 'Pantry Essentials',

    // Pantry Essentials (oils, vinegars, sauces, sweeteners, condiments)
    'olive oil': 'Pantry Essentials',
    'coconut oil': 'Pantry Essentials',
    'sesame oil': 'Pantry Essentials',
    'balsamic vinegar': 'Pantry Essentials',
    'rice vinegar': 'Pantry Essentials',
    'soy sauce': 'Pantry Essentials',
    'nutritional yeast': 'Pantry Essentials',
    'vanilla extract': 'Pantry Essentials',
    'maple syrup': 'Pantry Essentials',

    'tahini': 'Nuts, Seeds & Spreads',
    
    // Additional ingredients for the new categories
    'rice noodles': 'Grains, Pasta & Canned Goods',
    'pasta': 'Grains, Pasta & Canned Goods',
    'couscous': 'Grains, Pasta & Canned Goods',
    'basmati rice': 'Grains, Pasta & Canned Goods',
    'sushi rice': 'Grains, Pasta & Canned Goods',
    'jasmine rice': 'Grains, Pasta & Canned Goods',
    'wild rice': 'Grains, Pasta & Canned Goods',
    'arborio rice': 'Grains, Pasta & Canned Goods',
    'lasagna sheets': 'Grains, Pasta & Canned Goods',
    
    // Comprehensive pasta types
    'spaghetti': 'Grains, Pasta & Canned Goods',
    'penne': 'Grains, Pasta & Canned Goods',
    'linguine': 'Grains, Pasta & Canned Goods',
    'fusilli': 'Grains, Pasta & Canned Goods',
    'rigatoni': 'Grains, Pasta & Canned Goods',
    'orzo': 'Grains, Pasta & Canned Goods',
    'macaroni': 'Grains, Pasta & Canned Goods',
    'angel hair': 'Grains, Pasta & Canned Goods',
    'angel hair pasta': 'Grains, Pasta & Canned Goods',
    'fettuccine': 'Grains, Pasta & Canned Goods',
    'tagliatelle': 'Grains, Pasta & Canned Goods',
    'ravioli': 'Grains, Pasta & Canned Goods',
    'gnocchi': 'Grains, Pasta & Canned Goods',
    'vermicelli': 'Grains, Pasta & Canned Goods',
    'pappardelle': 'Grains, Pasta & Canned Goods',
    'tortellini': 'Grains, Pasta & Canned Goods',
    'capellini': 'Grains, Pasta & Canned Goods',
    'gemelli': 'Grains, Pasta & Canned Goods',
    'rotini': 'Grains, Pasta & Canned Goods',
    'farfalle': 'Grains, Pasta & Canned Goods',
    'bow tie pasta': 'Grains, Pasta & Canned Goods',
    'shells': 'Grains, Pasta & Canned Goods',
    'conchiglie': 'Grains, Pasta & Canned Goods',
    'bucatini': 'Grains, Pasta & Canned Goods',
    'orecchiette': 'Grains, Pasta & Canned Goods',
    'cavatappi': 'Grains, Pasta & Canned Goods',
    'whole wheat pasta': 'Grains, Pasta & Canned Goods',
    'chickpea pasta': 'Grains, Pasta & Canned Goods',
    'lentil pasta': 'Grains, Pasta & Canned Goods',
    'rice pasta': 'Grains, Pasta & Canned Goods',
    'corn pasta': 'Grains, Pasta & Canned Goods',
    
    // Asian noodle types
    'soba noodles': 'Grains, Pasta & Canned Goods',
    'udon noodles': 'Grains, Pasta & Canned Goods',
    'ramen noodles': 'Grains, Pasta & Canned Goods',
    'glass noodles': 'Grains, Pasta & Canned Goods',
    'shirataki noodles': 'Grains, Pasta & Canned Goods',
    'lo mein noodles': 'Grains, Pasta & Canned Goods',
    'chow mein noodles': 'Grains, Pasta & Canned Goods',
    'cellophane noodles': 'Grains, Pasta & Canned Goods',
    'mung bean noodles': 'Grains, Pasta & Canned Goods',
    'plain flour': 'Baking & Cooking Basics',
    'vegetable stock': 'Baking & Cooking Basics',
    'vegetable broth': 'Baking & Cooking Basics',
    'canned tomatoes': 'Baking & Cooking Basics',
    'tomato paste': 'Baking & Cooking Basics',
    'avocado oil': 'Pantry Essentials',
    'honey': 'Pantry Essentials',
    'mustard powder': 'Pantry Essentials',
    'fennel seeds': 'Pantry Essentials',

    'coconut': 'Other Dry Goods',
    'coconut flakes': 'Other Dry Goods',
    'rolled certified oats': 'Grains, Pasta & Canned Goods',
    'steel-cut certified oats': 'Grains, Pasta & Canned Goods',
    'steel-cut oats': 'Grains, Pasta & Canned Goods',
    'certified oats': 'Grains, Pasta & Canned Goods',
    'scoop vanilla protein powder': 'Other Dry Goods',
    'strawberries for topping': 'Fruits',
    'spirulina': 'Other Dry Goods',
    'coriander': 'Fresh Herbs',
    'fresh coriander': 'Fresh Herbs'
  };

  // Function to normalize ingredient names for grocery shopping
  const normalizeIngredientForGrocery = (ingredient: string): string => {
    let normalized = ingredient.toLowerCase().trim();
    
    // Enhanced nut preparation normalization - remove all preparation methods from nuts
    const nutPreparationPatterns = [
      { pattern: /crushed\s+(walnuts|almonds|pistachios|pecans|hazelnuts|cashews|peanuts)/gi, replacement: '$1' },
      { pattern: /chopped\s+(walnuts|almonds|pistachios|pecans|hazelnuts|cashews|peanuts)/gi, replacement: '$1' },
      { pattern: /sliced\s+(almonds)/gi, replacement: '$1' },
      { pattern: /whole\s+(walnuts|almonds|pistachios|pecans|hazelnuts|cashews|peanuts)/gi, replacement: '$1' },
      { pattern: /raw\s+(walnuts|almonds|pistachios|pecans|hazelnuts|cashews|peanuts)/gi, replacement: '$1' },
      { pattern: /toasted\s+(walnuts|almonds|pistachios|pecans|hazelnuts|cashews|peanuts)/gi, replacement: '$1' },
      { pattern: /(walnuts|almonds|pistachios|pecans|hazelnuts|cashews|peanuts),?\s+(crushed|chopped|sliced|whole|raw|toasted)/gi, replacement: '$1' }
    ];
    
    // Apply nut-specific normalization first
    nutPreparationPatterns.forEach(({ pattern, replacement }) => {
      normalized = normalized.replace(pattern, replacement);
    });
    
    // Remove cooking methods - people buy the raw ingredient
    const cookingMethods = [
      'steamed', 'roasted', 'sautéed', 'grilled', 'baked', 'boiled', 'fried',
      'fresh', 'cooked', 'raw', 'frozen', 'chopped', 'diced', 'sliced',
      'minced', 'crushed', 'ground', 'whole', 'dried', 'canned'
    ];
    
    cookingMethods.forEach(method => {
      // Remove method at beginning (e.g., "steamed broccoli" → "broccoli")
      normalized = normalized.replace(new RegExp(`^${method}\\s+`, 'g'), '');
      // Remove method in middle (e.g., "broccoli, steamed" → "broccoli")
      normalized = normalized.replace(new RegExp(`\\s*,?\\s*${method}\\s*`, 'g'), ' ');
    });
    
    // Specify generic plant-based milk terms to specific types
    const milkSpecifications: Record<string, string> = {
      'plant milk': 'oat milk',
      'plant-based milk': 'oat milk', 
      'non-dairy milk': 'oat milk',
      'dairy-free milk': 'oat milk',
      'unsweetened plant milk': 'unsweetened oat milk',
      'plant oat milk': 'oat milk', // Fix redundant naming
      'almond oat milk': 'oat milk', // Standardize to oat milk as preferred
      'coconut oat milk': 'oat milk'
    };
    
    // Apply milk specifications
    for (const [generic, specific] of Object.entries(milkSpecifications)) {
      if (normalized.includes(generic)) {
        normalized = normalized.replace(generic, specific);
      }
    }
    
    // Special handling for garlic - preserve clove specification for proper quantities
    if (normalized.includes('garlic') && !normalized.includes('clove') && !normalized.includes('powder')) {
      // Convert generic "garlic" to "garlic cloves" for proper quantity display (but not garlic powder)
      normalized = normalized.replace(/\bgarlic\b/g, 'garlic cloves');
    }
    
    // Simplify steel-cut oats variations to just "oats"
    if (normalized.includes('steel-cut') && normalized.includes('oats')) {
      normalized = normalized.replace(/steel-cut\s+(certified\s+)?oats/gi, 'oats');
    }
    
    // Simplify rolled certified oats to just "oats"
    if (normalized.includes('rolled') && normalized.includes('certified') && normalized.includes('oats')) {
      normalized = normalized.replace(/rolled\s+certified\s+oats/gi, 'oats');
    }
    
    // Remove redundant words and clean up spacing
    normalized = normalized
      .replace(/\s+/g, ' ') // Multiple spaces → single space
      .replace(/^\s+|\s+$/g, '') // Trim
      .replace(/\s*,\s*$/, ''); // Remove trailing comma
    
    // Capitalize first letter for display
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  // Function to determine if an ingredient should show clean name instead of quantity
  const shouldShowCleanName = (ingredient: string, category: string, totalAmount: number, unit: string): boolean => {
    // Small spices/seasonings - show just the name for grocery shopping convenience
    const spicesAndSeasonings = [
      'salt', 'black pepper', 'white pepper', 'ground pepper', 'cinnamon', 'paprika', 'cumin', 'turmeric', 'oregano', 'basil', 'thyme',
      'rosemary', 'sage', 'garlic powder', 'onion powder', 'ginger powder', 'chili powder',
      'vanilla extract', 'almond extract', 'baking powder', 'baking soda', 'cornstarch',
      'flour', 'sugar', 'honey', 'maple syrup', 'olive oil', 'coconut oil', 'sesame oil',
      'soy sauce', 'tamari', 'vinegar', 'lemon juice', 'lime juice', 'nutritional yeast',
      'fennel seeds', 'mustard powder', 'stevia'
    ];
    
    // Bell peppers and vegetables should NEVER show clean name - they need quantities
    if (ingredient.toLowerCase().includes('bell pepper') || 
        ingredient.toLowerCase().includes('sugar snap') || 
        ingredient.toLowerCase().includes('snap pea') ||
        category === 'Vegetables') {
      return false;
    }
    
    // Garlic cloves should always show quantity (e.g., "3 garlic cloves" not just "Garlic cloves")
    if (ingredient.toLowerCase().includes('garlic cloves') || ingredient.toLowerCase().includes('garlic clove')) {
      return false; // Always show quantity for garlic cloves
    }
    
    // Check if it's a spice/seasoning or very small quantity
    const isSpice = spicesAndSeasonings.some(spice => {
      const ingredientLower = ingredient.toLowerCase();
      // Exclude "bell pepper" when matching "pepper"
      if (spice === 'pepper' && ingredientLower.includes('bell pepper')) {
        return false;
      }
      return ingredientLower.includes(spice);
    });
    const isSmallQuantity = (unit === 'g' && totalAmount < 20) || (unit === 'ml' && totalAmount < 30);
    const isPantryEssential = category === 'Pantry Essentials' || category === 'Baking & Cooking Basics';
    
    return isSpice || (isSmallQuantity && isPantryEssential);
  };

  // Create shopping list with categories and converted amounts
  const shoppingList: ShoppingListItem[] = [];
  
  ingredientAmounts.forEach((amounts, ingredient) => {
    let finalIngredient = ingredient;
    
    // Handle vegan egg alternatives
    if (ingredient === 'eggs' && dietaryTags.includes('vegan')) {
      finalIngredient = 'vegan egg substitute (flax eggs or aquafaba)';
    }
    
    // Split comma-separated ingredients into separate items
    if (finalIngredient.includes(',')) {
      const separateIngredients = finalIngredient.split(',').map(item => item.trim());
      
      separateIngredients.forEach(separateIngredient => {
        // Normalize ingredient name for grocery shopping (remove cooking methods, specify milk types)
        const normalizedIngredient = normalizeIngredientForGrocery(separateIngredient);
        
        // Try to get category for the specific ingredient, fallback to original, then fallback to 'Fruits' for berries
        const category = ingredientCategories[separateIngredient.toLowerCase()] || ingredientCategories[ingredient.toLowerCase()] || 'Fruits';
        
        // Convert amounts to grams using the formatAmount function (split proportionally)
        const proportionalAmount = amounts.totalAmount / separateIngredients.length;
        const displayAmount = formatAmountWithLanguage(proportionalAmount, amounts.unit, language);
        
        // For spices and small pantry items, show just the ingredient name
        const shouldShowClean = shouldShowCleanName(separateIngredient, category, proportionalAmount, amounts.unit);
        const finalDisplayAmount = shouldShowClean 
          ? normalizedIngredient 
          : displayAmount;
        
        // When showing clean names (spices/seasonings), don't show a separate unit
        const finalUnit = shouldShowClean ? '' : amounts.unit;
        
        shoppingList.push({
          ingredient: normalizedIngredient,
          category,
          count: amounts.count,
          totalAmount: finalDisplayAmount,
          unit: finalUnit
        });
      });
    } else {
      // Normalize ingredient name for grocery shopping (remove cooking methods, specify milk types)
      const normalizedIngredient = normalizeIngredientForGrocery(finalIngredient);
      
      const category = ingredientCategories[ingredient.toLowerCase()] || 'Other';
      
      // Convert amounts to grams using the formatAmount function
      const displayAmount = formatAmountWithLanguage(amounts.totalAmount, amounts.unit, language);
      
      // For spices and small pantry items, show just the ingredient name
      const shouldShowClean = shouldShowCleanName(ingredient, category, amounts.totalAmount, amounts.unit);
      const finalDisplayAmount = shouldShowClean 
        ? normalizedIngredient 
        : displayAmount;
      
      // When showing clean names (spices/seasonings), don't show a separate unit
      const finalUnit = shouldShowClean ? '' : amounts.unit;
      
      shoppingList.push({
        ingredient: normalizedIngredient,
        category,
        count: amounts.count,
        totalAmount: finalDisplayAmount,
        unit: finalUnit
      });
    }
  });

  // Define supermarket shopping order
  const categoryOrder = [
    'Vegetables',
    'Fresh Herbs',
    'Fruits',
    'Protein',
    'Plant-Based Alternatives',
    'Dairy & Cheese',
    'Dairy & Eggs',
    'Pantry Essentials',
    'Grains, Pasta & Canned Goods',
    'Baking & Cooking Basics',
    'Nuts, Seeds & Spreads',
    'Other Dry Goods',
    'Other'
  ];

  // Sort by supermarket category order and then by ingredient name
  return shoppingList.sort((a, b) => {
    if (a.category !== b.category) {
      const aIndex = categoryOrder.indexOf(a.category);
      const bIndex = categoryOrder.indexOf(b.category);
      
      // If category not in order list, put it at end
      const aOrder = aIndex === -1 ? categoryOrder.length : aIndex;
      const bOrder = bIndex === -1 ? categoryOrder.length : bIndex;
      
      return aOrder - bOrder;
    }
    return a.ingredient.localeCompare(b.ingredient);
  });
}

/**
 * Bulk update all recipes in the database to make ingredients specific
 * This function updates all existing recipes to replace generic ingredients with specific ones
 */
export function updateAllRecipesWithSpecificIngredients(): void {
  console.log('🔄 Starting bulk recipe update to make ingredients specific...');
  
  let updatedCount = 0;
  
  // Update each recipe in the enhanced meal database
  for (let i = 0; i < ENHANCED_MEAL_DATABASE.length; i++) {
    const originalRecipe = ENHANCED_MEAL_DATABASE[i];
    const validation = validateIngredientSpecificity(originalRecipe.ingredients);
    
    if (!validation.valid) {
      console.log(`🎯 Updating recipe "${originalRecipe.name}" - Found generic ingredients:`);
      validation.issues.forEach(issue => console.log(`   - ${issue}`));
      
      // Update ingredients to be specific
      const specifiedIngredients = specifyIngredients(originalRecipe.ingredients);
      ENHANCED_MEAL_DATABASE[i] = {
        ...originalRecipe,
        ingredients: specifiedIngredients
      };
      
      console.log(`✅ Updated "${originalRecipe.name}" with specific ingredients`);
      console.log(`   - Old: ${originalRecipe.ingredients.join(', ')}`);
      console.log(`   - New: ${specifiedIngredients.join(', ')}`);
      updatedCount++;
    }
  }
  
  console.log(`🎉 Bulk update complete! Updated ${updatedCount} recipes with specific ingredients.`);
  
  if (updatedCount === 0) {
    console.log('✨ All recipes already have specific ingredients - no updates needed!');
  }
}

/**
 * Validate all recipes and report any remaining generic ingredients
 */
export function validateAllRecipeIngredients(): { 
  totalRecipes: number; 
  validRecipes: number; 
  issuesFound: Array<{recipeName: string, issues: string[]}> 
} {
  const issuesFound: Array<{recipeName: string, issues: string[]}> = [];
  let validRecipes = 0;
  
  ENHANCED_MEAL_DATABASE.forEach(recipe => {
    const validation = validateIngredientSpecificity(recipe.ingredients);
    if (validation.valid) {
      validRecipes++;
    } else {
      issuesFound.push({
        recipeName: recipe.name,
        issues: validation.issues
      });
    }
  });
  
  return {
    totalRecipes: ENHANCED_MEAL_DATABASE.length,
    validRecipes,
    issuesFound
  };
}

function parseEnhancedRecipeIngredients(instructions: string[], ingredientAmounts: Map<string, { totalAmount: number; unit: string; count: number }>) {
  instructions.forEach(instruction => {
    // Extract ingredients with amounts from recipe instructions
    const ingredientMatches = instruction.match(/(\d+(?:\.\d+)?)?\s*(cup|cups|tbsp|tsp|g|lb|lbs|oz|pieces?|cloves?|slices?)\s+([^,]+)/gi);
    
    if (ingredientMatches) {
      ingredientMatches.forEach(match => {
        const parts = match.trim().split(/\s+/);
        const amount = parseFloat(parts[0]) || 1;
        const unit = parts[1];
        const ingredient = parts.slice(2).join(' ').toLowerCase().trim();
        
        const existing = ingredientAmounts.get(ingredient);
        if (existing) {
          existing.totalAmount += amount;
          existing.count += 1;
        } else {
          ingredientAmounts.set(ingredient, { totalAmount: amount, unit, count: 1 });
        }
      });
    }
  });
}

// Helper function to format amounts with Dutch translation
function formatAmountWithLanguage(amount: number, unit: string, language: string = 'en'): string {
  if (unit === 'ml') {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)} L`;
    }
    return `${amount} ml`;
  }
  
  if (unit === 'g') {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)} kg`;
    }
    return `${amount} g`;
  }
  
  if (unit === 'pieces' || unit === 'piece') {
    if (language === 'nl') {
      return amount === 1 ? `${amount} stuk` : `${amount} stuks`;
    }
    return amount === 1 ? `${amount} piece` : `${amount} pieces`;
  }
  
  if (unit === 'cloves' || unit === 'clove') {
    if (language === 'nl') {
      return amount === 1 ? `${amount} teen` : `${amount} tenen`;
    }
    return amount === 1 ? `${amount} clove` : `${amount} cloves`;
  }
  
  if (unit === 'bunch') {
    if (language === 'nl') {
      return amount === 1 ? `${amount} bosje` : `${amount} bosjes`;
    }
    return amount === 1 ? `${amount} bunch` : `${amount} bunches`;
  }
  
  return `${amount} ${unit}`;
}

function getDefaultPortion(ingredient: string): { amount: number; unit: string } {
  // Default portions for common ingredients in grams (when no recipe amounts are found)
  const defaults: Record<string, { amount: number; unit: string }> = {
    'almond milk': { amount: 240, unit: 'ml' }, // 1 cup = 240ml
    'coconut milk': { amount: 240, unit: 'ml' }, // 1 cup = 240ml
    'chia seeds': { amount: 20, unit: 'g' }, // 2 tbsp = ~20g
    'hemp hearts': { amount: 20, unit: 'g' }, // 2 tbsp = ~20g
    'hemp seeds': { amount: 20, unit: 'g' },
    'mixed berries': { amount: 75, unit: 'g' }, // 0.5 cup = ~75g
    'banana': { amount: 1, unit: 'piece' }, // 1 medium banana
    'avocado': { amount: 1, unit: 'piece' }, // 1 medium avocado
    'lemon': { amount: 1, unit: 'piece' }, // 1 lemon
    'quinoa': { amount: 85, unit: 'g' }, // 0.5 cup dry = ~85g
    'brown rice': { amount: 95, unit: 'g' }, // 0.5 cup dry = ~95g
    'spinach': { amount: 60, unit: 'g' }, // 2 cups fresh = ~60g
    'mushrooms': { amount: 70, unit: 'g' }, // 1 cup sliced = ~70g
    'onions': { amount: 1, unit: 'piece' }, // 1 medium onion
    'garlic': { amount: 2, unit: 'cloves' }, // 2 cloves
    'olive oil': { amount: 30, unit: 'ml' }, // 2 tbsp = ~30ml
    'coconut oil': { amount: 15, unit: 'ml' }, // 1 tbsp = ~15ml
    'eggs': { amount: 2, unit: 'pieces' }, // 2 large eggs
    'nutritional yeast': { amount: 15, unit: 'g' }, // 2 tbsp = ~15g
    'coconut yogurt': { amount: 120, unit: 'g' }, // 0.5 cup = ~120g
    'cherry tomatoes': { amount: 150, unit: 'g' }, // 1 cup = ~150g
    'bell peppers': { amount: 2, unit: 'pieces' }, // 2 medium peppers
    'sugar snaps': { amount: 150, unit: 'g' }, // Sugar snap peas in grams
    'sugarsnaps': { amount: 150, unit: 'g' }, // Sugar snap peas in grams (alternative name)
    'zucchini': { amount: 200, unit: 'g' }, // 1 medium zucchini
    'brussels sprouts': { amount: 150, unit: 'g' }, // 1 cup = ~150g
    'sweet potato': { amount: 200, unit: 'g' }, // 1 medium sweet potato
    'cashew cream': { amount: 60, unit: 'g' }, // 1/4 cup = ~60g
    'sun-dried tomatoes': { amount: 30, unit: 'g' }, // 2 tbsp = ~30g
    'pasta': { amount: 100, unit: 'g' }, // 1 serving dry pasta
    'vegetable broth': { amount: 240, unit: 'ml' }, // 1 cup = 240ml
    'mixed nuts': { amount: 30, unit: 'g' }, // 2 tbsp = ~30g
    'maple syrup': { amount: 20, unit: 'g' }, // 1 tbsp = ~20g
    'vanilla extract': { amount: 5, unit: 'g' }, // 1 tsp = ~5g
    'cinnamon': { amount: 2, unit: 'g' }, // 1 tsp = ~2g
    'salt': { amount: 5, unit: 'g' }, // 1 tsp = ~5g
    'pepper': { amount: 2, unit: 'g' }, // 1/2 tsp = ~2g
    'fresh herbs': { amount: 1, unit: 'bunch' }, // 1 bunch fresh herbs
    'fresh parsley': { amount: 1, unit: 'bunch' }, // 1 bunch fresh parsley
    'fresh basil': { amount: 1, unit: 'bunch' }, // 1 bunch fresh basil
    'fresh cilantro': { amount: 1, unit: 'bunch' }, // 1 bunch fresh cilantro
    'fresh oregano': { amount: 1, unit: 'bunch' }, // 1 bunch fresh oregano
    'fresh thyme': { amount: 1, unit: 'bunch' }, // 1 bunch fresh thyme
    'fresh rosemary': { amount: 1, unit: 'bunch' }, // 1 bunch fresh rosemary
    'fresh mint': { amount: 1, unit: 'bunch' }, // 1 bunch fresh mint
    'fresh dill': { amount: 1, unit: 'bunch' }, // 1 bunch fresh dill
    'fresh chives': { amount: 1, unit: 'bunch' }, // 1 bunch fresh chives
    'carrots': { amount: 3, unit: 'pieces' }, // 3 medium carrots
    'kiwi': { amount: 4, unit: 'pieces' } // 4 kiwi fruits
  };
  
  return defaults[ingredient] || { amount: 50, unit: 'g' };
}

function cleanIngredientName(ingredient: string): string {
  // Extract the core ingredient name from formatted strings
  // Examples:
  // "3 large free-range eggs" -> "eggs"
  // "½ cup coconut yogurt" -> "coconut yogurt"
  // "¼ cup cherry tomatoes (halved)" -> "cherry tomatoes"
  // "Pinch of sea salt and black pepper" -> "salt"
  
  const originalInput = ingredient; // Store original input for logging
  let cleaned = ingredient.toLowerCase().trim();
  
  // Remove leading measurements and quantities (including fractions and numbers)
  cleaned = cleaned.replace(/^[\d\/½¼¾⅓⅔⅛⅜⅝⅞]+\s*(cup|cups|tbsp|tsp|tablespoons?|teaspoons?|g|grams?|lb|lbs|pounds?|oz|ounces?|pieces?|slices?|cloves?|sprigs?|medium|large|small|ml)\s*of\s*/, '');
  cleaned = cleaned.replace(/^[\d\/½¼¾⅓⅔⅛⅜⅝⅞]+\s*(cup|cups|tbsp|tsp|tablespoons?|teaspoons?|g|grams?|lb|lbs|pounds?|oz|ounces?|pieces?|slices?|cloves?|sprigs?|medium|large|small|ml)\s*/, '');
  
  // Remove leading numbers and fractions that might still be there  
  cleaned = cleaned.replace(/^[\d\/½¼¾⅓⅔⅛⅜⅝⅞]+\s*/, '');
  
  // Fix common ingredient name corruption issues
  if (cleaned.startsWith('reen onions') || cleaned === 'reen onions') {
    cleaned = 'green onions';
  }
  if (cleaned.startsWith('s brown rice') || cleaned === 's brown rice' || cleaned.includes('s brown rice')) {
    cleaned = 'brown rice';
  }
  if (cleaned.startsWith(' brown rice') || cleaned.includes(' brown rice')) {
    cleaned = 'brown rice';
  }
  if (cleaned.startsWith('scoop plant protein') || cleaned.includes('scoop plant protein')) {
    cleaned = 'plant protein powder';
  }
  
  // Lemon standardization - convert all lemon variants to "pieces of lemon"
  if (cleaned === 'lemon' || cleaned === 'lemons' || cleaned.includes('lemon zest') || 
      cleaned.includes('lemon juice') || cleaned.includes('lime juice')) {
    cleaned = 'pieces of lemon';
  }
  
  // Lemon standardization - convert all lemon variants to "pieces of lemon"
  if (cleaned === 'lemon' || cleaned === 'lemons' || cleaned.includes('lemon zest') || 
      cleaned.includes('lemon juice') || cleaned.includes('lime juice')) {
    cleaned = 'pieces of lemon';
  }
  
  // Apply comprehensive ingredient specification to replace generic terms
  const specified = specifyIngredients([cleaned]);
  cleaned = specified[0];
  
  // Consolidate herbs that have different names but are essentially the same for shopping
  // This prevents duplicate listings in shopping list (e.g., both "cilantro" and "coriander" appearing)
  if (cleaned.includes('fresh cilantro') || cleaned.includes('cilantro') || cleaned.includes('fresh coriander') || cleaned.includes('coriander')) {
    // Check if it's ground/powder coriander (spice) vs fresh cilantro (herb)
    if (cleaned.includes('ground') || cleaned.includes('powder') || cleaned.includes('seeds')) {
      cleaned = 'ground coriander';
    } else {
      cleaned = 'fresh cilantro'; // Consolidate all fresh forms to cilantro
    }
  }
  
  // Additional specific consolidation for exact matches to prevent duplicates
  if (cleaned === 'coriander' || cleaned === 'fresh coriander') {
    cleaned = 'fresh cilantro';
  }
  if (cleaned === 'coriander seeds' || cleaned === 'ground coriander seeds') {
    cleaned = 'ground coriander';
  }
  
  // Debug log for cilantro/coriander consolidation
  if (cleaned.includes('cilantro') || cleaned.includes('coriander')) {
    console.log(`🌿 Herb consolidation: "${originalInput}" → "${cleaned}"`);
  }
  
  // Handle other specific fresh herbs
  if (cleaned.includes('basil') && !cleaned.includes('dried')) {
    cleaned = 'fresh basil';
  }
  if (cleaned.includes('parsley') && !cleaned.includes('dried')) {
    cleaned = 'fresh parsley';
  }
  if (cleaned.includes('oregano') && !cleaned.includes('dried')) {
    cleaned = 'fresh oregano';
  }
  if (cleaned.includes('thyme') && !cleaned.includes('dried')) {
    cleaned = 'fresh thyme';
  }
  if (cleaned.includes('rosemary') && !cleaned.includes('dried')) {
    cleaned = 'fresh rosemary';
  }
  if (cleaned.includes('mint') && !cleaned.includes('dried')) {
    cleaned = 'fresh mint';
  }
  if (cleaned.includes('dill') && !cleaned.includes('dried')) {
    cleaned = 'fresh dill';
  }
  if (cleaned.includes('chives') && !cleaned.includes('dried')) {
    cleaned = 'fresh chives';
  }
  
  // Handle specific cheese types
  if (cleaned.includes('cheese')) {
    if (cleaned.includes('feta')) {
      cleaned = 'feta cheese';
    } else if (cleaned.includes('goat')) {
      cleaned = 'goat cheese';
    } else if (cleaned.includes('mozzarella')) {
      cleaned = 'mozzarella';
    } else if (cleaned.includes('parmesan') || cleaned.includes('parmigiano')) {
      cleaned = 'parmesan';
    } else if (cleaned.includes('cheddar')) {
      cleaned = 'cheddar';
    } else if (cleaned.includes('cottage')) {
      cleaned = 'cottage cheese';
    } else if (cleaned.includes('cream cheese')) {
      cleaned = 'cream cheese';
    } else if (cleaned.includes('ricotta')) {
      cleaned = 'ricotta';
    } else {
      cleaned = 'cheese'; // Generic cheese category
    }
  }
  
  // Handle specific bean types BEFORE removing descriptive words (including canned versions)
  if (cleaned.includes('black beans') || cleaned === 'black beans' || cleaned.includes('can black beans')) {
    cleaned = 'black beans';
  } else if (cleaned.includes('white beans') || cleaned === 'white beans' || cleaned.includes('can white beans')) {
    cleaned = 'white beans';
  } else if (cleaned.includes('kidney beans') || cleaned === 'kidney beans' || cleaned.includes('can kidney beans')) {
    cleaned = 'kidney beans';
  } else if (cleaned.includes('chickpeas') || cleaned === 'chickpeas' || cleaned.includes('garbanzo beans') || cleaned.includes('can chickpeas') || cleaned.includes('cooked chickpeas')) {
    cleaned = 'chickpeas';
  } else if (cleaned.includes('mung beans') || cleaned === 'mung beans' || cleaned.includes('whole mung beans') || cleaned.includes('can mung beans')) {
    cleaned = 'mung beans';
  } else if (cleaned.includes('red lentils') || cleaned === 'red lentils') {
    cleaned = 'red lentils';
  } else if (cleaned.includes('green lentils') || cleaned === 'green lentils') {
    cleaned = 'green lentils';
  } else if (cleaned.includes('lentils') || cleaned === 'lentils') {
    cleaned = 'lentils';
  } else if (cleaned.includes('can beans') || cleaned === 'can beans' || (cleaned.includes('beans') && cleaned.includes('can'))) {
    // This is a fallback for any generic "can beans" - this shouldn't happen with proper recipes
    cleaned = 'mixed beans';
  } else {
    // Remove descriptive words and parenthetical content (only if not a specific bean type)
    cleaned = cleaned.replace(/\s*\([^)]*\)/g, ''); // Remove (content in parentheses)
    cleaned = cleaned.replace(/\b(free-range|organic|fresh|raw|toasted|chopped|sliced|diced|minced|halved|cooked|long-fermented)\b/g, '');
    cleaned = cleaned.replace(/\b(extra virgin|sea|black|white|ground|mixed|frozen|unsweetened|pure|gluten-free)\b/g, '');
  }
  cleaned = cleaned.replace(/^(pinch of|dash of|handful of)\s*/i, '');
  
  // Clean up spaces and handle special cases
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Handle specific problematic cases to ensure proper consolidation
  if (cleaned.includes('lemon juice') || cleaned === 'lemon juice') {
    cleaned = 'lemon'; // Convert lemon juice to whole lemon for shopping
  } else if (cleaned.includes('lemon') || cleaned === 'lemon') {
    cleaned = 'lemon';
  }
  if (cleaned.includes('cashew cream') || cleaned === 'cashew cream') {
    cleaned = 'cashews'; // Convert cashew cream to whole cashews for shopping
  }
  if (cleaned.includes('banana') || cleaned === 'd banana' || cleaned === 'sliced banana') {
    cleaned = 'banana';
  }
  if (cleaned.includes('maple syrup') || cleaned === 'maple syrup') {
    cleaned = 'maple syrup';
  }
  if (cleaned === 'wine' || cleaned.includes('wine') || cleaned === 'white wine') {
    cleaned = 'vegetable broth';
  }
  if (cleaned.includes('kefir') || cleaned === 'kefir') {
    cleaned = 'fermented kefir';
  }
  if (cleaned.includes('almond milk') || cleaned === 'almond milk') {
    cleaned = 'almond milk';
  }
  if (cleaned.includes('red onion') || cleaned === 'red onion') {
    cleaned = 'onions';
  }
  if (cleaned.includes('bell pepper') || cleaned === 'bell pepper') {
    cleaned = 'bell peppers';
  }
  if (cleaned === 'cinnamon to taste' || cleaned === 'stevia to taste') {
    cleaned = cleaned.replace(' to taste', '');
  }
  // Consolidate all salt variations into "salt"
  if (cleaned.includes('salt') || cleaned === 'sea salt' || cleaned === 'kosher salt' || cleaned === 'table salt' || cleaned === 'himalayan salt' || cleaned === 'rock salt') {
    cleaned = 'salt';
  }
  // Consolidate all tofu variations into "tofu", except silken tofu
  if ((cleaned.includes('tofu') || cleaned === 'extra firm tofu' || cleaned === 'firm tofu' || cleaned === 'medium tofu' || cleaned === 'soft tofu') && !cleaned.includes('silken')) {
    cleaned = 'tofu';
  }
  // Consolidate all egg variations into "eggs"
  if (cleaned.includes('egg') && !cleaned.includes('eggplant')) {
    cleaned = 'eggs';
  }
  // Replace vague "seasonal fruit" with specific Netherlands seasonal fruits
  if (cleaned.includes('seasonal fruit') || cleaned === 'seasonal fruit') {
    // Use current date to determine season and appropriate fruits for Netherlands
    const currentMonth = new Date().getMonth() + 1; // 1-12
    if (currentMonth >= 3 && currentMonth <= 5) {
      // Spring: March-May
      cleaned = 'strawberries';
    } else if (currentMonth >= 6 && currentMonth <= 8) {
      // Summer: June-August
      cleaned = 'mixed berries';
    } else if (currentMonth >= 9 && currentMonth <= 11) {
      // Autumn: September-November
      cleaned = 'apples';
    } else {
      // Winter: December-February
      cleaned = 'citrus fruit';
    }
  }
  
  // Handle compound ingredients
  if (cleaned.includes(' and ')) {
    const parts = cleaned.split(' and ');
    // Take the first part for categorization
    cleaned = parts[0].trim();
  }
  
  // Map specific ingredients to standard names
  const ingredientMappings: Record<string, string> = {
    'eggs': 'eggs',
    'free-range eggs': 'eggs',
    'coconut yogurt': 'coconut yogurt',
    'spinach leaves': 'spinach',
    'bell pepper': 'bell peppers',
    'cherry tomatoes': 'cherry tomatoes',
    'herbs': 'fresh herbs',
    'avocado': 'avocado',
    'olive oil': 'olive oil',
    'salt': 'salt',
    'sea salt': 'salt',
    'kosher salt': 'salt',
    'table salt': 'salt',
    'himalayan salt': 'salt',
    'rock salt': 'salt',
    'tofu': 'tofu',
    'extra firm tofu': 'tofu',
    'firm tofu': 'tofu',
    'medium tofu': 'tofu',
    'soft tofu': 'tofu',
    'silken tofu': 'silken tofu',
    'pepper': 'pepper',
    'quinoa': 'quinoa',
    'wild mushrooms': 'mushrooms',
    'portobello mushrooms': 'mushrooms',
    'king oyster mushrooms': 'mushrooms',
    'mushrooms': 'mushrooms',
    'garlic': 'garlic',
    'onion': 'onions',
    'red onion': 'onions',
    'zucchini': 'zucchini',
    'nuts': 'mixed nuts',
    'almonds': 'mixed nuts',
    'walnuts': 'mixed nuts',
    'hemp seeds': 'hemp seeds',
    'banana': 'banana',
    'lemon': 'lemon',
    'lemons': 'lemon',
    'bananas': 'banana',
    'sliced banana': 'banana',
    'd banana': 'banana',
    'maple syrup': 'maple syrup',
    'cinnamon': 'cinnamon',
    'cinnamon to taste': 'cinnamon',
    'stevia to taste': 'stevia',
    'pasta': 'pasta',
    'cashew cream': 'cashew cream',
    'nutritional yeast': 'nutritional yeast',
    'sun-dried tomatoes': 'sun-dried tomatoes',
    'white wine': 'vegetable broth',
    'wine': 'vegetable broth',
    'vegetable broth': 'vegetable broth',
    'almond milk': 'almond milk',
    'kefir': 'fermented kefir',
    'berries': 'mixed berries',
    'oats': 'rolled oats',
    'granola': 'gluten-free granola',
    // Bean and legume specific mappings
    'black beans': 'black beans',
    'white beans': 'white beans', 
    'kidney beans': 'kidney beans',
    'chickpeas': 'chickpeas',
    'garbanzo beans': 'chickpeas',
    'mung beans': 'mung beans',
    'whole mung beans': 'mung beans',
    'red lentils': 'red lentils',
    'green lentils': 'green lentils',
    'lentils': 'lentils',
    'can black beans': 'black beans',
    'can white beans': 'white beans',
    'can kidney beans': 'kidney beans',
    // Cheese mappings
    'cheese': 'cheese',
    'feta cheese': 'feta cheese',
    'goat cheese': 'goat cheese',
    'mozzarella cheese': 'mozzarella',
    'mozzarella': 'mozzarella',
    'parmesan cheese': 'parmesan',
    'parmesan': 'parmesan',
    'cheddar cheese': 'cheddar',
    'cheddar': 'cheddar',
    'cottage cheese': 'cottage cheese',
    'cream cheese': 'cream cheese',
    'ricotta cheese': 'ricotta',
    'ricotta': 'ricotta', 
    'can chickpeas': 'chickpeas',
    'can mung beans': 'mung beans',
    'can beans': 'mixed beans',
    'cooked chickpeas': 'chickpeas',
    'mixed beans': 'mixed beans'
  };
  
  return ingredientMappings[cleaned] || cleaned;
}

function formatAmount(amount: number, unit: string): string {
  // Convert all measurements to grams for consistency
  let finalAmount = amount;
  let finalUnit = 'g';
  
  // Convert various units to grams
  if (unit === 'cup' || unit === 'cups') {
    finalAmount = amount * 240; // 1 cup ≈ 240g (for liquids)
  } else if (unit === 'tbsp') {
    finalAmount = amount * 15; // 1 tbsp ≈ 15g
  } else if (unit === 'tsp') {
    finalAmount = amount * 5; // 1 tsp ≈ 5g
  } else if (unit === 'oz') {
    finalAmount = amount * 28; // 1 oz ≈ 28g
  } else if (unit === 'lb' || unit === 'lbs') {
    finalAmount = amount * 454; // 1 lb ≈ 454g
  } else if (unit === 'pieces' || unit === 'piece') {
    // Keep pieces as is for countable items
    finalUnit = 'pieces';
    finalAmount = amount;
  } else if (unit === 'cloves') {
    // Keep cloves as is for garlic
    finalUnit = 'cloves';
    finalAmount = amount;
  } else if (unit === 'g') {
    // Already in grams
    finalAmount = amount;
    finalUnit = 'g';
  } else {
    // Default to grams for unknown units
    finalAmount = amount;
    finalUnit = 'g';
  }
  
  // Format the final amount nicely
  if (finalAmount >= 1000) {
    return `${(finalAmount / 1000).toFixed(1)}kg`;
  } else if (finalAmount < 1) {
    return `${(finalAmount * 1000).toFixed(0)}mg`;
  } else {
    return `${Math.round(finalAmount)}${finalUnit}`;
  }
}