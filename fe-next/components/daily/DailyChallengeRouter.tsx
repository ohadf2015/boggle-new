'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { DailyChallengeLanding } from './DailyChallengeLanding';
import BuzzHistoryList from '../buzz/BuzzHistoryList';
import Header from '../Header';
import { PageLoader } from '@/components/ui/PageLoader';
import { useLanguage } from '@/contexts/LanguageContext';
import { getWordHuntStatusToday } from '@/utils/dailyChallenge/storage';
import type { Language } from '@/types';

type RouterState = 'loading' | 'landing' | 'redirecting';

/**
 * DailyChallengeRouter - Smart landing page for daily challenges.
 * Auto-redirects to word hunt if user hasn't played today;
 * shows landing with results + Buzz if already played.
 */
export default function DailyChallengeRouter() {
  const { language, t } = useLanguage();
  const router = useRouter();
  const [showBuzzHistory, setShowBuzzHistory] = useState(false);
  const [routerState, setRouterState] = useState<RouterState>('loading');

  useEffect(() => {
    const status = getWordHuntStatusToday(language as Language);
    if (status === null) {
      // Not played today — redirect to word hunt
      setRouterState('redirecting');
      router.replace(`/${language}/daily/word-hunt`);
    } else {
      // Already played — show landing with results
      setRouterState('landing');
    }
  }, [language, router]);

  if (routerState === 'loading' || routerState === 'redirecting') {
    return (
      <div className="flex-1 flex flex-col bg-neo-navy">
        <PageLoader size="lg" text={t('daily.loading')} />
      </div>
    );
  }

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
    <div className="flex-1 flex flex-col bg-neo-navy">
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
