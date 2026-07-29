import { useMemo } from 'react';
import type { BlastGameState, BlastTileType, BlastObjective, BlastObjectiveProgress } from '../types';
import type { BlastTileState } from '@/shared/types/blast';
import { countJelly } from '../utils/blastJellyEngine';
import { getCakeHp } from '../utils/blastCakeEngine';
import { countChocolate } from '../utils/blastChocolateEngine';

export interface UseBlastObjectivesParams {
  gameState: BlastGameState;
  tileTypeClears: Record<BlastTileType, number>;
  /**
   * Pre-computed objectives for the current wave.
   * The hook consumes them rather than recomputing — this preserves any
   * language-specific seeding (target_word pool by locale) and any
   * board-validated repairs done by the parent. Recomputing here would
   * silently default to English and re-seed a different target word.
   */
  objectives: BlastObjective[];
  wordsFound: string[];
  /** Initial count of each tile type on the board (needed for clear_all_type) */
  initialTileTypeCounts?: Record<BlastTileType, number>;
  /** Current per-cell tile state; needed for cc-mechanic objectives (clear_jelly etc.) */
  tileStates?: BlastTileState[][];
  /** Initial jelly cell count at wave start (denominator for clear_jelly progress). */
  initialJellyCount?: number;
}

function getProgress(
  objective: BlastObjective,
  gameState: BlastGameState,
  tileTypeClears: Record<BlastTileType, number>,
  wordsFound: string[],
  initialTileTypeCounts?: Record<BlastTileType, number>,
  tileStates?: BlastTileState[][],
  initialJellyCount?: number,
): BlastObjectiveProgress {
  let current = 0;
  let target = objective.target;

  switch (objective.type) {
    case 'score_target':
      current = gameState.score;
      break;

    case 'collect_type':
      current = (objective.tileType && tileTypeClears[objective.tileType as BlastTileType]) || 0;
      break;

    case 'clear_all_type': {
      const tileType = objective.tileType as BlastTileType;
      current = tileTypeClears[tileType] || 0;
      // Target is the total count of that tile type on the board
      target = (initialTileTypeCounts && initialTileTypeCounts[tileType]) || 0;
      break;
    }

    case 'word_length': {
      const minLen = objective.minWordLength || 1;
      current = wordsFound.filter(w => w.length >= minLen).length;
      break;
    }

    case 'clear_percent': {
      const { tilesCleared, totalTiles } = gameState;
      // Use floor-safe percentage: avoid rounding down from e.g. 89.9% → 89
      // when the player has genuinely cleared ≥90% of the board.
      current = totalTiles > 0 ? Math.floor((tilesCleared / totalTiles) * 100 + 0.5) : 0;
      break;
    }

    case 'target_word': {
      const targetWord = (objective.targetWord || '').toUpperCase();
      current = wordsFound.some(w => w.toUpperCase() === targetWord) ? 1 : 0;
      break;
    }

    case 'color_power': {
      // Track the max color count across all words found
      // If lastWordColorCounts is set, use the matching color's count
      const colorTag = objective.colorTag as 'pink' | 'cyan' | 'lime' | undefined;
      if (colorTag && gameState.lastWordColorCounts) {
        current = gameState.lastWordColorCounts[colorTag] || 0;
      }
      break;
    }

    case 'clear_jelly': {
      const initial = initialJellyCount ?? objective.target;
      const remaining = tileStates ? countJelly(tileStates) : initial;
      current = Math.max(0, initial - remaining);
      target = initial;
      break;
    }

    case 'stop_chocolate': {
      // Survival objective: target=0 chocolate cells at wave end. Until cleared,
      // current=0/target=0 reads weird, so we expose chocolate-count as progress
      // (lower is better) and isComplete only when zero remain.
      const remaining = tileStates ? countChocolate(tileStates) : 1;
      current = remaining === 0 ? 1 : 0;
      target = 1;
      break;
    }

    case 'kill_cake': {
      // target carries max-HP; current = damage dealt = maxHp - currentHp.
      // First cake anchor in tileStates wins (single boss per wave).
      const maxHp = objective.target;
      let currentHp: number | null = null;
      if (tileStates) {
        for (const row of tileStates) {
          for (const cell of row) {
            if (cell.cakeAnchorUid && typeof cell.cakeHp === 'number') {
              currentHp = getCakeHp(tileStates, cell.cakeAnchorUid);
              break;
            }
          }
          if (currentHp !== null) break;
        }
      }
      current = currentHp === null ? 0 : Math.max(0, maxHp - currentHp);
      break;
    }
  }

  return {
    objective: { ...objective, target },
    current,
    isComplete: current >= target,
  };
}

export function useBlastObjectives({
  gameState,
  tileTypeClears,
  objectives,
  wordsFound,
  initialTileTypeCounts,
  tileStates,
  initialJellyCount,
}: UseBlastObjectivesParams) {
  const objectiveProgress = useMemo(() =>
    objectives.map(obj =>
      getProgress(obj, gameState, tileTypeClears, wordsFound, initialTileTypeCounts, tileStates, initialJellyCount),
    ),
    [objectives, gameState, tileTypeClears, wordsFound, initialTileTypeCounts, tileStates, initialJellyCount],
  );

  const allObjectivesComplete = useMemo(
    () => objectiveProgress.length > 0 && objectiveProgress.every(p => p.isComplete),
    [objectiveProgress],
  );

  return { objectives, objectiveProgress, allObjectivesComplete };
}
