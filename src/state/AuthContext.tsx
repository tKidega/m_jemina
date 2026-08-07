import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiLogin, apiLogout, apiRegister } from '../data/api';
import type { ApiUser } from '../data/api';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'vendor';
  createdAt: string;
}

interface AuthContextValue {  user: User | null;
  token: string | null;
  authMode: 'live' | 'demo' | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const MOCK_CUSTOMER_PASSWORD = 'customer@420';

export const SEEDED_CUSTOMERS: User[] = [
  {
    id: '3',
    name: 'Kidega Timothy Labeja',
    email: 'bits.bytes.loko@gmail.com',
    phone: '+256765368345',
    role: 'customer',
    createdAt: '2026-07-15T00:48:26Z',
  },
  {
    id: '5',
    name: 'Demo Account',
    email: 'user@email.com',
    phone: '+256765368348',
    role: 'customer',
    createdAt: '2026-07-15T21:34:05Z',
  },
  {
    id: '6',
    name: 'Ouma Nobert',
    email: 'oumanobert934@gmail.com',
    phone: '0764003659',
    role: 'customer',
    createdAt: '2026-07-16T12:27:57Z',
  },
  {
    id: '7',
    name: 'TEBERE SIMON PETER KERI',
    email: 'spktebere@gmail.com',
    phone: '0772212049',
    role: 'customer',
    createdAt: '2026-07-17T01:53:28Z',
  },
];

export const DEMO_USER: User = SEEDED_CUSTOMERS[1];

const registeredUsers = new Map<string, User>(SEEDED_CUSTOMERS.map(u => [u.email, u]));

const userPasswords = new Map<string, string>(
  SEEDED_CUSTOMERS.map(u => [u.email, MOCK_CUSTOMER_PASSWORD]),
);

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function apiUserToUser(api: ApiUser): User {
  return {
    id: String(api.id),
    name: api.name || 'JEMINA Customer',
    email: api.email.toLowerCase(),
    phone: api.phone ?? undefined,
    role: api.role === 'vendor' ? 'vendor' : 'customer',
    createdAt: api.created_at ?? new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'live' | 'demo' | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const persistKey = '@jemina/auth/v1';
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(persistKey)
      .then(raw => {
        if (cancelled || !raw) {
          return;
        }
        const parsed = JSON.parse(raw) as { user?: User; token?: string | null; authMode?: 'live' | 'demo' | null };
        if (parsed && parsed.user) {
          setUser(parsed.user);
          setToken(parsed.token ?? null);
          setAuthMode(parsed.authMode ?? null);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setIsHydrated(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [persistKey]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }
    saveTimer.current = setTimeout(() => {
      if (user) {
        AsyncStorage.setItem(persistKey, JSON.stringify({ user, token, authMode })).catch(() => {});
      } else {
        AsyncStorage.removeItem(persistKey).catch(() => {});
      }
    }, 200);
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, [user, token, authMode, persistKey, isHydrated]);

  const login = useCallback(async (email: string, password: string) => {
    const normalized = email.trim().toLowerCase();
    try {
      const { user: apiUser, token: apiToken } = await apiLogin(normalized, password);
      const account = apiUserToUser(apiUser);
      setUser(account);
      setToken(apiToken);
      setAuthMode('live');
      return account;
    } catch (liveError) {
      await delay(400);
      const isNetworkFailure =
        liveError instanceof TypeError ||
        /network request failed|failed to fetch|net::|timed out|timeout|no connection|offline/i.test(
          liveError instanceof Error ? liveError.message : '',
        );
      if (!isNetworkFailure) {
        throw new Error(
          liveError instanceof Error
            ? liveError.message
            : 'Login failed. Please try again.',
        );
      }
      const account = registeredUsers.get(normalized);
      if (!account) {
        throw new Error('No account found with this email.');
      }
      if (userPasswords.get(normalized) !== password) {
        throw new Error('Incorrect password.');
      }
      setUser(account);
      setToken(null);
      setAuthMode('demo');
      return account;
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    await delay(600);
    setUser(DEMO_USER);
    setToken(null);
    setAuthMode('demo');
    return DEMO_USER;
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const normalized = email.trim().toLowerCase();
    try {
      const apiUser = await apiRegister(name.trim(), normalized, password);
      const account = apiUserToUser(apiUser);
      setUser(account);
      setToken(null);
      setAuthMode('live');
      return account;
    } catch (liveError) {
      await delay(400);
      if (registeredUsers.has(normalized)) {
        throw new Error(
          liveError instanceof Error ? liveError.message : 'An account with this email already exists.',
        );
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters.');
      }
      const account: User = {
        id: String(registeredUsers.size + 1),
        name: name.trim(),
        email: normalized,
        role: 'customer',
        createdAt: new Date().toISOString(),
      };
      registeredUsers.set(normalized, account);
      userPasswords.set(normalized, password);
      setUser(account);
      setToken(null);
      setAuthMode('demo');
      return account;
    }
  }, []);

  const logout = useCallback(() => {
    if (token) {
      apiLogout(token).catch(() => {});
    }
    setUser(null);
    setToken(null);
    setAuthMode(null);
  }, [token]);

  const value = useMemo(
    () => ({
      user,
      token,
      authMode,
      isAuthenticated: user !== null,
      isHydrated,
      login,
      loginWithGoogle,
      register,
      logout,
    }),
    [user, token, authMode, isHydrated, login, loginWithGoogle, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
