// Recipe Translation Service for Multiple Language Support
// Includes automated monthly translation stream using OpenAI and existing Dutch translation system
import OpenAI from "openai";
import cron from "node-cron";
import { getCompleteEnhancedMealDatabase } from "./nutrition-enhanced";
import { processRecipeIngredients, convertIngredientUnits } from './unit-converter';

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Automated Translation System Types
export interface AutoTranslationRequest {
  recipeId: string;
  recipeName: string;
  ingredients: string[];
  instructions: string[];
  tips?: string[];
  targetLanguage: string;
  targetLanguageCode: string;
}

export interface AutoTranslatedRecipe {
  originalId: string;
  translatedName: string;
  translatedIngredients: string[];
  translatedInstructions: string[];
  translatedTips?: string[];
  language: string;
  languageCode: string;
  translatedAt: Date;
}

// Supported languages for automated translation
const AUTOMATED_LANGUAGES = {
  'es': 'Spanish',
  'fr': 'French', 
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'ja': 'Japanese',
  'ko': 'Korean',
  'zh': 'Chinese (Simplified)',
  'ar': 'Arabic',
  'hi': 'Hindi'
} as const;

// Reverse translation map (Dutch -> English) for ingredient matching
let dutchToEnglishMap: Record<string, string> | null = null;

export interface TranslatedRecipe {
  name: string;
  ingredients: string[];
  instructions: string[];
  tips?: string[];
  notes?: string[];
}

