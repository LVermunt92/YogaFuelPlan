import axios from 'axios';

interface AHProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  unit: string;
  imageUrl: string;
  category: string;
  availability: boolean;
  description?: string;
}

interface AHShoppingListItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  imageUrl: string;
  unit: string;
  category: string;
  found: boolean;
}

interface ShoppingListExport {
  title: string;
  items: AHShoppingListItem[];
  totalPrice: number;
  totalItems: number;
  generatedAt: string;
  deepLink: string; // Albert Heijn app deep link
}

class AlbertHeijnService {
  private baseUrl = 'https://www.ah.nl';
  private searchEndpoint = '/zoeken';
  
  constructor() {
    console.log('🛒 Albert Heijn shopping integration initialized');
  }

  /**
   * Search for products in Albert Heijn catalog
   */
  async searchProduct(query: string): Promise<AHProduct[]> {
    try {
      // Using web scraping approach as no official API exists
      const searchUrl = `${this.baseUrl}${this.searchEndpoint}?query=${encodeURIComponent(query)}`;
      
      // Note: In production, you would implement proper web scraping here
      // For now, returning mock data structure that matches AH products
      
      // Clean query and determine appropriate category based on product type
      const cleanQuery = query
        .replace(/\([^)]*\)/g, '') // Remove parentheses and contents
        .replace(/,.*$/g, '') // Remove everything after comma
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim().toLowerCase();

      let productCategory = 'Groente & fruit'; // Default for vegetables/fruits
      if (cleanQuery.includes('milk') || cleanQuery.includes('cheese') || 
          cleanQuery.includes('egg') || cleanQuery.includes('yogurt') ||
          cleanQuery.includes('kefir') || cleanQuery.includes('cream')) {
        productCategory = 'Zuivel & eieren';
      } else if (cleanQuery.includes('chicken') || cleanQuery.includes('beef') || 
                cleanQuery.includes('fish') || cleanQuery.includes('meat') ||
                cleanQuery.includes('tofu') || cleanQuery.includes('tempeh')) {
        productCategory = 'Vlees, vis & vegetarisch';
      } else if (cleanQuery.includes('bread') || cleanQuery.includes('pastry')) {
        productCategory = 'Brood & gebak';
      } else if (cleanQuery.includes('peanut butter') || cleanQuery.includes('nut butter') ||
                cleanQuery.includes('jam') || cleanQuery.includes('honey')) {
        productCategory = 'Ontbijt & beleg';
      } else if (cleanQuery.includes('rice') || cleanQuery.includes('pasta') ||
                cleanQuery.includes('quinoa') || cleanQuery.includes('noodle')) {
        productCategory = 'Rijst, pasta & wereldkeuken';
      }

      // Clean the product name for display
      const cleanProductName = cleanQuery.charAt(0).toUpperCase() + cleanQuery.slice(1);

      const mockProducts: AHProduct[] = [
        {
          id: `ah_${Date.now()}`,
          name: cleanProductName,
          brand: 'AH',
          price: 2.99,
          unit: '1 stuk',
          imageUrl: '/placeholder-product.jpg',
          category: productCategory,
          availability: true,
          description: `Fresh ${query} from Albert Heijn`
        }
      ];

      console.log(`🔍 Searched for "${query}", found ${mockProducts.length} products`);
      return mockProducts;
    } catch (error) {
      console.error('Error searching Albert Heijn products:', error);
      return [];
    }
  }

  /**
   * Convert meal plan ingredients to Albert Heijn shopping list
   */
  async createShoppingListFromMealPlan(ingredients: string[]): Promise<ShoppingListExport> {
    console.log('🛒 Creating Albert Heijn shopping list from meal plan...');
    
    // Use Map to consolidate identical products
    const consolidatedItems = new Map<string, AHShoppingListItem>();
    let totalPrice = 0;

    for (const ingredient of ingredients) {
      try {
        const products = await this.searchProduct(ingredient);
        
        if (products.length > 0) {
          const product = products[0]; // Take first match
          // Special handling for certain ingredients to normalize different variations
          let productKey = `${product.name}_${product.id}`;
          if (ingredient.toLowerCase().includes('garlic') || product.name.toLowerCase().includes('knoflook')) {
            productKey = `garlic_consolidated`; // Use unified key for all garlic products
          } else if (ingredient.toLowerCase().includes('lime') || product.name.toLowerCase().includes('limoen')) {
            productKey = `lime_consolidated`; // Use unified key for all lime products
          } else if (ingredient.toLowerCase().includes('lemon') || product.name.toLowerCase().includes('citroen')) {
            productKey = `lemon_consolidated`; // Use unified key for all lemon products
          } else if (ingredient.toLowerCase().includes('oat milk') || product.name.toLowerCase().includes('haver') || product.name.toLowerCase().includes('oat')) {
            productKey = `oat_milk_consolidated`; // Use unified key for all oat milk products
          } else if (ingredient.toLowerCase().includes('red pepper') || ingredient.toLowerCase().includes('sweet red pepper') || 
                    product.name.toLowerCase().includes('red pepper') || product.name.toLowerCase().includes('paprika')) {
            productKey = `red_pepper_consolidated`; // Use unified key for all red pepper products
          }
          
          if (consolidatedItems.has(productKey)) {
            // Product already exists, increment quantity and update price
            const existingItem = consolidatedItems.get(productKey)!;
            existingItem.quantity += 1;
            totalPrice += product.price;
            console.log(`🔄 Consolidated: ${product.name} (quantity now: ${existingItem.quantity})`);
          } else {
            // New product, add to map
            const item: AHShoppingListItem = {
              productId: product.id,
              productName: product.name,
              quantity: 1,
              price: product.price,
              imageUrl: product.imageUrl,
              unit: product.unit,
              category: product.category,
              found: true
            };
            
            consolidatedItems.set(productKey, item);
            totalPrice += product.price;
          }
        } else {
          // For manual items, use ingredient name as key for consolidation
          let manualKey = `manual_${ingredient.toLowerCase().trim()}`;
          
          // Special handling for specific ingredients to consolidate all variations
          if (ingredient.toLowerCase().includes('garlic') || ingredient.toLowerCase().includes('clove')) {
            manualKey = `manual_garlic_cloves`;
          } else if (ingredient.toLowerCase().includes('lime')) {
            manualKey = `manual_lime_pieces`;
          } else if (ingredient.toLowerCase().includes('lemon')) {
            manualKey = `manual_lemon_pieces`;
          } else if (ingredient.toLowerCase().includes('oat milk') || ingredient.toLowerCase().includes('haver')) {
            manualKey = `oat_milk_consolidated`; // Use same key as products for consolidation
          } else if (ingredient.toLowerCase().includes('red pepper') || ingredient.toLowerCase().includes('sweet red pepper')) {
            manualKey = `red_pepper_consolidated`; // Consolidate all red pepper variations
          }
          
          if (consolidatedItems.has(manualKey)) {
            // Manual item already exists, increment quantity
            const existingItem = consolidatedItems.get(manualKey)!;
            existingItem.quantity += 1;
            console.log(`🔄 Consolidated manual item: ${ingredient} (quantity now: ${existingItem.quantity})`);
          } else {
            // Add as new manual item
            // Determine appropriate category for manual items
            let itemCategory = 'Te zoeken'; // Default fallback
            // Clean ingredient name by removing descriptions and preparation methods
            const cleanedIngredient = ingredient
              .replace(/\([^)]*\)/g, '') // Remove parentheses and contents
              .replace(/,.*$/g, '') // Remove everything after comma
              .replace(/\s+/g, ' ') // Normalize spaces
              .trim().toLowerCase();

            // Filter out non-grocery items (cooking instructions, temperatures, etc.)
            const nonGroceryPatterns = [
              // Time and temperature patterns
              /^\d+\s*(minutes?|mins?|hours?|hrs?|seconds?|secs?)/,
              /^\d+\s*°[cf]/,
              /^\d+\s*degrees?/,
              
              // Cooking actions/verbs
              /^heat\s/,
              /^cook\s/,
              /^bake\s/,
              /^roast\s/,
              /^steam\s/,
              /^boil\s/,
              /^fry\s/,
              /^sauté\s/,
              /^simmer\s/,
              /^grill\s/,
              /^broil\s/,
              /^until\s/,
              /^serve\s/,
              /^season\s/,
              /^add\s/,
              /^mix\s/,
              /^stir\s/,
              /^blend\s/,
              /^whisk\s/,
              /^combine\s/,
              /^toss\s/,
              /^sprinkle\s/,
              /^drizzle\s/,
              /^garnish\s/,
              /^top\s/,
              /^finish\s/,
              /^adjust\s/,
              /^taste\s/,
              /^check\s/,
              
              // Preparation methods (standalone)
              /^chop\s/,
              /^dice\s/,
              /^slice\s/,
              /^mince\s/,
              /^grate\s/,
              /^peel\s/,
              /^trim\s/,
              /^wash\s/,
              /^rinse\s/,
              /^drain\s/,
              /^pat\s+dry/,
              
              // Preparation descriptions and instructions
              /^finely$/,
              /^finally$/,
              /^roughly$/,
              /^thinly$/,
              /^thickly$/,
              /^coarsely$/,
              /^finely\s/,
              /^finally\s/,
              /^roughly\s/,
              /^thinly\s/,
              /^thickly\s/,
              /^coarsely\s/,
              /^chops$/,
              /^chopped$/,
              /finally\s+chopped/,
              /finely\s+chopped/,
              /dice\s+into\s+/,
              /cut\s+into\s+/,
              /slice\s+into\s+/,
              /chop\s+into\s+/,
              /break\s+into\s+/,
              /tear\s+into\s+/,
              /\d+\s*cm\s+pieces/,
              /\d+\s*mm\s+pieces/,
              /\d+\s*inch\s+pieces/,
              /into\s+\d+/,
              /bite\s+size/,
              /bite-size/,
              /small\s+pieces/,
              /large\s+pieces/,
              /medium\s+pieces/,
              /into\s+pieces/,
              /into\s+chunks/,
              /into\s+strips/,
              /into\s+cubes/,
              /into\s+wedges/,
              /into\s+rounds/,
              /into\s+rings/,
              /^very\s+/,
              /^extra\s+/,
              /^super\s+/,
              
              // Standalone descriptors that aren't actual ingredients
              /^fresh$/,
              /^dried$/,
              /^ground$/,
              /^chopped$/,
              /^diced$/,
              /^sliced$/,
              /^minced$/,
              /^grated$/,
              /^juiced$/,
              /^zested$/,
              /^peeled$/,
              /^trimmed$/,
              /^washed$/,
              /^rinsed$/,
              /^drained$/,
              /^cooked$/,
              /^raw$/,
              /^frozen$/,
              /^thawed$/,
              /^room\s+temperature$/,
              /^cold$/,
              /^warm$/,
              /^hot$/,
              
              // Serving and optional instructions
              /^optional$/,
              /^to\s+taste$/,
              /^for\s+serving$/,
              /^for\s+garnish$/,
              /^as\s+needed$/,
              /^if\s+desired$/,
              /^if\s+available$/,
              
              // Measurements without ingredients
              /^pinch\s*$/,
              /^dash\s*$/,
              /^splash\s*$/,
              /^drizzle\s*$/,
              /^handful\s*$/,
              /^bunch\s*$/,
              /^sprig\s*$/,
              /^leaf\s*$/,
              /^leaves\s*$/,
              
              // Basic seasonings that are too generic
              /^\s*salt\s*$/,
              /^\s*pepper\s*$/,
              /^\s*water\s*$/,
              /^\s*ice\s*$/,
              
              // Empty or very short non-meaningful entries
              /^\s*$/,
              /^.{1,2}$/,
              
              // Common cooking equipment or non-food items
              /^pan$/,
              /^pot$/,
              /^bowl$/,
              /^plate$/,
              /^dish$/,
              /^tray$/,
              /^sheet$/,
              /^foil$/,
              /^paper$/,
              /^plastic$/,
              /^wrap$/,
              /^parchment$/,
              
              // Units without ingredients
              /^\d+\s*g\s*$/,
              /^\d+\s*ml\s*$/,
              /^\d+\s*tbsp\s*$/,
              /^\d+\s*tsp\s*$/,
              /^\d+\s*cup\s*$/,
              /^\d+\s*piece\s*$/,
              /^\d+\s*clove\s*$/,
              
              // Common leftover preparation text
              /^preparation$/,
              /^method$/,
              /^ingredients$/,
              /^instructions$/,
              /^notes$/,
              /^tips$/,
              /^serving$/,
              /^yield$/,
              /^makes$/,
              /^serves$/,
              /^prep\s+time$/,
              /^cook\s+time$/,
              /^total\s+time$/
            ];

            // Skip this ingredient if it matches non-grocery patterns
            const shouldSkip = nonGroceryPatterns.some(pattern => pattern.test(cleanedIngredient));
            if (shouldSkip) {
              console.log(`🚫 Skipping non-grocery item: "${ingredient}"`);
              continue; // Skip this ingredient entirely
            }

            // Enhanced categorization logic
            if (cleanedIngredient.includes('mushroom') || cleanedIngredient.includes('champignon') || 
                cleanedIngredient.includes('chestnut')) {
              itemCategory = 'Groente & fruit';
            } else if (cleanedIngredient.includes('garlic') || cleanedIngredient.includes('onion') || 
                      cleanedIngredient.includes('tomato') || cleanedIngredient.includes('pepper') ||
                      cleanedIngredient.includes('lettuce') || cleanedIngredient.includes('spinach') ||
                      cleanedIngredient.includes('broccoli') || cleanedIngredient.includes('carrot') ||
                      cleanedIngredient.includes('cucumber') || cleanedIngredient.includes('avocado') ||
                      cleanedIngredient.includes('zucchini') || cleanedIngredient.includes('bell pepper') ||
                      cleanedIngredient.includes('red pepper') || cleanedIngredient.includes('sweet red pepper') ||
                      cleanedIngredient.includes('green pepper') || cleanedIngredient.includes('yellow pepper') ||
                      cleanedIngredient.includes('potato') || cleanedIngredient.includes('sweet potato') ||
                      cleanedIngredient.includes('bean') || cleanedIngredient.includes('lentil') ||
                      cleanedIngredient.includes('chickpea') || cleanedIngredient.includes('pea') ||
                      cleanedIngredient.includes('corn') || cleanedIngredient.includes('cabbage') ||
                      cleanedIngredient.includes('kale') || cleanedIngredient.includes('celery') ||
                      cleanedIngredient.includes('leek') || cleanedIngredient.includes('radish') ||
                      cleanedIngredient.includes('beet') || cleanedIngredient.includes('turnip') ||
                      cleanedIngredient.includes('parsnip') || cleanedIngredient.includes('squash') ||
                      cleanedIngredient.includes('pumpkin') || cleanedIngredient.includes('eggplant') ||
                      cleanedIngredient.includes('artichoke') || cleanedIngredient.includes('asparagus') ||
                      cleanedIngredient.includes('brussels sprout') || cleanedIngredient.includes('fennel') ||
                      cleanedIngredient.includes('apple') || cleanedIngredient.includes('banana') ||
                      cleanedIngredient.includes('orange') || cleanedIngredient.includes('berr') ||
                      cleanedIngredient.includes('grape') || cleanedIngredient.includes('melon') ||
                      cleanedIngredient.includes('pear') || cleanedIngredient.includes('peach') ||
                      cleanedIngredient.includes('plum') || cleanedIngredient.includes('kiwi') ||
                      cleanedIngredient.includes('mango') || cleanedIngredient.includes('pineapple') ||
                      cleanedIngredient.includes('lime') || cleanedIngredient.includes('lemon')) {
              itemCategory = 'Groente & fruit';
            } else if (cleanedIngredient.includes('milk') || cleanedIngredient.includes('cheese') ||
                      cleanedIngredient.includes('egg') || cleanedIngredient.includes('yogurt') ||
                      cleanedIngredient.includes('kefir') || cleanedIngredient.includes('cream') ||
                      cleanedIngredient.includes('butter') || cleanedIngredient.includes('cottage cheese') ||
                      cleanedIngredient.includes('feta') || cleanedIngredient.includes('mozzarella') ||
                      cleanedIngredient.includes('parmesan') || cleanedIngredient.includes('cheddar') ||
                      cleanedIngredient.includes('goat cheese') || cleanedIngredient.includes('ricotta')) {
              itemCategory = 'Zuivel & eieren';
            } else if (cleanedIngredient.includes('chicken') || cleanedIngredient.includes('beef') ||
                      cleanedIngredient.includes('fish') || cleanedIngredient.includes('meat') ||
                      cleanedIngredient.includes('tofu') || cleanedIngredient.includes('tempeh') ||
                      cleanedIngredient.includes('salmon') || cleanedIngredient.includes('tuna') ||
                      cleanedIngredient.includes('shrimp') || cleanedIngredient.includes('turkey') ||
                      cleanedIngredient.includes('pork') || cleanedIngredient.includes('ham') ||
                      cleanedIngredient.includes('bacon') || cleanedIngredient.includes('sausage')) {
              itemCategory = 'Vlees, vis & vegetarisch';
            } else if (cleanedIngredient.includes('peanut butter') || cleanedIngredient.includes('nut butter') ||
                      cleanedIngredient.includes('jam') || cleanedIngredient.includes('honey') ||
                      cleanedIngredient.includes('maple syrup') || cleanedIngredient.includes('marmalade') ||
                      cleanedIngredient.includes('nutella') || cleanedIngredient.includes('tahini')) {
              itemCategory = 'Ontbijt & beleg';
            } else if (cleanedIngredient.includes('rice') || cleanedIngredient.includes('pasta') ||
                      cleanedIngredient.includes('quinoa') || cleanedIngredient.includes('noodle') ||
                      cleanedIngredient.includes('couscous') || cleanedIngredient.includes('bulgur') ||
                      cleanedIngredient.includes('barley') || cleanedIngredient.includes('oats') ||
                      cleanedIngredient.includes('flour') || cleanedIngredient.includes('bread') ||
                      cleanedIngredient.includes('tortilla') || cleanedIngredient.includes('wrap')) {
              itemCategory = 'Rijst, pasta & wereldkeuken';
            } else if (cleanedIngredient.includes('oil') || cleanedIngredient.includes('vinegar') ||
                      cleanedIngredient.includes('soy sauce') || cleanedIngredient.includes('tamari') ||
                      cleanedIngredient.includes('sesame oil') || cleanedIngredient.includes('coconut oil') ||
                      cleanedIngredient.includes('olive oil') || cleanedIngredient.includes('balsamic') ||
                      cleanedIngredient.includes('mustard') || cleanedIngredient.includes('mayo') ||
                      cleanedIngredient.includes('ketchup') || cleanedIngredient.includes('hot sauce') ||
                      cleanedIngredient.includes('sriracha') || cleanedIngredient.includes('pesto') ||
                      cleanedIngredient.includes('curry paste') || cleanedIngredient.includes('tomato paste') ||
                      cleanedIngredient.includes('stock') || cleanedIngredient.includes('broth') ||
                      cleanedIngredient.includes('coconut milk') || cleanedIngredient.includes('almond milk') ||
                      cleanedIngredient.includes('cumin') || cleanedIngredient.includes('paprika') ||
                      cleanedIngredient.includes('turmeric') || cleanedIngredient.includes('ginger') ||
                      cleanedIngredient.includes('cinnamon') || cleanedIngredient.includes('oregano') ||
                      cleanedIngredient.includes('basil') || cleanedIngredient.includes('thyme') ||
                      cleanedIngredient.includes('rosemary') || cleanedIngredient.includes('sage') ||
                      cleanedIngredient.includes('parsley') || cleanedIngredient.includes('cilantro') ||
                      cleanedIngredient.includes('dill') || cleanedIngredient.includes('mint') ||
                      cleanedIngredient.includes('chili') || cleanedIngredient.includes('pepper') ||
                      cleanedIngredient.includes('garlic powder') || cleanedIngredient.includes('onion powder') ||
                      cleanedIngredient.includes('vanilla') || cleanedIngredient.includes('lemon juice') ||
                      cleanedIngredient.includes('lime juice') || cleanedIngredient.includes('coconut flakes') ||
                      cleanedIngredient.includes('sesame seeds') || cleanedIngredient.includes('sunflower seeds') ||
                      cleanedIngredient.includes('pumpkin seeds') || cleanedIngredient.includes('chia seeds') ||
                      cleanedIngredient.includes('flaxseed') || cleanedIngredient.includes('hemp hearts') ||
                      cleanedIngredient.includes('nutritional yeast') || cleanedIngredient.includes('protein powder')) {
              itemCategory = 'Conserven & sauzen';
            } else if (cleanedIngredient.includes('nuts') || cleanedIngredient.includes('almond') ||
                      cleanedIngredient.includes('walnut') || cleanedIngredient.includes('pecan') ||
                      cleanedIngredient.includes('cashew') || cleanedIngredient.includes('pistachio') ||
                      cleanedIngredient.includes('hazelnut') || cleanedIngredient.includes('pine nuts') ||
                      cleanedIngredient.includes('macadamia') || cleanedIngredient.includes('brazil nuts')) {
              itemCategory = 'Snacks & snoep';
            }

            // Clean the display name too
            const cleanDisplayName = ingredient
              .replace(/\([^)]*\)/g, '') // Remove parentheses and contents
              .replace(/,.*$/g, '') // Remove everything after comma
              .replace(/\s+/g, ' ') // Normalize spaces
              .trim();

            consolidatedItems.set(manualKey, {
              productId: `manual_${Date.now()}`,
              productName: cleanDisplayName,
              quantity: 1,
              price: 0,
              imageUrl: '/placeholder-ingredient.jpg',
              unit: '1 stuk',
              category: itemCategory,
              found: false
            });
          }
        }
      } catch (error) {
        console.error(`Error processing ingredient "${ingredient}":`, error);
      }
    }

    // Convert Map back to array
    const shoppingItems = Array.from(consolidatedItems.values());

    const shoppingList: ShoppingListExport = {
      title: `Meal Plan - ${new Date().toLocaleDateString('nl-NL')}`,
      items: shoppingItems,
      totalPrice: Math.round(totalPrice * 100) / 100,
      totalItems: shoppingItems.length,
      generatedAt: new Date().toISOString(),
      deepLink: this.generateAHDeepLink(shoppingItems)
    };

    console.log(`✅ Generated shopping list with ${shoppingList.totalItems} items (€${shoppingList.totalPrice})`);
    return shoppingList;
  }

  /**
   * Generate deep link to Albert Heijn app with shopping list
   */
  private generateAHDeepLink(items: AHShoppingListItem[]): string {
    // Albert Heijn app deep link format (based on reverse engineering)
    const baseDeepLink = 'ah://';
    
    // For sharing, we'll create a formatted list
    const itemList = items
      .map(item => `${item.quantity}x ${item.productName}`)
      .join('\n');
    
    // Create a shareable format
    const shareUrl = `${this.baseUrl}/boodschappenlijst?items=${encodeURIComponent(itemList)}`;
    
    return shareUrl;
  }

  /**
   * Export shopping list in various formats
   */
  async exportShoppingList(shoppingList: ShoppingListExport, format: 'json' | 'text' | 'csv' = 'json') {
    switch (format) {
      case 'text':
        return this.exportAsText(shoppingList);
      case 'csv':
        return this.exportAsCsv(shoppingList);
      default:
        return JSON.stringify(shoppingList, null, 2);
    }
  }

  private exportAsText(shoppingList: ShoppingListExport): string {
    let text = `🛒 ${shoppingList.title}\n`;
    text += `📅 ${new Date(shoppingList.generatedAt).toLocaleDateString('nl-NL')}\n\n`;
    
    const categories = Array.from(new Set(shoppingList.items.map(item => item.category)));
    
    for (const category of categories) {
      text += `📦 ${category}\n`;
      const categoryItems = shoppingList.items.filter(item => item.category === category);
      
      for (const item of categoryItems) {
        const status = item.found ? '✅' : '❓';
        const price = item.price > 0 ? ` (€${item.price})` : '';
        text += `  ${status} ${item.quantity}x ${item.productName}${price}\n`;
      }
      text += '\n';
    }
    
    text += `💰 Totaal: €${shoppingList.totalPrice}\n`;
    text += `📱 Open in Albert Heijn app: ${shoppingList.deepLink}`;
    
    return text;
  }

  private exportAsCsv(shoppingList: ShoppingListExport): string {
    let csv = 'Product,Quantity,Unit,Price,Category,Found,Image\n';
    
    for (const item of shoppingList.items) {
      csv += `"${item.productName}",${item.quantity},"${item.unit}",${item.price},"${item.category}",${item.found},"${item.imageUrl}"\n`;
    }
    
    return csv;
  }

  /**
   * Check product availability and pricing
   */
  async checkProductAvailability(productIds: string[]): Promise<Map<string, boolean>> {
    const availability = new Map<string, boolean>();
    
    for (const productId of productIds) {
      // In a real implementation, this would check AH's availability API
      availability.set(productId, Math.random() > 0.1); // 90% availability rate
    }
    
    return availability;
  }

  /**
   * Generate shopping list optimized for Albert Heijn store layout
   */
  async optimizeShoppingRoute(items: AHShoppingListItem[]): Promise<AHShoppingListItem[]> {
    // Albert Heijn typical store layout order
    const categoryOrder = [
      'Groente & fruit',
      'Vlees, vis & vegetarisch',
      'Zuivel & eieren',
      'Brood & gebak',
      'Ontbijt & beleg',
      'Conserven & sauzen',
      'Rijst, pasta & wereldkeuken',
      'Snacks & snoep',
      'Dranken',
      'Diepvries',
      'Verzorging & schoonmaak',
      'Te zoeken'
    ];

    return items.sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a.category);
      const bIndex = categoryOrder.indexOf(b.category);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
  }

  /**
   * Create shopping list with Dutch ingredient mappings
   */
  mapIngredientsToAH(ingredients: string[]): string[] {
    const dutchMappings: Record<string, string> = {
      'chicken': 'kip',
      'beef': 'rundvlees',
      'pork': 'varkensvlees',
      'fish': 'vis',
      'milk': 'melk',
      'eggs': 'eieren',
      'cheese': 'kaas',
      'bread': 'brood',
      'butter': 'boter',
      'tomatoes': 'tomaten',
      'onions': 'uien',
      'potatoes': 'aardappelen',
      'carrots': 'wortelen (3 stuks)',
      'apples': 'appels',
      'bananas': 'bananen',
      'kiwi': 'kiwi (4 stuks)',
      'rice': 'rijst',
      'pasta': 'pasta',
      'olive oil': 'olijfolie',
      'salt': 'zout',
      'pepper': 'peper'
    };

    return ingredients.map(ingredient => {
      const lowerIngredient = ingredient.toLowerCase();
      return dutchMappings[lowerIngredient] || ingredient;
    });
  }
}

export const albertHeijnService = new AlbertHeijnService();
export type { AHProduct, AHShoppingListItem, ShoppingListExport };