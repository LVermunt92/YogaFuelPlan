import { storage } from './storage';

async function addMealPrepRecipes() {
  console.log('Adding new meal prep and snack recipes...\n');

  const cassavaTortillas = {
    id: "310501",
    name: "Cassava tortillas (weekend meal prep)",
    category: "snack" as const,
    portion: "2 tortillas (makes 6)",
    wholeFoodLevel: "high" as const,
    tags: ["Vegetarian", "Vegan", "Gluten-Free", "Lactose-Free", "Weekend-Prep", "Meal-Prep-Component"],
    ingredients: [
      "1kg fresh cassava",
      "2g salt"
    ],
    instructions: [
      "Trim the ends off the cassava, then slice it into three pieces",
      "Holding one piece in your hand, carefully score down the side - cutting through both layers of skin (the thick brown outer layer and the pinkish inner layer). Use your fingers to peel both layers off completely and discard them. Repeat with the remaining pieces",
      "Chop the peeled cassava into smaller chunks, about 3-5cm in size, and place them in a saucepan of cold water",
      "Bring to the boil, then cook for 25 minutes or until the cassava is completely soft all the way through - check by piercing with a knife; it should slide in easily and the flesh should look translucent, not chalky white. Make sure the cassava is completely cooked - this step is important because raw or undercooked cassava isn't safe to eat",
      "Use a slotted spoon to remove the cassava and transfer to a plate. Leave for 5 minutes to cool slightly",
      "Once cool enough to handle, remove and discard the fibrous core that runs through the centre of each piece. Transfer the cassava to a large bowl and mash until smooth, picking out any small pieces of core as you go",
      "Add a pinch of salt if you like, then mix again with your hands to form a smooth, dough-like consistency",
      "For small tortillas (ideal for tacos), divide into balls weighing around 70g each. For larger wraps, shape into 100g balls",
      "Cut two square pieces of baking paper roughly 30cm wide. Place a cassava ball between them and roll out with a rolling pin until 2mm thick",
      "Heat a non-stick pan over medium-high heat. Once hot, add the tortilla and cook for 1-3 minutes on each side, until lightly charred and flexible",
      "Transfer to a clean tea towel to cool while you cook the remaining tortillas",
      "Roll out the next tortilla while one is cooking to keep things moving efficiently"
    ],
    recipeTips: [
      "Yield: One average fresh cassava (around 1kg) makes about 6 small tortillas or 4 large ones",
      "Where to buy: Fresh cassava is available in some large supermarkets, or you can find it in African, Caribbean, or Asian grocery stores",
      "Peeling tip: Make sure to remove both layers of skin (brown and pink). Leaving any behind can make the cassava bitter and unsafe to eat",
      "Cooking safety: Always boil cassava until fully soft before mashing. Undercooked cassava contains natural compounds that make raw cassava unsafe to eat",
      "Storage: Keep cooked tortillas in an airtight container (separated with pieces of baking paper) in the fridge for up to 4 days or freeze for up to 3 months"
    ],
    recipeNotes: "These naturally gluten-free tortillas are made from just cassava and salt. Perfect for tacos, wraps, or as a side. Prepare on the weekend and use throughout the week.",
    prepTime: 45,
    vegetableContent: {
      servings: 0,
      vegetables: [],
      benefits: ["Naturally gluten-free", "Grain-free alternative", "Good source of resistant starch"]
    },
    nutrition: {
      protein: 1,
      calories: 152,
      carbohydrates: 39,
      fats: 0,
      fiber: 2,
      sugar: 2,
      sodium: 65,
      potassium: 180,
      calcium: 15,
      iron: 0.3,
      vitaminC: 12,
      vitaminK: 0,
      costEuros: 0.50,
      proteinPerEuro: 2
    }
  };

  const peanutButterBananaBread = {
    id: "310502",
    name: "High protein peanut butter banana bread",
    category: "snack" as const,
    portion: "1 slice (makes 7)",
    wholeFoodLevel: "moderate" as const,
    tags: ["Vegetarian", "Gluten-Free", "Lactose-Free", "High-Protein", "Longevity"],
    ingredients: [
      "90g gluten-free oat flour",
      "90g vanilla protein powder",
      "2g baking soda",
      "2g baking powder",
      "1g salt",
      "3g ground cinnamon",
      "3 ripe bananas",
      "80g plant-based yogurt",
      "60ml coconut oil",
      "60ml maple syrup",
      "5ml vanilla extract",
      "3 eggs"
    ],
    instructions: [
      "Preheat oven to 180°C and line a 9x5 inch loaf pan with parchment paper",
      "In a large bowl, whisk together oat flour, protein powder, baking soda, baking powder, salt, and cinnamon",
      "In another bowl, mash the bananas until smooth",
      "Add yogurt, melted coconut oil, maple syrup, vanilla extract, and eggs to the mashed bananas. Mix well",
      "Pour the wet ingredients into the dry ingredients and stir until just combined - don't overmix",
      "Pour batter into the prepared loaf pan and smooth the top",
      "Bake for 45-50 minutes until a toothpick inserted in the center comes out clean",
      "Let cool in the pan for 10 minutes, then transfer to a wire rack to cool completely",
      "Slice into 7 portions and store in an airtight container"
    ],
    recipeTips: [
      "Use overripe bananas for maximum sweetness and moisture",
      "The bread will continue to firm up as it cools",
      "Store at room temperature for 2-3 days or refrigerate for up to 1 week",
      "Can be frozen for up to 3 months - thaw at room temperature or toast slices"
    ],
    recipeNotes: "A protein-packed twist on classic banana bread. With 17g protein per slice, it's perfect as a post-workout snack or satisfying breakfast on the go.",
    prepTime: 15,
    vegetableContent: {
      servings: 0,
      vegetables: [],
      benefits: ["High in plant-based protein", "Good source of potassium from bananas", "Contains healthy fats"]
    },
    nutrition: {
      protein: 17,
      calories: 255,
      carbohydrates: 30,
      fats: 8,
      fiber: 3,
      sugar: 12,
      sodium: 180,
      potassium: 280,
      calcium: 60,
      iron: 1.5,
      vitaminC: 3,
      vitaminK: 1,
      costEuros: 0.85,
      proteinPerEuro: 20
    }
  };

  const highProteinCarrotCake = {
    id: "310503",
    name: "High protein carrot cake",
    category: "snack" as const,
    portion: "1 slice (makes 7)",
    wholeFoodLevel: "moderate" as const,
    tags: ["Vegetarian", "Gluten-Free", "Lactose-Free", "High-Protein", "Anti-Aging", "Longevity"],
    ingredients: [
      "90g gluten-free oat flour",
      "90g vanilla protein powder",
      "2g baking soda",
      "2g baking powder",
      "1g salt",
      "5g ground cinnamon",
      "2g ground ginger",
      "1g ground nutmeg",
      "3 ripe bananas",
      "60g carrots",
      "60g plant-based yogurt",
      "60ml coconut oil",
      "60ml maple syrup",
      "7ml vanilla paste",
      "3 eggs",
      "40g pecans"
    ],
    instructions: [
      "Preheat oven to 180°C and line a 9x5 inch loaf pan with parchment paper",
      "In a large bowl, whisk together oat flour, protein powder, baking soda, baking powder, salt, cinnamon, ginger, and nutmeg",
      "Finely shred the carrots and set aside",
      "In another bowl, mash the bananas until smooth",
      "Add yogurt, melted coconut oil, maple syrup, vanilla paste, and eggs to the mashed bananas. Mix well",
      "Stir in the shredded carrots",
      "Pour the wet ingredients into the dry ingredients and stir until just combined",
      "Fold in the toasted pecans",
      "Pour batter into the prepared loaf pan and smooth the top",
      "Bake for 50-55 minutes until a toothpick inserted in the center comes out clean",
      "Let cool in the pan for 10 minutes, then transfer to a wire rack to cool completely",
      "Slice into 7 portions"
    ],
    recipeTips: [
      "Toast the pecans before adding for extra flavor",
      "Finely shred the carrots for better texture integration",
      "Optional frosting: blend 120g dairy-free cream cheese, 15ml maple syrup, 7ml vanilla paste, and a pinch of sea salt",
      "Store at room temperature for 2-3 days or refrigerate for up to 1 week"
    ],
    recipeNotes: "A protein-rich carrot cake with warming spices. The carrots add moisture and beta-carotene for anti-aging benefits. Perfect as a nutritious snack or dessert.",
    prepTime: 20,
    vegetableContent: {
      servings: 0.5,
      vegetables: ["carrots"],
      benefits: ["High in beta-carotene", "Anti-inflammatory spices", "Rich in plant-based protein"]
    },
    nutrition: {
      protein: 17,
      calories: 365,
      carbohydrates: 37,
      fats: 18,
      fiber: 4,
      sugar: 14,
      sodium: 190,
      potassium: 320,
      calcium: 70,
      iron: 2,
      vitaminC: 2,
      vitaminK: 3,
      costEuros: 1.10,
      proteinPerEuro: 15
    }
  };

  const recipes = [cassavaTortillas, peanutButterBananaBread, highProteinCarrotCake];

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

addMealPrepRecipes().catch(console.error);
