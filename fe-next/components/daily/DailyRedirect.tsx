'use client';

import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { DailyChallengeLanding } from './DailyChallengeLanding';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDailyRivalChallenge } from '@/hooks/useDailyRivalChallenge';
import type { Language } from '@/types';

/**
 * DailyRedirect - The /daily hub. Renders the quest-selection landing for
 * EVERY player — no auto-redirect into a quest.
 *
 * History: a once-per-session auto-skip used to bounce returning players
 * straight into Word Hunt. Ohad (2026-07-29): "when the user already played
 * daily challenge I didn't mean it should redirect to the word hunt page
 * immediately, but to the main daily challenge page where the player can
 * choose a challenge and enter immediately." The hub's quest cards already
 * deep-link into each game with one tap, so the hub IS the fast path.
 *
 * Rival-challenge URL params (whName/whScore/whEmoji) are still captured so
 * the share-banner flow works from the hub.
 */
export default function DailyRedirect() {
  const { language } = useLanguage();
  const router = useRouter();

  // Capture rival challenge from URL if present
  useDailyRivalChallenge();

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
