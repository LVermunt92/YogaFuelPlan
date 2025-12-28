// Batch translate all untranslated recipes to Dutch
import { db } from './db';
import { recipes } from '@shared/schema';
import { isNull, eq } from 'drizzle-orm';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function translateText(text: string, type: 'recipe-name' | 'ingredient' | 'instruction'): Promise<string> {
  const prompts: Record<string, { system: string; user: string }> = {
    'recipe-name': {
      system: 'You are a native Dutch speaker translating recipe names. Use natural Dutch culinary terminology.',
      user: `Translate to Dutch: "${text}". Only return the translation.`
    },
    'ingredient': {
      system: 'You are a Dutch cooking expert. Translate ingredients as they appear in Dutch recipes.',
      user: `Translate to Dutch: "${text}". Only return the translation.`
    },
    'instruction': {
      system: 'You are a Dutch cookbook author. Translate cooking instructions using proper Dutch imperative forms.',
      user: `Translate to Dutch: "${text}". Only return the translation.`
    }
  };

  const prompt = prompts[type];
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user }
    ],
    max_tokens: 200,
    temperature: 0.3
  });

  return response.choices[0].message.content?.trim().replace(/^["']|["']$/g, '') || text;
}

async function translateRecipe(recipe: any): Promise<boolean> {
  try {
    console.log(`Translating: ${recipe.name}`);
    
    const [dutchName, dutchIngredients, dutchInstructions] = await Promise.all([
      translateText(recipe.name, 'recipe-name'),
      Promise.all((recipe.ingredients || []).map((ing: string) => translateText(ing, 'ingredient'))),
      Promise.all((recipe.instructions || []).map((inst: string) => translateText(inst, 'instruction')))
    ]);

    await db.update(recipes)
      .set({
        dutchName,
        dutchIngredients,
        dutchInstructions,
        updatedAt: new Date()
      })
      .where(eq(recipes.id, recipe.id));

    console.log(`✅ ${recipe.name} → ${dutchName}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Failed: ${recipe.name} - ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('Starting batch translation...\n');
  
  const untranslated = await db.select()
    .from(recipes)
    .where(isNull(recipes.dutchName));

  console.log(`Found ${untranslated.length} untranslated recipes\n`);

  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < untranslated.length; i++) {
    const recipe = untranslated[i];
    const result = await translateRecipe(recipe);
    if (result) success++; else failed++;
    
    // Progress every 20 recipes
    if ((i + 1) % 20 === 0) {
      console.log(`\n--- Progress: ${i + 1}/${untranslated.length} (${success} success, ${failed} failed) ---\n`);
    }
    
    // Delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  console.log(`\n✅ Complete! ${success} translated, ${failed} failed.`);
}

main().catch(console.error);
