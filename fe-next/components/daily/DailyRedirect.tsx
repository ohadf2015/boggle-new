'use client';

import { Suspense, useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { DailyChallengeLanding } from './DailyChallengeLanding';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDailyRivalChallenge } from '@/hooks/useDailyRivalChallenge';
import { DailyLoadingFallback } from './DailyLoadingFallback';
import {
  hasEverPlayedWordHunt,
  hasEverPlayedWordWheel,
  hasPlayedWordWheelToday,
} from '@/utils/dailyChallenge/storage';
import type { Language } from '@/types';

const AUTO_WHEEL_SESSION_KEY = 'lexiclash_daily_auto_wheel';

// Once per session: the wheel's exit goes back to /daily, which must then show the hub.
function wantsAutoWheel(language: Language): boolean {
  if (new URLSearchParams(window.location.search).has('whName')) return false;
  if (!hasEverPlayedWordHunt(language) && !hasEverPlayedWordWheel(language)) return false;
  if (hasPlayedWordWheelToday(language)) return false;
  try {
    return !sessionStorage.getItem(AUTO_WHEEL_SESSION_KEY);
  } catch {
    return false;
  }
}

const noopSubscribe = () => () => {};

/**
 * Isolated so useSearchParams (inside useDailyRivalChallenge) cannot suspend
 * the hub. Nested fallback is empty — never PageLoader — or Next SSRs
 * "Loading Daily Challenge..." and throws React #419.
 */
function DailyRivalChallengeCapture() {
  useDailyRivalChallenge();
  return null;
}

/** The /daily hub. Returning players skip it once per session and land in today's Word Wheel. */
export default function DailyRedirect() {
  const { language } = useLanguage();
  const router = useRouter();
  // False only while hydrating, so client navigations decide before the hub ever mounts.
  const canReadStorage = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [autoWheel, setAutoWheel] = useState(() => canReadStorage && wantsAutoWheel(language as Language));

  useEffect(() => {
    if (!wantsAutoWheel(language as Language)) return;
    try {
      sessionStorage.setItem(AUTO_WHEEL_SESSION_KEY, '1');
    } catch {
      setAutoWheel(false);
      return;
    }
    setAutoWheel(true);
    const url = `/${language}/daily/word-wheel?start=1`;
    try {
      router.replace(url);
    } catch {
      // On a cold load this can run before Next has initialized the app router.
      window.location.replace(url);
    }
  }, [language, router]);

  if (autoWheel) return <DailyLoadingFallback mode="wordWheel" />;

  return (
    <div className="flex-1 flex flex-col bg-neo-navy min-h-screen page-content-safe">
      <Header />
      <DailyChallengeLanding
        onSelectWordHunt={() => router.push(`/${language}/daily/word-hunt`)}
        onSelectWordWheel={() => router.push(`/${language}/daily/word-wheel`)}
        currentLanguage={language as Language}
      />
      <Suspense fallback={null}>
        <DailyRivalChallengeCapture />
      </Suspense>
    </div>
  );
}
