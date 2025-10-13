import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, ResponsiveContainer } from "recharts";
import { ArrowLeft, Info } from "lucide-react";
import { Link } from "wouter";
import { useTranslations } from "@/lib/translations";
import { useLanguage } from "@/contexts/LanguageContext";
import { countUniquePlants } from "@/lib/plant-diversity";
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

  // Ingredient to color group mapping
  const getIngredientColors = (ingredients: string[]): Set<string> => {
    const colorGroups = {
      red: ['tomato', 'red pepper', 'bell pepper red', 'strawberr', 'raspberr', 'red cabbage', 'beet', 'red onion', 'cherry tomato', 'radish'],
      orange: ['carrot', 'sweet potato', 'orange', 'pumpkin', 'butternut squash', 'mango', 'papaya', 'apricot', 'peach'],
      yellow: ['yellow pepper', 'corn', 'banana', 'pineapple', 'yellow squash', 'lemon', 'ginger'],
      green: ['spinach', 'broccoli', 'kale', 'lettuce', 'green bean', 'pea', 'zucchini', 'cucumber', 'avocado', 'arugula', 'bok choy', 'celery', 'asparagus', 'edamame', 'lime'],
      purple: ['blueberr', 'purple cabbage', 'eggplant', 'blackberr', 'plum', 'purple potato', 'acai', 'grape'],
      white: ['cauliflower', 'mushroom', 'onion', 'garlic', 'potato', 'white bean', 'chickpea', 'tahini', 'tofu', 'banana']
    };

    const foundColors = new Set<string>();
    
    ingredients.forEach(ingredient => {
      const lowerIngredient = ingredient.toLowerCase();
      Object.entries(colorGroups).forEach(([color, keywords]) => {
        if (keywords.some(keyword => lowerIngredient.includes(keyword))) {
          foundColors.add(color);
        }
      });
    });

    return foundColors;
  };

  // Calculate nutrition data from current meal plan (same logic as meal planner)
  const calculateKPIs = () => {
    if (!currentMealPlan?.meals) return null;

    const totalProtein = currentMealPlan.meals.reduce((sum, meal) => sum + (meal.protein || 0), 0);
    const totalCalories = currentMealPlan.meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    const totalFats = currentMealPlan.meals.reduce((sum, meal) => sum + (meal.fats || 0), 0);
    const totalCarbs = currentMealPlan.meals.reduce((sum, meal) => sum + (meal.carbohydrates || 0), 0);
    const totalFiber = currentMealPlan.meals.reduce((sum, meal) => sum + (meal.fiber || 0), 0);
    const totalVitaminK = currentMealPlan.meals.reduce((sum, meal) => {
      const nutrition = meal.nutrition as any;
      return sum + (nutrition?.vitaminK || 0);
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

    // Calculate daily averages - divide total by 7 days for weekly meal plan
    // This accounts for days with varying meal counts (e.g., one day might have only 1 meal)
    const avgProteinPerDay = totalProtein / 7;
    const avgCaloriesPerDay = totalCalories / 7;
    const avgFatsPerDay = totalFats / 7;
    const avgCarbsPerDay = totalCarbs / 7;
    const avgFiberPerDay = totalFiber / 7;
    const avgVitaminKPerDay = totalVitaminK / 7;

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
      vitaminK: {
        value: Math.round(avgVitaminKPerDay),
        percentage: Math.round((avgVitaminKPerDay / 90) * 100), // 90 mcg is the daily recommendation for women
        target: 90
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
            <div className="text-center relative">
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
              <div className="flex items-center justify-center gap-1">
                <h3 className="text-xs font-semibold text-emerald-600">{t.protein}</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-emerald-600/60 hover:text-emerald-600" data-testid="info-protein">
                      <Info className="h-3 w-3" />
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
              <p className="text-xs text-gray-500">{kpiData.protein.percentage}%</p>
            </div>

            {/* Good Fats */}
            <div className="text-center relative">
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
              <div className="flex items-center justify-center gap-1">
                <h3 className="text-xs font-semibold text-yellow-600">{t.goodFats || 'Good fats'}</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-yellow-600/60 hover:text-yellow-600" data-testid="info-fats">
                      <Info className="h-3 w-3" />
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
              <p className="text-xs text-gray-500">{kpiData.goodFats.percentage}%</p>
            </div>

            {/* Fiber */}
            <div className="text-center relative">
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
              <div className="flex items-center justify-center gap-1">
                <h3 className="text-xs font-semibold text-orange-600">{t.fiber}</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-orange-600/60 hover:text-orange-600" data-testid="info-fiber">
                      <Info className="h-3 w-3" />
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
              <p className="text-xs text-gray-500">{kpiData.fiber.percentage}%</p>
            </div>

            {/* Vegetables */}
            <div className="text-center relative">
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
              <div className="flex items-center justify-center gap-1">
                <h3 className="text-xs font-semibold text-green-600">{t.vegetables}</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-green-600/60 hover:text-green-600" data-testid="info-vegetables">
                      <Info className="h-3 w-3" />
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
              <p className="text-xs text-gray-500">{kpiData.vegetables.percentage}%</p>
            </div>

            {/* Plant Diversity */}
            <div className="text-center relative">
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
              <div className="flex items-center justify-center gap-1">
                <h3 className="text-xs font-semibold text-green-700">{t.plantDiversity}</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-green-700/60 hover:text-green-700" data-testid="info-plant-diversity">
                      <Info className="h-3 w-3" />
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
              <p className="text-xs text-gray-500">{kpiData.plantDiversity.percentage}%</p>
            </div>

            {/* Cocoa Flavanols */}
            <div className="text-center relative">
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
              <div className="flex items-center justify-center gap-1">
                <h3 className="text-xs font-semibold text-purple-600">{t.cocoaFlavanols}</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-purple-600/60 hover:text-purple-600" data-testid="info-cocoa">
                      <Info className="h-3 w-3" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>{t.whyCocoaFlavanolsMatters}</DialogTitle>
                      <DialogDescription className="text-sm pt-2">
                        {t.cocoaFlavanolsTooltip}
                        <p className="text-xs text-purple-600 font-medium mt-2">{t.cocoaFlavanolsNote}</p>
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-xs text-gray-500">{kpiData.cocoaFlavanols.percentage}%</p>
            </div>

            {/* Net Carbs */}
            <div className="text-center relative">
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
              <div className="flex items-center justify-center gap-1">
                <h3 className="text-xs font-semibold text-cyan-600">{language === "nl" ? "Netto koolh." : "Net carbs"}</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-cyan-600/60 hover:text-cyan-600" data-testid="info-net-carbs">
                      <Info className="h-3 w-3" />
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
              <p className="text-xs text-gray-500">{kpiData.netCarbs.percentage}%</p>
            </div>

            {/* Calories */}
            <div className="text-center relative">
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
              <div className="flex items-center justify-center gap-1">
                <h3 className="text-xs font-semibold text-blue-600">{t.calories}</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-blue-600/60 hover:text-blue-600" data-testid="info-calories">
                      <Info className="h-3 w-3" />
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
              <p className="text-xs text-gray-500">{kpiData.calories.percentage}%</p>
            </div>

            {/* Eating the Rainbow */}
            <div className="text-center relative">
              <div className="relative w-20 h-20 mx-auto mb-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { value: Math.min(kpiData.rainbow.percentage, 100), fill: "url(#rainbowGradient)" },
                        { value: Math.max(100 - kpiData.rainbow.percentage, 0), fill: "#f3f4f6" }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={20}
                      outerRadius={35}
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
                  <div className="text-sm font-bold bg-gradient-to-r from-red-500 via-green-500 to-purple-500 bg-clip-text text-transparent">{kpiData.rainbow.value}/{kpiData.rainbow.target}</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1">
                <h3 className="text-xs font-semibold bg-gradient-to-r from-red-500 via-green-500 to-purple-500 bg-clip-text text-transparent">
                  {language === "nl" ? "Regenboog" : "Rainbow"}
                </h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-gray-600/60 hover:text-gray-600" data-testid="info-rainbow">
                      <Info className="h-3 w-3" />
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
              <p className="text-xs text-gray-500">{kpiData.rainbow.percentage}%</p>
            </div>

            {/* Vitamin K */}
            <div className="text-center relative">
              <div className="relative w-20 h-20 mx-auto mb-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { value: Math.min(kpiData.vitaminK.percentage, 100), fill: "#10b981" },
                        { value: Math.max(100 - kpiData.vitaminK.percentage, 0), fill: "#f3f4f6" }
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
                  <div className="text-sm font-bold text-emerald-600">{kpiData.vitaminK.value}mcg</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1">
                <h3 className="text-xs font-semibold text-emerald-600">
                  {language === "nl" ? "Vitamine K" : "Vitamin K"}
                </h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-gray-600/60 hover:text-gray-600" data-testid="info-vitamin-k">
                      <Info className="h-3 w-3" />
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
              <p className="text-xs text-gray-500">{kpiData.vitaminK.percentage}%</p>
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
