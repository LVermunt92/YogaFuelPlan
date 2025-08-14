import { MealOption } from './nutrition-enhanced';

// Additional breakfast recipes to expand variety (target: 30+ recipes)
export const ADDITIONAL_BREAKFAST_RECIPES: MealOption[] = [
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
      "3 tbsp chia seeds",
      "1 cup almond milk",
      "2 tbsp almond butter",
      "1 tbsp maple syrup",
      "½ tsp vanilla extract",
      "¼ cup fresh berries",
      "1 tbsp chopped almonds"
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
    tags: ["vegetarian", "gluten-free", "mediterranean", "high-protein"],
    ingredients: [
      "6 eggs",
      "½ cup cherry tomatoes (halved)",
      "½ red bell pepper (diced)",
      "¼ cup feta cheese (crumbled)",
      "2 tbsp olive oil",
      "1 small onion (diced)",
      "2 cloves garlic (minced)",
      "¼ cup fresh basil (chopped)",
      "Salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["tomatoes", "bell pepper", "onion"],
      benefits: ["Rich in lycopene", "High in vitamin C", "Mediterranean antioxidants"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 180°C",
        "Heat olive oil in oven-safe skillet over medium heat",
        "Sauté onion and bell pepper for 5 minutes",
        "Add garlic and cherry tomatoes, cook 2 minutes",
        "Beat eggs and pour over vegetables",
        "Sprinkle feta cheese on top",
        "Cook on stovetop for 3 minutes, then transfer to oven",
        "Bake 12-15 minutes until set and golden",
        "Garnish with fresh basil before serving"
      ],
      tips: [
        "Great for meal prep - keeps 3 days refrigerated",
        "Serve hot or at room temperature"
      ],
      notes: "Classic Mediterranean flavors in a protein-rich breakfast"
    }
  },
  {
    name: "High-protein smoothie bowl with granola",
    portion: "1 large bowl",
    nutrition: { 
      protein: 28, 
      prepTime: 8, 
      calories: 420,
      carbohydrates: 45,
      fats: 18,
      fiber: 12,
      sugar: 28,
      sodium: 150,
      potassium: 680,
      calcium: 220,
      iron: 4.2,
      vitaminC: 35,
      costEuros: 4.20, 
      proteinPerEuro: 6.7 
    },
    category: "breakfast",
    tags: ["vegetarian", "gluten-free", "high-protein", "antioxidant-rich"],
    ingredients: [
      "1 cup Greek yogurt",
      "1 scoop vanilla protein powder",
      "½ frozen banana",
      "½ cup frozen mixed berries",
      "¼ cup granola",
      "1 tbsp chia seeds",
      "1 tbsp honey",
      "¼ cup fresh strawberries (sliced)"
    ],
    wholeFoodLevel: "moderate",
    vegetableContent: {
      servings: 2,
      vegetables: ["berries", "strawberries"],
      benefits: ["Antioxidant powerhouse", "Probiotic-rich", "Sustained energy"]
    },
    recipe: {
      instructions: [
        "Blend Greek yogurt, protein powder, banana, and frozen berries until smooth",
        "Pour into bowl with thick consistency",
        "Top with granola in rows for visual appeal",
        "Sprinkle chia seeds over surface",
        "Arrange fresh strawberry slices artistically",
        "Drizzle honey in pattern"
      ],
      tips: [
        "Freeze bowl beforehand for extra thickness",
        "Use less liquid for thicker consistency"
      ],
      notes: "Instagram-worthy breakfast with maximum protein and nutrients"
    }
  },
  {
    name: "Savory quinoa breakfast bowl",
    portion: "1 bowl (250g)",
    nutrition: { 
      protein: 19, 
      prepTime: 20, 
      calories: 380,
      carbohydrates: 48,
      fats: 14,
      fiber: 8,
      sugar: 6,
      sodium: 320,
      potassium: 520,
      calcium: 95,
      iron: 3.8,
      vitaminC: 18,
      costEuros: 3.80, 
      proteinPerEuro: 5.0 
    },
    category: "breakfast",
    tags: ["vegetarian", "vegan", "gluten-free", "lactose-free", "high-protein"],
    ingredients: [
      "½ cup quinoa",
      "1 cup vegetable broth",
      "½ avocado (sliced)",
      "1 soft-boiled egg",
      "¼ cup cherry tomatoes (halved)",
      "2 tbsp pumpkin seeds",
      "1 tbsp olive oil",
      "1 tsp lemon juice",
      "Fresh herbs (parsley, chives)",
      "Red pepper flakes"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["tomatoes", "herbs"],
      benefits: ["Complete protein from quinoa", "Healthy fats", "Sustained energy"]
    },
    recipe: {
      instructions: [
        "Rinse quinoa and cook in vegetable broth for 15 minutes",
        "Soft-boil egg for 6-7 minutes, peel when cool",
        "Fluff quinoa and divide into bowl",
        "Top with sliced avocado and halved tomatoes",
        "Add soft-boiled egg and sprinkle pumpkin seeds",
        "Drizzle with olive oil and lemon juice",
        "Garnish with fresh herbs and red pepper flakes"
      ],
      tips: [
        "Cook quinoa in bulk for multiple breakfasts",
        "Warm quinoa slightly before serving in cold weather"
      ],
      notes: "Savory breakfast alternative that's filling and nutritious"
    }
  },
  {
    name: "Protein pancakes with berry compote",
    portion: "3 pancakes with compote",
    nutrition: { 
      protein: 25, 
      prepTime: 15, 
      calories: 350,
      carbohydrates: 32,
      fats: 12,
      fiber: 6,
      sugar: 18,
      sodium: 240,
      potassium: 380,
      calcium: 120,
      iron: 2.5,
      vitaminC: 22,
      costEuros: 3.60, 
      proteinPerEuro: 6.9 
    },
    category: "breakfast",
    tags: ["vegetarian", "gluten-free", "high-protein", "weekend-special"],
    ingredients: [
      "1 scoop vanilla protein powder",
      "1 banana (mashed)",
      "2 eggs",
      "¼ cup oat flour",
      "½ tsp baking powder",
      "1 cup mixed berries",
      "2 tbsp maple syrup",
      "1 tsp vanilla extract",
      "Coconut oil for cooking"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["berries"],
      benefits: ["Natural sweetness", "High antioxidants", "Fiber-rich"]
    },
    recipe: {
      instructions: [
        "Make berry compote: simmer berries with 1 tbsp maple syrup for 5 minutes",
        "Mix protein powder, oat flour, and baking powder",
        "Whisk eggs, mashed banana, remaining maple syrup, and vanilla",
        "Combine wet and dry ingredients until smooth",
        "Heat coconut oil in pan over medium heat",
        "Pour ¼ cup batter per pancake",
        "Cook 2-3 minutes per side until golden",
        "Serve with warm berry compote"
      ],
      tips: [
        "Don't overmix batter to keep pancakes fluffy",
        "Perfect for weekend breakfast or special occasions"
      ],
      notes: "Indulgent yet healthy pancakes with natural protein boost"
    }
  }
];

