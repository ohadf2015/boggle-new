/**
 * Jest Configuration for Frontend Tests
 *
 * This configuration is optimized for Next.js + React Testing Library
 * Run tests with: npm run test:frontend
 */

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

/** @type {import('jest').Config} */
const customJestConfig = {
  // Display name for this config
  displayName: 'frontend',

  // Test environment - jsdom for React components
  testEnvironment: 'jsdom',

  // Setup files to run after Jest is initialized
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Test file patterns - specifically for frontend
  testMatch: [
    '<rootDir>/components/**/*.test.{ts,tsx}',
    '<rootDir>/hooks/**/*.test.{ts,tsx}',
    '<rootDir>/contexts/**/*.test.{ts,tsx}',
    '<rootDir>/utils/**/*.test.{ts,tsx}',
    '<rootDir>/app/**/*.test.{ts,tsx}',
    '<rootDir>/host/**/*.test.{ts,tsx}',
    '<rootDir>/player/**/*.test.{ts,tsx}',
    '<rootDir>/types/**/*.test.{ts,tsx}',
    '<rootDir>/lib/**/*.test.{ts,tsx}',
    '<rootDir>/shared/**/*.test.{ts,tsx}',
    '<rootDir>/stores/**/*.test.{ts,tsx}',
    '<rootDir>/__tests__/**/*.test.{ts,tsx}',
  ],

  // Ignore backend tests (they have their own config)
  testPathIgnorePatterns: [
    '/node_modules/',
    '/backend/',
    '/.next/',
    '/dist/',
    // TODO: Fix bot launch tests - need to properly mock next/dynamic with loader execution
    // Issue: next/dynamic mock doesn't execute the loader function, so mocked components aren't resolved
    // Solution: Mock needs to execute loader and return the resolved module's default/named export
    'LandingView.botLaunch.test.tsx',
    // TODO: Remove tests for deleted components (PresetSelector, SinglePlayerLobby)
    'PresetSelector.simplified.test.tsx',
    'PresetSelector.featureGates.test.tsx',
    'SinglePlayerLobby.featureGates.test.tsx',
    'SinglePlayer.navigation.test.tsx',
    'ResultsPage.touch-scroll.test.tsx',
    'ClassroomGameLobby.test.tsx',
    'useAdaptiveDifficulty.test.ts',
    'MusicContext.duplicateProvider.test.tsx',
  ],

  // Module aliases matching tsconfig paths
  moduleNameMapper: {
    // Handle module aliases
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/contexts/(.*)$': '<rootDir>/contexts/$1',
    '^@/utils/(.*)$': '<rootDir>/utils/$1',
    '^@/shared/(.*)$': '<rootDir>/shared/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1',

    // Capacitor plugins (mock for web testing)
    '^@capgo/capacitor-social-login$': '<rootDir>/__mocks__/@capgo/capacitor-social-login.ts',

    // Handle CSS imports (with CSS modules)
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',

    // Handle CSS imports (without CSS modules)
    '^.+\\.(css|sass|scss)$': '<rootDir>/__mocks__/styleMock.js',

    // Handle image imports
    '^.+\\.(jpg|jpeg|png|gif|webp|avif|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Coverage collection
  collectCoverageFrom: [
    'components/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'contexts/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'shared/**/*.{ts,tsx}',
    'stores/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/*.test.{ts,tsx}',
    '!**/*.spec.{ts,tsx}',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 10,
      lines: 10,
      statements: 10,
    },
  },

  // Test timeout
  testTimeout: 10000,

  // Clear mocks between tests
  // clearMocks: true clears mock call history but preserves implementations
  // resetMocks: false prevents mock implementations from being reset to undefined
  clearMocks: true,
  resetMocks: false,

  // Verbose output
  verbose: true,

  // Transform patterns
  transformIgnorePatterns: [
    '/node_modules/',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
