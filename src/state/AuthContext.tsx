import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  apiGetUser,
  apiGoogleLogin,
  apiLogin,
  apiLoginWithPin,
  apiLogout,
  apiRegister,
  apiVerifyTwoFactor,
  subscribeUnauthorized,
  UnauthorizedError,
  TwoFactorRequiredError,
  AccountPendingError,
  isAccountPending,
  isTwoFactorChallenge,
} from '../data/api';
import type { ApiUser } from '../data/api';
import { clearDeviceToken, removeDeviceTokenFromServer, syncDeviceToken } from '../lib/notifications';

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
  loginWithPin: (email: string, pin: string) => Promise<User>;
  loginWithGoogle: (idToken: string) => Promise<User>;
  completeTwoFactorLogin: (email: string, code: string) => Promise<User>;
  register: (name: string, email: string, password: string, phone: string) => Promise<User>;
  logout: () => void;
  expireSession: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const MOCK_CUSTOMER_PASSWORD = 'demo@420';

export const SEEDED_CUSTOMERS: User[] = [
  {
    id: 'demo-1',
    name: 'Demo Account',
    email: 'demo@jemina.com',
    phone: '+256700000000',
    role: 'customer',
    createdAt: '2026-01-01T00:00:00Z',
  },
];

export const DEMO_USER: User = SEEDED_CUSTOMERS[0];

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
        if (parsed?.token && parsed.authMode === 'live') {
          apiGetUser(parsed.token)
            .then(() => {})
            .catch(e => {
              if (cancelled) {
                return;
              }
              if (e instanceof UnauthorizedError) {
                setUser(null);
                setToken(null);
                setAuthMode(null);
              }
            });
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

  const expireSession = useCallback(() => {
    setUser(null);
    setToken(null);
    setAuthMode(null);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeUnauthorized(() => {
      expireSession();
    });
    return unsubscribe;
  }, [expireSession]);

  useEffect(() => {
    if (!isHydrated || authMode !== 'live' || !token || !user) {
      return;
    }
    syncDeviceToken(token);
  }, [isHydrated, authMode, token, user]);

  useEffect(() => {
    if (!isHydrated || (authMode === 'live' && token && user)) {
      return;
    }
    clearDeviceToken();
  }, [isHydrated, authMode, token, user]);

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
      const result = await apiLogin(normalized, password);
      if (isTwoFactorChallenge(result)) {
        throw new TwoFactorRequiredError(result.email, result.resendAfter, result.message);
      }
      if (isAccountPending(result)) {
        const account = apiUserToUser(result.user);
        setUser(account);
        setToken(result.token);
        setAuthMode('live');
        throw new AccountPendingError(result.user.email, result.message, result.account_deactivated === true);
      }
      const account = apiUserToUser(result.user);
      setUser(account);
      setToken(result.token);
      setAuthMode('live');
      return account;
    } catch (liveError) {
      if (
        liveError instanceof AccountPendingError ||
        liveError instanceof TwoFactorRequiredError
      ) {
        throw liveError;
      }
      await delay(400);
      const isNetworkFailure =
        liveError instanceof TypeError ||
        /network request failed|failed to fetch|net::|timed out|timeout|no connection|offline/i.test(
          liveError instanceof Error ? liveError.message : '',
        );
      if (!isNetworkFailure) {
        throw liveError;
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

  const loginWithPin = useCallback(async (email: string, pin: string) => {
    const normalized = email.trim().toLowerCase();
    const result = await apiLoginWithPin(normalized, pin.trim());
    if (isTwoFactorChallenge(result)) {
      throw new TwoFactorRequiredError(result.email, result.resendAfter, result.message);
    }
    if (isAccountPending(result)) {
      const account = apiUserToUser(result.user);
      setUser(account);
      setToken(result.token);
      setAuthMode('live');
      throw new AccountPendingError(result.user.email, result.message, result.account_deactivated === true);
    }
    const account = apiUserToUser(result.user);
    setUser(account);
    setToken(result.token);
    setAuthMode('live');
    return account;
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const result = await apiGoogleLogin(idToken);
    if (isTwoFactorChallenge(result)) {
      throw new TwoFactorRequiredError(result.email, result.resendAfter, result.message);
    }
    if (isAccountPending(result)) {
      const account = apiUserToUser(result.user);
      setUser(account);
      setToken(result.token);
      setAuthMode('live');
      throw new AccountPendingError(result.user.email, result.message, result.account_deactivated === true);
    }
    const account = apiUserToUser(result.user);
    setUser(account);
    setToken(result.token);
    setAuthMode('live');
    return account;
  }, []);

  const completeTwoFactorLogin = useCallback(async (email: string, code: string) => {
    const result = await apiVerifyTwoFactor(email.trim().toLowerCase(), code.trim());
    if (isTwoFactorChallenge(result)) {
      throw new TwoFactorRequiredError(result.email, result.resendAfter, result.message);
    }
    if (isAccountPending(result)) {
      const account = apiUserToUser(result.user);
      setUser(account);
      setToken(result.token);
      setAuthMode('live');
      throw new AccountPendingError(result.user.email, result.message, result.account_deactivated === true);
    }
    const account = apiUserToUser(result.user);
    setUser(account);
    setToken(result.token);
    setAuthMode('live');
    return account;
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, phone: string) => {
    const normalized = email.trim().toLowerCase();
    try {
      const result = await apiRegister(name.trim(), normalized, password, phone.trim());
      const account = apiUserToUser(result.user);
      setUser(account);
      setToken(result.token ?? null);
      setAuthMode('live');
      if (result.accountPending) {
        throw new AccountPendingError(result.user?.email ?? normalized, result.message, false);
      }
      return account;
    } catch (liveError) {
      if (liveError instanceof AccountPendingError) {
        throw liveError;
      }
      await delay(400);
      const isNetworkFailure =
        liveError instanceof TypeError ||
        /network request failed|failed to fetch|net::|timed out|timeout|no connection|offline/i.test(
          liveError instanceof Error ? liveError.message : '',
        );
      if (!isNetworkFailure) {
        throw liveError;
      }
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
        phone: phone.trim() || undefined,
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
      removeDeviceTokenFromServer(token).catch(() => {});
    }
    setUser(null);
    setToken(null);
    setAuthMode(null);
  }, [token]);

  const updateUser = useCallback((next: User) => {
    setUser(next);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      authMode,
      isAuthenticated: user !== null,
      isHydrated,
      login,
      loginWithPin,
      loginWithGoogle,
      completeTwoFactorLogin,
      register,
      logout,
      expireSession,
      updateUser,
    }),
    [user, token, authMode, isHydrated, login, loginWithPin, loginWithGoogle, completeTwoFactorLogin, register, logout, expireSession, updateUser],
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
