import React, { useState } from "react";
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
import { User, Save, UserCircle } from "lucide-react";
import { useTranslations, translateDietaryTag } from "@/lib/translations";
import { useLanguage } from "@/contexts/LanguageContext";

// Available dietary tags for user selection
const DIETARY_TAGS = [
  "Vegetarian",
  "Vegan", 
  "Gluten-Free",
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
  cookingDaysPerWeek: number;
  eatingDaysAtHome: number;
  mealsPerDay: number;
  meatFishMealsPerWeek: number;
  useOnlyMyRecipes: boolean;
  menstrualPhase: string;
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

  // Fetch nutrition targets
  const { data: nutritionTargets, isLoading: nutritionLoading } = useQuery<NutritionTargets>({
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
    cookingDaysPerWeek: '',
    eatingDaysAtHome: '',
    mealsPerDay: '',
    meatFishMealsPerWeek: '',
    useOnlyMyRecipes: false,
    menstrualPhase: 'off',
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
  const [isFormInitialized, setIsFormInitialized] = React.useState(false);

  // Update form data when user data loads (only on initial load)
  React.useEffect(() => {
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
        cookingDaysPerWeek: isNewUser ? '' : (user.cookingDaysPerWeek?.toString() || ''),
        eatingDaysAtHome: isNewUser ? '' : (user.eatingDaysAtHome?.toString() || ''),
        mealsPerDay: isNewUser ? '' : (user.mealsPerDay?.toString() || ''),
        meatFishMealsPerWeek: isNewUser ? '' : (user.meatFishMealsPerWeek?.toString() || ''),
        useOnlyMyRecipes: user.useOnlyMyRecipes || false,
        menstrualPhase: user.menstrualPhase || 'off',
      });
      setIsFormInitialized(true);
    }
  }, [user, isFormInitialized]);

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
          cookingDaysPerWeek: updatedData.cookingDaysPerWeek?.toString() || '7',
          eatingDaysAtHome: updatedData.eatingDaysAtHome?.toString() || '7',
          mealsPerDay: updatedData.mealsPerDay?.toString() || '2',
          meatFishMealsPerWeek: updatedData.meatFishMealsPerWeek?.toString() || '0',
          useOnlyMyRecipes: updatedData.useOnlyMyRecipes || false,
          menstrualPhase: updatedData.menstrualPhase || 'off',
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
    
    // Invalidate nutrition targets to trigger recalculation when training type or goal changes
    if (field === 'trainingType' || field === 'goal' || field === 'activityLevel') {
      queryClient.invalidateQueries({ queryKey: ['/api/nutrition/targets', authUser?.id] });
    }
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
      cookingDaysPerWeek: formData.cookingDaysPerWeek ? parseInt(formData.cookingDaysPerWeek) : 7,
      eatingDaysAtHome: formData.eatingDaysAtHome ? parseInt(formData.eatingDaysAtHome) : 7,
      mealsPerDay: formData.mealsPerDay ? parseInt(formData.mealsPerDay) : 2,
      meatFishMealsPerWeek: formData.meatFishMealsPerWeek ? parseInt(formData.meatFishMealsPerWeek) : 0,
      useOnlyMyRecipes: formData.useOnlyMyRecipes,
      menstrualPhase: formData.menstrualPhase,
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
                  Physiology Gender
                </Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Protein needs differ with hormones, muscle mass and age. If unsure, choose the range you feel fits your physiology best.
                </p>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => handleActivityOrAgeChange('gender', value)}
                >
                  <SelectTrigger className="input-clean">
                    <SelectValue placeholder="Select physiology gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
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
                  Waist Circumference (cm)
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Measure around your waist at the narrowest point
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

          {/* Nutrition Targets */}
          {nutritionTargets && (
            <div className="card-clean">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  {t.nutritionTargets || 'Nutrition Targets'}
                </h2>
                <p className="text-sm text-gray-500">
                  Daily targets calculated based on your activity level, age, and physiology
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="text-sm font-medium text-emerald-800 mb-1">Protein</div>
                  <div className="text-2xl font-bold text-emerald-900">{Math.round(nutritionTargets.protein)}g</div>
                  <div className="text-xs text-emerald-600 mt-1">
                    {formData.activityLevel === 'high' || formData.activityLevel === 'athlete' 
                      ? 'High Protein Target' 
                      : 'Standard Target'}
                  </div>
                </div>
                
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-sm font-medium text-yellow-800 mb-1">Healthy Fats</div>
                  <div className="text-2xl font-bold text-yellow-900">{Math.round(nutritionTargets.fats)}g</div>
                  <div className="text-xs text-yellow-600 mt-1">
                    {Math.round(nutritionTargets.fatPercentage)}% of calories
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm font-medium text-blue-800 mb-1">Carbohydrates</div>
                  <div className="text-2xl font-bold text-blue-900">{Math.round(nutritionTargets.carbohydrates)}g</div>
                  <div className="text-xs text-blue-600 mt-1">
                    {formData.trainingType === 'endurance' ? 'Endurance Focus' : 
                     formData.trainingType === 'strength' ? 'Strength Focus' : 'General'}
                  </div>
                </div>
                
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="text-sm font-medium text-orange-800 mb-1">Total Calories</div>
                  <div className="text-2xl font-bold text-orange-900">{Math.round(nutritionTargets.calories)}</div>
                  <div className="text-xs text-orange-600 mt-1">
                    {formData.goal === 'lose_fat' ? 'Weight Loss' : 
                     formData.goal === 'bulk' ? 'Weight Gain' : 'Maintenance'}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm font-medium text-blue-900 mb-2">Calculation Details</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                  <div>
                    <span className="font-medium">BMR:</span> {Math.round(nutritionTargets.bmr)} calories
                  </div>
                  <div>
                    <span className="font-medium">Maintenance:</span> {Math.round(nutritionTargets.maintenanceCalories)} calories
                  </div>
                  <div>
                    <span className="font-medium">Activity Factor:</span> {nutritionTargets.palValue}
                  </div>
                  <div>
                    <span className="font-medium">Protein Factor:</span> {nutritionTargets.proteinFactor}g/kg
                  </div>
                </div>
              </div>
            </div>
          )}

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
                  Goal Waist Circumference (cm)
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Your target waist measurement (optional)
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

              <div>
                <Label htmlFor="mealsPerDay" className="text-sm font-medium text-foreground mb-2 block">
                  {t.mealsPerDay}
                </Label>
                <Input
                  id="mealsPerDay"
                  type="number"
                  min="2"
                  max="3"
                  value={formData.mealsPerDay}
                  onChange={(e) => setFormData(prev => ({ ...prev, mealsPerDay: e.target.value }))}
                  className="input-clean"
                  placeholder="2"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {t.mealsPerDayHelp}
                </p>
              </div>

              <div>
                <Label htmlFor="meatFishMealsPerWeek" className="text-sm font-medium text-foreground mb-2 block">
                  {t.meatFishMealsPerWeekFull}
                </Label>
                <Input
                  id="meatFishMealsPerWeek"
                  type="number"
                  min="0"
                  max="21"
                  value={formData.meatFishMealsPerWeek || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, meatFishMealsPerWeek: e.target.value }))}
                  className="input-clean"
                  placeholder="0"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {t.meatFishMealsHelp}
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