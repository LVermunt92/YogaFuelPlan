import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Clock, Target, Upload, Eye, Download, Share, CheckCircle, Utensils, Activity, ShoppingCart, BookOpen, Timer, ChefHat } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface MealPlan {
  id: number;
  weekStart: string;
  activityLevel: string;
  totalProtein: number;
  notionSynced: boolean;
  createdAt: string;
}

interface Meal {
  id: number;
  day: number;
  mealType: string;
  foodDescription: string;
  portion: string;
  protein: number;
  prepTime: number;
}

interface MealPlanWithMeals extends MealPlan {
  meals: Meal[];
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
  meal: Meal;
  recipe: {
    instructions: string[];
    tips?: string[];
    notes?: string;
  };
  ingredients: string[];
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
  const [activityLevel, setActivityLevel] = useState<"high" | "low">("high");
  const [weekStart, setWeekStart] = useState(() => {
    const nextMonday = new Date();
    const daysUntilMonday = (8 - nextMonday.getDay()) % 7 || 7;
    nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
    return nextMonday.toISOString().split('T')[0];
  });
  const [selectedMealPlan, setSelectedMealPlan] = useState<number | null>(null);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [selectedMealId, setSelectedMealId] = useState<number | null>(null);
  const [showOuraPanel, setShowOuraPanel] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch meal plans
  const { data: mealPlans = [], isLoading: loadingPlans } = useQuery<MealPlan[]>({
    queryKey: ['/api/meal-plans'],
  });

  // Fetch specific meal plan with meals
  const { data: currentMealPlan, isLoading: loadingCurrentPlan } = useQuery<MealPlanWithMeals>({
    queryKey: ['/api/meal-plans', selectedMealPlan?.toString()],
    enabled: !!selectedMealPlan,
  });

  // Fetch Notion status
  const { data: notionStatus } = useQuery({
    queryKey: ['/api/notion/status'],
    retry: false,
  });

  // Fetch shopping list
  const { data: shoppingListData, isLoading: loadingShoppingList } = useQuery<ShoppingListResponse>({
    queryKey: ['/api/meal-plans', selectedMealPlan, 'shopping-list'],
    enabled: !!selectedMealPlan && showShoppingList,
  });

  // Fetch recipe for selected meal
  const { data: recipeData, isLoading: loadingRecipe } = useQuery<RecipeResponse>({
    queryKey: ['/api/meals', selectedMealId, 'recipe'],
    enabled: !!selectedMealId,
  });

