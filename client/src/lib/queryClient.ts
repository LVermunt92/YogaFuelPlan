import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "./auth-storage";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
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
    // Network error - don't clear tokens, return null to retry later
    console.error('Token refresh failed (network error):', error);
    return { success: false, reason: 'network_error' };
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = getAccessToken();
  const headers: HeadersInit = data ? { "Content-Type": "application/json" } : {};
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  let res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });
  
  // If 401 and we have a refresh token, try to refresh and retry
  if (res.status === 401 && getRefreshToken()) {
    const refreshResult = await refreshAccessToken();
    
    if (refreshResult.success) {
      // Retry the original request with new token
      headers.Authorization = `Bearer ${refreshResult.token}`;
      res = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });
    }
    // If network error, don't throw - let the request fail gracefully
    // The UI should handle this by showing cached data or retry option
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = getAccessToken();
    const headers: HeadersInit = {};
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    let res = await fetch(queryKey.join("/") as string, {
      headers,
    });
    
    // If 401 and we have a refresh token, try to refresh and retry
    if (res.status === 401 && getRefreshToken()) {
      const refreshResult = await refreshAccessToken();
      
      if (refreshResult.success) {
        // Retry the original request with new token
        headers.Authorization = `Bearer ${refreshResult.token}`;
        res = await fetch(queryKey.join("/") as string, {
          headers,
        });
      }
      // If network error, don't clear tokens - let UI handle gracefully
    }

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes - balance between performance and freshness
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
