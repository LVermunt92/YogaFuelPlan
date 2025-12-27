// AI-Enhanced Recipe Translation System
// Uses OpenAI for natural Dutch translation when available
// Falls back to pattern-based translation when AI is unavailable
// Saves translations to database for permanent caching

import { translateRecipe as patternTranslateRecipe } from './recipe-translator';
import { db } from './db';
import { recipes } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface EnhancedTranslationOptions {
  preserveNutrition?: boolean;
  targetAudience?: 'home-cook' | 'professional' | 'beginner';
  style?: 'casual' | 'formal' | 'instructional';
}

// In-memory translation cache using recipe IDs
const translationCache = new Map<string, any>();

// Generate cache key from recipe ID and language
function getCacheKey(recipeId: string | undefined, language: string): string | null {
  if (!recipeId) return null;
  return `${recipeId}-${language}`;
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
        systemPrompt = `You are a native Dutch speaker and professional cookbook translator specializing in Dutch cuisine. Translate recipe names to authentic, appetizing Dutch that feels natural to Netherlands home cooks. Use proper Dutch culinary terminology and maintain regional dish names (e.g., "curry" stays "curry", "pasta" stays "pasta"). Avoid overly literal translations - prioritize what sounds natural and appealing in Dutch.`;
        userPrompt = `Translate this recipe name to natural Dutch: "${text}"

Examples of good translations:
- "Greek yogurt protein power bowl" → "Griekse yoghurt proteïne bowl" 
- "Mediterranean quinoa salad" → "Mediterrane quinoasalade"
- "Spicy chickpea curry" → "Pittige kikkererwtencurry"

Only return the translated name, nothing else.`;
        break;

      case 'ingredient':
        systemPrompt = `You are a native Dutch speaker and cooking expert familiar with Netherlands grocery stores and culinary traditions. Translate ingredients to exactly how they appear in Dutch recipes and Albert Heijn grocery stores. Use proper Dutch measurements (gram, ml, liter, eetlepel, theelepel). Include preparation methods in natural Dutch.`;
        userPrompt = `Translate this ingredient to Dutch grocery/recipe terminology: "${text}"

Use Dutch cooking terminology as found in Netherlands supermarkets:
- "cottage cheese" → "hüttenkäse" 
- "Greek yogurt" → "Griekse yoghurt"
- "2 tbsp olive oil" → "2 eetlepels olijfolie"
- "1 cup diced tomatoes" → "200g tomaten, in blokjes"
- "fresh basil leaves" → "verse basilicumblaadjes"

Only return the translated ingredient, nothing else.`;
        break;

      case 'instruction':
        systemPrompt = `You are a native Dutch cookbook author writing for Netherlands home cooks. Translate cooking instructions to clear, actionable Dutch using proper imperative forms and cooking verbs commonly used in Dutch recipes. Make instructions flow naturally and be easy to follow.`;
        userPrompt = `Translate this cooking instruction to natural Dutch: "${text}"

Use proper Dutch cooking verbs and imperative mood:
- "Heat oil in a pan" → "Verhit de olie in een pan"
- "Add garlic and sauté" → "Voeg de knoflook toe en bak aan"
- "Season with salt and pepper" → "Breng op smaak met zout en peper"
- "Simmer for 10 minutes" → "Laat 10 minuten sudderen"

Only return the translated instruction, nothing else.`;
        break;

      case 'tip':
        systemPrompt = `You are a Dutch cooking instructor giving friendly advice to home cooks in the Netherlands. Translate cooking tips to warm, helpful Dutch using the informal tone typical of Dutch cooking advice. Use "je" form and practical language.`;
        userPrompt = `Translate this cooking tip to natural, friendly Dutch: "${text}"

Use warm, practical Dutch cooking advice style:
- "Make sure to..." → "Zorg ervoor dat je..."
- "For best results..." → "Voor het beste resultaat..."
- "This works well with..." → "Dit smaakt heerlijk bij..."

Only return the translated tip, nothing else.`;
        break;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 200,
      temperature: 0.3  // Lower temperature for more consistent translations
    });

    // Remove any quotes that GPT might add around the translation
    const translated = response.choices[0].message.content?.trim() || text;
    return translated.replace(/^["']|["']$/g, '');
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

// Save Dutch translation to database
async function saveDutchTranslationToDb(
  recipeId: string,
  dutchName: string,
  dutchIngredients: string[],
  dutchInstructions: string[]
): Promise<void> {
  try {
    await db.update(recipes)
      .set({
        dutchName,
        dutchIngredients,
        dutchInstructions,
        updatedAt: new Date()
      })
      .where(eq(recipes.id, recipeId));
    console.log(`💾 Saved Dutch translation to database for recipe ID: ${recipeId}`);
  } catch (error) {
    console.error(`Failed to save Dutch translation for recipe ${recipeId}:`, error);
  }
}

// Load Dutch translation from database
async function loadDutchTranslationFromDb(recipeId: string): Promise<{
  dutchName: string | null;
  dutchIngredients: string[] | null;
  dutchInstructions: string[] | null;
} | null> {
  try {
    const result = await db.select({
      dutchName: recipes.dutchName,
      dutchIngredients: recipes.dutchIngredients,
      dutchInstructions: recipes.dutchInstructions
    })
    .from(recipes)
    .where(eq(recipes.id, recipeId))
    .limit(1);
    
    if (result.length > 0 && result[0].dutchName) {
      return result[0];
    }
    return null;
  } catch (error) {
    console.error(`Failed to load Dutch translation for recipe ${recipeId}:`, error);
    return null;
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

  // Warn if recipe ID is missing (caching will not work)
  if (!recipe.id) {
    console.warn('⚠️ Recipe translation called without ID - caching disabled for:', recipe.name);
  }

  // First check database for saved translation
  if (recipe.id) {
    const dbTranslation = await loadDutchTranslationFromDb(recipe.id.toString());
    if (dbTranslation && dbTranslation.dutchName) {
      console.log(`✅ Using database translation for recipe ID: ${recipe.id}`);
      return {
        ...recipe,
        name: dbTranslation.dutchName,
        ingredients: dbTranslation.dutchIngredients || recipe.ingredients,
        instructions: dbTranslation.dutchInstructions || recipe.instructions,
        translationMethod: 'database-cached'
      };
    }
  }

  // Check in-memory cache second
  const cacheKey = getCacheKey(recipe.id, language);
  if (cacheKey && translationCache.has(cacheKey)) {
    const cached = translationCache.get(cacheKey);
    // Only use cached version if it has content OR if the current request also has no content (name-only)
    const cachedHasContent = cached.ingredients?.length > 0 && cached.instructions?.length > 0;
    const requestHasContent = recipe.ingredients?.length > 0 && recipe.instructions?.length > 0;
    
    if (cachedHasContent || !requestHasContent) {
      console.log(`✅ Using memory cache translation for recipe ID: ${recipe.id}`);
      return cached;
    } else {
      console.log(`⚠️ Cache has empty content but request has content - re-translating ${recipe.id}`);
    }
  }

  // Try AI translation first if available
  if (isOpenAIAvailable()) {
    try {
      console.log(`🔄 Translating recipe ID: ${recipe.id} - ${recipe.name}`);
      
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

      const translatedRecipe = {
        ...recipe,
        name: translatedName,
        ingredients: translatedIngredients,
        instructions: translatedInstructions,
        tips: translatedTips,
        notes: recipe.notes || [],
        translationMethod: 'ai-enhanced'
      };

      // Save to database for permanent caching (only if we have content)
      const hasContent = translatedIngredients.length > 0 && translatedInstructions.length > 0;
      if (recipe.id && hasContent) {
        await saveDutchTranslationToDb(
          recipe.id.toString(),
          translatedName,
          translatedIngredients,
          translatedInstructions
        );
        // Also cache in memory
        if (cacheKey) {
          translationCache.set(cacheKey, translatedRecipe);
        }
      } else if (recipe.id && !hasContent) {
        console.log(`⚠️ Skipping save for ${recipe.id} - no ingredients/instructions (name-only translation)`);
      }

      return translatedRecipe;
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