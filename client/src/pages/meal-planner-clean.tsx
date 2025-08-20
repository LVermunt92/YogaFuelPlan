import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Clock, Target, Eye, CheckCircle, Utensils, Activity, ShoppingCart, BookOpen, Timer, ChefHat, Heart, History, RefreshCw, Plus, X, Languages } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Separator } from "@/components/ui/separator";
import { useTranslations, translateDietaryTags, translateDietaryTag } from "@/lib/translations";
import { useLanguage } from "@/contexts/LanguageContext";
import { Textarea } from "@/components/ui/textarea";
import type { User, MealPlan as MealPlanType, Meal as MealType } from "@shared/schema";

// Type alias for easier use
type Meal = MealType;

interface MealPlanWithMeals extends MealPlanType {
  meals: MealType[];
}

interface ShoppingListItem {
  ingredient: string;
  category: string;
  count: number;
  totalAmount: string;
  unit: string;
}

interface ShoppingListResponse {
  mealPlanId: number;
  weekStart: string;
  shoppingList: ShoppingListItem[];
  totalItems: number;
  categories: string[];
}

interface RecipeResponse {
  name: string;
  portion: string;
  ingredients: string[];
  instructions: string[];
  tips?: string[];
  notes?: string;
  prepTime: number;
  nutrition: {
    protein: number;
    calories: number;
    carbohydrates: number;
    fats: number;
    fiber: number;
    sugar: number;
    sodium: number;
    costEuros?: number;
    proteinPerEuro?: number;
  };
  tags: string[];
  vegetableContent: {
    servings: number;
    vegetables: string[];
    benefits: string[];
  };
}

interface OuraData {
  id: number;
  userId: number;
  date: string;
  activityScore: number | null;
  steps: number | null;
  calories: number | null;
  activeCalories: number | null;
  workoutMinutes: number | null;
  readinessScore: number | null;
  sleepScore: number | null;
  periodPhase: string | null;
  activityLevel: string;
  syncedAt: string;
}

interface OuraStatus {
  connected: boolean;
  message: string;
}

