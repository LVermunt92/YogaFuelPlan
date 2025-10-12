import { type MealOption } from "./nutrition-enhanced";
import { type User } from "@shared/schema";
import { calculateNutritionTargets } from "./nutrition-calculator";

/**
 * Advanced Protein Target Optimization System
 * Uses user's personal protein target to intelligently select high-protein meals
 * and optimize daily protein intake to get as close as possible to their individual target
 */

interface ProteinAnalysis {
  currentProtein: number;
  targetProtein: number;
  gap: number;
  gapPercentage: number;
  recommendation: 'increase' | 'maintain' | 'reduce';
}

interface OptimizedMealSelection {
  meals: MealOption[];
  totalProtein: number;
  targetAchievement: number; // percentage of target achieved
  optimizationNotes: string[];
}

/**
 * Calculate user's personal protein target based on their profile
 */
export function calculateUserProteinTarget(user: User): number {
  if (!user.weight) {
    console.log('⚠️ No weight data available, using default protein target of 80g');
    return 80; // Default fallback
  }

  try {
    const nutritionTargets = calculateNutritionTargets({
      age: user.age || 30,
      weight: user.weight,
      gender: (user.gender as 'male' | 'female' | 'other') || 'male',
      activityLevel: (user.activityLevel as 'sedentary' | 'light' | 'moderate' | 'high' | 'athlete') || 'moderate',
      trainingType: (user.trainingType as 'mobility' | 'endurance' | 'strength' | 'mixed') || 'endurance',
      goal: (user.goal as 'lose_fat' | 'maintain' | 'bulk') || 'maintain'
    });

    console.log(`🎯 Personal protein target calculated: ${nutritionTargets.protein}g (${nutritionTargets.proteinFactor}g/kg × ${user.weight}kg)`);
    return nutritionTargets.protein;
  } catch (error) {
    console.error('Error calculating protein target, using fallback:', error);
    // Fallback calculation: 1.6g/kg bodyweight (moderate activity)
    const fallbackTarget = Math.round(user.weight * 1.6);
    console.log(`🎯 Using fallback protein target: ${fallbackTarget}g`);
    return fallbackTarget;
  }
}

/**
 * Analyze current protein intake vs target
 */
function analyzeProteinGap(currentProtein: number, targetProtein: number): ProteinAnalysis {
  const gap = targetProtein - currentProtein;
  const gapPercentage = (gap / targetProtein) * 100;
  
  let recommendation: 'increase' | 'maintain' | 'reduce';
  if (gapPercentage > 10) {
    recommendation = 'increase';
  } else if (gapPercentage < -10) {
    recommendation = 'reduce';
  } else {
    recommendation = 'maintain';
  }

  return {
    currentProtein,
    targetProtein,
    gap,
    gapPercentage,
    recommendation
  };
}

/**
 * Score meals based on protein content and user's target
 * Rebalanced to favor meals that match target per meal (~32g for 95g daily)
 * and reduce overshooting while maintaining variety
 */
function scoreProteinForTarget(meal: MealOption, targetDailyProtein: number): number {
  const protein = meal.nutrition.protein;
  const targetPerMeal = targetDailyProtein / 3; // Assume 3 meals per day
  
  // Score based on how well this meal contributes to daily target
  let score = 0;
  
  // NEW: Rebalanced protein scoring - favor meals close to target per meal
  // For 95g daily target: ~32g per meal is ideal
  const distanceFromTarget = Math.abs(protein - targetPerMeal);
  
  // Perfect match or slightly above target (within 5g)
  if (distanceFromTarget <= 5) {
    score += 100; // Ideal protein content for target
  }
  // Good range (within 8g of target)
  else if (distanceFromTarget <= 8) {
    score += 90; // Very good protein content
  }
  // Acceptable range (within 12g of target)
  else if (distanceFromTarget <= 12) {
    score += 75; // Good protein content
  }
  // Moderate protein (still useful but not optimal)
  else if (protein >= 15 && protein <= 45) {
    score += 60; // Moderate protein - provides variety
  }
  // Very high protein (overshoots significantly)
  else if (protein > 45) {
    score += 40; // Penalize excessive protein
  }
  // Low protein
  else {
    score += 20; // Low protein - last resort
  }
  
  // Bonus for meals that help reach target per meal (not overshoot)
  const targetContribution = (protein / targetPerMeal) * 100;
  if (targetContribution >= 90 && targetContribution <= 110) {
    score += 20; // Perfect contribution (90-110% of target)
  } else if (targetContribution >= 70 && targetContribution <= 130) {
    score += 10; // Good contribution (70-130% of target)
  } else if (targetContribution > 130) {
    score -= 10; // Penalize overshooting
  }
  
  // Efficiency bonus (protein per calorie) - less weight than before
  const proteinPerCalorie = protein / (meal.nutrition.calories || 400);
  if (proteinPerCalorie > 0.08) score += 10; // Very efficient
  else if (proteinPerCalorie > 0.06) score += 7; // Good efficiency
  else if (proteinPerCalorie > 0.04) score += 3; // Moderate efficiency
  
  return score;
}

