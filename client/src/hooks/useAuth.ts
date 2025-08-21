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
    // Check session validity with backend
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          // Update localStorage with fresh data
          localStorage.setItem('userId', data.user.id.toString());
          localStorage.setItem('username', data.user.username);
        } else {
          // Session expired or invalid, clear localStorage
          setUser(null);
          localStorage.removeItem('userId');
          localStorage.removeItem('username');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Fallback to localStorage if network error
        const userId = localStorage.getItem('userId');
        const username = localStorage.getItem('username');
        
        if (userId && username) {
          setUser({
            id: parseInt(userId),
            username: username,
          });
        }
      }
      
      setIsLoading(false);
    };
    
    checkAuth();
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