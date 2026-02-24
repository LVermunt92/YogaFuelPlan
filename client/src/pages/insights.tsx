import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, ResponsiveContainer } from "recharts";
import { ArrowLeft, Info } from "lucide-react";
import { Link } from "wouter";
import { useTranslations } from "@/lib/translations";
import { useLanguage } from "@/contexts/LanguageContext";
import { countUniquePlants, calculateVegetableGrams, calculateCocoaFlavanols } from "@/lib/plant-diversity";
import { getIngredientColors as getColorsFromConfig, kpiOrder } from "@/lib/kpi-config";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface MealPlan {
  id: number;
  meals: any[];
}

interface NutritionTargets {
  protein: number;
  fiber: number;
  calories: number;
}

interface KPIValue {
  value: number;
  percentage: number;
  target: number | null;
  colors?: string[];
}

interface KPIGroupDef {
  id: string;
  titleEn: string;
  titleNl: string;
  titleColor: string;
  dividerColor: string;
  kpis: string[];
}

const kpiGroups: KPIGroupDef[] = [
  {
    id: 'macros',
    titleEn: 'Macros & energy',
    titleNl: 'Macro\'s & energie',
    titleColor: 'text-blue-600',
    dividerColor: 'border-blue-200 dark:border-blue-700',
    kpis: ['protein', 'goodFats', 'fiber', 'netCarbs', 'calories'],
  },
  {
    id: 'foodQuality',
    titleEn: 'Food quality',
    titleNl: 'Voedselkwaliteit',
    titleColor: 'text-green-600',
    dividerColor: 'border-green-200 dark:border-green-700',
    kpis: ['vegetables', 'plantDiversity', 'rainbow', 'fermented', 'cocoaFlavanols'],
  },
  {
    id: 'vitamins',
    titleEn: 'Vitamins & minerals',
    titleNl: 'Vitamines & mineralen',
    titleColor: 'text-violet-600',
    dividerColor: 'border-violet-200 dark:border-violet-700',
    kpis: ['vitaminK', 'zinc', 'calcium', 'potassium', 'iron', 'vitaminC', 'omega3', 'polyphenols'],
  },
  {
    id: 'sugarLimits',
    titleEn: 'Sugar & limits',
    titleNl: 'Suiker & limieten',
    titleColor: 'text-amber-600',
    dividerColor: 'border-amber-200 dark:border-amber-700',
    kpis: ['addedSugar', 'freeSugar', 'intrinsicSugar', 'sodium'],
  },
];