// Additional lunch recipes (target: 30+ recipes)
export const ADDITIONAL_LUNCH_RECIPES: MealOption[] = [
  {
    name: "Asian-inspired quinoa power bowl",
    portion: "1 large bowl",
    nutrition: { 
      protein: 24, 
      prepTime: 25, 
      calories: 450,
      carbohydrates: 52,
      fats: 18,
      fiber: 10,
      sugar: 12,
      sodium: 420,
      potassium: 680,
      calcium: 95,
      iron: 4.2,
      vitaminC: 45,
      costEuros: 5.20, 
      proteinPerEuro: 4.6 
    },
    category: "lunch",
    tags: ["vegetarian", "vegan", "gluten-free", "lactose-free", "asian-inspired"],
    ingredients: [
      "¾ cup quinoa",
      "1 cup edamame (shelled)",
      "1 red bell pepper (julienned)",
      "1 cup purple cabbage (shredded)",
      "1 carrot (julienned)",
      "¼ cup cashews (chopped)",
      "2 tbsp sesame oil",
      "2 tbsp rice vinegar",
      "1 tbsp soy sauce",
      "1 tsp ginger (grated)",
      "Sesame seeds for garnish"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 4,
      vegetables: ["bell pepper", "cabbage", "carrot"],
      benefits: ["Rainbow of nutrients", "Anti-inflammatory", "Digestive health"]
    },
    recipe: {
      instructions: [
        "Cook quinoa in salted water for 15 minutes, then cool",
        "Steam edamame for 4 minutes if frozen",
        "Prepare all vegetables with uniform cuts",
        "Whisk sesame oil, rice vinegar, soy sauce, and ginger for dressing",
        "Arrange quinoa as base in bowl",
        "Top with colorful vegetables in sections",
        "Sprinkle edamame and cashews",
        "Drizzle with asian dressing and garnish with sesame seeds"
      ],
      tips: [
        "Prep vegetables ahead for quick assembly",
        "Add protein powder to dressing for extra protein"
      ],
      notes: "Vibrant, nutrient-dense bowl with complete proteins"
    }
  },
  {
    name: "Mediterranean chickpea and feta salad",
    portion: "1.5 cups salad",
    nutrition: { 
      protein: 20, 
      prepTime: 15, 
      calories: 420,
      carbohydrates: 38,
      fats: 22,
      fiber: 12,
      sugar: 8,
      sodium: 480,
      potassium: 620,
      calcium: 180,
      iron: 4.5,
      vitaminC: 35,
      costEuros: 4.40, 
      proteinPerEuro: 4.5 
    },
    category: "lunch",
    tags: ["vegetarian", "mediterranean", "gluten-free", "high-fiber"],
    ingredients: [
      "1.5 cups cooked chickpeas",
      "1 cucumber (diced)",
      "1 cup cherry tomatoes (halved)",
      "½ red onion (thinly sliced)",
      "¾ cup feta cheese (cubed)",
      "¼ cup kalamata olives (pitted)",
      "3 tbsp extra virgin olive oil",
      "2 tbsp lemon juice",
      "1 tsp oregano",
      "¼ cup fresh parsley (chopped)"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["cucumber", "tomatoes", "onion", "parsley"],
      benefits: ["Mediterranean antioxidants", "Heart-healthy fats", "Probiotic benefits"]
    },
    recipe: {
      instructions: [
        "Drain and rinse chickpeas if using canned",
        "Dice cucumber and halve cherry tomatoes",
        "Thinly slice red onion and cube feta cheese",
        "Whisk olive oil, lemon juice, and oregano for dressing",
        "Combine chickpeas, vegetables, and feta in large bowl",
        "Add olives and pour dressing over salad",
        "Toss gently and let marinate 10 minutes",
        "Garnish with fresh parsley before serving"
      ],
      tips: [
        "Tastes even better after sitting for 30 minutes",
        "Perfect for meal prep - keeps 3 days refrigerated"
      ],
      notes: "Classic Mediterranean flavors with plant-based protein"
    }
  },
  {
    name: "Thai-inspired peanut tofu bowl",
    portion: "1 large bowl",
    nutrition: { 
      protein: 26, 
      prepTime: 20, 
      calories: 480,
      carbohydrates: 35,
      fats: 28,
      fiber: 8,
      sugar: 14,
      sodium: 520,
      potassium: 580,
      calcium: 140,
      iron: 3.8,
      vitaminC: 40,
      costEuros: 5.60, 
      proteinPerEuro: 4.6 
    },
    category: "lunch",
    tags: ["vegetarian", "vegan", "gluten-free", "thai-inspired", "high-protein"],
    ingredients: [
      "200g firm tofu (cubed)",
      "1 cup jasmine rice (cooked)",
      "1 red bell pepper (strips)",
      "1 cup snow peas",
      "½ cup shredded carrot",
      "3 tbsp peanut butter",
      "2 tbsp lime juice",
      "1 tbsp soy sauce",
      "1 tsp honey",
      "1 clove garlic (minced)",
      "Crushed peanuts and cilantro for garnish"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["bell pepper", "snow peas", "carrot"],
      benefits: ["Vitamin A rich", "Crunchy texture", "Anti-inflammatory"]
    },
    recipe: {
      instructions: [
        "Press tofu to remove excess water, then cube",
        "Sauté tofu in oil until golden on all sides",
        "Steam snow peas for 2 minutes to retain crunch",
        "Whisk peanut butter, lime juice, soy sauce, honey, and garlic",
        "Arrange warm rice in bowl",
        "Top with tofu and fresh vegetables",
        "Drizzle with peanut sauce",
        "Garnish with crushed peanuts and fresh cilantro"
      ],
      tips: [
        "Press tofu well for better texture",
        "Thin peanut sauce with water if too thick"
      ],
      notes: "Thai-inspired flavors with complete plant proteins"
    }
  }
];

