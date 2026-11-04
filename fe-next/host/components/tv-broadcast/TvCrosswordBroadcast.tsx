'use client';

import type { ReactNode } from 'react';
import { ProjectorCrosswordStage } from '@/components/education/live/ProjectorCrosswordStage';
import type { CrosswordMpSocketLike } from '@/components/multiplayer/crossword/useCrosswordMp';
import type { Translate } from '@/components/education/live/eduLiveStyles';
import { TEACHER_CONTROLS_INSET } from '@/components/education/controls/teacherBarInset';

interface TvCrosswordBroadcastProps {
  joinBar: ReactNode;
  socket: CrosswordMpSocketLike | null;
  remainingTime: number | null;
  t: Translate;
}

/** The teacher's crossword screen: join bar for late joiners over the live race; the control strip owns End round. */
export default function TvCrosswordBroadcast({ joinBar, socket, remainingTime, t }: TvCrosswordBroadcastProps) {
  return (
    <div
      data-testid="tv-crossword-broadcast"
      className="flex-1 flex flex-col min-h-0 bg-neo-navy overflow-hidden"
      style={TEACHER_CONTROLS_INSET}
    >
      {joinBar}
      <ProjectorCrosswordStage socket={socket} remainingTime={remainingTime} t={t} />
    </div>
  );
}
