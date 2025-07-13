export interface NutritionInfo {
  protein: number;
  prepTime: number;
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

// Comprehensive meal database with diverse dietary options
export const MEAL_DATABASE: MealOption[] = [
  // Breakfast options
  {
    name: "Quinoa porridge with almond butter, chia seeds, and hemp hearts",
    portion: "1 bowl (200g)",
    nutrition: { protein: 24, prepTime: 15, costEuros: 3.20, proteinPerEuro: 7.5 },
    category: "breakfast",
    tags: ["vegetarian", "gluten-free", "lactose-free", "dairy-free", "high-protein", "quick", "filling"],
    ingredients: ["quinoa", "almond butter", "chia seeds", "hemp hearts", "almond milk", "maple syrup", "cinnamon"],
    vegetableContent: {
      servings: 0,
      vegetables: [],
      benefits: ["High in complete proteins", "Rich in omega-3 fatty acids", "Good source of fiber"]
    },
    recipe: {
      instructions: [
        "Rinse 1/2 cup quinoa and cook in 1 cup almond milk with a pinch of cinnamon",
        "Simmer for 12-15 minutes until quinoa is fluffy and liquid is absorbed",
        "Stir in 2 tbsp almond butter and 1 tbsp maple syrup",
        "Top with 1 tbsp chia seeds and 2 tbsp hemp hearts",
        "Serve warm with extra almond milk if desired"
      ],
      tips: [
        "Cook quinoa in bulk and reheat throughout the week",
        "Add frozen berries for extra antioxidants"
      ],
      notes: "This breakfast provides complete protein and keeps you full for hours"
    }
  },
  {
    name: "Protein smoothie with pea protein, spinach, banana, almond milk",
    portion: "1 large smoothie (400ml)",
    nutrition: { protein: 28, prepTime: 10, costEuros: 2.80, proteinPerEuro: 10.0 },
    category: "breakfast",
    tags: ["vegetarian", "gluten-free", "lactose-free", "dairy-free", "high-protein", "quick", "refreshing"],
    ingredients: ["pea protein powder", "fresh spinach", "banana", "almond milk", "frozen berries", "flax seeds"],
    vegetableContent: {
      servings: 2,
      vegetables: ["spinach"],
      benefits: ["High in iron and folate", "Rich in antioxidants", "Supports eye health"]
    },
    recipe: {
      instructions: [
        "Add 1 cup almond milk to blender",
        "Add 1 scoop (30g) pea protein powder",
        "Add 2 cups fresh spinach leaves",
        "Add 1 ripe banana and 1/2 cup frozen berries",
        "Add 1 tbsp ground flax seeds",
        "Blend on high for 60-90 seconds until smooth",
        "Add ice if you prefer it colder and blend again"
      ],
      tips: [
        "Freeze bananas in advance for a thicker smoothie",
        "Start with liquid ingredients to help blending"
      ],
      notes: "Great post-workout option with complete amino acids"
    }
  },
  {
    name: "Chia pudding with protein powder and nuts",
    portion: "1 cup pudding + 1 scoop protein",
    nutrition: { protein: 32, prepTime: 10, costEuros: 4.50, proteinPerEuro: 7.1 },
    category: "breakfast",
    tags: ["vegetarian", "gluten-free", "lactose-free", "dairy-free", "high-protein", "make-ahead", "omega-3"],
    ingredients: ["chia seeds", "vanilla protein powder", "almond milk", "mixed nuts", "vanilla extract", "maple syrup"],
    vegetableContent: {
      servings: 0,
      vegetables: [],
      benefits: ["High in omega-3 fatty acids", "Excellent fiber source", "Complete protein profile"]
    },
    recipe: {
      instructions: [
        "In a bowl, whisk together 1/4 cup chia seeds and 1 scoop vanilla protein powder",
        "Gradually add 1 cup almond milk while whisking to prevent clumps",
        "Add 1 tsp vanilla extract and 2 tbsp maple syrup, whisk well",
        "Cover and refrigerate for at least 2 hours or overnight",
        "Stir before serving and top with 1/4 cup mixed nuts",
        "Divide into portions if meal prepping for the week"
      ],
      tips: [
        "Make 4-5 servings at once for easy breakfasts",
        "Stir halfway through setting time for better texture"
      ],
      notes: "Perfect make-ahead breakfast with omega-3 fatty acids and complete protein"
    }
  },
  {
    name: "Tofu scramble with nutritional yeast and vegetables",
    portion: "150g tofu + vegetables",
    nutrition: { protein: 22, prepTime: 20, costEuros: 2.60, proteinPerEuro: 8.5 },
    category: "breakfast",
    tags: ["vegan", "gluten-free", "lactose-free", "dairy-free", "savory", "B12", "filling"],
    ingredients: ["extra firm tofu", "nutritional yeast", "bell peppers", "onions", "spinach", "turmeric", "garlic", "olive oil"],
    vegetableContent: {
      servings: 3,
      vegetables: ["bell peppers", "onions", "spinach"],
      benefits: ["High in vitamin C", "Good source of folate", "Anti-inflammatory properties"]
    },
    recipe: {
      instructions: [
        "Press 150g extra firm tofu between paper towels for 10 minutes to remove moisture",
        "Heat 2 tbsp olive oil in a large pan over medium heat",
        "Sauté 1/2 diced onion and 1/2 diced bell pepper for 5 minutes",
        "Add 2 cloves minced garlic and cook for 1 minute",
        "Crumble the tofu into the pan using your hands or a fork",
        "Add 1/2 tsp turmeric, 3 tbsp nutritional yeast, salt and pepper",
        "Cook for 5-7 minutes, stirring frequently",
        "Add 2 cups fresh spinach and cook until wilted",
        "Taste and adjust seasoning as needed"
      ],
      tips: [
        "Press tofu well for better texture and flavor absorption",
        "Use turmeric for color that resembles scrambled eggs"
      ],
      notes: "Great source of B12 from nutritional yeast and complete protein"
    }
  },
  {
    name: "Overnight oats with protein powder and nuts",
    portion: "1 cup oats + 1 scoop protein",
    nutrition: { protein: 26, prepTime: 5, costEuros: 2.90, proteinPerEuro: 9.0 },
    category: "breakfast",
    tags: ["vegetarian", "make-ahead", "fiber", "convenient"],
    ingredients: ["rolled oats", "vanilla protein powder", "almond milk", "walnuts", "maple syrup", "vanilla extract", "cinnamon"],
    vegetableContent: {
      servings: 0,
      vegetables: [],
      benefits: ["High in fiber", "Sustained energy release", "Heart-healthy"]
    },
    recipe: {
      instructions: [
        "In a jar or bowl, combine 1/2 cup rolled oats with 1 scoop vanilla protein powder",
        "Add 3/4 cup almond milk, 1 tbsp maple syrup, and 1/2 tsp vanilla extract",
        "Add a pinch of cinnamon and mix well to combine",
        "Cover and refrigerate overnight (at least 4 hours)",
        "In the morning, stir well and top with 1/4 cup chopped walnuts",
        "Add more almond milk if you prefer a thinner consistency",
        "Enjoy cold or warm up in the microwave for 30-45 seconds"
      ],
      tips: [
        "Make 3-4 jars at once for easy weekday breakfasts",
        "Add fresh berries just before eating for extra nutrients"
      ],
      notes: "Perfect make-ahead breakfast with sustained energy release"
    }
  },

  // Lunch options
  {
    name: "Lentil and chickpea curry with brown rice",
    portion: "1.5 cups curry + 1 cup rice",
    nutrition: { protein: 42, prepTime: 25, costEuros: 3.50, proteinPerEuro: 12.0 },
    category: "lunch",
    tags: ["vegan", "gluten-free", "lactose-free", "dairy-free", "high-protein", "fiber", "iron"],
    ingredients: ["red lentils", "chickpeas", "brown rice", "coconut milk", "curry powder", "turmeric", "ginger", "garlic", "onions", "tomatoes", "spinach"],
    vegetableContent: {
      servings: 4,
      vegetables: ["onions", "tomatoes", "spinach", "garlic"],
      benefits: ["High in vitamin A", "Rich in lycopene", "Anti-inflammatory", "Immune support"]
    },
    recipe: {
      instructions: [
        "Heat 2 tbsp olive oil in a large pot over medium heat",
        "Sauté 1 diced onion until soft, about 5 minutes",
        "Add 3 cloves minced garlic, 1 tbsp ginger, 2 tsp curry powder, and 1 tsp turmeric",
        "Cook for 1 minute until fragrant",
        "Add 1 cup red lentils, 1 can chickpeas (drained), and 1 can diced tomatoes",
        "Pour in 1 can coconut milk and 1 cup water",
        "Bring to boil, then simmer 15 minutes until lentils are tender",
        "Stir in 2 cups fresh spinach until wilted",
        "Season with salt and pepper to taste",
        "Serve over cooked brown rice"
      ],
      tips: [
        "Cook brown rice separately using 1:2 ratio (rice:water)",
        "Add extra water if curry becomes too thick"
      ],
      notes: "This curry freezes well and tastes better the next day"
    }
  },
  {
    name: "Black bean and quinoa bowl with tahini dressing",
    portion: "1.5 cups beans + 1 cup quinoa",
    nutrition: { protein: 35, prepTime: 20, costEuros: 3.80, proteinPerEuro: 9.2 },
    category: "lunch",
    tags: ["vegan", "gluten-free", "lactose-free", "dairy-free", "high-protein", "mediterranean"],
    ingredients: ["black beans", "quinoa", "tahini", "lemon juice", "cucumber", "cherry tomatoes", "red onion", "parsley", "olive oil"],
    vegetableContent: {
      servings: 3,
      vegetables: ["cucumber", "cherry tomatoes", "red onion", "parsley"],
      benefits: ["High in antioxidants", "Good source of vitamin K", "Anti-inflammatory"]
    }
  },
  // Add some non-vegetarian options for users without dietary restrictions
  {
    name: "Grilled chicken breast with sweet potato and broccoli",
    portion: "150g chicken + 200g sweet potato + vegetables",
    nutrition: { protein: 45, prepTime: 25, costEuros: 5.20, proteinPerEuro: 8.7 },
    category: "lunch", 
    tags: ["high-protein", "paleo", "gluten-free", "lactose-free", "anti-inflammatory"],
    ingredients: ["chicken breast", "sweet potato", "broccoli", "olive oil", "garlic", "rosemary", "salt", "pepper"],
    vegetableContent: {
      servings: 2,
      vegetables: ["broccoli", "sweet potato"],
      benefits: ["High in vitamin A", "Rich in fiber", "Good source of vitamin C"]
    }
  },
  {
    name: "Salmon fillet with quinoa and asparagus",
    portion: "150g salmon + 1 cup quinoa + vegetables",
    nutrition: { protein: 42, prepTime: 20, costEuros: 8.50, proteinPerEuro: 4.9 },
    category: "lunch",
    tags: ["pescatarian", "gluten-free", "high-protein", "omega-3", "anti-inflammatory"],
    ingredients: ["salmon fillet", "quinoa", "asparagus", "lemon", "olive oil", "dill", "garlic"],
    vegetableContent: {
      servings: 2,
      vegetables: ["asparagus"],
      benefits: ["High in omega-3", "Good source of folate", "Anti-inflammatory"]
    }
  },
  // Keto options
  {
    name: "Avocado and hemp seed salad with olive oil dressing",
    portion: "2 avocados + mixed greens + seeds",
    nutrition: { protein: 18, prepTime: 15, costEuros: 6.20, proteinPerEuro: 2.9 },
    category: "lunch",
    tags: ["vegan", "keto", "low-carb", "gluten-free", "lactose-free", "dairy-free", "high-protein"],
    ingredients: ["avocados", "mixed greens", "hemp seeds", "pumpkin seeds", "olive oil", "lemon juice", "nutritional yeast"],
    vegetableContent: {
      servings: 4,
      vegetables: ["mixed greens", "avocados"],
      benefits: ["High in healthy fats", "Rich in potassium", "Good source of fiber"]
    }
  },
  // Dairy-containing vegetarian option
  {
    name: "Greek yogurt parfait with nuts and seeds",
    portion: "200g yogurt + nuts + seeds",
    nutrition: { protein: 25, prepTime: 5, costEuros: 3.80, proteinPerEuro: 6.6 },
    category: "breakfast",
    tags: ["vegetarian", "gluten-free", "high-protein", "quick", "probiotic"],
    ingredients: ["Greek yogurt", "almonds", "walnuts", "chia seeds", "honey", "cinnamon"],
    vegetableContent: {
      servings: 0,
      vegetables: [],
      benefits: ["Probiotic support", "High in calcium", "Good source of protein"]
    }
  },
  {
    name: "Black bean and quinoa power bowl with tahini dressing",
    portion: "1.5 cups quinoa + 1 cup black beans + vegetables",
    nutrition: { protein: 32, prepTime: 25, costEuros: 4.20, proteinPerEuro: 7.6 },
    category: "lunch",
    tags: ["complete-protein", "magnesium", "filling"],
    ingredients: ["black beans", "quinoa", "tahini", "lemon", "garlic", "olive oil", "cucumber", "bell peppers", "cherry tomatoes", "avocado", "cilantro"],
    vegetableContent: {
      servings: 3,
      vegetables: ["cucumber", "bell peppers", "cherry tomatoes"],
      benefits: ["High in vitamin C", "Hydrating", "Rich in antioxidants", "Good source of potassium"]
    },
    recipe: {
      instructions: [
        "Cook 1 cup quinoa in 2 cups water with a pinch of salt for 15 minutes",
        "Meanwhile, make tahini dressing: whisk 3 tbsp tahini, 2 tbsp lemon juice, 1 clove minced garlic, 2 tbsp olive oil, and 2-3 tbsp water",
        "Drain and rinse 1 can black beans, season with cumin and salt",
        "Dice 1/2 cucumber, 1 bell pepper, and halve 1 cup cherry tomatoes",
        "Assemble bowls: quinoa base, black beans, diced vegetables",
        "Top with sliced avocado and fresh cilantro",
        "Drizzle with tahini dressing and serve immediately"
      ],
      tips: [
        "Prep vegetables in advance for quick assembly",
        "Add extra lemon juice for brightness"
      ],
      notes: "Complete protein combination with all essential amino acids"
    }
  },
  {
    name: "White bean and vegetable soup with hemp seeds",
    portion: "2 cups soup + 2 tbsp hemp seeds",
    nutrition: { protein: 28, prepTime: 30, costEuros: 3.10, proteinPerEuro: 9.0 },
    category: "lunch",
    tags: ["warming", "omega-3", "fiber"],
    ingredients: ["white beans", "hemp seeds", "vegetable broth", "carrots", "celery", "onions", "garlic", "kale", "herbs", "olive oil"],
    vegetableContent: {
      servings: 4,
      vegetables: ["carrots", "celery", "onions", "kale"],
      benefits: ["High in beta-carotene", "Rich in vitamin K", "Good source of folate", "Antioxidant-rich"]
    },
    recipe: {
      instructions: [
        "Heat 2 tbsp olive oil in a large pot over medium heat",
        "Sauté 1 diced onion, 2 diced carrots, and 2 diced celery stalks for 8 minutes",
        "Add 3 cloves minced garlic and cook for 1 minute until fragrant",
        "Add 4 cups vegetable broth and bring to boil",
        "Add 2 cans drained white beans and simmer 15 minutes",
        "Stir in 3 cups chopped kale and cook until wilted",
        "Season with salt, pepper, and herbs (thyme, rosemary)",
        "Serve hot, topped with 2 tbsp hemp seeds per bowl"
      ],
      tips: [
        "Can be made in slow cooker for 4-6 hours on low",
        "Freezes well for up to 3 months"
      ],
      notes: "Hearty soup packed with fiber and complete protein from hemp seeds"
    }
  },
  {
    name: "Hummus and vegetable wrap with hemp hearts",
    portion: "Large GF wrap + 4 tbsp hummus + 2 tbsp hemp",
    nutrition: { protein: 24, prepTime: 15, costEuros: 4.80, proteinPerEuro: 5.0 },
    category: "lunch",
    tags: ["portable", "quick", "raw-vegetables"],
    ingredients: ["gluten-free tortilla", "hummus", "hemp hearts", "lettuce", "cucumber", "carrots", "bell peppers", "sprouts", "avocado"],
    vegetableContent: {
      servings: 5,
      vegetables: ["lettuce", "cucumber", "carrots", "bell peppers", "sprouts"],
      benefits: ["High in vitamin A", "Hydrating", "Crunchy texture", "Rich in enzymes", "Good source of fiber"]
    },
    recipe: {
      instructions: [
        "Warm gluten-free tortilla in microwave for 15 seconds to make it more pliable",
        "Spread 4 tbsp hummus evenly across the center of the wrap",
        "Layer with lettuce leaves, thinly sliced cucumber, and grated carrots",
        "Add strips of bell pepper and a handful of sprouts",
        "Slice avocado and arrange on top of vegetables",
        "Sprinkle 2 tbsp hemp hearts over the vegetables",
        "Fold in the sides and roll tightly from bottom to top",
        "Cut in half diagonally and serve immediately"
      ],
      tips: [
        "Prep vegetables the night before for quick assembly",
        "Wrap in parchment paper for easy eating on-the-go"
      ],
      notes: "Perfect portable lunch with raw vegetables and omega-3 fatty acids"
    }
  },
  {
    name: "Tempeh salad with edamame and sunflower seeds",
    portion: "120g tempeh + 1 cup edamame + mixed greens",
    nutrition: { protein: 38, prepTime: 20, costEuros: 5.60, proteinPerEuro: 6.8 },
    category: "lunch",
    tags: ["fresh", "probiotics", "vitamin-E"],
    ingredients: ["tempeh", "edamame", "mixed greens", "sunflower seeds", "cherry tomatoes", "cucumber", "red onion", "balsamic vinegar", "olive oil"],
    vegetableContent: {
      servings: 4,
      vegetables: ["mixed greens", "cherry tomatoes", "cucumber", "red onion"],
      benefits: ["Rich in antioxidants", "High in vitamin K", "Hydrating", "Good source of quercetin"]
    },
    recipe: {
      instructions: [
        "Steam tempeh for 10 minutes, then slice into strips",
        "Cook frozen edamame according to package directions, drain and cool",
        "Make dressing: whisk 3 tbsp balsamic vinegar with 2 tbsp olive oil",
        "Season dressing with salt, pepper, and herbs (basil or oregano)",
        "Arrange mixed greens in a large bowl",
        "Top with tempeh strips, edamame, halved cherry tomatoes",
        "Add diced cucumber and thinly sliced red onion",
        "Sprinkle with sunflower seeds and drizzle with dressing",
        "Toss gently and serve immediately"
      ],
      tips: [
        "Marinate tempeh in soy sauce for extra flavor",
        "Toast sunflower seeds for better crunch"
      ],
      notes: "High-protein salad with probiotics from fermented tempeh"
    }
  },

  // Dinner options
  {
    name: "Tofu stir-fry with edamame and quinoa",
    portion: "150g tofu + 1 cup vegetables + 1 cup quinoa",
    nutrition: { protein: 38, prepTime: 25, costEuros: 4.70, proteinPerEuro: 8.1 },
    category: "dinner",
    tags: ["complete-protein", "colorful", "satisfying"],
    ingredients: ["extra firm tofu", "edamame", "quinoa", "broccoli", "bell peppers", "snap peas", "carrots", "ginger", "garlic", "soy sauce", "sesame oil"],
    vegetableContent: {
      servings: 5,
      vegetables: ["broccoli", "bell peppers", "snap peas", "carrots", "edamame"],
      benefits: ["High in vitamin C", "Rich in fiber", "Good source of folate", "High in beta-carotene", "Complete amino acids"]
    },
    recipe: {
      instructions: [
        "Cook 1 cup quinoa in 2 cups water with a pinch of salt for 15 minutes",
        "Press 150g tofu and cut into cubes, season with soy sauce",
        "Heat 2 tbsp sesame oil in a large wok or pan over high heat",
        "Stir-fry tofu cubes until golden, about 5 minutes, remove and set aside",
        "Add broccoli florets and sliced carrots, stir-fry 3 minutes",
        "Add bell pepper strips and snap peas, stir-fry 2 minutes",
        "Add minced ginger and garlic, cook 30 seconds until fragrant",
        "Return tofu to pan, add edamame and 3 tbsp soy sauce",
        "Stir-fry 2 more minutes until heated through",
        "Serve over cooked quinoa, drizzle with extra sesame oil"
      ],
      tips: [
        "Keep vegetables crisp for better texture and nutrition",
        "Prep all ingredients before starting to cook"
      ],
      notes: "Complete protein meal with colorful vegetables and quinoa"
    }
  },
  {
    name: "Tempeh with roasted vegetables and hemp seeds",
    portion: "120g tempeh + mixed vegetables + 2 tbsp hemp seeds",
    nutrition: { protein: 41, prepTime: 30, costEuros: 6.20, proteinPerEuro: 6.6 },
    category: "dinner",
    tags: ["fermented", "omega-3", "antioxidants"],
    ingredients: ["tempeh", "hemp seeds", "sweet potato", "brussels sprouts", "red onion", "zucchini", "olive oil", "herbs", "balsamic vinegar"],
    vegetableContent: {
      servings: 4,
      vegetables: ["sweet potato", "brussels sprouts", "red onion", "zucchini"],
      benefits: ["High in vitamin A", "Rich in vitamin C", "Good source of sulfur compounds", "High in potassium"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 425°F (220°C)",
        "Cut sweet potato and zucchini into chunks, halve brussels sprouts",
        "Slice red onion into wedges and cube 120g tempeh",
        "Toss vegetables and tempeh with 3 tbsp olive oil and herbs",
        "Season with salt, pepper, and dried rosemary or thyme",
        "Spread on large baking sheet in single layer",
        "Roast 25-30 minutes until vegetables are tender and caramelized",
        "Drizzle with balsamic vinegar in last 5 minutes of cooking",
        "Remove from oven and sprinkle with 2 tbsp hemp seeds",
        "Serve immediately while hot"
      ],
      tips: [
        "Don't overcrowd the pan for better browning",
        "Cut vegetables similar sizes for even cooking"
      ],
      notes: "Probiotic-rich tempeh with antioxidant vegetables and omega-3s"
    }
  },
  {
    name: "Nutritional yeast pasta with white beans",
    portion: "GF pasta + 1 cup beans + 3 tbsp nutritional yeast",
    nutrition: { protein: 36, prepTime: 25, costEuros: 4.40, proteinPerEuro: 8.2 },
    category: "dinner",
    tags: ["B12", "comfort-food", "fiber"],
    ingredients: ["gluten-free pasta", "white beans", "nutritional yeast", "garlic", "olive oil", "spinach", "sun-dried tomatoes", "herbs"],
    vegetableContent: {
      servings: 2,
      vegetables: ["spinach", "sun-dried tomatoes"],
      benefits: ["High in vitamin K", "Rich in lycopene", "Good source of folate", "Antioxidant-rich"]
    },
    recipe: {
      instructions: [
        "Cook gluten-free pasta according to package directions, reserve 1 cup pasta water",
        "Heat 3 tbsp olive oil in large pan over medium heat",
        "Sauté 4 cloves minced garlic for 1 minute until fragrant",
        "Add drained white beans and cook 3 minutes to warm through",
        "Add chopped sun-dried tomatoes and cook 2 minutes",
        "Add cooked pasta to pan with 1/2 cup pasta water",
        "Toss with 3 tbsp nutritional yeast and fresh herbs (basil, parsley)",
        "Add fresh spinach and toss until wilted",
        "Season with salt, pepper, and red pepper flakes if desired",
        "Serve immediately with extra nutritional yeast on top"
      ],
      tips: [
        "Save pasta water for silky sauce consistency",
        "Don't overcook the spinach to preserve nutrients"
      ],
      notes: "Comforting pasta dish rich in B12 from nutritional yeast"
    }
  },
  {
    name: "Lentil walnut bolognese with gluten-free pasta",
    portion: "1.5 cups sauce + pasta",
    nutrition: { protein: 32, prepTime: 30, costEuros: 3.80, proteinPerEuro: 8.4 },
    category: "dinner",
    tags: ["omega-3", "iron", "hearty"],
    ingredients: ["red lentils", "walnuts", "gluten-free pasta", "crushed tomatoes", "onions", "carrots", "celery", "garlic", "herbs", "red wine"],
    vegetableContent: {
      servings: 4,
      vegetables: ["tomatoes", "onions", "carrots", "celery"],
      benefits: ["Rich in lycopene", "Anti-inflammatory", "High in beta-carotene", "Good source of potassium"]
    },
    recipe: {
      instructions: [
        "Heat 2 tbsp olive oil in large pot over medium heat",
        "Sauté diced onion, carrot, and celery until soft, about 8 minutes",
        "Add 4 cloves minced garlic and cook 1 minute",
        "Add 1 cup red lentils and 1/2 cup chopped walnuts",
        "Pour in 1 can crushed tomatoes and 2 cups vegetable broth",
        "Add 1/4 cup red wine (optional) and dried herbs (oregano, basil)",
        "Simmer 20 minutes until lentils are tender and sauce thickens",
        "Meanwhile, cook gluten-free pasta according to package directions",
        "Season bolognese with salt, pepper, and fresh herbs",
        "Serve over pasta with extra chopped walnuts if desired"
      ],
      tips: [
        "Toast walnuts beforehand for deeper flavor",
        "Let sauce simmer longer for richer taste"
      ],
      notes: "Hearty plant-based bolognese with omega-3 rich walnuts"
    }
  },
  {
    name: "Chickpea flour pancakes with vegetables and tahini",
    portion: "3 pancakes + vegetables + 2 tbsp tahini",
    nutrition: { protein: 34, prepTime: 25, costEuros: 3.60, proteinPerEuro: 9.4 },
    category: "dinner",
    tags: ["gluten-free-flour", "calcium", "unique"],
    ingredients: ["chickpea flour", "tahini", "spinach", "mushrooms", "onions", "bell peppers", "turmeric", "cumin", "nutritional yeast", "olive oil"],
    vegetableContent: {
      servings: 4,
      vegetables: ["spinach", "mushrooms", "onions", "bell peppers"],
      benefits: ["High in vitamin K", "Rich in B vitamins", "Antimicrobial properties", "High in vitamin C"]
    },
    recipe: {
      instructions: [
        "Make batter: whisk 1 cup chickpea flour with 1 cup water until smooth",
        "Add 1 tsp turmeric, 1/2 tsp cumin, 2 tbsp nutritional yeast, salt and pepper",
        "Let batter rest 10 minutes while preparing vegetables",
        "Sauté diced onions and bell peppers in olive oil until soft",
        "Add sliced mushrooms and cook until golden, about 5 minutes",
        "Add spinach and cook until wilted, season with salt",
        "Heat non-stick pan and pour 1/3 cup batter per pancake",
        "Cook 3-4 minutes until edges set, flip and cook 2 minutes more",
        "Serve pancakes topped with sautéed vegetables",
        "Drizzle with tahini thinned with lemon juice and water"
      ],
      tips: [
        "Let batter rest for better texture",
        "Cook vegetables until slightly caramelized for more flavor"
      ],
      notes: "Protein-rich savory pancakes made from chickpea flour"
    }
  },
  {
    name: "Buddha bowl with hemp hearts and nut butter dressing",
    portion: "Mixed vegetables + quinoa + 3 tbsp hemp + dressing",
    nutrition: { protein: 30, prepTime: 20, costEuros: 5.40, proteinPerEuro: 5.6 },
    category: "dinner",
    tags: ["rainbow", "omega-3", "customizable"],
    ingredients: ["quinoa", "hemp hearts", "almond butter", "roasted chickpeas", "kale", "purple cabbage", "carrots", "beets", "avocado", "lemon", "ginger"],
    vegetableContent: {
      servings: 5,
      vegetables: ["kale", "purple cabbage", "carrots", "beets", "ginger"],
      benefits: ["High in vitamin K", "Rich in anthocyanins", "High in beta-carotene", "Good source of nitrates", "Anti-inflammatory"]
    },
    recipe: {
      instructions: [
        "Cook 1/2 cup quinoa in 1 cup water for 15 minutes, let cool",
        "Roast 1 cup chickpeas with olive oil and spices at 400°F for 20 minutes",
        "Make dressing: whisk 3 tbsp almond butter, 2 tbsp lemon juice, 1 tsp grated ginger",
        "Add 2-3 tbsp water to thin dressing to desired consistency",
        "Massage chopped kale with a little olive oil and lemon",
        "Arrange quinoa in bowl as base",
        "Add sections of massaged kale, shredded purple cabbage, grated carrots",
        "Top with roasted chickpeas, sliced avocado, and grated raw beets",
        "Sprinkle 3 tbsp hemp hearts over everything",
        "Drizzle with almond butter dressing before serving"
      ],
      tips: [
        "Prep components ahead for quick assembly",
        "Use a mandoline for uniform vegetable slices"
      ],
      notes: "Colorful nutrient-dense bowl with complete protein and omega-3s"
    }
  },

  // Additional creative meal options
  {
    name: "Spiced chickpea and sweet potato curry with coconut quinoa",
    portion: "1.5 cups curry + 1 cup quinoa",
    nutrition: { protein: 26, prepTime: 25, costEuros: 4.20, proteinPerEuro: 6.2 },
    category: "dinner",
    tags: ["warming", "anti-inflammatory", "iron", "ayurvedic"],
    ingredients: ["chickpeas", "sweet potato", "quinoa", "coconut milk", "curry powder", "turmeric", "ginger", "garlic", "onions", "spinach", "tomatoes"],
    vegetableContent: {
      servings: 4,
      vegetables: ["sweet potato", "spinach", "onions", "tomatoes", "ginger"],
      benefits: ["High in vitamin A", "Rich in iron", "Anti-inflammatory", "Good source of lycopene", "Digestive support"]
    },
    recipe: {
      instructions: [
        "Cook 1 cup quinoa in 1 cup coconut milk and 1 cup water for 15 minutes",
        "Heat 2 tbsp coconut oil in large pan over medium heat",
        "Sauté diced onions until translucent, about 5 minutes",
        "Add minced ginger, garlic, 2 tsp curry powder, and 1 tsp turmeric",
        "Cook spices for 1 minute until fragrant",
        "Add cubed sweet potato and cook 8 minutes until starting to soften",
        "Add 1 can chickpeas, 1 can diced tomatoes, and 1/2 cup coconut milk",
        "Simmer 12 minutes until sweet potato is tender",
        "Stir in fresh spinach until wilted",
        "Season with salt, pepper, and fresh cilantro",
        "Serve over coconut quinoa"
      ],
      tips: [
        "Adjust curry powder to taste preference",
        "Add lime juice before serving for brightness"
      ],
      notes: "Warming Ayurvedic-inspired curry with complete protein and anti-inflammatory spices"
    }
  },

  {
    name: "Mediterranean white bean and artichoke stuffed peppers",
    portion: "2 large stuffed peppers",
    nutrition: { protein: 22, prepTime: 28, costEuros: 5.80, proteinPerEuro: 3.8 },
    category: "dinner",
    tags: ["Mediterranean", "fiber", "antioxidants", "colorful"],
    ingredients: ["bell peppers", "white beans", "artichoke hearts", "sun-dried tomatoes", "pine nuts", "nutritional yeast", "fresh herbs", "olive oil", "garlic", "lemon"],
    vegetableContent: {
      servings: 4,
      vegetables: ["bell peppers", "artichoke hearts", "sun-dried tomatoes", "garlic"],
      benefits: ["High in vitamin C", "Rich in antioxidants", "Good source of fiber", "Anti-inflammatory"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 400°F (200°C)",
        "Cut tops off 2 large bell peppers and remove seeds and membranes",
        "Mash 1 can white beans with fork, leaving some chunks",
        "Chop artichoke hearts and sun-dried tomatoes",
        "Sauté minced garlic in olive oil for 1 minute",
        "Mix beans, artichokes, tomatoes, garlic, and 2 tbsp pine nuts",
        "Add 3 tbsp nutritional yeast, lemon juice, and fresh herbs (basil, oregano)",
        "Season filling with salt and pepper",
        "Stuff peppers with bean mixture and place in baking dish",
        "Add 1/4 inch water to dish and cover with foil",
        "Bake 25 minutes until peppers are tender",
        "Remove foil, sprinkle with extra pine nuts, bake 5 more minutes"
      ],
      tips: [
        "Choose peppers that can stand upright",
        "Pre-steam peppers for 3 minutes for quicker cooking"
      ],
      notes: "Colorful Mediterranean meal packed with plant protein and antioxidants"
    }
  },

  {
    name: "Green goddess smoothie bowl with hemp and chia",
    portion: "Large smoothie bowl with toppings",
    nutrition: { protein: 28, prepTime: 10, costEuros: 4.60, proteinPerEuro: 6.1 },
    category: "breakfast",
    tags: ["raw", "omega-3", "quick", "energizing", "alkalizing"],
    ingredients: ["spinach", "avocado", "banana", "pea protein powder", "hemp hearts", "chia seeds", "coconut water", "spirulina", "mint", "lime", "coconut flakes", "berries"],
    vegetableContent: {
      servings: 3,
      vegetables: ["spinach", "avocado", "mint"],
      benefits: ["High in vitamin K", "Rich in healthy fats", "Good source of folate", "Alkalizing", "Anti-inflammatory"]
    },
    recipe: {
      instructions: [
        "Freeze banana slices night before for thick consistency",
        "Blend 2 cups spinach, 1/2 avocado, frozen banana, and 1 cup coconut water",
        "Add 1 scoop pea protein powder and 1/2 tsp spirulina",
        "Blend until completely smooth and creamy",
        "Add fresh mint leaves and lime juice, blend briefly",
        "Pour into bowl and let sit 2 minutes to thicken",
        "Top with 2 tbsp hemp hearts, 1 tbsp chia seeds",
        "Add coconut flakes and fresh berries",
        "Drizzle with additional coconut water if needed",
        "Serve immediately with a spoon"
      ],
      tips: [
        "Start with less liquid and add more as needed",
        "Frozen mango can substitute for banana"
      ],
      notes: "Nutrient-dense green smoothie bowl with complete protein and superfoods"
    }
  },

  {
    name: "Asian-inspired tempeh lettuce wraps with peanut sauce",
    portion: "6 lettuce wraps with sauce",
    nutrition: { protein: 31, prepTime: 20, costEuros: 5.40, proteinPerEuro: 5.7 },
    category: "lunch",
    tags: ["fresh", "crunchy", "probiotic", "Asian-inspired", "low-carb"],
    ingredients: ["tempeh", "butter lettuce", "peanut butter", "soy sauce", "rice vinegar", "ginger", "garlic", "carrots", "cucumber", "bell peppers", "fresh herbs", "lime", "sesame oil"],
    vegetableContent: {
      servings: 5,
      vegetables: ["lettuce", "carrots", "cucumber", "bell peppers", "fresh herbs"],
      benefits: ["High in vitamin A", "Hydrating", "Crunchy texture", "Rich in antioxidants", "Good source of folate"]
    },
    recipe: {
      instructions: [
        "Steam 120g tempeh for 10 minutes, then crumble into small pieces",
        "Make sauce: whisk 3 tbsp peanut butter, 2 tbsp soy sauce, 1 tbsp rice vinegar",
        "Add 1 tsp grated ginger, 1 clove minced garlic, and 1 tsp sesame oil to sauce",
        "Thin sauce with warm water to desired consistency",
        "Sauté crumbled tempeh in 1 tbsp oil until golden, about 5 minutes",
        "Season tempeh with soy sauce and remove from heat",
        "Prepare vegetables: julienne carrots, slice cucumber and bell peppers",
        "Wash and dry butter lettuce leaves, keeping them whole",
        "Assemble wraps: place tempeh in lettuce cups",
        "Top with vegetables and fresh herbs (cilantro, mint, basil)",
        "Drizzle with peanut sauce and serve with lime wedges"
      ],
      tips: [
        "Keep lettuce wraps cold until serving",
        "Marinate tempeh in soy sauce for extra flavor"
      ],
      notes: "Fresh, probiotic-rich wraps with crunchy vegetables and protein-rich tempeh"
    }
  }
];

export function calculateProteinTarget(activityLevel: 'high' | 'low'): number {
  return activityLevel === 'high' ? 130 : 70;
}

export function getMealsByCategory(category: 'breakfast' | 'lunch' | 'dinner'): MealOption[] {
  return MEAL_DATABASE.filter(meal => meal.category === category);
}

// Filter meals by dietary tags - meal must have ALL specified tags
export function filterMealsByDietaryTags(meals: MealOption[], dietaryTags: string[]): MealOption[] {
  if (!dietaryTags || dietaryTags.length === 0) {
    return meals;
  }
  
  return meals.filter(meal => {
    // Check if meal has all required dietary tags
    return dietaryTags.every(tag => meal.tags.includes(tag));
  });
}

// Get meals for a specific category that match dietary preferences  
export function getMealsForCategoryAndDiet(category: 'breakfast' | 'lunch' | 'dinner', dietaryTags: string[] = []): MealOption[] {
  const categoryMeals = getMealsByCategory(category);
  
  if (dietaryTags.length === 0) {
    return categoryMeals;
  }
  
  const filteredMeals = filterMealsByDietaryTags(categoryMeals, dietaryTags);
  
  // If no meals match the dietary restrictions, fall back to all meals in category
  // This ensures users always get meal plans even with restrictive dietary requirements
  if (filteredMeals.length === 0) {
    console.warn(`No ${category} meals found for dietary tags: ${dietaryTags.join(', ')}. Falling back to all ${category} meals.`);
    return categoryMeals;
  }
  
  return filteredMeals;
}

export function calculateDailyProtein(meals: MealOption[]): number {
  return meals.reduce((total, meal) => total + meal.nutrition.protein, 0);
}

export function selectMealsForDay(targetProtein: number): MealOption[] {
  const breakfast = getMealsByCategory('breakfast');
  const lunch = getMealsByCategory('lunch');
  const dinner = getMealsByCategory('dinner');

  // Simple algorithm to get close to target protein
  const proteinPerMeal = targetProtein / 3;
  
  const selectedBreakfast = breakfast.find(m => Math.abs(m.nutrition.protein - proteinPerMeal) < 10) || breakfast[0];
  const selectedLunch = lunch.find(m => Math.abs(m.nutrition.protein - proteinPerMeal) < 15) || lunch[0];
  
  const remainingProtein = targetProtein - selectedBreakfast.nutrition.protein - selectedLunch.nutrition.protein;
  const selectedDinner = dinner.find(m => Math.abs(m.nutrition.protein - remainingProtein) < 15) || dinner[0];

  return [selectedBreakfast, selectedLunch, selectedDinner];
}

export interface ShoppingListItem {
  ingredient: string;
  category: string;
  count: number;
  totalAmount: string;
  unit: string;
}

export function generateShoppingList(meals: { foodDescription: string }[]): ShoppingListItem[] {
  const ingredientCount = new Map<string, number>();
  
  // Count ingredients from all meals
  meals.forEach(meal => {
    const mealOption = MEAL_DATABASE.find(m => m.name === meal.foodDescription);
    if (mealOption) {
      mealOption.ingredients.forEach(ingredient => {
        ingredientCount.set(ingredient, (ingredientCount.get(ingredient) || 0) + 1);
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
    'hummus': 'Proteins',
    
    // Grains & Starches
    'quinoa': 'Grains & Starches',
    'brown rice': 'Grains & Starches',
    'rolled oats': 'Grains & Starches',
    'gluten-free pasta': 'Grains & Starches',
    'gluten-free tortilla': 'Grains & Starches',
    'chickpea flour': 'Grains & Starches',
    'sweet potato': 'Grains & Starches',
    
    // Nuts & Seeds
    'almond butter': 'Nuts & Seeds',
    'tahini': 'Nuts & Seeds',
    'chia seeds': 'Nuts & Seeds',
    'hemp hearts': 'Nuts & Seeds',
    'hemp seeds': 'Nuts & Seeds',
    'flax seeds': 'Nuts & Seeds',
    'mixed nuts': 'Nuts & Seeds',
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
    'sprouts': 'Vegetables',
    
    // Fruits
    'banana': 'Fruits',
    'avocado': 'Fruits',
    'lemon': 'Fruits',
    'frozen berries': 'Fruits',
    
    // Dairy Alternatives
    'almond milk': 'Dairy Alternatives',
    'coconut milk': 'Dairy Alternatives',
    
    // Pantry Items
    'olive oil': 'Pantry Items',
    'sesame oil': 'Pantry Items',
    'balsamic vinegar': 'Pantry Items',
    'soy sauce': 'Pantry Items',
    'nutritional yeast': 'Pantry Items',
    'maple syrup': 'Pantry Items',
    'vanilla extract': 'Pantry Items',
    'curry powder': 'Pantry Items',
    'turmeric': 'Pantry Items',
    'cumin': 'Pantry Items',
    'cinnamon': 'Pantry Items',
    'herbs': 'Pantry Items',
    'vegetable broth': 'Pantry Items',
    'red wine': 'Pantry Items'
  };

  // Ingredient portions mapping
  const ingredientPortions: Record<string, { amount: number; unit: string }> = {
    // Proteins
    'extra firm tofu': { amount: 400, unit: 'g' },
    'tempeh': { amount: 240, unit: 'g' },
    'red lentils': { amount: 500, unit: 'g' },
    'chickpeas': { amount: 800, unit: 'g' },
    'black beans': { amount: 800, unit: 'g' },
    'white beans': { amount: 800, unit: 'g' },
    'edamame': { amount: 500, unit: 'g' },
    'pea protein powder': { amount: 1000, unit: 'g' },
    'vanilla protein powder': { amount: 1000, unit: 'g' },
    'hummus': { amount: 400, unit: 'g' },
    
    // Grains & Starches
    'quinoa': { amount: 1000, unit: 'g' },
    'brown rice': { amount: 1000, unit: 'g' },
    'rolled oats': { amount: 1000, unit: 'g' },
    'gluten-free pasta': { amount: 500, unit: 'g' },
    'gluten-free tortilla': { amount: 8, unit: 'pieces' },
    'chickpea flour': { amount: 500, unit: 'g' },
    'sweet potato': { amount: 1000, unit: 'g' },
    
    // Nuts & Seeds
    'almond butter': { amount: 500, unit: 'g' },
    'tahini': { amount: 400, unit: 'g' },
    'chia seeds': { amount: 250, unit: 'g' },
    'hemp hearts': { amount: 250, unit: 'g' },
    'hemp seeds': { amount: 250, unit: 'g' },
    'flax seeds': { amount: 250, unit: 'g' },
    'mixed nuts': { amount: 500, unit: 'g' },
    'walnuts': { amount: 500, unit: 'g' },
    'sunflower seeds': { amount: 250, unit: 'g' },
    
    // Vegetables
    'fresh spinach': { amount: 300, unit: 'g' },
    'spinach': { amount: 300, unit: 'g' },
    'bell peppers': { amount: 200, unit: 'g' },
    'onions': { amount: 1000, unit: 'g' },
    'red onion': { amount: 500, unit: 'g' },
    'garlic': { amount: 100, unit: 'g' },
    'ginger': { amount: 100, unit: 'g' },
    'carrots': { amount: 500, unit: 'g' },
    'celery': { amount: 500, unit: 'g' },
    'cucumber': { amount: 400, unit: 'g' },
    'cherry tomatoes': { amount: 500, unit: 'g' },
    'tomatoes': { amount: 500, unit: 'g' },
    'crushed tomatoes': { amount: 800, unit: 'g' },
    'sun-dried tomatoes': { amount: 200, unit: 'g' },
    'broccoli': { amount: 500, unit: 'g' },
    'snap peas': { amount: 300, unit: 'g' },
    'brussels sprouts': { amount: 500, unit: 'g' },
    'zucchini': { amount: 500, unit: 'g' },
    'kale': { amount: 300, unit: 'g' },
    'mixed greens': { amount: 200, unit: 'g' },
    'lettuce': { amount: 200, unit: 'g' },
    'purple cabbage': { amount: 500, unit: 'g' },
    'beets': { amount: 500, unit: 'g' },
    'mushrooms': { amount: 300, unit: 'g' },
    'sprouts': { amount: 100, unit: 'g' },
    
    // Fruits
    'banana': { amount: 6, unit: 'pieces' },
    'avocado': { amount: 4, unit: 'pieces' },
    'lemon': { amount: 4, unit: 'pieces' },
    'frozen berries': { amount: 500, unit: 'g' },
    
    // Dairy Alternatives
    'almond milk': { amount: 2000, unit: 'ml' },
    'coconut milk': { amount: 400, unit: 'ml' },
    
    // Pantry Items
    'olive oil': { amount: 500, unit: 'ml' },
    'sesame oil': { amount: 250, unit: 'ml' },
    'balsamic vinegar': { amount: 250, unit: 'ml' },
    'soy sauce': { amount: 250, unit: 'ml' },
    'nutritional yeast': { amount: 200, unit: 'g' },
    'maple syrup': { amount: 250, unit: 'ml' },
    'vanilla extract': { amount: 100, unit: 'ml' },
    'curry powder': { amount: 50, unit: 'g' },
    'turmeric': { amount: 50, unit: 'g' },
    'cumin': { amount: 50, unit: 'g' },
    'cinnamon': { amount: 50, unit: 'g' },
    'herbs': { amount: 50, unit: 'g' },
    'vegetable broth': { amount: 1000, unit: 'ml' },
    'red wine': { amount: 750, unit: 'ml' },
    
    // Other
    'cilantro': { amount: 50, unit: 'g' },
    'roasted chickpeas': { amount: 200, unit: 'g' }
  };

  // Create shopping list with categories and portions
  const shoppingList: ShoppingListItem[] = [];
  
  ingredientCount.forEach((count, ingredient) => {
    const category = ingredientCategories[ingredient] || 'Other';
    const portion = ingredientPortions[ingredient] || { amount: 100, unit: 'g' };
    
    const totalAmount = portion.amount * count;
    const displayAmount = portion.unit === 'pieces' ? 
      `${totalAmount} ${portion.unit}` : 
      formatAmount(totalAmount, portion.unit);
    
    shoppingList.push({
      ingredient,
      category,
      count,
      totalAmount: displayAmount,
      unit: portion.unit
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

// Helper function to format amounts nicely
function formatAmount(amount: number, unit: string): string {
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
  
  return `${amount} ${unit}`;
}
