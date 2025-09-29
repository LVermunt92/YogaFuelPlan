import { translateDutchToEnglish } from './recipe-translator';

export interface SeasonalInfo {
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

export interface LocationCoords {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

// Amsterdam month-specific locally grown vegetables calendar
export const AMSTERDAM_MONTHLY_PRODUCE = {
  0: { // January
    vegetables: ['spruitjes', 'boerenkool', 'prei', 'witte kool', 'rode kool', 'wortelen', 'pastinaak', 'winteruien', 'aardappelen (bewaard)'],
    localFocus: 'Wintergroenten uit opslag en koudebestendige bladgroenten',
    peak: ['spruitjes', 'boerenkool', 'bewaard wortelgewas']
  },
  1: { // February
    vegetables: ['spruitjes', 'boerenkool', 'prei', 'wortelen', 'pastinaak', 'knolrapen', 'aardappelen', 'winterkool'],
    localFocus: 'Piek van wintergroenten, laatste van bewaard oogst',
    peak: ['spruitjes', 'winterprei', 'bewaarde wortelen']
  },
  2: { // March
    vegetables: ['witte asperges (eind maart)', 'vroege sla', 'spinazie', 'broccoli', 'bloemkool', 'doperwten', 'prei', 'aardappelen (bewaard)'],
    localFocus: 'Vroege voorjaarsgroenten beginnen, witte asperges starten',
    peak: ['vroeg voorjaarsgroen', 'witte asperges beginnen', 'spinazie']
  },
  3: { // April
    vegetables: ['witte asperges', 'lente-uitjes', 'radijsjes', 'vroege sla', 'spinazie', 'verse kruiden (bieslook, peterselie)', 'aardappelen (bewaard)'],
    localFocus: 'Spring vegetables abundant, asparagus season',
    peak: ['white asparagus', 'spring onions', 'fresh herbs']
  },
  4: { // May
    vegetables: ['witte asperges', 'lente-uitjes', 'radijsjes', 'spinazie', 'snijbiet', 'verse kruiden', 'vroege doperwten', 'aardappelen (bewaard)'],
    localFocus: 'Peak spring produce, herb garden flourishing',
    peak: ['white asparagus peak', 'Swiss chard', 'fresh peas']
  },
  5: { // June
    vegetables: ['nieuwe aardappelen', 'paprika (kas)', 'komkommers (kas)', 'vroege tomaten (kas)', 'courgette', 'witte asperges (eind seizoen)'],
    localFocus: 'First summer vegetables from greenhouses, new potatoes',
    peak: ['new potatoes', 'greenhouse peppers', 'early tomatoes']
  },
  6: { // July
    vegetables: ['tomaten', 'komkommers', 'paprika', 'sperziebonen', 'mais', 'zomerpompoen', 'verse kruiden (basilicum, dille, munt)', 'nieuwe aardappelen'],
    localFocus: 'Peak summer greenhouse production',
    peak: ['tomatoes', 'cucumbers', 'sweet corn', 'fresh herbs']
  },
  7: { // August
    vegetables: ['tomaten', 'komkommers', 'paprika', 'sperziebonen', 'mais', 'zomerpompoen', 'aubergines (kas)', 'sla variëteiten'],
    localFocus: 'Abundant summer harvest from greenhouses and fields',
    peak: ['peak tomatoes', 'sweet corn', 'eggplants', 'summer lettuce']
  },
  8: { // September
    vegetables: ['andijvie', 'artisjok', 'aubergine', 'bleekselderij', 'bloemkool', 'broccoli', 'chinese kool', 'courgette', 'groene selderij', 'knolselderij', 'komkommer', 'koolrabi', 'kropsla', 'mais', 'paddenstoelen', 'paksoi', 'paprika', 'pompoen', 'prei', 'raapsteel', 'radijs', 'rammenas', 'rode biet', 'rodekool', 'savooikool', 'schorseneren', 'sperziebonen', 'snijbiet', 'snijboon', 'spinazie', 'spitskool', 'tomaat', 'ui', 'venkel', 'waterkers', 'witte kool', 'wortel'],
    localFocus: 'Rijke oogstmaand met overvloed aan Nederlandse seizoensgroenten - van late zomergroenten tot vroege herfstproducten',
    peak: ['tomaat', 'paprika', 'mais', 'pompoen']
  },
  9: { // October
    vegetables: ['andijvie', 'artisjok', 'aubergine', 'bleekselderij', 'bloemkool', 'boerenkool', 'broccoli', 'chinese kool', 'courgette', 'groene selderij', 'knolselderij', 'komkommer', 'koolrabi', 'kropsla', 'paddenstoelen', 'paksoi', 'paprika', 'pastinaak', 'pompoen', 'prei', 'raapsteel', 'radijs', 'rammenas', 'rode biet', 'rodekool', 'roodlof', 'savooikool', 'schorseneren', 'sperziebonen', 'snijbiet', 'snijboon', 'spinazie', 'spitskool', 'spruiten', 'tomaat', 'ui', 'veldsla', 'venkel', 'waterkers', 'winterpostelein', 'witlof', 'witte kool', 'wortel'],
    localFocus: 'Volledige herfstoogst met winterharde groenten die de koude maanden ingaan',
    peak: ['boerenkool', 'spruiten', 'pompoen', 'pastinaak']
  },
  10: { // November
    vegetables: ['pompoenen', 'winterpompoen', 'spruitjes', 'prei', 'kool', 'wortelen', 'rode bieten', 'paddenstoelen', 'knolselderij', 'aardappelen'],
    localFocus: 'Peak autumn harvest, winter storage vegetables',
    peak: ['winter squash', 'Brussels sprouts', 'celeriac', 'storage vegetables']
  },
  11: { // December
    vegetables: ['boerenkool', 'spruitjes', 'winterprei', 'bewaard wortelgroenten', 'aardappelen', 'winterkool', 'uien'],
    localFocus: 'Winter vegetables from storage, cold-hardy greens',
    peak: ['kale', 'Brussels sprouts', 'winter leeks', 'stored vegetables']
  }
};

// Enhanced seasonal food data for Netherlands/Northern Europe with local produce integration
const SEASONAL_FOODS = {
  winter: {
    vegetables: ['spruitjes', 'boerenkool', 'kool', 'wortelen', 'pastinaak', 'prei', 'aardappelen', 'uien', 'rode bieten'],
    fruits: ['appels', 'peren', 'citrusvruchten', 'kiwi', 'kaki'],
    proteins: ['stevige stoofpotten', 'wortelgroenten', 'verwarmende kruiden'],
    characteristics: ['verwarmend voedsel', 'immuunondersteuning', 'comfortvoedsel', 'vitamine D rijk voedsel'],
    localFocus: 'Cold-hardy vegetables and stored harvest from local farms'
  },
  spring: {
    vegetables: ['witte asperges', 'lente-uitjes', 'radijsjes', 'sla', 'spinazie', 'doperwten', 'verse kruiden'],
    fruits: ['aardbeien', 'rabarber', 'vroege bessen'],
    proteins: ['lichte eiwitten', 'verse kruiden', 'detox voedsel'],
    characteristics: ['detoxificerend voedsel', 'verse groenten', 'leverondersteuning', 'energie boost'],
    localFocus: 'Famous Dutch white asparagus and fresh spring greens'
  },
  summer: {
    vegetables: ['tomaten (kas)', 'courgette', 'paprika', 'komkommers', 'aubergine', 'mais', 'sperziebonen'],
    fruits: ['bessen', 'steenvruchten', 'meloenen', 'kersen', 'abrikozen'],
    proteins: ['verkoelende eiwitten', 'rauw voedsel', 'hydraterend voedsel'],
    characteristics: ['verkoelend voedsel', 'hydratatie', 'rauwe bereidingen', 'lichte maaltijden'],
    localFocus: 'Peak Dutch greenhouse production - tomatoes, peppers, cucumbers'
  },
  autumn: {
    vegetables: ['pompoenen', 'winterpompoen', 'zoete aardappelen', 'bloemkool', 'broccoli', 'paddenstoelen', 'spruitjes'],
    fruits: ['appels', 'peren', 'druiven', 'cranberries', 'granaatappels'],
    proteins: ['versterkend voedsel', 'verwarmende kruiden', 'immuunondersteuning'],
    characteristics: ['versterkend voedsel', 'immuunondersteuning', 'oogstsmaken', 'verwarmende bereidingen'],
    localFocus: 'Harvest season - pumpkins, squash, and autumn storage vegetables'
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
  const currentMonth = now.getMonth();
  
  // Determine season progression based on month rather than week of month
  let seasonIndex = 0;
  if (season === 'winter') {
    if (currentMonth === 11) seasonIndex = 0; // December - early winter
    else if (currentMonth === 0) seasonIndex = 1; // January - mid winter  
    else if (currentMonth === 1) seasonIndex = 2; // February - late winter
  } else if (season === 'spring') {
    if (currentMonth === 2) seasonIndex = 0; // March - early spring
    else if (currentMonth === 3) seasonIndex = 1; // April - mid spring
    else if (currentMonth === 4) seasonIndex = 2; // May - late spring
  } else if (season === 'summer') {
    if (currentMonth === 5) seasonIndex = 0; // June - early summer
    else if (currentMonth === 6) seasonIndex = 1; // July - mid summer
    else if (currentMonth === 7) seasonIndex = 2; // August - late summer
  } else if (season === 'autumn') {
    if (currentMonth === 8) seasonIndex = 0; // September - early autumn (transition)
    else if (currentMonth === 9) seasonIndex = 1; // October - mid autumn
    else if (currentMonth === 10) seasonIndex = 2; // November - late autumn
  }
  
  const descriptions = {
    winter: [
      `Deze winterweek focus op verwarmende, voedzame voedingsmiddelen die je immuunsysteem ondersteunen en comfort bieden tijdens koude dagen.`,
      `Midden winter vraagt om stevige, versterkende maaltijden rijk aan wortelgroenten en verwarmende kruiden voor volgehouden energie.`,
      `Eind winter is perfect voor immuunversterkende voedingsmiddelen en het voorbereiden van je lichaam op de komende lentevernieuwing.`,
      `Diep in de winter benadrukt gezellige, nutriëntrijke maaltijden die van binnenuit verwarmen en seizoensgebonden welzijn ondersteunen.`
    ],
    spring: [
      `Vroege lente brengt frisse energie - omarm detoxificerende groenten en lichtere maaltijden terwijl de natuur ontwaakt.`,
      `Midden lente biedt de eerste verse groenten - perfect voor het reinigen van winterse zwaarte met levendige smaken.`,
      `Late lente biedt overvloedige verse producten om energie te geven en je lichaam voor te bereiden op zomeractiviteiten.`,
      `Lentevernieuwing ondersteunt natuurlijke detox met verse kruiden, vroege groenten en revitaliserende voedingsstoffen.`
    ],
    summer: [
      `Vroege zomer vraagt om verkoelende, hydraterende voedingsmiddelen die langere dagen en buitenactiviteiten aanvullen.`,
      `Piekzomer biedt overvloedige verse vruchten en groenten - omarm rauwe, verkoelende bereidingen.`,
      `Midzomer benadrukt lichte, verfrissende maaltijden die energie geven zonder zwaar te zijn.`,
      `Hoge zomer is perfect voor hydraterende voedingsmiddelen en verkoelende bereidingen die de hitte natuurlijk verslaan.`
    ],
    autumn: [
      `Vroege herfst is een overgangsperiode waar zomerproducten zoals tomaten en paprika samenkomen met de eerste herfstgroenten zoals spruitjes en pompoen - geniet van deze unieke mix van beide seizoenen.`,
      `Midden herfst biedt seizoensgebonden pompoenen en wortelgroenten perfect voor verwarmende, voedzame maaltijden.`,
      `Late herfst vraagt om immuunondersteunende voedingsmiddelen en verwarmende kruiden terwijl de temperaturen dalen.`,
      `Diepe herfst benadrukt versterkende, verwarmende voedingsmiddelen die interne warmte opbouwen voor winterwelzijn.`
    ]
  };
  
  return descriptions[season][seasonIndex];
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

export function getSeasonalInfo(coords?: LocationCoords, language: string = 'nl'): SeasonalInfo {
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
  const currentMonth = now.getMonth();
  const monthlyData = AMSTERDAM_MONTHLY_PRODUCE[currentMonth];
  
  // Amsterdam local markets for seasonal produce
  const localMarkets = [
    'Noordermarkt (zaterdag) - Verse lokale groenten en biologische producten',
    'Boerenmarkt Nieuwmarkt (zaterdag) - Biologische lokale boeren',
    'Albert Cuyp Markt - Traditionele markt met seizoensgebonden Nederlandse producten',
    'Boerenmarkten in Vondelpark (zaterdag) - Lokale kwekers'
  ];
  
  // Translate vegetables to English if requested
  const translateArray = (arr: string[]) => {
    if (language === 'en') {
      return arr.map(item => translateDutchToEnglish(item));
    }
    return arr;
  };

  return {
    season,
    location: locationName,
    hemisphere,
    seasonalFoods: [
      ...translateArray(seasonalData.vegetables.slice(0, 4)),
      ...translateArray(seasonalData.fruits.slice(0, 3)),
    ],
    nutritionalTips: translateArray(seasonalData.characteristics),
    weekDescription: generateWeekDescription(season, locationName),
    colorAccent: getSeasonalColor(season),
    monthlyProduce: monthlyData ? {
      vegetables: translateArray(monthlyData.vegetables),
      localFocus: monthlyData.localFocus,
      peak: translateArray(monthlyData.peak)
    } : undefined,
    localMarkets: locationName.includes('Amsterdam') || locationName.includes('Netherlands') ? localMarkets : undefined
  };
}

// API endpoint for getting seasonal information
export async function getSeasonalAdvice(coords?: LocationCoords): Promise<SeasonalInfo> {
  return getSeasonalInfo(coords);
}