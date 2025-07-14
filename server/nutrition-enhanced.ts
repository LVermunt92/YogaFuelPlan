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
    tags: ["vegetarian", "gluten-free", "dairy-free", "high-protein", "anti-inflammatory", "whole30", "ayurvedic"],
    ingredients: [
      "½ cup steel-cut oats",
      "¼ cup mixed raw almonds and walnuts (chopped)",
      "½ cup fresh mixed berries (blueberries, strawberries)",
      "1 tbsp ground flaxseed",
      "½ tsp cinnamon",
      "1 tsp raw honey (optional)",
      "1½ cups water for cooking"
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
    ingredients: [
      "3 large free-range eggs",
      "1 cup fresh spinach leaves",
      "¼ cup cherry tomatoes (halved)",
      "2 tbsp fresh herbs (parsley, chives, chopped)",
      "¼ cup red bell pepper (diced)",
      "½ medium avocado (sliced)",
      "1 tsp extra virgin olive oil",
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
    portion: "1 cup prepared oats",
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
    portion: "1 cup quinoa bowl",
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
    portion: "3 medium pancakes",
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
    name: "Green smoothie bowl with hemp hearts and coconut",
    portion: "1 large bowl",
    nutrition: {
      protein: 16,
      prepTime: 10,
      calories: 295,
      carbohydrates: 35,
      fats: 11,
      fiber: 15,
      sugar: 20,
      sodium: 95,
      costEuros: 4.2,
      proteinPerEuro: 3.8
    },
    category: "breakfast",
    tags: ["vegetarian", "gluten-free", "lactose-free", "high-fiber", "antioxidant", "ayurvedic"],
    ingredients: [
      "1 cup spinach",
      "½ frozen banana",
      "½ cup unsweetened almond milk",
      "1 tbsp almond butter",
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
    portion: "1 large bowl (250g)",
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
    portion: "1.5 cups lentils + 200g vegetables",
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
    portion: "1.5 cups curry + 1 cup rice",
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
    portion: "1.5 cups quinoa + vegetables",
    nutrition: { 
      protein: 18, 
      prepTime: 35, 
      calories: 340,
      carbohydrates: 48,
      fats: 12,
      fiber: 10,
      sugar: 8,
      sodium: 320,
      costEuros: 4.80, 
      proteinPerEuro: 3.8 
    },
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
    name: "Viral Green Goddess Salad Bowl (TikTok famous)",
    portion: "1 large bowl",
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
    name: "Viral Cottage Cheese Bowl (Social Media Trend)",
    portion: "1 bowl (300g)",
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
    name: "Viral Marry Me Mushroom Pasta (Plant-Based Hit)",
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
        "Slice king oyster mushrooms thick and sear until golden (viral technique for meaty texture)",
        "Remove mushrooms, sauté garlic in same pan",
        "Add sun-dried tomatoes and a splash of vegetable broth",
        "Pour in cashew cream, add nutritional yeast for viral creamy sauce",
        "Return mushrooms to pan, simmer until heated through",
        "Serve over pasta with fresh herbs for Instagram appeal"
      ],
      tips: ["Called 'Marry Me' because it's proposal-worthy", "This vegetarian version went viral for being just as good as the original", "Perfect for date night content"],
      notes: "This plant-based version maintains all the viral appeal while being completely vegetarian. For gluten-free diets, simply substitute with gluten-free pasta (rice, corn, or chickpea pasta work perfectly)."
    }
  },

  {
    name: "Viral Cucumber Salad (TikTok Obsession)",
    portion: "1 large serving",
    nutrition: { 
      protein: 8, 
      prepTime: 10, 
      calories: 180,
      carbohydrates: 12,
      fats: 14,
      fiber: 6,
      sugar: 8,
      sodium: 520,
      potassium: 320,
      calcium: 45,
      iron: 1.2,
      vitaminC: 25,
      costEuros: 2.10, 
      proteinPerEuro: 3.8 
    },
    category: "lunch",
    tags: ["vegetarian", "gluten-free", "viral", "social-media", "low-calorie", "refreshing"],
    ingredients: ["cucumbers", "rice vinegar", "soy sauce", "sesame oil", "garlic", "chili flakes", "sesame seeds"],
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
        "Mix rice vinegar, soy sauce, sesame oil, minced garlic",
        "Toss cucumbers with dressing",
        "Top with chili flakes and sesame seeds",
        "Let marinate for viral flavor development"
      ],
      tips: ["This salad broke TikTok for being addictively delicious", "The key is the perfect balance of salty, sour, and spicy", "Many creators make this daily"],
      notes: "This cucumber salad went massively viral on TikTok for being incredibly simple yet addictive"
    }
  },

  {
    name: "Viral Cloud Bread (Social Media Phenomenon)",
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
    nutrition: { protein: 36, prepTime: 30, costEuros: 6.80, proteinPerEuro: 5.3 },
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
  }
];

