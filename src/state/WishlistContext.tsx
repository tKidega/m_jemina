import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { apiAddToWishlist, apiGetWishlist, apiRemoveFromWishlist } from '../data/api';

interface WishlistContextValue {
  loading: boolean;
  isSaved: (productId: number | string) => boolean;
  toggle: (productId: number | string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) {
      setSavedIds(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const wishlist = await apiGetWishlist(token);
      setSavedIds(new Set(wishlist.map(item => String(item.product.id))));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh().catch(() => setSavedIds(new Set()));
  }, [refresh]);

  const isSaved = useCallback(
    (productId: number | string) => savedIds.has(String(productId)),
    [savedIds],
  );

  const toggle = useCallback(
    async (productId: number | string): Promise<boolean> => {
      if (!token) {
        return false;
      }
      const id = String(productId);
      const current = savedIds.has(id);
      if (current) {
        await apiRemoveFromWishlist(token, id);
      } else {
        await apiAddToWishlist(token, id);
      }
      setSavedIds(prev => {
        const next = new Set(prev);
        if (current) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      return true;
    },
    [token, savedIds],
  );

  const value = useMemo(
    () => ({ loading, isSaved, toggle, refresh }),
    [loading, isSaved, toggle, refresh],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    throw new Error('useWishlist must be used within WishlistProvider');
  }
  return ctx;
}