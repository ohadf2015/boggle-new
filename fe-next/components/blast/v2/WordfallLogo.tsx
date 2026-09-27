'use client';
import type { CSSProperties } from 'react';

type Props = {
  /** Brand accent — defaults to the Wordfall violet. Pass the level modeColor to theme it. */
  color?: string;
  /** Pixel size of the glyph (the wordmark scales its text from this). */
  size?: number;
  /** 'glyph' = mark only (compact, for cards); 'wordmark' = mark + "Wordfall". */
  variant?: 'glyph' | 'wordmark';
  className?: string;
  style?: CSSProperties;
};

/**
 * Wordfall brand mark — the renamed Blast V2 mode. Neo-brutalist falling
 * letter-tiles: three tiles cascading down a column with a hard pixel shadow,
 * evoking the gravity-collapse word puzzle. Pure inline SVG (no asset request),
 * recolorable per level theme, and accessible (role=img + title).
 */
export function WordfallLogo({
  color = '#A855F7',
  size = 40,
  variant = 'glyph',
  className,
  style,
}: Props) {
  const glyph = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Wordfall"
      className={variant === 'glyph' ? className : undefined}
      style={variant === 'glyph' ? style : undefined}
    >
      <title>Wordfall</title>
      {/* Hard pixel shadow layer (neo-brutalist, no blur). */}
      <g transform="translate(2.5,2.5)">
        <rect x="6" y="2" width="14" height="14" rx="3" fill="#0b1530" />
        <rect x="20" y="15" width="14" height="14" rx="3" fill="#0b1530" />
        <rect x="10" y="29" width="14" height="14" rx="3" fill="#0b1530" />
      </g>
      {/* Cascading tiles — staggered down-and-across like words tumbling. */}
      <rect x="6" y="2" width="14" height="14" rx="3" fill={color} stroke="#0b1530" strokeWidth="2" />
      <rect x="20" y="15" width="14" height="14" rx="3" fill="#fff" stroke="#0b1530" strokeWidth="2" />
      <rect x="10" y="29" width="14" height="14" rx="3" fill={color} stroke="#0b1530" strokeWidth="2" />
      {/* Letter ticks so the tiles read as "word" pieces, not generic blocks. */}
      <text x="13" y="13.5" textAnchor="middle" fontSize="10" fontWeight="900" fill="#0b1530">W</text>
      <text x="27" y="26.5" textAnchor="middle" fontSize="10" fontWeight="900" fill={color === '#fff' ? '#0b1530' : '#A855F7'}>O</text>
      <text x="17" y="40.5" textAnchor="middle" fontSize="10" fontWeight="900" fill="#0b1530">F</text>
    </svg>
  );

  if (variant === 'glyph') return glyph;

  return (
    <div
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.22, ...style }}
      data-testid="wordfall-wordmark"
    >
      {glyph}
      <span
        className="font-neo-display font-black uppercase"
        style={{
          fontSize: size * 0.62,
          letterSpacing: '-0.02em',
          color: '#fff',
          textShadow: `2px 2px 0 #0b1530`,
          lineHeight: 1,
        }}
      >
        Wordfall
      </span>
    </div>
  );
}
