/**
 * Dedicated cache for recipe deletions
 * Handles database timeouts with retry logic and maintains last successful snapshot
 */

import { storage } from './storage.js';

class RecipeDeletionCache {
  private deletedIds: Set<string> = new Set();
  private loadPromise: Promise<Set<string>> | null = null;
  private lastSuccessfulLoad: Date | null = null;
  private retryAttempt = 0;
  private maxRetries = 3;

  /**
   * Load deleted recipe IDs with exponential backoff retry
   */
  async load(): Promise<Set<string>> {
    // Return cached data if we have a recent successful load
    if (this.lastSuccessfulLoad && Date.now() - this.lastSuccessfulLoad.getTime() < 60000) {
      return this.deletedIds;
    }

    // If load is in progress, wait for it
    if (this.loadPromise) {
      return this.loadPromise;
    }

    // Start new load with retry logic
    this.loadPromise = this._loadWithRetry();
    return this.loadPromise;
  }

  private async _loadWithRetry(): Promise<Set<string>> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // Add increasing delay between retries (including initial delay to avoid startup congestion)
        const delay = attempt === 0 ? 2000 : Math.min(2000 * Math.pow(2, attempt - 1), 8000); // 2s, 2s, 4s, 8s
        if (delay > 0) {
          if (attempt === 0) {
            console.log(`⏱️  Delaying deletion load by ${delay}ms to avoid startup database congestion...`);
          } else {
            console.log(`⏱️  Retrying deletion load (attempt ${attempt + 1}/${this.maxRetries + 1}) after ${delay}ms...`);
          }
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const deletions = await storage.getRecipeDeletions();
        this.deletedIds = new Set(deletions);
        this.lastSuccessfulLoad = new Date();
        this.retryAttempt = 0;
        this.loadPromise = null;

        if (deletions.length > 0) {
          console.log(`✅ Deletion cache loaded: ${deletions.length} deleted recipes`);
        } else {
          console.log(`✅ Deletion cache loaded: no deleted recipes`);
        }

        return this.deletedIds;
      } catch (error: any) {
        console.error(`❌ Deletion load attempt ${attempt + 1} failed:`, error?.message || error);
        
        // If this was the last retry, fall back to cached data
        if (attempt === this.maxRetries) {
          console.warn(`⚠️  Using last successful deletion snapshot (${this.deletedIds.size} recipes) from ${this.lastSuccessfulLoad || 'never'}`);
          this.loadPromise = null;
          return this.deletedIds; // Return last known good state
        }
      }
    }

    // Should never reach here, but return cached data as ultimate fallback
    this.loadPromise = null;
    return this.deletedIds;
  }

  /**
   * Invalidate cache and force reload on next access
   */
  invalidate(): void {
    this.loadPromise = null;
    this.lastSuccessfulLoad = null;
    console.log('🔄 Deletion cache invalidated');
  }

  /**
   * Get current cached deletions without triggering reload
   */
  getCached(): Set<string> {
    return this.deletedIds;
  }

  /**
   * Add a deletion to cache immediately (optimistic update)
   */
  addDeletion(recipeId: string): void {
    this.deletedIds.add(recipeId);
  }

  /**
   * Remove a deletion from cache immediately (optimistic update for restore)
   */
  removeDeletion(recipeId: string): void {
    this.deletedIds.delete(recipeId);
  }
}

// Singleton instance
export const recipeDeletionCache = new RecipeDeletionCache();
