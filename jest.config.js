module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-async-storage|@react-native-firebase|@react-native-google-signin|@react-native-clipboard|react-native-biometrics|react-native-device-info|react-native-safe-area-context|react-native-vector-icons)/)',
  ],
};
