'use client';

import { useEffect, useRef, useState } from 'react';
import Header from './Header';
import { useTvFullscreenListener } from '@/hooks/useTvFullscreenListener';
import { useNavigation } from '@/contexts/NavigationContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';

interface AutoHideHeaderProps {
  className?: string;
  /** Callback when header visibility changes */
  onVisibilityChange?: (isVisible: boolean) => void;
  /**
   * Drop the CLS-protecting spacer (render nothing) when the header is hidden
   * for gameplay / TV fullscreen. Opt-in for focused, full-screen game surfaces
   * (e.g. the daily Word Hunt) where the reserved-but-empty band reads as a blank
   * gap at the top. Safe there because entering the game happens behind a user tap,
   * so the upward content shift falls inside the input-exclusion window (no CLS hit).
   *
   * - `false` (default): always keep the spacer.
   * - `true`: always collapse it. Only for surfaces entered exclusively by tap.
   * - `'user-initiated'`: collapse ONLY when the header hides right after real user
   *   input. /multiplayer needs this third option because both absolutes are wrong
   *   there — always keeping the spacer leaves an empty band above the room lobby's
   *   own sticky header, and always collapsing it regressed CLS to 0.979 on
   *   reconnect, where `isInGame` flips ~200ms after mount with no input at all.
   */
  collapseSpacerWhenHidden?: boolean | 'user-initiated';
}

/**
 * Whether the user has interacted with this page at all — i.e. whether a layout
 * shift now is plausibly the consequence of their own tap.
 *
 * Deliberately `hasBeenActive` (sticky for the page lifetime) and NOT `isActive`
 * (a transient ~5s window). Joining a room is a socket round-trip, so by the time
 * `isInGame` flips the transient activation may already have expired — reading
 * `isActive` would keep the spacer on exactly the tap path this is meant to
 * collapse, and the empty band would survive with every test still green. The two
 * cases we must separate are "user tapped into a room" (interaction happened) and
 * "socket reconnected ~200ms after a fresh page load" (no interaction possible
 * yet), and stickiness answers that correctly.
 *
 * Absent in older browsers → false → spacer kept, i.e. today's behaviour. Never worse.
 */
function hasUserInteracted(): boolean {
  if (typeof navigator === 'undefined') return false;
  return !!(navigator as Navigator & { userActivation?: { hasBeenActive: boolean } })
    .userActivation?.hasBeenActive;
}

/**
 * AutoHideHeader - Header wrapper component
 *
 * Hides the header during:
 * - TV fullscreen mode (broadcast)
 * - Active gameplay (game pages have their own in-game controls)
 * - CrazyGames embed: portal provides its own chrome and the in-app header has
 *   no menu/auth/dropdown to render anyway (e4a3ef8a, 65e790e7). Removing the
 *   header also drops its sibling spacer, fixing the visible empty band that
 *   the fixed-header + spacer pattern produced on CG.
 * In landscape mode it uses static positioning (handled by the Header component's landscape:static class).
 */
export function AutoHideHeader({ className, onVisibilityChange, collapseSpacerWhenHidden = false }: AutoHideHeaderProps) {
  const isTvFullscreen = useTvFullscreenListener();
  const { isInGame } = useNavigation();
  const { isOnCrazyGamesPlatform } = useCrazyGames();

  const isVisible = !isOnCrazyGamesPlatform && !isTvFullscreen && !isInGame;
  const isHidden = isTvFullscreen || isInGame;

  // Latched in state, not read live: userActivation is a browser-only read (so it
  // cannot happen during SSR/first render) and `hasBeenActive` must be sampled at
  // the moment the header hides — re-reading it later would let the spacer pop
  // back in mid-game and cause the very shift this exists to avoid.
  const [userInitiatedCollapse, setUserInitiatedCollapse] = useState(false);
  useEffect(() => {
    setUserInitiatedCollapse(
      isHidden && collapseSpacerWhenHidden === 'user-initiated' && hasUserInteracted(),
    );
  }, [isHidden, collapseSpacerWhenHidden]);

  // `true` stays synchronous — routing it through the effect would render the
  // spacer for one frame before collapsing, adding a visible blip to surfaces
  // (the daily game) that collapse cleanly today.
  const collapseSpacer = collapseSpacerWhenHidden === true || userInitiatedCollapse;

  // Report visibility from an effect, never from the render body: the parent
  // typically setStates in this callback, and calling it during render is a
  // setState-during-render of another component (React warning + extra render
  // pass on every header render). The ref keeps an unstable inline callback
  // from re-firing the effect — it should fire only when visibility changes.
  const onVisibilityChangeRef = useRef(onVisibilityChange);
  onVisibilityChangeRef.current = onVisibilityChange;

  useEffect(() => {
    onVisibilityChangeRef.current?.(isVisible);
  }, [isVisible]);

  // CrazyGames: portal provides its own chrome — remove header AND spacer (empty band fix e4a3ef8a)
  if (isOnCrazyGamesPlatform) {
    return null;
  }

  // TV fullscreen or active gameplay: hide the visible header but keep the spacer div.
  // Header uses fixed+spacer pattern — removing both causes CLS 0.29 on /en/multiplayer
  // as the spacer-height slot collapses and content shifts up by 60–124px.
  if (isHidden) {
    // Focused full-screen game surfaces opt out of the reserved spacer so the
    // hidden header leaves no empty band at the top (see prop docs above).
    if (collapseSpacer) {
      return null;
    }
    return (
      <div
        aria-hidden="true"
        className="h-header pb-1 lg:pb-2 short:pb-0 medium-short:pb-0.5 min-h-[60px] sm:min-h-[70px] md:min-h-[114px] lg:min-h-[124px] short:min-h-[44px] medium-short:min-h-[52px] md:short:min-h-[48px] lg:short:min-h-[52px] desktop-short:lg:min-h-[56px] desktop-medium-short:lg:min-h-[80px]"
      />
    );
  }

  return <Header className={className} />;
}

export default AutoHideHeader;
