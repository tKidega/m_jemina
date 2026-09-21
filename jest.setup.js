/* eslint-env jest */
/* Native-module mocks so the integration render test runs without a device. */

const mockAsyncStorage = new Map();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key) => (mockAsyncStorage.has(key) ? mockAsyncStorage.get(key) : null)),
    setItem: jest.fn(async (key, value) => {
      mockAsyncStorage.set(key, String(value));
    }),
    removeItem: jest.fn(async (key) => {
      mockAsyncStorage.delete(key);
    }),
    clear: jest.fn(async () => {
      mockAsyncStorage.clear();
    }),
    getAllKeys: jest.fn(async () => Array.from(mockAsyncStorage.keys())),
  },
}));

jest.mock('react-native-device-info', () => ({
  __esModule: true,
  default: {
    getModel: jest.fn(() => 'Pixel 6'),
    getBrand: jest.fn(() => 'Google'),
    getVersion: jest.fn(() => '1.0.0'),
    getUniqueId: jest.fn(() => 'jest-device'),
    hasNotch: jest.fn(() => false),
  },
}));

jest.mock('@react-native-firebase/messaging', () => ({
  getMessaging: jest.fn(() => ({})),
  getToken: jest.fn(async () => 'jest-fcm-token'),
  deleteToken: jest.fn(async () => {}),
  getInitialNotification: jest.fn(async () => null),
  onMessage: jest.fn(() => jest.fn()),
  onNotificationOpenedApp: jest.fn(() => jest.fn()),
  onTokenRefresh: jest.fn(() => jest.fn()),
}));

jest.mock('@react-native-firebase/app', () => ({
  __esModule: true,
  default: { initializeApp: jest.fn() },
  messaging: jest.fn(),
}));

jest.mock('@react-native-clipboard/clipboard', () => ({
  __esModule: true,
  default: {
    getString: jest.fn(async () => ''),
    setString: jest.fn(async () => {}),
    hasString: jest.fn(async () => false),
  },
  getString: jest.fn(async () => ''),
  setString: jest.fn(async () => {}),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  __esModule: true,
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(async () => true),
    signIn: jest.fn(async () => ({
      idToken: 'jest-id-token',
      user: { email: 'jest@test.dev', name: 'Jest User' },
    })),
    signOut: jest.fn(async () => {}),
    isSignedIn: jest.fn(async () => false),
    getCurrentUser: jest.fn(async () => null),
  },
  GoogleSigninButton: 'GoogleSigninButton',
}));