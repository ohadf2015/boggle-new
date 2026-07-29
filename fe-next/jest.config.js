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
  // setupFiles runs BEFORE the test file (so before any jest.mock hoisted
  // to the top). Use it for the jest.mock wrapper that injects __esModule.
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
    // These are Vitest tests (use vi.mock) — Jest can't run them; exclude to prevent false failures
    'app/api/adventure/state/__tests__/route.test.ts',
    'app/api/adventure/progress/__tests__/route.test.ts',
    'app/api/adventure/complete/__tests__/route.test.ts',
  ],

  // Prevent jest-haste-map from indexing the local remotion/ folder as the 'remotion' module
  modulePathIgnorePatterns: ['<rootDir>/remotion/', '<rootDir>/.next/'],

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

    // Mock remotion packages that fail in Jest (internal state / ESM issues)
    '^remotion$': '<rootDir>/__mocks__/remotion.cjs',
    '^@remotion/media$': '<rootDir>/__mocks__/@remotion/media.ts',
    '^@remotion/player$': '<rootDir>/__mocks__/@remotion/player.ts',
    '^@remotion/transitions$': '<rootDir>/__mocks__/@remotion/transitions.ts',

    // Capacitor plugins (mock for web testing)
    '^@capgo/capacitor-social-login$': '<rootDir>/__mocks__/@capgo/capacitor-social-login.ts',

    // Vitest compatibility — allow tests written with `import { vi } from 'vitest'` to run under Jest
    '^vitest$': '<rootDir>/__mocks__/vitest.js',

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

  // Transform patterns. earcut ships as native ESM (`export default`) which
  // Jest's CJS loader chokes on. pixi.js transitively imports it, so allow
  // Jest to transform both packages instead of skipping them.
  transformIgnorePatterns: [
    '/node_modules/(?!(earcut|pixi\\.js)/)',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
};

// Chain the vitest→jest preprocessor before Next.js SWC transform.
// This ensures vi.mock() calls get hoisted correctly by Jest.
const baseConfig = createJestConfig(customJestConfig);

module.exports = async () => {
  const config = await baseConfig();

  // Replace the SWC transformer with our wrapper that preprocesses vitest syntax
  const transform = config.transform || {};
  for (const [pattern, transformer] of Object.entries(transform)) {
    if (Array.isArray(transformer) && transformer[0].includes('jest-transformer')) {
      // Replace Next.js SWC transformer with our wrapper (which delegates to it)
      transform[pattern] = ['<rootDir>/jest-vitest-transform.js', transformer[1]];
    }
  }
  config.transform = transform;
  return config;
};
