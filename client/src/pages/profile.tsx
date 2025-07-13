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
import { apiRequest } from "@/lib/queryClient";
import { User, Save, UserCircle } from "lucide-react";

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
  "pescatarian"
] as const;

interface UserProfile {
  id: number;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  weight: number | null;
  activityLevel: string;
  proteinTarget: number;
  dietaryTags: string[];
  householdSize: number;
  cookingDaysPerWeek: number;
  eatingDaysAtHome: number;
  createdAt: string;
  updatedAt: string;
}

export default function Profile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user profile
  const { data: user, isLoading } = useQuery<UserProfile>({
    queryKey: ['/api/users/1/profile'],
  });

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    weight: '',
    activityLevel: 'high',
    proteinTarget: '',
    dietaryTags: [] as string[],
    householdSize: '1',
    cookingDaysPerWeek: '7',
    eatingDaysAtHome: '7'
  });

  // Update form data when user data loads
  React.useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        weight: user.weight?.toString() || '',
        activityLevel: user.activityLevel || 'high',
        proteinTarget: user.proteinTarget?.toString() || '',
        dietaryTags: user.dietaryTags || [],
        householdSize: user.householdSize?.toString() || '1',
        cookingDaysPerWeek: user.cookingDaysPerWeek?.toString() || '7',
        eatingDaysAtHome: user.eatingDaysAtHome?.toString() || '7'
      });
    }
  }, [user]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PATCH', '/api/users/1/profile', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/1/profile'] });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updateData = {
      username: formData.username,
      email: formData.email || null,
      firstName: formData.firstName || null,
      lastName: formData.lastName || null,
      weight: formData.weight ? parseFloat(formData.weight) : null,
      activityLevel: formData.activityLevel,
      proteinTarget: formData.proteinTarget ? parseInt(formData.proteinTarget) : null,
      dietaryTags: formData.dietaryTags,
      householdSize: formData.householdSize ? parseInt(formData.householdSize) : 1,
      cookingDaysPerWeek: formData.cookingDaysPerWeek ? parseInt(formData.cookingDaysPerWeek) : 7,
      eatingDaysAtHome: formData.eatingDaysAtHome ? parseInt(formData.eatingDaysAtHome) : 7
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
            Personal Information
          </h1>
          <p className="text-muted-foreground">
            Manage your profile settings and dietary preferences to personalise your meal plans.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="card-clean">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-2 flex items-center">
                <UserCircle className="mr-2 h-5 w-5" />
                Basic Information
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="username" className="text-sm font-medium text-foreground mb-2 block">
                  Username
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
                  Email
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
                  First Name
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
                  Last Name
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
                Health & Fitness
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="weight" className="text-sm font-medium text-foreground mb-2 block">
                  Weight (kg)
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
                <Label htmlFor="activityLevel" className="text-sm font-medium text-foreground mb-2 block">
                  Default Activity Level
                </Label>
                <Select
                  value={formData.activityLevel}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, activityLevel: value }))}
                >
                  <SelectTrigger className="input-clean">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High Activity</SelectItem>
                    <SelectItem value="low">Low Activity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="proteinTarget" className="text-sm font-medium text-foreground mb-2 block">
                  Daily Protein Target (g)
                </Label>
                <Input
                  id="proteinTarget"
                  type="number"
                  value={formData.proteinTarget}
                  onChange={(e) => setFormData(prev => ({ ...prev, proteinTarget: e.target.value }))}
                  className="input-clean"
                />
              </div>
            </div>
          </div>

          {/* Meal Planning Preferences */}
          <div className="card-clean">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Meal Planning Preferences
              </h2>
              <p className="text-sm text-muted-foreground">
                These settings help us tailor meal plans to your cooking habits and household size.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="householdSize" className="text-sm font-medium text-foreground mb-2 block">
                  Household Size (people)
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
                <p className="text-xs text-muted-foreground mt-1">
                  Number of people you're cooking for
                </p>
              </div>

              <div>
                <Label htmlFor="cookingDaysPerWeek" className="text-sm font-medium text-foreground mb-2 block">
                  Cooking Days Per Week
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
                <p className="text-xs text-muted-foreground mt-1">
                  How many days per week you cook meals (useful for batch cooking)
                </p>
              </div>

              <div>
                <Label htmlFor="eatingDaysAtHome" className="text-sm font-medium text-foreground mb-2 block">
                  Eating Days At Home
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
                <p className="text-xs text-muted-foreground mt-1">
                  How many days per week you eat at home vs eating out
                </p>
              </div>
            </div>
          </div>

          {/* Dietary Preferences */}
          <div className="card-clean">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Dietary Preferences
              </h2>
              <p className="text-sm text-muted-foreground">
                Tap to select dietary preferences that apply to you. These will be used to filter meal recommendations.
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
                    {tag.replace(/-/g, ' ')}
                  </button>
                );
              })}
            </div>
            
            {formData.dietaryTags.length > 0 && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium text-blue-900">
                    {formData.dietaryTags.length} preference{formData.dietaryTags.length !== 1 ? 's' : ''} selected
                  </Label>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, dietaryTags: [] }))}
                    className="text-xs text-blue-700 hover:text-blue-900 underline"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.dietaryTags.map((tag) => (
                    <span 
                      key={tag} 
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {tag.replace(/-/g, ' ')}
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
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}