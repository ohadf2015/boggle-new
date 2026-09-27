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
 * - Uses Framer Motion MotionValues to avoid React re-renders entirely
 * - Event handlers write directly to MotionValues (no setState/forceUpdate)
 * - Pauses RAF loop when tab is hidden (Page Visibility API)
 * - Gyroscope throttled to 16ms minimum between updates
 */

'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useMotionValue, type MotionValue } from 'framer-motion';
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
  /** Horizontal parallax offset (MotionValue for zero re-renders) */
  x: MotionValue<number>;
  /** Vertical parallax offset (MotionValue for zero re-renders) */
  y: MotionValue<number>;
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

/** Clamp value between min and max */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Update CSS custom properties on target element */
function updateCSSProperties(x: number, y: number, target: string): void {
  const element = target === ':root' ? document.documentElement : document.querySelector(target);
  if (element instanceof HTMLElement) {
    element.style.setProperty('--parallax-x', `${x}px`);
    element.style.setProperty('--parallax-y', `${y}px`);
  }
}

/** Minimum interval between gyroscope updates (ms) */
const GYRO_THROTTLE_MS = 16;

export function useParallax(options: ParallaxOptions = {}): ParallaxOutput {
  const opts = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options]);
  const { prefersReducedMotion, isMobile, enableComplexAnimations } = useDevicePerformance();

  // MotionValues for output — consumers bind directly, no re-renders
  const motionX = useMotionValue(0);
  const motionY = useMotionValue(0);

  // Refs for per-source values
  const gyroRef = useRef({ x: 0, y: 0 });
  const gestureRef = useRef({ x: 0, y: 0 });
  const ambientRef = useRef({ x: 0, y: 0 });

  // State only for values that consumers need to react to (rare changes)
  const [isGyroActive, setIsGyroActive] = useState(false);

  // Track visibility for pausing RAF
  const isVisibleRef = useRef(true);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Gyroscope throttle timestamp
  const lastGyroTimeRef = useRef(0);

  // Combine sources and write to MotionValues
  const updateOutput = useCallback(() => {
    const x = gyroRef.current.x + gestureRef.current.x + ambientRef.current.x;
    const y = gyroRef.current.y + gestureRef.current.y + ambientRef.current.y;

    motionX.set(x);
    motionY.set(y);

    // Also update CSS custom properties for CSS-driven consumers
    updateCSSProperties(x, y, opts.cssTarget);
  }, [motionX, motionY, opts.cssTarget]);

  // Visibility API - fully stop/restart RAF when tab is hidden/shown
  // (Just skipping work inside RAF still wakes the CPU 60x/sec)
  const restartAmbientRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      isVisibleRef.current = visible;
      if (visible && restartAmbientRef.current) {
        // Restart ambient RAF loop after tab becomes visible
        restartAmbientRef.current();
      } else if (!visible && animationFrameRef.current) {
        // Fully cancel RAF when hidden — CPU can sleep
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Gyroscope input (mobile only) with 16ms throttle
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
      const now = performance.now();
      if (now - lastGyroTimeRef.current < GYRO_THROTTLE_MS) return;
      lastGyroTimeRef.current = now;

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
          setIsGyroActive(false);
        }
      } else {
        window.addEventListener('deviceorientation', handleOrientation, { passive: true });
      }
    };

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

  // Ambient drift (always-on Lissajous oscillation)
  // RAF is fully cancelled when tab is hidden (via visibilitychange handler above)
  // and restarted when tab becomes visible again — zero CPU cost while backgrounded.
  useEffect(() => {
    if (!opts.enableAmbient || prefersReducedMotion) {
      restartAmbientRef.current = null;
      return;
    }

    startTimeRef.current = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTimeRef.current;
      const speed = opts.ambientSpeed;
      const intensity = opts.intensity;

      const primaryX = Math.sin(elapsed * 0.0002 * speed) * 12;
      const primaryY = Math.cos(elapsed * 0.00015 * speed) * 10;
      const secondaryX = Math.sin(elapsed * 0.0005 * speed + 0.5) * 5;
      const secondaryY = Math.cos(elapsed * 0.00045 * speed + 0.3) * 4;
      const tertiaryX = Math.sin(elapsed * 0.001 * speed) * 2;
      const tertiaryY = Math.cos(elapsed * 0.0012 * speed) * 1.5;

      const x = (primaryX + secondaryX + tertiaryX) * intensity;
      const y = (primaryY + secondaryY + tertiaryY) * intensity;

      ambientRef.current = { x, y };
      updateOutput();

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    const startLoop = () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      startTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Store restart function so visibility handler can call it
    restartAmbientRef.current = startLoop;

    // Only start if tab is visible
    if (isVisibleRef.current) {
      startLoop();
    }

    return () => {
      restartAmbientRef.current = null;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [opts.enableAmbient, opts.ambientSpeed, opts.intensity, prefersReducedMotion, updateOutput]);

  // Return static zero MotionValues for reduced motion
  if (prefersReducedMotion) {
    return { x: motionX, y: motionY, isGyroActive: false };
  }

  return { x: motionX, y: motionY, isGyroActive };
}

export default useParallax;
