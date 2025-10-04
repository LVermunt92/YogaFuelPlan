/**
 * Plant Diversity Tracking System
 * 
 * Tracks unique plant foods consumed per week to support gut microbiome health.
 * Based on American Gut Project research: aim for 30+ different plants per week.
 * 
 * A "plant" counts as: vegetable, fruit, grain, legume, nut, seed, herb, or spice
 */

export type PlantType = 'vegetable' | 'fruit' | 'grain' | 'legume' | 'nut' | 'seed' | 'herb' | 'spice';

export interface PlantCategory {
  canonicalName: string;
  displayName: string;
  plantType: PlantType;
  synonyms: string[];
}

/**
 * Comprehensive plant categorization database
 * Covers common ingredients found in recipes
 */
export const PLANT_DATABASE: PlantCategory[] = [
  // Vegetables
  { canonicalName: 'spinach', displayName: 'Spinach', plantType: 'vegetable', synonyms: ['baby spinach', 'raw spinach', 'fresh spinach'] },
  { canonicalName: 'kale', displayName: 'Kale', plantType: 'vegetable', synonyms: ['curly kale', 'lacinato kale', 'baby kale'] },
  { canonicalName: 'broccoli', displayName: 'Broccoli', plantType: 'vegetable', synonyms: ['broccoli florets', 'fresh broccoli'] },
  { canonicalName: 'cauliflower', displayName: 'Cauliflower', plantType: 'vegetable', synonyms: ['cauliflower florets', 'fresh cauliflower'] },
  { canonicalName: 'carrot', displayName: 'Carrot', plantType: 'vegetable', synonyms: ['carrots', 'baby carrots', 'fresh carrots'] },
  { canonicalName: 'beetroot', displayName: 'Beetroot', plantType: 'vegetable', synonyms: ['beets', 'red beets', 'fresh beetroot'] },
  { canonicalName: 'sweet potato', displayName: 'Sweet Potato', plantType: 'vegetable', synonyms: ['sweet potatoes', 'yams'] },
  { canonicalName: 'bell pepper', displayName: 'Bell Pepper', plantType: 'vegetable', synonyms: ['red bell pepper', 'yellow bell pepper', 'green bell pepper', 'paprika'] },
  { canonicalName: 'tomato', displayName: 'Tomato', plantType: 'vegetable', synonyms: ['tomatoes', 'cherry tomatoes', 'roma tomatoes', 'fresh tomatoes'] },
  { canonicalName: 'cucumber', displayName: 'Cucumber', plantType: 'vegetable', synonyms: ['cucumbers', 'fresh cucumber'] },
  { canonicalName: 'zucchini', displayName: 'Zucchini', plantType: 'vegetable', synonyms: ['courgette', 'zucchinis'] },
  { canonicalName: 'eggplant', displayName: 'Eggplant', plantType: 'vegetable', synonyms: ['aubergine', 'eggplants'] },
  { canonicalName: 'mushroom', displayName: 'Mushroom', plantType: 'vegetable', synonyms: ['mushrooms', 'button mushrooms', 'portobello', 'shiitake'] },
  { canonicalName: 'onion', displayName: 'Onion', plantType: 'vegetable', synonyms: ['onions', 'red onion', 'white onion', 'yellow onion'] },
  { canonicalName: 'garlic', displayName: 'Garlic', plantType: 'vegetable', synonyms: ['garlic cloves', 'fresh garlic', 'minced garlic'] },
  { canonicalName: 'asparagus', displayName: 'Asparagus', plantType: 'vegetable', synonyms: ['asparagus spears', 'green asparagus'] },
  { canonicalName: 'brussels sprouts', displayName: 'Brussels Sprouts', plantType: 'vegetable', synonyms: ['brussels sprout'] },
  { canonicalName: 'cabbage', displayName: 'Cabbage', plantType: 'vegetable', synonyms: ['green cabbage', 'red cabbage', 'white cabbage'] },
  { canonicalName: 'lettuce', displayName: 'Lettuce', plantType: 'vegetable', synonyms: ['romaine lettuce', 'iceberg lettuce', 'mixed greens'] },
  { canonicalName: 'arugula', displayName: 'Arugula', plantType: 'vegetable', synonyms: ['rocket', 'rucola'] },
  { canonicalName: 'celery', displayName: 'Celery', plantType: 'vegetable', synonyms: ['celery stalks'] },
  { canonicalName: 'leek', displayName: 'Leek', plantType: 'vegetable', synonyms: ['leeks'] },
  { canonicalName: 'radish', displayName: 'Radish', plantType: 'vegetable', synonyms: ['radishes'] },
  { canonicalName: 'bok choy', displayName: 'Bok Choy', plantType: 'vegetable', synonyms: ['pak choi', 'chinese cabbage'] },
  
  // Fruits
  { canonicalName: 'apple', displayName: 'Apple', plantType: 'fruit', synonyms: ['apples', 'green apple', 'red apple'] },
  { canonicalName: 'banana', displayName: 'Banana', plantType: 'fruit', synonyms: ['bananas'] },
  { canonicalName: 'blueberry', displayName: 'Blueberry', plantType: 'fruit', synonyms: ['blueberries', 'fresh blueberries', 'frozen blueberries'] },
  { canonicalName: 'strawberry', displayName: 'Strawberry', plantType: 'fruit', synonyms: ['strawberries', 'fresh strawberries'] },
  { canonicalName: 'raspberry', displayName: 'Raspberry', plantType: 'fruit', synonyms: ['raspberries', 'fresh raspberries'] },
  { canonicalName: 'blackberry', displayName: 'Blackberry', plantType: 'fruit', synonyms: ['blackberries'] },
  { canonicalName: 'mango', displayName: 'Mango', plantType: 'fruit', synonyms: ['mangoes', 'fresh mango'] },
  { canonicalName: 'avocado', displayName: 'Avocado', plantType: 'fruit', synonyms: ['avocados', 'fresh avocado'] },
  { canonicalName: 'orange', displayName: 'Orange', plantType: 'fruit', synonyms: ['oranges'] },
  { canonicalName: 'lemon', displayName: 'Lemon', plantType: 'fruit', synonyms: ['lemons', 'lemon juice'] },
  { canonicalName: 'lime', displayName: 'Lime', plantType: 'fruit', synonyms: ['limes', 'lime juice'] },
  { canonicalName: 'grape', displayName: 'Grape', plantType: 'fruit', synonyms: ['grapes', 'red grapes', 'green grapes'] },
  { canonicalName: 'pear', displayName: 'Pear', plantType: 'fruit', synonyms: ['pears'] },
  { canonicalName: 'peach', displayName: 'Peach', plantType: 'fruit', synonyms: ['peaches'] },
  { canonicalName: 'plum', displayName: 'Plum', plantType: 'fruit', synonyms: ['plums'] },
  { canonicalName: 'cherry', displayName: 'Cherry', plantType: 'fruit', synonyms: ['cherries'] },
  { canonicalName: 'pineapple', displayName: 'Pineapple', plantType: 'fruit', synonyms: ['pineapples', 'fresh pineapple'] },
  { canonicalName: 'watermelon', displayName: 'Watermelon', plantType: 'fruit', synonyms: ['fresh watermelon'] },
  { canonicalName: 'kiwi', displayName: 'Kiwi', plantType: 'fruit', synonyms: ['kiwis', 'kiwifruit'] },
  { canonicalName: 'pomegranate', displayName: 'Pomegranate', plantType: 'fruit', synonyms: ['pomegranates', 'pomegranate seeds'] },
  
  // Grains
  { canonicalName: 'oats', displayName: 'Oats', plantType: 'grain', synonyms: ['rolled oats', 'oatmeal', 'steel-cut oats', 'quick oats'] },
  { canonicalName: 'quinoa', displayName: 'Quinoa', plantType: 'grain', synonyms: ['white quinoa', 'red quinoa', 'tri-color quinoa'] },
  { canonicalName: 'brown rice', displayName: 'Brown Rice', plantType: 'grain', synonyms: ['whole grain rice'] },
  { canonicalName: 'white rice', displayName: 'White Rice', plantType: 'grain', synonyms: ['jasmine rice', 'basmati rice'] },
  { canonicalName: 'whole wheat', displayName: 'Whole Wheat', plantType: 'grain', synonyms: ['whole wheat flour', 'whole grain wheat'] },
  { canonicalName: 'barley', displayName: 'Barley', plantType: 'grain', synonyms: ['pearl barley'] },
  { canonicalName: 'buckwheat', displayName: 'Buckwheat', plantType: 'grain', synonyms: ['buckwheat groats'] },
  { canonicalName: 'millet', displayName: 'Millet', plantType: 'grain', synonyms: [] },
  { canonicalName: 'amaranth', displayName: 'Amaranth', plantType: 'grain', synonyms: [] },
  { canonicalName: 'bulgur', displayName: 'Bulgur', plantType: 'grain', synonyms: ['bulgur wheat'] },
  { canonicalName: 'farro', displayName: 'Farro', plantType: 'grain', synonyms: [] },
  { canonicalName: 'spelt', displayName: 'Spelt', plantType: 'grain', synonyms: ['spelt flour'] },
  { canonicalName: 'rye', displayName: 'Rye', plantType: 'grain', synonyms: ['rye flour', 'rye bread'] },
  { canonicalName: 'corn', displayName: 'Corn', plantType: 'grain', synonyms: ['sweet corn', 'corn kernels', 'maize'] },
  
  // Legumes
  { canonicalName: 'lentils', displayName: 'Lentils', plantType: 'legume', synonyms: ['red lentils', 'green lentils', 'brown lentils'] },
  { canonicalName: 'chickpeas', displayName: 'Chickpeas', plantType: 'legume', synonyms: ['garbanzo beans', 'chickpea'] },
  { canonicalName: 'black beans', displayName: 'Black Beans', plantType: 'legume', synonyms: ['black bean'] },
  { canonicalName: 'kidney beans', displayName: 'Kidney Beans', plantType: 'legume', synonyms: ['red kidney beans'] },
  { canonicalName: 'white beans', displayName: 'White Beans', plantType: 'legume', synonyms: ['cannellini beans', 'navy beans'] },
  { canonicalName: 'pinto beans', displayName: 'Pinto Beans', plantType: 'legume', synonyms: [] },
  { canonicalName: 'edamame', displayName: 'Edamame', plantType: 'legume', synonyms: ['soybeans', 'green soybeans'] },
  { canonicalName: 'green peas', displayName: 'Green Peas', plantType: 'legume', synonyms: ['peas', 'garden peas'] },
  { canonicalName: 'split peas', displayName: 'Split Peas', plantType: 'legume', synonyms: [] },
  
  // Nuts
  { canonicalName: 'almonds', displayName: 'Almonds', plantType: 'nut', synonyms: ['almond', 'sliced almonds', 'almond flour'] },
  { canonicalName: 'walnuts', displayName: 'Walnuts', plantType: 'nut', synonyms: ['walnut', 'walnut halves'] },
  { canonicalName: 'cashews', displayName: 'Cashews', plantType: 'nut', synonyms: ['cashew', 'raw cashews'] },
  { canonicalName: 'pecans', displayName: 'Pecans', plantType: 'nut', synonyms: ['pecan'] },
  { canonicalName: 'pistachios', displayName: 'Pistachios', plantType: 'nut', synonyms: ['pistachio'] },
  { canonicalName: 'macadamia', displayName: 'Macadamia', plantType: 'nut', synonyms: ['macadamia nuts'] },
  { canonicalName: 'hazelnuts', displayName: 'Hazelnuts', plantType: 'nut', synonyms: ['hazelnut'] },
  { canonicalName: 'brazil nuts', displayName: 'Brazil Nuts', plantType: 'nut', synonyms: ['brazil nut'] },
  { canonicalName: 'pine nuts', displayName: 'Pine Nuts', plantType: 'nut', synonyms: ['pignoli'] },
  
  // Seeds
  { canonicalName: 'chia seeds', displayName: 'Chia Seeds', plantType: 'seed', synonyms: ['chia'] },
  { canonicalName: 'flax seeds', displayName: 'Flax Seeds', plantType: 'seed', synonyms: ['flaxseed', 'ground flaxseed', 'flax'] },
  { canonicalName: 'hemp seeds', displayName: 'Hemp Seeds', plantType: 'seed', synonyms: ['hemp hearts'] },
  { canonicalName: 'pumpkin seeds', displayName: 'Pumpkin Seeds', plantType: 'seed', synonyms: ['pepitas'] },
  { canonicalName: 'sunflower seeds', displayName: 'Sunflower Seeds', plantType: 'seed', synonyms: ['sunflower'] },
  { canonicalName: 'sesame seeds', displayName: 'Sesame Seeds', plantType: 'seed', synonyms: ['sesame', 'tahini'] },
  { canonicalName: 'poppy seeds', displayName: 'Poppy Seeds', plantType: 'seed', synonyms: [] },
  
  // Herbs
  { canonicalName: 'basil', displayName: 'Basil', plantType: 'herb', synonyms: ['fresh basil', 'dried basil'] },
  { canonicalName: 'parsley', displayName: 'Parsley', plantType: 'herb', synonyms: ['fresh parsley', 'dried parsley'] },
  { canonicalName: 'cilantro', displayName: 'Cilantro', plantType: 'herb', synonyms: ['coriander leaves', 'fresh cilantro'] },
  { canonicalName: 'mint', displayName: 'Mint', plantType: 'herb', synonyms: ['fresh mint', 'peppermint', 'spearmint'] },
  { canonicalName: 'thyme', displayName: 'Thyme', plantType: 'herb', synonyms: ['fresh thyme', 'dried thyme'] },
  { canonicalName: 'rosemary', displayName: 'Rosemary', plantType: 'herb', synonyms: ['fresh rosemary', 'dried rosemary'] },
  { canonicalName: 'oregano', displayName: 'Oregano', plantType: 'herb', synonyms: ['fresh oregano', 'dried oregano'] },
  { canonicalName: 'dill', displayName: 'Dill', plantType: 'herb', synonyms: ['fresh dill', 'dried dill'] },
  { canonicalName: 'sage', displayName: 'Sage', plantType: 'herb', synonyms: ['fresh sage', 'dried sage'] },
  { canonicalName: 'chives', displayName: 'Chives', plantType: 'herb', synonyms: ['fresh chives'] },
  
  // Spices
  { canonicalName: 'cinnamon', displayName: 'Cinnamon', plantType: 'spice', synonyms: ['ground cinnamon', 'cinnamon stick'] },
  { canonicalName: 'turmeric', displayName: 'Turmeric', plantType: 'spice', synonyms: ['ground turmeric', 'fresh turmeric'] },
  { canonicalName: 'cumin', displayName: 'Cumin', plantType: 'spice', synonyms: ['ground cumin', 'cumin seeds'] },
  { canonicalName: 'paprika', displayName: 'Paprika', plantType: 'spice', synonyms: ['smoked paprika', 'sweet paprika'] },
  { canonicalName: 'ginger', displayName: 'Ginger', plantType: 'spice', synonyms: ['fresh ginger', 'ground ginger', 'ginger root'] },
  { canonicalName: 'black pepper', displayName: 'Black Pepper', plantType: 'spice', synonyms: ['pepper', 'ground black pepper'] },
  { canonicalName: 'cayenne pepper', displayName: 'Cayenne Pepper', plantType: 'spice', synonyms: ['cayenne', 'red pepper'] },
  { canonicalName: 'chili powder', displayName: 'Chili Powder', plantType: 'spice', synonyms: ['chilli powder'] },
  { canonicalName: 'coriander', displayName: 'Coriander', plantType: 'spice', synonyms: ['ground coriander', 'coriander seeds'] },
  { canonicalName: 'cardamom', displayName: 'Cardamom', plantType: 'spice', synonyms: ['ground cardamom', 'cardamom pods'] },
  { canonicalName: 'nutmeg', displayName: 'Nutmeg', plantType: 'spice', synonyms: ['ground nutmeg'] },
  { canonicalName: 'cloves', displayName: 'Cloves', plantType: 'spice', synonyms: ['whole cloves', 'ground cloves'] },
  { canonicalName: 'fennel seeds', displayName: 'Fennel Seeds', plantType: 'spice', synonyms: ['fennel'] },
  { canonicalName: 'mustard seeds', displayName: 'Mustard Seeds', plantType: 'spice', synonyms: ['mustard'] },
];

