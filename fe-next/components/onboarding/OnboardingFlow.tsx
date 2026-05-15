'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
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
  trackInviteTutorialSkipped,
  trackInviteConsumed,
} from '@/utils/growthTracking';
import { type CustomAvatarConfig } from '@/shared/types/customAvatar';
import { useInviteOnboardingMode, type FlowStep } from '@/hooks/useInviteOnboardingMode';
import LanguageSelect from './LanguageSelect';
import TutorialGame from './TutorialGame';
import QuickProfileSetup from './QuickProfileSetup';
import OnboardingProgress from './OnboardingProgress';
import ReturningUserStep from './ReturningUserStep';
import InviteTutorialTeaser from './InviteTutorialTeaser';
import CrazyGamesWelcome, { type CrazyGamesMode } from './CrazyGamesWelcome';
import CrazyGamesTutorial from './CrazyGamesTutorial';
import AuthModal from '@/components/auth/AuthModal';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useExperiment } from '@/hooks/useExperiment';
import { locales } from '@/lib/i18n';
import { practiceTargetUrl } from '@/lib/practice/practiceRoute';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';
import type { Language } from '@/types';

interface OnboardingFlowProps {
  onComplete: () => void;
}

/** Detect the first browser language that matches a supported app locale. */
function detectSupportedBrowserLocale(): Language | null {
  if (typeof navigator === 'undefined') return null;
  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const raw of candidates) {
    const primary = raw?.split('-')[0]?.toLowerCase();
    if (primary && (locales as readonly string[]).includes(primary)) {
      return primary as Language;
    }
  }
  return null;
}

// Practice-mode pool for the random autoroute variant. word-hunt leads the
// PostHog 14d volume table (82 plays), classic and wheelRush round out the
// trio of supported practice landings.
const RANDOM_AUTOROUTE_MODES: readonly PracticeMode[] = ['wordHunt', 'classic', 'wheelRush'];

/**
 * OnboardingFlow - Orchestrates the full FTUE.
 * State machine: language -> tutorial -> profile -> home.
 * Full-screen with floating geometric background and progress dots.
 */
