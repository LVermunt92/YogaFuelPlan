import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Calendar, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface FridgeItem {
  id: number;
  ingredient: string;
  quantity: number;
  unit: string;
  expirationDate: string | null;
  priority: 'low' | 'medium' | 'high';
  category: string | null;
  notes: string | null;
  isUsed: boolean;
  createdAt: string;
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800'
};

const categoryOptions = [
  'Vegetables',
  'Fruits', 
  'Proteins',
  'Grains, Pasta & Canned Goods',
  'Dairy & Eggs',
  'Nuts, Seeds & Spreads',
  'Herbs & Spices',
  'Condiments & Oils',
  'Other'
];

export default function FridgeInventory() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [includeUsed, setIncludeUsed] = useState(false);
  const [newItem, setNewItem] = useState<{
    ingredient: string;
    quantity: number;
    unit: string;
    expirationDate: string;
    priority: 'low' | 'medium' | 'high';
    category: string;
    notes: string;
  }>({
    ingredient: '',
    quantity: 1,
    unit: '',
    expirationDate: '',
    priority: 'medium',
    category: '',
    notes: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch fridge items
  const { data: fridgeItems = [], isLoading } = useQuery<FridgeItem[]>({
    queryKey: ['/api/fridge', { includeUsed }],
    queryFn: async () => {
      const response = await apiRequest(`/api/fridge?includeUsed=${includeUsed}`);
      return response as FridgeItem[];
    }
  });

  // Add fridge item mutation
  const addItemMutation = useMutation({
    mutationFn: (item: typeof newItem) => apiRequest('/api/fridge', 'POST', {
      ...item,
      quantity: Number(item.quantity),
      expirationDate: item.expirationDate || undefined
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fridge'] });
      setShowAddDialog(false);
      setNewItem({
        ingredient: '',
        quantity: 1,
        unit: '',
        expirationDate: '',
        priority: 'medium',
        category: '',
        notes: ''
      });
      toast({
        title: 'Item Added',
        description: 'Fridge item has been added successfully.'
      });
    }
  });

  // Delete fridge item mutation
  const deleteItemMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/fridge/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fridge'] });
      toast({
        title: 'Item Deleted',
        description: 'Fridge item has been removed.'
      });
    }
  });

  // Mark item as used mutation
  const markUsedMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/fridge/${id}/use`, 'PATCH'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fridge'] });
      toast({
        title: 'Item Marked as Used',
        description: 'The item has been marked as used in a meal.'
      });
    }
  });

  const handleAddItem = () => {
    if (!newItem.ingredient || !newItem.unit) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in ingredient name and unit.',
        variant: 'destructive'
      });
      return;
    }
    addItemMutation.mutate(newItem);
  };

  const getExpirationStatus = (expirationDate: string | null) => {
    if (!expirationDate) return null;
    
    const expiry = new Date(expirationDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 0) return { status: 'expired', color: 'bg-red-500 text-white' };
    if (daysUntilExpiry <= 3) return { status: 'expiring', color: 'bg-orange-500 text-white' };
    if (daysUntilExpiry <= 7) return { status: 'soon', color: 'bg-yellow-500 text-white' };
    return { status: 'fresh', color: 'bg-green-500 text-white' };
  };

  // Group items by category
  const groupedItems = fridgeItems.reduce((acc: Record<string, FridgeItem[]>, item: FridgeItem) => {
    const category = item.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading fridge inventory...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Fridge Inventory</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Track ingredients you already have to optimize your meal planning
          </p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Fridge Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="ingredient">Ingredient</Label>
                <Input
                  id="ingredient"
                  value={newItem.ingredient}
                  onChange={(e) => setNewItem(prev => ({ ...prev, ingredient: e.target.value }))}
                  placeholder="e.g., Cauliflower rice"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 1 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    value={newItem.unit}
                    onChange={(e) => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="e.g., cups, kg, pieces"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={newItem.category} onValueChange={(value) => setNewItem(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={newItem.priority} onValueChange={(value: 'low' | 'medium' | 'high') => setNewItem(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Use when convenient</SelectItem>
                    <SelectItem value="medium">Medium - Use soon</SelectItem>
                    <SelectItem value="high">High - Use first</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="expirationDate">Expiration Date (Optional)</Label>
                <Input
                  id="expirationDate"
                  type="date"
                  value={newItem.expirationDate}
                  onChange={(e) => setNewItem(prev => ({ ...prev, expirationDate: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={newItem.notes}
                  onChange={(e) => setNewItem(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional notes..."
                  rows={2}
                />
              </div>

              <Button 
                onClick={handleAddItem} 
                className="w-full"
                disabled={addItemMutation.isPending}
              >
                {addItemMutation.isPending ? 'Adding...' : 'Add Item'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Controls */}
      <div className="mb-6">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeUsed}
            onChange={(e) => setIncludeUsed(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Show used items
          </span>
        </label>
      </div>

      {/* Items Display */}
      {Object.keys(groupedItems).length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-300">
              No items in your fridge inventory yet. Add some ingredients to get started!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([category, items]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-lg">{category}</CardTitle>
                <CardDescription>{items.length} item{items.length !== 1 ? 's' : ''}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((item: FridgeItem) => {
                    const expiryStatus = getExpirationStatus(item.expirationDate);
                    
                    return (
                      <div key={item.id} className={`p-4 border rounded-lg ${item.isUsed ? 'opacity-60 bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'}`}>
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {item.ingredient}
                          </h3>
                          <div className="flex gap-1">
                            {!item.isUsed && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => markUsedMutation.mutate(item.id)}
                                className="h-8 w-8 p-0"
                                title="Mark as used"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteItemMutation.mutate(item.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              title="Delete item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                          {item.quantity} {item.unit}
                        </p>
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={priorityColors[item.priority as keyof typeof priorityColors]}>
                            {item.priority} priority
                          </Badge>
                          
                          {item.isUsed && (
                            <Badge className="bg-green-100 text-green-800">
                              Used
                            </Badge>
                          )}
                          
                          {expiryStatus && (
                            <Badge className={expiryStatus.color}>
                              <Calendar className="h-3 w-3 mr-1" />
                              {expiryStatus.status === 'expired' ? 'Expired' :
                               expiryStatus.status === 'expiring' ? 'Expires today' :
                               expiryStatus.status === 'soon' ? 'Expires soon' : 'Fresh'}
                            </Badge>
                          )}
                        </div>
                        
                        {item.expirationDate && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Expires: {new Date(item.expirationDate).toLocaleDateString()}
                          </p>
                        )}
                        
                        {item.notes && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 italic">
                            {item.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}