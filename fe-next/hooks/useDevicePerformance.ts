/**
 * useDevicePerformance - Detects device capabilities for adaptive performance
 *
 * This hook helps the game adapt to slower/older mobile devices by detecting:
 * - Hardware concurrency (CPU cores)
 * - Device memory
 * - User agent patterns for known low-end devices
 * - Reduced motion preferences
 *
 * Usage:
 * const { isLowEnd, targetFPS, enableComplexAnimations } = useDevicePerformance();
 */

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  startFrameWatch,
  getRuntimeDowngrade,
  getRuntimeDowngradeServer,
  subscribeRuntimeTier,
} from '@/lib/perf/runtimeTier';

/** Wait for hydration + first route work to finish before judging frame health.
 *  Measuring during load reads load jank as a slow device. */
const FRAME_WATCH_SETTLE_MS = 3000;

// Navigator extensions for device detection (don't extend Navigator to avoid type conflicts)
interface NavigatorWithMemory {
  hardwareConcurrency?: number;
  deviceMemory?: number;
  connection?: {
    effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
    saveData?: boolean;
  };
}

export interface DevicePerformanceConfig {
  /** Device is considered low-end and should use simplified rendering */
  isLowEnd: boolean;
  /** Target frames per second (30 for low-end, 60 for capable devices) */
  targetFPS: 30 | 60;
  /** Throttle interval in ms for event handlers */
  throttleMs: number;
  /** Whether to enable complex animations (particles, confetti, etc.) */
  enableComplexAnimations: boolean;
  /** Whether to enable sparkle/glow effects */
  enableGlowEffects: boolean;
  /** Whether to reduce particle count */
  reduceParticles: boolean;
  /** Maximum particles to show (8 for low-end, unlimited for capable) */
  maxParticles: number;
  /** User prefers reduced motion */
  prefersReducedMotion: boolean;
  /** Connection is slow (2g/3g) or data saver is on */
  isSlowConnection: boolean;
  /** Device is a mobile/touch device */
  isMobile: boolean;
}

// Detect reduced motion preference
function getReducedMotionPreference(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  return mediaQuery?.matches ?? false;
}

// Subscribe to reduced motion changes
function subscribeToReducedMotion(callback: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!mediaQuery) return () => {};
  mediaQuery.addEventListener('change', callback);
  return () => mediaQuery.removeEventListener('change', callback);
}

// Detect if device is mobile/touch
function detectIsMobile(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  // Check for touch capability
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Check user agent for mobile keywords
  const ua = navigator.userAgent.toLowerCase();
  const mobileKeywords = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i;
  const isMobileUA = mobileKeywords.test(ua);

  // Check screen size (less reliable but additional signal)
  const isSmallScreen = window.innerWidth <= 768;

  return hasTouch && (isMobileUA || isSmallScreen);
}

// Detect low-end device characteristics
//
// HYDRATION SAFETY: this must never run during SSR or the first client render.
// Node 21+ exposes a global `navigator` (with the SERVER's hardwareConcurrency),
// so a `typeof navigator === 'undefined'` guard is not enough: a small container
// (e.g. 2 vCPU) would render the low-end UI on the server while a capable client
// renders the full UI → React hydration error #418. The hook below always uses
// SSR_CAPABLE_FALLBACK for SSR + first client render, then adopts real device
// capabilities in an effect.
const SSR_CAPABLE_FALLBACK: Omit<DevicePerformanceConfig, 'prefersReducedMotion'> = {
  isLowEnd: false,
  targetFPS: 60,
  throttleMs: 16,
  enableComplexAnimations: true,
  enableGlowEffects: true,
  reduceParticles: false,
  maxParticles: 20,
  isSlowConnection: false,
  isMobile: false,
};

