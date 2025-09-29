export interface SeasonalInfo {
  season: 'winter' | 'spring' | 'summer' | 'autumn';
  location: string;
  hemisphere: 'north' | 'south';
  seasonalFoods: string[];
  nutritionalTips: string[];
  weekDescription: string;
  colorAccent: string;
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

// Seasonal food data for Netherlands/Northern Europe
const SEASONAL_FOODS = {
  winter: {
    vegetables: ['spruitjes', 'kool', 'wortelen', 'pastinaak', 'prei', 'aardappelen', 'uien', 'rode bieten'],
    fruits: ['appels', 'peren', 'citrusvruchten', 'kiwi', 'kaki'],
    proteins: ['stevige stoofpotten', 'wortelgroenten', 'verwarmende kruiden'],
    characteristics: ['verwarmend voedsel', 'immuunondersteuning', 'comfortvoedsel', 'vitamine D rijk voedsel']
  },
  spring: {
    vegetables: ['asperges', 'lente-uitjes', 'radijsjes', 'sla', 'spinazie', 'doperwten', 'artisjokken'],
    fruits: ['aardbeien', 'rabarber', 'vroege bessen'],
    proteins: ['lichte eiwitten', 'verse kruiden', 'detox voedsel'],
    characteristics: ['detoxificerend voedsel', 'verse groenten', 'leverondersteuning', 'energie boost']
  },
  summer: {
    vegetables: ['tomaten', 'courgette', 'paprika', 'komkommers', 'aubergine', 'mais', 'sperziebonen'],
    fruits: ['bessen', 'steenvruchten', 'meloenen', 'kersen', 'abrikozen'],
    proteins: ['verkoelende eiwitten', 'rauw voedsel', 'hydraterend voedsel'],
    characteristics: ['verkoelend voedsel', 'hydratatie', 'rauwe bereidingen', 'lichte maaltijden']
  },
  autumn: {
    vegetables: ['pompoenen', 'pompoen', 'zoete aardappelen', 'bloemkool', 'broccoli', 'paddenstoelen'],
    fruits: ['appels', 'peren', 'druiven', 'cranberries', 'granaatappels'],
    proteins: ['versterkend voedsel', 'verwarmende kruiden', 'immuunondersteuning'],
    characteristics: ['versterkend voedsel', 'immuunondersteuning', 'oogstsmaken', 'verwarmende bereidingen']
  }
};

// Determine season based on date and hemisphere
function getSeason(date: Date, hemisphere: 'north' | 'south'): 'winter' | 'spring' | 'summer' | 'autumn' {
  const month = date.getMonth(); // 0-11
  
  let season: 'winter' | 'spring' | 'summer' | 'autumn';
  
  if (hemisphere === 'north') {
    if (month >= 11 || month <= 1) season = 'winter';
    else if (month >= 2 && month <= 4) season = 'spring';
    else if (month >= 5 && month <= 7) season = 'summer';
    else season = 'autumn';
  } else {
    // Southern hemisphere - seasons are opposite
    if (month >= 5 && month <= 7) season = 'winter';
    else if (month >= 8 && month <= 10) season = 'spring';
    else if (month >= 11 || month <= 1) season = 'summer';
    else season = 'autumn';
  }
  
  return season;
}

// Determine hemisphere from coordinates
function getHemisphere(latitude: number): 'north' | 'south' {
  return latitude >= 0 ? 'north' : 'south';
}

// Get location name from coordinates (simplified)
function getLocationName(coords: LocationCoords): string {
  if (coords.city && coords.country) {
    return `${coords.city}, ${coords.country}`;
  }
  
  // Default to Netherlands regions based on coordinates
  if (coords.latitude >= 52.0 && coords.latitude <= 53.5 && 
      coords.longitude >= 4.0 && coords.longitude <= 7.0) {
    return 'Netherlands';
  }
  
  return 'Northern Europe';
}

// Generate week-specific seasonal description
function generateWeekDescription(season: 'winter' | 'spring' | 'summer' | 'autumn', location: string): string {
  const now = new Date();
  const weekNumber = Math.ceil(now.getDate() / 7);
  
  const descriptions = {
    winter: [
      `Deze winterweek in ${location}, focus op verwarmende, voedzame voedingsmiddelen die je immuunsysteem ondersteunen en comfort bieden tijdens koude dagen.`,
      `Midden winter in ${location} vraagt om stevige, versterkende maaltijden rijk aan wortelgroenten en verwarmende kruiden voor volgehouden energie.`,
      `Eind winter in ${location} is perfect voor immuunversterkende voedingsmiddelen en het voorbereiden van je lichaam op de komende lentevernieuwing.`,
      `Diep in de winter in ${location} benadrukt gezellige, nutriëntrijke maaltijden die van binnenuit verwarmen en seizoensgebonden welzijn ondersteunen.`
    ],
    spring: [
      `Vroege lente in ${location} brengt frisse energie - omarm detoxificerende groenten en lichtere maaltijden terwijl de natuur ontwaakt.`,
      `Midden lente in ${location} biedt de eerste verse groenten - perfect voor het reinigen van winterse zwaarte met levendige smaken.`,
      `Late lente in ${location} biedt overvloedige verse producten om energie te geven en je lichaam voor te bereiden op zomeractiviteiten.`,
      `Lentevernieuwing in ${location} ondersteunt natuurlijke detox met verse kruiden, vroege groenten en revitaliserende voedingsstoffen.`
    ],
    summer: [
      `Vroege zomer in ${location} vraagt om verkoelende, hydraterende voedingsmiddelen die langere dagen en buitenactiviteiten aanvullen.`,
      `Piekzomer in ${location} biedt overvloedige verse vruchten en groenten - omarm rauwe, verkoelende bereidingen.`,
      `Midzomer in ${location} benadrukt lichte, verfrissende maaltijden die energie geven zonder zwaar te zijn.`,
      `Hoge zomer in ${location} is perfect voor hydraterende voedingsmiddelen en verkoelende bereidingen die de hitte natuurlijk verslaan.`
    ],
    autumn: [
      `Vroege herfst in ${location} brengt oogstsmaken - omarm versterkende voedingsmiddelen die voorbereiden op de komende winter.`,
      `Midden herfst in ${location} biedt seizoensgebonden pompoenen en wortelgroenten perfect voor verwarmende, voedzame maaltijden.`,
      `Late herfst in ${location} vraagt om immuunondersteunende voedingsmiddelen en verwarmende kruiden terwijl de temperaturen dalen.`,
      `Diepe herfst in ${location} benadrukt versterkende, verwarmende voedingsmiddelen die interne warmte opbouwen voor winterwelzijn.`
    ]
  };
  
  return descriptions[season][Math.min(weekNumber - 1, 3)];
}

// Get seasonal color accent
function getSeasonalColor(season: 'winter' | 'spring' | 'summer' | 'autumn'): string {
  const colors = {
    winter: '#6366f1', // Indigo
    spring: '#10b981', // Emerald  
    summer: '#f59e0b', // Amber
    autumn: '#f97316'  // Orange (warmer than red)
  };
  
  return colors[season];
}

// Get seasonal months for a given season and hemisphere
export function getSeasonalMonths(season: 'winter' | 'spring' | 'summer' | 'autumn', hemisphere: 'north' | 'south'): string[] {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  if (hemisphere === 'north') {
    switch (season) {
      case 'winter': return [months[11], months[0], months[1]]; // Dec, Jan, Feb
      case 'spring': return [months[2], months[3], months[4]]; // Mar, Apr, May
      case 'summer': return [months[5], months[6], months[7]]; // Jun, Jul, Aug
      case 'autumn': return [months[8], months[9], months[10]]; // Sep, Oct, Nov
    }
  } else {
    // Southern hemisphere - seasons are opposite
    switch (season) {
      case 'winter': return [months[5], months[6], months[7]]; // Jun, Jul, Aug
      case 'spring': return [months[8], months[9], months[10]]; // Sep, Oct, Nov
      case 'summer': return [months[11], months[0], months[1]]; // Dec, Jan, Feb
      case 'autumn': return [months[2], months[3], months[4]]; // Mar, Apr, May
    }
  }
}

// Get all seasonal month tags for a recipe based on location
export function getRecipeSeasonalMonthTags(coords?: LocationCoords): string[] {
  const location = coords || {
    latitude: 52.3676,
    longitude: 4.9041,
    city: 'Amsterdam',
    country: 'Netherlands'
  };
  
  const hemisphere = getHemisphere(location.latitude);
  const allSeasons: ('winter' | 'spring' | 'summer' | 'autumn')[] = ['winter', 'spring', 'summer', 'autumn'];
  
  return allSeasons.flatMap(season => getSeasonalMonths(season, hemisphere));
}

// Get current season's months for highlighting
export function getCurrentSeasonMonths(coords?: LocationCoords): string[] {
  const now = new Date();
  const location = coords || {
    latitude: 52.3676,
    longitude: 4.9041,
    city: 'Amsterdam',
    country: 'Netherlands'
  };
  
  const hemisphere = getHemisphere(location.latitude);
  const currentSeason = getSeason(now, hemisphere);
  
  return getSeasonalMonths(currentSeason, hemisphere);
}

export function getSeasonalInfo(coords?: LocationCoords): SeasonalInfo {
  const now = new Date();
  
  // Default to Amsterdam coordinates if no location provided
  const defaultCoords: LocationCoords = {
    latitude: 52.3676,
    longitude: 4.9041,
    city: 'Amsterdam',
    country: 'Netherlands'
  };
  
  const location = coords || defaultCoords;
  const hemisphere = getHemisphere(location.latitude);
  const season = getSeason(now, hemisphere);
  const locationName = getLocationName(location);
  
  const seasonalData = SEASONAL_FOODS[season];
  
  return {
    season,
    location: locationName,
    hemisphere,
    seasonalFoods: [
      ...seasonalData.vegetables.slice(0, 4),
      ...seasonalData.fruits.slice(0, 3),
    ],
    nutritionalTips: seasonalData.characteristics,
    weekDescription: generateWeekDescription(season, locationName),
    colorAccent: getSeasonalColor(season)
  };
}

// API endpoint for getting seasonal information
export async function getSeasonalAdvice(coords?: LocationCoords): Promise<SeasonalInfo> {
  return getSeasonalInfo(coords);
}