import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { User, Save, UserCircle, TrendingUp } from "lucide-react";
import { useTranslations, translateDietaryTag } from "@/lib/translations";
import { useLanguage } from "@/contexts/LanguageContext";

// Available dietary tags for user selection
const DIETARY_TAGS = [
  "Vegetarian",
  "Vegan", 
  "Gluten-Free",
  "Gluten-Low",
  "Lactose-Free",
  "Dairy-Free",
  "Nut-Free",
  "Soy-Free",
  "Low-Carb",
  "Keto",
  "Pescatarian",
  "Ayurvedic"
] as const;

interface UserProfile {
  id: number;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  gender: string | null;
  weight: number | null;
  goalWeight: number | null;
  height: number | null;
  age: number | null;
  waistline: number | null;
  goalWaistline: number | null;
  targetDate: string | null;
  activityLevel: string;
  trainingType: string;
  goal: string;
  proteinTarget: number;
  dietaryTags: string[];
  householdSize: number;
  includeBreakfast: boolean;
  includeLunch: boolean;
  includeDinner: boolean;
  cookingDaysPerWeek: number;
  eatingDaysAtHome: number;
  useOnlyMyRecipes: boolean;
  menstrualPhase: string;
  dinnerLowCarbMaxCarbs: number | null;
  createdAt: string;
  updatedAt: string;
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
  weightLossInfo?: {
    weekNumber: number;
    isMaintenanceWeek: boolean;
    calorieReductionPercent: number;
    nextMaintenanceWeek: number;
  };
}

// Mirror of server/nutrition-calculator.ts — keeps targets in sync with formData changes
const PROTEIN_FACTORS: Record<string, Record<string, number>> = {
  sedentary: { mobility: 1.0, endurance: 1.2, strength: 1.4, mixed: 1.4 },
  light:     { mobility: 1.2, endurance: 1.4, strength: 1.6, mixed: 1.6 },
  moderate:  { mobility: 1.4, endurance: 1.6, strength: 1.8, mixed: 1.9 },
  high:      { mobility: 1.5, endurance: 1.8, strength: 2.0, mixed: 2.1 },
  athlete:   { mobility: 1.6, endurance: 2.0, strength: 2.2, mixed: 2.3 },
};
const PAL_VALUES: Record<string, number> = { sedentary: 1.35, light: 1.55, moderate: 1.75, high: 1.95, athlete: 2.20 };
const CARB_FACTORS: Record<string, number> = { mobility: 2.5, endurance: 6.5, strength: 4.0, mixed: 5.0 };
const FAT_PERCENTAGES: Record<string, number> = { mobility: 0.325, endurance: 0.25, strength: 0.30, mixed: 0.275 };
const GOAL_FACTORS: Record<string, number> = { lose_fat: 0.85, maintain: 1.00, bulk: 1.10 };

