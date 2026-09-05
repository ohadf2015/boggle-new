'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import { Play, X, Users, Radio } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useActiveClassroomGame } from '@/hooks/useActiveClassroomGame';

export interface ClassroomGameBannerProps {
  /** The classroom ID to listen for games */
  classroomId: string;
  /** Current user ID */
  userId: string;
  /** Current username */
  username: string;
}

/**
 * ClassroomGameBanner - Notification banner for active classroom games
 *
 * Shows a prominent banner when a teacher starts a game in the student's classroom.
 *
 * The socket lives in `useActiveClassroomGame`, NOT here. This component used to
 * open its own connection with no auth token; the server reads the user only
 * from `handshake.auth.token`, so `getActiveClassroomGames` was rejected before
 * the socket was ever subscribed to `classroom:<id>` — the banner could never
 * fire, and the rejection was swallowed, so it just said "listening" forever.
 * The hook was extracted from this file and gained the token; the original never
 * had it (recurring pitfall class 3). Sharing the hook also collapses three
 * sockets per student on this page down to the ones that earn their keep.
 */
export function ClassroomGameBanner({
  classroomId,
  userId,
  username,
}: ClassroomGameBannerProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { activeGame, isConnected, socket } = useActiveClassroomGame(classroomId);
  const [isJoining, setIsJoining] = useState(false);
  // Keyed on the game, not a boolean. A boolean plus a 15s poll meant the poll
  // re-set the game while `dismissed` was still true and the dismissed branch
  // returned null — the whole strip disappeared 15 seconds after the tap.
  const [dismissedGameCode, setDismissedGameCode] = useState<string | null>(null);

  const handleJoinGame = () => {
    // A room code is the whole point of this button. Without one the push lands
    // on the bare multiplayer hub — "No battles in progress" — which reads as
    // the app losing the game the student was just invited to. Do nothing
    // visible rather than navigate somewhere wrong.
    if (!activeGame?.gameCode || !socket) return;

    setIsJoining(true);

    // Emit join event
    socket.emit('joinClassroomGame', {
      gameCode: activeGame.gameCode,
      userId,
      username,
    });

    // Navigate to game
    // `room`, not `code` — see PlayWithClassButton. Nothing reads `?code=`.
    router.push(`/${language}/multiplayer?room=${activeGame.gameCode}&classroom=true`);
  };

  const handleDismiss = () => {
    if (activeGame) setDismissedGameCode(activeGame.gameCode);
  };

  // Dismissing hides THIS game's call to action and nothing more. The student
  // still sees that the class is being watched, and a new game clears it by
  // simply having a different code.
  const isDismissed = !!activeGame && activeGame.gameCode === dismissedGameCode;

  // Always show the "listening" indicator even when no game is active
  // F-18/F-19: friendlier idle copy + pulsing radar animation so the empty
  // state still feels alive instead of looking broken.
  // A game with no room code is not joinable, so it must not be advertised as
  // one — showing the JOIN call to action and then doing nothing on tap is the
  // same dead end, one step later.
  if (!activeGame?.gameCode || isDismissed) {
    return (
      <m.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className={cn(
          'relative flex items-center gap-3 px-4 py-3 rounded-neo border-2 border-black shadow-hard-sm overflow-hidden',
          isConnected ? 'bg-neo-cyan/20' : 'bg-neo-lime/20'
        )}
      >
        {/* Radar pulse ring */}
        <span className="relative flex w-8 h-8 shrink-0 items-center justify-center">
          {isConnected && (
            <span className="absolute inset-0 rounded-full bg-neo-cyan/40 animate-ping" />
          )}
          <span
            className={cn(
              'relative flex w-8 h-8 items-center justify-center rounded-full border-2 border-black shadow-hard-sm',
              isConnected ? 'bg-neo-cyan' : 'bg-neo-lime'
            )}
          >
            <Radio className="w-4 h-4 text-black" aria-hidden="true" />
          </span>
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-neo-display font-black text-black uppercase tracking-wide">
            {isConnected
              ? t('student.activeGame.listening')
              : t('student.activeGame.connecting')}
          </span>
          <span className="text-xs font-neo-body text-black/60">
            {t('student.activeGame.idleHint')}
          </span>
        </div>
        {/* Decorative only: the strip already says everything in text. */}
        <Image
          src="/images/education/waiting-for-teacher.webp"
          alt=""
          aria-hidden="true"
          width={112}
          height={63}
          className="pointer-events-none absolute end-2 bottom-0 h-full w-auto opacity-70 select-none"
        />
      </m.div>
    );
  }

  return (
    <AnimatePresence>
      <m.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative rounded-neo border-3 border-black shadow-hard overflow-hidden"
      >
        {/* Vivid top bar */}
        <div className="relative bg-neo-cyan px-6 pt-5 pb-4 overflow-hidden">
          {/* Decorative only — never carries meaning the text does not already carry. */}
          <Image
            src="/images/education/class-live.webp"
            alt=""
            aria-hidden="true"
            width={200}
            height={112}
            priority={false}
            className="pointer-events-none absolute end-0 -top-2 h-[140%] w-auto opacity-25 select-none"
          />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-neo bg-black border-2 border-black flex items-center justify-center shadow-hard-sm">
                <Play className="w-5 h-5 text-neo-cyan animate-pulse" />
              </div>
              <h3 className="text-xl font-neo-display font-black text-black">
                {t('student.activeGame.title')}
              </h3>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-neo border-2 border-black bg-white/40 hover:bg-white/60 shadow-hard-sm text-black transition-all"
              aria-label={t('common.close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dark body */}
        <div className="bg-neo-navy-light px-6 py-4">
          <p className="text-neo-white font-neo-body font-bold mb-3">
            {t('student.activeGame.teacherStarted', { teacher: activeGame.teacherName })}
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            {activeGame.lessonNames.map((name, idx) => (
              <span
                key={`lesson-${idx}-${name}`}
                className="px-3 py-1 text-sm font-black bg-neo-pink border-2 border-black text-black rounded-neo shadow-hard-sm"
              >
                {name}
              </span>
            ))}
          </div>

          {/* Dark body: this line was `text-black/60` and effectively invisible.
              It now matches the sibling paragraph above it. */}
          {activeGame.playerCount && activeGame.playerCount > 0 && (
            <div className="flex items-center gap-2 text-neo-white/80 text-sm font-bold mb-4">
              <Users className="w-4 h-4" />
              <span>{activeGame.playerCount} {t('multiplayer.playersJoined')}</span>
            </div>
          )}

          {/* Join Button */}
          <button
            type="button"
            onClick={handleJoinGame}
            disabled={isJoining}
            className={cn(
              'w-full px-6 py-4 font-black text-lg rounded-neo',
              'bg-neo-lime text-black',
              'border-3 border-black shadow-hard',
              'hover:shadow-hard-lg hover:-translate-y-0.5',
              'active:shadow-hard-sm active:translate-y-0.5',
              'transition-all duration-150',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isJoining ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                {t('student.activeGame.joining')}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Play className="w-6 h-6" />
                {t('student.activeGame.joinNow')}
              </span>
            )}
          </button>
        </div>
      </m.div>
    </AnimatePresence>
  );
}
