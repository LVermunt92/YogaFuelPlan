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
import { Calendar, Clock, Target, Upload, Eye, Download, Share, CheckCircle, Utensils, Activity, ShoppingCart, BookOpen, Timer, ChefHat, Heart, History, RefreshCw, Plus, X, Languages, Copy, ExternalLink } from "lucide-react";
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
  const [activityLevel, setActivityLevel] = useState<"high" | "low">("high");
  const [weekStart, setWeekStart] = useState(() => {
    // Start with current week (this Sunday)
    const thisWeek = new Date();
    const daysUntilSunday = (7 - thisWeek.getDay()) % 7;
    if (daysUntilSunday > 0) {
      thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay()); // Go back to this Sunday
    }
    return thisWeek.toISOString().split('T')[0];
  });
  const [selectedWeekType, setSelectedWeekType] = useState<"current" | "next">("current");
  const [selectedMealPlan, setSelectedMealPlan] = useState<number | null>(() => {
    // Try to load from localStorage on initial mount
    const stored = localStorage.getItem('selectedMealPlan');
    return stored ? parseInt(stored) : null;
  });
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [selectedMealId, setSelectedMealId] = useState<number | null>(null);
  const [showOuraPanel, setShowOuraPanel] = useState(false);
  const [newLeftover, setNewLeftover] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  
  // Fetch user profile for dietary preferences
  const { data: userProfile, isLoading: profileLoading } = useQuery<User>({
    queryKey: ['/api/users', authUser?.id, 'profile'],
    enabled: !!authUser?.id,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Refetch when component mounts
  });

  // Get language from context
  const { language } = useLanguage();
  const t = useTranslations(language);

  // Additional state for multi-plan management
  const [showPlanManagement, setShowPlanManagement] = useState(false);
  const [selectedBackupPlan, setSelectedBackupPlan] = useState<number | null>(null);
  const [savePlanLabel, setSavePlanLabel] = useState("");

  // Fetch meal plans for current user
  const { data: mealPlans = [], isLoading: loadingPlans } = useQuery<MealPlanType[]>({
    queryKey: ['/api/meal-plans', authUser?.id],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/meal-plans?userId=${authUser?.id}`);
      return response.json();
    },
    enabled: !!authUser?.id,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Refetch when component mounts
  });

  // Fetch active meal plans (for alternating)
  const { data: activePlansData } = useQuery({
    queryKey: ['/api/meal-plans/active', authUser?.id],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/meal-plans/active?userId=${authUser?.id}`);
      return response.json();
    },
    enabled: !!authUser?.id,
  });

  // Fetch weekend grocery plans (current + next week)
  const { data: weekendGroceryData } = useQuery({
    queryKey: ['/api/meal-plans/weekend-grocery', authUser?.id],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/meal-plans/weekend-grocery/${authUser?.id}`);
      return response.json();
    },
    enabled: !!authUser?.id,
  });

  // Fetch specific meal plan with meals
  const { data: currentMealPlan, isLoading: loadingCurrentPlan } = useQuery<MealPlanWithMeals>({
    queryKey: ['/api/meal-plans', selectedMealPlan?.toString(), language],
    queryFn: () => fetch(`/api/meal-plans/${selectedMealPlan}?language=${language}`).then(res => res.json()),
    enabled: !!selectedMealPlan,
  });

  // Fetch Notion status
  const { data: notionStatus } = useQuery({
    queryKey: ['/api/notion/status'],
    retry: false,
  });

  // Fetch shopping list
  const { data: shoppingListData, isLoading: loadingShoppingList } = useQuery<ShoppingListResponse>({
    queryKey: ['/api/meal-plans', selectedMealPlan, 'shopping-list', language],
    queryFn: () => fetch(`/api/meal-plans/${selectedMealPlan}/shopping-list?language=${language}`).then(res => res.json()),
    enabled: !!selectedMealPlan && showShoppingList,
  });

  // Fetch recipe for selected meal
  const { data: recipeData, isLoading: loadingRecipe } = useQuery<RecipeResponse>({
    queryKey: ['/api/meals', selectedMealId, 'recipe', language],
    queryFn: () => fetch(`/api/meals/${selectedMealId}/recipe?language=${language}`).then(res => res.json()),
    enabled: !!selectedMealId,
  });

  // Update user profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: { leftovers?: string[] }) => {
      if (!authUser?.id) throw new Error('User not authenticated');
      const response = await apiRequest('PUT', `/api/users/${authUser.id}/profile`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', authUser?.id, 'profile'] });
    },
  });

  // Add ingredient function
  const addLeftover = () => {
    if (!newLeftover.trim()) return;
    const currentLeftovers = userProfile?.leftovers || [];
    const updatedLeftovers = [...currentLeftovers, newLeftover.trim()];
    updateProfileMutation.mutate({ leftovers: updatedLeftovers }, {
      onSuccess: () => {
        toast({
          title: t.ingredientAdded,
          description: `"${newLeftover.trim()}" ${t.ingredientAdded.toLowerCase()}`,
        });
      },
      onError: () => {
        toast({
          title: t.error,
          description: t.failedToAddIngredient,
          variant: "destructive",
        });
      }
    });
    setNewLeftover("");
  };

  // Remove ingredient function
  const removeLeftover = (index: number) => {
    const currentLeftovers = userProfile?.leftovers || [];
    const removedItem = currentLeftovers[index];
    const updatedLeftovers = currentLeftovers.filter((_, i) => i !== index);
    updateProfileMutation.mutate({ leftovers: updatedLeftovers }, {
      onSuccess: () => {
        toast({
          title: t.ingredientRemoved,
          description: `"${removedItem}" ${t.ingredientRemoved.toLowerCase()}`,
        });
      },
      onError: () => {
        toast({
          title: t.error,
          description: t.failedToRemoveIngredient,
          variant: "destructive",
        });
      }
    });
  };



  // Helper to calculate week dates
  const getWeekDates = () => {
    const today = new Date();
    const currentSunday = new Date(today);
    currentSunday.setDate(today.getDate() - today.getDay()); // This Sunday
    
    const nextSunday = new Date(currentSunday);
    nextSunday.setDate(currentSunday.getDate() + 7); // Next Sunday
    
    return {
      current: currentSunday.toISOString().split('T')[0],
      next: nextSunday.toISOString().split('T')[0]
    };
  };

  // Check for existing plans before generating
  const checkAndGenerate = async () => {
    const weekDates = getWeekDates();
    const targetWeek = selectedWeekType === "current" ? weekDates.current : weekDates.next;
    
    // Check if a plan already exists for this week
    const existingPlan = mealPlans.find(plan => plan.weekStart === targetWeek);
    
    if (existingPlan) {
      // Ask user if they want to overwrite
      const confirmed = window.confirm(
        `${language === 'nl' ? 
          `Je hebt al een maaltijdplan voor ${selectedWeekType === "current" ? "deze week" : "volgende week"}. Wil je het vervangen?` :
          `You already have a meal plan for ${selectedWeekType === "current" ? "this week" : "next week"}. Do you want to replace it?`
        }`
      );
      if (!confirmed) {
        return;
      }
      // Delete existing plan first
      await apiRequest('DELETE', `/api/meal-plans/${existingPlan.id}?userId=${authUser?.id}`);
    }
    
    // Generate new plan
    generateMutation.mutate();
  };

  // Generate meal plan mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!authUser?.id) throw new Error('User not authenticated');
      const weekDates = getWeekDates();
      const targetWeek = selectedWeekType === "current" ? weekDates.current : weekDates.next;
      
      const response = await apiRequest('POST', '/api/meal-plans/generate', {
        activityLevel,
        weekStart: targetWeek,
        userId: authUser.id,
        dietaryTags: userProfile?.dietaryTags || [],
        leftovers: userProfile?.leftovers || [],
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans', authUser?.id] });
      setSelectedMealPlan(data.mealPlan.id);
      toast({
        title: t.mealPlanGenerated,
        description: `${selectedWeekType === "current" ? "This week's" : "Next week's"} meal plan created!`,
      });
    },
    onError: (error) => {
      toast({
        title: t.generationFailed,
        description: t.failedToGenerateMealPlan,
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

  // Regenerate meal plan mutation with user preferences
  const regenerateMutation = useMutation({
    mutationFn: async ({ weekStart, activityLevel }: { weekStart?: string; activityLevel?: string }) => {
      const response = await apiRequest('POST', '/api/meal-plans/regenerate', {
        userId: authUser?.id,
        weekStart: weekStart || new Date().toISOString().split('T')[0],
        activityLevel: activityLevel || 'high',
        dietaryTags: userProfile?.dietaryTags || []
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] });
      setSelectedMealPlan(data.mealPlan.id);
      toast({
        title: "Meal Plan Updated",
        description: "Your meal plan has been regenerated with your current preferences.",
      });
    },
    onError: (error) => {
      toast({
        title: "Regeneration Failed",
        description: "Failed to update meal plan. Please try again.",
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

  // Delete meal plan mutation
  const deleteMutation = useMutation({
    mutationFn: async (mealPlanId: number) => {
      const response = await apiRequest('DELETE', `/api/meal-plans/${mealPlanId}`);
      return response.json();
    },
    onSuccess: (data, deletedPlanId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans', authUser?.id] });
      // If the deleted plan was selected, clear the selection
      if (selectedMealPlan === deletedPlanId) {
        setSelectedMealPlan(null);
      }
      toast({
        title: t.mealPlanDeleted || "Meal Plan Deleted",
        description: t.mealPlanDeletedSuccessfully || "The meal plan has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: t.deleteFailed || "Delete Failed",
        description: error.message || t.failedToDeleteMealPlan || "Failed to delete the meal plan. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Save meal plan mutation
  const saveMealPlanMutation = useMutation({
    mutationFn: async ({ mealPlanId, label }: { mealPlanId: number; label: string }) => {
      const response = await apiRequest('POST', '/api/meal-plans/save', {
        mealPlanId,
        label,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans', authUser?.id] });
      setSavePlanLabel("");
      toast({
        title: t.planSaved || "Plan Saved",
        description: t.mealPlanSavedSuccessfully || "Meal plan saved successfully",
      });
    },
    onError: () => {
      toast({
        title: t.error || "Error",
        description: t.failedToSavePlan || "Failed to save meal plan",
        variant: "destructive",
      });
    },
  });



  // Mutations for meal plan management  
  const createBackupPlanMutation = useMutation({
    mutationFn: async (mealPlanId: number) => {
      const response = await apiRequest('POST', `/api/meal-plans/${mealPlanId}/create-backup`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans/weekend-grocery'] });
      toast({
        title: "Backup Plan Created",
        description: "You can now alternate between your current and backup plans for weekend groceries",
      });
    },
  });

  const createNextWeekPlanMutation = useMutation({
    mutationFn: async (mealPlanId: number) => {
      const response = await apiRequest('POST', `/api/meal-plans/${mealPlanId}/create-next-week`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans/weekend-grocery'] });
      toast({
        title: "Next Week Plan Created",
        description: "You now have both this week and next week plans for complete grocery planning",
      });
    },
  });

  const togglePlanActiveMutation = useMutation({
    mutationFn: async ({ mealPlanId, isActive }: { mealPlanId: number; isActive: boolean }) => {
      const response = await apiRequest('PATCH', `/api/meal-plans/${mealPlanId}/toggle-active`, { isActive });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans/active'] });
      toast({
        title: "Plan Status Updated",
        description: "Plan activation status changed successfully",
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
    queryKey: ["/api/oura/latest", authUser?.id],
    enabled: ouraStatus?.connected === true && !!authUser?.id,
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
      if (!authUser?.id) throw new Error('User not authenticated');
      const response = await apiRequest('POST', '/api/meal-plans/smart-generate', {
        weekStart,
        userId: authUser.id,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans', authUser?.id] });
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

  // Meal favorites mutations
  const addToFavoritesMutation = useMutation({
    mutationFn: async (meal: Meal) => {
      const response = await apiRequest('POST', '/api/meal-favorites', {
        userId: authUser?.id,
        mealName: meal.foodDescription,
        mealType: meal.mealType,
        protein: meal.protein,
        prepTime: meal.prepTime,
        portion: meal.portion,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t.addedToFavorites,
        description: t.mealSavedToFavorites,
      });
    },
    onError: () => {
      toast({
        title: t.error,
        description: t.failedToAddFavorite,
        variant: "destructive",
      });
    },
  });

  const removeFromFavoritesMutation = useMutation({
    mutationFn: async (mealName: string) => {
      const response = await apiRequest('DELETE', `/api/meal-favorites/${authUser?.id}/${encodeURIComponent(mealName)}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t.removedFromFavorites,
        description: t.mealRemovedFromFavorites,
      });
    },
    onError: () => {
      toast({
        title: t.error,
        description: t.failedToRemoveFavorite,
        variant: "destructive",
      });
    },
  });

  // Meal history mutation
  const addToHistoryMutation = useMutation({
    mutationFn: async (meal: Meal) => {
      const response = await apiRequest('POST', '/api/meal-history', {
        userId: authUser?.id,
        mealName: meal.foodDescription,
        mealType: meal.mealType,
        protein: meal.protein,
        prepTime: meal.prepTime,
        portion: meal.portion,
      });
      return response.json();
    },
  });

  // Helper function to check if meal plan is current week
  const isCurrentWeek = (weekStart: string) => {
    const today = new Date();
    const planDate = new Date(weekStart);
    const weekEndDate = new Date(planDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6); // Add 6 days for week end
    
    return today >= planDate && today <= weekEndDate;
  };

  // Find current week's meal plan or latest meal plan
  const currentWeekPlan = Array.isArray(mealPlans) ? mealPlans.find((plan: any) => isCurrentWeek(plan.weekStart)) : null;
  const latestMealPlan = Array.isArray(mealPlans) && mealPlans.length > 0 ? mealPlans[0] : null;
  const preferredPlan = currentWeekPlan || latestMealPlan;

  // Auto-select the current week's meal plan (or latest if no current week plan)
  useEffect(() => {
    if (!selectedMealPlan && Array.isArray(mealPlans) && mealPlans.length > 0 && !loadingPlans && preferredPlan) {
      setSelectedMealPlan(preferredPlan.id);
      // Store in localStorage for persistence across sessions
      localStorage.setItem('selectedMealPlan', preferredPlan.id.toString());
    }
  }, [selectedMealPlan, mealPlans, loadingPlans, preferredPlan]);

  // Load meal plan from localStorage on component mount
  useEffect(() => {
    const storedMealPlanId = localStorage.getItem('selectedMealPlan');
    if (storedMealPlanId && !selectedMealPlan && Array.isArray(mealPlans) && mealPlans.length > 0) {
      const storedPlan = mealPlans.find((plan: any) => plan.id === parseInt(storedMealPlanId));
      if (storedPlan) {
        setSelectedMealPlan(storedPlan.id);
        // Update localStorage to ensure persistence
        localStorage.setItem('selectedMealPlan', storedPlan.id.toString());
      }
    }
  }, [mealPlans, selectedMealPlan]);

  // Enhanced persistence - save selected plan whenever it changes
  useEffect(() => {
    if (selectedMealPlan) {
      localStorage.setItem('selectedMealPlan', selectedMealPlan.toString());
    }
  }, [selectedMealPlan]);

  const displayedMealPlan = currentMealPlan || (preferredPlan && Array.isArray(mealPlans) ? mealPlans.find((mp: any) => mp.id === preferredPlan.id) : null);

  const getDayMeals = (day: number) => {
    if (!currentMealPlan?.meals) return [];
    
    // Filter meals based on proper Sunday-Saturday pattern
    // Day 1: Sunday dinner only (first cooking moment)
    if (day === 1) {
      return currentMealPlan.meals.filter(meal => meal.day === 1);
    }
    // Days 2-7: All meals for that day (breakfast, lunch, dinner)
    else if (day >= 2 && day <= 7) {
      return currentMealPlan.meals.filter(meal => meal.day === day);
    }
    else {
      return [];
    }
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
      <main className="responsive-container py-4 sm:py-6 lg:py-8">

        
        {/* Welcome Message - Week Summary */}
        {latestMealPlan && (
          <div className="card-clean mb-6">
            <div className="p-4">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              {t.welcomeBack} {formatWeekRange(latestMealPlan.weekStart)}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-sm">
              <div>
                <div className="text-gray-500 mb-2">
                  {latestMealPlan.activityLevel === 'high' ? 'High Protein Target' : 'Daily Protein'}
                </div>
                <div className="text-lg font-semibold text-foreground">
                  {latestMealPlan.totalProtein.toFixed(0)}g {t.daily}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {latestMealPlan.activityLevel === 'high' ? 
                    `Target: 130g (${((latestMealPlan.totalProtein / 130) * 100).toFixed(0)}% achieved)` : 
                    t.moderateActivityWeek
                  }
                </div>
              </div>
              <div>
                <div className="text-gray-500 mb-2">{t.mealPreparation}</div>
                <div className="text-lg font-semibold text-foreground">
                  {t.under30Minutes}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {t.quickNutritiousRecipes}
                </div>
              </div>
              <div>
                <div className="text-gray-500 mb-2">{t.cookingSchedule}</div>
                <div className="text-lg font-semibold text-foreground">
                  {userProfile?.cookingDaysPerWeek || 7} {t.daysPerWeek}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {t.eating} {userProfile?.eatingDaysAtHome || 7} {t.daysAtHome}
                </div>
              </div>
              <div>
                <div className="text-gray-500 mb-2">{t.thisWeeksFocus}</div>
                <div className="text-lg font-semibold text-foreground">
                  {userProfile?.meatFishMealsPerWeek ? `${userProfile.meatFishMealsPerWeek} ${t.meatFishMeals}` : t.plantBasedNutrition}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {userProfile?.dietaryTags ? translateDietaryTags(userProfile.dietaryTags, language).join(', ') : t.vegetarianGlutenLactoseFree}
                </div>
              </div>
            </div>
            {latestOuraData && (
              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <div className="text-sm text-gray-500 mb-2">
                  {t.latestActivityInsight} {formatDate(latestOuraData.date)}
                </div>
                <div className="text-sm text-foreground">
                  {t.yourActivityLevel} <span className="font-medium">{latestOuraData.activityLevel}</span> {latestOuraData.steps?.toLocaleString() || 'N/A'} {t.steps}. 
                  {latestOuraData.periodPhase && (
                    <span className="ml-2">{t.currentlyInPhase} {latestOuraData.periodPhase} {t.phase}.</span>
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
              <h2 className="text-xl font-semibold text-foreground mb-2">{t.healthActivityTracking}</h2>
            </div>
            <Badge variant={ouraStatus?.connected ? "default" : "secondary"}>
              {ouraStatus?.connected ? t.connected : t.notConnected}
            </Badge>
          </div>
            
            {ouraStatus?.connected ? (
              <div className="space-y-4">
                {latestOuraData && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="bg-card border border-border p-6">
                      <div className="text-xs text-gray-500 mb-2 font-medium">{t.activityScore}</div>
                      <div className="text-2xl font-bold text-foreground">
                        {latestOuraData.activityScore || 'N/A'}
                      </div>
                    </div>
                    <div className="bg-card border border-border p-6">
                      <div className="text-xs text-gray-500 mb-2 font-medium">{t.steps}</div>
                      <div className="text-2xl font-bold text-foreground">
                        {latestOuraData.steps?.toLocaleString() || 'N/A'}
                      </div>
                    </div>
                    <div className="bg-card border border-border p-6">
                      <div className="text-xs text-gray-500 mb-2 font-medium">Sleep Score</div>
                      <div className="text-2xl font-bold text-foreground">
                        {latestOuraData.sleepScore || 'N/A'}
                      </div>
                    </div>
                    <div className="bg-card border border-border p-6">
                      <div className="text-xs text-gray-500 mb-2 font-medium">Activity Level</div>
                      <div className="text-lg font-bold text-foreground capitalize">
                        {latestOuraData.activityLevel}
                      </div>
                    </div>
                  </div>
                )}


                
                {latestOuraData && (
                  <div className="text-xs text-gray-500">
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

        {/* Multi-Plan Management */}
        {mealPlans && mealPlans.length > 0 && (
          <div className="card-clean mb-6">
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <History className="h-6 w-6 text-foreground mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">{t.savedMealPlans || 'Meal Plans'}</h2>
                    <p className="text-sm text-gray-500">{t.manageMultiplePlans || 'Select and manage your meal plans'}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {mealPlans.length} Plan{mealPlans.length > 1 ? 's' : ''}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mealPlans.map((plan, index) => (
                  <div 
                    key={plan.id} 
                    className={`p-4 border rounded-lg transition-colors ${
                      selectedMealPlan === plan.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 
                        className="font-medium text-foreground cursor-pointer hover:text-primary"
                        onClick={() => setSelectedMealPlan(plan.id)}
                      >
                        {plan.planName || `Meal Plan ${index + 1}`}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(t.deletePlanConfirm || 'Are you sure you want to delete this meal plan?')) {
                              deleteMutation.mutate(plan.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                        >
                          {deleteMutation.isPending ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-destructive" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">
                      {t.weekOf || 'Week of'} {plan.weekStart}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{plan.totalProtein.toFixed(0)}g {t.proteinDaily || 'protein/day'}</span>
                      <span>{formatDate(plan.createdAt?.toString() || '')}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {latestMealPlan && (
                <div className="mt-4 pt-4 border-t border-border">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Plus className="mr-2 h-4 w-4" />
                        {t.savePlanCopy || 'Save Plan as Copy'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t.saveMealPlan || 'Save Meal Plan'}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="planLabel">{t.planLabel || 'Plan Label'}</Label>
                          <Input
                            id="planLabel"
                            value={savePlanLabel}
                            onChange={(e) => setSavePlanLabel(e.target.value)}
                            placeholder={t.planLabelPlaceholder || 'e.g., Next Week, Backup Plan'}
                          />
                        </div>
                        <Button
                          onClick={() => {
                            saveMealPlanMutation.mutate({
                              mealPlanId: latestMealPlan.id,
                              label: savePlanLabel || `${t.savedPlan || 'Saved Plan'} - ${new Date().toLocaleDateString()}`
                            });
                          }}
                          disabled={saveMealPlanMutation.isPending}
                          className="w-full"
                        >
                          {saveMealPlanMutation.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                              {t.saving || 'Saving...'}
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              {t.savePlan || 'Save Plan'}
                            </>
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Weekend Grocery Management */}
        {weekendGroceryData && (weekendGroceryData.currentWeekPlans?.length > 0 || weekendGroceryData.nextWeekPlans?.length > 0) && (
          <div className="card-clean mb-6">
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <ShoppingCart className="h-6 w-6 text-foreground mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">Weekend Grocery Planning</h2>
                    <p className="text-sm text-gray-500">Manage both current week cooking and next week shopping</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {weekendGroceryData.totalActivePlans} Active Plan{weekendGroceryData.totalActivePlans > 1 ? 's' : ''}
                </Badge>
              </div>
              
              {weekendGroceryData.canAlternate ? (
                <div className="space-y-6">
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span className="text-sm font-medium text-green-800 dark:text-green-300">
                        Ready for Weekend Grocery Shopping
                      </span>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-400">
                      You have both current and next week plans! Use current week for remaining cooking, switch to next week for grocery shopping.
                    </p>
                  </div>
                  
                  {/* Current Week Plans */}
                  {weekendGroceryData.currentWeekPlans?.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-foreground mb-3 flex items-center">
                        <Timer className="h-5 w-5 mr-2" />
                        This Week (Finish Cooking)
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        {weekendGroceryData.currentWeekPlans.map((plan: any, index: number) => (
                          <div 
                            key={plan.id} 
                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                              selectedMealPlan === plan.id 
                                ? 'border-primary bg-primary/5' 
                                : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => setSelectedMealPlan(plan.id)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-foreground">
                                {plan.planName || `Current Week Plan ${index + 1}`}
                              </h4>
                              <Badge variant="default" className="text-xs">
                                {plan.planType || 'current'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500 mb-2">
                              Week of {plan.weekStart}
                            </p>
                            <span className="text-xs text-gray-400">
                              {plan.totalProtein}g protein/day
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Next Week Plans */}
                  {weekendGroceryData.nextWeekPlans?.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-foreground mb-3 flex items-center">
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        Next Week (Grocery Shopping)
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        {weekendGroceryData.nextWeekPlans.map((plan: any, index: number) => (
                          <div 
                            key={plan.id} 
                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                              selectedMealPlan === plan.id 
                                ? 'border-primary bg-primary/5' 
                                : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => setSelectedMealPlan(plan.id)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-foreground">
                                {plan.planName || `Next Week Plan ${index + 1}`}
                              </h4>
                              <Badge variant="secondary" className="text-xs">
                                {plan.planType || 'next'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500 mb-2">
                              Week of {plan.weekStart}
                            </p>
                            <span className="text-xs text-gray-400">
                              {plan.totalProtein}g protein/day
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                          Set Up Weekend Grocery Planning
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                          Create both backup and next week plans for complete grocery shopping flexibility.
                        </p>
                      </div>
                      {selectedMealPlan && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => createBackupPlanMutation.mutate(selectedMealPlan)}
                            disabled={createBackupPlanMutation.isPending}
                            size="sm"
                            variant="outline"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Backup
                          </Button>
                          <Button
                            onClick={() => createNextWeekPlanMutation.mutate(selectedMealPlan)}
                            disabled={createNextWeekPlanMutation.isPending}
                            size="sm"
                          >
                            <Calendar className="h-4 w-4 mr-1" />
                            Next Week
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Generation Panel */}
          <div className="lg:col-span-1">
            <div className="card-clean mb-6">
              <div className="p-4 mb-6">
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  {t.generateMealPlan}
                </h2>
                <p className="text-sm text-gray-500">
                  {t.createPersonalizedMealPlan}
                </p>
              </div>
              <div className="space-y-4">

                
                <div>
                  <Label className="text-sm font-medium text-foreground mb-2 block">{t.weekSelection}</Label>
                  <Select value={selectedWeekType} onValueChange={(value: "current" | "next") => setSelectedWeekType(value)}>
                    <SelectTrigger className="input-clean w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">{t.thisWeek}</SelectItem>
                      <SelectItem value="next">{t.nextWeek}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-400 mt-1">
                    {selectedWeekType === "current" ? t.generateCurrentWeek : t.generateUpcomingWeek}
                  </p>
                </div>





                {/* Ingredients to Use Up Input */}
                <div>
                  <Label className="text-sm font-medium text-foreground mb-2 block">
                    {t.ingredientsToUseUp}
                  </Label>
                  <p className="text-xs text-gray-400 mb-3">
                    {language === 'nl' 
                      ? 'Voeg ingrediënten toe die je deze week wilt opmaken. Deze worden verwerkt in nieuwe recepten.' 
                      : 'Add ingredients you want to use up this week. These will be incorporated into fresh recipes.'
                    }
                  </p>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={newLeftover}
                        onChange={(e) => setNewLeftover(e.target.value)}
                        placeholder={t.ingredientPlaceholder}
                        className="input-clean input-mobile flex-1"
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
                      <div className="space-y-1">
                        {userProfile.leftovers.map((leftover, index) => (
                          <div key={index} className="flex items-center justify-between bg-secondary/50 px-3 py-2 rounded text-sm">
                            <span>{leftover}</span>
                            <Button
                              onClick={() => removeLeftover(index)}
                              disabled={updateProfileMutation.isPending}
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-gray-400 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Button 
                    onClick={() => {
                      // Use smart generation if Oura data is available, otherwise use manual settings
                      if (latestOuraData && ouraStatus?.connected) {
                        smartGenerateMutation.mutate();
                      } else {
                        checkAndGenerate();
                      }
                    }}
                    disabled={generateMutation.isPending || smartGenerateMutation.isPending}
                    className="btn-minimal btn-touch w-full"
                  >
                    {(generateMutation.isPending || smartGenerateMutation.isPending) ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                        {t.generateMealPlan}...
                      </>
                    ) : (
                      <>
                        <Activity className="mr-2 h-4 w-4" />
                        {latestOuraData && ouraStatus?.connected ? t.smartGeneratePlan : (selectedWeekType === "current" ? t.generateThisWeek : t.generateNextWeek)}
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
                  
                  {/* Shopping List Button */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        disabled={!selectedMealPlan}
                        className="btn-minimal btn-touch w-full"
                        onClick={() => setShowShoppingList(true)}
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        {t.generateShoppingList}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" style={{backgroundColor: 'hsl(var(--background))', backdropFilter: 'none'}}>
                      <DialogHeader>
                        <DialogTitle>{t.shoppingListHeader}</DialogTitle>
                      </DialogHeader>
                      
                      {loadingShoppingList ? (
                        <div className="flex justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        </div>
                      ) : shoppingListData ? (
                        <div className="space-y-6">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">
                              {t.weekOf} {formatWeekRange(shoppingListData.weekStart)}
                            </span>
                            <Badge variant="secondary">
                              {shoppingListData.totalItems} {t.items}
                            </Badge>
                          </div>
                          
                          {shoppingListData.categories?.map(category => (
                            <div key={category} className="space-y-2">
                              <h3 className="font-semibold text-foreground border-b border-border pb-1">
                                {category}
                              </h3>
                              <div className="grid grid-cols-1 gap-2">
                                {shoppingListData.shoppingList
                                  ?.filter(item => item.category === category)
                                  ?.map((item, index) => (
                                    <div key={index} className="flex justify-between items-center py-2 px-2 hover:bg-gray-50 rounded">
                                      <span className="text-sm text-foreground flex-1">{item.ingredient}</span>
                                      <div className="flex items-center">
                                        <Badge variant="secondary" className="text-xs font-medium">
                                          {item.count > 1 ? `${item.totalAmount} (${item.count}x)` : item.totalAmount}
                                        </Badge>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ))}
                          
                          {/* Export Options */}
                          <div className="border-t border-border pt-6 mt-6">
                            <h3 className="font-semibold text-foreground mb-4">
                              {language === 'nl' ? 'Exporteer Boodschappenlijst' : 'Export Shopping List'}
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <Button
                                onClick={() => {
                                  const text = shoppingListData?.categories?.map(category => 
                                    `${category}:\n${shoppingListData?.shoppingList
                                      ?.filter(item => item.category === category)
                                      ?.map(item => `- ${item.ingredient} (${item.totalAmount})`)
                                      ?.join('\n') || ''}`
                                  )?.join('\n\n') || '';
                                  navigator.clipboard.writeText(text);
                                }}
                                variant="outline"
                                size="sm"
                                className="w-full"
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                {language === 'nl' ? 'Kopiëren' : 'Copy'}
                              </Button>
                              
                              <Button
                                onClick={() => {
                                  const csv = [
                                    'Category,Ingredient,Amount',
                                    ...(shoppingListData?.shoppingList || []).map(item => 
                                      `"${item.category}","${item.ingredient}","${item.totalAmount}"`
                                    )
                                  ].join('\n');
                                  const blob = new Blob([csv], { type: 'text/csv' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `shopping-list-${formatWeekRange(shoppingListData?.weekStart || '').replace(/ /g, '-')}.csv`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                }}
                                variant="outline"
                                size="sm"
                                className="w-full"
                              >
                                <Download className="mr-2 h-4 w-4" />
                                CSV
                              </Button>
                              
                              <Button
                                onClick={() => {
                                  // Create Albert Heijn deep link
                                  const ahUrl = `ah://list?items=${encodeURIComponent(
                                    (shoppingListData?.shoppingList || [])
                                      .map(item => `${item.ingredient} ${item.totalAmount}`)
                                      .join(',')
                                  )}`;
                                  window.open(ahUrl, '_blank');
                                }}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                size="sm"
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Albert Heijn
                              </Button>
                            </div>
                            <p className="text-xs text-gray-400 mt-2 text-center">
                              {language === 'nl' 
                                ? 'Albert Heijn knop opent de AH app met je boodschappenlijst'
                                : 'Albert Heijn button opens AH app with your shopping list'
                              }
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-center text-gray-500 py-8">
                          {t.selectMealPlanForShoppingList}
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
              <div className="p-4 sm:p-6">
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-semibold text-foreground">
                      {t.weeklyMealPlan}
                    </h2>
                  <div className="flex items-center space-x-3">
                    <div className="text-sm text-gray-500">
                      {t.weekOf} <span className="text-foreground font-medium">{displayedMealPlan ? formatWeekRange(displayedMealPlan.weekStart) : t.noPlan}</span>
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
                <>
                  {/* Meal Prep Legend */}
                  <div className="mb-6 p-4 bg-muted/20 rounded-lg">
                    <h3 className="text-sm font-medium text-foreground mb-3">{t.mealPrepGuide}</h3>
                    <div className="flex flex-wrap gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-emerald-100 border-2 border-emerald-500 rounded"></div>
                        <span className="text-gray-500">{t.freshCookingDay}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-100 border-2 border-blue-500 rounded"></div>
                        <span className="text-gray-500">{t.reheatLeftover}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gray-100 border-2 border-gray-400 rounded"></div>
                        <span className="text-gray-500">{t.eatingOut}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-orange-600 text-sm">🥕</span>
                        <span className="text-gray-500">{language === 'nl' ? 'Ingrediënt gebruikt' : 'Ingredient used up'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Mobile view - Cards */}
                  <div className="block md:hidden space-y-4">
                    <h3 className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
                      {t.weeklyMealPlan || 'Weekly Meal Plan'}
                    </h3>
                    {[1, 2, 3, 4, 5, 6, 7].map(day => {
                      const dayMeals = getDayMeals(day);
                      const dayTotal = calculateDayTotal(day);
                      
                      return (
                        <div key={day} className="bg-card border border-border rounded-lg p-4">
                          <div className="flex justify-between items-center mb-3 pb-2 border-b border-border">
                            <h4 className="font-semibold text-foreground">
                              {day === 1 ? t.sunday : 
                               day === 2 ? t.monday : 
                               day === 3 ? t.tuesday : 
                               day === 4 ? t.wednesday : 
                               day === 5 ? t.thursday : 
                               day === 6 ? t.friday : 
                               day === 7 ? t.saturday : t.sunday}
                            </h4>
                            <span className="text-xs text-gray-500 font-medium">
                              {dayTotal.toFixed(0)}g protein
                            </span>
                          </div>
                          <div className="space-y-3">
                            {dayMeals.map((meal) => {
                              const isLeftover = meal.foodDescription.includes('(leftover)');
                              const isEatingOut = meal.foodDescription.includes('Eating out');
                              
                              return (
                                <div key={meal.id} className={`p-3 rounded-lg ${
                                  isEatingOut 
                                    ? 'bg-gray-50 border-l-4 border-l-gray-400' 
                                    : isLeftover 
                                      ? 'bg-blue-50 border-l-4 border-l-blue-500' 
                                      : 'bg-emerald-50 border-l-4 border-l-emerald-500'
                                }`}>
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="text-sm text-gray-500 capitalize font-medium">
                                      {meal.mealType}
                                    </span>
                                    <div className="text-right">
                                      <span className="text-xs font-medium text-emerald-600">
                                        {Math.round(meal.nutrition?.protein || 0)}g
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <button
                                      onClick={() => setSelectedMealId(meal.id)}
                                      className="text-sm text-foreground hover:text-primary text-left flex-1"
                                    >
                                      {meal.foodDescription}
                                    </button>
                                    {isLeftover && (
                                      <Badge variant="outline" className="ml-2 text-xs bg-blue-100 text-blue-700 border-blue-300">
                                        {t.leftover}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop view - Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-border">
                        <tr>
                          <th colSpan={3} className="px-3 sm:px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{t.weeklyMealPlan || 'Weekly Meal Plan'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3, 4, 5, 6, 7].map(day => {
                          const dayMeals = getDayMeals(day);
                          const dayTotal = calculateDayTotal(day);
                          
                          return (
                            <React.Fragment key={day}>
                              {/* Day Header Row */}
                              <tr className="bg-muted/20 border-t-2 border-b-2 border-border">
                                <td className="px-3 sm:px-6 py-3 text-sm font-semibold text-foreground">
                                  {day === 1 ? t.sunday : 
                                   day === 2 ? t.monday : 
                                   day === 3 ? t.tuesday : 
                                   day === 4 ? t.wednesday : 
                                   day === 5 ? t.thursday : 
                                   day === 6 ? t.friday : 
                                   day === 7 ? t.saturday : t.sunday}
                                </td>
                                <td className="px-3 sm:px-6 py-3 text-xs text-gray-500 font-medium">
                                  {dayTotal.toFixed(0)}g protein
                                </td>
                                <td className="px-3 sm:px-6 py-3"></td>
                              </tr>
                              {/* Meal Rows */}
                              {dayMeals.map((meal, index) => {
                                const isLeftover = meal.foodDescription.includes('(leftover)');
                                const isEatingOut = meal.foodDescription.includes('Eating out');
                                const isFreshCooking = !isLeftover && !isEatingOut;
                                
                                return (
                                  <tr key={meal.id} className="hover:bg-muted/50 border-none">
                                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize pl-8">
                                      {meal.mealType}
                                    </td>
                                    <td className={`px-3 sm:px-6 py-4 text-sm text-foreground relative ${
                                      isEatingOut 
                                        ? 'bg-gray-50 border-l-4 border-l-gray-400' 
                                        : isLeftover 
                                          ? 'bg-blue-50 border-l-4 border-l-blue-500' 
                                          : 'bg-emerald-50 border-l-4 border-l-emerald-500'
                                    }`}>
                                      {isEatingOut ? (
                                        <div className="flex items-center gap-2">
                                          <span className="w-4 h-4 text-gray-500">🍽️</span>
                                          {meal.foodDescription}
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => setSelectedMealId(meal.id)}
                                          className="text-left hover:text-primary hover:underline cursor-pointer flex items-center gap-2"
                                        >
                                          <BookOpen className="w-4 h-4" />
                                          {meal.foodDescription.includes('incorporating leftover') && (
                                            <span className="text-orange-600 text-sm" title={language === 'nl' ? 'Ingrediënt opgemaakt' : 'Ingredient used up'}>
                                              🥕
                                            </span>
                                          )}
                                          {meal.foodDescription}
                                        </button>
                                      )}
                                    </td>
                                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs">
                                      {isEatingOut ? (
                                        <span className="text-gray-500">N/A</span>
                                      ) : (
                                        <div className="flex items-center gap-1">
                                          {isFreshCooking && (
                                            <>
                                              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                              <span className="text-emerald-700 font-medium">{meal.prepTime}min</span>
                                            </>
                                          )}
                                          {isLeftover && (
                                            <>
                                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                              <span className="text-blue-700 font-medium">5min</span>
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <Activity className="mx-auto h-12 w-12 mb-4 text-gray-400" />
                  <p className="text-gray-500">{t.noMealPlanAvailable}</p>
                </div>
              )}
              
              {currentMealPlan?.meals && (
                <div className="px-6 py-4 bg-muted/30 border-t border-border mt-6">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      {t.weeklyAverage}: <span className="font-medium text-foreground">
                        {currentMealPlan.totalProtein.toFixed(0)}g {t.proteinPerDay}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-foreground">
                        <Download className="mr-1 h-4 w-4" />
                        {t.exportButton}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                        <Share className="mr-1 h-4 w-4" />
                        {t.shareButton}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>



        {/* Status Panel */}
        <div className="mt-8 sm:mt-12 lg:mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="card-clean">
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Activity className="text-foreground h-8 w-8" />
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-500">{t.ouraSync || 'Oura Sync'}</div>
                  <div className="text-lg font-semibold text-foreground">
                    {ouraStatus?.connected && latestOuraData ? t.syncedStatus : t.notSyncedStatus}
                  </div>
                  {latestOuraData && (
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(latestOuraData.syncedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card-clean">
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Target className="text-foreground h-8 w-8" />
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-500">{t.proteinGoal}</div>
                  <div className="text-lg font-semibold text-foreground">{t.onTrack}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card-clean">
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="text-foreground h-8 w-8" />
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-500">{t.prepTime}</div>
                  <div className="text-lg font-semibold text-foreground">{t.under30MinPerMeal}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Notion Integration - Bottom Section */}
        <div className="card-clean mt-16">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-2">{t.notionIntegration}</h2>
          </div>
          <div className="space-y-6">
            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">{t.integrationStatus}</Label>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${(notionStatus as any)?.connected ? 'bg-foreground' : 'bg-muted-foreground'}`} />
                <span className={`text-sm ${(notionStatus as any)?.connected ? 'text-foreground' : 'text-gray-500'}`}>
                  {(notionStatus as any)?.connected ? t.connected : t.notConnected}
                </span>
              </div>
              {!(notionStatus as any)?.connected && (
                <p className="text-xs text-gray-400 mt-2">
                  {t.notConnectedPleaseConfigureSecrets}
                </p>
              )}
            </div>
            
            <Button 
              onClick={() => selectedMealPlan && syncMutation.mutate(selectedMealPlan)}
              disabled={!selectedMealPlan || syncMutation.isPending || !(notionStatus as any)?.connected}
              className="btn-minimal w-full"
            >
              {syncMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                  {t.syncing}...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {t.syncToNotion}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Recipe Dialog */}
        <Dialog open={!!selectedMealId} onOpenChange={() => setSelectedMealId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" style={{backgroundColor: 'hsl(var(--background))', backdropFilter: 'none'}}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-emerald-600" />
              {t.recipeDetails}
            </DialogTitle>
          </DialogHeader>
          
          {loadingRecipe ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-4 bg-gray-200 rounded" />
                  ))}
                </div>
              </div>
            </div>
          ) : recipeData ? (
            <div className="space-y-6">
              {/* Meal Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-lg text-foreground mb-2">
                  {recipeData.name}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">{t.portion}:</span>
                    <p className="font-medium">{recipeData.portion}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">{t.protein}:</span>
                    <p className="font-medium text-emerald-600">{recipeData.nutrition?.protein}g</p>
                  </div>
                  <div>
                    <span className="text-gray-500">{t.prepTime}:</span>
                    <p className="font-medium flex items-center gap-1">
                      <Timer className="w-3 h-3" />
                      {recipeData.prepTime} {t.min}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">{t.calories}:</span>
                    <p className="font-medium text-orange-600">{recipeData.nutrition?.calories}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">{t.carbs}:</span>
                    <p className="font-medium text-blue-600">{recipeData.nutrition?.carbohydrates}g</p>
                  </div>
                  {recipeData.nutrition?.costEuros && (
                    <div>
                      <span className="text-gray-500">{t.cost}:</span>
                      <p className="font-medium text-purple-600">€{recipeData.nutrition.costEuros.toFixed(2)}</p>
                    </div>
                  )}
                  {recipeData.nutrition?.proteinPerEuro && (
                    <div>
                      <span className="text-gray-500">{t.proteinPerEuro}:</span>
                      <p className="font-medium text-indigo-600">{recipeData.nutrition.proteinPerEuro.toFixed(1)}g/€</p>
                    </div>
                  )}
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
                    🥬 {t.vegetableContent}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-green-700 mb-2">
                        <span className="font-medium">{t.servings}:</span> {recipeData.vegetableContent.servings}
                      </p>
                      {recipeData.vegetableContent.vegetables.length > 0 && (
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
                    {recipeData?.vegetableContent?.benefits?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-green-700 mb-1">{t.healthBenefits}:</p>
                        <ul className="space-y-1">
                          {recipeData?.vegetableContent?.benefits?.map((benefit, index) => (
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
