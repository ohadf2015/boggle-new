/**
 * Quick Play mode glyphs — one authored SVG set for the four picker nodes.
 *
 * Replaces four unrelated raster stickers (a 3D die, a comic burst, a
 * magnifier scene, a purple ring) that shared no metaphor, no weight and no
 * ink, and carried nonsense letterforms baked into the art.
 *
 * The contract every glyph holds — deviate and the set stops reading as a set:
 *  - one 48×48 viewBox, artwork inside a 40×40 optical box
 *  - `currentColor` only (the node paints it black on its accent keycap)
 *  - stroke 3.2, round caps + joins; solid dots/tiles as the mass anchor
 *  - NO <text>, NO letterform of any kind (word game: a letter in the icon
 *    reads as game content, not as a label)
 *  - a silhouette distinct from the other three at 44px, not just at 256px:
 *    square grid · irregular shards · angular brackets · circular orbit
 */
import type React from 'react';
import type { QuickMode } from './types';

export const GLYPH_VIEWBOX = '0 0 48 48';
const STROKE = 3.2;

type GlyphProps = { size: number; className?: string };

const shared = {
  viewBox: GLYPH_VIEWBOX,
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: STROKE,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

/**
 * Classic — trace a path through the letter grid. Silhouette: square grid.
 *
 * The trace is a STAIRCASE, deliberately. The first attempt drew the route as
 * two strokes meeting at the centre and it read as a capital Y — the exact
 * thing this set is not allowed to do. A staircase turns four times and
 * resolves to no letter in any of our scripts.
 */
function ClassicGlyph({ size, className }: GlyphProps) {
  return (
    <svg {...shared} width={size} height={size} className={className}>
      <rect x="7" y="7" width="34" height="34" rx="5" />
      <path d="M7 18h34M7 30h34M18 7v34M30 7v34" strokeWidth={2} opacity={0.4} />
      <path d="M12.5 13v11h11v11h11" strokeWidth={4.6} />
      <circle cx="12.5" cy="13" r="3.3" fill="currentColor" stroke="none" />
      <circle cx="34.5" cy="35" r="3.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Blast — tiles shatter and clear. Silhouette: irregular shards. */
function BlastGlyph({ size, className }: GlyphProps) {
  return (
    <svg {...shared} width={size} height={size} className={className}>
      <path d="M24 5v6M43 24h-6M24 43v-6M5 24h6M37.4 10.6l-4.2 4.2M37.4 37.4l-4.2-4.2M10.6 37.4l4.2-4.2M10.6 10.6l4.2 4.2" />
      <path d="M24 14.5 33.5 24 24 33.5 14.5 24Z" fill="currentColor" stroke="none" />
      <path d="M24 14.5 33.5 24 24 33.5 14.5 24Z" />
    </svg>
  );
}

/** Word Hunt — lock onto the hidden word. Silhouette: angular brackets. */
function WordHuntGlyph({ size, className }: GlyphProps) {
  return (
    <svg {...shared} width={size} height={size} className={className}>
      <path d="M7 16.5V9.5A2.5 2.5 0 0 1 9.5 7h7M31.5 7h7A2.5 2.5 0 0 1 41 9.5v7M41 31.5v7a2.5 2.5 0 0 1-2.5 2.5h-7M16.5 41h-7A2.5 2.5 0 0 1 7 38.5v-7" />
      <path d="M24 15.5v5M24 27.5v5M15.5 24h5M27.5 24h5" strokeWidth={2.6} />
      <rect x="19" y="19" width="10" height="10" rx="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Wheel Rush — spin the letter ring. Silhouette: circular orbit. */
function WheelRushGlyph({ size, className }: GlyphProps) {
  return (
    <svg {...shared} width={size} height={size} className={className}>
      <circle cx="24" cy="24" r="16" strokeWidth={2.6} opacity={0.45} />
      <circle cx="24" cy="24" r="5.6" fill="currentColor" stroke="none" />
      <circle cx="24" cy="8" r="3.4" fill="currentColor" stroke="none" />
      <circle cx="35.3" cy="12.7" r="3.4" fill="currentColor" stroke="none" />
      <circle cx="40" cy="24" r="3.4" fill="currentColor" stroke="none" />
      <circle cx="35.3" cy="35.3" r="3.4" fill="currentColor" stroke="none" />
      <circle cx="12.7" cy="35.3" r="3.4" fill="currentColor" stroke="none" />
      <circle cx="8" cy="24" r="3.4" fill="currentColor" stroke="none" />
      <path d="M14.4 10.2A16 16 0 0 1 24 7" strokeWidth={4.4} />
    </svg>
  );
}

export const MODE_GLYPHS: Record<QuickMode, (props: GlyphProps) => React.ReactElement> = {
  classic: ClassicGlyph,
  blast: BlastGlyph,
  'word-hunt': WordHuntGlyph,
  'wheel-rush': WheelRushGlyph,
};

export function ModeGlyph({ mode, size, className }: GlyphProps & { mode: QuickMode }) {
  const Glyph = MODE_GLYPHS[mode];
  return <Glyph size={size} className={className} />;
}
