/**
 * useBlastMultiplayerBridge
 * Converts Zustand multiplayer state (blastTileOverlay, blastSeed, gameLanguage)
 * into props compatible with BlastGame in multiplayer mode.
 */

import { useMemo } from 'react';
import { useBlastTileOverlay, useBlastSeed, useGameLanguage } from '@/hooks/gameState/store';
import type { BlastTileOverlay, LetterGrid } from '@/shared/types/game';
import type { BlastTileState, BlastTileType } from '@/shared/types/blast';
import type { BlastGameConfig } from '../types';
import { getInitialHitsRemaining } from '../utils/blastTileUtils';
import { createSeededRandom } from '../utils/blastLetterGenerator';
import { FROST_INNER_CANDIDATES } from '@/shared/constants/blastMultiplayerConstants';

interface UseBlastMultiplayerBridgeOptions {
  letterGrid: LetterGrid | null;
  gridSize: number;
}

interface UseBlastMultiplayerBridgeReturn {
  config: BlastGameConfig;
  initialTileStates: BlastTileState[][] | null;
  blastSeed: number | null;
}

/**
 * Build a BlastTileState[][] from server overlay + grid size.
 * Cells not in the overlay become 'standard'.
 */
function overlayToTileStates(
  overlay: BlastTileOverlay[],
  gridSize: number,
  seed: number | null,
): BlastTileState[][] {
  // Build lookup for O(1) access
  const lookup = new Map<string, BlastTileOverlay>();
  for (const tile of overlay) {
    lookup.set(`${tile.row}-${tile.col}`, tile);
  }

  // Seeded RNG for deterministic frozen innerType across all players
  const random = createSeededRandom(seed ?? 0);

  const states: BlastTileState[][] = [];
  for (let row = 0; row < gridSize; row++) {
    states[row] = [];
    for (let col = 0; col < gridSize; col++) {
      const entry = lookup.get(`${row}-${col}`);
      const type = entry?.type ?? 'standard';

      // Frozen tiles get a hidden special innerType (revealed on second hit)
      const innerType: BlastTileType | undefined =
        type === 'frozen'
          ? FROST_INNER_CANDIDATES[Math.floor(random() * FROST_INNER_CANDIDATES.length)]
          : undefined;

      states[row][col] = {
        uid: `mp-${row}-${col}`,
        row,
        col,
        type,
        isCleared: false,
        activationEffect: null,
        hitsRemaining: getInitialHitsRemaining(type),
        ...(innerType !== undefined ? { innerType } : {}),
      };
    }
  }
  return states;
}

export function useBlastMultiplayerBridge({
  letterGrid,
  gridSize,
}: UseBlastMultiplayerBridgeOptions): UseBlastMultiplayerBridgeReturn {
  const blastTileOverlay = useBlastTileOverlay();
  const blastSeed = useBlastSeed();
  const gameLanguage = useGameLanguage();

  const config: BlastGameConfig = useMemo(() => ({
    gridSize,
    specialTileChance: 0.15,
    language: gameLanguage ?? 'en',
    difficulty: 'medium',
    boardClearMode: 'shrink' as const, // tiles stay missing like SP — no auto-refill
  }), [gridSize, gameLanguage]);

  const initialTileStates = useMemo(() => {
    if (!letterGrid) return null;
    return overlayToTileStates(blastTileOverlay, gridSize, blastSeed);
  }, [blastTileOverlay, gridSize, letterGrid, blastSeed]);

  return { config, initialTileStates, blastSeed };
}
