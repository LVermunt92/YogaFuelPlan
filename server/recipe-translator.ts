// Recipe Translation Service for Dutch Language Support
// Translates recipe names, ingredients, and instructions from English to Dutch

export interface TranslatedRecipe {
  name: string;
  ingredients: string[];
  instructions: string[];
  tips?: string[];
  notes?: string[];
}

// Common ingredient translations (English -> Dutch)
const ingredientTranslations: Record<string, string> = {
  // Proteins
  'chicken': 'kip',
  'chicken breast': 'kipfilet',
  'chicken thigh': 'kippendij',
  'beef': 'rundvlees',
  'pork': 'varkensvlees',
  'salmon': 'zalm',
  'tuna': 'tonijn',
  'cod': 'kabeljauw',
  'eggs': 'eieren',
  'egg': 'ei',
  'tofu': 'tofu',
  'tempeh': 'tempeh',
  'lentils': 'linzen',
  'chickpeas': 'kikkererwten',
  'black beans': 'zwarte bonen',
  'kidney beans': 'kidneybonen',
  'white beans': 'witte bonen',
  'quinoa': 'quinoa',
  
  // Dairy & Alternatives
  'milk': 'melk',
  'almond milk': 'amandelmelk',
  'oat milk': 'havermelk',
  'coconut milk': 'kokosmelk',
  'yogurt': 'yoghurt',
  'greek yogurt': 'griekse yoghurt',
  'cheese': 'kaas',
  'cottage cheese': 'hüttenkäse',
  'feta cheese': 'fetakaas',
  'parmesan': 'parmezaanse kaas',
  'butter': 'boter',
  'cream': 'room',
  
  // Grains & Carbs
  'rice': 'rijst',
  'brown rice': 'bruine rijst',
  'basmati rice': 'basmatirijst',
  'pasta': 'pasta',
  'bread': 'brood',
  'oats': 'haver',
  'rolled oats': 'havervlokken',
  'steel-cut oats': 'havergrutten',
  'flour': 'meel',
  'whole wheat flour': 'volkoren meel',
  'coconut flour': 'kokosmeel',
  'almond flour': 'amandelmeel',
  
  // Vegetables
  'onion': 'ui',
  'garlic': 'knoflook',
  'tomato': 'tomaat',
  'tomatoes': 'tomaten',
  'carrot': 'wortel',
  'carrots': 'wortels',
  'broccoli': 'broccoli',
  'spinach': 'spinazie',
  'kale': 'boerenkool',
  'bell pepper': 'paprika',
  'red bell pepper': 'rode paprika',
  'cucumber': 'komkommer',
  'zucchini': 'courgette',
  'eggplant': 'aubergine',
  'mushrooms': 'champignons',
  'avocado': 'avocado',
  'sweet potato': 'zoete aardappel',
  'potato': 'aardappel',
  'potatoes': 'aardappelen',
  'lettuce': 'sla',
  'cabbage': 'kool',
  'cauliflower': 'bloemkool',
  
  // Fruits
  'apple': 'appel',
  'banana': 'banaan',
  'berries': 'bessen',
  'blueberries': 'bosbessen',
  'strawberries': 'aardbeien',
  'raspberries': 'frambozen',
  'orange': 'sinaasappel',
  'lemon': 'citroen',
  'lime': 'limoen',
  'mango': 'mango',
  'pineapple': 'ananas',
  
  // Herbs & Spices
  'salt': 'zout',
  'pepper': 'peper',
  'black pepper': 'zwarte peper',
  'garlic powder': 'knoflookpoeder',
  'onion powder': 'uienpoeder',
  'paprika': 'paprikapoeder',
  'cumin': 'komijn',
  'turmeric': 'kurkuma',
  'ginger': 'gember',
  'fresh ginger': 'verse gember',
  'basil': 'basilicum',
  'oregano': 'oregano',
  'thyme': 'tijm',
  'rosemary': 'rozemarijn',
  'parsley': 'peterselie',
  'cilantro': 'koriander',
  'coriander': 'koriander',
  'bay leaves': 'laurierbladeren',
  
  // Oils & Vinegars
  'olive oil': 'olijfolie',
  'coconut oil': 'kokosolie',
  'vegetable oil': 'plantaardige olie',
  'sesame oil': 'sesamolie',
  'vinegar': 'azijn',
  'balsamic vinegar': 'balsamico azijn',
  'apple cider vinegar': 'appelciderazijn',
  
  // Nuts & Seeds
  'almonds': 'amandelen',
  'walnuts': 'walnoten',
  'cashews': 'cashewnoten',
  'peanuts': 'pinda\'s',
  'pine nuts': 'pijnboompitten',
  'chia seeds': 'chiazaad',
  'flax seeds': 'lijnzaad',
  'hemp seeds': 'hennepzaad',
  'sunflower seeds': 'zonnebloempitten',
  'pumpkin seeds': 'pompoenpitten',
  
  // Cooking terms
  'fresh': 'vers',
  'dried': 'gedroogd',
  'frozen': 'bevroren',
  'organic': 'biologisch',
  'raw': 'rauw',
  'cooked': 'gekookt',
  'steamed': 'gestoomd',
  'roasted': 'geroosterd',
  'grilled': 'gegrild',
  'baked': 'gebakken',
  'sautéed': 'gesauteerd',
  'chopped': 'gehakt',
  'diced': 'in blokjes gesneden',
  'sliced': 'in plakjes gesneden',
  'minced': 'fijngehakt',
  'grated': 'geraspt',
  
  // Measurements
  'cup': 'kopje',
  'cups': 'kopjes',
  'tablespoon': 'eetlepel',
  'tablespoons': 'eetlepels',
  'teaspoon': 'theelepel',
  'teaspoons': 'theelepels',
  'gram': 'gram',
  'grams': 'gram',
  'kilogram': 'kilogram',
  'kg': 'kg',
  'liter': 'liter',
  'ml': 'ml',
  'handful': 'handvol',
  'pinch': 'snufje',
  'dash': 'scheutje',
  'to taste': 'naar smaak',
  
  // Common recipe phrases
  'heat oil': 'verhit olie',
  'add': 'voeg toe',
  'mix': 'meng',
  'stir': 'roer',
  'cook': 'kook',
  'simmer': 'laat sudderen',
  'boil': 'kook',
  'fry': 'bak',
  'season': 'kruid',
  'serve': 'serveer',
  'garnish': 'garneer',
  'slice': 'snijd',
  'chop': 'hak',
  'dice': 'snijd in blokjes',
  'mince': 'hak fijn',
  'grate': 'rasp',
  'peel': 'schil',
  'wash': 'was',
  'drain': 'laat uitlekken',
  'rinse': 'spoel af',
  'combine': 'combineer',
  'whisk': 'klop',
  'blend': 'mix',
  'marinate': 'marineer',
  'refrigerate': 'koel',
  'freeze': 'vries in',
  'thaw': 'ontdooi',
  
  // Recipe name translations
  'bowl': 'kom',
  'salad': 'salade',
  'soup': 'soep',
  'stew': 'stoofschotel',
  'curry': 'curry',
  'stir-fry': 'roerbakgerecht',
  'smoothie': 'smoothie',
  'pancakes': 'pannenkoeken',
  'omelette': 'omelet',
  'frittata': 'frittata',
  'casserole': 'ovenschotel',
  'pasta': 'pasta',
  'risotto': 'risotto',
  'pilaf': 'pilav',
  'wrap': 'wrap',
  'sandwich': 'sandwich',
  'burger': 'burger',
  'meatballs': 'gehaktballen',
  'roast': 'gebraden',
  'grilled': 'gegrilde',
  'baked': 'gebakken',
  'steamed': 'gestoomde',
  'sautéed': 'gesauteerde',
  'braised': 'gestoofde',
  
  // Cooking methods and times
  'minutes': 'minuten',
  'hours': 'uren',
  'medium heat': 'middelhoog vuur',
  'low heat': 'laag vuur',
  'high heat': 'hoog vuur',
  'oven': 'oven',
  'stovetop': 'fornuis',
  'pan': 'pan',
  'pot': 'pan',
  'skillet': 'koekenpan',
  'baking dish': 'ovenschaal',
  'cutting board': 'snijplank',
  'knife': 'mes',
  'wooden spoon': 'houten lepel',
  'whisk': 'garde',
  'spatula': 'spatel',
};