export default function MealPlanner() {
  const [selectedMealPlan, setSelectedMealPlan] = useState<number | null>(() => {
    const stored = localStorage.getItem('selectedMealPlan');
    return stored ? parseInt(stored) : null;
  });
  const [selectedWeekType, setSelectedWeekType] = useState<"current" | "next">("current");
  const [selectedMealId, setSelectedMealId] = useState<number | null>(null);
  const [newLeftover, setNewLeftover] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  
  // Get language and translations
  const { language } = useLanguage();
  const t = useTranslations(language);

  // Fetch user profile
  const { data: userProfile, isLoading: profileLoading } = useQuery<User>({
    queryKey: ['/api/users', authUser?.id, 'profile'],
    enabled: !!authUser?.id,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Fetch meal plans
  const { data: mealPlans = [], isLoading: loadingPlans } = useQuery<MealPlanType[]>({
    queryKey: ['/api/meal-plans', authUser?.id],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/meal-plans?userId=${authUser?.id}`);
      return response.json();
    },
    enabled: !!authUser?.id,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Fetch specific meal plan with meals
  const { data: currentMealPlan, isLoading: loadingCurrentPlan } = useQuery<MealPlanWithMeals>({
    queryKey: ['/api/meal-plans', selectedMealPlan?.toString(), language],
    queryFn: () => fetch(`/api/meal-plans/${selectedMealPlan}?language=${language}`).then(res => res.json()),
    enabled: !!selectedMealPlan,
  });

  // Fetch recipe for selected meal
  const { data: recipeData, isLoading: loadingRecipe } = useQuery<RecipeResponse>({
    queryKey: ['/api/meals', selectedMealId, 'recipe', language],
    queryFn: () => fetch(`/api/meals/${selectedMealId}/recipe?language=${language}`).then(res => res.json()),
    enabled: !!selectedMealId,
  });

  // Fetch shopping list for current meal plan
  const { data: shoppingListData, isLoading: loadingShoppingList } = useQuery<ShoppingListResponse>({
    queryKey: ['/api/meal-plans', selectedMealPlan, 'shopping-list', language],
    queryFn: () => fetch(`/api/meal-plans/${selectedMealPlan}/shopping-list?language=${language}`).then(res => res.json()),
    enabled: !!selectedMealPlan,
  });

  // Fetch Oura data
  const { data: ouraData } = useQuery<OuraData[]>({
    queryKey: ['/api/oura', authUser?.id],
    queryFn: () => fetch(`/api/oura/data?userId=${authUser?.id}&days=7`).then(res => res.json()),
    enabled: !!authUser?.id,
  });

  // Fetch Oura status
  const { data: ouraStatus } = useQuery<OuraStatus>({
    queryKey: ['/api/oura/status', authUser?.id],
    queryFn: () => fetch(`/api/oura/status?userId=${authUser?.id}`).then(res => res.json()),
    enabled: !!authUser?.id,
  });

  // Update profile mutation for leftovers
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!authUser?.id) throw new Error('User not authenticated');
      const response = await apiRequest('PATCH', `/api/users/${authUser.id}/profile`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', authUser?.id, 'profile'] });
      toast({
        title: t.success,
        description: "Profile updated successfully",
      });
    },
  });

  // Generate meal plan mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/meal-plans/generate', {
        userId: authUser?.id,
        activityLevel: "high",
        weekType: selectedWeekType,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setSelectedMealPlan(data.id);
      localStorage.setItem('selectedMealPlan', data.id.toString());
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] });
      toast({
        title: t.success,
        description: t.mealPlanGenerated,
      });
    },
  });

  // Helper functions
  const formatWeekRange = (weekStart: string) => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const getDayMeals = (day: number) => {
    if (!currentMealPlan?.meals) return [];
    return currentMealPlan.meals.filter(meal => meal.day === day);
  };

  // Leftover ingredients management
  const addLeftover = () => {
    if (!newLeftover.trim() || !userProfile) return;
    
    const updatedLeftovers = [...(userProfile.leftovers || []), newLeftover.trim()];
    updateProfileMutation.mutate({ leftovers: updatedLeftovers });
    setNewLeftover("");
  };

  const removeLeftover = (index: number) => {
    if (!userProfile) return;
    
    const updatedLeftovers = (userProfile.leftovers || []).filter((_, i) => i !== index);
    updateProfileMutation.mutate({ leftovers: updatedLeftovers });
  };

  // Check if a meal contains leftover ingredients
  const isLeftoverMeal = (meal: Meal) => {
    return meal.foodDescription.toLowerCase().includes('leftover') || 
           meal.foodDescription.toLowerCase().includes('incorporating');
  };

  // Check if a day is a cooking day (has fresh recipes)
  const isCookingDay = (day: number) => {
    const dayMeals = getDayMeals(day);
    return dayMeals.some(meal => !isLeftoverMeal(meal));
  };

  // Check if a day is primarily leftover day
  const isLeftoverDay = (day: number) => {
    const dayMeals = getDayMeals(day);
    const leftoverMeals = dayMeals.filter(meal => isLeftoverMeal(meal));
    return leftoverMeals.length > 0 && leftoverMeals.length >= dayMeals.length / 2;
  };

  // Calculate KPI values from current meal plan
  const calculateKPIs = () => {
    if (!currentMealPlan?.meals) return null;

    const totalCalories = currentMealPlan.meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    const totalFats = currentMealPlan.meals.reduce((sum, meal) => sum + (meal.fats || 0), 0);
    const totalCarbs = currentMealPlan.meals.reduce((sum, meal) => sum + (meal.carbohydrates || 0), 0);
    const daysWithMeals = new Set(currentMealPlan.meals.map(meal => meal.day)).size;

    const avgCaloriesPerDay = daysWithMeals > 0 ? totalCalories / daysWithMeals : 0;
    const avgFatsPerDay = daysWithMeals > 0 ? totalFats / daysWithMeals : 0;
    const avgCarbsPerDay = daysWithMeals > 0 ? totalCarbs / daysWithMeals : 0;

    // Calculate percentages
    const fatCalories = avgFatsPerDay * 9; // 9 calories per gram of fat
    const carbCalories = avgCarbsPerDay * 4; // 4 calories per gram of carbs
    
    const fatPercentage = avgCaloriesPerDay > 0 ? (fatCalories / avgCaloriesPerDay) * 100 : 0;
    const vegetableEstimate = avgFatsPerDay * 0.3; // Rough estimate based on recipes
    const fruitStarchEstimate = avgCarbsPerDay * 0.8; // Rough estimate

    return {
      goodFats: {
        value: Math.round(avgFatsPerDay),
        percentage: Math.round(fatPercentage),
        target: '50-70%'
      },
      vegetables: {
        value: Math.round(vegetableEstimate),
        percentage: Math.round((vegetableEstimate / 500) * 100), // Assuming 500g target
        target: '20% of energy'
      },
      fruitsStarches: {
        value: Math.round(fruitStarchEstimate),
        percentage: Math.round((fruitStarchEstimate / 50) * 100), // Assuming 50g target
        target: '5% of energy'
      }
    };
  };

  const kpiData = calculateKPIs();

  // Auto-select first meal plan
  useEffect(() => {
    if (!selectedMealPlan && mealPlans.length > 0) {
      setSelectedMealPlan(mealPlans[0].id);
      localStorage.setItem('selectedMealPlan', mealPlans[0].id.toString());
    }
  }, [selectedMealPlan, mealPlans]);

  return (
    <div className="bg-background min-h-screen">
      <main className="container mx-auto px-4 py-8">
        {/* Centered Content Container */}
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Welcome Section */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {t.welcomeBack} {userProfile?.firstName || userProfile?.username || ''}
            </h1>
            <p className="text-lg text-gray-600">{t.personalizedMealPlanning}</p>
          </div>

          {/* Leftover Ingredients Management */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-6 w-6" />
                {t.ingredientsToUseUp || 'Ingredients to Use Up'}
              </CardTitle>
              <p className="text-sm text-gray-500">
                {language === 'nl' 
                  ? 'Voeg ingrediënten toe die je deze week wilt opmaken. Deze worden verwerkt in nieuwe recepten.' 
                  : 'Add ingredients you want to use up this week. These will be incorporated into fresh recipes.'
                }
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newLeftover}
                  onChange={(e) => setNewLeftover(e.target.value)}
                  placeholder={language === 'nl' ? 'bijv. spinazie, champignons...' : 'e.g. spinach, mushrooms...'}
                  className="flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addLeftover();
                    }
                  }}
                />
                <Button
                  onClick={addLeftover}
                  disabled={!newLeftover.trim() || updateProfileMutation.isPending}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {userProfile?.leftovers && userProfile.leftovers.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Current ingredients:</Label>
                  <div className="flex flex-wrap gap-2">
                    {userProfile.leftovers.map((leftover, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="flex items-center gap-1"
                      >
                        {leftover}
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-red-500" 
                          onClick={() => removeLeftover(index)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Meal Generation Section */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-6 w-6" />
                {t.generateMealPlan}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t.weekSelection}</Label>
                <Select value={selectedWeekType} onValueChange={(value: "current" | "next") => setSelectedWeekType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">{t.thisWeek}</SelectItem>
                    <SelectItem value="next">{t.nextWeek}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="w-full"
                size="lg"
              >
                {generateMutation.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : (
                  <Activity className="mr-2 h-4 w-4" />
                )}
                {generateMutation.isPending ? t.generating : t.generateMealPlan}
              </Button>
            </CardContent>
          </Card>

          {/* Saved Meal Plans */}
          {mealPlans.length > 0 && (
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-6 w-6" />
                  {t.savedMealPlans || 'Saved Meal Plans'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mealPlans.map((plan, index) => (
                    <div 
                      key={plan.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedMealPlan === plan.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => {
                        setSelectedMealPlan(plan.id);
                        localStorage.setItem('selectedMealPlan', plan.id.toString());
                      }}
                    >
                      <h4 className="font-medium">{plan.planName || `Meal Plan ${index + 1}`}</h4>
                      <p className="text-sm text-gray-500">{t.weekOf} {plan.weekStart}</p>
                      <p className="text-sm text-gray-400">{plan.totalProtein.toFixed(0)}g protein/day</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Nutrition KPIs */}
          {currentMealPlan && kpiData && (
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-6 w-6" />
                  {t.nutritionKPIs || 'Nutrition KPIs'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Good Fats */}
                  <div className="text-center">
                    <div className="relative w-32 h-32 mx-auto mb-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { value: kpiData.goodFats.percentage, fill: "#f97316" },
                              { value: 100 - kpiData.goodFats.percentage, fill: "#f3f4f6" }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={60}
                            startAngle={90}
                            endAngle={450}
                            dataKey="value"
                          >
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-lg font-bold text-orange-600">{kpiData.goodFats.value}g</div>
                          <div className="text-xs text-gray-500">{kpiData.goodFats.percentage}%</div>
                        </div>
                      </div>
                    </div>
                    <h3 className="font-semibold text-orange-600">Good Fats</h3>
                    <p className="text-xs text-gray-500">{kpiData.goodFats.target}</p>
                  </div>

                  {/* Vegetables */}
                  <div className="text-center">
                    <div className="relative w-32 h-32 mx-auto mb-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { value: Math.min(kpiData.vegetables.percentage, 100), fill: "#10b981" },
                              { value: Math.max(100 - kpiData.vegetables.percentage, 0), fill: "#f3f4f6" }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={60}
                            startAngle={90}
                            endAngle={450}
                            dataKey="value"
                          >
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-lg font-bold text-emerald-600">{kpiData.vegetables.value}g</div>
                          <div className="text-xs text-gray-500">{Math.min(kpiData.vegetables.percentage, 100)}%</div>
                        </div>
                      </div>
                    </div>
                    <h3 className="font-semibold text-emerald-600">Vegetables</h3>
                    <p className="text-xs text-gray-500">{kpiData.vegetables.target}</p>
                  </div>

                  {/* Fruits & Starches */}
                  <div className="text-center">
                    <div className="relative w-32 h-32 mx-auto mb-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { value: Math.min(kpiData.fruitsStarches.percentage, 100), fill: "#3b82f6" },
                              { value: Math.max(100 - kpiData.fruitsStarches.percentage, 0), fill: "#f3f4f6" }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={60}
                            startAngle={90}
                            endAngle={450}
                            dataKey="value"
                          >
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">{kpiData.fruitsStarches.value}g</div>
                          <div className="text-xs text-gray-500">{Math.min(kpiData.fruitsStarches.percentage, 100)}%</div>
                        </div>
                      </div>
                    </div>
                    <h3 className="font-semibold text-blue-600">Fruits & Starches</h3>
                    <p className="text-xs text-gray-500">{kpiData.fruitsStarches.target}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activity Tracker */}
          {ouraStatus?.connected && ouraData && ouraData.length > 0 && (
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-6 w-6" />
                  {t.activityTracker || 'Activity Tracker'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {ouraData.slice(0, 4).map((data, index) => (
                    <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-500 mb-1">
                        {new Date(data.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className="space-y-1">
                        {data.steps && (
                          <div className="text-xs">
                            <span className="font-medium">{data.steps.toLocaleString()}</span>
                            <span className="text-gray-500 ml-1">steps</span>
                          </div>
                        )}
                        {data.activityScore && (
                          <div className="text-xs">
                            <span className="font-medium">{data.activityScore}</span>
                            <span className="text-gray-500 ml-1">activity</span>
                          </div>
                        )}
                        {data.sleepScore && (
                          <div className="text-xs">
                            <span className="font-medium">{data.sleepScore}</span>
                            <span className="text-gray-500 ml-1">sleep</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Shopping List */}
          {currentMealPlan && shoppingListData && (
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-6 w-6" />
                  {t.shoppingList || 'Shopping List'}
                </CardTitle>
                <p className="text-sm text-gray-500">
                  {shoppingListData.totalItems} items for week of {formatWeekRange(shoppingListData.weekStart)}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shoppingListData.categories.map((category) => {
                    const categoryItems = shoppingListData.shoppingList.filter(item => item.category === category);
                    if (categoryItems.length === 0) return null;
                    
                    return (
                      <div key={category}>
                        <h4 className="font-semibold text-sm text-gray-700 mb-2">{category}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {categoryItems.map((item, index) => (
                            <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                              <span className="font-medium">{item.ingredient}</span>
                              <span className="text-gray-500">{item.totalAmount}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weekly Meal Plan Display */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-6 w-6" />
                {t.weeklyMealPlan}
              </CardTitle>
              {currentMealPlan && (
                <p className="text-sm text-gray-500">
                  {t.weekOf} {formatWeekRange(currentMealPlan.weekStart)}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {loadingCurrentPlan ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
                  ))}
                </div>
              ) : currentMealPlan?.meals ? (
                <div className="space-y-6">
                  {[1, 2, 3, 4, 5, 6, 7].map(day => {
                    const dayMeals = getDayMeals(day);
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    
                    if (dayMeals.length === 0) return null;
                    
                    const dayIsCooking = isCookingDay(day);
                    const dayIsLeftover = isLeftoverDay(day);
                    
                    return (
                      <div 
                        key={day} 
                        className={`border rounded-lg p-4 ${
                          dayIsCooking ? 'bg-green-50 border-green-200' :
                          dayIsLeftover ? 'bg-blue-50 border-blue-200' :
                          'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <h3 className={`font-semibold text-lg mb-3 flex items-center gap-2 ${
                          dayIsCooking ? 'text-green-800' :
                          dayIsLeftover ? 'text-blue-800' :
                          'text-gray-800'
                        }`}>
                          {dayNames[day - 1]}
                          {dayIsCooking && <ChefHat className="h-4 w-4 text-green-600" />}
                          {dayIsLeftover && <RefreshCw className="h-4 w-4 text-blue-600" />}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {dayMeals.map((meal, index) => {
                            const isLeftover = isLeftoverMeal(meal);
                            return (
                              <div 
                                key={index}
                                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                  isLeftover 
                                    ? 'bg-blue-100 hover:bg-blue-150 border border-blue-300' 
                                    : 'bg-white hover:bg-gray-50 border border-gray-200'
                                }`}
                                onClick={() => setSelectedMealId(meal.id)}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium capitalize text-primary">
                                      {meal.mealType}
                                    </span>
                                    {isLeftover && (
                                      <RefreshCw className="h-3 w-3 text-blue-600" />
                                    )}
                                  </div>
                                  <Badge variant="secondary" className="text-xs">
                                    {meal.protein}g protein
                                  </Badge>
                                </div>
                                <p className="text-sm font-medium text-foreground mb-1">
                                  {meal.foodDescription}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {meal.portion} • {meal.prepTime} min
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Activity className="mx-auto h-12 w-12 mb-4 text-gray-400" />
                  <p className="text-gray-500">No meal plan selected</p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Recipe Dialog */}
        <Dialog open={!!selectedMealId} onOpenChange={() => setSelectedMealId(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                {t.recipeDetails}
              </DialogTitle>
            </DialogHeader>
            
            {loadingRecipe ? (
              <div className="space-y-4 p-6">
                <div className="h-6 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
                  ))}
                </div>
              </div>
            ) : recipeData ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold mb-2">{recipeData.name}</h2>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>Portion: {recipeData.portion}</span>
                    <span>Prep Time: {recipeData.prepTime} min</span>
                    <span>Protein: {recipeData.nutrition.protein}g</span>
                  </div>
                </div>

                {recipeData.ingredients && (
                  <div>
                    <h3 className="font-semibold mb-2">Ingredients:</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {recipeData.ingredients.map((ingredient, index) => (
                        <li key={index} className="text-sm">{ingredient}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {recipeData.instructions && (
                  <div>
                    <h3 className="font-semibold mb-2">Instructions:</h3>
                    <ol className="list-decimal list-inside space-y-2">
                      {recipeData.instructions.map((instruction, index) => (
                        <li key={index} className="text-sm">{instruction}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {recipeData.tips && recipeData.tips.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Tips:</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {recipeData.tips.map((tip, index) => (
                        <li key={index} className="text-sm text-gray-600">{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p>Recipe not available</p>
            )}
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}