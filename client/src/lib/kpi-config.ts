export interface KPIConfig {
  id: string;
  label: string;
  labelNl: string;
  unit: string;
  color: string;
  type: 'macro' | 'micro' | 'wellness';
  showInRecipe: boolean;
}

export const kpiOrder: KPIConfig[] = [
  { id: 'protein', label: 'Protein', labelNl: 'Eiwit', unit: 'g', color: 'emerald-600', type: 'macro', showInRecipe: true },
  { id: 'fats', label: 'Fats', labelNl: 'Vetten', unit: 'g', color: 'yellow-600', type: 'macro', showInRecipe: true },
  { id: 'fiber', label: 'Fiber', labelNl: 'Vezels', unit: 'g', color: 'orange-500', type: 'macro', showInRecipe: true },
  { id: 'vegetables', label: 'Vegetables', labelNl: 'Groenten', unit: 'g', color: 'green-600', type: 'wellness', showInRecipe: true },
  { id: 'plantDiversity', label: 'Plant diversity', labelNl: 'Plantdiversiteit', unit: '', color: 'green-700', type: 'wellness', showInRecipe: true },
  { id: 'rainbow', label: 'Rainbow', labelNl: 'Regenboog', unit: '/6', color: 'gradient', type: 'wellness', showInRecipe: true },
  { id: 'netCarbs', label: 'Net carbs', labelNl: 'Netto koolh.', unit: 'g', color: 'cyan-600', type: 'macro', showInRecipe: true },
  { id: 'calories', label: 'Calories', labelNl: 'Calorieën', unit: '', color: 'blue-600', type: 'macro', showInRecipe: true },
  { id: 'vitaminK', label: 'Vitamin K', labelNl: 'Vitamine K', unit: 'µg', color: 'green-600', type: 'micro', showInRecipe: true },
  { id: 'zinc', label: 'Zinc', labelNl: 'Zink', unit: 'mg', color: 'violet-500', type: 'micro', showInRecipe: true },
  { id: 'calcium', label: 'Calcium', labelNl: 'Calcium', unit: 'mg', color: 'slate-600', type: 'micro', showInRecipe: true },
  { id: 'potassium', label: 'Potassium', labelNl: 'Kalium', unit: 'mg', color: 'teal-600', type: 'micro', showInRecipe: true },
  { id: 'iron', label: 'Iron', labelNl: 'IJzer', unit: 'mg', color: 'red-600', type: 'micro', showInRecipe: true },
  { id: 'vitaminC', label: 'Vitamin C', labelNl: 'Vitamine C', unit: 'mg', color: 'amber-500', type: 'micro', showInRecipe: true },
  { id: 'sugar', label: 'Sugar', labelNl: 'Suiker', unit: 'g', color: 'pink-500', type: 'macro', showInRecipe: true },
  { id: 'sodium', label: 'Sodium', labelNl: 'Natrium', unit: 'mg', color: 'gray-600', type: 'micro', showInRecipe: true },
];

export const getKPILabel = (id: string, language: 'en' | 'nl'): string => {
  const kpi = kpiOrder.find(k => k.id === id);
  return kpi ? (language === 'nl' ? kpi.labelNl : kpi.label) : id;
};

export const getRecipeKPIs = (): KPIConfig[] => {
  return kpiOrder.filter(k => k.showInRecipe);
};

export const colorGroups = {
  red: ['tomato', 'red pepper', 'bell pepper red', 'strawberr', 'raspberr', 'red cabbage', 'beet', 'red onion', 'cherry tomato', 'radish'],
  orange: ['carrot', 'sweet potato', 'orange', 'pumpkin', 'butternut squash', 'mango', 'papaya', 'apricot', 'peach'],
  yellow: ['yellow pepper', 'corn', 'banana', 'pineapple', 'yellow squash', 'lemon', 'ginger'],
  green: ['spinach', 'broccoli', 'kale', 'lettuce', 'green bean', 'pea', 'zucchini', 'cucumber', 'avocado', 'arugula', 'bok choy', 'celery', 'asparagus', 'edamame', 'lime'],
  purple: ['blueberr', 'purple cabbage', 'eggplant', 'blackberr', 'plum', 'purple potato', 'acai', 'grape'],
  white: ['cauliflower', 'mushroom', 'onion', 'garlic', 'potato', 'white bean', 'chickpea', 'tahini', 'tofu', 'banana']
};

export const getIngredientColors = (ingredients: string[]): Set<string> => {
  const foundColors = new Set<string>();
  
  ingredients.forEach(ingredient => {
    const lowerIngredient = ingredient.toLowerCase();
    Object.entries(colorGroups).forEach(([color, keywords]) => {
      if (keywords.some(keyword => lowerIngredient.includes(keyword))) {
        foundColors.add(color);
      }
    });
  });

  return foundColors;
};

export const estimateVegetableContent = (fiber: number): number => {
  return Math.round(fiber * 13.3);
};

export const countPlantDiversity = (ingredients: string[]): number => {
  const plantKeywords = [
    'spinach', 'kale', 'broccoli', 'carrot', 'tomato', 'onion', 'garlic', 'pepper',
    'zucchini', 'eggplant', 'mushroom', 'lettuce', 'cabbage', 'celery', 'cucumber',
    'potato', 'sweet potato', 'beetroot', 'pumpkin', 'squash', 'cauliflower',
    'asparagus', 'pea', 'bean', 'lentil', 'chickpea', 'quinoa', 'rice', 'oat',
    'wheat', 'barley', 'corn', 'apple', 'banana', 'orange', 'lemon', 'lime',
    'berry', 'grape', 'mango', 'papaya', 'avocado', 'olive', 'almond', 'walnut',
    'cashew', 'pistachio', 'peanut', 'sesame', 'sunflower', 'pumpkin seed',
    'chia', 'flax', 'hemp', 'coconut', 'tofu', 'tempeh', 'edamame'
  ];

  const foundPlants = new Set<string>();
  
  ingredients.forEach(ingredient => {
    const lowerIngredient = ingredient.toLowerCase();
    plantKeywords.forEach(plant => {
      if (lowerIngredient.includes(plant)) {
        foundPlants.add(plant);
      }
    });
  });

  return foundPlants.size;
};
