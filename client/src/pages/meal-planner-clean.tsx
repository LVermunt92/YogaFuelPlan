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
import { getCurrentWeekSunday, formatWeekDisplay } from '../lib/date-utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Clock, Target, Eye, CheckCircle, Utensils, Activity, ShoppingCart, BookOpen, Timer, ChefHat, Heart, History, RefreshCw, Plus, X, Languages, Users, Minus, Trash2, Euro, TrendingUp, Droplet, Apple, Leaf, Check, Wheat, Settings, ArrowRight, Info } from "lucide-react";
import { useLocation } from "wouter";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslations, translateDietaryTags, translateDietaryTag } from "@/lib/translations";
import { useLanguage } from "@/contexts/LanguageContext";
import { Textarea } from "@/components/ui/textarea";
import { AlbertHeijnIntegration } from "@/components/albert-heijn-integration";
import { WeeklyHighlights } from "@/components/WeeklyHighlights";
import type { User, MealPlan as MealPlanType, Meal as MealType } from "@shared/schema";
import { countUniquePlants } from "@/lib/plant-diversity";

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

// New persistent shopping list types
interface PersistentShoppingListItem {
  id: number;
  productName: string;
  quantity: number;
  unit: string;
  price: number;
  category: string;
  isChecked: boolean;
  checkedAt: string | null;
  sortOrder: number;
  productId?: string;
  imageUrl?: string;
  deepLink?: string;
}

interface PersistentShoppingList {
  id: number;
  userId: number;
  mealPlanId?: number;
  title: string;
  listType: string;
  totalItems: number;
  checkedItems: number;
  generatedAt: string;
  lastUpdated: string;
  isActive: boolean;
  items: PersistentShoppingListItem[];
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

interface NutritionTargets {
  protein: number;
  carbohydrates: number;
  fats: number;
  calories: number;
  fiber: number;
  maintenanceCalories: number;
  bmr: number;
  proteinFactor: number;
  palValue: number;
  carbFactor: number;
  fatPercentage: number;
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

// SeasonalMonthTag component - displays month tags with seasonal ingredient tooltips
function SeasonalMonthTag({ tag, ingredients, language }: { tag: string; ingredients: string[]; language: string }) {
  const [seasonalIngredients, setSeasonalIngredients] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchSeasonalIngredients = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/seasonal/ingredients-for-month?month=${encodeURIComponent(tag)}&ingredients=${encodeURIComponent(JSON.stringify(ingredients))}`
        );
        
        if (response.ok) {
          const data = await response.json();
          setSeasonalIngredients(data.matchingIngredients || []);
        }
      } catch (error) {
        console.error('Failed to fetch seasonal ingredients:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSeasonalIngredients();
  }, [tag, ingredients]);

  const displayTag = language === 'nl' ? translateDietaryTag(tag, 'nl') : tag;
  const displayedIngredients = seasonalIngredients.slice(0, 5);
  const hasMore = seasonalIngredients.length > 5;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="text-xs cursor-help">
            {displayTag}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold text-sm">Seasonal for {displayTag}</p>
            {isLoading ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : seasonalIngredients.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {displayedIngredients.join(', ')}
                {hasMore && '...'}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">No seasonal matches found</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Admin redirect component - handles admin logic without hooks
function AdminRedirect() {
  return (
    <div className="min-h-screen bg-background px-2 py-4">
      <div className="w-full">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Admin Account Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              You're logged in as an administrator. The meal planning interface is designed for regular users.
            </p>
            <p className="text-gray-600 mb-6">
              To access the admin panel with system statistics and management tools, click the button below:
            </p>
            <Button 
              onClick={() => window.location.href = '/admin'}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Settings className="h-4 w-4 mr-2" />
              Go to Admin Panel
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Main meal planner component
function MealPlannerMain() {
  const [, setLocation] = useLocation();
  const [selectedMealPlan, setSelectedMealPlan] = useState<number | null>(() => {
    const stored = localStorage.getItem('selectedMealPlan');
    return stored ? parseInt(stored) : null;
  });
  const [selectedWeekType, setSelectedWeekType] = useState<"current" | "next">("current");
  const [selectedMealId, setSelectedMealId] = useState<number | null>(null);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [newLeftover, setNewLeftover] = useState("");
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  
  // Get language and translations
  const { language } = useLanguage();
  const t = useTranslations(language);

  // Helper functions
  const extractServingNumber = (portion: string): string => {
    if (!portion) return '1';
    const numberMatch = portion.match(/(\d+(?:\.\d+)?)/);
    return numberMatch ? numberMatch[1] : '1';
  };

  const formatWeekRange = (weekStart: string) => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  // Get current week Sunday
  const getCurrentWeekSunday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToSubtract = dayOfWeek;
    
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - daysToSubtract);
    
    return sunday.toISOString().split('T')[0];
  };

  // Get next week Sunday  
  const getNextWeekSunday = () => {
    const today = new Date();
    const daysUntilNextSunday = (7 - today.getDay()) % 7;
    const daysToAdd = daysUntilNextSunday === 0 ? 7 : daysUntilNextSunday;
    
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + daysToAdd);
    
    return nextSunday.toISOString().split('T')[0];
  };

  // Mutations for shopping list item updates
  const updateShoppingListItemMutation = useMutation({
    mutationFn: async ({ itemId, updates }: { itemId: number; updates: { isChecked?: boolean; category?: string } }) => {
      const response = await apiRequest('PUT', `/api/shopping-lists/0/items/${itemId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      // Refetch the shopping list to get updated state
      refetchShoppingList();
      
    },
    onError: (error) => {
      console.error('Error updating shopping list item:', error);
    },
  });

  // Helper functions for shopping list
  const toggleItemChecked = (item: PersistentShoppingListItem) => {
    const newCheckedState = !item.isChecked;
    updateShoppingListItemMutation.mutate({
      itemId: item.id,
      updates: { isChecked: newCheckedState }
    });
    
    // Optimistically update local state
    setCheckedItems(prev => {
      const newChecked = new Set(prev);
      const itemKey = `${item.category}-${item.productName}`;
      if (newCheckedState) {
        newChecked.add(itemKey);
      } else {
        newChecked.delete(itemKey);
      }
      return newChecked;
    });
  };

  const clearAllChecked = () => {
    setCheckedItems(new Set());
  };

  const getItemKey = (ingredient: string, category: string) => `${category}-${ingredient}`;

