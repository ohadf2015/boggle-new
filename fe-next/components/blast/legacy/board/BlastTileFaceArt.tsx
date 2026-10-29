import { Bomb } from 'lucide-react';
import type { BlastTileType } from '../types';

/* Per-column stagger so a row of specials never shines in lockstep. */
const delay = (col: number, step: number) => ({ animationDelay: `${(col * step) % 3}s` });

/** Face art that carries a special tile's identity beyond its colour. Sits under the letter. */
export function BlastTileFaceArt({ type, col }: { type: BlastTileType; col: number }) {
  if (type === 'bomb') {
    return (
      <span data-testid="blast-tile-watermark" className="blast-tile-watermark" aria-hidden="true">
        <Bomb className="h-full w-full" strokeWidth={2.5} />
      </span>
    );
  }
  if (type === 'gold') {
    return (
      <span data-testid="blast-tile-shine" className="blast-tile-coin" aria-hidden="true">
        <span className="blast-tile-shine" style={delay(col, 0.7)} />
      </span>
    );
  }
  if (type === 'diamond') {
    return (
      <span data-testid="blast-tile-facets" className="blast-tile-facets" aria-hidden="true">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          <polygon points="0,0 100,0 50,38" fill="rgba(255,255,255,0.42)" />
          <polygon points="0,0 50,38 0,62" fill="rgba(255,255,255,0.2)" />
          <polygon points="100,0 100,62 50,38" fill="rgba(11,21,48,0.08)" />
          <polygon points="0,62 50,38 100,62 50,100" fill="rgba(11,21,48,0.14)" />
          <polyline points="0,62 50,38 100,62" fill="none" stroke="rgba(11,21,48,0.22)" strokeWidth="2" />
        </svg>
        <span className="blast-tile-sparkle" style={delay(col, 1.1)} />
      </span>
    );
  }
  return null;
}
