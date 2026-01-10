import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, ResponsiveContainer } from "recharts";
import { ArrowLeft, Info } from "lucide-react";
import { Link } from "wouter";
import { useTranslations } from "@/lib/translations";
import { useLanguage } from "@/contexts/LanguageContext";
import { countUniquePlants } from "@/lib/plant-diversity";
import { getIngredientColors as getColorsFromConfig, kpiOrder } from "@/lib/kpi-config";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface MealPlan {
  id: number;
  meals: any[];
}

interface NutritionTargets {
  protein: number;
  fiber: number;
  calories: number;
}

export default function Insights() {
  const { language } = useLanguage();
  const t = useTranslations(language);

  // Get selected meal plan ID from localStorage (same as meal planner)
  const [selectedMealPlanId, setSelectedMealPlanId] = useState<number | null>(() => {
    const stored = localStorage.getItem('selectedMealPlan');
    return stored ? parseInt(stored) : null;
  });

  // Fetch the specific meal plan with all its meals
  const { data: currentMealPlan } = useQuery<MealPlan>({
    queryKey: [`/api/meal-plans/${selectedMealPlanId}`],
    enabled: !!selectedMealPlanId,
  });

  const { data: userProfile } = useQuery<{ 
    gender?: string; 
    mealsPerDay?: number;
  }>({
    queryKey: ["/api/user/profile"],
  });

  const { data: nutritionTargets } = useQuery<NutritionTargets>({
    queryKey: ["/api/nutrition/targets"],
  });

  // Use shared color group mapping from kpi-config.ts
  const getIngredientColors = getColorsFromConfig;

  // Calculate nutrition data from current meal plan (same logic as meal planner)
  const calculateKPIs = () => {
    if (!currentMealPlan?.meals) return null;

    const totalProtein = currentMealPlan.meals.reduce((sum, meal) => sum + (meal.protein || 0), 0);
    const totalCalories = currentMealPlan.meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    const totalFats = currentMealPlan.meals.reduce((sum, meal) => sum + (meal.fats || 0), 0);
    const totalCarbs = currentMealPlan.meals.reduce((sum, meal) => sum + (meal.carbohydrates || 0), 0);
    const totalFiber = currentMealPlan.meals.reduce((sum, meal) => sum + (meal.fiber || 0), 0);
    const totalVitaminK = currentMealPlan.meals.reduce((sum, meal) => {
      return sum + ((meal as any).vitaminK || 0);
    }, 0);
    const totalZinc = currentMealPlan.meals.reduce((sum, meal) => {
      return sum + ((meal as any).zinc || 0);
    }, 0);
    const totalCalcium = currentMealPlan.meals.reduce((sum, meal) => {
      return sum + ((meal as any).calcium || 0);
    }, 0);
    const totalSugar = currentMealPlan.meals.reduce((sum, meal) => {
      return sum + ((meal as any).sugar || 0);
    }, 0);
    const totalAddedSugar = currentMealPlan.meals.reduce((sum, meal) => {
      return sum + ((meal as any).addedSugar || 0);
    }, 0);
    const totalFreeSugar = currentMealPlan.meals.reduce((sum, meal) => {
      return sum + ((meal as any).freeSugar || 0);
    }, 0);
    const totalIntrinsicSugar = currentMealPlan.meals.reduce((sum, meal) => {
      return sum + ((meal as any).intrinsicSugar || 0);
    }, 0);
    const totalVitaminC = currentMealPlan.meals.reduce((sum, meal) => {
      return sum + ((meal as any).vitaminC || 0);
    }, 0);
    const totalSodium = currentMealPlan.meals.reduce((sum, meal) => {
      return sum + ((meal as any).sodium || 0);
    }, 0);
    const totalPotassium = currentMealPlan.meals.reduce((sum, meal) => {
      return sum + ((meal as any).potassium || 0);
    }, 0);
    const totalIron = currentMealPlan.meals.reduce((sum, meal) => {
      return sum + ((meal as any).iron || 0);
    }, 0);

    // Calculate Eating the Rainbow score
    const allColors = new Set<string>();
    currentMealPlan.meals.forEach(meal => {
      if (meal.ingredients && Array.isArray(meal.ingredients)) {
        const mealColors = getIngredientColors(meal.ingredients);
        mealColors.forEach(color => allColors.add(color));
      }
    });
    const totalColorGroups = 6; // red, orange, yellow, green, purple, white
    const achievedColors = allColors.size;
    const rainbowScore = Math.round((achievedColors / totalColorGroups) * 100);

    // Count fermented foods (meals with "Fermented" tag)
    const fermentedMealsCount = currentMealPlan.meals.filter(meal => {
      const tags = (meal as any).recipeTags;
      return tags && Array.isArray(tags) && tags.includes('Fermented');
    }).length;
    const fermentedTarget = 7; // Target: 1 fermented food per day

    // Calculate daily averages: average per meal × 3 meals per day
    // This shows what a typical day with 3 meals would look like
    const totalMeals = currentMealPlan.meals.length;
    const avgPerMeal = {
      protein: totalMeals > 0 ? totalProtein / totalMeals : 0,
      calories: totalMeals > 0 ? totalCalories / totalMeals : 0,
      fats: totalMeals > 0 ? totalFats / totalMeals : 0,
      carbs: totalMeals > 0 ? totalCarbs / totalMeals : 0,
      fiber: totalMeals > 0 ? totalFiber / totalMeals : 0,
      vitaminK: totalMeals > 0 ? totalVitaminK / totalMeals : 0,
      zinc: totalMeals > 0 ? totalZinc / totalMeals : 0,
      calcium: totalMeals > 0 ? totalCalcium / totalMeals : 0,
      sugar: totalMeals > 0 ? totalSugar / totalMeals : 0,
      addedSugar: totalMeals > 0 ? totalAddedSugar / totalMeals : 0,
      freeSugar: totalMeals > 0 ? totalFreeSugar / totalMeals : 0,
      intrinsicSugar: totalMeals > 0 ? totalIntrinsicSugar / totalMeals : 0,
      vitaminC: totalMeals > 0 ? totalVitaminC / totalMeals : 0,
      sodium: totalMeals > 0 ? totalSodium / totalMeals : 0,
      potassium: totalMeals > 0 ? totalPotassium / totalMeals : 0,
      iron: totalMeals > 0 ? totalIron / totalMeals : 0,
    };
    
    const avgProteinPerDay = avgPerMeal.protein * 3;
    const avgCaloriesPerDay = avgPerMeal.calories * 3;
    const avgFatsPerDay = avgPerMeal.fats * 3;
    const avgCarbsPerDay = avgPerMeal.carbs * 3;
    const avgFiberPerDay = avgPerMeal.fiber * 3;
    const avgVitaminKPerDay = avgPerMeal.vitaminK * 3;
    const avgZincPerDay = avgPerMeal.zinc * 3;
    const avgCalciumPerDay = avgPerMeal.calcium * 3;
    const avgSugarPerDay = avgPerMeal.sugar * 3;
    const avgAddedSugarPerDay = avgPerMeal.addedSugar * 3;
    const avgFreeSugarPerDay = avgPerMeal.freeSugar * 3;
    const avgIntrinsicSugarPerDay = avgPerMeal.intrinsicSugar * 3;
    const avgVitaminCPerDay = avgPerMeal.vitaminC * 3;
    const avgSodiumPerDay = avgPerMeal.sodium * 3;
    const avgPotassiumPerDay = avgPerMeal.potassium * 3;
    const avgIronPerDay = avgPerMeal.iron * 3;

    // Calculate net carbs (total carbs - fiber)
    const avgNetCarbsPerDay = avgCarbsPerDay - avgFiberPerDay;

    // Estimate vegetables from fiber
    const avgVegetablesPerDay = avgFiberPerDay * 13.3;
    
    // Calculate fat percentage of calories
    const fatCalories = avgFatsPerDay * 9;
    const fatPercentage = avgCaloriesPerDay > 0 ? (fatCalories / avgCaloriesPerDay) * 100 : 25;
    
    // Fiber target (gender-specific)
    const fiberTarget = nutritionTargets?.fiber || 30;
    
    // Cocoa flavanols estimate
    const avgCocoaFlavanolsPerDay = Math.min(avgProteinPerDay * 8, 500);
    const cocoaFlavanolsTarget = 500;
    
    // Plant diversity estimate
    const plantDiversityCount = Math.min(Math.round(avgFiberPerDay), 30);
    const plantDiversityTarget = 30;

    // Vitamin K target (gender-specific)
    const vitaminKTarget = userProfile?.gender === 'male' ? 120 : 90; // 120 mcg for men, 90 mcg for women

    // Zinc target (gender-specific) - 11mg for men, 8mg for women
    const zincTarget = userProfile?.gender === 'male' ? 11 : 8;

    // Calcium target - 1000mg for adults (same for both genders)
    const calciumTarget = 1000;

    // Sugar target (gender-specific) - AHA recommends max 25g for women, 36g for men
    const sugarTarget = userProfile?.gender === 'male' ? 36 : 25;

    // Vitamin C target - 90mg for men, 75mg for women
    const vitaminCTarget = userProfile?.gender === 'male' ? 90 : 75;

    // Sodium target - max 2300mg per day (less is better)
    const sodiumTarget = 2300;

    // Potassium target - 3400mg for men, 2600mg for women
    const potassiumTarget = userProfile?.gender === 'male' ? 3400 : 2600;

    // Iron target - 8mg for men, 18mg for women (higher for women due to menstruation)
    const ironTarget = userProfile?.gender === 'male' ? 8 : 18;

    // Targets
    const proteinTarget = nutritionTargets?.protein || 95;
    const caloriesTarget = nutritionTargets?.calories || 2000;
    const netCarbsTarget = 160;

    return {
      protein: {
        value: Math.round(avgProteinPerDay),
        percentage: Math.round((avgProteinPerDay / proteinTarget) * 100),
        target: proteinTarget
      },
      goodFats: {
        value: Math.round(avgFatsPerDay),
        percentage: Math.round(Math.min(fatPercentage, 100)),
        target: 30
      },
      fiber: {
        value: Math.round(avgFiberPerDay),
        percentage: Math.round((avgFiberPerDay / fiberTarget) * 100),
        target: fiberTarget
      },
      vegetables: {
        value: Math.round(avgVegetablesPerDay),
        percentage: Math.round((avgVegetablesPerDay / 400) * 100),
        target: 400
      },
      plantDiversity: {
        value: plantDiversityCount,
        percentage: Math.round((plantDiversityCount / plantDiversityTarget) * 100),
        target: plantDiversityTarget
      },
      cocoaFlavanols: {
        value: Math.round(avgCocoaFlavanolsPerDay),
        percentage: Math.round((avgCocoaFlavanolsPerDay / cocoaFlavanolsTarget) * 100),
        target: cocoaFlavanolsTarget
      },
      netCarbs: {
        value: Math.round(avgNetCarbsPerDay),
        percentage: Math.round((avgNetCarbsPerDay / netCarbsTarget) * 100),
        target: netCarbsTarget
      },
      calories: {
        value: Math.round(avgCaloriesPerDay),
        percentage: Math.round((avgCaloriesPerDay / caloriesTarget) * 100),
        target: caloriesTarget
      },
      rainbow: {
        value: achievedColors,
        percentage: rainbowScore,
        target: totalColorGroups,
        colors: Array.from(allColors)
      },
      fermented: {
        value: fermentedMealsCount,
        percentage: Math.round((fermentedMealsCount / fermentedTarget) * 100),
        target: fermentedTarget
      },
      vitaminK: {
        value: Math.round(avgVitaminKPerDay),
        percentage: Math.round((avgVitaminKPerDay / vitaminKTarget) * 100),
        target: vitaminKTarget
      },
      zinc: {
        value: Math.round(avgZincPerDay * 10) / 10,
        percentage: Math.round((avgZincPerDay / zincTarget) * 100),
        target: zincTarget
      },
      calcium: {
        value: Math.round(avgCalciumPerDay),
        percentage: Math.round((avgCalciumPerDay / calciumTarget) * 100),
        target: calciumTarget
      },
      sugar: {
        value: Math.round(avgSugarPerDay),
        percentage: Math.round((avgSugarPerDay / sugarTarget) * 100),
        target: sugarTarget
      },
      addedSugar: {
        value: Math.round(avgAddedSugarPerDay),
        percentage: Math.round((avgAddedSugarPerDay / sugarTarget) * 100),
        target: sugarTarget
      },
      freeSugar: {
        value: Math.round(avgFreeSugarPerDay),
        percentage: 100, // Informational - no strict limit but should be mindful
        target: null
      },
      intrinsicSugar: {
        value: Math.round(avgIntrinsicSugarPerDay),
        percentage: 100, // No strict limit for intrinsic sugar (bound in whole foods)
        target: null
      },
      vitaminC: {
        value: Math.round(avgVitaminCPerDay),
        percentage: Math.round((avgVitaminCPerDay / vitaminCTarget) * 100),
        target: vitaminCTarget
      },
      sodium: {
        value: Math.round(avgSodiumPerDay),
        percentage: Math.round((avgSodiumPerDay / sodiumTarget) * 100),
        target: sodiumTarget
      },
      potassium: {
        value: Math.round(avgPotassiumPerDay),
        percentage: Math.round((avgPotassiumPerDay / potassiumTarget) * 100),
        target: potassiumTarget
      },
      iron: {
        value: Math.round(avgIronPerDay * 10) / 10,
        percentage: Math.round((avgIronPerDay / ironTarget) * 100),
        target: ironTarget
      }
    };
  };

  const kpiData = calculateKPIs();

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-6 lg:py-8">
        {/* Header with back button */}
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {language === "nl" ? "Terug naar maaltijdplanner" : "Back to meal planner"}
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {language === "nl" ? "Voedingsinzichten" : "Nutrition insights"}
          </h1>
          <p className="text-lg text-gray-600">
            {language === "nl" 
              ? "Gedetailleerd overzicht van je voedingsdoelen en voortgang" 
              : "Detailed overview of your nutrition goals and progress"}
          </p>
        </div>

        {/* Compact Nutrition Charts - Same format as meal planner */}
        {kpiData && (
          <div className="bg-gray-50 p-3 sm:p-4 lg:p-6 rounded-lg w-full">
            <p className="text-xs text-gray-500 italic text-center mb-3" data-testid="kpi-daily-average-label">
              {t.kpiDailyAverageLabel}
            </p>
            <div className="grid grid-cols-4 gap-2">
            
            {/* Protein Chart */}
            <div className="text-center relative">
              <div className="relative w-14 h-14 mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { value: Math.min(kpiData.protein.percentage, 100), fill: "#10b981" },
                        { value: Math.max(100 - kpiData.protein.percentage, 0), fill: "#f3f4f6" }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={14}
                      outerRadius={24}
                      startAngle={90}
                      endAngle={450}
                      dataKey="value"
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-xs font-bold text-emerald-600">{kpiData.protein.value}g</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-0.5">
                <h3 className="text-[10px] font-semibold text-emerald-600">{t.protein}</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-emerald-600/60 hover:text-emerald-600" data-testid="info-protein">
                      <Info className="h-2.5 w-2.5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>{t.whyProteinMatters}</DialogTitle>
                      <DialogDescription className="text-sm pt-2">
                        {t.proteinTooltip}
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-[10px] text-gray-500">{kpiData.protein.percentage}%</p>
            </div>

            {/* Good Fats */}
            <div className="text-center relative">
              <div className="relative w-14 h-14 mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { value: kpiData.goodFats.percentage, fill: "#eab308" },
                        { value: 100 - kpiData.goodFats.percentage, fill: "#f3f4f6" }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={14}
                      outerRadius={24}
                      startAngle={90}
                      endAngle={450}
                      dataKey="value"
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-xs font-bold text-yellow-600">{kpiData.goodFats.value}g</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-0.5">
                <h3 className="text-[10px] font-semibold text-yellow-600">{t.goodFats || 'Fats'}</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-yellow-600/60 hover:text-yellow-600" data-testid="info-fats">
                      <Info className="h-2.5 w-2.5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>{t.whyHealthyFatsMatters}</DialogTitle>
                      <DialogDescription className="text-sm pt-2">
                        {t.fatsTooltip}
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-[10px] text-gray-500">{kpiData.goodFats.percentage}%</p>
            </div>

            {/* Fiber */}
            <div className="text-center relative">
              <div className="relative w-14 h-14 mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { value: Math.min(kpiData.fiber.percentage, 100), fill: "#f97316" },
                        { value: Math.max(100 - kpiData.fiber.percentage, 0), fill: "#f3f4f6" }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={14}
                      outerRadius={24}
                      startAngle={90}
                      endAngle={450}
                      dataKey="value"
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-xs font-bold text-orange-600">{kpiData.fiber.value}g</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-0.5">
                <h3 className="text-[10px] font-semibold text-orange-600">{t.fiber}</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-orange-600/60 hover:text-orange-600" data-testid="info-fiber">
                      <Info className="h-2.5 w-2.5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>{t.whyFiberMatters}</DialogTitle>
                      <DialogDescription className="text-sm pt-2">
                        {t.fiberTooltip}
                        <p className="text-xs text-amber-600 font-medium mt-2">{t.fiberWarning}</p>
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-[10px] text-gray-500">{kpiData.fiber.percentage}%</p>
            </div>

            {/* Vegetables */}
            <div className="text-center relative">
              <div className="relative w-14 h-14 mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { value: Math.min(kpiData.vegetables.percentage, 100), fill: "#22c55e" },
                        { value: Math.max(100 - kpiData.vegetables.percentage, 0), fill: "#f3f4f6" }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={14}
                      outerRadius={24}
                      startAngle={90}
                      endAngle={450}
                      dataKey="value"
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-xs font-bold text-green-600">{kpiData.vegetables.value}g</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-0.5">
                <h3 className="text-[10px] font-semibold text-green-600">{t.vegetables}</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-green-600/60 hover:text-green-600" data-testid="info-vegetables">
                      <Info className="h-2.5 w-2.5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>{t.whyVegetablesMatters}</DialogTitle>
                      <DialogDescription className="text-sm pt-2">
                        {t.vegetablesTooltip}
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-[10px] text-gray-500">{kpiData.vegetables.percentage}%</p>
            </div>

            {/* Plant Diversity */}
            <div className="text-center relative">
              <div className="relative w-14 h-14 mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { value: Math.min(kpiData.plantDiversity.percentage, 100), fill: "#16a34a" },
                        { value: Math.max(100 - kpiData.plantDiversity.percentage, 0), fill: "#f3f4f6" }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={14}
                      outerRadius={24}
                      startAngle={90}
                      endAngle={450}
                      dataKey="value"
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-xs font-bold text-green-700">{kpiData.plantDiversity.value}</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-0.5">
                <h3 className="text-[10px] font-semibold text-green-700">{t.plantDiversity}</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-green-700/60 hover:text-green-700" data-testid="info-plant-diversity">
                      <Info className="h-2.5 w-2.5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>{t.whyPlantDiversityMatters}</DialogTitle>
                      <DialogDescription className="text-sm pt-2">
                        {t.plantDiversityTooltip}
                        <p className="text-xs text-green-600 font-medium mt-2">{t.plantDiversityTarget}</p>
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-[10px] text-gray-500">{kpiData.plantDiversity.percentage}%</p>
            </div>

            {/* Cocoa Flavanols */}
            <div className="text-center relative">
              <div className="relative w-14 h-14 mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { value: Math.min(kpiData.cocoaFlavanols.percentage, 100), fill: "#8b5cf6" },
                        { value: Math.max(100 - kpiData.cocoaFlavanols.percentage, 0), fill: "#f3f4f6" }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={14}
                      outerRadius={24}
                      startAngle={90}
                      endAngle={450}
                      dataKey="value"
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-xs font-bold text-purple-600">{kpiData.cocoaFlavanols.value}mg</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-0.5">
                <h3 className="text-[10px] font-semibold text-purple-600">{t.cocoaFlavanols}</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-purple-600/60 hover:text-purple-600" data-testid="info-cocoa">
                      <Info className="h-2.5 w-2.5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>{t.whyCocoaFlavanolsMatters}</DialogTitle>
                      <DialogDescription className="text-sm pt-2">
                        {t.cocoaFlavanolsTooltip}
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-[10px] text-gray-500">{kpiData.cocoaFlavanols.percentage}%</p>
            </div>

            {/* Net Carbs */}
            <div className="text-center relative">
              <div className="relative w-14 h-14 mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { value: Math.min(kpiData.netCarbs.percentage, 100), fill: "#06b6d4" },
                        { value: Math.max(100 - kpiData.netCarbs.percentage, 0), fill: "#f3f4f6" }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={14}
                      outerRadius={24}
                      startAngle={90}
                      endAngle={450}
                      dataKey="value"
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-xs font-bold text-cyan-600">{kpiData.netCarbs.value}g</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-0.5">
                <h3 className="text-[10px] font-semibold text-cyan-600">{language === "nl" ? "Netto koolh." : "Net carbs"}</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-cyan-600/60 hover:text-cyan-600" data-testid="info-net-carbs">
                      <Info className="h-2.5 w-2.5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>{language === "nl" ? "Over netto koolhydraten" : "About net carbs"}</DialogTitle>
                      <DialogDescription className="text-sm pt-2">
                        {language === "nl" 
                          ? "Netto koolhydraten zijn de verteerbare koolhydraten die je lichaam gebruikt voor energie (totale koolhydraten minus vezels). Ze zijn een belangrijke brandstofbron — het verminderen van geraffineerde koolhydraten kan gunstig zijn, maar koolhydraten volledig vermijden kan essentiële voedingsstoffen beperken."
                          : "Net carbs are the digestible carbs your body uses for energy (total carbs minus fiber). They're an important fuel source — reducing refined carbs can be beneficial, but completely avoiding carbs may limit essential nutrients."}
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-[10px] text-gray-500">{kpiData.netCarbs.percentage}%</p>
            </div>

            {/* Calories */}
            <div className="text-center relative">
              <div className="relative w-14 h-14 mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { value: Math.min(kpiData.calories.percentage, 100), fill: "#3b82f6" },
                        { value: Math.max(100 - kpiData.calories.percentage, 0), fill: "#f3f4f6" }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={14}
                      outerRadius={24}
                      startAngle={90}
                      endAngle={450}
                      dataKey="value"
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-xs font-bold text-blue-600">{kpiData.calories.value}</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-0.5">
                <h3 className="text-[10px] font-semibold text-blue-600">{t.calories}</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-blue-600/60 hover:text-blue-600" data-testid="info-calories">
                      <Info className="h-2.5 w-2.5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>{language === "nl" ? "Over calorieën" : "About calories"}</DialogTitle>
                      <DialogDescription className="text-sm pt-2">
                        {language === "nl" 
                          ? "kcal weerspiegelen energie in voedsel, niet noodzakelijkelijk geabsorbeerde energie. Absorptie varieert met voedseltype, verwerking en macronutriënten (bijv. hele noten leveren vaak minder kcal dan op het etiket staat; eiwit heeft hogere verteringskosten)"
                          : "kcal reflect energy in food, not necessarily energy absorbed. Absorption varies with food type, processing, and macronutrients (e.g., whole nuts often yield fewer kcal than labels; protein has a higher digestion cost)"}
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-[10px] text-gray-500">{kpiData.calories.percentage}%</p>
            </div>

            {/* Eating the Rainbow */}
            <div className="text-center relative">
              <div className="relative w-14 h-14 mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { value: Math.min(kpiData.rainbow.percentage, 100), fill: "url(#rainbowGradient)" },
                        { value: Math.max(100 - kpiData.rainbow.percentage, 0), fill: "#f3f4f6" }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={14}
                      outerRadius={24}
                      startAngle={90}
                      endAngle={450}
                      dataKey="value"
                    />
                    <defs>
                      <linearGradient id="rainbowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ef4444" />
                        <stop offset="20%" stopColor="#f97316" />
                        <stop offset="40%" stopColor="#eab308" />
                        <stop offset="60%" stopColor="#22c55e" />
                        <stop offset="80%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-xs font-bold bg-gradient-to-r from-red-500 via-green-500 to-purple-500 bg-clip-text text-transparent">{kpiData.rainbow.value}/{kpiData.rainbow.target}</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-0.5">
                <h3 className="text-[10px] font-semibold bg-gradient-to-r from-red-500 via-green-500 to-purple-500 bg-clip-text text-transparent">
                  {language === "nl" ? "Regenboog" : "Rainbow"}
                </h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-gray-600/60 hover:text-gray-600" data-testid="info-rainbow">
                      <Info className="h-2.5 w-2.5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>{language === "nl" ? "Waarom kleurrijk eten belangrijk is" : "Why eating colorful foods matters"}</DialogTitle>
                      <DialogDescription className="text-sm pt-2">
                        {language === "nl" 
                          ? "Verschillende kleuren vertegenwoordigen verschillende voedingsstoffen. Streef naar 6 kleurgroepen per week (rood, oranje, geel, groen, paars, wit) voor optimale gezondheid."
                          : "Different colors represent different nutrients. Aim for 6 color groups per week (red, orange, yellow, green, purple, white) for optimal health."}
                        <p className="text-xs text-gray-600 font-medium mt-2">
                          {language === "nl" 
                            ? `Je hebt ${kpiData.rainbow.value} van ${kpiData.rainbow.target} kleuren bereikt: ${kpiData.rainbow.colors.join(', ')}`
                            : `You've achieved ${kpiData.rainbow.value} of ${kpiData.rainbow.target} colors: ${kpiData.rainbow.colors.join(', ')}`}
                        </p>
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-[10px] text-gray-500">{kpiData.rainbow.percentage}%</p>
            </div>

            {/* Fermented Foods */}
            <div className="text-center relative">
              <div className="relative w-14 h-14 mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { value: Math.min(kpiData.fermented.percentage, 100), fill: "#a855f7" },
                        { value: Math.max(100 - kpiData.fermented.percentage, 0), fill: "#f3f4f6" }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={14}
                      outerRadius={24}
                      startAngle={90}
                      endAngle={450}
                      dataKey="value"
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-xs font-bold text-purple-500">{kpiData.fermented.value}/{kpiData.fermented.target}</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-0.5">
                <h3 className="text-[10px] font-semibold text-purple-500">
                  {language === "nl" ? "Gefermenteerd" : "Fermented"}
                </h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-gray-600/60 hover:text-gray-600" data-testid="info-fermented">
                      <Info className="h-2.5 w-2.5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>{language === "nl" ? "Gefermenteerde voedingsmiddelen voor darmgezondheid" : "Fermented foods for gut health"}</DialogTitle>
                      <DialogDescription className="text-sm pt-2">
                        {language === "nl" 
                          ? "Gefermenteerde voedingsmiddelen bevatten probiotica die de darmgezondheid ondersteunen. Streef naar 1 gefermenteerd voedingsmiddel per dag. Voorbeelden: yoghurt, kefir, kimchi, zuurkool, miso, tempeh."
                          : "Fermented foods contain probiotics that support gut health. Aim for 1 fermented food per day. Examples: yogurt, kefir, kimchi, sauerkraut, miso, tempeh."}
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-[10px] text-gray-500">{kpiData.fermented.percentage}%</p>
            </div>

            {/* Vitamin K */}
            <div className="text-center relative">
              <div className="relative w-14 h-14 mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { value: Math.min(kpiData.vitaminK.percentage, 100), fill: "#10b981" },
                        { value: Math.max(100 - kpiData.vitaminK.percentage, 0), fill: "#f3f4f6" }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={14}
                      outerRadius={24}
                      startAngle={90}
                      endAngle={450}
                      dataKey="value"
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-xs font-bold text-emerald-600">{kpiData.vitaminK.value}mcg</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-0.5">
                <h3 className="text-[10px] font-semibold text-emerald-600">
                  {language === "nl" ? "Vitamine K" : "Vitamin K"}
                </h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-gray-600/60 hover:text-gray-600" data-testid="info-vitamin-k">
                      <Info className="h-2.5 w-2.5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>{language === "nl" ? "Vitamine K voor gezondheid" : "Vitamin K for health"}</DialogTitle>
                      <DialogDescription className="text-sm pt-2">
                        {language === "nl" 
                          ? "Vitamine K is essentieel voor bloedstolling en botgezondheid. De aanbevolen dagelijkse inname is 90 mcg voor vrouwen en 120 mcg voor mannen. Beste bronnen: groene bladgroenten, broccoli, spruitjes."
                          : "Vitamin K is essential for blood clotting and bone health. The recommended daily intake is 90 mcg for women and 120 mcg for men. Best sources: leafy greens, broccoli, Brussels sprouts."}
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-[10px] text-gray-500">{kpiData.vitaminK.percentage}%</p>
            </div>

            {/* Zinc Chart */}
            <div className="text-center relative">
              <div className="relative w-14 h-14 mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { value: Math.min(kpiData.zinc.percentage, 100), fill: "#8b5cf6" },
                        { value: Math.max(100 - kpiData.zinc.percentage, 0), fill: "#f3f4f6" }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={14}
                      outerRadius={24}
                      startAngle={90}
                      endAngle={450}
                      dataKey="value"
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-xs font-bold text-violet-500">{kpiData.zinc.value}mg</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-0.5">
                <h3 className="text-[10px] font-semibold text-violet-500">
                  {language === "nl" ? "Zink" : "Zinc"}
                </h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-gray-600/60 hover:text-gray-600" data-testid="info-zinc">
                      <Info className="h-2.5 w-2.5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>{language === "nl" ? "Zink voor gezondheid" : "Zinc for health"}</DialogTitle>
                      <DialogDescription className="text-sm pt-2">
                        {language === "nl" 
                          ? "Zink is essentieel voor immuunfunctie, wondgenezing en eiwitopbouw. De aanbevolen dagelijkse inname is 8 mg voor vrouwen en 11 mg voor mannen. Beste bronnen: vlees, schaaldieren, peulvruchten, zaden."
                          : "Zinc is essential for immune function, wound healing, and protein synthesis. The recommended daily intake is 8 mg for women and 11 mg for men. Best sources: meat, shellfish, legumes, seeds."}
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-[10px] text-gray-500">{kpiData.zinc.percentage}%</p>
            </div>

            {/* Calcium Chart */}
            <div className="text-center relative">
              <div className="relative w-14 h-14 mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { value: Math.min(kpiData.calcium.percentage, 100), fill: "#64748b" },
                        { value: Math.max(100 - kpiData.calcium.percentage, 0), fill: "#f3f4f6" }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={14}
                      outerRadius={24}
                      startAngle={90}
                      endAngle={450}
                      dataKey="value"
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-xs font-bold text-slate-600">{kpiData.calcium.value}mg</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-0.5">
                <h3 className="text-[10px] font-semibold text-slate-600">
                  {language === "nl" ? "Calcium" : "Calcium"}
                </h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-gray-600/60 hover:text-gray-600" data-testid="info-calcium">
                      <Info className="h-2.5 w-2.5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>{language === "nl" ? "Calcium voor gezondheid" : "Calcium for health"}</DialogTitle>
                      <DialogDescription className="text-sm pt-2">
                        {language === "nl" 
                          ? "Calcium is essentieel voor sterke botten en tanden, spiercontractie en zenuwfunctie. De aanbevolen dagelijkse inname is 1000 mg voor volwassenen. Beste bronnen: zuivel, groene bladgroenten, tofu, amandelen."
                          : "Calcium is essential for strong bones and teeth, muscle contraction, and nerve function. The recommended daily intake is 1000 mg for adults. Best sources: dairy, leafy greens, tofu, almonds."}
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-[10px] text-gray-500">{kpiData.calcium.percentage}%</p>
            </div>

            {/* Potassium Chart */}
            <div className="text-center relative">
              <div className="relative w-14 h-14 mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { value: Math.min(kpiData.potassium.percentage, 100), fill: "#14b8a6" },
                        { value: Math.max(100 - kpiData.potassium.percentage, 0), fill: "#f3f4f6" }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={14}
                      outerRadius={24}
                      startAngle={90}
                      endAngle={450}
                      dataKey="value"
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-xs font-bold text-teal-600">{kpiData.potassium.value}mg</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-0.5">
                <h3 className="text-[10px] font-semibold text-teal-600">
                  {language === "nl" ? "Kalium" : "Potassium"}
                </h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-gray-600/60 hover:text-gray-600" data-testid="info-potassium">
                      <Info className="h-2.5 w-2.5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>{language === "nl" ? "Kalium voor gezondheid" : "Potassium for health"}</DialogTitle>
                      <DialogDescription className="text-sm pt-2">
                        {language === "nl" 
                          ? "Kalium is essentieel voor hartfunctie, spiersamentrekking en bloeddrukregulatie. De aanbevolen inname is 3400mg voor mannen en 2600mg voor vrouwen. Beste bronnen: bananen, aardappelen, spinazie, bonen."
                          : "Potassium is essential for heart function, muscle contraction, and blood pressure regulation. The recommended intake is 3400mg for men and 2600mg for women. Best sources: bananas, potatoes, spinach, beans."}
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-[10px] text-gray-500">{kpiData.potassium.percentage}%</p>
            </div>

            {/* Iron Chart */}
            <div className="text-center relative">
              <div className="relative w-14 h-14 mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { value: Math.min(kpiData.iron.percentage, 100), fill: "#dc2626" },
                        { value: Math.max(100 - kpiData.iron.percentage, 0), fill: "#f3f4f6" }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={14}
                      outerRadius={24}
                      startAngle={90}
                      endAngle={450}
                      dataKey="value"
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-xs font-bold text-red-600">{kpiData.iron.value}mg</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-0.5">
                <h3 className="text-[10px] font-semibold text-red-600">
                  {language === "nl" ? "IJzer" : "Iron"}
                </h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-gray-600/60 hover:text-gray-600" data-testid="info-iron">
                      <Info className="h-2.5 w-2.5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>{language === "nl" ? "IJzer voor gezondheid" : "Iron for health"}</DialogTitle>
                      <DialogDescription className="text-sm pt-2">
                        {language === "nl" 
                          ? "IJzer is essentieel voor zuurstoftransport in het bloed en energieproductie. De aanbevolen inname is 8mg voor mannen en 18mg voor vrouwen (hoger vanwege menstruatie). Beste bronnen: peulvruchten, spinazie, tofu, verrijkte granen."
                          : "Iron is essential for oxygen transport in the blood and energy production. The recommended intake is 8mg for men and 18mg for women (higher due to menstruation). Best sources: legumes, spinach, tofu, fortified cereals."}
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-[10px] text-gray-500">{kpiData.iron.percentage}%</p>
            </div>

            {/* Vitamin C Chart */}
            <div className="text-center relative">
              <div className="relative w-14 h-14 mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { value: Math.min(kpiData.vitaminC.percentage, 100), fill: "#f59e0b" },
                        { value: Math.max(100 - kpiData.vitaminC.percentage, 0), fill: "#f3f4f6" }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={14}
                      outerRadius={24}
                      startAngle={90}
                      endAngle={450}
                      dataKey="value"
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-xs font-bold text-amber-500">{kpiData.vitaminC.value}mg</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-0.5">
                <h3 className="text-[10px] font-semibold text-amber-500">
                  {language === "nl" ? "Vitamine C" : "Vitamin C"}
                </h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-gray-600/60 hover:text-gray-600" data-testid="info-vitamin-c">
                      <Info className="h-2.5 w-2.5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>{language === "nl" ? "Vitamine C voor gezondheid" : "Vitamin C for health"}</DialogTitle>
                      <DialogDescription className="text-sm pt-2">
                        {language === "nl" 
                          ? "Vitamine C is essentieel voor immuunfunctie, collageenproductie en ijzeropname. De aanbevolen inname is 90mg voor mannen en 75mg voor vrouwen. Beste bronnen: citrusvruchten, paprika, broccoli, aardbeien."
                          : "Vitamin C is essential for immune function, collagen production, and iron absorption. The recommended intake is 90mg for men and 75mg for women. Best sources: citrus fruits, bell peppers, broccoli, strawberries."}
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-[10px] text-gray-500">{kpiData.vitaminC.percentage}%</p>
            </div>

            {/* Sodium Chart */}
            <div className="text-center relative">
              <div className="relative w-14 h-14 mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { value: Math.min(kpiData.sodium.percentage, 100), fill: kpiData.sodium.percentage > 100 ? "#ef4444" : "#6b7280" },
                        { value: Math.max(100 - kpiData.sodium.percentage, 0), fill: "#f3f4f6" }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={14}
                      outerRadius={24}
                      startAngle={90}
                      endAngle={450}
                      dataKey="value"
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`text-xs font-bold ${kpiData.sodium.percentage > 100 ? 'text-red-500' : 'text-gray-600'}`}>{kpiData.sodium.value}mg</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-0.5">
                <h3 className={`text-[10px] font-semibold ${kpiData.sodium.percentage > 100 ? 'text-red-500' : 'text-gray-600'}`}>
                  {language === "nl" ? "Natrium" : "Sodium"}
                </h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-gray-600/60 hover:text-gray-600" data-testid="info-sodium">
                      <Info className="h-2.5 w-2.5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>{language === "nl" ? "Natrium voor gezondheid" : "Sodium for health"}</DialogTitle>
                      <DialogDescription className="text-sm pt-2">
                        {language === "nl" 
                          ? "Natrium is nodig voor vochtbalans en zenuwfunctie, maar te veel verhoogt de bloeddruk. De aanbevolen max is 2300mg per dag. Let op: de meeste natrium komt uit bewerkte voedingsmiddelen."
                          : "Sodium is needed for fluid balance and nerve function, but too much raises blood pressure. The recommended max is 2300mg per day. Note: most sodium comes from processed foods."}
                        <p className={`text-xs font-medium mt-2 ${kpiData.sodium.percentage > 100 ? 'text-red-500' : 'text-gray-500'}`}>
                          {language === "nl" 
                            ? `Doel: max ${kpiData.sodium.target}mg per dag`
                            : `Target: max ${kpiData.sodium.target}mg per day`}
                        </p>
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-[10px] text-gray-500">{kpiData.sodium.percentage}%</p>
            </div>

            {/* Added Sugar */}
            <div className="text-center relative">
              <div className="relative w-14 h-14 mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { value: Math.min(kpiData.addedSugar.percentage, 100), fill: kpiData.addedSugar.percentage > 100 ? "#ef4444" : "#f472b6" },
                        { value: Math.max(100 - kpiData.addedSugar.percentage, 0), fill: "#f3f4f6" }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={14}
                      outerRadius={24}
                      startAngle={90}
                      endAngle={450}
                      dataKey="value"
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`text-xs font-bold ${kpiData.addedSugar.percentage > 100 ? 'text-red-500' : 'text-pink-400'}`}>{kpiData.addedSugar.value}g</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-0.5">
                <h3 className={`text-[10px] font-semibold ${kpiData.addedSugar.percentage > 100 ? 'text-red-500' : 'text-pink-400'}`}>
                  {language === "nl" ? "Toegevoegde suiker" : "Added sugar"}
                </h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-pink-400/60 hover:text-pink-400" data-testid="info-added-sugar">
                      <Info className="h-2.5 w-2.5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>{language === "nl" ? "Toegevoegde suiker" : "Added sugar"}</DialogTitle>
                      <DialogDescription className="text-sm pt-2">
                        {language === "nl" 
                          ? "De American Heart Association beveelt maximaal 25g toegevoegde suiker per dag aan voor vrouwen en 36g voor mannen. Toegevoegde suikers komen van zoetstoffen, niet van volle voedingsmiddelen zoals fruit."
                          : "The American Heart Association recommends a maximum of 25g added sugar per day for women and 36g for men. Added sugars come from sweeteners, not whole foods like fruit."}
                        <p className={`text-xs font-medium mt-2 ${kpiData.addedSugar.percentage > 100 ? 'text-red-500' : 'text-pink-500'}`}>
                          {language === "nl" 
                            ? `Doel: max ${kpiData.addedSugar.target}g per dag`
                            : `Target: max ${kpiData.addedSugar.target}g per day`}
                        </p>
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-[10px] text-gray-500">{kpiData.addedSugar.percentage}%</p>
            </div>

            {/* Free Sugar */}
            <div className="text-center relative">
              <div className="relative w-14 h-14 mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { value: 100, fill: "#f97316" }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={14}
                      outerRadius={24}
                      startAngle={90}
                      endAngle={450}
                      dataKey="value"
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-xs font-bold text-orange-500">{kpiData.freeSugar.value}g</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-0.5">
                <h3 className="text-[10px] font-semibold text-orange-500">
                  {language === "nl" ? "Vrije suiker" : "Free sugar"}
                </h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-orange-500/60 hover:text-orange-500" data-testid="info-free-sugar">
                      <Info className="h-2.5 w-2.5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>{language === "nl" ? "Vrije suiker" : "Free sugar"}</DialogTitle>
                      <DialogDescription className="text-sm pt-2">
                        {language === "nl" 
                          ? "Vrije suikers zijn suikers die niet meer gebonden zijn in celstructuren. Dit omvat vruchtensappen, smoothies, gedroogd fruit en purees. WHO adviseert hier voorzichtig mee te zijn."
                          : "Free sugars are sugars no longer bound in cell structures. This includes fruit juices, smoothies, dried fruits, and purees. WHO advises to be mindful of these."}
                        <p className="text-xs font-medium mt-2 text-orange-500">
                          {language === "nl" 
                            ? "Informatief - wees voorzichtig"
                            : "Informational - be mindful"}
                        </p>
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-[10px] text-gray-500">{language === "nl" ? "Info" : "Info"}</p>
            </div>

            {/* Intrinsic Sugar */}
            <div className="text-center relative">
              <div className="relative w-14 h-14 mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { value: 100, fill: "#a78bfa" }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={14}
                      outerRadius={24}
                      startAngle={90}
                      endAngle={450}
                      dataKey="value"
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-xs font-bold text-violet-400">{kpiData.intrinsicSugar.value}g</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-0.5">
                <h3 className="text-[10px] font-semibold text-violet-400">
                  {language === "nl" ? "Gebonden suiker" : "Intrinsic sugar"}
                </h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-violet-400/60 hover:text-violet-400" data-testid="info-intrinsic-sugar">
                      <Info className="h-2.5 w-2.5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>{language === "nl" ? "Gebonden suiker" : "Intrinsic sugar"}</DialogTitle>
                      <DialogDescription className="text-sm pt-2">
                        {language === "nl" 
                          ? "Gebonden suikers zitten nog vast in de celstructuur van volle voedingsmiddelen zoals vers fruit, groenten en zuivel. Ze worden langzamer opgenomen en bieden gezondheidsvoordelen. Meestal geen strikte limiet; voor energie of glucosestabiliteit zijn totale koolhydraten en vezels vaak informatiever."
                          : "Intrinsic sugars are still bound within the cell structure of whole foods like fresh fruits, vegetables, and dairy. They are absorbed more slowly and provide health benefits. Typically not a main limit; for energy or glucose stability, total carbs and fiber are often more informative."}
                        <p className="text-xs font-medium mt-2 text-violet-500">
                          {language === "nl" 
                            ? "Gezond - geen strikte limiet"
                            : "Healthy - no strict limit"}
                        </p>
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-[10px] text-gray-500">{language === "nl" ? "Info" : "Info"}</p>
            </div>

            </div>
          </div>
        )}

        {!kpiData && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {language === "nl" 
                ? "Genereer een maaltijdplan om je voedingsinzichten te zien" 
                : "Generate a meal plan to see your nutrition insights"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
