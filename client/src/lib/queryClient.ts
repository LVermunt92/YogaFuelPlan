import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "./auth-storage";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Automatic token refresh when access token expires
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  
  if (!refreshToken) {
    return null;
  }
  
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    
    if (!res.ok) {
      // Refresh token is invalid/expired, clear everything
      clearTokens();
      return null;
    }
    
    const data = await res.json();
    setTokens(data.accessToken, refreshToken);
    return data.accessToken;
  } catch (error) {
    clearTokens();
    return null;
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
    const newAccessToken = await refreshAccessToken();
    
    if (newAccessToken) {
      // Retry the original request with new token
      headers.Authorization = `Bearer ${newAccessToken}`;
      res = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });
    }
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
      const newAccessToken = await refreshAccessToken();
      
      if (newAccessToken) {
        // Retry the original request with new token
        headers.Authorization = `Bearer ${newAccessToken}`;
        res = await fetch(queryKey.join("/") as string, {
          headers,
        });
      }
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
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
