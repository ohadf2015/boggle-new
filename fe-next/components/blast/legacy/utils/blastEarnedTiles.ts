/**
 * Earned tile creation — players create special tiles through word length.
 *
 * This is the "earned spectacle" pattern from Candy Crush:
 * longer words → better specials → players feel ownership over powerful tiles.
 *
 * 5-letter word → gold (multiplier boost)
 * 6-letter word → bomb or lightning (area/column clear)
 * 7+ letter word → prism or rainbow (cross-clear)
 */
import type { BlastTileState, BlastTileType } from '@/shared/types/blast';
import { getInitialHitsRemaining } from './blastTileUtils';

/** Tile pool per word length tier. Key = minimum word length. */
export const WORD_LENGTH_REWARDS: Record<number, BlastTileType[]> = {
  5: ['gold'],
  6: ['bomb', 'lightning'],
  7: ['prism', 'rainbow'],
};

/** Get the reward tier for a given word length (returns highest matching tier) */
function getRewardTier(wordLength: number): BlastTileType[] | null {
  if (wordLength >= 7) return WORD_LENGTH_REWARDS[7];
  if (wordLength >= 6) return WORD_LENGTH_REWARDS[6];
  if (wordLength >= 5) return WORD_LENGTH_REWARDS[5];
  return null;
}

/**
 * Upgrade a random standard tile on the grid to a special tile earned by word length.
 * Mutates the grid in place. Returns the upgraded cell coordinates or null.
 *
 * @param grid - Current tile state grid (mutated in place)
 * @param path - Word path cells (excluded from upgrade candidates)
 * @param wordLength - Length of the submitted word
 * @param _currentWave - Current wave (reserved for future wave-gating)
 * @param rng - Optional seeded RNG for multiplayer determinism
 */
export function earnTileUpgrade(
  grid: BlastTileState[][],
  path: Array<{ row: number; col: number }>,
  wordLength: number,
  _currentWave: number,
  rng: () => number = Math.random,
): { row: number; col: number } | null {
  const tier = getRewardTier(wordLength);
  if (!tier) return null;

  const pathSet = new Set(path.map(p => `${p.row},${p.col}`));
  const candidates: BlastTileState[] = [];

  for (const row of grid) {
    for (const tile of row) {
      if (!tile.isCleared && tile.type === 'standard' && !pathSet.has(`${tile.row},${tile.col}`)) {
        candidates.push(tile);
      }
    }
  }

  if (candidates.length === 0) return null;

  const target = candidates[Math.floor(rng() * candidates.length)];
  const newType = tier[Math.floor(rng() * tier.length)];

  target.type = newType;
  target.hitsRemaining = getInitialHitsRemaining(newType);
  target.activationEffect = 'tile-earned';

  return { row: target.row, col: target.col };
}
