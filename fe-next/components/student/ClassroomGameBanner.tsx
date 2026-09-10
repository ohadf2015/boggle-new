'use client';

import { useEffect, useRef, useState } from 'react';
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
  const [joinError, setJoinError] = useState<string | null>(null);
  /** Torn down when a join settles, so listeners never stack up on the socket. */
  const cleanupJoinRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanupJoinRef.current?.(), []);

  /** Long enough for a slow phone on school wifi, short enough to not be a hang. */
  const JOIN_TIMEOUT_MS = 12_000;

  const handleJoinGame = () => {
    // A room code is the whole point of this button. Without one the push lands
    // on the bare multiplayer hub — "No battles in progress" — which reads as
    // the app losing the game the student was just invited to. Do nothing
    // visible rather than navigate somewhere wrong.
    if (!activeGame?.gameCode || !socket) return;

    const gameCode = activeGame.gameCode;
    setJoinError(null);
    setIsJoining(true);

    // Navigating in the same tick as the emit is what produced the dead end the
    // critic saw: the server's rejection ('Game not found' for a room that has
    // since ended, 'You are not a member of this classroom', a server-side
    // lookup failure) could only ever land AFTER the student had been pushed
    // away, so it rendered nowhere and the hub's "No battles in progress" was
    // the only thing they were told (recurring pitfall class 4). Wait for the
    // answer, and treat silence as a failure too.
    const settle = () => {
      clearTimeout(timer);
      socket.off('joinedClassroomGame', onJoined);
      socket.off('classroomGameError', onError);
      cleanupJoinRef.current = null;
    };

    const onJoined = (data: { gameCode?: string }) => {
      // A shared socket can carry another game's ack; only ours releases us.
      if (data?.gameCode && data.gameCode !== gameCode) return;
      settle();
      setIsJoining(false);
      // `room`, not `code` — see PlayWithClassButton. Nothing reads `?code=`.
      router.push(`/${language}/multiplayer?room=${gameCode}&classroom=true`);
    };

    const onError = (data: { gameCode?: string }) => {
      // Only a rejection of THIS join. `classroomGameError` is a shared channel:
      // `useActiveClassroomGame`'s 15-second poll emits it too (a Supabase
      // hiccup gives LOOKUP_UNAVAILABLE), and one of those landing inside the
      // join window would otherwise tear down both listeners and tell a student
      // their perfectly good join had failed. The join handler now names the
      // game on every rejection it sends, so the match is the filter; anything
      // unnamed is somebody else's problem and the timeout still covers us.
      if (data?.gameCode !== gameCode) return;
      settle();
      setIsJoining(false);
      // Our own copy, not the server's raw English: the student needs to know
      // what to do next, and the specific reason is for our logs.
      setJoinError(t('student.activeGame.joinFailed'));
    };

    const timer = setTimeout(() => {
      settle();
      setIsJoining(false);
      setJoinError(t('student.activeGame.joinFailed'));
    }, JOIN_TIMEOUT_MS);

    socket.on('joinedClassroomGame', onJoined);
    socket.on('classroomGameError', onError);
    cleanupJoinRef.current = settle;

    socket.emit('joinClassroomGame', { gameCode, userId, username });
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

          {/* Classroom FIRST, lesson second.
              Reusing one vocabulary list across every period is the intended
              teacher workflow, so the lesson name cannot identify the class —
              a Flow Check student really can be shown a game built from ELA
              Period 3's "Week 3 Vocabulary". Naming the classroom is what makes
              that legible instead of alarming. The name rides on the payload
              (resolved server-side), so it cannot disagree with the game it
              labels; with no name we fall back to the lesson chips alone rather
              than rendering a label with a hole in it. */}
          <div className="flex flex-wrap gap-2 mb-4">
            {activeGame.classroomName ? (
              <span className="px-3 py-1 text-sm font-black bg-neo-pink border-2 border-black text-black rounded-neo shadow-hard-sm">
                {t('education.classroomGame.classroomLessonLabel', {
                  classroom: activeGame.classroomName,
                  lesson: activeGame.lessonNames.join(', '),
                })}
              </span>
            ) : (
              activeGame.lessonNames.map((name, idx) => (
                <span
                  key={`lesson-${idx}-${name}`}
                  className="px-3 py-1 text-sm font-black bg-neo-pink border-2 border-black text-black rounded-neo shadow-hard-sm"
                >
                  {name}
                </span>
              ))
            )}
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
                {activeGame.teacherName
                  ? t('student.activeGame.joinTeachersGame', { teacher: activeGame.teacherName })
                  : t('student.activeGame.joinNow')}
              </span>
            )}
          </button>

          {/* The join failed, and saying so is the entire fix. Silence here is
              what sent students to a hub that told them nothing. */}
          {joinError && (
            <p
              role="alert"
              className="mt-3 text-sm font-neo-body font-bold text-neo-white bg-neo-pink/30 border-2 border-black rounded-neo px-3 py-2"
            >
              {joinError}
            </p>
          )}
        </div>
      </m.div>
    </AnimatePresence>
  );
}
