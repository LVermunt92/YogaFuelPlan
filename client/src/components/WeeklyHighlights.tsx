import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Leaf, Calendar, ThermometerSun, Heart } from "lucide-react";
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
    // Check for saved location in localStorage
    const savedLocation = localStorage.getItem('userLocation');
    const savedTimestamp = localStorage.getItem('userLocationTimestamp');
    
    if (savedLocation && savedTimestamp) {
      const locationAge = Date.now() - parseInt(savedTimestamp);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      
      // Use saved location if it's less than 7 days old
      if (locationAge < sevenDays) {
        const savedCoords = JSON.parse(savedLocation);
        setCoords(savedCoords);
        console.log("Using saved location from localStorage");
        return;
      }
    }

    // Only request location if not in localStorage or expired
    if (!navigator.geolocation) {
      setError("Geolocation is not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setCoords(newCoords);
        
        // Save to localStorage for future use
        localStorage.setItem('userLocation', JSON.stringify(newCoords));
        localStorage.setItem('userLocationTimestamp', Date.now().toString());
        console.log("Location saved to localStorage");
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

interface WeeklyHighlightsProps {
  menstrualPhase?: string; // off, menstrual, follicular, ovulation, luteal
}

export function WeeklyHighlights({ menstrualPhase = "off" }: WeeklyHighlightsProps) {
  const { coords } = useGeolocation();
  const { language } = useLanguage();
  const t = useTranslations(language);
  
  const seasonNames = {
    winter: t.winter,
    spring: t.spring, 
    summer: t.summer,
    autumn: t.autumn
  };

  const { data: seasonalInfo, isLoading, error } = useQuery<SeasonalInfo>({
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
    retry: 3
  });

  // Get menstrual cycle phase text
  const getMenstrualPhaseInfo = (phase: string) => {
    if (phase === "off" || !phase) return null;
    
    const phaseInfo = {
      menstrual: {
        en: "During the menstrual phase, your body needs extra iron and magnesium. Focus on iron-rich foods like lentils, spinach, and quinoa, plus magnesium sources like nuts, seeds, and whole grains.",
        nl: "Tijdens de menstruatiefase heeft je lichaam extra ijzer en magnesium nodig. Focus op ijzerrijke voedingsmiddelen zoals linzen, spinazie en quinoa, plus magnesiumbronnen zoals noten, zaden en volkoren granen.",
        icon: "🩸"
      },
      follicular: {
        en: "The follicular phase is a great time for lighter meals. Focus on fresh vegetables, sprouted grains, and probiotic-rich foods to support increasing energy levels.",
        nl: "De folliculaire fase is een goede tijd voor lichtere maaltijden. Focus op verse groenten, ontkiemde granen en probiotica-rijke voedingsmiddelen om stijgende energieniveaus te ondersteunen.",
        icon: "🌱"
      },
      ovulation: {
        en: "During ovulation, support your body with antioxidant-rich foods like berries and leafy greens, plus plenty of fiber and anti-inflammatory ingredients.",
        nl: "Tijdens de eisprong ondersteun je je lichaam met antioxidant-rijke voedingsmiddelen zoals bessen en bladgroenten, plus veel vezels en ontstekingsremmende ingrediënten.",
        icon: "🌸"
      },
      luteal: {
        en: "In the luteal phase, your metabolism increases by about 10–20%. Focus on warm, easy-to-digest meals and keep complex carbs to steady blood sugar. Eat three balanced meals a day to support energy and manage higher cortisol. Add electrolytes and salt to ease PMS and maintain fluid balance.",
        nl: "In de luteale fase stijgt je metabolisme met ongeveer 10-20%. Focus op warme, gemakkelijk verteerbare maaltijden en behoud complexe koolhydraten om bloedsuiker stabiel te houden. Eet drie uitgebalanceerde maaltijden per dag om energie te ondersteunen en hoger cortisol te beheersen. Voeg elektrolyten en zout toe om PMS te verlichten en vochtbalans te behouden.",
        icon: "🌙"
      }
    };
    
    return phaseInfo[phase as keyof typeof phaseInfo] || null;
  };

  const menstrualInfo = getMenstrualPhaseInfo(menstrualPhase);

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

  // If API fails or no data, show fallback message instead of hiding
  if (!seasonalInfo) {
    console.error('WeeklyHighlights: No seasonal info available', { error, coords, language });
    return (
      <Card className="w-full">
        <CardContent className="p-4 sm:p-6">
          <p className="text-sm text-gray-500">
            {language === 'nl' 
              ? 'Weekinformatie tijdelijk niet beschikbaar' 
              : 'Weekly information temporarily unavailable'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full" padding="none">
      <CardHeader className="pb-4 px-6 pt-6">
        <CardTitle className="flex items-center gap-2">
          <span className="text-xl">{seasonIcons[seasonalInfo.season]}</span>
          <span className="text-gray-900">
            {language === 'nl' ? 'Wekelijkse hoogtepunten' : 'Weekly highlights'}
          </span>
          <div className="flex items-center gap-1 text-sm font-normal text-gray-500 ml-auto">
            <MapPin className="h-4 w-4" />
            {seasonalInfo.location}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 px-6 pb-6">
        {/* Menstrual Cycle Information */}
        {menstrualInfo && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{menstrualInfo.icon}</span>
              <h4 className="font-medium text-sm text-gray-700">
                {language === 'nl' ? 'Cyclus ondersteuning' : 'Cycle support'}
              </h4>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              {language === 'nl' ? menstrualInfo.nl : menstrualInfo.en}
            </p>
          </div>
        )}
        
        {/* Seasonal Description */}
        <div className={menstrualInfo ? "border-t border-gray-200 dark:border-gray-700 pt-4" : ""}>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <h4 className="font-medium text-sm text-gray-700">
              {seasonNames[seasonalInfo.season]} {language === 'nl' ? 'voeding' : 'nutrition'}
            </h4>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            {seasonalInfo.weekDescription}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Leaf className="h-4 w-4 text-green-600" />
              <h4 className="font-medium text-sm text-gray-700">
                {language === 'nl' ? 'Piek Nederlandse seizoensgroenten' : 'Peak Dutch seasonal vegetables'}
              </h4>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {/* Show only peak seasonal vegetables from Voedingscentrum data */}
              {seasonalInfo.monthlyProduce?.peak?.map((veg, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-xs capitalize bg-green-50 text-green-700 hover:bg-green-100"
                >
                  {veg}
                </Badge>
              )) || seasonalInfo.seasonalFoods.slice(0, 4).map((food, index) => (
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
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🏪</span>
              <h4 className="font-medium text-sm text-gray-700">
                {language === 'nl' ? 'Waar verse lokale groenten te vinden' : 'Where to find fresh local produce'}
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
