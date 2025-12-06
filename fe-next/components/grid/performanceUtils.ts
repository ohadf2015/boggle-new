/**
 * Performance Utilities
 * Detect device capabilities for animation optimization
 */

import type { PerformanceMode } from './types';

/**
 * Detect if device can handle heavy animations
 * Returns 'full', 'reduced', or 'minimal' based on device capabilities
 */
export function getPerformanceMode(): PerformanceMode {
  if (typeof window === 'undefined') return 'full';

  // Check for low-end device indicators
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 8;

  // Minimal animations for low-end devices
  if (hardwareConcurrency <= 2 || deviceMemory <= 2) return 'minimal';
  // Reduced animations for mid-range mobile
  if (isMobile && (hardwareConcurrency <= 4 || deviceMemory <= 4)) return 'reduced';

  return 'full';
}
