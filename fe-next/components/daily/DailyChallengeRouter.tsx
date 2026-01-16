'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { DailyChallengeLanding } from './DailyChallengeLanding';
import BuzzHistoryList from '../buzz/BuzzHistoryList';
import Header from '../Header';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Language } from '@/types';

/**
 * DailyChallengeRouter - Landing page for daily challenges
 * Routes to dedicated pages for Word Hunt (/daily/word-hunt) or Daily Buzz (/daily/buzz)
 */
export default function DailyChallengeRouter() {
  const { language } = useLanguage();
  const router = useRouter();
  const [showBuzzHistory, setShowBuzzHistory] = useState(false);

  const handleSelectWordHunt = () => {
    router.push(`/${language}/daily/word-hunt`);
  };

  const handleSelectBuzz = () => {
    router.push(`/${language}/daily/buzz`);
  };

  const handleShowBuzzHistory = () => {
    setShowBuzzHistory(true);
  };

  const handleSelectPastBuzz = (date: string) => {
    setShowBuzzHistory(false);
    router.push(`/${language}/daily/buzz?date=${date}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-neo-navy">
      <Header />

      <DailyChallengeLanding
        onSelectWordHunt={handleSelectWordHunt}
        onSelectBuzz={handleSelectBuzz}
        onShowBuzzHistory={handleShowBuzzHistory}
        currentLanguage={language as Language}
      />

      {/* Buzz History Modal */}
      <AnimatePresence>
        {showBuzzHistory && (
          <BuzzHistoryList
            language={language as Language}
            onSelectDate={handleSelectPastBuzz}
            onClose={() => setShowBuzzHistory(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
