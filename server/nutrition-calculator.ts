/**
 * Advanced Nutrition Calculator
 * Implements comprehensive nutrition calculation system with:
 * - Protein targets based on Activity Level × Training Type lookup table
 * - BMR and calorie calculations with PAL values
 * - Carbohydrate targets by training type
 * - Fat distribution with training-specific percentages
 */

interface NutritionProfile {
  age: number;
  weight: number; // kg
  gender: 'male' | 'female' | 'other';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'high' | 'athlete';
  trainingType: 'mobility' | 'endurance' | 'strength' | 'mixed';
  goal: 'lose_fat' | 'maintain' | 'bulk';
}

interface NutritionTargets {
  protein: number; // grams, rounded to nearest 5g
  carbohydrates: number; // grams, rounded to nearest 5g
  fats: number; // grams, rounded to nearest 5g
  calories: number; // kcal, rounded to nearest 10 kcal
  fiber: number; // grams, gender-specific target
  maintenanceCalories: number; // kcal for reference
  bmr: number; // kcal for reference
  proteinFactor: number; // g/kg for transparency
  palValue: number; // PAL multiplier
  carbFactor: number; // g/kg for transparency
  fatPercentage: number; // % of calories
}

/**
 * Protein Factor Lookup Table (g/kg bodyweight)
 * Based on Activity Level × Training Type combinations
 */
const PROTEIN_FACTORS: Record<string, Record<string, number>> = {
  'sedentary': {
    'mobility': 1.0,
    'endurance': 1.2,
    'strength': 1.4,
    'mixed': 1.4
  },
  'light': {
    'mobility': 1.2,
    'endurance': 1.4,
    'strength': 1.6,
    'mixed': 1.6
  },
  'moderate': {
    'mobility': 1.4,
    'endurance': 1.6,
    'strength': 1.8,
    'mixed': 1.9
  },
  'high': {
    'mobility': 1.5,
    'endurance': 1.8,
    'strength': 2.0,
    'mixed': 2.1
  },
  'athlete': {
    'mobility': 1.6,
    'endurance': 2.0,
    'strength': 2.2,
    'mixed': 2.3
  }
};

/**
 * Physical Activity Level (PAL) values
 * Multipliers for BMR to calculate Total Daily Energy Expenditure
 */
const PAL_VALUES: Record<string, number> = {
  'sedentary': 1.35,
  'light': 1.55,
  'moderate': 1.75,
  'high': 1.95,
  'athlete': 2.20
};

/**
 * Carbohydrate targets by training type (g/kg bodyweight)
 * Uses midpoint of recommended ranges
 */
const CARB_FACTORS: Record<string, number> = {
  'mobility': 2.5,    // 2-3 g/kg midpoint
  'endurance': 6.5,   // 5-8 g/kg midpoint
  'strength': 4.0,    // 3-5 g/kg midpoint
  'mixed': 5.0        // 4-6 g/kg midpoint
};

/**
 * Fat percentage targets by training type
 * Percentage of total daily calories from fats
 */
const FAT_PERCENTAGES: Record<string, number> = {
  'mobility': 0.325,   // 32.5%
  'endurance': 0.25,   // 25%
  'strength': 0.30,    // 30%
  'mixed': 0.275       // 27.5%
};

/**
 * Goal adjustment factors for calories
 */
const GOAL_FACTORS: Record<string, number> = {
  'lose_fat': 0.90,  // -10%
  'maintain': 1.00,  // 0%
  'bulk': 1.10       // +10%
};

/**
 * Calculate BMR using Mifflin-St Jeor equation
 * Most accurate for general population
 */
function calculateBMR(weight: number, height: number, age: number, gender: string): number {
  // If height not provided, estimate based on average
  const estimatedHeight = height || (gender === 'male' ? 175 : 162);
  
  if (gender === 'male') {
    return (10 * weight) + (6.25 * estimatedHeight) - (5 * age) + 5;
  } else {
    // Female or other - use female formula as more conservative
    return (10 * weight) + (6.25 * estimatedHeight) - (5 * age) - 161;
  }
}

/**
 * Get protein factor from lookup table with defaults
 */
function getProteinFactor(activityLevel: string, trainingType: string): number {
  const activity = activityLevel || 'moderate';
  const training = trainingType || 'endurance';
  return PROTEIN_FACTORS[activity]?.[training] || 1.6; // Default fallback
}

/**
 * Get PAL value with default
 */
function getPALValue(activityLevel: string): number {
  return PAL_VALUES[activityLevel || 'moderate'] || 1.75;
}