// Recipe name pattern translations
const recipeNamePatterns: Array<{pattern: RegExp, replacement: string}> = [
  // Protein + preparation
  { pattern: /grilled chicken/gi, replacement: 'gegrilde kip' },
  { pattern: /baked salmon/gi, replacement: 'gebakken zalm' },
  { pattern: /roasted beef/gi, replacement: 'geroosterd rundvlees' },
  { pattern: /steamed fish/gi, replacement: 'gestoomde vis' },
  
  // Bowl dishes
  { pattern: /protein bowl/gi, replacement: 'eiwitkom' },
  { pattern: /quinoa bowl/gi, replacement: 'quinoa kom' },
  { pattern: /smoothie bowl/gi, replacement: 'smoothie kom' },
  { pattern: /breakfast bowl/gi, replacement: 'ontbijt kom' },
  { pattern: /buddha bowl/gi, replacement: 'buddha kom' },
  
  // Common dish types
  { pattern: /vegetable stir-fry/gi, replacement: 'groente roerbakgerecht' },
  { pattern: /chicken curry/gi, replacement: 'kipcurry' },
  { pattern: /lentil soup/gi, replacement: 'linzensoep' },
  { pattern: /vegetable soup/gi, replacement: 'groentesoep' },
  { pattern: /fruit salad/gi, replacement: 'fruitsalade' },
  { pattern: /green salad/gi, replacement: 'groene salade' },
  
  // Preparation methods
  { pattern: /with fresh herbs/gi, replacement: 'met verse kruiden' },
  { pattern: /with vegetables/gi, replacement: 'met groenten' },
  { pattern: /with nuts/gi, replacement: 'met noten' },
  { pattern: /with seeds/gi, replacement: 'met zaden' },
  { pattern: /with berries/gi, replacement: 'met bessen' },
  { pattern: /with coconut/gi, replacement: 'met kokos' },
  
  // Dietary modifiers
  { pattern: /gluten-free/gi, replacement: 'glutenvrij' },
  { pattern: /dairy-free/gi, replacement: 'zuivelvrij' },
  { pattern: /vegan/gi, replacement: 'veganistisch' },
  { pattern: /vegetarian/gi, replacement: 'vegetarisch' },
  { pattern: /high-protein/gi, replacement: 'eiwitrijk' },
  { pattern: /low-carb/gi, replacement: 'koolhydraatarm' },
  
  // Cooking styles
  { pattern: /mediterranean/gi, replacement: 'mediterraan' },
  { pattern: /asian/gi, replacement: 'aziatisch' },
  { pattern: /italian/gi, replacement: 'italiaans' },
  { pattern: /mexican/gi, replacement: 'mexicaans' },
  { pattern: /indian/gi, replacement: 'indiaas' },
  { pattern: /thai/gi, replacement: 'thais' },
  { pattern: /ayurvedic/gi, replacement: 'ayurvedisch' },
];

