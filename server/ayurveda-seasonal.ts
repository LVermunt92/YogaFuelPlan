// Ayurvedic seasonal system for meal planning
// Based on traditional 6-season Ayurvedic calendar (Ritu)

export type AyurvedicSeason = 'shishira' | 'vasanta' | 'grishma' | 'varsha' | 'sharad' | 'hemanta';

export interface SeasonalGuidance {
  season: AyurvedicSeason;
  dominantDosha: 'vata' | 'pitta' | 'kapha';
  qualities: string[];
  recommendedTastes: string[];
  ingredientsToFavor: string[];
  ingredientsToAvoid: string[];
  cookingMethods: string[];
  spicesForBalance: string[];
}

/**
 * Determine current Ayurvedic season based on date
 * Northern hemisphere calendar adapted for modern use
 */
export function getCurrentAyurvedicSeason(date: Date = new Date()): AyurvedicSeason {
  const month = date.getMonth() + 1; // 1-12
  
  if (month >= 12 || month <= 1) return 'shishira'; // Late Winter (Dec-Jan)
  if (month >= 2 && month <= 3) return 'vasanta';   // Spring (Feb-Mar)
  if (month >= 4 && month <= 5) return 'grishma';   // Early Summer (Apr-May)
  if (month >= 6 && month <= 7) return 'varsha';    // Monsoon (Jun-Jul)
  if (month >= 8 && month <= 9) return 'sharad';    // Autumn (Aug-Sep)
  if (month >= 10 && month <= 11) return 'hemanta'; // Early Winter (Oct-Nov)
  
  return 'vasanta'; // Default fallback
}

/**
 * Get seasonal guidance for Ayurvedic cooking
 */
export function getSeasonalGuidance(season: AyurvedicSeason): SeasonalGuidance {
  const guidance: Record<AyurvedicSeason, SeasonalGuidance> = {
    shishira: { // Late Winter (Dec-Jan) - Cold, dry
      season: 'shishira',
      dominantDosha: 'vata',
      qualities: ['cold', 'dry', 'light'],
      recommendedTastes: ['sweet', 'sour', 'salty'],
      ingredientsToFavor: ['warming oils', 'root vegetables', 'warming spices', 'ghee', 'nuts', 'dates'],
      ingredientsToAvoid: ['cold foods', 'raw vegetables', 'excessive bitter/astringent'],
      cookingMethods: ['slow cooking', 'stewing', 'roasting', 'warming preparations'],
      spicesForBalance: ['ginger', 'cinnamon', 'cardamom', 'cloves', 'black pepper', 'nutmeg']
    },
    
    vasanta: { // Spring (Feb-Mar) - Cool, wet, heavy
      season: 'vasanta',
      dominantDosha: 'kapha',
      qualities: ['cool', 'wet', 'heavy'],
      recommendedTastes: ['pungent', 'bitter', 'astringent'],
      ingredientsToFavor: ['light grains', 'leafy greens', 'sprouts', 'detoxifying foods'],
      ingredientsToAvoid: ['heavy foods', 'dairy', 'sweet', 'oily foods'],
      cookingMethods: ['steaming', 'light sautéing', 'dry roasting'],
      spicesForBalance: ['turmeric', 'coriander', 'fennel', 'cumin', 'fenugreek', 'mustard seeds']
    },
    
    grishma: { // Early Summer (Apr-May) - Warm, dry
      season: 'grishma',
      dominantDosha: 'pitta',
      qualities: ['warm', 'dry', 'light'],
      recommendedTastes: ['sweet', 'bitter', 'astringent'],
      ingredientsToFavor: ['cooling foods', 'cucumber', 'coconut', 'sweet fruits', 'mint'],
      ingredientsToAvoid: ['heating spices', 'sour foods', 'salty foods'],
      cookingMethods: ['minimal cooking', 'cooling preparations', 'room temperature'],
      spicesForBalance: ['coriander', 'fennel', 'cardamom', 'mint', 'rose petals', 'cooling herbs']
    },
    
    varsha: { // Monsoon (Jun-Jul) - Humid, variable
      season: 'varsha',
      dominantDosha: 'vata',
      qualities: ['humid', 'variable', 'unstable'],
      recommendedTastes: ['sweet', 'sour', 'salty'],
      ingredientsToFavor: ['digestive spices', 'warm foods', 'easily digestible grains'],
      ingredientsToAvoid: ['heavy foods', 'excess water', 'difficult to digest foods'],
      cookingMethods: ['gentle cooking', 'warming preparations', 'digestive enhancing'],
      spicesForBalance: ['ginger', 'cumin', 'coriander', 'ajwain', 'black pepper', 'hing']
    },
    
    sharad: { // Autumn (Aug-Sep) - Dry, warm to cool
      season: 'sharad',
      dominantDosha: 'pitta',
      qualities: ['dry', 'warm transitioning to cool'],
      recommendedTastes: ['sweet', 'bitter', 'astringent'],
      ingredientsToFavor: ['sweet vegetables', 'grounding foods', 'seasonal fruits'],
      ingredientsToAvoid: ['excessive heating', 'sour', 'fermented foods'],
      cookingMethods: ['moderate cooking', 'nourishing preparations'],
      spicesForBalance: ['turmeric', 'coriander', 'fennel', 'cardamom', 'cinnamon', 'cloves']
    },
    
    hemanta: { // Early Winter (Oct-Nov) - Cool, dry
      season: 'hemanta',
      dominantDosha: 'vata',
      qualities: ['cool', 'dry', 'rough'],
      recommendedTastes: ['sweet', 'sour', 'salty'],
      ingredientsToFavor: ['warming foods', 'ghee', 'nuts', 'warming spices', 'root vegetables'],
      ingredientsToAvoid: ['cold foods', 'raw foods', 'excessive bitter'],
      cookingMethods: ['warming cooking', 'nourishing preparations', 'slow cooking'],
      spicesForBalance: ['ginger', 'cinnamon', 'cardamom', 'cloves', 'black pepper', 'long pepper']
    }
  };
  
  return guidance[season];
}

