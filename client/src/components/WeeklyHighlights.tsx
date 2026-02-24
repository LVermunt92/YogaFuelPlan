import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Leaf, Calendar, ChevronDown } from "lucide-react";
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
  const [seasonOpen, setSeasonOpen] = useState(false);
  const [cycleOpen, setCycleOpen] = useState(false);
  const [marketsOpen, setMarketsOpen] = useState(false);
  
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
        nameEn: "menstrual phase",
        nameNl: "menstruatiefase",
        en: "Your body needs extra iron and magnesium. Focus on iron-rich foods like lentils, spinach, and quinoa, plus magnesium sources like nuts, seeds, and whole grains.",
        nl: "Je lichaam heeft extra ijzer en magnesium nodig. Focus op ijzerrijke voedingsmiddelen zoals linzen, spinazie en quinoa, plus magnesiumbronnen zoals noten, zaden en volkoren granen.",
        icon: "🩸"
      },
      follicular: {
        nameEn: "follicular phase",
        nameNl: "folliculaire fase",
        en: "A great time for lighter meals. Focus on fresh vegetables, sprouted grains, and probiotic-rich foods to support increasing energy levels.",
        nl: "Een goede tijd voor lichtere maaltijden. Focus op verse groenten, ontkiemde granen en probiotica-rijke voedingsmiddelen om stijgende energieniveaus te ondersteunen.",
        icon: "🌱"
      },
      ovulation: {
        nameEn: "ovulation phase",
        nameNl: "ovulatiefase",
        en: "Support your body with antioxidant-rich foods like berries and leafy greens, plus plenty of fiber and anti-inflammatory ingredients.",
        nl: "Ondersteun je lichaam met antioxidant-rijke voedingsmiddelen zoals bessen en bladgroenten, plus veel vezels en ontstekingsremmende ingrediënten.",
        icon: "🌸"
      },
      luteal: {
        nameEn: "luteal phase",
        nameNl: "luteale fase",
        en: "Your metabolism increases by about 10–20%. Focus on warm, easy-to-digest meals and keep complex carbs to steady blood sugar. Eat three balanced meals a day to support energy and manage higher cortisol. Add electrolytes and salt to ease PMS and maintain fluid balance.",
        nl: "Je metabolisme stijgt met ongeveer 10-20%. Focus op warme, gemakkelijk verteerbare maaltijden en behoud complexe koolhydraten om bloedsuiker stabiel te houden. Eet drie uitgebalanceerde maaltijden per dag om energie te ondersteunen en hoger cortisol te beheersen. Voeg elektrolyten en zout toe om PMS te verlichten en vochtbalans te behouden.",
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
          <span className="text-gray-900 whitespace-nowrap">
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
            <button
              className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => setCycleOpen(o => !o)}
            >
              <div className="flex items-center gap-2">
                <span className="text-base shrink-0">{menstrualInfo.icon}</span>
                <span className="text-sm font-medium text-gray-700">
                  {language === 'nl'
                    ? `Cyclus ondersteuning: ${menstrualInfo.nameNl}`
                    : `Cycle support: ${menstrualInfo.nameEn}`}
                </span>
              </div>
              <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform shrink-0 ${cycleOpen ? 'rotate-180' : ''}`} />
            </button>
            {cycleOpen && (
              <p className="text-sm text-gray-600 leading-relaxed mt-2 px-1">
                {language === 'nl' ? menstrualInfo.nl : menstrualInfo.en}
              </p>
            )}
          </div>
        )}

        {/* Seasonal Description */}
        <div>
          <button
            className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            onClick={() => setSeasonOpen(o => !o)}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-600 shrink-0" />
              <span className="text-sm font-medium text-gray-700">
                {seasonNames[seasonalInfo.season]} {language === 'nl' ? 'voeding' : 'nutrition'}
              </span>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform shrink-0 ${seasonOpen ? 'rotate-180' : ''}`} />
          </button>
          {seasonOpen && (
            <div className="mt-2 px-1 space-y-3">
              <p className="text-sm text-gray-600 leading-relaxed">
                {seasonalInfo.weekDescription}
              </p>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Leaf className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {language === 'nl' ? 'Piek Nederlandse seizoensgroenten' : 'Peak Dutch seasonal vegetables'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
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
            </div>
          )}
        </div>
        
        {/* Local Markets Section */}
        {seasonalInfo.localMarkets && (
          <div>
            <button
              className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => setMarketsOpen(o => !o)}
            >
              <div className="flex items-center gap-2">
                <span className="text-base shrink-0">🏪</span>
                <span className="text-sm font-medium text-gray-700">
                  {language === 'nl' ? 'Lokale markten' : 'Local markets'}
                </span>
              </div>
              <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform shrink-0 ${marketsOpen ? 'rotate-180' : ''}`} />
            </button>
            {marketsOpen && (
              <ul className="mt-2 px-1 space-y-1">
                {seasonalInfo.localMarkets.map((market, index) => (
                  <li key={index} className="text-sm text-gray-600">• {market}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
