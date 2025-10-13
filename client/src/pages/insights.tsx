import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, ResponsiveContainer } from "recharts";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useTranslations } from "@/lib/translations";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { countUniquePlants } from "@/lib/plant-diversity";
import { useState, useEffect } from "react";

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

  // Calculate nutrition data from current meal plan (same logic as meal planner)
  const calculateKPIs = () => {
    if (!currentMealPlan?.meals) return null;

    const totalProtein = currentMealPlan.meals.reduce((sum, meal) => sum + (meal.protein || 0), 0);
    const totalCalories = currentMealPlan.meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    const totalFats = currentMealPlan.meals.reduce((sum, meal) => sum + (meal.fats || 0), 0);
    const totalCarbs = currentMealPlan.meals.reduce((sum, meal) => sum + (meal.carbohydrates || 0), 0);
    const totalFiber = currentMealPlan.meals.reduce((sum, meal) => sum + (meal.fiber || 0), 0);

    // Count unique days covered by the meal plan
    const uniqueDays = new Set(currentMealPlan.meals.map(meal => meal.day));
    const daysCovered = uniqueDays.size;

    // Calculate daily averages - divide total by actual days covered
    const avgProteinPerDay = daysCovered > 0 ? totalProtein / daysCovered : 0;
    const avgCaloriesPerDay = daysCovered > 0 ? totalCalories / daysCovered : 0;
    const avgFatsPerDay = daysCovered > 0 ? totalFats / daysCovered : 0;
    const avgCarbsPerDay = daysCovered > 0 ? totalCarbs / daysCovered : 0;
    const avgFiberPerDay = daysCovered > 0 ? totalFiber / daysCovered : 0;

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

    // Targets
    const proteinTarget = nutritionTargets?.protein || 95;
    const caloriesTarget = nutritionTargets?.calories || 2000;
    const netCarbsTarget = 160; // Example target for net carbs

    return {
      protein: {
        value: Math.round(avgProteinPerDay),
        percentage: Math.round((avgProteinPerDay / proteinTarget) * 100),
        target: proteinTarget
      },
      goodFats: {
        value: Math.round(avgFatsPerDay),
        percentage: Math.round(Math.min(fatPercentage, 100)),
        target: 30 // 30% of calories
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 bg-gray-50 p-3 sm:p-4 lg:p-6 rounded-lg w-full">
            
            {/* Protein Chart */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center cursor-help">
                    <div className="relative w-20 h-20 mx-auto mb-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { value: Math.min(kpiData.protein.percentage, 100), fill: "#10b981" },
                              { value: Math.max(100 - kpiData.protein.percentage, 0), fill: "#f3f4f6" }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={20}
                            outerRadius={35}
                            startAngle={90}
                            endAngle={450}
                            dataKey="value"
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-sm font-bold text-emerald-600">{kpiData.protein.value}g</div>
                      </div>
                    </div>
                    <h3 className="text-xs font-semibold text-emerald-600">{t.protein}</h3>
                    <p className="text-xs text-gray-500">{kpiData.protein.percentage}%</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">{t.whyProteinMatters}</p>
                  <p className="text-sm">{t.proteinTooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Good Fats */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center cursor-help">
                    <div className="relative w-20 h-20 mx-auto mb-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { value: kpiData.goodFats.percentage, fill: "#eab308" },
                              { value: 100 - kpiData.goodFats.percentage, fill: "#f3f4f6" }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={20}
                            outerRadius={35}
                            startAngle={90}
                            endAngle={450}
                            dataKey="value"
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-sm font-bold text-yellow-600">{kpiData.goodFats.value}g</div>
                      </div>
                    </div>
                    <h3 className="text-xs font-semibold text-yellow-600">{t.goodFats || 'Good fats'}</h3>
                    <p className="text-xs text-gray-500">{kpiData.goodFats.percentage}%</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">{t.whyHealthyFatsMatters}</p>
                  <p className="text-sm">{t.fatsTooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Fiber */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center cursor-help">
                    <div className="relative w-20 h-20 mx-auto mb-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { value: Math.min(kpiData.fiber.percentage, 100), fill: "#f97316" },
                              { value: Math.max(100 - kpiData.fiber.percentage, 0), fill: "#f3f4f6" }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={20}
                            outerRadius={35}
                            startAngle={90}
                            endAngle={450}
                            dataKey="value"
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-sm font-bold text-orange-600">{kpiData.fiber.value}g</div>
                      </div>
                    </div>
                    <h3 className="text-xs font-semibold text-orange-600">{t.fiber}</h3>
                    <p className="text-xs text-gray-500">{kpiData.fiber.percentage}%</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">{t.whyFiberMatters}</p>
                  <p className="text-sm mb-2">{t.fiberTooltip}</p>
                  <p className="text-xs text-amber-200 font-medium">{t.fiberWarning}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Vegetables */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center cursor-help">
                    <div className="relative w-20 h-20 mx-auto mb-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { value: Math.min(kpiData.vegetables.percentage, 100), fill: "#22c55e" },
                              { value: Math.max(100 - kpiData.vegetables.percentage, 0), fill: "#f3f4f6" }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={20}
                            outerRadius={35}
                            startAngle={90}
                            endAngle={450}
                            dataKey="value"
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-sm font-bold text-green-600">{kpiData.vegetables.value}g</div>
                      </div>
                    </div>
                    <h3 className="text-xs font-semibold text-green-600">{t.vegetables}</h3>
                    <p className="text-xs text-gray-500">{kpiData.vegetables.percentage}%</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">{t.whyVegetablesMatters}</p>
                  <p className="text-sm">{t.vegetablesTooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Plant Diversity */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center cursor-help">
                    <div className="relative w-20 h-20 mx-auto mb-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { value: Math.min(kpiData.plantDiversity.percentage, 100), fill: "#16a34a" },
                              { value: Math.max(100 - kpiData.plantDiversity.percentage, 0), fill: "#f3f4f6" }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={20}
                            outerRadius={35}
                            startAngle={90}
                            endAngle={450}
                            dataKey="value"
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-sm font-bold text-green-700">{kpiData.plantDiversity.value}</div>
                      </div>
                    </div>
                    <h3 className="text-xs font-semibold text-green-700">{t.plantDiversity}</h3>
                    <p className="text-xs text-gray-500">{kpiData.plantDiversity.percentage}%</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">{t.whyPlantDiversityMatters}</p>
                  <p className="text-sm mb-2">{t.plantDiversityTooltip}</p>
                  <p className="text-xs text-green-200 font-medium">{t.plantDiversityTarget}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Cocoa Flavanols */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center cursor-help">
                    <div className="relative w-20 h-20 mx-auto mb-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { value: Math.min(kpiData.cocoaFlavanols.percentage, 100), fill: "#8b5cf6" },
                              { value: Math.max(100 - kpiData.cocoaFlavanols.percentage, 0), fill: "#f3f4f6" }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={20}
                            outerRadius={35}
                            startAngle={90}
                            endAngle={450}
                            dataKey="value"
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-sm font-bold text-purple-600">{kpiData.cocoaFlavanols.value}mg</div>
                      </div>
                    </div>
                    <h3 className="text-xs font-semibold text-purple-600">{t.cocoaFlavanols}</h3>
                    <p className="text-xs text-gray-500">{kpiData.cocoaFlavanols.percentage}%</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">{t.whyCocoaFlavanolsMatters}</p>
                  <p className="text-sm mb-2">{t.cocoaFlavanolsTooltip}</p>
                  <p className="text-xs text-purple-200 font-medium">{t.cocoaFlavanolsTarget}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Net Carbs (NEW) */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center cursor-help">
                    <div className="relative w-20 h-20 mx-auto mb-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { value: Math.min(kpiData.netCarbs.percentage, 100), fill: "#06b6d4" },
                              { value: Math.max(100 - kpiData.netCarbs.percentage, 0), fill: "#f3f4f6" }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={20}
                            outerRadius={35}
                            startAngle={90}
                            endAngle={450}
                            dataKey="value"
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-sm font-bold text-cyan-600">{kpiData.netCarbs.value}g</div>
                      </div>
                    </div>
                    <h3 className="text-xs font-semibold text-cyan-600">{language === "nl" ? "Netto koolh." : "Net carbs"}</h3>
                    <p className="text-xs text-gray-500">{kpiData.netCarbs.percentage}%</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">{language === "nl" ? "Over netto koolhydraten" : "About net carbs"}</p>
                  <p className="text-sm">{language === "nl" 
                    ? "Netto koolhydraten zijn de verteerbare koolhydraten die je lichaam gebruikt voor energie (totale koolhydraten minus vezels). Ze zijn een belangrijke brandstofbron — het verminderen van geraffineerde koolhydraten kan gunstig zijn, maar koolhydraten volledig vermijden kan essentiële voedingsstoffen beperken."
                    : "Net carbs are the digestible carbs your body uses for energy (total carbs minus fiber). They're an important fuel source — reducing refined carbs can be beneficial, but completely avoiding carbs may limit essential nutrients."}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Calories (NEW) */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center cursor-help">
                    <div className="relative w-20 h-20 mx-auto mb-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { value: Math.min(kpiData.calories.percentage, 100), fill: "#3b82f6" },
                              { value: Math.max(100 - kpiData.calories.percentage, 0), fill: "#f3f4f6" }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={20}
                            outerRadius={35}
                            startAngle={90}
                            endAngle={450}
                            dataKey="value"
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-sm font-bold text-blue-600">{kpiData.calories.value}</div>
                      </div>
                    </div>
                    <h3 className="text-xs font-semibold text-blue-600">{t.calories}</h3>
                    <p className="text-xs text-gray-500">{kpiData.calories.percentage}%</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">{language === "nl" ? "Over calorieën" : "About calories"}</p>
                  <p className="text-sm">{language === "nl" 
                    ? "kcal weerspiegelen energie in voedsel, niet noodzakelijkelijk geabsorbeerde energie. Absorptie varieert met voedseltype, verwerking en macronutriënten (bijv. hele noten leveren vaak minder kcal dan op het etiket staat; eiwit heeft hogere verteringskosten)"
                    : "kcal reflect energy in food, not necessarily energy absorbed. Absorption varies with food type, processing, and macronutrients (e.g., whole nuts often yield fewer kcal than labels; protein has a higher digestion cost)"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

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
