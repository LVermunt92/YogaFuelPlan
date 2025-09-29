import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Settings, Users, Calculator, Database, Activity, Target, ChefHat, Save, Edit, Trash2, Plus, AlertTriangle, Search, Filter, Download, Upload, Eye } from "lucide-react";
import { useTranslations } from "@/lib/translations";
import { useLanguage } from "@/contexts/LanguageContext";

interface NutritionConfig {
  id: string;
  category: string;
  subcategory: string;
  parameter: string;
  value: number;
  unit: string;
  description: string;
  source?: string;
  lastUpdated: string;
  updatedBy: string;
}

interface SystemStats {
  totalUsers: number;
  totalMealPlans: number;
  totalRecipes: number;
  activeUsers7Days: number;
  avgProteinTarget: number;
  popularActivityLevels: { level: string; count: number }[];
  recentGenerations: number;
}

interface Recipe {
  id?: string;
  name: string;
  portion: string;
  category: 'breakfast' | 'lunch' | 'dinner';
  tags: string[];
  ingredients: string[];
  nutrition: {
    protein: number;
    prepTime: number;
    calories: number;
    carbohydrates: number;
    fats: number;
    fiber: number;
    sugar: number;
    sodium: number;
    costEuros?: number;
  };
  wholeFoodLevel: 'minimal' | 'moderate' | 'high';
  vegetableContent: {
    servings: number;
    vegetables: string[];
    benefits: string[];
  };
  recipeBenefits?: string[];
  recipe?: {
    instructions: string[];
    tips?: string[];
    notes?: string;
  };
  createdAt?: Date;
  active?: boolean;
}

