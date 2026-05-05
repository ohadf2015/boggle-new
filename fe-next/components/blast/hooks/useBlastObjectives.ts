import { useMemo } from 'react';
import type { BlastGameState, BlastTileType, BlastObjective, BlastObjectiveProgress } from '../types';

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
}

function getProgress(
  objective: BlastObjective,
  gameState: BlastGameState,
  tileTypeClears: Record<BlastTileType, number>,
  wordsFound: string[],
  initialTileTypeCounts?: Record<BlastTileType, number>,
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

    // ===== Goal Gallery (mechanic-rich rotating goals) =====

    case 'cascade_chain': {
      // Player must trigger ≥N cascade depth from a single word's chain reaction.
      // Reads peakCascadeDepth which the engine ratchets whenever
      // cascadeChainLevel advances during a cascade. Goal stays satisfied
      // once hit even if later moves never re-cascade.
      current = gameState.peakCascadeDepth ?? 0;
      break;
    }

    case 'path_route': {
      // Reducer flips `routeCompleted` when any submitted word's selection
      // path includes both startCell + endCell (and any mustPassCells). Hook
      // just reads the flag so progress is binary 0/1.
      current = gameState.routeCompleted ? 1 : 0;
      break;
    }

    case 'tile_sniper': {
      // Reducer flips `sniperHit` when any submitted word's path includes
      // the marked targetCell. Binary 0/1.
      current = gameState.sniperHit ? 1 : 0;
      break;
    }

    case 'long_word_lockup': {
      // Single masterstroke: any word ≥ minWordLength counts. Track peak
      // so goal stays earned across wave even if shorter words follow.
      const minLen = objective.minWordLength ?? 8;
      const peak = gameState.peakWordLength ?? 0;
      // current=1 once peak crosses threshold, else 0
      current = peak >= minLen ? 1 : 0;
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
}: UseBlastObjectivesParams) {
  const objectiveProgress = useMemo(() =>
    objectives.map(obj =>
      getProgress(obj, gameState, tileTypeClears, wordsFound, initialTileTypeCounts),
    ),
    [objectives, gameState, tileTypeClears, wordsFound, initialTileTypeCounts],
  );

  const allObjectivesComplete = useMemo(
    () => objectiveProgress.length > 0 && objectiveProgress.every(p => p.isComplete),
    [objectiveProgress],
  );

  return { objectives, objectiveProgress, allObjectivesComplete };
}
