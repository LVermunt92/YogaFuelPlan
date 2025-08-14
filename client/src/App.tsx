import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import MealPlanner from "@/pages/meal-planner";
import Profile from "@/pages/profile";
import Auth from "@/pages/auth";
import NotFound from "@/pages/not-found";
import { Utensils, User, Menu, LogOut, Languages } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslations } from "@/lib/translations";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";

function Navigation() {
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { language, changeLanguage, isChangingLanguage } = useLanguage();

  const t = useTranslations(language);

  const navItems = [
    { path: "/", label: t.mealPlanner, icon: Utensils },
    { path: "/profile", label: t.profile, icon: User }
  ];

  return (
    <nav className="bg-background border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-light text-foreground" style={{ fontFamily: 'Times New Roman, serif', letterSpacing: '0.05em' }}>
                Meal Planner
              </h1>
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
            {user && (
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
                  Welcome, {user.username}
                </span>
                <button
                  onClick={logout}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors duration-200"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </button>
              </>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="sm:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="sm:hidden border-t border-gray-200 bg-background">
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
          {user && (
            <div className="pt-2 pb-3 border-t border-gray-200">
              <div className="px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Languages className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-base font-medium text-gray-600">Taal / Language</span>
                  </div>
                  <Select value={language} onValueChange={(value) => {
                    setIsMenuOpen(false);
                    changeLanguage(value as Language);
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
          {user && (
            <div className="pt-2 pb-3 border-t border-gray-200">
              <div className="px-3 py-2">
                <div className="text-sm text-gray-600 mb-2">
                  Welcome, {user.username}
                </div>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    logout();
                  }}
                  className="flex items-center text-gray-600 hover:text-gray-800"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fefdf9] flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-light" style={{ fontFamily: 'Times New Roman, serif' }}>
            Loading...
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
    <div className="min-h-screen bg-[#fefdf9]">
      <Navigation />
      <Switch>
        <Route path="/" component={MealPlanner} />
        <Route path="/profile" component={Profile} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
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
