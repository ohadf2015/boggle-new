/**
 * ClassroomLiveLobby — giant join code, QR, live roster, ONE Start button
 *
 * This screen holds the teacher and students during the setup phase — after the
 * room is created, before the game board renders. Students enter the join code here.
 * The teacher sees everyone who joined and clicks Start to begin play.
 *
 * Dark-only surface (`bg-neo-navy`), 1920×1080-fit (no scroll), socket-driven roster
 * with pop-in animation as students join.
 */

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Zap } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import type { Avatar } from '@/shared/types/game';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export interface ClassroomLiveLobbyProps {
  gameCode: string;
  socket: Socket;
  onStart: () => void;
}

interface Player {
  username: string;
  score?: number;
  avatar?: Avatar;
  isHost?: boolean;
  presenceStatus?: string;
  isWindowFocused?: boolean;
}

export function ClassroomLiveLobby({ gameCode, socket, onStart }: ClassroomLiveLobbyProps) {
  const { t } = useLanguage();
  const [playersInRoom, setPlayersInRoom] = useState<Player[]>([]);

  // Listen to socket updateUsers event to sync roster
  useEffect(() => {
    const handleUpdateUsers = (users: Player[]) => {
      setPlayersInRoom(users || []);
    };

    socket.on('updateUsers', handleUpdateUsers);
    return () => {
      socket.off('updateUsers', handleUpdateUsers);
    };
  }, [socket]);

  // Filter out the host from the displayed roster
  const studentRoster = useMemo(
    () => playersInRoom.filter((p) => !p.isHost),
    [playersInRoom]
  );

  return (
    <div
      data-testid="classroom-lobby-root"
      className={cn(
        'h-dvh overflow-hidden flex flex-col bg-neo-navy',
        'relative w-full'
      )}
    >
      {/* Pinned header with join code */}
      <div className="flex-shrink-0 flex flex-col items-center justify-center py-8 px-4">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="size-8 text-neo-lime" strokeWidth={3} aria-hidden="true" />
          <h1 className="font-neo-display text-4xl font-black uppercase text-neo-lime">
            {t('education.lobby.joinTitle', 'Join the game')}
          </h1>
        </div>

        {/* Giant join code */}
        <div data-testid="classroom-lobby-code" className="mb-6">
          <div className="rounded-neo border-4 border-neo-lime bg-neo-navy-light px-8 py-6 shadow-hard-lg">
            <p className="text-center font-neo-display text-7xl font-black tracking-widest text-neo-lime">
              {gameCode}
            </p>
          </div>
        </div>

        {/* QR code placeholder - will be replaced with actual QR generation */}
        <div className="mb-6 rounded-neo border-2 border-neo-cream bg-neo-cream p-4">
          <div className="w-32 h-32 flex items-center justify-center text-xs text-black font-bold">
            {t('education.lobby.qrPlaceholder', 'QR Code')}
          </div>
        </div>
      </div>

      {/* Scrollable roster area - students pop in here */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-4 pb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-neo-display text-lg font-black uppercase text-neo-cream">
            {t('education.classroomGame.joinedStudents', 'Joined Students')}
          </h2>
          <div
            data-testid="classroom-lobby-count"
            className="rounded-neo border-2 border-neo-lime bg-neo-lime px-3 py-1 font-neo-display font-black text-black"
          >
            {studentRoster.length}
          </div>
        </div>

        {/* Roster list with scroll if needed */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {studentRoster.length === 0 ? (
            <p className="text-center text-neo-white/60 font-neo-body text-sm py-4">
              {t('education.classroomGame.waitingForStudents', 'Waiting for students to join...')}
            </p>
          ) : (
            <ul className="space-y-2" data-testid="classroom-lobby-roster">
              {studentRoster.map((student) => (
                <li
                  key={student.username}
                  className="rounded-neo border-2 border-neo-cream bg-neo-navy-light px-4 py-2 flex items-center gap-3"
                >
                  {student.avatar?.emoji && (
                    <span className="text-2xl" aria-hidden="true">
                      {student.avatar.emoji}
                    </span>
                  )}
                  <span className="font-neo-body font-bold text-neo-white flex-1">
                    {student.username}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Fixed Start button - never scrolls out of view */}
      <div className="flex-shrink-0 flex justify-center px-4 pb-6">
        <button
          type="button"
          data-testid="classroom-lobby-start"
          onClick={onStart}
          className={cn(
            'inline-flex min-h-14 items-center justify-center rounded-neo border-3 border-black',
            'bg-neo-lime px-8 py-3 font-neo-display text-lg font-black uppercase text-black',
            'shadow-hard transition-all hover:-translate-y-1 hover:shadow-hard-lg',
            'active:translate-y-0 active:shadow-hard',
            'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan'
          )}
        >
          {t('education.classroomGame.startGame', 'Start Game')}
        </button>
      </div>
    </div>
  );
}
