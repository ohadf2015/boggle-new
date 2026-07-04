'use client';

import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { DailyChallengeLanding } from './DailyChallengeLanding';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDailyRivalChallenge } from '@/hooks/useDailyRivalChallenge';
import type { Language } from '@/types';

/**
 * DailyRedirect - Shows the Daily Challenge Landing with both Word Hunt and Word Wheel quests.
 * The /daily route shows the landing. Share links with OG params still work via metadata.
 * Also captures rival challenge params from URL share links.
 */
export default function DailyRedirect() {
  const { language } = useLanguage();
  const router = useRouter();

  // Capture rival challenge from URL if present
  useDailyRivalChallenge();

  const handleSelectWordHunt = () => {
    router.push(`/${language}/daily/word-hunt`);
  };

  const handleSelectWordWheel = () => {
    router.push(`/${language}/daily/word-wheel`);
  };

  return (
    <div className="flex-1 flex flex-col bg-neo-navy min-h-screen page-content-safe">
      <Header />
      <DailyChallengeLanding
        onSelectWordHunt={handleSelectWordHunt}
        onSelectWordWheel={handleSelectWordWheel}
        currentLanguage={language as Language}
      />
    </div>
  );
}
