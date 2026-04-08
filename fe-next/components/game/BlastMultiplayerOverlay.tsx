/**
 * BlastMultiplayerOverlay
 * Renders special tile badges on grid cells for blast multiplayer mode.
 */

import type { BlastTileOverlay } from '@/shared/types/game';
import type { BlastTileType } from '@/shared/types/blast';

interface BlastMultiplayerOverlayProps {
  overlay: BlastTileOverlay[];
  gridSize: { rows: number; cols: number };
}

/** Emoji/icon mapping for all 19 special tile types */
const TILE_ICONS: Partial<Record<BlastTileType, string>> = {
  gold: '\u2B50',           // star
  rainbow: '\uD83C\uDF08', // rainbow
  bomb: '\uD83D\uDCA3',    // bomb
  ice: '\u2744\uFE0F',     // snowflake
  gem: '\uD83D\uDC8E',     // gem
  lightning: '\u26A1',      // lightning
  magnet: '\uD83E\uDDF2',  // magnet
  prism: '\uD83D\uDD2E',   // crystal ball
  frozen: '\uD83E\uDDCA',  // ice cube
  mirror: '\uD83E\uDE9E',  // mirror
  silver: '\uD83E\uDD48',  // silver medal
  diamond: '\uD83D\uDC8E', // gem (diamond variant)
  wildcard: '\uD83C\uDFB2', // game die
  countdown: '\u23F3',      // hourglass
  portal: '\uD83C\uDF00',  // cyclone
  catalyst: '\u2697\uFE0F', // alembic
  shuffle: '\uD83D\uDD00', // shuffle arrows
  magma: '\uD83C\uDF0B',   // volcano
};

export function BlastMultiplayerOverlay({ overlay, gridSize }: BlastMultiplayerOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {overlay.map((tile) => {
        const icon = TILE_ICONS[tile.type];
        if (!icon) return null;

        // Position badge as percentage of grid
        const left = `${(tile.col / gridSize.cols) * 100}%`;
        const top = `${(tile.row / gridSize.rows) * 100}%`;
        const width = `${(1 / gridSize.cols) * 100}%`;
        const height = `${(1 / gridSize.rows) * 100}%`;

        return (
          <div
            key={`${tile.row}-${tile.col}`}
            data-testid={`blast-tile-${tile.row}-${tile.col}`}
            className="absolute flex items-start justify-end"
            style={{ insetInlineStart: left, top, width, height }}
          >
            <span className="text-xs leading-none opacity-90">
              {icon}
            </span>
          </div>
        );
      })}
    </div>
  );
}
