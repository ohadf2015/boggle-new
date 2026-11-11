'use client';

import type { ComponentProps, ReactNode } from 'react';
import type { Socket } from 'socket.io-client';
import { ProjectorRoundStage } from '@/components/education/live/ProjectorRoundStage';
import { ClassroomLivePanel } from '@/components/education/projector/ClassroomLivePanel';
import { ProjectorLessonClaims } from '@/components/education/projector/ProjectorLessonClaims';
import { ProjectorClaimFlash } from '@/components/education/projector/ProjectorClaimFlash';
import { useLessonClaims } from '@/components/education/live/useLessonClaims';
import type { Avatar, Language } from '@/shared/types/game';

type StageProps = ComponentProps<typeof ProjectorRoundStage>;

export interface TvClassroomStageProps {
  gameMode: StageProps['gameMode'];
  grid: StageProps['grid'];
  wheelPuzzle: StageProps['wheelPuzzle'];
  activityPanel: ReactNode;
  socket: Socket | null;
  totalWords: number;
  lessonWords: string[];
  language: Language;
  hostUsername: string;
  players?: readonly { username: string; avatar?: Avatar | null }[];
  t: (key: string, params?: Record<string, string | number>) => string;
}

/** With a word race, the race board fills the board column under the grid so the live panel keeps its whole column. */
export function TvClassroomStage({ gameMode, grid, wheelPuzzle, activityPanel, socket, totalWords, lessonWords, language, hostUsername, players, t }: TvClassroomStageProps) {
  const race = useLessonClaims();
  const livePanel = (
    <div className="min-h-0 min-w-0 flex-1">
      {gameMode === 'word-hunt' ? activityPanel : (
        <ClassroomLivePanel socket={socket} totalWords={totalWords} lessonWords={lessonWords} language={language} hostUsername={hostUsername} players={players} t={t} />
      )}
    </div>
  );
  if (!race) {
    return (
      <div className="flex h-full min-h-0 gap-2 md:gap-4">
        <ProjectorRoundStage gameMode={gameMode} grid={grid} wheelPuzzle={wheelPuzzle} t={t} />
        <div className="flex min-w-0 flex-1 flex-col">{livePanel}</div>
      </div>
    );
  }
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 md:flex-row md:gap-4">
      <div data-testid="tv-board-column" className="flex min-h-0 w-full shrink-0 flex-col gap-2 md:w-[60%] md:gap-4 md:[container-type:size]">
        <div className="hidden shrink-0 md:block md:h-[min(100cqw,59cqh)]">
          <ProjectorRoundStage gameMode={gameMode} grid={grid} wheelPuzzle={wheelPuzzle} boardClassName="w-full md:flex md:justify-center" t={t} />
        </div>
        <div data-testid="tv-race-region" className="min-h-[12rem] flex-1 md:min-h-0">
          <ProjectorLessonClaims t={t} />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col max-md:order-first">{livePanel}</div>
      <ProjectorClaimFlash t={t} />
    </div>
  );
}