// Function to get meals from enhanced database filtered by dietary requirements
export function getEnhancedMealsByCategory(category: 'breakfast' | 'lunch' | 'dinner'): MealOption[] {
  return ENHANCED_MEAL_DATABASE.filter(meal => meal.category === category);
}

export function filterEnhancedMealsByDietaryTags(meals: MealOption[], dietaryTags: string[]): MealOption[] {
  if (dietaryTags.length === 0) return meals;
  
  return meals.filter(meal => {
    // Special handling for vegetarian tag - exclude non-vegetarian meals
    if (dietaryTags.includes('vegetarian')) {
      // If vegetarian is selected, meal must have vegetarian tag AND other dietary requirements
      return dietaryTags.every(tag => meal.tags.includes(tag));
    }
    
    // For non-vegetarian diets, check all dietary requirements but don't require vegetarian tag
    const nonVegetarianTags = dietaryTags.filter(tag => tag !== 'vegetarian');
    return nonVegetarianTags.every(tag => meal.tags.includes(tag));
  });
}

export function getEnhancedMealsForCategoryAndDiet(category: 'breakfast' | 'lunch' | 'dinner', dietaryTags: string[] = []): MealOption[] {
  const categoryMeals = getEnhancedMealsByCategory(category);
  const filteredMeals = filterEnhancedMealsByDietaryTags(categoryMeals, dietaryTags);
  
  // If no meals match dietary tags, implement smart fallback
  if (filteredMeals.length === 0) {
    console.log(`No ${category} meals found for dietary tags: ${dietaryTags.join(', ')}. Attempting smart fallback.`);
    
    // Define critical dietary restrictions that should never be violated
    const criticalTags = ['vegetarian', 'vegan', 'kosher', 'halal'];
    const criticalUserTags = dietaryTags.filter(tag => criticalTags.includes(tag));
    
    // If user has critical dietary restrictions, only respect those in fallback
    if (criticalUserTags.length > 0) {
      const criticalFilteredMeals = filterEnhancedMealsByDietaryTags(categoryMeals, criticalUserTags);
      if (criticalFilteredMeals.length > 0) {
        console.log(`Fallback: Found ${criticalFilteredMeals.length} ${category} meals respecting critical dietary restrictions: ${criticalUserTags.join(', ')}`);
        return criticalFilteredMeals;
      }
    }
    
    // If even critical fallback fails, log error and return empty array to prevent inappropriate meals
    console.error(`CRITICAL: No ${category} meals found that respect dietary restrictions. This should not happen.`);
    return [];
  }
  
  return filteredMeals;
}

// Shopping list interfaces and functions
export interface ShoppingListItem {
  ingredient: string;
  category: string;
  count: number;
  totalAmount: string;
  unit: string;
}

