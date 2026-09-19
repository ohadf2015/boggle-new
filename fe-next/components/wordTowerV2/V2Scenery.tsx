'use client';

import { memo } from 'react';

/**
 * v2-only DOM scenery IN FRONT of v1's soft sky: a party sunburst behind the
 * tower and the brand halftone. The neon city used to live here too, but a DOM
 * city on a CSS-eased camera never stood on Pixi's ground — it moved into
 * TowerCanvas (skylineArt.ts).
 *
 * The sunburst is STATIC. It used to spin: a 220vmax conic-gradient layer with a
 * radial mask, re-rasterised whenever its `top` changed. On a phone that is a
 * ~5000px masked texture — the flicker. A 120s rotation was invisible anyway.
 */
/** `bottomPx`: distance from the viewport bottom to the ground line. */
export const V2Scenery = memo(function V2Scenery({ bottomPx, accentHex }: { bottomPx: number; accentHex: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-x-0"
        style={{
          top: 0,
          bottom: bottomPx,
          background: `repeating-conic-gradient(from 0deg at 50% 62%, ${accentHex} 0deg 7deg, transparent 7deg 20deg)`,
          opacity: 0.12,
          maskImage: 'radial-gradient(circle at 50% 62%, black 0%, black 18%, transparent 62%)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 62%, black 0%, black 18%, transparent 62%)',
        }}
      />
      <div className="texture-halftone absolute inset-0 opacity-40" />
    </div>
  );
});
