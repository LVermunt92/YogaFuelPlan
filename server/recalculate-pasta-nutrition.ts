import { analyzeRecipeNutrition } from './ai-nutrition-analyzer';
import * as fs from 'fs';

async function recalculateVariants() {
  console.log('🔬 Recalculating nutrition for Rustic Tomato Pasta Bake variants...\n');
  
  // Variant 2 ingredients (Tofu + gluten-free)
  const variant2Ingredients = [
    '100g penne gluten-free pasta (rice or chickpea) - UNCOOKED weight',
    '1 slice sourdough gluten-free bread',
    '1/2 large onion, diced',
    '1 clove garlic, minced',
    '3 sun-dried tomatoes, chopped',
    '2.5ml dried oregano',
    '7ml tomato paste',
    '200g canned chopped tomatoes',
    '7ml balsamic vinegar',
    '15ml olive oil',
    '30ml plain gluten-free flour blend',
    '250ml plant-based milk',
    '15g nutritional yeast',
    '2.5ml Dijon mustard',
    '75g firm tofu, crumbled',
    '2g sea salt',
    '1g black pepper',
  ];

  // Variant 3 ingredients (Tofu + regular pasta)
  const variant3Ingredients = [
    '100g penne pasta - UNCOOKED weight',
    '1/2 slice sourdough bread',
    '1/4 large onion, diced',
    '1 clove garlic, minced',
    '1.5 sun-dried tomatoes, chopped',
    '0.75ml dried oregano',
    '4ml tomato paste',
    '100g canned chopped tomatoes',
    '4ml balsamic vinegar',
    '15ml olive oil',
    '15ml plain flour',
    '125ml plant-based milk',
    '8g nutritional yeast',
    '1.25ml Dijon mustard',
    '38g firm tofu, crumbled',
    '2g sea salt',
    '1g black pepper',
  ];

  try {
    // Analyze Variant 2
    console.log('📊 Analyzing Variant 2 (Tofu + gluten-free pasta)...');
    const variant2Nutrition = await analyzeRecipeNutrition(
      variant2Ingredients,
      1,
      '1 serving'
    );
    
    console.log('\n✅ Variant 2 Results:');
    console.log(`  Calories: ${variant2Nutrition.calories} kcal`);
    console.log(`  Protein: ${variant2Nutrition.protein}g`);
    console.log(`  Carbs: ${variant2Nutrition.carbohydrates}g`);
    console.log(`  Fats: ${variant2Nutrition.fats}g`);
    console.log(`  Fiber: ${variant2Nutrition.fiber}g`);
    console.log(`  Verification (4-4-9 rule): ${variant2Nutrition.protein * 4 + variant2Nutrition.carbohydrates * 4 + variant2Nutrition.fats * 9} kcal`);

    // Analyze Variant 3
    console.log('\n📊 Analyzing Variant 3 (Tofu + regular pasta)...');
    const variant3Nutrition = await analyzeRecipeNutrition(
      variant3Ingredients,
      1,
      '1 serving'
    );
    
    console.log('\n✅ Variant 3 Results:');
    console.log(`  Calories: ${variant3Nutrition.calories} kcal`);
    console.log(`  Protein: ${variant3Nutrition.protein}g`);
    console.log(`  Carbs: ${variant3Nutrition.carbohydrates}g`);
    console.log(`  Fats: ${variant3Nutrition.fats}g`);
    console.log(`  Fiber: ${variant3Nutrition.fiber}g`);
    console.log(`  Verification (4-4-9 rule): ${variant3Nutrition.protein * 4 + variant3Nutrition.carbohydrates * 4 + variant3Nutrition.fats * 9} kcal`);

    // Save to JSON file for manual update
    const results = {
      variant2: {
        current: { calories: 360, protein: 20, carbs: 65, fats: 22 },
        corrected: variant2Nutrition
      },
      variant3: {
        current: { calories: 145, protein: 8, carbs: 16.2, fats: 5.5 },
        corrected: variant3Nutrition
      }
    };

    fs.writeFileSync('nutrition-corrections.json', JSON.stringify(results, null, 2));
    console.log('\n💾 Results saved to nutrition-corrections.json');

  } catch (error) {
    console.error('❌ Error analyzing nutrition:', error);
    throw error;
  }
}

recalculateVariants();