const kpiMeta: Record<string, {
  fill: string;
  textColor: string;
  unit: string;
  labelEn: string;
  labelNl: string;
  dialogTitleEn: string;
  dialogTitleNl: string;
  dialogDescEn: string;
  dialogDescNl: string;
  extraNoteEn?: string;
  extraNoteNl?: string;
  isRainbow?: boolean;
  isInfoOnly?: boolean;
  isWarnable?: boolean;
  warnFill?: string;
  warnTextColor?: string;
}> = {
  // Macros group — blue family
  protein: {
    fill: "#2563eb", textColor: "text-blue-600", unit: "g",
    labelEn: "Protein", labelNl: "Eiwit",
    dialogTitleEn: "Why protein matters", dialogTitleNl: "Waarom eiwit belangrijk is",
    dialogDescEn: "", dialogDescNl: "",
  },
  goodFats: {
    fill: "#0284c7", textColor: "text-sky-600", unit: "g",
    labelEn: "Fats", labelNl: "Vetten",
    dialogTitleEn: "Why healthy fats matter", dialogTitleNl: "Waarom gezonde vetten belangrijk zijn",
    dialogDescEn: "", dialogDescNl: "",
  },
  fiber: {
    fill: "#38bdf8", textColor: "text-sky-400", unit: "g",
    labelEn: "Fiber", labelNl: "Vezels",
    dialogTitleEn: "Why fiber matters", dialogTitleNl: "Waarom vezels belangrijk zijn",
    dialogDescEn: "", dialogDescNl: "",
    extraNoteEn: "", extraNoteNl: "",
  },
  netCarbs: {
    fill: "#1d4ed8", textColor: "text-blue-700", unit: "g",
    labelEn: "Net carbs", labelNl: "Netto koolh.",
    dialogTitleEn: "About net carbs", dialogTitleNl: "Over netto koolhydraten",
    dialogDescEn: "Net carbs are the digestible carbs your body uses for energy (total carbs minus fiber). They're an important fuel source — reducing refined carbs can be beneficial, but completely avoiding carbs may limit essential nutrients.",
    dialogDescNl: "Netto koolhydraten zijn de verteerbare koolhydraten die je lichaam gebruikt voor energie (totale koolhydraten minus vezels). Ze zijn een belangrijke brandstofbron — het verminderen van geraffineerde koolhydraten kan gunstig zijn, maar koolhydraten volledig vermijden kan essentiële voedingsstoffen beperken.",
  },
  calories: {
    fill: "#3b82f6", textColor: "text-blue-500", unit: "",
    labelEn: "Calories", labelNl: "Calorieën",
    dialogTitleEn: "About calories", dialogTitleNl: "Over calorieën",
    dialogDescEn: "kcal reflect energy in food, not necessarily energy absorbed. Absorption varies with food type, processing, and macronutrients (e.g., whole nuts often yield fewer kcal than labels; protein has a higher digestion cost)",
    dialogDescNl: "kcal weerspiegelen energie in voedsel, niet noodzakelijkelijk geabsorbeerde energie. Absorptie varieert met voedseltype, verwerking en macronutriënten (bijv. hele noten leveren vaak minder kcal dan op het etiket staat; eiwit heeft hogere verteringskosten)",
  },
  // Food quality group — green family
  vegetables: {
    fill: "#16a34a", textColor: "text-green-600", unit: "g",
    labelEn: "Vegetables", labelNl: "Groenten",
    dialogTitleEn: "Why vegetables matter", dialogTitleNl: "Waarom groenten belangrijk zijn",
    dialogDescEn: "", dialogDescNl: "",
  },
  plantDiversity: {
    fill: "#15803d", textColor: "text-green-700", unit: "",
    labelEn: "Plant diversity", labelNl: "Plantdiversiteit",
    dialogTitleEn: "Why plant diversity matters", dialogTitleNl: "Waarom plantdiversiteit belangrijk is",
    dialogDescEn: "", dialogDescNl: "",
    extraNoteEn: "", extraNoteNl: "",
  },
  rainbow: {
    fill: "url(#rainbowGradient)", textColor: "bg-gradient-to-r from-red-500 via-green-500 to-purple-500 bg-clip-text text-transparent", unit: "",
    labelEn: "Rainbow", labelNl: "Regenboog",
    isRainbow: true,
    dialogTitleEn: "Why eating colorful foods matters", dialogTitleNl: "Waarom kleurrijk eten belangrijk is",
    dialogDescEn: "Different colors represent different nutrients. Aim for 6 color groups per week (red, orange, yellow, green, purple, white) for optimal health.",
    dialogDescNl: "Verschillende kleuren vertegenwoordigen verschillende voedingsstoffen. Streef naar 6 kleurgroepen per week (rood, oranje, geel, groen, paars, wit) voor optimale gezondheid.",
  },
  fermented: {
    fill: "#22c55e", textColor: "text-green-500", unit: "",
    labelEn: "Fermented", labelNl: "Gefermenteerd",
    dialogTitleEn: "Fermented foods for gut health", dialogTitleNl: "Gefermenteerde voedingsmiddelen voor darmgezondheid",
    dialogDescEn: "Fermented foods contain probiotics that support gut health. Aim for 1 fermented food per day. Examples: yogurt, kefir, kimchi, sauerkraut, miso, tempeh.",
    dialogDescNl: "Gefermenteerde voedingsmiddelen bevatten probiotica die de darmgezondheid ondersteunen. Streef naar 1 gefermenteerd voedingsmiddel per dag. Voorbeelden: yoghurt, kefir, kimchi, zuurkool, miso, tempeh.",
  },
  cocoaFlavanols: {
    fill: "#166534", textColor: "text-green-800", unit: "mg",
    labelEn: "Cocoa flavanols", labelNl: "Cacao flavanolen",
    dialogTitleEn: "Why cocoa flavanols matter", dialogTitleNl: "Waarom cacao flavanolen belangrijk zijn",
    dialogDescEn: "", dialogDescNl: "",
  },
  // Vitamins & minerals group — violet/purple family
  vitaminK: {
    fill: "#7c3aed", textColor: "text-violet-600", unit: "mcg",
    labelEn: "Vitamin K", labelNl: "Vitamine K",
    dialogTitleEn: "Vitamin K for health", dialogTitleNl: "Vitamine K voor gezondheid",
    dialogDescEn: "Vitamin K is essential for blood clotting and bone health. The recommended daily intake is 90 mcg for women and 120 mcg for men. Best sources: leafy greens, broccoli, Brussels sprouts.",
    dialogDescNl: "Vitamine K is essentieel voor bloedstolling en botgezondheid. De aanbevolen dagelijkse inname is 90 mcg voor vrouwen en 120 mcg voor mannen. Beste bronnen: groene bladgroenten, broccoli, spruitjes.",
  },
  zinc: {
    fill: "#8b5cf6", textColor: "text-violet-500", unit: "mg",
    labelEn: "Zinc", labelNl: "Zink",
    dialogTitleEn: "Zinc for health", dialogTitleNl: "Zink voor gezondheid",
    dialogDescEn: "Zinc is essential for immune function, wound healing, and protein synthesis. The recommended daily intake is 8 mg for women and 11 mg for men. Best sources: meat, shellfish, legumes, seeds.",
    dialogDescNl: "Zink is essentieel voor immuunfunctie, wondgenezing en eiwitopbouw. De aanbevolen dagelijkse inname is 8 mg voor vrouwen en 11 mg voor mannen. Beste bronnen: vlees, schaaldieren, peulvruchten, zaden.",
  },
  calcium: {
    fill: "#6d28d9", textColor: "text-violet-700", unit: "mg",
    labelEn: "Calcium", labelNl: "Calcium",
    dialogTitleEn: "Calcium for health", dialogTitleNl: "Calcium voor gezondheid",
    dialogDescEn: "Calcium is essential for strong bones and teeth, muscle function, and nerve signaling. The recommended daily intake is 1000mg for adults. Best sources: dairy, leafy greens, fortified foods, almonds.",
    dialogDescNl: "Calcium is essentieel voor sterke botten en tanden, spierfunctie en zenuwsignalering. De aanbevolen dagelijkse inname is 1000mg voor volwassenen. Beste bronnen: zuivel, bladgroenten, verrijkte voedingsmiddelen, amandelen.",
  },
  potassium: {
    fill: "#a855f7", textColor: "text-purple-500", unit: "mg",
    labelEn: "Potassium", labelNl: "Kalium",
    dialogTitleEn: "Potassium for health", dialogTitleNl: "Kalium voor gezondheid",
    dialogDescEn: "Potassium is essential for heart function, muscle contraction, and blood pressure regulation. The recommended intake is 3400mg for men and 2600mg for women. Best sources: bananas, potatoes, spinach, beans.",
    dialogDescNl: "Kalium is essentieel voor hartfunctie, spiersamentrekking en bloeddrukregulatie. De aanbevolen inname is 3400mg voor mannen en 2600mg voor vrouwen. Beste bronnen: bananen, aardappelen, spinazie, bonen.",
  },
  iron: {
    fill: "#9333ea", textColor: "text-purple-600", unit: "mg",
    labelEn: "Iron", labelNl: "IJzer",
    dialogTitleEn: "Iron for health", dialogTitleNl: "IJzer voor gezondheid",
    dialogDescEn: "Iron is essential for oxygen transport in the blood and energy production. The recommended intake is 8mg for men and 18mg for women (higher due to menstruation). Best sources: legumes, spinach, tofu, fortified cereals.",
    dialogDescNl: "IJzer is essentieel voor zuurstoftransport in het bloed en energieproductie. De aanbevolen inname is 8mg voor mannen en 18mg voor vrouwen (hoger vanwege menstruatie). Beste bronnen: peulvruchten, spinazie, tofu, verrijkte granen.",
  },
  vitaminC: {
    fill: "#c026d3", textColor: "text-fuchsia-600", unit: "mg",
    labelEn: "Vitamin C", labelNl: "Vitamine C",
    dialogTitleEn: "Vitamin C for health", dialogTitleNl: "Vitamine C voor gezondheid",
    dialogDescEn: "Vitamin C is essential for immune function, collagen production, and iron absorption. The recommended intake is 90mg for men and 75mg for women. Best sources: citrus fruits, bell peppers, broccoli, strawberries.",
    dialogDescNl: "Vitamine C is essentieel voor immuunfunctie, collageenproductie en ijzeropname. De aanbevolen inname is 90mg voor mannen en 75mg voor vrouwen. Beste bronnen: citrusvruchten, paprika, broccoli, aardbeien.",
  },
  omega3: {
    fill: "#4f46e5", textColor: "text-indigo-600", unit: "mg",
    labelEn: "Omega-3", labelNl: "Omega-3",
    dialogTitleEn: "Omega-3 for health", dialogTitleNl: "Omega-3 voor gezondheid",
    dialogDescEn: "Omega-3 fatty acids are essential for heart and brain health, reducing inflammation, and hormonal balance. The recommended intake is 1600mg for men and 1100mg for women. Best sources: chia seeds, flaxseed, walnuts, hemp seeds.",
    dialogDescNl: "Omega-3 vetzuren zijn essentieel voor hart- en hersengezondheid, ontstekingsremming en hormonale balans. De aanbevolen inname is 1600mg voor mannen en 1100mg voor vrouwen. Beste bronnen: chiazaad, lijnzaad, walnoten, hennepzaad.",
  },
  polyphenols: {
    fill: "#5b21b6", textColor: "text-violet-800", unit: "mg",
    labelEn: "Polyphenols", labelNl: "Polyfenolen",
    dialogTitleEn: "Polyphenols for health", dialogTitleNl: "Polyfenolen voor gezondheid",
    dialogDescEn: "Polyphenols are powerful antioxidants that reduce inflammation, support heart and brain health, and combat aging. Recommended intake: 500-1500mg daily. Best sources: berries, cocoa, olive oil, green tea, spices, leafy greens.",
    dialogDescNl: "Polyfenolen zijn krachtige antioxidanten die ontstekingen verminderen, hart- en hersengezondheid ondersteunen, en veroudering tegengaan. Aanbevolen inname: 500-1500mg per dag. Beste bronnen: bessen, cacao, olijfolie, groene thee, kruiden, bladgroenten.",
  },
  // Sugar & limits group — amber/rose family
  addedSugar: {
    fill: "#f59e0b", textColor: "text-amber-500", unit: "g",
    labelEn: "Added sugar", labelNl: "Toegevoegde suiker",
    isWarnable: true, warnFill: "#ef4444", warnTextColor: "text-red-500",
    dialogTitleEn: "Added sugar", dialogTitleNl: "Toegevoegde suiker",
    dialogDescEn: "The American Heart Association recommends a maximum of 25g added sugar per day for women and 36g for men. Added sugars come from sweeteners, not whole foods like fruit.",
    dialogDescNl: "De American Heart Association beveelt maximaal 25g toegevoegde suiker per dag aan voor vrouwen en 36g voor mannen. Toegevoegde suikers komen van zoetstoffen, niet van volle voedingsmiddelen zoals fruit.",
  },
  freeSugar: {
    fill: "#fb923c", textColor: "text-orange-400", unit: "g",
    labelEn: "Free sugar", labelNl: "Vrije suiker",
    isInfoOnly: true,
    dialogTitleEn: "Free sugar", dialogTitleNl: "Vrije suiker",
    dialogDescEn: "Free sugars are sugars no longer bound in cell structures. This includes fruit juices, smoothies, dried fruits, and purees. WHO advises to be mindful of these.",
    dialogDescNl: "Vrije suikers zijn suikers die niet meer gebonden zijn in celstructuren. Dit omvat vruchtensappen, smoothies, gedroogd fruit en purees. WHO adviseert hier voorzichtig mee te zijn.",
    extraNoteEn: "Informational - be mindful", extraNoteNl: "Informatief - wees voorzichtig",
  },
  intrinsicSugar: {
    fill: "#fbbf24", textColor: "text-amber-400", unit: "g",
    labelEn: "Intrinsic sugar", labelNl: "Gebonden suiker",
    isInfoOnly: true,
    dialogTitleEn: "Intrinsic sugar", dialogTitleNl: "Gebonden suiker",
    dialogDescEn: "Intrinsic sugars are still bound within the cell structure of whole foods like fresh fruits, vegetables, and dairy. They are absorbed more slowly and provide health benefits. Typically not a main limit; for energy or glucose stability, total carbs and fiber are often more informative.",
    dialogDescNl: "Gebonden suikers zitten nog vast in de celstructuur van volle voedingsmiddelen zoals vers fruit, groenten en zuivel. Ze worden langzamer opgenomen en bieden gezondheidsvoordelen. Meestal geen strikte limiet; voor energie of glucosestabiliteit zijn totale koolhydraten en vezels vaak informatiever.",
    extraNoteEn: "Healthy - no strict limit", extraNoteNl: "Gezond - geen strikte limiet",
  },
  sodium: {
    fill: "#d97706", textColor: "text-amber-600", unit: "mg",
    labelEn: "Sodium", labelNl: "Natrium",
    isWarnable: true, warnFill: "#ef4444", warnTextColor: "text-red-500",
    dialogTitleEn: "Sodium for health", dialogTitleNl: "Natrium voor gezondheid",
    dialogDescEn: "Sodium is needed for fluid balance and nerve function, but too much raises blood pressure. The recommended max is 2300mg per day. Note: most sodium comes from processed foods.",
    dialogDescNl: "Natrium is nodig voor vochtbalans en zenuwfunctie, maar te veel verhoogt de bloeddruk. De aanbevolen max is 2300mg per dag. Let op: de meeste natrium komt uit bewerkte voedingsmiddelen.",
  },
};

