'use client';

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { DailyChallengeLanding } from './DailyChallengeLanding';
import DailyChallenge from './DailyChallenge';
import BuzzChallenge from '../buzz/BuzzChallenge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Language } from '@/types';

type ChallengeMode = 'landing' | 'wordHunt' | 'buzz';

/**
 * DailyChallengeRouter - Routes between dual daily challenges
 * Admin users: Landing → Word Hunt Survival OR Daily Buzz
 * Non-admin users: Go directly to Word Hunt (skip landing)
 */
export default function DailyChallengeRouter() {
  const { language } = useLanguage();
  const { isAdmin } = useAuth();

  // Non-admin users skip the landing page and go directly to Word Hunt
  const [mode, setMode] = useState<ChallengeMode>(isAdmin ? 'landing' : 'wordHunt');

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
