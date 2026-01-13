'use client';

import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { DailyChallengeLanding } from './DailyChallengeLanding';
import DailyChallenge from './DailyChallenge';
import BuzzChallenge from '../buzz/BuzzChallenge';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Language } from '@/types';

type ChallengeMode = 'landing' | 'wordHunt' | 'buzz';

/**
 * DailyChallengeRouter - Routes between dual daily challenges
 * Landing → Word Hunt Survival OR Daily Buzz
 */
export default function DailyChallengeRouter() {
  const { language } = useLanguage();
  const [mode, setMode] = useState<ChallengeMode>('landing');

  const handleSelectWordHunt = () => {
    setMode('wordHunt');
  };

  const handleSelectBuzz = () => {
    setMode('buzz');
  };

  const handleBackToLanding = () => {
    setMode('landing');
  };

  return (
    <div className="min-h-screen flex flex-col bg-neo-navy">
      <AnimatePresence mode="wait">
        {mode === 'landing' && (
          <DailyChallengeLanding
            key="landing"
            onSelectWordHunt={handleSelectWordHunt}
            onSelectBuzz={handleSelectBuzz}
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
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