// Common ingredient translations (English -> Dutch)
const ingredientTranslations: Record<string, string> = {
  // Proteins
  'chicken': 'kip',
  'chicken breast': 'kipfilet',
  'chicken thigh': 'kippendij',
  'beef': 'rundvlees',
  'pork': 'varkensvlees',
  'salmon': 'zalm',
  'tuna': 'tonijn',
  'cod': 'kabeljauw',
  'eggs': 'eieren',
  'egg': 'ei',
  'vegan egg substitute (flax eggs or aquafaba)': 'veganistisch ei-alternatief (lijnzaad-eieren of aquafaba)',
  'tofu': 'tofu',
  'tempeh': 'tempeh',
  'fermented': 'gefermenteerd',
  'lentils': 'linzen',
  'chickpeas': 'kikkererwten',
  'chickpea curry': 'kikkererwtencurry',
  'herb-infused chicken lasagna with avocado oil drizzle': 'kruiden-kip lasagne met avocado-olie drizzle',
  'chicken and basil pesto lasagna with creamy cottage cheese sauce': 'kip en basilicum pesto lasagne met romige hüttenkäse saus',
  'pasta with roasted zucchini cream and burrata topping': 'pasta met geroosterde courgette crème en burrata topping',
  'beans': 'bonen',
  'black beans': 'zwarte bonen',
  'kidney beans': 'kidneybonen',
  'white beans': 'witte bonen',
  'quinoa': 'quinoa',
  
  // Dairy & Alternatives
  'milk': 'melk',
  'almond milk': 'amandelmelk',
  'almond butter': 'amandelpasta',
  'oat milk': 'havermelk',
  'coconut milk': 'kokosmelk',
  'yogurt': 'yoghurt',
  'greek yogurt': 'griekse yoghurt',
  'cheese': 'kaas',
  'cottage cheese': 'hüttenkäse',
  'feta cheese': 'fetakaas',
  'parmesan': 'parmezaanse kaas',
  'butter': 'boter',
  'cream': 'room',
  
  // Grains & Carbs
  'rice': 'rijst',
  'brown rice': 'bruine rijst',
  'basmati rice': 'basmatirijst',
  'pasta': 'pasta',
  'bread': 'brood',
  'oats': 'haver',
  'rolled oats': 'havervlokken',
  'steel-cut oats': 'havergrutten',
  'flour': 'meel',
  'whole wheat flour': 'volkoren meel',
  'coconut flour': 'kokosmeel',
  'almond flour': 'amandelmeel',
  'gram flour': 'kikkererwtenmeel',
  'chickpea flour': 'kikkererwtenmeel',
  'gluten-free flour': 'glutenvrij meel',
  'baking powder': 'bakpoeder',
  'cinnamon': 'kaneel',
  'soy sauce': 'sojasaus',
  
  // Common words and phrases
  'with': 'met',
  'and': 'en',
  'rice noodles': 'rijstnoedels',
  'stir-fry': 'roerbak',
  'fried rice': 'gebakken rijst',
  'tahini sauce': 'tahinisaus',
  'veggie': 'groente',
  'quick': 'snelle',
  'fresh': 'verse',
  'vegetable': 'groente',
  'herb': 'kruiden',
  'herbs': 'kruiden',
  'scrambled eggs': 'roerei',
  'pancakes': 'pannenkoeken',
  'stuffed peppers': 'gevulde paprika',
  'breakfast porridge': 'ontbijt pap',
  'chia pudding': 'chia pudding',
  'hemp hearts': 'hennepzaad',
  'protein powder': 'proteïnepoeder',
  
  // Vegetables
  'vegetables': 'groenten',
  'onion': 'ui',
  'onions': 'uien',
  'green onion': 'lente ui',
  'green onions': 'lente ui',
  'garlic': 'knoflook',
  'tomato': 'tomaat',
  'tomatoes': 'tomaten',
  'sun-dried tomato': 'zongedroogde tomaat',
  'sun-dried tomatoes': 'zongedroogde tomaten',
  'carrot': 'wortel',
  'carrots': 'wortels',
  'broccoli': 'broccoli',
  'spinach': 'spinazie',
  'kale': 'boerenkool',
  'bell pepper': 'paprika',
  'bell peppers': 'paprika\'s',
  'red bell pepper': 'rode paprika',
  'cucumber': 'komkommer',
  'zucchini': 'courgette',
  'eggplant': 'aubergine',
  'mushrooms': 'champignons',
  'ripe avocado': 'rijpe avocado',
  'sweet potato': 'zoete aardappel',
  'sweet potatoes': 'zoete aardappelen',
  'sweet potato milk': 'zoete aardappel melk',
  'potato': 'aardappel',
  'potatoes': 'aardappelen',
  'lettuce': 'sla',
  'cabbage': 'kool',
  'cauliflower': 'bloemkool',
  'sugar snaps': 'sugarsnaps',
  
  // Additional seasonal Dutch vegetables
  'pumpkin': 'pompoen',
  'pumpkins': 'pompoenen', 
  'winter squash': 'winterpompoen',
  'brussels sprouts': 'spruitjes',
  'endive': 'andijvie',
  'artichoke': 'artisjok',
  'celeriac': 'knolselderij',
  'celery': 'selderij',
  'green celery': 'groene selderij',
  'kohlrabi': 'koolrabi',
  'corn': 'mais',
  'radish': 'radijs',
  'turnip': 'raap',
  'parsnip': 'pastinaak',
  'fennel': 'venkel',
  'chard': 'snijbiet',
  'pak choi': 'paksoi',
  'chinese cabbage': 'chinese kool',
  'red cabbage': 'rodekool',
  'savoy cabbage': 'savooikool',
  'pointed cabbage': 'spitskool',
  'white cabbage': 'witte kool',
  'watercress': 'waterkers',
  'lamb\'s lettuce': 'veldsla',
  'crop lettuce': 'kropsla',
  'leek': 'prei',
  'string beans': 'sperziebonen',
  'red beet': 'rode biet',
  'beetroot': 'rode biet',
  'mushrooms': 'paddenstoelen',
  'apple': 'appel',
  'apples': 'appels',
  'pear': 'peer',
  'pears': 'peren',
  'grapes': 'druiven',
  
  // Fruits
  'fruits': 'fruit',
  'banana': 'banaan',
  'berries': 'bessen',
  'mixed berries': 'gemixte bessen',
  'summer fruit': 'zomerfruit',
  'blueberries': 'bosbessen',
  'strawberries': 'aardbeien',
  'raspberries': 'frambozen',
  'orange': 'sinaasappel',
  'lemon': 'citroen',
  'lemon juice': 'limoensap',
  'bean sprouts': 'tauge',
  'sprouts': 'tauge',
  'lime': 'limoen',
  'mango': 'mango',
  'pineapple': 'ananas',
  'kiwi': 'kiwi',
  
  // Herbs & Spices
  'salt': 'zout',
  'pepper': 'peper',
  'black pepper': 'zwarte peper',
  'garlic powder': 'knoflookpoeder',
  'onion powder': 'uienpoeder',
  'paprika powder': 'paprikapoeder',
  'cumin': 'komijn',
  'turmeric': 'kurkuma',
  'ginger': 'gember',
  'fresh ginger': 'verse gember',
  'basil': 'basilicum',
  'oregano': 'oregano',
  'thyme': 'tijm',
  'rosemary': 'rozemarijn',
  'parsley': 'peterselie',
  'cilantro': 'koriander',
  'coriander': 'koriander',
  'fresh herbs': 'verse kruiden',
  'bay leaves': 'laurierbladeren',
  
  // Oils & Vinegars
  'oil': 'olie',
  'olive oil': 'olijfolie',
  'coconut oil': 'kokosolie',
  'vegetable oil': 'plantaardige olie',
  'sesame oil': 'sesamolie',
  'vinegar': 'azijn',
  'balsamic vinegar': 'balsamico azijn',
  'apple cider vinegar': 'appelciderazijn',
  'tomato paste': 'tomatenpuree',
  'nutritional yeast': 'voedingsgist',
  'vegetable stock': 'groentebouillon',
  'vegetable broth': 'groentebouillon',
  'salt and pepper': 'zout en peper',
  'sea salt': 'zeezout',
  'fine sea salt': 'fijn zeezout',
  'black pepper': 'zwarte peper',
  
  // Nuts & Seeds
  'nuts and seeds': 'noten en zaden',
  'nuts': 'noten',
  'mixed nuts': 'gemengde noten',
  'seeds': 'zaden',
  'almonds': 'amandelen',
  'walnuts': 'walnoten',
  'cashews': 'cashewnoten',
  'cashew cream': 'cashewcrème',
  'peanuts': 'pinda\'s',
  'pine nuts': 'pijnboompitten',
  'chia seeds': 'chiazaad',
  'flax seeds': 'lijnzaad',
  'flaxseed': 'lijnzaad',
  'hemp': 'hennep',
  'hemp seeds': 'hennepzaad',
  'sunflower seeds': 'zonnebloempitten',
  'pumpkin seeds': 'pompoenpitten',
  
  // Cooking terms & methods
  'speedy': 'snelle',
  'quick': 'snelle',
  'fast': 'snelle',
  'easy': 'makkelijke',
  'simple': 'eenvoudige',
  'healthy': 'gezonde',
  'nutritious': 'voedzame',
  'delicious': 'heerlijke',
  'tasty': 'lekkere',
  'crispy': 'knapperige',
  'crunchy': 'krokante',
  'creamy': 'romige',
  'smooth': 'gladde',
  'thick': 'dikke',
  'thin': 'dunne',
  'hot': 'warme',
  'cold': 'koude',
  'warm': 'warme',
  'dried': 'gedroogd',
  'fresh': 'verse',
  'frozen': 'bevroren',
  'canned': 'ingeblikte',
  'can': 'blik',
  'jar': 'pot',
  'large': 'groot',
  'medium': 'middel',
  'small': 'klein',
  'extra': 'extra',
  'optional': 'optioneel',
  'finely': 'fijn',
  'roughly': 'grof',
  'coarsely': 'grof',
  'thinly': 'dun',
  'thickly': 'dik',
  'finely chopped': 'fijngehakt',
  'finely diced': 'fijn in blokjes gesneden',
  'crushed tomatoes': 'gepureerde tomaten',
  'crushed': 'gepureerd',
  'broth': 'bouillon',
  'stock': 'bouillon',
  'herbs': 'kruiden',
  'spices': 'specerijen',
  'seasoning': 'kruiding',
  'protein': 'proteïne',
  'protein-packed': 'eiwitrijke',
  'high-protein': 'eiwitrijke',
  'organic': 'biologisch',
  'natural': 'natuurlijke',
  'raw': 'rauw',
  'cooked': 'gekookt',
  'steamed': 'gestoomd',
  'boiled': 'gekookt',
  'simmered': 'gesuderd',
  'braised': 'gestofd',
  'stewed': 'gestooft',
  'roasted': 'geroosterd',
  'grilled': 'gegrild',
  'barbecued': 'gebarbecued',
  'fried': 'gebakken',
  'pan-fried': 'gebakken',
  'deep-fried': 'gefrituurd',
  'baked': 'gebakken',
  'broiled': 'gegratineerd',
  'sautéed': 'gesauteerd',
  'stir-fried': 'geroerbakt',
  'poached': 'gepocheerd',
  'blanched': 'geblancheerd',
  'marinated': 'gemarineerd',
  'seasoned': 'gekruid',
  'spiced': 'gekruid',
  'glazed': 'geglazuurd',
  'caramelized': 'gekarameliseerd',
  'toasted': 'geroosterd',
  'golden': 'goudbruin',
  'crisp': 'knapperig',
  'tender': 'mals',
  'soft': 'zacht',
  'firm': 'stevig',
  'chopped': 'gehakt',
  'diced': 'in blokjes gesneden',
  'sliced': 'in plakjes gesneden',
  'minced': 'fijngehakt',
  'grated': 'geraspt',
  'shredded': 'geraspt',
  'julienned': 'in reepjes gesneden',
  'cubed': 'in blokjes gesneden',
  'quartered': 'in vieren gesneden',
  'halved': 'gehalveerd',
  'peeled': 'geschild',
  'trimmed': 'bijgesneden',
  'cleaned': 'schoongemaakt',
  'washed': 'gewassen',
  'rinsed': 'gespoeld',
  'drained': 'uitgelekt',
  'squeezed': 'uitgeknepen',
  'mashed': 'gepureerd',
  'blended': 'gemixt',
  'mixed': 'gemengd',
  'combined': 'gecombineerd',
  'stirred': 'geroerd',
  'whisked': 'geklopt',
  'beaten': 'geklopt',
  'folded': 'ondergeschept',
  'tossed': 'omgeschept',
  
  // Recipe instructions & cooking verbs
  'heat': 'verhit',
  'add': 'voeg toe',
  'remove': 'verwijder',
  'cook': 'kook',
  'simmer': 'laat sudderen',
  'boil': 'kook',
  'bring to a boil': 'breng aan de kook',
  'reduce heat': 'verlaag het vuur',
  'stir': 'roer',
  'mix': 'meng',
  'combine': 'combineer',
  'blend': 'mix',
  'whisk': 'klop',
  'beat': 'klop',
  'fold in': 'schep onder',
  'toss': 'schep om',
  'season': 'breng op smaak',
  'taste': 'proef',
  'adjust': 'stel bij',
  'serve': 'serveer',
  'garnish': 'garneer',
  'top with': 'top met',
  'sprinkle': 'bestrooi',
  'drizzle': 'druppel',
  'pour': 'giet',
  'drain': 'laat uitlekken',
  'rinse': 'spoel',
  'wash': 'was',
  'dry': 'droog',
  'pat dry': 'dep droog',
  'set aside': 'zet opzij',
  'let cool': 'laat afkoelen',
  'refrigerate': 'zet in de koelkast',
  'chill': 'koel',
  'freeze': 'vries in',
  'thaw': 'ontdooi',
  'preheat': 'verwarm voor',
  'bake': 'bak',
  'roast': 'rooster',
  'grill': 'grill',
  'fry': 'bak',
  'sauté': 'bak',
  'brown': 'bruineer',
  'sear': 'dichtschroeien',
  'char': 'rooster',
  'caramelize': 'karameliseer',
  'reduce': 'kook in',
  'thicken': 'bind',
  'melt': 'smelt',
  'dissolve': 'los op',
  'strain': 'zeef',
  'press': 'pers',
  'squeeze': 'knijp',
  'roll': 'rol',
  'shape': 'vorm',
  'form': 'vorm',
  'cut': 'snijd',
  'slice': 'snijd in plakjes',
  'dice': 'snijd in blokjes',
  'chop': 'hak',
  'mince': 'hak fijn',
  'grate': 'rasp',
  'peel': 'schil',
  'trim': 'snijd bij',
  'core': 'haal het klokhuis eruit',
  'seed': 'haal de zaadjes eruit',
  'stuff': 'vul',
  'fill': 'vul',
  'layer': 'leg in lagen',
  'spread': 'smeer',
  'brush': 'bestrijk',
  'coat': 'bedek',
  'cover': 'bedek',
  'wrap': 'wikkel',
  'secure': 'maak vast',
  'tie': 'bind vast',
  'pierce': 'prik',
  'score': 'snijd in',
  'marinate': 'marineer',
  'rest': 'laat rusten',
  'stand': 'laat staan',
  'cool': 'laat afkoelen',
  
  // Kitchen equipment
  'pan': 'pan',
  'pot': 'pan',
  'saucepan': 'steelpan',
  'skillet': 'koekenpan',
  'frying pan': 'koekenpan',
  'wok': 'wok',
  'oven': 'oven',
  'stovetop': 'fornuis',
  'burner': 'pit',
  'grill': 'grill',
  'microwave': 'magnetron',
  'bowl': 'kom',
  'mixing bowl': 'mengkom',
  'plate': 'bord',
  'dish': 'schaal',
  'baking dish': 'ovenschaal',
  'tray': 'bakplaat',
  'baking tray': 'bakplaat',
  'sheet': 'plaat',
  'baking sheet': 'bakplaat',
  'rack': 'rooster',
  'wire rack': 'rooster',
  'cutting board': 'snijplank',
  'knife': 'mes',
  'spoon': 'lepel',
  'wooden spoon': 'houten lepel',
  'spatula': 'spatel',
  'whisk': 'garde',
  'tongs': 'tang',
  'ladle': 'pollepel',
  'strainer': 'zeef',
  'colander': 'vergiet',
  'blender': 'blender',
  'food processor': 'keukenmachine',
  'mixer': 'mixer',
  'measuring cup': 'maatbeker',
  'measuring spoon': 'maatlepel',
  
  // Time & temperature
  'minutes': 'minuten',
  'minute': 'minuut',
  'hours': 'uur',
  'hour': 'uur',
  'seconds': 'seconden',
  'overnight': 'de hele nacht',
  'until': 'totdat',
  'for': 'gedurende',
  'about': 'ongeveer',
  'approximately': 'ongeveer',
  'degrees': 'graden',
  'celsius': 'celsius',
  'fahrenheit': 'fahrenheit',
  'low heat': 'laag vuur',
  'medium heat': 'middelhoog vuur',
  'high heat': 'hoog vuur',
  'low': 'laag',
  'medium': 'middel',
  'high': 'hoog',
  
  // Common recipe phrases
  'in a pan': 'in een pan',
  'in a bowl': 'in een kom',
  'in the oven': 'in de oven',
  'on the stove': 'op het fornuis',
  'over heat': 'op het vuur',
  'until tender': 'tot ze gaar zijn',
  'until golden': 'tot ze goudbruin zijn',
  'until done': 'tot ze gaar zijn',
  'until cooked': 'tot ze gaar zijn',
  'if needed': 'indien nodig',
  'as needed': 'naar behoefte',
  'more or less': 'min of meer',
  'or to taste': 'of naar smaak',
  'according to taste': 'naar smaak',
  'depends on': 'hangt af van',
  'alternatively': 'alternatief',
  'instead': 'in plaats daarvan',
  'substitute': 'vervang',
  'replace': 'vervang',
  'variation': 'variatie',
  'tip': 'tip',
  'note': 'opmerking',
  'important': 'belangrijk',
  'careful': 'voorzichtig',
  'gently': 'voorzichtig',
  'slowly': 'langzaam',
  'quickly': 'snel',
  'immediately': 'direct',
  'meanwhile': 'ondertussen',
  'while': 'terwijl',
  'before': 'voordat',
  'after': 'nadat',
  'then': 'daarna',
  'next': 'vervolgens',
  'finally': 'tenslotte',
  'lastly': 'als laatste',
  'first': 'eerst',
  'second': 'ten tweede',
  'third': 'ten derde',
  
  // Measurements
  'cup': 'kopje',
  'cups': 'kopjes',
  'tablespoon': 'eetlepel',
  'tablespoons': 'eetlepels',
  'tbsp': 'eetlepel',
  'teaspoon': 'theelepel',
  'teaspoons': 'theelepels',
  'tsp': 'theelepel',
  'gram': 'gram',
  'grams': 'gram',
  'g': 'g',
  'kilogram': 'kilogram',
  'kg': 'kg',
  'liter': 'liter',
  'liters': 'liter',
  'l': 'l',
  'milliliter': 'milliliter',
  'milliliters': 'milliliter',
  'ml': 'ml',
  'ounce': 'ons',
  'ounces': 'ons',
  'oz': 'ons',
  'pound': 'pond',
  'pounds': 'pond',
  'lb': 'pond',
  'lbs': 'pond',
  'inch': 'cm',
  'inches': 'cm',
  'handful': 'handvol',
  'handfuls': 'handvol',
  'pinch': 'snufje',
  'dash': 'scheutje',
  'splash': 'scheutje',
  'drop': 'druppel',
  'drops': 'druppels',
  'clove': 'teen',
  'cloves': 'tenen',
  'piece': 'stuk',
  'pieces': 'stukken',
  'slice': 'plak',
  'slices': 'plakken',
  'strip': 'reep',
  'strips': 'reepjes',
  'sprig': 'takje',
  'sprigs': 'takjes',
  'bunch': 'bosje',
  'head': 'krop',
  'bulb': 'bol',
  'stalk': 'steel',
  'stalks': 'stelen',
  'leaf': 'blad',
  'leaves': 'bladeren',
  'to taste': 'naar smaak',
  'as desired': 'naar wens',
  
  // Kitchen and pantry terms
  'pantry items': 'voorraadkast',
  'pantry': 'voorraadkast',
  'other': 'overig',
  
  // Spices and powders
  'chili powder': 'chilipoeder',
  'fennel powder': 'venkelpoeder',
  'curry powder': 'kerrie',
  'garam masala': 'garam masala',
  'smoked paprika': 'gerookte paprika',
  'cayenne pepper': 'cayennepeper',
  'red pepper flakes': 'rode pepervlokken',
  'chili flakes': 'chilivlokken',
  'dried oregano': 'gedroogde oregano',
  'dried basil': 'gedroogde basilicum',
  'dried thyme': 'gedroogde tijm',
};

