import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product } from '../components/ProductCard';
import { useAuth } from './AuthContext';
import {
  apiAddToCart,
  apiClearCart,
  apiGetCart,
  apiProductToProduct,
  apiRemoveCartItem,
  apiUpdateCartItem,
} from '../data/api';
import type { ApiCartItem } from '../data/api';

export type Fulfilment = 'delivery' | 'pickup';

const FULFILMENT_STORAGE_KEY = '@jemina/fulfilment';

export interface CartItem {
  product: Product;
  quantity: number;
  cartItemId?: number;
}

export interface VendorGroup {
  vendorId?: number;
  vendorName: string;
  items: CartItem[];
  deliveryFee: number;
  shippingFee: number;
}

interface CartContextValue {
  items: CartItem[];
  vendorGroups: VendorGroup[];
  itemCount: number;
  subtotal: number;
  totalDeliveryFees: number;
  totalShippingFees: number;
  fulfilment: Fulfilment;
  setFulfilment: (next: Fulfilment) => void;
  cartSource: 'server' | 'local';
  loading: boolean;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

function toLocalItem(item: ApiCartItem): CartItem {
  return {
    product: apiProductToProduct(item.product),
    quantity: item.quantity,
    cartItemId: item.id,
  };
}

function groupByVendor(items: CartItem[]): VendorGroup[] {
  const map = new Map<string, CartItem[]>();
  for (const item of items) {
    const key = String(item.product.vendor?.id ?? item.product.vendor?.name ?? 'jemina');
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).map(([, groupItems]) => {
    const firstVendor = groupItems[0].product.vendor;
    const deliveryFee = groupItems.reduce(
      (sum, i) => sum + (i.product.deliveryFee ?? 0) * i.quantity,
      0
    );
    const shippingFee = groupItems.reduce(
      (sum, i) => sum + (i.product.shippingFee ?? 0) * i.quantity,
      0
    );
    return {
      vendorId: firstVendor?.id ?? undefined,
      vendorName: firstVendor?.name ?? 'Jemina Official',
      items: groupItems,
      deliveryFee,
      shippingFee,
    };
  });
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { token, isHydrated } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartSource, setCartSource] = useState<'server' | 'local'>('local');
  const [loading, setLoading] = useState(true);
  const [fulfilment, setFulfilmentState] = useState<Fulfilment>('delivery');

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(FULFILMENT_STORAGE_KEY)
      .then(raw => {
        if (cancelled) return;
        if (raw === 'pickup' || raw === 'delivery') setFulfilmentState(raw);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const setFulfilment = useCallback((next: Fulfilment) => {
    setFulfilmentState(next);
    AsyncStorage.setItem(FULFILMENT_STORAGE_KEY, next).catch(() => {});
  }, []);

  const refresh = useCallback(async () => {
    if (!token) {
      setItems([]);
      setCartSource('local');
      return;
    }
    try {
      const serverItems = await apiGetCart(token);
      setItems(serverItems.map(toLocalItem));
      setCartSource('server');
    } catch {
      setCartSource('local');
    }
  }, [token]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    if (!token) {
      setItems([]);
      setCartSource('local');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    refresh()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, isHydrated, refresh]);

  const addItem = useCallback(
    (product: Product, quantity = 1) => {
      const qty = Math.max(1, Math.round(quantity));
      setItems(prev => {
        const existing = prev.find(i => i.product.id === product.id);
        if (existing) {
          return prev.map(i =>
            i.product.id === product.id ? { ...i, quantity: i.quantity + qty } : i,
          );
        }
        return [...prev, { product, quantity: qty }];
      });
      if (token) {
        apiAddToCart(token, product.id, qty).catch(() => {});
      }
    },
    [token],
  );

  const removeItem = useCallback(
    (productId: string) => {
      const target = items.find(i => i.product.id === productId);
      setItems(prev => prev.filter(i => i.product.id !== productId));
      if (token && target?.cartItemId != null) {
        apiRemoveCartItem(token, target.cartItemId).catch(() => {});
      }
    },
    [token, items],
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      const target = items.find(i => i.product.id === productId);
      setItems(prev =>
        quantity <= 0
          ? prev.filter(i => i.product.id !== productId)
          : prev.map(i => (i.product.id === productId ? { ...i, quantity } : i)),
      );
      if (token && target?.cartItemId != null) {
        if (quantity <= 0) {
          apiRemoveCartItem(token, target.cartItemId).catch(() => {});
        } else {
          apiUpdateCartItem(token, target.cartItemId, quantity).catch(() => {});
        }
      }
    },
    [token, items],
  );

  const clearCart = useCallback(() => {
    setItems([]);
    if (token) {
      apiClearCart(token).catch(() => {});
    }
  }, [token]);

  const itemCount = useMemo(() => items.length, [items]);
  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.product.priceValue * i.quantity, 0),
    [items],
  );
  const vendorGroups = useMemo(() => groupByVendor(items), [items]);
  const totalDeliveryFees = useMemo(
    () => vendorGroups.reduce((sum, g) => sum + g.deliveryFee, 0),
    [vendorGroups],
  );
  const totalShippingFees = useMemo(
    () => vendorGroups.reduce((sum, g) => sum + g.shippingFee, 0),
    [vendorGroups],
  );

  const value = useMemo(
    () => ({
      items,
      vendorGroups,
      itemCount,
      subtotal,
      totalDeliveryFees,
      totalShippingFees,
      fulfilment,
      setFulfilment,
      cartSource,
      loading,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      refresh,
    }),
    [items, vendorGroups, itemCount, subtotal, totalDeliveryFees, totalShippingFees, fulfilment, setFulfilment, cartSource, loading, addItem, removeItem, updateQuantity, clearCart, refresh],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider');
  }
  return ctx;
}