interface RecipeSearchResponse {
  recipes: Recipe[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface RecipeStats {
  total: number;
  byCategory: {
    breakfast: number;
    lunch: number;
    dinner: number;
  };
  byTags: Record<string, number>;
  proteinRange: {
    min: number;
    max: number;
    average: number;
  };
  modifications: number;
  deleted: number;
}

interface AdminUser {
  id: number;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  activityLevel: string | null;
  dietaryTags: string[] | null;
  proteinTarget: number | null;
  weight: number | null;
  goalWeight: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface UsersResponse {
  users: AdminUser[];
}

interface ShoppingListName {
  id: number;
  name: string;
  category: string;
  defaultUnit: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface IngredientMapping {
  id: number;
  originalIngredient: string;
  normalizedIngredient: string;
  shoppingListNameId: number | null;
  quantity: number | null;
  unit: string | null;
  isManualOverride: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
  shoppingListName?: ShoppingListName;
}

interface IngredientAnalysis {
  originalIngredient: string;
  normalizedIngredient: string;
  extractedQuantity: number;
  extractedUnit: string;
  hasMapping: boolean;
  mappingId?: number;
  shoppingListNameId?: number;
  isManualOverride?: boolean;
  recipeName: string;
  mealType: string;
}

interface IngredientAnalysisResponse {
  mealPlan: {
    id: number;
    weekStart: string;
    totalMeals: number;
  };
  ingredientAnalysis: IngredientAnalysis[];
  totalIngredients: number;
  mappedIngredients: number;
  unmappedIngredients: number;
}

// Ingredient Mapping Manager Component
function IngredientMappingManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("mappings");
  const [editingMapping, setEditingMapping] = useState<IngredientMapping | null>(null);
  const [editingShoppingListName, setEditingShoppingListName] = useState<ShoppingListName | null>(null);
  const [mealPlanId, setMealPlanId] = useState("");
  const [analysisResult, setAnalysisResult] = useState<IngredientAnalysisResponse | null>(null);

  // Fetch shopping list names
  const { data: shoppingListNames = [], isLoading: shoppingListNamesLoading } = useQuery<ShoppingListName[]>({
    queryKey: ['/api/admin/shopping-list-names'],
    queryFn: () => fetch('/api/admin/shopping-list-names').then(res => res.json()),
  });

  // Fetch ingredient mappings
  const { data: ingredientMappings = [], isLoading: mappingsLoading } = useQuery<IngredientMapping[]>({
    queryKey: ['/api/admin/ingredient-mappings'],
    queryFn: () => fetch('/api/admin/ingredient-mappings').then(res => res.json()),
  });

  // Create shopping list name
  const createShoppingListNameMutation = useMutation({
    mutationFn: async (data: { name: string; category: string; defaultUnit: string }) => {
      const response = await apiRequest('POST', '/api/admin/shopping-list-names', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shopping-list-names'] });
      toast({ title: "Success", description: "Shopping list name created successfully" });
    },
  });

  // Update shopping list name
  const updateShoppingListNameMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ShoppingListName> }) => {
      const response = await apiRequest('PUT', `/api/admin/shopping-list-names/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shopping-list-names'] });
      setEditingShoppingListName(null);
      toast({ title: "Success", description: "Shopping list name updated successfully" });
    },
  });

  // Delete shopping list name
  const deleteShoppingListNameMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/admin/shopping-list-names/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shopping-list-names'] });
      toast({ title: "Success", description: "Shopping list name deleted successfully" });
    },
  });

  // Create ingredient mapping
  const createIngredientMappingMutation = useMutation({
    mutationFn: async (data: {
      originalIngredient: string;
      normalizedIngredient: string;
      shoppingListNameId?: number;
      quantity?: number;
      unit?: string;
      isManualOverride: boolean;
    }) => {
      const response = await apiRequest('POST', '/api/admin/ingredient-mappings', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ingredient-mappings'] });
      toast({ title: "Success", description: "Ingredient mapping created successfully" });
    },
  });

  // Update ingredient mapping
  const updateIngredientMappingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<IngredientMapping> }) => {
      const response = await apiRequest('PUT', `/api/admin/ingredient-mappings/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ingredient-mappings'] });
      setEditingMapping(null);
      toast({ title: "Success", description: "Ingredient mapping updated successfully" });
    },
  });

  // Delete ingredient mapping
  const deleteIngredientMappingMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/admin/ingredient-mappings/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ingredient-mappings'] });
      toast({ title: "Success", description: "Ingredient mapping deleted successfully" });
    },
  });

  // Analyze ingredients
  const analyzeIngredientsMutation = useMutation({
    mutationFn: async (mealPlanId: string) => {
      const response = await apiRequest('POST', '/api/admin/analyze-ingredients', { mealPlanId: parseInt(mealPlanId) });
      return response.json();
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      toast({ title: "Success", description: "Ingredient analysis completed" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Ingredient Mapping Management</h2>
          <p className="text-gray-600">Control how recipe ingredients are processed into grocery list items</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="mappings">Ingredient Mappings</TabsTrigger>
          <TabsTrigger value="shopping-names">Shopping List Names</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        {/* Ingredient Mappings Tab */}
        <TabsContent value="mappings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Ingredient Mappings ({ingredientMappings.length})</span>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Mapping
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Ingredient Mapping</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Original Ingredient</Label>
                        <Input placeholder="e.g., '200g chicken breast'" data-testid="input-original-ingredient" />
                      </div>
                      <div>
                        <Label>Normalized Ingredient</Label>
                        <Input placeholder="e.g., 'chicken breast'" data-testid="input-normalized-ingredient" />
                      </div>
                      <div>
                        <Label>Shopping List Name</Label>
                        <Select>
                          <SelectTrigger data-testid="select-shopping-list-name">
                            <SelectValue placeholder="Select shopping list name" />
                          </SelectTrigger>
                          <SelectContent>
                            {shoppingListNames.map((name) => (
                              <SelectItem key={name.id} value={name.id.toString()}>
                                {name.name} ({name.category})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="manual-override" data-testid="checkbox-manual-override" />
                        <Label htmlFor="manual-override">Manual Override</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline">Cancel</Button>
                      <Button>Create Mapping</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mappingsLoading ? (
                <div>Loading mappings...</div>
              ) : (
                <div className="space-y-2">
                  {ingredientMappings.map((mapping) => (
                    <div key={mapping.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex-1">
                        <div className="font-medium">{mapping.originalIngredient}</div>
                        <div className="text-sm text-gray-600">→ {mapping.normalizedIngredient}</div>
                        {mapping.shoppingListName && (
                          <div className="text-xs text-blue-600">
                            Maps to: {mapping.shoppingListName.name} ({mapping.shoppingListName.category})
                          </div>
                        )}
                        {mapping.isManualOverride && (
                          <Badge variant="secondary" className="text-xs">Manual Override</Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingMapping(mapping)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => deleteIngredientMappingMutation.mutate(mapping.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {ingredientMappings.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      No ingredient mappings found. Create your first mapping to get started.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shopping List Names Tab */}
        <TabsContent value="shopping-names" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Shopping List Names ({shoppingListNames.length})</span>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Name
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Shopping List Name</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Name</Label>
                        <Input placeholder="e.g., 'Chicken Breast'" data-testid="input-shopping-list-name" />
                      </div>
                      <div>
                        <Label>Category</Label>
                        <Select>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="meat">Meat & Fish</SelectItem>
                            <SelectItem value="vegetables">Vegetables</SelectItem>
                            <SelectItem value="fruits">Fruits</SelectItem>
                            <SelectItem value="grains">Grains & Cereals</SelectItem>
                            <SelectItem value="dairy">Dairy</SelectItem>
                            <SelectItem value="pantry">Pantry Items</SelectItem>
                            <SelectItem value="spices">Spices & Herbs</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Default Unit</Label>
                        <Input placeholder="e.g., 'g', 'kg', 'pieces'" data-testid="input-default-unit" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline">Cancel</Button>
                      <Button>Create Name</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shoppingListNamesLoading ? (
                <div>Loading shopping list names...</div>
              ) : (
                <div className="space-y-2">
                  {shoppingListNames.map((name) => (
                    <div key={name.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex-1">
                        <div className="font-medium">{name.name}</div>
                        <div className="text-sm text-gray-600">
                          {name.category} • Default unit: {name.defaultUnit}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingShoppingListName(name)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => deleteShoppingListNameMutation.mutate(name.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {shoppingListNames.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      No shopping list names found. Create your first name to get started.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ingredient Analysis</CardTitle>
              <CardDescription>
                Analyze how ingredients from a meal plan would be processed into grocery list items
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Input
                  placeholder="Enter meal plan ID"
                  value={mealPlanId}
                  onChange={(e) => setMealPlanId(e.target.value)}
                  data-testid="input-meal-plan-id"
                />
                <Button 
                  onClick={() => analyzeIngredientsMutation.mutate(mealPlanId)}
                  disabled={!mealPlanId || analyzeIngredientsMutation.isPending}
                  data-testid="button-analyze-ingredients"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Analyze
                </Button>
              </div>

              {analysisResult && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{analysisResult.totalIngredients}</div>
                        <p className="text-xs text-gray-600">Total Ingredients</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-green-600">{analysisResult.mappedIngredients}</div>
                        <p className="text-xs text-gray-600">Mapped</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-red-600">{analysisResult.unmappedIngredients}</div>
                        <p className="text-xs text-gray-600">Unmapped</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{analysisResult.mealPlan.totalMeals}</div>
                        <p className="text-xs text-gray-600">Meals</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-2">
                    {analysisResult.ingredientAnalysis.map((ingredient, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex-1">
                          <div className="font-medium">{ingredient.originalIngredient}</div>
                          <div className="text-sm text-gray-600">
                            {ingredient.recipeName} • {ingredient.mealType}
                          </div>
                          <div className="text-xs text-gray-500">
                            Normalized: {ingredient.normalizedIngredient}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {ingredient.hasMapping ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              Mapped
                            </Badge>
                          ) : (
                            <>
                              <Badge variant="destructive">Unmapped</Badge>
                              <Button size="sm" variant="outline">
                                <Plus className="h-4 w-4 mr-1" />
                                Map
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Access denied component for non-admin users
function AccessDenied() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-sm mx-auto">
        <CardContent className="pt-6 pb-6 text-center">
          <AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-lg sm:text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-600 text-sm sm:text-base">Admin privileges required to access this panel.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Main admin panel component
function AdminPanelMain() {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const t = useTranslations(language);

  const [editingConfig, setEditingConfig] = useState<NutritionConfig | null>(null);
  const [newConfig, setNewConfig] = useState({
    category: "",
    subcategory: "",
    parameter: "",
    value: 0,
    unit: "",
    description: "",
    source: ""
  });

  // Recipe management state
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all-categories");
  const [tagsFilter, setTagsFilter] = useState("all-tags");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecipes, setSelectedRecipes] = useState<Set<string>>(new Set());
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);
  const [showCreateRecipe, setShowCreateRecipe] = useState(false);

  // Fetch system statistics
  const { data: systemStats, isLoading: statsLoading } = useQuery<SystemStats>({
    queryKey: ['/api/admin/stats'],
    queryFn: () => fetch('/api/admin/stats').then(res => res.json()),
  });

  // Fetch nutrition configuration
  const { data: nutritionConfigs = [], isLoading: configLoading } = useQuery<NutritionConfig[]>({
    queryKey: ['/api/admin/nutrition-config'],
    queryFn: () => fetch('/api/admin/nutrition-config').then(res => res.json()),
  });

  // Fetch recipes with search and filters
  const { data: recipeData, isLoading: recipesLoading, refetch: refetchRecipes } = useQuery<RecipeSearchResponse>({
    queryKey: ['/api/recipes', { searchTerm, categoryFilter, tagsFilter, page: currentPage }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });
      
      if (searchTerm) params.set('search', searchTerm);
      if (categoryFilter && categoryFilter !== 'all-categories') params.set('category', categoryFilter);
      if (tagsFilter && tagsFilter !== 'all-tags') params.set('tags', tagsFilter);
      
      const response = await fetch(`/api/recipes?${params}`);
      if (!response.ok) throw new Error('Failed to fetch recipes');
      return response.json();
    },
  });

  // Fetch recipe statistics
  const { data: recipeStats, isLoading: recipeStatsLoading } = useQuery<RecipeStats>({
    queryKey: ['/api/recipes/stats'],
    queryFn: async () => {
      const response = await fetch('/api/recipes/stats');
      if (!response.ok) throw new Error('Failed to fetch recipe stats');
      return response.json();
    },
  });

  // Fetch all users
  const { data: usersData, isLoading: usersLoading } = useQuery<UsersResponse>({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });

  // Update nutrition configuration
  const updateConfigMutation = useMutation({
    mutationFn: async (config: NutritionConfig) => {
      const response = await apiRequest('PUT', `/api/admin/nutrition-config/${config.id}`, config);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/nutrition-config'] });
      setEditingConfig(null);
      toast({ title: "Success", description: "Configuration updated successfully" });
    },
  });

  // Add new nutrition configuration
  const addConfigMutation = useMutation({
    mutationFn: async (config: Omit<NutritionConfig, 'id' | 'lastUpdated' | 'updatedBy'>) => {
      const response = await apiRequest('POST', '/api/admin/nutrition-config', {
        ...config,
        updatedBy: authUser?.username || 'admin'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/nutrition-config'] });
      setNewConfig({
        category: "", subcategory: "", parameter: "", value: 0, unit: "", description: "", source: ""
      });
      toast({ title: "Success", description: "Configuration added successfully" });
    },
  });

  // Delete nutrition configuration
  const deleteConfigMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/nutrition-config/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/nutrition-config'] });
      toast({ title: "Success", description: "Configuration deleted successfully" });
    },
  });

  // Recipe management mutations
  const updateRecipeMutation = useMutation({
    mutationFn: async (recipe: Recipe) => {
      const response = await apiRequest('PUT', `/api/recipes/${recipe.id}`, recipe);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recipes/stats'] });
      setEditingRecipe(null);
      toast({ title: "Success", description: "Recipe updated successfully" });
    },
  });

  const createRecipeMutation = useMutation({
    mutationFn: async (recipe: Omit<Recipe, 'id'>) => {
      const response = await apiRequest('POST', '/api/recipes', recipe);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recipes/stats'] });
      setShowCreateRecipe(false);
      toast({ title: "Success", description: "Recipe created successfully" });
    },
  });

  const deleteRecipeMutation = useMutation({
    mutationFn: async (recipeId: string) => {
      const response = await apiRequest('DELETE', `/api/recipes/${recipeId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recipes/stats'] });
      toast({ title: "Success", description: "Recipe deleted successfully" });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ recipeIds, updates }: { recipeIds: string[], updates: Partial<Recipe> }) => {
      const response = await apiRequest('POST', '/api/recipes/bulk-update', { recipeIds, updates });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recipes/stats'] });
      setSelectedRecipes(new Set());
      toast({ title: "Success", description: "Recipes updated successfully" });
    },
  });

  const groupedConfigs = nutritionConfigs.reduce((acc, config) => {
    if (!acc[config.category]) acc[config.category] = {};
    if (!acc[config.category][config.subcategory]) acc[config.category][config.subcategory] = [];
    acc[config.category][config.subcategory].push(config);
    return acc;
  }, {} as Record<string, Record<string, NutritionConfig[]>>);

  const proteinLookupTable = [
    { activity: "Sedentary", mobility: 1.0, endurance: 1.2, strength: 1.4, mixed: 1.4 },
    { activity: "Light", mobility: 1.2, endurance: 1.4, strength: 1.6, mixed: 1.6 },
    { activity: "Moderate", mobility: 1.4, endurance: 1.6, strength: 1.8, mixed: 1.9 },
    { activity: "High", mobility: 1.5, endurance: 1.8, strength: 2.0, mixed: 2.1 },
    { activity: "Athlete", mobility: 1.6, endurance: 2.0, strength: 2.2, mixed: 2.3 },
  ];

  const palValues = [
    { activity: "Sedentary", pal: 1.35 },
    { activity: "Light", pal: 1.55 },
    { activity: "Moderate", pal: 1.75 },
    { activity: "High", pal: 1.95 },
    { activity: "Athlete", pal: 2.20 },
  ];

  const carbTargets = [
    { training: "Mobility", range: "2-3 g/kg", midpoint: 2.5 },
    { training: "Endurance", range: "5-8 g/kg", midpoint: 6.5 },
    { training: "Strength", range: "3-5 g/kg", midpoint: 4.0 },
    { training: "Mixed", range: "4-6 g/kg", midpoint: 5.0 },
  ];

  const fatPercentages = [
    { training: "Mobility", percentage: 32.5 },
    { training: "Endurance", percentage: 25.0 },
    { training: "Strength", percentage: 30.0 },
    { training: "Mixed", percentage: 27.5 },
  ];

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Admin Panel</h1>
          <p className="text-gray-600 text-sm sm:text-base">Manage nutrition calculations, system settings, and monitor application performance</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-1 h-auto p-1">
            <TabsTrigger value="overview" className="text-xs sm:text-sm py-2 px-2">Overview</TabsTrigger>
            <TabsTrigger value="nutrition" className="text-xs sm:text-sm py-2 px-2">Nutrition</TabsTrigger>
            <TabsTrigger value="config" className="text-xs sm:text-sm py-2 px-2">Config</TabsTrigger>
            <TabsTrigger value="recipes" className="bg-green-100 text-xs sm:text-sm py-2 px-2">Recipes</TabsTrigger>
            <TabsTrigger value="ingredient-mapping" className="bg-orange-100 text-xs sm:text-sm py-2 px-2">Ingredients</TabsTrigger>
            <TabsTrigger value="save-changes" className="bg-blue-100 text-xs sm:text-sm py-2 px-2">Save Changes</TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm py-2 px-2">Users</TabsTrigger>
            <TabsTrigger value="system" className="text-xs sm:text-sm py-2 px-2">System</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemStats?.totalUsers || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {systemStats?.activeUsers7Days || 0} active this week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Meal Plans</CardTitle>
                  <ChefHat className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemStats?.totalMealPlans || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {systemStats?.recentGenerations || 0} generated this week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Recipes</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemStats?.totalRecipes || 76}</div>
                  <p className="text-xs text-muted-foreground">
                    All with specific ingredients
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Protein Target</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemStats?.avgProteinTarget?.toFixed(0) || 0}g</div>
                  <p className="text-xs text-muted-foreground">
                    Per day across all users
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Activity Level Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {systemStats?.popularActivityLevels?.map((level, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="capitalize">{level.level}</span>
                      <Badge variant="secondary">{level.count} users</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Nutrition Logic Tab */}
          <TabsContent value="nutrition" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Protein Lookup Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Protein Factors (g/kg)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium">Activity Level</th>
                          <th className="text-center p-2 font-medium">Mobility</th>
                          <th className="text-center p-2 font-medium">Endurance</th>
                          <th className="text-center p-2 font-medium">Strength</th>
                          <th className="text-center p-2 font-medium">Mixed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proteinLookupTable.map((row, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-medium">{row.activity}</td>
                            <td className="p-2 text-center">{row.mobility}</td>
                            <td className="p-2 text-center">{row.endurance}</td>
                            <td className="p-2 text-center">{row.strength}</td>
                            <td className="p-2 text-center">{row.mixed}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* PAL Values */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Physical Activity Level (PAL)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {palValues.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span className="font-medium">{item.activity}</span>
                        <Badge variant="secondary">{item.pal}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Carbohydrate Targets */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Carbohydrate Targets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {carbTargets.map((item, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium">{item.training}</span>
                          <Badge variant="secondary">{item.midpoint} g/kg</Badge>
                        </div>
                        <p className="text-sm text-gray-600">Range: {item.range}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Fat Percentages */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Fat Percentage Targets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {fatPercentages.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span className="font-medium">{item.training}</span>
                        <Badge variant="secondary">{item.percentage}%</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Configuration Tab */}
          <TabsContent value="config" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Nutrition Configuration</span>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Configuration
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Configuration</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Category</Label>
                          <Select value={newConfig.category} onValueChange={(value) => setNewConfig({...newConfig, category: value})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="protein">Protein</SelectItem>
                              <SelectItem value="carbohydrates">Carbohydrates</SelectItem>
                              <SelectItem value="fats">Fats</SelectItem>
                              <SelectItem value="calories">Calories</SelectItem>
                              <SelectItem value="activity">Activity</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Subcategory</Label>
                          <Input 
                            value={newConfig.subcategory}
                            onChange={(e) => setNewConfig({...newConfig, subcategory: e.target.value})}
                            placeholder="e.g., activity_level, training_type"
                          />
                        </div>
                        <div>
                          <Label>Parameter</Label>
                          <Input 
                            value={newConfig.parameter}
                            onChange={(e) => setNewConfig({...newConfig, parameter: e.target.value})}
                            placeholder="e.g., sedentary_mobility, moderate_strength"
                          />
                        </div>
                        <div>
                          <Label>Value</Label>
                          <Input 
                            type="number"
                            step="0.1"
                            value={newConfig.value}
                            onChange={(e) => setNewConfig({...newConfig, value: parseFloat(e.target.value)})}
                          />
                        </div>
                        <div>
                          <Label>Unit</Label>
                          <Input 
                            value={newConfig.unit}
                            onChange={(e) => setNewConfig({...newConfig, unit: e.target.value})}
                            placeholder="g/kg, %, ratio"
                          />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea 
                            value={newConfig.description}
                            onChange={(e) => setNewConfig({...newConfig, description: e.target.value})}
                            placeholder="Describe this configuration parameter"
                          />
                        </div>
                        <div>
                          <Label>Source</Label>
                          <Input 
                            value={newConfig.source}
                            onChange={(e) => setNewConfig({...newConfig, source: e.target.value})}
                            placeholder="Research paper, guideline, etc."
                          />
                        </div>
                        <Button 
                          onClick={() => addConfigMutation.mutate(newConfig)}
                          disabled={addConfigMutation.isPending}
                          className="w-full"
                        >
                          {addConfigMutation.isPending ? "Adding..." : "Add Configuration"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Object.entries(groupedConfigs).map(([category, subcategories]) => (
                    <div key={category}>
                      <h3 className="text-lg font-semibold mb-3 capitalize">{category}</h3>
                      {Object.entries(subcategories).map(([subcategory, configs]) => (
                        <div key={subcategory} className="mb-4 ml-4">
                          <h4 className="text-md font-medium mb-2 text-gray-700 capitalize">{subcategory}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                            {configs.map((config) => (
                              <div key={config.id} className="border rounded-lg p-3 bg-gray-50">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="font-medium text-sm">{config.parameter}</span>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEditingConfig(config)}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => deleteConfigMutation.mutate(config.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="secondary">{config.value} {config.unit}</Badge>
                                </div>
                                <p className="text-xs text-gray-600 mb-1">{config.description}</p>
                                {config.source && (
                                  <p className="text-xs text-blue-600">Source: {config.source}</p>
                                )}
                                <p className="text-xs text-gray-400">
                                  Updated {new Date(config.lastUpdated).toLocaleDateString()} by {config.updatedBy}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recipe Management Tab */}
          <TabsContent value="recipes" className="space-y-6">
            {/* Recipe Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Recipes</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{recipeStats?.total || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {recipeStats?.modifications || 0} modified, {recipeStats?.deleted || 0} deleted
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Breakfast</CardTitle>
                  <ChefHat className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{recipeStats?.byCategory?.breakfast || 0}</div>
                  <p className="text-xs text-muted-foreground">Morning recipes</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Lunch</CardTitle>
                  <ChefHat className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{recipeStats?.byCategory?.lunch || 0}</div>
                  <p className="text-xs text-muted-foreground">Midday recipes</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Dinner</CardTitle>
                  <ChefHat className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{recipeStats?.byCategory?.dinner || 0}</div>
                  <p className="text-xs text-muted-foreground">Evening recipes</p>
                </CardContent>
              </Card>
            </div>

            {/* Recipe Management Interface */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ChefHat className="h-5 w-5" />
                      Recipe Database Management
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Search, edit, and manage your recipe database
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowCreateRecipe(true)}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Recipe
                    </Button>
                    <Button
                      onClick={() => window.open('/api/recipes/export', '_blank')}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search and Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <Input
                      placeholder="Search recipes by name or ingredient..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  
                  <div className="flex gap-2 sm:gap-3">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="flex-1 sm:w-[130px]">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all-categories">All Categories</SelectItem>
                        <SelectItem value="breakfast">Breakfast</SelectItem>
                        <SelectItem value="lunch">Lunch</SelectItem>
                        <SelectItem value="dinner">Dinner</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={tagsFilter} onValueChange={setTagsFilter}>
                      <SelectTrigger className="flex-1 sm:w-[130px]">
                        <SelectValue placeholder="Diet Tags" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all-tags">All Tags</SelectItem>
                        <SelectItem value="vegetarian">Vegetarian</SelectItem>
                        <SelectItem value="vegan">Vegan</SelectItem>
                        <SelectItem value="gluten-free">Gluten-Free</SelectItem>
                        <SelectItem value="lactose-free">Lactose-Free</SelectItem>
                        <SelectItem value="high-protein">High Protein</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Bulk Actions */}
                {selectedRecipes.size > 0 && (
                  <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium">
                      {selectedRecipes.size} recipe(s) selected
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const updates = { active: true };
                          bulkUpdateMutation.mutate({ 
                            recipeIds: Array.from(selectedRecipes), 
                            updates 
                          });
                        }}
                      >
                        Enable
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const updates = { active: false };
                          bulkUpdateMutation.mutate({ 
                            recipeIds: Array.from(selectedRecipes), 
                            updates 
                          });
                        }}
                      >
                        Disable
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete the selected recipes?')) {
                            selectedRecipes.forEach(recipeId => {
                              deleteRecipeMutation.mutate(recipeId);
                            });
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedRecipes(new Set())}
                    >
                      Clear Selection
                    </Button>
                  </div>
                )}

                {/* Recipe Table */}
                <div className="border rounded-lg">
                  <div className="overflow-x-auto">
                    {recipesLoading ? (
                      <div className="p-8 text-center text-gray-500">
                        Loading recipes...
                      </div>
                    ) : recipeData?.recipes?.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        No recipes found. Try adjusting your search filters.
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead className="border-b bg-gray-50">
                          <tr>
                            <th className="p-3 text-left">
                              <input
                                type="checkbox"
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedRecipes(new Set(recipeData?.recipes.map(r => r.id || r.name) || []));
                                  } else {
                                    setSelectedRecipes(new Set());
                                  }
                                }}
                              />
                            </th>
                            <th className="p-3 text-left">Recipe Name</th>
                            <th className="p-3 text-left">Category</th>
                            <th className="p-3 text-left">Protein</th>
                            <th className="p-3 text-left">Prep Time</th>
                            <th className="p-3 text-left">Tags</th>
                            <th className="p-3 text-left">Status</th>
                            <th className="p-3 text-left">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recipeData?.recipes.map((recipe) => (
                            <tr key={recipe.id || recipe.name} className="border-b hover:bg-gray-50">
                              <td className="p-3">
                                <input
                                  type="checkbox"
                                  checked={selectedRecipes.has(recipe.id || recipe.name)}
                                  onChange={(e) => {
                                    const recipeId = recipe.id || recipe.name;
                                    const newSelection = new Set(selectedRecipes);
                                    if (e.target.checked) {
                                      newSelection.add(recipeId);
                                    } else {
                                      newSelection.delete(recipeId);
                                    }
                                    setSelectedRecipes(newSelection);
                                  }}
                                />
                              </td>
                              <td className="p-3">
                                <div className="font-medium">{recipe.name}</div>
                                <div className="text-sm text-gray-500">{recipe.portion}</div>
                              </td>
                              <td className="p-3">
                                <Badge variant="outline" className="capitalize">
                                  {recipe.category}
                                </Badge>
                              </td>
                              <td className="p-3 font-medium">{recipe.nutrition.protein}g</td>
                              <td className="p-3">{recipe.nutrition.prepTime} min</td>
                              <td className="p-3">
                                <div className="flex flex-wrap gap-1">
                                  {recipe.tags.slice(0, 3).map((tag) => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {recipe.tags.length > 3 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{recipe.tags.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="p-3">
                                <Badge variant={recipe.active === false ? "destructive" : "default"}>
                                  {recipe.active === false ? "Disabled" : "Active"}
                                </Badge>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setViewingRecipe(recipe)}
                                    title="View recipe"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingRecipe(recipe)}
                                    title="Edit recipe"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      if (confirm('Are you sure you want to delete this recipe?')) {
                                        deleteRecipeMutation.mutate(recipe.id || recipe.name);
                                      }
                                    }}
                                    title="Delete recipe"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  
                  {/* Pagination */}
                  {recipeData && recipeData.totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t">
                      <div className="text-sm text-gray-600">
                        Showing {((recipeData.page - 1) * recipeData.limit) + 1} to{' '}
                        {Math.min(recipeData.page * recipeData.limit, recipeData.total)} of{' '}
                        {recipeData.total} recipes
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm">
                          Page {currentPage} of {recipeData.totalPages}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentPage(Math.min(recipeData.totalPages, currentPage + 1))}
                          disabled={currentPage === recipeData.totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ingredient Mapping Tab */}
          <TabsContent value="ingredient-mapping" className="space-y-6">
            <IngredientMappingManager />
          </TabsContent>

          {/* Save Changes Tab */}
          <TabsContent value="save-changes" className="space-y-4">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Save Recipe Changes</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Your recipe modifications are currently stored in memory. Use this panel to review and save them permanently to the database.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Current Modifications */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Edit className="w-4 h-4" />
                      Recipe Modifications
                    </CardTitle>
                    <CardDescription>
                      Review all recipe changes made in this session
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={async () => {
                        try {
                          const response = await apiRequest('/api/admin/recipe-modifications');
                          toast({
                            title: "Recipe Modifications",
                            description: `Found ${response.totalModifications} modifications and ${response.totalDeleted} deletions`,
                          });
                          console.log('Modifications:', response);
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to fetch modifications",
                            variant: "destructive"
                          });
                        }
                      }}
                      className="w-full mb-4"
                      variant="outline"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Current Changes
                    </Button>
                    
                    <div className="space-y-2 text-sm">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="font-medium">What gets saved:</p>
                        <ul className="mt-2 space-y-1 text-xs">
                          <li>• Modified recipe names and ingredients</li>
                          <li>• Updated cooking instructions</li>
                          <li>• Nutrition value changes</li>
                          <li>• Recipe deletions</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Save Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      Save to Database
                    </CardTitle>
                    <CardDescription>
                      Make your changes permanent by saving to database
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={async () => {
                        try {
                          const response = await apiRequest('/api/admin/save-recipe-modifications', {
                            method: 'POST'
                          });
                          toast({
                            title: "Success!",
                            description: `Saved ${response.savedModifications} modifications and ${response.savedDeletions} deletions`,
                          });
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to save modifications to database",
                            variant: "destructive"
                          });
                        }
                      }}
                      className="w-full mb-4"
                      size="lg"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save All Changes
                    </Button>
                    
                    <div className="space-y-2 text-sm">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="font-medium text-green-800">After saving:</p>
                        <ul className="mt-2 space-y-1 text-xs text-green-700">
                          <li>• Changes become permanent</li>
                          <li>• All users will see updates</li>
                          <li>• Meal generation uses new versions</li>
                          <li>• Changes survive server restarts</li>
                        </ul>
                      </div>
                      
                      <div className="p-3 bg-amber-50 rounded-lg">
                        <p className="font-medium text-amber-800">Important:</p>
                        <p className="text-xs text-amber-700">
                          This action cannot be undone. Make sure you've reviewed all changes before saving.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Users className="h-5 w-5" />
                      User Management
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      View and manage all registered users
                    </p>
                  </div>
                  <div className="text-sm text-gray-500 font-medium">
                    Total Users: {usersData?.users?.length || 0}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                {usersLoading ? (
                  <div className="py-8 text-center text-gray-500">
                    Loading users...
                  </div>
                ) : usersData?.users?.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    No users found.
                  </div>
                ) : (
                  <>
                    {/* Mobile Card View */}
                    <div className="block sm:hidden space-y-3">
                      {usersData?.users.map((user) => (
                        <Card key={user.id} className="p-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-base">{user.username}</p>
                                <p className="text-sm text-gray-600">ID: {user.id}</p>
                              </div>
                              {user.activityLevel && (
                                <Badge variant="outline" className="capitalize text-xs">
                                  {user.activityLevel}
                                </Badge>
                              )}
                            </div>
                            
                            {user.email && (
                              <p className="text-sm text-gray-700">{user.email}</p>
                            )}
                            
                            {(user.firstName || user.lastName) && (
                              <p className="text-sm text-gray-700">
                                {user.firstName && user.lastName 
                                  ? `${user.firstName} ${user.lastName}` 
                                  : user.firstName || user.lastName
                                }
                              </p>
                            )}
                            
                            <div className="flex flex-wrap gap-2 text-xs">
                              {user.weight && (
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {user.weight} kg
                                  {user.goalWeight && ` → ${user.goalWeight} kg`}
                                </span>
                              )}
                              {user.proteinTarget && (
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                                  {user.proteinTarget}g protein
                                </span>
                              )}
                            </div>
                            
                            {user.dietaryTags && user.dietaryTags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {user.dietaryTags.map((tag, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            
                            {user.createdAt && (
                              <p className="text-xs text-gray-500">
                                Joined: {new Date(user.createdAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden sm:block border rounded-lg overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b bg-gray-50">
                          <tr>
                            <th className="p-3 text-left font-medium">ID</th>
                            <th className="p-3 text-left font-medium">Username</th>
                            <th className="p-3 text-left font-medium">Email</th>
                            <th className="p-3 text-left font-medium">Name</th>
                            <th className="p-3 text-left font-medium">Activity</th>
                            <th className="p-3 text-left font-medium">Weight</th>
                            <th className="p-3 text-left font-medium">Protein</th>
                            <th className="p-3 text-left font-medium">Diet Tags</th>
                            <th className="p-3 text-left font-medium">Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usersData?.users.map((user) => (
                            <tr key={user.id} className="border-b hover:bg-gray-50">
                              <td className="p-3 font-mono text-sm">{user.id}</td>
                              <td className="p-3 font-medium">{user.username}</td>
                              <td className="p-3 text-sm">{user.email || 'N/A'}</td>
                              <td className="p-3 text-sm">
                                {user.firstName && user.lastName 
                                  ? `${user.firstName} ${user.lastName}` 
                                  : user.firstName || user.lastName || 'N/A'
                                }
                              </td>
                              <td className="p-3">
                                {user.activityLevel ? (
                                  <Badge variant="outline" className="capitalize text-xs">
                                    {user.activityLevel}
                                  </Badge>
                                ) : (
                                  <span className="text-gray-400">N/A</span>
                                )}
                              </td>
                              <td className="p-3 text-sm">
                                {user.weight ? `${user.weight} kg` : 'N/A'}
                                {user.goalWeight && (
                                  <div className="text-xs text-gray-500">
                                    Goal: {user.goalWeight} kg
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-sm font-medium">
                                {user.proteinTarget ? `${user.proteinTarget}g` : 'N/A'}
                              </td>
                              <td className="p-3">
                                {user.dietaryTags && user.dietaryTags.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {user.dietaryTags.slice(0, 2).map((tag, index) => (
                                      <Badge key={index} variant="secondary" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                    {user.dietaryTags.length > 2 && (
                                      <Badge variant="secondary" className="text-xs">
                                        +{user.dietaryTags.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">None</span>
                                )}
                              </td>
                              <td className="p-3 text-sm text-gray-500">
                                {user.createdAt 
                                  ? new Date(user.createdAt).toLocaleDateString()
                                  : 'N/A'
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">System configuration features coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Configuration Dialog */}
        {editingConfig && (
          <Dialog open={!!editingConfig} onOpenChange={() => setEditingConfig(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Configuration</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Value</Label>
                  <Input 
                    type="number"
                    step="0.1"
                    value={editingConfig.value}
                    onChange={(e) => setEditingConfig({...editingConfig, value: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Input 
                    value={editingConfig.unit}
                    onChange={(e) => setEditingConfig({...editingConfig, unit: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea 
                    value={editingConfig.description}
                    onChange={(e) => setEditingConfig({...editingConfig, description: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Source</Label>
                  <Input 
                    value={editingConfig.source || ""}
                    onChange={(e) => setEditingConfig({...editingConfig, source: e.target.value})}
                  />
                </div>
                <Button 
                  onClick={() => updateConfigMutation.mutate(editingConfig)}
                  disabled={updateConfigMutation.isPending}
                  className="w-full"
                >
                  {updateConfigMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Recipe View Modal */}
        {viewingRecipe && (
          <Dialog open={!!viewingRecipe} onOpenChange={() => setViewingRecipe(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Recipe Details: {viewingRecipe.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="font-semibold">Category</Label>
                    <Badge variant="outline" className="ml-2 capitalize">
                      {viewingRecipe.category}
                    </Badge>
                  </div>
                  <div>
                    <Label className="font-semibold">Portion</Label>
                    <p className="text-sm mt-1">{viewingRecipe.portion}</p>
                  </div>
                </div>

                {/* Nutrition */}
                <div>
                  <Label className="font-semibold">Nutrition Information</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm">
                    <div>Protein: <strong>{viewingRecipe.nutrition.protein}g</strong></div>
                    <div>Calories: <strong>{viewingRecipe.nutrition.calories}</strong></div>
                    <div>Carbs: <strong>{viewingRecipe.nutrition.carbohydrates}g</strong></div>
                    <div>Fats: <strong>{viewingRecipe.nutrition.fats}g</strong></div>
                    <div>Fiber: <strong>{viewingRecipe.nutrition.fiber}g</strong></div>
                    <div>Sugar: <strong>{viewingRecipe.nutrition.sugar}g</strong></div>
                    <div>Sodium: <strong>{viewingRecipe.nutrition.sodium}mg</strong></div>
                    <div>Prep Time: <strong>{viewingRecipe.nutrition.prepTime} min</strong></div>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <Label className="font-semibold">Dietary Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {viewingRecipe.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>

                {/* Ingredients */}
                <div>
                  <Label className="font-semibold">Ingredients</Label>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    {viewingRecipe.ingredients.map((ingredient, index) => (
                      <li key={index}>{ingredient}</li>
                    ))}
                  </ul>
                </div>

                {/* Recipe Instructions */}
                {viewingRecipe.recipe?.instructions && (
                  <div>
                    <Label className="font-semibold">Instructions</Label>
                    <ol className="list-decimal list-inside mt-2 space-y-2 text-sm">
                      {viewingRecipe.recipe.instructions.map((instruction, index) => (
                        <li key={index}>{instruction}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Recipe Tips */}
                {viewingRecipe.recipe?.tips && viewingRecipe.recipe.tips.length > 0 && (
                  <div>
                    <Label className="font-semibold">Tips</Label>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                      {viewingRecipe.recipe.tips.map((tip, index) => (
                        <li key={index}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Vegetable Content */}
                <div>
                  <Label className="font-semibold">Vegetable Content ({viewingRecipe.vegetableContent.servings} servings)</Label>
                  <div className="mt-2">
                    <p className="text-sm"><strong>Vegetables:</strong> {viewingRecipe.vegetableContent.vegetables.join(", ")}</p>
                    <p className="text-sm mt-1"><strong>Benefits:</strong> {viewingRecipe.vegetableContent.benefits.join(", ")}</p>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Recipe Edit Modal */}
        {editingRecipe && (
          <Dialog open={!!editingRecipe} onOpenChange={() => setEditingRecipe(null)}>
            <DialogContent className="w-[95vw] max-w-4xl h-[90vh] max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle className="text-lg sm:text-xl pr-8 break-words">
                  Edit Recipe: {editingRecipe.name}
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {/* Recipe Name - Full Width Priority */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-base font-semibold">Recipe Name</Label>
                  <div className="w-full">
                    <textarea
                      id="name"
                      value={editingRecipe.name}
                      onChange={(e) => setEditingRecipe({...editingRecipe, name: e.target.value})}
                      placeholder="Recipe name"
                      className="w-full text-base p-3 min-h-[60px] max-h-[120px] border border-gray-300 rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      style={{ 
                        fontSize: '16px', // Prevents zoom on iOS
                        WebkitAppearance: 'none',
                        fontFamily: 'inherit',
                        lineHeight: '1.5'
                      }}
                      rows={2}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Characters: {editingRecipe.name.length} • Click and drag to resize vertically
                    </p>
                  </div>
                </div>

                {/* Other Basic Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="portion">Portion Size</Label>
                    <Input
                      id="portion"
                      value={editingRecipe.portion}
                      onChange={(e) => setEditingRecipe({...editingRecipe, portion: e.target.value})}
                      placeholder="e.g., 1 serving"
                      className="w-full"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                  <div className="sm:col-span-1">
                    {/* This ensures proper spacing on mobile */}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={editingRecipe.category}
                      onValueChange={(value) => setEditingRecipe({...editingRecipe, category: value as Recipe['category']})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="breakfast">Breakfast</SelectItem>
                        <SelectItem value="lunch">Lunch</SelectItem>
                        <SelectItem value="dinner">Dinner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="wholeFoodLevel">Whole Food Level</Label>
                    <Select 
                      value={editingRecipe.wholeFoodLevel}
                      onValueChange={(value) => setEditingRecipe({...editingRecipe, wholeFoodLevel: value as Recipe['wholeFoodLevel']})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minimal">Minimal</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Nutrition Information */}
                <div>
                  <Label className="text-base font-semibold">Nutrition Information</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                    <div>
                      <Label htmlFor="protein">Protein (g)</Label>
                      <Input
                        id="protein"
                        type="number"
                        step="0.1"
                        value={editingRecipe.nutrition.protein}
                        onChange={(e) => setEditingRecipe({
                          ...editingRecipe, 
                          nutrition: {...editingRecipe.nutrition, protein: parseFloat(e.target.value) || 0}
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="calories">Calories</Label>
                      <Input
                        id="calories"
                        type="number"
                        value={editingRecipe.nutrition.calories}
                        onChange={(e) => setEditingRecipe({
                          ...editingRecipe, 
                          nutrition: {...editingRecipe.nutrition, calories: parseFloat(e.target.value) || 0}
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="carbohydrates">Carbs (g)</Label>
                      <Input
                        id="carbohydrates"
                        type="number"
                        step="0.1"
                        value={editingRecipe.nutrition.carbohydrates}
                        onChange={(e) => setEditingRecipe({
                          ...editingRecipe, 
                          nutrition: {...editingRecipe.nutrition, carbohydrates: parseFloat(e.target.value) || 0}
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="fats">Fats (g)</Label>
                      <Input
                        id="fats"
                        type="number"
                        step="0.1"
                        value={editingRecipe.nutrition.fats}
                        onChange={(e) => setEditingRecipe({
                          ...editingRecipe, 
                          nutrition: {...editingRecipe.nutrition, fats: parseFloat(e.target.value) || 0}
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="fiber">Fiber (g)</Label>
                      <Input
                        id="fiber"
                        type="number"
                        step="0.1"
                        value={editingRecipe.nutrition.fiber}
                        onChange={(e) => setEditingRecipe({
                          ...editingRecipe, 
                          nutrition: {...editingRecipe.nutrition, fiber: parseFloat(e.target.value) || 0}
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="sugar">Sugar (g)</Label>
                      <Input
                        id="sugar"
                        type="number"
                        step="0.1"
                        value={editingRecipe.nutrition.sugar}
                        onChange={(e) => setEditingRecipe({
                          ...editingRecipe, 
                          nutrition: {...editingRecipe.nutrition, sugar: parseFloat(e.target.value) || 0}
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="sodium">Sodium (mg)</Label>
                      <Input
                        id="sodium"
                        type="number"
                        value={editingRecipe.nutrition.sodium}
                        onChange={(e) => setEditingRecipe({
                          ...editingRecipe, 
                          nutrition: {...editingRecipe.nutrition, sodium: parseFloat(e.target.value) || 0}
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="prepTime">Prep Time (min)</Label>
                      <Input
                        id="prepTime"
                        type="number"
                        value={editingRecipe.nutrition.prepTime}
                        onChange={(e) => setEditingRecipe({
                          ...editingRecipe, 
                          nutrition: {...editingRecipe.nutrition, prepTime: parseInt(e.target.value) || 0}
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <Label htmlFor="tags">Dietary Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={editingRecipe.tags.join(", ")}
                    onChange={(e) => setEditingRecipe({
                      ...editingRecipe, 
                      tags: e.target.value.split(",").map(tag => tag.trim()).filter(Boolean)
                    })}
                    placeholder="vegetarian, gluten-free, high-protein"
                  />
                </div>

                {/* Ingredients */}
                <div>
                  <Label htmlFor="ingredients">Ingredients (one per line)</Label>
                  <Textarea
                    id="ingredients"
                    rows={5}
                    value={editingRecipe.ingredients.join("\n")}
                    onChange={(e) => setEditingRecipe({
                      ...editingRecipe, 
                      ingredients: e.target.value.split("\n").filter(Boolean)
                    })}
                    placeholder="200g chicken breast&#10;1 tbsp olive oil&#10;100g brown rice"
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="active"
                    checked={editingRecipe.active !== false}
                    onCheckedChange={(checked) => setEditingRecipe({
                      ...editingRecipe, 
                      active: Boolean(checked)
                    })}
                  />
                  <Label htmlFor="active">Recipe is active and available for meal generation</Label>
                </div>
              </div>

              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={() => setEditingRecipe(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => updateRecipeMutation.mutate(editingRecipe)}
                  disabled={updateRecipeMutation.isPending}
                >
                  {updateRecipeMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Recipe Create Modal */}
        {showCreateRecipe && (
          <Dialog open={showCreateRecipe} onOpenChange={setShowCreateRecipe}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Recipe</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  Create a new recipe with nutrition information and dietary tags.
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="new-name">Recipe Name</Label>
                    <Input
                      id="new-name"
                      placeholder="Enter recipe name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-portion">Portion Size</Label>
                    <Input
                      id="new-portion"
                      placeholder="e.g., 1 serving"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="new-category">Category</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="breakfast">Breakfast</SelectItem>
                        <SelectItem value="lunch">Lunch</SelectItem>
                        <SelectItem value="dinner">Dinner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="new-wholeFoodLevel">Whole Food Level</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minimal">Minimal</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="new-ingredients">Ingredients (one per line)</Label>
                  <Textarea
                    id="new-ingredients"
                    rows={4}
                    placeholder="200g chicken breast&#10;1 tbsp olive oil&#10;100g brown rice"
                  />
                </div>

                <div>
                  <Label htmlFor="new-tags">Dietary Tags (comma-separated)</Label>
                  <Input
                    id="new-tags"
                    placeholder="vegetarian, gluten-free, high-protein"
                  />
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> Nutrition values will be automatically calculated from the ingredients using AI.
                    You can always edit them manually after creation.
                  </p>
                </div>
              </div>

              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={() => setShowCreateRecipe(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  // For now, just close the modal - full implementation would create the recipe
                  toast({ title: "Info", description: "Recipe creation form ready - full implementation in progress" });
                  setShowCreateRecipe(false);
                }}>
                  Create Recipe
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}

// Wrapper component that handles admin access control
export default function AdminPanel() {
  const { user: authUser } = useAuth();
  
  // Check admin access
  const isAdmin = authUser?.username === 'admin' || authUser?.email?.includes('admin');

  // Non-admin users get access denied page
  if (!isAdmin) {
    return <AccessDenied />;
  }

  // Admin users get the full admin panel
  return <AdminPanelMain />;
}