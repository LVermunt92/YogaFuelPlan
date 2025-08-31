import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, ExternalLink, ShoppingCart, Search, Check, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AHProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  unit: string;
  imageUrl: string;
  category: string;
  availability: boolean;
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
  deepLink: string;
}

interface AlbertHeijnIntegrationProps {
  ingredients: string[];
  mealPlanId?: number;
}

export function AlbertHeijnIntegration({ ingredients, mealPlanId }: AlbertHeijnIntegrationProps) {
  const [shoppingList, setShoppingList] = useState<ShoppingListExport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateShoppingList = async () => {
    if (!ingredients.length) {
      setError('No ingredients provided');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await apiRequest('POST', '/api/shopping-list/albert-heijn', {
        ingredients,
        mealPlanId
      });

      const data = await response.json();
      setShoppingList(data.shoppingList);
    } catch (error) {
      console.error('Error generating Albert Heijn shopping list:', error);
      setError('Failed to generate shopping list. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadShoppingList = async (format: 'json' | 'text' | 'csv') => {
    if (!ingredients.length) return;

    try {
      const url = `/api/shopping-list/albert-heijn/${format}?ingredients=${encodeURIComponent(ingredients.join(','))}`;
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `albert-heijn-shopping-list.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading shopping list:', error);
    }
  };

  const openInAlbertHeijn = () => {
    if (shoppingList?.deepLink) {
      window.open(shoppingList.deepLink, '_blank');
    }
  };

  const categoryIcons: Record<string, string> = {
    'Groente & fruit': '🥕',
    'Vlees, vis & vegetarisch': '🥩',
    'Zuivel & eieren': '🥛',
    'Brood & gebak': '🍞',
    'Ontbijt & beleg': '🥜',
    'Conserven & sauzen': '🥫',
    'Rijst, pasta & wereldkeuken': '🍝',
    'Snacks & snoep': '🍿',
    'Dranken': '🥤',
    'Diepvries': '❄️',
    'Verzorging & schoonmaak': '🧴',
    'Te zoeken': '🔍'
  };

  if (!ingredients.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Albert Heijn Integration
          </CardTitle>
          <CardDescription>
            Generate your shopping list for Albert Heijn supermarket
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Construction Notice */}
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center justify-center w-5 h-5 text-amber-600 dark:text-amber-400">
              🚧
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Under Construction
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-300">
                Albert Heijn integration is currently being improved. Some features may not work as expected.
              </div>
            </div>
          </div>
          <p className="text-muted-foreground">No ingredients available to create shopping list.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Albert Heijn Shopping List
        </CardTitle>
        <CardDescription>
          Generate and export your shopping list optimized for Albert Heijn supermarket
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Construction Notice */}
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-center justify-center w-5 h-5 text-amber-600 dark:text-amber-400">
            🚧
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Under Construction
            </div>
            <div className="text-xs text-amber-700 dark:text-amber-300">
              Albert Heijn integration is currently being improved. Some features may not work as expected.
            </div>
          </div>
        </div>
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </div>
        )}

        {!shoppingList ? (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Ready to convert {ingredients.length} ingredients into an optimized Albert Heijn shopping list
            </div>
            
            <Button 
              onClick={generateShoppingList}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                  Generating Shopping List...
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Generate Albert Heijn Shopping List
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Shopping List Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{shoppingList.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {shoppingList.totalItems} items • €{shoppingList.totalPrice.toFixed(2)}
                </p>
              </div>
              <Button
                onClick={openInAlbertHeijn}
                variant="outline"
                size="sm"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in AH
              </Button>
            </div>

            <Separator />

            {/* Shopping List Items by Category */}
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {Array.from(new Set(shoppingList.items.map(item => item.category))).map(category => {
                const categoryItems = shoppingList.items.filter(item => item.category === category);
                const categoryIcon = categoryIcons[category] || '📦';
                
                return (
                  <div key={category} className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <span>{categoryIcon}</span>
                      {category}
                    </h4>
                    
                    <div className="grid gap-2">
                      {categoryItems.map((item, index) => (
                        <div key={`${item.productId}-${index}`} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                          <div className="flex items-center gap-3">
                            {item.found ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Search className="h-4 w-4 text-orange-600" />
                            )}
                            
                            <div>
                              <div className="font-medium text-sm">{item.productName}</div>
                              <div className="text-xs text-muted-foreground">
                                {item.quantity}x {item.unit}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            {item.price > 0 ? (
                              <div className="font-medium text-sm">€{item.price.toFixed(2)}</div>
                            ) : (
                              <Badge variant="outline" className="text-xs">Manual</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <Separator />

            {/* Export Options */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Export Shopping List</h4>
              <div className="flex gap-2">
                <Button
                  onClick={() => downloadShoppingList('text')}
                  variant="outline"
                  size="sm"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Text
                </Button>
                
                <Button
                  onClick={() => downloadShoppingList('csv')}
                  variant="outline"
                  size="sm"
                >
                  <Download className="mr-2 h-4 w-4" />
                  CSV
                </Button>
                
                <Button
                  onClick={() => downloadShoppingList('json')}
                  variant="outline"
                  size="sm"
                >
                  <Download className="mr-2 h-4 w-4" />
                  JSON
                </Button>
              </div>
            </div>

            {/* Generate New List */}
            <Button
              onClick={() => setShoppingList(null)}
              variant="outline"
              className="w-full"
            >
              Generate New List
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}