/**
 * Vitest backend setup
 * - Registers tsx so require() can resolve .ts files
 * - Mocks translations module
 */
import 'tsx/cjs';
import { vi } from 'vitest';

// Mock translations module (mirrors backend/jest.setup.js)
vi.mock('./translations/index.js', () => ({
  translations: {
    en: { achievements: {}, game: {}, errors: {} },
    he: { achievements: {}, game: {}, errors: {} },
    sv: { achievements: {}, game: {}, errors: {} },
    ja: { achievements: {}, game: {}, errors: {} },
    es: { achievements: {}, game: {}, errors: {} },
  },
}));
