'use client';

/**
 * State machine + join actions behind the MP entry (`MultiplayerFlow`).
 * The view comes from the pure `resolveEntryView`, the sheets from
 * `entryFlowReducer` (lib/multiplayer/mpPhase). Split out of MultiplayerFlow
 * (FOUNDATION 2026-09-26); handler bodies moved verbatim.
 */
import { useState, useCallback, useEffect, useReducer, useRef } from 'react';
import type { Language, ActiveRoom } from '@/shared/types/game';
import {
  getStoredUsername,
  hasCompleteStoredProfile,
  setStoredUsername as persistStoredUsername,
} from '@/utils/profileStorage';
import { useCrazyGamesInvite } from '@/hooks/useCrazyGamesInvite';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { trackGrowthEvent, trackGuestJoin } from '@/utils/growthTracking';
import { useMatchmaking } from '@/hooks/useMatchmaking';
import { useCgLobbyHeroVariant } from '@/hooks/useCgLobbyHeroVariant';
import { entryFlowReducer, INITIAL_ENTRY_FLOW, resolveEntryView } from '@/lib/multiplayer/mpPhase';
import { sanitizeGameCode } from '@/lib/multiplayer/sanitizeGameCode';
import { useQuickPlay, generateGameCode } from './useQuickPlay';
import { codeTicket, resolveJoinTarget } from './entry/joinTarget';
import type { MultiplayerFlowProps } from './MultiplayerFlow';

