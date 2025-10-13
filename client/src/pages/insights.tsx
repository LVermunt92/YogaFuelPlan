import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { ArrowLeft, TrendingUp, Activity, Droplet, Wheat, Apple, Leaf } from "lucide-react";
import { Link } from "wouter";
import { useTranslations } from "@/lib/translations";
import { useLanguage } from "@/contexts/LanguageContext";

interface MealPlan {
  id: number;
  meals: any[];
}

interface NutritionData {
  protein: number;
  calories: number;
  fats: number;
  carbs: number;
  fiber: number;
  sugar: number;
  sodium: number;
  vegetables: number;
  fruitsStarches: number;
}

export default function Insights() {
  const { language } = useLanguage();
  const t = useTranslations(language);

  const { data: selectedMealPlan } = useQuery<MealPlan>({
    queryKey: ["/api/selected-meal-plan"],
  });

  const { data: userProfile } = useQuery<{ gender?: string; fiberTarget?: number }>({
    queryKey: ["/api/user/profile"],
  });

  // Calculate nutrition totals
  const nutritionData: NutritionData = {
    protein: 0,
    calories: 0,
    fats: 0,
    carbs: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    vegetables: 0,
    fruitsStarches: 0,
  };

  if (selectedMealPlan?.meals) {
    selectedMealPlan.meals.forEach((meal) => {
      if (meal.nutrition) {
        nutritionData.protein += meal.nutrition.protein || 0;
        nutritionData.calories += meal.nutrition.calories || 0;
        nutritionData.fats += meal.nutrition.fats || 0;
        nutritionData.carbs += meal.nutrition.carbohydrates || 0;
        nutritionData.fiber += meal.nutrition.fiber || 0;
        nutritionData.sugar += meal.nutrition.sugar || 0;
        nutritionData.sodium += meal.nutrition.sodium || 0;
      }
      if (meal.vegetableContent) {
        nutritionData.vegetables += meal.vegetableContent.servings || 0;
      }
      if (meal.tags?.includes("Fruit") || meal.tags?.includes("Starch")) {
        nutritionData.fruitsStarches += 1;
      }
    });
  }

  // Gender-specific fiber target (30g women, 40g men)
  const fiberTarget = userProfile?.fiberTarget || (userProfile?.gender === "male" ? 40 : 30);
  const calorieTarget = 2000; // Default, could be personalized
  const carbTarget = 250; // Default
  const sugarTarget = 50; // WHO recommendation
  const sodiumTarget = 2300; // mg, recommended daily limit

  // Create chart data for each KPI
  const createChartData = (value: number, target: number, color: string) => {
    const percentage = Math.min((value / target) * 100, 100);
    return [
      { name: "Achieved", value: percentage, fill: color },
      { name: "Remaining", value: 100 - percentage, fill: "#E5E7EB" },
    ];
  };

  const fiberChartData = createChartData(nutritionData.fiber, fiberTarget, "#10B981");
  const caloriesChartData = createChartData(nutritionData.calories, calorieTarget, "#F59E0B");
  const carbsChartData = createChartData(nutritionData.carbs, carbTarget, "#8B5CF6");
  const sugarChartData = createChartData(nutritionData.sugar, sugarTarget, "#EC4899");
  const sodiumChartData = createChartData(nutritionData.sodium, sodiumTarget, "#EF4444");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with back button */}
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {language === "nl" ? "Terug naar maaltijdplanner" : "Back to meal planner"}
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {language === "nl" ? "Voedingsinzichten" : "Nutrition insights"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {language === "nl" 
              ? "Gedetailleerd overzicht van je voedingsdoelen en voortgang" 
              : "Detailed overview of your nutrition goals and progress"}
          </p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Fiber KPI */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wheat className="h-4 w-4 text-green-600" />
                {language === "nl" ? "Vezels" : "Fiber"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="relative w-24 h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={fiberChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius="65%"
                        outerRadius="100%"
                        paddingAngle={2}
                        dataKey="value"
                        startAngle={90}
                        endAngle={450}
                      >
                        {fiberChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-semibold text-foreground">
                      {nutritionData.fiber.toFixed(0)}g
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">{nutritionData.fiber.toFixed(0)}g</div>
                  <div className="text-sm text-gray-500">{language === "nl" ? "van" : "of"} {fiberTarget}g</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {((nutritionData.fiber / fiberTarget) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calories KPI */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-600" />
                {language === "nl" ? "Calorieën" : "Calories"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="relative w-24 h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={caloriesChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius="65%"
                        outerRadius="100%"
                        paddingAngle={2}
                        dataKey="value"
                        startAngle={90}
                        endAngle={450}
                      >
                        {caloriesChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-semibold text-foreground">
                      {nutritionData.calories.toFixed(0)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">{nutritionData.calories.toFixed(0)}</div>
                  <div className="text-sm text-gray-500">{language === "nl" ? "van" : "of"} {calorieTarget}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {((nutritionData.calories / calorieTarget) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Carbohydrates KPI */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wheat className="h-4 w-4 text-purple-600" />
                {language === "nl" ? "Koolhydraten" : "Carbohydrates"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="relative w-24 h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={carbsChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius="65%"
                        outerRadius="100%"
                        paddingAngle={2}
                        dataKey="value"
                        startAngle={90}
                        endAngle={450}
                      >
                        {carbsChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-semibold text-foreground">
                      {nutritionData.carbs.toFixed(0)}g
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">{nutritionData.carbs.toFixed(0)}g</div>
                  <div className="text-sm text-gray-500">{language === "nl" ? "van" : "of"} {carbTarget}g</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {((nutritionData.carbs / carbTarget) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sugar KPI */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Apple className="h-4 w-4 text-pink-600" />
                {language === "nl" ? "Suikers" : "Sugar"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="relative w-24 h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sugarChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius="65%"
                        outerRadius="100%"
                        paddingAngle={2}
                        dataKey="value"
                        startAngle={90}
                        endAngle={450}
                      >
                        {sugarChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-semibold text-foreground">
                      {nutritionData.sugar.toFixed(0)}g
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">{nutritionData.sugar.toFixed(0)}g</div>
                  <div className="text-sm text-gray-500">{language === "nl" ? "van" : "of"} {sugarTarget}g</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {((nutritionData.sugar / sugarTarget) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sodium KPI */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Droplet className="h-4 w-4 text-red-600" />
                {language === "nl" ? "Natrium" : "Sodium"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="relative w-24 h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sodiumChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius="65%"
                        outerRadius="100%"
                        paddingAngle={2}
                        dataKey="value"
                        startAngle={90}
                        endAngle={450}
                      >
                        {sodiumChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-semibold text-foreground">
                      {nutritionData.sodium.toFixed(0)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">{nutritionData.sodium.toFixed(0)}mg</div>
                  <div className="text-sm text-gray-500">{language === "nl" ? "van" : "of"} {sodiumTarget}mg</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {((nutritionData.sodium / sodiumTarget) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vegetables KPI (from main page) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Leaf className="h-4 w-4 text-green-600" />
                {language === "nl" ? "Groenten" : "Vegetables"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="relative w-24 h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={createChartData(nutritionData.vegetables, 21, "#10B981")}
                        cx="50%"
                        cy="50%"
                        innerRadius="65%"
                        outerRadius="100%"
                        paddingAngle={2}
                        dataKey="value"
                        startAngle={90}
                        endAngle={450}
                      >
                        {createChartData(nutritionData.vegetables, 21, "#10B981").map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-semibold text-foreground">
                      {nutritionData.vegetables.toFixed(0)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">{nutritionData.vegetables.toFixed(0)}</div>
                  <div className="text-sm text-gray-500">{language === "nl" ? "van" : "of"} 21</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {((nutritionData.vegetables / 21) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
