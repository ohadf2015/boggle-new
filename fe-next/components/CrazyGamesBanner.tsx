'use client';

import React, { useEffect, useRef, useId, memo } from 'react';
import { useCrazyGames, type BannerSize } from './CrazyGamesSDK';
import { cn } from '@/lib/utils';

// Module-level cooldown shared across all CrazyGamesBanner instances.
// CrazyGames SDK enforces a global 30s cooldown — per-instance tracking can't coordinate.
let globalLastBannerRequestTime = 0;

interface CrazyGamesBannerProps {
  /** Use responsive banner that auto-sizes to container */
  responsive?: boolean;
  /** Fixed banner size (ignored if responsive=true) */
  size?: BannerSize;
  /** Additional CSS class for the container */
  className?: string;
  /** Whether to show the banner (useful for conditional rendering) */
  show?: boolean;
}

// Banner dimension mappings
const BANNER_DIMENSIONS: Record<BannerSize, { width: number; height: number }> = {
  '728x90': { width: 728, height: 90 },
  '300x250': { width: 300, height: 250 },
  '320x50': { width: 320, height: 50 },
  '468x60': { width: 468, height: 60 },
  '320x100': { width: 320, height: 100 },
  '160x600': { width: 160, height: 600 },
  '336x280': { width: 336, height: 280 },
  '300x600': { width: 300, height: 600 },
  '970x90': { width: 970, height: 90 },
  '970x250': { width: 970, height: 250 },
  '250x250': { width: 250, height: 250 },
  '120x600': { width: 120, height: 600 },
};

/**
 * CrazyGamesBanner - Displays CrazyGames banner ads
 *
 * Can display either fixed-size or responsive banners.
 * The component automatically handles ad request and cleanup.
 *
 * @example Fixed size banner
 * ```tsx
 * <CrazyGamesBanner size="300x250" />
 * ```
 *
 * @example Responsive banner
 * ```tsx
 * <CrazyGamesBanner responsive className="w-full max-w-lg h-24" />
 * ```
 */
const CrazyGamesBanner = memo<CrazyGamesBannerProps>(({
  responsive = false,
  size = '300x250',
  className,
  show = true,
}) => {
  const uniqueId = useId();
  const containerId = `cg-banner-${uniqueId.replace(/:/g, '')}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const hasRequestedRef = useRef(false);

  const {
    isAvailable,
    isLoading,
    requestBanner,
    requestResponsiveBanner,
    clearBanner,
  } = useCrazyGames();

  // Request banner when component mounts and SDK is ready
  useEffect(() => {
    if (isLoading || !isAvailable || !show || hasRequestedRef.current) return;

    // Enforce 30-second minimum between banner requests (CrazyGames requirement)
    const BANNER_COOLDOWN_MS = 30000;
    const timeSinceLastRequest = Date.now() - globalLastBannerRequestTime;
    const delay = globalLastBannerRequestTime === 0
      ? 100 // First request: small delay for DOM readiness
      : Math.max(100, BANNER_COOLDOWN_MS - timeSinceLastRequest);

    const timeoutId = setTimeout(() => {
      if (responsive) {
        requestResponsiveBanner(containerId);
      } else {
        const { width, height } = BANNER_DIMENSIONS[size];
        requestBanner(containerId, width, height);
      }
      hasRequestedRef.current = true;
      globalLastBannerRequestTime = Date.now();
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [isAvailable, isLoading, show, responsive, size, containerId, requestBanner, requestResponsiveBanner]);

  // Clear banner when component unmounts or show becomes false
  useEffect(() => {
    return () => {
      if (hasRequestedRef.current && isAvailable) {
        clearBanner(containerId);
        hasRequestedRef.current = false;
      }
    };
  }, [containerId, clearBanner, isAvailable]);

  // Also clear when show becomes false
  useEffect(() => {
    if (!show && hasRequestedRef.current && isAvailable) {
      clearBanner(containerId);
      hasRequestedRef.current = false;
    }
  }, [show, containerId, clearBanner, isAvailable]);

  // Don't render if SDK is not available or not showing
  if (!isAvailable || !show) {
    return null;
  }

  const dimensions = BANNER_DIMENSIONS[size];

  return (
    <div
      ref={containerRef}
      id={containerId}
      className={cn(
        'flex items-center justify-center',
        !responsive && 'mx-auto',
        className
      )}
      style={
        responsive
          ? undefined
          : {
              width: dimensions.width,
              height: dimensions.height,
              minWidth: dimensions.width,
              minHeight: dimensions.height,
            }
      }
      role="complementary"
      aria-label="Advertisement"
    />
  );
});

CrazyGamesBanner.displayName = 'CrazyGamesBanner';

export default CrazyGamesBanner;
export { CrazyGamesBanner };
