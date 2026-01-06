import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface NutritionAnalysis {
  protein: number;
  calories: number;
  carbohydrates: number;
  fats: number;
  fiber: number;
  sugar: number;
  sodium: number;
  potassium: number;
  calcium: number;
  iron: number;
  vitaminC: number;
  costEuros: number;
}

export async function analyzeRecipeNutrition(
  ingredients: string[],
  servings: number,
  portion: string
): Promise<NutritionAnalysis> {
  try {
    const prompt = `Analyze the nutritional content of this recipe and provide accurate values per serving.

Recipe Details:
- Ingredients: ${ingredients.join(', ')}
- Servings: ${servings}
- Portion size: ${portion}

Please calculate the nutritional values per serving based on the ingredients and quantities provided. Consider typical cooking methods and ingredient absorption.

Respond with JSON in this exact format:
{
  "protein": number (grams per serving),
  "calories": number (kcal per serving),
  "carbohydrates": number (grams per serving),
  "fats": number (grams per serving),
  "fiber": number (grams per serving),
  "sugar": number (grams per serving),
  "sodium": number (milligrams per serving),
  "potassium": number (milligrams per serving),
  "calcium": number (milligrams per serving),
  "iron": number (milligrams per serving, with one decimal),
  "vitaminC": number (milligrams per serving),
  "costEuros": number (estimated cost in euros per serving, based on typical European grocery prices)
}

Be as accurate as possible based on standard nutritional data for the ingredients listed.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a professional nutritionist AI that provides accurate nutritional analysis of recipes. Always respond with valid JSON containing nutritional values."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1, // Low temperature for consistent, accurate nutritional data
    });

    const nutritionData = JSON.parse(response.choices[0].message.content || '{}');

    // Validate and sanitize the response
    return {
      protein: Math.max(0, Math.round(nutritionData.protein || 0)),
      calories: Math.max(0, Math.round(nutritionData.calories || 0)),
      carbohydrates: Math.max(0, Math.round(nutritionData.carbohydrates || 0)),
      fats: Math.max(0, Math.round(nutritionData.fats * 10) / 10), // Keep one decimal for fats
      fiber: Math.max(0, Math.round(nutritionData.fiber || 0)),
      sugar: Math.max(0, Math.round(nutritionData.sugar || 0)),
      sodium: Math.max(0, Math.round(nutritionData.sodium || 0)),
      potassium: Math.max(0, Math.round(nutritionData.potassium || 0)),
      calcium: Math.max(0, Math.round(nutritionData.calcium || 0)),
      iron: Math.max(0, Math.round((nutritionData.iron || 0) * 10) / 10), // Keep one decimal for iron
      vitaminC: Math.max(0, Math.round(nutritionData.vitaminC || 0)),
      zinc: Math.max(0, Math.round((nutritionData.zinc || 0) * 10) / 10), // Keep one decimal for zinc
      costEuros: Math.max(0, Math.round((nutritionData.costEuros || 2.5) * 100) / 100), // Keep two decimals for cost, default €2.50
    };

  } catch (error) {
    console.error('AI nutrition analysis failed:', error.message);
    
    // Smart fallback based on ingredient analysis
    return estimateNutritionFromIngredients(ingredients, servings);
  }
}

/**
 * Estimate nutrition values based on ingredient analysis when AI fails
 */
function estimateNutritionFromIngredients(ingredients: string[], servings: number): NutritionAnalysis {
  let totalProtein = 0;
  let totalCalories = 0;
  let totalCarbs = 0;
  let totalFats = 0;
  let totalFiber = 0;
  let totalSodium = 0;
  let totalPotassium = 0;
  let totalCalcite = 0;
  let totalIron = 0;
  let totalVitaminC = 0;
  let totalZinc = 0;
  let totalCost = 0;

  ingredients.forEach(ingredient => {
    const lowerIngredient = ingredient.toLowerCase();
    
    // Protein sources
    if (lowerIngredient.includes('chicken')) {
      totalProtein += 25; totalCalories += 150; totalFats += 3; totalCost += 2.5;
      totalPotassium += 220; totalIron += 0.9; totalZinc += 1.3;
    } else if (lowerIngredient.includes('beef') || lowerIngredient.includes('meat')) {
      totalProtein += 22; totalCalories += 200; totalFats += 12; totalCost += 3.5;
      totalPotassium += 300; totalIron += 2.5; totalZinc += 4.5;
    } else if (lowerIngredient.includes('fish') || lowerIngredient.includes('salmon') || lowerIngredient.includes('tuna')) {
      totalProtein += 20; totalCalories += 140; totalFats += 6; totalCost += 4.0;
      totalPotassium += 350; totalCalcite += 10; totalIron += 0.8; totalZinc += 0.8;
    } else if (lowerIngredient.includes('egg')) {
      totalProtein += 6; totalCalories += 70; totalFats += 5; totalCost += 0.3;
      totalPotassium += 70; totalCalcite += 25; totalIron += 0.9; totalZinc += 0.6;
    } else if (lowerIngredient.includes('tofu') || lowerIngredient.includes('tempeh')) {
      totalProtein += 8; totalCalories += 80; totalFats += 4; totalCost += 1.5;
      totalPotassium += 120; totalCalcite += 130; totalIron += 1.8; totalZinc += 1.0;
    } else if (lowerIngredient.includes('beans') || lowerIngredient.includes('lentils') || lowerIngredient.includes('chickpea')) {
      totalProtein += 8; totalCalories += 120; totalCarbs += 20; totalFiber += 8; totalCost += 1.0;
      totalPotassium += 400; totalCalcite += 40; totalIron += 3.3; totalZinc += 1.5;
    }
    
    // Carbohydrate sources
    else if (lowerIngredient.includes('rice') || lowerIngredient.includes('pasta') || lowerIngredient.includes('noodles')) {
      totalCarbs += 25; totalCalories += 110; totalProtein += 2; totalCost += 0.5;
      totalPotassium += 50; totalIron += 0.5;
    } else if (lowerIngredient.includes('sweet potato')) {
      totalCarbs += 20; totalCalories += 90; totalFiber += 3; totalCost += 0.8;
      totalPotassium += 450; totalVitaminC += 20; totalCalcite += 40; totalIron += 0.7;
    } else if (lowerIngredient.includes('potato')) {
      totalCarbs += 20; totalCalories += 90; totalFiber += 3; totalCost += 0.8;
      totalPotassium += 420; totalVitaminC += 12; totalIron += 0.8;
    } else if (lowerIngredient.includes('bread') || lowerIngredient.includes('flour')) {
      totalCarbs += 15; totalCalories += 80; totalProtein += 3; totalCost += 0.6;
      totalIron += 1.0;
    }
    
    // Vegetables - high vitamin C and minerals
    else if (lowerIngredient.includes('broccoli')) {
      totalCarbs += 6; totalCalories += 30; totalFiber += 2.5; totalCost += 0.8;
      totalPotassium += 290; totalVitaminC += 90; totalCalcite += 45; totalIron += 0.7;
    } else if (lowerIngredient.includes('bell pepper') || lowerIngredient.includes('paprika')) {
      totalCarbs += 6; totalCalories += 25; totalFiber += 2; totalCost += 0.6;
      totalPotassium += 210; totalVitaminC += 130; totalIron += 0.4;
    } else if (lowerIngredient.includes('tomato')) {
      totalCarbs += 4; totalCalories += 20; totalFiber += 1.5; totalCost += 0.5;
      totalPotassium += 240; totalVitaminC += 15; totalIron += 0.3;
    } else if (lowerIngredient.includes('spinach') || lowerIngredient.includes('kale')) {
      totalCarbs += 2; totalCalories += 10; totalFiber += 2; totalProtein += 1; totalCost += 1.0;
      totalPotassium += 400; totalVitaminC += 30; totalCalcite += 100; totalIron += 2.7;
    } else if (lowerIngredient.includes('onion')) {
      totalCarbs += 5; totalCalories += 20; totalFiber += 1; totalCost += 0.3;
      totalPotassium += 150; totalVitaminC += 7;
    } else if (lowerIngredient.includes('carrot')) {
      totalCarbs += 6; totalCalories += 25; totalFiber += 2; totalCost += 0.4;
      totalPotassium += 200; totalVitaminC += 5; totalCalcite += 30;
    } else if (lowerIngredient.includes('pumpkin') || lowerIngredient.includes('squash')) {
      totalCarbs += 8; totalCalories += 30; totalFiber += 1; totalCost += 0.6;
      totalPotassium += 340; totalVitaminC += 10; totalCalcite += 20; totalIron += 0.8;
    } else if (lowerIngredient.includes('zucchini') || lowerIngredient.includes('courgette')) {
      totalCarbs += 3; totalCalories += 15; totalFiber += 1; totalCost += 0.5;
      totalPotassium += 260; totalVitaminC += 18;
    }
    
    // Citrus and high vitamin C fruits
    else if (lowerIngredient.includes('orange') || lowerIngredient.includes('lemon') || lowerIngredient.includes('lime')) {
      totalCarbs += 10; totalCalories += 45; totalFiber += 2; totalCost += 0.4;
      totalPotassium += 180; totalVitaminC += 50; totalCalcite += 40;
    } else if (lowerIngredient.includes('strawberr') || lowerIngredient.includes('berries') || lowerIngredient.includes('blueberr')) {
      totalCarbs += 8; totalCalories += 35; totalFiber += 2; totalCost += 1.2;
      totalPotassium += 150; totalVitaminC += 60; totalIron += 0.4;
    } else if (lowerIngredient.includes('banana')) {
      totalCarbs += 23; totalCalories += 90; totalFiber += 2.5; totalCost += 0.3;
      totalPotassium += 400; totalVitaminC += 10;
    }
    
    // Fats and oils
    else if (lowerIngredient.includes('oil') || lowerIngredient.includes('butter')) {
      totalFats += 10; totalCalories += 90; totalCost += 0.3;
    } else if (lowerIngredient.includes('avocado')) {
      totalFats += 15; totalCalories += 160; totalFiber += 7; totalCost += 1.5;
      totalPotassium += 500; totalVitaminC += 10; totalIron += 0.6;
    } else if (lowerIngredient.includes('nuts') || lowerIngredient.includes('almond') || lowerIngredient.includes('walnut')) {
      totalProtein += 6; totalFats += 14; totalCalories += 160; totalCost += 2.0;
      totalPotassium += 200; totalCalcite += 75; totalIron += 1.0;
    }
    
    // Dairy
    else if (lowerIngredient.includes('milk') || lowerIngredient.includes('yogurt')) {
      totalProtein += 3; totalCalories += 60; totalCarbs += 5; totalCost += 0.8;
      totalPotassium += 150; totalCalcite += 120;
    } else if (lowerIngredient.includes('cheese')) {
      totalProtein += 7; totalFats += 9; totalCalories += 110; totalSodium += 200; totalCost += 1.5;
      totalCalcite += 200;
    }
    
    // Seeds
    else if (lowerIngredient.includes('chia') || lowerIngredient.includes('flax') || lowerIngredient.includes('hemp')) {
      totalProtein += 3; totalFats += 5; totalCalories += 70; totalFiber += 5; totalCost += 0.5;
      totalPotassium += 100; totalCalcite += 80; totalIron += 1.2; totalZinc += 1.0;
    } else if (lowerIngredient.includes('pumpkin seed') || lowerIngredient.includes('sunflower seed')) {
      totalProtein += 5; totalFats += 10; totalCalories += 120; totalCost += 0.6;
      totalPotassium += 200; totalIron += 2.0; totalZinc += 2.5;
    }
    
    // Coconut
    else if (lowerIngredient.includes('coconut')) {
      totalFats += 8; totalCalories += 80; totalCost += 0.5;
      totalPotassium += 100; totalIron += 0.5;
    }
    
    // Default for unrecognized ingredients
    else {
      totalCalories += 30; totalCarbs += 5; totalCost += 0.5;
      totalPotassium += 50;
    }
  });

  // Adjust for servings
  const perServing = {
    protein: Math.round(totalProtein / servings),
    calories: Math.round(totalCalories / servings),
    carbohydrates: Math.round(totalCarbs / servings),
    fats: Math.round((totalFats / servings) * 10) / 10,
    fiber: Math.round(totalFiber / servings),
    sugar: Math.round((totalCarbs / servings) * 0.1), // Estimate 10% of carbs as sugar
    sodium: Math.round((totalSodium + 200) / servings), // Add base sodium for seasoning
    potassium: Math.round(totalPotassium / servings),
    calcium: Math.round(totalCalcite / servings),
    iron: Math.round((totalIron / servings) * 10) / 10,
    vitaminC: Math.round(totalVitaminC / servings),
    zinc: Math.round((totalZinc / servings) * 10) / 10,
    costEuros: Math.round((totalCost / servings) * 100) / 100,
  };

  console.log(`✅ Estimated nutrition fallback: ${perServing.protein}g protein, ${perServing.calories} kcal, K=${perServing.potassium}mg, Ca=${perServing.calcium}mg, Fe=${perServing.iron}mg, Zn=${perServing.zinc}mg`);
  
  return perServing;
}