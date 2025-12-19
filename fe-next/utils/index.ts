/**
 * Utilities Barrel Export
 * Centralized export for all utility modules
 */

// Core utilities
export * from './utils';
export * from './consts';

// Session & Auth
export * from './session';
export * from './guestManager';

// Game utilities
export * from './validation';
// clientWordValidator has duplicate normalizeHebrewWord - export specific items
export {
  normalizeWord,
  getLanguageRegex,
  validateWordLocally,
  calculatePredictedScore,
  couldBeOnBoard,
  type ClientValidationResult,
} from './clientWordValidator';
export * from './gameInsights';
export * from './achievementTiers';

// UI utilities
export * from './accessibility';
export * from './share';

// Analytics & tracking
export * from './growthTracking';
export * from './utmCapture';

// Connection utilities
export * from './connectionUtils';

// Logger (re-export default)
export { default as logger } from './logger';
