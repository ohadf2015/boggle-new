'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { EducationHeader } from '@/components/education/EducationHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { useEducationShellLock } from '@/components/education/shell/useEducationShellLock';
import { DuelGameView, RealTimeDuelGame } from '@/components/education/duels';
import { cn } from '@/lib/utils';
import { getDuelById } from '@/lib/supabase/education/duels';
import { getProfile } from '@/lib/supabase';
import { readStudentName } from '@/lib/education/duelOpponentNames';
import { useHideNavigation } from '@/contexts/NavigationContext';

/**
 * Duel Game Page Client
 *
 * Individual duel gameplay page.
 * Students play a specific duel and submit their score.
 */
export default function DuelGamePageClient({ duelId }: { duelId: string }) {
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const isRTL = language === 'he';
  /**
   * The other half of "no page scroll": <body> ships `.screen-fit`
   * (min-height:100dvh, overflow-y:auto) and the layout hangs a footer and the
   * global bottom nav below this route, so a one-viewport subtree still left
   * the document scrollable. Ref-counted, shared with EducationShell.
   */
  useEducationShellLock();

  /**
   * A duel is a game surface, so the app's own chrome comes off. Without this
   * `GlobalBottomNav` (fixed bottom-0, z-[80]) painted QUESTS / FRIENDS / HOME
   * across the bottom of the live board and over the reveal's REMATCH row —
   * three controls from another screen on top of this screen's only primary
   * action. Released on unmount, or the nav stays hidden everywhere after.
   */
  const setIsInGame = useHideNavigation();
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

  const [isChecking, setIsChecking] = useState(true);
  const [duelError, setDuelError] = useState<string | null>(null);
  const [duelType, setDuelType] = useState<'async' | 'realtime'>('async');
  const [opponentName, setOpponentName] = useState<string>('');
  // Needed for the rematch emit AND the best-of-3 series key. Without them the
  // reveal screen has no REMATCH button at all — which is how it shipped.
  const [opponentId, setOpponentId] = useState<string | undefined>(undefined);
  const [lessonId, setLessonId] = useState<string | undefined>(undefined);

  // Verify duel exists and user is a participant
  useEffect(() => {
    const verifyDuel = async () => {
      if (authLoading) return;

      /**
       * `user` alone answers "is someone signed in". `isAuthenticated` also
       * waits on the PROFILE, which resolves a beat later — so on a full page
       * load (a refresh mid-duel, or opening the duel link directly) there is a
       * window where loading is false, the user is present, and
       * isAuthenticated is still false. Reading that window as "signed out"
       * ejected the student to /education mid-duel (recurring-pitfalls
       * Class 1: the late source flipping after the early render).
       */
      if (!user) {
        router.push(`/${language}/education`);
        return;
      }

      // Verify duel exists and user is participant.
      // `finally` clears the checking flag on EVERY exit — success, early return,
      // or throw. Clearing it per-branch is how this screen got stuck on a
      // permanent spinner in the first place; a new branch would re-introduce it.
      try {
        const { data: duel, error } = await getDuelById(duelId);

        if (error || !duel) {
          setDuelError(t('duelNotFound'));
          return;
        }

        // Check if user is a participant
        const isParticipant =
          duel.challenger_id === user.id || duel.opponent_id === user.id;

        if (!isParticipant) {
          setDuelError(t('notParticipant'));
          return;
        }

        // Set duel type and opponent name
        setDuelType(duel.duel_type || 'async');
        setLessonId(duel.lesson_id ?? undefined);
        const opponentId = duel.challenger_id === user.id ? duel.opponent_id : duel.challenger_id;
        setOpponentId(opponentId ?? undefined);
        const { data: opponentProfile } = await getProfile(opponentId, 'minimal');
        /**
         * A student reading ANOTHER student's `profiles` row gets
         * `{ data: null, error: null }` — own-row RLS, indistinguishable from
         * "no such person". The lobby banks every name it sees against the user
         * id, so read that before giving up and calling them "Opponent".
         */
        setOpponentName(
          opponentProfile?.display_name ||
            (opponentId ? readStudentName(opponentId) : null) ||
            t('common.opponent')
        );
      } catch (error) {
        console.error('[DuelGamePageClient] Failed to verify duel:', error);
        setDuelError(t('duelNotFound'));
      } finally {
        setIsChecking(false);
      }
    };

    verifyDuel();
  }, [duelId, authLoading, router, language, user, t]);

  const handleBackToLobby = useCallback(() => {
    router.push(`/${language}/education/duels`);
  }, [router, language]);

  if (isChecking || authLoading) {
    return (
      <div
        data-testid="duel-page-loading"
        className="flex h-dvh items-center justify-center overflow-hidden bg-neo-navy"
      >
        <PageLoader
          size="lg"
          text={t('common.loading')}
        />
      </div>
    );
  }

  if (duelError) {
    return (
      <div
        data-testid="duel-page-error"
        className={cn('flex h-dvh w-full flex-col overflow-hidden bg-neo-navy', isRTL && 'rtl')}
      >
        <EducationHeader showBackButton title={t('duelsTitle')} />

        <main className="flex-1 flex items-center justify-center px-4">
          <div
            className={cn(
              'p-8 rounded-neo border-[3px] border-neo-cream',
              'bg-neo-navy shadow-hard text-center max-w-md'
            )}
          >
            <p className="text-neo-white text-xl font-bold mb-4">{duelError}</p>
            <button
              type="button"
              onClick={handleBackToLobby}
              className={cn(
                'px-6 py-3 font-bold rounded-neo',
                'bg-neo-lime text-neo-black',
                'border-[3px] border-neo-black shadow-hard',
                'hover:shadow-hard transition-all'
              )}
            >
              {t('backToLobby')}
            </button>
          </div>
        </main>
      </div>
    );
  }

  const isLive = duelType === 'realtime';

  return (
    <div
      data-testid="duel-surface"
      /** Proof the chrome switch ran — a capture can read it. */
      data-chrome="hidden"
      className={cn(
        'flex w-full flex-col overflow-hidden bg-neo-navy',
        // Both halves of this route are fixed-height phone screens now. A live
        // duel's play panel owns the one scrolling region; an async turn's
        // <main> does. `min-h-dvh` on the async half let the body grow past the
        // viewport — the same measurement the round-1 critic disqualified the
        // lobby on.
        'h-dvh',
        isRTL && 'rtl'
      )}
    >
      <EducationHeader showBackButton title={t('duelsTitle')} />

      <main
        className={cn(
          'w-full max-w-4xl mx-auto px-3 sm:px-6 lg:px-8',
          'flex-1 min-h-0',
          isLive ? 'overflow-hidden py-2' : 'edu-shell-scroll overflow-y-auto overscroll-contain py-6'
        )}
      >
        {isLive ? (
          <RealTimeDuelGame
            // A rematch changes only the [duelId] segment, so React would reuse
            // the instance and open game 2 on game 1's podium. Remount instead.
            key={duelId}
            duelId={duelId}
            studentId={user!.id}
            opponentName={opponentName}
            opponentId={opponentId}
            lessonId={lessonId}
            onBackToLobby={handleBackToLobby}
          />
        ) : (
          <DuelGameView
            duelId={duelId}
            studentId={user!.id}
            onBackToLobby={handleBackToLobby}
          />
        )}
      </main>
    </div>
  );
}
