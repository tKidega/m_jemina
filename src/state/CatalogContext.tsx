import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Product } from '../components/ProductCard';
import { PRODUCTS as FALLBACK_PRODUCTS } from '../data/products';
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
  corporateReady: Product[];
  bulkOrder: Product[];
  enterpriseSolutions: Product[];
  seasonal: Product[];
  getProductById: (id: string) => Product | undefined;
  findProductByQuery: (query: string) => Product | undefined;
  refresh: () => Promise<void>;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

function derive(products: Product[]) {
  const flashSale = products.filter(p => p.badge?.variant === 'flash' || Boolean(p.discount));
  const featured = products.filter(p => p.badge?.variant === 'featured');
  const wholesale = products.filter(
    p => p.badge?.variant === 'wholesale' || p.badge?.variant === 'corporate',
  );
  const isB2B = (p: Product) =>
    Boolean(p.isWholesale) || Boolean(p.bulkOrder) || Boolean(p.corporateReady) || Boolean(p.enterpriseSolution);
  const topRated = [...products]
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 6);
  const wholesaleProducts = products.filter(p => p.isWholesale || p.badge?.variant === 'wholesale');
  const bulkProducts = products.filter(p => p.bulkOrder);
  const corporateReadyProducts = products.filter(p => p.corporateReady || p.badge?.variant === 'corporate');
  const enterpriseSolutions = products.filter(p => p.enterpriseSolution);
  const seasonalProducts = products.filter(
    p =>
      p.seasonal ||
      p.holidaySpecial ||
      Boolean(p.seasonalTheme) ||
      p.badge?.variant === 'flash' ||
      Boolean(p.discount),
  );
  return {
    flashSale,
    featured,
    wholesale,
    topRated,
    b2b: products.filter(isB2B),
    wholesaleProducts,
    bulkProducts,
    corporateReadyProducts,
    enterpriseSolutions,
    seasonalProducts,
  };
}

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [apiProducts, apiCategories] = await Promise.all([fetchProducts(), fetchCategories()]);
      const mapped = apiProducts.map(apiProductToProduct);
      if (mapped.length > 0) {
        setProducts(mapped);
      }
      setCategories(apiCategories);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load catalog');
      setProducts(FALLBACK_PRODUCTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
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
