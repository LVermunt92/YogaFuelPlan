import { storage } from './storage';

async function addTurmericPancakes() {
  console.log('Adding Turmeric pancakes recipe...');

  const recipe = {
    id: "10294",
    name: "Turmeric pancakes",
    nameDutch: "Kurkuma pannenkoeken",
    category: "breakfast" as const,
    portion: "1 serving",
    wholeFoodLevel: "high" as const,
    tags: [
      "Vegetarian",
      "Gluten-Free",
      "Lactose-Free",
      "Ayurvedic",
      "Spring",
      "Anti-Aging",
      "Menstrual Phase",
      "Ovulation Phase",
      "Luteal Phase"
    ],
    ingredients: [
      "75g buckwheat flour",
      "50g rice flour",
      "100ml rice milk",
      "1 egg",
      "2.5ml apple cider vinegar",
      "10ml honey",
      "1g salt",
      "1g turmeric",
      "0.5g cinnamon",
      "4g cream of tartar baking powder",
      "5ml safflower oil"
    ],
    ingredientsDutch: [
      "75g boekweitmeel",
      "50g rijstmeel",
      "100ml rijstmelk",
      "1 ei",
      "2,5ml appelazijn",
      "10ml honing",
      "1g zout",
      "1g kurkuma",
      "0,5g kaneel",
      "4g wijnsteenbakpoeder",
      "5ml saffloerolie"
    ],
    instructions: [
      "Blend rice milk, apple cider vinegar, buckwheat flour, rice flour, baking powder, salt, turmeric, and cinnamon until smooth",
      "Beat the egg in a separate bowl and stir into the batter",
      "Heat a cast-iron pan with safflower oil over medium heat",
      "Pour about 1 ladle of batter per pancake and fry until bubbles form on top",
      "Flip and cook until golden brown on both sides",
      "Serve with honey and a pinch of cinnamon"
    ],
    instructionsDutch: [
      "Blend rijstmelk, appelazijn, boekweitmeel, rijstmeel, bakpoeder, zout, kurkuma en kaneel tot een glad beslag",
      "Klop het ei los in een aparte kom en roer door het beslag",
      "Verhit een gietijzeren pan met saffloerolie op middelhoog vuur",
      "Schep ongeveer 1 soeplepel beslag per pannenkoek en bak tot er belletjes op het oppervlak verschijnen",
      "Keer om en bak tot beide kanten goudbruin zijn",
      "Serveer met honing en een snufje kaneel"
    ],
    recipeTips: [
      "Use a cast-iron pan for best results and even cooking",
      "Don't flip until bubbles appear and edges look set",
      "Add optional dried dandelion as topping for extra spring energy",
      "These pancakes are naturally gluten-free thanks to buckwheat and rice flour"
    ],
    recipeTipsDutch: [
      "Gebruik een gietijzeren pan voor het beste resultaat en gelijkmatige garing",
      "Keer niet om voordat er belletjes verschijnen en de randen er stevig uitzien",
      "Voeg eventueel gedroogde paardenbloem toe als topping voor extra lenteenergie",
      "Deze pannenkoeken zijn van nature glutenvrij dankzij boekweit- en rijstmeel"
    ],
    recipeNotes: "Traditional Ayurvedic spring recipe. Turmeric provides anti-inflammatory benefits while buckwheat offers complete protein and magnesium. The warm spices support digestion and the light flours are perfect for spring's kapha-reducing needs.",
    recipeNotesDutch: "Traditioneel Ayurvedisch lenterecept. Kurkuma biedt ontstekingsremmende voordelen terwijl boekweit volledige eiwitten en magnesium levert. De warme kruiden ondersteunen de spijsvertering en de lichte meelsoorten zijn perfect voor de kapha-reducerende behoeften van de lente.",
    prepTime: 20,
    vegetableContent: {
      servings: 0,
      vegetables: [],
      benefits: ["Anti-inflammatory from turmeric", "Complete protein from buckwheat", "Blood sugar balancing"]
    },
    source: "Ayurvedic tradition",
    active: true,
    createdBy: 1,
    updatedBy: 1
  };

  const nutritionIngredients = [
    "75g buckwheat flour",
    "50g rice flour",
    "100ml rice milk",
    "1 egg",
    "2.5ml apple cider vinegar",
    "10ml honey",
    "5ml safflower oil"
  ];

  console.log('Getting AI nutritional analysis...');
  const { analyzeRecipeNutrition } = await import('./ai-nutrition-analyzer');
  const nutrition = await analyzeRecipeNutrition(nutritionIngredients, recipe.name);

  console.log('\nNutrition analysis:');
  console.log(`Calories: ${nutrition.calories} kcal`);
  console.log(`Protein: ${nutrition.protein}g`);
  console.log(`Carbs: ${nutrition.carbohydrates}g`);
  console.log(`Fats: ${nutrition.fats}g`);
  console.log(`Fiber: ${nutrition.fiber}g`);
  console.log(`Cost: €${nutrition.costEuros}`);

  const fullRecipe = {
    ...recipe,
    nutrition
  };

  console.log('\n📝 Adding recipe to database...');
  await storage.createRecipe(fullRecipe as any);
  console.log('✅ Recipe added successfully!');

  const { recipeCache } = await import('./recipe-cache');
  recipeCache.invalidate();
  console.log('✅ Recipe cache invalidated');
  
  console.log('\n✨ Turmeric pancakes added to database!');
  console.log('Recipe ID: 10294');
  console.log('Tags:', recipe.tags.join(', '));
}

addTurmericPancakes().catch(console.error);
