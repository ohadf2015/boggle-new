/**
 * Standardized animation presets for consistent motion across the app.
 * Use these instead of inline spring configs.
 */
export const SPRING_PRESETS = {
  /** Quick, responsive — buttons, toggles, small UI elements */
  snappy: { type: 'spring' as const, stiffness: 400, damping: 25 },
  /** Balanced — modals, panels, cards */
  balanced: { type: 'spring' as const, stiffness: 300, damping: 26 },
  /** Smooth, gentle — page transitions, large elements */
  gentle: { type: 'spring' as const, stiffness: 200, damping: 20 },
  /** Bouncy — achievements, celebrations, game feedback */
  bouncy: { type: 'spring' as const, stiffness: 300, damping: 15 },
} as const;

export const DURATION_PRESETS = {
  /** Fast micro-interaction */
  fast: { duration: 0.15 },
  /** Standard transition */
  normal: { duration: 0.2 },
  /** Deliberate, noticeable transition */
  slow: { duration: 0.3 },
} as const;

export type SpringPreset = keyof typeof SPRING_PRESETS;
export type DurationPreset = keyof typeof DURATION_PRESETS;