function computeNutritionTargets(
  weight: number, height: number, age: number, gender: string,
  activityLevel: string, trainingType: string, goal: string,
  weightLossWeekNumber?: number
): NutritionTargets {
  const act = activityLevel || 'moderate';
  const train = trainingType || 'endurance';
  const proteinFactor = PROTEIN_FACTORS[act]?.[train] ?? 1.6;
  const palValue = PAL_VALUES[act] ?? 1.75;
  const carbFactor = CARB_FACTORS[train] ?? 6.5;
  const fatPercentage = FAT_PERCENTAGES[train] ?? 0.25;

  const estHeight = height || (gender === 'male' ? 175 : 162);
  const bmr = gender === 'male'
    ? (10 * weight) + (6.25 * estHeight) - (5 * age) + 5
    : (10 * weight) + (6.25 * estHeight) - (5 * age) - 161;
  const maintenanceCalories = bmr * palValue;

  let goalFactor = GOAL_FACTORS[goal] ?? 1.00;
  let weightLossInfo: NutritionTargets['weightLossInfo'];
  if (goal === 'lose_fat' && weightLossWeekNumber && weightLossWeekNumber > 0) {
    const isMaint = weightLossWeekNumber % 6 === 0;
    goalFactor = isMaint ? 1.00 : 0.85;
    weightLossInfo = {
      weekNumber: weightLossWeekNumber,
      isMaintenanceWeek: isMaint,
      calorieReductionPercent: isMaint ? 0 : 15,
      nextMaintenanceWeek: isMaint ? weightLossWeekNumber + 6 : Math.ceil(weightLossWeekNumber / 6) * 6,
    };
  }

  const targetCalories = maintenanceCalories * goalFactor;
  const proteinGrams = weight * proteinFactor;
  const carbGrams = weight * carbFactor;
  const fatKcalTarget = targetCalories * fatPercentage;
  const remainingKcal = Math.max(targetCalories - proteinGrams * 4 - carbGrams * 4, 0);
  const fatGrams = Math.max(Math.min(fatKcalTarget, remainingKcal), 0) / 9;

  const round = (v: number, inc: number) => Math.round(v / inc) * inc;

  return {
    protein: Math.max(round(proteinGrams, 5), 0),
    carbohydrates: Math.max(round(carbGrams, 5), 0),
    fats: Math.max(round(fatGrams, 5), 0),
    calories: Math.max(round(targetCalories, 10), 0),
    fiber: gender === 'male' ? 40 : 30,
    maintenanceCalories: Math.round(maintenanceCalories),
    bmr: Math.round(bmr),
    proteinFactor,
    palValue,
    carbFactor,
    fatPercentage: fatPercentage * 100,
    weightLossInfo,
  };
}