/**
 * Normalize an ingredient string to find matching plant category
 * Handles quantities, units, and descriptors
 */
export function normalizeIngredient(ingredient: string): string {
  // Remove quantities and units (g, ml, kg, tbsp, tsp, cup, etc.)
  let normalized = ingredient
    .toLowerCase()
    .replace(/\d+(\.\d+)?\s*(g|ml|kg|tbsp|tsp|cup|cups|oz|lb|lbs|tablespoon|teaspoon|gram|milliliter|kilogram)/gi, '')
    .replace(/\(.*?\)/g, '') // Remove parenthetical info
    .replace(/[,]/g, '') // Remove commas
    .trim();
  
  // Remove common descriptors
  const descriptors = ['fresh', 'frozen', 'dried', 'raw', 'cooked', 'chopped', 'diced', 'sliced', 'minced', 'grated', 'whole', 'ground'];
  descriptors.forEach(desc => {
    normalized = normalized.replace(new RegExp(`\\b${desc}\\b`, 'gi'), '').trim();
  });
  
  return normalized;
}

/**
 * Find plant category for an ingredient
 * Returns the plant category or null if not found
 */
export function findPlantCategory(ingredient: string): PlantCategory | null {
  const normalized = normalizeIngredient(ingredient);
  
  // Direct match on canonical name
  const directMatch = PLANT_DATABASE.find(p => p.canonicalName === normalized);
  if (directMatch) return directMatch;
  
  // Match on synonyms
  const synonymMatch = PLANT_DATABASE.find(p => 
    p.synonyms.some(syn => normalized.includes(syn) || syn.includes(normalized))
  );
  if (synonymMatch) return synonymMatch;
  
  // Partial match on canonical name
  const partialMatch = PLANT_DATABASE.find(p => 
    normalized.includes(p.canonicalName) || p.canonicalName.includes(normalized)
  );
  if (partialMatch) return partialMatch;
  
  return null;
}

/**
 * Count unique plants in a list of ingredients
 * Returns count and list of unique plant names
 */
export function countUniquePlants(ingredients: string[]): {
  count: number;
  plants: Set<string>;
  plantsByType: Record<PlantType, Set<string>>;
} {
  const uniquePlants = new Set<string>();
  const plantsByType: Record<PlantType, Set<string>> = {
    vegetable: new Set(),
    fruit: new Set(),
    grain: new Set(),
    legume: new Set(),
    nut: new Set(),
    seed: new Set(),
    herb: new Set(),
    spice: new Set(),
  };
  
  ingredients.forEach(ingredient => {
    const plant = findPlantCategory(ingredient);
    if (plant) {
      uniquePlants.add(plant.canonicalName);
      plantsByType[plant.plantType].add(plant.displayName);
    }
  });
  
  return {
    count: uniquePlants.size,
    plants: uniquePlants,
    plantsByType,
  };
}
