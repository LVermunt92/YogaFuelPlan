export const translations = {
  en: {
    // Navigation
    mealPlanner: "Meal Planner",
    profile: "Profile",
    
    // Meal Planner
    generateMealPlan: "Generate Meal Plan",
    activityLevel: "Activity Level",
    high: "High",
    low: "Low",
    weekStartDate: "Week Start Date",
    regenerateMealPlan: "Regenerate Meal Plan",
    viewRecipe: "View Recipe",
    shoppingList: "Shopping List",
    exportToNotion: "Export to Notion",
    syncStatus: "Sync Status",
    synced: "Synced",
    notSynced: "Not Synced",
    
    // Recipe Modal
    recipe: "Recipe",
    portion: "Portion",
    prepTime: "Prep Time",
    minutes: "minutes",
    ingredients: "Ingredients",
    instructions: "Instructions",
    tips: "Tips",
    notes: "Notes",
    nutritionalInfo: "Nutritional Information",
    protein: "Protein",
    calories: "Calories",
    carbs: "Carbs",
    fats: "Fats",
    fiber: "Fiber",
    sugar: "Sugar",
    sodium: "Sodium",
    cost: "Cost",
    proteinPerEuro: "Protein per Euro",
    
    // Shopping List
    totalItems: "Total Items",
    categories: "Categories",
    count: "Count",
    amount: "Amount",
    
    // Days
    monday: "Monday",
    tuesday: "Tuesday", 
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",
    
    // Meal Types
    breakfast: "Breakfast",
    lunch: "Lunch",
    dinner: "Dinner",
    
    // Leftovers
    currentLeftovers: "Current Leftovers",
    addLeftover: "Add Leftover",
    leftoverPlaceholder: "Enter leftover item...",
    removeLeftover: "Remove",
    
    // Language
    language: "Language",
    english: "English",
    dutch: "Dutch",
    
    // Messages
    mealPlanGenerated: "Meal plan generated successfully!",
    mealPlanRegenerated: "Meal plan regenerated successfully!",
    errorGenerating: "Error generating meal plan",
    errorSyncing: "Error syncing to Notion",
    syncedSuccessfully: "Synced to Notion successfully!",
    
    // Profile
    saveProfile: "Save Profile",
    profileUpdated: "Profile updated successfully!",
    errorUpdating: "Error updating profile",
  },
  
  nl: {
    // Navigation
    mealPlanner: "Maaltijdplanner",
    profile: "Profiel",
    
    // Meal Planner
    generateMealPlan: "Maaltijdplan Genereren",
    activityLevel: "Activiteitsniveau",
    high: "Hoog",
    low: "Laag",
    weekStartDate: "Week Startdatum",
    regenerateMealPlan: "Maaltijdplan Opnieuw Genereren",
    viewRecipe: "Recept Bekijken",
    shoppingList: "Boodschappenlijst",
    exportToNotion: "Exporteren naar Notion",
    syncStatus: "Synchronisatie Status",
    synced: "Gesynchroniseerd",
    notSynced: "Niet Gesynchroniseerd",
    
    // Recipe Modal
    recipe: "Recept",
    portion: "Portie",
    prepTime: "Bereidingstijd",
    minutes: "minuten",
    ingredients: "Ingrediënten",
    instructions: "Instructies",
    tips: "Tips",
    notes: "Opmerkingen",
    nutritionalInfo: "Voedingswaarde",
    protein: "Eiwit",
    calories: "Calorieën",
    carbs: "Koolhydraten",
    fats: "Vetten",
    fiber: "Vezels",
    sugar: "Suiker",
    sodium: "Natrium",
    cost: "Kosten",
    proteinPerEuro: "Eiwit per Euro",
    
    // Shopping List
    totalItems: "Totaal Items",
    categories: "Categorieën",
    count: "Aantal",
    amount: "Hoeveelheid",
    
    // Days
    monday: "Maandag",
    tuesday: "Dinsdag",
    wednesday: "Woensdag", 
    thursday: "Donderdag",
    friday: "Vrijdag",
    saturday: "Zaterdag",
    sunday: "Zondag",
    
    // Meal Types
    breakfast: "Ontbijt",
    lunch: "Lunch",
    dinner: "Diner",
    
    // Leftovers
    currentLeftovers: "Huidige Restjes",
    addLeftover: "Restje Toevoegen",
    leftoverPlaceholder: "Voer restje item in...",
    removeLeftover: "Verwijderen",
    
    // Language
    language: "Taal",
    english: "Engels",
    dutch: "Nederlands",
    
    // Messages
    mealPlanGenerated: "Maaltijdplan succesvol gegenereerd!",
    mealPlanRegenerated: "Maaltijdplan succesvol opnieuw gegenereerd!",
    errorGenerating: "Fout bij het genereren van maaltijdplan",
    errorSyncing: "Fout bij synchroniseren naar Notion",
    syncedSuccessfully: "Succesvol gesynchroniseerd naar Notion!",
    
    // Profile
    saveProfile: "Profiel Opslaan",
    profileUpdated: "Profiel succesvol bijgewerkt!",
    errorUpdating: "Fout bij het bijwerken van profiel",
  }
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;

export function useTranslations(language: Language) {
  return translations[language];
}