export default function Profile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const { language } = useLanguage();
  const t = useTranslations(language);

  // Fetch user profile for the authenticated user
  const { data: user, isLoading } = useQuery<UserProfile>({
    queryKey: ['/api/users', authUser?.id, 'profile'],
    enabled: !!authUser?.id,
  });

  // Fetch nutrition targets (used as fallback before formData is populated)
  const { data: serverNutritionTargets, isLoading: nutritionLoading } = useQuery<NutritionTargets>({
    queryKey: ['/api/nutrition/targets', authUser?.id],
    enabled: !!authUser?.id && !!user,
  });

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    gender: '',
    weight: '',
    goalWeight: '',
    height: '',
    age: '',
    waistline: '',
    goalWaistline: '',
    targetDate: '',
    activityLevel: '',
    trainingType: '',
    goal: '',
    proteinTarget: '',
    dietaryTags: [] as string[],
    householdSize: '',
    includeBreakfast: false,
    includeLunch: true,
    includeDinner: true,
    cookingDaysPerWeek: '',
    eatingDaysAtHome: '',
    useOnlyMyRecipes: false,
    menstrualPhase: 'off',
    dinnerLowCarbMaxCarbs: '',
  });

  // Calculate dynamic protein target based on age, gender, and activity level
  const calculateProteinTarget = (age: number | null, activityLevel: string, gender?: string) => {
    if (!age) return 100; // Default fallback based on 20% of 2000 kcal
    
    // Gender-specific age thresholds for higher protein needs
    const needsHigherProtein = gender === 'female' ? age >= 45 : age >= 50;
    
    if (needsHigherProtein) {
      // Above age threshold: Higher protein for muscle preservation
      switch (activityLevel) {
        case 'athlete': return 140;
        case 'high': return 130;
        case 'moderate': return 110;
        case 'light': return 100;
        case 'sedentary': return 90;
        default: return 110;
      }
    } else {
      // Below age threshold: Base ~20% of energy intake (100g for 2000 kcal)
      switch (activityLevel) {
        case 'athlete': return 120;
        case 'high': return 110; 
        case 'moderate': return 100;
        case 'light': return 95;
        case 'sedentary': return 85;
        default: return 100;
      }
    }
  };

  // Track if form has been initialized to prevent reset after saves
  const [isFormInitialized, setIsFormInitialized] = useState(false);

  // Update form data when user data loads (only on initial load)
  useEffect(() => {
    if (user && !isFormInitialized) {
      const dynamicProteinTarget = calculateProteinTarget(user.age, user.activityLevel, user.gender || undefined);
      
      // Check if this is a new user (has minimal profile data)
      const isNewUser = !user.firstName && !user.lastName && !user.age && !user.weight && !user.height;
      
      setFormData({
        username: user.username || '',
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        gender: user.gender || '',
        // For new users, show empty fields; for existing users, show their data
        weight: isNewUser ? '' : (user.weight?.toString() || ''),
        goalWeight: isNewUser ? '' : (user.goalWeight?.toString() || ''),
        height: isNewUser ? '' : (user.height?.toString() || ''),
        age: isNewUser ? '' : (user.age?.toString() || ''),
        waistline: isNewUser ? '' : (user.waistline?.toString() || ''),
        goalWaistline: isNewUser ? '' : (user.goalWaistline?.toString() || ''),
        targetDate: user.targetDate || '',
        activityLevel: isNewUser ? '' : (user.activityLevel || ''),
        trainingType: isNewUser ? '' : (user.trainingType || ''),
        goal: isNewUser ? '' : (user.goal || ''),
        proteinTarget: isNewUser ? '' : dynamicProteinTarget.toString(),
        dietaryTags: user.dietaryTags || [],
        householdSize: isNewUser ? '' : (user.householdSize?.toString() || ''),
        includeBreakfast: user.includeBreakfast ?? false,
        includeLunch: user.includeLunch ?? true,
        includeDinner: user.includeDinner ?? true,
        cookingDaysPerWeek: isNewUser ? '' : (user.cookingDaysPerWeek?.toString() || ''),
        eatingDaysAtHome: isNewUser ? '' : (user.eatingDaysAtHome?.toString() || ''),
        useOnlyMyRecipes: user.useOnlyMyRecipes || false,
        menstrualPhase: user.menstrualPhase || 'off',
        dinnerLowCarbMaxCarbs: user.dinnerLowCarbMaxCarbs?.toString() || '',
      });
      setIsFormInitialized(true);
    }
  }, [user, isFormInitialized]);

  // Compute nutrition targets live from formData — updates instantly when any field changes
  const nutritionTargets = useMemo((): NutritionTargets => {
    const weight = parseFloat(formData.weight) || 0;
    const height = parseFloat(formData.height) || 0;
    const age = parseInt(formData.age) || 0;
    if (weight > 0 && age > 0) {
      return computeNutritionTargets(
        weight, height, age,
        formData.gender || 'female',
        formData.activityLevel || 'moderate',
        formData.trainingType || 'endurance',
        formData.goal || 'maintain',
        user?.weightLossWeekNumber ?? undefined
      );
    }
    return serverNutritionTargets ?? {
      protein: 0, carbohydrates: 0, fats: 0, calories: 0, fiber: 30,
      maintenanceCalories: 0, bmr: 0, proteinFactor: 1.6, palValue: 1.75,
      carbFactor: 6.5, fatPercentage: 25,
    };
  }, [
    formData.weight, formData.height, formData.age, formData.gender,
    formData.activityLevel, formData.trainingType, formData.goal,
    user?.weightLossWeekNumber, serverNutritionTargets
  ]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!authUser?.id) throw new Error('User not authenticated');
      const response = await apiRequest('PATCH', `/api/users/${authUser.id}/profile`, data);
      return response.json();
    },
    onSuccess: (updatedData) => {
      // Update the query cache directly instead of invalidating to prevent form reset
      if (updatedData && authUser?.id) {
        queryClient.setQueryData(['/api/users', authUser.id, 'profile'], updatedData);
        queryClient.invalidateQueries({ queryKey: ['/api/nutrition/targets', authUser.id] });
        
        const dynamicProteinTarget = calculateProteinTarget(updatedData.age, updatedData.activityLevel, updatedData.gender);
        
        setFormData({
          username: updatedData.username || '',
          email: updatedData.email || '',
          firstName: updatedData.firstName || '',
          lastName: updatedData.lastName || '',
          gender: updatedData.gender || '',
          weight: updatedData.weight?.toString() || '',
          goalWeight: updatedData.goalWeight?.toString() || '',
          height: updatedData.height?.toString() || '',
          age: updatedData.age?.toString() || '',
          waistline: updatedData.waistline?.toString() || '',
          goalWaistline: updatedData.goalWaistline?.toString() || '',
          targetDate: updatedData.targetDate || '',
          activityLevel: updatedData.activityLevel || 'moderate',
          trainingType: updatedData.trainingType || 'endurance',
          goal: updatedData.goal || 'maintain',
          proteinTarget: dynamicProteinTarget.toString(),
          dietaryTags: updatedData.dietaryTags || [],
          householdSize: updatedData.householdSize?.toString() || '1',
          includeBreakfast: updatedData.includeBreakfast ?? false,
          includeLunch: updatedData.includeLunch ?? true,
          includeDinner: updatedData.includeDinner ?? true,
          cookingDaysPerWeek: updatedData.cookingDaysPerWeek?.toString() || '7',
          eatingDaysAtHome: updatedData.eatingDaysAtHome?.toString() || '7',
          useOnlyMyRecipes: updatedData.useOnlyMyRecipes || false,
          menstrualPhase: updatedData.menstrualPhase || 'off',
          dinnerLowCarbMaxCarbs: updatedData.dinnerLowCarbMaxCarbs?.toString() || '',
        });
      }
      
      toast({
        title: "Profile Updated",
        description: "Your personal information has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle activity level, age, gender, training type, or goal change to update protein target and refresh nutrition targets
  const handleActivityOrAgeChange = (field: string, value: string) => {
    const updatedFormData = { ...formData, [field]: value };
    
    if (field === 'activityLevel' || field === 'age' || field === 'gender') {
      const age = field === 'age' ? parseInt(value) || null : parseInt(formData.age) || null;
      const activityLevel = field === 'activityLevel' ? value : formData.activityLevel;
      const gender = field === 'gender' ? value : formData.gender;
      const newProteinTarget = calculateProteinTarget(age, activityLevel, gender);
      
      updatedFormData.proteinTarget = newProteinTarget.toString();
    }
    
    setFormData(updatedFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updateData = {
      username: formData.username,
      email: formData.email || null,
      firstName: formData.firstName || null,
      lastName: formData.lastName || null,
      gender: formData.gender || null,
      weight: formData.weight ? parseFloat(formData.weight) : null,
      goalWeight: formData.goalWeight ? parseFloat(formData.goalWeight) : null,
      height: formData.height ? parseFloat(formData.height) : null,
      age: formData.age ? parseInt(formData.age) : null,
      waistline: formData.waistline ? parseFloat(formData.waistline) : null,
      goalWaistline: formData.goalWaistline ? parseFloat(formData.goalWaistline) : null,
      activityLevel: formData.activityLevel,
      trainingType: formData.trainingType,
      goal: formData.goal,
      proteinTarget: formData.proteinTarget ? parseInt(formData.proteinTarget) : null,
      dietaryTags: formData.dietaryTags,
      householdSize: formData.householdSize ? parseInt(formData.householdSize) : 1,
      includeBreakfast: formData.includeBreakfast,
      includeLunch: formData.includeLunch,
      includeDinner: formData.includeDinner,
      cookingDaysPerWeek: formData.cookingDaysPerWeek ? parseInt(formData.cookingDaysPerWeek) : 7,
      eatingDaysAtHome: formData.eatingDaysAtHome ? parseInt(formData.eatingDaysAtHome) : 7,
      useOnlyMyRecipes: formData.useOnlyMyRecipes,
      menstrualPhase: formData.menstrualPhase,
      dinnerLowCarbMaxCarbs: formData.dinnerLowCarbMaxCarbs ? parseInt(formData.dinnerLowCarbMaxCarbs) : null,
    };

    updateProfileMutation.mutate(updateData);
  };

  const handleDietaryTagChange = (tag: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        dietaryTags: [...prev.dietaryTags, tag]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        dietaryTags: prev.dietaryTags.filter(t => t !== tag)
      }));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background px-2 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-2 py-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-light text-foreground mb-2" style={{ fontFamily: 'Times New Roman, serif', letterSpacing: '0.05em' }}>
            {t.personalInformation}
          </h1>
          <p className="text-gray-500">
            {t.manageProfileSettings}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="card-clean">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-2 flex items-center">
                <UserCircle className="mr-2 h-5 w-5" />
                {t.basicInformation}
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="username" className="text-sm font-medium text-foreground mb-2 block">
                  {t.username}
                </Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  className="input-clean"
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium text-foreground mb-2 block">
                  {t.email}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="input-clean"
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <Label htmlFor="firstName" className="text-sm font-medium text-foreground mb-2 block">
                  {t.firstName}
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  className="input-clean"
                  placeholder="Enter your first name"
                />
              </div>

              <div>
                <Label htmlFor="lastName" className="text-sm font-medium text-foreground mb-2 block">
                  {t.lastName}
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  className="input-clean"
                  placeholder="Enter your last name"
                />
              </div>
            </div>
          </div>

          {/* Health & Fitness */}
          <div className="card-clean">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {t.healthFitness}
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <Label htmlFor="gender" className="text-sm font-medium text-foreground mb-2 block">
                  {t.physiologyGender}
                </Label>
                <p className="text-xs text-muted-foreground mb-3">
                  {t.proteinNeedsExplanation}
                </p>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => handleActivityOrAgeChange('gender', value)}
                >
                  <SelectTrigger className="input-clean">
                    <SelectValue placeholder={t.selectPhysiologyGender} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">{t.female}</SelectItem>
                    <SelectItem value="male">{t.male}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="age" className="text-sm font-medium text-foreground mb-2 block">
                  Age (years)
                </Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age}
                  onChange={(e) => handleActivityOrAgeChange('age', e.target.value)}
                  className="input-clean"
                  placeholder="Enter your age (e.g., 35)"
                />
              </div>

              <div>
                <Label htmlFor="weight" className="text-sm font-medium text-foreground mb-2 block">
                  Current Weight (kg)
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Your current weight in kilograms
                </p>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                  className="input-clean"
                  placeholder="e.g., 70.5"
                />
              </div>

              <div>
                <Label htmlFor="height" className="text-sm font-medium text-foreground mb-2 block">
                  Height (cm)
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Your height in centimeters
                </p>
                <Input
                  id="height"
                  type="number"
                  value={formData.height}
                  onChange={(e) => setFormData(prev => ({ ...prev, height: e.target.value }))}
                  className="input-clean"
                  placeholder="e.g., 175"
                />
              </div>

              <div>
                <Label htmlFor="waistline" className="text-sm font-medium text-foreground mb-2 block">
                  Current Waist Circumference (cm)
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Your starting point - measure around your waist at the narrowest point
                </p>
                <Input
                  id="waistline"
                  type="number"
                  step="0.1"
                  value={formData.waistline}
                  onChange={(e) => setFormData(prev => ({ ...prev, waistline: e.target.value }))}
                  className="input-clean"
                  placeholder="e.g., 85.0"
                />
              </div>

              {/* BMI Display */}
              {formData.weight && formData.height && (
                <div>
                  <Label className="text-sm font-medium text-foreground mb-2 block">
                    {t.currentBMI}
                  </Label>
                  <div className="p-3 bg-muted rounded-md">
                    <span className="text-lg font-medium">
                      {(parseFloat(formData.weight) / Math.pow(parseFloat(formData.height) / 100, 2)).toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">
                      {(() => {
                        const bmi = parseFloat(formData.weight) / Math.pow(parseFloat(formData.height) / 100, 2);
                        if (bmi < 18.5) return t.underweight;
                        if (bmi < 25) return t.normal;
                        if (bmi < 30) return t.overweight;
                        return t.obese;
                      })()}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div>
                <Label htmlFor="activityLevel" className="text-sm font-medium text-foreground mb-2 block">
                  {t.defaultActivityLevel}
                </Label>
                <Select
                  value={formData.activityLevel}
                  onValueChange={(value) => handleActivityOrAgeChange('activityLevel', value)}
                >
                  <SelectTrigger className="input-clean">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentary">Sedentary - little to no exercise, desk job</SelectItem>
                    <SelectItem value="light">Light - light exercise 1–2 times per week, mostly inactive lifestyle</SelectItem>
                    <SelectItem value="moderate">Moderate - exercise 3–4 times per week, generally active lifestyle</SelectItem>
                    <SelectItem value="high">High - daily exercise or physically demanding job</SelectItem>
                    <SelectItem value="athlete">Athlete - competitive or elite training, very high physical demand</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Training Type */}
              <div>
                <Label htmlFor="trainingType" className="text-sm font-medium text-foreground mb-2 block">
                  Training Type
                </Label>
                <Select
                  value={formData.trainingType}
                  onValueChange={(value) => handleActivityOrAgeChange('trainingType', value)}
                >
                  <SelectTrigger className="input-clean">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mobility">Mobility - yoga, stretching, flexibility work</SelectItem>
                    <SelectItem value="endurance">Endurance - running, cycling, swimming</SelectItem>
                    <SelectItem value="strength">Strength - weightlifting, resistance training</SelectItem>
                    <SelectItem value="mixed">Mixed - combination of different training types</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Goal */}
              <div>
                <Label htmlFor="goal" className="text-sm font-medium text-foreground mb-2 block">
                  Goal
                </Label>
                <Select
                  value={formData.goal}
                  onValueChange={(value) => handleActivityOrAgeChange('goal', value)}
                >
                  <SelectTrigger className="input-clean">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lose_fat">Lose Fat - caloric deficit for weight loss</SelectItem>
                    <SelectItem value="maintain">Maintain - balance calories for current weight</SelectItem>
                    <SelectItem value="bulk">Bulk - caloric surplus for muscle gain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>


          </div>

          {/* Health Goals */}
          <div className="card-clean">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {t.healthGoals}
              </h2>
              <p className="text-sm text-gray-500">
                {t.healthGoalsHelp}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="goalWeight" className="text-sm font-medium text-foreground mb-2 block">
                  {t.goalWeight}
                </Label>
                <Input
                  id="goalWeight"
                  type="number"
                  step="0.1"
                  value={formData.goalWeight}
                  onChange={(e) => setFormData(prev => ({ ...prev, goalWeight: e.target.value }))}
                  className="input-clean"
                  placeholder="Optional target weight"
                />
              </div>

              <div>
                <Label htmlFor="goalWaistline" className="text-sm font-medium text-foreground mb-2 block">
                  Target Waist Circumference (cm)
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Your goal waist measurement (optional)
                </p>
                <Input
                  id="goalWaistline"
                  type="number"
                  step="0.1"
                  value={formData.goalWaistline}
                  onChange={(e) => setFormData(prev => ({ ...prev, goalWaistline: e.target.value }))}
                  className="input-clean"
                  placeholder="e.g., 80.0"
                />
              </div>

              <div>
                <Label htmlFor="targetDate" className="text-sm font-medium text-foreground mb-2 block">
                  Target Date
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  When you want to reach your goals (optional)
                </p>
                <Input
                  id="targetDate"
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetDate: e.target.value }))}
                  className="input-clean"
                />
              </div>
            </div>

            {/* Goal Timeline Display */}
            {formData.targetDate && (
              <div className="mt-4 p-3 bg-muted rounded-md">
                <span className="text-sm text-gray-500">
                  {t.timeline}: {Math.max(0, Math.ceil((new Date(formData.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 7)))} {t.weeksToReachGoals}
                </span>
              </div>
            )}
          </div>

          {/* Nutrition Targets */}
          <div className="card-clean">
              <div className="mb-3">
                <h2 className="text-xl font-semibold text-foreground">
                  {t.nutritionTargets || 'Nutrition Targets'}
                </h2>
              </div>
              {!formData.weight || !formData.age ? (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-500 text-sm">
                  Fill in your weight, age and health goals above to see your personalised nutrition targets.
                </div>
              ) : (
              <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="text-xs font-medium text-emerald-800 mb-0.5">Protein</div>
                  <div className="text-xl font-bold text-emerald-900">{Math.round(nutritionTargets.protein)}g</div>
                  <div className="text-xs text-emerald-600 mt-0.5">
                    {nutritionTargets.proteinFactor}g/kg
                  </div>
                </div>
                
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-xs font-medium text-yellow-800 mb-0.5">Fats</div>
                  <div className="text-xl font-bold text-yellow-900">{Math.round(nutritionTargets.fats)}g</div>
                  <div className="text-xs text-yellow-600 mt-0.5">
                    {Math.round(nutritionTargets.fatPercentage)}% of kcal
                  </div>
                </div>
                
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-xs font-medium text-blue-800 mb-0.5">Carbs</div>
                  <div className="text-xl font-bold text-blue-900">{Math.round(nutritionTargets.carbohydrates)}g</div>
                  <div className="text-xs text-blue-600 mt-0.5">
                    {nutritionTargets.carbFactor}g/kg
                  </div>
                </div>
                
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="text-xs font-medium text-orange-800 mb-0.5">Calories</div>
                  <div className="text-xl font-bold text-orange-900">{Math.round(nutritionTargets.calories)}</div>
                  <div className="text-xs text-orange-600 mt-0.5">
                    {formData.goal === 'lose_fat' ? '−15% deficit' : 
                     formData.goal === 'bulk' ? '+10% surplus' : 'maintenance'}
                  </div>
                </div>
              </div>
              
              {/* Weight Loss Progress Information */}
              {nutritionTargets.weightLossInfo && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-xs font-medium text-green-900 mb-2 flex items-center gap-2">
                    <TrendingUp className="h-3 w-3" />
                    Weight loss progress
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-green-800">
                    <span><span className="font-medium">Week:</span> {nutritionTargets.weightLossInfo.weekNumber}</span>
                    <span>
                      {nutritionTargets.weightLossInfo.isMaintenanceWeek ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                          Maintenance week
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">
                          Deficit −{nutritionTargets.weightLossInfo.calorieReductionPercent}%
                        </span>
                      )}
                    </span>
                    <span><span className="font-medium">Next maintenance:</span> week {nutritionTargets.weightLossInfo.nextMaintenanceWeek}</span>
                  </div>
                </div>
              )}
              
              </>
              )}
            </div>

          {/* Meal Planning Preferences */}
          <div className="card-clean">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {t.mealPlanningPreferences}
              </h2>
              <p className="text-sm text-gray-500">
                {t.cookingHabitsHelp}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <Label htmlFor="householdSize" className="text-sm font-medium text-foreground mb-2 block">
                  {t.householdSizePeople}
                </Label>
                <Input
                  id="householdSize"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.householdSize}
                  onChange={(e) => setFormData(prev => ({ ...prev, householdSize: e.target.value }))}
                  className="input-clean"
                  placeholder="1"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {t.peopleYouCookFor}
                </p>
              </div>
            </div>

            {/* Meals to Include */}
            <div className="mt-6">
              <Label className="text-sm font-medium text-foreground mb-3 block">
                {t.mealsToInclude}
              </Label>
              <div className="flex flex-col gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeBreakfast"
                    checked={formData.includeBreakfast === true}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, includeBreakfast: checked === true }))
                    }
                  />
                  <label
                    htmlFor="includeBreakfast"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {t.includeBreakfast}
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeLunch"
                    checked={formData.includeLunch === true}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, includeLunch: checked === true }))
                    }
                  />
                  <label
                    htmlFor="includeLunch"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {t.includeLunch}
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeDinner"
                    checked={formData.includeDinner === true}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, includeDinner: checked === true }))
                    }
                  />
                  <label
                    htmlFor="includeDinner"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {t.includeDinner}
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
              <div>
                <Label htmlFor="cookingDaysPerWeek" className="text-sm font-medium text-foreground mb-2 block">
                  {t.cookingDaysPerWeek}
                </Label>
                <Input
                  id="cookingDaysPerWeek"
                  type="number"
                  min="1"
                  max="7"
                  value={formData.cookingDaysPerWeek}
                  onChange={(e) => setFormData(prev => ({ ...prev, cookingDaysPerWeek: e.target.value }))}
                  className="input-clean"
                  placeholder="7"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {t.cookingDaysHelp}
                </p>
              </div>

              <div>
                <Label htmlFor="eatingDaysAtHome" className="text-sm font-medium text-foreground mb-2 block">
                  {t.eatingDaysAtHome}
                </Label>
                <Input
                  id="eatingDaysAtHome"
                  type="number"
                  min="1"
                  max="7"
                  value={formData.eatingDaysAtHome}
                  onChange={(e) => setFormData(prev => ({ ...prev, eatingDaysAtHome: e.target.value }))}
                  className="input-clean"
                  placeholder="7"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {t.eatingDaysHelp}
                </p>
              </div>

            </div>
          </div>

          {/* Dietary Preferences */}
          <div className="card-clean">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {t.dietaryPreferences}
              </h2>
              <p className="text-sm text-gray-500">
                {t.tapToSelectDietaryPrefs}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {DIETARY_TAGS.map((tag) => {
                const isSelected = formData.dietaryTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleDietaryTagChange(tag, !isSelected)}
                    className={`
                      px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                      ${isSelected 
                        ? 'bg-black text-white shadow-md' 
                        : 'bg-transparent text-black border border-gray-300 hover:bg-gray-100'
                      }
                    `}
                  >
                    {translateDietaryTag(tag, language)}
                  </button>
                );
              })}
            </div>
            
            {formData.dietaryTags.length > 0 && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium text-blue-900">
                    {formData.dietaryTags.length} {formData.dietaryTags.length !== 1 ? t.preferencesSelected : t.preferenceSelected}
                  </Label>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, dietaryTags: [] }))}
                    className="text-xs text-blue-700 hover:text-blue-900 underline"
                  >
                    {t.clearAll}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.dietaryTags.map((tag) => (
                    <span 
                      key={tag} 
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {translateDietaryTag(tag, language)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recipe Preferences */}
          <div className="card-clean">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Recipe Preferences
              </h2>
              <p className="text-sm text-gray-500">
                Customize your meal plan recommendations
              </p>
            </div>
            
            <div className="space-y-6">
              {/* Menstrual Cycle Phase */}
              <div className="p-4 border rounded-lg bg-pink-50 border-pink-200">
                <Label htmlFor="menstrualPhase" className="text-sm font-medium text-foreground mb-2 block">
                  Current menstrual cycle phase
                </Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Select your current cycle phase to optimize meal recommendations with phase-specific nutrients
                </p>
                <Select
                  value={formData.menstrualPhase}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, menstrualPhase: value }))}
                >
                  <SelectTrigger className="input-clean">
                    <SelectValue placeholder="Select your current phase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Don't include cycle-specific optimization</SelectItem>
                    <SelectItem value="menstrual">Menstrual - Days 1-5 (bleeding phase)</SelectItem>
                    <SelectItem value="follicular">Follicular - Days 1-13 (post-menstruation)</SelectItem>
                    <SelectItem value="ovulation">Ovulation - Days 12-16 (ovulatory phase)</SelectItem>
                    <SelectItem value="luteal">Luteal - Days 15-28 (pre-menstruation)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Low-Carb Dinner Setting */}
              <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                <Label htmlFor="dinnerLowCarbMaxCarbs" className="text-sm font-medium text-foreground mb-2 block">
                  {language === 'nl' ? 'Laag koolhydraat avondeten limiet' : 'Low-carb dinner limit'}
                </Label>
                <p className="text-xs text-muted-foreground mb-3">
                  {language === 'nl' 
                    ? 'Alle avondmaaltijden zijn standaard laag-koolhydraat (max 50g). Stel een striktere limiet in als gewenst.'
                    : 'All dinners are low-carb by default (max 50g). Set a stricter limit if desired.'}
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    id="dinnerLowCarbMaxCarbs"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="50"
                    value={formData.dinnerLowCarbMaxCarbs}
                    onChange={(e) => setFormData(prev => ({ ...prev, dinnerLowCarbMaxCarbs: e.target.value }))}
                    className="input-clean w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    {language === 'nl' ? 'gram koolhydraten max' : 'grams carbs max'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {language === 'nl' 
                    ? 'Standaard: 50g | Laag-koolhydraat: 30g | Keto: 20g'
                    : 'Default: 50g | Low-carb: 30g | Keto: 20g'}
                </p>
              </div>

            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={updateProfileMutation.isPending}
              className="btn-minimal"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                  {language === 'nl' ? 'Opslaan...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t.saveProfile}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}