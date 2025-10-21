import React, { useState } from "react";
import { Heart, Zap, Users, Brain, Leaf, Target, Edit, Save, X } from "lucide-react";
import { useTranslations } from "@/lib/translations";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface EditableContentItem {
  id: number;
  contentKey: string;
  contentEn: string;
  contentNl: string;
  contentType: string;
  pageSection: string;
  updatedBy?: number;
  createdAt: string;
  updatedAt: string;
}

export default function About() {
  const { language } = useLanguage();
  const t = useTranslations(language);
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Check if user is admin
  const isAdmin = authUser?.username === 'admin' || authUser?.email?.includes('admin');
  
  // State for editing
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<{ en: string; nl: string }>({ en: '', nl: '' });

  // Fetch editable content
  const { data: editableContent = [], isLoading } = useQuery<EditableContentItem[]>({
    queryKey: ['/api/editable-content'],
    staleTime: 30000, // 30 seconds
  });

  // Mutation for updating content
  const updateContentMutation = useMutation({
    mutationFn: async ({ contentKey, updates }: { contentKey: string; updates: any }) => {
      const response = await apiRequest('PUT', `/api/editable-content/${contentKey}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/editable-content'] });
      toast({
        title: "Content updated",
        description: "The page content has been updated successfully.",
      });
      setEditingKey(null);
    },
    onError: (error) => {
      toast({
        title: "Error updating content",
        description: "Failed to update the content. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Helper function to get content by key
  const getContent = (key: string): string => {
    const item = editableContent.find(item => item.contentKey === key);
    if (!item) return t[key] || key; // Fallback to translation or key
    return language === 'nl' ? item.contentNl : item.contentEn;
  };

  // Helper function to start editing
  const startEditing = (key: string) => {
    const item = editableContent.find(item => item.contentKey === key);
    if (item) {
      setEditContent({ en: item.contentEn, nl: item.contentNl });
      setEditingKey(key);
    }
  };

  // Helper function to save changes
  const saveChanges = () => {
    if (editingKey) {
      updateContentMutation.mutate({
        contentKey: editingKey,
        updates: {
          contentEn: editContent.en,
          contentNl: editContent.nl,
        }
      });
    }
  };

  // Helper function to cancel editing
  const cancelEditing = () => {
    setEditingKey(null);
    setEditContent({ en: '', nl: '' });
  };

  // Component for editable content
  const EditableContent = ({ contentKey, className = "", tag = "p" }: { contentKey: string; className?: string; tag?: string }) => {
    const isEditing = editingKey === contentKey;
    const content = getContent(contentKey);
    
    if (!isAdmin) {
      const Tag = tag as keyof JSX.IntrinsicElements;
      return <Tag className={className}>{content}</Tag>;
    }

    if (isEditing) {
      return (
        <div className="space-y-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">English:</label>
            <Textarea
              value={editContent.en}
              onChange={(e) => setEditContent(prev => ({ ...prev, en: e.target.value }))}
              className="min-h-[80px]"
            />
            <label className="text-sm font-medium">Dutch:</label>
            <Textarea
              value={editContent.nl}
              onChange={(e) => setEditContent(prev => ({ ...prev, nl: e.target.value }))}
              className="min-h-[80px]"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={saveChanges} size="sm" disabled={updateContentMutation.isPending}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button onClick={cancelEditing} variant="outline" size="sm">
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    const Tag = tag as keyof JSX.IntrinsicElements;
    return (
      <div className="relative group">
        <Tag className={className}>{content}</Tag>
        <Button
          onClick={() => startEditing(contentKey)}
          size="sm"
          variant="ghost"
          className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Edit className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  const philosophyPoints = [
    {
      icon: Heart,
      titleKey: "personalizedNutrition",
      descriptionKey: "personalizedNutritionDesc"
    },
    {
      icon: Brain,
      titleKey: "intelligentPlanning",
      descriptionKey: "intelligentPlanningDesc"
    },
    {
      icon: Zap,
      titleKey: "adaptiveLifestyle",
      descriptionKey: "adaptiveLifestyleDesc"
    },
    {
      icon: Target,
      titleKey: "precisionTargeting",
      descriptionKey: "precisionTargetingDesc"
    },
    {
      icon: Leaf,
      titleKey: "sustainableEating",
      descriptionKey: "sustainableEatingDesc"
    },
    {
      icon: Users,
      titleKey: "realLifeIntegration",
      descriptionKey: "realLifeIntegrationDesc"
    }
  ];

  return (
    <div className="min-h-screen bg-[#fefdf9]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {t.aboutMealPlanner}
          </h1>
          <EditableContent 
            contentKey="aboutSubtitle" 
            className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed"
          />
        </div>

        {/* Mission Statement */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            {t.ourPhilosophy}
          </h2>
          <EditableContent 
            contentKey="philosophyStatement" 
            className="text-lg text-gray-700 leading-relaxed text-center max-w-4xl mx-auto"
          />
        </div>

        {/* Core Principles */}
        <div className="mb-12">
          <h2 className="text-3xl font-semibold text-gray-900 mb-8 text-center">
            {t.corePrinciples}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {philosophyPoints.map((point, index) => {
              const Icon = point.icon;
              return (
                <div key={index} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center mb-4">
                    <div className="bg-blue-100 p-3 rounded-lg mr-4">
                      <Icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <EditableContent 
                      contentKey={point.titleKey} 
                      className="text-lg font-semibold text-gray-900"
                      tag="h3"
                    />
                  </div>
                  <EditableContent 
                    contentKey={point.descriptionKey} 
                    className="text-gray-600 leading-relaxed"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-8 mb-12">
          <h2 className="text-3xl font-semibold text-gray-900 mb-8 text-center">
            {t.howItWorks}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-blue-500 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">{t.step1Title}</h4>
              <p className="text-gray-600 text-sm">{t.step1Desc}</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-500 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">{t.step2Title}</h4>
              <p className="text-gray-600 text-sm">{t.step2Desc}</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-500 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">{t.step3Title}</h4>
              <p className="text-gray-600 text-sm">{t.step3Desc}</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-500 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                4
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">{t.step4Title}</h4>
              <p className="text-gray-600 text-sm">{t.step4Desc}</p>
            </div>
          </div>
        </div>

        {/* Key Features */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h2 className="text-3xl font-semibold text-gray-900 mb-8 text-center">
            {t.keyFeatures}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-green-100 p-2 rounded-lg mr-3 mt-1">
                  <Target className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{t.featureProteinTitle}</h4>
                  <p className="text-gray-600 text-sm">{t.featureProteinDesc}</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-green-100 p-2 rounded-lg mr-3 mt-1">
                  <Brain className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{t.featureAiTitle}</h4>
                  <p className="text-gray-600 text-sm">{t.featureAiDesc}</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-green-100 p-2 rounded-lg mr-3 mt-1">
                  <Zap className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{t.featureOuraTitle}</h4>
                  <p className="text-gray-600 text-sm">{t.featureOuraDesc}</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-green-100 p-2 rounded-lg mr-3 mt-1">
                  <Users className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{t.featureMealPrepTitle}</h4>
                  <p className="text-gray-600 text-sm">{t.featureMealPrepDesc}</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-green-100 p-2 rounded-lg mr-3 mt-1">
                  <Heart className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{t.featureDietaryTitle}</h4>
                  <p className="text-gray-600 text-sm">{t.featureDietaryDesc}</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-green-100 p-2 rounded-lg mr-3 mt-1">
                  <Leaf className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{t.featureShoppingTitle}</h4>
                  <p className="text-gray-600 text-sm">{t.featureShoppingDesc}</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-green-100 p-2 rounded-lg mr-3 mt-1">
                  <Heart className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{t.featureMenstrualTitle}</h4>
                  <p className="text-gray-600 text-sm">{t.featureMenstrualDesc}</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-green-100 p-2 rounded-lg mr-3 mt-1">
                  <Target className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{t.featureNutritionTitle}</h4>
                  <p className="text-gray-600 text-sm">{t.featureNutritionDesc}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}