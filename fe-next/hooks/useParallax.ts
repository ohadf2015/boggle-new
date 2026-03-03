/**
 * useParallax - Combined parallax input from gyroscope, gesture, and ambient drift
 *
 * Creates an "always alive" parallax effect by combining:
 * - Gyroscope (mobile): Device tilt via DeviceOrientationEvent
 * - Gesture (all): Mouse movement (desktop) or touch tracking (mobile)
 * - Ambient drift: Subtle sine/cosine oscillation that's always active
 *
 * Respects prefers-reduced-motion and device capabilities.
 *
 * Performance optimizations:
 * - Uses refs + CSS custom properties to avoid React re-renders
 * - Pauses RAF loop when tab is hidden (Page Visibility API)
 * - Returns stable reference to prevent consumer re-renders
 */

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useDevicePerformance } from './useDevicePerformance';

export interface ParallaxOptions {
  /** Intensity multiplier (0.5 = subtle, 1 = normal, 1.5 = dramatic) */
  intensity?: number;
  /** Enable gyroscope input on mobile (default: true) */
  enableGyroscope?: boolean;
  /** Enable mouse/touch gesture input (default: true) */
  enableGesture?: boolean;
  /** Enable ambient drift animation (default: true) */
  enableAmbient?: boolean;
  /** Ambient drift speed multiplier (default: 1) */
  ambientSpeed?: number;
  /** CSS selector for element to set custom properties on (default: ':root') */
  cssTarget?: string;
}

export interface ParallaxOutput {
  /** Horizontal parallax offset */
  x: number;
  /** Vertical parallax offset */
  y: number;
  /** Whether gyroscope is active */
  isGyroActive: boolean;
}

const DEFAULT_OPTIONS: Required<ParallaxOptions> = {
  intensity: 1,
  enableGyroscope: true,
  enableGesture: true,
  enableAmbient: true,
  ambientSpeed: 1,
  cssTarget: ':root',
};

/**
 * Clamp value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Update CSS custom properties on target element
 * This moves animation to compositor thread, avoiding React re-renders
 */
function updateCSSProperties(x: number, y: number, target: string): void {
  const element = target === ':root' ? document.documentElement : document.querySelector(target);
  if (element instanceof HTMLElement) {
    element.style.setProperty('--parallax-x', `${x}px`);
    element.style.setProperty('--parallax-y', `${y}px`);
  }
}

