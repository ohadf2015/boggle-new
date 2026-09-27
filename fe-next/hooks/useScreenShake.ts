/**
 * useScreenShake - Provides screen shake effect for game juice feedback
 *
 * This hook uses Web Animations API for GPU-accelerated screen shake animations.
 * It respects the user's prefers-reduced-motion preference and provides alternative
 * feedback (flash) for accessibility.
 *
 * Usage:
 * const { shakeRef, shake } = useScreenShake();
 *
 * <div ref={shakeRef}>
 *   <GameContent />
 * </div>
 *
 * // Trigger shake on combo
 * shake(6, 250); // intensity: 6px, duration: 250ms
 *
 * @see useDevicePerformance for reduced motion detection
 */

import { useRef, useCallback } from 'react';
import { useDevicePerformance } from './useDevicePerformance';

interface UseScreenShakeReturn {
  /** Ref to attach to the element that should shake */
  shakeRef: React.RefObject<HTMLDivElement | null>;
  /**
   * Trigger shake animation
   * @param intensity - Shake magnitude in pixels (2-8px, default: 4px)
   * @param duration - Animation duration in ms (100-300ms, default: 200ms)
   */
  shake: (intensity?: number, duration?: number) => void;
}

/**
 * Hook to provide screen shake effects for game juice feedback
 *
 * Features:
 * - GPU-accelerated using Web Animations API
 * - Transform-only (no layout thrashing)
 * - Respects prefers-reduced-motion
 * - Provides flash feedback as alternative
 * - Configurable intensity and duration
 *
 * @returns Object with shakeRef and shake function
 *
 * @example
 * ```tsx
 * const { shakeRef, shake } = useScreenShake();
 *
 * const handleCombo = () => {
 *   shake(6, 200); // Intense shake for combo
 * };
 *
 * return <div ref={shakeRef}><Game /></div>;
 * ```
 */
export function useScreenShake(): UseScreenShakeReturn {
  const shakeRef = useRef<HTMLDivElement>(null);
  const { prefersReducedMotion } = useDevicePerformance();

  /**
   * Trigger shake animation with configurable intensity and duration
   */
  const shake = useCallback(
    (intensity: number = 4, duration: number = 200) => {
      const element = shakeRef.current;
      if (!element) return;

      // Clamp intensity between 2-8px
      const clampedIntensity = Math.max(2, Math.min(8, intensity));

      // Clamp duration between 100-300ms
      const clampedDuration = Math.max(100, Math.min(300, duration));

      // If user prefers reduced motion, provide flash feedback instead
      if (prefersReducedMotion) {
        const flashKeyframes = [
          { opacity: 1 },
          { opacity: 0.8, offset: 0.5 },
          { opacity: 1 },
        ];

        const flashOptions: KeyframeAnimationOptions = {
          duration: clampedDuration,
          easing: 'ease-in-out',
        };

        element.animate(flashKeyframes, flashOptions);
        return;
      }

      // Create shake keyframes using transform (GPU-accelerated)
      // Pattern creates random-feeling shake by varying direction
      const shakeKeyframes = [
        { transform: 'translate(0px, 0px)', offset: 0 },
        {
          transform: `translate(${clampedIntensity}px, ${clampedIntensity}px)`,
          offset: 0.1,
        },
        {
          transform: `translate(-${clampedIntensity}px, -${clampedIntensity}px)`,
          offset: 0.2,
        },
        {
          transform: `translate(-${clampedIntensity}px, ${clampedIntensity}px)`,
          offset: 0.3,
        },
        {
          transform: `translate(${clampedIntensity}px, -${clampedIntensity}px)`,
          offset: 0.4,
        },
        {
          transform: `translate(-${clampedIntensity}px, -${clampedIntensity}px)`,
          offset: 0.5,
        },
        {
          transform: `translate(${clampedIntensity}px, ${clampedIntensity}px)`,
          offset: 0.6,
        },
        {
          transform: `translate(-${clampedIntensity}px, ${clampedIntensity}px)`,
          offset: 0.7,
        },
        {
          transform: `translate(${clampedIntensity}px, -${clampedIntensity}px)`,
          offset: 0.8,
        },
        {
          transform: `translate(-${clampedIntensity}px, -${clampedIntensity}px)`,
          offset: 0.9,
        },
        { transform: 'translate(0px, 0px)', offset: 1 },
      ];

      const shakeOptions: KeyframeAnimationOptions = {
        duration: clampedDuration,
        easing: 'ease-in-out',
      };

      // Animate using Web Animations API
      element.animate(shakeKeyframes, shakeOptions);
    },
    [prefersReducedMotion]
  );

  return {
    shakeRef,
    shake,
  };
}
