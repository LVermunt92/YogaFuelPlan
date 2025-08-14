import { useState, useEffect } from "react";

interface User {
  id: number;
  username: string;
  email?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
    
    if (userId && username) {
      setUser({
        id: parseInt(userId),
        username: username,
      });
    }
    
    setIsLoading(false);
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('userId', userData.id.toString());
    localStorage.setItem('username', userData.username);
    // Force a re-render by updating isLoading
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    // Clear any cached meal plan data
    localStorage.removeItem('selectedMealPlan');
    // Force a page refresh to ensure complete logout
    window.location.href = '/';
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };
}