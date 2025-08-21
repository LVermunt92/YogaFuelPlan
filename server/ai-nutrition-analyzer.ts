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
      costEuros: Math.max(0, Math.round((nutritionData.costEuros || 2.5) * 100) / 100), // Keep two decimals for cost, default €2.50
    };

  } catch (error) {
    console.error('AI nutrition analysis failed:', error);
    
    // Fallback to reasonable defaults based on ingredients count and servings
    const estimatedCalories = Math.max(200, ingredients.length * 50);
    return {
      protein: Math.round(estimatedCalories * 0.15 / 4), // 15% of calories from protein
      calories: estimatedCalories,
      carbohydrates: Math.round(estimatedCalories * 0.45 / 4), // 45% from carbs
      fats: Math.round(estimatedCalories * 0.30 / 9), // 30% from fats
      fiber: Math.min(15, Math.max(3, ingredients.length * 2)),
      sugar: Math.round(estimatedCalories * 0.10 / 4), // 10% from sugar
      sodium: Math.min(800, 300 + ingredients.length * 50),
      costEuros: Math.max(1.5, Math.round((ingredients.length * 0.5 + 1) * 100) / 100), // Estimate €0.50 per ingredient + €1 base
    };
  }
}