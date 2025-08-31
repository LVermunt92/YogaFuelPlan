import OpenAI from "openai";
import { hasAdequateProteinSource, enhanceRecipeWithProtein } from './protein-validator';
import { MealOption } from './nutrition-enhanced';

// Initialize OpenAI - will use environment variable OPENAI_API_KEY
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder' 
});

export interface RecipeGenerationRequest {
  category: 'breakfast' | 'lunch' | 'dinner';
  dietaryTags: string[];
  targetProtein: number;
  prepTimeLimit?: number;
  excludeIngredients?: string[];
  cuisine?: string;
  season?: string;
}

export async function generateRecipeWithAI(request: RecipeGenerationRequest): Promise<MealOption> {
  const prompt = `Generate a healthy ${request.category} recipe that meets these requirements:

DIETARY REQUIREMENTS:
- Must include these dietary tags: ${request.dietaryTags.join(', ')}
- Target protein: ${request.targetProtein}g
- Prep time limit: ${request.prepTimeLimit || 30} minutes
${request.excludeIngredients?.length ? `- Avoid these ingredients: ${request.excludeIngredients.join(', ')}` : ''}
${request.cuisine ? `- Cuisine style: ${request.cuisine}` : ''}
${request.season ? `- Seasonal preference: ${request.season}` : ''}

RECIPE REQUIREMENTS:
- Alcohol-free
- Whole food focused (minimal processing)
- Include complete nutritional information
- Provide detailed cooking instructions
- Include practical tips
- Calculate realistic European pricing
- CRITICAL: Use ONLY metric measurements (grams for dry ingredients, milliliters for liquids, kilograms for large amounts). NEVER use cups, tablespoons, teaspoons, ounces, or pounds. Examples: "120g oats", "240ml milk", "15ml olive oil", "5ml vanilla", "2.5ml salt"
- IMPORTANT: Include a sauce or topping that makes the dish feel more indulgent or satisfying while remaining healthy and made from whole foods (examples: roasted pepper sauce with tomato paste and nuts, tahini-based dressings, herb-infused oils, nut-based creams, or vegetable-based salsas)
- MANDATORY PROTEIN REQUIREMENT: Every recipe MUST include adequate protein sources to meet the target protein goal. Include at least one high-quality protein source such as:
  * For plant-based: lentils, chickpeas, tofu, tempeh, hemp hearts, nuts, protein powder, quinoa
  * For vegetarian: Greek yogurt, cottage cheese, eggs, or plant proteins  
  * For non-vegetarian: chicken, fish, or plant proteins
  The recipe must realistically provide the target protein amount through these ingredients. IMPORTANT: Be specific about protein amounts (e.g., "200g firm tofu", "120g cooked lentils", "30g hemp hearts") to ensure protein targets are met.

RESPONSE FORMAT:
Return a JSON object matching this exact structure:

{
  "name": "Recipe name (descriptive and appetizing)",
  "portion": "Serving size description",
  "nutrition": {
    "protein": ${request.targetProtein},
    "prepTime": number (≤${request.prepTimeLimit || 30}),
    "calories": number,
    "carbohydrates": number,
    "fats": number,
    "fiber": number,
    "sugar": number,
    "sodium": number,
    "potassium": number,
    "calcium": number,
    "iron": number,
    "vitaminC": number,
    "costEuros": number,
    "proteinPerEuro": number
  },
  "category": "${request.category}",
  "tags": [${request.dietaryTags.map(tag => `"${tag}"`).join(', ')}],
  "ingredients": ["ingredient 1", "ingredient 2", "..."],
  "wholeFoodLevel": "high|moderate|minimal",
  "vegetableContent": {
    "servings": number,
    "vegetables": ["vegetable1", "vegetable2"],
    "benefits": ["benefit1", "benefit2", "benefit3"]
  },
  "recipe": {
    "instructions": ["step 1", "step 2", "..."],
    "tips": ["tip 1", "tip 2"],
    "notes": "Additional information about the recipe"
  }
}

Ensure the recipe is practical, nutritious, and aligns with the dietary requirements specified.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a professional nutritionist and chef specializing in healthy, whole-food recipes. Generate recipes that are practical, nutritious, and delicious."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8 // Allow some creativity in recipe generation
    });

    const generatedRecipe = JSON.parse(response.choices[0].message.content || '{}');
    
    // Validate and ensure the recipe meets requirements
    if (!generatedRecipe.name || !generatedRecipe.ingredients || !generatedRecipe.recipe?.instructions) {
      throw new Error('Generated recipe is incomplete');
    }

    // Ensure dietary tags are properly included
    // (AI-generated tag removed per user request)

    // Validate protein target is met (within 15% tolerance)
    const proteinDiff = Math.abs(generatedRecipe.nutrition.protein - request.targetProtein);
    if (proteinDiff > request.targetProtein * 0.15) {
      console.warn(`Generated recipe protein (${generatedRecipe.nutrition.protein}g) differs significantly from target (${request.targetProtein}g)`);
    }

    // Validate protein content and enhance if needed
    const { hasProtein, estimatedProtein, suggestions } = hasAdequateProteinSource(
      generatedRecipe.ingredients,
      request.targetProtein
    );
    
    if (!hasProtein) {
      console.log(`⚠️ AI recipe "${generatedRecipe.name}" has insufficient protein (${estimatedProtein}g < ${request.targetProtein}g). Enhancing...`);
      
      const enhancement = enhanceRecipeWithProtein(
        generatedRecipe.name,
        generatedRecipe.ingredients,
        request.dietaryTags,
        request.targetProtein
      );
      
      if (enhancement.addedProteins.length > 0) {
        generatedRecipe.ingredients = enhancement.enhancedIngredients;
        generatedRecipe.nutrition.protein = Math.max(
          generatedRecipe.nutrition.protein,
          generatedRecipe.nutrition.protein + enhancement.proteinIncrease
        );
        console.log(`✅ Enhanced recipe with ${enhancement.addedProteins.map(p => p.name).join(', ')} (+${enhancement.proteinIncrease}g protein)`);
      }
    }
    
    console.log(`✨ AI generated recipe: "${generatedRecipe.name}" (${generatedRecipe.nutrition.protein}g protein, ${generatedRecipe.nutrition.prepTime}min)`);
    
    return generatedRecipe as MealOption;
    
  } catch (error) {
    console.error('Failed to generate recipe with AI:', error);
    
    // Return a fallback recipe to ensure meal planning doesn't break
    return createFallbackRecipe(request);
  }
}

function createFallbackRecipe(request: RecipeGenerationRequest): MealOption {
  const fallbackRecipes = {
    breakfast: {
      name: "Simple protein-rich breakfast bowl",
      ingredients: ["Greek yogurt", "mixed berries", "nuts", "honey"],
      instructions: ["Mix Greek yogurt with berries", "Top with nuts and honey", "Serve immediately"]
    },
    lunch: {
      name: "Quick protein salad",
      ingredients: ["mixed greens", "chickpeas", "vegetables", "olive oil", "lemon"],
      instructions: ["Combine greens and chickpeas", "Add chopped vegetables", "Dress with olive oil and lemon"]
    },
    dinner: {
      name: "Simple protein bowl",
      ingredients: ["quinoa", "beans", "vegetables", "herbs"],
      instructions: ["Cook quinoa", "Add beans and vegetables", "Season with herbs"]
    }
  };

  const base = fallbackRecipes[request.category];
  
  return {
    name: base.name,
    portion: "1 serving",
    nutrition: {
      protein: request.targetProtein,
      prepTime: Math.min(request.prepTimeLimit || 30, 20),
      calories: request.targetProtein * 4 + 200,
      carbohydrates: 25,
      fats: 12,
      fiber: 8,
      sugar: 6,
      sodium: 300,
      potassium: 400,
      calcium: 80,
      iron: 3,
      vitaminC: 15,
      costEuros: 3.50,
      proteinPerEuro: request.targetProtein / 3.50
    },
    category: request.category,
    tags: [...request.dietaryTags, 'fallback'],
    ingredients: base.ingredients,
    wholeFoodLevel: "moderate" as const,
    vegetableContent: {
      servings: 1,
      vegetables: ["mixed vegetables"],
      benefits: ["Balanced nutrition", "Quick preparation"]
    },
    recipe: {
      instructions: base.instructions,
      tips: ["This is a fallback recipe", "Customize with available ingredients"],
      notes: "Generated automatically when AI recipe generation is unavailable"
    }
  };
}

// Function to batch generate multiple recipes
export async function generateMultipleRecipes(
  requests: RecipeGenerationRequest[]
): Promise<MealOption[]> {
  const recipes: MealOption[] = [];
  
  for (const request of requests) {
    try {
      const recipe = await generateRecipeWithAI(request);
      recipes.push(recipe);
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to generate recipe for ${request.category} with tags ${request.dietaryTags.join(', ')}:`, error);
      // Continue with next recipe rather than failing completely
    }
  }
  
  return recipes;
}

export default {
  generateRecipeWithAI,
  generateMultipleRecipes,
  createFallbackRecipe
};