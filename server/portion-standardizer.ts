// Utility to standardize portion descriptions for consistency

export interface PortionInfo {
  servings: number;
  description: string;
  standardized: string;
}

/**
 * Standardizes portion descriptions to consistent format
 * @param originalPortion - The original portion string
 * @returns Standardized portion string in format "X portion(s)" or "X portion(s) (description)"
 */
export function standardizePortion(originalPortion: string): string {
  if (!originalPortion || originalPortion.trim() === '') {
    return '1 portion';
  }

  const portion = originalPortion.trim().toLowerCase();
  
  // Extract number if present
  const numberMatch = portion.match(/(\d+(?:\.\d+)?)/);
  const number = numberMatch ? parseFloat(numberMatch[1]) : 1;
  
  // Determine serving type and standardize
  if (portion.includes('bowl')) {
    return `${number} portion${number > 1 ? 's' : ''} (bowl)`;
  } else if (portion.includes('cup') && !portion.includes('pancake')) {
    return `${number} portion${number > 1 ? 's' : ''} (cup)`;
  } else if (portion.includes('pancake')) {
    return `${number} portion${number > 1 ? 's' : ''} (${number} pancake${number > 1 ? 's' : ''})`;
  } else if (portion.includes('egg')) {
    const eggCount = portion.includes('3 egg') ? 3 : number;
    return `1 portion (${eggCount} eggs + vegetables)`;
  } else if (portion.includes('large')) {
    return `1 portion (large)`;
  } else if (portion.includes('medium')) {
    return `1 portion (medium)`;
  } else if (portion.includes('small')) {
    return `1 portion (small)`;
  } else if (portion.includes('smoothie')) {
    return `${number} portion${number > 1 ? 's' : ''} (smoothie)`;
  } else if (portion.includes('salad')) {
    return `${number} portion${number > 1 ? 's' : ''} (salad bowl)`;
  } else if (portion.includes('wrap')) {
    return `${number} portion${number > 1 ? 's' : ''} (wrap)`;
  } else if (portion.includes('sandwich')) {
    return `${number} portion${number > 1 ? 's' : ''} (sandwich)`;
  } else if (portion.includes('plate')) {
    return `${number} portion${number > 1 ? 's' : ''} (plate)`;
  }
  
  // Default standardization
  return `${number} portion${number > 1 ? 's' : ''}`;
}

/**
 * Analyzes portion string to extract serving count
 * @param portion - The portion string to analyze
 * @returns Number of servings
 */
export function extractServingCount(portion: string): number {
  if (!portion) return 1;
  
  const numberMatch = portion.match(/(\d+(?:\.\d+)?)/);
  if (numberMatch) {
    const num = parseFloat(numberMatch[1]);
    // For pancakes, if it says "3 pancakes", that's usually 1 serving
    if (portion.toLowerCase().includes('pancake') && num <= 4) {
      return 1;
    }
    // For eggs, "3 eggs" is usually 1 serving
    if (portion.toLowerCase().includes('egg') && num <= 4) {
      return 1;
    }
    return num;
  }
  
  return 1;
}

/**
 * Validates if a portion description follows the standard format
 * @param portion - The portion string to validate
 * @returns True if portion follows standard format
 */
export function isStandardizedPortion(portion: string): boolean {
  if (!portion) return false;
  
  const standardPattern = /^\d+(?:\.\d+)?\s+portion[s]?(\s*\([^)]+\))?$/i;
  return standardPattern.test(portion.trim());
}

/**
 * Gets a user-friendly portion description for display
 * @param portion - The portion string
 * @returns User-friendly description
 */
export function getPortionDisplayText(portion: string): string {
  if (!portion) return '1 portion';
  
  const standardized = standardizePortion(portion);
  
  // Convert back to more readable format for UI - keep portions as is
  return standardized
    .replace(/(\d+)\s+portion[s]?\s*\(([^)]+)\)/i, '$1 $2')
    .replace(/1\s+portion\s*\(([^)]+)\)/i, '$1')
    .replace(/(\d+)\s+portion[s]?$/i, (match, num) => 
      num === '1' ? '1 portion' : `${num} portions`
    );
}