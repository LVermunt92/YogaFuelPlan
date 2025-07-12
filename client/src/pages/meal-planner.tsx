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
import { Calendar, Clock, Target, Upload, Eye, Download, Share, CheckCircle, Utensils, Activity, ShoppingCart } from "lucide-react";

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
        {/* User Profile */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">User Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Weight</div>
                <div className="text-2xl font-semibold text-slate-900">60kg</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Daily Activity</div>
                <div className="text-lg font-medium text-slate-900">Ashtanga Yoga</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Protein Target</div>
                <div className="text-2xl font-semibold text-emerald-600">{proteinTarget}g/day</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Dietary Restrictions</div>
                <div className="text-sm text-slate-900">Vegetarian, GF, LF</div>
              </div>
            </div>
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
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    variant="secondary"
                  >
                    {autoGenerateMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
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
                    Auto-generate automatically creates a high-activity meal plan for next Monday and syncs to Notion if connected.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Notion Integration */}
            <Card>
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
                                  {meal.foodDescription}
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
      </div>
    </div>
  );
}
