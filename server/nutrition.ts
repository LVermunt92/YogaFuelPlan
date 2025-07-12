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
}

// Vegetarian, gluten-free, lactose-free meal database
export const MEAL_DATABASE: MealOption[] = [
  // Breakfast options
  {
    name: "Quinoa porridge with almond butter, chia seeds, and hemp hearts",
    portion: "1 bowl (200g)",
    nutrition: { protein: 24, prepTime: 15 },
    category: "breakfast",
    tags: ["high-protein", "quick", "filling"]
  },
  {
    name: "Protein smoothie with pea protein, spinach, banana, almond milk",
    portion: "1 large smoothie (400ml)",
    nutrition: { protein: 28, prepTime: 10 },
    category: "breakfast",
    tags: ["high-protein", "quick", "refreshing"]
  },
  {
    name: "Chia pudding with protein powder and nuts",
    portion: "1 cup pudding + 1 scoop protein",
    nutrition: { protein: 32, prepTime: 10 },
    category: "breakfast",
    tags: ["high-protein", "make-ahead", "omega-3"]
  },
  {
    name: "Tofu scramble with nutritional yeast and vegetables",
    portion: "150g tofu + vegetables",
    nutrition: { protein: 22, prepTime: 20 },
    category: "breakfast",
    tags: ["savory", "B12", "filling"]
  },
  {
    name: "Overnight oats with protein powder and nuts",
    portion: "1 cup oats + 1 scoop protein",
    nutrition: { protein: 26, prepTime: 5 },
    category: "breakfast",
    tags: ["make-ahead", "fiber", "convenient"]
  },

  // Lunch options
  {
    name: "Lentil and chickpea curry with brown rice",
    portion: "1.5 cups curry + 1 cup rice",
    nutrition: { protein: 42, prepTime: 25 },
    category: "lunch",
    tags: ["high-protein", "fiber", "iron"]
  },
  {
    name: "Black bean and quinoa bowl with tahini dressing",
    portion: "1.5 cups beans + 1 cup quinoa",
    nutrition: { protein: 35, prepTime: 20 },
    category: "lunch",
    tags: ["complete-protein", "magnesium", "filling"]
  },
  {
    name: "White bean and vegetable soup with hemp seeds",
    portion: "2 cups soup + 2 tbsp hemp seeds",
    nutrition: { protein: 28, prepTime: 30 },
    category: "lunch",
    tags: ["warming", "omega-3", "fiber"]
  },
  {
    name: "Hummus and vegetable wrap with hemp hearts",
    portion: "Large GF wrap + 4 tbsp hummus + 2 tbsp hemp",
    nutrition: { protein: 24, prepTime: 15 },
    category: "lunch",
    tags: ["portable", "quick", "raw-vegetables"]
  },
  {
    name: "Tempeh salad with edamame and sunflower seeds",
    portion: "120g tempeh + 1 cup edamame + mixed greens",
    nutrition: { protein: 38, prepTime: 20 },
    category: "lunch",
    tags: ["fresh", "probiotics", "vitamin-E"]
  },

  // Dinner options
  {
    name: "Tofu stir-fry with edamame and quinoa",
    portion: "150g tofu + 1 cup vegetables + 1 cup quinoa",
    nutrition: { protein: 38, prepTime: 25 },
    category: "dinner",
    tags: ["complete-protein", "colorful", "satisfying"]
  },
  {
    name: "Tempeh with roasted vegetables and hemp seeds",
    portion: "120g tempeh + mixed vegetables + 2 tbsp hemp seeds",
    nutrition: { protein: 41, prepTime: 30 },
    category: "dinner",
    tags: ["fermented", "omega-3", "antioxidants"]
  },
  {
    name: "Nutritional yeast pasta with white beans",
    portion: "GF pasta + 1 cup beans + 3 tbsp nutritional yeast",
    nutrition: { protein: 36, prepTime: 25 },
    category: "dinner",
    tags: ["B12", "comfort-food", "fiber"]
  },
  {
    name: "Lentil walnut bolognese with gluten-free pasta",
    portion: "1.5 cups sauce + pasta",
    nutrition: { protein: 32, prepTime: 30 },
    category: "dinner",
    tags: ["omega-3", "iron", "hearty"]
  },
  {
    name: "Chickpea flour pancakes with vegetables and tahini",
    portion: "3 pancakes + vegetables + 2 tbsp tahini",
    nutrition: { protein: 34, prepTime: 25 },
    category: "dinner",
    tags: ["gluten-free-flour", "calcium", "unique"]
  },
  {
    name: "Buddha bowl with hemp hearts and nut butter dressing",
    portion: "Mixed vegetables + quinoa + 3 tbsp hemp + dressing",
    nutrition: { protein: 30, prepTime: 20 },
    category: "dinner",
    tags: ["rainbow", "omega-3", "customizable"]
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
