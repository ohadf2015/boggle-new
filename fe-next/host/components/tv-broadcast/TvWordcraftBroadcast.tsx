'use client';

import type { ComponentProps, ReactNode } from 'react';
import { ProjectorWordcraftStage } from '@/components/education/live/ProjectorWordcraftStage';
import type { WordcraftLiveSocket } from '@/components/multiplayer/wordcraft/useWordcraftLive';
import { TEACHER_CONTROLS_INSET } from '@/components/education/controls/teacherBarInset';

type StageProps = ComponentProps<typeof ProjectorWordcraftStage>;

interface TvWordcraftBroadcastProps {
  joinBar: ReactNode;
  socket: WordcraftLiveSocket | null;
  players: StageProps['players'];
  teams?: StageProps['teams'];
  hostUsername?: string;
  language: string;
  remainingTime: number | null;
  t: StageProps['t'];
}

/** The teacher's Wordcraft screen: join bar for late joiners over the live race; the control strip owns End round. */
export default function TvWordcraftBroadcast({ joinBar, socket, players, teams, hostUsername, language, remainingTime, t }: TvWordcraftBroadcastProps) {
  return (
    <div
      data-testid="tv-wordcraft-broadcast"
      className="flex-1 flex flex-col min-h-0 bg-neo-navy overflow-hidden"
      style={TEACHER_CONTROLS_INSET}
    >
      {joinBar}
      <ProjectorWordcraftStage
        socket={socket}
        players={players}
        teams={teams}
        hostUsername={hostUsername}
        language={language}
        remainingTime={remainingTime}
        t={t}
      />
    </div>
  );
}