// Additional dinner recipes (target: 45+ recipes)
export const ADDITIONAL_DINNER_RECIPES: MealOption[] = [
  {
    name: "Herb-crusted salmon with quinoa pilaf",
    portion: "150g salmon + 1 cup pilaf",
    nutrition: { 
      protein: 35, 
      prepTime: 30, 
      calories: 520,
      carbohydrates: 42,
      fats: 22,
      fiber: 6,
      sugar: 8,
      sodium: 380,
      potassium: 720,
      calcium: 95,
      iron: 3.2,
      vitaminC: 25,
      costEuros: 8.80, 
      proteinPerEuro: 4.0 
    },
    category: "dinner",
    tags: ["gluten-free", "high-protein", "omega-3", "gourmet"],
    ingredients: [
      "150g salmon fillet",
      "¾ cup quinoa",
      "1.5 cups vegetable broth",
      "¼ cup fresh herbs (dill, parsley, chives)",
      "2 tbsp olive oil",
      "1 lemon (zested and juiced)",
      "1 shallot (minced)",
      "¼ cup almonds (sliced)",
      "2 cloves garlic (minced)",
      "Salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1,
      vegetables: ["herbs", "shallot"],
      benefits: ["Omega-3 fatty acids", "Complete protein", "Anti-inflammatory"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 200°C",
        "Mix chopped herbs with 1 tbsp olive oil and lemon zest",
        "Season salmon and coat with herb mixture",
        "Sauté shallot in remaining oil until soft",
        "Add quinoa and toast for 2 minutes",
        "Add broth and simmer covered for 15 minutes",
        "Bake salmon for 12-15 minutes until flaky",
        "Stir almonds into quinoa pilaf",
        "Serve salmon over quinoa with lemon wedges"
      ],
      tips: [
        "Don't overcook salmon - it should be just opaque",
        "Toast almonds separately for extra crunch"
      ],
      notes: "Restaurant-quality meal with omega-3 rich salmon"
    }
  },
  {
    name: "Moroccan-spiced lentil and vegetable tagine",
    portion: "1.5 cups tagine",
    nutrition: { 
      protein: 22, 
      prepTime: 35, 
      calories: 420,
      carbohydrates: 58,
      fats: 12,
      fiber: 18,
      sugar: 16,
      sodium: 420,
      potassium: 880,
      calcium: 120,
      iron: 6.2,
      vitaminC: 35,
      costEuros: 4.60, 
      proteinPerEuro: 4.8 
    },
    category: "dinner",
    tags: ["vegetarian", "vegan", "gluten-free", "lactose-free", "moroccan", "high-fiber"],
    ingredients: [
      "1 cup red lentils",
      "1 large eggplant (cubed)",
      "2 carrots (sliced)",
      "1 zucchini (sliced)",
      "1 onion (diced)",
      "400g diced tomatoes",
      "2 tsp ras el hanout spice blend",
      "1 tsp cinnamon",
      "2 tbsp olive oil",
      "¼ cup dried apricots (chopped)",
      "Fresh cilantro and mint"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 4,
      vegetables: ["eggplant", "carrots", "zucchini", "onion", "tomatoes"],
      benefits: ["Antioxidant-rich", "High fiber", "Anti-inflammatory spices"]
    },
    recipe: {
      instructions: [
        "Heat olive oil in large pot over medium heat",
        "Sauté onion until soft, about 5 minutes",
        "Add eggplant and cook until starting to soften",
        "Stir in spices and cook until fragrant",
        "Add lentils, tomatoes, and 2 cups water",
        "Bring to boil, then simmer covered for 15 minutes",
        "Add carrots and zucchini, cook 10 more minutes",
        "Stir in dried apricots in last 5 minutes",
        "Garnish with fresh herbs before serving"
      ],
      tips: [
        "Don't skip the spice toasting step - it deepens flavors",
        "Serve over couscous or with flatbread"
      ],
      notes: "Warming Moroccan flavors with complete plant protein"
    }
  }
];

export function getAllAdditionalRecipes(): MealOption[] {
  return [
    ...ADDITIONAL_BREAKFAST_RECIPES,
    ...ADDITIONAL_LUNCH_RECIPES,
    ...ADDITIONAL_DINNER_RECIPES
  ];
}