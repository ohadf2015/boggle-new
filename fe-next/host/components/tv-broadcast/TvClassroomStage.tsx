'use client';

import type { ComponentProps, ReactNode } from 'react';
import type { Socket } from 'socket.io-client';
import { ProjectorRoundStage } from '@/components/education/live/ProjectorRoundStage';
import { ClassroomLivePanel } from '@/components/education/projector/ClassroomLivePanel';
import { ProjectorLessonClaims } from '@/components/education/projector/ProjectorLessonClaims';
import { useLessonClaims } from '@/components/education/live/useLessonClaims';
import type { Language } from '@/shared/types/game';

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
  t: (key: string, params?: Record<string, string | number>) => string;
}

/** The classroom board stage plus its side column; the race board takes a capped share so the live panel keeps its room at 1080p. */
export function TvClassroomStage({ gameMode, grid, wheelPuzzle, activityPanel, socket, totalWords, lessonWords, language, hostUsername, t }: TvClassroomStageProps) {
  const race = useLessonClaims();
  return (
    <div className="flex h-full min-h-0 gap-2 md:gap-4">
      <ProjectorRoundStage gameMode={gameMode} grid={grid} wheelPuzzle={wheelPuzzle} t={t} />
      <div className="flex min-w-0 flex-1 flex-col gap-2 md:gap-4">
        <div className="min-h-0 flex-1">
          {gameMode === 'word-hunt' ? activityPanel : (
            <ClassroomLivePanel socket={socket} totalWords={totalWords} lessonWords={lessonWords} language={language} hostUsername={hostUsername} t={t} />
          )}
        </div>
        {race && (
          <div data-testid="tv-race-region" className="min-h-[12rem] md:min-h-0 shrink-0 basis-2/5">
            <ProjectorLessonClaims t={t} />
          </div>
        )}
      </div>
    </div>
  );
}
