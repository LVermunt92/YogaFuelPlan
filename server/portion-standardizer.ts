// Utility to standardize portion descriptions for consistency

export interface PortionInfo {
  servings: number;
  description: string;
  standardized: string;
}

/**
 * Standardizes portion descriptions to consistent format
 * @param originalPortion - The original portion string
 * @returns Standardized portion string in format "X serving(s)" (no brackets)
 */
export function standardizePortion(originalPortion: string): string {
  if (!originalPortion || originalPortion.trim() === '') {
    return '1 serving';
  }

  const portion = originalPortion.trim().toLowerCase();
  
  // Extract number if present
  const numberMatch = portion.match(/(\d+(?:\.\d+)?)/);
  const number = numberMatch ? parseFloat(numberMatch[1]) : 1;
  
  // For complex portions with multiple servings (like "1.5 cups curry + 1 cup rice")
  // convert to appropriate serving count
  if (portion.includes('1.5') || (portion.includes('+') && number >= 1.5)) {
    return '2 servings';
  }
  
  // Default standardization - just number + serving(s)
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
 * @returns True if portion follows standard format (just number + serving(s))
 */
export function isStandardizedPortion(portion: string): boolean {
  if (!portion) return false;
  
  const standardPattern = /^\d+(?:\.\d+)?\s+serving[s]?$/i;
  return standardPattern.test(portion.trim());
}

/**
 * Gets a user-friendly portion description for display
 * @param portion - The portion string
 * @returns User-friendly description (just number + serving(s))
 */
export function getPortionDisplayText(portion: string): string {
  if (!portion) return '1 serving';
  
  const standardized = standardizePortion(portion);
  
  // Return standardized format directly (no brackets)
  return standardized;
}