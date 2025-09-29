import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Leaf, Calendar, ThermometerSun } from "lucide-react";

interface SeasonalInfo {
  season: 'winter' | 'spring' | 'summer' | 'autumn';
  location: string;
  hemisphere: 'north' | 'south';
  seasonalFoods: string[];
  nutritionalTips: string[];
  weekDescription: string;
  colorAccent: string;
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

const seasonNames = {
  winter: "Winter",
  spring: "Spring", 
  summer: "Summer",
  autumn: "Autumn"
};

export function SeasonalAdvisor() {
  const { coords } = useGeolocation();

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
      <Card className="w-full lg:max-w-4xl lg:mx-auto animate-pulse">
        <CardContent className="p-6">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </CardContent>
      </Card>
    );
  }

  if (!seasonalInfo) {
    return null;
  }

  return (
    <Card className="w-full lg:max-w-4xl lg:mx-auto border-l-4" style={{ borderLeftColor: seasonalInfo.colorAccent }}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="text-xl">{seasonIcons[seasonalInfo.season]}</span>
          <span style={{ color: seasonalInfo.colorAccent }}>
            {seasonNames[seasonalInfo.season]} Nutrition
          </span>
          <div className="flex items-center gap-1 text-sm font-normal text-gray-500 ml-auto">
            <MapPin className="h-4 w-4" />
            {seasonalInfo.location}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-700 leading-relaxed">
          {seasonalInfo.weekDescription}
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="h-4 w-4" style={{ color: seasonalInfo.colorAccent }} />
              <h4 className="font-medium text-sm">Seasonal Foods</h4>
            </div>
            <div className="flex flex-wrap gap-1">
              {seasonalInfo.seasonalFoods.slice(0, 6).map((food, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-xs capitalize"
                  style={{ 
                    backgroundColor: `${seasonalInfo.colorAccent}15`,
                    color: seasonalInfo.colorAccent 
                  }}
                >
                  {food}
                </Badge>
              ))}
            </div>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ThermometerSun className="h-4 w-4" style={{ color: seasonalInfo.colorAccent }} />
              <h4 className="font-medium text-sm">Nutritional Focus</h4>
            </div>
            <div className="flex flex-wrap gap-1">
              {seasonalInfo.nutritionalTips.slice(0, 4).map((tip, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="text-xs capitalize"
                  style={{ 
                    borderColor: seasonalInfo.colorAccent,
                    color: seasonalInfo.colorAccent 
                  }}
                >
                  {tip}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}