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

  // Fetch user profile for dietary preferences
  const { data: userProfile } = useQuery({
    queryKey: ['/api/users/1/profile'],
  });

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
        dietaryTags: userProfile?.dietaryTags || [],
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
    <div className="bg-background">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 lg:px-12 py-8">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-light text-foreground mb-2" style={{ fontFamily: 'Times New Roman, serif', letterSpacing: '0.05em' }}>
            Meal Planner
          </h1>
          <p className="text-muted-foreground">
            Personalised nutrition for your lifestyle
          </p>
          <div className="text-sm text-muted-foreground mt-2">
            Last generated: <span className="text-foreground font-medium">{latestMealPlan ? formatDate(latestMealPlan.createdAt) : "Never"}</span>
          </div>
        </div>
        
        {/* Welcome Message - Week Summary */}
        {latestMealPlan && (
          <div className="card-clean mb-6">
            <div className="p-4">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Welcome back to your week of {formatWeekRange(latestMealPlan.weekStart)}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <div className="text-muted-foreground mb-2">Your protein target</div>
                <div className="text-lg font-semibold text-foreground">
                  {latestMealPlan.totalProtein}g daily
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {latestMealPlan.activityLevel === 'high' ? 'High activity week' : 'Moderate activity week'}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground mb-2">Meal preparation</div>
                <div className="text-lg font-semibold text-foreground">
                  Under 30 minutes
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Quick & nutritious recipes
                </div>
              </div>
              <div>
                <div className="text-muted-foreground mb-2">This week's focus</div>
                <div className="text-lg font-semibold text-foreground">
                  Plant-based nutrition
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Vegetarian, gluten & lactose-free
                </div>
              </div>
            </div>
            {latestOuraData && (
              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <div className="text-sm text-muted-foreground mb-2">
                  Latest activity insight from {formatDate(latestOuraData.date)}
                </div>
                <div className="text-sm text-foreground">
                  Your activity level is <span className="font-medium">{latestOuraData.activityLevel}</span> with {latestOuraData.steps?.toLocaleString() || 'N/A'} steps. 
                  {latestOuraData.periodPhase && (
                    <span className="ml-2">Currently in {latestOuraData.periodPhase} phase.</span>
                  )}
                </div>
              </div>
            )}
            </div>
          </div>
        )}

        {/* Health & Activity Tracking */}
        <div className="card-clean mb-6">
          <div className="p-4">
            <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Activity className="h-6 w-6 text-foreground mr-4" />
              <h2 className="text-xl font-semibold text-foreground">Health & Activity Tracking</h2>
            </div>
            <Badge variant={ouraStatus?.connected ? "default" : "secondary"}>
              {ouraStatus?.connected ? "Connected" : "Not Connected"}
            </Badge>
          </div>
            
            {ouraStatus?.connected ? (
              <div className="space-y-4">
                {latestOuraData && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="bg-card border border-border p-6">
                      <div className="text-xs text-muted-foreground mb-2 font-medium">Activity Score</div>
                      <div className="text-2xl font-bold text-foreground">
                        {latestOuraData.activityScore || 'N/A'}
                      </div>
                    </div>
                    <div className="bg-card border border-border p-6">
                      <div className="text-xs text-muted-foreground mb-2 font-medium">Steps</div>
                      <div className="text-2xl font-bold text-foreground">
                        {latestOuraData.steps?.toLocaleString() || 'N/A'}
                      </div>
                    </div>
                    <div className="bg-card border border-border p-6">
                      <div className="text-xs text-muted-foreground mb-2 font-medium">Sleep Score</div>
                      <div className="text-2xl font-bold text-foreground">
                        {latestOuraData.sleepScore || 'N/A'}
                      </div>
                    </div>
                    <div className="bg-card border border-border p-6">
                      <div className="text-xs text-muted-foreground mb-2 font-medium">Activity Level</div>
                      <div className="text-lg font-bold text-foreground capitalize">
                        {latestOuraData.activityLevel}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Personal Health Metrics */}
                <div className="bg-card border border-border p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-6">
                    Personal Health Metrics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="bg-background border border-border p-4">
                      <div className="text-xs text-muted-foreground mb-2 font-medium">Weight</div>
                      <div className="text-xl font-bold text-foreground">60 kg</div>
                    </div>
                    <div className="bg-background border border-border p-4">
                      <div className="text-xs text-muted-foreground mb-2 font-medium">Waistline</div>
                      <div className="text-xl font-bold text-foreground">75 cm</div>
                    </div>
                    <div className="bg-background border border-border p-4">
                      <div className="text-xs text-muted-foreground mb-2 font-medium">Protein Target</div>
                      <div className="text-xl font-bold text-foreground">{proteinTarget}g</div>
                    </div>
                    <div className="bg-background border border-border p-4">
                      <div className="text-xs text-muted-foreground mb-2 font-medium">Diet Type</div>
                      <div className="text-sm font-medium text-foreground">Vegetarian, GF, LF</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => {
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);
                      syncOuraMutation.mutate(yesterday.toISOString().split('T')[0]);
                    }}
                    disabled={syncOuraMutation.isPending}
                    className="btn-outline"
                  >
                    {syncOuraMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-foreground mr-2" />
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
                    className="btn-minimal"
                  >
                    {smartGenerateMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-foreground mr-2" />
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
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Generation Panel */}
          <div className="lg:col-span-1">
            <div className="card-clean mb-6">
              <div className="p-4 mb-4">
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Generate Meal Plan
                </h2>
                <p className="text-sm text-muted-foreground">
                  Create a personalised 7-day meal plan with precise protein tracking based on your dietary preferences.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-foreground mb-2 block">Activity Level</Label>
                  <Select value={activityLevel} onValueChange={(value: "high" | "low") => setActivityLevel(value)}>
                    <SelectTrigger className="input-clean w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High Activity (130g protein)</SelectItem>
                      <SelectItem value="low">Low Activity (70g protein)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-foreground mb-2 block">Week Starting</Label>
                  <Input
                    type="date"
                    value={weekStart}
                    onChange={(e) => setWeekStart(e.target.value)}
                    className="input-clean w-full"
                  />
                </div>

                {userProfile?.dietaryTags && userProfile.dietaryTags.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-foreground mb-3 block">Your Dietary Preferences</Label>
                    <div className="flex flex-wrap gap-2">
                      {userProfile.dietaryTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag.replace(/-/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Meal plans will be filtered based on these preferences. Update them in your profile.
                    </p>
                  </div>
                )}
                
                <div className="space-y-4">
                  <Button 
                    onClick={() => generateMutation.mutate()}
                    disabled={generateMutation.isPending}
                    className="btn-minimal w-full"
                  >
                    {generateMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
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
                    className="btn-outline w-full"
                  >
                    {autoGenerateMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-foreground mr-2" />
                        Auto-Generating...
                      </>
                    ) : (
                      <>
                        <Calendar className="mr-2 h-4 w-4" />
                        Auto-Generate Next Week
                      </>
                    )}
                  </Button>
                  
                  <p className="text-xs text-muted-foreground">
                    Auto-generate creates a high-activity meal plan for next Monday and syncs to Notion if connected.
                  </p>
                  
                  {/* Shopping List Button */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        disabled={!selectedMealPlan}
                        className="btn-outline w-full"
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
              </div>
            </div>


          </div>

          {/* Meal Plan Display */}
          <div className="lg:col-span-2">
            <div className="card-clean">
              <div className="mb-8">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-foreground">
                    Weekly Meal Plan
                  </h2>
                  <div className="flex items-center space-x-3">
                    <div className="text-sm text-muted-foreground">
                      Week of <span className="text-foreground font-medium">{displayedMealPlan ? formatWeekRange(displayedMealPlan.weekStart) : "No plan"}</span>
                    </div>
                    {displayedMealPlan?.notionSynced && (
                      <Badge variant="secondary">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Synced
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              {loadingCurrentPlan ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-12 bg-muted rounded" />
                  ))}
                </div>
              ) : currentMealPlan?.meals ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-border">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Day</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Meal</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Food</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Portion</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Protein (g)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {[1, 2, 3, 4, 5, 6, 7].map(day => {
                        const dayMeals = getDayMeals(day);
                        const dayTotal = calculateDayTotal(day);
                        
                        return (
                          <React.Fragment key={day}>
                            {dayMeals.map((meal, index) => (
                              <tr key={meal.id} className="hover:bg-muted/50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                                  {index === 0 ? `Day ${day}` : ''}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground capitalize">
                                  {meal.mealType}
                                </td>
                                <td className="px-6 py-4 text-sm text-foreground">
                                  <button
                                    onClick={() => setSelectedMealId(meal.id)}
                                    className="text-left hover:text-primary hover:underline cursor-pointer flex items-center gap-2"
                                  >
                                    <BookOpen className="w-4 h-4" />
                                    {meal.foodDescription}
                                  </button>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                  {meal.portion}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                                  {meal.protein}g
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-muted/30">
                              <td colSpan={4} className="px-6 py-3 text-sm font-medium text-foreground">
                                Day {day} Total
                              </td>
                              <td className="px-6 py-3 text-sm font-semibold text-foreground">
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
                <div className="text-center py-12">
                  <Activity className="mx-auto h-12 w-12 mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No meal plan available. Generate your first meal plan to get started!</p>
                </div>
              )}
              
              {currentMealPlan?.meals && (
                <div className="px-6 py-4 bg-muted/30 border-t border-border mt-6">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      Weekly Average: <span className="font-medium text-foreground">
                        {currentMealPlan.totalProtein.toFixed(1)}g protein/day
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
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
            </div>
          </div>
        </div>

        {/* Status Panel */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-clean">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="text-foreground h-8 w-8" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-muted-foreground">Last Sync</div>
                <div className="text-lg font-semibold text-foreground">
                  {latestMealPlan?.notionSynced ? "Synced" : "Not synced"}
                </div>
              </div>
            </div>
          </div>

          <div className="card-clean">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Target className="text-foreground h-8 w-8" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-muted-foreground">Protein Goal</div>
                <div className="text-lg font-semibold text-foreground">On Track</div>
              </div>
            </div>
          </div>

          <div className="card-clean">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="text-foreground h-8 w-8" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-muted-foreground">Prep Time</div>
                <div className="text-lg font-semibold text-foreground">{"< 30 min/meal"}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Notion Integration - Bottom Section */}
        <div className="card-clean mt-16">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">Notion Integration</h2>
          </div>
          <div className="space-y-6">
            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">Integration Status</Label>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${notionStatus?.connected ? 'bg-foreground' : 'bg-muted-foreground'}`} />
                <span className={`text-sm ${notionStatus?.connected ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {notionStatus?.connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              {!notionStatus?.connected && (
                <p className="text-xs text-muted-foreground mt-2">
                  Please configure NOTION_INTEGRATION_SECRET and NOTION_PAGE_URL environment variables.
                </p>
              )}
            </div>
            
            <Button 
              onClick={() => selectedMealPlan && syncMutation.mutate(selectedMealPlan)}
              disabled={!selectedMealPlan || syncMutation.isPending || !notionStatus?.connected}
              className="btn-minimal w-full"
            >
              {syncMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                  Syncing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Sync to Notion
                </>
              )}
            </Button>
          </div>
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
      </main>
    </div>
  );
}