/**
 * Get current seasonal cooking guidance
 */
export function getCurrentSeasonalGuidance(date: Date = new Date()): SeasonalGuidance {
  const season = getCurrentAyurvedicSeason(date);
  return getSeasonalGuidance(season);
}

/**
 * Adapt recipe based on current season
 */
export function adaptRecipeForSeason(
  baseRecipe: any, 
  season: AyurvedicSeason
): any {
  const guidance = getSeasonalGuidance(season);
  
  // Clone the recipe to avoid mutations
  const adaptedRecipe = JSON.parse(JSON.stringify(baseRecipe));
  
  // Add seasonal notes
  const seasonalNote = generateSeasonalNote(season, guidance);
  adaptedRecipe.recipe.notes = `${adaptedRecipe.recipe.notes}. ${seasonalNote}`;
  
  // Add seasonal cooking tip
  const seasonalTip = generateSeasonalTip(season, guidance);
  adaptedRecipe.recipe.tips.push(seasonalTip);
  
  return adaptedRecipe;
}

function generateSeasonalNote(season: AyurvedicSeason, guidance: SeasonalGuidance): string {
  const seasonNames: Record<AyurvedicSeason, string> = {
    shishira: 'Late Winter',
    vasanta: 'Spring', 
    grishma: 'Early Summer',
    varsha: 'Monsoon',
    sharad: 'Autumn',
    hemanta: 'Early Winter'
  };
  
  return `Perfect for ${seasonNames[season]} season - balances ${guidance.dominantDosha} dosha with ${guidance.qualities.join(', ')} qualities`;
}

function generateSeasonalTip(season: AyurvedicSeason, guidance: SeasonalGuidance): string {
  const tips: Record<AyurvedicSeason, string> = {
    shishira: 'Serve hot and add extra ghee for warmth during cold, dry winter',
    vasanta: 'Reduce oil and dairy; add detoxifying herbs for spring cleansing',
    grishma: 'Serve at room temperature; add cooling garnishes like mint or coconut',
    varsha: 'Add extra digestive spices and keep portions moderate during humid weather',
    sharad: 'Include sweet vegetables and avoid fermented additions during autumn',
    hemanta: 'Increase warming spices and healthy fats for early winter nourishment'
  };
  
  return tips[season];
}