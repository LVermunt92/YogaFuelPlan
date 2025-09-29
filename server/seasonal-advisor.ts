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
    vegetables: ['brussels sprouts', 'cabbage', 'carrots', 'parsnips', 'leeks', 'potatoes', 'onions', 'beets'],
    fruits: ['apples', 'pears', 'citrus fruits', 'kiwi', 'persimmons'],
    proteins: ['hearty stews', 'root vegetables', 'warming spices'],
    characteristics: ['warming foods', 'immune support', 'comfort foods', 'vitamin D rich foods']
  },
  spring: {
    vegetables: ['asparagus', 'spring onions', 'radishes', 'lettuce', 'spinach', 'peas', 'artichokes'],
    fruits: ['strawberries', 'rhubarb', 'early berries'],
    proteins: ['lighter proteins', 'fresh herbs', 'detox foods'],
    characteristics: ['detoxifying foods', 'fresh greens', 'liver support', 'energy boost']
  },
  summer: {
    vegetables: ['tomatoes', 'zucchini', 'bell peppers', 'cucumbers', 'eggplant', 'corn', 'green beans'],
    fruits: ['berries', 'stone fruits', 'melons', 'cherries', 'apricots'],
    proteins: ['cooling proteins', 'raw foods', 'hydrating foods'],
    characteristics: ['cooling foods', 'hydration', 'raw preparations', 'light meals']
  },
  autumn: {
    vegetables: ['pumpkins', 'squash', 'sweet potatoes', 'cauliflower', 'broccoli', 'mushrooms'],
    fruits: ['apples', 'pears', 'grapes', 'cranberries', 'pomegranates'],
    proteins: ['grounding foods', 'warming spices', 'immune support'],
    characteristics: ['grounding foods', 'immune support', 'harvest flavors', 'warming preparations']
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
      `This winter week in ${location}, focus on warming, nourishing foods that support your immune system and provide comfort during cold days.`,
      `Mid-winter in ${location} calls for hearty, grounding meals rich in root vegetables and warming spices to sustain energy.`,
      `Late winter in ${location} is perfect for immune-boosting foods and preparing your body for the coming spring renewal.`,
      `Deep winter in ${location} emphasizes cozy, nutrient-dense meals that warm from within and support seasonal wellness.`
    ],
    spring: [
      `Early spring in ${location} brings fresh energy - embrace detoxifying greens and lighter meals as nature awakens.`,
      `Mid-spring in ${location} offers the first fresh vegetables - perfect for cleansing winter heaviness with vibrant flavors.`,
      `Late spring in ${location} provides abundant fresh produce to energize and prepare your body for summer activity.`,
      `Spring renewal in ${location} supports natural detox with fresh herbs, early vegetables, and revitalizing nutrients.`
    ],
    summer: [
      `Early summer in ${location} calls for cooling, hydrating foods that complement longer days and outdoor activities.`,
      `Peak summer in ${location} offers abundant fresh fruits and vegetables - embrace raw, cooling preparations.`,
      `Mid-summer in ${location} emphasizes light, refreshing meals that provide energy without weighing you down.`,
      `High summer in ${location} is perfect for hydrating foods and cooling preparations that beat the heat naturally.`
    ],
    autumn: [
      `Early autumn in ${location} brings harvest flavors - embrace grounding foods that prepare for winter ahead.`,
      `Mid-autumn in ${location} offers seasonal squashes and root vegetables perfect for warming, nourishing meals.`,
      `Late autumn in ${location} calls for immune-supporting foods and warming spices as temperatures drop.`,
      `Deep autumn in ${location} emphasizes grounding, warming foods that build internal heat for winter wellness.`
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
    autumn: '#dc2626'  // Red
  };
  
  return colors[season];
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