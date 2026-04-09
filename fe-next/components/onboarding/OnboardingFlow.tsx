'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { markOnboardingComplete, consumePendingRoomInvite, hasPendingRoomInvite } from '@/utils/onboardingStorage';
import { markGuidanceShown } from '@/utils/contextualGuidanceStorage';
import { setStoredCustomAvatar } from '@/utils/profileStorage';
import { type CustomAvatarConfig } from '@/shared/types/customAvatar';
import LanguageSelect from './LanguageSelect';
import TutorialGame from './TutorialGame';
import QuickProfileSetup from './QuickProfileSetup';
import ScoreReveal from './ScoreReveal';
import ModeFork from './ModeFork';
import OnboardingProgress from './OnboardingProgress';

type FlowStep = 'language' | 'tutorial' | 'profile' | 'scoreReveal' | 'fork';

const STEPS: FlowStep[] = ['language', 'tutorial', 'profile', 'scoreReveal', 'fork'];

/** Step-specific accent colors for the floating background shapes */
const STEP_ACCENTS: Record<FlowStep, { color1: string; color2: string }> = {
  language: { color1: 'rgba(191,255,0,0.07)', color2: 'rgba(0,255,255,0.05)' },
  tutorial: { color1: 'rgba(0,255,255,0.06)', color2: 'rgba(191,255,0,0.04)' },
  profile: { color1: 'rgba(255,20,147,0.06)', color2: 'rgba(191,255,0,0.04)' },
  scoreReveal: { color1: 'rgba(191,255,0,0.08)', color2: 'rgba(255,20,147,0.05)' },
  fork: { color1: 'rgba(139,92,246,0.06)', color2: 'rgba(0,255,255,0.05)' },
};

interface OnboardingFlowProps {
  onComplete: () => void;
}

/** Default average score shown to new players */
const DEFAULT_AVERAGE_SCORE = 62;

/**
 * OnboardingFlow - Orchestrates the full FTUE.
 * State machine: language -> tutorial -> profile -> scoreReveal -> fork.
 * Full-screen with floating geometric background and progress dots.
 */
const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const { language, dir, t } = useLanguage();
  const router = useRouter();

  const [step, setStep] = useState<FlowStep>('language');
  const [tutorialScore, setTutorialScore] = useState(0);
  const [, setTutorialWords] = useState<string[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [, setPlayerAvatar] = useState<CustomAvatarConfig | null>(null);
  // Gate re-entry + show overlay once we've committed to a route navigation.
  // Route transitions are outside React's lifecycle, so the modal would otherwise
  // sit silently while Next.js fetches the destination page.
  const [isNavigating, setIsNavigating] = useState(false);

  const stepIndex = useMemo(() => STEPS.indexOf(step), [step]);
  const accent = STEP_ACCENTS[step];

  // Step 1: Tutorial complete
  const handleTutorialComplete = useCallback(
    (score: number, wordsFound: string[]) => {
      setTutorialScore(score);
      setTutorialWords(wordsFound);
      markGuidanceShown('firstPlayTutorialCompleted');
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

      // If player arrived via room invite, skip scoreReveal + fork — go straight to the room
      if (hasPendingRoomInvite()) {
        markOnboardingComplete({
          avatarId: 'custom',
          displayName: name,
          selectedMode: 'multi',
        });
        const roomCode = consumePendingRoomInvite();
        setIsNavigating(true);
        router.push(`/${language}/multiplayer?room=${roomCode}`);
        onComplete();
        return;
      }

      setStep('scoreReveal');
    },
    [language, router, onComplete]
  );


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
    (mode: 'daily' | 'practice' | 'home' | 'joinRoom') => {
      // Prevent double-taps from stacking router pushes during navigation
      if (isNavigating) return;
      setIsNavigating(true);
      markOnboardingComplete({
        avatarId: 'custom',
        displayName: playerName || 'Player',
        selectedMode: mode === 'daily' ? 'daily' : mode === 'joinRoom' ? 'multi' : mode === 'home' ? 'home' : 'single',
      });

      // Check for a pending room invite (saved before FTUE started)
      const pendingRoom = consumePendingRoomInvite();
      if (mode === 'joinRoom' && pendingRoom) {
        router.push(`/${language}/multiplayer?room=${pendingRoom}`);
      } else if (pendingRoom) {
        // Even if they picked daily/practice, still redirect to the room
        // since that was their original intent
        router.push(`/${language}/multiplayer?room=${pendingRoom}`);
      } else if (mode === 'home') {
        router.push(`/${language}`);
      } else {
        const route =
          mode === 'daily'
            ? `/${language}/daily`
            : `/${language}/singleplayer?autoStart=practice`;
        router.push(route);
      }

      onComplete();
    },
    [language, router, onComplete, playerName, isNavigating]
  );

  // Step 0: Language selected — proceed to tutorial
  const handleLanguageSelect = useCallback(() => {
    setStep('tutorial');
  }, []);

  const renderStep = () => {
    switch (step) {
      case 'language':
        return <LanguageSelect onSelect={handleLanguageSelect} />;
      case 'tutorial':
        return <TutorialGame onComplete={handleTutorialComplete} />;
      case 'profile':
        return (
          <QuickProfileSetup
            onComplete={handleProfileComplete}
            hasPendingInvite={hasPendingRoomInvite()}
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
        return <ModeFork onSelectMode={handleModeSelect} hasPendingInvite={hasPendingRoomInvite()} />;
      default:
        return null;
    }
  };

  const showProgress = step !== 'tutorial';

  return (
    <div
      data-testid="onboarding-flow"
      className="fixed inset-0 z-[100] bg-neo-navy flex flex-col items-center justify-center overflow-y-auto"
      dir={dir}
    >
      {/* Floating geometric background shapes — shift color per step */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <motion.div
          className="absolute w-[300px] h-[300px] rounded-full blur-[120px]"
          animate={{ background: accent.color1, x: ['-10%', '5%', '-10%'], y: ['-5%', '10%', '-5%'] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          style={{ top: '-8%', left: '-5%' }}
        />
        <motion.div
          className="absolute w-[250px] h-[250px] rounded-full blur-[100px]"
          animate={{ background: accent.color2, x: ['5%', '-8%', '5%'], y: ['5%', '-5%', '5%'] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          style={{ bottom: '5%', right: '-3%' }}
        />
        {/* Subtle diagonal grid lines */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 40px, currentColor 40px, currentColor 41px)',
            color: 'white',
          }}
        />
      </div>

      {/* Progress indicator — hidden during tutorial (gameplay fills the screen) */}
      <AnimatePresence>
        {showProgress && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="absolute top-6 z-10"
          >
            <OnboardingProgress currentStep={stepIndex} totalSteps={STEPS.length} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="w-full px-4 relative z-1"
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>

      {/* Navigation loading overlay — covers the modal while the destination
          page hydrates. Blocks pointer events so duplicate taps cannot reach
          the underlying mode buttons. */}
      <AnimatePresence>
        {isNavigating && (
          <motion.div
            key="onboarding-loading"
            data-testid="onboarding-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-neo-navy/90 backdrop-blur-sm"
            role="status"
            aria-live="polite"
          >
            <div
              className="w-12 h-12 border-neo-thick border-neo-lime border-t-transparent rounded-full animate-spin"
              aria-hidden
            />
            <p className="mt-4 font-neo-display text-neo-white text-lg uppercase tracking-wide">
              {t('onboarding.loading')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OnboardingFlow;
