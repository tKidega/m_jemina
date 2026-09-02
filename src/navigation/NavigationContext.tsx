import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

export type RouteName =
  | 'Home'
  | 'Marketplace'
  | 'ProductDetails'
  | 'VendorProfile'
  | 'Login'
  | 'Register'
  | 'Checkout'
  | 'Orders'
  | 'About'
  | 'Services'
  | 'TermsOfService'
  | 'PrivacyPolicy'
  | 'Contact'
  | 'Payment'
  | 'Wishlist'
  | 'MyReviews'
  | 'CreditHistory'
  | 'BuyCredits'
  | 'SearchResults'
  | 'ProductInquiry'
  | 'EditProfile'
  | 'AccountSettings'
  | 'AddressBook'
  | 'OrderTracking'
  | 'Surveys'
  | 'VendorActions'
  | 'HelpCenter'
  | 'Messages'
  | 'PaymentMethods'
  | 'Search'
  | 'AllProducts';
export type TabName = 'Home' | 'Marketplace' | 'Cart' | 'Profile';

interface NavState {
  tab: TabName;
  route: RouteName;
  params?: Record<string, unknown>;
}

interface NavigationContextValue {
  tab: TabName;
  route: RouteName;
  params?: Record<string, unknown>;
  canGoBack: boolean;
  navigate: (route: RouteName, params?: Record<string, unknown>) => void;
  switchTab: (tab: TabName) => void;
  goBack: () => void;
  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  navigateFromSidebar: (route: RouteName, tab?: TabName) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<NavState>({ tab: 'Home', route: 'Home' });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const backStackRef = useRef<NavState[]>([]);

  const applyState = useCallback((next: NavState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const navigate = useCallback((route: RouteName, params?: Record<string, unknown>) => {
    backStackRef.current.push(stateRef.current);
    applyState({ ...stateRef.current, route, params });
    setSidebarOpen(false);
  }, [applyState]);

  const switchTab = useCallback((tab: TabName) => {
    backStackRef.current = [];
    const route: RouteName = tab === 'Cart' || tab === 'Profile' ? 'Home' : tab;
    applyState({ tab, route });
    setSidebarOpen(false);
  }, [applyState]);

  const goBack = useCallback(() => {
    const prev = backStackRef.current.pop();
    if (prev) {
      applyState(prev);
    } else {
      applyState({
        tab: stateRef.current.tab,
        route: stateRef.current.tab === 'Marketplace' ? 'Marketplace' : 'Home',
      });
    }
    setSidebarOpen(false);
  }, [applyState]);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const navigateFromSidebar = useCallback(
    (route: RouteName, tab?: TabName) => {
      setSidebarOpen(false);
      if (tab) {
        backStackRef.current = [];
        applyState({ tab, route: tab === 'Cart' || tab === 'Profile' ? 'Home' : tab });
      } else {
        backStackRef.current.push(stateRef.current);
        applyState({ ...stateRef.current, route, params: undefined });
      }
    },
    [applyState],
  );

  const canGoBack = backStackRef.current.length > 0;

  const value = useMemo(
    () => ({ ...state, canGoBack, navigate, switchTab, goBack, sidebarOpen, openSidebar, closeSidebar, navigateFromSidebar }),
    [state, canGoBack, navigate, switchTab, goBack, sidebarOpen, openSidebar, closeSidebar, navigateFromSidebar],
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return ctx;
}