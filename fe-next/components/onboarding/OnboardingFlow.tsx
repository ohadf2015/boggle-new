'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { markOnboardingComplete, markOnboardingSkipped, consumePendingRoomInvite, hasPendingRoomInvite, getPendingRoomInvite } from '@/utils/onboardingStorage';
import { setStoredCustomAvatar } from '@/utils/profileStorage';
import {
  trackOnboardingStart,
  trackOnboardingStep,
  trackOnboardingCompleted,
  trackOnboardingSkipped,
  trackOnboardingQuickPlay,
  trackInviteTutorialSkipped,
  trackInviteConsumed,
} from '@/utils/growthTracking';
import { type CustomAvatarConfig } from '@/shared/types/customAvatar';
import { useInviteOnboardingMode, type FlowStep } from '@/hooks/useInviteOnboardingMode';
import { getGuestStats } from '@/utils/guestManager';
import LanguageSelect from './LanguageSelect';
import CalmModeChoice from './CalmModeChoice';
import StyleSelectStep from './StyleSelectStep';
import QuickStartStep from './QuickStartStep';
import HowToPlay from '@/components/HowToPlay';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import QuickProfileSetup from './QuickProfileSetup';
import OnboardingProgress from './OnboardingProgress';
import ReturningUserStep from './ReturningUserStep';
import InviteTutorialTeaser from './InviteTutorialTeaser';
import CrazyGamesWelcome, { type CrazyGamesMode } from './CrazyGamesWelcome';
import CrazyGamesTutorial from './CrazyGamesTutorial';
import AuthModal from '@/components/auth/AuthModal';
import { useCrazyGames } from '@/components/CrazyGamesSDK';


interface OnboardingFlowProps {
  onComplete: () => void;
}

/**
 * OnboardingFlow - Orchestrates the short FTUE.
 *
 * Base state machine: [returningUser (guests with 1+ games)] -> [calmMode (admin)]
 * -> quickStart -> game. Brand-new players see exactly ONE screen.
 *
 * The old language -> profile -> style sequence is gone from this path: three
 * full-screen gates stood in front of a word game, and the language step needed
 * two taps on the same flag (select, then confirm) to advance — the single
 * biggest source of "how do I continue?". Language, name and avatar now sit on
 * `quickStart` alongside an always-enabled PLAY button, and the tutorial is a
 * link there rather than a step.
 *
 * The invite flow (language -> profile -> inviteTutorial) and the CrazyGames
 * flow are deliberately unchanged.
 */
