import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { User, Save, UserCircle } from "lucide-react";
import { useTranslations, translateDietaryTag } from "@/lib/translations";
import { useLanguage } from "@/contexts/LanguageContext";

// Available dietary tags for user selection
const DIETARY_TAGS = [
  "vegetarian",
  "vegan", 
  "gluten-free",
  "lactose-free",
  "dairy-free",
  "nut-free",
  "soy-free",
  "low-carb",
  "keto",
  "paleo",
  "mediterranean",
  "anti-inflammatory",
  "high-protein",
  "low-sodium",
  "sugar-free",
  "whole30",
  "raw",
  "pescatarian",
  "ayurvedic"
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
  proteinTarget: number;
  dietaryTags: string[];
  householdSize: number;
  cookingDaysPerWeek: number;
  eatingDaysAtHome: number;
  meatFishMealsPerWeek: number;
  createdAt: string;
  updatedAt: string;
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
    activityLevel: 'high',
    proteinTarget: '',
    dietaryTags: [] as string[],
    householdSize: '1',
    cookingDaysPerWeek: '7',
    eatingDaysAtHome: '7',
    meatFishMealsPerWeek: '0'
  });

  // Calculate dynamic protein target based on age and activity level
  const calculateProteinTarget = (age: number | null, activityLevel: string) => {
    if (!age) return 70; // Default fallback
    
    const isHighProteinAge = age >= 35; // 35+ years need higher protein
    const isActive = activityLevel === 'high';
    
    if (isHighProteinAge) {
      return isActive ? 100 : 70; // Active: 100g, Inactive: 70g
    } else {
      return isActive ? 70 : 50; // Under 35: Active: 70g, Inactive: 50g  
    }
  };

  // Track if form has been initialized to prevent reset after saves
  const [isFormInitialized, setIsFormInitialized] = React.useState(false);

  // Update form data when user data loads (only on initial load)
  React.useEffect(() => {
    if (user && !isFormInitialized) {
      const dynamicProteinTarget = calculateProteinTarget(user.age, user.activityLevel);
      
      setFormData({
        username: user.username || '',
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        gender: user.gender || '',
        weight: user.weight?.toString() || '',
        goalWeight: user.goalWeight?.toString() || '',
        height: user.height?.toString() || '',
        age: user.age?.toString() || '',
        waistline: user.waistline?.toString() || '',
        goalWaistline: user.goalWaistline?.toString() || '',
        targetDate: user.targetDate || '',
        activityLevel: user.activityLevel || 'moderate',
        proteinTarget: dynamicProteinTarget.toString(),
        dietaryTags: user.dietaryTags || [],
        householdSize: user.householdSize?.toString() || '1',
        cookingDaysPerWeek: user.cookingDaysPerWeek?.toString() || '7',
        eatingDaysAtHome: user.eatingDaysAtHome?.toString() || '7',
        meatFishMealsPerWeek: user.meatFishMealsPerWeek?.toString() || '0'
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
        
        const dynamicProteinTarget = calculateProteinTarget(updatedData.age, updatedData.activityLevel);
        
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
          proteinTarget: dynamicProteinTarget.toString(),
          dietaryTags: updatedData.dietaryTags || [],
          householdSize: updatedData.householdSize?.toString() || '1',
          cookingDaysPerWeek: updatedData.cookingDaysPerWeek?.toString() || '7',
          eatingDaysAtHome: updatedData.eatingDaysAtHome?.toString() || '7',
          meatFishMealsPerWeek: updatedData.meatFishMealsPerWeek?.toString() || '0'
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

  // Handle activity level or age change to update protein target
  const handleActivityOrAgeChange = (field: string, value: string) => {
    const updatedFormData = { ...formData, [field]: value };
    
    if (field === 'activityLevel' || field === 'age') {
      const age = field === 'age' ? parseInt(value) || null : parseInt(formData.age) || null;
      const activityLevel = field === 'activityLevel' ? value : formData.activityLevel;
      const newProteinTarget = calculateProteinTarget(age, activityLevel);
      
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
      proteinTarget: formData.proteinTarget ? parseInt(formData.proteinTarget) : null,
      dietaryTags: formData.dietaryTags,
      householdSize: formData.householdSize ? parseInt(formData.householdSize) : 1,
      cookingDaysPerWeek: formData.cookingDaysPerWeek ? parseInt(formData.cookingDaysPerWeek) : 7,
      eatingDaysAtHome: formData.eatingDaysAtHome ? parseInt(formData.eatingDaysAtHome) : 7,
      meatFishMealsPerWeek: formData.meatFishMealsPerWeek ? parseInt(formData.meatFishMealsPerWeek) : 0
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
                  Gender
                </Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
                >
                  <SelectTrigger className="input-clean">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female (45+ age threshold)</SelectItem>
                    <SelectItem value="male">Male (50+ age threshold)</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
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
                  placeholder="35"
                />
              </div>

              <div>
                <Label htmlFor="weight" className="text-sm font-medium text-foreground mb-2 block">
                  {t.weight}
                </Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                  className="input-clean"
                />
              </div>

              <div>
                <Label htmlFor="height" className="text-sm font-medium text-foreground mb-2 block">
                  {t.height}
                </Label>
                <Input
                  id="height"
                  type="number"
                  value={formData.height}
                  onChange={(e) => setFormData(prev => ({ ...prev, height: e.target.value }))}
                  className="input-clean"
                />
              </div>

              <div>
                <Label htmlFor="waistline" className="text-sm font-medium text-foreground mb-2 block">
                  {t.waistline}
                </Label>
                <Input
                  id="waistline"
                  type="number"
                  step="0.1"
                  value={formData.waistline}
                  onChange={(e) => setFormData(prev => ({ ...prev, waistline: e.target.value }))}
                  className="input-clean"
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
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

              <div>
                <Label htmlFor="proteinTarget" className="text-sm font-medium text-foreground mb-2 block">
                  {t.dailyProteinTarget}
                </Label>
                <div className="space-y-2">
                  <Input
                    id="proteinTarget"
                    type="number"
                    value={formData.proteinTarget}
                    onChange={(e) => setFormData(prev => ({ ...prev, proteinTarget: e.target.value }))}
                    className="input-clean"
                    readOnly
                  />
                  <p className="text-xs text-gray-500">
                    Auto-calculated: {formData.age && parseInt(formData.age) >= 35 ? "35+ years" : "Under 35"} + {formData.activityLevel.charAt(0).toUpperCase() + formData.activityLevel.slice(1)} activity 
                    = {formData.proteinTarget}g protein/day
                  </p>
                </div>
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
                  {t.goalWaistline}
                </Label>
                <Input
                  id="goalWaistline"
                  type="number"
                  step="0.1"
                  value={formData.goalWaistline}
                  onChange={(e) => setFormData(prev => ({ ...prev, goalWaistline: e.target.value }))}
                  className="input-clean"
                  placeholder="Optional target waistline"
                />
              </div>

              <div>
                <Label htmlFor="targetDate" className="text-sm font-medium text-foreground mb-2 block">
                  {t.targetDate}
                </Label>
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