'use client';

import { memo } from 'react';

/**
 * v2-only DOM scenery IN FRONT of v1's soft sky: a spinning party sunburst behind
 * the tower and the brand halftone. The neon city used to live here too, but a
 * DOM city on a CSS-eased camera never stood on Pixi's ground — it moved into
 * TowerCanvas (skylineArt.ts).
 *
 * The round-3 sunburst flickered: ONE 220vmax element carried the conic rays,
 * the radial mask AND the rotation, so the mask was re-applied to a ~5000px
 * texture every frame. Now the mask sits on a STATIC wrapper and only the rays
 * rotate — a plain compositor transform on a ~1.2x-viewport layer.
 */
/** `bottomPx`: distance from the viewport bottom to the ground line. */
export const V2Scenery = memo(function V2Scenery({
  bottomPx,
  accentHex,
  reducedMotion,
}: {
  bottomPx: number;
  accentHex: string;
  reducedMotion: boolean;
}) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-x-0 overflow-hidden"
        style={{
          top: 0,
          bottom: bottomPx,
          opacity: 0.12,
          maskImage: 'radial-gradient(circle at 50% 62%, black 0%, black 18%, transparent 62%)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 62%, black 0%, black 18%, transparent 62%)',
        }}
      >
        <div
          className={reducedMotion ? 'absolute' : 'absolute wt2-spin'}
          style={{
            left: '50%',
            top: '62%',
            width: '120vmax',
            height: '120vmax',
            marginLeft: '-60vmax',
            marginTop: '-60vmax',
            background: `repeating-conic-gradient(from 0deg, ${accentHex} 0deg 7deg, transparent 7deg 20deg)`,
            willChange: 'transform',
          }}
        />
      </div>
      <div className="texture-halftone absolute inset-0 opacity-40" />
      <style>{`
        @keyframes wt2-spin { to { transform: rotate(360deg); } }
        .wt2-spin { animation: wt2-spin 90s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .wt2-spin { animation: none; } }
      `}</style>
    </div>
  );
});