// Enhanced recipe name pattern translations
const recipeNamePatterns: Array<{pattern: RegExp, replacement: string}> = [
  // Complete recipe patterns - most specific first
  { pattern: /quick veggie stir-fry with rice noodles, tofu and tahini sauce/gi, replacement: 'snelle groente roerbak met rijstnoedels, tofu en tahinisaus' },
  { pattern: /asian-style vegetable fried rice with tofu/gi, replacement: 'aziatische groente gebakken rijst met tofu' },
  { pattern: /protein-packed vegetarian lentil bolognese/gi, replacement: 'eiwitrijke vegetarische linzen bolognese' },
  { pattern: /chickpea & potato pancakes with warm veggie salsa/gi, replacement: 'kikkererwt & aardappel pannenkoeken met warme groente salsa' },
  { pattern: /fresh coconut and herb steamed vegetables with basmati rice/gi, replacement: 'verse kokos en kruiden gestoomde groenten met basmatirijst' },
  { pattern: /fresh vegetable and herb scrambled eggs with ripe avocado/gi, replacement: 'verse groente en kruiden roerei met rijpe avocado' },
  { pattern: /mediterranean quinoa and chickpea stuffed peppers/gi, replacement: 'mediterrane quinoa en kikkererwt gevulde paprika' },
  { pattern: /high-protein smoothie bowl with granola/gi, replacement: 'eiwitrijke smoothie kom met granola' },
  { pattern: /protein-packed quinoa breakfast porridge with banana & peanut butter/gi, replacement: 'eiwitrijke quinoa ontbijt pap met banaan & pindakaas' },
  { pattern: /protein-packed chia pudding with almond butter/gi, replacement: 'eiwitrijke chia pudding met amandelpasta' },
  { pattern: /protein pancakes with almond flour/gi, replacement: 'proteïne pannenkoeken met amandelmeel' },
  { pattern: /green smoothie bowl with hemp hearts, coconut and protein powder/gi, replacement: 'groene smoothie kom met hennepzaad, kokos en proteïnepoeder' },
  
  // Common stir-fry patterns
  { pattern: /(.+) stir-fry with (.+)/gi, replacement: '$1 roerbak met $2' },
  { pattern: /vegetable stir-fry/gi, replacement: 'groente roerbak' },
  { pattern: /veggie stir-fry/gi, replacement: 'groente roerbak' },
  { pattern: /asian-style (.+)/gi, replacement: 'aziatische $1' },
  { pattern: /mediterranean (.+)/gi, replacement: 'mediterrane $1' },
  
  // Protein + preparation
  { pattern: /grilled chicken/gi, replacement: 'gegrilde kip' },
  { pattern: /baked salmon/gi, replacement: 'gebakken zalm' },
  { pattern: /roasted beef/gi, replacement: 'geroosterd rundvlees' },
  { pattern: /steamed fish/gi, replacement: 'gestoomde vis' },
  
  // Bowl dishes
  { pattern: /protein bowl/gi, replacement: 'eiwitkom' },
  { pattern: /quinoa bowl/gi, replacement: 'quinoa kom' },
  { pattern: /smoothie bowl/gi, replacement: 'smoothie kom' },
  { pattern: /breakfast bowl/gi, replacement: 'ontbijt kom' },
  { pattern: /buddha bowl/gi, replacement: 'buddha kom' },
  
  // Common dish types
  { pattern: /vegetable stir-fry/gi, replacement: 'groente roerbakgerecht' },
  { pattern: /chicken curry/gi, replacement: 'kipcurry' },
  { pattern: /lentil soup/gi, replacement: 'linzensoep' },
  { pattern: /vegetable soup/gi, replacement: 'groentesoep' },
  { pattern: /fruit salad/gi, replacement: 'fruitsalade' },
  { pattern: /green salad/gi, replacement: 'groene salade' },
  
  // Preparation methods
  { pattern: /with fresh herbs/gi, replacement: 'met verse kruiden' },
  { pattern: /with vegetables/gi, replacement: 'met groenten' },
  { pattern: /with nuts/gi, replacement: 'met noten' },
  { pattern: /with seeds/gi, replacement: 'met zaden' },
  { pattern: /with berries/gi, replacement: 'met bessen' },
  { pattern: /with coconut/gi, replacement: 'met kokos' },
  
  // Dietary modifiers
  { pattern: /gluten-free/gi, replacement: 'glutenvrij' },
  { pattern: /dairy-free/gi, replacement: 'zuivelvrij' },
  { pattern: /vegan/gi, replacement: 'veganistisch' },
  { pattern: /vegetarian/gi, replacement: 'vegetarisch' },
  { pattern: /high-protein/gi, replacement: 'eiwitrijk' },
  { pattern: /low-carb/gi, replacement: 'koolhydraatarm' },
  
  // Cooking styles
  { pattern: /mediterranean/gi, replacement: 'mediterraan' },
  { pattern: /asian/gi, replacement: 'aziatisch' },
  { pattern: /italian/gi, replacement: 'italiaans' },
  { pattern: /mexican/gi, replacement: 'mexicaans' },
  { pattern: /indian/gi, replacement: 'indiaas' },
  { pattern: /thai/gi, replacement: 'thais' },
  { pattern: /ayurvedic/gi, replacement: 'ayurvedisch' },
];

