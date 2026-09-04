'use client';

import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import { Play, Swords } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useActiveClassroomGame } from '@/hooks/useActiveClassroomGame';

export interface PlayWithClassButtonProps {
  classroomId: string;
  userId: string;
  username: string;
}

/**
 * Prominent "Play with Class" button for student dashboard.
 * Shows active game state with join action, or invite to create a room.
 */
export function PlayWithClassButton({
  classroomId,
  userId,
  username,
}: PlayWithClassButtonProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { activeGame } = useActiveClassroomGame(classroomId);

  // Only ever called when a game is running — see `hasGame` below.
  const handleClick = () => {
    if (!activeGame) return;
    // `room`, not `code`: useMultiplayerSession reads ONLY `?room=` to prefill and
    // auto-join. `?code=` left the room empty, so auto-join never fired and
    // `?classroom=true` parked the student on a spinner forever.
    router.push(`/${language}/multiplayer?room=${activeGame.gameCode}&classroom=true`);
  };

  const hasGame = !!activeGame;
  const Wrapper = hasGame ? m.button : m.div;

  return (
    <m.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={cn(
        'relative rounded-neo border-neo border-black shadow-hard-lg overflow-hidden',
        hasGame ? 'bg-neo-pink' : 'bg-neo-pink/80'
      )}
    >
      {/*
        A button only when there is a game to join. Students do not start class games —
        the teacher does — so with no game running this is a status line, not an action.
        It used to navigate to `?classroom=true&autoCreate=true`: no room to join and
        nothing to create, which left the student on a spinner that never resolved.
      */}
      <Wrapper
        {...(hasGame
          ? { onClick: handleClick, whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 } }
          : {})}
        className="w-full p-4 sm:p-6 text-left"
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            'w-14 h-14 rounded-neo border-3 border-black flex items-center justify-center shadow-hard-sm',
            hasGame ? 'bg-black' : 'bg-black/80'
          )}>
            {hasGame ? (
              <Play className="w-7 h-7 text-neo-pink animate-pulse" />
            ) : (
              <Swords className="w-7 h-7 text-neo-pink" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-neo-display font-black text-black">
              {hasGame
                ? t('student.playWithClass.joinNow')
                : t('student.playWithClass.title')
              }
            </h3>

            {hasGame ? (
              <div className="mt-1 space-y-0.5">
                <p className="text-sm font-neo-body font-bold text-black/80">
                  {t('student.playWithClass.teacherStarted', { teacher: activeGame.teacherName })}
                </p>
                {activeGame.playerCount != null && activeGame.playerCount > 0 && (
                  <p className="text-sm font-neo-body font-bold text-black/60">
                    {t('student.playWithClass.playerCount', { count: activeGame.playerCount })}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm font-neo-body font-bold text-black/60 mt-1">
                {t('student.playWithClass.noActiveGame')}
              </p>
            )}
          </div>
        </div>
      </Wrapper>

      {hasGame && (
        <m.div
          className="absolute inset-0 rounded-neo border-neo border-neo-pink pointer-events-none"
          animate={{ opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </m.div>
  );
}
