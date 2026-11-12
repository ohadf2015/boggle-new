'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStudentClassroom } from '@/hooks/useStudentClassroom';
import { useActiveClassroomGame } from '@/hooks/useActiveClassroomGame';
import { resolveStudentDisplayName } from '@/lib/education/studentDisplayName';
import { safeCapture } from '@/lib/education/telemetryCore';
import { EDU_EVENTS } from '@/lib/analytics/eduEvents';
import { useClassroomGameJoin } from './useClassroomGameJoin';
import { autoJoinableCode } from './useClassroomAutoJoin';

interface LiveProps {
  classroomId: string;
  userId: string;
  username: string;
}

/** Opens the class socket only for a student who has a class. */
function LiveBanner({ classroomId, userId, username }: LiveProps) {
  const { t } = useLanguage();
  const { activeGame, socket } = useActiveClassroomGame(classroomId);
  const { join, isJoining, joinError } = useClassroomGameJoin({ activeGame, socket, userId, username });
  const [dismissed, setDismissed] = useState<string | null>(null);
  const code = autoJoinableCode(activeGame);
  const visible = !!code && dismissed !== code;

  const shownFor = useRef<string | null>(null);
  useEffect(() => {
    if (!visible || !code || shownFor.current === code) return;
    shownFor.current = code;
    safeCapture(EDU_EVENTS.studentLiveBannerShown, { classroom_id: classroomId, game_code: code, surface: 'quick_play' });
  }, [visible, code, classroomId]);

  if (!visible) return null;

  const onJoin = () => {
    safeCapture(EDU_EVENTS.studentLiveBannerJoin, { classroom_id: classroomId, game_code: code, surface: 'quick_play' });
    join();
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div
        role="status"
        aria-live="polite"
        data-testid="class-live-banner"
        className="pointer-events-auto flex w-full max-w-md flex-col gap-2 rounded-neo border-3 border-neo-black bg-neo-lime p-3 text-neo-navy shadow-hard"
      >
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="size-3 shrink-0 rounded-full border-2 border-neo-black bg-neo-pink motion-safe:animate-pulse" />
          <span className="min-w-0 flex-1 font-neo-display text-base font-black uppercase leading-tight [overflow-wrap:anywhere]">
            {t('academy.student.liveNow')}
            {activeGame?.classroomName ? ` · ${activeGame.classroomName}` : ''}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            data-testid="class-live-banner-join"
            onClick={onJoin}
            disabled={isJoining}
            className="min-h-12 flex-1 rounded-neo border-3 border-neo-black bg-neo-navy px-3 font-neo-display text-base font-black uppercase text-neo-lime shadow-hard-sm focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-cyan disabled:opacity-70"
          >
            {t('academy.student.ctaLive')}
          </button>
          <button
            type="button"
            data-testid="class-live-banner-stay"
            onClick={() => setDismissed(code)}
            className="min-h-12 shrink-0 rounded-neo border-3 border-neo-black bg-neo-cream px-3 font-neo-display text-sm font-black uppercase text-neo-navy focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-cyan"
          >
            {t('academy.student.autoJoin.stay')}
          </button>
        </div>
        {joinError && (
          <p role="alert" className="font-neo-body text-sm font-bold">
            {joinError}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * A student who left the class page for solo play still hears when the teacher
 * opens the class game. Nov 9: a Hebrew class joined, tapped Solo within
 * seconds, and stayed in quick play for 15+ minutes, where nothing listened for
 * the class game. One tap joins (the same acked join as the class page); no
 * automatic pull out of a round the student is playing.
 */
export function ClassLiveGameBanner() {
  const { user, profile } = useAuth();
  const { classroomId } = useStudentClassroom();
  const { t } = useLanguage();
  if (!user?.id || !classroomId) return null;
  const username = resolveStudentDisplayName(profile, user, t('student.dashboard.defaultName'));
  return <LiveBanner classroomId={classroomId} userId={user.id} username={username} />;
}

export default ClassLiveGameBanner;
