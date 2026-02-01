/**
 * Hooks Barrel Export
 *
 * Centralized exports for commonly used custom hooks.
 * Individual hooks can still be imported directly from their files.
 *
 * @example
 * ```tsx
 * import { useInactivityDetection } from '@/hooks';
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