/**
 * Select protein-optimized meals for a given category and target
 * NEW APPROACH: Returns diverse protein range (15-35g) for flexible daily balancing
 * System will mix and match to hit daily target (e.g., high dinner + low breakfast = 95g total)
 */
export function selectProteinOptimizedMealsForTarget(
  availableMeals: MealOption[],
  category: 'breakfast' | 'lunch' | 'dinner',
  user: User,
  targetDailyProtein?: number
): MealOption[] {
  const userProteinTarget = targetDailyProtein || calculateUserProteinTarget(user);
  
  console.log(`🥩 Protein optimization for ${category}: Target ${userProteinTarget}g daily (flexible balancing)`);
  
  // Filter meals for the category
  const categoryMeals = availableMeals.filter(meal => meal.category === category);
  
  if (categoryMeals.length === 0) {
    console.log(`⚠️ No meals available for category: ${category}`);
    return [];
  }
  
  // NEW: Score meals to provide DIVERSE protein options (15-35g range)
  // This allows daily balancing: high protein meal + low protein meal = target
  const scoredMeals = categoryMeals.map(meal => {
    const protein = meal.nutrition.protein;
    let score = 0;
    
    // DIVERSE PROTEIN SCORING: Accept wide range, penalize extremes
    if (protein >= 18 && protein <= 32) {
      score += 100; // Ideal range for flexible balancing
    } else if (protein >= 15 && protein <= 35) {
      score += 90; // Good range
    } else if (protein >= 12 && protein <= 38) {
      score += 70; // Acceptable
    } else if (protein > 40) {
      score += 40; // Too high (limits flexibility)
    } else if (protein < 12) {
      score += 50; // Too low (limits flexibility)
    }
    
    // Bonus for variety and efficiency
    const proteinPerCalorie = protein / (meal.nutrition.calories || 400);
    if (proteinPerCalorie > 0.06) score += 10;
    else if (proteinPerCalorie > 0.04) score += 5;
    
    // Small randomization for variety (±5 points)
    score += Math.random() * 10 - 5;
    
    return { meal, score, protein };
  });
  
  // Sort by score (highest first)
  scoredMeals.sort((a, b) => b.score - a.score);
  
  // Take MORE meals for better variety (15 instead of 8)
  const optimizedMeals = scoredMeals.slice(0, Math.min(15, scoredMeals.length)).map(item => item.meal);
  
  // Log protein distribution
  const avgProtein = optimizedMeals.reduce((sum, meal) => sum + meal.nutrition.protein, 0) / optimizedMeals.length;
  const proteinRange = {
    min: Math.min(...optimizedMeals.map(m => m.nutrition.protein)),
    max: Math.max(...optimizedMeals.map(m => m.nutrition.protein))
  };
  
  console.log(`🥩 ${category} optimization complete:`);
  console.log(`   - Selected ${optimizedMeals.length} meals`);
  console.log(`   - Protein range: ${proteinRange.min}g - ${proteinRange.max}g`);
  console.log(`   - Average protein: ${avgProtein.toFixed(1)}g`);
  console.log(`   - System will balance meals daily to hit ${userProteinTarget}g target`);
  
  return optimizedMeals;
}

