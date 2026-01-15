'use client';

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { DailyChallengeLanding } from './DailyChallengeLanding';
import DailyChallenge from './DailyChallenge';
import BuzzChallenge from '../buzz/BuzzChallenge';
import BuzzHistoryList from '../buzz/BuzzHistoryList';
import Header from '../Header';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Language } from '@/types';

type ChallengeMode = 'landing' | 'wordHunt' | 'buzz';

/**
 * DailyChallengeRouter - Routes between dual daily challenges
 * All users: Landing page → Choose Word Hunt Survival OR Daily Buzz
 * Supports playing past buzz challenges via date selection
 */
export default function DailyChallengeRouter() {
  const { language } = useLanguage();

  // All users start at the landing page to choose their challenge
  const [mode, setMode] = useState<ChallengeMode>('landing');
  const [showBuzzHistory, setShowBuzzHistory] = useState(false);
  const [selectedBuzzDate, setSelectedBuzzDate] = useState<string | undefined>(undefined);

  const handleSelectWordHunt = () => {
    setMode('wordHunt');
  };

  const handleSelectBuzz = () => {
    setSelectedBuzzDate(undefined); // Today's challenge
    setMode('buzz');
  };

  const handleShowBuzzHistory = () => {
    setShowBuzzHistory(true);
  };

  const handleSelectPastBuzz = (date: string) => {
    setSelectedBuzzDate(date);
    setShowBuzzHistory(false);
    setMode('buzz');
  };

  const handleBackToLanding = () => {
    setMode('landing');
    setSelectedBuzzDate(undefined);
  };

  return (
    <div className="min-h-screen flex flex-col bg-neo-navy">
      {/* Show Header on landing page */}
      {mode === 'landing' && <Header />}

      <AnimatePresence mode="wait">
        {mode === 'landing' && (
          <DailyChallengeLanding
            key="landing"
            onSelectWordHunt={handleSelectWordHunt}
            onSelectBuzz={handleSelectBuzz}
            onShowBuzzHistory={handleShowBuzzHistory}
            currentLanguage={language as Language}
          />
        )}

        {mode === 'wordHunt' && (
          <div key="wordHunt" className="flex-1">
            <DailyChallenge />
          </div>
        )}

        {mode === 'buzz' && (
          <div key="buzz" className="flex-1">
            <BuzzChallenge
              language={language as Language}
              onBack={handleBackToLanding}
              date={selectedBuzzDate}
            />
          </div>
        )}
      </AnimatePresence>

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
