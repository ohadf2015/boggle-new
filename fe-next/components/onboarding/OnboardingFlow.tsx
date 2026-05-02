'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { markOnboardingComplete, markOnboardingSkipped, consumePendingRoomInvite, hasPendingRoomInvite } from '@/utils/onboardingStorage';
import { markGuidanceShown } from '@/utils/contextualGuidanceStorage';
import { setStoredCustomAvatar } from '@/utils/profileStorage';
import {
  trackOnboardingStart,
  trackOnboardingStep,
  trackOnboardingCompleted,
  trackOnboardingSkipped,
  markFirstGameActivation,
} from '@/utils/growthTracking';
import { type CustomAvatarConfig } from '@/shared/types/customAvatar';
import LanguageSelect from './LanguageSelect';
import TutorialGame from './TutorialGame';
import QuickProfileSetup from './QuickProfileSetup';
import ScoreRevealV2 from './ScoreRevealV2';
import OnboardingProgress from './OnboardingProgress';
import ReturningUserStep from './ReturningUserStep';
import CrazyGamesWelcome, { type CrazyGamesMode } from './CrazyGamesWelcome';
import AuthModal from '@/components/auth/AuthModal';
import { useCrazyGames } from '@/components/CrazyGamesSDK';

type FlowStep = 'returningUser' | 'language' | 'tutorial' | 'profile' | 'scoreReveal';

const STEPS: FlowStep[] = ['language', 'returningUser', 'tutorial', 'profile', 'scoreReveal'];

/** Step-specific accent colors for the floating background shapes */
const STEP_ACCENTS: Record<FlowStep, { color1: string; color2: string }> = {
  returningUser: { color1: 'rgba(191,255,0,0.18)', color2: 'rgba(255,20,147,0.14)' },
  language: { color1: 'rgba(191,255,0,0.07)', color2: 'rgba(0,255,255,0.05)' },
  tutorial: { color1: 'rgba(0,255,255,0.06)', color2: 'rgba(191,255,0,0.04)' },
  profile: { color1: 'rgba(255,20,147,0.06)', color2: 'rgba(191,255,0,0.04)' },
  scoreReveal: { color1: 'rgba(191,255,0,0.08)', color2: 'rgba(255,20,147,0.05)' },
};

interface OnboardingFlowProps {
  onComplete: () => void;
}

/**
 * OnboardingFlow - Orchestrates the full FTUE.
 * State machine: language -> tutorial -> profile -> scoreReveal -> home.
 * Full-screen with floating geometric background and progress dots.
 */
