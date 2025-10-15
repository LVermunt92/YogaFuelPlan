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
    // Check session validity with backend with retry logic
    const checkAuth = async (retryCount = 0) => {
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
          setIsLoading(false);
        } else if (response.status === 401 && retryCount < 2) {
          // Retry on 401 (session might be establishing)
          // Wait briefly before retrying
          setTimeout(() => {
            checkAuth(retryCount + 1);
          }, 300 * (retryCount + 1)); // 300ms, then 600ms
        } else {
          // Session expired or invalid, clear localStorage and state
          console.log('Session expired, redirecting to login...');
          setUser(null);
          localStorage.removeItem('userId');
          localStorage.removeItem('username');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // On network error, set unauthenticated state
        // Don't use localStorage fallback as it may be stale
        setUser(null);
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        setIsLoading(false);
      }
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

  const logout = async () => {
    try {
      console.log('Logout initiated...');
      
      // Call server logout endpoint to destroy session FIRST
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Logout response:', response.status, response.statusText);
      
      if (!response.ok) {
        console.error('Logout failed with status:', response.status);
      }
      
      // Clear client state
      setUser(null);
      localStorage.clear(); // Clear all localStorage items
      
      // Force a hard reload of the page to login
      console.log('Redirecting to login...');
      window.location.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Clear everything and reload even on error
      setUser(null);
      localStorage.clear();
      window.location.replace('/');
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };
}