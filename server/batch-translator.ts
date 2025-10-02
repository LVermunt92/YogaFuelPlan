import { storage } from './storage';
import { translateRecipeEnhanced } from './ai-enhanced-translator';
import { getCompleteEnhancedMealDatabase, type MealOption } from './nutrition-enhanced';

interface TranslationJob {
  recipeId: number;
  recipe: MealOption;
  language: 'en' | 'nl';
  retryCount: number;
}

interface TranslationResult {
  recipeId: number;
  success: boolean;
  error?: string;
}

export class BatchTranslator {
  private queue: TranslationJob[] = [];
  private isProcessing = false;
  private readonly MAX_RETRIES = 3;
  private readonly THROTTLE_MS = 2000; // 2 seconds between API calls
  private readonly BATCH_SIZE = 5; // Process 5 at a time before pausing

  async translateRecipes(
    recipeIds: number[], 
    language: 'en' | 'nl' = 'nl'
  ): Promise<TranslationResult[]> {
    console.log(`🚀 Starting batch translation for ${recipeIds.length} recipes to ${language}`);
    
    const allRecipes = await getCompleteEnhancedMealDatabase();
    const recipeMap = new Map(allRecipes.map((r: MealOption) => [r.id, r]));
    
    // Create translation jobs
    const jobs: TranslationJob[] = recipeIds
      .map(id => {
        const recipe = recipeMap.get(id);
        return recipe ? {
          recipeId: id,
          recipe,
          language,
          retryCount: 0
        } : null;
      })
      .filter((job): job is TranslationJob => job !== null); // Only include recipes that exist
    
    this.queue.push(...jobs);
    
    if (!this.isProcessing) {
      return this.processQueue();
    }
    
    return [];
  }

  private async processQueue(): Promise<TranslationResult[]> {
    this.isProcessing = true;
    const results: TranslationResult[] = [];
    let processedCount = 0;

    while (this.queue.length > 0) {
      const job = this.queue.shift()!;
      
      try {
        console.log(`📝 Translating (${processedCount + 1}/${processedCount + this.queue.length + 1}): ${job.recipe.name} to ${job.language}`);
        
        // Check if translation already exists
        const existing = await storage.getRecipeTranslation(job.recipeId, job.language);
        if (existing) {
          console.log(`✓ Translation already exists for ${job.recipeId}`);
          results.push({ recipeId: job.recipeId, success: true });
          processedCount++;
          continue;
        }

        // Translate the recipe
        const translated = await translateRecipeEnhanced(job.recipe, job.language);
        
        // Save translation to database
        await storage.upsertRecipeTranslation({
          recipeId: job.recipeId,
          language: job.language,
          name: translated.name,
          ingredients: translated.ingredients,
          instructions: translated.instructions || [],
          tips: translated.tips || [],
          notes: translated.notes || []
        });

        console.log(`✓ Successfully translated: ${job.recipe.name} → ${translated.name}`);
        results.push({ recipeId: job.recipeId, success: true });
        processedCount++;

        // Throttle API calls
        if (processedCount % this.BATCH_SIZE === 0) {
          console.log(`⏸️  Pausing for ${this.THROTTLE_MS}ms after ${this.BATCH_SIZE} translations...`);
          await this.sleep(this.THROTTLE_MS);
        } else {
          // Small delay between individual calls
          await this.sleep(500);
        }

      } catch (error) {
        console.error(`❌ Translation failed for ${job.recipeId}:`, error);
        
        // Retry logic
        if (job.retryCount < this.MAX_RETRIES) {
          job.retryCount++;
          console.log(`🔄 Retrying ${job.recipeId} (attempt ${job.retryCount}/${this.MAX_RETRIES})`);
          this.queue.push(job); // Add back to queue for retry
        } else {
          results.push({ 
            recipeId: job.recipeId, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    this.isProcessing = false;
    console.log(`✅ Batch translation complete. Success: ${results.filter(r => r.success).length}, Failed: ${results.filter(r => !r.success).length}`);
    
    return results;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isRunning(): boolean {
    return this.isProcessing;
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}

// Export singleton instance
export const batchTranslator = new BatchTranslator();
