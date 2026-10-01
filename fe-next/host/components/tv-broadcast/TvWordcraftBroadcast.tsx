'use client';

import type { ReactNode } from 'react';
import { WordcraftProjectorView } from '@/components/multiplayer/wordcraft/WordcraftProjectorView';
import type { WordcraftLiveSocket } from '@/components/multiplayer/wordcraft/useWordcraftLive';
import { TEACHER_CONTROLS_INSET } from '@/components/education/controls/teacherBarInset';

interface TvWordcraftBroadcastProps {
  joinBar: ReactNode;
  socket: WordcraftLiveSocket | null;
  leaderboard: { username: string; score: number }[];
  remainingTime: number | null;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/** The teacher's Wordcraft screen: join bar for late joiners over the live race; the control strip owns End round. */
export default function TvWordcraftBroadcast({ joinBar, socket, leaderboard, remainingTime, t }: TvWordcraftBroadcastProps) {
  return (
    <div
      data-testid="tv-wordcraft-broadcast"
      className="flex-1 flex flex-col min-h-0 bg-neo-navy overflow-hidden"
      style={TEACHER_CONTROLS_INSET}
    >
      {joinBar}
      <WordcraftProjectorView socket={socket} leaderboard={leaderboard} remainingTime={remainingTime} t={t} embedded />
    </div>
  );
}
