/**
 * Performance Utilities
 * Detect device capabilities for animation and touch optimization
 */

import type { PerformanceMode } from './types';

// Extended navigator type for device detection (don't extend Navigator to avoid type conflicts)
interface NavigatorWithMemory {
  hardwareConcurrency?: number;
  deviceMemory?: number;
  connection?: {
    effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
    saveData?: boolean;
  };
}

// Cached performance detection result
let cachedPerformanceConfig: PerformanceConfig | null = null;

export interface PerformanceConfig {
  mode: PerformanceMode;
  isLowEnd: boolean;
  targetFPS: 30 | 60;
  throttleMs: number;
  enableComplexAnimations: boolean;
  enableGlowEffects: boolean;
  reduceParticles: boolean;
  maxParticles: number;
}

/**
 * Detect if device can handle heavy animations
 * Returns 'full', 'reduced', or 'minimal' based on device capabilities
 */
export function getPerformanceMode(): PerformanceMode {
  return getPerformanceConfig().mode;
}

/**
 * Get full performance configuration for the device
 * Cached for efficiency - only computed once per session
 */
export function getPerformanceConfig(): PerformanceConfig {
  if (cachedPerformanceConfig) return cachedPerformanceConfig;

  if (typeof window === 'undefined') {
    return {
      mode: 'full',
      isLowEnd: false,
      targetFPS: 60,
      throttleMs: 16,
      enableComplexAnimations: true,
      enableGlowEffects: true,
      reduceParticles: false,
      maxParticles: 20,
    };
  }

  const nav = navigator as NavigatorWithMemory;

  // Check hardware capabilities
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // Check connection quality
  const connectionType = nav.connection?.effectiveType;
  const saveData = nav.connection?.saveData ?? false;
  const isSlowConnection = saveData || connectionType === '2g' || connectionType === 'slow-2g';

  // Check for known low-end device patterns
  const ua = navigator.userAgent.toLowerCase();
  const isOldAndroid = /android [2345]/i.test(ua);
  const isOldiOS = /iphone os [89]_/i.test(ua);
  const isLowEndDevice = /(redmi|realme|oppo a|vivo y|samsung galaxy a0|samsung galaxy j)/i.test(ua);

  // Determine performance tier
  const isLowEnd = cores <= 2 || memory <= 2 || isOldAndroid || isOldiOS || isLowEndDevice || isSlowConnection;
  const isMidRange = !isLowEnd && isMobile && (cores <= 4 || memory <= 4);

  if (isLowEnd) {
    cachedPerformanceConfig = {
      mode: 'minimal',
      isLowEnd: true,
      targetFPS: 30,
      throttleMs: 33, // ~30fps
      enableComplexAnimations: false,
      enableGlowEffects: false,
      reduceParticles: true,
      maxParticles: 4,
    };
  } else if (isMidRange) {
    cachedPerformanceConfig = {
      mode: 'reduced',
      isLowEnd: false,
      targetFPS: 60,
      throttleMs: 16,
      enableComplexAnimations: true,
      enableGlowEffects: true,
      reduceParticles: true,
      maxParticles: 8,
    };
  } else {
    cachedPerformanceConfig = {
      mode: 'full',
      isLowEnd: false,
      targetFPS: 60,
      throttleMs: 16,
      enableComplexAnimations: true,
      enableGlowEffects: true,
      reduceParticles: false,
      maxParticles: 20,
    };
  }

  // Apply low-end CSS class to document for CSS-based optimizations
  if (cachedPerformanceConfig.isLowEnd && typeof document !== 'undefined') {
    document.documentElement.classList.add('low-end-device');
  }

  return cachedPerformanceConfig;
}

/**
 * Adaptive throttle for touch/mouse events
 * Uses requestAnimationFrame for smooth 60fps or setTimeout for 30fps targets
 */
export function createAdaptiveThrottle(): <T extends (...args: unknown[]) => void>(fn: T) => T {
  const config = getPerformanceConfig();
  let lastCall = 0;
  let frameId: number | null = null;

  return function throttle<T extends (...args: unknown[]) => void>(fn: T): T {
    return ((...args: unknown[]) => {
      const now = performance.now();
      const elapsed = now - lastCall;

      if (elapsed >= config.throttleMs) {
        lastCall = now;
        fn(...args);
      } else if (config.targetFPS === 60 && !frameId) {
        // For 60fps targets, use RAF for smoother timing
        frameId = requestAnimationFrame(() => {
          frameId = null;
          lastCall = performance.now();
          fn(...args);
        });
      }
    }) as T;
  };
}

/**
 * Check if user prefers reduced motion
 * Updates in real-time as preference changes
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
