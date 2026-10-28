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

const TILE_ICONS: Partial<Record<BlastTileType, string>> = {
  gold: '\uD83E\uDE99',    // coin
  bomb: '\uD83D\uDCA3',    // bomb
  diamond: '\uD83D\uDC8E', // gem stone
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