function KPIChart({ id, data, language, t }: { id: string; data: KPIValue; language: string; t: any }) {
  const meta = kpiMeta[id];
  if (!meta) return null;

  const isOver = data.percentage > 100;
  const useWarn = meta.isWarnable && isOver;
  const fillColor = useWarn ? meta.warnFill! : meta.fill;
  const currentTextColor = useWarn ? meta.warnTextColor! : meta.textColor;

  const displayValue = meta.isRainbow
    ? `${data.value}/${data.target}`
    : `${data.value}${meta.unit}`;

  const percentageDisplay = meta.isInfoOnly
    ? (language === "nl" ? "Info" : "Info")
    : `${data.percentage}%`;

  const chartData = meta.isInfoOnly
    ? [{ value: 100, fill: fillColor }]
    : [
        { value: Math.min(data.percentage, 100), fill: fillColor },
        { value: Math.max(100 - data.percentage, 0), fill: "#f3f4f6" },
      ];

  const dialogTitle = language === "nl" ? meta.dialogTitleNl : meta.dialogTitleEn;

  let dialogDesc = language === "nl" ? meta.dialogDescNl : meta.dialogDescEn;
  if (!dialogDesc) {
    const tKey = id === 'goodFats' ? 'fatsTooltip' : `${id}Tooltip`;
    dialogDesc = (t as any)[tKey] || '';
  }
  const dialogTitleFromT = (() => {
    if (dialogDesc === '') {
      const titleKey = id === 'protein' ? 'whyProteinMatters'
        : id === 'goodFats' ? 'whyHealthyFatsMatters'
        : id === 'fiber' ? 'whyFiberMatters'
        : id === 'vegetables' ? 'whyVegetablesMatters'
        : id === 'plantDiversity' ? 'whyPlantDiversityMatters'
        : id === 'cocoaFlavanols' ? 'whyCocoaFlavanolsMatters'
        : null;
      if (titleKey) return (t as any)[titleKey] || dialogTitle;
    }
    return dialogTitle;
  })();

  const extraNote = meta.extraNoteEn
    ? (language === "nl" ? meta.extraNoteNl : meta.extraNoteEn)
    : null;

  const fiberWarning = id === 'fiber' ? (t as any).fiberWarning : null;
  const plantDiversityTarget = id === 'plantDiversity' ? (t as any).plantDiversityTarget : null;

  const targetNote = (meta.isWarnable && data.target !== null) ? (
    language === "nl"
      ? `Doel: max ${data.target}${meta.unit} per dag`
      : `Target: max ${data.target}${meta.unit} per day`
  ) : null;

  const rainbowColorsNote = (meta.isRainbow && data.colors) ? (
    language === "nl"
      ? `Je hebt ${data.value} van ${data.target} kleuren bereikt: ${data.colors.join(', ')}`
      : `You've achieved ${data.value} of ${data.target} colors: ${data.colors.join(', ')}`
  ) : null;

  return (
    <div className="text-center relative">
      <div className="relative w-14 h-14 mx-auto">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={14}
              outerRadius={24}
              startAngle={90}
              endAngle={450}
              dataKey="value"
            />
            {meta.isRainbow && (
              <defs>
                <linearGradient id="rainbowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="20%" stopColor="#f97316" />
                  <stop offset="40%" stopColor="#eab308" />
                  <stop offset="60%" stopColor="#22c55e" />
                  <stop offset="80%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            )}
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`text-xs font-bold ${currentTextColor}`}>{displayValue}</div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-0.5">
        <h3 className={`text-[10px] font-semibold ${currentTextColor}`}>
          {language === "nl" ? meta.labelNl : meta.labelEn}
        </h3>
        <Dialog>
          <DialogTrigger asChild>
            <button className="text-gray-600/60 hover:text-gray-600" data-testid={`info-${id}`}>
              <Info className="h-2.5 w-2.5" />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{dialogTitleFromT}</DialogTitle>
              <DialogDescription className="text-sm pt-2">
                {dialogDesc}
                {fiberWarning && (
                  <p className="text-xs text-amber-600 font-medium mt-2">{fiberWarning}</p>
                )}
                {plantDiversityTarget && (
                  <p className="text-xs text-green-600 font-medium mt-2">{plantDiversityTarget}</p>
                )}
                {rainbowColorsNote && (
                  <p className="text-xs text-gray-600 font-medium mt-2">{rainbowColorsNote}</p>
                )}
                {targetNote && (
                  <p className={`text-xs font-medium mt-2 ${useWarn ? 'text-red-500' : 'text-gray-500'}`}>
                    {targetNote}
                  </p>
                )}
                {extraNote && (
                  <p className={`text-xs font-medium mt-2 ${meta.textColor.replace('text-', 'text-')}`}>
                    {extraNote}
                  </p>
                )}
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
      <p className="text-[10px] text-gray-500">{percentageDisplay}</p>
    </div>
  );
}

export default function Insights() {
  const { language } = useLanguage();
  const t = useTranslations(language);

  const [selectedMealPlanId, setSelectedMealPlanId] = useState<number | null>(() => {
    const stored = localStorage.getItem('selectedMealPlan');
    return stored ? parseInt(stored) : null;
  });

  const { data: currentMealPlan } = useQuery<MealPlan>({
    queryKey: [`/api/meal-plans/${selectedMealPlanId}`],
    enabled: !!selectedMealPlanId,
  });

  const { data: userProfile } = useQuery<{ 
    gender?: string; 
    mealsPerDay?: number;
  }>({
    queryKey: ["/api/user/profile"],
  });

  const { data: nutritionTargets } = useQuery<NutritionTargets>({
    queryKey: ["/api/nutrition/targets"],
  });

  const getIngredientColors = getColorsFromConfig;

  const calculateKPIs = (): Record<string, KPIValue> | null => {
    if (!currentMealPlan?.meals) return null;

    const totalProtein = currentMealPlan.meals.reduce((sum, meal) => sum + (meal.protein || 0), 0);
    const totalCalories = currentMealPlan.meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    const totalFats = currentMealPlan.meals.reduce((sum, meal) => sum + (meal.fats || 0), 0);
    const totalCarbs = currentMealPlan.meals.reduce((sum, meal) => sum + (meal.carbohydrates || 0), 0);
    const totalFiber = currentMealPlan.meals.reduce((sum, meal) => sum + (meal.fiber || 0), 0);
    const totalVitaminK = currentMealPlan.meals.reduce((sum, meal) => sum + ((meal as any).vitaminK || 0), 0);
    const totalZinc = currentMealPlan.meals.reduce((sum, meal) => sum + ((meal as any).zinc || 0), 0);
    const totalCalcium = currentMealPlan.meals.reduce((sum, meal) => sum + ((meal as any).calcium || 0), 0);
    const totalSugar = currentMealPlan.meals.reduce((sum, meal) => sum + ((meal as any).sugar || 0), 0);
    const totalAddedSugar = currentMealPlan.meals.reduce((sum, meal) => sum + ((meal as any).addedSugar || 0), 0);
    const totalFreeSugar = currentMealPlan.meals.reduce((sum, meal) => sum + ((meal as any).freeSugar || 0), 0);
    const totalIntrinsicSugar = currentMealPlan.meals.reduce((sum, meal) => sum + ((meal as any).intrinsicSugar || 0), 0);
    const totalVitaminC = currentMealPlan.meals.reduce((sum, meal) => sum + ((meal as any).vitaminC || 0), 0);
    const totalSodium = currentMealPlan.meals.reduce((sum, meal) => sum + ((meal as any).sodium || 0), 0);
    const totalPotassium = currentMealPlan.meals.reduce((sum, meal) => sum + ((meal as any).potassium || 0), 0);
    const totalIron = currentMealPlan.meals.reduce((sum, meal) => sum + ((meal as any).iron || 0), 0);
    const totalOmega3 = currentMealPlan.meals.reduce((sum, meal) => sum + ((meal as any).omega3 || 0), 0);
    const totalPolyphenols = currentMealPlan.meals.reduce((sum, meal) => sum + ((meal as any).polyphenols || 0), 0);

    const allColors = new Set<string>();
    currentMealPlan.meals.forEach(meal => {
      if (meal.ingredients && Array.isArray(meal.ingredients)) {
        const mealColors = getIngredientColors(meal.ingredients);
        mealColors.forEach(color => allColors.add(color));
      }
    });
    const totalColorGroups = 6;
    const achievedColors = allColors.size;
    const rainbowScore = Math.round((achievedColors / totalColorGroups) * 100);

    const fermentedMealsCount = currentMealPlan.meals.filter(meal => {
      const tags = (meal as any).recipeTags;
      return tags && Array.isArray(tags) && tags.includes('Fermented');
    }).length;
    const fermentedTarget = 7;

    const totalMeals = currentMealPlan.meals.length;
    const avg = (total: number) => totalMeals > 0 ? (total / totalMeals) * 3 : 0;

    const avgProteinPerDay = avg(totalProtein);
    const avgCaloriesPerDay = avg(totalCalories);
    const avgFatsPerDay = avg(totalFats);
    const avgCarbsPerDay = avg(totalCarbs);
    const avgFiberPerDay = avg(totalFiber);
    const avgVitaminKPerDay = avg(totalVitaminK);
    const avgZincPerDay = avg(totalZinc);
    const avgCalciumPerDay = avg(totalCalcium);
    const avgSugarPerDay = avg(totalSugar);
    const avgAddedSugarPerDay = avg(totalAddedSugar);
    const avgFreeSugarPerDay = avg(totalFreeSugar);
    const avgIntrinsicSugarPerDay = avg(totalIntrinsicSugar);
    const avgVitaminCPerDay = avg(totalVitaminC);
    const avgSodiumPerDay = avg(totalSodium);
    const avgPotassiumPerDay = avg(totalPotassium);
    const avgIronPerDay = avg(totalIron);
    const avgOmega3PerDay = avg(totalOmega3);
    const avgPolyphenolsPerDay = avg(totalPolyphenols);

    const avgNetCarbsPerDay = avgCarbsPerDay - avgFiberPerDay;

    const allMealIngredients: string[] = [];
    currentMealPlan.meals.forEach(meal => {
      if (meal.ingredients && Array.isArray(meal.ingredients)) {
        allMealIngredients.push(...meal.ingredients);
      }
    });

    const totalVegetableGrams = calculateVegetableGrams(allMealIngredients);
    const avgVegetablesPerDay = Math.round(totalVegetableGrams / 7);

    const fatCalories = avgFatsPerDay * 9;
    const fatPercentage = avgCaloriesPerDay > 0 ? (fatCalories / avgCaloriesPerDay) * 100 : 25;

    const fiberTarget = nutritionTargets?.fiber || 30;
    const totalCocoaFlavanols = calculateCocoaFlavanols(allMealIngredients);
    const avgCocoaFlavanolsPerDay = Math.round(totalCocoaFlavanols / 7);
    const cocoaFlavanolsTarget = 500;
    const plantDiversityResult = countUniquePlants(allMealIngredients);
    const plantDiversityCount = plantDiversityResult.count;
    const plantDiversityTarget = 30;
    const vitaminKTarget = userProfile?.gender === 'male' ? 120 : 90;
    const zincTarget = userProfile?.gender === 'male' ? 11 : 8;
    const calciumTarget = 1000;
    const sugarTarget = userProfile?.gender === 'male' ? 36 : 25;
    const vitaminCTarget = userProfile?.gender === 'male' ? 90 : 75;
    const sodiumTarget = 2300;
    const potassiumTarget = userProfile?.gender === 'male' ? 3400 : 2600;
    const ironTarget = userProfile?.gender === 'male' ? 8 : 18;
    const omega3Target = userProfile?.gender === 'male' ? 1600 : 1100;
    const polyphenolsTarget = 800;
    const proteinTarget = nutritionTargets?.protein || 95;
    const caloriesTarget = nutritionTargets?.calories || 2000;
    const netCarbsTarget = 160;

    return {
      protein: {
        value: Math.round(avgProteinPerDay),
        percentage: Math.round((avgProteinPerDay / proteinTarget) * 100),
        target: proteinTarget
      },
      goodFats: {
        value: Math.round(avgFatsPerDay),
        percentage: Math.round(Math.min(fatPercentage, 100)),
        target: 30
      },
      fiber: {
        value: Math.round(avgFiberPerDay),
        percentage: Math.round((avgFiberPerDay / fiberTarget) * 100),
        target: fiberTarget
      },
      vegetables: {
        value: Math.round(avgVegetablesPerDay),
        percentage: Math.round((avgVegetablesPerDay / 400) * 100),
        target: 400
      },
      plantDiversity: {
        value: plantDiversityCount,
        percentage: Math.round((plantDiversityCount / plantDiversityTarget) * 100),
        target: plantDiversityTarget
      },
      cocoaFlavanols: {
        value: Math.round(avgCocoaFlavanolsPerDay),
        percentage: Math.round((avgCocoaFlavanolsPerDay / cocoaFlavanolsTarget) * 100),
        target: cocoaFlavanolsTarget
      },
      netCarbs: {
        value: Math.round(avgNetCarbsPerDay),
        percentage: Math.round((avgNetCarbsPerDay / netCarbsTarget) * 100),
        target: netCarbsTarget
      },
      calories: {
        value: Math.round(avgCaloriesPerDay),
        percentage: Math.round((avgCaloriesPerDay / caloriesTarget) * 100),
        target: caloriesTarget
      },
      rainbow: {
        value: achievedColors,
        percentage: rainbowScore,
        target: totalColorGroups,
        colors: Array.from(allColors)
      },
      fermented: {
        value: fermentedMealsCount,
        percentage: Math.round((fermentedMealsCount / fermentedTarget) * 100),
        target: fermentedTarget
      },
      vitaminK: {
        value: Math.round(avgVitaminKPerDay),
        percentage: Math.round((avgVitaminKPerDay / vitaminKTarget) * 100),
        target: vitaminKTarget
      },
      zinc: {
        value: Math.round(avgZincPerDay * 10) / 10,
        percentage: Math.round((avgZincPerDay / zincTarget) * 100),
        target: zincTarget
      },
      calcium: {
        value: Math.round(avgCalciumPerDay),
        percentage: Math.round((avgCalciumPerDay / calciumTarget) * 100),
        target: calciumTarget
      },
      sugar: {
        value: Math.round(avgSugarPerDay),
        percentage: Math.round((avgSugarPerDay / sugarTarget) * 100),
        target: sugarTarget
      },
      addedSugar: {
        value: Math.round(avgAddedSugarPerDay),
        percentage: Math.round((avgAddedSugarPerDay / sugarTarget) * 100),
        target: sugarTarget
      },
      freeSugar: {
        value: Math.round(avgFreeSugarPerDay),
        percentage: 100,
        target: null
      },
      intrinsicSugar: {
        value: Math.round(avgIntrinsicSugarPerDay),
        percentage: 100,
        target: null
      },
      vitaminC: {
        value: Math.round(avgVitaminCPerDay),
        percentage: Math.round((avgVitaminCPerDay / vitaminCTarget) * 100),
        target: vitaminCTarget
      },
      sodium: {
        value: Math.round(avgSodiumPerDay),
        percentage: Math.round((avgSodiumPerDay / sodiumTarget) * 100),
        target: sodiumTarget
      },
      potassium: {
        value: Math.round(avgPotassiumPerDay),
        percentage: Math.round((avgPotassiumPerDay / potassiumTarget) * 100),
        target: potassiumTarget
      },
      iron: {
        value: Math.round(avgIronPerDay * 10) / 10,
        percentage: Math.round((avgIronPerDay / ironTarget) * 100),
        target: ironTarget
      },
      omega3: {
        value: Math.round(avgOmega3PerDay),
        percentage: Math.round((avgOmega3PerDay / omega3Target) * 100),
        target: omega3Target
      },
      polyphenols: {
        value: Math.round(avgPolyphenolsPerDay),
        percentage: Math.round((avgPolyphenolsPerDay / polyphenolsTarget) * 100),
        target: polyphenolsTarget
      }
    };
  };

  const kpiData = calculateKPIs();

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-6 lg:py-8">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {language === "nl" ? "Terug naar maaltijdplanner" : "Back to meal planner"}
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {language === "nl" ? "Voedingsinzichten" : "Nutrition insights"}
          </h1>
          <p className="text-lg text-gray-600">
            {language === "nl" 
              ? "Gedetailleerd overzicht van je voedingsdoelen en voortgang" 
              : "Detailed overview of your nutrition goals and progress"}
          </p>
        </div>

        {kpiData && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500 italic text-center" data-testid="kpi-daily-average-label">
              {t.kpiDailyAverageLabel}
            </p>

            {kpiGroups.map(group => (
              <div key={group.id} className="pt-1">
                <div className={`flex items-center gap-2 mb-3 pb-1 border-b ${group.dividerColor}`}>
                  <h2 className={`text-xs font-semibold uppercase tracking-wide ${group.titleColor}`}>
                    {language === "nl" ? group.titleNl : group.titleEn}
                  </h2>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {group.kpis.map(kpiId => {
                    const data = kpiData[kpiId];
                    if (!data) return null;
                    return <KPIChart key={kpiId} id={kpiId} data={data} language={language} t={t} />;
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {!kpiData && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {language === "nl" 
                ? "Genereer een maaltijdplan om je voedingsinzichten te zien" 
                : "Generate a meal plan to see your nutrition insights"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
