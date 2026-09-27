'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

/**
 * Hook to track container dimensions and only render when valid
 * Prevents Recharts "width(-1) and height(-1)" warning
 *
 * Features:
 * - Client-side hydration check to avoid SSR/hydration dimension mismatches
 * - Delayed initial measurement to allow layout to stabilize
 * - Multiple measurement attempts for mobile browsers with slow layout
 * - Extended delays for framer-motion animations (300ms+ delays on page)
 * - Uses getBoundingClientRect for more accurate dimensions
 * - Validates dimensions are positive numbers (not NaN, not -1)
 *
 * @param minDimension - Minimum dimension required (default: 50)
 * @returns containerRef, dimensions, and isReady flag
 */
export function useContainerDimensions(minDimension: number = 50) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isClient, setIsClient] = useState(false);
  const measuredRef = useRef(false);

  // Hydration safety: only run dimension checks on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  const checkDimensions = useCallback(() => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);

    // Strict validation: must be positive finite numbers >= minDimension
    // This guards against -1, 0, NaN, Infinity from mobile browser edge cases
    const isValidWidth = Number.isFinite(width) && width >= minDimension;
    const isValidHeight = Number.isFinite(height) && height >= minDimension;

    if (isValidWidth && isValidHeight) {
      // Only update if dimensions actually changed to prevent re-renders
      setDimensions(prev => {
        if (prev?.width === width && prev?.height === height) {
          return prev;
        }
        return { width, height };
      });
      measuredRef.current = true;
    } else if (measuredRef.current) {
      // Only reset if we had valid dimensions before (prevents flicker during mount)
      // This handles cases where container becomes hidden/collapsed
      setDimensions(null);
      measuredRef.current = false;
    }
  }, [minDimension]);

  useEffect(() => {
    // Skip dimension checks during SSR/hydration
    if (!isClient) return;

    // Initial delay: 350ms to account for framer-motion animations (up to 0.3s delay + 0.3s duration)
    // This is critical for mobile Chrome Android which has slow layout reflows
    const initialDelay = setTimeout(checkDimensions, 350);

    // Secondary check after 500ms for very slow devices
    const secondaryDelay = setTimeout(checkDimensions, 500);

    // Also check after multiple animation frames for slow mobile browsers
    let frameCount = 0;
    const maxFrames = 10; // Increased from 5 for slower devices
    let frameId: number;
    const checkAfterFrames = () => {
      frameCount++;
      checkDimensions();
      if (frameCount < maxFrames) {
        frameId = requestAnimationFrame(checkAfterFrames);
      }
    };
    frameId = requestAnimationFrame(checkAfterFrames);

    // Set up resize observer for dynamic changes
    const observer = new ResizeObserver(() => {
      // Debounce resize observer callbacks
      requestAnimationFrame(checkDimensions);
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    // Add polling as fallback for edge cases (reduced frequency)
    // Stop polling once dimensions are valid to save battery on mobile
    // Max 30 attempts (9 seconds) to prevent indefinite polling
    let pollCount = 0;
    const MAX_POLLS = 30;
    const pollInterval = setInterval(() => {
      if (!measuredRef.current && pollCount < MAX_POLLS) {
        pollCount++;
        checkDimensions();
      } else {
        clearInterval(pollInterval);
      }
    }, 300);

    return () => {
      clearTimeout(initialDelay);
      clearTimeout(secondaryDelay);
      cancelAnimationFrame(frameId);
      observer.disconnect();
      clearInterval(pollInterval);
    };
  }, [isClient, checkDimensions]);

  return { containerRef, dimensions, isReady: isClient && dimensions !== null };
}
