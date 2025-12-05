/**
 * Jest Configuration for Backend Tests
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Root directory
  rootDir: '.',

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.[jt]s',
    '**/*.test.[jt]s',
    '**/*.spec.[jt]s'
  ],

  // Module paths
  moduleNameMapper: {
    '^@backend/(.*)$': '<rootDir>/$1',
    '^@/(.*)$': '<rootDir>/../$1'
  },

  // No transform needed for JS tests
  transform: {},

  // Ignore patterns for transform
  transformIgnorePatterns: [
    '/node_modules/'
  ],

  // Files to collect coverage from
  collectCoverageFrom: [
    '**/*.{js,ts}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/*.test.{js,ts}',
    '!**/*.spec.{js,ts}',
    '!**/jest.config.js',
    '!**/*.legacy.js'
  ],

  // Coverage thresholds (start low, increase over time)
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 20,
      lines: 20,
      statements: 20
    }
  },

  // Setup files
  setupFilesAfterEnv: [],

  // Test timeout (Socket.IO tests may need longer)
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/*.legacy.js'
  ]
};
