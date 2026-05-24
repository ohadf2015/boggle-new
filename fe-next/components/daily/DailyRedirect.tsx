'use client';

import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { DailyChallengeLanding } from './DailyChallengeLanding';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Language } from '@/types';

/**
 * DailyRedirect - Shows the Daily Challenge Landing with both Word Hunt and Word Wheel quests.
 * The /daily route shows the landing. Share links with OG params still work via metadata.
 */
export default function DailyRedirect() {
  const { language } = useLanguage();
  const router = useRouter();

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