function translateIngredient(ingredient: string): string {
  let translated = ingredient.toLowerCase();
  
  // Apply ingredient translations
  for (const [english, dutch] of Object.entries(ingredientTranslations)) {
    const regex = new RegExp(`\\b${english}\\b`, 'gi');
    translated = translated.replace(regex, dutch);
  }
  
  // Capitalize first letter
  return translated.charAt(0).toUpperCase() + translated.slice(1);
}

function translateInstruction(instruction: string): string {
  let translated = instruction;
  
  // Apply ingredient and cooking term translations
  for (const [english, dutch] of Object.entries(ingredientTranslations)) {
    const regex = new RegExp(`\\b${english}\\b`, 'gi');
    translated = translated.replace(regex, dutch);
  }
  
  return translated;
}

function translateRecipeName(name: string): string {
  let translated = name;
  
  // Apply pattern-based translations first
  for (const {pattern, replacement} of recipeNamePatterns) {
    translated = translated.replace(pattern, replacement);
  }
  
  // Apply individual word translations
  for (const [english, dutch] of Object.entries(ingredientTranslations)) {
    const regex = new RegExp(`\\b${english}\\b`, 'gi');
    translated = translated.replace(regex, dutch);
  }
  
  return translated;
}

export function translateRecipe(recipe: any, language: 'en' | 'nl'): TranslatedRecipe {
  if (language === 'en') {
    return {
      name: recipe.name,
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      tips: recipe.tips || [],
      notes: recipe.notes || []
    };
  }
  
  // Translate to Dutch
  return {
    name: translateRecipeName(recipe.name),
    ingredients: (recipe.ingredients || []).map(translateIngredient),
    instructions: (recipe.instructions || []).map(translateInstruction),
    tips: (recipe.tips || []).map(translateInstruction),
    notes: (recipe.notes || []).map(translateInstruction)
  };
}

// Translate meal plan data
export function translateMealPlan(mealPlan: any, language: 'en' | 'nl'): any {
  if (language === 'en') {
    return mealPlan;
  }
  
  // Create a deep copy and translate meal names
  const translatedMealPlan = JSON.parse(JSON.stringify(mealPlan));
  
  if (translatedMealPlan.meals) {
    translatedMealPlan.meals = translatedMealPlan.meals.map((meal: any) => ({
      ...meal,
      name: translateRecipeName(meal.name)
    }));
  }
  
  return translatedMealPlan;
}

// Translate shopping list items
export function translateShoppingList(shoppingList: any, language: 'en' | 'nl'): any {
  if (language === 'en') {
    return shoppingList;
  }
  
  const translatedList = JSON.parse(JSON.stringify(shoppingList));
  
  if (translatedList.items) {
    translatedList.items = translatedList.items.map((item: any) => ({
      ...item,
      ingredient: translateIngredient(item.ingredient)
    }));
  }
  
  return translatedList;
}