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
                    
                    return (
                      <div key={day} className="border rounded-lg p-4">
                        <h3 className="font-semibold text-lg mb-3">{dayNames[day - 1]}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {dayMeals.map((meal, index) => (
                            <div 
                              key={index}
                              className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => setSelectedMealId(meal.id)}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium capitalize text-primary">
                                  {meal.mealType}
                                </span>
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
                          ))}
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