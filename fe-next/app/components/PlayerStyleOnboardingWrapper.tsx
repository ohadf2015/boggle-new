'use client';

/**
 * Shows the one-time style-choice popup to EXISTING users (authed or returning
 * guests) who haven't picked a style. Brand-new users choose during onboarding
 * instead, so this never double-prompts. Mirrors ProfileCustomizationWrapper.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isLandingRoute } from '@/lib/onboarding/allowedRoutes';
import { isGameplayPath } from '@/lib/gameplayRoutes';
import { useGameActive, useWaitingForResults } from '@/hooks/gameState/store';
import { useUserStats } from '@/hooks/useUserStats';
import { hasCompletedOnboarding } from '@/utils/onboardingStorage';
import {
  getStoredPlayerStyle,
  hasPlayerStyleModalBeenShown,
  markPlayerStyleModalShown,
} from '@/lib/playerStyle/playerStyleStorage';
import { shouldShowStylePopup } from '@/lib/playerStyle/shouldShowStylePopup';
import { isCrawler } from '@/lib/seo/isCrawler';
import type { PlayerStyleKey } from '@/lib/playerStyle/styles';
import logger from '@/utils/logger';

const PlayerStyleModal = dynamic(
  () => import('@/components/playerStyle/PlayerStyleModal').then((m) => m.PlayerStyleModal),
  { ssr: false },
);

export default function PlayerStyleOnboardingWrapper() {
  const { isAuthenticated, profile, needsProfileCustomization, updateProfile, loading } = useAuth();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [show, setShow] = useState(false);
  // Session latch: once we've decided to show the popup, never let the effect
  // re-open it. The authed "shown" marker (profileShownAt) is persisted async,
  // so after dismiss it briefly still reads null and the gate would re-resolve
  // `true` on the next dep change → modal jumps back ("shows multiple times").
  const shownOnceRef = useRef(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Derive primitives up front so the effect deps are stable values, not the
  // `profile` object — whose identity changes on every auth refresh and used to
  // re-fire the timer, racing setShow(true)→setShow(false) into a visible flash.
  const authSettled = !loading;
  const profileLoaded = profile != null;
  const profileShownAt = profile?.player_style_modal_shown_at ?? null;
  const profileStyle = profile?.player_style ?? null;

  // Natural-break signals (global Zustand singleton — readable here, and the
  // selectors re-render this wrapper when a game starts/ends so the gate is
  // re-evaluated at the moment the game is over).
  const gameActive = useGameActive();
  const waitingForResults = useWaitingForResults();
  const onGameplayRoute = isGameplayPath(pathname);
  // FTUE gate: the picker is a personalisation reward, so never surface it to a
  // player who has not played a single game yet (covers a fresh visitor who
  // lands straight in the multiplayer lobby). `useUserStats` resolves the guest
  // localStorage count OR `profiles.total_games`, so this works pre-login too.
  // Pessimistic while loading (stats null → treat as 0) to avoid an early flash.
  const { userStats } = useUserStats();
  const hasPlayedAtLeastOneGame = (userStats?.totalGamesPlayed ?? 0) >= 1;
  // A game has actually started this mount. Distinguishes "results screen" (a
  // game finished → natural break) from "pre-game" (never started → still mid-
  // flow) on a gameplay route, where both read gameActive === false.
  const hasPlayedRef = useRef(false);
  useEffect(() => {
    if (gameActive) hasPlayedRef.current = true;
  }, [gameActive]);
  // On a gameplay route, the popup may only open once the game is over: either a
  // game was played and is now finished, or the results are being computed.
  const resultsShowing = (hasPlayedRef.current || waitingForResults) && !gameActive;

  useEffect(() => {
    if (!isMounted) return;
    // Don't fight the profile-customization modal; small settle delay.
    const timer = setTimeout(() => {
      const next = shouldShowStylePopup({
        isMounted: true,
        // Gate on auth + profile load so we never decide during the transient
        // unauthenticated / unloaded-profile window (the flash root cause).
        authSettled,
        // SHIPPED TO ALL: the one-time "pick your style" popup now prompts every
        // existing user once (was admin-only during the pilot). Brand-new users
        // still choose during onboarding, so this never double-prompts.
        featureEnabled: true,
        isAuthenticated,
        needsProfileCustomization: !!needsProfileCustomization,
        profileLoaded,
        profileShownAt,
        profileStyle,
        guestShown: hasPlayerStyleModalBeenShown(),
        guestOnboardingDone: hasCompletedOnboarding(),
        // Local truth: if any style is stored we never prompt, even for authed
        // users whose `profiles.player_style` hasn't caught up (FTUE pick before
        // login / sync lag) — the root of "popup reappears after I picked".
        localStyleChosen: getStoredPlayerStyle() != null,
        alreadyShownThisSession: shownOnceRef.current,
        // Never trap a JS-rendering crawler behind the full-screen style modal —
        // it must index the deep-route page content, not the overlay.
        isCrawler: isCrawler(),
        // Natural-break gating: never open mid-game, and on a gameplay route hold
        // until the results screen ("after game"). Off gameplay routes the user
        // is idle (menu/home) so it may open straight away.
        gameActive,
        onGameplayRoute,
        resultsShowing,
        // Hold the picker until the player has at least one game under their belt
        // (FTUE) — keeps it out of the multiplayer lobby for brand-new players.
        hasPlayedAtLeastOneGame,
      });
      // Only ever OPEN from the effect; dismissal owns closing. This prevents a
      // dep change while the modal is open from yanking it shut mid-choice, and
      // (with the latch) prevents it re-opening after dismiss.
      if (next) {
        shownOnceRef.current = true;
        setShow(true);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [
    isMounted,
    authSettled,
    isAuthenticated,
    needsProfileCustomization,
    profileLoaded,
    profileShownAt,
    profileStyle,
    // Re-evaluate at natural breaks: when a game ends (gameActive flips false),
    // results land, or the user navigates to a different surface.
    gameActive,
    waitingForResults,
    onGameplayRoute,
    resultsShowing,
    hasPlayedAtLeastOneGame,
    pathname,
  ]);

  const markShown = useCallback(async () => {
    // ALWAYS record the device-level flag — it is the durable, synchronous
    // marker that survives a guest→login transition, a failed profile write, and
    // a null `profile` at call time. For authed users ALSO persist the profile
    // column so the "shown once" state syncs across the user's other devices.
    markPlayerStyleModalShown();
    if (isAuthenticated && profile) {
      const { error } = await updateProfile({
        player_style_modal_shown_at: new Date().toISOString(),
      });
      if (error) logger.warn('PlayerStyleOnboardingWrapper: failed to mark shown', error.message);
    }
  }, [isAuthenticated, profile, updateProfile]);

  // Mark the popup as shown the MOMENT it actually appears — not on dismiss.
  // Dismiss-only marking left the abandon path open: a user who saw the popup
  // then reloaded / closed the tab without clicking never persisted anything, so
  // it re-popped on the next page load ("some pages still show it another
  // time"). Gate past the landing route so a landing-only decision (which
  // renders null) does not burn the one-shot for a user who never saw it.
  const markedThisShowRef = useRef(false);
  useEffect(() => {
    if (!show || isLandingRoute(pathname)) return;
    if (markedThisShowRef.current) return;
    markedThisShowRef.current = true;
    void markShown();
  }, [show, pathname, markShown]);

  // Cross-device sync: a guest can only write the localStorage flag, so on login
  // backfill the account column from it. Without this, device A (where the popup
  // was seen) is suppressed but device B — no localStorage flag, null column —
  // re-pops. Runs independently of `show`, so it heals even when the popup is
  // already suppressed locally.
  const migratedRef = useRef(false);
  useEffect(() => {
    if (!isAuthenticated || !profileLoaded || profileShownAt) return;
    if (migratedRef.current || !hasPlayerStyleModalBeenShown()) return;
    migratedRef.current = true;
    void updateProfile({ player_style_modal_shown_at: new Date().toISOString() }).then(
      ({ error }) => {
        if (error)
          logger.warn('PlayerStyleOnboardingWrapper: failed to migrate shown flag', error.message);
      },
    );
  }, [isAuthenticated, profileLoaded, profileShownAt, updateProfile]);

  const handleDismiss = useCallback(
    (_chosen?: PlayerStyleKey) => {
      // StylePicker already persisted the style choice (if any). The popup was
      // already marked shown at render time; dismiss just closes it.
      setShow(false);
    },
    [],
  );

  if (!isMounted || !show) return null;
  // Never auto-open over the marketing landing page — it buries the hero and
  // hurts CWV/SEO. The popup will surface on the user's next in-app navigation.
  if (isLandingRoute(pathname)) return null;

  return <PlayerStyleModal isOpen onDismiss={handleDismiss} />;
}
