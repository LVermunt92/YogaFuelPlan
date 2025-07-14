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
 * Determine current Ayurvedic season based on date and location
 * Adapts traditional seasons to local climate patterns
 */
export function getCurrentAyurvedicSeason(date: Date = new Date(), location: 'india' | 'europe' = 'europe'): AyurvedicSeason {
  const month = date.getMonth() + 1; // 1-12
  
  if (location === 'europe') {
    // European/Netherlands climate adaptation
    if (month >= 12 || month <= 2) return 'shishira'; // Winter (Dec-Feb) - cold, dry
    if (month >= 3 && month <= 5) return 'vasanta';   // Spring (Mar-May) - cool, fresh
    if (month >= 6 && month <= 8) return 'grishma';   // Summer (Jun-Aug) - warm, light
    if (month >= 9 && month <= 11) return 'sharad';   // Autumn (Sep-Nov) - cool, dry
    return 'vasanta'; // default to spring
  } else {
    // Traditional Indian Ayurvedic calendar
    if (month >= 12 || month <= 1) return 'shishira'; // Late Winter (Dec-Jan)
    if (month >= 2 && month <= 3) return 'vasanta';   // Spring (Feb-Mar)
    if (month >= 4 && month <= 5) return 'grishma';   // Early Summer (Apr-May)
    if (month >= 6 && month <= 7) return 'varsha';    // Monsoon (Jun-Jul)
    if (month >= 8 && month <= 9) return 'sharad';    // Autumn (Aug-Sep)
    if (month >= 10 && month <= 11) return 'hemanta'; // Early Winter (Oct-Nov)
    return 'vasanta'; // default to spring
  }
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
    
    grishma: { // Summer (Jun-Aug in Europe) - Warm, light, energetic
      season: 'grishma',
      dominantDosha: 'pitta',
      qualities: ['warm', 'light', 'energetic'],
      recommendedTastes: ['sweet', 'bitter', 'astringent'],
      ingredientsToFavor: ['fresh vegetables', 'cooling foods', 'seasonal fruits', 'lighter grains', 'fresh herbs'],
      ingredientsToAvoid: ['heavy heating foods', 'excessive warming spices', 'overly rich meals'],
      cookingMethods: ['light cooking', 'fresh preparations', 'cooling methods', 'grilling', 'fresh salads'],
      spicesForBalance: ['coriander', 'fennel', 'mint', 'fresh herbs', 'cooling spices', 'fresh ginger']
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
export function getCurrentSeasonalGuidance(date: Date = new Date(), location: 'india' | 'europe' = 'europe'): SeasonalGuidance {
  const season = getCurrentAyurvedicSeason(date, location);
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
    shishira: 'Winter',
    vasanta: 'Spring', 
    grishma: 'Summer',
    varsha: 'Late Summer',
    sharad: 'Autumn',
    hemanta: 'Early Winter'
  };
  
  return `Perfect for ${seasonNames[season]} season - balances ${guidance.dominantDosha} dosha with ${guidance.qualities.join(', ')} qualities`;
}

function generateSeasonalTip(season: AyurvedicSeason, guidance: SeasonalGuidance): string {
  const tips: Record<AyurvedicSeason, string> = {
    shishira: 'Serve hot and add extra ghee for warmth during cold, dry winter',
    vasanta: 'Reduce oil and dairy; add detoxifying herbs for spring cleansing',
    grishma: 'Perfect for summer - serve fresh and light; add cooling garnishes like fresh herbs or seasonal vegetables',
    varsha: 'Add extra digestive spices and keep portions moderate during variable weather',
    sharad: 'Include sweet vegetables and avoid fermented additions during autumn',
    hemanta: 'Increase warming spices and healthy fats for early winter nourishment'
  };
  
  return tips[season];
}