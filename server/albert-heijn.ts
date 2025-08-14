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
      const mockProducts: AHProduct[] = [
        {
          id: `ah_${Date.now()}`,
          name: query.charAt(0).toUpperCase() + query.slice(1),
          brand: 'AH',
          price: 2.99,
          unit: '1 stuk',
          imageUrl: '/placeholder-product.jpg',
          category: 'Groente & fruit',
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
    
    const shoppingItems: AHShoppingListItem[] = [];
    let totalPrice = 0;

    for (const ingredient of ingredients) {
      try {
        const products = await this.searchProduct(ingredient);
        
        if (products.length > 0) {
          const product = products[0]; // Take first match
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
          
          shoppingItems.push(item);
          totalPrice += product.price;
        } else {
          // Add as manual item if not found
          shoppingItems.push({
            productId: `manual_${Date.now()}`,
            productName: ingredient,
            quantity: 1,
            price: 0,
            imageUrl: '/placeholder-ingredient.jpg',
            unit: '1 stuk',
            category: 'Te zoeken',
            found: false
          });
        }
      } catch (error) {
        console.error(`Error processing ingredient "${ingredient}":`, error);
      }
    }

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
      'carrots': 'wortelen',
      'apples': 'appels',
      'bananas': 'bananen',
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