export function generateEnhancedShoppingList(meals: { foodDescription: string }[]): ShoppingListItem[] {
  const ingredientAmounts = new Map<string, { totalAmount: number; unit: string; count: number }>();
  
  // Parse actual recipe amounts from meal instructions
  meals.forEach(meal => {
    // Strip any leftover suffix and portion scaling for meal matching
    const cleanMealName = meal.foodDescription
      .replace(/ \(leftover\)$/, '')
      .replace(/ \(2\.0x.*?\)$/, '')
      .replace(/ \- batch cook$/, '')
      .trim();
    
    const mealOption = ENHANCED_MEAL_DATABASE.find(m => m.name === cleanMealName);
    if (mealOption) {
      // Use ingredients directly since they already have proper measurements
      mealOption.ingredients.forEach(ingredient => {
        // Extract clean ingredient name from formatted text like "3 large free-range eggs" -> "eggs"
        const cleanIngredient = cleanIngredientName(ingredient);
        
        const existing = ingredientAmounts.get(cleanIngredient);
        if (existing) {
          existing.count += 1;
          // Add the default portion amount for each occurrence
          const defaultPortion = getDefaultPortion(cleanIngredient);
          existing.totalAmount += defaultPortion.amount;
        } else {
          const defaultPortion = getDefaultPortion(cleanIngredient);
          ingredientAmounts.set(cleanIngredient, { 
            totalAmount: defaultPortion.amount, 
            unit: defaultPortion.unit, 
            count: 1 
          });
        }
      });
    }
  });

  // Categorize ingredients
  const ingredientCategories: Record<string, string> = {
    // Proteins
    'extra firm tofu': 'Proteins',
    'tempeh': 'Proteins',
    'red lentils': 'Proteins',
    'chickpeas': 'Proteins',
    'black beans': 'Proteins',
    'white beans': 'Proteins',
    'edamame': 'Proteins',
    'pea protein powder': 'Proteins',
    'vanilla protein powder': 'Proteins',
    'plant protein powder': 'Proteins',
    'hummus': 'Proteins',
    'eggs': 'Proteins',
    
    // Grains & Starches
    'quinoa': 'Grains & Starches',
    'brown rice': 'Grains & Starches',
    'rolled oats': 'Grains & Starches',
    'gluten-free oats': 'Grains & Starches',
    'gluten-free pasta': 'Grains & Starches',
    'gluten-free tortilla': 'Grains & Starches',
    'chickpea flour': 'Grains & Starches',
    'coconut flour': 'Grains & Starches',
    'sweet potato': 'Grains & Starches',
    'gluten-free granola': 'Grains & Starches',
    
    // Nuts & Seeds
    'almond butter': 'Nuts & Seeds',
    'tahini': 'Nuts & Seeds',
    'chia seeds': 'Nuts & Seeds',
    'hemp hearts': 'Nuts & Seeds',
    'hemp seeds': 'Nuts & Seeds',
    'flax seeds': 'Nuts & Seeds',
    'mixed nuts': 'Nuts & Seeds',
    'almonds': 'Nuts & Seeds',
    'walnuts': 'Nuts & Seeds',
    'sunflower seeds': 'Nuts & Seeds',
    
    // Vegetables
    'fresh spinach': 'Vegetables',
    'spinach': 'Vegetables',
    'bell peppers': 'Vegetables',
    'onions': 'Vegetables',
    'red onion': 'Vegetables',
    'garlic': 'Vegetables',
    'ginger': 'Vegetables',
    'carrots': 'Vegetables',
    'celery': 'Vegetables',
    'cucumber': 'Vegetables',
    'cherry tomatoes': 'Vegetables',
    'tomatoes': 'Vegetables',
    'crushed tomatoes': 'Vegetables',
    'sun-dried tomatoes': 'Vegetables',
    'broccoli': 'Vegetables',
    'snap peas': 'Vegetables',
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
    
    // Fruits
    'banana': 'Fruits',
    'avocado': 'Fruits',
    'lemon': 'Fruits',
    'frozen berries': 'Fruits',
    'mixed berries': 'Fruits',
    'blueberries': 'Fruits',
    'fresh fruit': 'Fruits',
    
    // Dairy Alternatives
    'almond milk': 'Dairy Alternatives',
    'coconut milk': 'Dairy Alternatives',
    'coconut yogurt': 'Dairy Alternatives',
    'fermented kefir': 'Dairy Alternatives',
    
    // Pantry Items
    'olive oil': 'Pantry Items',
    'coconut oil': 'Pantry Items',
    'sesame oil': 'Pantry Items',
    'balsamic vinegar': 'Pantry Items',
    'soy sauce': 'Pantry Items',
    'nutritional yeast': 'Pantry Items',
    'vanilla extract': 'Pantry Items',
    'maple syrup': 'Pantry Items',
    'baking powder': 'Pantry Items',
    'salt': 'Pantry Items',
    'cinnamon': 'Pantry Items',
    'stevia': 'Pantry Items'
  };

  // Create shopping list with categories and converted amounts
  const shoppingList: ShoppingListItem[] = [];
  
  ingredientAmounts.forEach((amounts, ingredient) => {
    const category = ingredientCategories[ingredient] || 'Other';
    
    // Convert amounts to grams using the formatAmount function
    const displayAmount = formatAmount(amounts.totalAmount, amounts.unit);
    
    // Determine final unit after conversion
    const finalUnit = amounts.unit === 'pieces' || amounts.unit === 'cloves' ? amounts.unit : 'g';
    
    shoppingList.push({
      ingredient,
      category,
      count: amounts.count,
      totalAmount: displayAmount,
      unit: finalUnit
    });
  });

  // Sort by category and then by ingredient name
  return shoppingList.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.ingredient.localeCompare(b.ingredient);
  });
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

