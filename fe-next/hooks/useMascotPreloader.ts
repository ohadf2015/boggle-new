'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { MASCOT_IMAGES, type MascotVariant } from '@/components/ui/Mascot';

interface UseMascotPreloaderReturn {
  /** Whether all images have been preloaded */
  isReady: boolean;
  /** Number of images loaded */
  loadedCount: number;
  /** Total number of images to load */
  totalCount: number;
  /** Manually preload specific variants */
  preloadVariants: (variants: MascotVariant[]) => void;
}

/**
 * Hook to preload mascot images for instant swapping.
 *
 * By preloading images on mount, we eliminate network delays when switching
 * between mascot variants. This enables smooth CSS-based visibility toggling
 * instead of remounting Image components.
 *
 * @param variants - Optional array of specific variants to preload.
 *                   If not provided, preloads all variants.
 * @returns Object with loading state and preload function
 *
 * @example
 * ```tsx
 * const { isReady, loadedCount, totalCount } = useMascotPreloader();
 *
 * // Or preload only specific variants
 * const { isReady } = useMascotPreloader(['happy', 'excited', 'dancing']);
 * ```
 */
export function useMascotPreloader(
  variants?: MascotVariant[]
): UseMascotPreloaderReturn {
  const variantsToLoad = variants || (Object.keys(MASCOT_IMAGES) as MascotVariant[]);
  const totalCount = variantsToLoad.length;

  const [loadedCount, setLoadedCount] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const loadedImagesRef = useRef<Set<string>>(new Set());
  const isMountedRef = useRef(true);

  const preloadImage = useCallback((src: string): Promise<void> => {
    return new Promise((resolve) => {
      // Skip if already loaded
      if (loadedImagesRef.current.has(src)) {
        resolve();
        return;
      }

      const img = new Image();

      img.onload = () => {
        if (isMountedRef.current) {
          loadedImagesRef.current.add(src);
          setLoadedCount((prev) => prev + 1);
        }
        resolve();
      };

      img.onerror = () => {
        // Still count as "loaded" to not block ready state
        if (isMountedRef.current) {
          loadedImagesRef.current.add(src);
          setLoadedCount((prev) => prev + 1);
        }
        resolve();
      };

      img.src = src;
    });
  }, []);

  const preloadVariants = useCallback((variantsToPreload: MascotVariant[]) => {
    const imageSources = variantsToPreload.map((v) => MASCOT_IMAGES[v]);
    imageSources.forEach((src) => preloadImage(src));
  }, [preloadImage]);

  useEffect(() => {
    isMountedRef.current = true;

    const preloadAll = async () => {
      const imageSources = variantsToLoad.map((v) => MASCOT_IMAGES[v]);
      await Promise.all(imageSources.map((src) => preloadImage(src)));

      if (isMountedRef.current) {
        setIsReady(true);
      }
    };

    preloadAll();

    return () => {
      isMountedRef.current = false;
    };
  }, [variantsToLoad, preloadImage]);

  return {
    isReady,
    loadedCount,
    totalCount,
    preloadVariants,
  };
}

export default useMascotPreloader;
