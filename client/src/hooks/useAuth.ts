import { useState, useEffect } from "react";
import { getAccessToken, getRefreshToken, clearTokens, setTokens } from "@/lib/auth-storage";

interface User {
  id: number;
  username: string;
  email?: string;
}

// Token refresh result types
type RefreshResult = 
  | { success: true; token: string }
  | { success: false; reason: 'no_token' | 'invalid' | 'network_error' };

// Automatic token refresh when access token expires
async function refreshAccessToken(): Promise<RefreshResult> {
  const refreshToken = getRefreshToken();
  
  if (!refreshToken) {
    return { success: false, reason: 'no_token' };
  }
  
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    
    if (!res.ok) {
      // Refresh token is invalid/expired, clear everything
      console.log('Refresh token invalid or expired, clearing tokens');
      clearTokens();
      return { success: false, reason: 'invalid' };
    }
    
    const data = await res.json();
    setTokens(data.accessToken, refreshToken);
    return { success: true, token: data.accessToken };
  } catch (error) {
    // Network error - don't clear tokens, keep user logged in
    console.error('Token refresh failed (network error) - keeping user logged in:', error);
    return { success: false, reason: 'network_error' };
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication with JWT token and automatic refresh
    const checkAuth = async () => {
      try {
        const token = getAccessToken();
        
        if (!token) {
          // No token, not authenticated
          setUser(null);
          setIsLoading(false);
          return;
        }
        
        let response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        // If 401 and we have a refresh token, try to refresh and retry
        if (response.status === 401 && getRefreshToken()) {
          const refreshResult = await refreshAccessToken();
          
          if (refreshResult.success) {
            // Retry the original request with new token
            response = await fetch('/api/auth/me', {
              headers: {
                'Authorization': `Bearer ${refreshResult.token}`
              }
            });
          } else if (refreshResult.reason === 'network_error') {
            // Network error during refresh - use cached user data
            console.log('Network error during token refresh - using cached data');
            const storedUserId = localStorage.getItem('userId');
            const storedUsername = localStorage.getItem('username');
            
            if (storedUserId && storedUsername) {
              setUser({
                id: parseInt(storedUserId),
                username: storedUsername
              });
            } else {
              setUser(null);
            }
            setIsLoading(false);
            return; // Exit early, don't continue to the response.ok check
          }
        }
        
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          // Update localStorage with fresh data
          localStorage.setItem('userId', data.user.id.toString());
          localStorage.setItem('username', data.user.username);
          setIsLoading(false);
        } else {
          // Token expired or invalid even after refresh attempt
          // Only clear if we didn't already handle network error above
          console.log('Token expired or invalid');
          setUser(null);
          clearTokens();
          localStorage.removeItem('userId');
          localStorage.removeItem('username');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Auth check failed (network error):', error);
        // On network error, keep user logged in - don't clear tokens
        // This prevents logout on temporary network issues or database wake-up delays
        const storedUserId = localStorage.getItem('userId');
        const storedUsername = localStorage.getItem('username');
        
        if (storedUserId && storedUsername && getRefreshToken()) {
          // Keep user logged in with cached data during network issues
          console.log('Network error detected - keeping user logged in with cached data');
          setUser({
            id: parseInt(storedUserId),
            username: storedUsername
          });
        } else {
          // No cached data, set unauthenticated
          setUser(null);
        }
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
      
      const refreshToken = getRefreshToken();
      
      // Call server logout endpoint to delete refresh token
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });
      
      console.log('Logout response:', response.status, response.statusText);
      
      // Clear client state
      setUser(null);
      clearTokens(); // Clear JWT tokens
      localStorage.clear(); // Clear all localStorage items
      
      // Force a hard reload of the page to login
      console.log('Redirecting to login...');
      window.location.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Clear everything and reload even on error
      setUser(null);
      clearTokens();
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