const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const { language, dir, t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<FlowStep>('language');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const [tutorialScore, setTutorialScore] = useState(0);
  const [, setTutorialWords] = useState<string[]>([]);
  const [tutorialAttempt] = useState(1);
  const [playerName, setPlayerName] = useState('');
  const [, setPlayerAvatar] = useState<CustomAvatarConfig | null>(null);
  // Gate re-entry + show overlay once we've committed to a route navigation.
  // Route transitions are outside React's lifecycle, so the modal would otherwise
  // sit silently while Next.js fetches the destination page.
  const [isNavigating, setIsNavigating] = useState(false);

  // Funnel timing + step counter — captured at mount so completion/skip
  // events can carry duration_ms and step_count without prop-drilling.
  // Init refs to 0 (NOT Date.now) so render stays pure; effect below stamps
  // the real start time on mount.
  const startedAtRef = useRef<number>(0);
  const stepsCompletedRef = useRef<number>(0);
  const completionEmittedRef = useRef<boolean>(false);

  useEffect(() => {
    startedAtRef.current = Date.now();
    trackOnboardingStart();
  }, []);

  const emitCompleted = useCallback((extras: Record<string, unknown> = {}) => {
    if (completionEmittedRef.current) return;
    completionEmittedRef.current = true;
    trackOnboardingCompleted({
      step_count: stepsCompletedRef.current,
      duration_ms: Date.now() - startedAtRef.current,
      ...extras,
    });
  }, []);

  const emitSkipped = useCallback((atStep: FlowStep | 'unknown') => {
    if (completionEmittedRef.current) return;
    completionEmittedRef.current = true;
    trackOnboardingSkipped({
      // FlowStep aligns with OnboardingStep names except 'returningUser'.
      // Map to a known OnboardingStep / 'unknown' to keep payload shape stable.
      at_step: (atStep === 'returningUser' ? 'unknown' : atStep) as never,
      duration_ms: Date.now() - startedAtRef.current,
    });
  }, []);

  // Track each step completion through a wrapper so the count stays
  // truthful regardless of which call site advances the flow. Avoid
  // passing `undefined` as 2nd arg — keeps test assertions like
  // `toHaveBeenCalledWith('language')` matching.
  const recordStep = useCallback((step: Parameters<typeof trackOnboardingStep>[0], extras?: Record<string, unknown>) => {
    stepsCompletedRef.current += 1;
    if (extras === undefined) {
      trackOnboardingStep(step);
    } else {
      trackOnboardingStep(step, extras);
    }
  }, []);

  // When user signs in during the returningUser step, skip FTUE entirely.
  // This counts as a completion (auth replaced the FTUE goal).
  useEffect(() => {
    if (isAuthenticated && step === 'returningUser') {
      markOnboardingComplete({ avatarId: 'custom', displayName: '', selectedMode: null });
      emitCompleted({ via: 'auth_returning_user' });
      onComplete();
    }
  }, [isAuthenticated, step, onComplete, emitCompleted]);

  const handleHaveAccount = useCallback(() => {
    if (isOnCrazyGamesPlatform) return;
    setShowAuthModal(true);
  }, [isOnCrazyGamesPlatform]);

  const handleNewUser = useCallback(() => {
    setStep('tutorial');
  }, []);

  const handleSkipOnboarding = useCallback(() => {
    if (isNavigating) return;
    setIsNavigating(true);
    markOnboardingSkipped();
    emitSkipped(step);
    const pendingRoom = consumePendingRoomInvite();
    router.push(
      pendingRoom
        ? `/${language}/multiplayer?room=${pendingRoom}`
        : `/${language}/multiplayer`,
    );
    onComplete();
  }, [isNavigating, language, router, onComplete, emitSkipped, step]);

  const stepIndex = useMemo(() => STEPS.indexOf(step), [step]);
  const accent = STEP_ACCENTS[step];

  // Step 1: Tutorial complete
  const handleTutorialComplete = useCallback(
    (score: number, wordsFound: string[]) => {
      setTutorialScore(score);
      setTutorialWords(wordsFound);
      markGuidanceShown('firstPlayTutorialCompleted');
      recordStep('tutorial', { score, wordCount: wordsFound.length });
      markFirstGameActivation({
        won: true,
        score,
        wordCount: wordsFound.length,
        mode: 'tutorial',
      });
      setStep('profile');
    },
    [recordStep]
  );

  // Step 2: Profile complete
  const playerNameEditedRef = useRef(false);
  const handleProfileComplete = useCallback(
    (name: string, avatar: CustomAvatarConfig, nameEdited: boolean) => {
      setPlayerName(name);
      setPlayerAvatar(avatar);
      setStoredCustomAvatar(avatar);
      playerNameEditedRef.current = nameEdited;

      const pendingInvite = hasPendingRoomInvite();
      recordStep('profile', { hasPendingInvite: pendingInvite, nameEdited });

      // If player arrived via room invite, skip scoreReveal + fork — go straight to the room
      if (pendingInvite) {
        markOnboardingComplete({
          avatarId: 'custom',
          displayName: name,
          selectedMode: 'multi',
          nameEdited,
        });
        const roomCode = consumePendingRoomInvite();
        setIsNavigating(true);
        router.push(`/${language}/multiplayer?room=${roomCode}`);
        emitCompleted({ via: 'pending_invite' });
        onComplete();
        return;
      }

      setStep('scoreReveal');
    },
    [language, router, onComplete, recordStep, emitCompleted]
  );


  // Step 3: Score reveal complete — finish onboarding and land on the home page.
  // The mode-fork screen used to live here; we now skip it so first-timers go
  // straight to the full landing UX where they can pick any mode themselves.
  const handleContinue = useCallback(() => {
    if (isNavigating) return;
    setIsNavigating(true);
    recordStep('score_reveal', { action: 'continue' });
    markOnboardingComplete({
      avatarId: 'custom',
      displayName: playerName || 'Player',
      selectedMode: 'home',
      nameEdited: playerNameEditedRef.current,
    });

    const pendingRoom = consumePendingRoomInvite();
    if (pendingRoom) {
      router.push(`/${language}/multiplayer?room=${pendingRoom}`);
    } else {
      router.push(`/${language}/multiplayer`);
    }
    emitCompleted({ via: 'score_reveal' });
    onComplete();
  }, [isNavigating, language, router, onComplete, playerName, recordStep, emitCompleted]);

  // Step 0: Language selected — proceed to returningUser prompt
  // On CrazyGames the "have an account" branch is dead (no external auth),
  // so skip straight to tutorial.
  const handleLanguageSelect = useCallback(() => {
    recordStep('language');
    if (isOnCrazyGamesPlatform) {
      setStep('tutorial');
      return;
    }
    setStep('returningUser');
  }, [isOnCrazyGamesPlatform, recordStep]);

  // CrazyGames portal: replace 5-step FTUE with one welcome screen.
  // Players land via thumbnail click; expectation is play in seconds.
  const handleCrazyGamesPlay = useCallback(
    (mode: CrazyGamesMode) => {
      if (isNavigating) return;
      setIsNavigating(true);
      markOnboardingComplete({ avatarId: 'custom', displayName: 'Player', selectedMode: mode === 'multiplayer' ? 'multi' : mode === 'daily' ? 'daily' : 'single' });
      const route =
        mode === 'daily'
          ? `/${language}/daily`
          : mode === 'multiplayer'
            ? `/${language}/multiplayer`
            : `/${language}/singleplayer?autoStart=practice`;
      router.push(route);
      emitCompleted({ via: 'crazygames_welcome', selected_mode: mode });
      onComplete();
    },
    [isNavigating, language, router, onComplete, emitCompleted],
  );

  const renderStep = () => {
    switch (step) {
      case 'returningUser':
        return (
          <ReturningUserStep
            onHaveAccount={handleHaveAccount}
            onNew={handleNewUser}
            onSkip={handleSkipOnboarding}
          />
        );
      case 'language':
        return <LanguageSelect onSelect={handleLanguageSelect} />;
      case 'tutorial':
        return <TutorialGame onComplete={handleTutorialComplete} attemptNumber={tutorialAttempt} />;
      case 'profile':
        return (
          <QuickProfileSetup
            onComplete={handleProfileComplete}
            hasPendingInvite={hasPendingRoomInvite()}
          />
        );
      case 'scoreReveal':
        return (
          <ScoreRevealV2
            score={tutorialScore}
            onContinue={handleContinue}
            onSkip={handleSkipOnboarding}
          />
        );
      default:
        return null;
    }
  };

  const showProgress = step !== 'tutorial';

  // CrazyGames short-flow: one visual welcome screen → game.
  if (isOnCrazyGamesPlatform) {
    return (
      <div
        data-testid="onboarding-flow"
        className="fixed inset-0 z-[100] bg-neo-navy flex flex-col items-center justify-center overflow-y-auto"
        dir={dir}
      >
        <CrazyGamesWelcome onPlay={handleCrazyGamesPlay} />
        <AnimatePresence>
          {isNavigating && (
            <motion.div
              key="cg-welcome-loading"
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
  }

  return (
    <div
      data-testid="onboarding-flow"
      className="fixed inset-0 z-[100] bg-neo-navy flex flex-col items-center justify-center overflow-y-auto"
      dir={dir}
    >
      {/* Floating geometric background shapes — shift color per step.
          Sizes scale up at lg: so the navy doesn't feel empty on desktop. */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <motion.div
          className="absolute w-[300px] h-[300px] lg:w-[560px] lg:h-[560px] rounded-full blur-[120px] lg:blur-[160px]"
          animate={{ background: accent.color1, x: ['-10%', '5%', '-10%'], y: ['-5%', '10%', '-5%'] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          style={{ top: '-8%', left: '-5%' }}
        />
        <motion.div
          className="absolute w-[250px] h-[250px] lg:w-[480px] lg:h-[480px] rounded-full blur-[100px] lg:blur-[140px]"
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

      {/* Skip Tutorial CTA — visible during tutorial step so users aren't trapped */}
      <AnimatePresence>
        {step === 'tutorial' && (
          <motion.button
            data-testid="onboarding-skip-tutorial"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, delay: 0.5 }}
            onClick={handleSkipOnboarding}
            className="absolute top-4 end-4 z-20 min-h-[44px] px-3 py-2 text-xs font-bold uppercase tracking-wide text-neo-cream/70 hover:text-neo-cream bg-neo-navy/60 border-2 border-neo-cream/20 hover:border-neo-cream/40 rounded-neo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan transition-colors"
          >
            {t('onboarding.skipTutorial')}
          </motion.button>
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
          className="w-full max-w-sm sm:max-w-md lg:max-w-3xl mx-auto px-4 relative z-1"
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

      {!isOnCrazyGamesPlatform && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode="signin"
        />
      )}
    </div>
  );
};

export default OnboardingFlow;
