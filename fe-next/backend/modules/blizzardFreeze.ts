import type { GameState } from './gameState/types.js';
import { isWordOnBoardAsync } from './wordValidatorPool.js';
import { makePositionsMap } from './wordValidator.js';

type Tile = { row: number; col: number };

/** During a blizzard a word must be traceable without touching a frozen tile. */
export async function wordBlockedByBlizzard(game: GameState, word: string): Promise<boolean> {
  if (game.activeRoundEvent !== 'blizzard' || !game.letterGrid) return false;
  const tiles = (game as GameState & { frozenTiles?: Tile[] }).frozenTiles;
  if (!tiles?.length) return false;
  const masked = game.letterGrid.map((row) => [...row]);
  for (const { row, col } of tiles) if (masked[row]?.[col] !== undefined) masked[row][col] = '#';
  return !(await isWordOnBoardAsync(word, masked, makePositionsMap(masked, game.language || 'en')));
}