const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const { language, setLanguage, dir, t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Experiment: skip language picker when browser locale matches a supported
  // app locale (en/he/sv/ja/es). PostHog 14d showed `language` step at 54
  // unique users — pruning the picker compresses FTUE without losing intent.
  const langAutoSkip = useExperiment('onboarding-language-autoskip');
  // Experiment: where to route post-profile. Variant `word-hunt` skips the
  // /practice intermediate; `random` rotates through top-volume modes.
  const postProfileRoute = useExperiment('onboarding-postprofile-autoroute');

  // Initial step. When the auto-skip variant is active AND the browser
  // language matches a supported locale, persist that locale and skip the
  // picker. Invite mode also benefits — it already skipped returningUser.
  const initialStep = React.useMemo<FlowStep>(() => {
    if (typeof window === 'undefined') return 'language';
    if (langAutoSkip.variant !== 'auto-skip') return 'language';
    const detected = detectSupportedBrowserLocale();
    if (!detected) return 'language';
    return 'tutorial';
  }, [langAutoSkip.variant]);

  const [step, setStep] = useState<FlowStep>(initialStep);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  // CG portal substep: tutorial first, then welcome with mode CTAs.
  const [cgTutorialDone, setCgTutorialDone] = useState(false);
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
  // Store invite context for use in callbacks (updated after hook call)
  const inviteContextRef = useRef<{ isInviteMode: boolean; inviteAtMount: { code: string; hostName?: string } | null }>({
    isInviteMode: false,
    inviteAtMount: null,
  });

  useEffect(() => {
    startedAtRef.current = Date.now();
    trackOnboardingStart();
  }, []);

  // Auto-skip language picker: persist the detected browser locale and
  // pre-credit the `language` step so the funnel still records exposure.
  // Runs once when the experiment lands on `auto-skip` AND we successfully
  // resolved a supported locale.
  const autoSkipFiredRef = useRef(false);
  useEffect(() => {
    if (autoSkipFiredRef.current) return;
    if (langAutoSkip.variant !== 'auto-skip') return;
    if (initialStep !== 'tutorial') return;
    const detected = detectSupportedBrowserLocale();
    if (!detected) return;
    autoSkipFiredRef.current = true;
    try { setLanguage(detected, { skipNavigation: true }); } catch { /* ignore */ }
    stepsCompletedRef.current += 1;
    trackOnboardingStep('language', { autoSkipped: true, detectedLocale: detected });
    langAutoSkip.trackExposure();
  }, [langAutoSkip, initialStep, setLanguage]);

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
    // Track invite-specific skip event if applicable
    const { isInviteMode, inviteAtMount } = inviteContextRef.current;
    if (isInviteMode && inviteAtMount) {
      const landedTs = Number(sessionStorage.getItem('invite_landed_ts') || '0');
      const secondsSinceLanded = landedTs ? Math.round((Date.now() - landedTs) / 1000) : 0;
      trackInviteTutorialSkipped({
        roomCode: inviteAtMount.code,
        step: step === 'inviteTutorial' ? 'tutorial' : 'profile',
        secondsSinceLanded,
      });
      const totalSeconds = landedTs ? Math.round((Date.now() - landedTs) / 1000) : 0;
      trackInviteConsumed({
        roomCode: inviteAtMount.code,
        path: 'skip',
        totalSeconds,
      });
    }
    const pendingRoom = consumePendingRoomInvite();
    router.push(
      pendingRoom
        ? `/${language}/multiplayer?room=${pendingRoom}`
        : `/${language}/multiplayer`,
    );
    onComplete();
  }, [isNavigating, language, router, onComplete, emitSkipped, step]);

  // Step 2: Profile complete setup
  const playerNameEditedRef = useRef(false);

  const { isInviteMode, inviteAtMount, activeSteps, handleInviteTeaserComplete } = useInviteOnboardingMode({
    language,
    router,
    onComplete,
    isNavigating,
    setIsNavigating,
    getPlayerName: () => playerName,
    getNameEdited: () => playerNameEditedRef.current,
    emitCompleted,
  });

  // Update invite context ref for use in callback handlers
  useEffect(() => {
    inviteContextRef.current = { isInviteMode, inviteAtMount };
  }, [isInviteMode, inviteAtMount]);

  const stepIndex = useMemo(() => activeSteps.indexOf(step), [step, activeSteps]);
  // Step 1: Tutorial complete
  const handleTutorialComplete = useCallback(
    (score: number, wordsFound: string[]) => {
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

  // Step 3: Profile complete → finish onboarding and route to practice/invite.
  // The score-reveal interstitial used to live between this step and navigation,
  // but it duplicated info already shown on the practice hub (gold/streak/title)
  // and added a needless tap before the user could play.
  const handleProfileComplete = useCallback(
    (name: string, avatar: CustomAvatarConfig, nameEdited: boolean) => {
      if (isNavigating) return;
      setPlayerName(name);
      setPlayerAvatar(avatar);
      setStoredCustomAvatar(avatar);
      playerNameEditedRef.current = nameEdited;

      const pendingInvite = hasPendingRoomInvite();
      recordStep('profile', { hasPendingInvite: pendingInvite, nameEdited });

      if (isInviteMode && pendingInvite) {
        setStep('inviteTutorial');
        return;
      }

      setIsNavigating(true);
      markOnboardingComplete({
        avatarId: 'custom',
        displayName: name || 'Player',
        selectedMode: 'home',
        nameEdited,
      });

      // Resolve post-profile route from the autoroute experiment. The
      // hypothesis is that /practice is a low-engagement intermediate;
      // routing straight into Word Hunt (top-volume mode) lifts
      // first_game_played within 30s of profile complete.
      const pendingRoom = consumePendingRoomInvite();
      let postProfileTarget = `/${language}/practice`;
      let routeVariantTag: string = postProfileRoute.variant;
      if (pendingRoom) {
        postProfileTarget = `/${language}/multiplayer?room=${pendingRoom}`;
        routeVariantTag = 'invite';
      } else if (postProfileRoute.variant === 'word-hunt') {
        // Deep-link straight into the Word Hunt practice landing — top mode
        // by 14d play volume. Skips /practice intermediate.
        postProfileTarget = practiceTargetUrl('wordHunt', language);
        postProfileRoute.trackExposure();
      } else if (postProfileRoute.variant === 'random') {
        const pick = RANDOM_AUTOROUTE_MODES[
          Math.floor(Math.random() * RANDOM_AUTOROUTE_MODES.length)
        ];
        postProfileTarget = practiceTargetUrl(pick, language);
        routeVariantTag = `random:${pick}`;
        postProfileRoute.trackExposure();
      }

      // Emit completion BEFORE router.push — Next route transitions abort
      // pending captures in the unloaded page, which dropped 38% of
      // profile-complete users from the funnel (PostHog 14d: 34u finished
      // profile, only 21u recorded onboarding_completed).
      emitCompleted({ via: 'profile', routeVariant: routeVariantTag });

      router.push(postProfileTarget);
      onComplete();
    },
    [recordStep, isInviteMode, isNavigating, language, router, onComplete, emitCompleted, postProfileRoute]
  );

  // Step 0: Language selected — proceed to returningUser prompt
  // On CrazyGames the "have an account" branch is dead (no external auth),
  // so skip straight to tutorial.
  // In invite mode, skip returnUser and go straight to profile.
  const handleLanguageSelect = useCallback(() => {
    recordStep('language');
    if (isOnCrazyGamesPlatform) {
      setStep('tutorial');
      return;
    }
    if (isInviteMode) {
      setStep('profile');
      return;
    }
    setStep('returningUser');
  }, [isOnCrazyGamesPlatform, isInviteMode, recordStep]);

  // CrazyGames portal: replace 5-step FTUE with one welcome screen.
  // Players land via thumbnail click; expectation is play in seconds.
  const handleCrazyGamesPlay = useCallback(
    (mode: CrazyGamesMode) => {
      if (isNavigating) return;
      setIsNavigating(true);
      markOnboardingComplete({ avatarId: 'custom', displayName: 'Player', selectedMode: mode === 'multiplayer' ? 'multi' : mode === 'daily' ? 'daily' : 'single' });
      // Emit BEFORE router.push so the CG completion event survives the
      // route transition (mirror fix to handleProfileComplete).
      emitCompleted({ via: 'crazygames_welcome', selected_mode: mode });
      const route =
        mode === 'daily'
          ? `/${language}/daily`
          : mode === 'multiplayer'
            ? `/${language}/multiplayer`
            : `/${language}/singleplayer?autoStart=practice`;
      router.push(route);
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
            inviteContext={isInviteMode && inviteAtMount
              ? { roomCode: inviteAtMount.code, hostName: inviteAtMount.hostName }
              : undefined}
            onSkipInvite={isInviteMode ? handleSkipOnboarding : undefined}
          />
        );
      case 'inviteTutorial': {
        if (!inviteAtMount) {
          handleSkipOnboarding();
          return null;
        }
        return (
          <InviteTutorialTeaser
            roomCode={inviteAtMount.code}
            hostName={inviteAtMount.hostName}
            onComplete={handleInviteTeaserComplete}
            onSkip={handleSkipOnboarding}
          />
        );
      }
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
        <AnimatePresence mode="wait">
          {!cgTutorialDone ? (
            <m.div
              key="cg-tutorial"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              <CrazyGamesTutorial
                onContinue={() => setCgTutorialDone(true)}
                onSkip={() => setCgTutorialDone(true)}
              />
            </m.div>
          ) : (
            <m.div
              key="cg-welcome"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              <CrazyGamesWelcome onPlay={handleCrazyGamesPlay} />
            </m.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {isNavigating && (
            <m.div
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
            </m.div>
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
      {/* Subtle diagonal grid pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
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
          <m.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="absolute top-6 z-10"
          >
            <OnboardingProgress currentStep={stepIndex} totalSteps={activeSteps.length} />
          </m.div>
        )}
      </AnimatePresence>

      {/* Skip Tutorial CTA — visible during tutorial step so users aren't trapped */}
      <AnimatePresence>
        {step === 'tutorial' && (
          <m.button
            data-testid="onboarding-skip-tutorial"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, delay: 0.5 }}
            onClick={handleSkipOnboarding}
            className="absolute top-4 end-4 z-20 min-h-[44px] px-3 py-2 text-xs font-bold uppercase tracking-wide text-neo-cream/70 hover:text-neo-cream bg-neo-navy/60 border-2 border-neo-cream/20 hover:border-neo-cream/40 rounded-neo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan transition-colors"
          >
            {t('onboarding.skipTutorial')}
          </m.button>
        )}
      </AnimatePresence>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <m.div
          key={step}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm sm:max-w-md lg:max-w-3xl mx-auto px-4 relative z-1"
        >
          {renderStep()}
        </m.div>
      </AnimatePresence>

      {/* Navigation loading overlay — covers the modal while the destination
          page hydrates. Blocks pointer events so duplicate taps cannot reach
          the underlying mode buttons. */}
      <AnimatePresence>
        {isNavigating && (
          <m.div
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
          </m.div>
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
