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
import { Calendar, Clock, Target, Eye, CheckCircle, Utensils, Activity, ShoppingCart, BookOpen, Timer, ChefHat, Heart, History, RefreshCw, Plus, X, Languages, Users, Minus, Trash2, Euro, TrendingUp } from "lucide-react";
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
  const [showShoppingList, setShowShoppingList] = useState(false);
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
    enabled: !!selectedMealPlan && showShoppingList,
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

  // Fetch latest Oura data
  const { data: latestOuraData } = useQuery<OuraData>({
    queryKey: ["/api/oura/latest", authUser?.id],
    enabled: ouraStatus?.connected === true && !!authUser?.id,
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

  // Smart generation mutation
  const smartGenerateMutation = useMutation({
    mutationFn: async () => {
      if (!authUser?.id) throw new Error('User not authenticated');
      const response = await apiRequest('POST', '/api/meal-plans/smart-generate', {
        weekStart: new Date().toISOString().split('T')[0],
        userId: authUser.id,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans', authUser?.id] });
      setSelectedMealPlan(data.mealPlan.id);
      localStorage.setItem('selectedMealPlan', data.mealPlan.id.toString());
      toast({
        title: "Smart Meal Plan Generated",
        description: `Generated with ${data.determinedActivityLevel} activity level based on ${data.ouraDataUsed ? 'your Oura data' : 'default settings'}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: "Failed to generate smart meal plan. Please try again.",
        variant: "destructive",
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
          
          {/* 1. Welcome Section */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {t.welcomeBack} {userProfile?.firstName || userProfile?.username || ''}
            </h1>
            <p className="text-lg text-gray-600">{t.createPersonalizedMealPlan || 'Create personalized meal plans based on your activity level'}</p>
          </div>

          {/* 2. Compact Nutrition Charts */}
          {currentMealPlan && kpiData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
              {/* Good Fats */}
              <div className="text-center">
                <div className="relative w-20 h-20 mx-auto mb-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { value: kpiData.goodFats.percentage, fill: "#f97316" },
                          { value: 100 - kpiData.goodFats.percentage, fill: "#f3f4f6" }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={35}
                        startAngle={90}
                        endAngle={450}
                        dataKey="value"
                      >
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-sm font-bold text-orange-600">{kpiData.goodFats.value}g</div>
                    </div>
                  </div>
                </div>
                <h3 className="text-xs font-semibold text-orange-600">Good Fats</h3>
                <p className="text-xs text-gray-500">{kpiData.goodFats.percentage}%</p>
              </div>

              {/* Vegetables */}
              <div className="text-center">
                <div className="relative w-20 h-20 mx-auto mb-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { value: Math.min(kpiData.vegetables.percentage, 100), fill: "#10b981" },
                          { value: Math.max(100 - kpiData.vegetables.percentage, 0), fill: "#f3f4f6" }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={35}
                        startAngle={90}
                        endAngle={450}
                        dataKey="value"
                      >
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-sm font-bold text-emerald-600">{kpiData.vegetables.value}g</div>
                    </div>
                  </div>
                </div>
                <h3 className="text-xs font-semibold text-emerald-600">Vegetables</h3>
                <p className="text-xs text-gray-500">{Math.min(kpiData.vegetables.percentage, 100)}%</p>
              </div>

              {/* Fruits & Starches */}
              <div className="text-center">
                <div className="relative w-20 h-20 mx-auto mb-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { value: Math.min(kpiData.fruitsStarches.percentage, 100), fill: "#3b82f6" },
                          { value: Math.max(100 - kpiData.fruitsStarches.percentage, 0), fill: "#f3f4f6" }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={35}
                        startAngle={90}
                        endAngle={450}
                        dataKey="value"
                      >
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-sm font-bold text-blue-600">{kpiData.fruitsStarches.value}g</div>
                    </div>
                  </div>
                </div>
                <h3 className="text-xs font-semibold text-blue-600">Fruits & Starches</h3>
                <p className="text-xs text-gray-500">{Math.min(kpiData.fruitsStarches.percentage, 100)}%</p>
              </div>

              {/* Protein Chart */}
              <div className="text-center">
                <div className="relative w-20 h-20 mx-auto mb-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { value: Math.min(kpiData.protein?.percentage || 0, 100), fill: "#8b5cf6" },
                          { value: Math.max(100 - (kpiData.protein?.percentage || 0), 0), fill: "#f3f4f6" }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={35}
                        startAngle={90}
                        endAngle={450}
                        dataKey="value"
                      >
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-sm font-bold text-purple-600">{kpiData.protein?.value || 0}g</div>
                    </div>
                  </div>
                </div>
                <h3 className="text-xs font-semibold text-purple-600">Protein</h3>
                <p className="text-xs text-gray-500">{Math.min(kpiData.protein?.percentage || 0, 100)}%</p>
              </div>
            </div>
          )}

          {/* 3. Health Tracking (Oura Ring) */}
          {ouraStatus?.connected && ouraData && ouraData.length > 0 && (
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-6 w-6" />
                  {t.recentActivity || 'Recent Activity'}
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

          {/* 4. Meal Plan Generation */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-6 w-6" />
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
                onClick={() => {
                  // Use smart generation if Oura data is available, otherwise use manual settings
                  if (latestOuraData && ouraStatus?.connected) {
                    smartGenerateMutation.mutate();
                  } else {
                    generateMutation.mutate();
                  }
                }}
                disabled={generateMutation.isPending || smartGenerateMutation.isPending}
                className="btn-minimal btn-touch w-full"
              >
                {(generateMutation.isPending || smartGenerateMutation.isPending) ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    {t.generateMealPlan}...
                  </>
                ) : (
                  <>
                    <Activity className="mr-2 h-4 w-4" />
                    {latestOuraData && ouraStatus?.connected ? (t.smartGeneratePlan || 'Smart Generate Plan') : (selectedWeekType === "current" ? (t.generateThisWeek || 'Generate This Week') : (t.generateNextWeek || 'Generate Next Week'))}
                  </>
                )}
              </Button>
              
              <p className="text-xs text-gray-500">
                {latestOuraData && ouraStatus?.connected 
                  ? (language === 'nl' 
                      ? `Gebruikt automatisch je ${latestOuraData.activityLevel === 'high' ? 'hoge' : 'lage'} activiteitsniveau van Oura Ring data`
                      : `Will automatically use your ${latestOuraData.activityLevel} activity level from Oura Ring data`)
                  : (t.createPersonalizedMealPlan || 'Create personalized meal plan based on your activity level')
                }
              </p>
            </CardContent>
          </Card>

          {/* 5. Ingredients to Use Up */}
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
                  className="btn-outline btn-touch"
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

          {/* 6. Grocery List Button */}
          {currentMealPlan && (
            <Card className="w-full">
              <CardContent className="pt-6">
                <Dialog open={showShoppingList} onOpenChange={setShowShoppingList}>
                  <DialogTrigger asChild>
                    <Button className="btn-minimal btn-touch w-full">
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      {t.viewShoppingList || 'View Shopping List'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        {t.shoppingList}
                      </DialogTitle>
                    </DialogHeader>
                    
                    {shoppingListData ? (
                      <div className="space-y-4">
                        <div className="text-sm text-gray-600">
                          {t.totalItems}: {shoppingListData.totalItems}
                        </div>
                        
                        {['Fruits & Vegetables', 'Proteins', 'Pantry Essentials', 'Dairy & Plant-Based', 'Grains & Starches', 'Nuts & Seeds', 'Herbs & Spices', 'Condiments & Oils'].map(category => (
                          <div key={category} className="space-y-2">
                            <h3 className="font-semibold text-foreground border-b pb-1">
                              {category}
                            </h3>
                            <div className="grid grid-cols-1 gap-2">
                              {shoppingListData.shoppingList
                                ?.filter(item => item.category === category)
                                ?.map((item, index) => (
                                  <div key={index} className="flex justify-between items-center py-2 px-2 hover:bg-gray-50 rounded">
                                    <span className="text-sm text-foreground flex-1">{item.ingredient}</span>
                                    <div className="flex items-center">
                                      <span className="text-sm text-gray-500 mr-2">
                                        {item.totalAmount}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-8 text-gray-500">
                        {t.selectMealPlanForShoppingList || 'Select a meal plan to generate shopping list'}
                      </p>
                    )}
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )}

          {/* 7. Saved Meal Plans */}
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

          {/* 8. Weekly Meal Plan Display */}
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-3">
                <BookOpen className="h-6 w-6 text-emerald-600" />
                {recipeData?.name || t.recipe}
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
                {/* Recipe Header */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-orange-600" />
                    <div>
                      <p className="text-xs text-gray-500">{t.prepTime}</p>
                      <p className="font-medium">{recipeData.prepTime} {t.min}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-xs text-gray-500">{t.servings}</p>
                      <p className="font-medium">{recipeData.portion}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-600" />
                    <div>
                      <p className="text-xs text-gray-500">{t.protein}</p>
                      <p className="font-medium">{Math.round(recipeData.nutrition.protein)}g</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-600" />
                    <div>
                      <p className="text-xs text-gray-500">{t.calories}</p>
                      <p className="font-medium">{Math.round(recipeData.nutrition.calories)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Euro className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="text-xs text-gray-500">{t.cost}</p>
                      <p className="font-medium">€{recipeData.nutrition.costEuros?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    <div>
                      <p className="text-xs text-gray-500">{t.proteinPerEuro}</p>
                      <p className="font-medium">{recipeData.nutrition.proteinPerEuro?.toFixed(1) || '0.0'}g/€</p>
                    </div>
                  </div>
                </div>

                {/* Recipe KPIs */}
                {recipeData.nutrition && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg">
                    <div className="text-center">
                      <p className="text-xs text-blue-600 font-medium">{t.goodFats || 'Good Fats'}</p>
                      <p className="text-lg font-bold text-blue-800">{Math.round(recipeData.nutrition.fats || 0)}g</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-green-600 font-medium">{t.vegetables || 'Vegetables'}</p>
                      <p className="text-lg font-bold text-green-800">{recipeData.vegetableContent?.servings || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-orange-600 font-medium">{t.fruitsStarches || 'Fruits/Starches'}</p>
                      <p className="text-lg font-bold text-orange-800">{Math.round(recipeData.nutrition.carbohydrates || 0)}g</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-purple-600 font-medium">{t.fiber || 'Fiber'}</p>
                      <p className="text-lg font-bold text-purple-800">{Math.round(recipeData.nutrition.fiber || 0)}g</p>
                    </div>
                  </div>
                )}

                {/* Dietary Tags */}
                {recipeData.tags && recipeData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {recipeData.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {language === 'nl' ? translateDietaryTag(tag, 'nl') : tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <Separator />

                {/* Ingredients */}
                <div>
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    {t.ingredients}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {recipeData?.ingredients?.map((ingredient, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-gray-500">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0" />
                        {ingredient}
                      </div>
                    )) || <p className="text-sm text-gray-400">No ingredients available</p>}
                  </div>
                </div>

                <Separator />

                {/* Instructions */}
                <div>
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    {t.instructions}
                  </h4>
                  <ol className="space-y-3">
                    {recipeData?.instructions?.map((instruction, index) => (
                      <li key={index} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </span>
                        <p className="text-gray-500 leading-relaxed">{instruction}</p>
                      </li>
                    )) || <p className="text-sm text-gray-400">No instructions available</p>}
                  </ol>
                </div>

                {/* Tips */}
                {recipeData?.tips && recipeData.tips.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold text-foreground mb-3">💡 {t.tips}</h4>
                      <ul className="space-y-2">
                        {recipeData?.tips?.map((tip, index) => (
                          <li key={index} className="flex gap-2 text-sm text-gray-500">
                            <span className="text-emerald-500">•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {/* Notes */}
                {recipeData.notes && (
                  <>
                    <Separator />
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">📝 {t.notes}</h4>
                      <p className="text-blue-800 text-sm leading-relaxed">
                        {recipeData.notes}
                      </p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <BookOpen className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>{t.recipeNotAvailable}</p>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}