function translateIngredient(ingredient: string): string {
  let translated = ingredient.toLowerCase();
  
  // Sort translations by length (longest first) to handle compound ingredients correctly
  const sortedTranslations = Object.entries(ingredientTranslations)
    .sort(([a], [b]) => b.length - a.length);
  
  // Apply ingredient translations
  for (const [english, dutch] of sortedTranslations) {
    const regex = new RegExp(`\\b${english}\\b`, 'gi');
    translated = translated.replace(regex, dutch);
  }
  
  // Capitalize first letter
  return translated.charAt(0).toUpperCase() + translated.slice(1);
}

/**
 * Create reverse translation map (Dutch -> English) for ingredient matching
 */
function createDutchToEnglishMap(): Record<string, string> {
  if (dutchToEnglishMap === null) {
    dutchToEnglishMap = {};
    
    // Create reverse mapping from Dutch back to English
    for (const [english, dutch] of Object.entries(ingredientTranslations)) {
      dutchToEnglishMap[dutch.toLowerCase()] = english.toLowerCase();
    }
    
    console.log(`📖 TRANSLATION MAP: Created reverse map with ${Object.keys(dutchToEnglishMap).length} Dutch->English translations`);
  }
  
  return dutchToEnglishMap;
}

/**
 * Translate Dutch ingredient to English for ingredient matching
 * @param dutchIngredient - ingredient name in Dutch
 * @returns English equivalent or original if no translation found
 */
