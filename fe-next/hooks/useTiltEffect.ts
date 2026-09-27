'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { useDevicePerformance } from './useDevicePerformance';

interface TiltValues {
  rotateX: number;
  rotateY: number;
  scale: number;
}

interface UseTiltEffectOptions {
  /** Maximum rotation angle in degrees */
  maxTilt?: number;
  /** Scale on hover */
  hoverScale?: number;
  /** Enable perspective effect */
  perspective?: number;
  /** Smoothing factor (lower = smoother) */
  smoothing?: number;
  /** Disable the effect */
  disabled?: boolean;
}

interface UseTiltEffectReturn<T extends HTMLElement> {
  /** Ref to attach to the element */
  ref: React.RefObject<T | null>;
  /** Current tilt values */
  tilt: TiltValues;
  /** Whether the element is being hovered */
  isHovered: boolean;
  /** Style object to apply to the element */
  style: React.CSSProperties;
  /** Event handlers to spread on the element */
  handlers: {
    onMouseMove: (e: React.MouseEvent<T>) => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onTouchMove: (e: React.TouchEvent<T>) => void;
    onTouchStart: () => void;
    onTouchEnd: () => void;
  };
}

/**
 * Hook for creating 3D tilt effect on hover
 * Tracks mouse position and calculates rotation values
 *
 * @example
 * ```tsx
 * const { ref, style, handlers } = useTiltEffect<HTMLDivElement>({ maxTilt: 10 });
 * return (
 *   <div ref={ref} style={style} {...handlers}>
 *     Card content
 *   </div>
 * );
 * ```
 */
export function useTiltEffect<T extends HTMLElement = HTMLDivElement>(
  options: UseTiltEffectOptions = {}
): UseTiltEffectReturn<T> {
  const {
    maxTilt = 10,
    hoverScale = 1.02,
    perspective = 1000,
    smoothing = 0.1,
    disabled = false,
  } = options;

  const ref = useRef<T>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [tilt, setTilt] = useState<TiltValues>({ rotateX: 0, rotateY: 0, scale: 1 });
  const targetTilt = useRef<TiltValues>({ rotateX: 0, rotateY: 0, scale: 1 });
  const animationFrame = useRef<number | undefined>(undefined);

  const { prefersReducedMotion, enableComplexAnimations } = useDevicePerformance();
  const isDisabled = disabled || prefersReducedMotion || !enableComplexAnimations;

  // Smooth animation loop
  useEffect(() => {
    if (isDisabled) return;

    const animate = () => {
      setTilt((current) => ({
        rotateX: current.rotateX + (targetTilt.current.rotateX - current.rotateX) * smoothing,
        rotateY: current.rotateY + (targetTilt.current.rotateY - current.rotateY) * smoothing,
        scale: current.scale + (targetTilt.current.scale - current.scale) * smoothing,
      }));
      animationFrame.current = requestAnimationFrame(animate);
    };

    animationFrame.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [smoothing, isDisabled]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<T>) => {
      if (isDisabled || !ref.current) return;

      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate position relative to center (-0.5 to 0.5)
      const x = (e.clientX - centerX) / rect.width;
      const y = (e.clientY - centerY) / rect.height;

      // Calculate rotation (inverted for natural feel)
      targetTilt.current = {
        rotateX: -y * maxTilt,
        rotateY: x * maxTilt,
        scale: hoverScale,
      };
    },
    [maxTilt, hoverScale, isDisabled]
  );

  const handleMouseEnter = useCallback(() => {
    if (isDisabled) return;
    setIsHovered(true);
    targetTilt.current.scale = hoverScale;
  }, [hoverScale, isDisabled]);

  const handleMouseLeave = useCallback(() => {
    if (isDisabled) return;
    setIsHovered(false);
    targetTilt.current = { rotateX: 0, rotateY: 0, scale: 1 };
  }, [isDisabled]);

  // Touch handlers for mobile devices
  const handleTouchMove = useCallback(
    (e: React.TouchEvent<T>) => {
      if (isDisabled || !ref.current || e.touches.length === 0) return;

      const touch = e.touches[0];
      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate position relative to center (-0.5 to 0.5)
      const x = (touch.clientX - centerX) / rect.width;
      const y = (touch.clientY - centerY) / rect.height;

      // Calculate rotation (inverted for natural feel) - reduced intensity for touch
      targetTilt.current = {
        rotateX: -y * maxTilt * 0.6, // Reduced intensity for touch
        rotateY: x * maxTilt * 0.6,
        scale: hoverScale,
      };
    },
    [maxTilt, hoverScale, isDisabled]
  );

  const handleTouchStart = useCallback(() => {
    if (isDisabled) return;
    setIsHovered(true);
    targetTilt.current.scale = hoverScale;
  }, [hoverScale, isDisabled]);

  const handleTouchEnd = useCallback(() => {
    if (isDisabled) return;
    setIsHovered(false);
    targetTilt.current = { rotateX: 0, rotateY: 0, scale: 1 };
  }, [isDisabled]);

  const style: React.CSSProperties = isDisabled
    ? {}
    : {
        perspective: `${perspective}px`,
        transform: `
          perspective(${perspective}px)
          rotateX(${tilt.rotateX}deg)
          rotateY(${tilt.rotateY}deg)
          scale(${tilt.scale})
        `,
        transformStyle: 'preserve-3d',
        transition: 'box-shadow 0.2s ease',
        willChange: 'transform',
      };

  return {
    ref,
    tilt,
    isHovered,
    style,
    handlers: {
      onMouseMove: handleMouseMove,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onTouchMove: handleTouchMove,
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
    },
  };
}

/**
 * Hook for parallax effect based on scroll position
 */
export function useParallax(speed: number = 0.5) {
  const [offset, setOffset] = useState(0);
  const { prefersReducedMotion } = useDevicePerformance();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const handleScroll = () => {
      setOffset(window.scrollY * speed);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed, prefersReducedMotion]);

  return { y: prefersReducedMotion ? 0 : offset };
}

/**
 * Hook for mouse-position-based parallax on an element
 */
export function useMouseParallax(intensity: number = 20) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const { prefersReducedMotion, enableComplexAnimations } = useDevicePerformance();

  useEffect(() => {
    if (prefersReducedMotion || !enableComplexAnimations) return;

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * intensity;
      const y = (e.clientY / window.innerHeight - 0.5) * intensity;
      setPosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [intensity, prefersReducedMotion, enableComplexAnimations]);

  return position;
}

export default useTiltEffect;
