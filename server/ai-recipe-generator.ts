import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface AIRecipe {
  name: string;
  portion: string;
  ingredients: string[];
  instructions: string[];
  tips: string[];
  notes: string;
  prepTime: number;
  nutrition: {
    protein: number;
    calories: number;
    carbohydrates: number;
    fats: number;
    fiber: number;
    sugar: number;
    sodium: number;
  };
}

export async function generateRecipeWithAI(
  mealName: string, 
  dietaryTags: string[] = [],
  mealType: 'breakfast' | 'lunch' | 'dinner' = 'dinner'
): Promise<AIRecipe> {
  try {
    const dietaryRestrictions = dietaryTags.length > 0 ? 
      `Must be ${dietaryTags.join(', ')}. ` : '';
    
    const prompt = `Create a detailed recipe for "${mealName}" that is perfect for ${mealType}. 
${dietaryRestrictions}
The recipe should be nutritious, practical for home cooking, and include accurate nutritional information.

Please provide the response in JSON format with the following structure:
{
  "name": "${mealName}",
  "portion": "serving size description",
  "ingredients": ["ingredient 1 with amount", "ingredient 2 with amount"],
  "instructions": ["step 1", "step 2", "step 3"],
  "tips": ["helpful tip 1", "helpful tip 2"],
  "notes": "additional information about the recipe",
  "prepTime": 30,
  "nutrition": {
    "protein": 25,
    "calories": 400,
    "carbohydrates": 45,
    "fats": 15,
    "fiber": 8,
    "sugar": 12,
    "sodium": 350
  }
}

Make sure the recipe is realistic, the ingredients are commonly available, and the nutritional values are accurate for the portion size.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional nutritionist and chef who creates healthy, practical recipes with accurate nutritional information. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const recipeData = JSON.parse(response.choices[0].message.content);
    
    return {
      name: recipeData.name || mealName,
      portion: recipeData.portion || "1 serving",
      ingredients: recipeData.ingredients || [],
      instructions: recipeData.instructions || [],
      tips: recipeData.tips || [],
      notes: recipeData.notes || "",
      prepTime: recipeData.prepTime || 30,
      nutrition: {
        protein: recipeData.nutrition?.protein || 20,
        calories: recipeData.nutrition?.calories || 400,
        carbohydrates: recipeData.nutrition?.carbohydrates || 40,
        fats: recipeData.nutrition?.fats || 15,
        fiber: recipeData.nutrition?.fiber || 8,
        sugar: recipeData.nutrition?.sugar || 10,
        sodium: recipeData.nutrition?.sodium || 300,
      }
    };
  } catch (error) {
    console.error("Error generating recipe with AI:", error);
    
    // Fallback recipe structure
    return {
      name: mealName,
      portion: "1 serving",
      ingredients: ["Check recipe database for ingredients"],
      instructions: ["Recipe generation temporarily unavailable", "Please try again later"],
      tips: ["Contact support if this error persists"],
      notes: "This is a placeholder recipe. AI generation failed.",
      prepTime: 30,
      nutrition: {
        protein: 20,
        calories: 400,
        carbohydrates: 40,
        fats: 15,
        fiber: 8,
        sugar: 10,
        sodium: 300,
      }
    };
  }
}

export async function enhanceExistingRecipe(
  existingRecipe: any,
  dietaryTags: string[] = []
): Promise<AIRecipe> {
  try {
    const dietaryRestrictions = dietaryTags.length > 0 ? 
      `The recipe must be ${dietaryTags.join(', ')}. ` : '';
    
    const prompt = `Enhance and complete this existing recipe with any missing details:

Current recipe: ${JSON.stringify(existingRecipe, null, 2)}

${dietaryRestrictions}
Please provide a complete, enhanced version with detailed instructions, practical tips, and accurate nutritional information.

Return the response in JSON format with this exact structure:
{
  "name": "recipe name",
  "portion": "serving size description", 
  "ingredients": ["ingredient with precise amounts"],
  "instructions": ["detailed step-by-step instructions"],
  "tips": ["practical cooking tips"],
  "notes": "additional helpful information",
  "prepTime": 30,
  "nutrition": {
    "protein": 25,
    "calories": 400,
    "carbohydrates": 45,
    "fats": 15,
    "fiber": 8,
    "sugar": 12,
    "sodium": 350
  }
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional chef and nutritionist who enhances recipes with detailed instructions and accurate nutritional data. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const enhancedData = JSON.parse(response.choices[0].message.content);
    
    return {
      name: enhancedData.name || existingRecipe.name,
      portion: enhancedData.portion || existingRecipe.portion,
      ingredients: enhancedData.ingredients || existingRecipe.ingredients || [],
      instructions: enhancedData.instructions || existingRecipe.recipe?.instructions || [],
      tips: enhancedData.tips || existingRecipe.recipe?.tips || [],
      notes: enhancedData.notes || existingRecipe.recipe?.notes || "",
      prepTime: enhancedData.prepTime || existingRecipe.nutrition?.prepTime || 30,
      nutrition: {
        protein: enhancedData.nutrition?.protein || existingRecipe.nutrition?.protein || 20,
        calories: enhancedData.nutrition?.calories || existingRecipe.nutrition?.calories || 400,
        carbohydrates: enhancedData.nutrition?.carbohydrates || existingRecipe.nutrition?.carbohydrates || 40,
        fats: enhancedData.nutrition?.fats || existingRecipe.nutrition?.fats || 15,
        fiber: enhancedData.nutrition?.fiber || existingRecipe.nutrition?.fiber || 8,
        sugar: enhancedData.nutrition?.sugar || existingRecipe.nutrition?.sugar || 10,
        sodium: enhancedData.nutrition?.sodium || existingRecipe.nutrition?.sodium || 300,
      }
    };
  } catch (error) {
    console.error("Error enhancing recipe with AI:", error);
    
    // Return the original recipe with fallback enhancements
    return {
      name: existingRecipe.name || "Recipe",
      portion: existingRecipe.portion || "1 serving", 
      ingredients: existingRecipe.ingredients || ["Ingredients not available"],
      instructions: existingRecipe.recipe?.instructions || ["Instructions temporarily unavailable"],
      tips: existingRecipe.recipe?.tips || ["Tips not available"],
      notes: existingRecipe.recipe?.notes || "Recipe enhancement failed",
      prepTime: existingRecipe.nutrition?.prepTime || 30,
      nutrition: {
        protein: existingRecipe.nutrition?.protein || 20,
        calories: existingRecipe.nutrition?.calories || 400,
        carbohydrates: existingRecipe.nutrition?.carbohydrates || 40,
        fats: existingRecipe.nutrition?.fats || 15,
        fiber: existingRecipe.nutrition?.fiber || 8,
        sugar: existingRecipe.nutrition?.sugar || 10,
        sodium: existingRecipe.nutrition?.sodium || 300,
      }
    };
  }
}