export function useMultiplayerFlowState({
  handleJoin, activeRooms, roomsLoading, isJoining, isAuthenticated, displayName, prefilledRoom,
  autoCreate, quickPlay, defaultLanguage, host, isClassroomMode,
  setGameCode, setUsername, setRoomName, setHostUsername,
}: MultiplayerFlowProps) {
  const { isOnCrazyGamesPlatform, cgUser } = useCrazyGames();
  const matchmaking = useMatchmaking();

  // Auto-join ranked match room when found
  useEffect(() => {
    if (matchmaking.status !== 'found' || !matchmaking.roomId) return;
    const timer = setTimeout(() => {
      setGameCode(matchmaking.roomId!);
      handleJoin(false, defaultLanguage, matchmaking.roomId!);
    }, 1500); // Brief delay so player sees the opponent card
    return () => clearTimeout(timer);
  }, [matchmaking.status, matchmaking.roomId, handleJoin, defaultLanguage, setGameCode]);

  // Room list with create / join sheets (the entry state machine).
  const [flow, dispatchFlow] = useReducer(
    entryFlowReducer,
    autoCreate ? { view: 'create-modal' as const, selectedRoom: null } : INITIAL_ENTRY_FLOW,
  );
  const selectedRoom = flow.selectedRoom;

  // Classroom mode has no room list and no dismissible modal layer, so "this
  // student still owes us a name" is its own state rather than a flow view.
  const [needsClassroomName, setNeedsClassroomName] = useState(false);
  const classroomNameSubmittedRef = useRef(false);

  // UX-007: Track which room is being joined to show per-card loading state
  const [joiningRoomCode, setJoiningRoomCode] = useState<string | null>(null);

  // CG lobby diet: hero expansion state and variant
  const [heroExpanded, setHeroExpanded] = useState(false);
  const [heroDismissed, setHeroDismissed] = useState(false);
  const heroVariant = useCgLobbyHeroVariant(cgUser ?? null);

  // UX-014: Room fetch timeout — if rooms haven't loaded after 10s, show retry banner
  const [roomFetchTimedOut, setRoomFetchTimedOut] = useState(false);
  useEffect(() => {
    if (roomsLoading) {
      const timeout = setTimeout(() => setRoomFetchTimedOut(true), 10000);
      return () => clearTimeout(timeout);
    }
    setRoomFetchTimedOut(false);
    return undefined;
  }, [roomsLoading]);

  // Track whether CrazyGames invite was handled (prevents URL prefill from also firing)
  const cgInviteHandledRef = useRef(false);
  // Track whether CrazyGames auto-join was handled (prevents double-firing)
  const cgAutoJoinHandledRef = useRef(false);

  // CrazyGames invite integration
  const {
    isReady: isCrazyGamesReady,
    showInviteButton: cgShowInvite,
  } = useCrazyGamesInvite({
    // When player joins via CrazyGames invite link with roomId
    onInviteJoin: (roomId) => {
      cgInviteHandledRef.current = true;
      handleInvitationAutoJoin(roomId);
    },
    // When player starts via "Play with Friends" (instant multiplayer): straight to create
    onInstantMultiplayer: () => dispatchFlow({ type: 'OPEN_CREATE' }),
  });

  const { handleQuickPlay, isQuickPlayPending, isSeekingOverlay, clearQuickPlayPending, dismissSeeking } = useQuickPlay({
    handleJoin, activeRooms, isJoining, isAuthenticated, displayName, defaultLanguage, quickPlay,
    setGameCode, setUsername, setRoomName, setHostUsername, cgShowInvite,
  });

  // Check if user has a complete profile for auto-join
  const hasProfile = useCallback(() => {
    if (isAuthenticated) return !!displayName;
    return hasCompleteStoredProfile();
  }, [isAuthenticated, displayName]);

  // Get user profile data for auto-join
  const getProfileData = useCallback(() => {
    if (displayName) return { username: displayName };
    return { username: getStoredUsername() || '' };
  }, [displayName]);

  // Handle auto-join for invitation links
  const handleInvitationAutoJoin = useCallback(
    (roomCode: string) => {
      // A classroom student needs a NAME and nothing else — the lobby generates
      // their avatar on arrival. If displayName or getStoredUsername() is available,
      // they can auto-join without being prompted again.
      const classroomName = displayName || getStoredUsername();
      const canAutoJoin =
        hasProfile() || (isClassroomMode && !!classroomName);

      if (canAutoJoin) {
        // Auth resolves a beat after mount, so a signed-in student can reach the
        // prompt first and then land here. Clearing this takes the form off
        // screen so a submit can't fire a second join under a different name.
        setNeedsClassroomName(false);
        // Auto-join directly - no modal needed
        const profile = getProfileData();
        if (!isAuthenticated) {
          trackGuestJoin(profile.username, roomCode, defaultLanguage);
        }
        setGameCode(roomCode);
        setUsername(profile.username);
        // Classroom host flow: teacher pre-generated gameCode upstream, so we
        // must CREATE a private room with that exact code rather than join.
        if (host) {
          setRoomName(`${profile.username} Room`);
          setHostUsername(profile.username);
          // Audit T4 (2026-05-10): mark room as classroom so server skips
          // auto-host-transfer if teacher disconnects.
          handleJoin(true, defaultLanguage, roomCode, `${profile.username} Room`, profile.username, { isPrivate: true, isClassroom: true });
          return;
        }
        // Pass username as override to avoid stale closure in handleJoin
        handleJoin(false, null, roomCode, undefined, profile.username);
      } else if (isClassroomMode) {
        // Classroom students never see the public join modal. Ask for a name,
        // nothing else — and once answered, never again (this re-fires when
        // auth resolves, and the prompt would reappear ON TOP of the join).
        if (classroomNameSubmittedRef.current) return;
        setNeedsClassroomName(true);
      } else {
        // Need to collect profile — the join sheet for this code (the sheet
        // resolves the live listing for it; see entry/joinTarget).
        dispatchFlow({ type: 'OPEN_JOIN', room: codeTicket(roomCode, defaultLanguage) });
      }
    },
    [hasProfile, getProfileData, handleJoin, setGameCode, setUsername, setRoomName, setHostUsername, defaultLanguage, host, isAuthenticated, isClassroomMode]
  );

  // The student typed a name. Persist it (so a refresh mid-lesson does not ask
  // again), then take the exact same join path a guest with a stored profile
  // takes — one route to the room, not two that can drift.
  const handleClassroomNameSubmit = useCallback(
    (name: string) => {
      if (!prefilledRoom) return;
      classroomNameSubmittedRef.current = true;
      persistStoredUsername(name);
      setNeedsClassroomName(false);
      setGameCode(prefilledRoom);
      setUsername(name);
      // Same fork as `handleInvitationAutoJoin`: on `?host=true` the code was
      // minted upstream and this client CREATES that room.
      if (host) {
        setRoomName(`${name} Room`);
        setHostUsername(name);
        handleJoin(true, defaultLanguage, prefilledRoom, `${name} Room`, name, {
          isPrivate: true,
          isClassroom: true,
        });
        return;
      }
      trackGuestJoin(name, prefilledRoom, defaultLanguage);
      handleJoin(false, null, prefilledRoom, undefined, name);
    },
    [prefilledRoom, defaultLanguage, handleJoin, setGameCode, setUsername, setRoomName, setHostUsername, host]
  );

  // JOIN BY CODE from the entry: the same join an invite link takes for a
  // player (profile → join, otherwise the join sheet for that code) — but a
  // typed code always JOINS. It never takes the classroom-host branch of
  // handleInvitationAutoJoin, which CREATES a private room with the code.
  const handleCodeJoin = useCallback(
    (raw: string) => {
      const code = sanitizeGameCode(raw).toUpperCase();
      if (!code) return;
      if (hasProfile()) {
        const profile = getProfileData();
        if (!isAuthenticated) trackGuestJoin(profile.username, code, defaultLanguage);
        setGameCode(code);
        setUsername(profile.username);
        handleJoin(false, null, code, undefined, profile.username);
        return;
      }
      dispatchFlow({ type: 'OPEN_JOIN', room: codeTicket(code, defaultLanguage) });
    },
    [hasProfile, getProfileData, isAuthenticated, defaultLanguage, setGameCode, setUsername, handleJoin],
  );

  // NOTE: CrazyGames invite is handled via the onInviteJoin callback above.
  // Do NOT add a separate effect for inviteRoomId — it causes a double-join race.

  // Handle URL prefilled room code (invitation links)
  useEffect(() => {
    if (cgInviteHandledRef.current) return; // Skip if CrazyGames invite already handled
    if (!prefilledRoom) return;
    handleInvitationAutoJoin(prefilledRoom);
  }, [prefilledRoom, handleInvitationAutoJoin]);

  // Room click from the list. Auth users / guests with a profile fast-join.
  const handleRoomClick = useCallback((room: ActiveRoom) => {
    if (isAuthenticated && displayName) {
      setJoiningRoomCode(room.gameCode);
      setGameCode(room.gameCode);
      setUsername(displayName);
      handleJoin(false, null, room.gameCode, undefined, displayName);
      return;
    }
    if (hasProfile()) {
      const profile = getProfileData();
      setJoiningRoomCode(room.gameCode);
      setGameCode(room.gameCode);
      setUsername(profile.username);
      handleJoin(false, null, room.gameCode, undefined, profile.username);
      return;
    }
    // No profile — show modal to collect username/avatar
    dispatchFlow({ type: 'OPEN_JOIN', room });
  }, [isAuthenticated, displayName, hasProfile, getProfileData, handleJoin, setGameCode, setUsername]);

  // Clear joining state when join completes or fails
  useEffect(() => {
    if (!isJoining) {
      setJoiningRoomCode(null);
      clearQuickPlayPending();
    }
  }, [isJoining, clearQuickPlayPending]);

  const handleCreateClick = useCallback(() => dispatchFlow({ type: 'OPEN_CREATE' }), []);
  const handleModalClose = useCallback(() => dispatchFlow({ type: 'CLOSE' }), []);

  // Join from the join sheet (custom avatar is already stored by JoinRoomModal)
  const handleJoinFromModal = useCallback(
    (username: string) => {
      if (!selectedRoom) return;
      setGameCode(selectedRoom.gameCode);
      setUsername(username);
      handleJoin(false, null, selectedRoom.gameCode, undefined, username);
    },
    [selectedRoom, handleJoin, setGameCode, setUsername]
  );

  // Create from the create sheet
  const handleCreateFromModal = useCallback(
    (config: { hostUsername: string; roomName: string; language: Language }) => {
      const gameCode = generateGameCode();
      setGameCode(gameCode);
      setRoomName(config.roomName);
      setHostUsername(config.hostUsername);
      setUsername(config.hostUsername);
      // Username as override avoids a stale closure in handleJoin. Default
      // visibility = public; private is reserved for the classroom host flow.
      handleJoin(true, config.language, gameCode, config.roomName, config.hostUsername);
      // Show CrazyGames invite button so host can invite friends
      cgShowInvite(gameCode);
    },
    [handleJoin, setGameCode, setRoomName, setHostUsername, setUsername, cgShowInvite]
  );

  // Landing Quick Play auto-fire (`?quickPlay=true`): exactly once on mount,
  // ref-guarded against StrictMode double-invokes. `autoCreate` wins.
  const quickPlayHandledRef = useRef(false);
  useEffect(() => {
    if (!quickPlay) return;
    if (autoCreate) return;
    if (quickPlayHandledRef.current) return;
    quickPlayHandledRef.current = true;
    handleQuickPlay();
  }, [quickPlay, autoCreate, handleQuickPlay]);

  // CrazyGames lobby arrival — observability only, NEVER auto-join (policy
  // 2026-05-03: the platform must not silently throw the player into a room).
  useEffect(() => {
    if (!isOnCrazyGamesPlatform) return;
    if (!isCrazyGamesReady) return;
    if (cgAutoJoinHandledRef.current) return;
    if (cgInviteHandledRef.current) return;
    if (prefilledRoom) return;
    if (autoCreate) return;
    if (roomsLoading) return;

    try {
      if (sessionStorage.getItem('boggle_cg_lobby_logged')) return;
    } catch { /* storage blocked */ }

    cgAutoJoinHandledRef.current = true;

    try {
      sessionStorage.setItem('boggle_cg_lobby_logged', '1');
    } catch { /* storage blocked */ }

    const joinableRoomCount = activeRooms.filter(
      (r) => r.gameState === 'waiting' && r.playerCount < (r.maxPlayers || 8),
    ).length;

    trackGrowthEvent('cg_lobby_arrival', {
      decision: 'show_lobby',
      activeRoomCount: activeRooms.length,
      joinableRoomCount,
    });
  }, [isOnCrazyGamesPlatform, isCrazyGamesReady, roomsLoading, activeRooms, prefilledRoom, autoCreate]);

  // CG lobby hero — shown immediately (auto-join is gone, nothing to wait for).
  const showCgHero = isOnCrazyGamesPlatform && !isClassroomMode && !heroDismissed;

  const entryView = resolveEntryView({
    isClassroomMode: !!isClassroomMode,
    prefilledRoom: prefilledRoom ?? '',
    needsClassroomName,
    isSeekingOverlay,
  });

  // The join sheet's room comes from the live listing whichever path opened it.
  const joinTarget = resolveJoinTarget(selectedRoom, activeRooms);

  return {
    entryView, flowView: flow.view, selectedRoom, joinTarget, matchmaking, joiningRoomCode, roomFetchTimedOut,
    isQuickPlayPending, showCgHero, heroExpanded, heroVariant,
    openCreate: handleCreateClick, handleModalClose, handleRoomClick, handleJoinFromModal, handleCreateFromModal,
    handleQuickPlay, handleClassroomNameSubmit, dismissSeeking, handleCodeJoin,
    onHeroPlay: () => { heroVariant.markSeen(); handleQuickPlay(); },
    onHeroBrowse: () => { heroVariant.markSeen(); setHeroExpanded(true); setHeroDismissed(true); },
  };
}