export function useParallax(options: ParallaxOptions = {}): ParallaxOutput {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { prefersReducedMotion, isMobile, enableComplexAnimations } = useDevicePerformance();

  // Use refs for values that update frequently to avoid re-renders
  const gyroRef = useRef({ x: 0, y: 0 });
  const gestureRef = useRef({ x: 0, y: 0 });
  const ambientRef = useRef({ x: 0, y: 0 });

  // State only for values that consumers need to react to
  const [isGyroActive, setIsGyroActive] = useState(false);

  // Track visibility for pausing RAF
  const isVisibleRef = useRef(true);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Stable output ref to avoid consumer re-renders
  const outputRef = useRef<ParallaxOutput>({ x: 0, y: 0, isGyroActive: false });

  // Force update trigger for when consumers need the latest values
  const [, forceUpdate] = useState(0);

  // Previous output values for change detection (avoid unnecessary re-renders)
  const prevOutputRef = useRef({ x: 0, y: 0 });
  const EPSILON = 0.1; // Minimum change to trigger a re-render

  // Update combined output and CSS properties
  const updateOutput = useCallback(() => {
    const x = gyroRef.current.x + gestureRef.current.x + ambientRef.current.x;
    const y = gyroRef.current.y + gestureRef.current.y + ambientRef.current.y;

    outputRef.current.x = x;
    outputRef.current.y = y;
    outputRef.current.isGyroActive = isGyroActive;

    // Update CSS custom properties (moves animation to compositor thread)
    updateCSSProperties(x, y, opts.cssTarget);

    // Only trigger React re-render when output values meaningfully change
    const dx = Math.abs(x - prevOutputRef.current.x);
    const dy = Math.abs(y - prevOutputRef.current.y);
    if (dx > EPSILON || dy > EPSILON) {
      prevOutputRef.current = { x, y };
      forceUpdate((n) => n + 1);
    }
  }, [isGyroActive, opts.cssTarget]);

  // Visibility API - pause RAF when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Gyroscope input (mobile only)
  useEffect(() => {
    if (!opts.enableGyroscope || !isMobile || prefersReducedMotion || !enableComplexAnimations) {
      setIsGyroActive(false);
      return;
    }

    if (typeof DeviceOrientationEvent === 'undefined') {
      setIsGyroActive(false);
      return;
    }

    const handleOrientation = (e: DeviceOrientationEvent) => {
      // gamma: left-right tilt (-90 to 90)
      // beta: front-back tilt (-180 to 180)
      const x = ((e.gamma || 0) / 45) * 15 * opts.intensity;
      const y = ((e.beta || 0) / 45) * 15 * opts.intensity;
      gyroRef.current = {
        x: clamp(x, -20, 20),
        y: clamp(y, -20, 20),
      };
      setIsGyroActive(true);
      updateOutput();
    };

    // Request permission on iOS 13+
    const requestPermission = async () => {
      // Type assertion for iOS-specific API
      const DeviceOrientationEventWithPermission = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      };

      if (typeof DeviceOrientationEventWithPermission.requestPermission === 'function') {
        try {
          const permission = await DeviceOrientationEventWithPermission.requestPermission();
          if (permission === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation, { passive: true });
          }
        } catch {
          // Permission denied or error - fallback to gesture-only
          setIsGyroActive(false);
        }
      } else {
        // Non-iOS or older iOS - add listener directly
        window.addEventListener('deviceorientation', handleOrientation, { passive: true });
      }
    };

    // Request permission on first user interaction
    const handleFirstInteraction = () => {
      requestPermission();
      window.removeEventListener('touchstart', handleFirstInteraction);
    };

    window.addEventListener('touchstart', handleFirstInteraction, { once: true, passive: true });

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [opts.enableGyroscope, opts.intensity, isMobile, prefersReducedMotion, enableComplexAnimations, updateOutput]);

  // Gesture input (mouse on desktop, touch on mobile)
  useEffect(() => {
    if (!opts.enableGesture || prefersReducedMotion || !enableComplexAnimations) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 30 * opts.intensity;
      const y = (e.clientY / window.innerHeight - 0.5) * 30 * opts.intensity;
      gestureRef.current = { x, y };
      updateOutput();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      const x = (touch.clientX / window.innerWidth - 0.5) * 20 * opts.intensity;
      const y = (touch.clientY / window.innerHeight - 0.5) * 20 * opts.intensity;
      gestureRef.current = { x, y };
      updateOutput();
    };

    if (isMobile) {
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
      return () => window.removeEventListener('touchmove', handleTouchMove);
    } else {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [opts.enableGesture, opts.intensity, isMobile, prefersReducedMotion, enableComplexAnimations, updateOutput]);

  // Ambient drift (always-on oscillation for 3D effect)
  // Uses Lissajous-like curves (overlapping sine waves) for organic, non-repeating motion
  // Performance: Uses refs and CSS custom properties to avoid React re-renders
  // Also pauses when tab is hidden to save CPU
  useEffect(() => {
    if (!opts.enableAmbient || prefersReducedMotion) {
      return;
    }

    startTimeRef.current = performance.now();

    const animate = (time: number) => {
      // Skip animation when tab is hidden (save CPU)
      if (!isVisibleRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const elapsed = time - startTimeRef.current;
      const speed = opts.ambientSpeed;
      const intensity = opts.intensity;

      // Primary slow oscillation (main drift)
      const primaryX = Math.sin(elapsed * 0.0002 * speed) * 12;
      const primaryY = Math.cos(elapsed * 0.00015 * speed) * 10;

      // Secondary faster oscillation (adds organic feel)
      const secondaryX = Math.sin(elapsed * 0.0005 * speed + 0.5) * 5;
      const secondaryY = Math.cos(elapsed * 0.00045 * speed + 0.3) * 4;

      // Tertiary subtle tremor (micro-movement for "alive" feel)
      const tertiaryX = Math.sin(elapsed * 0.001 * speed) * 2;
      const tertiaryY = Math.cos(elapsed * 0.0012 * speed) * 1.5;

      // Combine all waves with intensity multiplier
      const x = (primaryX + secondaryX + tertiaryX) * intensity;
      const y = (primaryY + secondaryY + tertiaryY) * intensity;

      // Update ref (no re-render)
      ambientRef.current = { x, y };

      // Update combined output and CSS properties
      updateOutput();

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [opts.enableAmbient, opts.ambientSpeed, opts.intensity, prefersReducedMotion, updateOutput]);

  // Return static values for reduced motion
  if (prefersReducedMotion) {
    return { x: 0, y: 0, isGyroActive: false };
  }

  // Return current output (stable reference pattern)
  return outputRef.current;
}

export default useParallax;