const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const { language, dir, t } = useLanguage();
  const { isAuthenticated, isAdmin } = useAuth();
  const { updateSetting } = useAccessibility();
  const router = useRouter();

  // Resolved once, synchronously, so nothing renders an optimistic step that a
  // later read flips (Class 1 in .claude/rules/60-recurring-pitfalls.md).
  // Invite mode keeps its original entry point; everyone else lands on the one
  // screen unless they're a returning guest worth re-engaging.
  const [step, setStep] = useState<FlowStep>(() => {
    if (getPendingRoomInvite()) return 'language';
    return (getGuestStats().games || 0) > 0 ? 'returningUser' : 'quickStart';
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  // CG portal substep: tutorial first, then welcome with mode CTAs.
  const [cgTutorialDone, setCgTutorialDone] = useState(false);
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

  // Keep the entire first run ad-free. The FTUE is a fixed full-screen takeover on
  // the home route (NOT its own route), so the route-based ad gates can't catch it
  // and the native banner composites ABOVE the WebView regardless of z-index. This
  // single class is the source of truth read by BannerCoordinatorMount (native) and
  // useOnboardingActive → AdSenseLoader (web) to suppress both ad layers, and it
  // also gives the overlay a CSS hook. Removed on unmount so ads resume afterwards.
  useEffect(() => {
    document.documentElement.classList.add('onboarding-active');
    return () => document.documentElement.classList.remove('onboarding-active');
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

  // Calm Mode is admin-only during soft launch. handleNewUser only fires in the
  // non-invite flow, so the admin flag alone decides whether the vibe step shows.
  const handleNewUser = useCallback(() => {
    setStep(isAdmin ? 'calmMode' : 'quickStart');
  }, [isAdmin]);

  // Calm vs energetic vibe choice — applies cosy mode immediately so the rest of
  // onboarding already reflects the player's pick, then advances to profile.
  const handleCalmModeChoice = useCallback(
    (cosy: boolean) => {
      updateSetting('cosyMode', cosy);
      recordStep('calmMode', { cosy });
      setStep('quickStart');
    },
    [updateSetting, recordStep]
  );

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
    // Skip = bail out of onboarding. Land on the home page, NOT multiplayer —
    // unless a room invite is pending (that's explicit intent to play MP).
    router.push(
      pendingRoom
        ? `/${language}/multiplayer?room=${pendingRoom}`
        : `/${language}`,
    );
    onComplete();
  }, [isNavigating, language, router, onComplete, emitSkipped, step]);

  /** 🎯 "Play Now" — skip all remaining FTUE steps and jump straight into a practice game. */
  const handlePlayNow = useCallback(() => {
    if (isNavigating) return;
    setIsNavigating(true);
    markOnboardingSkipped();
    emitSkipped(step);
    trackOnboardingQuickPlay({ source: 'ftue_skip', at_step: step });
    router.push(`/${language}/practice/classic?play=1&firstGame=1`);
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

  // Admins (soft launch) get the Calm-vs-Energetic vibe step spliced in after
  // returningUser; everyone else sees the base flow. Drives progress dots + index.
  const displaySteps = useMemo(() => {
    if (!isAdmin || isInviteMode) return activeSteps;
    const idx = activeSteps.indexOf('returningUser');
    if (idx < 0 || activeSteps.includes('calmMode')) return activeSteps;
    const next = [...activeSteps];
    next.splice(idx + 1, 0, 'calmMode');
    return next;
  }, [activeSteps, isAdmin, isInviteMode]);

  const stepIndex = useMemo(() => displaySteps.indexOf(step), [step, displaySteps]);

  // Profile complete → advance to the style step (non-invite), or straight into
  // the invite teaser if a room invite is pending. Persist the avatar now so it
  // survives even if the player bails before the style step finishes. The actual
  // onboarding-complete + navigation happens in handleStyleComplete.
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

      setStep('style');
    },
    [recordStep, isInviteMode, isNavigating]
  );

  // Final step: style picked (or skipped) → finish onboarding and route
  // straight into an auto-started classic practice game (D1-retention lever —
  // no Daily Challenge mode-picker detour). The StylePicker
  // already persisted the chosen style; this only records completion and navigates.
  const handleStyleComplete = useCallback(() => {
    if (isNavigating) return;
    setIsNavigating(true);
    recordStep('style');
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
      // 🎯 Route FTUE completers straight into a practice game — eliminates
      // the 2-tap dead zone between onboarding and first play.
      trackOnboardingQuickPlay({ source: 'style_complete' });
      router.push(`/${language}/practice/classic?play=1&firstGame=1`);
    }
    emitCompleted({ via: 'style' });
    onComplete();
  }, [isNavigating, playerName, recordStep, language, router, onComplete, emitCompleted]);

  /**
   * The one and only exit from the base flow: PLAY.
   *
   * Payload is deliberately identical to handleStyleComplete's — same
   * markOnboardingComplete shape, same consumePendingRoomInvite() call, same
   * destination — because two paths that reach "onboarding done" with different
   * payloads is Class 3 in .claude/rules/60-recurring-pitfalls.md, and the
   * invite branch is what silently goes missing.
   */
  const handleQuickStartPlay = useCallback(
    (name: string, avatar: CustomAvatarConfig, nameEdited: boolean) => {
      if (isNavigating) return;
      setIsNavigating(true);
      setPlayerName(name);
      setPlayerAvatar(avatar);
      setStoredCustomAvatar(avatar);
      playerNameEditedRef.current = nameEdited;
      recordStep('quickStart', { nameEdited });
      markOnboardingComplete({
        avatarId: 'custom',
        displayName: name || 'Player',
        selectedMode: 'home',
        nameEdited,
      });

      const pendingRoom = consumePendingRoomInvite();
      router.push(
        pendingRoom
          ? `/${language}/multiplayer?room=${pendingRoom}`
          : `/${language}/practice/classic?play=1&firstGame=1`,
      );
      if (!pendingRoom) trackOnboardingQuickPlay({ source: 'quick_start' });
      emitCompleted({ via: 'quick_start' });
      onComplete();
    },
    [isNavigating, recordStep, language, router, onComplete, emitCompleted],
  );

  // Step 0: Language selected — proceed to returningUser prompt OR straight to profile.
  // POLICY: Brand-new users (0 games) skip ReturningUserStep — they go straight to play.
  // Returning users (1+ games) see ReturningUserStep to re-engage with account options.
  // On CrazyGames the "have an account" branch is dead (no external auth),
  // so skip straight to the CG short-flow (handled by the early return).
  // In invite mode, skip returnUser and go straight to profile.
  const handleLanguageSelect = useCallback(() => {
    recordStep('language');
    if (isOnCrazyGamesPlatform) {
      setStep('profile');
      return;
    }
    if (isInviteMode) {
      setStep('profile');
      return;
    }
    // Check if user is brand-new (no games played yet)
    const guestStats = getGuestStats();
    const gamesPlayed = guestStats.games || 0;
    if (gamesPlayed === 0) {
      // Brand-new user: skip account dialog, go straight to profile setup
      setStep('profile');
    } else {
      // Returning user: show account re-engagement option
      setStep('returningUser');
    }
  }, [isOnCrazyGamesPlatform, isInviteMode, recordStep]);

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
      case 'quickStart':
        return (
          <QuickStartStep
            onPlay={handleQuickStartPlay}
            onHowToPlay={() => setShowHowToPlay(true)}
            onHaveAccount={isOnCrazyGamesPlatform ? undefined : handleHaveAccount}
          />
        );
      case 'language':
        return <LanguageSelect onSelect={handleLanguageSelect} onPlayNow={handlePlayNow} />;
      case 'calmMode':
        return <CalmModeChoice onChoose={handleCalmModeChoice} />;
      case 'style':
        return <StyleSelectStep onComplete={handleStyleComplete} onPlayNow={handlePlayNow} />;
      case 'profile':
        return (
          <QuickProfileSetup
            onComplete={handleProfileComplete}
            onPlayNow={handlePlayNow}
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
      // Keyboard-safe layout: 100dvh shrinks with the soft keyboard (paired with
      // viewport `interactiveWidget: resizes-content`), and on small screens we
      // top-align + scroll instead of hard-centering — otherwise the vertically
      // centered card pushes the "Continue" CTA under the keyboard. Desktop keeps
      // the centered presentation (no keyboard inset there) — `safe center` (not
      // plain `center`) so a step whose content is taller than the viewport (e.g.
      // the style grid on a tablet-height screen) falls back to top-alignment
      // instead of centering the box and pushing its heading off the top edge.
      className="fixed inset-0 z-[100] bg-neo-navy flex flex-col items-center justify-start sm:[justify-content:safe_center] overflow-y-auto py-[max(env(safe-area-inset-top),1rem)]"
      style={{ minHeight: '100dvh' }}
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

      {/* Progress indicator — a single dot communicates nothing but clutter, so
          it only appears when there is actually a sequence to track. */}
      {displaySteps.length > 1 && (
        <div className="absolute top-6 z-10">
          <OnboardingProgress currentStep={stepIndex} totalSteps={displaySteps.length} />
        </div>
      )}

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

      {/* Opt-in tutorial. Overlays the flow instead of replacing a step, so
          reading it costs the player nothing and closing it returns them to PLAY. */}
      {showHowToPlay && <HowToPlay onClose={() => setShowHowToPlay(false)} />}

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
