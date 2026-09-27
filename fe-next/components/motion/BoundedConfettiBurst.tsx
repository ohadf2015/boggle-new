'use client';

/**
 * BoundedConfettiBurst — Confetti animation bounded to an anchor element
 *
 * Wraps InlineConfetti with a bounded container to prevent full-screen
 * confetti on mobile viewports. Clips particles to the anchor's box
 * and refuses to render on mobile web (where full-screen animations cause flashes).
 *
 * @example
 * ```tsx
 * <BoundedConfettiBurst trigger={hasWon} onComplete={() => moveToNext()}>
 *   <div>Score card here</div>
 * </BoundedConfettiBurst>
 * ```
 */

import React, { useRef, ReactNode } from 'react';
import { InlineConfetti } from '@/components/effects/InlineConfetti';
import { prefersStaticFullscreenOverlay } from '@/lib/native/webViewLayerFlash';

interface BoundedConfettiBurstProps {
  /** Whether to trigger the confetti animation */
  trigger: boolean;
  /** Child element to wrap and anchor the confetti to */
  children: ReactNode;
  /** Size of the explosion area (default 'md') */
  size?: 'sm' | 'md' | 'lg';
  /** Custom colors (defaults to neo-brutalist palette) */
  colors?: string[];
  /** Custom anchor dimensions in pixels */
  anchorDimensions?: { width: number; height: number };
  /** Callback when confetti animation completes */
  onComplete?: () => void;
}

export function BoundedConfettiBurst({
  trigger,
  children,
  size = 'md',
  colors,
  anchorDimensions,
  onComplete,
}: BoundedConfettiBurstProps) {
  const anchorRef = useRef<HTMLDivElement>(null);

  // On mobile web, refuse to render full-screen confetti (it causes white flash).
  // Desktop web and native can render animations safely.
  const shouldSkip = prefersStaticFullscreenOverlay();

  if (shouldSkip && !anchorDimensions) {
    // Mobile viewport with no explicit bounds — skip confetti entirely
    return <div data-testid="bounded-confetti-anchor">{children}</div>;
  }

  const styleOverrides: React.CSSProperties = anchorDimensions
    ? {
        width: `${anchorDimensions.width}px`,
        height: `${anchorDimensions.height}px`,
      }
    : {};

  return (
    <div
      ref={anchorRef}
      data-testid="bounded-confetti-anchor"
      className="relative overflow-hidden"
      style={styleOverrides}
    >
      {children}
      {trigger && !shouldSkip && (
        <div className="pointer-events-none">
          <InlineConfetti size={size} colors={colors} onComplete={onComplete} />
        </div>
      )}
    </div>
  );
}

export default BoundedConfettiBurst;
