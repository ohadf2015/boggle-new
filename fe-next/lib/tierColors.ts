/**
 * Tier color identity for the seasons feature.
 *
 * Maps each rank tier to a primary text color and an accent border color
 * drawn from the project's neo-brutalist palette. Use these so a Diamond
 * player's UI radiates cyan electricity, a Master pink, and so on —
 * giving each tier a distinct visual identity beyond the medal alone.
 */

export interface TierColor {
  /** Tailwind text color class — for tier name labels */
  text: string;
  /** Tailwind border color class — for stripes / accent borders */
  border: string;
  /** Tailwind background color class — for solid badge chips, accents */
  bg: string;
  /** Solid color hex — for direct CSS / SVG / canvas use */
  hex: string;
}

const TIER_COLORS: Record<string, TierColor> = {
  Bronze:      { text: 'text-[#CD7F32]',  border: 'border-[#CD7F32]',  bg: 'bg-[#CD7F32]',  hex: '#CD7F32' },
  Silver:      { text: 'text-neo-cream',  border: 'border-neo-cream',  bg: 'bg-neo-cream',  hex: '#FFFEF0' },
  Gold:        { text: 'text-neo-yellow', border: 'border-neo-yellow', bg: 'bg-neo-yellow', hex: '#FFE135' },
  Platinum:    { text: 'text-neo-cyan-light', border: 'border-neo-cyan-light', bg: 'bg-neo-cyan-light', hex: '#80FFFF' },
  Diamond:     { text: 'text-neo-cyan',   border: 'border-neo-cyan',   bg: 'bg-neo-cyan',   hex: '#00FFFF' },
  Master:      { text: 'text-neo-pink',   border: 'border-neo-pink',   bg: 'bg-neo-pink',   hex: '#FF1493' },
  Grandmaster: { text: 'text-neo-purple', border: 'border-neo-purple', bg: 'bg-neo-purple', hex: '#8B5CF6' },
};

const FALLBACK: TierColor = TIER_COLORS.Bronze;

export function tierColor(tier: string): TierColor {
  return TIER_COLORS[tier] ?? FALLBACK;
}
