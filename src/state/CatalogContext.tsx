import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product } from '../components/ProductCard';
import { apiProductToProduct, fetchCategories, fetchProducts } from '../data/api';
import type { ApiCategory } from '../data/api';

interface CatalogContextValue {
  products: Product[];
  categories: ApiCategory[];
  loading: boolean;
  error: string | null;
  flashSale: Product[];
  featured: Product[];
  wholesale: Product[];
  topRated: Product[];
  newArrivals: Product[];
  corporateReady: Product[];
  bulkOrder: Product[];
  enterpriseSolutions: Product[];
  seasonal: Product[];
  getProductById: (id: string) => Product | undefined;
  findProductByQuery: (query: string) => Product | undefined;
  refresh: () => Promise<void>;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

const CATALOG_CACHE_KEY = 'jemina:catalog:v2';
const CATALOG_CACHE_TTL_MS = 3 * 24 * 60 * 60 * 1000;

interface CatalogCache {
  ts: number;
  products: Product[];
  categories: ApiCategory[];
}

function persistCatalog(products: Product[], categories: ApiCategory[]) {
  const payload: CatalogCache = { ts: Date.now(), products, categories };
  AsyncStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(payload)).catch(() => {});
}

function derive(products: Product[]) {
  const flashSale = products.filter(p => p.badge?.variant === 'flash' || Boolean(p.discount)).slice(0, 25);
  const featured = products.filter(p => p.badge?.variant === 'featured').slice(0, 25);
  const wholesale = products.filter(
    p => p.badge?.variant === 'wholesale' || p.badge?.variant === 'corporate',
  );
  const isB2B = (p: Product) =>
    Boolean(p.isWholesale) || Boolean(p.bulkOrder) || Boolean(p.corporateReady) || Boolean(p.enterpriseSolution);
  const topRated = [...products]
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 6);
  const newArrivals = [...products]
    .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
    .slice(0, 10);
  const wholesaleProducts = products.filter(p => p.isWholesale || p.badge?.variant === 'wholesale');
  const bulkProducts = products.filter(p => p.bulkOrder);
  const corporateReadyProducts = products.filter(p => p.corporateReady || p.badge?.variant === 'corporate');
  const enterpriseSolutions = products.filter(p => p.enterpriseSolution);

  // Cross-block dedupe (website parity): the homepage renders many overlapping
  // buckets. Ensure a product does not repeat across the sections that appear
  // together on the Home screen, favoring the more targeted bucket first.
  // Priority: featured > topRated > flash > seasonal.
  const featuredIds = new Set(featured.map(p => p.id));
  const topRatedDedup = topRated.filter(p => !featuredIds.has(p.id));
  const topRatedIds = new Set(topRatedDedup.map(p => p.id));
  const flashDedup = flashSale.filter(p => !featuredIds.has(p.id) && !topRatedIds.has(p.id));
  const flashIds = new Set(flashDedup.map(p => p.id));

  const seasonalProducts = products.filter(
    p =>
      (p.seasonal ||
        p.holidaySpecial ||
        Boolean(p.seasonalTheme) ||
        p.badge?.variant === 'flash' ||
        Boolean(p.discount)) &&
      !featuredIds.has(p.id) &&
      !topRatedIds.has(p.id) &&
      !flashIds.has(p.id),
  );

  return {
    flashSale: flashDedup,
    featured,
    wholesale,
    topRated: topRatedDedup,
    newArrivals,
    b2b: products.filter(isB2B),
    wholesaleProducts,
    bulkProducts,
    corporateReadyProducts,
    enterpriseSolutions,
    seasonalProducts,
  };
}

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!options.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const [apiProducts, apiCategories] = await Promise.all([fetchProducts(), fetchCategories()]);
      const mapped = apiProducts.map(apiProductToProduct);
      if (mapped.length > 0) {
        setProducts(mapped);
        persistCatalog(mapped, apiCategories);
      }
      setCategories(apiCategories);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CATALOG_CACHE_KEY);
        if (!cancelled && raw) {
          const cached = JSON.parse(raw) as CatalogCache;
          if (
            Array.isArray(cached.products) &&
            cached.products.length > 0 &&
            Date.now() - Number(cached.ts ?? 0) < CATALOG_CACHE_TTL_MS
          ) {
            setProducts(cached.products);
            if (Array.isArray(cached.categories)) {
              setCategories(cached.categories);
            }
            setLoading(false);
          }
        }
      } catch {
        // A corrupt cache should never block the live fetch.
      }

      if (!cancelled) {
        refresh({ silent: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const getProductById = useCallback(
    (id: string) => products.find(p => p.id === id),
    [products],
  );

  const findProductByQuery = useCallback(
    (query: string) => {
      const q = query.toLowerCase();
      return products.find(
        p => p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q),
      );
    },
    [products],
  );

  const derived = useMemo(() => derive(products), [products]);

  const value = useMemo<CatalogContextValue>(
    () => ({
      products,
      categories,
      loading,
      error,
      flashSale: derived.flashSale,
      featured: derived.featured,
      wholesale: derived.wholesale,
      topRated: derived.topRated,
      newArrivals: derived.newArrivals,
      corporateReady: derived.corporateReadyProducts,
      bulkOrder: derived.bulkProducts,
      enterpriseSolutions: derived.enterpriseSolutions,
      seasonal: derived.seasonalProducts,
      getProductById,
      findProductByQuery,
      refresh,
    }),
    [products, categories, loading, error, derived, getProductById, findProductByQuery, refresh],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) {
    throw new Error('useCatalog must be used within CatalogProvider');
  }
  return ctx;
}