export function translateDutchToEnglish(dutchIngredient: string): string {
  const map = createDutchToEnglishMap();
  const normalized = dutchIngredient.toLowerCase().trim();
  
  // Direct translation lookup
  if (map[normalized]) {
    console.log(`🔄 TRANSLATE: "${dutchIngredient}" -> "${map[normalized]}"`);
    return map[normalized];
  }
  
  // Partial matching for compound ingredients (only for meaningful length words)
  for (const [dutch, english] of Object.entries(map)) {
    // Only do partial matching for words longer than 3 characters to avoid false matches
    if (dutch.length > 3 && normalized.length > 3) {
      if (normalized.includes(dutch) || dutch.includes(normalized)) {
        console.log(`🔄 PARTIAL TRANSLATE: "${dutchIngredient}" -> "${english}" (via "${dutch}")`);
        return english;
      }
    }
  }
  
  // No translation found, return original
  console.log(`❓ NO TRANSLATION: "${dutchIngredient}" - keeping original`);
  return dutchIngredient;
}

// Enhanced cooking instruction translations (English -> Dutch)
const cookingInstructions: Record<string, string> = {
  // Complete instruction phrases first (most specific) 
  'soak rice noodles in hot water for 8-10 minutes until soft': 'week rijstnoedels 8-10 minuten in heet water tot ze zacht zijn',
  'heat olive oil in a large pot over medium heat': 'verhit olijfolie in een grote pan op middelhoog vuur',
  'heat oil in a large wok over high heat': 'verhit olie in een grote wok op hoog vuur',
  'heat sesame oil in large wok': 'verhit sesamolie in een grote wok',
  'sauté onion, carrot, celery until soft, 8 minutes': 'fruit ui, wortel en bleekselderij 8 minuten tot zacht',
  'add garlic, cook 1 minute': 'voeg knoflook toe en bak 1 minuut mee',
  'stir in tomato paste, cook 2 minutes': 'roer tomatenpuree erdoor en bak 2 minuten mee',
  'cook pasta according to package directions': 'kook pasta volgens de verpakkingsinstructies',
  'serve with fresh basil and parmesan': 'serveer met verse basilicum en parmezaan',
  'cook until golden': 'bak tot goudbruin',
  'cook until tender': 'kook tot zacht',
  'soak in hot water for': 'week in heet water gedurende',
  'add to wok': 'voeg toe aan de wok',
  'stir fry for': 'roerbak gedurende',
  'according to package directions': 'volgens de verpakkingsinstructies',
  'push to one side': 'schuif naar één kant',
  'breaking up clumps': 'breek klonters uit elkaar',
  'keep heat high': 'houd het vuur hoog',
  'garnish with': 'garneer met',
  'toss everything together': 'meng alles door elkaar',
  'add lentils, crushed tomatoes, broth, herbs': 'voeg linzen, gepureerde tomaten, bouillon en kruiden toe',
  'simmer 25 minutes until lentils are soft': 'laat 25 minuten sudderen tot de linzen zacht zijn',
  'stir in nutritional yeast': 'roer voedingsgist erdoor',
  'make pancake batter by whisking': 'maak pannenkoekbeslag door te kloppen',
  'set batter aside to rest': 'zet het beslag opzij om te rusten',
  'generous drizzle of': 'ruime hoeveelheid',
  'non-stick frying pan': 'anti-aanbakkoekenpan',
  'stirring frequently': 'regelmatig roeren',
  'return pan to heat': 'zet de pan terug op het vuur',
  'whisking gram flour': 'kikkererwtenmeel kloppen',
  'combined with no lumps': 'tot een gladde massa',
  'until combined': 'tot goed gemengd',
  'pieces': 'stukjes',
  'generous drizzle': 'ruime hoeveelheid',
  'drizzle of': 'scheutje',
  'cut into pieces': 'snijd in stukjes',
  'until golden brown and soft': 'tot goudbruin en zacht',
  'transfer cooked': 'doe de gekookte',
  'to plate': 'op een bord',
  'with a pinch of': 'met een snufje',
  'approximately': 'ongeveer',
  
  // Basic cooking actions
  'heat': 'verhit',
  'heat the': 'verhit de',
  'heat oil': 'verhit olie',
  'heat oven': 'verwarm de oven',
  'preheat': 'verwarm voor',
  'preheat oven': 'verwarm de oven voor',
  'cook': 'kook',
  'cook for': 'kook gedurende',
  'cook until': 'kook totdat',
  'bake': 'bak',
  'bake for': 'bak gedurende',
  'bake until': 'bak totdat',
  'fry': 'bak',
  'boil': 'kook',
  'simmer': 'laat sudderen',
  'steam': 'stoom',
  'grill': 'grill',
  'roast': 'braad',
  'sauté': 'bak',
  'stir': 'roer',
  'stir in': 'roer er doorheen',
  'stir fry': 'roerbak',
  'mix': 'meng',
  'mix well': 'meng goed',
  'mix together': 'meng samen',
  'blend': 'mix',
  'soak': 'week',
  'soak in hot water': 'week in heet water',
  'until smooth': 'tot het glad is',
  'until smooth and creamy': 'tot het glad en romig is',
  'whisk': 'klop',
  'whisk together': 'klop samen',
  'chop': 'hak',
  'chop finely': 'hak fijn',
  'slice': 'snijd',
  'slice thinly': 'snijd dun',
  'dice': 'snijd in blokjes',
  'mince': 'hak fijn',
  'season': 'breng op smaak',
  'season with': 'breng op smaak met',
  'serve': 'serveer',
  'serve hot': 'serveer warm',
  'serve immediately': 'serveer direct',
  
  // Advanced cooking terms
  'add': 'voeg toe',
  'add to': 'voeg toe aan',
  'add to the': 'voeg toe aan de',
  'remove': 'verwijder',
  'remove from': 'haal uit',
  'drain': 'giet af',
  'drain and blend': 'giet af en mix',
  'drain and rinse': 'giet af en spoel',
  'rinse': 'spoel af',
  'wash': 'was',
  'peel': 'schil',
  'trim': 'snijd bij',
  'cut': 'snijd',
  'cut into': 'snijd in',
  'place': 'doe',
  'place in': 'doe in',
  'put': 'doe',
  'put in': 'doe in',
  'transfer': 'doe over',
  'transfer to': 'doe over naar',
  'combine': 'meng',
  'fold': 'spatel door',
  'fold in': 'spatel er doorheen',
  'beat': 'klop',
  'cream': 'klop romig',
  'melt': 'smelt',
  'reduce': 'laat inkoken',
  'bring to boil': 'breng aan de kook',
  'bring to a boil': 'breng aan de kook',
  'let cool': 'laat afkoelen',
  'cool': 'koel af',
  'chill': 'koel',
  'refrigerate': 'zet in de koelkast',
  'freeze': 'vries in',
  'thaw': 'ontdooi',
  'marinate': 'marineer',
  'rest': 'laat rusten',
  'stand': 'laat staan',
  'set aside': 'zet apart',
  'cover': 'dek af',
  'uncover': 'haal deksel eraf',
  'stir occasionally': 'roer af en toe',
  'stir frequently': 'roer regelmatig',
  'taste': 'proef',
  'adjust seasoning': 'pas kruiden aan',
  'garnish': 'garneer',
  'sprinkle': 'bestrooi',
  'drizzle': 'besprenkel',
  'spread': 'smeer uit',
  'layer': 'leg in lagen',
  'arrange': 'schik',
  'press': 'druk aan',
  'squeeze': 'knijp uit',
  'strain': 'zeef',
  'filter': 'filter',
  'sift': 'zeef',
  'knead': 'kneed',
  'roll': 'rol uit',
  'flatten': 'plat drukken',
  'shape': 'vorm',
  'form': 'vorm',
  'wrap': 'wikkel',
  'stuff': 'vul',
  'fill': 'vul',
  'top with': 'bestrooi met',
  'brush with': 'bestrijk met',
  'coat': 'bedek',
  'dip': 'doop',
  'oil': 'vet in',
  'grease': 'vet in',
  'line': 'bekleed',
  'turn': 'keer om',
  'flip': 'keer om',
  'toss': 'schep om',
  'shake': 'schud',
  'pound': 'klop plat',
  'crush': 'plet',
  'grate': 'rasp',
  'zest': 'rasp de schil',
  'juice': 'pers uit',
  'core': 'haal het klokhuis uit',
  'seed': 'haal de pitten uit',
  'debone': 'haal de botten uit',
  'skin': 'haal de huid eraf',
  'score': 'kerf in',
  'pierce': 'prik in',
  'puncture': 'prik door',
  
  // Time and temperature
  'for': 'gedurende',
  'until': 'totdat',
  'about': 'ongeveer',
  'approximately': 'ongeveer',
  'minutes': 'minuten',
  'minute': 'minuut',
  'hours': 'uur',
  'hour': 'uur',
  'seconds': 'seconden',
  'degrees': 'graden',
  'celsius': 'Celsius',
  'fahrenheit': 'Fahrenheit',
  'hot': 'heet',
  'warm': 'warm',
  'cold': 'koud',
  'room temperature': 'kamertemperatuur',
  'golden brown': 'goudbruin',
  'tender': 'zacht',
  'crispy': 'knapperig',
  'soft_texture': 'zacht',
  'firm': 'stevig',
  'done': 'gaar',
  'cooked through': 'gaar',
  'al dente': 'al dente',
  
  // Temperature and cooking states
  'over medium heat': 'op middelhoog vuur',
  'over high heat': 'op hoog vuur',
  'over low heat': 'op laag vuur',
  'until golden brown': 'tot goudbruin',
  'until soft': 'tot zacht',
  'until crispy': 'tot knapperig',
  'until fragrant': 'tot geurend',
  'large wok or skillet': 'grote wok of koekenpan',
  'large pot': 'grote pan',
  'medium bowl': 'middelgrote kom',
  'small bowl': 'kleine kom',
  
  // Common phrases
  'in a': 'in een',
  'in the': 'in de', 
  'in a large': 'in een grote',
  'in large': 'in een grote',
  'on a': 'op een',
  'on the': 'op de',
  'with a': 'met een',
  'with the': 'met de',
  'to a': 'tot een',
  'to the': 'naar de',
  'from the': 'uit de',
  'over': 'over',
  'under': 'onder',
  'into': 'in',
  'onto': 'op',
  'before': 'voordat',
  'after': 'nadat',
  'while': 'terwijl',
  'during': 'tijdens',
  'meanwhile': 'ondertussen',
  'then': 'vervolgens',
  'next': 'daarna',
  'finally': 'tot slot',
  'first': 'eerst',
  'second': 'ten tweede',
  'third': 'ten derde',
  'lastly': 'als laatste'
};

