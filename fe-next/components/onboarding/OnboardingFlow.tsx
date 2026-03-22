'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { markOnboardingComplete } from '@/utils/onboardingStorage';
import { setStoredCustomAvatar } from '@/utils/profileStorage';
import { type CustomAvatarConfig } from '@/shared/types/customAvatar';
import TutorialGame from './TutorialGame';
import QuickProfileSetup from './QuickProfileSetup';
import ScoreReveal from './ScoreReveal';
import ModeFork from './ModeFork';

type FlowStep = 'tutorial' | 'profile' | 'scoreReveal' | 'fork';

interface OnboardingFlowProps {
  onComplete: () => void;
}

/** Default average score shown to new players */
const DEFAULT_AVERAGE_SCORE = 62;

/**
 * OnboardingFlow - Orchestrates the full FTUE.
 * State machine: tutorial -> profile -> scoreReveal -> fork.
 * Full-screen, no Header/Footer visible.
 */
const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const { language, dir } = useLanguage();
  const router = useRouter();

  const [step, setStep] = useState<FlowStep>('tutorial');
  const [tutorialScore, setTutorialScore] = useState(0);
  const [tutorialWords, setTutorialWords] = useState<string[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [playerAvatar, setPlayerAvatar] = useState<CustomAvatarConfig | null>(null);

  // Step 1: Tutorial complete
  const handleTutorialComplete = useCallback(
    (score: number, wordsFound: string[]) => {
      setTutorialScore(score);
      setTutorialWords(wordsFound);
      setStep('profile');
    },
    []
  );

  // Step 2: Profile complete
  const handleProfileComplete = useCallback(
    (name: string, avatar: CustomAvatarConfig) => {
      setPlayerName(name);
      setPlayerAvatar(avatar);
      setStoredCustomAvatar(avatar);
      setStep('scoreReveal');
    },
    []
  );

  // Step 2 alt: Profile skipped
  const handleProfileSkip = useCallback(() => {
    setStep('scoreReveal');
  }, []);

  // Step 3: Try again (restart tutorial)
  const handleTryAgain = useCallback(() => {
    setStep('tutorial');
  }, []);

  // Step 3: Continue to fork
  const handleContinue = useCallback(() => {
    setStep('fork');
  }, []);

  // Step 4: Mode selected — complete the onboarding
  const handleModeSelect = useCallback(
    (mode: 'daily' | 'practice') => {
      markOnboardingComplete({
        avatarId: 'custom',
        displayName: playerName || 'Player',
        selectedMode: mode === 'daily' ? 'daily' : 'single',
      });

      const route =
        mode === 'daily'
          ? `/${language}/daily`
          : `/${language}/singleplayer?autoStart=practice`;

      router.push(route);
      onComplete();
    },
    [language, router, onComplete, playerName]
  );

  const renderStep = () => {
    switch (step) {
      case 'tutorial':
        return <TutorialGame onComplete={handleTutorialComplete} />;
      case 'profile':
        return (
          <QuickProfileSetup
            onComplete={handleProfileComplete}
            onSkip={handleProfileSkip}
          />
        );
      case 'scoreReveal':
        return (
          <ScoreReveal
            score={tutorialScore}
            averageScore={DEFAULT_AVERAGE_SCORE}
            onTryAgain={handleTryAgain}
            onContinue={handleContinue}
          />
        );
      case 'fork':
        return <ModeFork onSelectMode={handleModeSelect} />;
      default:
        return null;
    }
  };

  return (
    <div
      data-testid="onboarding-flow"
      className="fixed inset-0 z-[100] bg-neo-navy flex items-center justify-center overflow-y-auto"
      dir={dir}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="w-full px-4"
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default OnboardingFlow;