  // Fetch user profile
  const { data: userProfile, isLoading: profileLoading } = useQuery<User>({
    queryKey: ['/api/users', authUser?.id, 'profile'],
    enabled: !!authUser?.id,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Fetch nutrition targets (includes gender-specific fiber target)
  const { data: nutritionTargets } = useQuery<NutritionTargets>({
    queryKey: ['/api/nutrition/targets', authUser?.id],
    enabled: !!authUser?.id && !!userProfile,
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
  const { data: recipeData, isLoading: loadingRecipe, error: recipeError } = useQuery<RecipeResponse>({
    queryKey: ['/api/meals', selectedMealId, 'recipe', language],
    queryFn: async () => {
      console.log(`Fetching recipe for meal ID: ${selectedMealId}`);
      const response = await fetch(`/api/meals/${selectedMealId}/recipe?language=${language}`);
      if (!response.ok) {
        console.error(`Recipe fetch failed: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to fetch recipe: ${response.status}`);
      }
      const data = await response.json();
      console.log('Recipe data received:', data);
      return data;
    },
    enabled: !!selectedMealId,
    retry: 1,
  });

  // Persistent shopping list - first try to load saved list, then generate fresh if needed
  const { data: persistentShoppingList, isLoading: loadingPersistentList, refetch: refetchShoppingList } = useQuery<PersistentShoppingList | null>({
    queryKey: ['/api/shopping-lists', authUser?.id, selectedMealPlan, language],
    queryFn: async () => {
      if (!authUser?.id || !selectedMealPlan) return null;
      
      try {
        // First, try to get existing saved shopping list
        console.log(`🌐 FRONTEND: Requesting saved shopping list with language: "${language}"`);
        const savedResponse = await apiRequest('GET', `/api/shopping-lists/${authUser.id}?mealPlanId=${selectedMealPlan}&listType=regular&language=${language}`);
        const savedData = await savedResponse.json();
        
        if (savedData.shoppingList) {
          console.log('✅ Found saved shopping list with', savedData.shoppingList.items.length, 'items');
          return savedData.shoppingList;
        }
        
        // No saved list found, generate fresh shopping list
        console.log('🆕 No saved shopping list found, generating fresh one...');
        console.log(`🌐 FRONTEND: Requesting shopping list with language: "${language}"`);
        const freshResponse = await fetch(`/api/meal-plans/${selectedMealPlan}/shopping-list?language=${language}`);
        const freshData: ShoppingListResponse = await freshResponse.json();
        
        // Convert fresh shopping list to persistent format and save it
        const itemsToSave = freshData.shoppingList.map((item, index) => {
          // Parse quantity and unit from totalAmount (e.g., "200g" -> quantity: 200, unit: "g")
          const parseQuantityAndUnit = (totalAmount: string): { quantity: number; unit: string } => {
            if (!totalAmount || totalAmount === '') {
              return { quantity: 1, unit: '' };
            }
            const cleanAmount = totalAmount.trim();
            const match = cleanAmount.match(/^(\d+(?:\.\d+)?)\s*(.*)/);
            if (match) {
              const quantity = parseFloat(match[1]);
              const unit = match[2].trim();
              return { quantity, unit };
            }
            return { quantity: 1, unit: cleanAmount };
          };

          const { quantity, unit } = parseQuantityAndUnit(item.totalAmount);
          
          return {
            productName: item.ingredient,
            quantity: quantity,
            unit: unit,
            price: 0,
            category: item.category,
            sortOrder: index
          };
        });
        
        // Save the new shopping list
        const saveResponse = await apiRequest('POST', '/api/shopping-lists', {
          userId: authUser.id,
          mealPlanId: selectedMealPlan,
          title: `Shopping List - Week ${freshData.weekStart}`,
          listType: 'regular',
          items: itemsToSave
        });
        
        const saveData = await saveResponse.json();
        console.log('💾 Saved new shopping list with', saveData.shoppingList.items.length, 'items');
        return saveData.shoppingList;
        
      } catch (error) {
        console.error('Error with persistent shopping list:', error);
        return null;
      }
    },
    enabled: !!authUser?.id && !!selectedMealPlan,
    staleTime: 0, // Always check for updates
  });

  // Legacy shopping list query (kept for fallback)
  const { data: shoppingListData, isLoading: loadingShoppingList } = useQuery<ShoppingListResponse>({
    queryKey: ['/api/meal-plans', selectedMealPlan, 'shopping-list', language],
    queryFn: () => fetch(`/api/meal-plans/${selectedMealPlan}/shopping-list?language=${language}`).then(res => res.json()),
    enabled: false, // Disabled - we use persistent shopping list now
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
      queryClient.invalidateQueries({ queryKey: ['/api/nutrition/targets', authUser?.id] });
      toast({
        title: t.success,
        description: "Profile updated successfully",
      });
    },
  });

  // Generate meal plan mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!authUser?.id) throw new Error('User not authenticated');
      
      // Calculate the correct week start date based on selected week type
      const weekStart = selectedWeekType === "current" ? getCurrentWeekSunday() : getNextWeekSunday();
      
      const response = await apiRequest('POST', '/api/meal-plans/generate', {
        userId: authUser.id,
        activityLevel: "high",
        weekStart: weekStart,
        dietaryTags: userProfile?.dietaryTags || [],
        leftovers: userProfile?.leftovers || [],
      });
      return response.json();
    },
    onSuccess: (data) => {
      const newMealPlanId = data.mealPlan?.id || data.id;
      setSelectedMealPlan(newMealPlanId);
      localStorage.setItem('selectedMealPlan', newMealPlanId.toString());
      
      // Invalidate all relevant queries to force refresh
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans', authUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans', newMealPlanId.toString(), language] });
      
