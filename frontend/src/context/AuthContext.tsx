import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  apiRequest,
  getApiBaseUrl,
  getStoredToken,
} from '../services/api';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  tenant_id: string;
  role: string;
  company_name?: string;
}

interface LoginResponse {
  user: AuthUser;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  authFetch: (path: string, options?: RequestInit) => Promise<Response>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, name: string, password: string, tenantId: string) => Promise<void>;
  setSession: (response: LoginResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const authFetch = useCallback((path: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    headers.set('X-Requested-With', 'XMLHttpRequest');

    const token = getStoredToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    return fetch(`${getApiBaseUrl()}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });
  }, []);

  const logout = useCallback(() => {
    void apiRequest('/auth/logout', { method: 'POST' }).catch(() => undefined);
    setUser(null);
  }, []);

  const setSession = useCallback((response: LoginResponse) => {
    setUser(response.user);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      token: null,
    });

    setSession(response);
  }, [setSession]);

  const signup = useCallback(
    async (email: string, name: string, password: string, tenantId: string) => {
      const response = await apiRequest<LoginResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, name, password, tenant_id: tenantId }),
        token: null,
      });

      setSession(response);
    },
    [setSession],
  );

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const response = await apiRequest<{ user: AuthUser }>('/auth/me', {
          method: 'GET',
        });
        setUser(response.user);
      } catch (error) {
        try {
          await apiRequest('/auth/refresh', {
            method: 'POST',
          });
          const refreshed = await apiRequest<{ user: AuthUser }>('/auth/me', {
            method: 'GET',
          });
          setUser(refreshed.user);
        } catch {
          setUser(null);
        }
      } finally {
        setIsInitializing(false);
      }
    };

    void bootstrap();
  }, [logout]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isInitializing,
      authFetch,
      login,
      signup,
      setSession,
      logout,
    }),
    [authFetch, isInitializing, login, signup, setSession, logout, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};