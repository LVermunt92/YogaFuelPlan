import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import MealPlanner from "@/pages/meal-planner-clean";
import Profile from "@/pages/profile";
import About from "@/pages/about";
import AdminPanel from "@/pages/admin";
import MyRecipes from "@/pages/my-recipes";
import TermsAndConditions from "@/pages/terms-and-conditions";

import Auth from "@/pages/auth";
import NotFound from "@/pages/not-found";
import { Utensils, User, Info, Settings, Menu, LogOut, Languages, ChefHat } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import React, { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslations } from "@/lib/translations";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";

function Navigation() {
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user: authUser, logout } = useAuth();
  const { language, changeLanguage, isChangingLanguage } = useLanguage();

  const t = useTranslations(language);

  // Fetch user profile to get firstName
  const { data: userProfile } = useQuery<{ firstName?: string; username?: string }>({
    queryKey: [`/api/users/${authUser?.id}/profile`],
    enabled: !!authUser?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get display name - prioritize firstName, fallback to username
  const getDisplayName = () => {
    if (userProfile?.firstName) {
      return userProfile.firstName;
    }
    if (authUser?.username) {
      return authUser.username.includes(' ') ? authUser.username.split(' ')[0] : authUser.username;
    }
    return 'User';
  };

  const isAdmin = authUser?.username === 'admin' || authUser?.email?.includes('admin');
  
  const navItems = [
    { path: "/", label: t.mealPlanner, icon: Utensils },
    ...(isAdmin ? [] : [{ path: "/my-recipes", label: t.myRecipes, icon: ChefHat }]),
    { path: "/profile", label: t.profile, icon: User },
    { path: "/about", label: t.about, icon: Info },
    ...(isAdmin ? [{ path: "/admin", label: "Admin", icon: Settings }] : [])
  ];

  return (
    <nav className="topbar bg-background border-b border-gray-200 sticky top-0 z-50">
      <div className="w-full mx-0 px-0">
        <div className="flex justify-between h-16">
          {/* Mobile menu button - moved to left */}
          <div className="sm:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 mr-3"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
          
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              {/* Navigation logo/brand space - removed text */}
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200 ${
                      isActive
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          
          {/* User info and controls */}
          <div className="hidden sm:flex sm:items-center sm:space-x-4">
            {authUser && (
              <>
                {/* Language Selector */}
                <div className="flex items-center space-x-2">
                  <Languages className="h-4 w-4 text-gray-500" />
                  <Select value={language} onValueChange={changeLanguage} disabled={isChangingLanguage}>
                    <SelectTrigger className="w-[80px] h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">EN</SelectItem>
                      <SelectItem value="nl">NL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <span className="text-sm text-muted-foreground">
                  Welcome, {getDisplayName()}
                </span>
                <button
                  onClick={logout}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors duration-200"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t.logout}
                </button>
              </>
            )}
          </div>
          
          {/* Right side content for mobile - logout button */}
          <div className="sm:hidden flex items-center">
            {authUser && (
              <button
                onClick={logout}
                className="inline-flex items-center p-2 text-gray-500 hover:text-gray-700"
                aria-label="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="topbar sm:hidden border-t border-gray-200">
          <div className="pt-2 pb-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block pl-3 pr-4 py-2 text-base font-medium ${
                    isActive
                      ? 'bg-blue-50 border-r-4 border-blue-500 text-blue-700'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    <Icon className="mr-3 h-5 w-5" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </div>
          
          {/* Mobile Language Selector */}
          {authUser && (
            <div className="pt-2 pb-3 border-t border-gray-200">
              <div className="px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Languages className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-base font-medium text-gray-600">Taal / Language</span>
                  </div>
                  <Select value={language} onValueChange={(value: "en" | "nl") => {
                    setIsMenuOpen(false);
                    changeLanguage(value);
                  }} disabled={isChangingLanguage}>
                    <SelectTrigger className="w-[80px] h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">EN</SelectItem>
                      <SelectItem value="nl">NL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          
          {/* Mobile user info */}
          {authUser && (
            <div className="pt-2 pb-3 border-t border-gray-200">
              <div className="px-3 py-2">
                <div className="text-sm text-gray-600 mb-2">
                  Welcome, {getDisplayName()}
                </div>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    logout();
                  }}
                  className="flex items-center text-gray-600 hover:text-gray-800"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t.logout}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const { language } = useLanguage();
  const t = useTranslations(language);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fefdf9] flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-light" style={{ fontFamily: 'Times New Roman, serif' }}>
            {t.loading}
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, only show Auth page regardless of route
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#fefdf9]">
        <Auth />
      </div>
    );
  }

  // If authenticated, show full app with navigation
  return (
    <div className="min-h-screen bg-[#fefdf9] flex flex-col">
      <Navigation />
      <div className="flex-1">
        <Switch>
          <Route path="/" component={MealPlanner} />
          <Route path="/meal-planner" component={MealPlanner} />
          <Route path="/my-recipes" component={MyRecipes} />
          <Route path="/profile" component={Profile} />
          <Route path="/about" component={About} />
          <Route path="/terms" component={TermsAndConditions} />
          <Route path="/admin" component={AdminPanel} />
          <Route component={NotFound} />
        </Switch>
      </div>
      <footer className="py-4 text-center text-xs text-gray-400 border-t border-gray-200">
        <div className="space-y-2">
          <div>
            © {new Date().getFullYear()} Meal Planner. All rights reserved.
          </div>
          <div>
            <Link href="/terms" className="text-gray-500 hover:text-gray-700 underline">
              {t.termsAndConditions}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  useEffect(() => {
    // Weekly version check for auto-updates
    const checkForUpdates = async () => {
      const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
      const lastCheck = localStorage.getItem('lastVersionCheck');
      const storedVersion = localStorage.getItem('appVersion');
      const now = Date.now();
      
      // Check if it's been a week since last check
      if (!lastCheck || now - parseInt(lastCheck) > WEEK_IN_MS) {
        try {
          const response = await fetch('/api/version');
          const data = await response.json();
          
          // If version changed and we have a stored version, reload
          if (storedVersion && data.version !== storedVersion) {
            console.log('New version detected, reloading...');
            window.location.reload();
          }
          
          // Update stored version and last check time
          localStorage.setItem('appVersion', data.version);
          localStorage.setItem('lastVersionCheck', now.toString());
        } catch (error) {
          console.error('Version check failed:', error);
        }
      }
    };
    
    checkForUpdates();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
