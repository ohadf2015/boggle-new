'use client';

/**
 * Quick Play for the MP entry: join an existing compatible room or host a
 * public one, with the eager-disable and match-seeking experiments. Split out
 * of MultiplayerFlow (FOUNDATION 2026-09-26); code moved verbatim.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import type { Language, ActiveRoom } from '@/shared/types/game';
import { getOrCreateStoredUsername } from '@/utils/profileStorage';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { selectQuickPlayRoom } from '@/lib/multiplayer/selectQuickPlayRoom';
import { useExperiment } from '@/hooks/useExperiment';
import type { MultiplayerFlowProps } from './MultiplayerFlow';

export function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

interface UseQuickPlayInput {
  handleJoin: MultiplayerFlowProps['handleJoin'];
  activeRooms: ActiveRoom[];
  isJoining: boolean;
  isAuthenticated: boolean;
  displayName: string;
  defaultLanguage: Language;
  quickPlay?: boolean;
  setGameCode: (code: string) => void;
  setUsername: (name: string) => void;
  setRoomName: (name: string) => void;
  setHostUsername: (name: string) => void;
  cgShowInvite: (gameCode: string) => void;
}

export function useQuickPlay({
  handleJoin, activeRooms, isJoining, isAuthenticated, displayName, defaultLanguage, quickPlay,
  setGameCode, setUsername, setRoomName, setHostUsername, cgShowInvite,
}: UseQuickPlayInput) {
  const { variant: seekingVariant, trackExposure: trackSeekingExposure } = useExperiment('exp-mp-quickplay-wait-v1');
  const { variant: eagerDisableVariant } = useExperiment('exp-mp-quickplay-eager-disable-v1');

  // exp-mp-quickplay-eager-disable-v1: local pending flag for immediate button disable.
  // Only used when eager-disable variant is active; control path never sets this.
  const [isQuickPlayPending, setIsQuickPlayPending] = useState(false);
  // Bounded fallback clear: the isJoining effect only clears this on `isJoining`
  // CHANGING to false, but handleJoin has early-return paths (socket not
  // connected) that never flip isJoining at all — leaving Quick Play stuck
  // disabled for the rest of the session (rage-click regression, 2026-08-07).
  const quickPlayPendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearQuickPlayPendingTimeout = useCallback(() => {
    if (quickPlayPendingTimeoutRef.current) {
      clearTimeout(quickPlayPendingTimeoutRef.current);
      quickPlayPendingTimeoutRef.current = null;
    }
  }, []);
  useEffect(() => clearQuickPlayPendingTimeout, [clearQuickPlayPendingTimeout]);
  // Dismissing the seeking overlay returns the lobby to the player. It does not
  // abort the in-flight join (socket listeners are owned by useMultiplayerJoin).
  // If the join then lands, the player enters the room they asked for — which
  // beats being held on a spinner they cannot leave.
  const [seekingDismissed, setSeekingDismissed] = useState(false);
  useEffect(() => {
    if (!isJoining) setSeekingDismissed(false); // re-arm for the next attempt
  }, [isJoining]);
  // isQuickPlayPending (eager-disable arm) can be true BEFORE isJoining flips —
  // without it here, that window shows a disabled button with zero feedback,
  // which is the exact rage-click pattern this overlay exists to prevent.
  const isSeekingOverlay =
    !!quickPlay &&
    (isJoining || isQuickPlayPending) &&
    seekingVariant === 'match-seeking' &&
    !seekingDismissed;
  useEffect(() => {
    if (!isSeekingOverlay) return;
    trackSeekingExposure();
    trackGrowthEvent('mp_quickplay_seeking', {});
  }, [isSeekingOverlay, trackSeekingExposure]);

  // Handle quick play - dual mode with sensible defaults
  const handleQuickPlay = useCallback(() => {
    // Re-entrancy guard: control-arm users (no eager-disable) see no visual
    // feedback until `isJoining` flips, so repeat taps re-ran this whole
    // handler — new room code, new handleJoin call — each tap (rage-click
    // driver on /multiplayer, PostHog rageclicks_24h). No-op + track instead.
    if (isJoining || isQuickPlayPending) {
      trackGrowthEvent('mp_quickplay_rapid_click', {});
      return;
    }
    // Get or generate username for quick play. Routed through the shared helper
    // so a guest keeps ONE identity across the create modal, the join modal, the
    // emit chokepoint and here (Class 3).
    const quickPlayUsername = isAuthenticated && displayName
      ? displayName
      : getOrCreateStoredUsername(defaultLanguage) || `Player${Math.floor(Math.random() * 1000)}`;

    // Consolidation (room-management fix): before spawning yet another solo
    // public lobby, try to drop the player into an EXISTING compatible waiting
    // room. selectQuickPlayRoom is race-tolerant: a room the (throttled)
    // activeRooms snapshot already lost fails like a stale room-card tap. Only
    // CASUAL classic rooms are auto-joined; ranked/other modes are never hijacked.
    const matchRoom = selectQuickPlayRoom(activeRooms, {
      language: defaultLanguage,
      gameMode: 'classic',
    });
    if (eagerDisableVariant === 'eager-disable') {
      setIsQuickPlayPending(true);
      clearQuickPlayPendingTimeout();
      quickPlayPendingTimeoutRef.current = setTimeout(() => {
        setIsQuickPlayPending(false);
      }, 8000);
      trackGrowthEvent('mp_quickplay_eager_shown', {});
    }
    trackGrowthEvent('mp_quickplay_initiated', { hadMatchRoom: !!matchRoom });
    if (matchRoom) {
      setGameCode(matchRoom.gameCode);
      setUsername(quickPlayUsername);
      // Join as a player via the same fast-join path as a room tap. `quickPlay:
      // true` here too — this is the SUCCESSFUL branch and must be reported.
      handleJoin(false, null, matchRoom.gameCode, undefined, quickPlayUsername, { quickPlay: true });
      return;
    }

    const gameCode = generateGameCode();
    const roomName = `${quickPlayUsername} Room`;

    setGameCode(gameCode);
    setRoomName(roomName);
    setHostUsername(quickPlayUsername);
    setUsername(quickPlayUsername);

    // No compatible room → create a PUBLIC room so the next Quick Play player
    // can consolidate into it. `quickPlay` still skips the alone-timer and
    // auto-fills bots so a solo player starts fast.
    handleJoin(true, defaultLanguage, gameCode, roomName, quickPlayUsername, { quickPlay: true });

    // Surface the CrazyGames invite button — quick games are discoverable.
    cgShowInvite(gameCode);
  }, [isJoining, isQuickPlayPending, isAuthenticated, displayName, defaultLanguage, activeRooms, handleJoin, setGameCode, setRoomName, setHostUsername, setUsername, cgShowInvite, eagerDisableVariant, clearQuickPlayPendingTimeout]);

  /** Called when a join settles (isJoining → false). */
  const clearQuickPlayPending = useCallback(() => {
    setIsQuickPlayPending(false);
    clearQuickPlayPendingTimeout();
  }, [clearQuickPlayPendingTimeout]);

  const dismissSeeking = useCallback(() => {
    trackGrowthEvent('mp_quickplay_seeking_dismissed', {});
    setSeekingDismissed(true);
  }, []);

  return { handleQuickPlay, isQuickPlayPending, isSeekingOverlay, clearQuickPlayPending, dismissSeeking };
}
