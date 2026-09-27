/**
 * Random mode glyph — four mode symbols orbiting a central spinner.
 *
 * Unlike the four static mode glyphs (classic, blast, hunt, wheel),
 * Random's visual contract is motion and choice: the four modes circle
 * a core, and a spinning indicator in the centre conveys "wheel decides".
 *
 * - viewBox: 48×48 (same as mode glyphs for visual consistency)
 * - artwork inside a 40×40 optical box
 * - currentColor only (painted black by the keycap)
 * - stroke 3.2, round caps + joins
 * - silhouette distinct from the four mode glyphs at 44px
 */
import type React from 'react';

export interface RandomGlyphProps {
  size: number;
  className?: string;
}

export function RandomGlyph({ size, className }: RandomGlyphProps): React.ReactElement {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={3.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {/* Central spinning indicator circle (always ready to move) */}
      <circle cx="24" cy="24" r="4.5" fill="currentColor" stroke="none" />

      {/* Four mode symbols arranged in orbit around the centre.
          Each tiny, distinct, and positioned at cardinal points.
          Classic: top · Blast: right · Hunt: bottom · Wheel: left */}

      {/* Classic — tiny grid trace (top) */}
      <g transform="translate(24, 10)">
        <rect x="-4" y="-4" width="8" height="8" rx="1.2" strokeWidth="2" opacity={0.7} />
        <path d="M-4 -1h8M-4 3h8M-1 -4v8M3 -4v8" strokeWidth="1.4" opacity={0.5} />
      </g>

      {/* Blast — tiny starburst (right) */}
      <g transform="translate(36, 24)">
        <circle cx="0" cy="0" r="2" fill="currentColor" stroke="none" />
        <path d="M0 -5v10M-5 0h10M-3.5 -3.5l7 7M3.5 -3.5l-7 7" strokeWidth="1.6" opacity={0.7} />
      </g>

      {/* Hunt — tiny crosshair (bottom) */}
      <g transform="translate(24, 38)">
        <rect x="-3" y="-3" width="6" height="6" rx="1" strokeWidth="1.8" opacity={0.7} />
        <path d="M-2 0h4M0 -2v4" strokeWidth="1.4" opacity={0.5} />
      </g>

      {/* Wheel — tiny orbit dots (left) */}
      <g transform="translate(12, 24)">
        <circle cx="0" cy="0" r="3.5" strokeWidth="1.8" opacity={0.5} />
        <circle cx="0" cy="-3.5" r="1" fill="currentColor" stroke="none" />
      </g>

      {/* Outer ring — suggests "the wheel will choose one" */}
      <circle cx="24" cy="24" r="16.5" strokeWidth="2" opacity={0.3} />
    </svg>
  );
}
