import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit, Trash2, Clock, Users, ChefHat, Star, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// Types
interface UserRecipe {
  id: number;
  userId: number;
  name: string;
  portion: string;
  ingredients: string[];
  instructions: string[];
  tips: string[];
  notes?: string;
  protein: number;
  calories: number;
  carbohydrates: number;
  fats: number;
  fiber: number;
  sugar: number;
  sodium: number;
  prepTime: number;
  cookTime: number;
  servings: number;
  mealTypes: string[];
  costEuros?: number;
  tags: string[];
  difficulty: string;
  cuisine?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

// Form schema
const recipeFormSchema = z.object({
  name: z.string().min(1, "Recipe name is required"),
  portion: z.string().min(1, "Portion size is required"),
  ingredients: z.array(z.string().min(1)).min(1, "At least one ingredient is required"),
  instructions: z.array(z.string().min(1)).min(1, "At least one instruction is required"),
  tips: z.array(z.string()).default([]),
  notes: z.string().optional(),
  protein: z.number().min(0, "Protein must be 0 or higher"),
  calories: z.number().min(0, "Calories must be 0 or higher"),
  carbohydrates: z.number().min(0).default(0),
  fats: z.number().min(0).default(0),
  fiber: z.number().min(0).default(0),
  sugar: z.number().min(0).default(0),
  sodium: z.number().min(0).default(0),
  prepTime: z.number().min(1, "Prep time must be at least 1 minute"),
  cookTime: z.number().min(0).default(0),
  servings: z.number().min(1, "Servings must be at least 1"),
  mealTypes: z.array(z.enum(["breakfast", "lunch", "dinner"])).min(1, "Select at least one meal type"),
  costEuros: z.number().min(0).optional(),
  tags: z.array(z.string()).default([]),
  difficulty: z.enum(["easy", "medium", "hard"]).default("easy"),
  cuisine: z.string().optional(),
});

type RecipeFormData = z.infer<typeof recipeFormSchema>;

export default function MyRecipes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<UserRecipe | null>(null);
  const [useOnlyMyRecipes, setUseOnlyMyRecipes] = useState(false);

  // Fetch user recipes
  const { data: recipes = [], isLoading } = useQuery<UserRecipe[]>({
    queryKey: ['/api/user-recipes'],
    enabled: !!user,
  });

  // Fetch user profile to get recipe preference
  const { data: userProfile } = useQuery({
    queryKey: ['/api/users', user?.id, 'profile'],
    enabled: !!user?.id,
  });

  // Update local state when profile data loads
  React.useEffect(() => {
    if (userProfile?.useOnlyMyRecipes !== undefined) {
      setUseOnlyMyRecipes(userProfile.useOnlyMyRecipes);
    }
  }, [userProfile]);

