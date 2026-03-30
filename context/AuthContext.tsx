'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { loadFromStorage, saveToStorage, removeFromStorage } from '@/utils/storage';

const AUTH_TOKEN_KEY = 'yumivibe-auth-token';
const AUTH_USER_KEY = 'yumivibe-auth-user';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return true;
    const payload = JSON.parse(atob(parts[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || initRef.current) return;
    initRef.current = true;

    const token = loadFromStorage<string>(AUTH_TOKEN_KEY);
    const savedUser = loadFromStorage<AuthUser>(AUTH_USER_KEY);

    if (token && savedUser && !isTokenExpired(token)) {
      setUser(savedUser);
    } else {
      removeFromStorage(AUTH_TOKEN_KEY);
      removeFromStorage(AUTH_USER_KEY);
    }
    setIsLoading(false);
  }, [mounted]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error?.message ?? 'Login failed');
    }

    const { user: authUser, token } = json.data;
    saveToStorage(AUTH_TOKEN_KEY, token);
    saveToStorage(AUTH_USER_KEY, authUser);
    setUser(authUser);
  }, []);

  const register = useCallback(async (email: string, password: string, displayName?: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName }),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error?.message ?? 'Registration failed');
    }

    const { user: authUser, token } = json.data;
    saveToStorage(AUTH_TOKEN_KEY, token);
    saveToStorage(AUTH_USER_KEY, authUser);
    setUser(authUser);
  }, []);

  const logout = useCallback(() => {
    removeFromStorage(AUTH_TOKEN_KEY);
    removeFromStorage(AUTH_USER_KEY);
    setUser(null);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
