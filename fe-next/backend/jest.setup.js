/**
 * Jest Setup File
 * Runs before all tests to configure mocks and global test environment
 */

// Mock translations module to avoid ESM import issues in CommonJS tests
jest.mock('../translations/index.js', () => ({
  translations: {
    en: {
      achievements: {},
      game: {},
      errors: {},
    },
    he: {
      achievements: {},
      game: {},
      errors: {},
    },
    sv: {
      achievements: {},
      game: {},
      errors: {},
    },
    ja: {
      achievements: {},
      game: {},
      errors: {},
    },
    es: {
      achievements: {},
      game: {},
      errors: {},
    },
  },
}));