// Terms that are commonly used in Dutch and should not be translated
const dutchFriendlyTerms = [
  'overnight oats',
  'smoothie',
  'quinoa',
  'tofu',
  'tempeh',
  'pasta',
  'pizza',
  'buddha bowl',
  'wrap'
];

function translateInstruction(instruction: string): string {
  let translated = instruction;
  
  // Apply cooking instruction translations first (longer phrases first)
  const sortedInstructions = Object.entries(cookingInstructions)
    .sort((a, b) => b[0].length - a[0].length); // Sort by length, longest first
  
  for (const [english, dutch] of sortedInstructions) {
    const regex = new RegExp(`\\b${english}\\b`, 'gi');
    translated = translated.replace(regex, dutch);
  }
  
  // Apply ingredient translations
  for (const [english, dutch] of Object.entries(ingredientTranslations)) {
    const regex = new RegExp(`\\b${english}\\b`, 'gi');
    translated = translated.replace(regex, dutch);
  }
  
  // Capitalize first letter of each sentence
  return translated.replace(/(^|\. )([a-z])/g, (match, prefix, letter) => 
    prefix + letter.toUpperCase()
  );
}

function translateRecipeName(name: string): string {
  let translated = name;
  
  // Create a map to temporarily replace Dutch-friendly terms
  const tempReplacements: Record<string, string> = {};
  let counter = 0;
  
  // Replace Dutch-friendly terms with temporary placeholders
  for (const term of dutchFriendlyTerms) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    const placeholder = `__DUTCH_TERM_${counter}__`;
    if (translated.match(regex)) {
      tempReplacements[placeholder] = term;
      translated = translated.replace(regex, placeholder);
      counter++;
    }
  }
  
  // Apply pattern-based translations
  for (const {pattern, replacement} of recipeNamePatterns) {
    translated = translated.replace(pattern, replacement);
  }
  
  // Apply individual word translations
  for (const [english, dutch] of Object.entries(ingredientTranslations)) {
    const regex = new RegExp(`\\b${english}\\b`, 'gi');
    translated = translated.replace(regex, dutch);
  }
  
  // Restore Dutch-friendly terms
  for (const [placeholder, originalTerm] of Object.entries(tempReplacements)) {
    translated = translated.replace(placeholder, originalTerm);
  }
  
  // Capitalize first letter
  return translated.charAt(0).toUpperCase() + translated.slice(1);
}

