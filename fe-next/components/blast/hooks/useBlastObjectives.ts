import { useMemo } from 'react';
import { getWaveObjectives } from '../utils/blastWaveConfig';
import type { BlastGameState, BlastTileType, BlastObjective, BlastObjectiveProgress } from '../types';

export interface UseBlastObjectivesParams {
  gameState: BlastGameState;
  tileTypeClears: Record<BlastTileType, number>;
  waveNumber: number;
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
  waveNumber,
  wordsFound,
  initialTileTypeCounts,
}: UseBlastObjectivesParams) {
  const objectives = useMemo(() => getWaveObjectives(waveNumber), [waveNumber]);

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