/**
 * Get carbohydrate factor with default
 */
function getCarbFactor(trainingType: string): number {
  return CARB_FACTORS[trainingType || 'endurance'] || 6.5;
}

/**
 * Get fat percentage with default
 */
function getFatPercentage(trainingType: string): number {
  return FAT_PERCENTAGES[trainingType || 'endurance'] || 0.25;
}

/**
 * Get goal adjustment factor with default
 */
function getGoalFactor(goal: string): number {
  return GOAL_FACTORS[goal || 'maintain'] || 1.00;
}

/**
 * Round to nearest increment
 */
function roundToNearest(value: number, increment: number): number {
  return Math.round(value / increment) * increment;
}

/**
 * Calculate comprehensive nutrition targets
 * Main function that implements all the logic from the spreadsheet
 */
export function calculateNutritionTargets(profile: NutritionProfile, height?: number): NutritionTargets {
  // Get all factors
  const proteinFactor = getProteinFactor(profile.activityLevel, profile.trainingType);
  const palValue = getPALValue(profile.activityLevel);
  const carbFactor = getCarbFactor(profile.trainingType);
  const fatPercentage = getFatPercentage(profile.trainingType);
  const goalFactor = getGoalFactor(profile.goal);
  
  // Calculate BMR
  const bmr = calculateBMR(profile.weight, height || 0, profile.age, profile.gender);
  
  // Calculate calories
  const maintenanceCalories = bmr * palValue;
  const targetCalories = maintenanceCalories * goalFactor;
  
  // Calculate macronutrients
  const proteinGrams = profile.weight * proteinFactor;
  const carbGrams = profile.weight * carbFactor;
  
  // Calculate fats using the complex logic
  const proteinKcal = proteinGrams * 4;
  const carbKcal = carbGrams * 4;
  const fatKcalTarget = targetCalories * fatPercentage;
  const remainingKcal = Math.max(targetCalories - proteinKcal - carbKcal, 0);
  const finalFatKcal = Math.max(Math.min(fatKcalTarget, remainingKcal), 0);
  const fatGrams = finalFatKcal / 9;
  
  // Round all values according to specification
  const roundedProtein = roundToNearest(proteinGrams, 5);
  const roundedCarbs = roundToNearest(carbGrams, 5);
  const roundedFats = roundToNearest(fatGrams, 5);
  const roundedCalories = roundToNearest(targetCalories, 10);
  
  // Calculate fiber target (gender-specific)
  const fiberTarget = profile.gender === 'male' ? 40 : 30; // 40g for men, 30g for women
  
  return {
    protein: Math.max(roundedProtein, 0),
    carbohydrates: Math.max(roundedCarbs, 0),
    fats: Math.max(roundedFats, 0),
    calories: Math.max(roundedCalories, 0),
    fiber: fiberTarget,
    maintenanceCalories: Math.round(maintenanceCalories),
    bmr: Math.round(bmr),
    proteinFactor,
    palValue,
    carbFactor,
    fatPercentage: fatPercentage * 100, // Convert to percentage
    
  };
}

/**
 * Calculate protein target with activity and training considerations
 * Simplified version that just returns protein target
 */
export function calculateProteinTarget(
  weight: number,
  activityLevel: string,
  trainingType?: string
): number {
  const factor = getProteinFactor(activityLevel, trainingType || 'endurance');
  return roundToNearest(weight * factor, 5);
}

/**
 * Get nutrition calculation details for admin/debugging
 */
export function getNutritionCalculationDetails() {
  return {
    proteinFactors: PROTEIN_FACTORS,
    palValues: PAL_VALUES,
    carbFactors: CARB_FACTORS,
    fatPercentages: FAT_PERCENTAGES,
    goalFactors: GOAL_FACTORS
  };
}

/**
 * Validate nutrition profile inputs
 */
export function validateNutritionProfile(profile: Partial<NutritionProfile>): string[] {
  const errors: string[] = [];
  
  if (!profile.weight || profile.weight <= 0) {
    errors.push('Weight must be greater than 0');
  }
  
  if (!profile.age || profile.age <= 0) {
    errors.push('Age must be greater than 0');
  }
  
  if (profile.weight && profile.weight > 300) {
    errors.push('Weight seems unusually high');
  }
  
  if (profile.age && profile.age > 120) {
    errors.push('Age seems unusually high');
  }
  
  return errors;
}

/**
 * Export types for use in other files
 */
export type { NutritionProfile, NutritionTargets };