import { db } from "../server/db";
import { recipes } from "../shared/schema";
import { analyzeRecipeNutrition } from "../server/ai-nutrition-analyzer";

async function addPurpleSweetPotatoBalls() {
  console.log("🍠 Adding Purple Sweet Potato Air Fryer Balls recipe...");

  // Recipe details
  const recipeName = "Purple Sweet Potato Air Fryer Balls";
  const category = "snack";
  const servings = 12; // 12 balls
  const portion = "1 ball";
  
  const ingredients = [
    "200g raw Okinawan or purple sweet potato",
    "40g tapioca starch",
    "45ml coconut milk",
    "1g baking powder",
    "5ml agave or honey (optional)",
    "5g toasted sesame seeds (optional)"
  ];

  const instructions = [
    "Peel and slice sweet potato into small cubes. Bring a steamer to a boil and steam the sweet potato cubes for 10-12 minutes or until softened.",
    "Mash the steamed sweet potatoes and combine with tapioca starch, coconut milk, and baking powder.",
    "Roll the dough into small balls, approximately 24 grams each.",
    "Lightly grease an air fryer and place the dough balls in. Air fry at 175°C (350°F) for 15-17 minutes.",
    "Enjoy as is or serve with some agave/honey and sesame seeds."
  ];

  const tags = [
    "Vegan",
    "Gluten-Free",
    "Lactose-Free",
    "Snack",
    "Air Fryer"
  ];

  const recipeTips = [
    "You can freeze the uncooked dough balls and air fry at a later time."
  ];

  try {
    // Calculate nutrition using AI
    console.log("🤖 Calculating nutrition values using AI...");
    const nutrition = await analyzeRecipeNutrition(ingredients, servings, portion);
    
    console.log("📊 Nutrition per ball:", nutrition);

    // Generate unique ID using timestamp
    const customId = String(Date.now());

    // Insert recipe into database
    const newRecipe = await db.insert(recipes).values({
      id: customId,
      name: recipeName,
      category: category,
      ingredients: ingredients,
      instructions: instructions,
      portion: portion,
      nutrition: nutrition,
      tags: tags,
      wholeFoodLevel: "high",
      vegetableContent: {
        servings: 0.5,
        vegetables: ["sweet potato"],
        benefits: ["Rich in antioxidants", "Good source of fiber"]
      },
      recipeBenefits: [
        "Rich in antioxidants from purple sweet potatoes",
        "Naturally gluten-free and vegan",
        "Lower fat alternative to traditional fried snacks"
      ],
      recipeTips: recipeTips,
      recipeNotes: "Purple sweet potatoes (Okinawan) are rich in anthocyanins, powerful antioxidants. Regular sweet potatoes can be substituted.",
      source: "custom",
      active: true
    }).returning();

    console.log("✅ Successfully added recipe:", newRecipe[0].name);
    console.log("📝 Recipe ID:", newRecipe[0].id);
    console.log("\n🎉 Done! Recipe is now available in the meal planner.");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error adding recipe:", error);
    process.exit(1);
  }
}

addPurpleSweetPotatoBalls();
