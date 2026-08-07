import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
}

interface CartContextValue {
  items: CartItem[];
  vendorGroups: VendorGroup[];
  itemCount: number;
  subtotal: number;
  totalDeliveryFees: number;
  cartSource: 'server' | 'local';
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
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
  return Array.from(map.entries()).map(([key, groupItems]) => {
    const firstVendor = groupItems[0].product.vendor;
    const deliveryFee = groupItems.reduce((sum, i) => sum + (i.product.deliveryFee ?? 0), 0);
    return {
      vendorId: firstVendor?.id ?? undefined,
      vendorName: firstVendor?.name ?? 'Jemina Official',
      items: groupItems,
      deliveryFee: Math.max(deliveryFee, 10000),
    };
  });
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartSource, setCartSource] = useState<'server' | 'local'>('local');

  useEffect(() => {
    if (!token) {
      setCartSource('local');
      return;
    }
    let cancelled = false;
    apiGetCart(token)
      .then(serverItems => {
        if (cancelled) {
          return;
        }
        setItems(serverItems.map(toLocalItem));
        setCartSource('server');
      })
      .catch(() => {
        if (!cancelled) {
          setCartSource('local');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

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

  const value = useMemo(
    () => ({
      items,
      vendorGroups,
      itemCount,
      subtotal,
      totalDeliveryFees,
      cartSource,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    }),
    [items, vendorGroups, itemCount, subtotal, totalDeliveryFees, cartSource, addItem, removeItem, updateQuantity, clearCart],
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
