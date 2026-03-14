module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-vector-icons|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|react-native-reanimated|react-native-image-picker|react-native-share|@react-native-async-storage|@react-native-community|react-native-video|react-native-config|@nozbe)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.js'],
  globalSetup: undefined,
  testPathIgnorePatterns: [
    '/node_modules/',
    '/e2e/',
    '__tests__/setup\\.ts$',
    '__tests__/utils/testHelpers\\.ts$',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
  ],
};