  // Mutation to update recipe preference
  const updatePreferenceMutation = useMutation({
    mutationFn: (useOnlyMyRecipes: boolean) => 
      apiRequest(`/api/users/${user?.id}/profile`, 'PATCH', { useOnlyMyRecipes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', user?.id, 'profile'] });
      toast({ 
        title: useOnlyMyRecipes 
          ? "Now using only your recipes for meal plans" 
          : "Now mixing your recipes with curated database"
      });
    },
    onError: () => {
      toast({ title: "Failed to update preference", variant: "destructive" });
    },
  });

  // Handle preference change
  const handlePreferenceChange = (checked: boolean) => {
    setUseOnlyMyRecipes(checked);
    updatePreferenceMutation.mutate(checked);
  };

  // Form setup
  const form = useForm<RecipeFormData>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: {
      name: '',
      portion: '',
      ingredients: [''],
      instructions: [''],
      tips: [],
      notes: '',
      protein: 0,
      calories: 0,
      carbohydrates: 0,
      fats: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      prepTime: 30,
      cookTime: 0,
      servings: 1,
      mealTypes: [],
      costEuros: 0,
      tags: [],
      difficulty: 'easy',
      cuisine: '',
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: RecipeFormData) => apiRequest('/api/user-recipes', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-recipes'] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Recipe created successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to create recipe", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: RecipeFormData }) => 
      apiRequest(`/api/user-recipes/${id}`, 'PATCH', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-recipes'] });
      setIsDialogOpen(false);
      setEditingRecipe(null);
      form.reset();
      toast({ title: "Recipe updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update recipe", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/user-recipes/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-recipes'] });
      toast({ title: "Recipe deleted successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to delete recipe", variant: "destructive" });
    },
  });

  // Form handlers
  const onSubmit = (data: RecipeFormData) => {
    if (editingRecipe) {
      updateMutation.mutate({ id: editingRecipe.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditDialog = (recipe: UserRecipe) => {
    setEditingRecipe(recipe);
    form.reset({
      name: recipe.name,
      portion: recipe.portion,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      tips: recipe.tips,
      notes: recipe.notes || '',
      protein: recipe.protein,
      calories: recipe.calories,
      carbohydrates: recipe.carbohydrates,
      fats: recipe.fats,
      fiber: recipe.fiber,
      sugar: recipe.sugar,
      sodium: recipe.sodium,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      servings: recipe.servings,
      mealTypes: recipe.mealTypes as ("breakfast" | "lunch" | "dinner")[],
      costEuros: recipe.costEuros || 0,
      tags: recipe.tags,
      difficulty: recipe.difficulty as "easy" | "medium" | "hard",
      cuisine: recipe.cuisine || '',
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingRecipe(null);
    form.reset();
    setIsDialogOpen(true);
  };

  // Helper functions for form arrays
  const addIngredient = () => {
    const current = form.getValues('ingredients');
    form.setValue('ingredients', [...current, '']);
  };

  const removeIngredient = (index: number) => {
    const current = form.getValues('ingredients');
    form.setValue('ingredients', current.filter((_, i) => i !== index));
  };

  const addInstruction = () => {
    const current = form.getValues('instructions');
    form.setValue('instructions', [...current, '']);
  };

  const removeInstruction = (index: number) => {
    const current = form.getValues('instructions');
    form.setValue('instructions', current.filter((_, i) => i !== index));
  };

  const addTip = () => {
    const current = form.getValues('tips');
    form.setValue('tips', [...current, '']);
  };

  const removeTip = (index: number) => {
    const current = form.getValues('tips');
    form.setValue('tips', current.filter((_, i) => i !== index));
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'hard': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading your recipes...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold">My Recipes</h1>
            <p className="text-gray-600">Create and manage your personal recipe collection</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Recipe
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
        
        {/* Recipe Source Preference */}
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border max-w-fit">
          <Settings className="h-4 w-4 text-gray-600" />
          <div className="flex items-center space-x-2">
            <Label htmlFor="recipe-source" className="text-sm font-medium">
              Use only my recipes for meal plans
            </Label>
            <Switch
              id="recipe-source"
              checked={useOnlyMyRecipes}
              onCheckedChange={handlePreferenceChange}
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {useOnlyMyRecipes 
            ? "Meal plans will only use your custom recipes" 
            : "Meal plans will mix your recipes with our curated database"
          }
        </p>
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-12">
          <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No recipes yet</h3>
          <p className="text-gray-500 mb-4">Create your first recipe to get started</p>
          <Button onClick={openCreateDialog} className="flex items-center gap-2 mx-auto">
            <Plus className="h-4 w-4" />
            Add Your First Recipe
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <Card key={recipe.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg leading-tight">{recipe.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(recipe)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(recipe.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(recipe.difficulty)}`}>
                    {recipe.difficulty}
                  </span>
                  <span>•</span>
                  <span>{recipe.portion}</span>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {recipe.mealTypes.map((type) => (
                      <span key={type} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full capitalize">
                        {type}
                      </span>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Protein:</span> {recipe.protein}g
                    </div>
                    <div>
                      <span className="font-medium">Calories:</span> {recipe.calories}
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm line-clamp-2">{recipe.portion}</p>
                  
                  {recipe.notes && (
                    <p className="text-gray-500 text-xs italic line-clamp-2">{recipe.notes}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRecipe ? 'Edit Recipe' : 'Create New Recipe'}
              </DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recipe Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter recipe name..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="portion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Portion Size</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 1 bowl, 2 servings..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Ingredients */}
                <FormField
                  control={form.control}
                  name="ingredients"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ingredients</FormLabel>
                      <div className="space-y-2">
                        {field.value.map((ingredient, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              placeholder={`Ingredient ${index + 1}...`}
                              value={ingredient}
                              onChange={(e) => {
                                const newIngredients = [...field.value];
                                newIngredients[index] = e.target.value;
                                field.onChange(newIngredients);
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => removeIngredient(index)}
                              disabled={field.value.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button type="button" variant="outline" onClick={addIngredient}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Ingredient
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Instructions */}
                <FormField
                  control={form.control}
                  name="instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instructions</FormLabel>
                      <div className="space-y-2">
                        {field.value.map((instruction, index) => (
                          <div key={index} className="flex gap-2">
                            <Textarea
                              placeholder={`Step ${index + 1}...`}
                              value={instruction}
                              onChange={(e) => {
                                const newInstructions = [...field.value];
                                newInstructions[index] = e.target.value;
                                field.onChange(newInstructions);
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => removeInstruction(index)}
                              disabled={field.value.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button type="button" variant="outline" onClick={addInstruction}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Step
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Nutrition Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="protein"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Protein (g)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={e => field.onChange(+e.target.value)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="calories"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Calories</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={e => field.onChange(+e.target.value)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="carbohydrates"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Carbs (g)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={e => field.onChange(+e.target.value)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="fats"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fats (g)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={e => field.onChange(+e.target.value)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Meal Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="prepTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prep Time (min)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={e => field.onChange(+e.target.value)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="servings"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Servings</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={e => field.onChange(+e.target.value)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Difficulty</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select difficulty" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Meal Types */}
                <FormField
                  control={form.control}
                  name="mealTypes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meal Types</FormLabel>
                      <div className="flex gap-4">
                        {(['breakfast', 'lunch', 'dinner'] as const).map((mealType) => (
                          <label key={mealType} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={field.value.includes(mealType)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  field.onChange([...field.value, mealType]);
                                } else {
                                  field.onChange(field.value.filter(type => type !== mealType));
                                }
                              }}
                            />
                            <span className="capitalize">{mealType}</span>
                          </label>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Any additional notes..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingRecipe ? 'Update Recipe' : 'Create Recipe'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Recipe Grid */}
      {recipes.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <ChefHat className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No recipes yet</h3>
            <p className="text-gray-600 mb-4">Start building your personal recipe collection</p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Recipe
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <Card key={recipe.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{recipe.name}</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(recipe)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(recipe.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {recipe.prepTime}min
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {recipe.servings}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(recipe.difficulty)}`}>
                    {recipe.difficulty}
                  </span>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {recipe.mealTypes.map((type) => (
                      <span key={type} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full capitalize">
                        {type}
                      </span>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Protein:</span> {recipe.protein}g
                    </div>
                    <div>
                      <span className="font-medium">Calories:</span> {recipe.calories}
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm line-clamp-2">{recipe.portion}</p>
                  
                  {recipe.notes && (
                    <p className="text-gray-500 text-xs italic line-clamp-2">{recipe.notes}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}