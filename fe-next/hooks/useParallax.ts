/**
 * useParallax - Combined parallax input from gyroscope, gesture, and ambient drift
 *
 * Creates an "always alive" parallax effect by combining:
 * - Gyroscope (mobile): Device tilt via DeviceOrientationEvent
 * - Gesture (all): Mouse movement (desktop) or touch tracking (mobile)
 * - Ambient drift: Subtle sine/cosine oscillation that's always active
 *
 * Respects prefers-reduced-motion and device capabilities.
 */

'use client';

import { useEffect, useState, useRef } from 'react';
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
};

/**
 * Clamp value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function useParallax(options: ParallaxOptions = {}): ParallaxOutput {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { prefersReducedMotion, isMobile, enableComplexAnimations } = useDevicePerformance();

  const [gyro, setGyro] = useState({ x: 0, y: 0 });
  const [gesture, setGesture] = useState({ x: 0, y: 0 });
  const [ambient, setAmbient] = useState({ x: 0, y: 0 });
  const [isGyroActive, setIsGyroActive] = useState(false);

  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

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
      setGyro({
        x: clamp(x, -20, 20),
        y: clamp(y, -20, 20),
      });
      setIsGyroActive(true);
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
  }, [opts.enableGyroscope, opts.intensity, isMobile, prefersReducedMotion, enableComplexAnimations]);

  // Gesture input (mouse on desktop, touch on mobile)
  useEffect(() => {
    if (!opts.enableGesture || prefersReducedMotion || !enableComplexAnimations) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 30 * opts.intensity;
      const y = (e.clientY / window.innerHeight - 0.5) * 30 * opts.intensity;
      setGesture({ x, y });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      const x = (touch.clientX / window.innerWidth - 0.5) * 20 * opts.intensity;
      const y = (touch.clientY / window.innerHeight - 0.5) * 20 * opts.intensity;
      setGesture({ x, y });
    };

    if (isMobile) {
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
      return () => window.removeEventListener('touchmove', handleTouchMove);
    } else {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [opts.enableGesture, opts.intensity, isMobile, prefersReducedMotion, enableComplexAnimations]);

  // Ambient drift (always-on subtle oscillation)
  useEffect(() => {
    if (!opts.enableAmbient || prefersReducedMotion) {
      return;
    }

    startTimeRef.current = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTimeRef.current;
      // Slow sine/cosine oscillation
      const x = Math.sin(elapsed * 0.0003 * opts.ambientSpeed) * 3;
      const y = Math.cos(elapsed * 0.0002 * opts.ambientSpeed) * 2;
      setAmbient({ x, y });
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [opts.enableAmbient, opts.ambientSpeed, prefersReducedMotion]);

  // Return static values for reduced motion
  if (prefersReducedMotion) {
    return { x: 0, y: 0, isGyroActive: false };
  }

  // Combine all inputs
  return {
    x: gyro.x + gesture.x + ambient.x,
    y: gyro.y + gesture.y + ambient.y,
    isGyroActive,
  };
}

export default useParallax;
