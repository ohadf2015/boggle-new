'use client';

import { useRef, useState, useEffect } from 'react';

/**
 * Hook to track container dimensions and only render when valid
 * Prevents Recharts "width(-1) and height(-1)" warning
 *
 * Features:
 * - Client-side hydration check to avoid SSR/hydration dimension mismatches
 * - Delayed initial measurement to allow layout to stabilize
 * - Multiple measurement attempts for mobile browsers with slow layout
 * - Extended delays for framer-motion animations
 * - Uses getBoundingClientRect for more accurate dimensions
 *
 * @param minDimension - Minimum dimension required (default: 100)
 * @returns containerRef, dimensions, and isReady flag
 */
export function useContainerDimensions(minDimension: number = 100) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Hydration safety: only run dimension checks on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Skip dimension checks during SSR/hydration
    if (!isClient) return;

    const checkDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const width = Math.floor(rect.width);
        const height = Math.floor(rect.height);
        // Only mark as ready if dimensions are valid (>= minDimension)
        // Also check for positive values to prevent -1 errors from Recharts
        // Mobile browsers can report -1 or 0 during layout transitions
        if (width > 0 && height > 0 && width >= minDimension && height >= minDimension) {
          setDimensions({ width, height });
        } else {
          // Reset if dimensions become invalid (including -1 from mobile browsers)
          setDimensions(null);
        }
      }
    };

    // Delay initial check to allow layout to settle after animations
    // Using 150ms to allow framer-motion entrance animations to complete
    // This is especially important for mobile Chrome where layout can be slow
    const initialDelay = setTimeout(checkDimensions, 150);

    // Also check after multiple animation frames for slow mobile browsers
    let frameCount = 0;
    const maxFrames = 5;
    const checkAfterFrames = () => {
      frameCount++;
      checkDimensions();
      if (frameCount < maxFrames) {
        requestAnimationFrame(checkAfterFrames);
      }
    };
    const frameId = requestAnimationFrame(checkAfterFrames);

    // Set up resize observer for dynamic changes
    const observer = new ResizeObserver(checkDimensions);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    // Add polling as fallback for edge cases (reduced frequency)
    const pollInterval = setInterval(checkDimensions, 250);

    return () => {
      clearTimeout(initialDelay);
      cancelAnimationFrame(frameId);
      observer.disconnect();
      clearInterval(pollInterval);
    };
  }, [isClient, minDimension]);

  return { containerRef, dimensions, isReady: isClient && dimensions !== null };
}