function getDefaultPortion(ingredient: string): { amount: number; unit: string } {
  // Default portions for common ingredients in grams (when no recipe amounts are found)
  const defaults: Record<string, { amount: number; unit: string }> = {
    'almond milk': { amount: 240, unit: 'g' }, // 1 cup = 240g
    'coconut milk': { amount: 240, unit: 'g' }, // 1 cup = 240g
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
    'olive oil': { amount: 30, unit: 'g' }, // 2 tbsp = ~30g
    'coconut oil': { amount: 15, unit: 'g' }, // 1 tbsp = ~15g
    'eggs': { amount: 2, unit: 'pieces' }, // 2 large eggs
    'nutritional yeast': { amount: 15, unit: 'g' }, // 2 tbsp = ~15g
    'coconut yogurt': { amount: 120, unit: 'g' }, // 0.5 cup = ~120g
    'cherry tomatoes': { amount: 150, unit: 'g' }, // 1 cup = ~150g
    'bell peppers': { amount: 120, unit: 'g' }, // 1 medium pepper
    'zucchini': { amount: 200, unit: 'g' }, // 1 medium zucchini
    'brussels sprouts': { amount: 150, unit: 'g' }, // 1 cup = ~150g
    'sweet potato': { amount: 200, unit: 'g' }, // 1 medium sweet potato
    'cashew cream': { amount: 60, unit: 'g' }, // 1/4 cup = ~60g
    'sun-dried tomatoes': { amount: 30, unit: 'g' }, // 2 tbsp = ~30g
    'pasta': { amount: 100, unit: 'g' }, // 1 serving dry pasta
    'vegetable broth': { amount: 240, unit: 'g' }, // 1 cup = 240g
    'mixed nuts': { amount: 30, unit: 'g' }, // 2 tbsp = ~30g
    'maple syrup': { amount: 20, unit: 'g' }, // 1 tbsp = ~20g
    'vanilla extract': { amount: 5, unit: 'g' }, // 1 tsp = ~5g
    'cinnamon': { amount: 2, unit: 'g' }, // 1 tsp = ~2g
    'salt': { amount: 5, unit: 'g' }, // 1 tsp = ~5g
    'pepper': { amount: 2, unit: 'g' }, // 1/2 tsp = ~2g
    'fresh herbs': { amount: 10, unit: 'g' } // 2 tbsp chopped = ~10g
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
  
  let cleaned = ingredient.toLowerCase().trim();
  
  // Remove leading measurements and quantities (including fractions and numbers)
  cleaned = cleaned.replace(/^[\d\/½¼¾⅓⅔⅛⅜⅝⅞]+\s*(cup|cups|tbsp|tsp|tablespoons?|teaspoons?|g|grams?|lb|lbs|pounds?|oz|ounces?|pieces?|slices?|cloves?|sprigs?|medium|large|small|ml)\s*/, '');
  
  // Remove leading numbers and fractions that might still be there  
  cleaned = cleaned.replace(/^[\d\/½¼¾⅓⅔⅛⅜⅝⅞]+\s*/, '');
  
  // Remove descriptive words and parenthetical content
  cleaned = cleaned.replace(/\s*\([^)]*\)/g, ''); // Remove (content in parentheses)
  cleaned = cleaned.replace(/\b(free-range|organic|fresh|raw|toasted|chopped|sliced|diced|minced|halved|cooked|long-fermented)\b/g, '');
  cleaned = cleaned.replace(/\b(extra virgin|sea|black|white|ground|mixed|frozen|unsweetened|pure|gluten-free)\b/g, '');
  cleaned = cleaned.replace(/^(pinch of|dash of|handful of)\s*/i, '');
  
  // Clean up spaces and handle special cases
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Handle specific problematic cases to ensure proper consolidation
  if (cleaned.includes('lemon') || cleaned === 'lemon') {
    cleaned = 'lemon';
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
    'banana': 'banana',
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
    'granola': 'gluten-free granola'
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