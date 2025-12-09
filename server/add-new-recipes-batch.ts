import { storage } from './storage';

async function addNewRecipes() {
  console.log('Adding new recipes...\n');

  const matchaBlissBalls = {
    id: "310504",
    name: "Matcha pistachio bliss balls",
    category: "snack" as const,
    portion: "2 balls (makes 10)",
    wholeFoodLevel: "high" as const,
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Anti-Aging", "Longevity", "Quick"],
    ingredients: [
      "96g almond flour",
      "60g pistachio matcha crema",
      "30ml maple syrup",
      "3g matcha powder",
      "5ml vanilla extract",
      "2g matcha powder"
    ],
    instructions: [
      "In a mixing bowl, combine the almond flour, pistachio matcha crema, maple syrup, matcha powder, and vanilla extract",
      "Stir until the mixture comes together into a soft, dough-like consistency. If it's too sticky, add a bit more almond flour; if too dry, add a little more crema or maple syrup",
      "Roll the mixture into small bite-sized balls using your hands",
      "Lightly dust each ball with matcha powder for garnish",
      "Store in an airtight container in the fridge for up to 1 week"
    ],
    recipeTips: [
      "Use high-quality matcha powder for best color and flavor",
      "If you can't find pistachio matcha crema, substitute with pistachio butter mixed with 1g matcha",
      "Roll with slightly wet hands to prevent sticking"
    ],
    recipeNotes: "These no-bake bliss balls are packed with healthy fats from almonds and pistachios. Matcha provides antioxidants and a gentle energy boost.",
    prepTime: 10,
    vegetableContent: {
      servings: 0,
      vegetables: [],
      benefits: ["Rich in antioxidants from matcha", "Healthy fats from nuts", "No refined sugar"]
    },
    nutrition: {
      protein: 4,
      calories: 120,
      carbohydrates: 8,
      fats: 9,
      fiber: 2,
      sugar: 4,
      sodium: 5,
      potassium: 120,
      calcium: 40,
      iron: 0.8,
      vitaminC: 0,
      vitaminK: 2,
      costEuros: 0.60,
      proteinPerEuro: 7
    }
  };

  const smashedPotatoTacos = {
    id: "310505",
    name: "Smashed potato tacos with guacamole",
    category: "lunch" as const,
    portion: "4 potato tacos",
    wholeFoodLevel: "high" as const,
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "High-Fiber", "Longevity"],
    ingredients: [
      "8 white potatoes",
      "45ml olive oil",
      "2g salt",
      "1g black pepper",
      "200g ripe avocado",
      "150g cherry tomatoes",
      "240g black beans",
      "60g vegan feta",
      "10g fresh coriander",
      "30g pickled onion"
    ],
    instructions: [
      "Preheat the oven to 200°C and line two baking trays",
      "Bring a pot of salted water to a boil. Add the potatoes and boil for 20 minutes or until soft. Drain and set aside for 5 minutes",
      "Place the potatoes on the trays, ensuring none are touching, and use the base of a glass to press down on each potato, keeping them in one piece. Drizzle over olive oil and season well with salt and pepper",
      "Bake in the oven for 45-50 minutes, or until golden and crispy. Do not turn over",
      "While potatoes bake, prepare the guacamole by smashing the avocado with a fork",
      "Dice the cherry tomatoes and drain the black beans",
      "Once potatoes are crispy, top each with guacamole, black beans, diced tomatoes, and crumbled vegan feta",
      "Garnish with fresh coriander and pickled onion"
    ],
    recipeTips: [
      "Use small to medium potatoes for best results",
      "Don't skip the boiling step - it ensures fluffy interiors",
      "Make extra pickled onion to use throughout the week",
      "The potatoes can be boiled ahead of time and smashed when ready to bake"
    ],
    recipeNotes: "Crispy smashed potatoes serve as a gluten-free taco base. Loaded with fiber-rich black beans and heart-healthy avocado.",
    prepTime: 75,
    vegetableContent: {
      servings: 2,
      vegetables: ["potatoes", "cherry tomatoes", "avocado", "onion"],
      benefits: ["High in fiber", "Rich in potassium", "Heart-healthy fats from avocado"]
    },
    nutrition: {
      protein: 18,
      calories: 520,
      carbohydrates: 68,
      fats: 22,
      fiber: 16,
      sugar: 6,
      sodium: 420,
      potassium: 1800,
      calcium: 90,
      iron: 4.5,
      vitaminC: 45,
      vitaminK: 28,
      costEuros: 3.20,
      proteinPerEuro: 6
    }
  };

  const spicedDateMilk = {
    id: "310506",
    name: "Spiced date milk (winter warmer)",
    category: "snack" as const,
    portion: "1 cup",
    wholeFoodLevel: "high" as const,
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Warming", "Winter", "December", "January", "February", "Comfort-Food", "Luteal", "Menstrual"],
    ingredients: [
      "8 dates",
      "500ml plant-based milk",
      "3g ground ginger",
      "2g ground cardamom",
      "2g ground cinnamon"
    ],
    instructions: [
      "Remove the pits from the dates",
      "Add the dates and plant-based milk to a blender",
      "Add the ginger, cardamom, and cinnamon",
      "Blend until completely smooth",
      "Pour into a saucepan and heat gently until warm (do not boil)",
      "Adjust the consistency with more milk if desired - it depends on the type of dates and how thick you want it",
      "Pour into cups and serve warm"
    ],
    recipeTips: [
      "Use soft Medjool dates for the creamiest result",
      "Adjust spices to taste - start with less and add more",
      "Can be served cold in summer as a smoothie",
      "Store leftover date milk in the fridge for up to 3 days"
    ],
    recipeNotes: "A traditional Middle Eastern warming drink perfect for cold winter evenings. Naturally sweetened with dates and spiced with warming ginger, cardamom, and cinnamon.",
    prepTime: 10,
    vegetableContent: {
      servings: 0,
      vegetables: [],
      benefits: ["Natural sweetness from dates", "Warming spices for digestion", "Rich in minerals from dates"]
    },
    nutrition: {
      protein: 4,
      calories: 180,
      carbohydrates: 38,
      fats: 3,
      fiber: 4,
      sugar: 32,
      sodium: 80,
      potassium: 420,
      calcium: 180,
      iron: 1.2,
      vitaminC: 0,
      vitaminK: 0,
      costEuros: 1.00,
      proteinPerEuro: 4
    }
  };

  const recipes = [matchaBlissBalls, smashedPotatoTacos, spicedDateMilk];

  for (const recipe of recipes) {
    try {
      console.log(`Adding: ${recipe.name}...`);
      await storage.createRecipe(recipe as any);
      console.log(`✅ ${recipe.name} added successfully!`);
    } catch (error: any) {
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        console.log(`⚠️ ${recipe.name} already exists, skipping...`);
      } else {
        console.error(`❌ Error adding ${recipe.name}:`, error);
      }
    }
  }

  const { recipeCache } = await import('./recipe-cache');
  recipeCache.invalidate();
  console.log('\n✅ Recipe cache invalidated');
  console.log('✅ All recipes processed!');
}

addNewRecipes().catch(console.error);