function detectDeviceCapabilities(): Omit<DevicePerformanceConfig, 'prefersReducedMotion'> {
  if (typeof window === 'undefined') {
    // SSR fallback - assume capable device
    return SSR_CAPABLE_FALLBACK;
  }

  const isMobile = detectIsMobile();

  const nav = navigator as NavigatorWithMemory;

  // Check hardware capabilities
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;

  // Check connection quality
  const connectionType = nav.connection?.effectiveType;
  const saveData = nav.connection?.saveData ?? false;
  const isSlowConnection = saveData || connectionType === '2g' || connectionType === 'slow-2g';

  // Check for known low-end device patterns in user agent
  const ua = navigator.userAgent.toLowerCase();
  const isOldAndroid = /android [2345]/i.test(ua);
  const isOldiOS = /iphone os [89]_/i.test(ua);
  const isLowEndKeywords = /(redmi|realme|oppo a|vivo y|samsung galaxy a0|samsung galaxy j)/i.test(ua);

  // Determine if device is low-end
  const isLowEnd =
    cores <= 2 ||
    memory <= 2 ||
    isOldAndroid ||
    isOldiOS ||
    isLowEndKeywords ||
    isSlowConnection;

  // Mid-range detection (capable but not high-end)
  const isMidRange = !isLowEnd && (cores <= 4 || memory <= 4);

  if (isLowEnd) {
    return {
      isLowEnd: true,
      targetFPS: 30,
      throttleMs: 33, // ~30fps
      enableComplexAnimations: false,
      enableGlowEffects: false,
      reduceParticles: true,
      maxParticles: 4,
      isSlowConnection,
      isMobile,
    };
  }

  if (isMidRange) {
    return {
      isLowEnd: false,
      targetFPS: 60,
      throttleMs: 16,
      enableComplexAnimations: true,
      enableGlowEffects: true,
      reduceParticles: true,
      maxParticles: 8,
      isSlowConnection,
      isMobile,
    };
  }

  // High-end device
  return {
    isLowEnd: false,
    targetFPS: 60,
    throttleMs: 16,
    enableComplexAnimations: true,
    enableGlowEffects: true,
    reduceParticles: false,
    maxParticles: 20,
    isSlowConnection,
    isMobile,
  };
}

/**
 * Hook to detect device performance capabilities
 *
 * @returns DevicePerformanceConfig with adaptive settings for the current device
 *
 * @example
 * ```tsx
 * const { isLowEnd, enableComplexAnimations } = useDevicePerformance();
 *
 * return enableComplexAnimations ? (
 *   <ParticleExplosion />
 * ) : (
 *   <SimpleFadeAnimation />
 * );
 * ```
 */
export function useDevicePerformance(): DevicePerformanceConfig {
  // Subscribe to reduced motion preference changes
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionPreference,
    () => false // Server snapshot
  );

  // Static hints misclassify budget Android (8 weak cores + 8GB reads as high-end)
  // and can never flag an iPhone (Safari hides deviceMemory). Watch real frames and
  // let observed slowness override an over-optimistic static verdict.
  const runtimeDowngrade = useSyncExternalStore(
    subscribeRuntimeTier,
    getRuntimeDowngrade,
    getRuntimeDowngradeServer
  );

  useEffect(() => {
    const id = setTimeout(startFrameWatch, FRAME_WATCH_SETTLE_MS);
    return () => clearTimeout(id);
  }, []);

  // Compute device capabilities. MUST start from SSR_CAPABLE_FALLBACK on both the
  // server and the first client render (hydration!) — the real detection touches
  // navigator/window, which can differ between the server's container and the
  // user's device. Adopt the real values post-hydration in an effect.
  const [capabilities, setCapabilities] = useState(
    () => SSR_CAPABLE_FALLBACK
  );

  useEffect(() => {
    setCapabilities(detectDeviceCapabilities());
  }, []);

  // Combine capabilities with reduced motion preference
  return useMemo(() => {
    // If user prefers reduced motion, treat as low-end for animation purposes
    if (prefersReducedMotion) {
      return {
        ...capabilities,
        prefersReducedMotion: true,
        enableComplexAnimations: false,
        enableGlowEffects: false,
        reduceParticles: true,
        maxParticles: 0,
        isMobile: capabilities.isMobile,
      };
    }

    // Frames say this device is struggling, whatever the static hints claimed.
    if (runtimeDowngrade) {
      return {
        ...capabilities,
        isLowEnd: true,
        targetFPS: 30 as const,
        throttleMs: 33,
        enableComplexAnimations: false,
        enableGlowEffects: false,
        reduceParticles: true,
        maxParticles: 4,
        prefersReducedMotion: false,
      };
    }

    return {
      ...capabilities,
      prefersReducedMotion: false,
      isMobile: capabilities.isMobile,
    };
  }, [capabilities, prefersReducedMotion, runtimeDowngrade]);
}

/**
 * Create a performance-aware throttle function
 * Uses requestAnimationFrame for smooth 60fps or setTimeout for 30fps targets
 */
export function createAdaptiveThrottle(config: Pick<DevicePerformanceConfig, 'targetFPS' | 'throttleMs'>) {
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

export default useDevicePerformance;
