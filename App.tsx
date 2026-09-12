import React, { useEffect } from 'react';
import { BackHandler, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationProvider, useNavigation } from './src/navigation/NavigationContext';
import { CartProvider } from './src/state/CartContext';
import { AuthProvider } from './src/state/AuthContext';
import { CatalogProvider } from './src/state/CatalogContext';
import { WishlistProvider } from './src/state/WishlistContext';
import { NotificationProvider, useNotification } from './src/state/NotificationContext';
import {
  getInitialPush,
  requestNotificationPermission,
  subscribeToPushEvents,
  subscribeToPushOpened,
  PushEvent,
} from './src/lib/notifications';
import { Sidebar } from './src/components/Sidebar';
import { HomeScreen } from './src/screens/HomeScreen';
import { MarketplaceScreen } from './src/screens/MarketplaceScreen';
import { ProductDetailsScreen } from './src/screens/ProductDetailsScreen';
import { ProductInquiryScreen } from './src/screens/ProductInquiryScreen';
import { VendorProfileScreen } from './src/screens/VendorProfileScreen';
import { CartScreen } from './src/screens/CartScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { TwoFactorScreen } from './src/screens/TwoFactorScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { CheckoutScreen } from './src/screens/CheckoutScreen';
import { OrdersScreen } from './src/screens/OrdersScreen';
import { PaymentScreen } from './src/screens/PaymentScreen';
import { AboutScreen } from './src/screens/AboutScreen';
import { ServicesScreen } from './src/screens/ServicesScreen';
import { TermsOfServiceScreen } from './src/screens/TermsOfServiceScreen';
import { PrivacyPolicyScreen } from './src/screens/PrivacyPolicyScreen';
import { ContactScreen } from './src/screens/ContactScreen';
import { WishlistScreen } from './src/screens/WishlistScreen';
import { MyReviewsScreen } from './src/screens/MyReviewsScreen';
import { CreditHistoryScreen } from './src/screens/CreditHistoryScreen';
import { BuyCreditsScreen } from './src/screens/BuyCreditsScreen';
import { SearchResultsScreen } from './src/screens/SearchResultsScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { CollectionProductsScreen } from './src/screens/CollectionProductsScreen';
import { FeaturedVendorsScreen } from './src/screens/FeaturedVendorsScreen';
import { AccountSettingsScreen } from './src/screens/AccountSettingsScreen';
import { OrderTrackingScreen } from './src/screens/OrderTrackingScreen';
import { SurveysScreen } from './src/screens/SurveysScreen';
import { VendorActionsScreen } from './src/screens/VendorActionsScreen';
import { HelpCenterScreen } from './src/screens/HelpCenterScreen';
import { MessagesScreen } from './src/screens/MessagesScreen';
import { colors } from './src/theme/colors';

function Router() {
  const { route, tab } = useNavigation();

  if (route === 'Checkout') {
    return <CheckoutScreen />;
  }
  if (route === 'Orders') {
    return <OrdersScreen />;
  }
  if (route === 'Payment') {
    return <PaymentScreen />;
  }
  if (route === 'About') {
    return <AboutScreen />;
  }
  if (route === 'Services') {
    return <ServicesScreen />;
  }
  if (route === 'TermsOfService') {
    return <TermsOfServiceScreen />;
  }
  if (route === 'PrivacyPolicy') {
    return <PrivacyPolicyScreen />;
  }
  if (route === 'Contact') {
    return <ContactScreen />;
  }
  if (route === 'Wishlist') {
    return <WishlistScreen />;
  }
  if (route === 'MyReviews') {
    return <MyReviewsScreen />;
  }
  if (route === 'CreditHistory') {
    return <CreditHistoryScreen />;
  }
  if (route === 'BuyCredits') {
    return <BuyCreditsScreen />;
  }
  if (route === 'SearchResults') {
    return <SearchResultsScreen />;
  }
  if (route === 'Search') {
    return <SearchScreen />;
  }
  if (route === 'AllProducts') {
    return <CollectionProductsScreen />;
  }
  if (route === 'FeaturedVendors') {
    return <FeaturedVendorsScreen />;
  }
  if (route === 'EditProfile' || route === 'AccountSettings') {
    return <AccountSettingsScreen initialTab="profile" />;
  }
  if (route === 'AddressBook') {
    return <AccountSettingsScreen initialTab="address" />;
  }
  if (route === 'PaymentMethods') {
    return <AccountSettingsScreen initialTab="payments" />;
  }
  if (route === 'OrderTracking') {
    return <OrderTrackingScreen />;
  }
  if (route === 'Surveys') {
    return <SurveysScreen />;
  }
  if (route === 'VendorActions') {
    return <VendorActionsScreen />;
  }
  if (route === 'HelpCenter') {
    return <HelpCenterScreen />;
  }
  if (route === 'Messages') {
    return <MessagesScreen />;
  }
  if (route === 'ProductDetails') {
    return <ProductDetailsScreen />;
  }
  if (route === 'ProductInquiry') {
    return <ProductInquiryScreen />;
  }
  if (route === 'VendorProfile') {
    return <VendorProfileScreen />;
  }
  if (route === 'Login') {
    return <LoginScreen />;
  }
  if (route === 'TwoFactor') {
    return <TwoFactorScreen />;
  }
  if (route === 'Register') {
    return <RegisterScreen />;
  }
  if (tab === 'Cart') {
    return <CartScreen />;
  }
  if (tab === 'Profile') {
    return <ProfileScreen />;
  }
  if (route === 'Marketplace' || tab === 'Marketplace') {
    return <MarketplaceScreen />;
  }
  return <HomeScreen />;
}

function HardwareBackButton() {
  const { canGoBack, goBack } = useNavigation();

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack) {
        goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack, goBack]);

  return null;
}

function PushBridge() {
  const { navigate } = useNavigation();
  const { showPromo, showNotice, markUnread } = useNotification();

  useEffect(() => {
    requestNotificationPermission();

    const raiseEvent = (event: PushEvent) => {
      if (event.type === 'promo') {
        showPromo(event.promo);
      } else if (event.type === 'order_status') {
        markUnread();
        showNotice({
          title: event.title,
          body: event.body,
          kind: 'order',
          onPress: () => navigate('Orders'),
        });
      } else if (event.type === 'message') {
        markUnread();
        showNotice({
          title: event.title,
          body: event.body,
          kind: 'message',
          onPress: () => navigate('Messages'),
        });
      }
    };

    const unsubForeground = subscribeToPushEvents(raiseEvent);
    const unsubOpened = subscribeToPushOpened(raiseEvent);
    getInitialPush().then(event => {
      if (event) {
        raiseEvent(event);
      }
    });

    return () => {
      unsubForeground();
      unsubOpened();
    };
  }, [navigate, showPromo, showNotice, markUnread]);

  return null;
}

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <CatalogProvider>
              <NavigationProvider>
                <NotificationProvider>
                  <HardwareBackButton />
                  <PushBridge />
                  <Router />
                  <Sidebar />
                </NotificationProvider>
              </NavigationProvider>
            </CatalogProvider>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
