import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

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

  const navigate = useCallback((route: RouteName, params?: Record<string, unknown>) => {
    setState(prev => ({ ...prev, route, params }));
    setSidebarOpen(false);
  }, []);

  const switchTab = useCallback((tab: TabName) => {
    const route: RouteName = tab === 'Cart' || tab === 'Profile' ? 'Home' : tab;
    setState({ tab, route });
    setSidebarOpen(false);
  }, []);

  const goBack = useCallback(() => {
    setState(prev => ({ tab: prev.tab, route: prev.tab === 'Marketplace' ? 'Marketplace' : 'Home' }));
  }, []);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const navigateFromSidebar = useCallback(
    (route: RouteName, tab?: TabName) => {
      setSidebarOpen(false);
      if (tab) {
        setState({ tab, route: tab === 'Cart' || tab === 'Profile' ? 'Home' : tab });
      } else {
        setState(prev => ({ ...prev, route, params: undefined }));
      }
    },
    [],
  );

  const value = useMemo(
    () => ({ ...state, navigate, switchTab, goBack, sidebarOpen, openSidebar, closeSidebar, navigateFromSidebar }),
    [state, navigate, switchTab, goBack, sidebarOpen, openSidebar, closeSidebar, navigateFromSidebar],
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