export function translateRecipe(recipe: any, language: 'en' | 'nl'): TranslatedRecipe {
  if (language === 'en') {
    // Still convert to metric even for English
    return {
      name: recipe.name,
      ingredients: processRecipeIngredients(recipe.ingredients || []),
      instructions: recipe.instructions || [],
      tips: recipe.tips || [],
      notes: recipe.notes || []
    };
  }
  
  // For Dutch: translate AND convert to metric
  const translatedIngredients = (recipe.ingredients || []).map(translateIngredient);
  const translatedInstructions = (recipe.instructions || []).map(translateInstruction);
  const translatedTips = (recipe.tips || []).map(translateInstruction);
  const translatedNotes = (recipe.notes || []).map(translateInstruction);
  
  return {
    name: translateRecipeName(recipe.name),
    ingredients: processRecipeIngredients(translatedIngredients),
    instructions: translatedInstructions,
    tips: translatedTips,
    notes: translatedNotes
  };
}

// Translate meal plan data
export function translateMealPlan(mealPlan: any, language: 'en' | 'nl'): any {
  if (language === 'en') {
    return mealPlan;
  }
  
  // Create a deep copy and translate meal names
  const translatedMealPlan = JSON.parse(JSON.stringify(mealPlan));
  
  if (translatedMealPlan.meals) {
    translatedMealPlan.meals = translatedMealPlan.meals.map((meal: any) => ({
      ...meal,
      name: translateRecipeName(meal.name)
    }));
  }
  
  return translatedMealPlan;
}

// Translate shopping list items
// Category translations for shopping lists
const categoryTranslations: Record<string, string> = {
  'Proteins': 'Eiwitten',
  'Grains & Starches': 'Granen & Zetmeel',
  'Nuts & Seeds': 'Noten & Zaden',
  'Vegetables': 'Groenten',
  'Fruits': 'Fruit',
  'Dairy Alternatives': 'Zuivelalternatieven', 
  'Fresh Herbs': 'Verse Kruiden',
  'Pantry Items': 'Voorraadkast',
  'Other': 'Overig'
};

export function translateShoppingList(shoppingList: any, language: 'en' | 'nl'): any {
  if (language === 'en') {
    return shoppingList;
  }
  
  const translatedList = JSON.parse(JSON.stringify(shoppingList));
  
  // Translate individual shopping list items
  if (translatedList.shoppingList) {
    translatedList.shoppingList = translatedList.shoppingList.map((item: any) => ({
      ...item,
      ingredient: translateIngredient(item.ingredient),
      category: categoryTranslations[item.category] || item.category
    }));
  }
  
  // Translate the categories array for headers
  if (translatedList.categories) {
    translatedList.categories = translatedList.categories.map((category: string) => 
      categoryTranslations[category] || category
    );
  }
  
  return translatedList;
}

// =============================================================================
// AUTOMATED MONTHLY TRANSLATION SYSTEM USING OPENAI
// =============================================================================

/**
 * Automated translation using OpenAI GPT-5
 */
