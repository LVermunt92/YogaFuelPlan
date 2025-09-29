import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Leaf, Calendar, ThermometerSun } from "lucide-react";
import { useTranslations } from "@/lib/translations";
import { useLanguage } from "@/contexts/LanguageContext";

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

interface LocationCoords {
  latitude: number;
  longitude: number;
}

function useGeolocation() {
  const [coords, setCoords] = useState<LocationCoords | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (err) => {
        setError(err.message);
        console.log("Location access denied, using default location (Amsterdam)");
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 600000, // 10 minutes
      }
    );
  }, []);

  return { coords, error };
}

const seasonIcons = {
  winter: "❄️",
  spring: "🌸", 
  summer: "☀️",
  autumn: "🍂"
};

export function SeasonalAdvisor() {
  const { coords } = useGeolocation();
  const { language } = useLanguage();
  const t = useTranslations(language);
  
  const seasonNames = {
    winter: t.winter,
    spring: t.spring, 
    summer: t.summer,
    autumn: t.autumn
  };

  const { data: seasonalInfo, isLoading } = useQuery<SeasonalInfo>({
    queryKey: ['/api/seasonal', coords],
    queryFn: async () => {
      const url = coords 
        ? `/api/seasonal?lat=${coords.latitude}&lng=${coords.longitude}`
        : '/api/seasonal';
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch seasonal info');
      return response.json();
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: 1
  });

  if (isLoading) {
    return (
      <Card className="w-full lg:max-w-4xl lg:mx-auto">
        <CardContent className="p-4 sm:p-6">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4 animate-pulse"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  if (!seasonalInfo) {
    return null;
  }

  // Get current month name for display
  const currentMonth = new Date().getMonth();
  const monthNames = [
    t.january, t.february, t.march, t.april, t.may, t.june,
    t.july, t.august, t.september, t.october, t.november, t.december
  ];

  return (
    <Card className="w-full lg:max-w-4xl lg:mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <span className="text-xl">{seasonIcons[seasonalInfo.season]}</span>
          <span className="text-gray-900">
            {seasonNames[seasonalInfo.season]} {t.seasonalNutrition}
          </span>
          <div className="flex items-center gap-1 text-sm font-normal text-gray-500 ml-auto">
            <MapPin className="h-4 w-4" />
            {seasonalInfo.location}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        <p className="text-sm text-gray-600 leading-relaxed">
          {seasonalInfo.weekDescription}
        </p>
        
        {/* Monthly Local Produce Section */}
        {seasonalInfo.monthlyProduce && (
          <div className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-900/10 dark:via-green-900/10 dark:to-teal-900/10 rounded-xl p-6 border border-emerald-200 dark:border-emerald-700/50 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                  <span className="text-xl">🌱</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-emerald-800 dark:text-emerald-200">
                    {language === 'nl' ? 'Lokale Groenten Amsterdam' : 'Local Amsterdam Produce'}
                  </h3>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    {monthNames[currentMonth]} {new Date().getFullYear()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  {language === 'nl' ? 'Seizoen' : 'In Season'}
                </span>
              </div>
            </div>
            
            <div className="mb-4 p-4 bg-white/50 dark:bg-gray-800/20 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
              <p className="text-sm text-emerald-800 dark:text-emerald-200 font-medium leading-relaxed">
                {seasonalInfo.monthlyProduce.localFocus}
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🥬</span>
                  <h4 className="font-medium text-emerald-800 dark:text-emerald-200">
                    {language === 'nl' ? 'Lokaal Geteeld Deze Maand' : 'Locally Grown This Month'}
                  </h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {seasonalInfo.monthlyProduce.vegetables.slice(0, 8).map((veg, index) => (
                    <div key={index} className="px-3 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 rounded-full text-sm font-medium border border-emerald-200 dark:border-emerald-700/50 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors">
                      {veg}
                    </div>
                  ))}
                  {seasonalInfo.monthlyProduce.vegetables.length > 8 && (
                    <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 rounded-full text-sm border border-emerald-200 dark:border-emerald-700/30">
                      +{seasonalInfo.monthlyProduce.vegetables.length - 8} {language === 'nl' ? 'meer' : 'more'}
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">⭐</span>
                  <h4 className="font-medium text-emerald-800 dark:text-emerald-200">
                    {language === 'nl' ? 'Topseizoen' : 'Peak Harvest'}
                  </h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {seasonalInfo.monthlyProduce.peak.map((item, index) => (
                    <div key={index} className="px-3 py-2 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 text-amber-800 dark:text-amber-200 rounded-full text-sm font-medium border border-amber-200 dark:border-amber-700/50 hover:from-amber-200 hover:to-orange-200 dark:hover:from-amber-900/40 dark:hover:to-orange-900/40 transition-all">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Leaf className="h-4 w-4 text-green-600" />
              <h4 className="font-medium text-sm text-gray-700">{t.seasonalFoods}</h4>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {seasonalInfo.seasonalFoods.slice(0, 6).map((food, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-xs capitalize bg-green-50 text-green-700 hover:bg-green-100"
                >
                  {food}
                </Badge>
              ))}
            </div>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ThermometerSun className="h-4 w-4 text-blue-600" />
              <h4 className="font-medium text-sm text-gray-700">{t.nutritionalFocus}</h4>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {seasonalInfo.nutritionalTips.slice(0, 4).map((tip, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="text-xs capitalize border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  {tip}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        
        {/* Local Markets Section */}
        {seasonalInfo.localMarkets && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <span className="text-lg">🏪</span>
              </div>
              <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">
                {language === 'nl' ? 'Waar Verse Lokale Groenten Te Vinden' : 'Where to Find Fresh Local Produce'}
              </h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {seasonalInfo.localMarkets.map((market, index) => (
                <div key={index} className="group p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-lg border border-blue-200 dark:border-blue-800/30 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 transition-all duration-200 hover:shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                      {market}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}