  // Generate meal plan mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/meal-plans/generate', {
        activityLevel,
        weekStart,
        userId: 1,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] });
      setSelectedMealPlan(data.mealPlan.id);
      toast({
        title: "Meal Plan Generated",
        description: "Your weekly meal plan has been created successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: "Failed to generate meal plan. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Auto-generate meal plan mutation
  const autoGenerateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/meal-plans/auto-generate');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] });
      setSelectedMealPlan(data.mealPlan.id);
      toast({
        title: "Meal Plan Auto-Generated",
        description: `Weekly meal plan created for next week${data.notionSynced ? ' and synced to Notion' : ''}!`,
      });
    },
    onError: (error) => {
      toast({
        title: "Auto-Generation Failed",
        description: "Failed to auto-generate meal plan. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Sync to Notion mutation
  const syncMutation = useMutation({
    mutationFn: async (mealPlanId: number) => {
      const response = await apiRequest('POST', `/api/meal-plans/${mealPlanId}/sync-notion`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] });
      if (selectedMealPlan) {
        queryClient.invalidateQueries({ queryKey: ['/api/meal-plans', selectedMealPlan.toString()] });
      }
      toast({
        title: "Synced to Notion",
        description: "Meal plan successfully uploaded to your Notion database!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync to Notion. Please check your integration.",
        variant: "destructive",
      });
    },
  });

  const proteinTarget = activityLevel === "high" ? 130 : 70;

  // Oura queries
  const { data: ouraStatus } = useQuery<OuraStatus>({
    queryKey: ["/api/oura/status"],
    refetchInterval: 10000,
  });

  const { data: latestOuraData } = useQuery<OuraData>({
    queryKey: ["/api/oura/latest"],
    enabled: ouraStatus?.connected === true,
  });

  // Oura sync mutation
  const syncOuraMutation = useMutation({
    mutationFn: async (date: string) => {
      const response = await apiRequest('POST', '/api/oura/sync', { date });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/oura/latest'] });
      toast({
        title: "Oura Data Synced",
        description: "Your activity data has been synced successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: "Failed to sync Oura data. Please check your connection.",
        variant: "destructive",
      });
    },
  });

  // Smart meal plan generation based on Oura data
  const smartGenerateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/meal-plans/smart-generate', {
        weekStart,
        userId: 1,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] });
      setSelectedMealPlan(data.mealPlan.id);
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
  const latestMealPlan = mealPlans[0];

  // Auto-select the latest meal plan if none selected
  if (!selectedMealPlan && latestMealPlan && !loadingPlans) {
    setSelectedMealPlan(latestMealPlan.id);
  }

  const displayedMealPlan = currentMealPlan || (latestMealPlan && mealPlans.find(mp => mp.id === latestMealPlan.id));

  const getDayMeals = (day: number) => {
    if (!currentMealPlan?.meals) return [];
    return currentMealPlan.meals.filter(meal => meal.day === day);
  };

  const calculateDayTotal = (day: number) => {
    return getDayMeals(day).reduce((total, meal) => total + meal.protein, 0);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatWeekRange = (weekStart: string) => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Utensils className="text-primary text-2xl mr-3" />
              <h1 className="text-xl font-semibold text-slate-900">AI Meal Planner</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600">
                Last generated: <span>{latestMealPlan ? formatDate(latestMealPlan.createdAt) : "Never"}</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">


        {/* Oura Ring Integration */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Activity className="text-blue-600 mr-2 h-5 w-5" />
                <h2 className="text-lg font-semibold text-slate-900">Oura Ring Integration</h2>
              </div>
              <Badge 
                variant={ouraStatus?.connected ? "default" : "secondary"}
                className={ouraStatus?.connected ? "bg-green-600" : "bg-gray-500"}
              >
                {ouraStatus?.connected ? "Connected" : "Not Connected"}
              </Badge>
            </div>
            
            {ouraStatus?.connected ? (
              <div className="space-y-4">
                {latestOuraData && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-xs text-blue-600 mb-1">Activity Score</div>
                      <div className="text-lg font-semibold text-blue-900">
                        {latestOuraData.activityScore || 'N/A'}
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-xs text-green-600 mb-1">Steps</div>
                      <div className="text-lg font-semibold text-green-900">
                        {latestOuraData.steps?.toLocaleString() || 'N/A'}
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="text-xs text-purple-600 mb-1">Sleep Score</div>
                      <div className="text-lg font-semibold text-purple-900">
                        {latestOuraData.sleepScore || 'N/A'}
                      </div>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-3">
                      <div className="text-xs text-amber-600 mb-1">Activity Level</div>
                      <div className="text-sm font-semibold text-amber-900 capitalize">
                        {latestOuraData.activityLevel}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Personal Health Metrics */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Personal Health Metrics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                      <div className="text-xs text-slate-600 mb-1">Weight</div>
                      <div className="text-lg font-semibold text-slate-900">60 kg</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                      <div className="text-xs text-slate-600 mb-1">Waistline</div>
                      <div className="text-lg font-semibold text-slate-900">75 cm</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                      <div className="text-xs text-slate-600 mb-1">Protein Target</div>
                      <div className="text-lg font-semibold text-emerald-600">{proteinTarget}g</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                      <div className="text-xs text-slate-600 mb-1">Diet Type</div>
                      <div className="text-sm font-medium text-slate-900">Vegetarian, GF, LF</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={() => {
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);
                      syncOuraMutation.mutate(yesterday.toISOString().split('T')[0]);
                    }}
                    disabled={syncOuraMutation.isPending}
                    variant="outline"
                    size="sm"
                  >
                    {syncOuraMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-3 w-3" />
                        Sync Yesterday's Data
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={() => smartGenerateMutation.mutate()}
                    disabled={smartGenerateMutation.isPending}
                    variant="default"
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {smartGenerateMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Activity className="mr-2 h-3 w-3" />
                        Smart Generate Plan
                      </>
                    )}
                  </Button>
                </div>
                
                {latestOuraData && (
                  <div className="text-xs text-slate-600">
                    Last synced: {new Date(latestOuraData.syncedAt).toLocaleDateString()} at {new Date(latestOuraData.syncedAt).toLocaleTimeString()}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-sm font-medium text-gray-900 mb-2">Oura Ring Not Connected</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {ouraStatus?.message || "Connect your Oura Ring to automatically adjust meal plans based on your activity levels."}
                </p>
                <p className="text-xs text-gray-500">
                  Add your OURA_ACCESS_TOKEN to the secrets panel to connect your device.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Generation Panel */}
          <div className="lg:col-span-1">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900">Generate Meal Plan</CardTitle>
                <p className="text-sm text-slate-600 mt-2">
                  Create a 7-day vegetarian, gluten-free, lactose-free meal plan with precise protein tracking.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-slate-700">Activity Level</Label>
                  <Select value={activityLevel} onValueChange={(value: "high" | "low") => setActivityLevel(value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High Activity (130g protein)</SelectItem>
                      <SelectItem value="low">Low Activity (70g protein)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-slate-700">Week Starting</Label>
                  <Input
                    type="date"
                    value={weekStart}
                    onChange={(e) => setWeekStart(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Button 
                    onClick={() => generateMutation.mutate()}
                    disabled={generateMutation.isPending}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    {generateMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Activity className="mr-2 h-4 w-4" />
                        Generate Meal Plan
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={() => autoGenerateMutation.mutate()}
                    disabled={autoGenerateMutation.isPending}
                    className="w-full"
                    variant="outline"
                  >
                    {autoGenerateMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600 mr-2" />
                        Auto-Generating...
                      </>
                    ) : (
                      <>
                        <Calendar className="mr-2 h-4 w-4" />
                        Auto-Generate Next Week
                      </>
                    )}
                  </Button>
                  
                  <p className="text-xs text-slate-500 mt-2">
                    Auto-generate creates a high-activity meal plan for next Monday and syncs to Notion if connected.
                  </p>
                  
                  {/* Shopping List Button */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        disabled={!selectedMealPlan}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={() => setShowShoppingList(true)}
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Generate Shopping List
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Shopping List</DialogTitle>
                      </DialogHeader>
                      
                      {loadingShoppingList ? (
                        <div className="flex justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        </div>
                      ) : shoppingListData ? (
                        <div className="space-y-6">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">
                              Week of {formatWeekRange(shoppingListData.weekStart)}
                            </span>
                            <Badge variant="secondary">
                              {shoppingListData.totalItems} items
                            </Badge>
                          </div>
                          
                          {shoppingListData.categories.map(category => (
                            <div key={category} className="space-y-2">
                              <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-1">
                                {category}
                              </h3>
                              <div className="grid grid-cols-1 gap-2">
                                {shoppingListData.shoppingList
                                  .filter(item => item.category === category)
                                  .map((item, index) => (
                                    <div key={index} className="flex justify-between items-center py-2 px-2 hover:bg-slate-50 rounded">
                                      <span className="text-sm text-slate-900 flex-1">{item.ingredient}</span>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="text-xs font-medium">
                                          {item.totalAmount}
                                        </Badge>
                                        {item.count > 1 && (
                                          <Badge variant="outline" className="text-xs">
                                            {item.count}x
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-slate-500 py-8">
                          Select a meal plan to generate shopping list
                        </p>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>


          </div>

          {/* Meal Plan Display */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="border-b border-slate-200">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-semibold text-slate-900">Weekly Meal Plan</CardTitle>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-slate-600">
                      Week of {displayedMealPlan ? formatWeekRange(displayedMealPlan.weekStart) : "No plan"}
                    </span>
                    {displayedMealPlan?.notionSynced && (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Synced
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              {loadingCurrentPlan ? (
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="h-12 bg-slate-200 rounded" />
                    ))}
                  </div>
                </CardContent>
              ) : currentMealPlan?.meals ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Day</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Meal</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Food</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Portion</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Protein (g)</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {[1, 2, 3, 4, 5, 6, 7].map(day => {
                        const dayMeals = getDayMeals(day);
                        const dayTotal = calculateDayTotal(day);
                        
                        return (
                          <React.Fragment key={day}>
                            {dayMeals.map((meal, index) => (
                              <tr key={meal.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                  {index === 0 ? `Day ${day}` : ''}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 capitalize">
                                  {meal.mealType}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-900">
                                  <button
                                    onClick={() => setSelectedMealId(meal.id)}
                                    className="text-left hover:text-emerald-600 hover:underline cursor-pointer flex items-center gap-2"
                                  >
                                    <BookOpen className="w-4 h-4" />
                                    {meal.foodDescription}
                                  </button>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                  {meal.portion}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">
                                  {meal.protein}g
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-emerald-50">
                              <td colSpan={4} className="px-6 py-3 text-sm font-semibold text-slate-900">
                                Day {day} Total
                              </td>
                              <td className="px-6 py-3 text-sm font-bold text-emerald-700">
                                {dayTotal.toFixed(1)}g
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <CardContent className="p-6 text-center">
                  <div className="text-slate-500">
                    <Activity className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No meal plan available. Generate your first meal plan to get started!</p>
                  </div>
                </CardContent>
              )}
              
              {currentMealPlan?.meals && (
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-slate-600">
                      Weekly Average: <span className="font-semibold text-slate-900">
                        {currentMealPlan.totalProtein.toFixed(1)}g protein/day
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-800">
                        <Download className="mr-1 h-4 w-4" />
                        Export
                      </Button>
                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                        <Share className="mr-1 h-4 w-4" />
                        Share
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Status Panel */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calendar className="text-emerald-500 h-8 w-8" />
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-slate-500">Last Sync</div>
                  <div className="text-lg font-semibold text-slate-900">
                    {latestMealPlan?.notionSynced ? "Synced" : "Not synced"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Target className="text-amber-500 h-8 w-8" />
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-slate-500">Protein Goal</div>
                  <div className="text-lg font-semibold text-emerald-600">On Track</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="text-blue-500 h-8 w-8" />
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-slate-500">Prep Time</div>
                  <div className="text-lg font-semibold text-slate-900">{"< 30 min/meal"}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Notion Integration - Bottom Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">Notion Integration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-slate-700">Integration Status</Label>
              <div className="flex items-center mt-2">
                <div className={`w-3 h-3 rounded-full mr-2 ${notionStatus?.connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <span className={`text-sm ${notionStatus?.connected ? 'text-emerald-600' : 'text-red-600'}`}>
                  {notionStatus?.connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              {!notionStatus?.connected && (
                <p className="text-xs text-slate-500 mt-1">
                  Please configure NOTION_INTEGRATION_SECRET and NOTION_PAGE_URL environment variables.
                </p>
              )}
            </div>
            
            <Button 
              onClick={() => selectedMealPlan && syncMutation.mutate(selectedMealPlan)}
              disabled={!selectedMealPlan || syncMutation.isPending || !notionStatus?.connected}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {syncMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Syncing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Sync to Notion
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recipe Dialog */}
      <Dialog open={!!selectedMealId} onOpenChange={() => setSelectedMealId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-emerald-600" />
              Recipe Details
            </DialogTitle>
          </DialogHeader>
          
          {loadingRecipe ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-slate-200 rounded" />
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-4 bg-slate-200 rounded" />
                  ))}
                </div>
              </div>
            </div>
          ) : recipeData ? (
            <div className="space-y-6">
              {/* Meal Info */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold text-lg text-slate-900 mb-2">
                  {recipeData.meal.foodDescription}
                </h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Portion:</span>
                    <p className="font-medium">{recipeData.meal.portion}</p>
                  </div>
                  <div>
                    <span className="text-slate-600">Protein:</span>
                    <p className="font-medium text-emerald-600">{recipeData.meal.protein}g</p>
                  </div>
                  <div>
                    <span className="text-slate-600">Prep Time:</span>
                    <p className="font-medium flex items-center gap-1">
                      <Timer className="w-3 h-3" />
                      {recipeData.meal.prepTime} min
                    </p>
                  </div>
                </div>
                
                {/* Tags */}
                {recipeData.tags && recipeData.tags.length > 0 && (
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-2">
                      {recipeData.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Vegetable Content */}
              {recipeData.vegetableContent && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                    🥬 Vegetable Content
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-green-700 mb-2">
                        <span className="font-medium">Servings:</span> {recipeData.vegetableContent.servings}
                      </p>
                      {recipeData.vegetableContent.vegetables.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-green-700 mb-1">Vegetables:</p>
                          <div className="flex flex-wrap gap-1">
                            {recipeData.vegetableContent.vegetables.map((veg, index) => (
                              <Badge key={index} variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                {veg}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {recipeData.vegetableContent.benefits.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-green-700 mb-1">Health Benefits:</p>
                        <ul className="space-y-1">
                          {recipeData.vegetableContent.benefits.map((benefit, index) => (
                            <li key={index} className="flex gap-2 text-sm text-green-600">
                              <span className="text-green-500">•</span>
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Ingredients */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Ingredients
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {recipeData.ingredients.map((ingredient, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-slate-700">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0" />
                      {ingredient}
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Instructions */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Instructions
                </h4>
                <ol className="space-y-3">
                  {recipeData.recipe.instructions.map((instruction, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <p className="text-slate-700 leading-relaxed">{instruction}</p>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Tips */}
              {recipeData.recipe.tips && recipeData.recipe.tips.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3">💡 Tips</h4>
                    <ul className="space-y-2">
                      {recipeData.recipe.tips.map((tip, index) => (
                        <li key={index} className="flex gap-2 text-sm text-slate-600">
                          <span className="text-emerald-500">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {/* Notes */}
              {recipeData.recipe.notes && (
                <>
                  <Separator />
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">📝 Notes</h4>
                    <p className="text-blue-800 text-sm leading-relaxed">
                      {recipeData.recipe.notes}
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500">
              <BookOpen className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Recipe not available for this meal.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
