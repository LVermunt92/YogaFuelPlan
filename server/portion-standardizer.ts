// Utility to standardize portion descriptions for consistency

export interface PortionInfo {
  servings: number;
  description: string;
  standardized: string;
}

/**
 * Standardizes portion descriptions to consistent format
 * @param originalPortion - The original portion string
 * @returns Standardized portion string in format "X serving(s)" or "X serving(s) (description)"
 */
export function standardizePortion(originalPortion: string): string {
  if (!originalPortion || originalPortion.trim() === '') {
    return '1 serving';
  }

  const portion = originalPortion.trim().toLowerCase();
  
  // Extract number if present
  const numberMatch = portion.match(/(\d+(?:\.\d+)?)/);
  const number = numberMatch ? parseFloat(numberMatch[1]) : 1;
  
  // Determine serving type and standardize
  if (portion.includes('bowl')) {
    return `${number} serving${number > 1 ? 's' : ''} (bowl)`;
  } else if (portion.includes('cup') && !portion.includes('pancake')) {
    return `${number} serving${number > 1 ? 's' : ''} (cup)`;
  } else if (portion.includes('pancake')) {
    return `${number} serving${number > 1 ? 's' : ''} (${number} pancake${number > 1 ? 's' : ''})`;
  } else if (portion.includes('egg')) {
    const eggCount = portion.includes('3 egg') ? 3 : number;
    return `1 serving (${eggCount} eggs + vegetables)`;
  } else if (portion.includes('large')) {
    return `1 serving (large)`;
  } else if (portion.includes('medium')) {
    return `1 serving (medium)`;
  } else if (portion.includes('small')) {
    return `1 serving (small)`;
  } else if (portion.includes('smoothie')) {
    return `${number} serving${number > 1 ? 's' : ''} (smoothie)`;
  } else if (portion.includes('salad')) {
    return `${number} serving${number > 1 ? 's' : ''} (salad bowl)`;
  } else if (portion.includes('wrap')) {
    return `${number} serving${number > 1 ? 's' : ''} (wrap)`;
  } else if (portion.includes('sandwich')) {
    return `${number} serving${number > 1 ? 's' : ''} (sandwich)`;
  } else if (portion.includes('plate')) {
    return `${number} serving${number > 1 ? 's' : ''} (plate)`;
  }
  
  // Default standardization
  return `${number} serving${number > 1 ? 's' : ''}`;
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
  
  const standardPattern = /^\d+(?:\.\d+)?\s+serving[s]?(\s*\([^)]+\))?$/i;
  return standardPattern.test(portion.trim());
}

/**
 * Gets a user-friendly portion description for display
 * @param portion - The portion string
 * @returns User-friendly description
 */
export function getPortionDisplayText(portion: string): string {
  if (!portion) return '1 serving';
  
  const standardized = standardizePortion(portion);
  
  // Convert back to more readable format for UI
  return standardized
    .replace(/(\d+)\s+serving[s]?\s*\(([^)]+)\)/i, '$1 $2')
    .replace(/1\s+serving\s*\(([^)]+)\)/i, '$1')
    .replace(/(\d+)\s+serving[s]?$/i, (match, num) => 
      num === '1' ? '1 serving' : `${num} servings`
    );
}