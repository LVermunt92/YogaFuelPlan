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
    queryKey: ['/api/seasonal', coords, language],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (coords) {
        params.set('lat', coords.latitude.toString());
        params.set('lng', coords.longitude.toString());
      }
      params.set('language', language);
      
      const url = `/api/seasonal?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch seasonal info');
      return response.json();
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: 1
  });

  if (isLoading) {
    return (
      <Card className="w-full">
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
    <Card className="w-full" padding="none">
      <CardHeader className="pb-4 px-6 pt-6">
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
      <CardContent className="space-y-4 sm:space-y-6 px-6 pb-6">
        <p className="text-sm text-gray-600 leading-relaxed">
          {seasonalInfo.weekDescription}
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Leaf className="h-4 w-4 text-green-600" />
              <h4 className="font-medium text-sm text-gray-700">
                {language === 'nl' ? 'Nederlandse Seizoensgroenten' : 'Dutch Seasonal Vegetables'}
              </h4>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {/* Show Dutch seasonal vegetables from Voedingscentrum data first */}
              {seasonalInfo.monthlyProduce?.vegetables?.slice(0, 8).map((veg, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-xs capitalize bg-green-50 text-green-700 hover:bg-green-100"
                >
                  {veg}
                </Badge>
              )) || seasonalInfo.seasonalFoods.slice(0, 8).map((food, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-xs capitalize bg-green-50 text-green-700 hover:bg-green-100"
                >
                  {food}
                </Badge>
              ))}
            </div>
            {seasonalInfo.monthlyProduce?.localFocus && (
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                {seasonalInfo.monthlyProduce.localFocus}
              </p>
            )}
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
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🏪</span>
              <h4 className="font-medium text-sm text-gray-700">
                {language === 'nl' ? 'Waar Verse Lokale Groenten Te Vinden' : 'Where to Find Fresh Local Produce'}
              </h4>
            </div>
            <ul className="space-y-2">
              {seasonalInfo.localMarkets.map((market, index) => (
                <li key={index} className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  • {market}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}