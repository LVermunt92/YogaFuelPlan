import { storage } from './storage';

async function addEnergyBars() {
  console.log('Adding Chocolate Peanut Butter Energy Bars recipe...');

  const recipe = {
    id: "310242",
    name: "Chocolate peanut butter energy bars",
    category: "snack" as const,
    portion: "1 bar (makes 12)",
    wholeFoodLevel: "high" as const,
    tags: ["Vegetarian", "Gluten-Free", "Dairy-Free", "Lactose-Free", "Vegan", "High-Protein", "Longevity", "Anti-Aging"],
    ingredients: [
      "120g quick oats",
      "20g unsweetened cocoa powder",
      "80ml maple syrup",
      "125g peanut butter",
      "30ml water",
      "10ml vanilla extract",
      "70g roasted almonds",
      "90g dark chocolate chips",
      "5ml olive oil"
    ],
    instructions: [
      "Line an 8-inch square pan with parchment paper and lightly oil using cooking spray",
      "Preheat oven to 180°C",
      "In a mixing bowl, combine quick oats, cocoa powder, peanut butter, water, and vanilla extract",
      "Stir with a rubber spatula, then lightly oil your hands and squeeze the mixture to form a dough that is firm but not crumbly",
      "If the mixture is too crumbly, add an extra 15ml water or olive oil and knead until it forms a ball",
      "Press the dough into the prepared pan, using oiled fingers and a flat object like a jar lid to create an even layer",
      "Bake for 12 minutes at 180°C on the center rack",
      "Cool in the pan for 10 minutes, then transfer to a cutting board using the parchment paper",
      "Cut the warm bar into 12 pieces with a sharp knife",
      "Melt dark chocolate chips with olive oil in a microwave in 30-second bursts, stirring between each",
      "Drizzle melted chocolate over the cut bars and top with whole roasted almonds if desired",
      "Place bars in the freezer for 12 minutes to set the chocolate"
    ],
    recipeTips: [
      "Use quick oats, not old-fashioned rolled oats, as they have the right texture",
      "The dough should be firm but hold together - adjust water content as needed",
      "Cut bars while still warm to prevent excessive crumbling",
      "Store in an airtight container in the refrigerator for up to 1 week or freeze for longer storage"
    ],
    recipeNotes: "Rich in plant-based protein from peanut butter and almonds. Dark chocolate provides flavanols for heart health. Makes a perfect pre- or post-workout snack.",
    prepTime: 25,
    vegetableContent: {
      servings: 0,
      vegetables: [],
      benefits: ["High in plant-based protein", "Rich in healthy fats", "Contains antioxidants from dark chocolate and cocoa"]
    }
  };

  // Calculate nutrition for full recipe (12 bars)
  const fullRecipeIngredients = [
    "120g quick oats",
    "20g unsweetened cocoa powder",
    "80ml maple syrup",
    "125g peanut butter",
    "70g roasted almonds",
    "90g dark chocolate chips"
  ];

  console.log('Getting AI nutritional analysis for full recipe...');
  const { analyzeRecipeNutrition } = await import('./ai-nutrition-analyzer');
  const fullNutrition = await analyzeRecipeNutrition(fullRecipeIngredients, recipe.name);

  // Calculate per-bar nutrition (divide by 12)
  const perBarNutrition = {
    protein: Math.round((fullNutrition.protein || 0) / 12),
    calories: Math.round((fullNutrition.calories || 0) / 12),
    carbohydrates: Math.round((fullNutrition.carbohydrates || 0) / 12),
    fats: Math.round((fullNutrition.fats || 0) / 12),
    fiber: Math.round((fullNutrition.fiber || 0) / 12),
    sugar: Math.round((fullNutrition.sugar || 0) / 12),
    sodium: Math.round((fullNutrition.sodium || 0) / 12),
    potassium: Math.round((fullNutrition.potassium || 0) / 12),
    calcium: Math.round((fullNutrition.calcium || 0) / 12),
    iron: parseFloat(((fullNutrition.iron || 0) / 12).toFixed(1)),
    vitaminC: Math.round((fullNutrition.vitaminC || 0) / 12),
    vitaminK: Math.round((fullNutrition.vitaminK || 0) / 12),
    costEuros: parseFloat(((fullNutrition.costEuros || 0) / 12).toFixed(2)),
    proteinPerEuro: 0
  };

  // Calculate protein per euro
  if (perBarNutrition.costEuros > 0) {
    perBarNutrition.proteinPerEuro = parseFloat((perBarNutrition.protein / perBarNutrition.costEuros).toFixed(1));
  }

  console.log('\nPer-bar nutrition (1 of 12 bars):');
  console.log(`Calories: ${perBarNutrition.calories} kcal`);
  console.log(`Protein: ${perBarNutrition.protein}g`);
  console.log(`Carbs: ${perBarNutrition.carbohydrates}g`);
  console.log(`Fats: ${perBarNutrition.fats}g`);
  console.log(`Fiber: ${perBarNutrition.fiber}g`);
  console.log(`Cost: €${perBarNutrition.costEuros}`);

  const recipeWithNutrition = {
    ...recipe,
    nutrition: perBarNutrition
  };

  await storage.createRecipe(recipeWithNutrition as any);
  console.log('✅ Recipe added successfully!');

  // Invalidate recipe cache
  const { recipeCache } = await import('./recipe-cache');
  recipeCache.invalidate();
  console.log('✅ Recipe cache invalidated');
}

addEnergyBars().catch(console.error);
