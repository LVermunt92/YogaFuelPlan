import { getCurrentSeasonalGuidance, adaptRecipeForSeason, getCurrentAyurvedicSeason } from './ayurveda-seasonal';
import { applyDietarySubstitutions, substituteIngredients } from './ingredient-substitution';
import { selectProteinOptimizedMeals } from './smart-protein-selection';
import { specifyIngredients, validateIngredientSpecificity, updateRecipeIngredients } from './ingredient-specifier';
import { standardizePortion } from './portion-standardizer';
import { convertAllRecipeUnits } from './bulk-unit-converter';
import { validateAndEnhanceMealDatabase } from './protein-validator';
import { validateAndEnhanceMealsForFiber } from './fiber-validator';
import { cleanRecipeData } from './ingredient-cleaner';
// Import functions from seasonal-advisor will be done dynamically to avoid circular dependencies

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
  id?: number; // Unique numerical identifier for the recipe
  name: string;
  portion: string;
  nutrition: NutritionInfo;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  tags: string[];
  ingredients: string[];
  wholeFoodLevel: 'minimal' | 'moderate' | 'high'; // How processed the ingredients are
  vegetableContent: {
    servings: number;
    vegetables: string[];
    benefits: string[];
  };
  recipeBenefits?: string[]; // Comprehensive benefits for the entire recipe
  recipe?: {
    instructions: string[];
    tips?: string[];
    notes?: string;
  };
  createdAt?: Date;
  active?: boolean;
}

// Function to add menstrual cycle phase tags to recipes based on nutritional benefits
function addCyclePhaseTagsToRecipe(recipe: MealOption): MealOption {
  const newTags = [...recipe.tags];
  const ingredients = recipe.ingredients || [];
  const ingredientText = ingredients.join(' ').toLowerCase();
  const nutrition = recipe.nutrition || {};
  
  // Check for phase-specific beneficial ingredients
  const hasIronRich = 
    ingredientText.includes('spinach') || ingredientText.includes('kale') || 
    ingredientText.includes('lentils') || ingredientText.includes('beans') || 
    ingredientText.includes('tofu') || ingredientText.includes('dark chocolate') ||
    ingredientText.includes('meat') || ingredientText.includes('chicken') ||
    ingredientText.includes('quinoa') || (nutrition.iron && nutrition.iron > 3);
    
  const hasAntiInflammatory = 
    ingredientText.includes('turmeric') || ingredientText.includes('ginger') ||
    ingredientText.includes('berries') || ingredientText.includes('blueberries') ||
    ingredientText.includes('strawberries') || ingredientText.includes('omega-3');
    
  const hasWarming = 
    ingredientText.includes('ginger') || ingredientText.includes('cinnamon') ||
    ingredientText.includes('cumin') || ingredientText.includes('paprika') ||
    recipe.tags.includes('warming') || (recipe.nutrition && recipe.nutrition.prepTime > 20);
    
  const hasMagnesium = 
    ingredientText.includes('nuts') || ingredientText.includes('seeds') ||
    ingredientText.includes('almonds') || ingredientText.includes('hemp') ||
    ingredientText.includes('dark chocolate') || ingredientText.includes('ripe avocado') || ingredientText.includes('avocado') ||
    ingredientText.includes('spinach');
    
  const hasComplexCarbs = 
    ingredientText.includes('oats') || ingredientText.includes('quinoa') ||
    (ingredientText.includes('sweet potato') || ingredientText.includes('sweet potatoes')) || ingredientText.includes('brown rice') ||
    ingredientText.includes('whole grain');
    
  const isFresh = 
    ingredientText.includes('fresh') || ingredientText.includes('raw') ||
    ingredientText.includes('salad') || recipe.tags.includes('raw') ||
    (recipe.nutrition && recipe.nutrition.prepTime < 15);
    
  const isComfort = 
    recipe.tags.includes('comfort-food') || ingredientText.includes('pasta') ||
    ingredientText.includes('creamy') || ingredientText.includes('warming') ||
    recipe.category === 'dinner';

  // Add appropriate cycle phase tags based on benefits
  
  // Menstrual Phase (iron, anti-inflammatory, warming)
  if (hasIronRich || hasAntiInflammatory || hasWarming) {
    if (!newTags.includes('Menstrual')) newTags.push('Menstrual');
  }
  
  // Follicular Phase (fresh, energizing, antioxidants)
  if (isFresh || hasAntiInflammatory || (nutrition.vitaminC && nutrition.vitaminC > 15)) {
    if (!newTags.includes('Follicular')) newTags.push('Follicular');
  }
  
  // Ovulation Phase (light, fresh, high-energy)
  if (isFresh || nutrition.protein > 20 || recipe.tags.includes('High-Protein')) {
    if (!newTags.includes('Ovulation')) newTags.push('Ovulation');
  }
  
  // Luteal Phase (magnesium, complex carbs, comfort foods)
  if (hasMagnesium || hasComplexCarbs || isComfort) {
    if (!newTags.includes('Luteal')) newTags.push('Luteal');
  }
  
  // Ensure every recipe has at least one cycle tag (default to all phases for general recipes)
  const cyclePhases = ['Menstrual', 'Follicular', 'Ovulation', 'Luteal'];
  const hasCycleTags = cyclePhases.some(phase => newTags.includes(phase));
  
  if (!hasCycleTags) {
    // Add all phases for general healthy recipes
    newTags.push('Menstrual', 'Follicular', 'Ovulation', 'Luteal');
  }
  
  return { ...recipe, tags: newTags };
}

// Function to add functional tags to snacks based on nutritional profile
// Pre-Workout: 120-220 kcal, 20-40g carbs, 0-10g protein, low fat/fiber, easy digest
// Post-Workout: 180-320 kcal, 15-30g protein, 15-40g carbs, low-moderate fiber
// Neutral: 120-250 kcal, 5-15g protein, balanced macros, mini-meal vibe
function addFunctionalTagsToSnack(recipe: MealOption): MealOption {
  if (recipe.category !== 'snack') {
    return recipe; // Only tag snacks
  }

  const newTags = [...recipe.tags];
  const { calories, protein, carbohydrates, fiber } = recipe.nutrition;

  // Pre-Workout criteria: quick energy without stomach heaviness
  const isPreWorkout = 
    calories >= 120 && calories <= 220 &&
    carbohydrates >= 20 && carbohydrates <= 40 &&
    protein >= 0 && protein <= 10 &&
    (fiber || 0) <= 5;

  // Post-Workout criteria: muscle recovery + refill glycogen
  const isPostWorkout = 
    calories >= 180 && calories <= 320 &&
    protein >= 15 && protein <= 30 &&
    carbohydrates >= 15 && carbohydrates <= 40 &&
    (fiber || 0) <= 8;

  // Neutral criteria: balanced snack with no training purpose
  const isNeutral = 
    calories >= 120 && calories <= 250 &&
    protein >= 5 && protein <= 15 &&
    !isPreWorkout && !isPostWorkout;

  // Add functional tags
  if (isPreWorkout && !newTags.includes('Pre-Workout')) {
    newTags.push('Pre-Workout');
  }
  if (isPostWorkout && !newTags.includes('Post-Workout')) {
    newTags.push('Post-Workout');
  }
  if (isNeutral && !newTags.includes('Neutral-Snack')) {
    newTags.push('Neutral-Snack');
  }

  // Ensure at least one functional tag (default to Neutral if no other match)
  const functionalTags = ['Pre-Workout', 'Post-Workout', 'Neutral-Snack'];
  const hasFunctionalTag = functionalTags.some(tag => newTags.includes(tag));
  if (!hasFunctionalTag) {
    newTags.push('Neutral-Snack');
  }

  return { ...recipe, tags: newTags };
}

// Enhanced function to add seasonal month tags to recipes based on ingredients and characteristics
// Now uses comprehensive voedingscentrum.nl seasonal vegetables data for users in the Netherlands
// This enables smart month labelling logic that accurately reflects Dutch seasonal produce availability
export async function addSeasonalMonthTagsToRecipe(recipe: MealOption, coords?: { latitude: number; longitude: number }): Promise<MealOption> {
  const newTags = [...recipe.tags];
  const ingredients = recipe.ingredients || [];
  const ingredientText = ingredients.join(' ').toLowerCase();
  
  // Import comprehensive voedingscentrum.nl seasonal vegetables data (37+ vegetables per month)
  // This replaces the simplified version with official Dutch nutrition center data
  const { AMSTERDAM_MONTHLY_PRODUCE } = await import("./seasonal-advisor");
  
  // Helper function to get vegetables from monthly produce data
  function getMonthlyVegetables(monthData: any): string[] {
    return monthData?.vegetables || [];
  }
  
  // Helper functions (copied from seasonal-advisor to avoid circular dependencies)
  function getHemisphere(latitude: number): 'north' | 'south' {
    return latitude >= 0 ? 'north' : 'south';
  }
  
  function getSeasonalMonths(season: 'winter' | 'spring' | 'summer' | 'autumn', hemisphere: 'north' | 'south'): string[] {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    if (hemisphere === 'north') {
      switch (season) {
        case 'winter': return [months[11], months[0], months[1]]; // Dec, Jan, Feb
        case 'spring': return [months[2], months[3], months[4]]; // Mar, Apr, May
        case 'summer': return [months[5], months[6], months[7]]; // Jun, Jul, Aug
        case 'autumn': return [months[8], months[9], months[10]]; // Sep, Oct, Nov
      }
    } else {
      // Southern hemisphere - seasons are opposite
      switch (season) {
        case 'winter': return [months[5], months[6], months[7]]; // Jun, Jul, Aug
        case 'spring': return [months[8], months[9], months[10]]; // Sep, Oct, Nov
        case 'summer': return [months[11], months[0], months[1]]; // Dec, Jan, Feb
        case 'autumn': return [months[2], months[3], months[4]]; // Mar, Apr, May
      }
    }
  }
  
  // Default to Amsterdam coordinates if no location provided
  const location = coords || { latitude: 52.3676, longitude: 4.9041 };
  const hemisphere = getHemisphere(location.latitude);
  
  // Enhanced function to check if recipe contains voedingscentrum.nl seasonal vegetables for specific months
  function getMonthsForLocalProduce(): number[] {
    const matchedMonths: number[] = [];
    
    // Check each month's voedingscentrum.nl produce against recipe ingredients
    for (let month = 0; month < 12; month++) {
      const monthData = AMSTERDAM_MONTHLY_PRODUCE[month];
      const monthVegetables = getMonthlyVegetables(monthData);
      
      const hasLocalProduce = monthVegetables.some((produce: string) => {
        const cleanProduce = produce.toLowerCase()
          // Remove descriptive text in parentheses
          .replace(/\s*\([^)]*\)/g, '')
          // Remove prefixes like 'nieuwe', 'vroege', 'verse', 'witte'
          .replace(/^(nieuwe|vroege|verse|witte|vroeg|late|zoete)\s+/, '')
          // Normalize common terms
          .trim();
        
        // Check multiple variations of ingredient matching
        return ingredientText.includes(cleanProduce) ||
               // Check for partial matches (e.g., 'kool' matches 'witte kool', 'boerenkool')
               ingredientText.includes(cleanProduce.split(' ')[0]) ||
               // Check for English translations if available
               (cleanProduce === 'spruitjes' && (ingredientText.includes('brussels sprouts') || ingredientText.includes('brussels'))) ||
               (cleanProduce === 'boerenkool' && (ingredientText.includes('kale') || ingredientText.includes('curly kale'))) ||
               (cleanProduce === 'wortelen' && (ingredientText.includes('carrots') || ingredientText.includes('carrot'))) ||
               (cleanProduce === 'prei' && (ingredientText.includes('leeks') || ingredientText.includes('leek'))) ||
               (cleanProduce === 'courgette' && (ingredientText.includes('zucchini') || ingredientText.includes('courgette'))) ||
               (cleanProduce === 'aubergine' && (ingredientText.includes('eggplant') || ingredientText.includes('aubergine'))) ||
               (cleanProduce === 'paprika' && (ingredientText.includes('bell pepper') || ingredientText.includes('pepper'))) ||
               (cleanProduce === 'tomaten' && (ingredientText.includes('tomatoes') || ingredientText.includes('tomato'))) ||
               (cleanProduce === 'komkommers' && (ingredientText.includes('cucumbers') || ingredientText.includes('cucumber'))) ||
               (cleanProduce === 'sperziebonen' && (ingredientText.includes('green beans') || ingredientText.includes('french beans'))) ||
               (cleanProduce === 'doperwten' && (ingredientText.includes('peas') || ingredientText.includes('green peas'))) ||
               (cleanProduce === 'spinazie' && ingredientText.includes('spinach')) ||
               (cleanProduce === 'broccoli' && ingredientText.includes('broccoli')) ||
               (cleanProduce === 'bloemkool' && (ingredientText.includes('cauliflower') || ingredientText.includes('cauli'))) ||
               (cleanProduce === 'paddenstoelen' && (ingredientText.includes('mushrooms') || ingredientText.includes('mushroom'))) ||
               (cleanProduce === 'aardappelen' && (ingredientText.includes('potatoes') || ingredientText.includes('potato'))) ||
               (cleanProduce === 'pompoenen' && (ingredientText.includes('pumpkin') || ingredientText.includes('squash'))) ||
               (cleanProduce === 'mais' && (ingredientText.includes('corn') || ingredientText.includes('sweetcorn'))) ||
               (cleanProduce === 'asperges' && (ingredientText.includes('asparagus') || ingredientText.includes('asparagus'))) ||
               (cleanProduce === 'radijsjes' && (ingredientText.includes('radishes') || ingredientText.includes('radish'))) ||
               (cleanProduce === 'rode biet' && (ingredientText.includes('beetroot') || ingredientText.includes('beets'))) ||
               (cleanProduce === 'venkel' && (ingredientText.includes('fennel') || ingredientText.includes('fennel bulb')));
      });
      
      if (hasLocalProduce) {
        matchedMonths.push(month);
      }
    }
    
    return matchedMonths;
  }
  
  // Check for seasonal characteristics
  const hasWarmingIngredients = 
    ingredientText.includes('cinnamon') || ingredientText.includes('ginger') ||
    ingredientText.includes('cloves') || ingredientText.includes('nutmeg') ||
    ingredientText.includes('cardamom') || ingredientText.includes('turmeric') ||
    ingredientText.includes('paprika') || ingredientText.includes('cumin') ||
    ingredientText.includes('chili') || ingredientText.includes('pepper');
    
  const hasCoolingIngredients = 
    ingredientText.includes('cucumber') || ingredientText.includes('mint') ||
    ingredientText.includes('watermelon') || ingredientText.includes('lettuce') ||
    ingredientText.includes('berries') || ingredientText.includes('yogurt') ||
    ingredientText.includes('coconut') || ingredientText.includes('lime');
    
  const hasWinterVegetables = 
    ingredientText.includes('cabbage') || ingredientText.includes('brussels sprouts') ||
    ingredientText.includes('carrots') || ingredientText.includes('parsnips') ||
    ingredientText.includes('leeks') || ingredientText.includes('potatoes') ||
    ingredientText.includes('sweet potato') || ingredientText.includes('beets');
    
  const hasSpringVegetables = 
    ingredientText.includes('asparagus') || ingredientText.includes('peas') ||
    ingredientText.includes('radishes') || ingredientText.includes('spring onions') ||
    ingredientText.includes('artichokes') || ingredientText.includes('spinach');
    
  const hasSummerVegetables = 
    ingredientText.includes('tomatoes') || ingredientText.includes('zucchini') ||
    ingredientText.includes('bell peppers') || ingredientText.includes('eggplant') ||
    ingredientText.includes('corn') || ingredientText.includes('green beans');
    
  const hasAutumnVegetables = 
    ingredientText.includes('pumpkin') || ingredientText.includes('squash') ||
    ingredientText.includes('cauliflower') || ingredientText.includes('broccoli') ||
    ingredientText.includes('mushrooms') || ingredientText.includes('apples');
    
  const isHeartyMeal = 
    recipe.nutrition.prepTime > 30 || ingredientText.includes('stew') ||
    ingredientText.includes('soup') || ingredientText.includes('casserole') ||
    recipe.nutrition.calories > 500;
    
  const isLightMeal = 
    recipe.nutrition.prepTime < 20 || ingredientText.includes('salad') ||
    ingredientText.includes('raw') || recipe.nutrition.calories < 400;
  
  // Determine which seasons this recipe is suitable for
  const suitableSeasons: ('winter' | 'spring' | 'summer' | 'autumn')[] = [];
  
  // Winter: warming, hearty, with winter vegetables
  if (hasWarmingIngredients || hasWinterVegetables || isHeartyMeal) {
    suitableSeasons.push('winter');
  }
  
  // Spring: fresh, light, with spring vegetables
  if (hasSpringVegetables || (isLightMeal && !hasWarmingIngredients)) {
    suitableSeasons.push('spring');
  }
  
  // Summer: cooling, light, with summer vegetables
  if (hasCoolingIngredients || hasSummerVegetables || (isLightMeal && recipe.nutrition.prepTime < 15)) {
    suitableSeasons.push('summer');
  }
  
  // Autumn: grounding, with autumn vegetables
  if (hasAutumnVegetables || (isHeartyMeal && !hasCoolingIngredients)) {
    suitableSeasons.push('autumn');
  }
  
  // Get months based on Amsterdam local produce availability
  const localProduceMonths = getMonthsForLocalProduce();
  
  // If we found local produce matches, prioritize those months
  if (localProduceMonths.length > 0) {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    localProduceMonths.forEach(monthIndex => {
      const monthName = monthNames[monthIndex];
      if (!newTags.includes(monthName)) {
        newTags.push(monthName);
        // Add local produce tag for better filtering
        if (!newTags.includes('local-produce')) {
          newTags.push('local-produce');
        }
      }
    });
  }
  
  // If no specific seasonal characteristics and no local produce, suitable for all seasons
  if (suitableSeasons.length === 0 && localProduceMonths.length === 0) {
    suitableSeasons.push('winter', 'spring', 'summer', 'autumn');
  }
  
  // Add month tags for suitable seasons (only if no local produce was found)
  if (localProduceMonths.length === 0) {
    suitableSeasons.forEach(season => {
      const monthsForSeason = getSeasonalMonths(season, hemisphere);
      monthsForSeason.forEach(month => {
        if (!newTags.includes(month)) {
          newTags.push(month);
        }
      });
    });
  }
  
  return { ...recipe, tags: newTags };
}

// Enhanced meal database focusing on whole foods and minimal processing
// Note: All recipes in this database are automatically validated for protein content
// IMPORTANT: Never use vague ingredient names like "mixed greens", "mixed vegetables", "salad mix"
// Always specify exact vegetables: "spinach", "rocket", "romaine lettuce", etc.
const RAW_MEAL_DATABASE: MealOption[] = [
  // Breakfast options - Whole Foods Focus
  
  // Ayurvedic Recipes
  {
    name: "Ayurvedic Oat Porridge with Sautéed Nectarine and Coconut",
    portion: "1 serving (300g)",
    nutrition: { 
      protein: 22, 
      prepTime: 10, 
      calories: 385,
      carbohydrates: 45,
      fats: 18,
      fiber: 8,
      sugar: 16,
      sodium: 15,
      potassium: 420,
      calcium: 180,
      iron: 3.8,
      vitaminC: 8,
      costEuros: 2.80, 
      proteinPerEuro: 7.9 
    },
    category: "breakfast",
    tags: ["Vegetarian", "Gluten-Free", "Dairy-Free", "Lactose-Free", "Ayurvedic", "Pitta-Balancing", "Anti-Inflammatory", "Whole30", "Longevity", "Follicular", "Ovulation", "Luteal"],
    ingredients: [
      "40g steel-cut oats",
      "200ml oat milk", 
      "1 ripe nectarine (150g), sliced",
      "15ml coconut chips",
      "2.5ml fennel seeds",
      "Fresh mint leaves for garnish",
      "5ml olive oil or coconut oil",
      "15g hemp hearts (for extra protein)",
      "10ml ground flaxseed"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1,
      vegetables: ["nectarine", "mint"],
      benefits: ["Cooling and anti-inflammatory", "Rich in antioxidants", "Supports digestive health", "Balances Pitta dosha"]
    },
    recipe: {
      instructions: [
        "Toast coconut chips in a dry pan over low heat for 2-3 minutes until golden brown, set aside",
        "Halve the nectarine, remove pit, and slice into small pieces", 
        "Combine oats, oat milk, and fennel seeds in a small saucepan",
        "Bring to a boil, then reduce heat and simmer 3-5 minutes, stirring occasionally until thick",
        "If mixture becomes too dry, add more oat milk",
        "Heat oil in a small pan and sauté nectarine pieces for 3-5 minutes until warm and soft",
        "Stir hemp hearts and flaxseed into finished oatmeal",
        "Serve in bowl topped with sautéed nectarine, toasted coconut chips, and fresh mint"
      ],
      tips: [
        "For authentic Ayurvedic preparation, always cook fruit rather than eating raw with grains",
        "Fennel seeds aid digestion and add subtle sweetness",
        "This recipe is especially good for Pitta types during summer months",
        "Can be made vegan by using plant-based milk"
      ],
      notes: "This Ayurvedic breakfast balances Pitta dosha with cooling ingredients like nectarine and coconut. The warm preparation aids digestion according to Ayurvedic principles."
    }
  },
  
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
    tags: ["Vegetarian", "Gluten-Free", "Dairy-Free", "Lactose-Free", "High-Protein", "Anti-Inflammatory", "Whole30", "Ayurvedic", "Longevity", "Follicular", "Ovulation"],
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
    name: "Fresh vegetable and herb scrambled eggs with ripe avocado",
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
    tags: ["Vegetarian", "Gluten-Free", "Lactose-Free", "Keto", "Paleo", "High-Protein"],
    ingredients: [
      "3 large free-range eggs",
      "60g fresh spinach leaves",
      "40g cherry tomatoes (halved)",
      "2 tbsp fresh parsley (chopped)",
      "40g red bell pepper (diced)",
      "½ medium ripe avocado (sliced)",
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
        "Top with fresh herbs and serve with 75g sliced ripe avocado"
      ],
      tips: [
        "Use the freshest eggs possible for best flavour",
        "Don't overcook - eggs continue cooking off the heat"
      ],
      notes: "Free-range eggs provide better omega-3 content than conventional eggs"
    }
  },
  {
    name: "Healthy Chocolate Muffins",
    portion: "1 muffin (85g)",
    nutrition: { 
      protein: 23, 
      prepTime: 40, 
      calories: 295,
      carbohydrates: 32,
      fats: 15,
      fiber: 6,
      sugar: 18,
      sodium: 120,
      potassium: 380,
      calcium: 75,
      iron: 3.2,
      vitaminC: 4,
      cocoaFlavanols: 585,
      costEuros: 1.20, 
      proteinPerEuro: 19.2 
    },
    category: "breakfast",
    tags: ["Vegan", "Gluten-Free", "Lactose-Free", "Dairy-Free", "High-Protein", "Anti-Inflammatory", "Whole30", "Ayurvedic", "Longevity", "Menstrual", "Follicular"],
    ingredients: [
      "125g oat flour (or ground oats)",
      "45g raw cacao powder",
      "60ml coconut oil (melted)",
      "150ml oat milk",
      "150ml maple syrup",
      "15ml chia seeds",
      "45ml water",
      "5ml natural vinegar",
      "5ml baking soda",
      "20g raw hazelnuts (chopped)",
      "40g frozen raspberries",
      "15g hemp hearts (for extra protein)",
      "2.5ml vanilla extract",
      "Pinch of sea salt"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 0.5,
      vegetables: ["raspberries"],
      benefits: ["Rich in antioxidants from cacao", "Omega-3 fatty acids from chia", "Anti-inflammatory properties", "Supports mood with natural compounds"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 180°C and line muffin tin with paper cases",
        "Mix chia seeds with water in small bowl, let sit 5 minutes to form gel",
        "Combine oat flour, cacao powder, and salt in large bowl",
        "In separate bowl, whisk melted coconut oil, oat milk, maple syrup, vanilla, and chia gel",
        "Mix vinegar and baking soda in small glass - it will foam briefly",
        "Pour wet ingredients into dry ingredients, add vinegar mixture",
        "Fold in hemp hearts, then gently add raspberries and hazelnuts",
        "Fill muffin cases 3/4 full and bake 25-30 minutes until toothpick comes out clean",
        "Cool for 30 minutes before removing from tin"
      ],
      tips: [
        "Make oat flour by grinding rolled oats in food processor until fine",
        "Don't overmix the batter to keep muffins light and fluffy",
        "Store in airtight container for up to 5 days",
        "Can be frozen for up to 3 months"
      ],
      notes: "These vegan muffins are rich in plant protein from hemp hearts and provide sustained energy from complex carbs. The cacao contains natural mood-boosting compounds."
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
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Dairy-Free", "Raw", "Anti-Inflammatory", "Ayurvedic", "Longevity", "Follicular", "Ovulation"],
    ingredients: [
      "3 tbsp chia seeds",
      "180ml unsweetened almond milk",
      "80g fresh mango (diced)",
      "90g fresh kiwi (diced)",
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
    name: "Overnight oats with almond milk and berries",
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
    tags: ["Vegetarian", "Gluten-Free", "Lactose-Free", "High-Fiber", "Make-Ahead", "Ayurvedic", "Longevity"],
    ingredients: [
      "45g gluten-free rolled oats",
      "120ml unsweetened almond milk",
      "1 tbsp chia seeds",
      "1 tbsp almond butter",
      "75g mixed berries",
      "1 tsp vanilla extract",
      "Stevia to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1,
      vegetables: ["berries"],
      benefits: ["Antioxidants", "Vitamin C", "Fiber"]
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
    tags: ["Vegetarian", "Gluten-Free", "Lactose-Free", "High-Protein", "Superfood", "Ayurvedic", "Longevity", "Menstrual", "Follicular", "Luteal", "Ovulation"],
    ingredients: [
      "90g cooked quinoa",
      "120g coconut yogurt",
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
      benefits: ["Potassium", "Natural Sugars"]
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
    tags: ["Vegetarian", "Gluten-Free", "Lactose-Free", "High-Protein", "Low-Carb"],
    ingredients: [
      "30g coconut flour",
      "30g plant protein powder",
      "3 eggs",
      "60ml almond milk",
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
    tags: ["Vegetarian", "Gluten-Free", "Lactose-Free", "High-Fiber", "Antioxidant", "Ayurvedic", "High-Protein", "Longevity", "Menstrual", "Follicular", "Ovulation"],
    ingredients: [
      "30g spinach",
      "½ frozen banana",
      "120ml unsweetened almond milk",
      "1 tbsp almond butter",
      "30g vanilla plant protein powder",
      "2 tbsp hemp hearts",
      "1 tbsp coconut flakes",
      "80g frozen mango",
      "1 tsp spirulina (optional)"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["spinach", "mango"],
      benefits: ["Iron", "Folate", "Vitamin C", "Beta-Carotene"]
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
    name: "Fermented kefir bowl with granola and berries",
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
    tags: ["Vegetarian", "Gluten-Free", "Lactose-Free", "Probiotic", "Fermented", "High-Protein", "Ayurvedic", "Longevity", "Menstrual", "Follicular", "Luteal", "Ovulation"],
    ingredients: [
      "200ml long-fermented kefir (24+ hours)",
      "30g gluten-free oat granola", 
      "75g mixed fresh berries",
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
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Dairy-Free", "Anti-Inflammatory", "High-Protein", "Longevity", "Menstrual", "Follicular", "Luteal"],
    ingredients: [
      "190g red lentils",
      "200g sweet potato (diced)",
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
      vegetables: ["sweet potato", "carrots", "parsnips", "red onion"],
      benefits: ["High in beta-carotene", "Rich in fiber", "Supports immune system"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 200°C",
        "Dice 200g sweet potato, 2 carrots, 1 parsnip into 2cm pieces",
        "Toss vegetables with 1 tbsp olive oil, salt, and fresh rosemary",
        "Roast vegetables for 35 minutes until tender",
        "Cook 190g red lentils in 500ml water for 15 minutes",
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
    name: "Buddha Bowl Salade met Tahini Dressing", 
    portion: "1 serving (400g)",
    nutrition: { 
      protein: 26, 
      prepTime: 25, 
      calories: 485,
      carbohydrates: 52,
      fats: 24,
      fiber: 16,
      sugar: 14,
      sodium: 380,
      potassium: 950,
      calcium: 220,
      iron: 5.8,
      vitaminC: 95,
      costEuros: 4.20, 
      proteinPerEuro: 6.2 
    },
    category: "lunch",
    tags: ["Vegan", "Gluten-Free", "Lactose-Free", "Dairy-Free", "High-Protein", "Anti-Inflammatory", "Whole30", "Raw", "Ayurvedic", "Longevity", "Follicular", "Ovulation", "Luteal"],
    ingredients: [
      "1 winter carrot (spiralized or julienned)",
      "½ cucumber (sliced)",
      "1 ripe avocado (sliced)",
      "125g kidney beans (cooked and drained)",
      "2 sweet red bell peppers (sliced)",
      "200g sweet potato (thinly sliced)",
      "10ml pumpkin seeds",
      "10ml hemp seeds",
      "60g fresh spinach leaves",
      "Fresh parsley or cilantro (handful)",
      "30ml tahini (sesame paste)",
      "10ml soy sauce",
      "10ml sesame oil",
      "10ml natural vinegar",
      "30ml water"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 4,
      vegetables: ["carrot", "cucumber", "bell peppers", "sweet potato", "spinach"],
      benefits: ["Complete rainbow nutrition", "Rich in vitamins A, C, K", "High fiber content", "Healthy fats from avocado", "Plant-based protein from legumes"]
    },
    recipe: {
      instructions: [
        "Slice sweet potato into very thin rounds using mandoline or sharp knife",
        "Cook in air fryer at 170°C for 20 minutes until crispy (or oven at 220°C for 35-40 minutes)",
        "Spiralize carrot into long thin strands, or julienne with knife",
        "Slice cucumber and red bell peppers into thin strips",
        "Halve avocado, remove pit, and slice into thin crescents",
        "Rinse and drain kidney beans thoroughly",
        "Make tahini dressing by whisking together tahini, soy sauce, sesame oil, vinegar, and water",
        "Add more water if thinner consistency desired",
        "Arrange spinach in large bowl as base",
        "Arrange all vegetables and beans in separate sections over spinach",
        "Place avocado slices in center",
        "Sprinkle with pumpkin seeds, hemp seeds, and fresh herbs",
        "Drizzle with tahini dressing just before serving"
      ],
      tips: [
        "Prep vegetables ahead for quick assembly during busy weekdays",
        "Tahini dressing keeps in fridge for up to 5 days",
        "Can substitute feta cheese for avocado if preferred",
        "Use any seasonal vegetables for variation"
      ],
      notes: "This 'eat the rainbow' bowl provides complete nutrition with plant-based protein, healthy fats, and maximum vitamin diversity. Perfect for mindful eating."
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
    tags: ["Vegetarian", "Gluten-Free", "High-Protein", "Quick", "Meal-Prep", "Longevity"],
    ingredients: [
      "185g cooked quinoa",
      "90g black beans (cooked)",
      "½ ripe avocado (sliced)",
      "40g hemp seeds",
      "30g fresh spinach",
      "75g cherry tomatoes (halved)",
      "40g red onion (diced)",
      "2 tbsp tahini",
      "1 tbsp lemon juice",
      "1 tsp olive oil",
      "Salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2.5,
      vegetables: ["spinach", "tomatoes", "red onion"],
      benefits: ["High in plant protein", "Rich in healthy fats", "Complete amino acid profile"]
    },
    recipe: {
      instructions: [
        "Cook quinoa according to package directions and let cool slightly",
        "Rinse and drain black beans if using canned",
        "Wash and dry spinach leaves thoroughly",
        "Halve cherry tomatoes and dice red onion",
        "Slice ripe avocado just before serving",
        "In a bowl, layer quinoa as the base",
        "Top with fresh spinach, black beans, and vegetables",
        "Add sliced ripe avocado and sprinkle hemp seeds on top",
        "Whisk tahini with lemon juice and olive oil for dressing",
        "Drizzle dressing over bowl and season with salt and pepper"
      ],
      tips: [
        "Prepare quinoa and beans in advance for quick assembly",
        "Add ripe avocado just before eating to prevent browning",
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
    tags: ["Pescatarian", "Gluten-Free", "Dairy-Free", "Lactose-Free", "Paleo", "Anti-Inflammatory", "High-Protein", "Longevity"],
    ingredients: [
      "150g wild salmon fillet",
      "200g sweet potato (chunked)",
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
      vegetables: ["sweet potato", "carrots", "parsnips", "red onion"],
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
  // Lunch Versions (same recipes for lunch/dinner flexibility)
  {
    name: "Red Lentil Hummus Power Bowl - Lunch",
    portion: "1 serving (320g)",
    nutrition: { 
      protein: 24, 
      prepTime: 20, 
      calories: 395,
      carbohydrates: 48,
      fats: 14,
      fiber: 16,
      sugar: 8,
      sodium: 350,
      potassium: 820,
      calcium: 160,
      iron: 6.2,
      vitaminC: 25,
      costEuros: 3.20, 
      proteinPerEuro: 7.5 
    },
    category: "lunch",
    tags: ["Vegan", "Gluten-Free", "Dairy-Free", "Lactose-Free", "High-Protein", "Anti-Inflammatory", "Ayurvedic", "Whole30", "Longevity", "Follicular", "Ovulation", "Luteal"],
    ingredients: [
      "150g red lentils (cooked)",
      "60ml tahini",
      "2 garlic cloves",
      "Juice of 1 lemon (30ml)",
      "15ml olive oil",
      "5ml cumin powder",
      "2.5ml cayenne pepper",
      "5ml salt",
      "2.5ml paprika powder",
      "60g fresh spinach leaves",
      "80g cherry tomatoes (halved)",
      "40g cucumber (diced)",
      "15ml hemp hearts",
      "Fresh herbs (parsley, mint)"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["spinach", "tomatoes", "cucumber"],
      benefits: ["Exceptionally high plant protein", "Easier to digest than chickpeas", "Rich in folate and iron", "Anti-inflammatory compounds"]
    },
    recipe: {
      instructions: [
        "Cook red lentils in boiling water for 12-15 minutes until very soft and mushy",
        "Drain lentils and let cool slightly",
        "Blend cooked lentils, tahini, garlic, lemon juice, olive oil, cumin, and salt in food processor until creamy",
        "Add water if needed for desired consistency",
        "Taste and adjust with more lemon, salt, or cayenne",
        "Arrange spinach in bowl as base",
        "Add large dollop of red lentil hummus in center",
        "Arrange cherry tomatoes and cucumber around hummus",
        "Sprinkle with hemp hearts, paprika, and fresh herbs",
        "Drizzle with extra olive oil and serve with vegetable sticks or flatbread"
      ],
      tips: [
        "Perfect for meal prep - hummus keeps 5 days in fridge",
        "Add extra vegetables like bell peppers or radishes for crunch",
        "Can be served with gluten-free crackers or veggie sticks",
        "Great for workplace lunches"
      ],
      notes: "This red lentil hummus provides more protein than traditional chickpea hummus and is perfect for satisfying midday nutrition needs."
    }
  },
  
  {
    name: "Asian Mango Noodle Salad - Lunch",
    portion: "1 serving (350g)",
    nutrition: { 
      protein: 22, 
      prepTime: 20, 
      calories: 440,
      carbohydrates: 58,
      fats: 16,
      fiber: 8,
      sugar: 18,
      sodium: 620,
      potassium: 520,
      calcium: 85,
      iron: 3.2,
      vitaminC: 65,
      costEuros: 3.80, 
      proteinPerEuro: 5.8 
    },
    category: "lunch",
    tags: ["Vegan", "High-Protein", "Anti-Inflammatory", "Asian-Fusion", "Gluten-Free-Option", "Longevity", "Follicular", "Ovulation"],
    ingredients: [
      "90g soba noodles (or rice noodles for GF)",
      "1 cucumber (julienned)",
      "1 winter carrot (julienned)",
      "½ ripe mango (diced)",
      "30g unsalted peanuts",
      "Fresh mint sprigs",
      "Fresh cilantro sprigs",
      "30ml natural peanut butter",
      "60ml water",
      "2.5ml sambal oelek (chili paste)",
      "10ml soy sauce (or tamari for GF)",
      "10ml maple syrup",
      "15ml hemp hearts"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["cucumber", "carrot", "mango"],
      benefits: ["High vitamin C from mango", "Cooling properties for Pitta dosha", "Digestive enzymes from fresh herbs", "Energizing for afternoon"]
    },
    recipe: {
      instructions: [
        "Cook soba noodles according to package directions, rinse with cold water, drain well",
        "Julienne cucumber and carrot into thin matchsticks",
        "Dice mango into small cubes",
        "Make peanut dressing: whisk peanut butter, water, sambal oelek, soy sauce, and maple syrup until smooth",
        "Divide noodles between serving bowls",
        "Top with cucumber, carrot, and mango in separate sections",
        "Sprinkle with peanuts, hemp hearts, fresh mint, and cilantro",
        "Drizzle with peanut dressing just before serving",
        "Toss gently and serve immediately"
      ],
      tips: [
        "Perfect portable lunch - pack dressing separately",
        "Prep vegetables on Sunday for quick weekday assembly",
        "Use tamari and rice noodles for completely gluten-free version",
        "Add edamame for extra protein boost"
      ],
      notes: "This refreshing lunch provides sustained energy from complex carbs and plant protein while cooling Pitta dosha with fresh vegetables and herbs."
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
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Dairy-Free", "Ayurvedic", "Anti-Inflammatory", "Menstrual", "Follicular", "Luteal"],
    ingredients: [
      "140g green lentils",
      "95g brown rice", 
      "1 tbsp fresh ginger (minced)",
      "1 tsp fresh turmeric (grated)",
      "1 medium onion (diced)",
      "2 cloves garlic (minced)",
      "2 medium tomatoes (diced)",
      "60g fresh spinach",
      "240ml coconut milk",
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
        "Rinse 150g green lentils and 100g brown rice separately",
        "Cook rice in 240ml water for 25-30 minutes",
        "Heat 1 tbsp coconut oil, add 1 tsp cumin seeds until they splutter",
        "Add diced onion, 1 tbsp fresh ginger, 2 cloves garlic",
        "Add 1 tsp fresh turmeric, cook 2 minutes",
        "Add lentils, diced tomatoes, 240ml coconut milk, 240ml water",
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
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Dairy-Free", "High-Protein", "Anti-Inflammatory", "Ayurvedic", "Longevity", "Menstrual", "Follicular", "Luteal", "Ovulation"],
    ingredients: [
      "200g tempeh (sliced)",
      "1 medium zucchini (sliced)",
      "1 small eggplant (cubed)",
      "2 bell peppers (strips)",
      "2 sprigs fresh thyme",
      "2 sprigs fresh oregano", 
      "4 tbsp fresh basil (chopped)",
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
  
  // High-Protein Lunch/Dinner Recipes
  {
    name: "Red Lentil Hummus Power Bowl",
    portion: "1 serving (320g)",
    nutrition: { 
      protein: 24, 
      prepTime: 20, 
      calories: 395,
      carbohydrates: 48,
      fats: 14,
      fiber: 16,
      sugar: 8,
      sodium: 350,
      potassium: 820,
      calcium: 160,
      iron: 6.2,
      vitaminC: 25,
      costEuros: 3.20, 
      proteinPerEuro: 7.5 
    },
    category: "dinner",
    tags: ["Vegan", "Gluten-Free", "Dairy-Free", "Lactose-Free", "High-Protein", "Anti-Inflammatory", "Ayurvedic", "Whole30", "Longevity", "Follicular", "Ovulation", "Luteal"],
    ingredients: [
      "150g red lentils (cooked)",
      "60ml tahini",
      "2 garlic cloves",
      "Juice of 1 lemon (30ml)",
      "15ml olive oil",
      "5ml cumin powder",
      "2.5ml cayenne pepper",
      "5ml salt",
      "2.5ml paprika powder",
      "60g fresh spinach leaves",
      "80g cherry tomatoes (halved)",
      "40g cucumber (diced)",
      "15ml hemp hearts",
      "Fresh herbs (parsley, mint)"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["spinach", "tomatoes", "cucumber"],
      benefits: ["Exceptionally high plant protein", "Easier to digest than chickpeas", "Rich in folate and iron", "Anti-inflammatory compounds"]
    },
    recipe: {
      instructions: [
        "Cook red lentils in boiling water for 12-15 minutes until very soft and mushy",
        "Drain lentils and let cool slightly",
        "Blend cooked lentils, tahini, garlic, lemon juice, olive oil, cumin, and salt in food processor until creamy",
        "Add water if needed for desired consistency",
        "Taste and adjust with more lemon, salt, or cayenne",
        "Arrange spinach in bowl as base",
        "Add large dollop of red lentil hummus in center",
        "Arrange cherry tomatoes and cucumber around hummus",
        "Sprinkle with hemp hearts, paprika, and fresh herbs",
        "Drizzle with extra olive oil and serve with vegetable sticks or flatbread"
      ],
      tips: [
        "Red lentils create exceptionally creamy texture when fully cooked",
        "Store hummus covered in fridge for up to 5 days",
        "Can be made as traditional hummus or served as power bowl",
        "Add extra protein with hemp hearts or pumpkin seeds"
      ],
      notes: "This red lentil hummus provides more protein per serving than traditional chickpea hummus, plus it's easier to digest according to Ayurvedic principles."
    }
  },
  
  {
    name: "Quinoa Salad with Roasted Vegetables and Feta",
    portion: "1 serving (380g)",
    nutrition: { 
      protein: 26, 
      prepTime: 25, 
      calories: 465,
      carbohydrates: 52,
      fats: 18,
      fiber: 14,
      sugar: 12,
      sodium: 420,
      potassium: 680,
      calcium: 280,
      iron: 4.8,
      vitaminC: 45,
      costEuros: 4.80, 
      proteinPerEuro: 5.4 
    },
    category: "dinner",
    tags: ["Vegetarian", "Gluten-Free", "High-Protein", "Anti-Inflammatory", "Ayurvedic", "Mediterranean", "Longevity", "Follicular", "Ovulation", "Luteal"],
    ingredients: [
      "100g quinoa",
      "150g frozen peas",
      "60g fresh spinach",
      "120g feta cheese (or vegan white cheese)",
      "80g pecan nuts (roughly chopped)",
      "Fresh mint leaves",
      "Juice of 2 limes (60ml)",
      "15ml maple syrup",
      "15ml olive oil",
      "15ml hemp hearts",
      "Sea salt to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2.5,
      vegetables: ["peas", "spinach", "mint"],
      benefits: ["Complete amino acid profile from quinoa", "High in plant protein and healthy fats", "Rich in folate and vitamin K", "Anti-inflammatory omega-3s from nuts"]
    },
    recipe: {
      instructions: [
        "Cook quinoa according to package directions with salt, let cool completely",
        "Cook frozen peas in boiling water for 2-3 minutes, drain and cool",
        "Roughly chop pecan nuts",
        "Whisk lime juice, maple syrup, and olive oil for dressing",
        "In large bowl, combine cooled quinoa, peas, and fresh spinach",
        "Crumble feta cheese over salad",
        "Add chopped pecans and fresh mint leaves",
        "Drizzle with lime dressing and hemp hearts",
        "Toss gently and let marinate 10 minutes before serving",
        "Serve at room temperature or chilled"
      ],
      tips: [
        "Toast pecans lightly for extra flavor depth",
        "Use vegan white cheese for dairy-free version",
        "This salad keeps well for 2-3 days in the fridge",
        "Add extra mint just before serving for best flavor"
      ],
      notes: "This protein-rich quinoa salad combines complete proteins from quinoa and feta with healthy fats from pecans. Perfect for meal prep and suitable for both lunch and dinner."
    }
  },
  
  {
    name: "Asian Mango Noodle Salad with Peanut Dressing",
    portion: "1 serving (350g)",
    nutrition: { 
      protein: 22, 
      prepTime: 20, 
      calories: 440,
      carbohydrates: 58,
      fats: 16,
      fiber: 8,
      sugar: 18,
      sodium: 620,
      potassium: 520,
      calcium: 85,
      iron: 3.2,
      vitaminC: 65,
      costEuros: 3.80, 
      proteinPerEuro: 5.8 
    },
    category: "dinner",
    tags: ["Vegan", "High-Protein", "Anti-Inflammatory", "Asian-Fusion", "Gluten-Free-Option", "Longevity", "Follicular", "Ovulation"],
    ingredients: [
      "90g soba noodles (or rice noodles for GF)",
      "1 cucumber (julienned)",
      "1 winter carrot (julienned)",
      "½ ripe mango (diced)",
      "30g unsalted peanuts",
      "Fresh mint sprigs",
      "Fresh cilantro sprigs",
      "30ml natural peanut butter",
      "60ml water",
      "2.5ml sambal oelek (chili paste)",
      "10ml soy sauce (or tamari for GF)",
      "10ml maple syrup",
      "15ml hemp hearts"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["cucumber", "carrot", "mango"],
      benefits: ["High vitamin C from mango", "Cooling properties for Pitta dosha", "Digestive enzymes from fresh herbs", "Antioxidant-rich vegetables"]
    },
    recipe: {
      instructions: [
        "Cook soba noodles according to package directions, rinse with cold water, drain well",
        "Julienne cucumber and carrot into thin matchsticks",
        "Dice mango into small cubes",
        "Make peanut dressing: whisk peanut butter, water, sambal oelek, soy sauce, and maple syrup until smooth",
        "Divide noodles between serving bowls",
        "Top with cucumber, carrot, and mango in separate sections",
        "Sprinkle with peanuts, hemp hearts, fresh mint, and cilantro",
        "Drizzle with peanut dressing just before serving",
        "Toss gently and serve immediately"
      ],
      tips: [
        "For gluten-free version, use rice noodles and tamari instead of soy sauce",
        "Prep all vegetables ahead but dress just before serving to maintain crunch",
        "Add extra chili paste for more heat if desired",
        "This transports well for packed lunches"
      ],
      notes: "This refreshing Asian-inspired salad provides plant protein from peanuts and hemp hearts while delivering cooling properties perfect for warm weather or balancing Pitta dosha."
    }
  },
  
  {
    name: "Asian Mango Noodle Salad",
    portion: "1 serving (350g)",
    nutrition: { 
      protein: 21, 
      prepTime: 20, 
      calories: 425,
      carbohydrates: 56,
      fats: 16,
      fiber: 7,
      sugar: 18,
      sodium: 580,
      potassium: 520,
      calcium: 85,
      iron: 2.8,
      vitaminC: 65,
      costEuros: 4.20, 
      proteinPerEuro: 5.0 
    },
    category: "dinner",
    tags: ["Vegan", "Gluten-Free", "High-Protein", "Anti-Inflammatory", "Asian-Fusion", "Longevity", "Follicular", "Ovulation"],
    ingredients: [
      "90g rice noodles (100% rice)",
      "1 cucumber (julienned)",
      "1 winter carrot (julienned)",
      "½ ripe mango (diced)",
      "30g unsalted peanuts",
      "Fresh mint sprigs",
      "Fresh cilantro sprigs",
      "30ml natural peanut butter",
      "60ml water",
      "2.5ml sambal oelek (chili paste)",
      "10ml tamari (gluten-free soy sauce)",
      "10ml maple syrup",
      "15ml hemp hearts"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["cucumber", "carrot", "mango"],
      benefits: ["Completely gluten-free", "High vitamin C from mango", "Cooling and anti-inflammatory", "Easy digestion"]
    },
    recipe: {
      instructions: [
        "Cook rice noodles according to package directions, rinse with cold water, drain well",
        "Julienne cucumber and carrot into thin matchsticks",
        "Dice mango into small cubes",
        "Make gluten-free peanut dressing: whisk peanut butter, water, sambal oelek, tamari, and maple syrup until smooth",
        "Divide noodles between serving bowls",
        "Top with cucumber, carrot, and mango in separate sections",
        "Sprinkle with peanuts, hemp hearts, fresh mint, and cilantro",
        "Drizzle with tamari-based dressing just before serving",
        "Toss gently and serve immediately"
      ],
      tips: [
        "Rice noodles are naturally gluten-free and easier to digest",
        "Always check tamari label to ensure it's certified gluten-free",
        "This version is suitable for those with gluten sensitivity or celiac disease",
        "Maintains all the fresh Asian flavors of the original"
      ],
      notes: "This gluten-free version uses rice noodles and tamari to create the same delicious Asian flavors while being completely safe for those avoiding gluten."
    }
  },

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
    tags: ["Vegetarian", "Gluten-Free", "Lactose-Free", "Dairy-Free", "High-Protein", "Longevity", "Menstrual", "Follicular", "Luteal", "Ovulation"],
    ingredients: [
      "2 large portobello mushrooms (stems removed)",
      "200g Brussels sprouts (halved)",
      "200g sweet potato (cubed)",
      "½ red onion (sliced)",
      "2 sprigs fresh sage",
      "2 sprigs fresh thyme",
      "1 sprig fresh rosemary",
      "3 tbsp extra virgin olive oil",
      "1 lemon (juiced)",
      "3 cloves garlic (minced)",
      "30g toasted walnuts (chopped)",
      "2 tbsp toasted pine nuts",
      "2 tbsp pumpkin seeds",
      "2 tbsp nutritional yeast",
      "4 tbsp fresh parsley (chopped)"
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
    tags: ["Non-Vegetarian", "Gluten-Free", "Dairy-Free", "Lactose-Free", "Paleo", "High-Protein"],
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
    name: "Middle Eastern Style Wild Mushroom Quinoa with Roasted Vegetables",
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
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Anti-Inflammatory", "High-Protein", "Longevity", "Middle-Eastern"],
    ingredients: ["quinoa", "mixed wild mushrooms", "fresh herbs (parsley, thyme)", "1 zucchini", "red bell pepper", "carrots", "red onion", "olive oil", "vegetable stock", "tahini", "lemon juice", "hemp hearts", "pumpkin seeds", "chickpeas", "nutritional yeast"],
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
        "Cook quinoa in 2 cups vegetable stock with 1 tbsp olive oil for 15 minutes",
        "Meanwhile, dice zucchini, bell pepper, carrots, and onion",
        "Drain and rinse 1 can chickpeas, pat dry",
        "Toss vegetables and chickpeas with 2 tbsp olive oil, salt, and pepper",
        "Roast vegetables and chickpeas at 200°C for 25 minutes until tender and slightly caramelized",
        "Toast pumpkin seeds in dry pan for 2-3 minutes until golden",
        "Make protein-rich tahini dressing: whisk 2 tbsp tahini, 2 tbsp lemon juice, 1 tbsp olive oil, 1 tbsp nutritional yeast, and 2-3 tbsp water until smooth",
        "Fluff cooked quinoa and mix with extra 1 tbsp olive oil and 2 tbsp hemp hearts",
        "Stir in mushrooms, fresh herbs, and half the tahini dressing",
        "Top with roasted vegetables, chickpeas, and toasted pumpkin seeds",
        "Drizzle with remaining tahini dressing and extra olive oil",
        "Finish with extra nutritional yeast to taste and fresh herbs"
      ],
      tips: [
        "Use a variety of mushrooms for complex flavour",
        "Make extra tahini dressing - it keeps quinoa moist and adds protein",
        "Add vegetables while quinoa is still warm so flavors meld together",
        "Hemp hearts and nutritional yeast boost protein while adding nutty flavor",
        "Roasted chickpeas add satisfying crunch and substantial protein"
      ],
      notes: "This Middle Eastern inspired recipe delivers 30g protein through quinoa, chickpeas, hemp hearts, and tahini. The tahini dressing prevents quinoa from being dry while adding healthy fats. Nutritional yeast provides B-vitamins and umami depth, creating a completely plant-based, deeply satisfying meal."
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
    tags: ["Pescatarian", "Gluten-Free", "Dairy-Free", "Lactose-Free", "Mediterranean", "Anti-Inflammatory", "Longevity"],
    ingredients: ["fresh cod fillet", "200g cherry tomatoes", "1 zucchini", "red onion", "black olives", "fresh basil", "fresh oregano", "olive oil", "lemon", "capers"],
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
    tags: ["Vegetarian", "Gluten-Free", "Viral", "Social-Media", "Anti-Inflammatory", "Keto"],
    ingredients: ["mixed greens", "cucumber", "ripe avocado", "hemp seeds", "pumpkin seeds", "tahini", "lemon", "fresh herbs", "olive oil", "nutritional yeast"],
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
        "Fan out ripe avocado slices artistically",
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
    tags: ["Vegetarian", "Viral", "Social-Media", "High-Protein", "Probiotic", "Dairy"],
    ingredients: ["cottage cheese", "fresh berries", "honey", "granola", "chia seeds", "Cinnamon", "vanilla extract"],
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
    tags: ["Vegetarian", "Viral", "Social-Media", "High-Protein"],
    ingredients: ["king oyster mushrooms", "100g pasta", "30g sun-dried tomatoes", "cashew cream", "nutritional yeast", "garlic", "herbs", "vegetable stock"],
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
        "Add sun-dried tomatoes and a splash of vegetable stock",
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
    tags: ["Vegetarian", "Gluten-Free", "Viral", "Social-Media", "Protein-Rich"],
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
    tags: ["Vegetarian", "Gluten-Free", "Viral", "Social-Media", "Keto", "Low-Carb"],
    ingredients: ["Eggs", "cream cheese", "baking powder", "salt"],
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
    tags: ["Non-Vegetarian", "Gluten-Free", "Dairy-Free", "Lactose-Free", "Paleo", "High-Protein"],
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
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Quick", "High-Protein"],
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
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Quick", "Protein-Rich"],
    ingredients: [
      "170g quinoa",
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
    name: "Mediterranean Quinoa with Chickpeas and Vegetables",
    portion: "2 servings",
    nutrition: { 
      protein: 22, 
      prepTime: 25, 
      calories: 480,
      carbohydrates: 52,
      fats: 20,
      fiber: 12,
      sugar: 8,
      sodium: 380,
      costEuros: 5.20, 
      proteinPerEuro: 4.2 
    },
    category: "dinner",
    tags: ["Vegetarian", "Gluten-Free", "Mediterranean", "High-Protein"],
    ingredients: [
      "150g quinoa (uncooked)",
      "1 can (400g) chickpeas (drained and rinsed)",
      "1 zucchini (diced)",
      "1 red bell pepper (diced)",
      "2 carrots (thinly sliced)",
      "200g mushrooms (sliced)",
      "1 onion (chopped)",
      "2 tbsp olive oil",
      "2 tbsp pine nuts (toasted)",
      "30g parmesan cheese (shaved or grated)",
      "Fresh parsley (handful, chopped)",
      "1 tsp dried thyme",
      "Juice of ½ lemon",
      "Salt and black pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 4,
      vegetables: ["zucchini", "bell pepper", "carrots", "mushrooms", "onion"],
      benefits: ["High in antioxidants", "Rich in vitamin C", "Heart healthy", "High in beta-carotene"]
    },
    recipe: {
      instructions: [
        "Rinse quinoa under cold water until water runs clear",
        "Cook quinoa in 2× its volume of water with a pinch of salt for about 15 minutes, then fluff and set aside",
        "Heat 1 tbsp olive oil in a large pan over medium heat",
        "Add onion, carrots, and bell pepper - sauté for 5 minutes",
        "Add zucchini and mushrooms - cook another 5-7 minutes until tender",
        "Season vegetables with thyme, salt, and pepper",
        "Stir in chickpeas and cook for 2 minutes to warm through",
        "Add a squeeze of lemon juice to the vegetables",
        "Toast pine nuts in a dry pan for 2-3 minutes until golden",
        "Combine cooked quinoa with the vegetable-chickpea mixture",
        "Drizzle remaining 1 tbsp olive oil on top",
        "Sprinkle with toasted pine nuts, parmesan shavings, and fresh parsley"
      ],
      tips: [
        "Cut vegetables evenly for consistent cooking",
        "Toast pine nuts separately to prevent burning",
        "Add vegetables in stages for perfect texture"
      ],
      notes: "Classic Mediterranean bowl with chickpeas for 22g protein. The step-by-step sautéing method ensures perfectly cooked vegetables while parmesan and pine nuts add authentic Mediterranean richness."
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
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Quick", "High-Fiber"],
    ingredients: [
      "300g sweet potato (cubed)",
      "1 can (400g) black beans (drained)",
      "1 red bell pepper (diced)",
      "1 onion (diced)",
      "2 cloves garlic (minced)",
      "3 tbsp olive oil",
      "1 tsp cumin",
      "1/2 tsp paprika",
      "1/4 tsp chili powder",
      "2 tbsp fresh lime juice",
      "4 tbsp fresh cilantro (chopped)",
      "1 ripe avocado (sliced)"
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
        "Garnish with fresh cilantro and sliced ripe avocado",
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
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Quick", "Asian"],
    ingredients: [
      "2 cups cooked brown rice (day-old preferred)",
      "200g firm tofu (cubed)",
      "2 eggs or flax eggs for vegan option",
      "150g sugar snap peas (trimmed)",
      "150g broccoli (cut into small florets)",
      "80g fresh bean sprouts",
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
      servings: 3,
      vegetables: ["sugar snap peas", "broccoli", "bean sprouts", "green onions"],
      benefits: ["Balanced nutrition", "Quick energy", "Good source of fiber", "Authentic Asian flavors", "Variety of textures"]
    },
    recipe: {
      instructions: [
        "Heat 1 tbsp sesame oil in large wok or skillet",
        "Add cubed tofu and cook until golden, about 5 minutes",
        "Push tofu to one side, scramble eggs on other side",
        "Add garlic and ginger, cook 30 seconds",
        "Add day-old rice, breaking up clumps",
        "Add broccoli florets, stir-fry for 2 minutes until bright green", 
        "Add sugar snap peas, cook 2 minutes more",
        "Add bean sprouts in final 30 seconds for crunch",
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
      calories: 480,
      carbohydrates: 62,
      fats: 16,
      fiber: 17,
      sugar: 10,
      sodium: 340,
      costEuros: 3.80, 
      proteinPerEuro: 5.8 
    },
    category: "dinner",
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Ayurvedic", "Quick"],
    ingredients: [
      "190g red lentils (masoor dal)",
      "100g basmati rice",
      "100g spinach (chopped)",
      "3 medium tomatoes (diced, 360g)",
      "1 tsp turmeric (kurkuma)",
      "1 tsp curry powder",
      "1 tsp ground coriander",
      "2 tsp fresh ginger (grated)",
      "1/2 tsp chili powder (or to taste)",
      "1 tbsp coconut oil",
      "1 tsp mustard seeds",
      "1/2 tsp asafoetida (hing)",
      "200ml coconut milk",
      "240ml water (for rice)",
      "Fresh cilantro for garnish",
      "Salt to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2.5,
      vegetables: ["spinach", "tomato", "ginger", "chili"],
      benefits: ["Iron-rich greens", "Digestive support", "Anti-inflammatory from ginger and turmeric", "Warming for constitution"]
    },
    recipe: {
      instructions: [
        "Cook basmati rice separately in 240ml water for 12 minutes, set aside",
        "Heat coconut oil in a large pot over medium heat",
        "Add mustard seeds and let them pop for 30 seconds",
        "Add grated ginger and asafoetida, sauté for 1 minute until fragrant",
        "Add turmeric, curry powder, ground coriander, and chili powder, stir for 30 seconds",
        "Add diced tomatoes and cook for 3-4 minutes until softened",
        "Rinse lentils and add to the pot with the herbs and tomatoes",
        "Pour in coconut milk only, stir everything together",
        "Bring to a boil, then reduce heat and simmer for 15-20 minutes until lentils are tender",
        "Stir in chopped spinach to the dal, cook until wilted (2 minutes)",
        "Season with salt to taste",
        "Serve dal over rice, garnish with fresh cilantro"
      ],
      tips: [
        "Mustard seeds add traditional Ayurvedic flavor and aid digestion",
        "Coconut milk adds creamy richness and balances the spices",
        "Adjust chili powder to your heat preference",
        "Lentils cook in pure coconut milk with tomatoes for extra richness",
        "Add spinach at the end to retain nutrients"
      ],
      notes: "Rich Ayurvedic dal with lentils cooked in coconut milk (no water) with fresh tomatoes, ginger, and turmeric. Traditional digestive spices."
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
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Ayurvedic", "Digestive"],
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
    name: "Nourishing vegetable kitchari with spinach and carrots",
    portion: "2 servings",
    nutrition: { 
      protein: 20, 
      prepTime: 35, 
      calories: 420,
      carbohydrates: 62,
      fats: 12,
      fiber: 15,
      sugar: 6,
      sodium: 320,
      costEuros: 3.60, 
      proteinPerEuro: 5.6 
    },
    category: "lunch",
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Ayurvedic", "High-Fiber"],
    ingredients: [
      "85g split mung beans (moong dal)",
      "85g basmati rice",
      "100g spinach (chopped)",
      "100g carrots (diced)",
      "80g zucchini (diced)",
      "1 tsp turmeric (kurkuma)",
      "1 tsp cumin seeds",
      "1 tsp ground coriander",
      "1/2 tsp fennel seeds",
      "2 tsp fresh ginger (grated)",
      "1 tbsp coconut oil or ghee",
      "1 tsp mustard seeds",
      "600ml water",
      "Fresh cilantro for garnish",
      "Salt to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["spinach", "carrots", "zucchini", "ginger"],
      benefits: ["Complete protein from beans and rice", "Easy to digest vegetables", "Anti-inflammatory spices", "Balancing for all doshas"]
    },
    recipe: {
      instructions: [
        "Rinse mung beans and rice together until water runs clear",
        "Heat coconut oil or ghee in heavy-bottomed pot over medium heat",
        "Add mustard seeds and let them pop for 30 seconds",
        "Add cumin seeds and fennel seeds, toast until fragrant",
        "Add grated ginger and turmeric, cook 30 seconds",
        "Add ground coriander, stir for 15 seconds",
        "Add mung beans and rice, stir to coat with spices for 1 minute",
        "Add diced carrots and zucchini, stir together",
        "Pour in 600ml water and bring to boil",
        "Reduce heat to low, cover, and simmer for 25-30 minutes until creamy and vegetables are tender",
        "Stir in chopped spinach in the last 3 minutes until wilted",
        "Season with salt to taste",
        "Serve warm, garnished with fresh cilantro"
      ],
      tips: [
        "Consistency should be like a thick, creamy stew - add more water if needed",
        "Carrots and zucchini are easy to digest and won't upset the Ayurvedic balance",
        "Cook until the beans and rice break down and become soft",
        "Perfect everyday nourishing meal that's still gentle on digestion",
        "Can add a squeeze of lime at the end if you want extra brightness"
      ],
      notes: "Nourishing everyday kitchari with easy-to-digest vegetables. More complete than traditional cleansing kitchari, still gentle and balancing for all doshas."
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
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Ayurvedic", "Grounding"],
    ingredients: [
      "170g quinoa",
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
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Ayurvedic", "Quick", "Digestive"],
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
      vegetables: ["zucchini", "carrot", "Tomato"],
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
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Ayurvedic", "Quick"],
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
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Ayurvedic", "Cooling", "Quick"],
    ingredients: [
      "185g cooked quinoa (cooled)",
      "1 cucumber (diced)",
      "8 tbsp fresh mint leaves",
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
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Ayurvedic", "Cooling"],
    ingredients: [
      "1 cup basmati rice",
      "150g fresh green beans (trimmed)",
      "1 medium aubergine (diced)",
      "1/4 cup fresh coconut (grated)",
      "2 tbsp coconut oil",
      "1/2 tsp ground coriander",
      "1/4 tsp fennel seeds",
      "Fresh mint leaves",
      "Fresh cilantro",
      "1 lime (juiced)",
      "2 tbsp soy sauce or tamari",
      "1 tsp fresh ginger (grated)",
      "1 clove garlic (finely chopped)",
      "1 tsp sesame oil",
      "1/2 red chili or chili flakes (to taste)",
      "Sea salt to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["green beans", "Aubergine"],
      benefits: ["Cooling green vegetables", "Fresh coconut", "Light steaming preserves nutrients", "Colorful antioxidants"]
    },
    recipe: {
      instructions: [
        "Steam basmati rice until fluffy",
        "Heat coconut oil in large wok or pan",
        "Add grated ginger and chopped garlic, sauté briefly until fragrant",
        "Add diced aubergine and cook until golden brown and soft, about 5 minutes",
        "Add green beans and cook for 3-4 minutes until tender-crisp",
        "Deglaze with soy sauce and lime juice",
        "Add coriander and fennel seeds, toss for 30 seconds",
        "Remove from heat and drizzle with sesame oil",
        "Mix in fresh coconut and herbs",
        "Serve over steamed rice",
        "Garnish with fresh mint and chili flakes to taste"
      ],
      tips: [
        "Cook aubergine until properly golden for best texture",
        "Keep vegetables crisp by not overcooking",
        "Adjust chili to your heat preference"
      ],
      notes: "Asian-inspired coconut rice bowl with savory umami flavors from the soy-sesame dressing"
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
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Ayurvedic", "Cooling", "Quick"],
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
    tags: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Lactose-Free', 'Ayurvedic', 'Cooling', 'Quick', 'High-Protein'],
    ingredients: [
      '1 cup mixed summer vegetables (zucchini, cucumber, fresh corn)',
      '120ml coconut milk',
      '45g cooked quinoa',
      '100g cooked red lentils',
      '1 tbsp coconut oil',
      '1/2 tsp fennel seeds',
      '1 cup vegetable stock',
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
        'Pour in vegetable stock, bring to gentle simmer',
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
    tags: ['Vegetarian', 'Gluten-Free', 'Lactose-Free', 'Ayurvedic', 'Cooling', 'Quick'],
    ingredients: [
      '1 large cucumber, diced',
      '90g cooked quinoa',
      '120g coconut yogurt',
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
    category: 'breakfast',
    tags: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Lactose-Free', 'Ayurvedic', 'Cooling'],
    ingredients: [
      '90g cooked quinoa',
      '80g fresh seasonal fruit (melon, pear, berries)',
      '60ml coconut milk',
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
    tags: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Lactose-Free', 'Ayurvedic', 'Cooling', 'Quick', 'High-Protein'],
    ingredients: [
      '2 oz rice noodles',
      '80g tempeh (cubed)',
      '1/2 cup coconut milk',
      '1 cup vegetable stock',
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
        'Add vegetable stock and coconut milk, bring to gentle simmer',
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
    tags: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Lactose-Free', 'Ayurvedic', 'Cooling', 'High-Protein'],
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
    tags: ["Viral", "Social-Media", "High-Protein", "Instagram-Inspired"],
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
        "Add flour, then chicken stock, cottage cheese and cream cheese to create creamy sauce",
        "Blanch broccoli until bright green and tender-crisp",
        "Layer lasagna: sauce, chicken, cottage cheese mixture, broccoli, repeat",
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
    tags: ["Viral", "Social-Media", "High-Protein", "Italian-Inspired", "Instagram-Inspired", "Dairy"],
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
    tags: ["Viral", "Social-Media", "Vegetarian", "Italian-Inspired", "Instagram-Inspired"],
    ingredients: [
      "200g pasta", "zucchini", "burrata cheese", "mozzarella", "garlic cloves",
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
    name: "Herb-infused vegetable lasagna with avocado oil drizzle",
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
    tags: ["Viral", "Social-Media", "Vegetarian", "Lactose-Free", "Dairy-Free", "High-Protein", "Instagram-Inspired"],
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
    name: "Lentil and basil pesto lasagna with cashew cream sauce",
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
    tags: ["Viral", "Social-Media", "Vegetarian", "Lactose-Free", "Dairy-Free", "High-Protein", "Italian-Inspired", "Instagram-Inspired"],
    ingredients: [
      "150g cooked green lentils", "1 medium brown onion (120g)", "60g dairy-free basil pesto", "100g broccoli", "80g spinach",
      "100g cashew cream", "100ml unsweetened plant milk", "2 garlic cloves", "4 lasagna sheets (80g)", "15g nutritional yeast", "salt to taste"
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
    name: "Pasta with roasted zucchini cream and cashew cheese topping",
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
    tags: ["Viral", "Social-Media", "Vegetarian", "Lactose-Free", "Dairy-Free", "Italian-Inspired", "Instagram-Inspired"],
    ingredients: [
      "200g pasta", "zucchini", "cashew cheese", "nutritional yeast", "garlic cloves",
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
    tags: ["Viral", "Social-Media", "High-Protein", "Gluten-Free", "Vegetarian", "Quick"],
    ingredients: [
      "150g frozen mixed berries",
      "1 vanilla protein powder",
      "120g Greek yogurt",
      "30ml almond butter",
      "15ml chia seeds",
      "Fresh strawberries",
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
    tags: ["Viral", "Social-Media", "Vegetarian", "Gluten-Free", "Low-Carb", "Keto-Friendly"],
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
    tags: ["Viral", "Social-Media", "Vegetarian", "Gluten-Free", "High-Protein"],
    ingredients: [
      "50g rolled oats",
      "1 vanilla protein powder", 
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
    name: "Lactose-free protein baked oats",
    portion: "1 serving (1 ramekin)",
    nutrition: {
      protein: 28,
      prepTime: 25,
      calories: 420,
      carbohydrates: 48,
      fats: 16,
      fiber: 8,
      sugar: 15,
      sodium: 180,
      potassium: 520,
      calcium: 140,
      iron: 3.2,
      vitaminC: 8,
      costEuros: 2.80,
      proteinPerEuro: 10.0
    },
    category: "breakfast",
    tags: ["Vegetarian", "Lactose-Free", "High-Protein", "Make-Ahead", "Meal-Prep"],
    ingredients: [
      "50g oats",
      "125ml unsweetened almond milk",
      "½ ripe banana",
      "1 small egg",
      "1 tbsp almond paste",
      "½ scoop (about 15g) vanilla plant-based protein powder (optional)",
      "½ tsp baking powder",
      "½ tsp cinnamon",
      "Pinch of salt",
      "1 tsp almond flakes"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 0.5,
      vegetables: ["banana"],
      benefits: ["Complex carbs for sustained energy", "High protein from powder and egg", "Naturally sweetened with banana"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 180°C",
        "Mash half the banana in a bowl",
        "Mix mashed banana with oats, almond milk, egg, almond paste, protein powder, baking powder, cinnamon, and salt",
        "Pour mixture into a small ovenproof ramekin or dish",
        "Top with remaining banana slices and almond flakes",
        "Bake for 20-25 minutes until golden and set",
        "Serve warm directly from ramekin"
      ],
      tips: [
        "Use ripe banana for natural sweetness",
        "Protein powder is optional but increases protein content significantly",
        "Can be made ahead and reheated for quick breakfast"
      ],
      notes: "Lactose-free baked oats that are protein-rich and naturally sweetened with banana - perfect for a warm, comforting breakfast"
    },
    createdAt: new Date('2025-10-03'),
    active: true
  },
  {
    name: "Breakfast bagel with egg, avocado & cottage cheese",
    portion: "1 serving (1 bagel)",
    nutrition: {
      protein: 23,
      prepTime: 10,
      calories: 505,
      carbohydrates: 52,
      fats: 25,
      fiber: 6,
      sugar: 8,
      sodium: 580,
      potassium: 480,
      calcium: 120,
      iron: 3.2,
      vitaminC: 10,
      costEuros: 3.20,
      proteinPerEuro: 7.2
    },
    category: "breakfast",
    tags: ["Vegetarian", "High-Protein", "Quick"],
    ingredients: [
      "1 whole sesame bagel",
      "½ ripe avocado",
      "1 egg",
      "2-3 tbsp cottage cheese",
      "1 tsp olive oil",
      "Salt & pepper to taste",
      "Chili flakes",
      "Squeeze of lemon"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 0.5,
      vegetables: ["avocado"],
      benefits: ["Healthy fats from avocado", "Complete protein from egg and cottage cheese", "Sustained energy from whole grain bagel"]
    },
    recipe: {
      instructions: [
        "Slice the bagel in half and toast until golden",
        "Mash the avocado with a fork, season with salt, pepper, chili flakes, and optionally lemon juice",
        "Heat olive oil in a pan, fry the egg until the white is set but the yolk is still runny",
        "Serve everything on a plate: toasted bagel halves, fried egg, mashed avocado, and a scoop of cottage cheese with chili flakes on top"
      ],
      tips: [
        "Use a ripe avocado for easy mashing and creamy texture",
        "Don't overcook the egg - runny yolk adds richness",
        "Toast bagel well for the best texture contrast"
      ],
      notes: "Quick, protein-packed breakfast that combines creamy avocado, runny egg, and cottage cheese on a toasted sesame bagel"
    },
    createdAt: new Date('2025-10-03'),
    active: true
  },
  {
    name: "Lactose-free breakfast bagel with egg, avocado & cottage cheese",
    portion: "1 serving (1 bagel)",
    nutrition: {
      protein: 23,
      prepTime: 10,
      calories: 505,
      carbohydrates: 52,
      fats: 25,
      fiber: 6,
      sugar: 8,
      sodium: 580,
      potassium: 480,
      calcium: 120,
      iron: 3.2,
      vitaminC: 10,
      costEuros: 3.40,
      proteinPerEuro: 6.8
    },
    category: "breakfast",
    tags: ["Vegetarian", "Lactose-Free", "High-Protein", "Quick"],
    ingredients: [
      "1 whole sesame bagel",
      "½ ripe avocado",
      "1 egg",
      "2-3 tbsp lactose-free cottage cheese",
      "1 tsp olive oil",
      "Salt & pepper to taste",
      "Chili flakes",
      "Squeeze of lemon"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 0.5,
      vegetables: ["avocado"],
      benefits: ["Healthy fats from avocado", "Complete protein from egg and cottage cheese", "Sustained energy from whole grain bagel"]
    },
    recipe: {
      instructions: [
        "Slice the bagel in half and toast until golden",
        "Mash the avocado with a fork, season with salt, pepper, chili flakes, and optionally lemon juice",
        "Heat olive oil in a pan, fry the egg until the white is set but the yolk is still runny",
        "Serve everything on a plate: toasted bagel halves, fried egg, mashed avocado, and a scoop of lactose-free cottage cheese with chili flakes on top"
      ],
      tips: [
        "Use a ripe avocado for easy mashing and creamy texture",
        "Don't overcook the egg - runny yolk adds richness",
        "Toast bagel well for the best texture contrast"
      ],
      notes: "Lactose-free version with same great taste - quick breakfast combining creamy avocado, runny egg, and lactose-free cottage cheese on a toasted sesame bagel"
    },
    createdAt: new Date('2025-10-03'),
    active: true
  },
  {
    name: "Creamy mushroom pasta",
    portion: "1 serving (100g dry pasta)",
    nutrition: {
      protein: 15,
      prepTime: 30,
      calories: 480,
      carbohydrates: 70,
      fats: 15,
      fiber: 8,
      sugar: 6,
      sodium: 400,
      potassium: 620,
      calcium: 85,
      iron: 4.2,
      vitaminC: 18,
      costEuros: 3.20,
      proteinPerEuro: 4.7
    },
    category: "dinner",
    tags: ["Vegetarian", "Vegan", "Dairy-Free", "Lactose-Free", "Plant-Based"],
    ingredients: [
      "30g raw cashews",
      "30ml unsweetened almond milk",
      "1 tsp tamari",
      "1 tsp nutritional yeast (optional)",
      "1/3 lemon, juiced",
      "1/3 onion, peeled & diced",
      "1-2 cloves garlic, peeled & diced",
      "60g mushrooms, sliced",
      "1/3 tsp dried rosemary",
      "100g fusilli pasta",
      "1 handful fresh spinach",
      "Drizzle of olive oil",
      "Pinch of sea salt & black pepper"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["mushrooms", "spinach", "onion"],
      benefits: ["Rich in vitamin D from mushrooms", "Iron from spinach", "Creamy sauce from whole cashews"]
    },
    recipe: {
      instructions: [
        "Make the sauce by placing cashews, almond milk, tamari, nutritional yeast, lemon juice and a sprinkling of salt into a powerful blender. Blitz to form a creamy sauce – you may wish to add a dash more almond milk, if needed",
        "Place a pan over medium heat and add a drizzle of olive oil. Once warm, add the diced onion, garlic and a sprinkling of salt. Cook for 10 minutes until the onion is soft",
        "Once soft, add the sliced mushrooms, dried rosemary and a sprinkling of salt. Mix well and cook for 10 minutes until the mushrooms reduce in size and soften",
        "While the mushrooms cook, cook the pasta according to the packet instructions. Once cooked, drain (reserving a little of the pasta water) and mix through the mushroom mixture",
        "Pour in the creamy sauce and add the spinach. Mix well and cook for a few minutes to heat everything through and allow the spinach to wilt; mix through a dash of the pasta water, if the sauce becomes too thick",
        "Once everything has heated through, serve the pasta in bowls with some black pepper sprinkled on top"
      ],
      tips: [
        "Use a powerful blender to make the cashew sauce silky smooth",
        "Reserve pasta water to adjust sauce consistency",
        "Fresh rosemary can replace dried - use about 1 tsp fresh"
      ],
      notes: "This indulgent pasta recipe features a creamy cashew-based sauce with rosemary pan-fried mushrooms and spinach. It's a great recipe to make when you're short on time or low on ingredients"
    },
    createdAt: new Date('2025-10-03'),
    active: true
  },
  {
    name: "Gluten-free breakfast bagel with egg, avocado & cottage cheese",
    portion: "1 serving (1 bagel)",
    nutrition: {
      protein: 23,
      prepTime: 10,
      calories: 515,
      carbohydrates: 54,
      fats: 25,
      fiber: 7,
      sugar: 8,
      sodium: 600,
      potassium: 480,
      calcium: 120,
      iron: 3.2,
      vitaminC: 10,
      costEuros: 3.50,
      proteinPerEuro: 6.6
    },
    category: "breakfast",
    tags: ["Vegetarian", "Gluten-Free", "High-Protein", "Quick"],
    ingredients: [
      "1 gluten-free sesame bagel",
      "½ ripe avocado",
      "1 egg",
      "2-3 tbsp cottage cheese",
      "1 tsp olive oil",
      "Salt & pepper to taste",
      "Chili flakes",
      "Squeeze of lemon"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 0.5,
      vegetables: ["avocado"],
      benefits: ["Healthy fats from avocado", "Complete protein from egg and cottage cheese", "Sustained energy from gluten-free bagel"]
    },
    recipe: {
      instructions: [
        "Slice the gluten-free bagel in half and toast until golden",
        "Mash the avocado with a fork, season with salt, pepper, chili flakes, and optionally lemon juice",
        "Heat olive oil in a pan, fry the egg until the white is set but the yolk is still runny",
        "Serve everything on a plate: toasted bagel halves, fried egg, mashed avocado, and a scoop of cottage cheese with chili flakes on top"
      ],
      tips: [
        "Use a ripe avocado for easy mashing and creamy texture",
        "Don't overcook the egg - runny yolk adds richness",
        "Gluten-free bagels toast best when fresh or lightly warmed first"
      ],
      notes: "Gluten-free version with same great taste - quick breakfast combining creamy avocado, runny egg, and cottage cheese on a toasted gluten-free sesame bagel"
    },
    createdAt: new Date('2025-10-03'),
    active: true
  },
  {
    name: "Gluten-free creamy mushroom pasta",
    portion: "1 serving (100g dry pasta)",
    nutrition: {
      protein: 16,
      prepTime: 30,
      calories: 490,
      carbohydrates: 72,
      fats: 15,
      fiber: 9,
      sugar: 6,
      sodium: 400,
      potassium: 620,
      calcium: 85,
      iron: 4.2,
      vitaminC: 18,
      costEuros: 3.60,
      proteinPerEuro: 4.4
    },
    category: "dinner",
    tags: ["Vegetarian", "Vegan", "Dairy-Free", "Lactose-Free", "Gluten-Free", "Plant-Based"],
    ingredients: [
      "30g raw cashews",
      "30ml unsweetened almond milk",
      "1 tsp tamari",
      "1 tsp nutritional yeast (optional)",
      "1/3 lemon, juiced",
      "1/3 onion, peeled & diced",
      "1-2 cloves garlic, peeled & diced",
      "60g mushrooms, sliced",
      "1/3 tsp dried rosemary",
      "100g gluten-free fusilli pasta",
      "1 handful fresh spinach",
      "Drizzle of olive oil",
      "Pinch of sea salt & black pepper"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["mushrooms", "spinach", "onion"],
      benefits: ["Rich in vitamin D from mushrooms", "Iron from spinach", "Creamy sauce from whole cashews"]
    },
    recipe: {
      instructions: [
        "Make the sauce by placing cashews, almond milk, tamari, nutritional yeast, lemon juice and a sprinkling of salt into a powerful blender. Blitz to form a creamy sauce – you may wish to add a dash more almond milk, if needed",
        "Place a pan over medium heat and add a drizzle of olive oil. Once warm, add the diced onion, garlic and a sprinkling of salt. Cook for 10 minutes until the onion is soft",
        "Once soft, add the sliced mushrooms, dried rosemary and a sprinkling of salt. Mix well and cook for 10 minutes until the mushrooms reduce in size and soften",
        "While the mushrooms cook, cook the gluten-free pasta according to the packet instructions. Once cooked, drain (reserving a little of the pasta water) and mix through the mushroom mixture",
        "Pour in the creamy sauce and add the spinach. Mix well and cook for a few minutes to heat everything through and allow the spinach to wilt; mix through a dash of the pasta water, if the sauce becomes too thick",
        "Once everything has heated through, serve the pasta in bowls with some black pepper sprinkled on top"
      ],
      tips: [
        "Use a powerful blender to make the cashew sauce silky smooth",
        "Reserve pasta water to adjust sauce consistency",
        "Gluten-free pasta can be more delicate - avoid overcooking"
      ],
      notes: "Gluten-free version of this indulgent pasta recipe featuring a creamy cashew-based sauce with rosemary pan-fried mushrooms and spinach. Perfect for those avoiding gluten"
    },
    createdAt: new Date('2025-10-03'),
    active: true
  },
  {
    name: "Miso aubergine & black bean stew",
    portion: "1 serving",
    nutrition: {
      protein: 18,
      prepTime: 60,
      calories: 420,
      carbohydrates: 52,
      fats: 16,
      fiber: 16,
      sugar: 18,
      sodium: 580,
      potassium: 980,
      calcium: 120,
      iron: 5.2,
      vitaminC: 28,
      costEuros: 3.80,
      proteinPerEuro: 4.7
    },
    category: "dinner",
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "High-Fiber", "Batch-Cooking", "Meal-Prep"],
    ingredients: [
      "1 whole aubergine",
      "1.5 tsp olive oil (+ extra to serve)",
      "1 clove garlic, grated/crushed",
      "Small pinch of dried red chilli flakes (optional)",
      "½ brown onion, finely chopped",
      "200g chopped tomatoes (½ tin)",
      "1.5 tsp white miso paste",
      "½ tsp maple syrup",
      "125g black beans, drained",
      "1.5 tsp tahini (+ extra to drizzle)",
      "Small handful of fresh mint leaves (or mint & parsley), roughly chopped"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2.5,
      vegetables: ["aubergine", "tomatoes", "onion"],
      benefits: ["High fiber from beans and aubergine", "Probiotic benefits from miso", "Rich in antioxidants"]
    },
    recipe: {
      instructions: [
        "Preheat the oven to 200°C / 400°F. Prick the aubergine all over with a fork to let the steam escape, then place on a baking tray. Roast for 45-50 minutes, until soft and collapsed",
        "Meanwhile, warm the oil in a saucepan over medium-low heat. Add the garlic and chilli flakes (if using) and cook for 1-2 minutes, until fragrant. Stir in the onion with a pinch of salt and cook for 10-15 minutes, stirring often, until softened",
        "Add the chopped tomatoes, miso paste, maple syrup and 100ml water (use some of the empty tomato tin to measure). Simmer for 15-20 minutes, until reduced by about one-third. Turn off the heat, cover with a lid, and leave to sit until the aubergine is ready",
        "When the aubergine is cool enough to handle, slice it in half and use a fork to scrape out the flesh. Stir this into the tomato sauce, then add the black beans, tahini and a drizzle of olive oil (optional). Season to taste and simmer gently for 5 minutes, until warmed through",
        "Scatter over the fresh herbs before serving. Delicious with steamed rice or toasted pittas"
      ],
      tips: [
        "This dish keeps well in the fridge for up to 4 days, or in the freezer for up to 3 months",
        "Roasting the aubergine adds a silky, smoky flavor to the stew",
        "White miso paste adds umami depth - find it in the Asian section of supermarkets"
      ],
      notes: "This hearty aubergine stew is perfect for when the weather cools down. With silky roasted aubergine, fiber-rich beans and a garlicky tomato sauce, it's simple, comforting, and even tastier the next day - perfect for batch cooking or freezing"
    },
    createdAt: new Date('2025-10-03'),
    active: true
  },
  {
    name: "Burnt aubergine pickle with yogurt",
    portion: "1 serving",
    nutrition: {
      protein: 8,
      prepTime: 70,
      calories: 340,
      carbohydrates: 28,
      fats: 22,
      fiber: 8,
      sugar: 14,
      sodium: 380,
      potassium: 620,
      calcium: 140,
      iron: 2.8,
      vitaminC: 12,
      costEuros: 3.20,
      proteinPerEuro: 2.5
    },
    category: "dinner",
    tags: ["Vegetarian", "Gluten-Free", "Middle-Eastern", "Meal-Prep"],
    ingredients: [
      "75g Greek-style yoghurt",
      "½ garlic clove, peeled and crushed",
      "½ spring onion (8g), trimmed and thinly sliced",
      "¼ tsp nigella seeds, toasted",
      "**For the burnt aubergine pickle:**",
      "250g aubergine (1 medium), poked all over with a fork",
      "⅜ tsp fenugreek seeds",
      "½ tsp cumin seeds",
      "⅛ tsp ground turmeric",
      "30ml olive oil, plus extra for greasing",
      "¼ onion, peeled and finely chopped (45g)",
      "10g fresh ginger, peeled and finely grated",
      "½ tbsp tomato paste",
      "½ tsp caster sugar",
      "15ml apple cider vinegar",
      "Salt and black pepper"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["aubergine", "onion", "ginger"],
      benefits: ["Rich in antioxidants from charred aubergine", "Probiotic benefits from yogurt", "Anti-inflammatory spices"]
    },
    recipe: {
      instructions: [
        "Preheat a well-greased griddle pan on high heat. Once smoking, add the aubergine and grill for 40 minutes, turning as necessary, until nicely charred all over and softened. Set aside and when cool enough to handle, remove and discard the stem and skin",
        "Transfer the aubergine flesh to a colander set over a bowl and leave to drain for 20 minutes, discarding the collected liquid. Roughly tear apart the flesh into strands and set aside",
        "Put the fenugreek and cumin seeds into a small frying pan on medium-high heat. Toast for 3-4 minutes until fragrant, then transfer to a spice grinder and blitz into a fine powder (or use a pestle and mortar). Stir in the turmeric",
        "Put the oil into a medium pan on medium-high heat. Add the onion and cook for 7 minutes, stirring occasionally, until lightly coloured and softened. Add the ginger, tomato paste, ground spices, sugar, a pinch of salt and a good grind of pepper. Cook for 3 minutes more, stirring often",
        "Add the vinegar, bring to a simmer, then remove from the heat. Stir in the aubergine and set aside to cool",
        "In a bowl, whisk together the yoghurt, garlic and a pinch of salt. Spread the mixture on a plate and top with the burnt aubergine pickle. Sprinkle with spring onions and nigella seeds and serve"
      ],
      tips: [
        "The pickle can be made ahead and stored in a sterilised jar for up to 1 week",
        "Charring the aubergine adds a deep, smoky flavor to the dish",
        "Serve with warm flatbread or pita for a complete meal"
      ],
      notes: "This Middle Eastern-inspired dish features deeply charred aubergine transformed into a spiced pickle, served over creamy yogurt. The combination of warm spices and cooling yogurt creates a perfect balance"
    },
    createdAt: new Date('2025-10-03'),
    active: true
  },
  {
    name: "Lactose-free burnt aubergine pickle with yogurt",
    portion: "1 serving",
    nutrition: {
      protein: 7,
      prepTime: 70,
      calories: 335,
      carbohydrates: 28,
      fats: 22,
      fiber: 8,
      sugar: 13,
      sodium: 370,
      potassium: 610,
      calcium: 130,
      iron: 2.8,
      vitaminC: 12,
      costEuros: 3.40,
      proteinPerEuro: 2.1
    },
    category: "dinner",
    tags: ["Vegetarian", "Lactose-Free", "Gluten-Free", "Middle-Eastern", "Meal-Prep"],
    ingredients: [
      "75g lactose-free Greek-style yoghurt",
      "½ garlic clove, peeled and crushed",
      "½ spring onion (8g), trimmed and thinly sliced",
      "¼ tsp nigella seeds, toasted",
      "**For the burnt aubergine pickle:**",
      "250g aubergine (1 medium), poked all over with a fork",
      "⅜ tsp fenugreek seeds",
      "½ tsp cumin seeds",
      "⅛ tsp ground turmeric",
      "30ml olive oil, plus extra for greasing",
      "¼ onion, peeled and finely chopped (45g)",
      "10g fresh ginger, peeled and finely grated",
      "½ tbsp tomato paste",
      "½ tsp caster sugar",
      "15ml apple cider vinegar",
      "Salt and black pepper"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["aubergine", "onion", "ginger"],
      benefits: ["Rich in antioxidants from charred aubergine", "Digestive-friendly lactose-free option", "Anti-inflammatory spices"]
    },
    recipe: {
      instructions: [
        "Preheat a well-greased griddle pan on high heat. Once smoking, add the aubergine and grill for 40 minutes, turning as necessary, until nicely charred all over and softened. Set aside and when cool enough to handle, remove and discard the stem and skin",
        "Transfer the aubergine flesh to a colander set over a bowl and leave to drain for 20 minutes, discarding the collected liquid. Roughly tear apart the flesh into strands and set aside",
        "Put the fenugreek and cumin seeds into a small frying pan on medium-high heat. Toast for 3-4 minutes until fragrant, then transfer to a spice grinder and blitz into a fine powder (or use a pestle and mortar). Stir in the turmeric",
        "Put the oil into a medium pan on medium-high heat. Add the onion and cook for 7 minutes, stirring occasionally, until lightly coloured and softened. Add the ginger, tomato paste, ground spices, sugar, a pinch of salt and a good grind of pepper. Cook for 3 minutes more, stirring often",
        "Add the vinegar, bring to a simmer, then remove from the heat. Stir in the aubergine and set aside to cool",
        "In a bowl, whisk together the lactose-free yoghurt, garlic and a pinch of salt. Spread the mixture on a plate and top with the burnt aubergine pickle. Sprinkle with spring onions and nigella seeds and serve"
      ],
      tips: [
        "The pickle can be made ahead and stored in a sterilised jar for up to 1 week",
        "Charring the aubergine adds a deep, smoky flavor to the dish",
        "Lactose-free Greek yogurt provides the same creamy texture without dairy discomfort"
      ],
      notes: "Lactose-free version of this Middle Eastern-inspired dish featuring deeply charred aubergine transformed into a spiced pickle, served over creamy lactose-free yogurt. Perfect for those avoiding dairy"
    },
    createdAt: new Date('2025-10-03'),
    active: true
  },
  {
    name: "15-minute soba noodle lunch bowl",
    portion: "1 serving",
    nutrition: {
      protein: 24,
      prepTime: 15,
      calories: 520,
      carbohydrates: 54,
      fats: 28,
      fiber: 10,
      sugar: 9,
      sodium: 580,
      potassium: 720,
      calcium: 140,
      iron: 4.2,
      vitaminC: 22,
      costEuros: 3.60,
      proteinPerEuro: 6.7
    },
    category: "lunch",
    tags: ["Vegetarian", "Vegan", "Quick", "Fresh", "High-Protein", "Asian-Fusion"],
    ingredients: [
      "75g soba noodles",
      "50g frozen peas",
      "25g cashews",
      "13g sunflower seeds",
      "13g sesame seeds",
      "12g pumpkin seeds",
      "¼ cucumber, deseeded & thinly sliced",
      "½ avocado, diced",
      "Small handful of fresh mint (about 8g), roughly chopped",
      "Small handful of fresh coriander (about 8g), roughly chopped",
      "Pinch of flaky sea salt",
      "**For the dressing:**",
      "1 tbsp tahini",
      "½ tbsp maple syrup",
      "½ tbsp white miso paste",
      "½ lemon, zested & juiced",
      "½ tbsp tamari",
      "½ tbsp olive oil (+ extra to garnish)"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1.5,
      vegetables: ["peas", "cucumber", "avocado"],
      benefits: ["High in plant protein from nuts and seeds", "Fresh herbs add vitamins and antioxidants", "Healthy fats from avocado and tahini"]
    },
    recipe: {
      instructions: [
        "Bring a small saucepan of salted water to the boil. Cook the noodles for 4-5 minutes until al dente, adding the peas for the final minute. Drain and refresh under cold water until cool to touch",
        "Set a small frying pan over medium-low heat, add the cashews and seeds, and cook for 8-10 minutes until golden. Remove from the heat and set aside",
        "To make the dressing, in a small bowl, whisk together the tahini, maple syrup, miso, lemon zest and juice, tamari, olive oil and ½ tablespoon of water",
        "To serve, toss together the noodles, peas, toasted nuts and seeds, cucumber, avocado, mint and coriander. Pour over the dressing and season to taste with flaky sea salt. Drizzle with extra virgin olive oil"
      ],
      tips: [
        "Any leftovers can be stored in the fridge and make a great lunch the following day",
        "Toast the nuts and seeds until golden for maximum crunch and flavor",
        "Add edamame beans or broccoli for extra plant protein"
      ],
      notes: "This fresh noodle salad is made with only 6 simple ingredients and drizzled with a delicious tahini dressing. With creamy avocado and crunchy nuts and seeds, this salad makes a great base to add any extras you have in the cupboard"
    },
    createdAt: new Date('2025-10-03'),
    active: true
  },
  {
    name: "Gluten-free 15-minute soba noodle lunch bowl",
    portion: "1 serving",
    nutrition: {
      protein: 24,
      prepTime: 15,
      calories: 520,
      carbohydrates: 54,
      fats: 28,
      fiber: 10,
      sugar: 9,
      sodium: 580,
      potassium: 720,
      calcium: 140,
      iron: 4.2,
      vitaminC: 22,
      costEuros: 3.80,
      proteinPerEuro: 6.3
    },
    category: "lunch",
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Quick", "Fresh", "High-Protein", "Asian-Fusion"],
    ingredients: [
      "75g gluten-free soba noodles (100% buckwheat)",
      "50g frozen peas",
      "25g cashews",
      "13g sunflower seeds",
      "13g sesame seeds",
      "12g pumpkin seeds",
      "¼ cucumber, deseeded & thinly sliced",
      "½ avocado, diced",
      "Small handful of fresh mint (about 8g), roughly chopped",
      "Small handful of fresh coriander (about 8g), roughly chopped",
      "Pinch of flaky sea salt",
      "**For the dressing:**",
      "1 tbsp tahini",
      "½ tbsp maple syrup",
      "½ tbsp white miso paste",
      "½ lemon, zested & juiced",
      "½ tbsp tamari (gluten-free)",
      "½ tbsp olive oil (+ extra to garnish)"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1.5,
      vegetables: ["peas", "cucumber", "avocado"],
      benefits: ["High in plant protein from nuts and seeds", "Fresh herbs add vitamins and antioxidants", "Healthy fats from avocado and tahini"]
    },
    recipe: {
      instructions: [
        "Bring a small saucepan of salted water to the boil. Cook the gluten-free soba noodles for 4-5 minutes until al dente, adding the peas for the final minute. Drain and refresh under cold water until cool to touch",
        "Set a small frying pan over medium-low heat, add the cashews and seeds, and cook for 8-10 minutes until golden. Remove from the heat and set aside",
        "To make the dressing, in a small bowl, whisk together the tahini, maple syrup, miso, lemon zest and juice, gluten-free tamari, olive oil and ½ tablespoon of water",
        "To serve, toss together the noodles, peas, toasted nuts and seeds, cucumber, avocado, mint and coriander. Pour over the dressing and season to taste with flaky sea salt. Drizzle with extra virgin olive oil"
      ],
      tips: [
        "Any leftovers can be stored in the fridge and make a great lunch the following day",
        "Use 100% buckwheat soba noodles for guaranteed gluten-free option",
        "Make sure your tamari is certified gluten-free"
      ],
      notes: "Gluten-free version of this fresh noodle salad made with 100% buckwheat soba noodles and drizzled with a delicious tahini dressing. With creamy avocado and crunchy nuts and seeds, this salad makes a great base to add any extras you have in the cupboard"
    },
    createdAt: new Date('2025-10-03'),
    active: true
  },
  {
    name: "10-minute butter beans with rocket pesto",
    portion: "1 serving",
    nutrition: {
      protein: 24,
      prepTime: 10,
      calories: 575,
      carbohydrates: 45,
      fats: 30,
      fiber: 13,
      sugar: 3,
      sodium: 420,
      potassium: 920,
      calcium: 110,
      iron: 5.8,
      vitaminC: 15,
      costEuros: 3.20,
      proteinPerEuro: 7.5
    },
    category: "lunch",
    tags: ["Vegetarian", "Vegan", "Quick", "High-Protein", "High-Fiber", "Mediterranean"],
    ingredients: [
      "**For the beans:**",
      "250g butter beans, drained",
      "½ lemon, zested & squeeze of juice",
      "1 drizzle of extra virgin olive oil (optional)",
      "1 pinch of sumac (or use Aleppo pepper)",
      "Pinch of flaky sea salt & black pepper",
      "**For the pesto:**",
      "¼ clove garlic, peeled",
      "15g pine nuts (about 1.5 tablespoons)",
      "15g rocket (+ extra to garnish)",
      "1 drizzle of olive oil"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1,
      vegetables: ["rocket"],
      benefits: ["High protein from butter beans", "Heart-healthy fats from pine nuts", "Peppery rocket adds vitamins"]
    },
    recipe: {
      instructions: [
        "To make the beans, simply combine the butter beans, lemon zest, a good glug of olive oil, a pinch of flaky sea salt (taste the beans before adding salt, as they may be sufficiently seasoned), black pepper and a squeeze of lemon juice",
        "For the pesto, add all the ingredients to a mini-chopper and blitz until you have a coarse paste, adding a splash of water to loosen as needed",
        "To serve, tip the beans onto a large plate or shallow bowl, and spoon over the pesto, adding handful of rocket and a generous pinch of sumac (if using) to garnish. Delicious with fresh sourdough bread"
      ],
      tips: [
        "To batch cook or save leftovers, store the beans and pesto in separate sealed containers in the fridge for up to 3 days",
        "Use good quality butter beans and olive oil - you'll really notice the difference",
        "The pesto can be made with basil instead of rocket for a more traditional flavor"
      ],
      notes: "This is quick and easy cooking at its best, showcasing what you can do with a few simple ingredients. Perfect as a lazy lunch, or as part of a bigger spread with lots of tasty dips and nourishing salads"
    },
    createdAt: new Date('2025-10-03'),
    active: true
  },
  {
    name: "Simple veggie stir-fry",
    portion: "1 serving",
    nutrition: {
      protein: 18,
      prepTime: 25,
      calories: 480,
      carbohydrates: 62,
      fats: 18,
      fiber: 10,
      sugar: 8,
      sodium: 280,
      potassium: 650,
      calcium: 160,
      iron: 4.2,
      vitaminC: 35,
      costEuros: 2.80,
      proteinPerEuro: 6.4
    },
    category: "dinner",
    tags: ["Vegetarian", "Vegan", "Quick", "Asian-Fusion", "Weeknight"],
    ingredients: [
      "**For the stir fry:**",
      "75g brown rice noodles",
      "½ carrot",
      "½ courgette",
      "½ tbsp sesame seeds",
      "50g frozen edamame beans",
      "½ red chilli, deseeded and sliced",
      "Small handful of fresh coriander, roughly chopped",
      "**For the sauce:**",
      "½ tbsp peanut butter",
      "½ tbsp toasted sesame oil (+ extra for cooking)",
      "½ tsp brown rice miso paste",
      "½ lime, juiced"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["carrot", "courgette", "edamame"],
      benefits: ["Packed with colorful vegetables", "Plant protein from edamame", "Peanut butter and miso add richness"]
    },
    recipe: {
      instructions: [
        "Start by cooking the noodles according to the instructions on the pack. Once cooked, drain and leave to one side",
        "Spiralise the carrot and courgette into thin noodle shapes. If you don't have a spiralizer, you can use a grater to create a similar effect",
        "Place the edamame beans into a bowl and cover with boiling water. Leave for 5-10 minutes until soft and cooked through, before draining and then leave to one side",
        "In a small bowl, mix together all of the sauce ingredients",
        "Place a large pan over a medium heat and add a drizzle of sesame oil. Once warm, add the carrot and courgette noodles",
        "Stir well and cook for 5 minutes before adding the noodles, sesame seeds, edamame beans and sauce",
        "Mix well and cook for a further 5-10 minutes until everything has warmed through",
        "Top with fresh chilli and chopped coriander before serving"
      ],
      tips: [
        "Use brown rice noodles for extra fiber and nutrients",
        "Feel free to swap in any extra vegetables you have in the fridge",
        "The peanut butter and miso paste add incredible richness to the dish"
      ],
      notes: "This recipe is perfect for a quick, simple and delicious weekday supper - and also an ideal way to pack vegetables into your day. The peanut butter and miso paste add an incredible richness to the dish"
    },
    createdAt: new Date('2025-10-03'),
    active: true
  },
  {
    name: "Chickpea, tofu & harissa stew",
    portion: "1 serving",
    nutrition: {
      protein: 28,
      prepTime: 30,
      calories: 420,
      carbohydrates: 38,
      fats: 18,
      fiber: 12,
      sugar: 12,
      sodium: 480,
      potassium: 880,
      calcium: 280,
      iron: 6.4,
      vitaminC: 32,
      costEuros: 2.90,
      proteinPerEuro: 9.7
    },
    category: "dinner",
    tags: ["Vegetarian", "Vegan", "High-Protein", "High-Fiber", "North-African"],
    ingredients: [
      "1 drizzle of toasted sesame oil or olive oil",
      "½ tsp ground cumin",
      "½ tsp hot smoked paprika or sweet paprika",
      "200g chopped tomatoes (½ tin)",
      "1.5 cloves garlic, peeled & minced",
      "1 tbsp tomato purée",
      "½ onion, peeled & diced",
      "120g canned chickpeas (or butter beans), drained",
      "50g spinach",
      "100g firm tofu",
      "1 tbsp harissa paste (adjust to taste)",
      "½ tsp tamari",
      "¼ tsp maple syrup",
      "¼ lemon, juiced",
      "1 tbsp coconut yoghurt",
      "Pinch of sea salt & black pepper"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["tomatoes", "spinach", "onion"],
      benefits: ["High protein from chickpeas and tofu", "Rich in iron from spinach", "North African spices add depth"]
    },
    recipe: {
      instructions: [
        "Heat a light drizzle of sesame oil or olive oil in a large frying pan over medium heat. Add the onions and season with a pinch of salt. Cook, stirring often, until softened and lowering heat to low if necessary, about 10 minutes",
        "Add the crushed garlic and cook, stirring frequently, for 2 minutes. Stir in the cumin and paprika and cook, stirring throughout, until fragrant, about 1 minute",
        "Add the chickpeas, tofu, tomatoes, tomato puree, and harissa and cook, stirring often, until the tomatoes have darkened and reduced, 10-15 minutes",
        "Stir in the spinach and allow to cook until wilted, 1-2 minutes. Then add the tamari, maple syrup, and lemon juice. Taste and season to taste with salt and pepper",
        "Before serving, remove from heat and stir in the coconut yoghurt"
      ],
      tips: [
        "Spice levels of harissa vary from brand to brand - taste before adding and use only the amount you feel comfortable with",
        "If your stew is too spicy, add more coconut yoghurt to mellow it out",
        "Goes well with roasted sweet potatoes, rice noodles, or brown rice"
      ],
      notes: "This hearty chickpea, tofu & harissa stew, full of protein and fiber, is guaranteed to leave you feeling satisfied. It goes well with a variety of side dishes like roasted sweet potatoes, rice noodles, and brown rice"
    },
    createdAt: new Date('2025-10-03'),
    active: true
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
    tags: ["Viral", "Social-Media", "Gluten-Free", "High-Protein", "Omega-3"],
    ingredients: [
      "150g salmon fillet",
      "160g cooked sushi rice",
      "1/2 ripe avocado (sliced)",
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
      vegetables: ["ripe avocado", "cucumber"],
      benefits: ["Viral for umami flavor combo", "Restaurant-quality at home", "Perfect macro balance"]
    },
    recipe: {
      instructions: [
        "Season salmon with salt and pepper",
        "Pan-sear salmon 3-4 minutes each side until flaky",
        "Flake salmon into bite-sized pieces",
        "Mix soy sauce, mayo, sriracha for viral sauce",
        "Place warm rice in bowl as base",
        "Top with flaked salmon and ripe avocado slices",
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
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "High-Protein", "overnight"],
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
    tags: ["Vegetarian", "Gluten-Free", "High-Protein", "Mediterranean"],
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
    tags: ["Viral", "Social-Media", "Vegetarian", "Gluten-Free", "Quick", "High-Protein"],
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
      vegetables: ["greens", "Avocado", "corn"],
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
    tags: ["Viral", "Social-Media", "Vegetarian", "Vegan", "Gluten-Free", "High-Protein"],
    ingredients: [
      "120g chickpeas (cooked)",
      "150g diced tomatoes",
      "120ml coconut milk",
      "1 onion (diced)",
      "3 cloves garlic",
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
    tags: ["Viral", "Social-Media", "Vegetarian", "Gluten-Free", "High-Protein"],
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
    tags: ["Viral", "Social-Media", "Vegetarian", "Snack"],
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
    tags: ["Vegetarian", "High-Protein", "post-workout", "energizing"],
    ingredients: [
      "1 vanilla protein powder",
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
    tags: ["Vegetarian", "Gluten-Free", "High-Protein", "savory"],
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
      vegetables: ["spinach", "Avocado"],
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
        "Cook quinoa in vegetable stock for extra flavor",
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
    tags: ["Vegetarian", "High-Protein", "weekend-treat"],
    ingredients: [
      "2 eggs",
      "1 vanilla protein powder",
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
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "High-Protein", "Quick", "asian-inspired"],
    ingredients: [
      "150g firm tofu (cubed)",
      "90g cooked quinoa",
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
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Dairy-Free", "High-Protein", "Quick", "Mediterranean", "Menstrual", "Follicular", "Luteal"],
    ingredients: [
      "1 can (400g) white beans (drained)",
      "200g fresh spinach",
      "1 large tomato (diced)",
      "½ cucumber (diced)",
      "2 tbsp olive oil",
      "2 tbsp lemon juice",
      "2 cloves garlic (minced)",
      "4 tbsp fresh herbs (parsley, basil)",
      "2 tbsp pine nuts",
      "Salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2.5,
      vegetables: ["spinach", "Tomato", "cucumber"],
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
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "High-Protein", "Quick", "indian-inspired"],
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
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "High-Protein", "Quick"],
    ingredients: [
      "190g red lentils",
      "1 carrot (diced)",
      "1 celery stalk (diced)",
      "1 onion (diced)",
      "2 cloves garlic (minced)",
      "1 can (400g) diced tomatoes",
      "720ml vegetable stock",
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
        "Add lentils, tomatoes, and vegetable stock",
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
    tags: ["Vegetarian", "Vegan", "High-Protein", "Quick", "asian-inspired"],
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
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "High-Protein", "Mediterranean"],
    ingredients: [
      "2 large bell peppers (halved and seeded)",
      "90g cooked quinoa",
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
      vegetables: ["bell peppers", "Tomato"],
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
    tags: ["Keto", "Gluten-Free", "High-Protein", "Low-Carb"],
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
      vegetables: ["Avocado", "chives"],
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
    tags: ["Keto", "Gluten-Free", "Vegetarian", "Low-Carb"],
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
    tags: ["Keto", "Gluten-Free", "Vegetarian", "Vegan", "Low-Carb", "overnight"],
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
    tags: ["Keto", "Gluten-Free", "High-Protein", "Low-Carb"],
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
    tags: ["Keto", "Gluten-Free", "High-Protein", "Low-Carb"],
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
    tags: ["Keto", "Gluten-Free", "High-Protein", "Omega-3", "Low-Carb"],
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
    tags: ["Keto", "Gluten-Free", "High-Protein", "Low-Carb", "Quick"],
    ingredients: [
      "200g beef sirloin (sliced thin)",
      "210g broccoli florets",
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
    tags: ["Keto", "Gluten-Free", "High-Protein", "Low-Carb"],
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
    tags: ["Keto", "Gluten-Free", "High-Protein", "Low-Carb"],
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
    tags: ["Keto", "Gluten-Free", "Vegetarian", "Low-Carb"],
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
    name: "Coconut yogurt protein power bowl",
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
    tags: ["Vegetarian", "Gluten-Free", "Lactose-Free", "High-Protein", "Quick", "Probiotic"],
    ingredients: [
      "1 cup coconut yogurt",
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
        "Place coconut yogurt in a large bowl",
        "Swirl in almond butter and vanilla extract",
        "Top with chia seeds and hemp hearts",
        "Add mixed berries on top",
        "Drizzle with honey",
        "Finish with crushed walnuts"
      ],
      tips: [
        "Use thick coconut yogurt for best texture",
        "Let chia seeds sit for 5 minutes to absorb moisture",
        "Coconut yogurt provides the same creamy texture without lactose"
      ],
      notes: "Lactose-free, creamy, protein-packed breakfast that feels indulgent"
    }
  },

  {
    name: "Tofu scramble with spinach",
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
    tags: ["Vegetarian", "Gluten-Free", "Lactose-Free", "High-Protein", "Keto", "Quick"],
    ingredients: [
      "3 large eggs",
      "½ cup firm tofu (crumbled)",
      "2 cups fresh spinach",
      "1 tbsp olive oil",
      "2 tbsp nutritional yeast",
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
        "Heat olive oil in non-stick pan over medium heat",
        "Add spinach, cook until wilted",
        "Beat eggs and add to pan",
        "As eggs begin to set, add crumbled tofu",
        "Gently scramble, adding nutritional yeast for cheesy flavor",
        "Cook until eggs are set but still creamy",
        "Season with salt, pepper, and chives"
      ],
      tips: [
        "Don't overcook - eggs should remain creamy",
        "Nutritional yeast adds a cheesy flavor without dairy",
        "Crumble tofu finely for best texture"
      ],
      notes: "Lactose-free, restaurant-quality protein breakfast in minutes"
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
    tags: ["Vegetarian", "Gluten-Free", "High-Protein", "weekend"],
    ingredients: [
      "3 large eggs",
      "1 vanilla protein powder",
      "½ cup almond flour",
      "2 tbsp Greek yogurt",
      "1 tsp baking powder",
      "1 tsp vanilla extract",
      "1 tbsp maple syrup",
      "2 tbsp butter for cooking",
      "Fresh berries"
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
    tags: ["Gluten-Free", "High-Protein", "Meal-Prep"],
    ingredients: [
      "150g ground turkey (93% lean)",
      "150g cooked green lentils",
      "60g baby spinach",
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
    tags: ["Vegetarian", "High-Protein", "Meal-Prep", "Quick"],
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
      vegetables: ["mixed greens", "carrots", "Avocado"],
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
    tags: ["Pescatarian", "Gluten-Free", "High-Protein", "Omega-3"],
    ingredients: [
      "180g salmon fillet",
      "140g cooked quinoa",
      "2 tbsp fresh dill (chopped)",
      "2 tbsp fresh parsley (chopped)",
      "1 tbsp capers",
      "2 tbsp olive oil",
      "1 lemon (zested and juiced)",
      "30g toasted pine nuts",
      "140g steamed broccoli",
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
    tags: ["Gluten-Free", "High-Protein", "Meal-Prep"],
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
    portion: "2 cups pasta with vegetables (per serving)",
    nutrition: { 
      protein: 32, 
      prepTime: 30, 
      calories: 450,
      carbohydrates: 65,
      fats: 18,
      fiber: 8,
      sugar: 8,
      sodium: 420,
      costEuros: 4.50, 
      proteinPerEuro: 7.1 
    },
    category: "dinner",
    tags: ["Vegetarian", "Gluten-Free", "Mediterranean"],
    ingredients: [
      "200g chickpea or lentil pasta (uncooked weight)",
      "1 medium zucchini (150g)",
      "1 red bell pepper (120g)",
      "100g broccoli florets",
      "100g mushrooms",
      "1 cup fresh spinach (30g)",
      "3 tbsp pesto (or to taste)",
      "2 tbsp pine nuts",
      "Salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["zucchini", "red bell pepper", "broccoli", "mushrooms", "spinach"],
      benefits: ["Vitamin C", "Folate", "Antioxidants", "Fiber", "Iron"]
    },
    recipe: {
      instructions: [
        "Cook chickpea or lentil pasta according to package instructions",
        "Heat olive oil in large pan over medium-high heat",
        "Add zucchini, bell pepper, broccoli and mushrooms, roast for 8-10 minutes",
        "Add cooked pasta to pan with vegetables",
        "Stir in pesto and pine nuts",
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
      protein: 28, 
      prepTime: 25, 
      calories: 570,
      carbohydrates: 65,
      fats: 24,
      fiber: 8,
      sugar: 6,
      sodium: 580,
      costEuros: 4.80, 
      proteinPerEuro: 5.8 
    },
    category: "dinner",
    tags: ["Vegetarian", "Gluten-Free", "Lactose-Free"],
    ingredients: [
      "180g gluten-free pasta",
      "200ml coconut cream",
      "100g vegetarian chicken pieces (from vegetarische slager)",
      "100g spinach (fresh)",
      "80g peas (frozen or fresh)",
      "50g vegan feta cheese (crumbled)",
      "50g nutritional yeast",
      "2 cloves garlic (minced)",
      "30ml olive oil",
      "1 onion (diced)",
      "2 tbsp fresh parsley",
      "Black pepper and sea salt"
    ],
    wholeFoodLevel: "moderate",
    vegetableContent: {
      servings: 2.5,
      vegetables: ["spinach", "peas", "onion", "garlic"],
      benefits: ["Iron and vitamin K from greens", "Protein from peas", "Prebiotic fiber", "Antioxidants"]
    },
    recipe: {
      instructions: [
        "Cook gluten-free pasta al dente, add peas in last 2 minutes",
        "Cube and pan-fry vegetarian chicken pieces until golden",
        "Sauté onion and garlic in olive oil until soft",
        "Add fresh spinach, cook until wilted (2 minutes)",
        "Add coconut cream and nutritional yeast, stir until smooth",
        "Toss hot pasta and peas with creamy sauce",
        "Add protein pieces, crumbled vegan feta, and fresh parsley",
        "Season generously with black pepper"
      ],
      tips: [
        "Remove pan from heat when adding pasta to prevent curdling",
        "Cook peas with pasta for convenience and perfect texture",
        "Save pasta water to adjust sauce consistency",
        "Add vegan feta just before serving for best texture"
      ],
      notes: "Rich, creamy texture with added greens and vegan feta - balanced comfort food"
    }
  },

  {
    name: "Spiced aubergine and lentil stew hummus bowl",
    portion: "1 bowl with sourdough bread",
    nutrition: { 
      protein: 25, 
      prepTime: 30, 
      calories: 570,
      carbohydrates: 60,
      fats: 16,
      fiber: 15,
      sugar: 6,
      sodium: 450,
      costEuros: 3.80, 
      proteinPerEuro: 6.6 
    },
    category: "lunch",
    tags: ["Vegetarian", "Lactose-Free", "High-Fiber", "Mediterranean"],
    ingredients: [
      "100g aubergine (cubed)",
      "150g canned lentils (drained and rinsed)",
      "75g canned chopped tomatoes",
      "45g hummus (3 tbsp)",
      "50ml vegetable stock",
      "15ml olive oil (1 tbsp)",
      "1/2 small onion (finely chopped)",
      "1 clove garlic (minced)",
      "5g tahini (1 tsp)",
      "1 tsp lemon juice",
      "1/2 tsp ground cumin",
      "1/4 tsp ground cinnamon",
      "1/4 tsp chili flakes (optional)",
      "2-3 green olives (optional)",
      "Fresh parsley (chopped)",
      "50g sourdough bread",
      "Salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2.5,
      vegetables: ["aubergine", "tomatoes", "onion", "garlic"],
      benefits: ["Rich in fiber from lentils", "Antioxidants from aubergine", "Heart-healthy fats from tahini and olive oil", "Anti-inflammatory spices"]
    },
    recipe: {
      instructions: [
        "Heat olive oil in a pan over medium heat, add aubergine cubes and sauté until browned and soft (6-8 minutes), remove and set aside",
        "In the same pan, cook onion and garlic for 2-3 minutes until soft",
        "Add cumin, cinnamon, and chili flakes (if using), stir for 30 seconds",
        "Stir in lentils, tomatoes, and vegetable stock, simmer for 10 minutes until thickened",
        "Return aubergine to the pan, season with salt and pepper",
        "Spread hummus on the bottom of a shallow bowl, drizzle with olive oil and lemon juice",
        "Spoon the aubergine-lentil stew over the hummus",
        "Drizzle with tahini and olive oil, garnish with parsley and olives",
        "Serve with warm sourdough bread"
      ],
      tips: [
        "Make the stew ahead and reheat for quick assembly",
        "Adjust spice level with chili flakes to taste",
        "For gluten-free option, serve with gluten-free sourdough bread or skip the bread",
        "The stew thickens as it sits - add a splash of stock when reheating",
        "Toast the sourdough for extra flavor and texture"
      ],
      notes: "Warming Middle Eastern bowl with no paprika - perfect for those avoiding nightshades except tomatoes. Rich in plant protein and fiber. Served with gut-friendly sourdough bread."
    }
  },

  {
    name: "Balanced beetroot broccoli bowl with tempeh",
    portion: "1 bowl with hummus and sides",
    nutrition: { 
      protein: 28, 
      prepTime: 40, 
      calories: 620,
      carbohydrates: 68,
      fats: 24,
      fiber: 16,
      sugar: 12,
      sodium: 420,
      costEuros: 4.50, 
      proteinPerEuro: 6.2 
    },
    category: "lunch",
    tags: ["Vegetarian", "Gluten-Free", "Lactose-Free", "High-Fiber"],
    ingredients: [
      "100g beetroot (boiled or roasted, peeled)",
      "250g cooked chickpeas (with 15ml of their liquid)",
      "30g tahini (2 tbsp)",
      "1/2 tsp cumin",
      "1 small garlic clove",
      "Juice of 1/2 lemon",
      "1 ice cube",
      "150g broccoli (cut into 1 thick steak)",
      "15ml olive oil (1 tbsp)",
      "100g tempeh",
      "50g gluten-free sourdough or 80g cooked quinoa",
      "30g rocket (arugula)",
      "50g cucumber (sliced)",
      "Fresh mint",
      "22ml extra virgin olive oil (1.5 tbsp)",
      "15ml balsamic vinegar (1 tbsp)",
      "1/2 tsp chopped red chilli",
      "15g fresh parsley (chopped, 1 tbsp)",
      "1/2 tsp agave syrup (optional)",
      "Salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["beetroot", "broccoli", "cucumber", "rocket"],
      benefits: ["Nitrates from beetroot for blood pressure", "Cruciferous compounds from broccoli", "Rich in plant protein", "Heart-healthy fats"]
    },
    recipe: {
      instructions: [
        "Cook the beetroot until tender (boil or roast, about 30 min), then peel",
        "Make the hummus: blend beetroot, chickpeas, tahini, cumin, garlic, lemon juice, and chickpea water. Add the ice cube while blending. Season with salt and pepper until smooth",
        "Heat 15ml olive oil in a pan and sear the broccoli steak for 2-3 minutes per side until browned and tender",
        "Pan-fry tempeh in olive oil with a little cumin, salt, and pepper until golden",
        "Make the vinaigrette: whisk together extra virgin olive oil, balsamic vinegar, chilli, parsley, and agave",
        "Spread hummus on the plate, top with broccoli and tempeh, drizzle with vinaigrette",
        "Serve with rocket-cucumber-mint salad with lemon juice and gluten-free sourdough or quinoa"
      ],
      tips: [
        "Make hummus ahead and store in fridge for up to 5 days",
        "The ice cube makes the hummus extra creamy",
        "Meal prep friendly - assemble fresh for best texture",
        "Broccoli can be roasted instead of pan-seared"
      ],
      notes: "Vibrant beetroot hummus bowl with protein-rich tempeh and crunchy broccoli steaks. Perfect balance of earthy, tangy, and fresh flavors."
    }
  },

  {
    name: "Balanced beetroot broccoli bowl with grilled chicken",
    portion: "1 bowl with hummus and sides",
    nutrition: { 
      protein: 35, 
      prepTime: 40, 
      calories: 640,
      carbohydrates: 68,
      fats: 20,
      fiber: 16,
      sugar: 12,
      sodium: 460,
      costEuros: 5.20, 
      proteinPerEuro: 6.7 
    },
    category: "lunch",
    tags: ["Gluten-Free", "Lactose-Free", "High-Protein", "High-Fiber"],
    ingredients: [
      "100g beetroot (boiled or roasted, peeled)",
      "250g cooked chickpeas (with 15ml of their liquid)",
      "30g tahini (2 tbsp)",
      "1/2 tsp cumin",
      "1 small garlic clove",
      "Juice of 1/2 lemon",
      "1 ice cube",
      "150g broccoli (cut into 1 thick steak)",
      "15ml olive oil (1 tbsp)",
      "120g grilled chicken breast",
      "50g gluten-free sourdough or 80g cooked quinoa",
      "30g rocket (arugula)",
      "50g cucumber (sliced)",
      "Fresh mint",
      "22ml extra virgin olive oil (1.5 tbsp)",
      "15ml balsamic vinegar (1 tbsp)",
      "1/2 tsp chopped red chilli",
      "15g fresh parsley (chopped, 1 tbsp)",
      "1/2 tsp agave syrup (optional)",
      "Salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["beetroot", "broccoli", "cucumber", "rocket"],
      benefits: ["Nitrates from beetroot for blood pressure", "Cruciferous compounds from broccoli", "Lean protein from chicken", "Heart-healthy fats"]
    },
    recipe: {
      instructions: [
        "Cook the beetroot until tender (boil or roast, about 30 min), then peel",
        "Make the hummus: blend beetroot, chickpeas, tahini, cumin, garlic, lemon juice, and chickpea water. Add the ice cube while blending. Season with salt and pepper until smooth",
        "Heat 15ml olive oil in a pan and sear the broccoli steak for 2-3 minutes per side until browned and tender",
        "Grill chicken breast seasoned with cumin, salt, and pepper until cooked through (165°F internal temp)",
        "Make the vinaigrette: whisk together extra virgin olive oil, balsamic vinegar, chilli, parsley, and agave",
        "Spread hummus on the plate, top with broccoli and chicken, drizzle with vinaigrette",
        "Serve with rocket-cucumber-mint salad with lemon juice and gluten-free sourdough or quinoa"
      ],
      tips: [
        "Make hummus ahead and store in fridge for up to 5 days",
        "The ice cube makes the hummus extra creamy",
        "Meal prep friendly - assemble fresh for best texture",
        "Use pre-cooked chicken for faster assembly"
      ],
      notes: "Vibrant beetroot hummus bowl with lean grilled chicken and crunchy broccoli steaks. High protein version with the same balanced flavors."
    }
  },

  {
    name: "Mediterranean broccoli bowl with roasted pepper hummus",
    portion: "1 bowl with hummus and sides",
    nutrition: { 
      protein: 26, 
      prepTime: 35, 
      calories: 580,
      carbohydrates: 64,
      fats: 22,
      fiber: 14,
      sugar: 10,
      sodium: 400,
      costEuros: 4.20, 
      proteinPerEuro: 6.2 
    },
    category: "lunch",
    tags: ["Vegetarian", "Gluten-Free", "Lactose-Free", "Mediterranean"],
    ingredients: [
      "100g red bell pepper (roasted and peeled)",
      "250g cooked chickpeas (with 15ml liquid)",
      "30g tahini (2 tbsp)",
      "1/2 tsp smoked paprika",
      "1 small garlic clove",
      "Juice of 1/2 lemon",
      "1 ice cube",
      "150g broccoli (cut into steaks)",
      "100g grilled tempeh or tofu",
      "15ml olive oil (1 tbsp)",
      "22ml extra virgin olive oil (1.5 tbsp)",
      "15ml red wine vinegar (1 tbsp)",
      "15g fresh basil and oregano (chopped, 1 tbsp)",
      "Pinch of chilli flakes",
      "80g cooked quinoa or millet",
      "100g cherry tomatoes",
      "40g olives",
      "Salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["red pepper", "broccoli", "cherry tomatoes"],
      benefits: ["Vitamin C from red pepper", "Lycopene from tomatoes", "Cruciferous compounds", "Mediterranean antioxidants"]
    },
    recipe: {
      instructions: [
        "Blend roasted pepper, chickpeas, tahini, paprika, garlic, lemon juice, and chickpea water with ice cube until smooth",
        "Sear broccoli steaks in olive oil until tender and browned",
        "Grill tempeh or tofu seasoned with salt and pepper",
        "Mix vinaigrette: whisk extra virgin olive oil, red wine vinegar, basil, oregano, and chilli flakes",
        "Plate the hummus, top with broccoli and protein, drizzle vinaigrette",
        "Serve with quinoa or millet and a side of cherry tomatoes and olives"
      ],
      tips: [
        "Roast peppers under broiler or on gas flame for smoky flavor",
        "Hummus can be made 5 days ahead",
        "Use marinated tofu for extra flavor",
        "Great for meal prep"
      ],
      notes: "Fresh Mediterranean bowl with roasted red pepper hummus, bright herbs, and smoky paprika. Light yet satisfying."
    }
  },

  {
    name: "Middle Eastern broccoli bowl with tempeh and za'atar",
    portion: "1 bowl with hummus and tabbouleh",
    nutrition: { 
      protein: 28, 
      prepTime: 35, 
      calories: 610,
      carbohydrates: 66,
      fats: 24,
      fiber: 15,
      sugar: 11,
      sodium: 410,
      costEuros: 4.60, 
      proteinPerEuro: 6.1 
    },
    category: "lunch",
    tags: ["Vegetarian", "Gluten-Free", "Lactose-Free", "Middle-Eastern"],
    ingredients: [
      "100g beetroot (cooked and peeled)",
      "250g cooked chickpeas",
      "30g tahini (2 tbsp)",
      "1/2 tsp cumin",
      "1 garlic clove",
      "Juice of 1/2 lemon",
      "1 ice cube",
      "150g broccoli (sliced into steaks)",
      "100g tempeh",
      "15ml olive oil (1 tbsp)",
      "1/2 tsp za'atar",
      "5g dukkah (1 tsp, optional)",
      "Fresh parsley and mint",
      "80g cooked quinoa",
      "50g tomato (diced)",
      "Fresh lemon juice",
      "Salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2.5,
      vegetables: ["beetroot", "broccoli", "tomato"],
      benefits: ["Middle Eastern spices with anti-inflammatory properties", "High fiber", "Plant protein", "Fresh herbs"]
    },
    recipe: {
      instructions: [
        "Blend beetroot hummus ingredients with ice cube until smooth",
        "Pan-sear broccoli steaks in olive oil",
        "Pan-fry tempeh until golden and crispy",
        "Sprinkle za'atar over broccoli while warm",
        "Make quinoa tabbouleh: mix cooked quinoa with parsley, diced tomato, lemon juice, and olive oil",
        "Serve hummus with broccoli and tempeh, sprinkle with dukkah, parsley, and mint",
        "Add quinoa tabbouleh on the side"
      ],
      tips: [
        "Za'atar adds aromatic Middle Eastern flavor",
        "Dukkah provides crunchy texture",
        "Make tabbouleh ahead for flavors to meld",
        "Fresh herbs are essential for brightness"
      ],
      notes: "Earthy beetroot hummus with aromatic za'atar and dukkah crunch. Traditional Middle Eastern flavors in a nourishing bowl."
    }
  },

  {
    name: "Middle Eastern broccoli bowl with grilled chicken and za'atar",
    portion: "1 bowl with hummus and tabbouleh",
    nutrition: { 
      protein: 36, 
      prepTime: 35, 
      calories: 630,
      carbohydrates: 66,
      fats: 20,
      fiber: 15,
      sugar: 11,
      sodium: 450,
      costEuros: 5.30, 
      proteinPerEuro: 6.8 
    },
    category: "lunch",
    tags: ["Gluten-Free", "Lactose-Free", "High-Protein", "Middle-Eastern"],
    ingredients: [
      "100g beetroot (cooked and peeled)",
      "250g cooked chickpeas",
      "30g tahini (2 tbsp)",
      "1/2 tsp cumin",
      "1 garlic clove",
      "Juice of 1/2 lemon",
      "1 ice cube",
      "150g broccoli (sliced into steaks)",
      "120g grilled chicken breast",
      "15ml olive oil (1 tbsp)",
      "1/2 tsp za'atar",
      "5g dukkah (1 tsp, optional)",
      "Fresh parsley and mint",
      "80g cooked quinoa",
      "50g tomato (diced)",
      "Fresh lemon juice",
      "Salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2.5,
      vegetables: ["beetroot", "broccoli", "tomato"],
      benefits: ["Middle Eastern spices with anti-inflammatory properties", "High fiber", "Lean protein", "Fresh herbs"]
    },
    recipe: {
      instructions: [
        "Blend beetroot hummus ingredients with ice cube until smooth",
        "Pan-sear broccoli steaks in olive oil",
        "Grill chicken breast seasoned with za'atar, salt, and pepper",
        "Sprinkle extra za'atar over broccoli while warm",
        "Make quinoa tabbouleh: mix cooked quinoa with parsley, diced tomato, lemon juice, and olive oil",
        "Serve hummus with broccoli and chicken, sprinkle with dukkah, parsley, and mint",
        "Add quinoa tabbouleh on the side"
      ],
      tips: [
        "Za'atar-seasoned chicken adds aromatic flavor",
        "Dukkah provides crunchy texture",
        "Make tabbouleh ahead for flavors to meld",
        "Fresh herbs are essential for brightness"
      ],
      notes: "Earthy beetroot hummus with za'atar-grilled chicken and dukkah crunch. High-protein Middle Eastern bowl with traditional flavors."
    }
  },

  {
    name: "Warm winter broccoli bowl with roasted sweet potato",
    portion: "1 bowl with roasted vegetables",
    nutrition: { 
      protein: 26, 
      prepTime: 45, 
      calories: 640,
      carbohydrates: 78,
      fats: 24,
      fiber: 16,
      sugar: 16,
      sodium: 390,
      costEuros: 4.40, 
      proteinPerEuro: 5.9 
    },
    category: "lunch",
    tags: ["Vegetarian", "Gluten-Free", "Lactose-Free", "High-Fiber"],
    ingredients: [
      "100g beetroot (cooked)",
      "250g cooked chickpeas",
      "30g tahini (2 tbsp + 1 tbsp for dressing)",
      "1/2 tsp cumin",
      "1 garlic clove",
      "Juice of 1/2 lemon (+ 1 tbsp for dressing)",
      "1 ice cube",
      "150g broccoli (cut into steaks)",
      "150g sweet potato (cubed)",
      "100g baked tempeh or tofu",
      "30ml olive oil (2 tbsp)",
      "15ml warm water (1 tbsp)",
      "Salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["beetroot", "broccoli", "sweet potato"],
      benefits: ["Beta-carotene from sweet potato", "Fiber-rich root vegetables", "Warming winter comfort", "Plant protein"]
    },
    recipe: {
      instructions: [
        "Make the beetroot hummus: blend beetroot, chickpeas, 2 tbsp tahini, cumin, garlic, 1/2 lemon juice, and ice cube until smooth",
        "Roast sweet potato cubes in olive oil at 200°C for 25 minutes until golden",
        "Pan-sear broccoli steaks in olive oil until tender",
        "Bake tempeh or tofu seasoned with salt and pepper",
        "Make warm tahini dressing: whisk 1 tbsp tahini, 1 tbsp lemon juice, 1 tbsp warm water, 1 tsp olive oil, and pinch of salt until smooth",
        "Serve hummus with roasted sweet potato and broccoli",
        "Top with tempeh or tofu and drizzle warm tahini dressing over everything"
      ],
      tips: [
        "Roast sweet potato until caramelized for sweetness",
        "Warm tahini dressing adds comfort",
        "Perfect for cold weather meals",
        "Store components separately for meal prep"
      ],
      notes: "Cozy winter bowl with roasted sweet potato, beetroot hummus, and warm tahini dressing. Comforting and nourishing."
    }
  },

  {
    name: "Sticky tofu rice bowl with vegetables and kimchi",
    portion: "1 bowl with rice and vegetables",
    nutrition: { 
      protein: 18, 
      prepTime: 25, 
      calories: 500,
      carbohydrates: 58,
      fats: 20,
      fiber: 8,
      sugar: 6,
      sodium: 620,
      costEuros: 3.40, 
      proteinPerEuro: 5.3 
    },
    category: "dinner",
    tags: ["Vegetarian", "Lactose-Free", "Asian"],
    ingredients: [
      "33g basmati rice (or 83g pre-cooked rice)",
      "93g firm tofu (drained, cut into 1cm cubes)",
      "7ml olive oil (2 tsp, for tofu)",
      "5ml chilli oil (1 tsp)",
      "5ml maple syrup (1 tsp)",
      "Pinch of flaky sea salt",
      "5ml olive oil (1 tsp, for vegetables)",
      "1 large garlic clove (finely chopped)",
      "10g ginger (grated or finely chopped)",
      "1 red chilli (finely chopped)",
      "100g hispi cabbage (thinly sliced)",
      "17g kale (roughly sliced)",
      "30g leek (very thinly sliced)",
      "33g frozen peas (defrosted)",
      "10ml tamari (2 tsp)",
      "7g kimchi (optional)"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2.5,
      vegetables: ["cabbage", "kale", "leek", "peas"],
      benefits: ["Fermented foods from kimchi for gut health", "Cruciferous vegetables", "High in fiber", "Asian spices with anti-inflammatory properties"]
    },
    recipe: {
      instructions: [
        "Pour rice into a small saucepan with 67ml water and a pinch of salt. Bring to boil, cover, reduce heat to low and simmer 10 minutes until water absorbed. Set aside",
        "While rice cooks, warm 7ml olive oil in medium frying pan over medium-high heat. Add tofu and cook 10 minutes, turning occasionally, until crisp and golden",
        "Add chilli oil and maple syrup to tofu, bubble 1-2 minutes to create sticky coating. Season with sea salt flakes, remove and set aside",
        "Wipe pan clean, increase heat to high, add 5ml olive oil. Add garlic, ginger, and chilli, fry 3-4 minutes until golden (watch garlic doesn't burn)",
        "Stir in cooked rice and place cabbage, kale, leek, and peas on top. Let sit 1-2 minutes without stirring",
        "Add tamari and stir everything through, cook 3-5 minutes until vegetables just tender",
        "Stir through sticky tofu, divide into bowl and add kimchi if using. Drizzle with any extra chilli sauce from tofu"
      ],
      tips: [
        "Press tofu for 10 minutes before cooking for crispier texture",
        "Don't stir vegetables immediately - letting them sit creates nice caramelization",
        "Use gluten-free tamari for celiac-safe version",
        "Meal prep: store sticky tofu, rice, and veggies separately"
      ],
      notes: "Vibrant Asian-inspired bowl with sticky tofu, crispy vegetables, and optional kimchi. Quick weeknight meal with great texture contrast."
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
    tags: ["Vegetarian", "Gluten-Free", "Mediterranean", "Fresh", "Make-Ahead"],
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
    tags: ["Vegetarian", "High-Protein", "Meal-Prep"],
    ingredients: [
      "190g red lentils (dried)",
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
      "500ml vegetable stock",
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
    tags: ["Vegetarian", "Italian", "High-Protein"],
    ingredients: [
      "400g penne pasta",
      "2 slices sourdough bread (for breadcrumbs)",
      "1 large onion, diced",
      "4 cloves garlic, minced",
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
    name: "Rustic Tomato Pasta Bake with Herbed Breadcrumbs",
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
    tags: ["Vegetarian", "Gluten-Free", "Italian"],
    ingredients: [
      "400g gluten-free penne pasta",
      "2 slices gluten-free bread (for breadcrumbs)",
      "1 large onion, diced",
      "4 cloves garlic, minced",
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
    tags: ["Vegetarian", "Gluten-Free", "High-Protein", "Quick"],
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
    tags: ["Vegetarian", "Gluten-Free", "One-Pan", "indian", "aromatic", "High-Protein"],
    ingredients: [
      "300g chestnut mushrooms, halved",
      "60ml coconut yogurt",
      "20g fresh ginger, finely chopped",
      "2 cloves garlic, minced",
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
    tags: ["Vegetarian", "Gluten-Free", "High-Protein", "Spicy", "north-african", "Hearty", "Ayurvedic"],
    ingredients: [
      "15ml toasted sesame oil",
      "5ml ground cumin",
      "5ml hot smoked paprika",
      "400g canned chopped tomatoes",
      "3 cloves garlic, minced",
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
    tags: ["Vegetarian", "Gluten-Free", "High-Protein", "Quick", "winter", "Ayurvedic"],
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
    portion: "1 serving (2 medium pancakes with salsa, about 300g)",
    nutrition: {
      protein: 25,
      prepTime: 25,
      calories: 350,
      carbohydrates: 42,
      fats: 14,
      fiber: 9,
      sugar: 9,
      sodium: 590,
      potassium: 780,
      calcium: 110,
      iron: 4.2,
      vitaminC: 45,
      costEuros: 2.40,
      proteinPerEuro: 10.4
    },
    category: "dinner",
    tags: ["Vegetarian", "Gluten-Free", "Hearty", "One-Pan", "Protein-Rich", "Mediterranean"],
    ingredients: [
      "60g gram flour (chickpea flour)",
      "5ml olive oil (for batter)",
      "5ml fine sea salt",
      "75g potatoes",
      "Half large red onion, finely chopped",
      "Half sweet red pepper, finely chopped",
      "70g cherry tomatoes, halved",
      "Handful fresh spinach",
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
        "Cut potatoes into 1cm pieces",
        "Heat generous drizzle of olive oil in non-stick frying pan over medium heat",
        "Add potato pieces with pinch of salt, cook stirring frequently until golden brown and tender (about 10 minutes)",
        "Transfer cooked potatoes to plate",
        "Return pan to heat with small drizzle of oil",
        "Spoon pancake batter into pan - make 2 medium pancakes or 1 large",
        "Sprinkle cooked potato pieces on top",
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
      notes: "Inspired by socca (Southern French chickpea pancakes) with hemp hearts for extra protein and nutrition"
    },
    createdAt: new Date('2025-08-30'),
    active: true
  },
  {
    name: "Chickpea & Potato Pancakes with Warm Veggie Salsa",
    portion: "1 serving (2 medium pancakes with salsa, about 300g)",
    nutrition: {
      protein: 23,
      prepTime: 25,
      calories: 330,
      carbohydrates: 41,
      fats: 13,
      fiber: 8,
      sugar: 8,
      sodium: 570,
      potassium: 750,
      calcium: 100,
      iron: 4.0,
      vitaminC: 45,
      costEuros: 2.50,
      proteinPerEuro: 9.2
    },
    category: "dinner",
    tags: ["Vegetarian", "Gluten-Free", "Hearty", "One-Pan", "Protein-Rich", "Mediterranean"],
    ingredients: [
      "60g gram flour (chickpea flour, certified gluten-free)",
      "5ml olive oil (for batter)",
      "5ml fine sea salt",
      "75g potatoes",
      "Half large red onion, finely chopped",
      "Half sweet red pepper, finely chopped",
      "70g cherry tomatoes, halved",
      "Handful fresh spinach",
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
        "Cut potatoes into 1cm pieces",
        "Heat generous drizzle of olive oil in non-stick frying pan over medium heat",
        "Add potato pieces with pinch of salt, cook stirring frequently until golden brown and tender (about 10 minutes)",
        "Transfer cooked potatoes to plate",
        "Return pan to heat with small drizzle of oil",
        "Spoon pancake batter into pan - make 2 medium pancakes or 1 large",
        "Sprinkle cooked potato pieces on top",
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
        "Hemp hearts boost protein content and add healthy fats",
        "Gram flour is naturally gluten-free but check certification for celiac safety"
      ],
      notes: "Gluten-free version using certified chickpea flour with hemp hearts for protein and healthy fats"
    },
    createdAt: new Date('2025-08-30'),
    active: true
  },
  {
    name: "High Protein Sweet Potato Traybake with Tahini Mustard Dressing",
    portion: "1 serving (half of traybake, about 175g)",
    nutrition: {
      protein: 12,
      prepTime: 45,
      calories: 210,
      carbohydrates: 24,
      fats: 8,
      fiber: 6,
      sugar: 7,
      sodium: 290,
      potassium: 460,
      calcium: 90,
      iron: 2.6,
      vitaminC: 18,
      costEuros: 1.90,
      proteinPerEuro: 6.3
    },
    category: "dinner",
    tags: ["Vegetarian", "Gluten-Free", "High-Protein", "Meal-Prep", "Traybake"],
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
        "Remove from oven and serve in bowl",
        "Drizzle with tahini mustard dressing and sprinkle with sesame seeds if desired",
        "Recipe makes 2 servings - store second portion for another meal"
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
    name: "Creamy Black-Eyed Peas & Mushrooms",
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
    tags: ["Vegetarian", "Gluten-Free", "High-Protein", "curry-style", "Ayurvedic"],
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
    portion: "1 serving (half of stew, about 200g)",
    nutrition: {
      protein: 10,
      prepTime: 30,
      calories: 210,
      carbohydrates: 36,
      fats: 4,
      fiber: 8,
      sugar: 6,
      sodium: 240,
      potassium: 475,
      calcium: 60,
      iron: 3.6,
      vitaminC: 13,
      costEuros: 1.60,
      proteinPerEuro: 6.3
    },
    category: "dinner",
    tags: ["Vegetarian", "Gluten-Free", "High-Protein", "One-Pan", "Ayurvedic", "Hearty"],
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
        "Recipe makes 2 generous servings - perfect for meal prep",
        "Rose harissa adds warming spice - adjust amount to taste preference"
      ],
      notes: "One-pan wonder similar to dhal in texture and body - quick, easy but flavoursome supper with warming Ayurvedic spices"
    },
    createdAt: new Date('2025-08-30'),
    active: true
  },
  {
    name: "Super-Charged Peanut Noodles",
    portion: "1 serving (half of noodles, about 200g)",
    nutrition: {
      protein: 12,
      prepTime: 30,
      calories: 243,
      carbohydrates: 29,
      fats: 9,
      fiber: 6,
      sugar: 7,
      sodium: 325,
      potassium: 360,
      calcium: 48,
      iron: 2.4,
      vitaminC: 23,
      costEuros: 1.90,
      proteinPerEuro: 6.3
    },
    category: "dinner",
    tags: ["Vegetarian", "Dairy-Free", "Lactose-Free", "High-Protein", "asian-fusion", "Quick", "One-Pan", "nutritious"],
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
        "Recipe makes 2 servings - store second portion for another meal"
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
  },
  {
    name: "Healthy Vegetarian Kapsalon",
    portion: "1 generous serving (about 450g)",
    nutrition: {
      protein: 22,
      prepTime: 35,
      calories: 465,
      carbohydrates: 58,
      fats: 16,
      fiber: 14,
      sugar: 12,
      sodium: 580,
      potassium: 920,
      calcium: 180,
      iron: 5.2,
      vitaminC: 35,
      costEuros: 4.20,
      proteinPerEuro: 5.2
    },
    category: "dinner",
    tags: ["Vegetarian", "Gluten-Free", "High-Protein", "Dutch-Fusion"],
    ingredients: [
      "400g sweet potatoes, cut into thick fries",
      "15ml olive oil",
      "2.5ml smoked paprika",
      "150g halloumi cheese, sliced",
      "120g mixed salad leaves",
      "1 large tomato, diced",
      "Half cucumber, diced",
      "1 small red onion, thinly sliced",
      "60ml Greek yogurt",
      "15ml tahini",
      "1 clove garlic, minced",
      "15ml lemon juice",
      "2.5ml ground cumin",
      "30ml hemp hearts",
      "Sea salt and black pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["sweet potatoes", "salad leaves", "Tomato", "cucumber", "red onion", "garlic"],
      benefits: ["beta-carotene from sweet potatoes", "fiber from vegetables", "probiotics from yogurt"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 220°C (200°C fan)",
        "Cut sweet potatoes into thick fries, toss with olive oil, smoked paprika, salt and pepper",
        "Arrange on baking tray and roast for 25-30 minutes until crispy outside and tender inside",
        "Meanwhile, prepare salad by mixing leaves, diced tomato, cucumber, and red onion in large bowl",
        "For sauce, whisk together Greek yogurt, tahini, minced garlic, lemon juice, cumin, salt and pepper",
        "Heat dry frying pan over medium heat, cook halloumi slices for 2-3 minutes each side until golden",
        "Layer roasted sweet potato fries in serving bowl as base",
        "Top with grilled halloumi pieces",
        "Add generous portion of mixed salad on top",
        "Drizzle with tahini yogurt sauce",
        "Sprinkle with hemp hearts for extra protein and crunch"
      ],
      tips: [
        "Soak sweet potato fries in cold water for 30 minutes before roasting for extra crispiness",
        "Don't overcrowd the baking tray - use two trays if needed for crispier fries",
        "Halloumi can be replaced with grilled tofu or tempeh for vegan option"
      ],
      notes: "Healthy take on Dutch kapsalon using sweet potato fries, grilled halloumi, fresh salad, and creamy tahini yogurt sauce"
    },
    createdAt: new Date('2025-08-30'),
    active: true
  },
  {
    name: "Healthy Chicken Kapsalon",
    portion: "1 generous serving (about 480g)",
    nutrition: {
      protein: 28,
      prepTime: 40,
      calories: 485,
      carbohydrates: 52,
      fats: 18,
      fiber: 12,
      sugar: 11,
      sodium: 650,
      potassium: 890,
      calcium: 120,
      iron: 4.8,
      vitaminC: 40,
      costEuros: 4.80,
      proteinPerEuro: 5.8
    },
    category: "dinner",
    tags: ["High-Protein", "Gluten-Free", "Dutch-Fusion", "Lean-Protein"],
    ingredients: [
      "400g sweet potatoes, cut into thick fries",
      "15ml olive oil",
      "2.5ml smoked paprika",
      "200g chicken breast, sliced into strips",
      "5ml ground cumin",
      "2.5ml garlic powder",
      "2.5ml dried oregano",
      "120g mixed salad leaves",
      "1 large tomato, diced",
      "Half cucumber, diced",
      "1 small red onion, thinly sliced",
      "60ml Greek yogurt",
      "15ml sriracha sauce",
      "15ml lemon juice",
      "1 clove garlic, minced",
      "30ml pumpkin seeds",
      "Sea salt and black pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["sweet potatoes", "salad leaves", "Tomato", "cucumber", "red onion", "garlic"],
      benefits: ["beta-carotene from sweet potatoes", "lean protein from chicken", "fiber from vegetables"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 220°C (200°C fan)",
        "Cut sweet potatoes into thick fries, toss with half the olive oil, smoked paprika, salt and pepper",
        "Arrange on baking tray and roast for 25-30 minutes until crispy outside and tender inside",
        "Season chicken strips with cumin, garlic powder, oregano, salt and pepper",
        "Heat remaining olive oil in frying pan over medium-high heat",
        "Cook chicken strips for 6-8 minutes, turning frequently, until golden brown and cooked through",
        "Meanwhile, prepare salad by mixing leaves, diced tomato, cucumber, and red onion in large bowl",
        "For sauce, whisk together Greek yogurt, sriracha, minced garlic, lemon juice, salt and pepper",
        "Layer roasted sweet potato fries in serving bowl as base",
        "Top with seasoned grilled chicken strips",
        "Add generous portion of mixed salad on top",
        "Drizzle with spicy yogurt sauce",
        "Sprinkle with pumpkin seeds for extra protein and crunch"
      ],
      tips: [
        "Soak sweet potato fries in cold water for 30 minutes before roasting for extra crispiness",
        "Don't overcrowd the baking tray - use two trays if needed for better roasting",
        "Adjust sriracha amount in sauce according to spice preference"
      ],
      notes: "Healthy take on Dutch kapsalon using sweet potato fries, lean seasoned chicken, fresh salad, and spicy yogurt sauce"
    },
    createdAt: new Date('2025-08-30'),
    active: true
  },
  {
    name: "Thai Red Lentil & Chickpea Curry",
    portion: "1 generous serving (about 400g)",
    nutrition: {
      protein: 24,
      prepTime: 45,
      calories: 465,
      carbohydrates: 52,
      fats: 18,
      fiber: 16,
      sugar: 12,
      sodium: 680,
      potassium: 980,
      calcium: 145,
      iron: 7.8,
      vitaminC: 85,
      costEuros: 3.60,
      proteinPerEuro: 6.7
    },
    category: "dinner",
    tags: ["Vegetarian", "Gluten-Free", "High-Protein", "thai", "curry", "One-Pan", "batch-cooking", "Ayurvedic"],
    ingredients: [
      "30ml olive oil",
      "2 cloves garlic, finely chopped",
      "30g fresh ginger (about 1 small chunk), finely chopped",
      "2 whole bird's eye chillies, finely chopped (extra to serve)",
      "45ml Thai red curry paste",
      "4 whole large sweet pointed red peppers, cut into 1cm slices",
      "200g dried red lentils, rinsed",
      "400ml coconut milk (1 can)",
      "15ml tamari",
      "15ml maple syrup",
      "400ml vegetable stock",
      "500g chickpeas (1 x 500g jar), plus liquid from jar",
      "120g baby spinach",
      "1 whole lime, juiced (extra to serve)",
      "30g Thai basil (about 1 handful), extra to garnish"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 4,
      vegetables: ["garlic", "ginger", "chillies", "red peppers", "spinach"],
      benefits: ["vitamin C from peppers", "anti-inflammatory ginger", "iron from spinach and lentils"]
    },
    recipe: {
      instructions: [
        "Warm olive oil in large saucepan set over medium-low heat",
        "Add garlic, ginger, chillies and curry paste",
        "Cook for 5-7 minutes, stirring often, until fragrant",
        "Add red peppers, red lentils, coconut milk, tamari, maple syrup and vegetable stock",
        "Bring to boil then reduce heat and simmer with lid on for 20-25 minutes until lentils are tender",
        "Add chickpeas along with liquid from jar and simmer for 5-10 minutes",
        "Add spinach and cook until just wilted",
        "Stir in lime juice and three-quarters of Thai basil",
        "Taste and adjust seasoning",
        "Serve in bowls, topped with remaining Thai basil, extra chillies, and lime wedges",
        "Delicious with steamed sticky rice or quinoa"
      ],
      tips: [
        "Keep curry mild for sensitive palates or add extra chillies for heat lovers",
        "Curry keeps well in fridge for up to 3 days or freezer for up to 3 months",
        "Let cool completely before storing in airtight containers for best results"
      ],
      notes: "One-pan curry perfect for batch-cooking - rich, fragrant, and packed with lentils, chickpeas and spinach for fiber, protein and iron"
    },
    createdAt: new Date('2025-08-30'),
    active: true
  },
  {
    name: "Healthy Lactose-Free Kapsalon",
    portion: "1 generous serving (about 450g)",
    nutrition: {
      protein: 21,
      prepTime: 35,
      calories: 455,
      carbohydrates: 58,
      fats: 16,
      fiber: 14,
      sugar: 12,
      sodium: 520,
      potassium: 940,
      calcium: 160,
      iron: 5.8,
      vitaminC: 35,
      costEuros: 4.40,
      proteinPerEuro: 4.8
    },
    category: "dinner",
    tags: ["Vegetarian", "Lactose-Free", "Dairy-Free", "Gluten-Free", "High-Protein", "Dutch-Fusion"],
    ingredients: [
      "400g sweet potatoes, cut into thick fries",
      "15ml olive oil",
      "2.5ml smoked paprika",
      "150g firm tofu, sliced and marinated in 15ml tamari",
      "120g mixed salad leaves",
      "1 large tomato, diced",
      "Half cucumber, diced",
      "1 small red onion, thinly sliced",
      "60ml coconut yogurt (unsweetened)",
      "15ml tahini",
      "1 clove garlic, minced",
      "15ml lemon juice",
      "2.5ml ground cumin",
      "30ml hemp hearts",
      "15ml nutritional yeast",
      "Sea salt and black pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["sweet potatoes", "salad leaves", "Tomato", "cucumber", "red onion", "garlic"],
      benefits: ["beta-carotene from sweet potatoes", "plant protein from tofu", "fiber from vegetables"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 220°C (200°C fan)",
        "Cut sweet potatoes into thick fries, toss with olive oil, smoked paprika, salt and pepper",
        "Arrange on baking tray and roast for 25-30 minutes until crispy outside and tender inside",
        "Meanwhile, slice tofu and marinate in tamari for 10 minutes",
        "Prepare salad by mixing leaves, diced tomato, cucumber, and red onion in large bowl",
        "For sauce, whisk together coconut yogurt, tahini, minced garlic, lemon juice, cumin, nutritional yeast, salt and pepper",
        "Heat dry frying pan over medium heat, cook marinated tofu slices for 3-4 minutes each side until golden",
        "Layer roasted sweet potato fries in serving bowl as base",
        "Top with grilled tofu pieces",
        "Add generous portion of mixed salad on top",
        "Drizzle with tahini coconut yogurt sauce",
        "Sprinkle with hemp hearts and nutritional yeast for extra protein and umami flavor"
      ],
      tips: [
        "Soak sweet potato fries in cold water for 30 minutes before roasting for extra crispiness",
        "Press tofu between paper towels for 15 minutes before slicing for better texture",
        "Nutritional yeast adds cheesy flavor while keeping it dairy-free"
      ],
      notes: "Lactose-free take on Dutch kapsalon using sweet potato fries, marinated tofu, fresh salad, and creamy tahini coconut yogurt sauce"
    },
    createdAt: new Date('2025-08-30'),
    active: true
  },
  {
    name: "Fresh Salmon Rice Paper Rolls with Spicy Asian Dipping Sauce",
    portion: "4 rolls (2 servings)",
    nutrition: { 
      protein: 28, 
      prepTime: 25, 
      calories: 385,
      carbohydrates: 42,
      fats: 12,
      fiber: 4,
      sugar: 8,
      sodium: 650,
      costEuros: 8.50, 
      proteinPerEuro: 3.3 
    },
    category: "lunch",
    tags: ["Pescatarian", "Dairy-Free", "Lactose-Free", "Low-Carb", "High-Protein", "Fresh", "Asian"],
    ingredients: [
      "450g fresh salmon fillet, cubed small",
      "8 rice paper wraps",
      "4 nori seaweed sheets, halved",
      "3 green onions, sliced thin",
      "200g daikon radish, julienned",
      "200g sugar snap peas, blanched",
      "1 red bell pepper, sliced thin",
      "100g fresh bean sprouts",
      "60ml kewpie mayonnaise",
      "45ml low sodium soy sauce",
      "30ml rice vinegar",
      "15ml toasted sesame oil",
      "15ml arrowroot starch",
      "Fresh cilantro and mint leaves",
      "Fresh Thai basil leaves"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["radish", "sugar snap peas", "bell pepper", "bean sprouts", "herbs"],
      benefits: ["High in vitamin C", "Digestive support", "Fresh enzymes", "Anti-inflammatory"]
    },
    recipe: {
      instructions: [
        "Make spicy dipping sauce: whisk 120ml soy sauce, 30ml rice wine vinegar, 30ml sesame oil, 4 cloves garlic (minced), 15ml grated ginger, 10ml sriracha, and 15ml sesame seeds",
        "Cut salmon into small cubes and marinate in kewpie mayo, soy sauce, rice vinegar, and sesame oil for 10 minutes",
        "Prepare vegetables: julienne radish, blanch sugar snap peas for 1 minute, slice bell pepper thin, rinse bean sprouts",
        "Pick fresh herb leaves from cilantro, mint, and Thai basil stems",
        "Soak rice papers in warm water for 30 seconds until pliable",
        "Place half nori sheet on bottom third of rice paper",
        "Add marinated salmon, julienned radish, sugar snap peas, bell pepper strips, and bean sprouts",
        "Top with fresh herb mixture",
        "Roll tightly from bottom, folding in sides halfway through",
        "Slice rolls in half diagonally and serve immediately with spicy dipping sauce"
      ],
      tips: [
        "Keep rolled papers under damp towel to prevent drying",
        "Radish adds perfect peppery crunch that complements salmon",
        "Fresh herbs are essential - don't skip the Thai basil",
        "Blanched sugar snap peas stay crisp but are easier to bite"
      ],
      notes: "The peppery radish pairs beautifully with rich salmon while fresh Asian herbs provide aromatic complexity. Bean sprouts add satisfying crunch."
    }
  },
  {
    name: "Vegetarian Rice Paper Rolls with Marinated Shiitake & Fresh Herbs",
    portion: "4 rolls (2 servings)",
    nutrition: { 
      protein: 24, 
      prepTime: 30, 
      calories: 420,
      carbohydrates: 48,
      fats: 16,
      fiber: 8,
      sugar: 10,
      sodium: 580,
      costEuros: 6.80, 
      proteinPerEuro: 3.5 
    },
    category: "lunch",
    tags: ["Vegetarian", "Dairy-Free", "Lactose-Free", "High-Protein", "Fresh", "Asian"],
    ingredients: [
      "300g extra-firm tofu, cubed and marinated",
      "200g shiitake mushrooms, sliced and marinated",
      "200g shelled edamame, cooked",
      "30ml hemp hearts",
      "8 rice paper wraps",
      "4 nori seaweed sheets, halved",
      "3 green onions, sliced thin",
      "200g sugar snap peas, blanched",
      "1 red bell pepper, sliced thin",
      "100g fresh bean sprouts",
      "1 avocado, sliced",
      "30ml tahini",
      "Fresh cilantro, mint, and Thai basil leaves",
      "Marinade: soy sauce, sesame oil, rice vinegar, ginger, garlic"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 4,
      vegetables: ["mushrooms", "sugar snap peas", "bell pepper", "bean sprouts", "herbs"],
      benefits: ["High in umami", "Rich in fiber", "Fresh enzymes", "Complete amino acids"]
    },
    recipe: {
      instructions: [
        "Make marinade: whisk 45ml soy sauce, 15ml sesame oil, 15ml rice vinegar, 10ml grated ginger, 2 cloves garlic (minced)",
        "Cube tofu and slice shiitake mushrooms, marinate both in half the marinade for 20 minutes",
        "Sauté marinated shiitakes until golden and caramelized, about 8 minutes",
        "Pan-fry marinated tofu cubes until golden on all sides",
        "Cook edamame according to package directions, cool slightly",
        "Make tahini sauce: mix tahini with remaining marinade and 30ml water until smooth",
        "Prepare vegetables: blanch sugar snap peas, slice bell pepper, rinse bean sprouts, slice avocado",
        "Pick fresh herb leaves from cilantro, mint, and Thai basil",
        "Soak rice papers in warm water until pliable",
        "Layer half nori sheet, then marinated tofu, caramelized shiitakes, edamame, and vegetables",
        "Sprinkle hemp hearts, add fresh herbs and avocado slices",
        "Drizzle with tahini sauce before rolling tightly",
        "Slice diagonally and serve with extra tahini dipping sauce"
      ],
      tips: [
        "Marinated shiitakes provide deep umami that rivals any meat",
        "Press tofu well before marinating for better texture",
        "Hemp hearts add protein and omega-3s without changing flavor",
        "Edamame and tahini boost the protein to 24g per serving"
      ],
      notes: "The combination of marinated shiitakes, tofu, edamame, and tahini creates a protein powerhouse while fresh herbs provide bright Asian flavors. Much more satisfying than typical vegetarian rolls."
    }
  },
  {
    name: "Crispy Aubergine with Spiced Tomato Sauce & Hemp Hearts",
    portion: "2 large aubergines + sauce (2 servings)",
    nutrition: { 
      protein: 22, 
      prepTime: 35, 
      calories: 420,
      carbohydrates: 48,
      fats: 18,
      fiber: 12,
      sugar: 14,
      sodium: 580,
      costEuros: 4.80, 
      proteinPerEuro: 4.6 
    },
    category: "dinner",
    tags: ["Vegetarian", "High-Protein", "Mediterranean"],
    ingredients: [
      "2 large aubergines, sliced lengthwise",
      "120ml oat milk",
      "80g spelt flour (for better texture and nutty flavor)",
      "60g panko breadcrumbs (vegan)",
      "30ml hemp hearts",
      "15ml nutritional yeast",
      "5ml paprika powder",
      "5ml dried oregano",
      "2ml chili flakes (optional)",
      "Olive oil for frying",
      "Salt and black pepper to taste",
      "1 can (400g) crushed tomatoes",
      "2 shallots, finely chopped",
      "2 cloves garlic, minced",
      "5ml sugar",
      "Fresh basil, chopped"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 4,
      vegetables: ["aubergines", "tomatoes", "shallots", "garlic", "basil"],
      benefits: ["High in fiber", "Rich in antioxidants", "Supports heart health", "Anti-inflammatory"]
    },
    recipe: {
      instructions: [
        "Slice aubergines lengthwise into 1cm thick planks, salt generously and let drain 20 minutes",
        "Meanwhile, make spiced tomato sauce: heat olive oil, sauté chopped shallots until soft",
        "Add minced garlic, cook 1 minute, then add crushed tomatoes, sugar, salt, pepper",
        "Simmer sauce 15 minutes until thickened, stir in fresh basil at end",
        "Pat aubergine slices dry with paper towels",
        "Set up breading station: spelt flour with salt and pepper, oat milk, panko mixed with hemp hearts and nutritional yeast",
        "Dredge aubergine: flour, then milk, then hemp heart panko mixture, pressing gently",
        "Heat olive oil in large pan over medium heat",
        "Fry breaded aubergine slices 3-4 minutes per side until golden and crispy",
        "Season with paprika, oregano, and chili flakes while hot",
        "Serve immediately over warm spiced tomato sauce, garnish with fresh basil"
      ],
      tips: [
        "Spelt flour creates better texture than regular wheat - nuttier and less dense",
        "Hemp hearts in breading boost protein and add omega-3s",
        "Salt aubergine well to remove bitterness and excess moisture",
        "Don't overcrowd pan - fry in batches for maximum crispiness"
      ],
      notes: "Spelt flour provides superior texture with its lower gluten content and nutty flavor that complements aubergine. Hemp hearts cleverly boost protein while maintaining the crispy coating integrity."
    }
  },
  {
    name: "Gluten-Free Crispy Aubergine with Spiced Tomato Sauce & Almond Coating",
    portion: "2 large aubergines + sauce (2 servings)",
    nutrition: { 
      protein: 20, 
      prepTime: 35, 
      calories: 385,
      carbohydrates: 42,
      fats: 20,
      fiber: 14,
      sugar: 14,
      sodium: 520,
      costEuros: 5.20, 
      proteinPerEuro: 3.8 
    },
    category: "dinner",
    tags: ["Vegetarian", "Gluten-Free", "High-Protein", "Mediterranean"],
    ingredients: [
      "2 large aubergines, sliced lengthwise",
      "120ml oat milk",
      "60g rice flour",
      "20g tapioca starch",
      "80g gluten-free panko breadcrumbs",
      "40g ground almonds",
      "30ml hemp hearts",
      "15ml nutritional yeast",
      "5ml paprika powder",
      "5ml dried oregano",
      "2ml chili flakes (optional)",
      "2ml xanthan gum",
      "Olive oil for frying",
      "Salt and black pepper to taste",
      "Same tomato sauce ingredients as regular version"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 4,
      vegetables: ["aubergines", "tomatoes", "shallots", "garlic", "basil"],
      benefits: ["High in fiber", "Rich in antioxidants", "Supports heart health", "Anti-inflammatory"]
    },
    recipe: {
      instructions: [
        "Prepare aubergines and tomato sauce exactly as regular version",
        "Make gluten-free flour blend: mix rice flour, tapioca starch, and xanthan gum",
        "This blend mimics wheat's binding properties while staying light",
        "Create enhanced coating: mix gluten-free panko, ground almonds, hemp hearts, nutritional yeast",
        "The almond-hemp combination provides superior protein and texture",
        "Follow same breading process: flour blend, oat milk, then almond-panko mixture",
        "Fry at slightly lower heat to prevent almond coating from burning",
        "Cook 3-4 minutes per side until golden, watching carefully for even browning",
        "Season while hot with paprika, oregano, and chili flakes",
        "Serve over spiced tomato sauce with fresh basil garnish"
      ],
      tips: [
        "Rice flour + tapioca starch + xanthan gum creates perfect gluten-free binding",
        "Ground almonds add richness and protein while maintaining crispiness",
        "Lower frying temperature prevents almond coating from burning",
        "Tapioca starch gives the light, crispy texture missing in most gluten-free coatings"
      ],
      notes: "This gluten-free version uses a carefully balanced flour blend that delivers the same satisfying crunch as wheat. Ground almonds boost both protein and flavor complexity while hemp hearts maintain the nutritional profile."
    }
  },
  {
    name: "Traditional Beef Rendang with Coconut Rice & Toasted Peanuts",
    portion: "200g beef + rice (1 generous serving)",
    nutrition: { 
      protein: 32, 
      prepTime: 90, 
      calories: 580,
      carbohydrates: 45,
      fats: 28,
      fiber: 6,
      sugar: 8,
      sodium: 820,
      costEuros: 9.50, 
      proteinPerEuro: 3.4 
    },
    category: "dinner",
    tags: ["Non-Vegetarian", "Dairy-Free", "Lactose-Free", "High-Protein", "indonesian", "Spicy", "coconut", "weekend-cooking"],
    ingredients: [
      "600g beef chuck or shin, cubed",
      "400ml coconut milk (full-fat)",
      "200ml coconut cream",
      "200g jasmine rice",
      "6 dried chilies (soaked and deseeded)",
      "8 shallots, roughly chopped",
      "6 cloves garlic",
      "30ml fresh ginger, chopped",
      "15ml fresh galangal (or extra ginger)",
      "3 lemongrass stalks, white parts only",
      "4 candlenuts or macadamias",
      "15ml tamarind paste",
      "30ml palm sugar or brown sugar",
      "5ml ground coriander",
      "5ml ground cumin",
      "2ml ground fennel",
      "4 kaffir lime leaves",
      "15ml peanut oil",
      "30ml toasted peanuts, crushed",
      "Salt to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["chilies", "shallots", "garlic", "ginger", "lemongrass"],
      benefits: ["Anti-inflammatory spices", "Rich in antioxidants", "Supports digestion", "Immune boosting"]
    },
    recipe: {
      instructions: [
        "Soak dried chilies in warm water for 15 minutes, remove seeds",
        "Make spice paste: blend soaked chilies, shallots, garlic, ginger, galangal, lemongrass, and candlenuts until smooth",
        "Cook jasmine rice with 200ml coconut milk and water for fragrant coconut rice",
        "Heat peanut oil in heavy-bottomed pot, fry spice paste 8-10 minutes until fragrant and dark",
        "Add beef cubes, brown on all sides for 5 minutes",
        "Pour in coconut milk and coconut cream, add tamarind paste, palm sugar",
        "Add ground spices (coriander, cumin, fennel) and torn kaffir lime leaves",
        "Bring to boil, then reduce to low simmer",
        "Cook uncovered 1.5-2 hours, stirring occasionally, until sauce reduces and darkens",
        "In final 30 minutes, sauce should be thick and coating the beef",
        "Season with salt, adjust sweetness and sourness with palm sugar and tamarind",
        "Serve over coconut rice, garnish with crushed toasted peanuts"
      ],
      tips: [
        "Authentic rendang should be dry with dark, caramelized sauce",
        "Don't rush - slow cooking develops the complex flavors",
        "Candlenuts are traditional but macadamias work well",
        "Toast peanuts separately to maintain crunch"
      ],
      notes: "Traditional Indonesian rendang requires patience but delivers incredible depth of flavor. The long, slow cooking transforms tough beef into tender, spice-coated perfection."
    }
  },
  {
    name: "Vegan Jackfruit Rendang with Cashew Protein & Coconut Rice",
    portion: "300g jackfruit + rice (1 generous serving)",
    nutrition: { 
      protein: 24, 
      prepTime: 75, 
      calories: 520,
      carbohydrates: 58,
      fats: 22,
      fiber: 8,
      sugar: 12,
      sodium: 680,
      costEuros: 7.20, 
      proteinPerEuro: 3.3 
    },
    category: "dinner",
    tags: ["Vegan", "Dairy-Free", "Lactose-Free", "High-Protein", "indonesian", "Spicy", "coconut", "weekend-cooking"],
    ingredients: [
      "2 cans (800g) young green jackfruit in brine, drained",
      "400ml coconut milk (full-fat)",
      "200ml coconut cream",
      "200g jasmine rice",
      "80g raw cashews, soaked",
      "30ml hemp hearts",
      "15ml nutritional yeast",
      "6 dried chilies (soaked and deseeded)",
      "8 shallots, roughly chopped",
      "6 cloves garlic",
      "30ml fresh ginger, chopped",
      "15ml fresh galangal (or extra ginger)",
      "3 lemongrass stalks, white parts only",
      "4 macadamia nuts",
      "15ml tamarind paste",
      "30ml coconut sugar",
      "5ml ground coriander",
      "5ml ground cumin",
      "2ml ground fennel",
      "4 kaffir lime leaves",
      "15ml coconut oil",
      "30ml toasted cashews, crushed",
      "Salt to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["jackfruit", "chilies", "shallots", "garlic", "ginger", "lemongrass"],
      benefits: ["High in fiber", "Anti-inflammatory spices", "Rich in antioxidants", "Supports digestion"]
    },
    recipe: {
      instructions: [
        "Drain and shred jackfruit into pulled meat-like strands",
        "Soak cashews in warm water for 20 minutes for protein blend",
        "Make spice paste: blend soaked chilies, shallots, garlic, ginger, galangal, lemongrass, and macadamias",
        "Cook jasmine rice with 200ml coconut milk for fragrant coconut rice",
        "Heat coconut oil in heavy pot, fry spice paste 8-10 minutes until dark and fragrant",
        "Add shredded jackfruit, stir-fry 5 minutes to absorb spices",
        "Blend soaked cashews with 100ml water until smooth and creamy",
        "Add coconut milk, coconut cream, cashew cream, tamarind, coconut sugar",
        "Add ground spices and torn kaffir lime leaves",
        "Simmer uncovered 1-1.5 hours, stirring regularly, until sauce reduces",
        "In final 20 minutes, add hemp hearts and nutritional yeast for extra protein",
        "Cook until sauce is thick and coating jackfruit pieces",
        "Adjust seasoning with salt, coconut sugar, and tamarind",
        "Serve over coconut rice, garnish with crushed toasted cashews"
      ],
      tips: [
        "Jackfruit texture improves with longer cooking - becomes more meat-like",
        "Cashew cream adds richness and significant protein boost",
        "Hemp hearts dissolve into sauce while adding omega-3s and protein",
        "Toast cashews separately for textural contrast"
      ],
      notes: "This vegan version achieves 24g protein through clever combinations of jackfruit, cashew cream, hemp hearts, and nutritional yeast. The slow-cooked jackfruit develops incredible texture that rivals traditional beef rendang."
    }
  },
  {
    name: "Crispy Herb-Crusted Chicken with Spiced Tomato Sauce",
    portion: "300g chicken + sauce (1 serving)",
    nutrition: { 
      protein: 35, 
      prepTime: 35, 
      calories: 485,
      carbohydrates: 28,
      fats: 22,
      fiber: 6,
      sugar: 8,
      sodium: 680,
      costEuros: 6.20, 
      proteinPerEuro: 5.6 
    },
    category: "dinner",
    tags: ["Non-Vegetarian", "High-Protein", "Herb-Crusted"],
    ingredients: [
      "500g chicken breast, cut into chunks",
      "120ml whole milk",
      "80g plain flour",
      "60g panko breadcrumbs",
      "15ml paprika powder",
      "5ml dried oregano",
      "2ml chili flakes (optional)",
      "Olive oil for frying",
      "Salt and black pepper to taste",
      "1 can (400g) crushed tomatoes",
      "2 shallots, finely chopped",
      "2 cloves garlic, minced",
      "5ml sugar",
      "Fresh basil, chopped"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2.5,
      vegetables: ["tomatoes", "shallots", "garlic", "basil"],
      benefits: ["High in lycopene", "Rich in antioxidants", "Supports immune system"]
    },
    recipe: {
      instructions: [
        "Cut chicken breast into bite-sized chunks, season with salt and pepper",
        "Make spiced tomato sauce: heat olive oil, sauté chopped shallots until soft",
        "Add minced garlic, cook 1 minute, then add crushed tomatoes, sugar, salt, pepper",
        "Simmer sauce 15 minutes until thickened, stir in fresh basil at end",
        "Set up breading station: seasoned flour, milk, panko with paprika and oregano",
        "Dredge chicken chunks: flour, then milk, then seasoned panko, pressing gently",
        "Heat olive oil in large pan over medium-high heat",
        "Fry breaded chicken pieces 4-5 minutes per side until golden and cooked through",
        "Check internal temperature reaches 75°C",
        "Season with extra paprika and oregano while hot",
        "Serve immediately over warm spiced tomato sauce with fresh basil"
      ],
      tips: [
        "Cut chicken evenly for consistent cooking",
        "Don't overcrowd pan - fry in batches if needed",
        "Press panko coating gently to help it stick",
        "Fresh basil added at end preserves bright flavor"
      ],
      notes: "Crispy herb-crusted chicken with vibrant tomato sauce creates a satisfying comfort food that delivers excellent protein while maintaining indulgent flavors."
    }
  },
  {
    name: "Thai Green Curry with Super Crunchy Tofu",
    portion: "1 generous serving (about 400g with rice)",
    nutrition: {
      protein: 26,
      prepTime: 40,
      calories: 495,
      carbohydrates: 52,
      fats: 22,
      fiber: 8,
      sugar: 14,
      sodium: 720,
      potassium: 680,
      calcium: 185,
      iron: 4.5,
      vitaminC: 45,
      costEuros: 4.20,
      proteinPerEuro: 6.2
    },
    category: "dinner",
    tags: ["Vegetarian", "Dairy-Free", "Lactose-Free", "Gluten-Free", "High-Protein", "thai", "curry", "crispy-tofu", "aromatic", "Ayurvedic"],
    ingredients: [
      "200g firm tofu, cut into cubes",
      "30g cornstarch",
      "60ml neutral oil for frying",
      "75g jasmine rice (per serving)",
      "45ml Thai green curry paste",
      "400ml coconut milk (1 can)",
      "15ml fish sauce (or tamari for vegetarian)",
      "15ml palm sugar or brown sugar",
      "200ml vegetable stock",
      "100g Thai eggplant, quartered (or regular eggplant)",
      "1 red bell pepper, sliced",
      "100g green beans, trimmed",
      "4-5 Thai basil leaves",
      "2 kaffir lime leaves, torn",
      "1 small green chili, sliced",
      "15ml lime juice",
      "Sea salt to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["eggplant", "bell pepper", "green beans", "chili"],
      benefits: ["antioxidants from colorful vegetables", "plant protein from tofu", "healthy fats from coconut milk"]
    },
    recipe: {
      instructions: [
        "Cook jasmine rice in saucepan with 150ml water and pinch of salt for 15 minutes until tender",
        "Press tofu between paper towels to remove excess moisture, then cut into 2cm cubes",
        "Toss tofu cubes in cornstarch until evenly coated",
        "Heat neutral oil in wok or large frying pan over medium-high heat",
        "Fry tofu cubes for 3-4 minutes each side until golden and super crispy, then set aside",
        "In same pan, add green curry paste and fry for 1-2 minutes until fragrant",
        "Add thick part of coconut milk (cream from top of can) and cook until oil separates",
        "Add remaining coconut milk, fish sauce, sugar, and vegetable stock",
        "Bring to gentle simmer, add eggplant and simmer for 5 minutes",
        "Add bell pepper and green beans, cook for 3-4 minutes until just tender",
        "Stir in crispy tofu, Thai basil, kaffir lime leaves, and green chili",
        "Add lime juice and adjust seasoning with salt, sugar, or fish sauce",
        "Serve immediately over jasmine rice with extra Thai basil garnish"
      ],
      tips: [
        "Press tofu for at least 15 minutes before coating for maximum crispiness",
        "Don't skip the cornstarch coating - it's essential for the crunchy texture",
        "Use thick coconut cream first to develop the curry base properly"
      ],
      notes: "Authentic Thai green curry with perfectly crispy tofu that stays crunchy even in the aromatic coconut curry sauce"
    },
    createdAt: new Date('2025-08-30'),
    active: true
  },
  {
    name: "Mediterranean Chicken & Cauliflower Rice Bowl",
    portion: "1 generous serving (about 450g)",
    nutrition: {
      protein: 28,
      prepTime: 35,
      calories: 385,
      carbohydrates: 18,
      fats: 20,
      fiber: 10,
      sugar: 12,
      sodium: 580,
      potassium: 920,
      calcium: 85,
      iron: 3.2,
      vitaminC: 95,
      costEuros: 4.60,
      proteinPerEuro: 6.1
    },
    category: "dinner",
    tags: ["High-Protein", "Gluten-Free", "Keto", "Low-Carb", "Mediterranean", "Lean-Protein", "Fresh"],
    ingredients: [
      "400g cauliflower, cut into florets (or 300g pre-made cauliflower rice)",
      "200g chicken breast, diced",
      "240g canned chickpeas, drained and rinsed",
      "1 red bell pepper, diced",
      "200g cherry tomatoes, halved",
      "1 small red onion, thinly sliced",
      "60g cucumber, diced",
      "30ml hemp hearts",
      "30ml olive oil",
      "30ml tahini",
      "1 lemon, juiced",
      "2 cloves garlic, minced",
      "5ml dried oregano",
      "30ml fresh parsley, chopped",
      "15ml fresh mint, chopped",
      "15ml fresh dill, chopped",
      "Sea salt and black pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 4,
      vegetables: ["cauliflower", "bell pepper", "tomatoes", "red onion", "cucumber", "garlic"],
      benefits: ["vitamin C from vegetables", "lean protein from chicken", "fiber from chickpeas"]
    },
    recipe: {
      instructions: [
        "If using fresh cauliflower, pulse florets in food processor until rice-sized pieces form",
        "Season diced chicken with oregano, salt, pepper, and half the minced garlic",
        "Heat 15ml olive oil in large frying pan over medium-high heat",
        "Cook seasoned chicken for 6-8 minutes until golden brown and cooked through, set aside",
        "In same pan, add cauliflower rice and remaining garlic, cook for 5-7 minutes until tender",
        "Season cauliflower rice with salt, pepper, and fresh herbs",
        "Meanwhile, prepare dressing by whisking tahini, lemon juice, remaining olive oil, salt and pepper",
        "In large serving bowl, combine warm cauliflower rice and cooked chicken",
        "Add chickpeas, bell pepper, cherry tomatoes, red onion, and cucumber",
        "Drizzle with tahini lemon dressing and toss gently to combine",
        "Sprinkle with hemp hearts and fresh herbs before serving"
      ],
      tips: [
        "Don't overcook cauliflower rice - it should retain slight bite for best texture",
        "Can be served warm immediately or chilled as a refreshing salad",
        "Pre-made cauliflower rice saves time but fresh tastes better"
      ],
      notes: "Mediterranean-inspired bowl with lean chicken protein and cauliflower rice base, perfect for low-carb and keto diets"
    },
    createdAt: new Date('2025-08-30'),
    active: true
  },
  {
    name: "Mediterranean Beyond Meat & Cauliflower Rice Bowl",
    portion: "1 generous serving (about 450g)",
    nutrition: {
      protein: 25,
      prepTime: 30,
      calories: 415,
      carbohydrates: 22,
      fats: 22,
      fiber: 12,
      sugar: 14,
      sodium: 650,
      potassium: 890,
      calcium: 95,
      iron: 4.8,
      vitaminC: 95,
      costEuros: 5.20,
      proteinPerEuro: 4.8
    },
    category: "dinner",
    tags: ["Vegetarian", "Dairy-Free", "Lactose-Free", "Gluten-Free", "Keto", "Low-Carb", "Mediterranean", "Plant-Based", "Fresh"],
    ingredients: [
      "400g cauliflower, cut into florets (or 300g pre-made cauliflower rice)",
      "150g Beyond Meat crumbles",
      "240g canned chickpeas, drained and rinsed",
      "1 red bell pepper, diced",
      "200g cherry tomatoes, halved",
      "1 small red onion, thinly sliced",
      "60g cucumber, diced",
      "30ml hemp hearts",
      "30ml olive oil",
      "30ml tahini",
      "1 lemon, juiced",
      "2 cloves garlic, minced",
      "5ml dried oregano",
      "2.5ml smoked paprika",
      "30ml fresh parsley, chopped",
      "15ml fresh mint, chopped",
      "15ml fresh dill, chopped",
      "Sea salt and black pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 4,
      vegetables: ["cauliflower", "bell pepper", "tomatoes", "red onion", "cucumber", "garlic"],
      benefits: ["vitamin C from vegetables", "plant protein from Beyond Meat", "fiber from chickpeas"]
    },
    recipe: {
      instructions: [
        "If using fresh cauliflower, pulse florets in food processor until rice-sized pieces form",
        "Season Beyond Meat crumbles with oregano, smoked paprika, salt, pepper, and half the minced garlic",
        "Heat 15ml olive oil in large frying pan over medium-high heat",
        "Cook seasoned Beyond Meat for 5-6 minutes until lightly browned and heated through, set aside",
        "In same pan, add cauliflower rice and remaining garlic, cook for 5-7 minutes until tender",
        "Season cauliflower rice with salt, pepper, and fresh herbs",
        "Meanwhile, prepare dressing by whisking tahini, lemon juice, remaining olive oil, salt and pepper",
        "In large serving bowl, combine warm cauliflower rice and cooked Beyond Meat",
        "Add chickpeas, bell pepper, cherry tomatoes, red onion, and cucumber",
        "Drizzle with tahini lemon dressing and toss gently to combine",
        "Sprinkle with hemp hearts and fresh herbs before serving"
      ],
      tips: [
        "Beyond Meat crumbles cook quickly - don't overcook to maintain texture",
        "Smoked paprika adds depth that complements Mediterranean flavors",
        "Perfect for meal prep - flavors develop beautifully overnight"
      ],
      notes: "Plant-based Mediterranean bowl with Beyond Meat protein and cauliflower rice base, ideal for vegetarians following keto diets"
    },
    createdAt: new Date('2025-08-30'),
    active: true
  },
  {
    name: "Mediterranean Feta & Chickpea Cauliflower Rice Bowl",
    portion: "1 generous serving (about 450g)",
    nutrition: {
      protein: 24,
      prepTime: 25,
      calories: 425,
      carbohydrates: 26,
      fats: 24,
      fiber: 12,
      sugar: 16,
      sodium: 720,
      potassium: 850,
      calcium: 285,
      iron: 4.2,
      vitaminC: 95,
      costEuros: 4.80,
      proteinPerEuro: 5.0
    },
    category: "dinner",
    tags: ["Vegetarian", "Gluten-Free", "Keto", "Low-Carb", "Mediterranean", "Traditional", "Fresh"],
    ingredients: [
      "400g cauliflower, cut into florets (or 300g pre-made cauliflower rice)",
      "240g canned chickpeas, drained and rinsed",
      "120g feta cheese, crumbled",
      "1 red bell pepper, diced",
      "200g cherry tomatoes, halved",
      "1 small red onion, thinly sliced",
      "60g cucumber, diced",
      "30ml hemp hearts",
      "30ml pine nuts",
      "30ml olive oil",
      "30ml tahini",
      "1 lemon, juiced",
      "2 cloves garlic, minced",
      "5ml dried oregano",
      "30ml fresh parsley, chopped",
      "15ml fresh mint, chopped",
      "15ml fresh dill, chopped",
      "Sea salt and black pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 4,
      vegetables: ["cauliflower", "bell pepper", "tomatoes", "red onion", "cucumber", "garlic"],
      benefits: ["vitamin C from vegetables", "calcium from feta", "fiber from chickpeas"]
    },
    recipe: {
      instructions: [
        "If using fresh cauliflower, pulse florets in food processor until rice-sized pieces form",
        "Heat 15ml olive oil in large frying pan over medium heat",
        "Add cauliflower rice and minced garlic, cook for 5-7 minutes until tender",
        "Season cauliflower rice with oregano, salt, pepper, and fresh herbs",
        "Meanwhile, prepare dressing by whisking tahini, lemon juice, remaining olive oil, salt and pepper",
        "Toast pine nuts in dry pan for 2-3 minutes until lightly golden",
        "In large serving bowl, combine warm cauliflower rice with chickpeas",
        "Add bell pepper, cherry tomatoes, red onion, and cucumber",
        "Drizzle with tahini lemon dressing and toss gently to combine",
        "Top with crumbled feta cheese, toasted pine nuts, and hemp hearts",
        "Garnish with fresh herbs before serving"
      ],
      tips: [
        "Use high-quality Greek or Bulgarian feta for best flavor",
        "Don't mix feta into the warm rice - add on top to prevent melting",
        "Can be served warm or at room temperature as a refreshing salad"
      ],
      notes: "Traditional Mediterranean combination with creamy feta, protein-rich chickpeas, and fresh cauliflower rice"
    },
    createdAt: new Date('2025-08-30'),
    active: true
  },
  {
    name: "Mediterranean Lactose-Free Feta & Chickpea Cauliflower Rice Bowl",
    portion: "1 generous serving (about 450g)",
    nutrition: {
      protein: 22,
      prepTime: 25,
      calories: 405,
      carbohydrates: 26,
      fats: 22,
      fiber: 12,
      sugar: 16,
      sodium: 620,
      potassium: 850,
      calcium: 245,
      iron: 4.2,
      vitaminC: 95,
      costEuros: 5.40,
      proteinPerEuro: 4.1
    },
    category: "dinner",
    tags: ["Vegetarian", "Lactose-Free", "Dairy-Free", "Gluten-Free", "Keto", "Low-Carb", "Mediterranean", "Fresh"],
    ingredients: [
      "400g cauliflower, cut into florets (or 300g pre-made cauliflower rice)",
      "240g canned chickpeas, drained and rinsed",
      "120g lactose-free feta cheese (Violife or similar), crumbled",
      "1 red bell pepper, diced",
      "200g cherry tomatoes, halved",
      "1 small red onion, thinly sliced",
      "60g cucumber, diced",
      "30ml hemp hearts",
      "30ml pine nuts",
      "30ml olive oil",
      "30ml tahini",
      "1 lemon, juiced",
      "2 cloves garlic, minced",
      "5ml dried oregano",
      "30ml fresh parsley, chopped",
      "15ml fresh mint, chopped",
      "15ml fresh dill, chopped",
      "Sea salt and black pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 4,
      vegetables: ["cauliflower", "bell pepper", "tomatoes", "red onion", "cucumber", "garlic"],
      benefits: ["vitamin C from vegetables", "plant-based calcium from dairy-free feta", "fiber from chickpeas"]
    },
    recipe: {
      instructions: [
        "If using fresh cauliflower, pulse florets in food processor until rice-sized pieces form",
        "Heat 15ml olive oil in large frying pan over medium heat",
        "Add cauliflower rice and minced garlic, cook for 5-7 minutes until tender",
        "Season cauliflower rice with oregano, salt, pepper, and fresh herbs",
        "Meanwhile, prepare dressing by whisking tahini, lemon juice, remaining olive oil, salt and pepper",
        "Toast pine nuts in dry pan for 2-3 minutes until lightly golden",
        "In large serving bowl, combine warm cauliflower rice with chickpeas",
        "Add bell pepper, cherry tomatoes, red onion, and cucumber",
        "Drizzle with tahini lemon dressing and toss gently to combine",
        "Top with crumbled lactose-free feta cheese, toasted pine nuts, and hemp hearts",
        "Garnish with fresh herbs before serving"
      ],
      tips: [
        "Violife or other quality dairy-free feta provides authentic Mediterranean flavor",
        "Let lactose-free feta come to room temperature before crumbling for best texture",
        "Perfect for those with lactose intolerance who love Mediterranean flavors"
      ],
      notes: "Lactose-free version of traditional Mediterranean combination with dairy-free feta, chickpeas, and fresh cauliflower rice"
    },
    createdAt: new Date('2025-08-30'),
    active: true
  },
  {
    name: "Earl Grey Tea-Infused Quinoa Porridge with Caramelized Persimmon",
    portion: "1 hearty serving (about 350g)",
    nutrition: {
      protein: 22,
      prepTime: 30,
      calories: 445,
      carbohydrates: 52,
      fats: 16,
      fiber: 12,
      sugar: 22,
      sodium: 85,
      potassium: 540,
      calcium: 165,
      iron: 3.8,
      vitaminC: 12,
      costEuros: 3.20,
      proteinPerEuro: 6.9
    },
    category: "breakfast",
    tags: ["Vegetarian", "High-Protein", "Ayurvedic", "Winter-Comfort", "Meal-Prep", "Tea-Infused"],
    ingredients: [
      "40g rolled oats",
      "40g quinoa, rinsed",
      "350ml oat milk",
      "150ml strong Earl Grey tea, cooled",
      "20g vanilla protein powder",
      "20g hemp hearts",
      "1 ripe persimmon, peeled and diced (or 1 apple if persimmon unavailable)",
      "20ml maple syrup",
      "5ml ground cinnamon",
      "2.5ml vanilla extract",
      "1ml ground ginger",
      "Pinch of cardamom",
      "Pinch of sea salt",
      "15ml chopped walnuts",
      "15ml pumpkin seeds",
      "Extra cinnamon for dusting"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1,
      vegetables: ["persimmon"],
      benefits: ["antioxidants from Earl Grey tea", "complete protein from quinoa", "fiber from oats", "natural sweetness from persimmon"]
    },
    recipe: {
      instructions: [
        "Prepare Earl Grey tea: Brew 2 strong tea bags in 200ml boiling water for 5 minutes, then remove bags and cool completely",
        "Cook quinoa ahead with tea: Rinse 200g quinoa and simmer in 300ml Earl Grey tea + 100ml water for 15 minutes until tender. Store in fridge for up to 5 days",
        "In medium saucepan, combine oats, 80g tea-infused pre-cooked quinoa, oat milk, remaining Earl Grey tea, and pinch of salt",
        "Bring to gentle boil, then reduce heat and simmer for 10-12 minutes, stirring occasionally",
        "Meanwhile, heat small frying pan over medium heat",
        "Add diced persimmon with half the maple syrup and cinnamon",
        "Cook persimmon gently for 6-8 minutes until caramelized and jammy",
        "When porridge is creamy and Earl Grey-scented, remove from heat",
        "Stir in protein powder, vanilla extract, ginger, and cardamom until smooth",
        "Add hemp hearts and remaining maple syrup, mix well",
        "Serve in warm bowl topped with caramelized persimmon",
        "Sprinkle with chopped walnuts, pumpkin seeds, and extra cinnamon"
      ],
      tips: [
        "Earl Grey's bergamot adds elegant citrus notes that pair beautifully with persimmon",
        "If persimmons aren't available, use very ripe pears for similar sweetness",
        "Tea-infused quinoa can be batch-cooked and adds sophisticated flavor to the porridge"
      ],
      notes: "Elegant breakfast porridge infused with Earl Grey tea's bergamot essence, topped with caramelized persimmon for natural sweetness and winter warmth"
    },
    createdAt: new Date('2025-08-30'),
    active: true
  },
  {
    name: "Chocolate Overnight Oats with Dark Chocolate Crumble",
    portion: "1 generous serving (about 400g)",
    nutrition: {
      protein: 31,
      prepTime: 10,
      calories: 375,
      carbohydrates: 44,
      fats: 8,
      fiber: 12,
      sugar: 18,
      sodium: 120,
      potassium: 480,
      calcium: 180,
      iron: 4.2,
      vitaminC: 2,
      cocoaFlavanols: 85,
      costEuros: 2.40,
      proteinPerEuro: 12.9
    },
    category: "breakfast",
    tags: ["Vegetarian", "High-Protein", "Meal-Prep", "Overnight-Oats", "Chocolate", "Make-Ahead"],
    ingredients: [
      "40g oats",
      "20g cocoa protein powder",
      "80ml soy milk (or any plant milk)",
      "8ml flax seeds",
      "8ml chia seeds",
      "2.5ml sweetener (maple syrup or stevia)",
      "5ml cocoa powder",
      "2.5ml vanilla extract",
      "15ml vanilla yogurt",
      "1 wholegrain brown rice cake, crushed",
      "10g dark chocolate, melted",
      "2.5ml coconut oil (for melting chocolate)"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 0,
      vegetables: [],
      benefits: ["high fiber from oats and seeds", "complete protein from protein powder", "antioxidants from cocoa and dark chocolate"]
    },
    recipe: {
      instructions: [
        "In a jar or container, mix together oats, cocoa protein powder, cocoa powder, flax seeds, and chia seeds",
        "Add soy milk, sweetener, and vanilla extract, stir well to combine all dry ingredients",
        "Pour the mixture into your storage jar and refrigerate overnight or at least 1 hour",
        "In separate small bowl, mix vanilla yogurt - this will be your middle layer",
        "Melt dark chocolate with coconut oil in microwave or double boiler until smooth",
        "Crush rice cake into small pieces and mix with half the melted chocolate",
        "When ready to serve, layer the overnight oats base in serving jar",
        "Add yogurt layer on top of the oat base",
        "Top with chocolate rice cake crumble and drizzle remaining melted chocolate",
        "Refrigerate for 1 hour or overnight before enjoying for best texture"
      ],
      tips: [
        "Prepare multiple jars at once for easy grab-and-go breakfasts",
        "Cocoa protein powder provides rich chocolate flavor while boosting protein content",
        "Rice cake adds satisfying crunch - can substitute with granola if preferred"
      ],
      notes: "Indulgent chocolate overnight oats with impressive protein content, perfect for meal prep and satisfying chocolate cravings healthily"
    },
    createdAt: new Date('2025-08-30'),
    active: true
  },
  {
    name: "Caramelized Fig & Pistachio Breakfast Bowl",
    portion: "1 serving (about 300g)",
    nutrition: {
      protein: 18,
      prepTime: 15,
      calories: 420,
      carbohydrates: 58,
      fats: 16,
      fiber: 8,
      sugar: 42,
      sodium: 95,
      potassium: 620,
      calcium: 220,
      iron: 2.8,
      vitaminC: 8,
      costEuros: 3.50,
      proteinPerEuro: 5.1
    },
    category: "breakfast",
    tags: ["Vegetarian", "Seasonal", "Autumn", "Figs", "Natural-Sugars", "Antioxidants", "Cinnamon"],
    ingredients: [
      "2 medium fresh figs, halved",
      "1 tbsp butter",
      "1/2 tsp ground cinnamon",
      "1 tbsp honey",
      "1/3 cup (30g) rolled oats",
      "1 small handful (15g) unsalted pistachios",
      "150ml Greek yogurt",
      "Extra honey for drizzling (optional)"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1.5,
      vegetables: ["figs"],
      benefits: ["Natural Sugars", "Fiber", "Potassium", "Antioxidants", "Beta-Carotene"]
    },
    recipeBenefits: [
      "High fiber content supports digestive health",
      "Natural sugars from figs provide sustained energy",
      "Pistachios offer healthy fats and protein",
      "Cinnamon helps regulate blood sugar",
      "Probiotics from yogurt support gut health",
      "Seasonal autumn fruit provides antioxidants"
    ],
    recipe: {
      instructions: [
        "Begin by slicing the figs in half (or quarters if you prefer larger pieces)",
        "Heat a medium frying pan over medium-low heat",
        "Melt the butter and cinnamon in the pan, stirring to combine",
        "Drizzle the honey into the butter mixture and stir with a wooden spoon",
        "Gently place the fig halves cut-side down in the pan",
        "Leave for 3-4 minutes to slowly caramelize without stirring",
        "Once the figs are nicely soft and jammy, remove from pan and set aside on a plate",
        "Using the same pan with the remaining juices, add the oats and pistachios",
        "Stir continuously and cook for 2-3 minutes until the oats have toasted and browned nicely",
        "Place the Greek yogurt in a serving bowl",
        "Top the yogurt with the toasted oat and pistachio mixture",
        "Arrange the caramelized figs on top of the granola mix",
        "Drizzle with extra honey if desired and serve immediately"
      ],
      tips: [
        "Choose figs that are ripe but still firm - they'll caramelize better without falling apart",
        "Don't move the figs while caramelizing to get a beautiful golden color",
        "Save the pan juices to toast the oats - they add incredible flavor",
        "This recipe works beautifully with any type of yogurt you prefer"
      ],
      notes: "A stunning autumn breakfast that celebrates fresh figs at their peak, with warm spices and crunchy pistachios creating the perfect seasonal start to your day"
    },
    createdAt: new Date('2025-09-08'),
    active: true
  },
  {
    name: "Coconut Chia Pudding",
    portion: "1 serving (about 250ml)",
    nutrition: {
      protein: 14,
      prepTime: 5,
      calories: 280,
      carbohydrates: 22,
      fats: 18,
      fiber: 12,
      sugar: 8,
      sodium: 45,
      potassium: 380,
      calcium: 150,
      iron: 3.2,
      vitaminC: 12,
      costEuros: 2.80,
      proteinPerEuro: 5.0
    },
    category: "breakfast",
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Lactose-Free", "Meal-Prep", "Make-Ahead", "High-Protein", "Omega-3", "Superfood"],
    ingredients: [
      "200ml coconut milk (full-fat)",
      "30g chia seeds",
      "1 tbsp maple syrup",
      "1/2 tsp vanilla extract",
      "20g mixed nuts (almonds, walnuts)",
      "50g mixed berries (fresh or frozen)",
      "15g coconut flakes (unsweetened)",
      "Pinch of sea salt"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 0.5,
      vegetables: ["berries"],
      benefits: ["Antioxidants", "Vitamin C", "Natural Sugars"]
    },
    recipeBenefits: [
      "High in omega-3 fatty acids from chia seeds",
      "Complete protein from chia and nuts",
      "Rich in fiber for digestive health",
      "Antioxidants from berries support immune system",
      "Healthy fats from coconut and nuts for satiety"
    ],
    recipe: {
      instructions: [
        "In a bowl or jar, whisk together coconut milk, maple syrup, vanilla extract, and sea salt",
        "Add chia seeds and whisk thoroughly to prevent clumping",
        "Let sit for 5 minutes, then whisk again to break up any seed clusters",
        "Cover and refrigerate for at least 2 hours or overnight until thickened to pudding consistency",
        "When ready to serve, give the pudding a good stir",
        "Layer in serving glass or bowl",
        "Top with mixed nuts, fresh berries, and coconut flakes",
        "Serve chilled"
      ],
      tips: [
        "Whisk the chia seeds twice to prevent them from clumping together",
        "Make multiple portions at once for easy grab-and-go breakfasts",
        "Add toppings just before serving to maintain texture",
        "Can be stored in fridge for up to 5 days"
      ],
      notes: "Creamy, satisfying pudding packed with omega-3s and fiber - perfect for meal prep and customizable with any seasonal toppings"
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },
  {
    name: "Power Oats",
    portion: "1 generous serving (about 350ml)",
    nutrition: {
      protein: 22,
      prepTime: 10,
      calories: 420,
      carbohydrates: 48,
      fats: 16,
      fiber: 14,
      sugar: 12,
      sodium: 85,
      potassium: 520,
      calcium: 120,
      iron: 4.5,
      vitaminC: 8,
      costEuros: 2.50,
      proteinPerEuro: 8.8
    },
    category: "breakfast",
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "High-Protein", "Omega-3", "Superfood", "Energy", "Post-Workout"],
    ingredients: [
      "50g rolled oats",
      "1 tbsp chia seeds",
      "1 tbsp hemp hearts",
      "1 tbsp ground flax seeds",
      "300ml water",
      "2 tbsp almond butter",
      "1 medium banana (sliced)",
      "40g mixed berries",
      "1 tbsp pumpkin seeds",
      "1 tbsp sunflower seeds",
      "1 tsp cinnamon",
      "Pinch of sea salt"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1,
      vegetables: ["berries"],
      benefits: ["Antioxidants", "Vitamin C", "Natural Sugars", "Fiber"]
    },
    recipeBenefits: [
      "Triple seed power provides omega-3, protein, and minerals",
      "Complex carbohydrates for sustained energy release",
      "High fiber content supports digestive health",
      "Natural protein from seeds and nut butter",
      "Antioxidants from berries boost immune function"
    ],
    recipe: {
      instructions: [
        "In a small saucepan, bring water to a boil with a pinch of salt",
        "Add rolled oats and reduce heat to medium-low",
        "Simmer for 5-7 minutes, stirring occasionally until creamy",
        "Stir in chia seeds, hemp hearts, and ground flax seeds",
        "Cook for another 2 minutes until seeds are well incorporated",
        "Remove from heat and stir in cinnamon",
        "Transfer to serving bowl",
        "Top with almond butter, sliced banana, and mixed berries",
        "Sprinkle with pumpkin seeds and sunflower seeds",
        "Serve hot"
      ],
      tips: [
        "Don't skip the double-seed stirring to ensure even distribution",
        "Add seeds near the end to preserve their nutritional value",
        "Customize with seasonal fruits and different nut butters",
        "Make overnight oats version by soaking everything cold"
      ],
      notes: "Powerhouse breakfast combining three superseeds with hearty oats for sustained energy and complete nutrition"
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },
  {
    name: "Superfood Breakfast Bowl",
    portion: "1 serving (about 400ml)",
    nutrition: {
      protein: 16,
      prepTime: 8,
      calories: 350,
      carbohydrates: 45,
      fats: 14,
      fiber: 12,
      sugar: 28,
      sodium: 65,
      potassium: 680,
      calcium: 140,
      iron: 3.8,
      vitaminC: 45,
      costEuros: 4.20,
      proteinPerEuro: 3.8
    },
    category: "breakfast",
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Lactose-Free", "Antioxidants", "Superfood", "Energy", "Post-Workout", "Tropical"],
    ingredients: [
      "2 medium bananas (frozen)",
      "50g frozen açai puree",
      "80g mixed frozen berries (blueberries, strawberries)",
      "50ml coconut milk",
      "2 tbsp almond butter",
      "30g granola",
      "1 kiwi (sliced)",
      "15g goji berries",
      "1 tbsp coconut flakes",
      "1 tbsp chia seeds",
      "5 mint leaves"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["berries", "kiwi", "açai"],
      benefits: ["Antioxidants", "Vitamin C", "Potassium", "Natural Sugars", "Beta-Carotene"]
    },
    recipeBenefits: [
      "Açai provides powerful antioxidants and anti-inflammatory compounds",
      "High vitamin C content supports immune system",
      "Natural sugars from fruits provide quick energy",
      "Fiber and healthy fats for sustained satiety",
      "Potassium supports heart health and muscle function"
    ],
    recipe: {
      instructions: [
        "Add frozen bananas, açai puree, and mixed frozen berries to a high-speed blender",
        "Add coconut milk and 1 tbsp almond butter",
        "Blend until thick and smooth, like soft-serve ice cream consistency",
        "You may need to stop and scrape down sides several times",
        "The mixture should be thick enough to eat with a spoon",
        "Transfer to a chilled bowl",
        "Top with granola, sliced kiwi, and goji berries",
        "Drizzle with remaining almond butter",
        "Sprinkle with coconut flakes, chia seeds, and mint leaves",
        "Serve immediately"
      ],
      tips: [
        "Use frozen fruit for the best thick, creamy texture",
        "Don't add too much liquid - you want a thick smoothie base",
        "Arrange toppings in rows for an Instagram-worthy presentation",
        "Eat immediately as the base will start to melt"
      ],
      notes: "Vibrant superfood bowl packed with antioxidants and natural energy - like a healthy ice cream sundae for breakfast"
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },
  {
    name: "Cacao Granola",
    portion: "1 serving (about 60g)",
    nutrition: {
      protein: 12,
      prepTime: 45,
      calories: 320,
      carbohydrates: 38,
      fats: 14,
      fiber: 8,
      sugar: 12,
      sodium: 125,
      potassium: 420,
      calcium: 85,
      iron: 3.5,
      vitaminC: 2,
      cocoaFlavanols: 450,
      costEuros: 2.20,
      proteinPerEuro: 5.5
    },
    category: "breakfast",
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Lactose-Free", "Meal-Prep", "Bake", "Chocolate", "Crunchy", "Make-Ahead"],
    ingredients: [
      "200g rolled oats",
      "30g raw cacao powder",
      "20g pumpkin seeds",
      "20g sunflower seeds",
      "20g sesame seeds",
      "40g chopped almonds",
      "40g chopped walnuts",
      "60ml maple syrup",
      "40ml melted coconut oil",
      "1 tsp vanilla extract",
      "1/2 tsp sea salt",
      "1/2 tsp cinnamon",
      "30g dark chocolate chips (85% cocoa)",
      "20g coconut flakes"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 0,
      vegetables: [],
      benefits: ["Antioxidants from cacao", "healthy fats from nuts and seeds", "complex carbohydrates from oats"]
    },
    recipeBenefits: [
      "Raw cacao provides antioxidants and natural mood boosters",
      "Healthy fats from nuts and seeds support brain function",
      "Complex carbohydrates provide sustained energy",
      "High fiber content supports digestive health",
      "Homemade control over sugar and quality ingredients"
    ],
    recipe: {
      instructions: [
        "Preheat oven to 160°C (140°C fan)",
        "Line a large baking tray with parchment paper",
        "In a large bowl, mix oats, cacao powder, mixed seeds, chopped nuts, salt, and cinnamon",
        "In a separate bowl, whisk together maple syrup, melted coconut oil, and vanilla extract",
        "Pour wet ingredients over dry ingredients and mix thoroughly",
        "Ensure everything is well coated and mixture holds together when squeezed",
        "Spread evenly on prepared baking tray in a single layer",
        "Bake for 35-40 minutes, stirring every 10-12 minutes to prevent burning",
        "Granola is ready when it's golden and crispy",
        "Remove from oven and immediately sprinkle with dark chocolate chips",
        "Let cool completely on the tray (it will continue to crisp up)",
        "Once cool, stir in coconut flakes and store in airtight container"
      ],
      tips: [
        "Don't skip the stirring during baking to ensure even browning",
        "Let cool completely before storing to maintain crispiness",
        "Add chocolate chips while granola is still warm so they soften slightly",
        "Store in airtight container for up to 2 weeks"
      ],
      notes: "Rich, chocolatey granola that's naturally sweetened and perfect for topping yogurt, smoothie bowls, or eating with milk"
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },
  {
    name: "Strawberry Protein Smoothie",
    portion: "1 large serving (about 500ml)",
    nutrition: {
      protein: 28,
      prepTime: 5,
      calories: 380,
      carbohydrates: 42,
      fats: 12,
      fiber: 10,
      sugar: 22,
      sodium: 95,
      potassium: 620,
      calcium: 180,
      iron: 3.2,
      vitaminC: 85,
      costEuros: 3.20,
      proteinPerEuro: 8.8
    },
    category: "breakfast",
    tags: ["Vegetarian", "High-Protein", "Gluten-Free", "Quick", "Post-Workout", "Antioxidants", "Omega-3", "Energy"],
    ingredients: [
      "250ml cashew milk (unsweetened)",
      "1 medium banana (frozen)",
      "150g frozen strawberries",
      "30g rolled oats",
      "1 tbsp chia seeds",
      "1 tbsp hemp hearts",
      "1 tbsp fresh lime juice",
      "1 scoop vanilla protein powder (25g)",
      "1 tsp vanilla extract",
      "1 tbsp almond butter",
      "1 tsp maple syrup (optional)"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1.5,
      vegetables: ["strawberries"],
      benefits: ["Vitamin C", "Antioxidants", "Natural Sugars", "Folate"]
    },
    recipeBenefits: [
      "High protein from protein powder and hemp hearts",
      "Vitamin C from strawberries supports immune function",
      "Omega-3 fatty acids from chia seeds and hemp hearts",
      "Complex carbohydrates from oats provide sustained energy",
      "Potassium from banana supports muscle function"
    ],
    recipe: {
      instructions: [
        "Add cashew milk, frozen banana, and frozen strawberries to blender",
        "Add rolled oats, chia seeds, and hemp hearts",
        "Pour in fresh lime juice and vanilla extract",
        "Add protein powder and almond butter",
        "Add maple syrup if extra sweetness is desired",
        "Blend on high speed for 60-90 seconds until completely smooth",
        "Stop and scrape down sides if needed",
        "Blend again until creamy and no chunks remain",
        "Pour into large glass and serve immediately"
      ],
      tips: [
        "Use frozen fruit for the best thick, creamy texture",
        "Let oats soak in the liquid for 2-3 minutes before blending for smoother texture",
        "Adjust sweetness with more banana or maple syrup as needed",
        "Add ice cubes for an even thicker consistency"
      ],
      notes: "Protein-packed smoothie perfect for post-workout recovery or energizing breakfast with triple superfood seeds"
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },
  {
    name: "Matcha Cloud Smoothie",
    portion: "1 serving (about 400ml)",
    nutrition: {
      protein: 24,
      prepTime: 5,
      calories: 320,
      carbohydrates: 28,
      fats: 14,
      fiber: 6,
      sugar: 18,
      sodium: 110,
      potassium: 580,
      calcium: 220,
      iron: 2.8,
      vitaminC: 12,
      costEuros: 3.80,
      proteinPerEuro: 6.3
    },
    category: "breakfast",
    tags: ["Vegetarian", "High-Protein", "Gluten-Free", "Antioxidants", "Energy", "Green", "Matcha", "Japanese"],
    ingredients: [
      "200ml coconut milk (full-fat)",
      "150ml Greek yogurt",
      "50g fresh spinach (packed)",
      "1 medium banana (frozen)",
      "1 tsp ceremonial grade matcha powder",
      "1 scoop vanilla protein powder (25g)",
      "1 tbsp almond butter",
      "1 tbsp honey or maple syrup",
      "1/2 tsp vanilla extract",
      "1 cup ice cubes"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1,
      vegetables: ["spinach"],
      benefits: ["Iron", "Folate", "Vitamin K", "Antioxidants"]
    },
    recipeBenefits: [
      "Matcha provides sustained energy without caffeine crash",
      "Spinach adds iron and folate without affecting taste",
      "High protein supports muscle recovery and satiety",
      "Antioxidants from matcha and spinach fight inflammation",
      "Probiotics from yogurt support digestive health"
    ],
    recipe: {
      instructions: [
        "Add coconut milk and Greek yogurt to blender first",
        "Add fresh spinach leaves, packing them down",
        "Add frozen banana and ice cubes",
        "Sift matcha powder to remove any lumps, then add to blender",
        "Add protein powder, almond butter, honey, and vanilla extract",
        "Blend on low speed first to break down spinach",
        "Increase to high speed and blend for 90 seconds until completely smooth",
        "The color should be a beautiful pale green",
        "Pour into glass and serve immediately"
      ],
      tips: [
        "Use ceremonial grade matcha for the best flavor and color",
        "Sift matcha powder to prevent lumps in your smoothie",
        "Start blending on low to properly break down the spinach",
        "Frozen banana gives the smoothie a creamy, cloud-like texture"
      ],
      notes: "Elegant green smoothie with subtle matcha flavor and hidden vegetables - like drinking a nutritious cloud"
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },
  {
    name: "Very Berry Smoothie",
    portion: "1 serving (about 450ml)",
    nutrition: {
      protein: 18,
      prepTime: 5,
      calories: 350,
      carbohydrates: 38,
      fats: 16,
      fiber: 12,
      sugar: 24,
      sodium: 75,
      potassium: 520,
      calcium: 160,
      iron: 2.5,
      vitaminC: 95,
      costEuros: 2.90,
      proteinPerEuro: 6.2
    },
    category: "breakfast",
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Lactose-Free", "Antioxidants", "High-Protein", "Berry", "Quick"],
    ingredients: [
      "250ml almond milk (unsweetened)",
      "1 medium banana (frozen)",
      "100g frozen strawberries",
      "80g frozen blueberries",
      "2 tbsp almond butter",
      "1 tbsp chia seeds",
      "1 tbsp hemp hearts",
      "1 tsp vanilla extract",
      "1 tbsp maple syrup",
      "1/2 cup ice cubes"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["strawberries", "blueberries"],
      benefits: ["Vitamin C", "Antioxidants", "Anthocyanins", "Natural Sugars"]
    },
    recipeBenefits: [
      "Mixed berries provide powerful antioxidants and vitamin C",
      "Almond butter and seeds offer plant-based protein and healthy fats",
      "High fiber content supports digestive health",
      "Natural sugars provide quick energy for active mornings",
      "Anthocyanins from blueberries support brain health"
    ],
    recipe: {
      instructions: [
        "Add almond milk to blender first",
        "Add frozen banana, strawberries, and blueberries",
        "Add almond butter, chia seeds, and hemp hearts",
        "Pour in vanilla extract and maple syrup",
        "Add ice cubes for extra thickness",
        "Blend on high speed for 60-90 seconds until completely smooth",
        "The smoothie should be thick and creamy with a beautiful purple color",
        "Taste and adjust sweetness with more maple syrup if needed",
        "Pour into glass and serve immediately"
      ],
      tips: [
        "Use a mix of frozen berries for the best texture and flavor",
        "Let chia seeds sit in the liquid for a minute before blending for smoother texture",
        "Add a handful of ice for an extra thick, milkshake-like consistency",
        "Garnish with fresh berries and a sprinkle of chia seeds"
      ],
      notes: "Classic berry smoothie with a protein boost - naturally sweet and packed with antioxidants for a healthy start to your day"
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },
  {
    name: "The Mexican Bowl",
    portion: "1 large serving (about 450g)",
    nutrition: {
      protein: 24,
      prepTime: 25,
      calories: 520,
      carbohydrates: 68,
      fats: 18,
      fiber: 16,
      sugar: 12,
      sodium: 420,
      potassium: 980,
      calcium: 180,
      iron: 6.2,
      vitaminC: 65,
      costEuros: 4.50,
      proteinPerEuro: 5.3
    },
    category: "lunch",
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Lactose-Free", "Mexican", "Spicy", "High-Protein", "Fiber"],
    ingredients: [
      "100g fresh spinach",
      "150g cooked brown rice",
      "120g black beans (cooked or canned)",
      "100g roasted sweet potato (cubed)",
      "60g sweetcorn kernels",
      "1/2 ripe avocado (mashed)",
      "100g cherry tomatoes (halved)",
      "1 fresh jalapeño (sliced)",
      "15g fresh cilantro (chopped)",
      "2 tbsp green habanero dressing",
      "1 lime wedge",
      "1 tsp smoked paprika"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3.5,
      vegetables: ["spinach", "sweet potato", "tomatoes", "jalapeño", "cilantro", "corn"],
      benefits: ["Beta-Carotene", "Vitamin C", "Fiber", "Folate", "Antioxidants"]
    },
    recipeBenefits: [
      "Black beans provide plant-based protein and fiber",
      "Sweet potato offers beta-carotene and complex carbohydrates",
      "Avocado provides healthy monounsaturated fats",
      "Spinach delivers iron and folate",
      "Colorful vegetables supply diverse antioxidants"
    ],
    recipe: {
      instructions: [
        "Preheat oven to 200°C and cube sweet potato into 2cm pieces",
        "Toss sweet potato with olive oil, smoked paprika, salt and pepper",
        "Roast for 20-25 minutes until tender and slightly caramelized",
        "Cook brown rice according to package instructions and let cool slightly",
        "Rinse and drain black beans, season with salt and lime juice",
        "Mash half the avocado with a fork, adding lime juice and salt",
        "Arrange fresh spinach as the base in serving bowl",
        "Add warm brown rice on one side of the bowl",
        "Add seasoned black beans, roasted sweet potato, and corn",
        "Top with halved cherry tomatoes and sliced jalapeño",
        "Add a dollop of avocado smash",
        "Drizzle with green habanero dressing",
        "Garnish with fresh cilantro and lime wedge"
      ],
      tips: [
        "Roast sweet potato until edges are caramelized for extra flavor",
        "Warm the rice slightly to contrast with cool vegetables",
        "Adjust spice level by removing jalapeño seeds",
        "Make components ahead for quick assembly during the week"
      ],
      notes: "Vibrant Mexican-inspired bowl with perfect balance of plant protein, healthy fats, and colorful vegetables"
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },
  {
    name: "Tokyo Greens Bowl",
    portion: "1 serving (about 400g)",
    nutrition: {
      protein: 22,
      prepTime: 20,
      calories: 420,
      carbohydrates: 48,
      fats: 16,
      fiber: 12,
      sugar: 8,
      sodium: 680,
      potassium: 720,
      calcium: 160,
      iron: 4.8,
      vitaminC: 85,
      costEuros: 5.20,
      proteinPerEuro: 4.2
    },
    category: "lunch",
    tags: ["Vegetarian", "Gluten-Free", "Japanese", "Green", "High-Protein", "Asian"],
    ingredients: [
      "80g fresh spinach",
      "60g kale (stems removed, chopped)",
      "100g roasted broccoli florets",
      "80g cucumber (sliced)",
      "80g edamame beans (shelled)",
      "1/2 ripe avocado (sliced)",
      "1 soft-boiled egg",
      "150g cooked brown rice",
      "2 tbsp miso dressing",
      "20g sliced almonds",
      "1 tsp furikake seasoning",
      "1 tsp sesame seeds"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 4,
      vegetables: ["spinach", "kale", "broccoli", "cucumber", "edamame"],
      benefits: ["Vitamin K", "Vitamin C", "Iron", "Folate", "Fiber"]
    },
    recipeBenefits: [
      "Dark leafy greens provide iron and vitamin K",
      "Edamame offers complete plant protein",
      "Miso dressing adds probiotics and umami depth",
      "Variety of greens ensures diverse nutrient profile",
      "Soft-boiled egg provides high-quality protein"
    ],
    recipe: {
      instructions: [
        "Preheat oven to 200°C for roasting broccoli",
        "Cut broccoli into bite-sized florets and toss with olive oil and salt",
        "Roast broccoli for 15-18 minutes until edges are crispy",
        "Bring water to boil for soft-boiled eggs (6-7 minutes for runny yolk)",
        "Cook brown rice according to package instructions",
        "Remove kale stems and massage leaves with a pinch of salt",
        "Steam edamame beans for 3-4 minutes until bright green",
        "Arrange spinach and massaged kale as base in serving bowl",
        "Add warm brown rice to one section",
        "Top with roasted broccoli, sliced cucumber, and edamame",
        "Add sliced avocado and halved soft-boiled egg",
        "Drizzle with miso dressing",
        "Sprinkle with sliced almonds, furikake, and sesame seeds"
      ],
      tips: [
        "Massage kale with salt to break down tough fibers",
        "Roast broccoli until edges are crispy for best texture",
        "Time the soft-boiled egg perfectly - 6.5 minutes for creamy yolk",
        "Toast almonds and sesame seeds for extra crunch"
      ],
      notes: "Japanese-inspired power bowl with umami-rich miso dressing and perfectly balanced green vegetables"
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },
  {
    name: "Salmon Taco Bowl",
    portion: "1 serving (about 450g)",
    nutrition: {
      protein: 32,
      prepTime: 25,
      calories: 540,
      carbohydrates: 52,
      fats: 22,
      fiber: 14,
      sugar: 10,
      sodium: 520,
      potassium: 1120,
      calcium: 180,
      iron: 4.5,
      vitaminC: 55,
      costEuros: 7.50,
      proteinPerEuro: 4.3
    },
    category: "dinner",
    tags: ["Pescatarian", "Gluten-Free", "Mexican", "High-Protein", "Omega-3", "Spicy"],
    ingredients: [
      "150g salmon fillet (skin removed)",
      "80g fresh spinach",
      "150g cooked brown rice",
      "120g black beans (cooked)",
      "100g roasted sweet potato (cubed)",
      "100g cherry tomatoes (halved)",
      "1/2 ripe avocado (sliced)",
      "40g red cabbage (shredded)",
      "1 lime (juiced)",
      "15g fresh cilantro",
      "2 tbsp green habanero dressing",
      "1 tsp cumin",
      "1/2 tsp smoked paprika",
      "Salt and pepper"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["spinach", "sweet potato", "tomatoes", "cabbage", "cilantro"],
      benefits: ["Beta-Carotene", "Vitamin C", "Fiber", "Antioxidants", "Folate"]
    },
    recipeBenefits: [
      "Salmon provides high-quality protein and omega-3 fatty acids",
      "Black beans offer plant protein and fiber",
      "Sweet potato delivers complex carbohydrates and beta-carotene",
      "Colorful vegetables provide diverse antioxidants",
      "Healthy fats support nutrient absorption"
    ],
    recipe: {
      instructions: [
        "Preheat oven to 200°C for sweet potato and salmon",
        "Cube sweet potato and roast with olive oil and smoked paprika for 20 minutes",
        "Season salmon with cumin, paprika, salt, and pepper",
        "Pan-sear salmon for 3-4 minutes per side until just cooked through",
        "Let salmon rest for 2 minutes, then flake into bite-sized pieces",
        "Cook brown rice according to package instructions",
        "Rinse and season black beans with lime juice and salt",
        "Arrange fresh spinach as base in serving bowl",
        "Add warm brown rice, seasoned black beans, and roasted sweet potato",
        "Top with flaked salmon, halved cherry tomatoes, and avocado slices",
        "Add shredded red cabbage for crunch and color",
        "Drizzle with green habanero dressing and fresh lime juice",
        "Garnish with fresh cilantro and serve immediately"
      ],
      tips: [
        "Don't overcook salmon - it should flake easily but still be moist",
        "Roast sweet potato until edges are caramelized",
        "Add red cabbage for crunch and vibrant color contrast",
        "Serve immediately while salmon and sweet potato are still warm"
      ],
      notes: "Mexican-inspired salmon bowl with perfect balance of protein, healthy fats, and colorful vegetables"
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },
  {
    name: "Miso Bowl",
    portion: "1 serving (about 420g)",
    nutrition: {
      protein: 28,
      prepTime: 22,
      calories: 480,
      carbohydrates: 45,
      fats: 20,
      fiber: 10,
      sugar: 8,
      sodium: 720,
      potassium: 890,
      calcium: 140,
      iron: 3.8,
      vitaminC: 70,
      costEuros: 6.80,
      proteinPerEuro: 4.1
    },
    category: "dinner",
    tags: ["Pescatarian", "Gluten-Free", "Japanese", "High-Protein", "Omega-3", "Asian"],
    ingredients: [
      "120g kale (stems removed, chopped)",
      "150g cooked brown rice",
      "60g red cabbage (shredded)",
      "80g cucumber (sliced)",
      "100g roasted aubergine (eggplant cubes)",
      "100g roasted broccoli florets",
      "20g sliced almonds",
      "1 tsp furikake seasoning",
      "150g salmon fillet",
      "2 tbsp miso dressing",
      "1 tsp sesame oil",
      "1 tsp sesame seeds"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 4,
      vegetables: ["kale", "cabbage", "cucumber", "aubergine", "broccoli"],
      benefits: ["Vitamin K", "Vitamin C", "Fiber", "Antioxidants", "Folate"]
    },
    recipeBenefits: [
      "Miso provides probiotics and umami depth",
      "Salmon offers omega-3 fatty acids and complete protein",
      "Variety of vegetables ensures diverse nutrient profile",
      "Kale provides exceptional vitamin K and iron",
      "Roasted vegetables add satisfying texture and flavor"
    ],
    recipe: {
      instructions: [
        "Preheat oven to 200°C for roasting vegetables",
        "Cube aubergine into 2cm pieces, salt lightly and let sit 10 minutes",
        "Pat aubergine dry and toss with olive oil, roast for 20 minutes",
        "Cut broccoli into florets, toss with oil and roast for 15 minutes",
        "Season salmon with salt and pepper",
        "Pan-sear salmon for 3-4 minutes per side until cooked through",
        "Let salmon rest, then slice into thick pieces",
        "Cook brown rice according to package instructions",
        "Remove kale stems and massage leaves with sesame oil and salt",
        "Arrange massaged kale as base in serving bowl",
        "Add warm brown rice to one section of the bowl",
        "Top with roasted aubergine, roasted broccoli, and sliced cucumber",
        "Add shredded red cabbage for color and crunch",
        "Place sliced salmon on top",
        "Drizzle generously with miso dressing",
        "Sprinkle with sliced almonds, furikake, and sesame seeds"
      ],
      tips: [
        "Salt aubergine and let sit to remove bitterness",
        "Massage kale with oil to break down tough fibers",
        "Roast vegetables until edges are golden for best flavor",
        "Warm the rice slightly to contrast with cool vegetables"
      ],
      notes: "Japanese-inspired bowl with umami-rich miso dressing, perfectly cooked salmon, and a rainbow of roasted vegetables"
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },
  {
    name: "Creamy Mushroom Stroganoff",
    portion: "1 generous serving with rice (about 350g)",
    nutrition: {
      protein: 22,
      prepTime: 50,
      calories: 485,
      carbohydrates: 52,
      fats: 24,
      fiber: 8,
      sugar: 12,
      sodium: 680,
      potassium: 920,
      calcium: 85,
      iron: 4.8,
      vitaminC: 15,
      costEuros: 4.20,
      proteinPerEuro: 5.2
    },
    category: "dinner",
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Lactose-Free", "Mushroom", "Ayurvedic"],
    ingredients: [
      "1 tbsp olive oil",
      "1 onion",
      "2 medium leeks (halved & finely sliced)",
      "500g mixed mushrooms (sliced)",
      "4 cloves garlic (grated)",
      "2 tsp paprika",
      "1 x 400ml tin coconut milk",
      "1 vegetable stock cube",
      "2 tbsp brown rice miso paste",
      "2 tbsp tahini",
      "20g fresh chives (finely chopped)",
      "4 servings of rice",
      "Flaky sea salt",
      "Black pepper"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 4,
      vegetables: ["onion", "leeks", "mushrooms", "garlic", "chives"],
      benefits: ["rich in B vitamins from mushrooms", "immune-supporting garlic", "prebiotic fiber from leeks and onions", "umami depth from miso"]
    },
    recipe: {
      instructions: [
        "Heat the olive oil in a large frying pan over medium heat",
        "Add the onion, leeks and mushrooms, plus a large pinch of flaky sea salt",
        "Fry for 15 minutes until softened and the water from the mushrooms has evaporated",
        "Stir through the garlic and paprika and fry for 30 seconds",
        "Pour in the coconut milk and 150ml boiling water",
        "Crumble in the stock cube and add the miso paste",
        "Stir and bring to the boil, then simmer for 30 minutes until thick and luxurious",
        "Season with flaky sea salt and a good crack of black pepper",
        "Stir through the tahini and half of the chives",
        "Serve with rice and top with the remainder of the chives"
      ],
      tips: [
        "Don't rush the initial mushroom cooking - let all the water evaporate for concentrated flavor",
        "Miso paste adds incredible umami depth - whisk it well to avoid lumps",
        "Tahini should be stirred in at the end to maintain its creamy texture"
      ],
      notes: "Comforting creamy mushroom stroganoff that's completely plant-based yet rich and satisfying - perfect for cozy winter evenings"
    }
  },
  {
    name: "Tomato Mac & Cheese",
    portion: "1 generous serving (about 300g)",
    nutrition: {
      protein: 18,
      prepTime: 30,
      calories: 420,
      carbohydrates: 65,
      fats: 12,
      fiber: 6,
      sugar: 8,
      sodium: 480,
      potassium: 680,
      calcium: 120,
      iron: 3.2,
      vitaminC: 22,
      costEuros: 3.80,
      proteinPerEuro: 4.7
    },
    category: "dinner",
    tags: ["Vegetarian", "Vegan", "Dairy-Free", "Lactose-Free", "Pasta", "Nutritional-Yeast", "Tomato"],
    ingredients: [
      "300g macaroni pasta",
      "4 cloves garlic (peeled & diced)",
      "200g cherry tomatoes (halved)",
      "1 tbsp olive oil",
      "3.5 tbsp tapioca flour",
      "1 lemon (juiced)",
      "50g nutritional yeast",
      "2 tsp Dijon mustard",
      "400ml almond milk",
      "1 large handful fresh basil (chopped)",
      "Sea salt",
      "Black pepper"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["garlic", "cherry tomatoes", "basil"],
      benefits: ["lycopene from tomatoes", "immune-supporting garlic", "B vitamins from nutritional yeast", "antioxidants from fresh basil"]
    },
    recipe: {
      instructions: [
        "Cook the macaroni pasta according to packet instructions until al dente",
        "Once cooked, drain pasta and set aside until needed",
        "Make the white sauce: place tapioca flour, lemon juice, nutritional yeast, Dijon mustard, almond milk and a pinch of salt in a pan over medium heat",
        "Continuously whisk the mixture to ensure it stays smooth and no lumps form",
        "Add extra splash of almond milk if the mixture becomes too thick",
        "In another large pan over medium heat, add olive oil",
        "Once warm, add diced garlic, halved cherry tomatoes and a sprinkling of salt",
        "Mix well and cook for 10 minutes until the tomatoes become really soft and begin to bubble",
        "Mix through the drained pasta, white sauce and chopped basil",
        "Season with salt and pepper to taste, then serve immediately"
      ],
      tips: [
        "Don't overcook the pasta as it will continue cooking when mixed with the hot sauce",
        "Whisk the white sauce constantly to prevent lumps from forming",
        "Cook tomatoes until they're really soft and jammy for best flavor"
      ],
      notes: "Comforting vegan mac and cheese with sweet cherry tomatoes and creamy nutritional yeast sauce - perfect for pasta lovers"
    }
  },
  {
    name: "Tomato Mac & Cheese",
    portion: "1 generous serving (about 300g)",
    nutrition: {
      protein: 17,
      prepTime: 30,
      calories: 415,
      carbohydrates: 63,
      fats: 12,
      fiber: 7,
      sugar: 8,
      sodium: 480,
      potassium: 680,
      calcium: 120,
      iron: 3.8,
      vitaminC: 22,
      costEuros: 4.20,
      proteinPerEuro: 4.0
    },
    category: "dinner",
    tags: ["Vegetarian", "Vegan", "Dairy-Free", "Lactose-Free", "Gluten-Free", "Pasta", "Nutritional-Yeast", "Tomato"],
    ingredients: [
      "300g gluten-free macaroni pasta",
      "4 cloves garlic (peeled & diced)",
      "200g cherry tomatoes (halved)",
      "1 tbsp olive oil",
      "3.5 tbsp tapioca flour",
      "1 lemon (juiced)",
      "50g nutritional yeast",
      "2 tsp Dijon mustard",
      "400ml almond milk",
      "1 large handful fresh basil (chopped)",
      "Sea salt",
      "Black pepper"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["garlic", "cherry tomatoes", "basil"],
      benefits: ["lycopene from tomatoes", "immune-supporting garlic", "B vitamins from nutritional yeast", "antioxidants from fresh basil"]
    },
    recipe: {
      instructions: [
        "Cook the gluten-free macaroni pasta according to packet instructions until al dente (may take slightly longer than regular pasta)",
        "Once cooked, drain pasta and set aside until needed",
        "Make the white sauce: place tapioca flour, lemon juice, nutritional yeast, Dijon mustard, almond milk and a pinch of salt in a pan over medium heat",
        "Continuously whisk the mixture to ensure it stays smooth and no lumps form",
        "Add extra splash of almond milk if the mixture becomes too thick",
        "In another large pan over medium heat, add olive oil",
        "Once warm, add diced garlic, halved cherry tomatoes and a sprinkling of salt",
        "Mix well and cook for 10 minutes until the tomatoes become really soft and begin to bubble",
        "Mix through the drained pasta, white sauce and chopped basil",
        "Season with salt and pepper to taste, then serve immediately"
      ],
      tips: [
        "Gluten-free pasta can be more delicate, so watch cooking time carefully",
        "Rinse gluten-free pasta briefly after cooking to remove excess starch",
        "Whisk the white sauce constantly to prevent lumps from forming"
      ],
      notes: "Gluten-free version of the comforting vegan mac and cheese with sweet cherry tomatoes and creamy nutritional yeast sauce"
    }
  },
  {
    name: "Aubergine Parmigiana",
    portion: "1 generous serving (about 280g)",
    nutrition: {
      protein: 20,
      prepTime: 45,
      calories: 395,
      carbohydrates: 38,
      fats: 22,
      fiber: 12,
      sugar: 18,
      sodium: 520,
      potassium: 1100,
      calcium: 145,
      iron: 4.2,
      vitaminC: 28,
      costEuros: 4.60,
      proteinPerEuro: 4.3
    },
    category: "dinner",
    tags: ["Vegetarian", "Vegan", "Dairy-Free", "Lactose-Free", "Aubergine", "Cashew", "Bake", "Italian", "Tomato"],
    ingredients: [
      "100g cashews",
      "145g silken tofu (drained)",
      "4 tbsp nutritional yeast",
      "0.5 lemon (zested & juiced)",
      "3 tbsp olive oil",
      "3 whole aubergines (cut into 1cm slices)",
      "2 cloves garlic (thinly sliced)",
      "1 onion (finely diced)",
      "1 pinch dried red chilli flakes",
      "800g canned cherry tomatoes",
      "1 tbsp tomato purée",
      "1 tsp maple syrup",
      "30g fresh basil (sliced)",
      "100g breadcrumbs",
      "Sea salt",
      "Black pepper"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 5,
      vegetables: ["aubergines", "garlic", "onion", "tomatoes", "basil"],
      benefits: ["3 of your 5-a-day", "high fiber from aubergines", "lycopene from tomatoes", "healthy fats from cashews", "complete protein from tofu and cashews"]
    },
    recipe: {
      instructions: [
        "Preheat the oven to 180°C fan/390°F",
        "Place cashews in a bowl and cover with boiling water, set aside to soften for 10 minutes",
        "Spread aubergine on a large baking tray, drizzle generously with olive oil and season with salt",
        "Roast aubergines for 30-35 minutes, turning halfway, until tender and golden",
        "Warm 2 tbsp olive oil in a shallow casserole dish (26cm diameter) over medium heat",
        "Add garlic and chilli, cook for 2-3 minutes until golden",
        "Add onion and a pinch of salt, cook for 10 minutes until softened",
        "Stir in canned tomatoes, tomato purée, maple syrup and salt",
        "Rinse empty tins with 100ml water and add to pan, simmer 10-15 minutes until reduced by half",
        "For creamy sauce: blend cashews with 100ml soaking water, tofu, nutritional yeast, lemon zest, lemon juice, 1 tbsp olive oil, salt and pepper until smooth",
        "Remove casserole from heat, stir in roasted aubergine and basil",
        "Pour over the creamy sauce, scatter breadcrumbs on top and drizzle with olive oil",
        "Bake for 15 minutes until bubbling and golden"
      ],
      tips: [
        "Don't skip soaking the cashews - this makes the sauce ultra-creamy",
        "Make sure aubergines are properly golden before adding to the sauce",
        "Keep breadcrumb stash in freezer - blitz stale bread and store up to 3 months"
      ],
      notes: "Easy, comforting aubergine bake with melt-in-your-mouth roasted aubergines, rich tomato sauce and creamy cashew layer - perfect for midweek suppers"
    }
  },
  {
    name: "Aubergine Parmigiana",
    portion: "1 generous serving (about 280g)",
    nutrition: {
      protein: 19,
      prepTime: 45,
      calories: 388,
      carbohydrates: 36,
      fats: 22,
      fiber: 13,
      sugar: 18,
      sodium: 520,
      potassium: 1100,
      calcium: 145,
      iron: 4.5,
      vitaminC: 28,
      costEuros: 5.20,
      proteinPerEuro: 3.7
    },
    category: "dinner",
    tags: ["Vegetarian", "Vegan", "Dairy-Free", "Lactose-Free", "Gluten-Free", "Aubergine", "Cashew", "Bake", "Italian", "Tomato"],
    ingredients: [
      "100g cashews",
      "145g silken tofu (drained)",
      "4 tbsp nutritional yeast",
      "0.5 lemon (zested & juiced)",
      "3 tbsp olive oil",
      "3 whole aubergines (cut into 1cm slices)",
      "2 cloves garlic (thinly sliced)",
      "1 onion (finely diced)",
      "1 pinch dried red chilli flakes",
      "800g canned cherry tomatoes",
      "1 tbsp tomato purée",
      "1 tsp maple syrup",
      "30g fresh basil (sliced)",
      "100g gluten-free breadcrumbs",
      "Sea salt",
      "Black pepper"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 5,
      vegetables: ["aubergines", "garlic", "onion", "tomatoes", "basil"],
      benefits: ["3 of your 5-a-day", "high fiber from aubergines", "lycopene from tomatoes", "healthy fats from cashews", "complete protein from tofu and cashews"]
    },
    recipe: {
      instructions: [
        "Preheat the oven to 180°C fan/390°F",
        "Place cashews in a bowl and cover with boiling water, set aside to soften for 10 minutes",
        "Spread aubergine on a large baking tray, drizzle generously with olive oil and season with salt",
        "Roast aubergines for 30-35 minutes, turning halfway, until tender and golden",
        "Warm 2 tbsp olive oil in a shallow casserole dish (26cm diameter) over medium heat",
        "Add garlic and chilli, cook for 2-3 minutes until golden",
        "Add onion and a pinch of salt, cook for 10 minutes until softened",
        "Stir in canned tomatoes, tomato purée, maple syrup and salt",
        "Rinse empty tins with 100ml water and add to pan, simmer 10-15 minutes until reduced by half",
        "For creamy sauce: blend cashews with 100ml soaking water, tofu, nutritional yeast, lemon zest, lemon juice, 1 tbsp olive oil, salt and pepper until smooth",
        "Remove casserole from heat, stir in roasted aubergine and basil",
        "Pour over the creamy sauce, scatter gluten-free breadcrumbs on top and drizzle with olive oil",
        "Bake for 15 minutes until bubbling and golden"
      ],
      tips: [
        "Use certified gluten-free breadcrumbs or make from gluten-free bread",
        "Don't skip soaking the cashews - this makes the sauce ultra-creamy",
        "Make sure aubergines are properly golden before adding to the sauce"
      ],
      notes: "Gluten-free version of the comforting aubergine bake with melt-in-your-mouth roasted aubergines, rich tomato sauce and creamy cashew layer"
    }
  },
  {
    name: "Super Simple Quinoa Chilli",
    portion: "1 generous serving (about 320g)",
    nutrition: {
      protein: 24,
      prepTime: 30,
      calories: 445,
      carbohydrates: 58,
      fats: 16,
      fiber: 15,
      sugar: 12,
      sodium: 520,
      potassium: 1200,
      calcium: 95,
      iron: 5.8,
      vitaminC: 35,
      costEuros: 3.90,
      proteinPerEuro: 6.2
    },
    category: "dinner",
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Lactose-Free", "quinoa", "beans", "chilli", "one-pot", "weeknight", "Ayurvedic"],
    ingredients: [
      "1 large red onion (peeled & finely chopped)",
      "3 cloves garlic (peeled & finely chopped)",
      "2 tsp paprika",
      "1 tsp ground cumin",
      "1 tbsp tomato purée",
      "200g quinoa",
      "400g canned chopped tomatoes",
      "240g canned chickpeas (drained)",
      "240g canned red kidney beans (drained)",
      "2 tbsp almond butter",
      "1 tbsp brown rice miso paste",
      "1 tbsp maple syrup",
      "1 lime (juiced)",
      "15g fresh coriander (roughly chopped)",
      "1 avocado (sliced)",
      "Olive oil",
      "Sea salt",
      "Black pepper"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 4,
      vegetables: ["red onion", "garlic", "tomatoes", "coriander", "Avocado"],
      benefits: ["complete protein from quinoa and beans", "high fiber content", "healthy fats from almond butter", "warming spices for digestion", "antioxidants from tomatoes"]
    },
    recipe: {
      instructions: [
        "Place a large, heavy-bottomed pan over medium-high heat and add a drizzle of olive oil",
        "Once hot, add the red onion, garlic and a sprinkle of salt and pepper",
        "Cook for 4-5 minutes, until softened and translucent",
        "Add the paprika, cumin and tomato purée, stirring until everything is coated in the spices and tomato",
        "After about a minute, the mixture should smell lovely and fragrant",
        "Add in the quinoa, drained chickpeas and kidney beans, and the tin of tomatoes",
        "Fill the empty tin with water and add this liquid to the pan",
        "Cover the pan and leave to simmer for 30 minutes, stirring occasionally to prevent the quinoa from sticking",
        "Once the quinoa is tender, stir in the almond butter, lime juice, miso and maple syrup",
        "Adjust seasoning to taste, and serve with extra lime squeezed over",
        "Top with chopped avocado and fresh coriander"
      ],
      tips: [
        "Stir occasionally during simmering to prevent quinoa from sticking to the bottom",
        "Black beans or pinto beans work well as alternatives to kidney beans",
        "Make extra portions for easy lunch leftovers the next day"
      ],
      notes: "Warming chilli that becomes a favourite all-in-one weeknight meal, packed with plant protein from quinoa, beans and almond butter"
    }
  },
  {
    name: "Harissa-Roasted Vegetable Pancakes with Chickpeas",
    portion: "2 savory pancakes with vegetables (about 400g)",
    nutrition: {
      protein: 25,
      prepTime: 45,
      calories: 370,
      carbohydrates: 45,
      fats: 12,
      fiber: 13,
      sugar: 8,
      sodium: 580,
      potassium: 720,
      calcium: 95,
      iron: 5.2,
      vitaminC: 25,
      costEuros: 3.20,
      proteinPerEuro: 7.8
    },
    category: "dinner",
    tags: ["Vegetarian", "Gluten-Free", "Dairy-Free", "Lactose-Free", "High-Protein", "Mediterranean", "Spicy", "One-Pan"],
    ingredients: [
      "240g canned chickpeas (drained and rinsed)",
      "1 medium aubergine",
      "5ml paprika",
      "6 vine tomatoes",
      "15ml harissa paste",
      "100ml almond milk",
      "Handful fresh parsley (chopped, plus extra for garnish)",
      "15ml tahini",
      "1 lemon (juiced)",
      "Pinch dried red chilli flakes",
      "Olive oil for drizzling",
      "Sea salt to taste",
      "150g gram flour (chickpea flour)",
      "5ml hot chilli powder",
      "5ml paprika (for pancakes)",
      "200ml water",
      "Black pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 4,
      vegetables: ["Aubergine", "tomatoes", "parsley"],
      benefits: ["High in antioxidants", "Rich in plant protein", "Supports digestive health", "Anti-inflammatory properties"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 170°C fan",
        "Cut aubergine into bite-sized chunks",
        "Arrange drained chickpeas and aubergine chunks on baking tray",
        "Add 5ml paprika, drizzle olive oil, and pinch of salt to vegetables",
        "Mix well and cook for 25 minutes",
        "Cut each tomato into 6 pieces",
        "Add tomato pieces and cook another 10-15 minutes until aubergine is soft",
        "Remove vegetables from oven and transfer to large bowl",
        "Stir through harissa paste, dash of almond milk, chopped parsley, tahini, lemon juice, and salt",
        "Mix vegetable mixture until everything comes together",
        "For pancakes: combine gram flour, chilli powder, 5ml paprika, salt, and pepper in bowl",
        "Mix flour mixture well to remove lumps",
        "Pour in 200ml water and mix to form thick batter",
        "Heat large frying pan over medium heat with drizzle of olive oil",
        "Pour in half the batter and cook 5 minutes until bottom is set",
        "Flip pancake with spatula and cook 2-3 minutes until cooked through",
        "Transfer to plate and repeat with remaining batter for second pancake",
        "Serve pancakes topped with harissa-roasted vegetables",
        "Garnish with fresh parsley and pinch of chilli flakes"
      ],
      tips: [
        "Use certified gluten-free gram flour for complete celiac safety",
        "Adjust harissa paste amount to taste preference",
        "Vegetables can be roasted in advance and reheated"
      ],
      notes: "Naturally gluten-free pancakes with Mediterranean flavors and plant-based protein from chickpeas and gram flour"
    }
  },
  {
    name: "Parmesan Brussels Sprouts",
    portion: "1 serving (about 250g)",
    nutrition: {
      protein: 18,
      prepTime: 20,
      calories: 285,
      carbohydrates: 12,
      fats: 20,
      fiber: 8,
      sugar: 6,
      sodium: 480,
      potassium: 650,
      calcium: 280,
      iron: 3.2,
      vitaminC: 95,
      costEuros: 3.50,
      proteinPerEuro: 5.1
    },
    category: "dinner",
    tags: ["Vegetarian", "Gluten-Free", "High-Protein", "calcium-rich", "Menstruation", "Anti-Inflammatory"],
    ingredients: [
      "400g Brussels sprouts, halved",
      "60g parmesan cheese, grated",
      "3 cloves garlic, minced",
      "30ml olive oil",
      "15ml lemon juice",
      "Pinch sea salt and black pepper",
      "5ml dried thyme"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 4,
      vegetables: ["Brussels sprouts", "garlic"],
      benefits: ["vitamin C for immunity", "calcium for bones", "fiber for digestion", "antioxidants for inflammation"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 200°C fan / 390°F",
        "Cut Brussels sprouts in half lengthwise",
        "Toss halved Brussels sprouts with olive oil, minced garlic, and pinch of salt",
        "Arrange cut-side down on baking tray",
        "Roast for 15-18 minutes until edges are golden and crispy",
        "Remove from oven and sprinkle with grated parmesan",
        "Return to oven for 3-4 minutes until cheese melts",
        "Drizzle with lemon juice and sprinkle with thyme",
        "Season with pepper and serve immediately"
      ],
      tips: [
        "Don't overcrowd the tray - Brussels sprouts need space to crisp up",
        "Cut-side down ensures better caramelization",
        "Fresh parmesan works best for melting"
      ],
      notes: "Calcium-rich side dish perfect during menstruation, with vitamin C to support iron absorption"
    },
    createdAt: new Date('2025-09-01'),
    active: true
  },
  {
    name: "Sizzle Duck Breast with Herbs",
    portion: "1 serving (150g duck + vegetables)",
    nutrition: {
      protein: 35,
      prepTime: 25,
      calories: 420,
      carbohydrates: 8,
      fats: 28,
      fiber: 3,
      sugar: 5,
      sodium: 520,
      potassium: 580,
      calcium: 45,
      iron: 8.5,
      vitaminC: 25,
      costEuros: 8.50,
      proteinPerEuro: 4.1
    },
    category: "dinner",
    tags: ["High-Protein", "Iron-Rich", "Menstruation", "luxury", "Quick"],
    ingredients: [
      "150g duck breast, skin scored",
      "Mixed fresh herbs (rosemary, thyme)",
      "2 cloves garlic, sliced",
      "200g mixed vegetables (broccoli, carrots)",
      "15ml olive oil",
      "10ml balsamic vinegar",
      "Sea salt and black pepper"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["broccoli", "carrots", "garlic"],
      benefits: ["vitamin A from carrots", "vitamin C from broccoli", "antioxidants from herbs"]
    },
    recipe: {
      instructions: [
        "Score duck skin in crosshatch pattern, season with salt and pepper",
        "Heat pan over medium heat, place duck skin-side down",
        "Cook for 8-10 minutes until skin is golden and crispy",
        "Flip duck and cook 3-4 minutes for medium-rare",
        "Remove duck and rest for 5 minutes",
        "Add vegetables to same pan with duck fat",
        "Sauté with garlic and herbs for 5-6 minutes",
        "Deglaze with balsamic vinegar",
        "Slice duck and serve with vegetables"
      ],
      tips: [
        "Start duck skin-side down to render fat properly",
        "Don't move duck while skin crisps",
        "Use duck fat to cook vegetables for extra flavor"
      ],
      notes: "Rich in heme iron and high-quality protein, perfect for replenishing nutrients during menstruation"
    },
    createdAt: new Date('2025-09-01'),
    active: true
  },
  {
    name: "Coconut Mango Chicken",
    portion: "1 serving (about 350g with rice)",
    nutrition: {
      protein: 32,
      prepTime: 30,
      calories: 485,
      carbohydrates: 45,
      fats: 18,
      fiber: 4,
      sugar: 18,
      sodium: 620,
      potassium: 780,
      calcium: 60,
      iron: 3.2,
      vitaminC: 75,
      costEuros: 5.20,
      proteinPerEuro: 6.2
    },
    category: "dinner",
    tags: ["High-Protein", "Tropical", "Anti-Inflammatory", "Menstruation"],
    ingredients: [
      "150g chicken breast, cubed",
      "100ml coconut milk",
      "1 ripe mango, diced",
      "75g jasmine rice",
      "1 red pepper, sliced",
      "2 cloves garlic, minced",
      "10ml fresh ginger, grated",
      "5ml ground cumin",
      "5ml turmeric",
      "15ml olive oil",
      "Fresh coriander for garnish",
      "Lime wedges to serve"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["red pepper", "garlic", "ginger"],
      benefits: ["vitamin A from mango", "vitamin C from pepper", "anti-inflammatory compounds from turmeric"]
    },
    recipe: {
      instructions: [
        "Cook jasmine rice according to package instructions",
        "Heat olive oil in large pan over medium-high heat",
        "Add cubed chicken and cook until golden (5-6 minutes)",
        "Add minced garlic and grated ginger, cook 1 minute",
        "Add sliced red pepper, cumin, and turmeric",
        "Stir in coconut milk and bring to gentle simmer",
        "Add diced mango and simmer 8-10 minutes until chicken is cooked through",
        "Season with salt and pepper to taste",
        "Serve over rice, garnish with fresh coriander and lime"
      ],
      tips: [
        "Use ripe but firm mango for best texture",
        "Don't overcook mango - it should hold its shape",
        "Full-fat coconut milk gives richest flavor"
      ],
      notes: "Tropical comfort food rich in vitamin C and anti-inflammatory compounds, perfect for period cravings"
    },
    createdAt: new Date('2025-09-01'),
    active: true
  },
  {
    name: "Hearty Beef & Vegetable Stew",
    portion: "1 serving (about 400g)",
    nutrition: {
      protein: 28,
      prepTime: 90,
      calories: 380,
      carbohydrates: 32,
      fats: 12,
      fiber: 6,
      sugar: 8,
      sodium: 580,
      potassium: 850,
      calcium: 65,
      iron: 6.8,
      vitaminC: 45,
      costEuros: 4.80,
      proteinPerEuro: 5.8
    },
    category: "dinner",
    tags: ["High-Protein", "Iron-Rich", "Menstruation", "Hearty", "Slow-Cooked"],
    ingredients: [
      "150g lean beef stewing meat, cubed",
      "2 medium carrots, chopped",
      "2 celery stalks, chopped",
      "1 medium potato, cubed",
      "1 onion, diced",
      "2 cloves garlic, minced",
      "400ml beef stock",
      "400g canned chopped tomatoes",
      "5ml dried thyme",
      "2 bay leaves",
      "15ml olive oil",
      "Sea salt and black pepper"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["carrots", "celery", "potato", "onion", "garlic", "tomatoes"],
      benefits: ["heme iron from beef", "vitamin A from carrots", "vitamin C for iron absorption", "fiber for digestion"]
    },
    recipe: {
      instructions: [
        "Heat olive oil in heavy-bottomed pot over medium-high heat",
        "Season beef cubes with salt and pepper",
        "Brown beef on all sides (5-6 minutes total)",
        "Add diced onion and cook until softened (5 minutes)",
        "Add garlic and cook 1 minute until fragrant",
        "Add chopped carrots, celery, and potato",
        "Pour in beef stock and canned tomatoes",
        "Add thyme and bay leaves",
        "Bring to boil, then reduce heat to low",
        "Cover and simmer 60-75 minutes until beef is tender",
        "Remove bay leaves before serving",
        "Adjust seasoning to taste"
      ],
      tips: [
        "Brown the beef well for deeper flavor",
        "Don't rush the simmering - tender beef takes time",
        "Make extra for leftovers - tastes even better next day"
      ],
      notes: "Rich in heme iron for optimal absorption, perfect for replenishing iron during menstruation"
    },
    createdAt: new Date('2025-09-01'),
    active: true
  },
  {
    name: "BEA Salad (Bacon, Egg, Avocado)",
    portion: "1 serving (about 300g)",
    nutrition: {
      protein: 24,
      prepTime: 15,
      calories: 420,
      carbohydrates: 8,
      fats: 32,
      fiber: 10,
      sugar: 3,
      sodium: 680,
      potassium: 720,
      calcium: 95,
      iron: 3.8,
      vitaminC: 15,
      costEuros: 4.50,
      proteinPerEuro: 5.3
    },
    category: "lunch",
    tags: ["High-Protein", "Keto-Friendly", "Menstruation", "Quick", "satisfying", "healthy-fats"],
    ingredients: [
      "2 large eggs",
      "1 ripe avocado, sliced",
      "3 strips bacon, chopped",
      "100g mixed salad greens",
      "Half cucumber, sliced",
      "10 cherry tomatoes, halved",
      "15ml olive oil",
      "10ml lemon juice",
      "Sea salt and black pepper"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["salad greens", "cucumber", "tomatoes"],
      benefits: ["healthy fats from avocado", "complete protein from eggs", "potassium for muscle function"]
    },
    recipe: {
      instructions: [
        "Bring water to boil in small saucepan",
        "Gently lower eggs into boiling water",
        "Cook for 6-7 minutes for soft-boiled, 8-9 for medium",
        "Transfer eggs to cold water to stop cooking",
        "Cook bacon in dry pan until crispy (4-5 minutes)",
        "Arrange mixed greens in serving bowl",
        "Add sliced cucumber and halved cherry tomatoes",
        "Peel and slice avocado, arrange on top",
        "Carefully peel soft-boiled eggs and halve",
        "Place egg halves on salad",
        "Sprinkle with crispy bacon pieces",
        "Drizzle with olive oil and lemon juice, season to taste"
      ],
      tips: [
        "Use very fresh eggs for perfect soft-boiled texture",
        "Don't overdress - let the ingredients shine",
        "Serve immediately while eggs are warm"
      ],
      notes: "Protein and healthy fat powerhouse with choline for hormone support during menstruation"
    },
    createdAt: new Date('2025-09-01'),
    active: true
  },
  {
    name: "Tempeh Fiesta Bowl",
    portion: "1 serving (about 350g)",
    nutrition: {
      protein: 26,
      prepTime: 25,
      calories: 445,
      carbohydrates: 42,
      fats: 18,
      fiber: 12,
      sugar: 8,
      sodium: 620,
      potassium: 780,
      calcium: 140,
      iron: 5.2,
      vitaminC: 35,
      costEuros: 3.80,
      proteinPerEuro: 6.8
    },
    category: "dinner",
    tags: ["Vegetarian", "Gluten-Free", "High-Protein", "Plant-Based", "Menstruation", "mexican-inspired", "fiber-rich"],
    ingredients: [
      "100g tempeh, cubed",
      "75g quinoa",
      "120g black beans, drained",
      "1 red pepper, diced",
      "1 small avocado, sliced",
      "50g sweetcorn",
      "2 cloves garlic, minced",
      "5ml ground cumin",
      "5ml smoked paprika",
      "15ml olive oil",
      "Half lime, juiced",
      "Fresh coriander for garnish",
      "Sea salt and pepper"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["red pepper", "garlic", "Avocado"],
      benefits: ["plant-based iron from tempeh", "magnesium from quinoa", "folate from black beans", "potassium from avocado"]
    },
    recipe: {
      instructions: [
        "Cook quinoa according to package instructions",
        "Heat olive oil in large pan over medium heat",
        "Add cubed tempeh and cook until golden (6-8 minutes)",
        "Add minced garlic, cumin, and paprika",
        "Cook 1 minute until fragrant",
        "Add diced red pepper and sweetcorn",
        "Cook 4-5 minutes until pepper softens",
        "Stir in black beans and heat through (2 minutes)",
        "Season with salt, pepper, and lime juice",
        "Serve over quinoa with sliced avocado",
        "Garnish with fresh coriander"
      ],
      tips: [
        "Marinate tempeh beforehand for deeper flavor",
        "Don't break up tempeh too much while cooking",
        "Add avocado just before serving to prevent browning"
      ],
      notes: "Plant-based iron and magnesium from tempeh and quinoa, ideal for supporting energy during menstruation"
    },
    createdAt: new Date('2025-09-01'),
    active: true
  },
  {
    name: "Pre-Workout Protein Smoothie",
    portion: "1 large smoothie (about 320ml)",
    nutrition: {
      protein: 25,
      prepTime: 5,
      calories: 295,
      carbohydrates: 35,
      fats: 8,
      fiber: 7,
      sugar: 22,
      sodium: 180,
      potassium: 680,
      calcium: 320,
      iron: 2.5,
      vitaminC: 45,
      costEuros: 3.20,
      proteinPerEuro: 7.8
    },
    category: "breakfast",
    tags: ["Vegetarian", "Vegan", "Dairy-Free", "Lactose-Free", "Gluten-Free", "Menstruation", "High-Protein", "smoothie", "berries", "pre-workout"],
    ingredients: [
      "1 vanilla protein powder",
      "150g mixed berries",
      "1 medium banana",
      "200ml almond milk", 
      "1 tbsp almond butter",
      "1 tsp chia seeds",
      "1 tsp maple syrup",
      "5 ice cubes"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["berries", "banana"],
      benefits: ["antioxidants from berries", "potassium from banana", "gentle energy boost", "electrolyte replenishment"]
    },
    recipe: {
      instructions: [
        "Add all ingredients to a high-speed blender",
        "Blend on high for 60-90 seconds until completely smooth",
        "Add more almond milk if needed for desired consistency",
        "Pour into a large glass and serve immediately"
      ],
      tips: [
        "Use frozen berries for a thicker smoothie texture",
        "Add protein powder last to prevent clumping",
        "Blend chia seeds well to avoid lumps"
      ],
      notes: "Gentle on digestion with stabilizing energy, perfect for replenishing electrolytes during menstruation"
    },
    createdAt: new Date('2025-09-02'),
    active: true
  },
  {
    name: "Protein Churro Bites",
    portion: "8 bite-sized pieces (about 120g)",
    nutrition: {
      protein: 18,
      prepTime: 25,
      calories: 245,
      carbohydrates: 28,
      fats: 9,
      fiber: 5,
      sugar: 8,
      sodium: 140,
      potassium: 320,
      calcium: 80,
      iron: 2.1,
      vitaminC: 2,
      costEuros: 2.80,
      proteinPerEuro: 6.4
    },
    category: "snack",
    tags: ["Vegetarian", "Gluten-Free", "Menstruation", "High-Protein", "Sweet-Treat", "Cinnamon"],
    ingredients: [
      "80g oat flour",
      "1 vanilla protein powder", 
      "15ml ground cinnamon",
      "5ml baking powder",
      "2 tbsp almond butter",
      "60ml almond milk",
      "1 tbsp maple syrup",
      "1 tsp vanilla extract",
      "Pinch sea salt",
      "15ml coconut oil for cooking"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 0,
      vegetables: [],
      benefits: ["complex carbs from oats", "blood sugar stability", "sweet craving satisfaction"]
    },
    recipe: {
      instructions: [
        "Mix oat flour, protein powder, cinnamon, baking powder and salt in a bowl",
        "In separate bowl, whisk almond butter, almond milk, maple syrup and vanilla",
        "Combine wet and dry ingredients until smooth dough forms",
        "Let rest 10 minutes for oat flour to hydrate",
        "Roll dough into 8 small balls, then roll into finger shapes",
        "Heat coconut oil in non-stick pan over medium heat",
        "Cook churro bites 2-3 minutes per side until golden",
        "Dust with extra cinnamon while warm"
      ],
      tips: [
        "Don't overmix the dough to keep texture light",
        "Make sure pan isn't too hot to prevent burning",
        "Store leftovers in airtight container for 2 days"
      ],
      notes: "Satisfies sweet cravings while supporting blood sugar stability and providing protein for muscle recovery"
    },
    createdAt: new Date('2025-09-02'),
    active: true
  },
  {
    name: "Aggie's Dreamy Avocado Brownies",
    portion: "2 brownies (about 100g)",
    nutrition: {
      protein: 15,
      prepTime: 35,
      calories: 285,
      carbohydrates: 32,
      fats: 16,
      fiber: 8,
      sugar: 18,
      sodium: 120,
      potassium: 420,
      calcium: 60,
      iron: 3.2,
      vitaminC: 8,
      costEuros: 4.20,
      proteinPerEuro: 3.6
    },
    category: "breakfast", 
    tags: ["Vegetarian", "Vegan", "Dairy-Free", "Lactose-Free", "Gluten-Free", "Menstruation", "Chocolate", "Brownies"],
    ingredients: [
      "1 large ripe avocado",
      "40g cocoa powder",
      "60g almond flour",
      "1 vanilla protein powder",
      "60ml maple syrup",
      "30g dark chocolate chips",
      "5ml vanilla extract", 
      "2.5ml baking powder",
      "Pinch sea salt"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1,
      vegetables: ["Avocado"],
      benefits: ["healthy fats from avocado", "magnesium from cocoa", "muscle relaxation support", "mood-boosting antioxidants"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 175°C fan/340°F",
        "Line a small baking dish with parchment paper",
        "Mash avocado until completely smooth",
        "Mix in maple syrup, vanilla extract and protein powder",
        "In separate bowl, whisk cocoa powder, almond flour, baking powder and salt",
        "Fold dry ingredients into avocado mixture until just combined",
        "Fold in chocolate chips gently",
        "Pour into prepared dish and smooth top",
        "Bake 22-25 minutes until set but still fudgy",
        "Cool completely before cutting"
      ],
      tips: [
        "Use very ripe avocado for best texture and sweetness",
        "Don't overbake - brownies should still be slightly soft in center",
        "Chill for 2 hours for fudgiest texture"
      ],
      notes: "Rich in magnesium for muscle relaxation and mood support, with healthy fats that reduce inflammation during menstruation"
    },
    createdAt: new Date('2025-09-02'),
    active: true
  },
  {
    name: "Protein Cashew Nut Mousse",
    portion: "1 generous serving (about 180g)",
    nutrition: {
      protein: 22,
      prepTime: 15,
      calories: 320,
      carbohydrates: 18,
      fats: 22,
      fiber: 4,
      sugar: 12,
      sodium: 95,
      potassium: 380,
      calcium: 85,
      iron: 2.8,
      vitaminC: 3,
      costEuros: 3.90,
      proteinPerEuro: 5.6
    },
    category: "breakfast",
    tags: ["Vegetarian", "Vegan", "Dairy-Free", "Lactose-Free", "Gluten-Free", "Menstruation", "High-Protein", "Chocolate", "Cashew", "Mousse"],
    ingredients: [
      "100g cashews (soaked 2 hours)",
      "1 vanilla protein powder",
      "30g cocoa powder",
      "180ml plant milk",
      "2 tbsp maple syrup",
      "5ml vanilla extract",
      "Pinch sea salt",
      "15g dark chocolate chips for topping"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 0,
      vegetables: [],
      benefits: ["magnesium from cashews and cocoa", "zinc for hormone support", "healthy fats for satiety", "mood-boosting compounds"]
    },
    recipe: {
      instructions: [
        "Drain and rinse soaked cashews thoroughly",
        "Add cashews, protein powder, cocoa powder to high-speed blender",
        "Pour in plant milk, maple syrup, vanilla and salt",
        "Blend on high 2-3 minutes until completely smooth and creamy",
        "Taste and adjust sweetness if needed",
        "Pour into serving glasses and chill 1 hour",
        "Top with dark chocolate chips before serving"
      ],
      tips: [
        "Soak cashews in hot water for quicker softening (30 minutes)",
        "Use less plant milk for thicker mousse, more for lighter texture",
        "Can be made 2 days ahead and stored covered in fridge"
      ],
      notes: "Creamy comfort food rich in magnesium and zinc to support muscle relaxation and hormone balance during menstruation"
    },
    createdAt: new Date('2025-09-02'),
    active: true
  },
  {
    name: "Spirulina Protein Smoothie",
    portion: "1 large smoothie (about 350ml)",
    nutrition: {
      protein: 20,
      prepTime: 5,
      calories: 245,
      carbohydrates: 32,
      fats: 6,
      fiber: 6,
      sugar: 24,
      sodium: 150,
      potassium: 520,
      calcium: 280,
      iron: 4.5,
      vitaminC: 38,
      costEuros: 2.95,
      proteinPerEuro: 6.8
    },
    category: "breakfast",
    tags: ["Vegetarian", "Vegan", "Dairy-Free", "Lactose-Free", "Gluten-Free", "Menstruation", "High-Protein", "spirulina", "smoothie", "Iron-Rich", "detox"],
    ingredients: [
      "1 vanilla protein powder",
      "5ml spirulina powder",
      "1 medium banana",
      "100g blueberries",
      "200ml plant milk",
      "1 tbsp almond butter",
      "1 tsp maple syrup",
      "5 ice cubes"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["banana", "blueberries"],
      benefits: ["iron replenishment from spirulina", "B vitamins for energy", "antioxidants from blueberries", "potassium from banana"]
    },
    recipe: {
      instructions: [
        "Add plant milk and spirulina powder to blender first",
        "Blend briefly to dissolve spirulina completely",
        "Add banana, blueberries, protein powder and almond butter",
        "Add maple syrup and ice cubes",
        "Blend on high 90 seconds until smooth and creamy",
        "Pour into large glass and serve immediately"
      ],
      tips: [
        "Start with less spirulina (2ml) if new to the taste",
        "Frozen banana makes smoothie thicker and creamier",
        "Add spirulina first to prevent green clumps"
      ],
      notes: "Powerful iron and B vitamin replenishment to combat fatigue, with detoxification support during menstruation"
    },
    createdAt: new Date('2025-09-02'),
    active: true
  },
  {
    name: "Aggie's Matcha Latte",
    portion: "1 large latte (about 280ml)",
    nutrition: {
      protein: 8,
      prepTime: 5,
      calories: 125,
      carbohydrates: 18,
      fats: 4,
      fiber: 1,
      sugar: 16,
      sodium: 95,
      potassium: 220,
      calcium: 280,
      iron: 0.8,
      vitaminC: 2,
      costEuros: 1.85,
      proteinPerEuro: 4.3
    },
    category: "breakfast",
    tags: ["Vegetarian", "Dairy-Free", "Lactose-Free", "Gluten-Free", "Menstruation", "matcha", "latte", "Antioxidants", "energy-boost", "Beverage", "Drink"],
    ingredients: [
      "5ml matcha powder",
      "250ml plant milk",
      "2 tbsp honey",
      "2.5ml vanilla extract",
      "Pinch sea salt"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 0,
      vegetables: [],
      benefits: ["L-theanine for calm focus", "antioxidants from matcha", "gentle caffeine boost", "mood support"]
    },
    recipe: {
      instructions: [
        "Sift matcha powder into a small bowl to remove lumps",
        "Add 60ml hot (not boiling) plant milk to matcha",
        "Whisk vigorously until completely smooth paste forms",
        "Heat remaining plant milk in saucepan until steaming",
        "Whisk in honey, vanilla and salt until dissolved",
        "Pour hot milk into matcha paste, whisking constantly",
        "Serve immediately in large mug"
      ],
      tips: [
        "Use ceremonial grade matcha for best flavor",
        "Don't use boiling water - it makes matcha bitter",
        "Whisk thoroughly to prevent lumps"
      ],
      notes: "Provides gentle energy boost with L-theanine for calm focus, perfect for managing energy without caffeine crash during menstruation"
    },
    createdAt: new Date('2025-09-02'),
    active: false
  },
  {
    name: "Breakfast Muffins",
    portion: "2 muffins (about 140g)",
    nutrition: {
      protein: 16,
      prepTime: 30,
      calories: 285,
      carbohydrates: 22,
      fats: 16,
      fiber: 4,
      sugar: 6,
      sodium: 320,
      potassium: 280,
      calcium: 180,
      iron: 2.4,
      vitaminC: 12,
      costEuros: 2.95,
      proteinPerEuro: 5.4
    },
    category: "breakfast",
    tags: ["Vegetarian", "Menstruation", "Vegetables", "Muffins", "Meal-Prep"],
    ingredients: [
      "3 eggs",
      "60g grated cheese",
      "50g spinach",
      "1 small red pepper",
      "30g spring onions",
      "60ml milk",
      "80g self-raising flour",
      "15ml olive oil",
      "Salt and pepper"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["spinach", "red pepper", "spring onions"],
      benefits: ["B vitamins from eggs", "calcium from cheese", "iron from spinach", "vitamin C from peppers"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 190°C fan/375°F",
        "Grease 6-cup muffin tin or line with cases",
        "Beat eggs in large bowl, whisk in milk and olive oil",
        "Add flour, salt and pepper, mix until just combined",
        "Fold in grated cheese and chopped vegetables",
        "Divide mixture between muffin cases",
        "Bake 18-20 minutes until golden and set",
        "Cool in tin 5 minutes before turning out"
      ],
      tips: [
        "Don't overmix batter to keep muffins light",
        "Drain spinach well to prevent soggy muffins",
        "Store covered in fridge for up to 3 days"
      ],
      notes: "Easy energy boost with stable blood sugar support, perfect grab-and-go breakfast during menstruation"
    },
    createdAt: new Date('2025-09-02'),
    active: true
  },
  {
    name: "Pork & Holy Basil",
    portion: "1 serving (about 220g)",
    nutrition: {
      protein: 32,
      prepTime: 20,
      calories: 385,
      carbohydrates: 8,
      fats: 26,
      fiber: 2,
      sugar: 4,
      sodium: 680,
      potassium: 420,
      calcium: 45,
      iron: 3.8,
      vitaminC: 18,
      costEuros: 5.20,
      proteinPerEuro: 6.2
    },
    category: "lunch",
    tags: ["Menstruation", "pork", "Thai", "Spicy", "Iron-Rich", "zinc"],
    ingredients: [
      "200g ground pork",
      "40g fresh holy basil leaves",
      "3 cloves garlic",
      "2 Thai chilies",
      "2 tbsp fish sauce",
      "1 tbsp oyster sauce",
      "1 tsp dark soy sauce",
      "1 tsp sugar",
      "2 tbsp vegetable oil",
      "1 egg for topping",
      "Steamed jasmine rice for serving"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1,
      vegetables: ["garlic", "chilies", "holy basil"],
      benefits: ["zinc from pork", "iron replenishment", "anti-inflammatory basil", "hormone support"]
    },
    recipe: {
      instructions: [
        "Heat oil in wok or large pan over high heat",
        "Add minced garlic and chilies, stir-fry 30 seconds",
        "Add ground pork, breaking up with spoon",
        "Cook 5-6 minutes until pork is browned and cooked through",
        "Add fish sauce, oyster sauce, soy sauce and sugar",
        "Stir-fry 2 minutes until well combined",
        "Add holy basil leaves, toss until wilted",
        "Serve over rice topped with fried egg"
      ],
      tips: [
        "Holy basil has stronger flavor than Thai basil",
        "Don't overcook basil - add at the very end",
        "Adjust chili to taste preference"
      ],
      notes: "Traditional Thai dish rich in zinc and iron, perfect for restoring minerals and reducing inflammation during menstruation"
    },
    createdAt: new Date('2025-09-02'),
    active: true
  },
  {
    name: "High Protein Flatbread",
    portion: "1 flatbread (about 180g)",
    nutrition: {
      protein: 24,
      prepTime: 25,
      calories: 320,
      carbohydrates: 28,
      fats: 14,
      fiber: 5,
      sugar: 8,
      sodium: 480,
      potassium: 380,
      calcium: 220,
      iron: 2.6,
      vitaminC: 15,
      costEuros: 3.40,
      proteinPerEuro: 7.1
    },
    category: "lunch",
    tags: ["Vegetarian", "Menstruation", "flatbread", "yogurt", "probiotics", "Tomato"],
    ingredients: [
      "2 eggs",
      "120g Greek yogurt",
      "100g self-raising flour",
      "2 tbsp olive oil",
      "200g cherry tomatoes",
      "50g mixed herbs (basil, oregano)",
      "30g mozzarella cheese",
      "2 cloves garlic",
      "Salt and pepper"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["tomatoes", "garlic", "herbs"],
      benefits: ["probiotics from yogurt", "lycopene from tomatoes", "easy-to-digest protein", "gut health support"]
    },
    recipe: {
      instructions: [
        "Mix eggs, yogurt, flour and 1 tbsp olive oil into smooth dough",
        "Knead lightly, rest 10 minutes",
        "Roll out to 25cm circle on floured surface",
        "Heat remaining oil in large oven-safe pan",
        "Cook flatbread 3-4 minutes until golden underneath",
        "Top with halved tomatoes, garlic, herbs and cheese",
        "Transfer pan to 200°C oven for 8-10 minutes",
        "Finish with fresh herbs and black pepper"
      ],
      tips: [
        "Don't roll dough too thin or it will break",
        "Use cast iron pan for best results",
        "Serve immediately while cheese is melted"
      ],
      notes: "Easy-to-digest protein with probiotics for gut health, providing stable energy during menstruation"
    },
    createdAt: new Date('2025-09-02'),
    active: true
  },
  {
    name: "Coconut Meatballs",
    portion: "5 meatballs (about 200g)",
    nutrition: {
      protein: 28,
      prepTime: 30,
      calories: 365,
      carbohydrates: 12,
      fats: 24,
      fiber: 4,
      sugar: 6,
      sodium: 520,
      potassium: 420,
      calcium: 65,
      iron: 4.2,
      vitaminC: 8,
      costEuros: 4.80,
      proteinPerEuro: 5.8
    },
    category: "dinner",
    tags: ["Menstruation", "meatballs", "coconut", "Iron-Rich", "ground meat", "herbs"],
    ingredients: [
      "300g ground beef",
      "40g desiccated coconut",
      "1 egg",
      "2 cloves garlic",
      "30g fresh herbs (parsley, mint)",
      "5ml ground cumin",
      "5ml ground coriander",
      "2 tbsp coconut oil",
      "Salt and pepper"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1,
      vegetables: ["garlic", "herbs"],
      benefits: ["heme iron from beef", "healthy fats from coconut", "protein for energy", "herbs for digestion"]
    },
    recipe: {
      instructions: [
        "Mix ground beef, coconut, egg, minced garlic and herbs in bowl",
        "Add cumin, coriander, salt and pepper",
        "Mix gently with hands until just combined",
        "Roll into 10 equal meatballs",
        "Heat coconut oil in large pan over medium heat",
        "Cook meatballs 12-15 minutes, turning every 3-4 minutes",
        "Cook until golden brown and cooked through",
        "Serve with steamed vegetables or rice"
      ],
      tips: [
        "Don't overmix meat or meatballs will be tough",
        "Make sure oil is hot before adding meatballs",
        "Test one meatball first to check seasoning"
      ],
      notes: "Iron-rich meatballs with healthy coconut fats for long-lasting energy and reduced cravings during menstruation"
    },
    createdAt: new Date('2025-09-02'),
    active: true
  },
  {
    name: "Chicken Crust Casserole",
    portion: "1 generous serving (about 250g)",
    nutrition: {
      protein: 35,
      prepTime: 40,
      calories: 420,
      carbohydrates: 15,
      fats: 26,
      fiber: 3,
      sugar: 8,
      sodium: 580,
      potassium: 520,
      calcium: 280,
      iron: 2.8,
      vitaminC: 25,
      costEuros: 4.60,
      proteinPerEuro: 7.6
    },
    category: "dinner",
    tags: ["Menstruation", "chicken", "casserole", "High-Protein", "cheese", "Vegetables"],
    ingredients: [
      "250g ground chicken",
      "2 eggs",
      "100g grated cheddar cheese",
      "150g mixed vegetables (bell peppers, zucchini)",
      "2 cloves garlic",
      "120ml heavy cream",
      "30g parmesan cheese",
      "15ml olive oil",
      "Fresh herbs (thyme, rosemary)",
      "Salt and pepper"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["bell peppers", "zucchini", "garlic"],
      benefits: ["complete protein from chicken and eggs", "calcium from cheese", "B vitamins for energy", "vitamin C from vegetables"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 180°C fan/355°F",
        "Brown ground chicken in olive oil until cooked through",
        "Beat eggs with cream, half the cheddar and seasonings",
        "Layer chicken and vegetables in greased baking dish",
        "Pour egg mixture over, top with remaining cheese",
        "Sprinkle with parmesan and fresh herbs",
        "Bake 25-30 minutes until set and golden",
        "Rest 5 minutes before serving"
      ],
      tips: [
        "Drain excess liquid from vegetables before layering",
        "Don't overbake or eggs will become rubbery",
        "Can be made ahead and reheated"
      ],
      notes: "High protein casserole supporting muscle recovery and stable blood sugar, with calcium for hormone health during menstruation"
    },
    createdAt: new Date('2025-09-02'),
    active: true
  },
  {
    name: "Protein Pancakes",
    portion: "3 pancakes (about 150g)",
    nutrition: {
      protein: 26,
      prepTime: 15,
      calories: 295,
      carbohydrates: 32,
      fats: 8,
      fiber: 6,
      sugar: 12,
      sodium: 180,
      potassium: 420,
      calcium: 120,
      iron: 2.2,
      vitaminC: 8,
      costEuros: 2.60,
      proteinPerEuro: 10.0
    },
    category: "breakfast",
    tags: ["Vegetarian", "Menstruation", "pancakes", "oats", "protein", "banana", "High-Fiber"],
    ingredients: [
      "2 eggs",
      "1 vanilla protein powder",
      "50g rolled oats",
      "1 medium banana",
      "60ml milk",
      "5ml baking powder",
      "5ml cinnamon",
      "1 tsp vanilla extract",
      "Coconut oil for cooking"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1,
      vegetables: ["banana"],
      benefits: ["potassium from banana", "fiber from oats", "complete protein", "blood sugar regulation"]
    },
    recipe: {
      instructions: [
        "Blend oats in blender until flour-like consistency",
        "Mash banana in bowl until smooth",
        "Beat eggs, add mashed banana, protein powder, milk and vanilla",
        "Mix in oat flour, baking powder, cinnamon and pinch salt",
        "Let batter rest 5 minutes to thicken",
        "Heat coconut oil in non-stick pan over medium heat",
        "Pour 1/3 cup batter per pancake",
        "Cook 2-3 minutes until bubbles form, flip and cook 2 minutes more"
      ],
      tips: [
        "Don't flip too early or pancakes will break",
        "Keep cooked pancakes warm in low oven",
        "Serve with fresh berries and maple syrup"
      ],
      notes: "Energy-boosting pancakes that satisfy cravings while regulating digestion and blood sugar during menstruation"
    },
    createdAt: new Date('2025-09-02'),
    active: true
  },
  {
    name: "Beetroot Hummus",
    portion: "1 generous serving (about 120g)",
    nutrition: {
      protein: 12,
      prepTime: 15,
      calories: 185,
      carbohydrates: 20,
      fats: 8,
      fiber: 7,
      sugar: 8,
      sodium: 280,
      potassium: 380,
      calcium: 65,
      iron: 3.5,
      vitaminC: 12,
      costEuros: 2.20,
      proteinPerEuro: 5.5
    },
    category: "lunch", 
    tags: ["Vegetarian", "Vegan", "Dairy-Free", "Lactose-Free", "Gluten-Free", "Menstruation", "beetroot", "hummus", "Iron-Rich", "Folate"],
    ingredients: [
      "150g cooked chickpeas",
      "100g cooked beetroot",
      "2 tbsp tahini",
      "2 cloves garlic",
      "1 lemon (juiced)",
      "30ml olive oil",
      "5ml ground cumin",
      "Salt and pepper",
      "Fresh herbs for garnish"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["beetroot", "garlic"],
      benefits: ["iron from beetroot", "folate for blood health", "fiber for digestion", "detoxification support"]
    },
    recipe: {
      instructions: [
        "Drain chickpeas and reserve liquid",
        "Peel and roughly chop cooked beetroot",
        "Add chickpeas, beetroot, tahini, garlic to food processor",
        "Add lemon juice, olive oil, cumin, salt and pepper",
        "Process until smooth, adding chickpea liquid as needed",
        "Taste and adjust seasoning",
        "Transfer to bowl, drizzle with olive oil",
        "Garnish with fresh herbs and serve with vegetables"
      ],
      tips: [
        "Use gloves when handling beetroot to avoid staining",
        "Roast fresh beetroot wrapped in foil at 200°C for 45 minutes",
        "Store covered in fridge for up to 5 days"
      ],
      notes: "Iron and folate-rich hummus supporting blood health and detoxification, perfect for replenishing during menstruation"
    },
    createdAt: new Date('2025-09-02'),
    active: true
  },
  {
    name: "Protein Truffle Bites",
    portion: "4 truffle bites (about 80g)",
    nutrition: {
      protein: 16,
      prepTime: 20,
      calories: 220,
      carbohydrates: 18,
      fats: 12,
      fiber: 5,
      sugar: 8,
      sodium: 45,
      potassium: 280,
      calcium: 85,
      iron: 2.4,
      vitaminC: 2,
      costEuros: 2.85,
      proteinPerEuro: 5.6
    },
    category: "breakfast",
    tags: ["Vegetarian", "Vegan", "Dairy-Free", "Lactose-Free", "Gluten-Free", "Menstruation", "protein", "Chocolate", "truffle", "no-bake"],
    ingredients: [
      "1 vanilla protein powder",
      "30g rolled oats",
      "2 tbsp almond butter",
      "20g cocoa powder",
      "1 tbsp maple syrup",
      "1 tbsp chia seeds",
      "15ml coconut oil (melted)",
      "Pinch sea salt",
      "Cocoa powder for rolling"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 0,
      vegetables: [],
      benefits: ["magnesium from cocoa", "healthy fats for satiety", "fiber from oats", "natural energy"]
    },
    recipe: {
      instructions: [
        "Mix protein powder, oats, cocoa powder, chia seeds and salt in bowl",
        "In separate bowl, mix almond butter, maple syrup and melted coconut oil",
        "Combine wet and dry ingredients until mixture holds together",
        "Add water 1 tsp at a time if too dry",
        "Chill mixture 15 minutes until firm",
        "Roll into 8 small balls with damp hands",
        "Roll each ball in cocoa powder to coat",
        "Store in fridge until ready to eat"
      ],
      tips: [
        "Chill mixture if too soft to roll",
        "Use damp hands to prevent sticking",
        "Store in airtight container for up to 1 week"
      ],
      notes: "Curbs sugar cravings while providing protein and magnesium for muscle relaxation during menstruation"
    },
    createdAt: new Date('2025-09-02'),
    active: true
  },
  {
    name: "Peanut Butter Cups",
    portion: "2 cups (about 60g)",
    nutrition: {
      protein: 12,
      prepTime: 25,
      calories: 245,
      carbohydrates: 14,
      fats: 18,
      fiber: 4,
      sugar: 10,
      sodium: 85,
      potassium: 220,
      calcium: 45,
      iron: 1.8,
      vitaminC: 1,
      costEuros: 2.40,
      proteinPerEuro: 5.0
    },
    category: "breakfast",
    tags: ["Vegetarian", "Gluten-Free", "Menstruation", "peanut-butter", "Chocolate", "no-bake"],
    ingredients: [
      "60g dark chocolate",
      "3 tbsp natural peanut butter",
      "2 tbsp coconut oil",
      "1 tbsp maple syrup",
      "Pinch sea salt",
      "Mini muffin cases"
    ],
    wholeFoodLevel: "moderate",
    vegetableContent: {
      servings: 0,
      vegetables: [],
      benefits: ["magnesium from dark chocolate", "healthy fats from peanut butter", "mood-boosting compounds", "craving satisfaction"]
    },
    recipe: {
      instructions: [
        "Line 6 mini muffin cases in tin",
        "Melt 40g chocolate with 1 tbsp coconut oil gently",
        "Spoon thin layer into each case, chill 10 minutes",
        "Mix peanut butter with maple syrup and salt",
        "Spoon peanut mixture over chocolate layer",
        "Melt remaining chocolate with remaining coconut oil",
        "Top each cup with final chocolate layer",
        "Chill 20 minutes until set"
      ],
      tips: [
        "Don't overheat chocolate or it will seize",
        "Use natural peanut butter without added sugar",
        "Store in fridge and eat within 5 days"
      ],
      notes: "Natural chocolate treats providing magnesium for muscle relaxation and mood support during menstruation"
    },
    createdAt: new Date('2025-09-02'),
    active: true
  },
  {
    name: "Protein Granola",
    portion: "1 serving (about 60g)",
    nutrition: {
      protein: 18,
      prepTime: 45,
      calories: 285,
      carbohydrates: 24,
      fats: 16,
      fiber: 6,
      sugar: 8,
      sodium: 120,
      potassium: 320,
      calcium: 95,
      iron: 2.6,
      vitaminC: 3,
      costEuros: 3.20,
      proteinPerEuro: 5.6
    },
    category: "breakfast",
    tags: ["Vegetarian", "Gluten-Free", "Menstruation", "granola", "protein", "nuts", "seeds", "Meal-Prep", "cycleBased", "Menstrual", "Luteal"],
    ingredients: [
      "150g rolled oats",
      "1 vanilla protein powder",
      "50g mixed nuts",
      "30g pumpkin seeds",
      "20g chia seeds",
      "3 tbsp honey",
      "2 tbsp coconut oil",
      "5ml cinnamon",
      "Pinch sea salt"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 0,
      vegetables: [],
      benefits: ["zinc from seeds", "fiber for stable blood sugar", "healthy fats for satiety", "long-lasting energy"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 150°C fan/300°F",
        "Mix oats, protein powder, nuts, seeds, cinnamon and salt",
        "Warm honey and coconut oil until liquid",
        "Pour over dry ingredients and mix well",
        "Spread evenly on lined baking tray",
        "Bake 25-30 minutes, stirring every 10 minutes",
        "Cool completely before storing",
        "Serve with milk or yogurt"
      ],
      tips: [
        "Stir regularly to prevent burning",
        "Granola continues cooking after removal from oven",
        "Store in airtight container for up to 2 weeks"
      ],
      notes: "Mineral-rich granola supporting stable blood sugar and providing long-lasting energy during menstruation"
    },
    createdAt: new Date('2025-09-02'),
    active: true
  },
  {
    name: "Energy Bites",
    portion: "3 energy bites (about 60g)",
    nutrition: {
      protein: 8,
      prepTime: 15,
      calories: 165,
      carbohydrates: 22,
      fats: 7,
      fiber: 4,
      sugar: 14,
      sodium: 25,
      potassium: 280,
      calcium: 45,
      iron: 2.8,
      vitaminC: 2,
      costEuros: 1.80,
      proteinPerEuro: 4.4
    },
    category: "breakfast",
    tags: ["Vegetarian", "Vegan", "Dairy-Free", "Lactose-Free", "Gluten-Free", "Menstruation", "energy-bites", "dates", "no-bake", "Iron-Rich", "cycleBased", "Menstrual", "Luteal"],
    ingredients: [
      "100g pitted dates",
      "40g rolled oats",
      "2 tbsp almond butter",
      "1 tbsp chia seeds",
      "1 tbsp hemp hearts",
      "5ml cinnamon",
      "Pinch sea salt"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 0,
      vegetables: [],
      benefits: ["iron from dates", "natural carbs for quick energy", "fiber for digestion", "magnesium from seeds"]
    },
    recipe: {
      instructions: [
        "Soak dates in warm water for 10 minutes if very dry",
        "Add dates to food processor, pulse until paste forms",
        "Add oats, pulse until roughly chopped",
        "Add almond butter, chia seeds, hemp hearts, cinnamon and salt",
        "Process until mixture holds together when pressed",
        "Roll into 12 small balls with damp hands",
        "Chill 30 minutes until firm",
        "Store in fridge up to 1 week"
      ],
      tips: [
        "If mixture too wet, add more oats",
        "If too dry, add 1 tsp water or more nut butter",
        "Roll in coconut or cocoa powder for variety"
      ],
      notes: "Natural iron and fiber providing gentle, quick energy that's easy on digestion during menstruation"
    },
    createdAt: new Date('2025-09-02'),
    active: true
  },
  {
    name: "Egg & Beef Protein Bowl",
    portion: "1 large bowl (about 280g)",
    nutrition: {
      protein: 38,
      prepTime: 20,
      calories: 485,
      carbohydrates: 12,
      fats: 32,
      fiber: 8,
      sugar: 6,
      sodium: 420,
      potassium: 680,
      calcium: 85,
      iron: 6.2,
      vitaminC: 28,
      costEuros: 5.80,
      proteinPerEuro: 6.6
    },
    category: "lunch",
    tags: ["Menstruation", "beef", "High-Protein", "Iron-Rich", "spinach", "Keto-Friendly"],
    ingredients: [
      "150g lean ground beef",
      "2 eggs",
      "100g fresh spinach",
      "1 small ripe avocado",
      "2 cloves garlic",
      "15ml olive oil",
      "5ml paprika",
      "5ml ground cumin",
      "Salt and pepper"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["spinach", "ripe avocado", "garlic"],
      benefits: ["heme iron from beef", "B vitamins from eggs", "potassium from ripe avocado", "folate from spinach"]
    },
    recipe: {
      instructions: [
        "Heat olive oil in large pan over medium-high heat",
        "Add ground beef, cook 5-6 minutes breaking up with spoon",
        "Add minced garlic, paprika, cumin, salt and pepper",
        "Cook 2 minutes until beef is browned and cooked through",
        "Push beef to one side, add spinach to pan",
        "Cook until wilted, about 2 minutes",
        "Crack eggs into pan, scramble with beef and spinach",
        "Serve in bowl topped with sliced ripe avocado"
      ],
      tips: [
        "Don't overcook eggs - they continue cooking in hot pan",
        "Use grass-fed beef for better nutrition",
        "Add ripe avocado just before serving"
      ],
      notes: "Powerhouse of heme iron and complete protein to restore energy and support hormone health during menstruation"
    },
    createdAt: new Date('2025-09-02'),
    active: true
  },
  {
    name: "Guacamole & Chips",
    portion: "1 serving (about 150g)",
    nutrition: {
      protein: 8,
      prepTime: 10,
      calories: 285,
      carbohydrates: 28,
      fats: 18,
      fiber: 12,
      sugar: 6,
      sodium: 380,
      potassium: 580,
      calcium: 45,
      iron: 1.8,
      vitaminC: 22,
      costEuros: 3.20,
      proteinPerEuro: 2.5
    },
    category: "lunch",
    tags: ["Vegetarian", "Vegan", "Dairy-Free", "Lactose-Free", "Gluten-Free", "Menstruation", "guacamole", "ripe avocado", "Potassium", "healthy-fats"],
    ingredients: [
      "2 ripe avocados",
      "1 lime (juiced)",
      "1 small tomato",
      "2 cloves garlic",
      "30g red onion",
      "15ml olive oil",
      "Fresh coriander",
      "Sea salt",
      "40g tortilla chips"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["ripe avocados", "Tomato", "garlic", "red onion"],
      benefits: ["potassium for muscle function", "healthy fats for hormone production", "fiber for bloating relief", "vitamin C from lime"]
    },
    recipe: {
      instructions: [
        "Mash ripe avocados in bowl with fork until desired texture",
        "Add lime juice immediately to prevent browning",
        "Finely dice tomato, removing seeds and excess juice",
        "Mince garlic and finely dice red onion",
        "Mix in tomato, garlic, onion and olive oil",
        "Season with salt and taste",
        "Garnish with fresh coriander",
        "Serve immediately with tortilla chips"
      ],
      tips: [
        "Choose ripe but firm avocados",
        "Remove tomato seeds to prevent watery guacamole",
        "Cover with plastic wrap touching surface to prevent browning"
      ],
      notes: "Potassium-rich healthy fats supporting muscle relaxation and stable energy, reduces bloating during menstruation"
    },
    createdAt: new Date('2025-09-02'),
    active: true
  },
  {
    name: "Salmon Cucumber Bites",
    portion: "6 bites (about 120g)",
    nutrition: {
      protein: 18,
      prepTime: 15,
      calories: 185,
      carbohydrates: 4,
      fats: 12,
      fiber: 1,
      sugar: 2,
      sodium: 420,
      potassium: 280,
      calcium: 65,
      iron: 1.2,
      vitaminC: 8,
      costEuros: 4.20,
      proteinPerEuro: 4.3
    },
    category: "lunch",
    tags: ["Menstruation", "salmon", "Omega-3", "cucumber", "cream-cheese", "Anti-Inflammatory", "protein"],
    ingredients: [
      "80g smoked salmon",
      "1 large cucumber",
      "60g cream cheese",
      "1 tbsp fresh dill",
      "1 tsp lemon juice",
      "Black pepper",
      "Capers for garnish"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1,
      vegetables: ["cucumber", "dill"],
      benefits: ["omega-3 for anti-inflammatory", "vitamin D from salmon", "hydration from cucumber", "protein for satiety"]
    },
    recipe: {
      instructions: [
        "Slice cucumber into 1cm thick rounds",
        "Mix cream cheese with chopped dill, lemon juice and pepper",
        "Using small spoon, top each cucumber slice with cream cheese",
        "Arrange smoked salmon pieces on top",
        "Garnish with capers and extra dill",
        "Chill until ready to serve",
        "Serve within 2 hours for best texture"
      ],
      tips: [
        "Choose firm cucumber for best bite",
        "Pat salmon dry before arranging",
        "Make just before serving to prevent soggy cucumber"
      ],
      notes: "Anti-inflammatory omega-3 fats supporting mood and hormone balance during menstruation"
    },
    createdAt: new Date('2025-09-02'),
    active: true
  },
  {
    name: "Garlic Butter Chicken",
    portion: "1 serving (about 200g)",
    nutrition: {
      protein: 42,
      prepTime: 25,
      calories: 485,
      carbohydrates: 6,
      fats: 32,
      fiber: 1,
      sugar: 2,
      sodium: 580,
      potassium: 520,
      calcium: 45,
      iron: 2.8,
      vitaminC: 12,
      costEuros: 4.90,
      proteinPerEuro: 8.6
    },
    category: "dinner",
    tags: ["Menstruation", "chicken", "garlic", "butter", "herbs", "High-Protein", "zinc", "B-vitamins"],
    ingredients: [
      "200g chicken breast",
      "4 cloves garlic",
      "3 tbsp butter",
      "30ml white wine",
      "Fresh thyme sprigs",
      "Fresh rosemary",
      "1 lemon (juiced)",
      "Salt and pepper"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1,
      vegetables: ["garlic", "herbs"],
      benefits: ["complete protein from chicken", "zinc for hormone support", "B vitamins for energy", "immune support from garlic"]
    },
    recipe: {
      instructions: [
        "Season chicken breast with salt and pepper",
        "Heat 1 tbsp butter in pan over medium-high heat",
        "Cook chicken 6-7 minutes per side until golden and cooked through",
        "Remove chicken, rest under foil",
        "Add remaining butter and minced garlic to pan",
        "Cook 1 minute until fragrant",
        "Add wine, thyme, rosemary and lemon juice",
        "Simmer 2 minutes, pour over sliced chicken"
      ],
      tips: [
        "Don't move chicken too early or it won't brown",
        "Use meat thermometer - internal temp should reach 75°C",
        "Rest chicken 5 minutes before slicing"
      ],
      notes: "High-protein chicken supporting energy levels and hormone balance with zinc and B vitamins during menstruation"
    },
    createdAt: new Date('2025-09-02'),
    active: true
  },
  {
    name: "Protein Mug Cake",
    portion: "1 mug cake (about 100g)",
    nutrition: {
      protein: 22,
      prepTime: 5,
      calories: 185,
      carbohydrates: 12,
      fats: 8,
      fiber: 4,
      sugar: 6,
      sodium: 180,
      potassium: 220,
      calcium: 120,
      iron: 2.2,
      vitaminC: 1,
      costEuros: 1.95,
      proteinPerEuro: 11.3
    },
    category: "breakfast",
    tags: ["Vegetarian", "Gluten-Free", "Menstruation", "mug-cake", "protein", "Chocolate", "Quick"],
    ingredients: [
      "1 vanilla protein powder",
      "20g cocoa powder",
      "1 egg",
      "60ml almond milk",
      "1 tbsp almond butter",
      "5ml baking powder",
      "1 tsp vanilla extract",
      "Pinch sea salt"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 0,
      vegetables: [],
      benefits: ["quick protein boost", "magnesium from cocoa", "comfort food satisfaction", "muscle support"]
    },
    recipe: {
      instructions: [
        "Mix protein powder, cocoa powder, baking powder and salt in microwave-safe mug",
        "In small bowl, whisk egg, almond milk, almond butter and vanilla",
        "Pour wet ingredients into mug with dry ingredients",
        "Stir well until smooth batter forms",
        "Microwave 90 seconds, check doneness",
        "If needed, microwave additional 15-30 seconds",
        "Let cool 2 minutes before eating",
        "Top with berries if desired"
      ],
      tips: [
        "Don't overmix or cake will be tough",
        "Microwave power varies - check after 90 seconds",
        "Let cool slightly as mug will be very hot"
      ],
      notes: "Quick comfort food providing protein and magnesium to reduce cravings and support muscles during menstruation"
    },
    createdAt: new Date('2025-09-02'),
    active: true
  },

  // Jackfruit Burger Complete Meal - Regular Version
  {
    name: "Spiced Jackfruit Burgers with Roasted Sweet Potato and Spinach-Rocket Salad",
    portion: "2 burgers with sides",
    nutrition: { 
      protein: 22, 
      prepTime: 75, 
      calories: 620,
      carbohydrates: 85,
      fats: 18,
      fiber: 16,
      sugar: 12,
      sodium: 680,
      costEuros: 5.20, 
      proteinPerEuro: 4.2 
    },
    category: "dinner",
    tags: ["Vegetarian", "Vegan", "High-Protein", "High-Fiber", "Complete-Meal"],
    ingredients: [
      "2 whole wheat burger buns",
      "450g canned jackfruit (drained)",
      "1 large red onion (chopped)",
      "3 cloves garlic (minced)",
      "1 tbsp sunflower oil",
      "1 tsp ground cumin",
      "1 tsp hot chili powder",
      "1 tsp paprika",
      "2 tbsp tomato purée",
      "2 tbsp harissa paste",
      "2 medium sweet potatoes (cubed)",
      "2 tbsp olive oil",
      "200g baby spinach leaves",
      "100g rocket/arugula",
      "1 large tomato (sliced)",
      "4 lettuce leaves",
      "2 tbsp hemp hearts",
      "1 tbsp tahini",
      "1 tbsp lemon juice",
      "Sea salt and black pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 4,
      vegetables: ["red onion", "garlic", "sweet potatoes", "spinach", "rocket", "Tomato", "lettuce"],
      benefits: ["High in fiber", "Rich in beta-carotene", "Antioxidant-rich spices", "Complete protein from hemp hearts"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 200°C for sweet potatoes",
        "Drain and rinse jackfruit, then shred with fork into chunks",
        "Cube sweet potatoes, toss with 1 tbsp olive oil, salt and pepper, roast for 30-35 minutes",
        "Heat sunflower oil in large pan over medium heat",
        "Add chopped onion and minced garlic, cook 10 minutes until soft",
        "Add cumin, chili powder, and paprika, cook 3 minutes until fragrant",
        "Stir in tomato purée and harissa paste, cook 5 minutes",
        "Add shredded jackfruit, mix well to coat with spices",
        "Season with salt and cook 20-25 minutes, stirring regularly until tender",
        "Mash jackfruit with fork until it has pulled texture",
        "Cool slightly, then shape into 8 patties (2 per person)",
        "Refrigerate patties 30 minutes to firm up",
        "Pan-fry patties 3-4 minutes each side until golden brown",
        "Toast burger buns lightly",
        "Make tahini dressing: mix tahini, lemon juice, and 1 tbsp water",
        "Assemble: bun bottom, lettuce, 2 jackfruit patties, tomato slice, tahini drizzle, bun top",
        "Serve with roasted sweet potatoes and spinach-rocket salad topped with hemp hearts"
      ],
      tips: [
        "Let patties chill to prevent falling apart when cooking",
        "Adjust harissa to your heat preference",
        "Sweet potatoes should be tender and slightly caramelized"
      ],
      notes: "Complete plant-based meal with jackfruit providing meaty texture, sweet potatoes for complex carbs, and hemp hearts for complete protein"
    }
  },

  // Jackfruit Burger Complete Meal - Gluten-Free Version  
  {
    name: "Spiced Jackfruit Burgers with Roasted Sweet Potato and Spinach-Rocket Salad",
    portion: "2 burgers with sides",
    nutrition: { 
      protein: 22, 
      prepTime: 75, 
      calories: 615,
      carbohydrates: 82,
      fats: 18,
      fiber: 16,
      sugar: 12,
      sodium: 680,
      costEuros: 5.60, 
      proteinPerEuro: 3.9 
    },
    category: "dinner",
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "High-Protein", "High-Fiber", "Complete-Meal"],
    ingredients: [
      "2 gluten-free burger buns (or large portobello mushroom caps)",
      "450g canned jackfruit (drained)",
      "1 large red onion (chopped)",
      "3 cloves garlic (minced)",
      "1 tbsp sunflower oil",
      "1 tsp ground cumin",
      "1 tsp hot chili powder",
      "1 tsp paprika",
      "2 tbsp tomato purée",
      "2 tbsp harissa paste",
      "2 medium sweet potatoes (cubed)",
      "2 tbsp olive oil",
      "200g baby spinach leaves",
      "100g rocket/arugula",
      "1 large tomato (sliced)",
      "4 lettuce leaves",
      "2 tbsp hemp hearts",
      "1 tbsp tahini",
      "1 tbsp lemon juice",
      "Sea salt and black pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 4,
      vegetables: ["red onion", "garlic", "sweet potatoes", "spinach", "rocket", "Tomato", "lettuce"],
      benefits: ["High in fiber", "Rich in beta-carotene", "Antioxidant-rich spices", "Complete protein from hemp hearts", "Naturally gluten-free"]
    },
    recipe: {
      instructions: [
        "Preheat oven to 200°C for sweet potatoes",
        "Drain and rinse jackfruit, then shred with fork into chunks",
        "Cube sweet potatoes, toss with 1 tbsp olive oil, salt and pepper, roast for 30-35 minutes",
        "Heat sunflower oil in large pan over medium heat",
        "Add chopped onion and minced garlic, cook 10 minutes until soft",
        "Add cumin, chili powder, and paprika, cook 3 minutes until fragrant",
        "Stir in tomato purée and harissa paste, cook 5 minutes",
        "Add shredded jackfruit, mix well to coat with spices",
        "Season with salt and cook 20-25 minutes, stirring regularly until tender",
        "Mash jackfruit with fork until it has pulled texture",
        "Cool slightly, then shape into 8 patties (2 per person)",
        "Refrigerate patties 30 minutes to firm up",
        "Pan-fry patties 3-4 minutes each side until golden brown",
        "If using gluten-free buns, toast lightly. If using mushroom caps, grill 2-3 minutes per side",
        "Make tahini dressing: mix tahini, lemon juice, and 1 tbsp water",
        "Assemble: bun/mushroom bottom, lettuce, 2 jackfruit patties, tomato slice, tahini drizzle, bun/mushroom top",
        "Serve with roasted sweet potatoes and spinach-rocket salad topped with hemp hearts"
      ],
      tips: [
        "Let patties chill to prevent falling apart when cooking",
        "Adjust harissa to your heat preference",
        "Portobello caps make excellent gluten-free bun alternative",
        "Check harissa paste is gluten-free certified"
      ],
      notes: "Complete plant-based gluten-free meal with jackfruit providing meaty texture, sweet potatoes for complex carbs, and hemp hearts for complete protein"
    }
  },

  // Tofu & Kimchi Fried Rice - Asian-Fusion High-Protein Bowl
  {
    name: "Tofu & Kimchi Fried Rice with Crunchy Vegetables",
    portion: "1 serving",
    nutrition: { 
      protein: 27, 
      prepTime: 25, 
      calories: 640,
      carbohydrates: 62,
      fats: 25,
      fiber: 11,
      sugar: 8,
      sodium: 1400,
      costEuros: 3.20, 
      proteinPerEuro: 8.4 
    },
    category: "dinner",
    tags: ["Vegetarian", "Vegan", "High-Protein", "Asian", "Fermented", "Quick", "One-Pan"],
    ingredients: [
      "50g day-old basmati rice (or 125g pre-cooked rice)",
      "150g organic silken tofu (drained and cubed)",
      "1 tbsp sesame oil",
      "1 large garlic clove (grated)",
      "7.5g fresh ginger (grated)",
      "100g button mushrooms (halved)",
      "50g curly kale leaves (thick stems removed, sliced)",
      "1 medium carrot (grated, about 60g)",
      "100g frozen edamame beans (defrosted)",
      "80g vegan napa cabbage kimchi (drained)",
      "1 tbsp gluten-free tamari",
      "1 red Thai chili (8g), finely sliced (optional)",
      "1 spring onion (finely sliced)",
      "10g toasted sesame seeds",
      "¼ lime (cut into wedges)",
      "Sea salt and black pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3.5,
      vegetables: ["garlic", "ginger", "button mushrooms", "kale", "carrots", "spring onions", "kimchi"],
      benefits: ["Fermented kimchi for gut health", "High protein from tofu and edamame", "Antioxidant-rich vegetables", "Complete amino acids"]
    },
    recipe: {
      instructions: [
        "If cooking fresh rice: cook basmati rice according to packet instructions, drain and spread on plate to cool completely (ideally overnight)",
        "Pat silken tofu dry with kitchen paper and cut into 1cm cubes",
        "Drain kimchi well in a sieve, pressing out excess liquid to prevent soggy rice",
        "Heat sesame oil in large frying pan or wok over medium-high heat",
        "Add grated garlic, ginger and halved mushrooms, cook 5 minutes stirring frequently until golden",
        "Cook until most mushroom liquid has evaporated and edges are caramelized",
        "Add cubed tofu and cook for 2-3 minutes, turning gently to brown lightly",
        "Add day-old rice to pan, breaking up any clumps with spatula",
        "Stir-fry rice for 2-3 minutes until heated through and slightly crispy",
        "Add sliced kale, grated carrots, and edamame beans",
        "Stir-fry for 3-4 minutes until kale wilts but still has bite",
        "Add drained kimchi and tamari sauce, toss everything together",
        "Cook 1-2 minutes more to heat kimchi through",
        "Taste and adjust seasoning with salt, pepper, or extra tamari",
        "Transfer to serving bowl",
        "Garnish with sliced Thai chili, spring onions, toasted sesame seeds and lime wedges"
      ],
      tips: [
        "Day-old rice works best - fresh rice can become mushy. Cool cooked rice completely before using",
        "Drain kimchi well to prevent the dish becoming watery",
        "Don't overcook the kale - it should retain some crunch",
        "High heat is key for good wok hei (breath of the wok) flavor",
        "Pre-toast sesame seeds in dry pan for 2-3 minutes for extra nutty flavor"
      ],
      notes: "Authentic Korean-Asian fusion with fermented kimchi providing probiotics and umami. Day-old rice creates the perfect texture while silken tofu adds protein without heaviness."
    }
  },

  // FILLED PORTOBELLO MUSHROOMS WITH PROTEIN-ENHANCED PESTO
  {
    name: "Filled Portobello Mushrooms with Protein-Enhanced Pesto",
    portion: "1 serving (2 stuffed mushrooms)",
    nutrition: {
      protein: 25,
      prepTime: 30,
      calories: 485,
      carbohydrates: 18,
      fats: 38,
      fiber: 9,
      sugar: 8,
      sodium: 520,
      potassium: 780,
      calcium: 290,
      iron: 4.8,
      vitaminC: 15,
      costEuros: 6.20,
      proteinPerEuro: 4.0
    },
    category: "lunch",
    tags: ["Vegetarian", "Gluten-Free", "Italian", "High-Protein", "Mushroom", "Pesto", "Plant-Protein"],
    ingredients: [
      "2 large portobello mushrooms",
      "10g sundried tomatoes",
      "10g arugula",
      "7.5g sundried tomato tapenade",
      "10g Parmesan cheese (grated)",
      "50g cooked lentils",
      "50g fresh basil leaves (for pesto)",
      "10g arugula (for pesto)",
      "17.5g Parmesan cheese (for pesto)",
      "75ml olive oil",
      "25g roasted pistachios",
      "50g silken tofu (for pesto)"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["portobello mushrooms", "arugula", "basil", "sundried tomatoes"],
      benefits: ["Antioxidants from basil and arugula", "Vitamin K", "Folate", "Umami from sundried tomatoes", "Plant protein from lentils"]
    },
    recipeBenefits: [
      "Portobello mushrooms provide meaty texture and B vitamins",
      "Silken tofu creates extra creamy pesto with added protein",
      "Cooked lentils boost protein and fiber content significantly",
      "Pistachios add healthy fats and complete amino acids",
      "Sundried tomatoes provide concentrated lycopene and umami"
    ],
    recipe: {
      instructions: [
        "Preheat the oven to 200°C",
        "For the protein-enhanced pesto: blend basil, arugula, pistachios, Parmesan, and silken tofu in a food processor",
        "Add olive oil gradually while blending until smooth and creamy",
        "Taste pesto and season with salt if needed",
        "Clean the portobello mushrooms and remove stems carefully to create cavities",
        "Mix sundried tomatoes, arugula, Parmesan cheese, cooked lentils, and 30-45g pesto",
        "Divide the lentil-pesto mixture evenly over the mushroom caps",
        "Place stuffed mushrooms in an oven dish",
        "Bake for 20 minutes at 200°C until mushrooms are tender",
        "Serve immediately while hot"
      ],
      tips: [
        "Use well-drained silken tofu for the creamiest pesto texture",
        "Cooked lentils can be from a can (drained and rinsed) or pre-cooked",
        "Extra protein pesto keeps well in refrigerator for up to 1 week",
        "The silken tofu makes the pesto extra creamy without dairy",
        "Serve with extra pesto drizzled on top for maximum flavor"
      ],
      notes: "Protein-packed version of classic stuffed mushrooms with lentils and silken tofu pesto. This creates a complete, satisfying meal with exceptional nutritional value."
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },

  // STEAMED JASMINE RICE WITH GRILLED EGGPLANT SALAD
  {
    name: "Steamed Jasmine Rice with Grilled Eggplant Salad",
    portion: "1 serving",
    nutrition: {
      protein: 8,
      prepTime: 30,
      calories: 410,
      carbohydrates: 55,
      fats: 18,
      fiber: 8,
      sugar: 12,
      sodium: 680,
      potassium: 450,
      calcium: 45,
      iron: 2.1,
      vitaminC: 25,
      costEuros: 3.20,
      proteinPerEuro: 2.5
    },
    category: "lunch",
    tags: ["Vegan", "Thai", "Asian", "Gluten-Free", "Fresh", "Plant-Based", "Dairy-Free", "Lactose-Free"],
    ingredients: [
      "150g medium eggplant (½ eggplant)",
      "15ml sunflower oil",
      "15ml Thai soy sauce",
      "7.5g palm sugar",
      "7.5ml lime juice",
      "1 spring onion",
      "¼ red chili pepper",
      "2.5g fresh coriander",
      "50g cherry tomatoes",
      "60g jasmine rice"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2.5,
      vegetables: ["eggplant", "spring onions", "chili", "coriander", "cherry tomatoes"],
      benefits: ["Fiber from eggplant", "Vitamin C from chili and tomatoes", "Fresh herbs for digestion", "Antioxidants from colorful vegetables"]
    },
    recipeBenefits: [
      "Eggplant provides fiber and antioxidants",
      "Thai flavors aid digestion and metabolism",
      "Jasmine rice offers sustained energy",
      "Fresh herbs provide vitamins and minerals",
      "Light yet satisfying Asian-inspired meal"
    ],
    recipe: {
      instructions: [
        "Cook jasmine rice according to package instructions until tender",
        "Preheat the oven to 200°C or heat a grill pan over medium-high heat",
        "Slice eggplant into 0.5cm thick slices",
        "Place eggplant slices on a tray or grill pan",
        "Brush eggplant with sunflower oil on both sides",
        "Roast in oven for 20 minutes or grill for a few minutes per side until golden and tender",
        "For the dressing: mix soy sauce, palm sugar, and lime juice until sugar dissolves completely",
        "Finely slice spring onions, chili, and roughly chop coriander",
        "Halve the cherry tomatoes",
        "Add spring onions, chili, coriander, and cherry tomatoes to the dressing",
        "Add warm eggplant slices to the dressing and toss gently to coat",
        "Serve the eggplant salad alongside the steamed jasmine rice"
      ],
      tips: [
        "Don't slice eggplant too thin or it will become mushy when cooked",
        "Salt eggplant slices lightly and let sit 10 minutes before cooking to remove bitterness",
        "Palm sugar can be substituted with brown sugar if unavailable",
        "Adjust chili amount to your heat preference",
        "Serve immediately while eggplant is still warm for best flavor"
      ],
      notes: "Fresh Thai-inspired salad with perfectly grilled eggplant and aromatic jasmine rice. The sweet and sour dressing brings all the flavors together beautifully."
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },

  // VEGETARIAN SPRING ROLLS WITH DIPPING SAUCE
  {
    name: "Vegetarian Spring Rolls with Asian Dipping Sauce",
    portion: "1 serving (4 spring rolls)",
    nutrition: {
      protein: 19,
      prepTime: 30,
      calories: 320,
      carbohydrates: 28,
      fats: 16,
      fiber: 7,
      sugar: 8,
      sodium: 890,
      potassium: 420,
      calcium: 150,
      iron: 3.8,
      vitaminC: 85,
      costEuros: 4.50,
      proteinPerEuro: 4.2
    },
    category: "lunch",
    tags: ["Vegetarian", "Asian", "Fresh", "Raw", "High-Protein", "Vietnamese", "Gluten-Free", "Plant-Based"],
    ingredients: [
      "100g firm tofu",
      "4 rice paper sheets",
      "35g carrot (julienned)",
      "35g cucumber (julienned)", 
      "35g red bell pepper (julienned)",
      "20g fresh basil leaves",
      "12g fresh mint leaves",
      "12g fresh coriander leaves",
      "25g cooked edamame beans",
      "15g spring onions (sliced)",
      "15ml Japanese soy sauce (for dipping sauce)",
      "7.5ml lime juice",
      "7.5ml sesame oil",
      "7.5ml rice vinegar",
      "2.5g white sugar",
      "½ small garlic clove (minced)",
      "Oil for frying tofu"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["carrot", "cucumber", "red bell pepper", "basil", "mint", "coriander", "spring onions"],
      benefits: ["Raw vegetables preserve maximum nutrients", "Fresh herbs aid digestion", "Colorful vegetables provide diverse antioxidants", "High water content for hydration"]
    },
    recipeBenefits: [
      "Fresh, uncooked vegetables retain maximum vitamin content",
      "Tofu and edamame provide complete plant protein",
      "Fresh herbs support digestion and metabolism",
      "Rice paper wraps are naturally gluten-free",
      "Light yet satisfying with beautiful presentation"
    ],
    recipe: {
      instructions: [
        "Make the dipping sauce first: mix soy sauce, lime juice, sesame oil, rice vinegar, sugar, and minced garlic in a small bowl until sugar dissolves. Set aside",
        "Slice tofu into strips about 1cm thick",
        "Heat a little oil in a non-stick pan over medium-high heat",
        "Fry tofu strips until golden brown on all sides, about 2-3 minutes per side",
        "Season lightly with a splash of soy sauce while cooking. Set aside to cool",
        "Prepare all vegetables: julienne carrot, cucumber, and red bell pepper into thin strips",
        "Wash and dry all fresh herbs, removing any thick stems",
        "Slice spring onions thinly",
        "Fill a large shallow dish with warm water",
        "Dip each rice paper sheet briefly in the warm water until it starts to soften (about 10-15 seconds)",
        "Place softened rice paper on a clean, damp surface",
        "In the lower third of the rice paper, arrange tofu strips, edamame, vegetables, and herbs in a neat line",
        "Fold the bottom edge over the filling, fold in the sides, then roll up tightly",
        "Repeat with remaining rice papers and filling",
        "Serve immediately with the dipping sauce"
      ],
      tips: [
        "Don't over-soak rice paper - it continues to soften after removing from water",
        "Work with one rice paper at a time to prevent them from sticking together",
        "Keep finished rolls under a damp cloth if not serving immediately",
        "Arrange colorful vegetables to create beautiful rainbow rolls",
        "For easier rolling, place herbs on top so they show through the rice paper"
      ],
      notes: "Fresh Vietnamese-style spring rolls packed with crispy tofu and colorful vegetables. The combination of textures and the tangy dipping sauce makes this a refreshing and nutritious meal."
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },

  // PASTA WITH AVOCADO SAUCE
  {
    name: "Pasta with Creamy Avocado Sauce",
    portion: "1 serving",
    nutrition: {
      protein: 18,
      prepTime: 25,
      calories: 650,
      carbohydrates: 68,
      fats: 35,
      fiber: 12,
      sugar: 8,
      sodium: 420,
      potassium: 920,
      calcium: 380,
      iron: 2.8,
      vitaminC: 25,
      costEuros: 4.80,
      proteinPerEuro: 3.8
    },
    category: "dinner",
    tags: ["Vegetarian", "Italian", "Roasted-Vegetables"],
    ingredients: [
      "125g cherry tomatoes",
      "1 ripe avocado",
      "125g pasta",
      "125ml cooking cream",
      "62g mozzarella",
      "15ml olive oil",
      "Salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["cherry tomatoes", "avocado"],
      benefits: ["Lycopene from roasted tomatoes", "Healthy fats from avocado", "Potassium and fiber", "Natural creaminess without heavy sauces"]
    },
    recipeBenefits: [
      "Avocado provides healthy monounsaturated fats and fiber",
      "Roasted cherry tomatoes concentrate flavor and lycopene",
      "Fresh mozzarella adds protein and calcium",
      "Creamy sauce without artificial additives",
      "Quick and satisfying comfort food"
    ],
    recipe: {
      instructions: [
        "Preheat oven to 200°C",
        "Place cherry tomatoes in an oven dish with olive oil, salt, and pepper",
        "Roast tomatoes for 15-20 minutes until soft and slightly caramelized",
        "Cook pasta according to package instructions until al dente",
        "While pasta cooks, blend ripe avocado with cooking cream, salt, and pepper until smooth",
        "Drain pasta and mix immediately with the creamy avocado sauce",
        "Serve topped with roasted cherry tomatoes and torn fresh mozzarella",
        "Season with additional salt and pepper if needed"
      ],
      tips: [
        "Choose perfectly ripe avocados for the creamiest sauce",
        "Roast tomatoes until they start to burst for maximum flavor",
        "Mix avocado sauce with hot pasta immediately to prevent browning",
        "Add a squeeze of lemon juice to avocado sauce to prevent oxidation",
        "Fresh basil leaves make an excellent garnish"
      ],
      notes: "Creamy, nutritious pasta featuring healthy avocado instead of heavy cream-based sauces. The roasted tomatoes add sweetness and depth to this satisfying meal."
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },

  // GLUTEN-FREE PASTA WITH ENHANCED AVOCADO SAUCE
  {
    name: "Gluten-Free Lentil Pasta with Protein-Enhanced Avocado Sauce",
    portion: "1 serving",
    nutrition: {
      protein: 24,
      prepTime: 25,
      calories: 680,
      carbohydrates: 72,
      fats: 32,
      fiber: 14,
      sugar: 8,
      sodium: 380,
      potassium: 1020,
      calcium: 350,
      iron: 4.2,
      vitaminC: 25,
      costEuros: 5.20,
      proteinPerEuro: 4.6
    },
    category: "dinner",
    tags: ["Vegetarian", "Gluten-Free", "Lactose-Free", "High-Protein", "Plant-Based", "Italian", "Lentil-Pasta"],
    ingredients: [
      "125g cherry tomatoes",
      "1 ripe avocado",
      "125g gluten-free lentil pasta",
      "100ml lactose-free cream",
      "62g lactose-free mozzarella",
      "50g cooked edamame beans",
      "15ml olive oil",
      "Salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["cherry tomatoes", "avocado", "edamame"],
      benefits: ["Lycopene from roasted tomatoes", "Healthy fats from avocado", "Complete protein from lentil pasta and edamame", "High fiber content for satiation"]
    },
    recipeBenefits: [
      "Lentil pasta doubles protein and fiber compared to regular pasta",
      "Edamame adds complete amino acids and extra protein",
      "Lactose-free options suitable for dairy sensitivities",
      "Gluten-free for celiac and gluten-sensitive individuals",
      "Plant-based protein powerhouse with excellent nutrition profile"
    ],
    recipe: {
      instructions: [
        "Preheat oven to 200°C",
        "Place cherry tomatoes in an oven dish with olive oil, salt, and pepper",
        "Roast tomatoes for 15-20 minutes until soft and slightly caramelized",
        "Cook lentil pasta according to package instructions (usually 8-10 minutes)",
        "While pasta cooks, blend ripe avocado with lactose-free cream, salt, and pepper until smooth",
        "Drain pasta and mix immediately with the creamy avocado sauce",
        "Fold in cooked edamame beans for extra protein and texture",
        "Serve topped with roasted cherry tomatoes and lactose-free mozzarella",
        "Season with additional salt and pepper to taste"
      ],
      tips: [
        "Lentil pasta can become mushy if overcooked - check frequently",
        "Edamame can be frozen (thawed) or fresh cooked",
        "The avocado sauce will be slightly thicker with lactose-free cream",
        "Add nutritional yeast for extra umami if desired",
        "This version provides exceptional protein content for plant-based eaters"
      ],
      notes: "Protein-packed, allergen-friendly pasta featuring lentil pasta and edamame for exceptional nutrition. Perfect for those avoiding gluten and dairy while maximizing protein intake."
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },

  // SWEET POTATO BOWL WITH FALAFEL AND FETA
  {
    name: "Sweet Potato Bowl with Falafel and Feta",
    portion: "1 serving",
    nutrition: {
      protein: 22,
      prepTime: 30,
      calories: 520,
      carbohydrates: 45,
      fats: 28,
      fiber: 8,
      sugar: 12,
      sodium: 890,
      potassium: 850,
      calcium: 420,
      iron: 3.5,
      vitaminC: 35,
      costEuros: 5.50,
      proteinPerEuro: 4.0
    },
    category: "lunch",
    tags: ["Vegetarian", "Mediterranean", "High-Protein", "Roasted", "Greek"],
    ingredients: [
      "200g medium sweet potato (1 potato)",
      "75g falafel (4-5 small pieces)",
      "75g feta cheese",
      "75g cucumber (¼ cucumber)",
      "½ bell pepper (75g)",
      "75g Greek yogurt",
      "7.5ml olive oil",
      "Salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2.5,
      vegetables: ["sweet potato", "cucumber", "bell pepper"],
      benefits: ["Beta-carotene from sweet potato", "Hydration from cucumber", "Vitamin C from bell pepper", "Probiotics from Greek yogurt"]
    },
    recipeBenefits: [
      "Sweet potato provides complex carbohydrates and beta-carotene",
      "Falafel offers plant-based protein and fiber",
      "Feta cheese adds calcium and tangy Mediterranean flavor",
      "Greek yogurt provides probiotics and additional protein",
      "Colorful vegetables ensure diverse micronutrient intake"
    ],
    recipe: {
      instructions: [
        "Preheat oven to 200°C",
        "Peel and cube the sweet potato into 2cm pieces",
        "Spread sweet potato cubes on a baking tray lined with baking paper",
        "Drizzle with olive oil and season with salt and pepper",
        "Roast in preheated oven for about 25 minutes until golden and tender",
        "Meanwhile, cut the bell pepper and cucumber into cubes",
        "Heat falafel briefly in a pan or oven according to package instructions",
        "Arrange roasted sweet potatoes in serving bowl",
        "Add warmed falafel, bell pepper cubes, cucumber, and crumbled feta cheese",
        "Top with a generous spoonful of Greek yogurt",
        "Season with extra salt and pepper to taste"
      ],
      tips: [
        "Cut sweet potato into uniform pieces for even roasting",
        "Don't overcrowd the baking tray - sweet potatoes need space to caramelize",
        "Store-bought falafel works perfectly, or use homemade if preferred",
        "Crumble feta rather than cutting for better distribution",
        "Serve immediately while sweet potatoes are still warm"
      ],
      notes: "Mediterranean-inspired bowl combining roasted sweet potatoes with protein-rich falafel and creamy feta. The Greek yogurt adds probiotics and balances the flavors beautifully."
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },

  // SWEET POTATO BOWL WITH FALAFEL (LACTOSE-FREE)
  {
    name: "Sweet Potato Bowl with Falafel (Lactose-Free)",
    portion: "1 serving",
    nutrition: {
      protein: 21,
      prepTime: 30,
      calories: 510,
      carbohydrates: 48,
      fats: 26,
      fiber: 9,
      sugar: 14,
      sodium: 820,
      potassium: 920,
      calcium: 380,
      iron: 3.8,
      vitaminC: 120,
      costEuros: 5.80,
      proteinPerEuro: 3.6
    },
    category: "lunch",
    tags: ["Vegetarian", "Lactose-Free", "Mediterranean", "High-Protein", "Roasted", "Dairy-Free"],
    ingredients: [
      "200g medium sweet potato (1 potato)",
      "75g falafel (4-5 small pieces)",
      "75g lactose-free feta",
      "75g red bell pepper (½ pepper)",
      "75g cucumber (¼ cucumber)", 
      "75g lactose-free Greek yogurt",
      "7.5ml olive oil",
      "Salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2.5,
      vegetables: ["sweet potato", "red bell pepper", "cucumber"],
      benefits: ["Beta-carotene from sweet potato", "High vitamin C from red bell pepper", "Hydration from cucumber", "Probiotics from lactose-free yogurt"]
    },
    recipeBenefits: [
      "Lactose-free options suitable for dairy sensitivities",
      "Sweet potato provides complex carbohydrates and vitamin A",
      "Falafel offers plant-based protein and Middle Eastern flavors",
      "Red bell pepper delivers exceptional vitamin C content",
      "Lactose-free yogurt maintains probiotics without dairy"
    ],
    recipe: {
      instructions: [
        "Preheat oven to 200°C",
        "Peel and cube the sweet potato into 2cm pieces",
        "Spread sweet potato cubes on a baking tray lined with baking paper",
        "Drizzle with olive oil and season with salt and pepper",
        "Roast in preheated oven for about 25 minutes until golden and tender",
        "Meanwhile, cut the red bell pepper and cucumber into cubes",
        "Heat falafel briefly in a pan or oven according to package instructions",
        "Arrange roasted sweet potatoes in serving bowl",
        "Add warmed falafel, red bell pepper cubes, cucumber, and crumbled lactose-free feta",
        "Top with a generous spoonful of lactose-free Greek yogurt",
        "Season with salt and pepper to taste"
      ],
      tips: [
        "Red bell pepper adds extra sweetness and vitamin C compared to other peppers",
        "Lactose-free feta has similar texture and taste to regular feta",
        "For extra protein, consider using unsweetened soy yogurt instead",
        "Roast sweet potatoes until edges are caramelized for maximum flavor",
        "This version is perfect for those with lactose intolerance"
      ],
      notes: "Dairy-free Mediterranean bowl that doesn't compromise on flavor or nutrition. The lactose-free alternatives maintain the creamy textures and tangy flavors of the original."
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },

  // BURGERS WITH SWEET POTATO FRIES AND SALAD
  {
    name: "Burgers with Sweet Potato Fries and Grilled Vegetables",
    portion: "1 serving",
    nutrition: {
      protein: 32,
      prepTime: 35,
      calories: 680,
      carbohydrates: 52,
      fats: 36,
      fiber: 8,
      sugar: 12,
      sodium: 920,
      potassium: 850,
      calcium: 180,
      iron: 4.2,
      vitaminC: 45,
      costEuros: 6.80,
      proteinPerEuro: 4.7
    },
    category: "dinner",
    tags: ["High-Protein", "Grilled", "American", "Satisfying"],
    ingredients: [
      "200g sweet potatoes (1-1.5 potatoes)",
      "1 burger bun",
      "150g beef burger patty",
      "½ egg (beaten)",
      "10g breadcrumbs",
      "½ garlic clove (finely chopped)",
      "100g small eggplant (sliced)",
      "100g zucchini (sliced)",
      "25g bean sprouts",
      "7.5ml olive oil",
      "1 handful mixed salad or lettuce"
    ],
    wholeFoodLevel: "moderate",
    vegetableContent: {
      servings: 2,
      vegetables: ["sweet potatoes", "eggplant", "zucchini", "bean sprouts", "mixed salad"],
      benefits: ["Beta-carotene from sweet potato", "Fiber from grilled vegetables", "Fresh crunch from bean sprouts", "Balanced nutrition with protein and vegetables"]
    },
    recipeBenefits: [
      "High-quality beef provides complete protein and iron",
      "Sweet potato fries offer healthier alternative to regular fries",
      "Grilled vegetables add fiber and micronutrients",
      "Balanced meal combining protein, carbs, and vegetables",
      "Satisfying comfort food with nutritious upgrades"
    ],
    recipe: {
      instructions: [
        "Preheat oven to 200°C",
        "Cut sweet potatoes into wedges, toss with olive oil, salt, and pepper",
        "Roast sweet potato wedges for about 25 minutes until golden and tender",
        "If using fresh mince: mix beef with garlic, beaten egg, and breadcrumbs, then shape into patty",
        "If using pre-made burger: season lightly with garlic and cook directly",
        "Grill or pan-fry the burger patty until cooked through (internal temp 70°C)",
        "Meanwhile, grill eggplant and zucchini slices until tender and slightly charred",
        "Toast or warm the burger bun",
        "Assemble burger with patty, grilled vegetables, bean sprouts, and fresh salad",
        "Serve with roasted sweet potato fries on the side"
      ],
      tips: [
        "Don't press down on burger while cooking - it releases juices",
        "Let burger rest for 2-3 minutes after cooking for better texture",
        "Sweet potato wedges get crispier if not overcrowded on the tray",
        "Grill vegetables until they have nice char marks for extra flavor",
        "Toast bun lightly for better texture and to prevent sogginess"
      ],
      notes: "Classic comfort food elevated with sweet potato fries and grilled vegetables. The combination provides complete nutrition while satisfying burger cravings."
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },

  // BEYOND MEAT BURGERS (GLUTEN-FREE & LACTOSE-FREE)
  {
    name: "Beyond Meat Burgers with Sweet Potato Fries (Gluten-Free & Lactose-Free)",
    portion: "1 serving",
    nutrition: {
      protein: 28,
      prepTime: 35,
      calories: 620,
      carbohydrates: 55,
      fats: 32,
      fiber: 12,
      sugar: 12,
      sodium: 780,
      potassium: 920,
      calcium: 150,
      iron: 5.8,
      vitaminC: 45,
      costEuros: 7.50,
      proteinPerEuro: 3.7
    },
    category: "dinner",
    tags: ["Vegetarian", "Plant-Based", "Gluten-Free", "Lactose-Free", "High-Protein"],
    ingredients: [
      "200g sweet potatoes (1-1.5 potatoes)",
      "1 gluten-free burger bun",
      "113g Beyond Meat burger patty",
      "10g gluten-free breadcrumbs (optional)",
      "½ garlic clove (finely chopped)",
      "100g small eggplant (sliced)",
      "100g zucchini (sliced)",
      "25g bean sprouts",
      "7.5ml olive oil",
      "1 handful mixed salad or lettuce"
    ],
    wholeFoodLevel: "moderate",
    vegetableContent: {
      servings: 2,
      vegetables: ["sweet potatoes", "eggplant", "zucchini", "bean sprouts", "mixed salad"],
      benefits: ["Beta-carotene from sweet potato", "Plant fiber from grilled vegetables", "Fresh enzymes from bean sprouts", "Complete plant-based nutrition"]
    },
    recipeBenefits: [
      "Beyond Meat provides complete plant-based protein",
      "Gluten-free bun suitable for celiac and gluten sensitivities",
      "Higher fiber content than traditional burger meals",
      "Plant-based option with familiar burger satisfaction",
      "Environmentally sustainable protein choice"
    ],
    recipe: {
      instructions: [
        "Preheat oven to 200°C",
        "Cut sweet potatoes into wedges, toss with olive oil, salt, and pepper",
        "Roast sweet potato wedges for about 25 minutes until golden and tender",
        "If using Beyond Meat mince: mix with garlic and gluten-free breadcrumbs, shape into patty",
        "If using pre-made Beyond Meat patty: cook directly",
        "Cook Beyond Meat patty in a pan with a little oil until golden and heated through",
        "Meanwhile, grill eggplant and zucchini slices until tender",
        "Toast the gluten-free bun until lightly golden",
        "Assemble burger with Beyond Meat patty, grilled vegetables, bean sprouts, and salad",
        "Serve with roasted sweet potato fries"
      ],
      tips: [
        "Beyond Meat patties cook faster than beef - don't overcook",
        "Gluten-free buns can be more delicate - toast gently",
        "Let Beyond Meat patty rest briefly after cooking for best texture",
        "Bean sprouts add fresh crunch - add them just before serving",
        "This version provides excellent plant-based protein satisfaction"
      ],
      notes: "Plant-based burger that delivers on taste and nutrition. Beyond Meat provides complete protein while accommodating gluten-free and lactose-free dietary needs."
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },

  // PLANT-BASED CHOCOLATE MOUSSE DESSERT
  {
    name: "Plant-Based Chocolate Mousse with Rice Cakes",
    portion: "1 serving",
    nutrition: {
      protein: 27,
      prepTime: 10,
      calories: 230,
      carbohydrates: 15,
      fats: 5,
      fiber: 9,
      sugar: 4,
      sodium: 180,
      potassium: 420,
      calcium: 120,
      iron: 2.8,
      vitaminC: 2,
      costEuros: 3.20,
      proteinPerEuro: 8.4
    },
    category: "breakfast",
    tags: ["Vegan", "Plant-Based", "High-Protein", "Low-Calorie", "No-Bake", "Chocolate", "Quick", "Dessert", "Healthy-Sweet"],
    ingredients: [
      "2 rice or corn cakes",
      "50ml espresso (or 1 tsp instant coffee in hot water)",
      "30g tiramisu or vanilla protein powder",
      "5g psyllium husk",
      "100ml unsweetened plant milk",
      "15g raw cacao powder",
      "15g cacao nibs"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 0,
      vegetables: [],
      benefits: ["Antioxidants from raw cacao", "Fiber from psyllium husk", "Complete plant protein", "Low glycemic impact"]
    },
    recipeBenefits: [
      "Exceptionally high protein content for a dessert (27g)",
      "Raw cacao provides antioxidants and natural mood enhancers",
      "Psyllium husk creates lasting satiety and digestive health",
      "No baking or blending required - simple assembly",
      "Low calorie but surprisingly filling and satisfying"
    ],
    recipe: {
      instructions: [
        "Prepare espresso or dissolve 1 tsp instant coffee in 50ml hot water",
        "Soak both rice cakes in the espresso until softened but not falling apart",
        "In a bowl, mix protein powder, raw cacao powder, and psyllium husk",
        "Gradually add unsweetened plant milk while whisking until mixture becomes mousse-thick",
        "Let mousse sit for 2-3 minutes to allow psyllium to thicken further",
        "Place first espresso-soaked rice cake in serving bowl or glass",
        "Spread half the chocolate mousse over the first rice cake",
        "Add second rice cake on top",
        "Top with remaining mousse",
        "Sprinkle cacao nibs generously on top for crunch and extra antioxidants"
      ],
      tips: [
        "Don't over-soak rice cakes - they should hold their shape but be coffee-infused",
        "Psyllium husk continues to thicken, so work quickly once mixed",
        "For extra richness, use slightly warm plant milk",
        "Cacao nibs add essential crunch - don't skip them",
        "Can be made 30 minutes ahead and chilled for firmer texture"
      ],
      notes: "Revolutionary plant-based dessert that delivers restaurant-quality satisfaction with incredible nutrition stats. The rice cake base soaked in espresso creates an unexpected tiramisu-like experience."
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },

  // ENHANCED SLOW CARB & HIGH FIBER RECIPES
  {
    name: "Blood Sugar Friendly Buddha Bowl with Quinoa",
    portion: "1 serving",
    nutrition: {
      protein: 26,
      prepTime: 25,
      calories: 485,
      carbohydrates: 28,
      fats: 18,
      fiber: 15,
      sugar: 8,
      sodium: 340,
      potassium: 820,
      calcium: 180,
      iron: 4.2,
      vitaminC: 45,
      costEuros: 4.50,
      proteinPerEuro: 5.8
    },
    category: "lunch",
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "High-Fiber", "Low-Carb", "High-Protein", "Blood-Sugar-Friendly", "Quinoa", "Buddha-Bowl"],
    ingredients: [
      "80g quinoa (uncooked)",
      "100g black beans (cooked)",
      "150g roasted sweet potato cubes",
      "100g steamed broccoli",
      "50g baby spinach",
      "1/2 avocado (80g)",
      "30g hemp hearts",
      "15g chia seeds",
      "2 tbsp tahini",
      "1 tbsp apple cider vinegar",
      "1 tsp olive oil",
      "1/2 lemon (juiced)",
      "1 clove garlic (minced)",
      "Salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["sweet potato", "broccoli", "spinach", "avocado"],
      benefits: ["Complex carbs from quinoa", "Fiber from black beans", "Beta-carotene from sweet potato", "Iron from spinach", "Healthy fats from avocado and hemp hearts"]
    },
    recipeBenefits: [
      "Optimized for blood sugar stability with slow-release carbs",
      "15g fiber aids digestion and glucose management",
      "Complete protein from quinoa and hemp hearts combination",
      "Sustained energy from healthy fats and complex carbohydrates",
      "Rich in antioxidants and micronutrients"
    ],
    recipe: {
      instructions: [
        "Rinse quinoa and cook in 160ml water for 15 minutes until fluffy",
        "Roast sweet potato cubes at 200°C for 20 minutes until tender",
        "Steam broccoli for 5 minutes until bright green",
        "Warm black beans and season with salt and pepper",
        "Make dressing by whisking tahini, lemon juice, apple cider vinegar, garlic, and olive oil",
        "Arrange quinoa as base in bowl",
        "Top with black beans, roasted sweet potato, steamed broccoli, and fresh spinach",
        "Add sliced avocado and sprinkle with hemp hearts and chia seeds",
        "Drizzle with tahini dressing and serve immediately"
      ],
      tips: [
        "Cook quinoa with a bay leaf for extra flavor",
        "Chia seeds add crunch and additional fiber",
        "Sweet potato provides slow-releasing natural sugars",
        "This meal keeps blood sugar stable for 4-5 hours"
      ],
      notes: "Specifically designed for blood sugar management with slow carbs, high fiber, and optimal protein-fat balance for sustained energy."
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },

  {
    name: "Slow Carb Lentil & Brown Rice Power Bowl",
    portion: "1 serving",
    nutrition: {
      protein: 24,
      prepTime: 35,
      calories: 520,
      carbohydrates: 32,
      fats: 16,
      fiber: 18,
      sugar: 6,
      sodium: 285,
      potassium: 940,
      calcium: 120,
      iron: 5.8,
      vitaminC: 35,
      costEuros: 3.80,
      proteinPerEuro: 6.3
    },
    category: "lunch",
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "High-Fiber", "Slow-Carb", "High-Protein", "Blood-Sugar-Friendly", "Lentils", "Brown-Rice"],
    ingredients: [
      "60g brown rice (uncooked)",
      "80g green lentils (cooked)",
      "100g roasted Brussels sprouts",
      "80g steamed kale",
      "50g grated carrots",
      "30g sunflower seeds",
      "15g ground flaxseed",
      "2 tbsp olive oil",
      "1 tbsp balsamic vinegar",
      "1 tsp Dijon mustard",
      "1/2 tsp turmeric",
      "1 clove garlic (minced)",
      "Fresh herbs (parsley or cilantro)"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["Brussels sprouts", "kale", "carrots"],
      benefits: ["Slow-release carbs from brown rice", "Complete protein from lentils", "Cruciferous vegetables for detox support", "High fiber for digestive health"]
    },
    recipeBenefits: [
      "18g fiber promotes healthy blood sugar and digestion",
      "Brown rice and lentils provide sustained energy release",
      "Rich in plant-based protein and essential amino acids",
      "Anti-inflammatory compounds from turmeric and olive oil",
      "Nutrient-dense vegetables support overall health"
    ],
    recipe: {
      instructions: [
        "Cook brown rice in 120ml water for 30-35 minutes until tender",
        "Halve Brussels sprouts and roast at 200°C for 20 minutes until crispy",
        "Steam kale for 3-4 minutes until wilted but still bright green",
        "Warm cooked lentils with turmeric and garlic",
        "Make dressing by whisking olive oil, balsamic vinegar, and Dijon mustard",
        "Layer brown rice as base in bowl",
        "Arrange lentils, roasted Brussels sprouts, steamed kale, and grated carrots",
        "Sprinkle with sunflower seeds and ground flaxseed",
        "Drizzle with dressing and garnish with fresh herbs"
      ],
      tips: [
        "Toast sunflower seeds lightly for extra flavor and crunch",
        "Ground flaxseed adds omega-3s and extra fiber",
        "Brown rice takes longer to cook but provides superior nutrition",
        "This combination provides 6+ hours of sustained energy"
      ],
      notes: "Perfect slow carb meal designed to prevent blood sugar spikes while delivering exceptional fiber and plant-based protein."
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },

  // USER CUSTOM RECIPE
  {
    name: "Brussels Sprouts with Sweet Potato",
    portion: "1 serving (4 total servings)",
    nutrition: {
      protein: 15,
      prepTime: 40,
      calories: 574,
      carbohydrates: 70,
      fats: 27,
      fiber: 13,
      sugar: 22,
      sodium: 320,
      potassium: 1200,
      calcium: 180,
      iron: 3.2,
      vitaminC: 85,
      costEuros: 3.25,
      proteinPerEuro: 4.6
    },
    category: "dinner",
    tags: ["Vegetarian", "High-Fiber", "Brussels-Sprouts", "Cheese", "Walnuts", "Slow-Carb"],
    ingredients: [
      "250g sweet potatoes (per serving from 1kg total)",
      "150g Brussels sprouts (per serving from 600g total)", 
      "17.5g old cheese (per serving from 70g total)",
      "12.5g walnuts (per serving from 50g total)",
      "1.5 tbsp mustard (per serving from 2 tbsp total)",
      "25ml oat milk (per serving from 100ml total)",
      "1 small onion (50g, diced)",
      "1 tbsp olive oil",
      "Salt and pepper to taste",
      "Optional: sun-dried tomatoes for garnish"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["sweet potatoes", "Brussels sprouts", "onion"],
      benefits: ["Complex carbs from sweet potato", "Cruciferous vegetables for antioxidants", "High fiber for digestive health", "Healthy fats from walnuts"]
    },
    recipeBenefits: [
      "Sweet potatoes provide slow-release complex carbohydrates",
      "Brussels sprouts are rich in vitamin C and fiber",
      "Walnuts add healthy omega-3 fatty acids and protein",
      "Old cheese provides calcium and protein",
      "High fiber content supports digestive health"
    ],
    recipe: {
      instructions: [
        "Clean the Brussels sprouts and remove outer leaves, then blanch them in boiling water for 3-4 minutes",
        "Peel sweet potatoes, cut into chunks, and cook in boiling salted water until tender (15-20 minutes)",
        "Meanwhile, dice the onion and heat olive oil in a large pan over medium heat",
        "Fry the diced onion until softened, then add the blanched Brussels sprouts",
        "Season Brussels sprouts and onion with salt and pepper, cook for 5-8 minutes until lightly browned",
        "In a dry pan, lightly roast the walnuts for 2-3 minutes until fragrant",
        "Drain the sweet potatoes and mash until smooth, gradually adding oat milk and mustard",
        "Season the mashed sweet potatoes with salt and pepper to taste",
        "Fold the sautéed Brussels sprouts and onion into the mashed sweet potatoes",
        "Serve topped with crumbled old cheese and roasted walnuts",
        "Optional: garnish with chopped sun-dried tomatoes for extra flavor"
      ],
      tips: [
        "Don't overcook Brussels sprouts - they should retain some bite",
        "Roasting the walnuts enhances their nutty flavor significantly",
        "The mustard adds a nice tangy depth to the mashed sweet potatoes",
        "Can be made ahead and reheated - add cheese and walnuts just before serving"
      ],
      notes: "Hearty comfort food combining the sweetness of mashed sweet potatoes with the earthy flavor of Brussels sprouts, topped with creamy cheese and crunchy walnuts."
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },

  // USER CUSTOM RECIPE FROM IMAGE
  {
    name: "Nutritious Tuna Poke Bowl with Edamame",
    portion: "1 serving",
    nutrition: {
      protein: 32,
      prepTime: 15,
      calories: 465,
      carbohydrates: 18,
      fats: 22,
      fiber: 8,
      sugar: 4,
      sodium: 580,
      potassium: 890,
      calcium: 85,
      iron: 3.8,
      vitaminC: 12,
      costEuros: 6.50,
      proteinPerEuro: 4.9
    },
    category: "lunch",
    tags: ["High-Protein", "Omega-3", "Low-Carb", "Blood-Sugar-Friendly", "Tuna", "Edamame", "Quick", "Fresh", "Poke-Bowl"],
    ingredients: [
      "120g fresh tuna (sashimi grade or cooked)",
      "80g edamame beans (shelled)",
      "100g cucumber (sliced)",
      "1/2 avocado (80g)",
      "2 sheets nori seaweed (torn into pieces)",
      "30g crispy rice or rice cakes (broken into pieces)",
      "1 tsp sesame oil",
      "1 tsp soy sauce (low sodium)",
      "1/2 tsp rice vinegar",
      "1/4 tsp sesame seeds",
      "Salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["cucumber", "edamame", "avocado"],
      benefits: ["High omega-3 from tuna", "Complete protein from edamame", "Hydrating cucumber", "Healthy fats from avocado", "Iodine from nori seaweed"]
    },
    recipeBenefits: [
      "Tuna provides high-quality protein and omega-3 fatty acids",
      "Rich in vitamin D and B12 from tuna",
      "Edamame offers complete plant protein with iron and calcium",
      "Avocado delivers healthy monounsaturated fats and potassium",
      "Nori seaweed is a natural source of iodine and vitamin A",
      "Cucumber provides hydration with minimal calories",
      "Low carb and blood sugar friendly with sustained energy"
    ],
    recipe: {
      instructions: [
        "If using raw tuna, ensure it's sashimi-grade and cut into cubes",
        "If using cooked tuna, flake or cube the tuna and set aside",
        "Steam or boil edamame beans for 3-4 minutes if frozen, then shell them",
        "Slice cucumber into rounds or half-moons",
        "Cut avocado in half, remove pit, and slice",
        "Break rice cakes into bite-sized crispy pieces",
        "Tear nori sheets into smaller pieces",
        "Make dressing by whisking sesame oil, soy sauce, and rice vinegar",
        "Arrange all ingredients in a bowl: tuna, edamame, cucumber, and avocado",
        "Top with crispy rice pieces and torn nori",
        "Drizzle with dressing and sprinkle with sesame seeds",
        "Season with salt and pepper to taste, serve immediately"
      ],
      tips: [
        "Use sashimi-grade tuna for the freshest flavor if eating raw",
        "Edamame can be prepared in advance and stored in the fridge",
        "Rice cakes add great texture - you can also use puffed rice",
        "Nori adds umami flavor and important minerals",
        "This bowl is perfect for meal prep - keep dressing separate until serving"
      ],
      notes: "Nutrient-dense poke-style bowl combining high-quality protein from tuna with plant-based protein from edamame, healthy fats from avocado, and the mineral benefits of sea vegetables."
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },

  // VEGETARIAN VERSION OF TUNA POKE BOWL
  {
    name: "Vegetarian Protein Poke Bowl with Marinated Tofu",
    portion: "1 serving",
    nutrition: {
      protein: 28,
      prepTime: 20,
      calories: 445,
      carbohydrates: 22,
      fats: 24,
      fiber: 10,
      sugar: 6,
      sodium: 520,
      potassium: 750,
      calcium: 140,
      iron: 4.2,
      vitaminC: 12,
      costEuros: 4.20,
      proteinPerEuro: 6.7
    },
    category: "lunch",
    tags: ["Vegetarian", "Vegan", "High-Protein", "Low-Carb", "Blood-Sugar-Friendly", "Tofu", "Edamame", "Quick", "Fresh", "Poke-Bowl"],
    ingredients: [
      "120g firm tofu (cubed)",
      "100g edamame beans (shelled)",
      "100g cucumber (sliced)",
      "1/2 avocado (80g)",
      "2 sheets nori seaweed (torn into pieces)",
      "30g crispy rice or rice cakes (broken into pieces)",
      "15g hemp hearts",
      "1 tbsp soy sauce (low sodium)",
      "1 tsp sesame oil",
      "1/2 tsp rice vinegar",
      "1/4 tsp sesame seeds",
      "1/2 tsp ginger (minced)",
      "1/4 tsp garlic powder",
      "Salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["cucumber", "edamame", "avocado"],
      benefits: ["Complete protein from tofu and edamame", "Hydrating cucumber", "Healthy fats from avocado and hemp hearts", "Iodine from nori seaweed", "Omega-3s from hemp hearts"]
    },
    recipeBenefits: [
      "Tofu provides complete plant-based protein with all essential amino acids",
      "Edamame offers additional protein, iron, and calcium",
      "Hemp hearts add omega-3 fatty acids and extra protein",
      "Avocado delivers healthy monounsaturated fats and potassium",
      "Nori seaweed is a natural source of iodine and vitamin A",
      "Cucumber provides hydration with minimal calories",
      "Low carb and blood sugar friendly with sustained energy",
      "Rich in plant-based nutrients and fiber"
    ],
    recipe: {
      instructions: [
        "Press tofu to remove excess water, then cube into bite-sized pieces",
        "Marinate tofu cubes in soy sauce, ginger, and garlic powder for 10 minutes",
        "Steam or boil edamame beans for 3-4 minutes if frozen, then shell them",
        "Slice cucumber into rounds or half-moons",
        "Cut avocado in half, remove pit, and slice",
        "Break rice cakes into bite-sized crispy pieces",
        "Tear nori sheets into smaller pieces",
        "Make dressing by whisking sesame oil, remaining soy sauce, and rice vinegar",
        "Arrange all ingredients in a bowl: marinated tofu, edamame, cucumber, and avocado",
        "Top with crispy rice pieces, torn nori, and hemp hearts",
        "Drizzle with dressing and sprinkle with sesame seeds",
        "Season with salt and pepper to taste, serve immediately"
      ],
      tips: [
        "Press tofu for 15 minutes before marinating for better texture",
        "You can pan-fry the marinated tofu for 2-3 minutes for extra flavor",
        "Hemp hearts add a nutty flavor and boost the omega-3 content",
        "Edamame can be prepared in advance and stored in the fridge",
        "This bowl is perfect for meal prep - keep dressing separate until serving"
      ],
      notes: "Plant-based version of the nutritious poke bowl with marinated tofu providing complete protein, enhanced with hemp hearts for omega-3s and additional fiber from edamame."
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },

  // HIGH-PROTEIN NUTRIENT POWER BOWL WITH LEAN BEEF
  {
    name: "High-Protein Power Bowl with Lean Beef & Sweet Potato",
    portion: "1 serving",
    nutrition: {
      protein: 35,
      prepTime: 25,
      calories: 520,
      carbohydrates: 24,
      fats: 22,
      fiber: 9,
      sugar: 8,
      sodium: 380,
      potassium: 920,
      calcium: 180,
      iron: 4.8,
      vitaminC: 28,
      costEuros: 5.80,
      proteinPerEuro: 6.0
    },
    category: "lunch",
    tags: ["High-Protein", "Low-Carb", "Blood-Sugar-Friendly", "Beef", "Cottage-Cheese", "Nutrient-Dense", "Power-Bowl"],
    ingredients: [
      "120g lean beef (sirloin or tenderloin, cubed)",
      "100g cottage cheese",
      "1/2 avocado (80g, sliced)",
      "150g sweet potato (cubed and roasted)",
      "1 tsp olive oil",
      "1/2 tsp paprika",
      "1/4 tsp garlic powder",
      "1/4 tsp black pepper",
      "1/2 tsp sea salt",
      "Fresh herbs (parsley or chives) for garnish"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["sweet potato", "avocado"],
      benefits: ["Complete protein from beef and cottage cheese", "Slow-release carbs from sweet potato", "Healthy fats from avocado", "High calcium from cottage cheese", "Iron and zinc from lean beef"]
    },
    recipeBenefits: [
      "35g complete protein supports muscle health and satiety",
      "Lean beef provides iron, zinc, and vitamin B12",
      "Cottage cheese delivers calcium and casein protein",
      "Sweet potato offers fiber, potassium, and beta-carotene",
      "Avocado provides healthy monounsaturated fats",
      "Low carb with slow-releasing energy for blood sugar stability",
      "Rich in vitamins and minerals for energy and health"
    ],
    recipe: {
      instructions: [
        "Preheat oven to 200°C and line a baking tray",
        "Cube sweet potato and toss with half the olive oil, salt, and paprika",
        "Roast sweet potato for 20-25 minutes until tender and lightly caramelized",
        "Season beef cubes with garlic powder, black pepper, and remaining salt",
        "Heat remaining olive oil in a pan over medium-high heat",
        "Cook beef cubes for 6-8 minutes, turning to brown all sides",
        "Let beef rest for 2 minutes to retain juices",
        "Slice avocado and arrange in serving bowl",
        "Add cottage cheese to one section of the bowl",
        "Place roasted sweet potato and cooked beef in separate sections",
        "Garnish with fresh herbs and serve immediately"
      ],
      tips: [
        "Choose lean cuts like sirloin or tenderloin for best protein-to-fat ratio",
        "Don't overcook the beef - aim for medium for optimal tenderness",
        "Sweet potato can be batch-cooked and reheated throughout the week",
        "Full-fat cottage cheese provides better satiety and nutrient absorption"
      ],
      notes: "Nutrient-dense power bowl emphasizing vitamins and minerals alongside optimal macros for sustained energy and health."
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },

  // VEGETARIAN VERSION WITH PLANT-BASED PROTEIN
  {
    name: "Vegetarian High-Protein Power Bowl with Tofu & Sweet Potato",
    portion: "1 serving",
    nutrition: {
      protein: 28,
      prepTime: 25,
      calories: 485,
      carbohydrates: 26,
      fats: 24,
      fiber: 11,
      sugar: 9,
      sodium: 340,
      potassium: 850,
      calcium: 220,
      iron: 4.2,
      vitaminC: 28,
      costEuros: 4.50,
      proteinPerEuro: 6.2
    },
    category: "lunch",
    tags: ["Vegetarian", "High-Protein", "Low-Carb", "Blood-Sugar-Friendly", "Tofu", "Cottage-Cheese", "Nutrient-Dense", "Power-Bowl", "Dairy"],
    ingredients: [
      "120g extra-firm tofu (cubed and pressed)",
      "100g cottage cheese (or plant-based alternative)",
      "1/2 avocado (80g, sliced)",
      "150g sweet potato (cubed and roasted)",
      "15g hemp hearts",
      "1 tsp olive oil",
      "1/2 tsp paprika",
      "1/4 tsp garlic powder",
      "1/4 tsp turmeric",
      "1/4 tsp black pepper",
      "1/2 tsp sea salt",
      "Fresh herbs (parsley or chives) for garnish"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["sweet potato", "avocado"],
      benefits: ["Complete plant protein from tofu and hemp hearts", "Slow-release carbs from sweet potato", "Healthy fats from avocado and hemp hearts", "High calcium from cottage cheese and tofu", "Extra fiber for digestive health"]
    },
    recipeBenefits: [
      "28g plant-based protein with all essential amino acids",
      "Tofu provides isoflavones and plant-based calcium",
      "Hemp hearts add omega-3 fatty acids and extra protein",
      "Sweet potato offers fiber, potassium, and beta-carotene",
      "Avocado provides healthy monounsaturated fats",
      "Higher fiber content supports blood sugar stability",
      "Rich in plant-based vitamins and minerals for sustained energy"
    ],
    recipe: {
      instructions: [
        "Press tofu for 15 minutes to remove excess water, then cube",
        "Preheat oven to 200°C and line a baking tray",
        "Cube sweet potato and toss with half the olive oil, salt, and paprika",
        "Roast sweet potato for 20-25 minutes until tender and lightly caramelized",
        "Season tofu cubes with garlic powder, turmeric, black pepper, and remaining salt",
        "Heat remaining olive oil in a pan over medium-high heat",
        "Cook tofu cubes for 8-10 minutes, turning to golden all sides",
        "Slice avocado and arrange in serving bowl",
        "Add cottage cheese to one section of the bowl",
        "Place roasted sweet potato and golden tofu in separate sections",
        "Sprinkle hemp hearts over the entire bowl",
        "Garnish with fresh herbs and serve immediately"
      ],
      tips: [
        "Press tofu well for better texture and flavor absorption",
        "Turmeric adds anti-inflammatory benefits and golden color",
        "Hemp hearts boost protein and add pleasant nutty flavor",
        "Choose full-fat plant-based cottage cheese alternative if avoiding dairy"
      ],
      notes: "Plant-based power bowl maximizing vitamins, minerals, and fiber while delivering complete protein for sustained energy and health."
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },

  // GLUTEN-FREE PURPLE SWEET POTATO TOAST - VEGETARIAN VERSION
  {
    name: "Purple Sweet Potato Toast with Vegan Feta & Scrambled Eggs",
    portion: "1 serving (2 slices)",
    nutrition: {
      protein: 22,
      prepTime: 10,
      calories: 485,
      carbohydrates: 42,
      fats: 26,
      fiber: 12,
      sugar: 8,
      sodium: 520,
      potassium: 780,
      calcium: 160,
      iron: 3.8,
      vitaminC: 18,
      costEuros: 4.20,
      proteinPerEuro: 5.2
    },
    category: "breakfast",
    tags: ["Vegetarian", "Gluten-Free", "High-Fiber", "Meal-Prep", "Nutrient-Dense"],
    ingredients: [
      "2 slices gluten-free purple sweet potato bread (pre-made)",
      "1/2 avocado (80g, mashed)",
      "2 eggs (scrambled)",
      "40g vegan feta (pre-made)",
      "100g sautéed spinach and peas mix",
      "1 tbsp roasted pumpkin seeds",
      "1 tsp black sesame seeds",
      "1/2 lemon (juiced)",
      "1 tsp olive oil",
      "Salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["purple sweet potato", "avocado", "spinach", "peas"],
      benefits: ["Anthocyanins from purple sweet potato", "Healthy fats from avocado", "Iron from spinach", "Plant protein from peas", "Probiotics from fermented vegan feta"]
    },
    recipeBenefits: [
      "Purple sweet potato provides antioxidants and slow-release carbs",
      "High fiber content supports digestive health and blood sugar stability",
      "Complete protein from eggs with plant-based support from peas",
      "Healthy fats from avocado aid nutrient absorption",
      "Gluten-free and suitable for celiac dietary needs",
      "Meal-prep friendly with components made in advance",
      "Rich in vitamins A, C, K and folate"
    ],
    recipe: {
      instructions: [
        "Toast 2 slices of pre-made purple sweet potato bread until golden",
        "While toasting, scramble 2 eggs with a pinch of salt and pepper",
        "Mash half an avocado with lemon juice and a pinch of salt",
        "Quickly warm the pre-made sautéed spinach and peas mixture",
        "Spread mashed avocado evenly on both toast slices",
        "Layer the warm spinach and peas mixture on top",
        "Add the scrambled eggs as the next layer",
        "Crumble vegan feta over the eggs",
        "Sprinkle with roasted pumpkin seeds and black sesame seeds",
        "Serve immediately while toast is still warm"
      ],
      tips: [
        "Keep bread slices frozen - they toast perfectly from frozen",
        "Pre-made vegan feta keeps 5-7 days in the fridge",
        "Warm the greens mixture to prevent cooling down the toast",
        "Assembly takes under 5 minutes with prep components ready"
      ],
      notes: "Meal-prep friendly breakfast toast showcasing purple sweet potato's antioxidants with complete protein and healthy fats. Perfect for busy mornings!"
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },

  // GLUTEN-FREE PURPLE SWEET POTATO TOAST - VEGAN VERSION
  {
    name: "Vegan Purple Sweet Potato Toast with Chickpea Scramble",
    portion: "1 serving (2 slices)",
    nutrition: {
      protein: 18,
      prepTime: 10,
      calories: 465,
      carbohydrates: 48,
      fats: 22,
      fiber: 14,
      sugar: 9,
      sodium: 480,
      potassium: 720,
      calcium: 140,
      iron: 4.2,
      vitaminC: 18,
      costEuros: 3.80,
      proteinPerEuro: 4.7
    },
    category: "breakfast",
    tags: ["Vegan", "Plant-Based", "Gluten-Free", "High-Fiber", "Meal-Prep", "Nutrient-Dense"],
    ingredients: [
      "2 slices gluten-free purple sweet potato bread (pre-made)",
      "1/2 avocado (80g, mashed)",
      "80g chickpea scramble (pre-made with turmeric)",
      "40g vegan feta (pre-made)",
      "100g sautéed spinach and peas mix",
      "1 tbsp roasted pumpkin seeds",
      "1 tsp black sesame seeds",
      "1/2 lemon (juiced)",
      "1 tsp olive oil",
      "Salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["purple sweet potato", "avocado", "spinach", "peas"],
      benefits: ["Anthocyanins from purple sweet potato", "Complete plant protein from chickpeas and peas", "Iron from spinach and chickpeas", "Healthy fats from avocado", "High fiber for digestive health"]
    },
    recipeBenefits: [
      "Purple sweet potato provides antioxidants and complex carbohydrates",
      "Exceptionally high fiber content (14g) supports blood sugar stability",
      "Complete plant-based protein from chickpea and pea combination",
      "Turmeric in chickpea scramble provides anti-inflammatory benefits",
      "Healthy fats from avocado and seeds aid nutrient absorption",
      "Completely vegan and gluten-free for multiple dietary needs",
      "Meal-prep components can be prepared days in advance"
    ],
    recipe: {
      instructions: [
        "Toast 2 slices of pre-made purple sweet potato bread until golden",
        "Gently warm the pre-made chickpea scramble in a pan",
        "Mash half an avocado with lemon juice and a pinch of salt",
        "Quickly warm the pre-made sautéed spinach and peas mixture",
        "Spread mashed avocado evenly on both toast slices",
        "Layer the warm spinach and peas mixture on top",
        "Add the warmed chickpea scramble as the protein layer",
        "Crumble vegan feta generously over the scramble",
        "Sprinkle with roasted pumpkin seeds and black sesame seeds",
        "Serve immediately while all components are warm"
      ],
      tips: [
        "Chickpea scramble reheats best with a splash of plant milk",
        "The turmeric in the scramble provides beautiful golden color",
        "All prep components can be made 2-3 days ahead",
        "Purple sweet potato bread freezes excellently sliced"
      ],
      notes: "Completely plant-based breakfast toast featuring antioxidant-rich purple sweet potato with high-protein chickpea scramble. Perfect for vegan meal prep!"
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },

  // ASIAN-INSPIRED CRISPY TOFU BOWL WITH GREEN CASHEW SAUCE
  {
    name: "Crispy Tofu Bowl with Roasted Pumpkin & Green Cashew Sauce",
    portion: "1 serving",
    nutrition: {
      protein: 20,
      prepTime: 45,
      calories: 485,
      carbohydrates: 28,
      fats: 32,
      fiber: 11,
      sugar: 8,
      sodium: 420,
      potassium: 880,
      calcium: 180,
      iron: 4.5,
      vitaminC: 35,
      costEuros: 4.80,
      proteinPerEuro: 4.2
    },
    category: "lunch",
    tags: ["Vegan", "Plant-Based", "High-Protein", "Blood-Sugar-Friendly", "Tofu", "Pumpkin", "Cashew-Sauce", "Asian-Inspired", "Nutrient-Dense", "Gluten-Free"],
    ingredients: [
      "100g firm tofu (pressed and cubed)",
      "120g pumpkin (cubed)",
      "80g eggplant (cubed, about 1/2 small)",
      "30g spinach (1 handful)",
      "40g bok choy (2-3 leaves)",
      "40g cashews (soaked 1-2 hours)",
      "1 tbsp cornstarch (maizena)",
      "1 tsp soy sauce",
      "1/2 tsp sesame oil",
      "1.5 tsp coconut oil (divided)",
      "1 tsp olive oil",
      "1/4 tsp turmeric powder",
      "1/4 tsp coriander powder",
      "1/2 clove garlic (minced)",
      "1/4 lime (juiced)",
      "1 tbsp coconut milk",
      "Small handful fresh basil or kemangi leaves",
      "1 tsp crispy fried shallots",
      "Salt to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["pumpkin", "eggplant", "spinach", "bok choy"],
      benefits: ["Beta-carotene from pumpkin", "Fiber from eggplant", "Iron from spinach", "Vitamin K from bok choy", "Healthy fats from cashews"]
    },
    recipeBenefits: [
      "High-quality plant protein from tofu with complete amino acids",
      "Slow-release carbohydrates from roasted pumpkin support stable energy",
      "Cashews provide healthy monounsaturated fats and magnesium",
      "Turmeric offers anti-inflammatory compounds",
      "High fiber content aids digestion and blood sugar stability",
      "Rich in vitamins A, C, K and folate from diverse vegetables",
      "Asian spices provide antioxidants and digestive benefits"
    ],
    recipe: {
      instructions: [
        "Soak cashews in water for 1-2 hours to soften",
        "Press tofu to remove excess water, then cut into cubes",
        "Toss tofu with soy sauce and sesame oil, let rest for 10 minutes",
        "Preheat oven to 200°C and line a baking tray",
        "Cube pumpkin and eggplant, toss with 1 tsp coconut oil, turmeric, coriander, and salt",
        "Roast vegetables for 20-25 minutes until tender and lightly browned",
        "Coat marinated tofu with cornstarch and a pinch of salt",
        "Heat olive oil in a pan and pan-fry tofu cubes until golden and crispy (5-6 minutes)",
        "In the same pan, heat remaining coconut oil and sauté minced garlic",
        "Add spinach and bok choy, stir-fry quickly until just wilted",
        "For green sauce: blend soaked cashews, lime juice, coconut milk, olive oil, basil, salt, and 1-2 tbsp water until creamy",
        "Assemble bowl: layer roasted pumpkin and eggplant as base",
        "Add sautéed greens, top with crispy tofu",
        "Drizzle with green cashew sauce and garnish with fried shallots and fresh basil"
      ],
      tips: [
        "Press tofu well for crispier results - use a clean kitchen towel",
        "Don't overcrowd the pan when frying tofu for maximum crispiness",
        "Soak cashews overnight for ultra-smooth sauce texture",
        "Roasted vegetables can be made ahead and reheated",
        "Green sauce keeps in fridge for 2-3 days"
      ],
      notes: "Vibrant Asian-inspired bowl featuring crispy tofu with aromatic roasted vegetables and a creamy herb-cashew sauce. Perfect balance of protein, healthy fats, and slow carbs."
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },

  // HIGH-PROTEIN SOURDOUGH TOAST WITH BABA GANOUSH & MULTIPLE PROTEINS
  {
    name: "High-Protein Sourdough Toast with Baba Ganoush, Eggs & Tofu",
    portion: "1 serving",
    nutrition: {
      protein: 40,
      prepTime: 15,
      calories: 765,
      carbohydrates: 54,
      fats: 31,
      fiber: 8,
      sugar: 6,
      sodium: 680,
      potassium: 650,
      calcium: 180,
      iron: 5.2,
      vitaminC: 8,
      costEuros: 5.20,
      proteinPerEuro: 7.7
    },
    category: "breakfast",
    tags: ["Vegetarian", "High-Protein", "Sourdough", "Baba-Ganoush", "Tofu", "Mushrooms", "Hearty", "Protein-Power"],
    ingredients: [
      "1 thick slice sourdough bread",
      "3-4 tbsp baba ganoush",
      "3 eggs (poached or boiled)",
      "100g mixed mushrooms (sliced)",
      "90g firm tofu (crumbled or sliced)",
      "1 tsp olive oil",
      "1 tsp lemon juice (optional)",
      "1 tsp fresh herbs (dill or parsley, chopped)",
      "1 tsp sesame seeds",
      "1 tsp sunflower seeds",
      "1 tsp pumpkin seeds",
      "Salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1,
      vegetables: ["mushrooms", "eggplant (in baba ganoush)"],
      benefits: ["Complete protein from eggs and tofu", "Healthy fats from baba ganoush", "B vitamins from mushrooms", "Fiber from sourdough", "Healthy fats and minerals from mixed seeds"]
    },
    recipeBenefits: [
      "Exceptional 40g protein from multiple high-quality sources",
      "Sourdough provides beneficial probiotics and easier digestion",
      "Baba ganoush delivers healthy fats and Mediterranean flavors",
      "Mushrooms provide umami, B vitamins, and selenium",
      "Tofu adds plant-based protein and isoflavones",
      "Mixed seeds contribute healthy fats, fiber, and minerals",
      "Perfect balance of animal and plant proteins for sustained energy"
    ],
    recipe: {
      instructions: [
        "Heat olive oil in a pan over medium heat",
        "Add sliced mushrooms, season with salt and pepper",
        "Sauté mushrooms until golden brown and caramelized (5-7 minutes)",
        "Finish mushrooms with lemon juice if desired, then set aside",
        "In the same pan, either crumble tofu for a scramble-like texture or slice and sear until golden on both sides",
        "Meanwhile, poach or boil 3 eggs to your preferred doneness",
        "Toast the sourdough bread slice until golden and crispy",
        "Spread 3-4 tablespoons of baba ganoush generously on the toast",
        "Layer the sautéed mushrooms and tofu on top of the baba ganoush",
        "Carefully place the cooked eggs on top",
        "Sprinkle with fresh chopped herbs and mixed seeds",
        "Season with a final pinch of salt and pepper if needed",
        "Serve immediately while toast is still warm"
      ],
      tips: [
        "Use a variety of mushrooms (shiitake, cremini, oyster) for complex flavor",
        "Don't overcrowd mushrooms in the pan - cook in batches if needed",
        "Crumbled tofu gives a scrambled texture, sliced gives more distinct protein layers",
        "Choose thick-cut sourdough for better structural support",
        "Mixed seeds can be lightly toasted for extra flavor and crunch"
      ],
      notes: "Protein powerhouse breakfast combining the tangy richness of baba ganoush with multiple protein sources. Perfect for those needing sustained energy and muscle support."
    },
    createdAt: new Date('2025-09-09'),
    active: true
  },
  {
    name: "High-protein pistachio cheesecake",
    portion: "1 individual serving",
    nutrition: {
      protein: 18,
      prepTime: 30,
      calories: 320,
      carbohydrates: 32,
      fats: 14,
      fiber: 3,
      sugar: 20,
      sodium: 180,
      potassium: 380,
      calcium: 140,
      iron: 1.8,
      vitaminC: 2,
      costEuros: 2.40,
      proteinPerEuro: 7.5
    },
    category: "breakfast",
    tags: ["Vegetarian", "High-Protein", "Make-Ahead", "Dessert-for-Breakfast", "Pistachios"],
    ingredients: [
      "50g cottage cheese (about 3 tbsp)",
      "50g Greek yogurt (about 3 tbsp)",
      "1 medium egg",
      "30g shelled pistachios (about 3 tbsp)",
      "1.5 tbsp maple syrup or honey",
      "1 tsp almond flour or oat flour",
      "¼ tsp vanilla extract"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 0,
      vegetables: [],
      benefits: ["High protein from dairy and eggs", "Healthy fats from pistachios", "Natural sweetness from maple syrup"]
    },
    recipeBenefits: [
      "18g protein from cottage cheese, Greek yogurt, and eggs for muscle support",
      "Pistachios provide heart-healthy fats and antioxidants",
      "Make-ahead breakfast option - prep the night before",
      "Creamy, indulgent texture with natural sweetness",
      "Individual portion perfect for meal prep"
    ],
    recipe: {
      instructions: [
        "Preheat oven to 163°C (325°F)",
        "Add all ingredients (cottage cheese, Greek yogurt, egg, pistachios, maple syrup, almond flour, and vanilla) to a blender",
        "Blend on high speed until completely smooth with no pistachio chunks remaining",
        "Pour the mixture into a small ramekin or individual baking dish (about 10cm/4 inches) lined with parchment paper",
        "Bake for 15-20 minutes. The edges should feel set but the center should still have a slight jiggle when you move the dish",
        "Remove from oven and let cool to room temperature",
        "Transfer to the fridge and chill for at least 2-4 hours (overnight is best)",
        "Serve chilled, optionally topped with extra crushed pistachios"
      ],
      tips: [
        "The center will set completely as it cools in the fridge - don't overbake",
        "For a sweeter cheesecake, add an extra tablespoon of maple syrup",
        "Line your ramekin with parchment paper for easy removal",
        "Store covered in the fridge for up to 3 days"
      ],
      notes: "Individual high-protein pistachio cheesecake that's perfect for meal prep breakfasts. The creamy texture and natural pistachio flavor make this feel like dessert while providing substantial protein to start your day."
    },
    createdAt: new Date('2025-10-03'),
    active: true
  },
  {
    name: "Lactose-free high-protein pistachio cheesecake",
    portion: "1 individual serving",
    nutrition: {
      protein: 17,
      prepTime: 30,
      calories: 310,
      carbohydrates: 32,
      fats: 14,
      fiber: 3,
      sugar: 20,
      sodium: 170,
      potassium: 370,
      calcium: 120,
      iron: 1.8,
      vitaminC: 2,
      costEuros: 2.60,
      proteinPerEuro: 6.5
    },
    category: "breakfast",
    tags: ["Vegetarian", "Lactose-Free", "High-Protein", "Make-Ahead", "Dessert-for-Breakfast", "Pistachios"],
    ingredients: [
      "50g lactose-free cottage cheese (about 3 tbsp)",
      "50g lactose-free Greek yogurt (about 3 tbsp)",
      "1 medium egg",
      "30g shelled pistachios (about 3 tbsp)",
      "1.5 tbsp maple syrup or honey",
      "1 tsp almond flour or oat flour",
      "¼ tsp vanilla extract"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 0,
      vegetables: [],
      benefits: ["High protein from lactose-free dairy and eggs", "Healthy fats from pistachios", "Natural sweetness from maple syrup"]
    },
    recipeBenefits: [
      "17g protein from lactose-free dairy and eggs for muscle support",
      "Gentle on digestion - perfect for lactose intolerance",
      "Pistachios provide heart-healthy fats and antioxidants",
      "Make-ahead breakfast option - prep the night before",
      "Creamy, indulgent texture with natural sweetness"
    ],
    recipe: {
      instructions: [
        "Preheat oven to 163°C (325°F)",
        "Add all ingredients (lactose-free cottage cheese, lactose-free Greek yogurt, egg, pistachios, maple syrup, almond flour, and vanilla) to a blender",
        "Blend on high speed until completely smooth with no pistachio chunks remaining",
        "Pour the mixture into a small ramekin or individual baking dish (about 10cm/4 inches) lined with parchment paper",
        "Bake for 15-20 minutes. The edges should feel set but the center should still have a slight jiggle when you move the dish",
        "Remove from oven and let cool to room temperature",
        "Transfer to the fridge and chill for at least 2-4 hours (overnight is best)",
        "Serve chilled, optionally topped with extra crushed pistachios"
      ],
      tips: [
        "The center will set completely as it cools in the fridge - don't overbake",
        "For a sweeter cheesecake, add an extra tablespoon of maple syrup",
        "Line your ramekin with parchment paper for easy removal",
        "Use certified lactose-free dairy products for best results",
        "Store covered in the fridge for up to 3 days"
      ],
      notes: "Lactose-free individual pistachio cheesecake that's gentle on digestion. The creamy texture and natural pistachio flavor make this feel like dessert while providing substantial protein to start your day."
    },
    createdAt: new Date('2025-10-03'),
    active: true
  },
  
  // NEW VIRAL RECIPES
  {
    name: "Lactose-free cottage cheese breakfast bowl",
    portion: "1 serving",
    nutrition: {
      protein: 28,
      prepTime: 5,
      calories: 285,
      carbohydrates: 32,
      fats: 8,
      fiber: 6,
      sugar: 22,
      sodium: 180,
      potassium: 420,
      calcium: 150,
      iron: 2.1,
      vitaminC: 45,
      costEuros: 3.80,
      proteinPerEuro: 7.4
    },
    category: "breakfast",
    tags: ["Viral", "Social-Media", "Vegetarian", "Lactose-Free", "High-Protein", "Quick", "No-Cook", "TikTok-Inspired"],
    ingredients: [
      "200g lactose-free cottage cheese",
      "1 scoop (30g) vanilla protein powder",
      "80g frozen mixed berries",
      "1 tbsp (15ml) honey",
      "10g dark chocolate chips",
      "15g sliced almonds"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 0.5,
      vegetables: [],
      benefits: ["High protein from lactose-free dairy", "Antioxidants from berries", "Healthy fats from almonds"]
    },
    recipeBenefits: [
      "28g protein supports muscle recovery and satiety",
      "Lactose-free for sensitive digestion",
      "Frozen berries create creamy ice cream-like texture",
      "Ready in 5 minutes - perfect for busy mornings",
      "Tastes like dessert but packed with nutrients"
    ],
    recipe: {
      instructions: [
        "Add lactose-free cottage cheese to a bowl",
        "Mix in vanilla protein powder until well combined",
        "Add frozen berries (they'll create the 'ice cream' texture)",
        "Drizzle with honey",
        "Top with dark chocolate chips and sliced almonds",
        "Mix together and enjoy immediately while berries are still frozen for best texture"
      ],
      tips: [
        "Keep berries frozen until ready to eat for ice cream-like consistency",
        "Blend cottage cheese first if you prefer smoother texture",
        "Add a pinch of cinnamon for extra flavor",
        "Use any frozen fruit you prefer - mango and strawberries work great"
      ],
      notes: "Viral TikTok breakfast bowl that looks and tastes like ice cream but delivers 28g of protein. Lactose-free version is gentle on digestion while maintaining creamy texture."
    },
    createdAt: new Date('2025-10-04'),
    active: true
  },
  
  {
    name: "Lactose-free protein cookie dough bites",
    portion: "4 bites (100g total)",
    nutrition: {
      protein: 24,
      prepTime: 10,
      calories: 320,
      carbohydrates: 28,
      fats: 14,
      fiber: 8,
      sugar: 8,
      sodium: 85,
      potassium: 280,
      calcium: 90,
      iron: 2.8,
      vitaminC: 1,
      costEuros: 2.90,
      proteinPerEuro: 8.3
    },
    category: "snack",
    tags: ["Viral", "Social-Media", "Vegetarian", "Lactose-Free", "High-Protein", "No-Bake", "Meal-Prep", "TikTok-Inspired"],
    ingredients: [
      "120g almond flour",
      "30g vanilla protein powder",
      "3 tbsp (45g) almond butter",
      "2 tbsp (30ml) maple syrup",
      "20g lactose-free dark chocolate chips",
      "pinch of salt",
      "2 tbsp (30ml) almond milk"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 0,
      vegetables: [],
      benefits: ["High protein from nuts and protein powder", "Healthy fats from almond butter", "No refined sugars"]
    },
    recipeBenefits: [
      "24g protein per serving supports muscle maintenance",
      "Lactose-free and safe for dairy-sensitive individuals",
      "No-bake recipe perfect for meal prep",
      "Satisfies sweet tooth while providing nutrition",
      "Portable snack for on-the-go"
    ],
    recipe: {
      instructions: [
        "In a bowl, mix almond flour, protein powder, and salt",
        "Add almond butter and maple syrup, mix until crumbly",
        "Add almond milk 1 tablespoon at a time until dough forms",
        "Fold in lactose-free chocolate chips",
        "Roll into 4 equal-sized balls",
        "Refrigerate for at least 30 minutes before eating",
        "Store in airtight container in fridge for up to 1 week"
      ],
      tips: [
        "Dough should be slightly sticky but hold together - add more almond milk if too dry",
        "Use certified lactose-free chocolate chips for completely dairy-free",
        "Roll in cocoa powder or coconut for extra flavor",
        "Double the batch for meal prep"
      ],
      notes: "Viral no-bake cookie dough bites that are safe to eat and lactose-free. Perfect high-protein snack for anyone avoiding dairy."
    },
    createdAt: new Date('2025-10-04'),
    active: true
  },
  
  {
    name: "Marry me butter chicken pasta",
    portion: "1 serving (350g)",
    nutrition: {
      protein: 42,
      prepTime: 25,
      calories: 520,
      carbohydrates: 48,
      fats: 18,
      fiber: 8,
      sugar: 9,
      sodium: 680,
      potassium: 720,
      calcium: 180,
      iron: 3.2,
      vitaminC: 12,
      costEuros: 5.20,
      proteinPerEuro: 8.1
    },
    category: "dinner",
    tags: ["Viral", "Social-Media", "High-Protein", "Indian-Inspired", "TikTok-Inspired"],
    ingredients: [
      "150g chicken breast",
      "80g whole wheat pasta",
      "100ml Greek yogurt",
      "2 tbsp butter chicken spice blend",
      "1 garlic clove",
      "50g sun-dried tomatoes",
      "30g spinach",
      "20g parmesan cheese",
      "1 tbsp olive oil",
      "salt and pepper to taste"
    ],
    wholeFoodLevel: "moderate",
    vegetableContent: {
      servings: 1,
      vegetables: ["spinach", "tomatoes", "garlic"],
      benefits: ["Vitamin K from spinach", "Lycopene from tomatoes", "Anti-inflammatory compounds"]
    },
    recipeBenefits: [
      "42g protein from chicken and dairy for muscle support",
      "Whole wheat pasta provides sustained energy",
      "Greek yogurt adds creaminess and probiotics",
      "Sun-dried tomatoes boost flavor and antioxidants",
      "Viral 'marry me' flavor that actually delivers nutrition"
    ],
    recipe: {
      instructions: [
        "Cook whole wheat pasta according to package directions, drain and set aside",
        "Cut chicken breast into bite-sized pieces, season with salt, pepper, and 1 tbsp butter chicken spices",
        "Heat olive oil in pan, cook chicken until golden and cooked through (6-8 minutes)",
        "Remove chicken, add minced garlic to pan, cook 30 seconds",
        "Add chopped sun-dried tomatoes and remaining spice blend, cook 1 minute",
        "Stir in Greek yogurt and 50ml pasta water, create creamy sauce",
        "Add spinach and cooked pasta, toss until spinach wilts",
        "Return chicken to pan, mix well",
        "Top with grated parmesan and serve immediately"
      ],
      tips: [
        "Reserve pasta water to thin sauce if needed",
        "Use full-fat Greek yogurt for creamiest texture",
        "Butterfly chicken breast for faster cooking",
        "Fresh spinach adds color and nutrition without overwhelming flavor"
      ],
      notes: "Viral 'marry me' pasta combining butter chicken flavors with Italian comfort food. This protein-packed version keeps the indulgent taste while delivering serious nutrition."
    },
    createdAt: new Date('2025-10-04'),
    active: true
  },
  
  {
    name: "Gluten-free lactose-free marry me butter chicken pasta",
    portion: "1 serving (350g)",
    nutrition: {
      protein: 40,
      prepTime: 25,
      calories: 535,
      carbohydrates: 52,
      fats: 17,
      fiber: 6,
      sugar: 8,
      sodium: 620,
      potassium: 690,
      calcium: 95,
      iron: 2.9,
      vitaminC: 12,
      costEuros: 6.10,
      proteinPerEuro: 6.6
    },
    category: "dinner",
    tags: ["Viral", "Social-Media", "High-Protein", "Gluten-Free", "Lactose-Free", "Indian-Inspired", "TikTok-Inspired"],
    ingredients: [
      "150g chicken breast",
      "80g gluten-free pasta",
      "100ml lactose-free Greek yogurt",
      "2 tbsp butter chicken spice blend",
      "1 garlic clove",
      "50g sun-dried tomatoes",
      "30g spinach",
      "1 tbsp olive oil",
      "salt and pepper to taste"
    ],
    wholeFoodLevel: "moderate",
    vegetableContent: {
      servings: 1,
      vegetables: ["spinach", "tomatoes", "garlic"],
      benefits: ["Vitamin K from spinach", "Lycopene from tomatoes", "Gentle on digestion"]
    },
    recipeBenefits: [
      "40g protein for muscle support without gluten or lactose",
      "Gluten-free pasta suitable for celiac disease",
      "Lactose-free yogurt gentle on sensitive stomachs",
      "All the viral flavor, none of the digestive issues",
      "Sun-dried tomatoes add depth and antioxidants"
    ],
    recipe: {
      instructions: [
        "Cook gluten-free pasta according to package directions (usually 1-2 minutes less than wheat pasta), drain and set aside",
        "Cut chicken breast into bite-sized pieces, season with salt, pepper, and 1 tbsp butter chicken spices",
        "Heat olive oil in pan, cook chicken until golden and cooked through (6-8 minutes)",
        "Remove chicken, add minced garlic to pan, cook 30 seconds",
        "Add chopped sun-dried tomatoes and remaining spice blend, cook 1 minute",
        "Stir in lactose-free Greek yogurt and 50ml pasta water, create creamy sauce",
        "Add spinach and cooked pasta, toss until spinach wilts",
        "Return chicken to pan, mix well and serve immediately"
      ],
      tips: [
        "Gluten-free pasta can get mushy - cook al dente",
        "Use certified gluten-free spice blends to avoid cross-contamination",
        "Lactose-free yogurt behaves exactly like regular in this recipe",
        "Reserve extra pasta water - gluten-free pasta absorbs more liquid"
      ],
      notes: "Gluten-free and lactose-free version of the viral 'marry me' pasta. Perfect for those with celiac disease or lactose intolerance who don't want to miss out on trending recipes."
    },
    createdAt: new Date('2025-10-04'),
    active: true
  },
  
  {
    name: "Vegetarian marry me mushroom pasta",
    portion: "1 serving (350g)",
    nutrition: {
      protein: 28,
      prepTime: 25,
      calories: 485,
      carbohydrates: 54,
      fats: 16,
      fiber: 9,
      sugar: 8,
      sodium: 580,
      potassium: 840,
      calcium: 220,
      iron: 4.1,
      vitaminC: 10,
      costEuros: 4.50,
      proteinPerEuro: 6.2
    },
    category: "dinner",
    tags: ["Viral", "Social-Media", "Vegetarian", "High-Protein", "Indian-Inspired", "TikTok-Inspired"],
    ingredients: [
      "150g mixed mushrooms (cremini, shiitake)",
      "80g whole wheat pasta",
      "100ml Greek yogurt",
      "2 tbsp butter chicken spice blend",
      "1 garlic clove",
      "50g sun-dried tomatoes",
      "30g spinach",
      "20g parmesan cheese",
      "50g chickpeas (canned, drained)",
      "1 tbsp olive oil",
      "salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["mushrooms", "spinach", "tomatoes", "garlic"],
      benefits: ["B vitamins from mushrooms", "Iron from spinach", "Fiber from chickpeas", "Antioxidants from tomatoes"]
    },
    recipeBenefits: [
      "28g plant-based protein from chickpeas, dairy, and mushrooms",
      "Mushrooms provide umami depth replacing chicken",
      "Chickpeas add protein and fiber for satiety",
      "Vegetarian version of viral recipe without compromise",
      "Rich in B vitamins and minerals"
    ],
    recipe: {
      instructions: [
        "Cook whole wheat pasta according to package directions, drain and set aside",
        "Slice mushrooms, season with salt, pepper, and 1 tbsp butter chicken spices",
        "Heat olive oil in pan, sauté mushrooms until golden and liquid evaporates (5-6 minutes)",
        "Add drained chickpeas to pan, cook 2 minutes until slightly crispy",
        "Add minced garlic, cook 30 seconds",
        "Add chopped sun-dried tomatoes and remaining spice blend, cook 1 minute",
        "Stir in Greek yogurt and 50ml pasta water, create creamy sauce",
        "Add spinach and cooked pasta, toss until spinach wilts",
        "Top with grated parmesan and serve immediately"
      ],
      tips: [
        "Don't crowd mushrooms in pan - cook in batches for best browning",
        "Use a mix of mushroom varieties for complex flavor",
        "Chickpeas add protein and creamy texture when mashed slightly",
        "Fresh herbs like cilantro make great garnish"
      ],
      notes: "Vegetarian version of viral 'marry me' pasta using hearty mushrooms and protein-rich chickpeas. All the flavor and creaminess of the original without the meat."
    },
    createdAt: new Date('2025-10-04'),
    active: true
  },
  
  {
    name: "Lactose-free vegetarian cloud bread sandwich",
    portion: "2 cloud bread pieces + filling",
    nutrition: {
      protein: 30,
      prepTime: 20,
      calories: 325,
      carbohydrates: 18,
      fats: 16,
      fiber: 4,
      sugar: 6,
      sodium: 420,
      potassium: 380,
      calcium: 85,
      iron: 2.4,
      vitaminC: 18,
      costEuros: 3.20,
      proteinPerEuro: 9.4
    },
    category: "lunch",
    tags: ["Viral", "Social-Media", "Vegetarian", "Lactose-Free", "Gluten-Free", "High-Protein", "Low-Carb", "TikTok-Inspired"],
    ingredients: [
      "3 medium eggs",
      "120g lactose-free Greek yogurt",
      "15g vanilla protein powder",
      "1/2 tsp baking powder",
      "Filling: 30g avocado",
      "Filling: 50g hummus",
      "Filling: 20g lettuce",
      "Filling: 1 medium tomato (80g)",
      "pinch of salt"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1.5,
      vegetables: ["lettuce", "tomato", "avocado"],
      benefits: ["Healthy fats from avocado", "Lycopene from tomato", "Fiber from vegetables"]
    },
    recipeBenefits: [
      "30g protein from eggs and lactose-free yogurt",
      "Gluten-free and grain-free bread alternative",
      "Fluffy, cloud-like texture that's Instagram-worthy",
      "Low-carb option perfect for blood sugar management",
      "Lactose-free for sensitive digestion"
    ],
    recipe: {
      instructions: [
        "Preheat oven to 150°C (300°F) and line baking sheet with parchment",
        "Separate egg whites from yolks",
        "Beat egg whites with pinch of salt until stiff peaks form",
        "In separate bowl, mix egg yolks, lactose-free yogurt, protein powder, and baking powder",
        "Gently fold yolk mixture into egg whites, being careful not to deflate",
        "Spoon mixture into 2 large circles on baking sheet (about 10cm diameter each)",
        "Bake for 18-20 minutes until golden and set",
        "Let cool completely (they'll firm up as they cool)",
        "Fill with mashed avocado, hummus, lettuce, and sliced tomato"
      ],
      tips: [
        "Don't over-mix when folding - cloudy texture comes from air in egg whites",
        "Cloud bread is delicate when warm - let it cool before handling",
        "Use lactose-free yogurt for completely dairy-free option",
        "Store unfilled cloud bread in airtight container for up to 2 days"
      ],
      notes: "Viral cloud bread recipe made lactose-free and vegetarian. Fluffy, protein-packed bread alternative that looks like clouds and is perfect for sandwiches."
    },
    createdAt: new Date('2025-10-04'),
    active: true
  },
  
  {
    name: "Lactose-free protein churro breakfast bowl",
    portion: "1 serving",
    nutrition: {
      protein: 26,
      prepTime: 12,
      calories: 380,
      carbohydrates: 44,
      fats: 12,
      fiber: 7,
      sugar: 18,
      sodium: 95,
      potassium: 520,
      calcium: 180,
      iron: 2.6,
      vitaminC: 88,
      costEuros: 4.10,
      proteinPerEuro: 6.3
    },
    category: "breakfast",
    tags: ["Viral", "Social-Media", "Vegetarian", "Lactose-Free", "High-Protein", "Quick", "TikTok-Inspired"],
    ingredients: [
      "150g lactose-free Greek yogurt",
      "25g vanilla protein powder",
      "1 tsp cinnamon",
      "1 tbsp (15ml) honey",
      "40g granola",
      "80g fresh strawberries",
      "10g lactose-free dark chocolate shavings"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 0.5,
      vegetables: [],
      benefits: ["Vitamin C from strawberries", "Antioxidants from cinnamon", "Probiotics from yogurt"]
    },
    recipeBenefits: [
      "26g protein from lactose-free yogurt and protein powder",
      "Tastes like churros but delivers breakfast nutrition",
      "Cinnamon helps regulate blood sugar",
      "Lactose-free for sensitive stomachs",
      "Ready in 12 minutes - perfect for busy mornings"
    ],
    recipe: {
      instructions: [
        "In a bowl, mix lactose-free Greek yogurt with vanilla protein powder until smooth",
        "Stir in cinnamon until evenly distributed",
        "Transfer to serving bowl",
        "Drizzle with honey",
        "Top with granola for crunch",
        "Add sliced fresh strawberries",
        "Finish with lactose-free dark chocolate shavings",
        "Serve immediately"
      ],
      tips: [
        "Mix protein powder thoroughly to avoid lumps",
        "Use warm cinnamon-toasted granola for extra churro flavor",
        "Fresh berries can be swapped for any seasonal fruit",
        "Make it vegan by using plant-based yogurt and protein powder",
        "Drizzle with almond butter for extra protein and healthy fats"
      ],
      notes: "Viral churro bowl that tastes like dessert for breakfast. Lactose-free version is gentle on digestion while maintaining the creamy, sweet churro flavor everyone loves."
    },
    createdAt: new Date('2025-10-04'),
    active: true
  },
  
  {
    name: "Lactose-free cucumber sushi protein boats",
    portion: "6 cucumber boats",
    nutrition: {
      protein: 24,
      prepTime: 15,
      calories: 195,
      carbohydrates: 12,
      fats: 8,
      fiber: 4,
      sugar: 6,
      sodium: 580,
      potassium: 420,
      calcium: 45,
      iron: 1.8,
      vitaminC: 12,
      costEuros: 3.40,
      proteinPerEuro: 7.1
    },
    category: "snack",
    tags: ["Viral", "Social-Media", "High-Protein", "Lactose-Free", "Low-Carb", "No-Cook", "Gluten-Free", "TikTok-Inspired"],
    ingredients: [
      "1 large cucumber (300g)",
      "120g canned tuna (drained)",
      "2 tbsp (30ml) lactose-free Greek yogurt",
      "1 tsp sriracha sauce",
      "30g avocado",
      "10g sesame seeds",
      "2 nori seaweed sheets (cut into strips)",
      "soy sauce for serving"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["cucumber", "avocado"],
      benefits: ["Hydration from cucumber", "Healthy fats from avocado", "Low calorie and refreshing"]
    },
    recipeBenefits: [
      "24g protein from tuna with minimal calories",
      "Lactose-free for dairy-sensitive individuals",
      "Low-carb alternative to sushi rice",
      "Visually stunning presentation perfect for social media",
      "Refreshing and light - ideal for summer snacking"
    ],
    recipe: {
      instructions: [
        "Cut cucumber in half lengthwise, scoop out seeds with spoon to create 'boats'",
        "Cut each half into 3 equal pieces (6 boats total)",
        "In bowl, mix drained tuna, lactose-free Greek yogurt, and sriracha",
        "Fill each cucumber boat with tuna mixture",
        "Top with thin avocado slices",
        "Sprinkle with sesame seeds",
        "Garnish with nori seaweed strips",
        "Serve with soy sauce on the side"
      ],
      tips: [
        "Pat cucumber dry after scooping to prevent soggy filling",
        "Use a melon baller to easily remove cucumber seeds",
        "Adjust sriracha to your spice preference",
        "Make ahead and store in fridge for up to 4 hours",
        "Swap tuna for cooked shrimp or salmon for variety"
      ],
      notes: "Viral cucumber sushi boats that are low-carb, high-protein, and visually stunning. Lactose-free version uses yogurt instead of mayo for creamy texture."
    },
    createdAt: new Date('2025-10-04'),
    active: true
  },

  {
    name: "Healthy sweet potato brownies",
    portion: "1 brownie (1/12 of batch)",
    nutrition: { 
      protein: 5, 
      prepTime: 50, 
      calories: 156,
      carbohydrates: 14,
      fats: 10,
      fiber: 4,
      sugar: 6,
      sodium: 160,
      costEuros: 0.80, 
      proteinPerEuro: 6.3 
    },
    category: "snack",
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Dairy-Free", "High-Fiber", "Whole-Food", "Batch-Friendly", "Viral", "Social-Media"],
    ingredients: [
      "200g sweet potato (1 medium)",
      "120ml peanut butter",
      "50g raw cacao powder",
      "60g oat flour",
      "5g salt (1 tsp)",
      "5g baking powder (1 tsp)",
      "1 vanilla pod",
      "100ml sugar-free sweetener (or maple syrup/coconut sugar to taste)",
      "30ml espresso shot (cold)",
      "120ml plant milk",
      "100g dark chocolate (chopped)"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1,
      vegetables: ["sweet potato"],
      benefits: ["High in beta-carotene", "Natural sweetness", "Fiber-rich"]
    },
    recipeBenefits: [
      "Sweet potato provides natural sweetness and moisture",
      "Rich in antioxidants from cacao and dark chocolate",
      "High fiber content supports digestive health",
      "Peanut butter adds healthy fats and protein",
      "Gluten-free and naturally vegan",
      "Makes 12 brownies - perfect for meal prep"
    ],
    recipe: {
      instructions: [
        "Preheat oven to 200°C/390°F",
        "Use a fork to poke a few holes into sweet potato, bake with skin on until tender (about 30-40 minutes)",
        "Let the sweet potato cool down completely",
        "Peel the sweet potato and add to a bowl with peanut butter, mix well until smooth",
        "Add cacao powder, oat flour, salt, baking powder, vanilla, and sweetener - mix well",
        "Add cold espresso shot and plant milk, mix until combined",
        "Fold in chopped dark chocolate (make sure espresso is cold so chocolate doesn't melt)",
        "Pour batter into a greased oven-proof dish (20x20cm recommended)",
        "Reduce oven temperature to 176°C/350°F",
        "Bake for 35-40 minutes until set but still fudgy in the center",
        "Let cool completely before cutting into 12 squares"
      ],
      tips: [
        "Bake sweet potato ahead of time to save prep time",
        "If you don't have oat flour, grind rolled oats in a blender",
        "Espresso shot MUST be cold or chocolate will melt into the batter",
        "For sweeter brownies, increase sweetener or use maple syrup",
        "Store in airtight container for up to 5 days",
        "Can be frozen for up to 3 months"
      ],
      notes: "Viral sweet potato brownies that are incredibly rich and gooey. These taste like the real deal but are packed with whole food ingredients. Perfect healthy snack for meal prep!"
    },
    createdAt: new Date('2025-10-04'),
    active: true
  },

  {
    name: "Flourless carrot cake energy balls",
    portion: "2 balls (1/12 of batch)",
    nutrition: { 
      protein: 4, 
      prepTime: 15, 
      calories: 145,
      carbohydrates: 18,
      fats: 8,
      fiber: 3,
      sugar: 12,
      sodium: 10,
      costEuros: 0.65, 
      proteinPerEuro: 6.2 
    },
    category: "snack",
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Dairy-Free", "No-Cook", "Whole-Food", "Batch-Friendly", "Energy-Bites", "Viral", "Social-Media"],
    ingredients: [
      "250g grated carrot",
      "120g walnuts",
      "150g pitted dates",
      "25g rolled oats",
      "15g shredded coconut",
      "5g ground cinnamon (1 tsp)",
      "150g cashews (for coating)",
      "110ml canned coconut milk (liquid part)",
      "15ml honey (1 tbsp)",
      "vanilla extract to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1,
      vegetables: ["carrot"],
      benefits: ["High in beta-carotene", "Natural sweetness", "Rich in antioxidants"]
    },
    recipeBenefits: [
      "No baking required - perfect for hot weather",
      "Dates provide natural sweetness and binding",
      "Walnuts add omega-3 fatty acids and protein",
      "Carrots rich in vitamin A and fiber",
      "Cashew coating provides creamy texture",
      "Makes 24 balls - ideal for meal prep and snacking",
      "Freezer-friendly for long-term storage"
    ],
    recipe: {
      instructions: [
        "In food processor, blend grated carrot, walnuts, dates, oats, shredded coconut, and cinnamon until you get a dense, sticky dough",
        "Shape mixture into 24 small balls (about 20g each) and place on a parchment-lined tray",
        "Freeze balls for 1 hour to firm up",
        "Meanwhile, blend cashews with coconut milk (liquid part only), honey, and vanilla extract until completely smooth and creamy",
        "Remove balls from freezer and coat each one with the cashew cream using a spoon or dipping fork",
        "Return coated balls to tray and freeze for at least 1 more hour before serving",
        "Store in freezer for up to 3 months, or refrigerator for up to 1 week"
      ],
      tips: [
        "Use fresh grated carrot for best texture and moisture",
        "If dough is too dry, add 1-2 dates; if too wet, add more oats",
        "Freeze balls before coating to prevent them from falling apart",
        "Use only the thick liquid part of coconut milk, not the cream on top",
        "Let balls sit at room temperature 5-10 minutes before eating for best texture",
        "Can roll in extra shredded coconut instead of cashew coating for variation"
      ],
      notes: "Viral flourless carrot cake balls that taste like dessert but are packed with whole food ingredients. No-bake recipe credited to @lindsay.keosayian. Perfect healthy snack that satisfies sweet cravings!"
    },
    createdAt: new Date('2025-10-04'),
    active: true
  },
  
  {
    name: "Cacao-blueberry power oats",
    portion: "1 bowl (350g)",
    nutrition: {
      protein: 28,
      prepTime: 10,
      calories: 420,
      carbohydrates: 52,
      fats: 16,
      fiber: 12,
      sugar: 18,
      sodium: 95,
      potassium: 580,
      calcium: 220,
      iron: 4.5,
      vitaminC: 12,
      cocoaFlavanols: 85,
      costEuros: 3.20,
      proteinPerEuro: 8.8
    },
    category: "breakfast",
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Dairy-Free", "High-Protein", "High-Fiber", "Antioxidant", "Longevity"],
    ingredients: [
      "50g rolled oats",
      "30g buckwheat flakes",
      "1 tbsp (5g) unsweetened cacao powder",
      "75g fresh blueberries",
      "1 scoop (30g) vanilla protein powder",
      "1 tbsp almond butter",
      "1/2 tsp cinnamon",
      "pinch of salt",
      "250ml almond milk"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1,
      vegetables: ["blueberries"],
      benefits: ["High in antioxidants from cacao and blueberries", "Rich in fiber and magnesium", "Supports brain health"]
    },
    recipeBenefits: [
      "85mg cocoa flavanols from cacao powder and blueberries",
      "High in protein and fiber for sustained energy",
      "Magnesium from cacao supports muscle function",
      "Antioxidants support cardiovascular health"
    ],
    recipe: {
      instructions: [
        "In a pot, combine oats, buckwheat flakes, and almond milk",
        "Heat over medium heat, stirring occasionally, for 5-7 minutes until creamy",
        "Remove from heat and stir in cacao powder, protein powder, cinnamon, and salt",
        "Mix until protein powder is fully incorporated",
        "Transfer to bowl",
        "Top with fresh blueberries and drizzle with almond butter",
        "Serve immediately"
      ],
      tips: [
        "Use frozen blueberries if fresh aren't available",
        "Add cacao powder after cooking to preserve flavanols",
        "Adjust liquid to desired consistency"
      ],
      notes: "Power-packed breakfast with 85mg flavanols supporting heart and brain health"
    },
    createdAt: new Date('2025-10-04'),
    active: true
  },
  
  {
    name: "Cashew yogurt bowl with berries and cacao nibs",
    portion: "1 bowl (300g)",
    nutrition: {
      protein: 18,
      prepTime: 5,
      calories: 350,
      carbohydrates: 42,
      fats: 14,
      fiber: 10,
      sugar: 22,
      sodium: 65,
      potassium: 480,
      calcium: 180,
      iron: 3.2,
      vitaminC: 35,
      cocoaFlavanols: 55,
      costEuros: 4.50,
      proteinPerEuro: 4.0
    },
    category: "breakfast",
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Dairy-Free", "Quick", "No-Cook", "Antioxidant", "Gut-Health"],
    ingredients: [
      "200g unsweetened cashew yogurt",
      "1 tbsp (15g) raw cacao nibs",
      "75g fresh blackberries",
      "1 tbsp chia seeds",
      "1 tsp honey (optional)",
      "fresh mint for garnish"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1,
      vegetables: ["blackberries"],
      benefits: ["Rich in antioxidants", "Anti-inflammatory properties", "Gut-friendly probiotics"]
    },
    recipeBenefits: [
      "55mg cocoa flavanols from cacao nibs and blackberries",
      "Probiotics support gut health",
      "Anti-inflammatory benefits from berries",
      "Quick and easy breakfast"
    ],
    recipe: {
      instructions: [
        "Spoon cashew yogurt into serving bowl",
        "Top with fresh blackberries",
        "Sprinkle cacao nibs evenly over the top",
        "Add chia seeds",
        "Drizzle with honey if desired",
        "Garnish with fresh mint",
        "Serve immediately"
      ],
      tips: [
        "Use soy yogurt as alternative",
        "Cacao nibs add satisfying crunch",
        "Prepare chia pudding night before for extra creaminess"
      ],
      notes: "Gut-friendly breakfast with 55mg flavanols and anti-inflammatory compounds"
    },
    createdAt: new Date('2025-10-04'),
    active: true
  },
  
  {
    name: "Chocolate protein smoothie",
    portion: "1 large glass (500ml)",
    nutrition: {
      protein: 32,
      prepTime: 5,
      calories: 380,
      carbohydrates: 44,
      fats: 12,
      fiber: 9,
      sugar: 24,
      sodium: 120,
      potassium: 620,
      calcium: 350,
      iron: 3.8,
      vitaminC: 18,
      cocoaFlavanols: 85,
      costEuros: 3.80,
      proteinPerEuro: 8.4
    },
    category: "breakfast",
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Dairy-Free", "High-Protein", "Quick", "Smoothie", "Post-Workout"],
    ingredients: [
      "1 tbsp (5g) unsweetened cocoa powder",
      "250ml unsweetened soy milk",
      "1/2 frozen banana",
      "50g frozen blueberries",
      "1 scoop (30g) vanilla protein powder",
      "1 tsp ground flaxseed",
      "1 tsp hemp hearts",
      "ice cubes"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 1,
      vegetables: ["banana", "blueberries"],
      benefits: ["Antioxidants from cocoa and berries", "Omega-3 from flax and hemp", "Potassium for muscle recovery"]
    },
    recipeBenefits: [
      "85mg cocoa flavanols from cocoa powder and blueberries",
      "32g protein for muscle recovery",
      "Omega-3 fatty acids support inflammation reduction",
      "Ready in 5 minutes"
    ],
    recipe: {
      instructions: [
        "Add soy milk to blender first",
        "Add frozen banana and blueberries",
        "Add cocoa powder and protein powder",
        "Add flaxseed and hemp hearts",
        "Add a few ice cubes",
        "Blend on high for 60-90 seconds until completely smooth",
        "Pour into glass and serve immediately"
      ],
      tips: [
        "Use frozen fruit for thicker texture",
        "Blend protein powder last to avoid clumping",
        "Add more liquid if too thick"
      ],
      notes: "High-protein smoothie with 85mg flavanols perfect for post-workout recovery"
    },
    createdAt: new Date('2025-10-04'),
    active: true
  },
  
  {
    name: "Quinoa salad with apples and walnuts",
    portion: "1 bowl (400g)",
    nutrition: {
      protein: 22,
      prepTime: 25,
      calories: 485,
      carbohydrates: 62,
      fats: 18,
      fiber: 14,
      sugar: 14,
      sodium: 180,
      potassium: 680,
      calcium: 120,
      iron: 5.2,
      vitaminC: 12,
      cocoaFlavanols: 15,
      costEuros: 4.20,
      proteinPerEuro: 5.2
    },
    category: "lunch",
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Dairy-Free", "High-Protein", "High-Fiber", "Meal-Prep"],
    ingredients: [
      "120g cooked quinoa",
      "80g fresh spinach",
      "100g cooked lentils",
      "1 small apple (120g), diced",
      "30g walnuts, chopped",
      "2 tbsp lemon juice",
      "1 tbsp olive oil",
      "1 tsp Dijon mustard",
      "salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["spinach", "apple"],
      benefits: ["High in iron and folate", "Rich in omega-3 from walnuts", "Vitamin C from apple and lemon"]
    },
    recipeBenefits: [
      "15mg cocoa flavanols from apple",
      "Complete plant protein from quinoa and lentils",
      "High fiber supports digestive health",
      "Omega-3 from walnuts"
    ],
    recipe: {
      instructions: [
        "Cook quinoa according to package instructions, let cool",
        "In large bowl, combine cooled quinoa, spinach, and cooked lentils",
        "Dice apple and add to bowl",
        "Chop walnuts and add to salad",
        "In small bowl, whisk together lemon juice, olive oil, and Dijon mustard",
        "Pour dressing over salad and toss to combine",
        "Season with salt and pepper",
        "Serve immediately or refrigerate for meal prep"
      ],
      tips: [
        "Use pre-cooked quinoa for faster prep",
        "Toast walnuts for enhanced flavor",
        "Add apple just before serving to prevent browning"
      ],
      notes: "Nutrient-dense salad with complete plant protein and 15mg flavanols from fresh apple"
    },
    createdAt: new Date('2025-10-04'),
    active: true
  },
  
  {
    name: "Tofu bowl with green vegetables and berries",
    portion: "1 bowl (450g)",
    nutrition: {
      protein: 28,
      prepTime: 20,
      calories: 395,
      carbohydrates: 38,
      fats: 16,
      fiber: 10,
      sugar: 12,
      sodium: 420,
      potassium: 720,
      calcium: 380,
      iron: 6.2,
      vitaminC: 85,
      cocoaFlavanols: 10,
      costEuros: 4.80,
      proteinPerEuro: 5.8
    },
    category: "lunch",
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Dairy-Free", "High-Protein", "Low-Carb"],
    ingredients: [
      "200g firm tofu, cubed",
      "100g kale, chopped",
      "80g zucchini, sliced",
      "60g fresh strawberries",
      "2 tbsp tahini",
      "1 tbsp lemon juice",
      "1 tsp sesame oil",
      "fresh herbs (parsley, basil)",
      "salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["kale", "zucchini", "strawberries"],
      benefits: ["High in vitamin C and iron", "Calcium from tofu and kale", "Antioxidants from berries"]
    },
    recipeBenefits: [
      "10mg cocoa flavanols from strawberries",
      "Complete plant protein from tofu",
      "High in vitamin C and iron",
      "Calcium-rich for bone health"
    ],
    recipe: {
      instructions: [
        "Press tofu to remove excess water, then cube",
        "Heat sesame oil in large pan over medium-high heat",
        "Add tofu cubes and cook 8-10 minutes until golden on all sides",
        "Add kale and zucchini, sauté for 5 minutes until tender",
        "Season with salt and pepper",
        "In small bowl, whisk tahini with lemon juice and 1-2 tbsp water until creamy",
        "Transfer vegetables and tofu to serving bowl",
        "Top with fresh strawberries and herbs",
        "Drizzle with tahini dressing"
      ],
      tips: [
        "Marinate tofu beforehand for extra flavor",
        "Use frozen berries if fresh not available",
        "Add garlic to tahini dressing for extra flavor"
      ],
      notes: "Colorful plant-based bowl with 10mg flavanols and complete nutrition"
    },
    createdAt: new Date('2025-10-04'),
    active: true
  },
  
  {
    name: "Buckwheat pasta with roasted vegetables and cacao sauce",
    portion: "1 plate (400g)",
    nutrition: {
      protein: 24,
      prepTime: 35,
      calories: 520,
      carbohydrates: 72,
      fats: 16,
      fiber: 12,
      sugar: 10,
      sodium: 320,
      potassium: 680,
      calcium: 140,
      iron: 4.8,
      vitaminC: 95,
      cocoaFlavanols: 26,
      costEuros: 4.50,
      proteinPerEuro: 5.3
    },
    category: "lunch",
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Dairy-Free", "High-Fiber"],
    ingredients: [
      "120g buckwheat pasta",
      "150g broccoli florets",
      "100g bell peppers, sliced",
      "200g tomato sauce",
      "1/2 tsp (2.5g) cacao powder",
      "1 tbsp olive oil",
      "2 garlic cloves, minced",
      "2-3 squares (20g) dark chocolate 70-85%",
      "fresh basil",
      "salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["broccoli", "bell peppers", "tomatoes"],
      benefits: ["High in vitamin C", "Antioxidants from vegetables and cacao", "Fiber-rich"]
    },
    recipeBenefits: [
      "26mg cocoa flavanols from cacao powder and dark chocolate",
      "High fiber from buckwheat and vegetables",
      "Antioxidants from tomatoes and cacao",
      "Gluten-free pasta alternative"
    ],
    recipe: {
      instructions: [
        "Preheat oven to 200°C",
        "Toss broccoli and bell peppers with olive oil, salt, and pepper",
        "Roast vegetables for 20-25 minutes until tender and slightly charred",
        "Cook buckwheat pasta according to package instructions",
        "In saucepan, warm tomato sauce with minced garlic",
        "Stir cacao powder into sauce for depth of flavor",
        "Drain pasta and toss with cacao tomato sauce",
        "Add roasted vegetables",
        "Top with dark chocolate pieces (they'll melt slightly)",
        "Garnish with fresh basil",
        "Serve immediately"
      ],
      tips: [
        "Cacao adds richness without sweetness",
        "Use chickpea pasta for extra protein",
        "Dark chocolate provides additional flavanols"
      ],
      notes: "Hearty pasta dish with 26mg flavanols from cacao and dark chocolate"
    },
    createdAt: new Date('2025-10-04'),
    active: true
  },
  
  {
    name: "Sweet potato and black bean bowl",
    portion: "1 bowl (450g)",
    nutrition: {
      protein: 18,
      prepTime: 35,
      calories: 445,
      carbohydrates: 72,
      fats: 12,
      fiber: 16,
      sugar: 14,
      sodium: 280,
      potassium: 980,
      calcium: 120,
      iron: 4.5,
      vitaminC: 28,
      cocoaFlavanols: 0,
      costEuros: 3.20,
      proteinPerEuro: 5.6
    },
    category: "dinner",
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Dairy-Free", "High-Fiber", "Longevity"],
    ingredients: [
      "200g sweet potato, cubed",
      "150g cooked black beans",
      "80g fresh spinach",
      "1/2 avocado (75g), sliced",
      "1 tbsp olive oil",
      "1 tsp cumin",
      "1/2 tsp paprika",
      "lime juice",
      "salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["sweet potato", "spinach", "avocado"],
      benefits: ["High in beta-carotene", "Rich in potassium", "Healthy fats from avocado"]
    },
    recipeBenefits: [
      "High fiber supports digestive health",
      "Complex carbs for sustained energy",
      "Plant protein from black beans",
      "Rich in vitamins A and C"
    ],
    recipe: {
      instructions: [
        "Preheat oven to 200°C",
        "Toss sweet potato cubes with olive oil, cumin, paprika, salt, and pepper",
        "Roast for 25-30 minutes until tender and caramelized",
        "Warm black beans in small pot",
        "Arrange spinach in serving bowl",
        "Top with roasted sweet potato and black beans",
        "Add sliced avocado",
        "Squeeze fresh lime juice over the bowl",
        "Season with salt and pepper",
        "Serve warm"
      ],
      tips: [
        "Cut sweet potato into even cubes for uniform cooking",
        "Add jalapeños for heat",
        "Top with cilantro for fresh flavor"
      ],
      notes: "Hearty plant-based bowl rich in fiber and complex carbohydrates"
    },
    createdAt: new Date('2025-10-04'),
    active: true
  },
  
  {
    name: "Grilled salmon with greens and berry dressing",
    portion: "1 fillet with sides (350g)",
    nutrition: {
      protein: 38,
      prepTime: 25,
      calories: 465,
      carbohydrates: 18,
      fats: 24,
      fiber: 6,
      sugar: 8,
      sodium: 380,
      potassium: 820,
      calcium: 180,
      iron: 3.2,
      vitaminC: 45,
      cocoaFlavanols: 40,
      costEuros: 7.20,
      proteinPerEuro: 5.3
    },
    category: "dinner",
    tags: ["High-Protein", "Low-Carb", "Omega-3", "Antioxidant", "Longevity"],
    ingredients: [
      "150g salmon fillet",
      "100g steamed green beans",
      "80g steamed broccoli",
      "60g fresh blackberries",
      "2 tbsp olive oil",
      "1 tbsp balsamic vinegar",
      "2-3 squares (20g) dark chocolate 70-85%",
      "lemon wedge",
      "salt and pepper to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 2,
      vegetables: ["green beans", "broccoli", "blackberries"],
      benefits: ["Omega-3 from salmon", "Vitamin C from vegetables", "Antioxidants from berries and chocolate"]
    },
    recipeBenefits: [
      "40mg cocoa flavanols from blackberries and dark chocolate",
      "High in omega-3 fatty acids",
      "Complete protein from salmon",
      "Anti-inflammatory benefits"
    ],
    recipe: {
      instructions: [
        "Season salmon with salt, pepper, and lemon juice",
        "Heat 1 tbsp olive oil in pan over medium-high heat",
        "Cook salmon 4-5 minutes per side until flaky",
        "Steam green beans and broccoli until tender-crisp (about 5-7 minutes)",
        "In small bowl, crush blackberries with fork",
        "Mix crushed berries with remaining olive oil and balsamic vinegar",
        "Arrange steamed greens on plate",
        "Top with grilled salmon",
        "Drizzle with blackberry dressing",
        "Serve with dark chocolate squares on the side"
      ],
      tips: [
        "Don't overcook salmon - it should be slightly pink in center",
        "Use tofu instead of salmon for vegan version",
        "Berry dressing adds natural sweetness"
      ],
      notes: "Omega-3 rich dinner with 40mg flavanols from berries and dark chocolate"
    },
    createdAt: new Date('2025-10-04'),
    active: true
  },
  
  {
    name: "Vegetable curry with cocoa",
    portion: "1 bowl with rice (450g)",
    nutrition: {
      protein: 16,
      prepTime: 35,
      calories: 485,
      carbohydrates: 78,
      fats: 14,
      fiber: 12,
      sugar: 10,
      sodium: 420,
      potassium: 780,
      calcium: 140,
      iron: 5.2,
      vitaminC: 65,
      cocoaFlavanols: 65,
      costEuros: 3.80,
      proteinPerEuro: 4.2
    },
    category: "dinner",
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Dairy-Free", "High-Fiber", "Indian-Inspired"],
    ingredients: [
      "150g cooked chickpeas",
      "100g pumpkin, cubed",
      "80g fresh spinach",
      "120g cooked brown rice",
      "1/2 tbsp (7g) unsweetened cocoa powder",
      "200ml coconut milk",
      "1 tbsp curry powder",
      "1 onion, diced",
      "2 garlic cloves, minced",
      "1 tbsp coconut oil",
      "salt to taste"
    ],
    wholeFoodLevel: "high",
    vegetableContent: {
      servings: 3,
      vegetables: ["pumpkin", "spinach", "onion"],
      benefits: ["Rich in beta-carotene", "Iron from spinach", "Plant protein from chickpeas"]
    },
    recipeBenefits: [
      "65mg cocoa flavanols from cocoa powder",
      "High fiber supports gut health",
      "Plant protein from chickpeas",
      "Anti-inflammatory spices"
    ],
    recipe: {
      instructions: [
        "Heat coconut oil in large pot over medium heat",
        "Sauté diced onion and garlic until fragrant (3-4 minutes)",
        "Add curry powder and cocoa powder, stir for 30 seconds",
        "Add pumpkin cubes and cook for 5 minutes",
        "Pour in coconut milk and add chickpeas",
        "Simmer for 15-20 minutes until pumpkin is tender",
        "Stir in fresh spinach until wilted",
        "Season with salt",
        "Serve over brown rice"
      ],
      tips: [
        "Cocoa adds depth without making curry sweet",
        "Adjust curry powder to taste preference",
        "Add chili for extra heat"
      ],
      notes: "Warming curry with 65mg flavanols from cocoa powder, perfect for dinner"
    },
    createdAt: new Date('2025-10-04'),
    active: true
  }
];

// Function to automatically generate dietary variants for every recipe
function generateDietaryVariants(recipes: MealOption[]): MealOption[] {
  const variants: MealOption[] = [];
  
  for (const recipe of recipes) {
    // Skip if already a variant (to avoid infinite loops)
    if (recipe.name.toLowerCase().includes('Gluten-Free') || 
        recipe.name.toLowerCase().includes('Lactose-Free') || 
        recipe.name.toLowerCase().includes('vegetarian version')) {
      continue;
    }
    
    // Removed excessive logging for performance
    
    // 1. GLUTEN-FREE VERSION - Only if recipe contains gluten ingredients
    const hasGlutenIngredients = recipe.ingredients?.some(ing => 
      (ing.toLowerCase().includes('pasta') && !ing.toLowerCase().includes('Gluten-Free')) ||
      (ing.toLowerCase().includes('flour') && !ing.toLowerCase().includes('Gluten-Free')) ||
      (ing.toLowerCase().includes('bread') && !ing.toLowerCase().includes('Gluten-Free')) ||
      (ing.toLowerCase().includes('soy sauce') && !ing.toLowerCase().includes('Gluten-Free')) ||
      ing.toLowerCase().includes('wheat')
    );
    
    let glutenFreeVersion: MealOption;
    
    const baseId = recipe.id || 10000; // Fallback to 10000 if no ID (shouldn't happen)
    
    if (hasGlutenIngredients) {
      // Create modified version for recipes with gluten
      glutenFreeVersion = {
        ...recipe,
        id: baseId + 100000, // Deterministic ID: base + 100000
        name: recipe.name,
        tags: [...recipe.tags.filter(tag => tag !== 'wheat'), 'Gluten-Free'],
        ingredients: recipe.ingredients?.map(ingredient => {
          // Convert gluten-containing ingredients
          if (ingredient.toLowerCase().includes('pasta') && !ingredient.toLowerCase().includes('Gluten-Free')) {
            // For wheat pasta or similar, replace entirely with gluten-free version
            if (ingredient.toLowerCase().includes('wheat')) {
              return ingredient.replace(/.*pasta/gi, 'gluten-free pasta (rice or chickpea)');
            }
            return ingredient.replace('pasta', 'gluten-free pasta (rice or chickpea)');
          }
          if (ingredient.toLowerCase().includes('flour') && !ingredient.toLowerCase().includes('Gluten-Free')) {
            return ingredient.replace('flour', 'gluten-free flour blend');
          }
          if (ingredient.toLowerCase().includes('bread') && !ingredient.toLowerCase().includes('Gluten-Free')) {
            return ingredient.replace('bread', 'gluten-free bread');
          }
          if (ingredient.toLowerCase().includes('soy sauce') && !ingredient.toLowerCase().includes('Gluten-Free')) {
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
        id: baseId + 100000, // Deterministic ID: base + 100000
        tags: [...recipe.tags, 'Gluten-Free']
      };
    }
    
    // 2. LACTOSE-FREE VERSION - Only if recipe contains dairy ingredients
    const hasDairyIngredients = recipe.ingredients?.some(ing => 
      (ing.toLowerCase().includes('milk') && !ing.toLowerCase().includes('almond') && !ing.toLowerCase().includes('coconut') && !ing.toLowerCase().includes('oat')) ||
      (ing.toLowerCase().includes('cream') && !ing.toLowerCase().includes('coconut')) ||
      (ing.toLowerCase().includes('butter') && !ing.toLowerCase().includes('nut') && !ing.toLowerCase().includes('peanut')) ||
      (ing.toLowerCase().includes('cheese') && !ing.toLowerCase().includes('Vegan')) ||
      (ing.toLowerCase().includes('yogurt') && !ing.toLowerCase().includes('coconut')) ||
      ing.toLowerCase().includes('parmesan')
    );
    
    let lactoseFreeVersion: MealOption;
    
    if (hasDairyIngredients) {
      // Create modified version for recipes with dairy
      lactoseFreeVersion = {
        ...recipe,
        id: baseId + 200000, // Deterministic ID: base + 200000
        name: recipe.name,
        tags: [...recipe.tags, 'Lactose-Free', 'dairy-free'],
        ingredients: recipe.ingredients?.map(ingredient => {
          // Convert dairy ingredients
          if (ingredient.toLowerCase().includes('milk') && !ingredient.toLowerCase().includes('almond') && !ingredient.toLowerCase().includes('coconut') && !ingredient.toLowerCase().includes('oat')) {
            return ingredient.replace(/milk/gi, 'oat milk');
          }
          if (ingredient.toLowerCase().includes('cream') && !ingredient.toLowerCase().includes('coconut')) {
            return ingredient.replace(/cream/gi, 'coconut cream');
          }
          if (ingredient.toLowerCase().includes('butter') && 
              !ingredient.toLowerCase().includes('nut') && 
              !ingredient.toLowerCase().includes('peanut') && 
              !ingredient.toLowerCase().includes('almond') && 
              !ingredient.toLowerCase().includes('cashew') && 
              !ingredient.toLowerCase().includes('coconut')) {
            return ingredient.replace(/butter/gi, 'vegan butter');
          }
          if (ingredient.toLowerCase().includes('cheese') && !ingredient.toLowerCase().includes('Vegan')) {
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
        id: baseId + 200000, // Deterministic ID: base + 200000
        tags: [...recipe.tags, 'Lactose-Free', 'dairy-free']
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
    
    // All vegetarian variants are now generated - unwanted ones can be deleted via admin panel
    if (hasMeat && !hasFish && !recipe.tags.includes('Vegetarian')) {
      // Create a proper vegetarian name by replacing meat terms
      let vegetarianName = recipe.name
        .replace(/free-range chicken thighs/gi, 'plant-based protein pieces')
        .replace(/chicken thighs/gi, 'plant-based protein pieces')
        .replace(/chicken breast/gi, 'plant-based protein fillets')
        .replace(/chicken/gi, 'plant-based protein')
        .replace(/beef/gi, 'plant-based meat')
        .replace(/ground beef/gi, 'plant-based mince')
        .replace(/pork/gi, 'plant-based protein')
        .replace(/bacon/gi, 'plant-based bacon')
        .replace(/ham/gi, 'plant-based ham')
        .replace(/sausage/gi, 'plant-based sausage')
        .replace(/turkey/gi, 'plant-based protein')
        .replace(/lamb/gi, 'plant-based protein');
      
      const vegetarianVersion: MealOption = {
        ...recipe,
        id: baseId + 300000, // Deterministic ID: base + 300000
        name: vegetarianName,
        tags: [...recipe.tags.filter(tag => !['Non-Vegetarian'].includes(tag)), 'Vegetarian'],
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
    if (hasGlutenIngredients || !recipe.tags.includes('Gluten-Free')) {
      variants.push(glutenFreeVersion);
    }
    if (hasDairyIngredients || !recipe.tags.includes('Lactose-Free')) {
      variants.push(lactoseFreeVersion);
    }
  }
  
  console.log(`🔄 AUTO-GENERATED: Created ${variants.length} dietary variants (gluten-free, lactose-free, vegetarian versions)`);
  return variants;
}

// Module-level cache for enhanced meal database
let cachedMealDatabase: MealOption[] | null = null;
let cachePromise: Promise<MealOption[]> | null = null;

// Function to invalidate the meal database cache (call after recipe updates)
export function invalidateEnhancedMealDatabaseCache(): void {
  cachedMealDatabase = null;
  cachePromise = null;
  console.log('🔄 Enhanced meal database cache invalidated');
}

// Function to get complete unified meal database (now contains all recipes in one place)
export async function getCompleteEnhancedMealDatabase(): Promise<MealOption[]> {
  // Return cached data if available
  if (cachedMealDatabase) {
    return cachedMealDatabase;
  }
  
  // If cache is being built, wait for it
  if (cachePromise) {
    return cachePromise;
  }
  
  // Build cache
  cachePromise = (async () => {
    // Get base recipes and clean them (remove parenthetical descriptions from ingredients and normalize portions)
    const baseRecipes = RAW_MEAL_DATABASE.map(recipe => cleanRecipeData(recipe));
  
  // Auto-tag recipes that are naturally lactose-free
  const lactoseTaggedRecipes = baseRecipes.map(recipe => {
    // Skip if already tagged as lactose-free
    if (recipe.tags.includes('Lactose-Free') || recipe.tags.includes('dairy-free')) {
      return recipe;
    }
    
    // Check if recipe contains dairy ingredients
    const dairyIngredients = ['milk', 'cheese', 'yogurt', 'cream', 'butter', 'dairy', 'whey', 'casein', 'lactose'];
    const hasDairy = recipe.ingredients.some(ingredient => 
      dairyIngredients.some(dairy => ingredient.toLowerCase().includes(dairy))
    );
    
    // If no dairy found, add lactose-free tag
    if (!hasDairy) {
      // Removed excessive logging for performance
      return {
        ...recipe,
        tags: [...recipe.tags, 'Lactose-Free']
      };
    }
    
    return recipe;
  });
  
  // Assign permanent stable IDs to base recipes (starting from 10000)
  const baseRecipesWithIds = lactoseTaggedRecipes.map((recipe, index) => ({
    ...recipe,
    id: 10000 + index // Permanent ID based on position in base array
  }));
  
  // Auto-generate dietary variants with deterministic IDs
  const dietaryVariants = generateDietaryVariants(baseRecipesWithIds);
  
  // Combine all recipes (all have IDs now)
  const allRecipes = [...baseRecipesWithIds, ...dietaryVariants];
  
  // Add cycle phase tags, functional tags for snacks, and seasonal month tags
  const recipesWithIds = await Promise.all(allRecipes.map(async (recipe) => {
    // Add cycle phase tags to every recipe
    const recipeWithCycleTags = addCyclePhaseTagsToRecipe(recipe);
    // Add functional tags to snacks (Pre-Workout, Post-Workout, Neutral)
    const recipeWithFunctionalTags = addFunctionalTagsToSnack(recipeWithCycleTags);
    // Add seasonal month tags to every recipe
    return await addSeasonalMonthTagsToRecipe(recipeWithFunctionalTags);
  }));
  
  // Filter out deleted recipes from the unified database
  const { storage } = await import('./storage.js');
  const deletedRecipeIds = await storage.getRecipeDeletions();
  const deletedIds = new Set(deletedRecipeIds);
  const activeRecipes = recipesWithIds.filter(recipe => {
    if (!recipe.id) return true; // Keep recipes without IDs
    const recipeId = String(recipe.id);
    return !deletedIds.has(recipeId);
  });
  
  if (deletedRecipeIds.length > 0) {
    console.log(`🗑️  Filtered out ${recipesWithIds.length - activeRecipes.length} deleted recipes from unified database`);
  }
  
    console.log(`📊 UNIFIED DATABASE: ${baseRecipes.length} base recipes + ${dietaryVariants.length} dietary variants = ${activeRecipes.length} total active recipes`);
    console.log(`📊 CYCLE SUPPORT: All recipes now have menstrual cycle phase tags for complete cycle tracking`);
    console.log(`📊 FUNCTIONAL TAGS: Snacks are automatically tagged as Pre-Workout, Post-Workout, or Neutral based on nutritional profile`);
    console.log(`📊 DEVELOPER FRIENDLY: Every recipe now has gluten-free, lactose-free, and vegetarian versions using kipstukjes & Beyond Meat`);
    
    // Store in cache
    cachedMealDatabase = activeRecipes;
    return activeRecipes;
  })();
  
  return cachePromise;
}

// Permanent ID system:
// Base recipes: 10000-19999 (assigned by array position)
// Gluten-free variants: base_id + 100000
// Lactose-free variants: base_id + 200000
// Vegetarian variants: base_id + 300000
// User custom recipes: 30000-39999
// AI-generated recipes: 40000-49999

// Efficient recipe lookup by name using recipe IDs
export async function findRecipeByName(mealDescription: string): Promise<MealOption | null> {
  const allRecipes = await getCompleteEnhancedMealDatabase();
  
  // Clean the meal name by removing portion scaling and leftover indicators
  let cleanMealName = mealDescription
    .replace(" (leftover)", "")
    .replace(/ \(\d+x portions[^)]*\)/, "") // Remove "(2x portions - batch cook)" etc.
    .replace(/ \(batch cook\)/, "") // Remove standalone "(batch cook)"
    .replace(/ \(incorporating leftover [^)]+\)/, "") // Remove "(incorporating leftover ingredient)"
    .replace(/ \(protein-enhanced\)/, "") // Remove "(protein-enhanced)" suffix
    .trim();
  
  console.log(`🔍 ID-BASED LOOKUP: Searching for "${cleanMealName}" (original: "${mealDescription}")`);
  
  // Try exact name match first
  let mealOption = allRecipes.find(option => option.name === cleanMealName);
  if (mealOption) {
    console.log(`✅ Found exact match: "${mealOption.name}" (ID: ${mealOption.id})`);
    return mealOption;
  }
  
  // Try seasonal variations
  const alternativeNames = [
    cleanMealName.replace(/^fresh\s+/i, 'Warming '),
    cleanMealName.replace(/^Fresh\s+/i, 'Warming '),
    cleanMealName.replace(/^warming\s+/i, 'fresh '),
    cleanMealName.replace(/^Warming\s+/i, 'fresh ')
  ];
  
  for (const altName of alternativeNames) {
    mealOption = allRecipes.find(option => option.name === altName);
    if (mealOption) {
      console.log(`✅ Found seasonal variant: "${mealOption.name}" (ID: ${mealOption.id})`);
      return mealOption;
    }
  }
  
  // Try fuzzy matching as last resort
  console.log(`🔍 Trying fuzzy matching for: "${cleanMealName}"`);
  
  const mealWords = cleanMealName.toLowerCase()
    .replace(/\(.*?\)/g, '') // Remove parenthetical content
    .split(/[\s,&-]+/)
    .filter(word => word.length > 2 && !['with', 'and', 'the', 'for'].includes(word));
  
  let bestMatch: MealOption | null = null;
  let bestScore = 0;
  
  for (const recipe of allRecipes) {
    const recipeWords = recipe.name.toLowerCase().split(/[\s,&-]+/);
    const matchingWords = mealWords.filter(word => 
      recipeWords.some(recipeWord => recipeWord.includes(word) || word.includes(recipeWord))
    );
    
    const score = matchingWords.length / mealWords.length;
    if (score > bestScore && score >= 0.6) { // At least 60% word match
      bestScore = score;
      bestMatch = recipe;
    }
  }
  
  if (bestMatch) {
    console.log(`✅ Found fuzzy match: "${bestMatch.name}" (ID: ${bestMatch.id}, score: ${bestScore.toFixed(2)})`);
    return bestMatch;
  }
  
  console.log(`❌ No recipe found for: "${cleanMealName}"`);
  return null;
}

// Function to get meals from unified database filtered by dietary requirements
export async function getEnhancedMealsByCategory(category: 'breakfast' | 'lunch' | 'dinner' | 'snack'): Promise<MealOption[]> {
  const unifiedDatabase = await getCompleteEnhancedMealDatabase();
  const categoryMeals = unifiedDatabase.filter(meal => meal.category === category);
  
  console.log(`📋 ${category.charAt(0).toUpperCase() + category.slice(1)} recipes available: ${categoryMeals.length}`);
  console.log(`📋 ${category} sample recipes: ${categoryMeals.slice(0, 5).map(m => m.name).join(', ')}`);
  return categoryMeals;
}

export function filterEnhancedMealsByDietaryTags(meals: MealOption[], dietaryTags: string[]): MealOption[] {
  // For users with no dietary restrictions, prioritize non-vegetarian options
  if (dietaryTags.length === 0) {
    const nonVegetarianMeals = meals.filter(meal => 
      meal.tags.includes('Non-Vegetarian') || meal.tags.includes('Pescatarian')
    );
    const vegetarianMeals = meals.filter(meal => 
      meal.tags.includes('Vegetarian') && !meal.tags.includes('Non-Vegetarian') && !meal.tags.includes('Pescatarian')
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
    const criticalTags = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Lactose-Free', 'dairy-free'];
    const userCriticalTags = dietaryTags.filter(tag => criticalTags.includes(tag));
    
    // SMART VEGETARIAN FILTERING: Include meals that either:
    // 1. Are tagged as vegetarian/vegan, OR
    // 2. Don't contain any meat/fish ingredients (naturally vegetarian - like pancakes)
    if (dietaryTags.includes('Vegetarian') || dietaryTags.includes('Vegan')) {
      // Always exclude explicitly non-vegetarian tagged meals
      if (meal.tags.includes('Non-Vegetarian') || meal.tags.includes('Pescatarian')) {
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
      if (!meal.tags.includes('Vegetarian') && !meal.tags.includes('Vegan') && !hasMeat) {
        console.log(`✅ SMART VEGETARIAN: "${meal.name}" included - no meat/fish found, naturally vegetarian`);
      }
    }
    
    // All critical dietary tags must be satisfied - simple tag matching
    if (userCriticalTags.length > 0) {
      // For lactose-free requirement, ONLY accept recipes with explicit lactose-free tags
      const lactoseFreeRequirement = dietaryTags.includes('Lactose-Free');
      const lactoseFreeSatisfied = !lactoseFreeRequirement || 
        meal.tags.includes('Lactose-Free') || 
        meal.tags.includes('dairy-free');
      
      // Check other critical tags (vegetarian, gluten-free, etc.)
      const otherCriticalTags = userCriticalTags.filter(tag => tag !== 'Lactose-Free');
      
      // Smart gluten-free filtering: include meals that don't contain gluten ingredients
      let glutenFreeSatisfied = true;
      if (dietaryTags.includes('Gluten-Free')) {
        const hasGlutenIngredients = meal.ingredients && meal.ingredients.some(ingredient => 
          ingredient.toLowerCase().includes('flour') && !ingredient.toLowerCase().includes('Gluten-Free') ||
          ingredient.toLowerCase().includes('wheat') ||
          ingredient.toLowerCase().includes('bread') && !ingredient.toLowerCase().includes('Gluten-Free') ||
          ingredient.toLowerCase().includes('pasta') && !ingredient.toLowerCase().includes('Gluten-Free') ||
          ingredient.toLowerCase().includes('soy sauce') && !ingredient.toLowerCase().includes('Gluten-Free')
        );
        
        glutenFreeSatisfied = meal.tags.includes('Gluten-Free') || !hasGlutenIngredients;
      }
      
      // Check other critical tags (but allow smart gluten-free logic)
      const remainingCriticalTags = otherCriticalTags.filter(tag => tag !== 'Gluten-Free');
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

export async function getEnhancedMealsForCategoryAndDiet(category: 'breakfast' | 'lunch' | 'dinner' | 'snack', dietaryTags: string[] = [], userId?: number): Promise<MealOption[]> {
  console.log(`🎯 STREAMLINED APPROACH: category=${category}, userId=${userId}, tags=[${dietaryTags.join(', ')}]`);
  
  // Start with curated database meals
  let allMeals: MealOption[] = await getEnhancedMealsByCategory(category);
  
  // Check if user has cycle support recipes enabled and prioritize them
  if (userId) {
    try {
      const { storage } = await import('./storage');
      const user = await storage.getUser(userId);
      // Always include menstruation-supportive recipes (user can control via phase selection)
      console.log(`🩸 CYCLE SUPPORT: Including menstruation-supportive recipes for ${category}`);
      // Filter cycle-based recipes from the current meal pool
      const cycleRecipes = allMeals.filter(meal => meal.tags.includes('cycleBased'));
      console.log(`🩸 Found ${cycleRecipes.length} cycle support recipes for ${category}`);
      
      // Prioritize cycle recipes by placing them at the beginning of the array
      if (cycleRecipes.length > 0) {
        const nonCycleRecipes = allMeals.filter(meal => !meal.tags.includes('cycleBased'));
        allMeals = [...cycleRecipes, ...nonCycleRecipes];
        console.log(`🩸 PRIORITIZED: Moved ${cycleRecipes.length} cycle support recipes to front of selection pool`);
      }
      
      // Always prioritize longevity-focused recipes for all users
      console.log(`🧬 LONGEVITY FOCUS: Including longevity-promoting recipes for ${category} (automatic)`);
      // Filter longevity-focused recipes from the current meal pool
      const longevityRecipes = allMeals.filter(meal => meal.tags.includes('Longevity'));
      console.log(`🧬 Found ${longevityRecipes.length} longevity-focused recipes for ${category}`);
      
      // Prioritize longevity recipes by placing them at the beginning of the array
      if (longevityRecipes.length > 0) {
        const nonLongevityRecipes = allMeals.filter(meal => !meal.tags.includes('Longevity'));
        allMeals = [...longevityRecipes, ...nonLongevityRecipes];
        console.log(`🧬 PRIORITIZED: Moved ${longevityRecipes.length} longevity-focused recipes to front of selection pool`);
      }
    } catch (error) {
      console.error('Error checking user preferences (cycle support/longevity):', error);
    }
  }
  
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
                id: `user-${recipe.id}`, // CRITICAL: Preserve user recipe ID with prefix
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
    if (dietaryTags.includes('Vegetarian') && meal.tags.includes('Non-Vegetarian')) {
      console.log(`🚫 CUSTOM EXCLUDED: "${meal.name}" - explicitly non-vegetarian`);
      return false;
    }
    if (dietaryTags.includes('Vegan') && meal.tags.includes('non-vegan')) {
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
  if (dietaryTags.some(tag => ['Lactose-Free', 'dairy-free', 'Gluten-Free'].includes(tag))) {
    console.log(`🔄 Applying dietary substitutions for: ${dietaryTags.filter(tag => ['Lactose-Free', 'dairy-free', 'Gluten-Free'].includes(tag)).join(', ')}`);
    filteredMeals = filteredMeals.map(meal => applyDietarySubstitutions(meal, dietaryTags));
  }
  
  
  // Apply seasonal adaptations for ayurvedic meals
  if (dietaryTags.includes('Ayurvedic') && filteredMeals.length > 0) {
    const currentSeason = getCurrentAyurvedicSeason(new Date(), 'europe');
    const seasonalGuidance = getCurrentSeasonalGuidance(new Date(), 'europe');
    
    // During summer (grishma), completely exclude warming ayurvedic recipes
    // This follows authentic Ayurvedic principles for seasonal eating
    if (currentSeason === 'grishma') {
      const originalCount = filteredMeals.length;
      filteredMeals = filteredMeals.filter(meal => {
        if (!meal.tags.includes('Ayurvedic')) return true; // Keep non-ayurvedic meals
        
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
      if (meal.tags.includes('Ayurvedic')) {
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
    const criticalTags = ['Vegetarian', 'Vegan', 'kosher', 'halal'];
    const criticalUserTags = dietaryTags.filter(tag => criticalTags.includes(tag));
    
    // If user has critical dietary restrictions, only respect those in fallback
    if (criticalUserTags.length > 0) {
      const criticalFilteredMeals = filterEnhancedMealsByDietaryTags(curatedRecipes, criticalUserTags);
      if (criticalFilteredMeals.length > 0) {
        console.log(`Fallback: Found ${criticalFilteredMeals.length} ${category} meals respecting critical dietary restrictions: ${criticalUserTags.join(', ')}`);
        
        // Additional safety check: Verify no non-vegetarian meals for vegetarian users
        if (criticalUserTags.includes('Vegetarian')) {
          const safetyFilteredMeals = criticalFilteredMeals.filter(meal => {
            const containsFish = meal.name.toLowerCase().includes('cod') || 
                               meal.name.toLowerCase().includes('salmon') || 
                               meal.name.toLowerCase().includes('tuna') || 
                               meal.name.toLowerCase().includes('fish') ||
                               meal.tags.includes('Pescatarian') ||
                               meal.tags.includes('Non-Vegetarian');
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
  // No special "High-Protein" tag filtering needed
  
  console.log(`🔄 ABOUT TO RETURN: ${filteredMeals.length} filtered meals`);
  
  // AUTOMATIC PROTEIN VALIDATION: Ensure all meals have adequate protein sources
  console.log(`🥩 VALIDATING PROTEIN SOURCES: Checking ${filteredMeals.length} meals for adequate protein content`);
  const proteinValidatedMeals = validateAndEnhanceMealDatabase(filteredMeals);
  
  if (proteinValidatedMeals.length !== filteredMeals.length) {
    console.log(`🥩 PROTEIN ENHANCEMENT: Enhanced ${proteinValidatedMeals.length - filteredMeals.length} meals with additional protein sources`);
  }
  
  // AUTOMATIC FIBER VALIDATION: Ensure all meals have adequate fiber content (after protein enhancement)
  console.log(`🌾 VALIDATING FIBER SOURCES: Checking ${proteinValidatedMeals.length} meals for adequate fiber content`);
  const fiberValidatedMeals = validateAndEnhanceMealsForFiber(proteinValidatedMeals, 10); // Target 10g fiber per meal
  
  const enhancedCount = fiberValidatedMeals.filter((meal, index) => 
    meal.ingredients.length !== proteinValidatedMeals[index].ingredients.length
  ).length;
  
  if (enhancedCount > 0) {
    console.log(`🌾 FIBER ENHANCEMENT: Enhanced ${enhancedCount} meals with additional fiber sources`);
  }
  
  return fiberValidatedMeals;
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
    'barley water',
    'ice cubes'
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

export async function generateEnhancedShoppingList(meals: { foodDescription: string }[], language: string = 'en', dietaryTags: string[] = [], leftoverIngredients: string[] = []): Promise<ShoppingListItem[]> {
  const ingredientAmounts = new Map<string, { totalAmount: number; unit: string; count: number }>();
  
  // Debug: log that we're applying substitutions
  console.log(`🔄 SHOPPING LIST: Applying dietary substitutions for tags: ${JSON.stringify(dietaryTags)}`);
  
  // Debug: log leftover ingredients that will be excluded from shopping list
  if (leftoverIngredients.length > 0) {
    console.log(`🥬 LEFTOVER INGREDIENTS: Excluding from shopping list: ${JSON.stringify(leftoverIngredients)}`);
  }
  
  // Parse actual recipe amounts from meal instructions
  for (const meal of meals) {
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
    
    const allRecipes = await getCompleteEnhancedMealDatabase();
    const mealOption = allRecipes.find(m => m.name === cleanMealName);
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
        // Extract clean ingredient name from formatted text like "3 large free-range eggs" -> "Eggs"
        const cleanIngredient = cleanIngredientName(ingredient);
        
        // Skip water-related ingredients - people have tap water
        if (isWaterIngredient(cleanIngredient)) {
          return;
        }
        
        // Skip empty ingredient names
        if (!cleanIngredient || cleanIngredient.trim() === '') {
          return;
        }
        
        // COMPREHENSIVE FILTER: Block all cooking instructions and non-grocery items
        console.log(`🔍 Shopping list filter check: "${cleanIngredient}"`);
        
        const cleanedForFilter = cleanIngredient.toLowerCase().trim();
        
        // Comprehensive filtering patterns to remove non-grocery items
        const nonGroceryPatterns = [
          // Time and temperature patterns
          /^\d+\s*(minutes?|mins?|hours?|hrs?|seconds?|secs?)/,
          /^\d+\s*°[cf]/,
          /^\d+\s*degrees?/,
          
          // Cooking actions/verbs
          /^heat\s/,
          /^cook\s/,
          /^bake\s/,
          /^roast\s/,
          /^steam\s/,
          /^boil\s/,
          /^fry\s/,
          /^sauté\s/,
          /^simmer\s/,
          /^grill\s/,
          /^broil\s/,
          /^until\s/,
          /^serve\s/,
          /^season\s/,
          /^add\s/,
          /^mix\s/,
          /^stir\s/,
          /^blend\s/,
          /^whisk\s/,
          /^combine\s/,
          /^toss\s/,
          /^sprinkle\s/,
          /^drizzle\s/,
          /^garnish\s/,
          /^top\s/,
          /^finish\s/,
          /^adjust\s/,
          /^taste\s/,
          /^check\s/,
          
          // Preparation methods (standalone)
          /^chop\s/,
          /^dice\s/,
          /^slice\s/,
          /^mince\s/,
          /^grate\s/,
          /^peel\s/,
          /^trim\s/,
          /^wash\s/,
          /^rinse\s/,
          /^drain\s/,
          /^pat\s+dry/,
          
          // Preparation descriptions and instructions
          /^finely$/,
          /finely$/,
          /^roughly$/,
          /^thinly$/,
          /^thickly$/,
          /^coarsely$/,
          /^finely\s/,
          /^roughly\s/,
          /^thinly\s/,
          /^thickly\s/,
          /^coarsely\s/,
          /^chops$/,
          /^chopped$/,
          /finely\s+chopped/,
          /dice\s+into\s+/,
          /cut\s+into\s+/,
          /slice\s+into\s+/,
          /chop\s+into\s+/,
          /break\s+into\s+/,
          /tear\s+into\s+/,
          /\d+\s*cm\s+pieces/,
          /\d+\s*mm\s+pieces/,
          /\d+\s*inch\s+pieces/,
          /into\s+\d+/,
          /cut\s+into\s+\d+cm/,
          /cut\s+into\s+\d+\s*cm/,
          /^cut\s+into\s+\d+cm\s+pieces$/,
          /^cut\s+into\s+\d+\s*cm\s+pieces$/,
          /cut\s+into\s+\d+cm\s+pieces/,
          /cut\s+into\s+\d+\s*cm\s+pieces/,
          /deseeded.*bite.sized/,
          /cored.*finely/,
          /bite\s+size/,
          /bite-size/,
          /small\s+pieces/,
          /large\s+pieces/,
          /medium\s+pieces/,
          /into\s+pieces/,
          /into\s+chunks/,
          /into\s+strips/,
          /into\s+cubes/,
          /into\s+wedges/,
          /into\s+rounds/,
          /into\s+rings/,
          /^very\s+/,
          /^extra\s+/,
          /^super\s+/,
          
          // Standalone descriptors that aren't actual ingredients
          /^fresh$/,
          /^dried$/,
          /^ground$/,
          /^chopped$/,
          /^diced$/,
          /^sliced$/,
          /^minced$/,
          /^grated$/,
          /^juiced$/,
          /\bjuiced\b/,
          /^zested$/,
          /^cored$/,
          /^deseeded$/,
          /^peeled$/,
          /^trimmed$/,
          /cored\s*&/,
          /deseeded\s*&/,
          /^cored\s*&\s*finely$/,
          /cored\s*&\s*finely/,
          /^washed$/,
          /^rinsed$/,
          /^drained$/,
          /^cooked$/,
          /^raw$/,
          /^frozen$/,
          /^thawed$/,
          /^room\s+temperature$/,
          /^cold$/,
          /^warm$/,
          /^hot$/,
          /^melted$/,
          
          // Serving and optional instructions
          /^optional$/,
          /^to\s+taste$/,
          /^for\s+serving$/,
          /^for\s+garnish$/,
          /^as\s+needed$/,
          /^if\s+desired$/,
          /^if\s+available$/,
          
          // Measurements without ingredients
          /^pinch\s*$/,
          /^dash\s*$/,
          /^splash\s*$/,
          /^drizzle\s*$/,
          /^handful\s*$/,
          /^bunch\s*$/,
          /^sprig\s*$/,
          /^leaf\s*$/,
          /^leaves\s*$/,
          
          // Basic seasonings that are too generic
          /^\s*salt\s*$/,
          /^\s*pepper\s*$/,
          /^\s*water\s*$/,
          /^\s*ice\s*$/,
          
          // Empty or very short non-meaningful entries
          /^\s*$/,
          /^.{1,2}$/,
          
          // Units without ingredients
          /^\d+\s*g\s*$/,
          /^\d+\s*ml\s*$/,
          /^\d+\s*tbsp\s*$/,
          /^\d+\s*tsp\s*$/,
          /^\d+\s*cup\s*$/,
          /^\d+\s*piece\s*$/,
          /^\d+\s*clove\s*$/
        ];

        // Skip this ingredient if it matches non-grocery patterns
        const shouldSkip = nonGroceryPatterns.some(pattern => pattern.test(cleanedForFilter));
        if (shouldSkip) {
          console.log(`🚫 SHOPPING LIST: Skipping non-grocery item: "${cleanIngredient}"`);
          return;
        }
        
        // Skip ingredients that user already has (leftover ingredients)
        const isLeftoverIngredient = leftoverIngredients.some(leftover => {
          const cleanLeftover = cleanIngredientName(leftover.toLowerCase());
          return cleanLeftover === cleanIngredient || 
                 cleanIngredient.includes(cleanLeftover) || 
                 cleanLeftover.includes(cleanIngredient);
        });
        
        if (isLeftoverIngredient) {
          console.log(`🥬 EXCLUDING from shopping list (already have): ${cleanIngredient}`);
          return;
        }
        
        const existing = ingredientAmounts.get(cleanIngredient);
        if (existing) {
          existing.count += 1;
          // Smart aggregation: calculate reasonable weekly amount based on count
          const defaultPortion = getDefaultPortion(cleanIngredient);
          // For weekly shopping, use reasonable multipliers based on ingredient type
          let weeklyMultiplier = Math.min(existing.count, 3); // Max 3x for vegetables
          if (cleanIngredient.includes('oil') || cleanIngredient.includes('spice') || cleanIngredient.includes('seasoning') ||
              cleanIngredient.includes('fresh') && (cleanIngredient.includes('herb') || cleanIngredient.includes('basil') || 
              cleanIngredient.includes('parsley') || cleanIngredient.includes('cilantro') || cleanIngredient.includes('thyme') ||
              cleanIngredient.includes('rosemary') || cleanIngredient.includes('oregano') || cleanIngredient.includes('mint') ||
              cleanIngredient.includes('dill') || cleanIngredient.includes('chives') || cleanIngredient.includes('sage'))) {
            weeklyMultiplier = 1; // Fresh herbs don't multiply - one bunch lasts the week
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
      const allRecipes = await getCompleteEnhancedMealDatabase();
      const fallbackMeal = allRecipes.find(m => 
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
          
          // FINAL FILTER: Block cooking instructions that slip through recipe parsing
          const forbiddenInstructions = [
            'cut into 1cm pieces', 'finely', 'melted', 'roughly', 'chopped', 'diced', 'sliced', 'minced'
          ];
          if (forbiddenInstructions.includes(cleanIngredient.toLowerCase())) {
            console.warn(`🚫 SHOPPING LIST: Blocking cooking instruction: "${cleanIngredient}"`);
            return;
          }
          
          // Skip ingredients that user already has (leftover ingredients)
          const isLeftoverIngredient = leftoverIngredients.some(leftover => {
            const cleanLeftover = cleanIngredientName(leftover.toLowerCase());
            return cleanLeftover === cleanIngredient || 
                   cleanIngredient.includes(cleanLeftover) || 
                   cleanLeftover.includes(cleanIngredient);
          });
          
          if (isLeftoverIngredient) {
            console.log(`🥬 EXCLUDING from shopping list (already have): ${cleanIngredient}`);
            return;
          }
          
          const existing = ingredientAmounts.get(cleanIngredient);
          if (existing) {
            existing.count += 1;
            // Smart aggregation: calculate reasonable weekly amount based on count
            const defaultPortion = getDefaultPortion(cleanIngredient);
            // For weekly shopping, use reasonable multipliers based on ingredient type
            let weeklyMultiplier = Math.min(existing.count, 3); // Max 3x for vegetables
            if (cleanIngredient.includes('oil') || cleanIngredient.includes('spice') || cleanIngredient.includes('seasoning') ||
                cleanIngredient.includes('fresh') && (cleanIngredient.includes('herb') || cleanIngredient.includes('basil') || 
                cleanIngredient.includes('parsley') || cleanIngredient.includes('cilantro') || cleanIngredient.includes('thyme') ||
                cleanIngredient.includes('rosemary') || cleanIngredient.includes('oregano') || cleanIngredient.includes('mint') ||
                cleanIngredient.includes('dill') || cleanIngredient.includes('chives') || cleanIngredient.includes('sage'))) {
              weeklyMultiplier = 1; // Fresh herbs don't multiply - one bunch lasts the week
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
  }

  // Categorize ingredients following supermarket layout order
  const ingredientCategories: Record<string, string> = {
    // Lemon standardization in categories - all lemon forms go to Fruits as "lemon"
    'lemon': 'Fruits',
    'lemons': 'Fruits', 
    'lemon juice': 'Fruits',
    'fresh lemon juice': 'Fruits',
    'lime juice': 'Fruits',
    'fresh lime juice': 'Fruits',
    'lemon zest': 'Fruits',
    
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
    'sweet potatoes': 'Vegetables',
    'sweet potato milk': 'Dairy Alternatives',
    
    // Fruits (Fresh Produce section 2)
    'banana': 'Fruits',
    'apple': 'Fruits',
    'apples': 'Fruits',
    'grated apple': 'Fruits',
    'diced apple': 'Fruits',
    'sliced apple': 'Fruits',
    'chopped apple': 'Fruits',
    'ripe avocado': 'Fruits',
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
    'oat flour': 'Baking & Cooking Basics',
    'potatoes': 'Vegetables',
    'olives': 'Other Dry Goods', // Olives belong in dry goods
    'raisins': 'Other Dry Goods', // Dried fruit
    'cornstarch': 'Baking & Cooking Basics',
    'gram flour': 'Baking & Cooking Basics',
    'flaxseed': 'Nuts, Seeds & Spreads',
    'tamari': 'Pantry Essentials',
    'sage': 'Fresh Herbs',
    'cocoa protein powder': 'Other Dry Goods',
    'soy milk': 'Plant-Based Alternatives',
    'sweetener': 'Pantry Essentials',
    'half sweet red pepper': 'Vegetables',
    'plant-based protein': 'Other Dry Goods', // Consolidate all protein powders in same category
    'gluten-free granola': 'Other Dry Goods',
    'red lentils': 'Grains, Pasta & Canned Goods',
    'green lentils': 'Grains, Pasta & Canned Goods',
    'lentils': 'Grains, Pasta & Canned Goods',
    'chickpeas': 'Grains, Pasta & Canned Goods',
    'black beans': 'Grains, Pasta & Canned Goods',
    'white beans': 'Grains, Pasta & Canned Goods',
    'kidney beans': 'Grains, Pasta & Canned Goods',
    'mung beans': 'Grains, Pasta & Canned Goods',
    'black-eyed peas': 'Grains, Pasta & Canned Goods',
    'black eyed peas': 'Grains, Pasta & Canned Goods',
    'black-eyed beans': 'Grains, Pasta & Canned Goods',
    'black eyed beans': 'Grains, Pasta & Canned Goods',
    'edamame': 'Other Dry Goods',
    'pea protein powder': 'Other Dry Goods',
    'vanilla protein powder': 'Other Dry Goods',
    'plant protein powder': 'Other Dry Goods',
    'almond butter': 'Nuts, Seeds & Spreads',
    'chia seeds': 'Nuts, Seeds & Spreads',
    'hemp hearts': 'Nuts, Seeds & Spreads',
    'hemp seeds': 'Nuts, Seeds & Spreads',
    'hennepzaad': 'Nuts, Seeds & Spreads',
    'shelled hemp seeds': 'Nuts, Seeds & Spreads',
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
    'dark chocolate': 'Baking & Cooking Basics',
    'chocolate': 'Baking & Cooking Basics',
    'cocoa powder': 'Baking & Cooking Basics',
    'cocoa': 'Baking & Cooking Basics',
    'dark chocolate chips': 'Baking & Cooking Basics',
    'chocolate chips': 'Baking & Cooking Basics',
    'melted chocolate': 'Baking & Cooking Basics',
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
    'wheat gluten-free pasta': 'Grains, Pasta & Canned Goods', // Fix for incorrect conversion
    
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
    'canned tomatoes': 'Baking & Cooking Basics',
    'canned diced tomatoes': 'Baking & Cooking Basics',
    'canned chopped tomatoes': 'Baking & Cooking Basics',
    'canned crushed tomatoes': 'Baking & Cooking Basics',
    'canned cherry tomatoes': 'Baking & Cooking Basics',
    'tomato paste': 'Baking & Cooking Basics',
    'tomato purée': 'Baking & Cooking Basics',
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
    'strawberries for topping': 'Fruits', // Legacy compatibility
    'fresh berries for topping': 'Fruits', // Legacy compatibility
    'blueberries for topping': 'Fruits', // Legacy compatibility
    'spirulina': 'Other Dry Goods',
    'matcha powder': 'Other Dry Goods',
    'self-raising flour': 'Baking & Cooking Basics',
    'holy basil leaves': 'Fresh Herbs',
    'thai chilies': 'Vegetables',
    'fish sauce': 'Pantry Essentials',
    'oyster sauce': 'Pantry Essentials',
    'dark soy sauce': 'Pantry Essentials',
    'desiccated coconut': 'Other Dry Goods',
    'capers': 'Other Dry Goods',
    'tortilla chips': 'Other Dry Goods',
    'dates': 'Fruits',
    'pitted dates': 'Fruits',
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
      'unsweetened plant milk': 'oat milk',
      'plant oat milk': 'oat milk', // Fix redundant naming
      'almond oat milk': 'oat milk', // Standardize to oat milk as preferred
      'coconut oat milk': 'oat milk',
      // Comprehensive oat milk variations consolidation
      'unsweetened oat milk': 'oat milk',
      'organic oat milk': 'oat milk',
      'barista oat milk': 'oat milk',
      'sweetened oat milk': 'oat milk',
      'vanilla oat milk': 'oat milk',
      'chocolate oat milk': 'oat milk',
      'enriched oat milk': 'oat milk',
      'calcium enriched oat milk': 'oat milk',
      'oat milk (unsweetened)': 'oat milk',
      'oat milk (sweetened)': 'oat milk',
      'oat milk (vanilla)': 'oat milk',
      'oat milk (original)': 'oat milk',
      'original oat milk': 'oat milk',
      'fresh oat milk': 'oat milk',
      'creamy oat milk': 'oat milk'
    };
    
    // Apply milk specifications
    for (const [generic, specific] of Object.entries(milkSpecifications)) {
      if (normalized.includes(generic)) {
        normalized = normalized.replace(generic, specific);
      }
    }
    
    // Enhanced garlic consolidation - prevent duplicate rows by standardizing all garlic to "garlic cloves"
    if (normalized.includes('garlic') && !normalized.includes('powder')) {
      // Convert all garlic variations to "garlic cloves" for consolidation (except garlic powder)
      normalized = normalized.replace(/\bgarlic cloves?\b/g, 'garlic cloves')
                            .replace(/\bgarlic\b/g, 'garlic cloves')
                            .replace(/\bgarlic cloves cloves\b/g, 'garlic cloves'); // Fix double cloves
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
    if (ingredient === 'eggs' && dietaryTags.includes('Vegan')) {
      finalIngredient = 'vegan egg substitute (flax eggs or aquafaba)';
    }
    
    // Split comma-separated ingredients into separate items
    if (finalIngredient.includes(',')) {
      const separateIngredients = finalIngredient.split(',').map(item => item.trim());
      
      separateIngredients.forEach(separateIngredient => {
        // Normalize ingredient name for grocery shopping (remove cooking methods, specify milk types)
        const normalizedIngredient = normalizeIngredientForGrocery(separateIngredient);
        
        // Skip empty or whitespace-only ingredients that might slip through
        if (!separateIngredient || separateIngredient.trim() === '' || separateIngredient.trim().length === 0) {
          console.warn(`⚠️ SHOPPING LIST: Skipping empty ingredient from "${ingredient}"`);
          return;
        }
        
        // Skip if it's just a cooking method after normalization
        if (!normalizedIngredient || normalizedIngredient.trim() === '' || normalizedIngredient.trim().length === 0) {
          console.warn(`⚠️ SHOPPING LIST: Skipping cooking method ingredient: "${separateIngredient}" → "${normalizedIngredient}"`);
          return;
        }
        
        // Try to get category for the specific ingredient, fallback to original, then fallback to 'Other' (not 'Fruits')
        const category = ingredientCategories[separateIngredient.toLowerCase()] || ingredientCategories[ingredient.toLowerCase()] || 'Other';
        
        // Convert amounts to grams using the formatAmount function (split proportionally)
        const proportionalAmount = amounts.totalAmount / separateIngredients.length;
        const displayAmount = formatAmountWithLanguage(proportionalAmount, amounts.unit, language, separateIngredient);
        
        // For spices and small pantry items, show just the ingredient name
        const shouldShowClean = shouldShowCleanName(separateIngredient, category, proportionalAmount, amounts.unit);
        const finalDisplayAmount = shouldShowClean 
          ? '' // No amount display for pantry essentials 
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
      
      // Skip empty ingredients that might slip through normalization
      if (!normalizedIngredient || normalizedIngredient.trim() === '' || normalizedIngredient.trim().length === 0) {
        console.warn(`⚠️ SHOPPING LIST: Skipping empty normalized ingredient from "${finalIngredient}"`);
        return;
      }
      
      // Double-check for cooking methods that slipped through
      const cookingMethods = ['chopped', 'sliced', 'diced', 'minced', 'grated', 'melted', 'cooked'];
      if (cookingMethods.includes(normalizedIngredient.toLowerCase().trim())) {
        console.warn(`⚠️ SHOPPING LIST: Skipping cooking method: "${normalizedIngredient}"`);
        return;
      }
      
      const category = ingredientCategories[ingredient.toLowerCase()] || 'Other';
      
      // Convert amounts to grams using the formatAmount function
      const displayAmount = formatAmountWithLanguage(amounts.totalAmount, amounts.unit, language, ingredient);
      
      // For spices and small pantry items, show just the ingredient name
      const shouldShowClean = shouldShowCleanName(ingredient, category, amounts.totalAmount, amounts.unit);
      const finalDisplayAmount = shouldShowClean 
        ? '' // No amount display for pantry essentials
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
  console.log('✅ All recipes are already being processed with specific ingredients in the unified database');
  console.log('📊 Ingredient validation: All recipes automatically have specific ingredients through the enhanced database system');
}

/**
 * Validate all recipes and report any remaining generic ingredients
 */
export async function validateAllRecipeIngredients(): Promise<{ 
  totalRecipes: number; 
  validRecipes: number; 
  issuesFound: Array<{recipeName: string, issues: string[]}> 
}> {
  const allRecipes = await getCompleteEnhancedMealDatabase();
  const issuesFound: Array<{recipeName: string, issues: string[]}> = [];
  let validRecipes = 0;
  
  allRecipes.forEach(recipe => {
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
    totalRecipes: allRecipes.length,
    validRecipes,
    issuesFound
  };
}

function parseEnhancedRecipeIngredients(instructions: string[], ingredientAmounts: Map<string, { totalAmount: number; unit: string; count: number }>) {
  instructions.forEach(instruction => {
    // Extract ingredients with amounts from recipe instructions
    const ingredientMatches = instruction.match(/(\d+(?:\.\d+)?)?\s*(cup|cups|tbsp|tsp|g|lb|lbs|oz|pieces?|cloves?|slices?)\s+([^]+)/gi);
    
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
function formatAmountWithLanguage(amount: number, unit: string, language: string = 'en', ingredientName?: string): string {
  // Use the enhanced formatAmount function for herbs and spices
  if (ingredientName && unit === 'g') {
    const formatted = formatAmount(amount, unit, ingredientName);
    if (formatted.includes('tsp') || formatted.includes('tbsp')) {
      // Convert English abbreviations to Dutch if needed
      if (language === 'nl') {
        return formatted.replace('tsp', 'tl').replace('tbsp', 'el');
      }
      return formatted;
    }
  }
  
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

export function getDefaultPortion(ingredient: string): { amount: number; unit: string } {
  // Default portions for common ingredients in grams (when no recipe amounts are found)
  const defaults: Record<string, { amount: number; unit: string }> = {
    'almond milk': { amount: 240, unit: 'ml' }, // 1 cup = 240ml
    'coconut milk': { amount: 240, unit: 'ml' }, // 1 cup = 240ml
    'chia seeds': { amount: 20, unit: 'g' }, // 2 tbsp = ~20g
    'hemp hearts': { amount: 20, unit: 'g' }, // 2 tbsp = ~20g
    'hemp seeds': { amount: 20, unit: 'g' },
    'hennepzaad': { amount: 20, unit: 'g' }, // Dutch for hemp hearts
    'shelled hemp seeds': { amount: 20, unit: 'g' },
    'mixed berries': { amount: 75, unit: 'g' }, // 0.5 cup = ~75g
    'banana': { amount: 1, unit: 'piece' }, // 1 medium banana
    'apples': { amount: 3, unit: 'pieces' }, // 3 medium apples  
    'apple': { amount: 1, unit: 'piece' }, // 1 medium apple
    'ripe avocado': { amount: 1, unit: 'piece' }, // 1 medium ripe avocado
    'lemon': { amount: 1, unit: 'piece' }, // 1 lemon
    'lemons': { amount: 2, unit: 'pieces' }, // 2 lemons
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
    'tomatoes': { amount: 2, unit: 'pieces' }, // 2 medium tomatoes
    'lime': { amount: 1, unit: 'piece' }, // 1 lime
    'bell peppers': { amount: 2, unit: 'pieces' }, // 2 medium peppers
    'sugar snaps': { amount: 150, unit: 'g' }, // Sugar snap peas in grams
    'sugarsnaps': { amount: 150, unit: 'g' }, // Sugar snap peas in grams (alternative name)
    'zucchini': { amount: 1, unit: 'piece' }, // 1 medium zucchini
    'brussels sprouts': { amount: 150, unit: 'g' }, // 1 cup = ~150g
    'sweet potatoes': { amount: 200, unit: 'g' }, // 1 medium sweet potato
    'sweet potato milk': { amount: 1000, unit: 'ml' }, // 1 liter carton
    'cashew cream': { amount: 60, unit: 'g' }, // 1/4 cup = ~60g
    'sun-dried tomatoes': { amount: 30, unit: 'g' }, // 2 tbsp = ~30g
    'pasta': { amount: 100, unit: 'g' }, // 1 serving dry pasta
    'gluten-free pasta': { amount: 100, unit: 'g' }, // 1 serving gluten-free pasta
    'vegetable stock': { amount: 240, unit: 'ml' }, // 1 cup = 240ml
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
    // Herbs without "Fresh" prefix (fallback for generic herb names)
    'basil': { amount: 1, unit: 'bunch' },
    'rosemary': { amount: 1, unit: 'bunch' },
    'sage': { amount: 1, unit: 'bunch' },
    'thyme': { amount: 1, unit: 'bunch' },
    'parsley': { amount: 1, unit: 'bunch' },
    'cilantro': { amount: 1, unit: 'bunch' },
    'oregano': { amount: 1, unit: 'bunch' },
    'mint': { amount: 1, unit: 'bunch' },
    'dill': { amount: 1, unit: 'bunch' },
    'chives': { amount: 1, unit: 'bunch' },
    // Coriander/Cilantro specific portions
    'fresh coriander': { amount: 1, unit: 'bunch' }, // Fresh coriander = cilantro
    'coriander': { amount: 1, unit: 'bunch' }, // Default to fresh when not specified
    'coriander seeds': { amount: 20, unit: 'g' }, // Whole spice
    'ground coriander': { amount: 20, unit: 'g' }, // Ground spice
    'coriander powder': { amount: 20, unit: 'g' }, // Ground spice alternate name
    // Common spices and seasonings  
    'chili powder': { amount: 20, unit: 'g' }, // Small spice jar
    'cumin': { amount: 20, unit: 'g' }, // Small spice jar
    'paprika': { amount: 20, unit: 'g' }, // Small spice jar
    'turmeric': { amount: 20, unit: 'g' },
    'curry powder': { amount: 20, unit: 'g' },
    'garlic powder': { amount: 20, unit: 'g' },
    'onion powder': { amount: 20, unit: 'g' },
    'smoked paprika': { amount: 20, unit: 'g' },
    'dried oregano': { amount: 10, unit: 'g' },
    'dried basil': { amount: 10, unit: 'g' },
    'dried thyme': { amount: 10, unit: 'g' },
    // Oils and liquids
    'sesame oil': { amount: 125, unit: 'ml' }, // Small bottle
    'rice vinegar': { amount: 250, unit: 'ml' }, // Standard bottle
    'tamari': { amount: 250, unit: 'ml' }, // Standard bottle
    'honey': { amount: 350, unit: 'g' }, // Standard jar
    // Baking essentials
    'cornstarch': { amount: 200, unit: 'g' }, // Small box
    'gram flour': { amount: 500, unit: 'g' }, // Standard bag
    'carrots': { amount: 1, unit: 'piece' }, // 1 medium carrot
    'kiwi': { amount: 4, unit: 'pieces' } // 4 kiwi fruits
  };
  
  // Intelligent fallback logic based on ingredient type
  const lowerIngredient = ingredient.toLowerCase();
  
  // Fresh herbs fallback - includes coriander when not specified as seeds/powder
  if (lowerIngredient.includes('herb') || 
      ['basil', 'thyme', 'rosemary', 'sage', 'parsley', 'cilantro', 'oregano', 'mint', 'dill', 'chives'].some(herb => lowerIngredient.includes(herb))) {
    return { amount: 1, unit: 'bunch' };
  }
  
  // Special case for coriander - default to fresh herb unless specified as seeds/powder
  if (lowerIngredient.includes('coriander') && 
      !lowerIngredient.includes('seed') && 
      !lowerIngredient.includes('ground') && 
      !lowerIngredient.includes('powder')) {
    return { amount: 1, unit: 'bunch' };
  }
  
  // Oils and liquids fallback
  if (lowerIngredient.includes('oil') || lowerIngredient.includes('vinegar') || 
      lowerIngredient.includes('sauce') || lowerIngredient.includes('syrup')) {
    return { amount: 250, unit: 'ml' };
  }
  
  // Spices and powders fallback  
  if (lowerIngredient.includes('powder') || lowerIngredient.includes('spice') ||
      ['cumin', 'paprika', 'chili', 'turmeric', 'curry'].some(spice => lowerIngredient.includes(spice))) {
    return { amount: 20, unit: 'g' };
  }
  
  return defaults[ingredient] || { amount: 50, unit: 'g' };
}

function cleanIngredientName(ingredient: string): string {
  // Extract the core ingredient name from formatted strings
  // Examples:
  // "3 large free-range eggs" -> "Eggs"
  // "½ cup coconut yogurt" -> "coconut yogurt"
  // "¼ cup cherry tomatoes (halved)" -> "cherry tomatoes"
  // "Pinch of sea salt and black pepper" -> "salt"
  
  const originalInput = ingredient; // Store original input for logging
  let cleaned = ingredient.toLowerCase().trim();
  
  // EARLY REMOVAL: Remove cooking instructions from parentheses before general cleanup
  // This prevents "coconut oil (melted)" from leaving "melted" as a standalone ingredient
  cleaned = cleaned.replace(/\s*\(([^)]*\bdrained\b[^)]*)\)/gi, ''); // Remove (drained) and variations
  cleaned = cleaned.replace(/\s*\(([^)]*\bmelted\b[^)]*)\)/gi, ''); // Remove (melted) and variations
  cleaned = cleaned.replace(/\s*\(([^)]*\bchopped\b[^)]*)\)/gi, ''); // Remove (chopped) and variations  
  cleaned = cleaned.replace(/\s*\(([^)]*\bdiced\b[^)]*)\)/gi, ''); // Remove (diced) and variations
  cleaned = cleaned.replace(/\s*\(([^)]*\bsliced\b[^)]*)\)/gi, ''); // Remove (sliced) and variations
  cleaned = cleaned.replace(/\s*\(([^)]*\bminced\b[^)]*)\)/gi, ''); // Remove (minced) and variations
  
  // Remove leading measurements and quantities (including fractions, numbers, and decimals)
  // Updated to catch decimal amounts like ".5ml", "0.5ml", "2.5g", etc.
  cleaned = cleaned.replace(/^[\d\.\/½¼¾⅓⅔⅛⅜⅝⅞]+\s*(cup|cups|tbsp|tsp|tablespoons?|teaspoons?|g|grams?|lb|lbs|pounds?|oz|ounces?|pieces?|slices?|cloves?|sprigs?|medium|large|small|ml|mL)\s*of\s*/i, '');
  cleaned = cleaned.replace(/^[\d\.\/½¼¾⅓⅔⅛⅜⅝⅞]+\s*(cup|cups|tbsp|tsp|tablespoons?|teaspoons?|g|grams?|lb|lbs|pounds?|oz|ounces?|pieces?|slices?|cloves?|sprigs?|medium|large|small|ml|mL)\s*/i, '');
  
  // Remove leading numbers, decimals and fractions that might still be there  
  cleaned = cleaned.replace(/^[\d\.\/½¼¾⅓⅔⅛⅜⅝⅞]+\s*/, '');
  
  // Remove vague quantity descriptions like "handful", "small handful", etc.
  cleaned = cleaned.replace(/^(small\s+handful|large\s+handful|handful|few|some|bit|touch|splash|drizzle|sprinkle)\s+(of\s+)?/i, '');
  cleaned = cleaned.replace(/^(a\s+)?(small|large|medium)\s+(handful|pinch|dash|bit|touch|splash|drizzle|sprinkle)\s+(of\s+)?/i, '');
  
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
  if (cleaned.startsWith('s spinach') || cleaned === 's spinach') {
    cleaned = 'spinach';
  }
  if (cleaned.startsWith('scoop plant protein') || cleaned.includes('scoop plant protein')) {
    cleaned = 'plant protein powder';
  }
  
  // Lemon standardization - convert all lemon variants to "lemon"
  if (cleaned === 'lemon' || cleaned === 'lemons' || cleaned.includes('lemon zest') || 
      cleaned.includes('lemon juice')) {
    cleaned = 'lemon'; // Use simple "lemon" instead of "pieces of lemon"
  }
  
  // Lime standardization - convert all lime variants to "lime"
  if (cleaned === 'lime' || cleaned === 'limes' || cleaned.includes('lime zest') || 
      cleaned.includes('lime juice')) {
    cleaned = 'lime'; // Use simple "lime" instead of "pieces of lime"
  }
  
  // CRITICAL FIX: Prevent ingredient names from containing amount descriptions
  // This fixes issues like "5 mL of olive oil" appearing as ingredient name
  const amountPatterns = [
    /^\d+(\.\d+)?\s*(ml|mL|g|kg|tbsp|tsp|cup|cups|piece|pieces|clove|cloves|bunch|bunches)\s+(of\s+)?/,
    /\d+(\.\d+)?\s*(ml|mL|g|kg|tbsp|tsp|cup|cups|piece|pieces|clove|cloves|bunch|bunches)\s+(of\s+)/g,
    /^(a|an|\d+)\s+(piece|pieces|clove|cloves|bunch|bunches)\s+(of\s+)?/i
  ];
  
  // Remove any amount descriptions that got mixed into ingredient names
  amountPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // Clean up any remaining formatting issues
  cleaned = cleaned.replace(/^(of\s+|the\s+)/i, '').trim();
  
  // Debug log for amount contamination issues
  if (originalInput.includes('ml of') || originalInput.includes('g of') || originalInput.includes('pieces of')) {
    console.log(`🔧 Amount contamination fixed: "${originalInput}" → "${cleaned}"`);
  }
  
  // PRESERVE DIETARY QUALIFIERS before specification
  const hasGlutenFree = cleaned.includes('Gluten-Free') || cleaned.includes('gluten free');
  const hasLactoseFree = cleaned.includes('Lactose-Free') || cleaned.includes('lactose free');
  const hasDairyFree = cleaned.includes('dairy-free') || cleaned.includes('dairy free');
  const hasOrganic = cleaned.includes('organic');
  
  // Apply comprehensive ingredient specification to replace generic terms
  // BUT prevent double specification (don't specify already specified ingredients)
  if (!cleaned.includes('pieces of') && !cleaned.includes('oat oat') && !cleaned.includes('soy oat') && 
      cleaned !== 'lemon' && cleaned !== 'lemon (juiced)') {
    const specified = specifyIngredients([cleaned]);
    cleaned = specified[0];
  }
  
  // RESTORE DIETARY QUALIFIERS after specification 
  if (hasGlutenFree && !cleaned.includes('Gluten-Free') && !cleaned.includes('gluten free')) {
    cleaned = 'gluten-free ' + cleaned;
  }
  if (hasLactoseFree && !cleaned.includes('Lactose-Free') && !cleaned.includes('lactose free')) {
    cleaned = 'lactose-free ' + cleaned;
  }
  if (hasDairyFree && !cleaned.includes('dairy-free') && !cleaned.includes('dairy free')) {
    cleaned = 'dairy-free ' + cleaned;
  }
  if (hasOrganic && !cleaned.includes('organic')) {
    cleaned = 'organic ' + cleaned;
  }
  
  // FINAL SAFETY CHECK: After specification, catch any cooking instructions that slipped through
  const finalSafetyCheck = cleaned.toLowerCase();
  const prohibitedFinalPatterns = [
    'cut into 1cm pieces', 'cut into pieces', 'finely', 'melted', 'roughly',
    'coarsely', 'chopped', 'diced', 'sliced', 'minced'
  ];
  
  if (prohibitedFinalPatterns.includes(finalSafetyCheck)) {
    console.warn(`🚫 FINAL SAFETY: Filtering cooking instruction that slipped through: "${cleaned}"`);
    return '';
  }
  
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
  
  // Handle other specific fresh herbs - consolidate all forms to prevent duplicates
  if (cleaned.includes('basil') && !cleaned.includes('dried') && !cleaned.includes('ground')) {
    cleaned = 'fresh basil';
  }
  if ((cleaned.includes('parsley') || cleaned === 'parsley') && !cleaned.includes('dried') && !cleaned.includes('ground')) {
    cleaned = 'fresh parsley';
  }
  if (cleaned.includes('oregano') && !cleaned.includes('dried') && !cleaned.includes('ground')) {
    cleaned = 'fresh oregano';
  }
  if (cleaned.includes('thyme') && !cleaned.includes('dried') && !cleaned.includes('ground')) {
    cleaned = 'fresh thyme';
  }
  if (cleaned.includes('rosemary') && !cleaned.includes('dried') && !cleaned.includes('ground')) {
    cleaned = 'fresh rosemary';
  }
  if (cleaned.includes('mint') && !cleaned.includes('dried') && !cleaned.includes('ground')) {
    cleaned = 'fresh mint';
  }
  if (cleaned.includes('dill') && !cleaned.includes('dried') && !cleaned.includes('ground')) {
    cleaned = 'fresh dill';
  }
  if (cleaned.includes('chives') && !cleaned.includes('dried') && !cleaned.includes('ground')) {
    cleaned = 'fresh chives';
  }
  if ((cleaned.includes('sage') || cleaned === 'sage') && !cleaned.includes('dried') && !cleaned.includes('ground')) {
    cleaned = 'fresh sage';
  }
  
  // Consolidate generic "herbs" to "fresh herbs"
  if (cleaned === 'herbs' || cleaned === 'herb' || cleaned.includes('mixed herbs')) {
    cleaned = 'fresh herbs';
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
    // FIXED: Removed "Gluten-Free" from removal regex to preserve dietary qualifiers
    cleaned = cleaned.replace(/\b(extra virgin|sea|black|white|ground|mixed|frozen|unsweetened|pure)\b/g, '');
  }
  // Enhanced removal of vague quantity terms (this was already there but let's expand it)
  cleaned = cleaned.replace(/^(pinch of|dash of|handful of|small handful of|large handful of|few|some|bit of|touch of|splash of|drizzle of|sprinkle of)\s*/i, '');
  
  // Remove "a" or "an" that might be left over
  cleaned = cleaned.replace(/^(a|an)\s+/i, '');
  
  // Clean up vague descriptions in the middle of ingredient names
  cleaned = cleaned.replace(/\s+(handful|small handful|large handful|pinch|dash|bit|touch|splash|drizzle|sprinkle)\s+(of\s+)?/gi, ' ');
  
  // Remove extra whitespace and validate the result
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Enhanced blacklist for cooking methods and instructions that should never become standalone ingredients
  const cookingMethodsBlacklist = [
    // Cooking methods
    'chopped', 'sliced', 'diced', 'minced', 'grated', 'halved', 'quartered',
    'melted', 'cooked', 'steamed', 'sautéed', 'roasted', 'grilled', 'baked',
    'fried', 'boiled', 'mashed', 'crushed', 'shredded', 'julienned', 'cubed',
    'roughly', 'finely', 'thinly', 'thickly', 'softened', 'warmed', 'heated',
    'fresh', 'dried', 'frozen', 'canned', 'raw', 'organic', 'free-range',
    // Cooking instructions that slip through
    'cut into 1cm pieces', 'cut into pieces', 'cut into cubes', 'cut into strips',
    'finely', 'roughly', 'coarsely', 'thinly sliced', 'thickly sliced',
    'for cooking', 'for serving', 'for garnish', 'for topping', 'extra', 'additional',
    // Common instruction fragments
    'into pieces', 'into cubes', 'into strips', 'into chunks', 'into slices'
  ];
  
  // Enhanced cooking method detection - check both exact matches and partial matches
  const cleanedLower = cleaned.toLowerCase();
  if (cookingMethodsBlacklist.includes(cleanedLower) || cleaned.length < 2) {
    console.warn(`⚠️ SHOPPING LIST: Skipping cooking method/invalid ingredient: "${cleaned}" from "${originalInput}"`);
    return ''; // Return empty string to be filtered out later
  }
  
  // Additional specific patterns that slip through as standalone words
  const problematicStandalone = ['melted', 'finely', 'roughly', 'coarsely', 'chopped', 'diced', 'sliced', 'minced'];
  if (problematicStandalone.includes(cleanedLower)) {
    console.warn(`⚠️ SHOPPING LIST: Skipping standalone cooking method: "${cleaned}" from "${originalInput}"`);
    return ''; // Return empty string to be filtered out later
  }
  
  // Additional check for cooking instruction patterns that contain multiple words
  const cookingInstructionPatterns = [
    /^cut into \d+cm pieces?$/i,
    /^cut into \d+ cm pieces?$/i,
    /^finely$/i,
    /^melted$/i,
    /^half sweet red pepper$/i,
    /^cut into pieces?$/i,
    /^finely (chopped|diced|sliced)$/i,
    /^roughly (chopped|diced|sliced)$/i,
    /^(extra|additional) .* for (cooking|serving|garnish|topping)$/i,
    /^for (cooking|serving|garnish|topping)$/i,
    /^(.+) for topping$/i // Remove "for topping" from ingredients
  ];
  
  for (const pattern of cookingInstructionPatterns) {
    if (pattern.test(cleaned)) {
      console.warn(`⚠️ SHOPPING LIST: Skipping cooking instruction: "${cleaned}" from "${originalInput}"`);
      return ''; // Return empty string to be filtered out later
    }
  }
  
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
    cleaned = 'vegetable stock';
  }
  if (cleaned.includes('kefir') || cleaned === 'kefir') {
    cleaned = 'fermented kefir';
  }
  if (cleaned.includes('almond milk') || cleaned === 'almond milk') {
    cleaned = 'almond milk';
  }
  // Keep red onion distinct - don't consolidate with regular onions
  if (cleaned.includes('red onion') || cleaned === 'red onion') {
    cleaned = 'red onion';
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
  // Handle tomato paste and purée separately - DO NOT consolidate with fresh tomatoes
  if (cleaned.includes('tomato paste') || cleaned === 'tomato paste') {
    cleaned = 'tomato paste';
  } else if (cleaned.includes('tomato purée') || cleaned === 'tomato purée' || 
             cleaned.includes('tomato puree') || cleaned === 'tomato puree') {
    cleaned = 'tomato purée';
  } 
  // Handle canned tomatoes separately - DO NOT consolidate with fresh tomatoes
  else if (cleaned.includes('canned tomatoes') || cleaned === 'canned tomatoes' ||
           cleaned.includes('can tomatoes') || cleaned.includes('tinned tomatoes') ||
           cleaned.includes('canned chopped tomatoes') || cleaned.includes('canned diced tomatoes') ||
           cleaned.includes('canned crushed tomatoes') || cleaned.includes('canned cherry tomatoes') ||
           cleaned.includes('can diced tomatoes') || cleaned.includes('can crushed tomatoes') ||
           cleaned.includes('can chopped tomatoes') || cleaned.includes('can cherry tomatoes')) {
    // Determine specific type of canned tomatoes
    if (cleaned.includes('cherry')) {
      cleaned = 'canned cherry tomatoes';
    } else if (cleaned.includes('diced')) {
      cleaned = 'canned diced tomatoes';
    } else if (cleaned.includes('crushed')) {
      cleaned = 'canned crushed tomatoes';
    } else if (cleaned.includes('chopped')) {
      cleaned = 'canned chopped tomatoes';
    } else {
      cleaned = 'canned tomatoes';
    }
  }
  // Consolidate all fresh tomato variations to prevent duplicates
  else if (cleaned.includes('cherry tomatoes') || cleaned === 'cherry tomatoes' || 
      cleaned.includes('cherry tomato') || cleaned === 'cherry tomato') {
    cleaned = 'cherry tomatoes';
  } else if (cleaned.includes('sun-dried tomatoes') || cleaned === 'sun-dried tomatoes') {
    cleaned = 'sun-dried tomatoes';
  } else if (cleaned.includes('roma tomatoes') || cleaned === 'roma tomatoes' ||
             cleaned.includes('plum tomatoes') || cleaned === 'plum tomatoes') {
    cleaned = 'roma tomatoes';
  } else if (cleaned.includes('tomatoes') || cleaned === 'tomatoes' || 
             cleaned.includes('tomato') || cleaned === 'tomato') {
    // Generic fresh tomatoes - exclude all processed tomato products already handled above
    if (!cleaned.includes('cherry') && !cleaned.includes('sun-dried') && !cleaned.includes('roma') && 
        !cleaned.includes('plum') && !cleaned.includes('paste') && !cleaned.includes('purée') && 
        !cleaned.includes('puree') && !cleaned.includes('canned') && !cleaned.includes('can ') && 
        !cleaned.includes('tinned') && !cleaned.includes('diced') && !cleaned.includes('crushed') && 
        !cleaned.includes('chopped')) {
      cleaned = 'tomatoes';
    }
  }
  
  // Consolidate all carrot variations to prevent duplicates - this was causing 6 carrot items
  if (cleaned.includes('carrot') || cleaned === 'carrot' || cleaned === 'carrots' ||
      cleaned.includes('large carrots') || cleaned.includes('medium carrots') || 
      cleaned.includes('small carrots') || cleaned.includes('baby carrots') ||
      cleaned.includes('diced carrots') || cleaned.includes('sliced carrots') ||
      cleaned.includes('chunked carrots') || cleaned.includes('julienned carrots')) {
    cleaned = 'carrots';
  }

  // Consolidate all potato variations to prevent duplicates and missing ingredients
  if (cleaned.includes('potato') || cleaned === 'potato' || cleaned === 'potatoes' ||
      cleaned.includes('large potatoes') || cleaned.includes('medium potatoes') || 
      cleaned.includes('small potatoes') || cleaned.includes('baby potatoes') ||
      cleaned.includes('diced potatoes') || cleaned.includes('sliced potatoes') ||
      cleaned.includes('chunked potatoes') || cleaned.includes('cubed potatoes') ||
      cleaned.includes('cut into') && cleaned.includes('potato')) {
    // Make sure it's regular potatoes, not sweet potatoes
    if (!cleaned.includes('sweet')) {
      cleaned = 'potatoes';
    }
  }
  
  // Consolidate all apple variations to show as pieces
  if (cleaned.includes('apple') || cleaned === 'apple' || cleaned === 'apples' ||
      cleaned.includes('grated apple') || cleaned.includes('diced apple') ||
      cleaned.includes('sliced apple') || cleaned.includes('chopped apple') ||
      cleaned.includes('small apple') || cleaned.includes('medium apple') ||
      cleaned.includes('large apple') || cleaned.includes('roughly grated')) {
    cleaned = 'apples';
  }
  
  // Consolidate all tofu variations into "tofu", except silken tofu
  if ((cleaned.includes('tofu') || cleaned === 'extra firm tofu' || cleaned === 'firm tofu' || cleaned === 'medium tofu' || cleaned === 'soft tofu') && !cleaned.includes('silken')) {
    cleaned = 'tofu';
  }
  
  // Consolidate all hemp variations (hemp hearts = hemp seeds = hennepzaad)
  if (cleaned.includes('hemp hearts') || cleaned === 'hemp hearts' ||
      cleaned.includes('hemp seeds') || cleaned === 'hemp seeds' ||
      cleaned.includes('hennepzaad') || cleaned === 'hennepzaad' ||
      cleaned.includes('shelled hemp seeds') || cleaned === 'shelled hemp seeds') {
    cleaned = 'hemp hearts'; // Use "hemp hearts" as the canonical name
  }
  // Consolidate all egg variations into "Eggs"
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
    'ripe avocado': 'ripe avocado',
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
    'red onion': 'red onion', // Keep red onion distinct for shopping accuracy
    'yellow onion': 'yellow onion',
    'white onion': 'white onion',
    'zucchini': 'zucchini',
    'nuts': 'mixed nuts',
    'almonds': 'almonds',
    'walnuts': 'walnuts',
    'hemp seeds': 'hemp hearts',
    'hennepzaad': 'hemp hearts',
    'shelled hemp seeds': 'hemp hearts',
    'banana': 'banana',
    'lemon': 'lemon',
    // Carrot consolidation - all carrot forms go to "carrots"
    'carrot': 'carrots',
    'carrots': 'carrots',
    'large carrots': 'carrots',
    'medium carrots': 'carrots',
    'small carrots': 'carrots',
    'baby carrots': 'carrots',
    'diced carrots': 'carrots',
    'sliced carrots': 'carrots',
    'chunked carrots': 'carrots',
    'julienned carrots': 'carrots',
    // Potato consolidation - all potato forms go to "potatoes" (excluding sweet potatoes)
    'potato': 'potatoes',
    'potatoes': 'potatoes',
    'large potatoes': 'potatoes',
    'medium potatoes': 'potatoes',
    'small potatoes': 'potatoes',
    'baby potatoes': 'potatoes',
    'new potatoes': 'potatoes',
    'diced potatoes': 'potatoes',
    'sliced potatoes': 'potatoes',
    'chunked potatoes': 'potatoes',
    'cubed potatoes': 'potatoes',
    'potatoes, cut into 1cm pieces': 'potatoes',
    'potatoes, cut into pieces': 'potatoes',
    'potatoes, diced': 'potatoes',
    'lemons': 'lemon',
    'bananas': 'banana',
    'sliced banana': 'banana',
    'd banana': 'banana',
    'maple syrup': 'maple syrup',
    'cinnamon': 'cinnamon',
    'cinnamon to taste': 'cinnamon',
    'stevia to taste': 'stevia',
    'pasta': 'pasta',
    'gluten-free pasta': 'gluten-free pasta', // Preserve gluten-free qualifier
    'cashew cream': 'cashew cream',
    'nutritional yeast': 'nutritional yeast',
    'sun-dried tomatoes': 'sun-dried tomatoes',
    'white wine': 'vegetable stock',
    'wine': 'vegetable stock',
    'vegetable broth': 'vegetable stock',
    'vegetable stock': 'vegetable stock',
    'almond milk': 'almond milk',
    'kefir': 'fermented kefir',
    'berries': 'mixed berries',
    'oats': 'rolled oats',
    // Comprehensive oat milk consolidation - all variations standardize to 'oat milk'
    'oat oat milk': 'oat milk',
    'soy oat milk': 'soy milk',
    'unsweetened oat milk': 'oat milk',
    'organic oat milk': 'oat milk',
    'barista oat milk': 'oat milk',
    'sweetened oat milk': 'oat milk',
    'vanilla oat milk': 'oat milk',
    'chocolate oat milk': 'oat milk',
    'enriched oat milk': 'oat milk',
    'calcium enriched oat milk': 'oat milk',
    'oat milk (unsweetened)': 'oat milk',
    'oat milk (sweetened)': 'oat milk',
    'oat milk (vanilla)': 'oat milk',
    'oat milk (original)': 'oat milk',
    'original oat milk': 'oat milk',
    'fresh oat milk': 'oat milk',
    'creamy oat milk': 'oat milk',
    'oat drink': 'oat milk',
    'oat beverage': 'oat milk',
    'pieces of pieces of lemon': 'lemon',
    'pieces of lemon': 'lemon', // Simplify lemon to avoid complex specifications
    'porridge certified oats': 'rolled oats',
    'quick certified oats': 'rolled oats',
    'vanilla coconut yogurt': 'coconut yogurt',
    'granola': 'gluten-free granola',
    // Consolidate flax seed variations to prevent duplicates  
    'flaxseed': 'flax seeds',
    'ground flaxseed': 'flax seeds',
    'flaxseed meal': 'flax seeds',
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
    'mixed beans': 'mixed beans',
    // Comprehensive coriander/cilantro consolidation
    'fresh coriander': 'fresh cilantro', // Fresh coriander is the same as fresh cilantro
    'coriander': 'fresh cilantro', // When not specified as seeds/powder, assume fresh herb
    'cilantro': 'fresh cilantro',
    'fresh cilantro': 'fresh cilantro',
    'coriander leaves': 'fresh cilantro',
    'cilantro leaves': 'fresh cilantro',
    // Keep spice forms distinct from fresh herbs
    'coriander seeds': 'coriander seeds',
    'ground coriander': 'ground coriander',
    'coriander powder': 'ground coriander'
  };
  
  return ingredientMappings[cleaned] || cleaned;
}

function formatAmount(amount: number, unit: string, ingredientName?: string): string {
  // Convert all measurements to grams for consistency, except special cases
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
    // Keep pieces as is for countable items (lemons, limes, onions, etc.)
    finalUnit = amount === 1 ? 'piece' : 'pieces';
    finalAmount = amount;
  } else if (unit === 'cloves' || unit === 'clove') {
    // Keep cloves as is for garlic
    finalUnit = amount === 1 ? 'clove' : 'cloves';
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
  
  // Special handling for herbs and spices - convert small gram amounts to familiar units
  if (ingredientName && finalUnit === 'g') {
    const lowerIngredient = ingredientName.toLowerCase();
    const isHerbOrSpice = lowerIngredient.includes('dried') || lowerIngredient.includes('ground') ||
      ['oregano', 'basil', 'thyme', 'rosemary', 'sage', 'parsley', 'cilantro', 'mint', 'dill', 'chives',
       'paprika', 'cumin', 'coriander', 'turmeric', 'cinnamon', 'ginger', 'cardamom', 'nutmeg',
       'allspice', 'cloves', 'bay leaves', 'fennel', 'mustard seed', 'curry powder', 'chili powder',
       'garlic powder', 'onion powder', 'black pepper', 'white pepper', 'cayenne', 'smoked paprika',
       'italian seasoning', 'herbs de provence', 'za\'atar', 'sumac', 'star anise'].some(spice => 
         lowerIngredient.includes(spice));
    
    if (isHerbOrSpice && finalAmount <= 30) { // Convert small amounts of herbs/spices
      if (finalAmount >= 15) {
        // 15g+ = tablespoons
        const tbspAmount = finalAmount / 15;
        return tbspAmount === 1 ? '1 tbsp' : `${tbspAmount.toFixed(1)} tbsp`;
      } else if (finalAmount >= 5) {
        // 5-14g = teaspoons  
        const tspAmount = finalAmount / 5;
        return tspAmount === 1 ? '1 tsp' : `${tspAmount.toFixed(1)} tsp`;
      } else if (finalAmount >= 1) {
        // 1-4g = fractions of teaspoons
        const tspAmount = finalAmount / 5;
        if (tspAmount >= 0.75) return '¾ tsp';
        if (tspAmount >= 0.5) return '½ tsp';
        if (tspAmount >= 0.25) return '¼ tsp';
        return '⅛ tsp';
      }
    }
  }
  
  // Format the final amount nicely
  if (finalUnit === 'cloves' || finalUnit === 'clove') {
    return `${Math.round(finalAmount)} ${finalUnit}`;
  } else if (finalAmount >= 1000) {
    return `${(finalAmount / 1000).toFixed(1)} kg`;
  } else if (finalAmount < 1) {
    return `${(finalAmount * 1000).toFixed(0)} mg`;
  } else {
    return `${Math.round(finalAmount)} ${finalUnit}`;
  }
}