/**
 * Advanced protein range calculator based on age, weight, activity level, and goals
 * Integrates with the meal planning app's protein targeting system
 */

export type ActivityLevel = "sedentary" | "light" | "moderate" | "high" | "athlete";
export type Goal = "maintenance" | "muscle_gain" | "fat_loss";
export type ProteinStrategy = "auto" | "bulletproof_moderate" | "sport_high";
export type Gender = "male" | "female" | "other";

export interface ProteinRangeResult {
  protein_range_g_per_day: [number, number];
  strategy: ProteinStrategy;
  age_adjusted: boolean;
  activity_multiplier: number;
  explanation: string;
}

/**
 * Calculate optimal daily protein range based on multiple factors
 */
export function proteinRangePerDay(
  age: number,
  weightKg: number,
  activityLevel: ActivityLevel,
  goal: Goal,
  strategy: ProteinStrategy = "auto",
  gender?: Gender
): ProteinRangeResult {
  // Input validation
  if (age <= 0 || age > 120) {
    throw new Error("Age must be between 1 and 120 years");
  }
  if (weightKg <= 0 || weightKg > 300) {
    throw new Error("Weight must be between 1 and 300 kg");
  }

  let baseMin: number;
  let baseMax: number;
  let activityMultiplier: number = 1;
  let ageAdjusted = false;

  // Base protein ranges by strategy
  if (strategy === "bulletproof_moderate") {
    // Fixed moderate approach: 0.8-1.2g per kg
    baseMin = 0.8;
    baseMax = 1.2;
  } else if (strategy === "sport_high") {
    // High performance approach: 1.6-2.0g per kg
    baseMin = 1.6;
    baseMax = 2.0;
  } else {
    // Auto strategy - adaptive based on activity and age
    switch (activityLevel) {
      case "sedentary":
        baseMin = 0.8;
        baseMax = 1.1;
        activityMultiplier = 0.9;
        break;
      case "light":
        baseMin = 1.0;
        baseMax = 1.3;
        activityMultiplier = 1.0;
        break;
      case "moderate":
        baseMin = 1.2;
        baseMax = 1.6;
        activityMultiplier = 1.1;
        break;
      case "high":
        baseMin = 1.4;
        baseMax = 1.8;
        activityMultiplier = 1.15;
        break;
      case "athlete":
        baseMin = 1.6;
        baseMax = 2.0;
        activityMultiplier = 1.2;
        break;
    }

    // Age adjustment for muscle preservation (45+ for women, 50+ for men)
    const ageThreshold = gender === "female" ? 45 : 50;
    if (age >= ageThreshold) {
      baseMin = Math.max(baseMin, 1.2); // Minimum 1.2g/kg for older adults
      baseMax = Math.min(baseMax * 1.1, 2.2); // Cap at 2.2g/kg
      ageAdjusted = true;
    }
  }

  // Goal-based adjustments
  let goalMultiplier = 1;
  if (goal === "muscle_gain") {
    baseMin = Math.max(baseMin, 1.4); // Minimum for muscle gain
    goalMultiplier = 1.05;
  } else if (goal === "fat_loss") {
    baseMin = Math.max(baseMin, 1.2); // Higher protein helps preserve muscle during deficit
    goalMultiplier = 1.1;
  }

  // Calculate final range
  let minProtein = Math.round(baseMin * weightKg * goalMultiplier);
  let maxProtein = Math.round(baseMax * weightKg * goalMultiplier);

  // Apply absolute caps
  const absoluteMax = Math.round(2.2 * weightKg); // 2.2g/kg is generally considered safe upper limit
  maxProtein = Math.min(maxProtein, absoluteMax);
  
  // Ensure minimum makes sense
  minProtein = Math.max(minProtein, 40); // Absolute minimum for adults
  
  // Ensure range is valid
  if (minProtein >= maxProtein) {
    maxProtein = minProtein + 10;
  }

  const explanation = generateExplanation(age, weightKg, activityLevel, goal, strategy, ageAdjusted, gender);

  return {
    protein_range_g_per_day: [minProtein, maxProtein],
    strategy,
    age_adjusted: ageAdjusted,
    activity_multiplier: activityMultiplier,
    explanation
  };
}

/**
 * Generate human-readable explanation for the protein calculation
 */
function generateExplanation(
  age: number,
  weightKg: number,
  activityLevel: ActivityLevel,
  goal: Goal,
  strategy: ProteinStrategy,
  ageAdjusted: boolean,
  gender?: Gender
): string {
  const parts = [];
  
  parts.push(`${strategy === "auto" ? "Adaptive" : strategy.replace("_", " ")} strategy`);
  parts.push(`${activityLevel} activity level`);
  
  if (goal !== "maintenance") {
    parts.push(`optimized for ${goal.replace("_", " ")}`);
  }
  
  if (ageAdjusted) {
    const threshold = gender === "female" ? 45 : 50;
    parts.push(`age-adjusted for ${threshold}+ years (higher protein for muscle preservation)`);
  }
  
  return parts.join(", ");
}

/**
 * Simplified function for backward compatibility with existing meal planner
 * Maps to the app's current high/low activity system
 */
export function calculateProteinTarget(age: number | null, activityLevel: string): number {
  // Default values if age is not provided
  const defaultAge = age || 30;
  const defaultWeight = 70; // Default weight assumption
  
  // Map app's activity levels to new system
  let mappedActivity: ActivityLevel;
  switch (activityLevel) {
    case "sedentary": mappedActivity = "sedentary"; break;
    case "light": mappedActivity = "light"; break;
    case "moderate": mappedActivity = "moderate"; break;
    case "high": mappedActivity = "high"; break;
    case "athlete": mappedActivity = "athlete"; break;
    default: mappedActivity = activityLevel === "high" ? "moderate" : "light"; // backward compatibility
  }
  
  // Use auto strategy with maintenance goal for general meal planning
  const result = proteinRangePerDay(defaultAge, defaultWeight, mappedActivity, "maintenance", "auto");
  
  // Return the midpoint of the range for simplicity
  const [min, max] = result.protein_range_g_per_day;
  return Math.round((min + max) / 2);
}

/**
 * Get detailed protein recommendations for user profile
 */
export function getDetailedProteinRecommendation(
  age: number,
  weight: number,
  activityLevel: string,
  goals?: string[],
  gender?: Gender
): {
  recommended: number;
  range: [number, number];
  explanation: string;
  strategy: ProteinStrategy;
} {
  // Map activity level  
  let mappedActivity: ActivityLevel;
  switch (activityLevel) {
    case "sedentary": mappedActivity = "sedentary"; break;
    case "light": mappedActivity = "light"; break;
    case "moderate": mappedActivity = "moderate"; break;
    case "high": mappedActivity = "high"; break;
    case "athlete": mappedActivity = "athlete"; break;
    default: mappedActivity = activityLevel === "high" ? "moderate" : "light"; // backward compatibility
  }
  
  // Determine goal based on user's dietary tags or default to maintenance
  let goal: Goal = "maintenance";
  if (goals?.includes("muscle_gain") || goals?.includes("strength")) {
    goal = "muscle_gain";
  } else if (goals?.includes("weight_loss") || goals?.includes("fat_loss")) {
    goal = "fat_loss";
  }
  
  const result = proteinRangePerDay(age, weight, mappedActivity, goal, "auto", gender);
  const [min, max] = result.protein_range_g_per_day;
  
  return {
    recommended: Math.round((min + max) / 2),
    range: [min, max],
    explanation: result.explanation,
    strategy: result.strategy
  };
}