      toast({
        title: t.success,
        description: `${selectedWeekType === "current" ? "This week's" : "Next week's"} meal plan generated successfully!`,
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

  // Smart generation mutation
  const smartGenerateMutation = useMutation({
    mutationFn: async () => {
      if (!authUser?.id) throw new Error('User not authenticated');
      const response = await apiRequest('POST', '/api/meal-plans/smart-generate', {
        weekStart: getCurrentWeekSunday(),
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

  // Delete meal plan mutation
  const deleteMealPlanMutation = useMutation({
    mutationFn: (mealPlanId: number) => 
      apiRequest('DELETE', `/api/meal-plans/${mealPlanId}?userId=${authUser?.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] });
      toast({ 
        title: "Meal plan deleted successfully",
        description: "The meal plan has been removed from your saved plans"
      });
      
      // If we deleted the currently selected meal plan, clear selection
      if (selectedMealPlan && mealPlans.find(p => p.id === selectedMealPlan)) {
        const remainingPlans = mealPlans.filter(p => p.id !== selectedMealPlan);
        if (remainingPlans.length > 0) {
          setSelectedMealPlan(remainingPlans[0].id);
          localStorage.setItem('selectedMealPlan', remainingPlans[0].id.toString());
        } else {
          setSelectedMealPlan(null);
          localStorage.removeItem('selectedMealPlan');
        }
      }
    },
    onError: (error: any) => {
      console.error('Error deleting meal plan:', error);
      toast({ 
        title: "Failed to delete meal plan", 
        description: error?.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  // Handle meal plan deletion
  const handleDeleteMealPlan = (mealPlanId: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the plan selection
    
    if (confirm("Are you sure you want to delete this meal plan? This action cannot be undone.")) {
      deleteMealPlanMutation.mutate(mealPlanId);
    }
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
    // First check the explicit isLeftover field from database
    if (meal.isLeftover === true) return true;
    
    // Fallback to text-based detection
    return meal.foodDescription.toLowerCase().includes('leftover') || 
           meal.foodDescription.toLowerCase().includes('incorporating');
  };

  // Check if a day is a cooking day (has fresh recipes, not eating out)
  const isCookingDay = (day: number) => {
    const dayMeals = getDayMeals(day);
    return dayMeals.some(meal => 
      !isLeftoverMeal(meal) && 
      meal.foodDescription !== 'Eating out'
    );
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

    const totalProtein = currentMealPlan.meals.reduce((sum, meal) => sum + (meal.protein || 0), 0);
    const totalCalories = currentMealPlan.meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    const totalFats = currentMealPlan.meals.reduce((sum, meal) => sum + (meal.fats || 0), 0);
    const totalCarbs = currentMealPlan.meals.reduce((sum, meal) => sum + (meal.carbohydrates || 0), 0);
    const totalFiber = currentMealPlan.meals.reduce((sum, meal) => sum + (meal.fiber || 0), 0);

    const totalMeals = currentMealPlan.meals.length;

    console.log('KPI Debug:', { totalProtein, totalCalories, totalFats, totalCarbs, totalFiber, totalMeals });

    // Calculate daily averages: average per meal × 3 meals per day
    // This shows what a typical day with 3 meals would look like
    const avgPerMeal = {
      protein: totalMeals > 0 ? totalProtein / totalMeals : 0,
      calories: totalMeals > 0 ? totalCalories / totalMeals : 0,
      fats: totalMeals > 0 ? totalFats / totalMeals : 0,
      carbs: totalMeals > 0 ? totalCarbs / totalMeals : 0,
      fiber: totalMeals > 0 ? totalFiber / totalMeals : 0,
    };
    
    const avgProteinPerDay = avgPerMeal.protein * 3;
    const avgCaloriesPerDay = avgPerMeal.calories * 3;
    const avgFatsPerDay = avgPerMeal.fats * 3;
    const avgCarbsPerDay = avgPerMeal.carbs * 3;
    const avgFiberPerDay = avgPerMeal.fiber * 3;

    // Estimate vegetables from fiber (roughly 30g fiber = 400g vegetables)
    const avgVegetablesPerDay = avgFiberPerDay * 13.3; // Approximate: 1g fiber ≈ 13.3g vegetables
    
    // Calculate percentages
    const fatCalories = avgFatsPerDay * 9; // 9 calories per gram of fat
    const carbCalories = avgCarbsPerDay * 4; // 4 calories per gram of carbs
    
    const fatPercentage = avgCaloriesPerDay > 0 ? (fatCalories / avgCaloriesPerDay) * 100 : 25;
    const fruitStarchEstimate = avgCarbsPerDay * 0.6; // Estimate for fruits/starches
    
    // Use gender-specific fiber target from nutrition calculator (30g women, 40g men)
    const fiberTarget = nutritionTargets?.fiber || 30; // Default to 30g if not loaded yet
    
    // Estimate cocoa flavanols from protein (recipes with cocoa usually have 15-20g protein)
    // Average dark chocolate/cocoa recipes contain ~500mg flavanols per serving
    const avgCocoaFlavanolsPerDay = Math.min(avgProteinPerDay * 8, 500); // Conservative estimate
    const cocoaFlavanolsTarget = 500; // mg/day (400-600mg recommended)
    
    // Estimate plant diversity from fiber (higher fiber = more diverse plants)
    // Rough estimate: 1g fiber ≈ 1 plant food type
    const plantDiversityCount = Math.min(Math.round(avgFiberPerDay), 30);
    const plantDiversityTarget = 30; // 30 different plant foods per week

    // Get user's protein target (default to 95g if not available)
    const proteinTarget = nutritionTargets?.protein || 95;
    const proteinPercentage = proteinTarget > 0 ? (avgProteinPerDay / proteinTarget) * 100 : 0;

    return {
      protein: {
        value: Math.round(avgProteinPerDay),
        percentage: Math.round(proteinPercentage),
        target: `${proteinTarget}g/day`
      },
      goodFats: {
        value: Math.round(avgFatsPerDay),
        percentage: Math.round(Math.min(fatPercentage, 100)),
        target: '25-35%'
      },
      vegetables: {
        value: Math.round(avgVegetablesPerDay),
        percentage: Math.round((avgVegetablesPerDay / 400) * 100), // 400g target
        target: '400g/day'
      },
      fruitsStarches: {
        value: Math.round(fruitStarchEstimate),
        percentage: Math.round(Math.min((fruitStarchEstimate / 60) * 100, 100)), // 60g target
        target: '45-60g/day'
      },
      fiber: {
        value: Math.round(avgFiberPerDay),
        percentage: Math.round((avgFiberPerDay / fiberTarget) * 100), // Gender-specific target
        target: `${fiberTarget}g/day`
      },
      cocoaFlavanols: {
        value: Math.round(avgCocoaFlavanolsPerDay),
        percentage: Math.round(Math.min((avgCocoaFlavanolsPerDay / cocoaFlavanolsTarget) * 100, 100)),
        target: `${cocoaFlavanolsTarget}mg/day`
      },
      plantDiversity: {
        value: plantDiversityCount,
        percentage: Math.round((plantDiversityCount / plantDiversityTarget) * 100),
        target: `${plantDiversityTarget}/week`
      }
    };
  };

  const kpiData = calculateKPIs();

  // Auto-select first meal plan
  useEffect(() => {
    console.log('Meal plans effect:', { selectedMealPlan, mealPlansCount: mealPlans.length });
    
    if (mealPlans.length > 0) {
      // Check if the currently selected meal plan actually exists in the available meal plans
      const selectedPlanExists = mealPlans.some(plan => plan.id === selectedMealPlan);
      
      if (!selectedMealPlan || !selectedPlanExists) {
        // If no meal plan selected or selected one doesn't exist, auto-select the latest one
        const latestMealPlan = mealPlans.reduce((latest, current) => 
          current.id > latest.id ? current : latest
        );
        console.log('Auto-selecting latest meal plan:', latestMealPlan.id);
        setSelectedMealPlan(latestMealPlan.id);
        localStorage.setItem('selectedMealPlan', latestMealPlan.id.toString());
      }
    }
  }, [selectedMealPlan, mealPlans]);

  return (
    <div className="bg-background min-h-screen">
      <main className="container py-6 lg:py-8">
        {/* Centered Content Container */}
        <div className="space-y-6 lg:space-y-8">
          
          {/* 1. Welcome Section */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {t.welcomeBack} {userProfile?.firstName || userProfile?.username || ''}
            </h1>
{t.createPersonalizedMealPlan && <p className="text-lg text-gray-600">{t.createPersonalizedMealPlan}</p>}
          </div>

          {/* 2. Compact Nutrition Charts - Top 4 KPIs */}
          {currentMealPlan && kpiData && (
            <div className="mb-6 relative">
              <button
                onClick={() => setLocation('/insights')}
                className="absolute top-2 right-2 z-10 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors cursor-pointer group"
              >
                <span className="hidden sm:inline">{t.viewInsights || 'View insights'}</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 p-3 sm:p-4 lg:p-6 rounded-lg w-full">
              
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
                      >
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-sm font-bold text-emerald-600">{kpiData.protein.value}g</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <h3 className="text-xs font-semibold text-emerald-600">{t.protein}</h3>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="text-gray-600/60 hover:text-gray-600" data-testid="info-protein">
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

              {/* Fiber Chart */}
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
                      >
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-sm font-bold text-orange-600">{kpiData.fiber.value}g</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <h3 className="text-xs font-semibold text-orange-600">{t.fiber}</h3>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="text-gray-600/60 hover:text-gray-600" data-testid="info-fiber">
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

              {/* Vegetables Chart */}
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
                      >
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-sm font-bold text-green-600">{kpiData.vegetables.value}g</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <h3 className="text-xs font-semibold text-green-600">{t.vegetables}</h3>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="text-gray-600/60 hover:text-gray-600" data-testid="info-vegetables">
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

              {/* Plant Diversity Chart */}
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
                      >
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-sm font-bold text-green-700">{kpiData.plantDiversity.value}</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <h3 className="text-xs font-semibold text-green-700">{t.plantDiversity}</h3>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="text-gray-600/60 hover:text-gray-600" data-testid="info-plant-diversity">
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

              </div>
            </div>
          )}

          {/* 3. Weekly highlights (seasonal + menstrual cycle) */}
          <div className="container">
            <WeeklyHighlights menstrualPhase={userProfile?.menstrualPhase || undefined} />
          </div>

          {/* 4. Health Tracking (Oura Ring) */}
          {ouraStatus?.connected && ouraData && ouraData.length > 0 && (
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-6 w-6" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 lg:gap-4">
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

          {/* 4. Generate Meal Plan (Combined Section) */}
          <Card className="container" padding="none">
            <CardHeader className="pb-4 px-6 pt-6">
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-6 w-6" />
                {t.generateMealPlan}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 px-6 pb-6">
              {/* Week Selection Subtitle */}
              <div>
                <Label className="text-sm font-medium text-gray-700">{t.weekSelection}</Label>
                <Select value={selectedWeekType} onValueChange={(value: "current" | "next") => setSelectedWeekType(value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">{t.thisWeek}</SelectItem>
                    <SelectItem value="next">{t.nextWeek}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Ingredients to Use Subtitle */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">
                  {t.ingredientsToUseUp || 'Ingredients to Use Up'}
                </Label>
                <p className="text-xs text-gray-500">
                  {language === 'nl' 
                    ? 'Heb je ingrediënten in je koelkast die op moeten? Voeg ze hier toe en we zorgen dat ze worden gebruikt in de maaltijden van volgende week.' 
                    : 'Got ingredients in your fridge that need to be used up? Add them here and we\'ll make sure they\'re included in next week\'s meals.'
                  }
                </p>
                
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={newLeftover}
                    onChange={(e) => setNewLeftover(e.target.value)}
                    placeholder={language === 'nl' ? 'bijv. restje spinazie, oude champignons...' : 'e.g. leftover spinach, aging mushrooms...'}
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
                    <Label className="text-sm font-medium">
                      {language === 'nl' ? 'Ingrediënten om op te maken:' : 'Ingredients to use up:'}
                    </Label>
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
                  : t.createPersonalizedMealPlan
                }
              </p>

              {/* Grocery List Button */}
              <Button 
                onClick={() => setShowShoppingList(true)}
                disabled={!currentMealPlan}
                className="btn-minimal btn-touch w-full"
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                {t.generateShoppingList}
              </Button>
            </CardContent>
          </Card>

          {/* Shopping List Dialog (moved outside) */}
          {currentMealPlan && (
            <Dialog open={showShoppingList} onOpenChange={setShowShoppingList}>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
                    <DialogHeader>
                      <DialogTitle>{t.shoppingListHeader}</DialogTitle>
                    </DialogHeader>
                    
                    {loadingPersistentList ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        <p className="ml-3 text-gray-600">{t.loadingShoppingList}</p>
                      </div>
                    ) : persistentShoppingList ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center gap-4 p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div>
                              <h3 className="font-semibold text-gray-900">{persistentShoppingList.title}</h3>
                              <p className="text-sm text-gray-500">
                                {persistentShoppingList.checkedItems} of {persistentShoppingList.totalItems} items checked
                              </p>
                            </div>
                            <Badge variant="secondary" className="text-sm px-3 py-1">
                              {persistentShoppingList.totalItems} items
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Group items by category */}
                        {(() => {
                          const categories = [...new Set(persistentShoppingList.items.map(item => item.category))];
                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {categories.map(category => (
                                <div key={category} className="space-y-3">
                                  <h3 className="font-semibold text-foreground border-b border-border pb-2 text-base">
                                    {category}
                                  </h3>
                                  <div className="space-y-2">
                                    {persistentShoppingList.items
                                    ?.filter(item => item.category === category)
                                    ?.sort((a, b) => a.sortOrder - b.sortOrder)
                                    ?.map((item) => {
                                      return (
                                        <div 
                                          key={item.id} 
                                          className={`py-3 px-3 rounded transition-all duration-200 ${
                                            item.isChecked 
                                              ? 'bg-green-100 border border-green-300' 
                                              : 'bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                          }`}
                                        >
                                          <div className="flex items-center justify-between w-full gap-2">
                                            <div 
                                              className="flex items-center gap-2 flex-grow cursor-pointer"
                                              onClick={() => toggleItemChecked(item)}
                                            >
                                              <span className={`font-medium leading-tight break-words flex-grow text-sm ${
                                                item.isChecked 
                                                  ? 'text-green-700 line-through decoration-2' 
                                                  : 'text-gray-800'
                                              }`}>
                                                {item.productName}
                                              </span>
                                              <span className={`font-semibold text-sm whitespace-nowrap ${
                                                item.isChecked 
                                                  ? 'text-green-600 line-through decoration-2' 
                                                  : 'text-gray-600'
                                              }`}>
                                                {item.quantity} {item.unit}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                        
                        {/* Albert Heijn Integration */}
                        <div className="mt-3 pt-3 border-t border-border">
                          <AlbertHeijnIntegration 
                            ingredients={persistentShoppingList.items?.map(item => 
                              `${item.quantity}${item.unit ? ` ${item.unit}` : ''} ${item.productName}`
                            ) || []}
                            mealPlanId={persistentShoppingList.mealPlanId || selectedMealPlan || undefined}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-8">
                        {t.selectMealPlanForShoppingList}
                      </p>
                    )}
                  </DialogContent>
            </Dialog>
          )}

          {/* 5. Saved Meal Plans */}
          {mealPlans.length > 0 && (
            <Card className="container" padding="none">
              <CardHeader className="pb-1 px-6 pt-6">
                <CardTitle className="flex items-center gap-2">
                  <History className="h-6 w-6" />
                  {t.savedMealPlans || 'Saved Meal Plans'} ({mealPlans.length})
                </CardTitle>
                <p className="text-sm text-gray-500">
                  Click on a meal plan to view its details
                </p>
              </CardHeader>
              <CardContent className="pt-0 px-6 pb-6">
                <div className="space-y-0.5">
                  {mealPlans.map((plan, index) => (
                    <div 
                      key={plan.id}
                      className={`p-2 border rounded-lg cursor-pointer transition-colors w-full ${
                        selectedMealPlan === plan.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => {
                        console.log('Selecting meal plan:', plan.id, plan.planName);
                        setSelectedMealPlan(plan.id);
                        localStorage.setItem('selectedMealPlan', plan.id.toString());
                        // Force re-render by invalidating the meal plan query
                        queryClient.invalidateQueries({ queryKey: ['/api/meal-plans', plan.id.toString(), language] });
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{plan.planName || `Meal Plan ${mealPlans.length - index}`}</h4>
                          <p className="text-sm text-gray-500">{formatWeekRange(plan.weekStart)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm text-emerald-600">
                              {(() => {
                                // Calculate daily average: (total ÷ meals) × 3
                                const mealCount = (plan as any).mealCount || 0;
                                const dailyAvg = mealCount > 0 ? (plan.totalProtein / mealCount) * 3 : plan.totalProtein;
                                return dailyAvg.toFixed(0);
                              })()}g {t.protein.toLowerCase()}/dag
                            </p>
                            <p className="text-xs text-gray-400">{plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : ''}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDeleteMealPlan(plan.id, e)}
                            disabled={deleteMealPlanMutation.isPending}
                            className="text-gray-400 hover:text-red-500 h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 6. Weekly Meal Plan */}
          <Card className="container" padding="none">
            <CardHeader className="pb-4 px-6 pt-6">
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-6 w-6" />
                {t.weeklyMealPlan}
              </CardTitle>
              {currentMealPlan && (
                <p className="text-sm text-gray-500">
                  {formatWeekRange(currentMealPlan.weekStart)}
                </p>
              )}

              {/* Color Legend */}
              {currentMealPlan?.meals && (
                <div className="mt-3 px-6">
                  <p className="text-xs font-medium text-gray-700 mb-2">
                    {language === 'nl' ? 'Kleurlegende:' : 'Color Legend:'}
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 border-l-2 border-green-400 bg-green-50 rounded-sm"></div>
                      <span className="text-green-700">{language === 'nl' ? 'Vers koken' : 'Fresh cooking'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 border-l-2 border-blue-400 bg-blue-50 rounded-sm"></div>
                      <span className="text-blue-700">{language === 'nl' ? 'Restjes' : 'Leftovers'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 border-l-2 border-gray-400 bg-gray-50 rounded-sm"></div>
                      <span className="text-gray-700">{language === 'nl' ? 'Uit eten' : 'Eating out'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5 text-xs text-orange-600 bg-orange-100 px-1 py-0.5 rounded">
                        <Plus className="h-2 w-2" />
                      </div>
                      <span className="text-orange-700">{language === 'nl' ? 'Extra ingrediënten' : 'Added ingredients'}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Show which leftover ingredients were used */}
              {currentMealPlan && userProfile?.leftovers && userProfile.leftovers.length > 0 && (
                <div className="mt-3 px-6">
                  {(() => {
                    // Check if ANY meals use leftover ingredients
                    const hasLeftoverMeals = currentMealPlan.meals?.some(meal => meal.isLeftover === true) || false;
                    
                    if (hasLeftoverMeals) {
                      // If meals use leftovers, mark ALL ingredients as used
                      // (since we don't track which specific ingredient was used per meal)
                      return (
                        <div>
                          <div className="mb-2">
                            <p className="text-sm font-medium text-green-800 mb-1">
                              ✅ {language === 'nl' ? 'Gebruikte restjes:' : 'Used leftovers:'}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {userProfile.leftovers.map((ingredient, index) => (
                                <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {ingredient}
                                </span>
                              ))}
                            </div>
                            <p className="text-xs text-green-600 mt-1">
                              {language === 'nl' 
                                ? 'Deze ingrediënten zijn verwerkt in recepten gemarkeerd met het + icoon'
                                : 'These ingredients are incorporated in recipes marked with the + icon'}
                            </p>
                          </div>
                        </div>
                      );
                    } else {
                      // No leftover meals found
                      return (
                        <div>
                          <p className="text-sm font-medium text-yellow-800 mb-1">
                            ⏳ {language === 'nl' ? 'Nog te gebruiken:' : 'Still to use:'}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {userProfile.leftovers.map((ingredient, index) => (
                              <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                {ingredient}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  })()}
                </div>
              )}
            </CardHeader>
            <CardContent className="px-2 sm:px-6 pb-6">
              {loadingCurrentPlan ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
                  ))}
                </div>
              ) : currentMealPlan?.meals ? (
                <div className="space-y-4">
                  {/* Mobile-friendly list layout */}
                  <div className="block sm:hidden space-y-2">
                    {[1, 2, 3, 4, 5, 6, 7].map(day => {
                      const dayMeals = getDayMeals(day);
                      const dayNames = [t.sunday, t.monday, t.tuesday, t.wednesday, t.thursday, t.friday, t.saturday];
                      
                      if (dayMeals.length === 0) return null;
                      
                      const breakfast = dayMeals.find(meal => meal.mealType === 'breakfast' || meal.mealType === 'ontbijt');
                      const lunch = dayMeals.find(meal => meal.mealType === 'lunch');
                      const dinner = dayMeals.find(meal => meal.mealType === 'dinner' || meal.mealType === 'diner');
                      const dailyProtein = dayMeals.reduce((sum, meal) => sum + meal.protein, 0);
                      
                      const dayIsCooking = isCookingDay(day);
                      const dayIsLeftover = isLeftoverDay(day);
                      
                      return (
                        <div key={day} className="space-y-1">
                          {/* Day header with leftover day indication */}
                          <div className="flex justify-between items-center p-3 font-semibold text-base border rounded-lg bg-white border-gray-200">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-900">{dayNames[day - 1]}</span>
                            </div>
                            <span className="text-emerald-600">{Math.round(dailyProtein)}g {t.protein.toLowerCase()}</span>
                          </div>
                          
                          {/* Individual meal rows - Sunday only shows dinner, other days show all meals */}
                          {day === 1 ? (
                            // Sunday - only dinner
                            dinner && (
                              <div 
                                className={`relative cursor-pointer hover:opacity-90 p-3 border-l-4 rounded-r-lg ${
                                  dinner.foodDescription === 'Eating out'
                                    ? 'border-gray-400 bg-gray-50'
                                    : isLeftoverMeal(dinner) 
                                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20' 
                                      : 'border-green-400 bg-green-50 dark:bg-green-950/20'
                                }`}
                                onClick={() => setSelectedMealId(dinner.id)}
                              >
                                {dinner.foodDescription.toLowerCase().includes('incorporating') && !isLeftoverMeal(dinner) && (
                                  <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1" data-testid="icon-ingredient-reuse">
                                    <Check className="h-3 w-3" />
                                  </div>
                                )}
                                <div className="flex items-center gap-2 mb-1">
                                  <div className={`text-xs font-medium ${
                                    isLeftoverMeal(dinner) ? 'text-blue-700' : 'text-green-700'
                                  }`}>
                                    {t.dinner.toUpperCase()}
                                  </div>
                                  {isLeftoverMeal(dinner) && (
                                    <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                                      <RefreshCw className="h-3 w-3" />
                                      Leftover
                                    </div>
                                  )}
                                </div>
                                <div className="text-sm font-medium text-gray-900 mb-1">{dinner.foodDescription.replace(' (leftover)', '').replace(/\s*\(incorporating leftover.*?\)/g, '')}</div>
                                <div className="text-sm text-gray-600"><span className="text-emerald-600">{dinner.protein}g {t.protein.toLowerCase()}</span> • {dinner.prepTime} min</div>
                              </div>
                            )
                          ) : (
                            // Monday-Saturday - all meals
                            <>
                              {breakfast && (
                                <div 
                                  className={`relative cursor-pointer hover:opacity-90 p-3 border-l-4 rounded-r-lg ${
                                    breakfast.foodDescription === 'Eating out'
                                      ? 'border-gray-400 bg-gray-50'
                                      : isLeftoverMeal(breakfast) 
                                        ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20' 
                                        : 'border-green-400 bg-green-50 dark:bg-green-950/20'
                                  }`}
                                  onClick={() => setSelectedMealId(breakfast.id)}
                                >
                                  {breakfast.foodDescription.toLowerCase().includes('incorporating') && !isLeftoverMeal(breakfast) && (
                                    <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1" data-testid="icon-ingredient-reuse">
                                      <Check className="h-3 w-3" />
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className={`text-xs font-medium ${
                                      breakfast.foodDescription === 'Eating out'
                                        ? 'text-gray-700'
                                        : isLeftoverMeal(breakfast) ? 'text-blue-700' : 'text-green-700'
                                    }`}>
                                      {t.breakfast.toUpperCase()}
                                    </div>
                                    {isLeftoverMeal(breakfast) && (
                                      <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                                        <RefreshCw className="h-3 w-3" />
                                        Leftover
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-sm font-medium text-gray-900 mb-1">{breakfast.foodDescription.replace(' (leftover)', '').replace(/\s*\(incorporating leftover.*?\)/g, '')}</div>
                                  <div className="text-sm text-gray-600"><span className="text-emerald-600">{breakfast.protein}g {t.protein.toLowerCase()}</span> • {breakfast.prepTime} min</div>
                                </div>
                              )}
                              
                              {lunch && (
                                <div 
                                  className={`relative cursor-pointer hover:opacity-90 p-3 border-l-4 rounded-r-lg ${
                                    lunch.foodDescription === 'Eating out'
                                      ? 'border-gray-400 bg-gray-50'
                                      : isLeftoverMeal(lunch) 
                                        ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20' 
                                        : 'border-green-400 bg-green-50 dark:bg-green-950/20'
                                  }`}
                                  onClick={() => setSelectedMealId(lunch.id)}
                                >
                                  {lunch.foodDescription.toLowerCase().includes('incorporating') && !isLeftoverMeal(lunch) && (
                                    <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1" data-testid="icon-ingredient-reuse">
                                      <Check className="h-3 w-3" />
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className={`text-xs font-medium ${
                                      lunch.foodDescription === 'Eating out'
                                        ? 'text-gray-700'
                                        : isLeftoverMeal(lunch) ? 'text-blue-700' : 'text-green-700'
                                    }`}>
                                      LUNCH
                                    </div>
                                    {isLeftoverMeal(lunch) && (
                                      <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                                        <RefreshCw className="h-3 w-3" />
                                        Leftover
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-sm font-medium text-gray-900 mb-1">{lunch.foodDescription.replace(' (leftover)', '').replace(/\s*\(incorporating leftover.*?\)/g, '')}</div>
                                  <div className="text-sm text-gray-600"><span className="text-emerald-600">{lunch.protein}g {t.protein.toLowerCase()}</span> • {lunch.prepTime} min</div>
                                </div>
                              )}
                              
                              {dinner && (
                                <div 
                                  className={`relative cursor-pointer hover:opacity-90 p-3 border-l-4 rounded-r-lg ${
                                    dinner.foodDescription === 'Eating out'
                                      ? 'border-gray-400 bg-gray-50'
                                      : isLeftoverMeal(dinner) 
                                        ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20' 
                                        : 'border-green-400 bg-green-50 dark:bg-green-950/20'
                                  }`}
                                  onClick={() => setSelectedMealId(dinner.id)}
                                >
                                  {dinner.foodDescription.toLowerCase().includes('incorporating') && !isLeftoverMeal(dinner) && (
                                    <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1" data-testid="icon-ingredient-reuse">
                                      <Check className="h-3 w-3" />
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className={`text-xs font-medium ${
                                      dinner.foodDescription === 'Eating out'
                                        ? 'text-gray-700'
                                        : isLeftoverMeal(dinner) ? 'text-blue-700' : 'text-green-700'
                                    }`}>
                                      {t.dinner.toUpperCase()}
                                    </div>
                                    {isLeftoverMeal(dinner) && (
                                      <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                                        <RefreshCw className="h-3 w-3" />
                                        Leftover
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-sm font-medium text-gray-900 mb-1">{dinner.foodDescription.replace(' (leftover)', '').replace(/\s*\(incorporating leftover.*?\)/g, '')}</div>
                                  <div className="text-sm text-gray-600"><span className="text-emerald-600">{dinner.protein}g {t.protein.toLowerCase()}</span> • {dinner.prepTime} min</div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Desktop table layout */}
                  <div className="hidden sm:block">
                    <div className="w-full overflow-x-auto">
                      <div className="bg-white rounded-lg border min-w-[800px]">
                        <table className="w-full table-fixed">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="w-20 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                              <th className="w-60 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Breakfast</th>
                              <th className="w-60 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lunch</th>
                              <th className="w-60 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dinner</th>
                              <th className="w-24 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Protein</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {[1, 2, 3, 4, 5, 6, 7].map(day => {
                              const dayMeals = getDayMeals(day);
                              const dayNames = [t.sunday, t.monday, t.tuesday, t.wednesday, t.thursday, t.friday, t.saturday];
                              
                              if (dayMeals.length === 0) return null;
                              
                              const breakfast = dayMeals.find(meal => meal.mealType === 'breakfast' || meal.mealType === 'ontbijt');
                              const lunch = dayMeals.find(meal => meal.mealType === 'lunch');
                              const dinner = dayMeals.find(meal => meal.mealType === 'dinner' || meal.mealType === 'diner');
                              const dailyProtein = dayMeals.reduce((sum, meal) => sum + meal.protein, 0);
                              
                              const dayIsCooking = isCookingDay(day);
                              const dayIsLeftover = isLeftoverDay(day);
                              
                              return (
                                <tr key={day} className={dayIsCooking ? 'bg-green-50 dark:bg-green-950/20' : dayIsLeftover ? 'bg-blue-50 dark:bg-blue-950/20' : 'bg-white dark:bg-gray-900'}>
                                  <td className="px-2 py-4">
                                    <div className="flex flex-col items-start gap-1">
                                      <span className="text-xs font-medium text-gray-900">{dayNames[day - 1].slice(0, 3)}</span>
                                    </div>
                                  </td>
                                  <td className="px-2 py-4">
                                    {breakfast && (
                                      <div 
                                        className={`relative cursor-pointer hover:bg-gray-100 p-2 rounded border-l-2 ${
                                          breakfast.foodDescription === 'Eating out'
                                            ? 'border-gray-400 bg-gray-50'
                                            : isLeftoverMeal(breakfast) 
                                              ? 'border-blue-400' 
                                              : 'border-green-400'
                                        }`}
                                        onClick={() => setSelectedMealId(breakfast.id)}
                                      >
                                        {breakfast.foodDescription.toLowerCase().includes('incorporating') && !isLeftoverMeal(breakfast) && (
                                          <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5" data-testid="icon-ingredient-reuse">
                                            <Check className="h-2.5 w-2.5" />
                                          </div>
                                        )}
                                        <div className="text-xs font-medium text-gray-900 mb-1 line-clamp-3">{breakfast.foodDescription}</div>
                                        <div className="text-xs text-gray-500"><span className="text-emerald-600">{breakfast.protein}g</span> • {breakfast.prepTime}min</div>
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-2 py-4">
                                    {lunch && (
                                      <div 
                                        className={`relative cursor-pointer hover:bg-gray-100 p-2 rounded border-l-2 ${
                                          lunch.foodDescription === 'Eating out'
                                            ? 'border-gray-400 bg-gray-50'
                                            : isLeftoverMeal(lunch) 
                                              ? 'border-blue-400' 
                                              : 'border-green-400'
                                        }`}
                                        onClick={() => setSelectedMealId(lunch.id)}
                                      >
                                        {lunch.foodDescription.toLowerCase().includes('incorporating') && !isLeftoverMeal(lunch) && (
                                          <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5" data-testid="icon-ingredient-reuse">
                                            <Check className="h-2.5 w-2.5" />
                                          </div>
                                        )}
                                        <div className="text-xs font-medium text-gray-900 mb-1 line-clamp-3">{lunch.foodDescription}</div>
                                        <div className="text-xs text-gray-500"><span className="text-emerald-600">{lunch.protein}g</span> • {lunch.prepTime}min</div>
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-2 py-4">
                                    {dinner && (
                                      <div 
                                        className={`relative cursor-pointer hover:bg-gray-100 p-2 rounded border-l-2 ${
                                          dinner.foodDescription === 'Eating out'
                                            ? 'border-gray-400 bg-gray-50'
                                            : isLeftoverMeal(dinner) 
                                              ? 'border-blue-400' 
                                              : 'border-green-400'
                                        }`}
                                        onClick={() => setSelectedMealId(dinner.id)}
                                      >
                                        {dinner.foodDescription.toLowerCase().includes('incorporating') && !isLeftoverMeal(dinner) && (
                                          <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5" data-testid="icon-ingredient-reuse">
                                            <Check className="h-2.5 w-2.5" />
                                          </div>
                                        )}
                                        <div className="text-xs font-medium text-gray-900 mb-1 line-clamp-3">{dinner.foodDescription}</div>
                                        <div className="text-xs text-gray-500"><span className="text-emerald-600">{dinner.protein}g</span> • {dinner.prepTime}min</div>
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-2 py-4 text-center">
                                    <div className="text-xs font-bold text-emerald-600">{Math.round(dailyProtein)}g</div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
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
        <Dialog open={!!selectedMealId} onOpenChange={() => {
          console.log('Dialog onOpenChange called, closing dialog');
          setSelectedMealId(null);
        }}>
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
            ) : recipeError ? (
              <div className="p-6 text-center">
                <div className="text-red-500 mb-2">⚠️ Recipe loading failed</div>
                <div className="text-sm text-gray-600 mb-4">
                  Unable to load recipe details. Error: {(recipeError as Error).message}
                </div>
                <Button 
                  onClick={() => setSelectedMealId(null)}
                  variant="outline"
                  size="sm"
                >
                  Close
                </Button>
              </div>
            ) : recipeData ? (
              <div className="space-y-6">
                {/* Basic Recipe Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <Timer className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                    <p className="text-sm text-gray-500 font-medium">{t.prepTime}</p>
                    <p className="text-lg font-bold text-gray-800">{recipeData.prepTime} {t.min}</p>
                  </div>
                  <div className="text-center">
                    <Users className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                    <p className="text-sm text-gray-500 font-medium">{t.servings}</p>
                    <p className="text-lg font-bold text-gray-800">{extractServingNumber(recipeData.portion)}</p>
                  </div>
                </div>

                {/* Nutrition Information Box */}
                <div className="border border-gray-200 rounded-lg p-4 bg-white">
                  <div className="text-center mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">Nutrition Information</h3>
                    <p className="text-xs text-gray-500 italic">All values are per serving</p>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                    <div className="text-center">
                      <Activity className="w-4 h-4 text-orange-600 mx-auto mb-0.5" />
                      <p className="text-xs text-gray-500 font-medium">{t.calories}</p>
                      <p className="text-sm font-bold text-gray-800">{Math.round(recipeData.nutrition.calories)}</p>
                    </div>
                    <div className="text-center">
                      <Target className="w-4 h-4 text-emerald-600 mx-auto mb-0.5" />
                      <p className="text-xs text-gray-500 font-medium">{t.protein}</p>
                      <p className="text-sm font-bold text-gray-800">{Math.round(recipeData.nutrition.protein)}g</p>
                    </div>
                    <div className="text-center">
                      <Droplet className="w-4 h-4 text-yellow-600 mx-auto mb-0.5" />
                      <p className="text-xs text-gray-500 font-medium">Good Fats</p>
                      <p className="text-sm font-bold text-gray-800">{Math.round(recipeData.nutrition.fats || 0)}g</p>
                    </div>
                    <div className="text-center">
                      <Wheat className="w-4 h-4 text-orange-600 mx-auto mb-0.5" />
                      <p className="text-xs text-gray-500 font-medium">{t.fiber}</p>
                      <p className="text-sm font-bold text-gray-800">{Math.round(recipeData.nutrition.fiber || 0)}g</p>
                    </div>
                    <div className="text-center">
                      <Leaf className="w-4 h-4 text-blue-600 mx-auto mb-0.5" />
                      <p className="text-xs text-gray-500 font-medium">{t.vegetables || 'Vegetables'}</p>
                      <p className="text-sm font-bold text-gray-800">{Math.round((recipeData.vegetableContent?.servings || 0) * 80)}g</p>
                    </div>
                    <div className="text-center">
                      <Apple className="w-4 h-4 text-blue-600 mx-auto mb-0.5" />
                      <p className="text-xs text-gray-500 font-medium">{t.fruitsStarches || 'Fruits/Starches'}</p>
                      <p className="text-sm font-bold text-gray-800">{Math.round(recipeData.nutrition.carbohydrates || 0)}g</p>
                    </div>
                    <div className="text-center">
                      <Euro className="w-4 h-4 text-gray-600 mx-auto mb-0.5" />
                      <p className="text-xs text-gray-500 font-medium">{t.cost}</p>
                      <p className="text-sm font-bold text-gray-800">€{recipeData.nutrition.costEuros?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div className="text-center">
                      <TrendingUp className="w-4 h-4 text-gray-600 mx-auto mb-0.5" />
                      <p className="text-xs text-gray-500 font-medium">{t.proteinPerEuro}</p>
                      <p className="text-sm font-bold text-gray-800">{recipeData.nutrition.proteinPerEuro?.toFixed(1) || '0.0'}g/€</p>
                    </div>
                  </div>
                </div>

                {/* Dietary Tags */}
                {recipeData.tags && recipeData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {recipeData.tags.map((tag, index) => {
                      // Check if this tag is a month name
                      const monthNames = [
                        'january', 'february', 'march', 'april', 'may', 'june',
                        'july', 'august', 'september', 'october', 'november', 'december',
                        'januari', 'februari', 'maart', 'april', 'mei', 'juni',
                        'juli', 'augustus', 'september', 'oktober', 'november', 'december'
                      ];
                      
                      const isMonthTag = monthNames.includes(tag.toLowerCase());
                      
                      if (isMonthTag) {
                        return <SeasonalMonthTag key={index} tag={tag} ingredients={recipeData.ingredients} language={language} />;
                      }
                      
                      return (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {language === 'nl' ? translateDietaryTag(tag, 'nl') : tag}
                        </Badge>
                      );
                    })}
                  </div>
                )}

                {/* Recipe Benefits */}
                {(recipeData.recipeBenefits?.length > 0 || recipeData.vegetableContent?.benefits?.length > 0) && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                      ✨ {t.recipeBenefits || 'Recipe Benefits'}
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      {recipeData.recipeBenefits?.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-green-700 mb-1">{t.healthBenefits || 'Health Benefits'}:</p>
                          <ul className="space-y-1">
                            {recipeData.recipeBenefits.map((benefit, index) => (
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

                {/* Vegetable Content */}
                {recipeData.vegetableContent && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                      🥬 {t.vegetableContent}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-green-700 mb-2">
                          <span className="font-medium">{t.servings}:</span> {recipeData.vegetableContent.servings}
                        </p>
                        {recipeData.vegetableContent?.vegetables?.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-green-700 mb-1">{t.vegetables}:</p>
                            <div className="flex flex-wrap gap-1">
                              {recipeData?.vegetableContent?.vegetables?.map((veg, index) => (
                                <Badge key={index} variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                  {veg}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
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
                    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">📝 {t.notes}</h4>
                      <p className="text-blue-800 text-sm leading-relaxed">
                        {recipeData.notes}
                      </p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="p-6 text-center">
                {selectedMealId ? (
                  <div>
                    <div className="text-red-500 mb-4">⚠️ Recipe not found</div>
                    <div className="text-sm text-gray-600 mb-4">
                      This recipe isn't available in the database. Meal ID: {selectedMealId}
                    </div>
                    <Button 
                      onClick={() => setSelectedMealId(null)}
                      variant="outline"
                      size="sm"
                    >
                      Close
                    </Button>
                  </div>
                ) : (
                  <div className="text-gray-500">
                    <BookOpen className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>{t.recipeNotAvailable}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}

// Wrapper component that handles admin vs regular user logic
export default function MealPlanner() {
  const { user: authUser } = useAuth();
  
  // Check if user is admin and should bypass meal planning requirements
  const isAdmin = authUser?.username === 'admin' || authUser?.email?.includes('admin');

  // Admin users get redirected to admin panel
  if (isAdmin) {
    return <AdminRedirect />;
  }

  // Regular users get the meal planner
  return <MealPlannerMain />;
}