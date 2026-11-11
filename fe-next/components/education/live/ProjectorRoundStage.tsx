'use client';

import type { LetterGrid, WheelPuzzle } from '@/shared/types/game';
import ProjectorBoard, { projectorShowsBoard } from './ProjectorBoard';
import ProjectorWheel from './ProjectorWheel';
import { ProjectorStageFallback, type StagePlayer } from './ProjectorStageFallback';
import type { Translate } from './eduLiveStyles';

interface ProjectorRoundStageProps {
  gameMode?: string;
  grid?: LetterGrid | null;
  wheelPuzzle: WheelPuzzle | null;
  /** Live scores, so a round without a shared board still shows who leads. */
  players?: readonly StagePlayer[];
  /** Overrides the board's box, for a stage that shares its column. */
  boardClassName?: string;
  t: Translate;
}

export function ProjectorRoundStage({ gameMode, grid, wheelPuzzle, players, boardClassName, t }: ProjectorRoundStageProps) {
  if (grid && projectorShowsBoard(gameMode, grid)) return <ProjectorBoard grid={grid} label={t('eduLiveRoom.round.boardLabel')} className={boardClassName} />;
  if (wheelPuzzle) return <ProjectorWheel puzzle={wheelPuzzle} label={t('eduLiveRoom.round.wheelLabel')} />;
  return <ProjectorStageFallback mode={gameMode} players={players} t={t} />;
}
