import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Leaf, ThermometerSun, ArrowLeft, Calendar } from "lucide-react";
import { useTranslations } from "@/lib/translations";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "wouter";

interface SeasonalInfo {
  season: 'winter' | 'spring' | 'summer' | 'autumn';
  location: string;
  hemisphere: 'north' | 'south';
  seasonalFoods: string[];
  nutritionalTips: string[];
  weekDescription: string;
  colorAccent: string;
  monthlyProduce?: {
    vegetables: string[];
    localFocus: string;
    peak: string[];
  };
  localMarkets?: string[];
}

const seasonIcons = {
  winter: "❄️",
  spring: "🌸", 
  summer: "☀️",
  autumn: "🍂"
};

export default function SeasonalNutrition() {
  const { language } = useLanguage();
  const t = useTranslations(language);
  
  const seasonNames = {
    winter: t.winter,
    spring: t.spring, 
    summer: t.summer,
    autumn: t.autumn
  };

  const { data: seasonalInfo, isLoading } = useQuery<SeasonalInfo>({
    queryKey: ['/api/seasonal', language],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('language', language);
      
      const url = `/api/seasonal?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch seasonal info');
      return response.json();
    },
    staleTime: 1000 * 60 * 60,
    retry: 3
  });

  const currentMonth = new Date().getMonth();
  const monthNames = [
    t.january, t.february, t.march, t.april, t.may, t.june,
    t.july, t.august, t.september, t.october, t.november, t.december
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fefdf9] p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-6 animate-pulse"></div>
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!seasonalInfo) {
    return (
      <div className="min-h-screen bg-[#fefdf9] p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {language === 'nl' ? 'Terug' : 'Back'}
            </Button>
          </Link>
          <p className="text-gray-500">
            {language === 'nl' 
              ? 'Seizoensinformatie tijdelijk niet beschikbaar' 
              : 'Seasonal information temporarily unavailable'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fefdf9] p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-4" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {language === 'nl' ? 'Terug' : 'Back'}
          </Button>
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">{seasonIcons[seasonalInfo.season]}</span>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="text-page-title">
              {seasonNames[seasonalInfo.season]} {language === 'nl' ? 'voeding' : 'nutrition'}
            </h1>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <MapPin className="h-3.5 w-3.5" />
              {seasonalInfo.location}
            </div>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-gray-600" />
              {monthNames[currentMonth]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 leading-relaxed">
              {seasonalInfo.weekDescription}
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Leaf className="h-5 w-5 text-green-600" />
                {language === 'nl' ? 'Piek seizoensgroenten' : 'Peak seasonal vegetables'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {seasonalInfo.monthlyProduce?.peak?.map((veg, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="text-sm capitalize bg-green-50 text-green-700"
                    data-testid={`badge-vegetable-${index}`}
                  >
                    {veg}
                  </Badge>
                ))}
              </div>
              {seasonalInfo.monthlyProduce?.localFocus && (
                <p className="mt-4 text-sm text-gray-600">
                  <strong>{language === 'nl' ? 'Lokale focus:' : 'Local focus:'}</strong> {seasonalInfo.monthlyProduce.localFocus}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ThermometerSun className="h-5 w-5 text-blue-600" />
                {t.nutritionalFocus}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {seasonalInfo.nutritionalTips.map((tip, index) => (
                  <Badge 
                    key={index} 
                    variant="outline" 
                    className="text-sm capitalize border-blue-200 text-blue-700"
                    data-testid={`badge-tip-${index}`}
                  >
                    {tip}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {seasonalInfo.localMarkets && seasonalInfo.localMarkets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="text-xl">🏪</span>
                {language === 'nl' ? 'Waar verse lokale groenten te vinden' : 'Where to find fresh local produce'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {seasonalInfo.localMarkets.map((market, index) => (
                  <li 
                    key={index} 
                    className="text-gray-600 leading-relaxed flex items-start gap-2"
                    data-testid={`text-market-${index}`}
                  >
                    <span className="text-green-600 mt-1">•</span>
                    <span>{market}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="text-xl">🥬</span>
              {language === 'nl' ? 'Alle seizoensgroenten' : 'All seasonal vegetables'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {seasonalInfo.monthlyProduce?.vegetables?.map((veg, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-sm capitalize bg-gray-100 text-gray-700"
                  data-testid={`badge-all-vegetable-${index}`}
                >
                  {veg}
                </Badge>
              )) || seasonalInfo.seasonalFoods.map((food, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-sm capitalize bg-gray-100 text-gray-700"
                >
                  {food}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
