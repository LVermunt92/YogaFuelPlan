import React from "react";
import { Heart, Zap, Users, Brain, Leaf, Target } from "lucide-react";
import { useTranslations } from "@/lib/translations";
import { useLanguage } from "@/contexts/LanguageContext";

export default function About() {
  const { language } = useLanguage();
  const t = useTranslations(language);

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
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {t.aboutSubtitle}
          </p>
        </div>

        {/* Mission Statement */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            {t.ourPhilosophy}
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed text-center max-w-4xl mx-auto">
            {t.philosophyStatement}
          </p>
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
                    <h3 className="text-lg font-semibold text-gray-900">
                      {t[point.titleKey]}
                    </h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed">
                    {t[point.descriptionKey]}
                  </p>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}