async function translateRecipeWithAI(request: AutoTranslationRequest): Promise<AutoTranslatedRecipe> {
  const prompt = `You are a professional culinary translator. Please translate this recipe to ${request.targetLanguage} while maintaining culinary accuracy and cultural appropriateness.

RECIPE TO TRANSLATE:
Name: ${request.recipeName}

Ingredients:
${request.ingredients.map((ing, i) => `${i + 1}. ${ing}`).join('\n')}

Instructions:
${request.instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}

${request.tips?.length ? `Tips:\n${request.tips.map((tip, i) => `${i + 1}. ${tip}`).join('\n')}` : ''}

TRANSLATION REQUIREMENTS:
- Keep exact measurements and quantities (convert to metric if needed)
- Maintain cooking times and temperatures
- Use appropriate culinary terms for the target language
- Preserve the cooking method and technique descriptions
- Adapt ingredient names to local equivalents where appropriate
- Keep the same structure and formatting

Please respond with a JSON object in this exact format:
{
  "translatedName": "translated recipe name",
  "translatedIngredients": ["translated ingredient 1", "translated ingredient 2", ...],
  "translatedInstructions": ["translated instruction 1", "translated instruction 2", ...],
  "translatedTips": ["translated tip 1", "translated tip 2", ...] (optional, only if tips were provided)
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a professional culinary translator specializing in recipe translation. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const translationResult = JSON.parse(response.choices[0].message.content || '{}');
    
    // Validate the translation result
    if (!translationResult.translatedName || !translationResult.translatedIngredients || !translationResult.translatedInstructions) {
      throw new Error('Invalid translation response from OpenAI');
    }

    return {
      originalId: request.recipeId,
      translatedName: translationResult.translatedName,
      translatedIngredients: translationResult.translatedIngredients,
      translatedInstructions: translationResult.translatedInstructions,
      translatedTips: translationResult.translatedTips || [],
      language: request.targetLanguage,
      languageCode: request.targetLanguageCode,
      translatedAt: new Date()
    };

  } catch (error) {
    console.error(`❌ Failed to translate recipe "${request.recipeName}" to ${request.targetLanguage}:`, error);
    throw error;
  }
}

/**
 * Selects recipes for automated translation based on various criteria
 */
async function selectRecipesForTranslation(maxRecipes: number = 10): Promise<AutoTranslationRequest[]> {
  const allRecipes = await getCompleteEnhancedMealDatabase();
  
  // Filter criteria for translation selection
  const eligibleRecipes = allRecipes.filter(recipe => {
    // Select recipes that are:
    // 1. Popular (have common ingredients)
    // 2. Seasonal (match current season)
    // 3. Diverse meal types
    // 4. High protein content (>20g)
    // 5. Reasonable prep time (<60 minutes)
    
    const hasGoodProtein = recipe.nutrition.protein >= 20;
    const reasonablePrepTime = recipe.nutrition.prepTime <= 60;
    const hasIngredients = recipe.ingredients && recipe.ingredients.length > 0;
    const hasInstructions = recipe.recipe?.instructions && recipe.recipe.instructions.length > 0;
    
    return hasGoodProtein && reasonablePrepTime && hasIngredients && hasInstructions;
  });

  // Sort by protein content and variety, then select top recipes
  const sortedRecipes = eligibleRecipes
    .sort((a, b) => b.nutrition.protein - a.nutrition.protein)
    .slice(0, maxRecipes * 2) // Get more than needed for variety
    .sort(() => Math.random() - 0.5) // Randomize for variety
    .slice(0, maxRecipes); // Take final selection

  // Create translation requests for a rotating set of languages
  const languageCodes = Object.keys(AUTOMATED_LANGUAGES);
  const selectedLanguage = languageCodes[new Date().getMonth() % languageCodes.length];
  const targetLanguage = AUTOMATED_LANGUAGES[selectedLanguage as keyof typeof AUTOMATED_LANGUAGES];

  return sortedRecipes.map(recipe => ({
    recipeId: recipe.id,
    recipeName: recipe.name,
    ingredients: recipe.ingredients || [],
    instructions: recipe.recipe?.instructions || [],
    tips: recipe.recipe?.tips || [],
    targetLanguage,
    targetLanguageCode: selectedLanguage
  }));
}

/**
 * Processes monthly recipe translations
 */
async function processMonthlyTranslations(): Promise<void> {
  try {
    console.log('🌍 Starting monthly recipe translation process...');
    
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
    const currentYear = currentDate.getFullYear();
    
    console.log(`📅 Processing translations for ${currentMonth} ${currentYear}`);
    
    // Select recipes for translation
    const recipesToTranslate = await selectRecipesForTranslation(8); // 8 recipes per month
    
    if (recipesToTranslate.length === 0) {
      console.log('⚠️ No eligible recipes found for translation');
      return;
    }
    
    const targetLanguage = recipesToTranslate[0].targetLanguage;
    console.log(`🌐 Translating ${recipesToTranslate.length} recipes to ${targetLanguage}`);
    
    // Process translations in batches to avoid rate limits
    const batchSize = 3;
    const translatedRecipes: AutoTranslatedRecipe[] = [];
    
    for (let i = 0; i < recipesToTranslate.length; i += batchSize) {
      const batch = recipesToTranslate.slice(i, i + batchSize);
      
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(recipesToTranslate.length / batchSize)}`);
      
      const batchPromises = batch.map(async (request) => {
        try {
          console.log(`🔤 Translating "${request.recipeName}" to ${request.targetLanguage}...`);
          const translation = await translateRecipeWithAI(request);
          console.log(`✅ Successfully translated "${request.recipeName}" → "${translation.translatedName}"`);
          return translation;
        } catch (error) {
          console.error(`❌ Failed to translate "${request.recipeName}":`, error);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      const successfulTranslations = batchResults.filter(result => result !== null) as AutoTranslatedRecipe[];
      translatedRecipes.push(...successfulTranslations);
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < recipesToTranslate.length) {
        console.log('⏳ Waiting 30 seconds before next batch to respect OpenAI rate limits...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }
    
    // Log translation summary
    console.log(`🎉 Monthly translation completed!`);
    console.log(`📊 Summary: ${translatedRecipes.length}/${recipesToTranslate.length} recipes successfully translated to ${targetLanguage}`);
    console.log(`🍽️ Translated recipes:`, translatedRecipes.map(r => r.translatedName).join(', '));
    
    // Store translations (in a real implementation, you'd save these to a database)
    // For now, we'll log them for visibility
    console.log(`💾 Storing ${translatedRecipes.length} translated recipes...`);
    translatedRecipes.forEach(recipe => {
      console.log(`🌍 [${recipe.languageCode.toUpperCase()}] ${recipe.translatedName}`);
    });
    
  } catch (error) {
    console.error('❌ Error in monthly translation process:', error);
  }
}

/**
 * Manually trigger recipe translation for testing
 */
export async function translateRecipesNow(maxRecipes: number = 3): Promise<AutoTranslatedRecipe[]> {
  console.log('🚀 Manually triggering recipe translation...');
  
  const recipesToTranslate = await selectRecipesForTranslation(maxRecipes);
  const translatedRecipes: AutoTranslatedRecipe[] = [];
  
  for (const request of recipesToTranslate) {
    try {
      console.log(`🔤 Translating "${request.recipeName}" to ${request.targetLanguage}...`);
      const translation = await translateRecipeWithAI(request);
      translatedRecipes.push(translation);
      console.log(`✅ Successfully translated: "${translation.translatedName}"`);
    } catch (error) {
      console.error(`❌ Failed to translate "${request.recipeName}":`, error);
    }
  }
  
  return translatedRecipes;
}

/**
 * Initialize the monthly translation scheduler
 */
export function initializeTranslationScheduler(): void {
  console.log('🕐 Initializing monthly recipe translation scheduler...');
  
  // Schedule to run on the 1st day of every month at 2:00 AM
  // Cron pattern: '0 2 1 * *' = At 02:00 on day-of-month 1
  cron.schedule('0 2 1 * *', async () => {
    console.log('⏰ Monthly translation schedule triggered');
    await processMonthlyTranslations();
  }, {
    scheduled: true,
    timezone: "UTC"
  });
  
  // Also schedule a weekly test run (smaller batch) every Sunday at 3:00 AM
  // Cron pattern: '0 3 * * 0' = At 03:00 on Sunday
  cron.schedule('0 3 * * 0', async () => {
    console.log('⏰ Weekly translation test triggered');
    try {
      const testTranslations = await translateRecipesNow(2); // Just 2 recipes for testing
      console.log(`🧪 Weekly test completed: ${testTranslations.length} recipes translated`);
    } catch (error) {
      console.error('❌ Weekly translation test failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "UTC"
  });
  
  console.log('✅ Translation scheduler initialized');
  console.log('📅 Monthly translations: 1st of each month at 2:00 AM UTC');
  console.log('🧪 Weekly tests: Every Sunday at 3:00 AM UTC');
}

/**
 * Get next scheduled translation date
 */
export function getNextTranslationDate(): Date {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 2, 0, 0);
  return nextMonth;
}

/**
 * Get supported languages for automated translation
 */
export function getAutomatedLanguages(): typeof AUTOMATED_LANGUAGES {
  return AUTOMATED_LANGUAGES;
}