'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { PageLoader } from '@/components/ui/PageLoader';
import { DailyChallengeLanding } from './DailyChallengeLanding';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDailyRivalChallenge } from '@/hooks/useDailyRivalChallenge';
import { useDailyChallengeStatus } from '@/hooks/useDailyChallengeStatus';
import { getAllDailyResults, hasPlayedWordWheelToday } from '@/utils/dailyChallenge/storage';
import { resolveDailyLandingTarget } from '@/utils/dailyChallenge/landingRedirect';
import type { Language } from '@/types';

const SESSION_SKIP_KEY = 'lc_daily_hub_skipped';

/**
 * DailyRedirect - The /daily hub with a smart bypass for returning players.
 *
 * First-timers, share/QR arrivals, and players who finished today's quests see
 * the full selection hub (both quests + leaderboard + SEO copy from the layout).
 * A RETURNING player is auto-advanced straight into their next unplayed quest so
 * they "just start the challenge" instead of tapping through the hub — the copy
 * still ships in the SSR HTML (layout) for crawlers/AdSense, but a human with JS
 * skips it.
 *
 * The skip fires at most once per session (sessionStorage), so a returner can
 * still reach the hub afterwards to view the leaderboard or pick the other quest.
 * Decision is gated on a loader until status resolves (Class-1 dual-source:
 * server streak + localStorage) — we never flash the hub and then yank it away.
 */
export default function DailyRedirect() {
  const { language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Capture rival challenge from URL if present
  useDailyRivalChallenge();

  const status = useDailyChallengeStatus(language as Language);

  const [showHub, setShowHub] = useState(false);
  const redirectingRef = useRef(false);

  const hasSharedRival = !!(
    searchParams?.get('whName') ||
    searchParams?.get('whScore') ||
    searchParams?.get('whEmoji')
  );
  const cameFromQr = searchParams?.get('from') === 'qr';

  useEffect(() => {
    if (status.loading || redirectingRef.current) return;

    let alreadySkipped = false;
    try {
      alreadySkipped = sessionStorage.getItem(SESSION_SKIP_KEY) === '1';
    } catch {
      /* storage disabled — treat as not-yet-skipped */
    }

    const wordWheelPlayed = hasPlayedWordWheelToday(language as Language);
    const isReturning =
      status.longestStreak > 0 ||
      status.currentStreak > 0 ||
      status.hasPlayed ||
      wordWheelPlayed ||
      getAllDailyResults(language as Language).length > 0;

    const target = resolveDailyLandingTarget({
      language: language as Language,
      isReturning,
      wordHuntPlayed: status.hasPlayed,
      wordWheelPlayed,
      hasSharedRival,
      cameFromQr,
      alreadySkippedThisSession: alreadySkipped,
    });

    if (target) {
      redirectingRef.current = true;
      try {
        sessionStorage.setItem(SESSION_SKIP_KEY, '1');
      } catch {
        /* storage disabled — skip flag best-effort, redirect still happens */
      }
      router.replace(target);
      return;
    }

    setShowHub(true);
  }, [
    status.loading,
    status.hasPlayed,
    status.currentStreak,
    status.longestStreak,
    language,
    hasSharedRival,
    cameFromQr,
    router,
  ]);

  if (!showHub) {
    return (
      <div className="flex-1 flex flex-col bg-neo-navy min-h-screen page-content-safe">
        <Header />
        <PageLoader size="lg" text="Loading Daily Challenge..." />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-neo-navy min-h-screen page-content-safe">
      <Header />
      <DailyChallengeLanding
        onSelectWordHunt={() => router.push(`/${language}/daily/word-hunt`)}
        onSelectWordWheel={() => router.push(`/${language}/daily/word-wheel`)}
        currentLanguage={language as Language}
      />
    </div>
  );
}
