import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Settings, Users, Calculator, Database, Activity, Target, ChefHat, Save, Edit, Trash2, Plus, AlertTriangle } from "lucide-react";
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

export default function AdminPanel() {
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

  // Check admin access
  const isAdmin = authUser?.username === 'admin' || authUser?.email?.includes('admin');

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-gray-600">Admin privileges required to access this panel.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Panel</h1>
          <p className="text-gray-600">Manage nutrition calculations, system settings, and monitor application performance</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="nutrition">Nutrition Logic</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
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

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">User management features coming soon...</p>
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
      </div>
    </div>
  );
}