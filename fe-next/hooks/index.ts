/**
 * Hooks Barrel Export
 *
 * Centralized exports for commonly used custom hooks.
 * Individual hooks can still be imported directly from their files.
 *
 * @example
 * ```tsx
 * import { useInactivityDetection, useLexiStuckDetection } from '@/hooks';
 * // or
 * import { useInactivityDetection } from '@/hooks/useInactivityDetection';
 * ```
 */

// Inactivity detection for Lexi stuck detection
export { useInactivityDetection } from './useInactivityDetection';
export type {
  UseInactivityDetectionOptions,
  UseInactivityDetectionReturn,
} from './useInactivityDetection';

// Game-aware Lexi stuck detection (wrapper around useInactivityDetection)
export { useLexiStuckDetection } from './useLexiStuckDetection';
export type {
  UseLexiStuckDetectionOptions,
  UseLexiStuckDetectionReturn,
} from './useLexiStuckDetection';
