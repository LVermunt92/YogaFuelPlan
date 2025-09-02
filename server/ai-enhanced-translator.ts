// AI-Enhanced Recipe Translation System
// Uses OpenAI for natural Dutch translation when available
// Falls back to pattern-based translation when AI is unavailable

import { translateRecipe as patternTranslateRecipe } from './recipe-translator';

interface EnhancedTranslationOptions {
  preserveNutrition?: boolean;
  targetAudience?: 'home-cook' | 'professional' | 'beginner';
  style?: 'casual' | 'formal' | 'instructional';
}

// Check if OpenAI is available
function isOpenAIAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

// AI-powered translation using OpenAI
async function translateWithAI(
  text: string, 
  type: 'recipe-name' | 'ingredient' | 'instruction' | 'tip',
  options: EnhancedTranslationOptions = {}
): Promise<string> {
  if (!isOpenAIAvailable()) {
    throw new Error('OpenAI API key not available');
  }

  try {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    let systemPrompt = '';
    let userPrompt = '';

    switch (type) {
      case 'recipe-name':
        systemPrompt = `You are a professional Dutch recipe translator. Translate recipe names to natural, appealing Dutch that home cooks would recognize. Keep it concise and appetizing. Maintain any cultural dish names where appropriate.`;
        userPrompt = `Translate this recipe name to Dutch: "${text}"

Only return the translated name, nothing else.`;
        break;

      case 'ingredient':
        systemPrompt = `You are a Dutch cooking expert. Translate ingredient descriptions to natural Dutch as used in Netherlands recipes. Include quantities and preparation methods. Use metric measurements (grams, ml, liters).`;
        userPrompt = `Translate this ingredient to Dutch: "${text}"

Use proper Dutch cooking terminology and metric measurements. Only return the translated ingredient, nothing else.`;
        break;

      case 'instruction':
        systemPrompt = `You are a Dutch cookbook author. Translate cooking instructions to clear, natural Dutch as used in Netherlands cookbooks. Use imperative mood and proper cooking verbs. Make instructions easy to follow for home cooks.`;
        userPrompt = `Translate this cooking instruction to Dutch: "${text}"

Use natural Dutch cooking language that Netherlands home cooks would understand. Only return the translated instruction, nothing else.`;
        break;

      case 'tip':
        systemPrompt = `You are a Dutch cooking teacher. Translate cooking tips to helpful, natural Dutch advice. Use friendly, instructional tone appropriate for home cooks.`;
        userPrompt = `Translate this cooking tip to Dutch: "${text}"

Use warm, helpful Dutch language for home cooking advice. Only return the translated tip, nothing else.`;
        break;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 200,
      temperature: 0.3 // Lower temperature for more consistent translations
    });

    return response.choices[0].message.content?.trim() || text;
  } catch (error: any) {
    console.error('AI translation error:', error);
    
    // Handle quota errors gracefully
    if (error.status === 429 || error.code === 'insufficient_quota') {
      console.warn('OpenAI quota exceeded, falling back to original text');
      return text; // Return original text instead of crashing
    }
    
    throw error;
  }
}

// Enhanced recipe translation with AI fallback
export async function translateRecipeEnhanced(
  recipe: any, 
  language: 'en' | 'nl',
  options: EnhancedTranslationOptions = {}
): Promise<any> {
  if (language === 'en') {
    return recipe;
  }

  // Try AI translation first if available
  if (isOpenAIAvailable()) {
    try {
      console.log('Using AI-enhanced translation for recipe:', recipe.name);
      
      const [translatedName, translatedIngredients, translatedInstructions, translatedTips] = await Promise.all([
        translateWithAI(recipe.name, 'recipe-name', options),
        Promise.all((recipe.ingredients || []).map((ing: string) => 
          translateWithAI(ing, 'ingredient', options)
        )),
        Promise.all((recipe.instructions || []).map((inst: string) => 
          translateWithAI(inst, 'instruction', options)
        )),
        Promise.all((recipe.tips || []).map((tip: string) => 
          translateWithAI(tip, 'tip', options)
        ))
      ]);

      return {
        ...recipe,
        name: translatedName,
        ingredients: translatedIngredients,
        instructions: translatedInstructions,
        tips: translatedTips,
        notes: recipe.notes || [],
        translationMethod: 'ai-enhanced'
      };
    } catch (error: any) {
      if (error.status === 429 || error.code === 'insufficient_quota') {
        console.warn('OpenAI quota exceeded during recipe translation, falling back to pattern-based translation');
      } else {
        console.warn('AI translation failed, falling back to pattern-based:', error instanceof Error ? error.message : String(error));
      }
    }
  }

  // Fallback to pattern-based translation
  console.log('Using pattern-based translation for recipe:', recipe.name);
  const result = patternTranslateRecipe(recipe, language);
  return {
    ...result,
    translationMethod: 'pattern-based'
  };
}

// Batch translate multiple recipes
export async function translateRecipeBatch(
  recipes: any[],
  language: 'en' | 'nl',
  options: EnhancedTranslationOptions = {}
): Promise<any[]> {
  const batchSize = 5; // Process in smaller batches to avoid rate limits
  const results = [];

  for (let i = 0; i < recipes.length; i += batchSize) {
    const batch = recipes.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(recipe => translateRecipeEnhanced(recipe, language, options))
    );
    results.push(...batchResults);
    
    // Small delay between batches to respect rate limits
    if (i + batchSize < recipes.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}

// Get translation status
export function getTranslationStatus(): {
  aiAvailable: boolean;
  method: 'ai-enhanced' | 'pattern-based';
  capabilities: string[];
} {
  const aiAvailable = isOpenAIAvailable();
  
  return {
    aiAvailable,
    method: aiAvailable ? 'ai-enhanced' : 'pattern-based',
    capabilities: aiAvailable 
      ? ['Natural language translation', 'Context-aware conversion', 'Cultural adaptation', 'Metric conversion']
      : ['Pattern-based translation', 'Basic word substitution', 'Metric conversion']
  };
}