/**
 * Optimize a full day's meals to hit protein target
 */
export function optimizeDailyProteinIntake(
  breakfastOptions: MealOption[],
  lunchOptions: MealOption[],
  dinnerOptions: MealOption[],
  user: User
): OptimizedMealSelection {
  const targetProtein = calculateUserProteinTarget(user);
  const targetPerMeal = targetProtein / 3;
  
  console.log(`🎯 Daily protein optimization: Target ${targetProtein}g (${targetPerMeal.toFixed(1)}g per meal)`);
  
  // Select highest protein options for each meal
  const optimizedBreakfast = breakfastOptions
    .sort((a, b) => scoreProteinForTarget(b, targetProtein) - scoreProteinForTarget(a, targetProtein))
    .slice(0, 1)[0];
    
  const optimizedLunch = lunchOptions
    .sort((a, b) => scoreProteinForTarget(b, targetProtein) - scoreProteinForTarget(a, targetProtein))
    .slice(0, 1)[0];
    
  const optimizedDinner = dinnerOptions
    .sort((a, b) => scoreProteinForTarget(b, targetProtein) - scoreProteinForTarget(a, targetProtein))
    .slice(0, 1)[0];
  
  const selectedMeals = [optimizedBreakfast, optimizedLunch, optimizedDinner].filter(Boolean);
  const totalProtein = selectedMeals.reduce((sum, meal) => sum + meal.nutrition.protein, 0);
  const targetAchievement = (totalProtein / targetProtein) * 100;
  
  const optimizationNotes: string[] = [];
  
  if (targetAchievement >= 95) {
    optimizationNotes.push(`✅ Excellent protein target achievement: ${targetAchievement.toFixed(1)}%`);
  } else if (targetAchievement >= 85) {
    optimizationNotes.push(`🎯 Good protein target achievement: ${targetAchievement.toFixed(1)}%`);
  } else if (targetAchievement >= 70) {
    optimizationNotes.push(`⚠️ Moderate protein achievement: ${targetAchievement.toFixed(1)}% - consider protein supplementation`);
  } else {
    optimizationNotes.push(`❌ Low protein achievement: ${targetAchievement.toFixed(1)}% - significant gap of ${(targetProtein - totalProtein).toFixed(1)}g`);
  }
  
  // Add specific meal recommendations
  selectedMeals.forEach(meal => {
    if (meal.nutrition.protein >= 35) {
      optimizationNotes.push(`💪 High-protein ${meal.category}: ${meal.name} (${meal.nutrition.protein}g)`);
    }
  });
  
  return {
    meals: selectedMeals,
    totalProtein,
    targetAchievement,
    optimizationNotes
  };
}

/**
 * Get protein-optimized meal suggestions based on current intake
 */
export function getProteinOptimizationSuggestions(
  currentMeals: MealOption[],
  availableMeals: MealOption[],
  user: User
): string[] {
  const targetProtein = calculateUserProteinTarget(user);
  const currentProtein = currentMeals.reduce((sum, meal) => sum + meal.nutrition.protein, 0);
  const analysis = analyzeProteinGap(currentProtein, targetProtein);
  
  const suggestions: string[] = [];
  
  if (analysis.recommendation === 'increase') {
    // Find high-protein alternatives
    const highProteinMeals = availableMeals.filter(meal => meal.nutrition.protein >= 28);
    
    if (highProteinMeals.length > 0) {
      suggestions.push(`Consider switching to high-protein options like: ${highProteinMeals.slice(0, 3).map(m => m.name).join(', ')}`);
    }
    
    suggestions.push(`Add protein-rich snacks or supplements to bridge the ${Math.abs(analysis.gap).toFixed(1)}g gap`);
  } else if (analysis.recommendation === 'maintain') {
    suggestions.push('Current protein intake is well-balanced for your target');
  }
  
  return suggestions;
}