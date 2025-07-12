export interface NutritionInfo {
  protein: number;
  prepTime: number;
}

export interface MealOption {
  name: string;
  portion: string;
  nutrition: NutritionInfo;
  category: 'breakfast' | 'lunch' | 'dinner';
  tags: string[];
  ingredients: string[];
}

// Vegetarian, gluten-free, lactose-free meal database
export const MEAL_DATABASE: MealOption[] = [
  // Breakfast options
  {
    name: "Quinoa porridge with almond butter, chia seeds, and hemp hearts",
    portion: "1 bowl (200g)",
    nutrition: { protein: 24, prepTime: 15 },
    category: "breakfast",
    tags: ["high-protein", "quick", "filling"],
    ingredients: ["quinoa", "almond butter", "chia seeds", "hemp hearts", "almond milk", "maple syrup", "cinnamon"]
  },
  {
    name: "Protein smoothie with pea protein, spinach, banana, almond milk",
    portion: "1 large smoothie (400ml)",
    nutrition: { protein: 28, prepTime: 10 },
    category: "breakfast",
    tags: ["high-protein", "quick", "refreshing"],
    ingredients: ["pea protein powder", "fresh spinach", "banana", "almond milk", "frozen berries", "flax seeds"]
  },
  {
    name: "Chia pudding with protein powder and nuts",
    portion: "1 cup pudding + 1 scoop protein",
    nutrition: { protein: 32, prepTime: 10 },
    category: "breakfast",
    tags: ["high-protein", "make-ahead", "omega-3"],
    ingredients: ["chia seeds", "vanilla protein powder", "almond milk", "mixed nuts", "vanilla extract", "maple syrup"]
  },
  {
    name: "Tofu scramble with nutritional yeast and vegetables",
    portion: "150g tofu + vegetables",
    nutrition: { protein: 22, prepTime: 20 },
    category: "breakfast",
    tags: ["savory", "B12", "filling"],
    ingredients: ["extra firm tofu", "nutritional yeast", "bell peppers", "onions", "spinach", "turmeric", "garlic", "olive oil"]
  },
  {
    name: "Overnight oats with protein powder and nuts",
    portion: "1 cup oats + 1 scoop protein",
    nutrition: { protein: 26, prepTime: 5 },
    category: "breakfast",
    tags: ["make-ahead", "fiber", "convenient"],
    ingredients: ["rolled oats", "vanilla protein powder", "almond milk", "walnuts", "maple syrup", "vanilla extract", "cinnamon"]
  },

  // Lunch options
  {
    name: "Lentil and chickpea curry with brown rice",
    portion: "1.5 cups curry + 1 cup rice",
    nutrition: { protein: 42, prepTime: 25 },
    category: "lunch",
    tags: ["high-protein", "fiber", "iron"],
    ingredients: ["red lentils", "chickpeas", "brown rice", "coconut milk", "curry powder", "turmeric", "ginger", "garlic", "onions", "tomatoes", "spinach"]
  },
  {
    name: "Black bean and quinoa bowl with tahini dressing",
    portion: "1.5 cups beans + 1 cup quinoa",
    nutrition: { protein: 35, prepTime: 20 },
    category: "lunch",
    tags: ["complete-protein", "magnesium", "filling"],
    ingredients: ["black beans", "quinoa", "tahini", "lemon", "garlic", "olive oil", "cucumber", "bell peppers", "cherry tomatoes", "avocado", "cilantro"]
  },
  {
    name: "White bean and vegetable soup with hemp seeds",
    portion: "2 cups soup + 2 tbsp hemp seeds",
    nutrition: { protein: 28, prepTime: 30 },
    category: "lunch",
    tags: ["warming", "omega-3", "fiber"],
    ingredients: ["white beans", "hemp seeds", "vegetable broth", "carrots", "celery", "onions", "garlic", "kale", "herbs", "olive oil"]
  },
  {
    name: "Hummus and vegetable wrap with hemp hearts",
    portion: "Large GF wrap + 4 tbsp hummus + 2 tbsp hemp",
    nutrition: { protein: 24, prepTime: 15 },
    category: "lunch",
    tags: ["portable", "quick", "raw-vegetables"],
    ingredients: ["gluten-free tortilla", "hummus", "hemp hearts", "lettuce", "cucumber", "carrots", "bell peppers", "sprouts", "avocado"]
  },
  {
    name: "Tempeh salad with edamame and sunflower seeds",
    portion: "120g tempeh + 1 cup edamame + mixed greens",
    nutrition: { protein: 38, prepTime: 20 },
    category: "lunch",
    tags: ["fresh", "probiotics", "vitamin-E"],
    ingredients: ["tempeh", "edamame", "mixed greens", "sunflower seeds", "cherry tomatoes", "cucumber", "red onion", "balsamic vinegar", "olive oil"]
  },

  // Dinner options
  {
    name: "Tofu stir-fry with edamame and quinoa",
    portion: "150g tofu + 1 cup vegetables + 1 cup quinoa",
    nutrition: { protein: 38, prepTime: 25 },
    category: "dinner",
    tags: ["complete-protein", "colorful", "satisfying"],
    ingredients: ["extra firm tofu", "edamame", "quinoa", "broccoli", "bell peppers", "snap peas", "carrots", "ginger", "garlic", "soy sauce", "sesame oil"]
  },
  {
    name: "Tempeh with roasted vegetables and hemp seeds",
    portion: "120g tempeh + mixed vegetables + 2 tbsp hemp seeds",
    nutrition: { protein: 41, prepTime: 30 },
    category: "dinner",
    tags: ["fermented", "omega-3", "antioxidants"],
    ingredients: ["tempeh", "hemp seeds", "sweet potato", "brussels sprouts", "red onion", "zucchini", "olive oil", "herbs", "balsamic vinegar"]
  },
  {
    name: "Nutritional yeast pasta with white beans",
    portion: "GF pasta + 1 cup beans + 3 tbsp nutritional yeast",
    nutrition: { protein: 36, prepTime: 25 },
    category: "dinner",
    tags: ["B12", "comfort-food", "fiber"],
    ingredients: ["gluten-free pasta", "white beans", "nutritional yeast", "garlic", "olive oil", "spinach", "sun-dried tomatoes", "herbs"]
  },
  {
    name: "Lentil walnut bolognese with gluten-free pasta",
    portion: "1.5 cups sauce + pasta",
    nutrition: { protein: 32, prepTime: 30 },
    category: "dinner",
    tags: ["omega-3", "iron", "hearty"],
    ingredients: ["red lentils", "walnuts", "gluten-free pasta", "crushed tomatoes", "onions", "carrots", "celery", "garlic", "herbs", "red wine"]
  },
  {
    name: "Chickpea flour pancakes with vegetables and tahini",
    portion: "3 pancakes + vegetables + 2 tbsp tahini",
    nutrition: { protein: 34, prepTime: 25 },
    category: "dinner",
    tags: ["gluten-free-flour", "calcium", "unique"],
    ingredients: ["chickpea flour", "tahini", "spinach", "mushrooms", "onions", "bell peppers", "turmeric", "cumin", "nutritional yeast", "olive oil"]
  },
  {
    name: "Buddha bowl with hemp hearts and nut butter dressing",
    portion: "Mixed vegetables + quinoa + 3 tbsp hemp + dressing",
    nutrition: { protein: 30, prepTime: 20 },
    category: "dinner",
    tags: ["rainbow", "omega-3", "customizable"],
    ingredients: ["quinoa", "hemp hearts", "almond butter", "roasted chickpeas", "kale", "purple cabbage", "carrots", "beets", "avocado", "lemon", "ginger"]
  }
];

export function calculateProteinTarget(activityLevel: 'high' | 'low'): number {
  return activityLevel === 'high' ? 130 : 70;
}

export function getMealsByCategory(category: 'breakfast' | 'lunch' | 'dinner'): MealOption[] {
  return MEAL_DATABASE.filter(meal => meal.category === category);
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

  // Create shopping list with categories
  const shoppingList: ShoppingListItem[] = [];
  
  ingredientCount.forEach((count, ingredient) => {
    const category = ingredientCategories[ingredient] || 'Other';
    shoppingList.push({
      ingredient,
      category,
      count
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
