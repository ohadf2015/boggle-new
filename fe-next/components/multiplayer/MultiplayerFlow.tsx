'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import JoinRoomModal from './JoinRoomModal';
import CreateRoomModal from './CreateRoomModal';
import CgLobbyHero from './CgLobbyHero';
import CgAwareLobbyChrome from './CgAwareLobbyChrome';
import type { Language, ActiveRoom } from '@/shared/types/game';
import {
  getStoredUsername,
  getOrCreateStoredUsername,
  hasCompleteStoredProfile,
  setStoredUsername as persistStoredUsername,
} from '@/utils/profileStorage';
import ClassroomJoinNamePrompt from './ClassroomJoinNamePrompt';
import { useCrazyGamesInvite } from '@/hooks/useCrazyGamesInvite';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { trackGrowthEvent, trackGuestJoin } from '@/utils/growthTracking';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { MatchmakingOverlay } from '@/components/multiplayer/MatchmakingOverlay';
import { useMatchmaking } from '@/hooks/useMatchmaking';
import { useCgLobbyHeroVariant } from '@/hooks/useCgLobbyHeroVariant';
import { selectQuickPlayRoom } from '@/lib/multiplayer/selectQuickPlayRoom';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { useExperiment } from '@/hooks/useExperiment';
import { QuickPlaySeekingOverlay } from '@/components/multiplayer/QuickPlaySeekingOverlay';
import { NativeLanguageBanner } from '@/components/NativeLanguageBanner';
import { FirstGameLanguageNotice } from '@/components/FirstGameLanguageNotice';

type FlowState = 'room-list' | 'join-modal' | 'create-modal';

function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

interface MultiplayerFlowProps {
  // Callbacks
  handleJoin: (
    isHostMode: boolean,
    roomLanguage?: Language | null,
    gameCode?: string,
    roomName?: string,
    overrideUsername?: string,
    options?: { isPrivate?: boolean; isClassroom?: boolean; quickPlay?: boolean },
  ) => void;
  refreshRooms: () => void;

  // State from parent
  activeRooms: ActiveRoom[];
  roomsLoading: boolean;
  isJoining: boolean;
  isAuthenticated: boolean;
  displayName: string;
  prefilledRoom?: string;
  defaultLanguage: Language;

  // When true and prefilledRoom is set, auto-CREATE a private room with that
  // gameCode rather than auto-joining. Used by the classroom flow where the
  // teacher generates the gameCode upstream (see ClassroomGameLobby) and
  // expects to host the room with that exact code.
  host?: boolean;

  // When true, suppress the public lobby chrome (RoomListView, SeasonBanner,
  // admin Ranked button) — classroom users have a code via ClassroomModeBanner
  // and shouldn't see competing matchmaking CTAs while auto-join is in flight.
  isClassroomMode?: boolean;

  // Auto-create room on mount (e.g., from Word Hunt banner)
  autoCreate?: boolean;

  // Auto-fire Quick Play on mount (e.g., from landing Quick Play card).
  // Mutually exclusive with autoCreate; if both are passed, autoCreate wins.
  quickPlay?: boolean;

  // Profile avatar for authenticated users
  profileAvatar?: CustomAvatarConfig | null;

  // CrazyGames login callback
  onCrazyGamesLogin?: (() => void) | undefined;

  // Form state setters (for compatibility)
  setGameCode: (code: string) => void;
  setUsername: (name: string) => void;
  setRoomName: (name: string) => void;
  setHostUsername: (name: string) => void;
}

/**
 * MultiplayerFlow - Orchestrator for the multiplayer flow
 * New simplified state machine: room-list -> join-modal/create-modal overlays
 */
const MultiplayerFlow: React.FC<MultiplayerFlowProps> = ({
  handleJoin,
  refreshRooms,
  activeRooms,
  roomsLoading,
  isJoining,
  isAuthenticated,
  displayName,
  prefilledRoom,
  autoCreate,
  quickPlay,
  defaultLanguage,
  host,
  isClassroomMode,
  profileAvatar,
  setGameCode,
  setUsername,
  setRoomName,
  setHostUsername,
}) => {
  const { t } = useLanguage();
  const { isAdmin, profile } = useAuth();
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

  // Flow state - simplified to room-list with modal overlays
  const [flowState, setFlowState] = useState<FlowState>(autoCreate ? 'create-modal' : 'room-list');
  const [selectedRoom, setSelectedRoom] = useState<ActiveRoom | null>(null);

  // Classroom mode has no room list and no dismissible modal layer, so "this
  // student still owes us a name" is its own state rather than a `flowState`
  // value. `flowState` is reset to 'room-list' by every modal close, which under
  // the classroom early-return means falling back onto the waiting spinner.
  const [needsClassroomName, setNeedsClassroomName] = useState(false);
  const classroomNameSubmittedRef = useRef(false);

  // UX-007: Track which room is being joined to show per-card loading state
  const [joiningRoomCode, setJoiningRoomCode] = useState<string | null>(null);

  // CG lobby diet: hero expansion state and variant
  const [heroExpanded, setHeroExpanded] = useState(false);
  const [heroDismissed, setHeroDismissed] = useState(false);
  const heroVariant = useCgLobbyHeroVariant(cgUser ?? null);

  const { variant: seekingVariant, trackExposure: trackSeekingExposure } = useExperiment('exp-mp-quickplay-wait-v1');
  const { variant: eagerDisableVariant } = useExperiment('exp-mp-quickplay-eager-disable-v1');

  // exp-mp-quickplay-eager-disable-v1: local pending flag for immediate button disable.
  // Only used when eager-disable variant is active; control path never sets this.
  const [isQuickPlayPending, setIsQuickPlayPending] = useState(false);
  // Bounded fallback clear: the effect below only clears this on `isJoining`
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
  // abort the in-flight join: `isJoining` is a prop with no setter here, and the
  // socket listeners are owned by useMultiplayerJoin. If the join then lands, the
  // player enters the room they asked for — which beats being held on a spinner
  // they cannot leave. A true abort needs a cancel path through the join hook.
  const [seekingDismissed, setSeekingDismissed] = useState(false);
  useEffect(() => {
    if (!isJoining) setSeekingDismissed(false); // re-arm for the next attempt
  }, [isJoining]);
  // isQuickPlayPending (eager-disable arm) can be true BEFORE isJoining flips —
  // without it here, that window shows a disabled button with zero feedback,
  // which is the exact rage-click pattern this overlay exists to prevent.
  const isSeekingOverlay =
    quickPlay &&
    (isJoining || isQuickPlayPending) &&
    seekingVariant === 'match-seeking' &&
    !seekingDismissed;
  useEffect(() => {
    if (!isSeekingOverlay) return;
    trackSeekingExposure();
    trackGrowthEvent('mp_quickplay_seeking', {});
  }, [isSeekingOverlay, trackSeekingExposure]);

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
    // When player starts via "Play with Friends" (instant multiplayer)
    onInstantMultiplayer: () => {
      // Go directly to create room modal
      setFlowState('create-modal');
    },
  });

  // Check if user has a complete profile for auto-join
  const hasProfile = useCallback(() => {
    if (isAuthenticated) {
      return !!displayName;
    }
    return hasCompleteStoredProfile();
  }, [isAuthenticated, displayName]);

  // Get user profile data for auto-join
  const getProfileData = useCallback(() => {
    if (isAuthenticated && displayName) {
      return { username: displayName };
    }
    return { username: getStoredUsername() || '' };
  }, [isAuthenticated, displayName]);

  // Handle auto-join for invitation links
  const handleInvitationAutoJoin = useCallback(
    (roomCode: string) => {
      // A classroom student needs a NAME and nothing else — the lobby generates
      // their avatar on arrival. `hasProfile()` additionally demands an avatar id,
      // which the classroom prompt has no honest value to write, so a student who
      // refreshed mid-lesson would be asked for a name they had already given.
      const canAutoJoin =
        hasProfile() || (isClassroomMode && !isAuthenticated && !!getStoredUsername());

      if (canAutoJoin) {
        // Auth resolves a beat after mount, so a signed-in student can reach the
        // prompt first and then land here. Clearing this is what takes the form
        // off screen — otherwise they type into it while this join is in flight
        // and a submit fires a second one under a different name.
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
          // auto-host-transfer if teacher disconnects. Prevents student
          // silent-promotion to teacher authority.
          handleJoin(true, defaultLanguage, roomCode, `${profile.username} Room`, profile.username, { isPrivate: true, isClassroom: true });
          return;
        }
        // Pass username as override to avoid stale closure in handleJoin
        handleJoin(false, null, roomCode, undefined, profile.username);
      } else if (isClassroomMode) {
        // Classroom students never see the public join modal — it offers an
        // avatar studio and a dismiss button, and dismissing lands them back on
        // the waiting spinner. Ask for a name, nothing else.
        //
        // Once they have answered, never ask again. This effect re-fires when
        // `isAuthenticated`/`displayName` resolve (both are in the callback's
        // deps), and the name we persisted is a username with no avatar id — so
        // `hasProfile()` is still false and the prompt would reappear ON TOP of
        // the join it just started.
        if (classroomNameSubmittedRef.current) return;
        setNeedsClassroomName(true);
      } else {
        // Need to collect profile - show join modal
        // Create a minimal room object for the modal
        setSelectedRoom({
          gameCode: roomCode,
          roomName: roomCode,
          playerCount: 0,
          language: defaultLanguage,
          gameState: 'waiting' as const,
          isRanked: false,
          createdAt: Date.now(),
        });
        setFlowState('join-modal');
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
      // minted upstream and this client CREATES that room. Joining a room that
      // does not exist yet would hang the teacher on the loader.
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

  // NOTE: CrazyGames invite is handled via the onInviteJoin callback above.
  // Do NOT add a separate effect for inviteRoomId — it causes a double-join race.

  // Handle URL prefilled room code (invitation links)
  useEffect(() => {
    // Skip if CrazyGames invite already handled
    if (cgInviteHandledRef.current) return;
    if (!prefilledRoom) return;

    handleInvitationAutoJoin(prefilledRoom);
  }, [prefilledRoom, handleInvitationAutoJoin]);

  // Handle room click from list
  // Auth users with profile skip the modal entirely — instant join
  const handleRoomClick = useCallback((room: ActiveRoom) => {
    if (isAuthenticated && displayName) {
      // Fast-join: skip modal for authenticated users
      setJoiningRoomCode(room.gameCode);
      setGameCode(room.gameCode);
      setUsername(displayName);
      handleJoin(false, null, room.gameCode, undefined, displayName);
      return;
    }
    if (hasProfile()) {
      // Guest with stored profile — also fast-join
      const profile = getProfileData();
      setJoiningRoomCode(room.gameCode);
      setGameCode(room.gameCode);
      setUsername(profile.username);
      handleJoin(false, null, room.gameCode, undefined, profile.username);
      return;
    }
    // No profile — show modal to collect username/avatar
    setSelectedRoom(room);
    setFlowState('join-modal');
  }, [isAuthenticated, displayName, hasProfile, getProfileData, handleJoin, setGameCode, setUsername]);

  // Clear joining state when join completes or fails
  useEffect(() => {
    if (!isJoining) {
      setJoiningRoomCode(null);
      setIsQuickPlayPending(false);
      clearQuickPlayPendingTimeout();
    }
  }, [isJoining, clearQuickPlayPendingTimeout]);

  // Handle create room button
  const handleCreateClick = useCallback(() => {
    setFlowState('create-modal');
  }, []);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setFlowState('room-list');
    setSelectedRoom(null);
  }, []);

  // Handle join from modal
  const handleJoinFromModal = useCallback(
    (username: string) => {
      if (!selectedRoom) return;

      setGameCode(selectedRoom.gameCode);
      setUsername(username);

      // Custom avatar is already stored in localStorage by JoinRoomModal
      handleJoin(false, null, selectedRoom.gameCode, undefined, username);
    },
    [selectedRoom, handleJoin, setGameCode, setUsername]
  );

  // Handle create from modal
  const handleCreateFromModal = useCallback(
    (config: {
      hostUsername: string;
      roomName: string;
      language: Language;
    }) => {
      // Generate a random game code
      const gameCode = generateGameCode();

      setGameCode(gameCode);
      setRoomName(config.roomName);
      setHostUsername(config.hostUsername);
      setUsername(config.hostUsername);

      // Pass username as override to avoid stale closure in handleJoin.
      // Default room visibility = public (discoverable in lobby). Private opt-in
      // is reserved for classroom host flow (see handleInvitationAutoJoin).
      handleJoin(true, config.language, gameCode, config.roomName, config.hostUsername);

      // Show CrazyGames invite button so host can invite friends
      cgShowInvite(gameCode);
    },
    [handleJoin, setGameCode, setRoomName, setHostUsername, setUsername, cgShowInvite]
  );

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
    // emit chokepoint and here — the inline `Player###` this replaced was never
    // persisted, so quick play showed a different name every time (Class 3).
    const quickPlayUsername = isAuthenticated && displayName
      ? displayName
      : getOrCreateStoredUsername(defaultLanguage) || `Player${Math.floor(Math.random() * 1000)}`;

    // Consolidation (room-management fix): before spawning yet another solo
    // public lobby, try to drop the player into an EXISTING compatible waiting
    // room. Without this, every Quick Play click hosted a brand-new room, so
    // the arena filled with 1/50 ghost rooms that look live but have nobody to
    // play. selectQuickPlayRoom is race-tolerant: if it picks a room that the
    // (throttled) activeRooms snapshot already lost, the join simply fails the
    // same way a normal stale room-card tap does. We only auto-join CASUAL
    // classic rooms; ranked/blast/other modes are never hijacked.
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
      // Join as a player (not host) via the same fast-join path as a room tap.
      // `quickPlay: true` must be passed here too — this is the SUCCESSFUL branch
      // (a real room was found), and omitting it made the best outcome the one that
      // went unreported, while the create-a-room fallback below did report.
      handleJoin(false, null, matchRoom.gameCode, undefined, quickPlayUsername, { quickPlay: true });
      return;
    }

    const gameCode = generateGameCode();
    const roomName = `${quickPlayUsername} Room`;

    setGameCode(gameCode);
    setRoomName(roomName);
    setHostUsername(quickPlayUsername);
    setUsername(quickPlayUsername);

    // No compatible room to join → create a PUBLIC room so it surfaces in the
    // lobby and the next Quick Play player can consolidate into it. `quickPlay`
    // still skips the alone-timer and auto-fills bots so a solo player starts
    // fast. Only explicitly private flows (classroom) stay hidden / invite-only.
    handleJoin(true, defaultLanguage, gameCode, roomName, quickPlayUsername, { quickPlay: true });

    // Surface the CrazyGames invite button — quick games are now discoverable,
    // so inviting friends to join is a valid affordance.
    cgShowInvite(gameCode);

  }, [isJoining, isQuickPlayPending, isAuthenticated, displayName, defaultLanguage, activeRooms, handleJoin, setGameCode, setRoomName, setHostUsername, setUsername, cgShowInvite, eagerDisableVariant, clearQuickPlayPendingTimeout]);

  // Landing Quick Play auto-fire: when the user arrives via
  // `/multiplayer?quickPlay=true`, kick off `handleQuickPlay` exactly once on
  // mount. We guard with a ref so React StrictMode double-invokes (and any
  // re-renders) don't double-create rooms. `autoCreate` takes precedence so
  // both flags can't fight.
  const quickPlayHandledRef = useRef(false);
  useEffect(() => {
    if (!quickPlay) return;
    if (autoCreate) return;
    if (quickPlayHandledRef.current) return;
    quickPlayHandledRef.current = true;
    handleQuickPlay();
  }, [quickPlay, autoCreate, handleQuickPlay]);

  // CrazyGames lobby arrival — observability only, NEVER auto-join.
  //
  // Policy (2026-05-03): the platform must not silently throw the player into
  // a stranger's room or a quick-play match on landing. Auto-joins were
  // surprising and stripped users of agency — they'd suddenly be losing a
  // ranked match they didn't ask for. Lobby renders, user chooses. The CG
  // hero card + Quick Play button + room list are the entry points.
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

  // CG SDK initializes async — but blocking the lobby on it kills first-paint
  // and tanks gameplay-conversion. Show the lobby immediately; auto-join waits
  // for SDK ready (effect above) so platform calls fire correctly when they fire.

  // CG lobby hero — show immediately. The previous "pending" gate existed to
  // hide the hero while smart auto-join was deciding; auto-join is gone, so
  // there's nothing to wait for.
  const showCgHero = isOnCrazyGamesPlatform && !isClassroomMode && !heroDismissed;

  // Classroom mode: suppress public-lobby chrome. Auto-join effects above still
  // run (handleInvitationAutoJoin fires from prefilledRoom), so the host's room
  // is created/joined the same way — only the UI is replaced with a waiting
  // loader. The ClassroomModeBanner upstream already shows the share code + QR.
  //
  // Guarded on `prefilledRoom`: the loader is only honest while a real room is being
  // joined or created. A student who pressed "Play with class" with no game running
  // arrived as `?classroom=true&autoCreate=true` with NO `room=` — nothing to join,
  // nothing to create, and this branch returned before the create modal could render.
  // They sat on a spinner that could never resolve. Without a room, fall through to the
  // normal lobby so there is always something to act on.
  //
  // A guest with NO stored profile (the QR target, the share link and the
  // student dashboard's "JOIN NOW" all land here) cannot be auto-joined: the
  // server needs a name. That used to leave them on the loader below forever,
  // because `handleInvitationAutoJoin` asked for the join modal and this early
  // return fired before any modal could mount. Ask them, in place, first.
  //
  // Students routed through `/join/[code]` never see this — that page collects
  // a name of its own and arrives with one stored.
  if (isClassroomMode && prefilledRoom && needsClassroomName) {
    return (
      <ClassroomJoinNamePrompt
        roomCode={prefilledRoom}
        onSubmit={handleClassroomNameSubmit}
        initialName={getStoredUsername() || ''}
        disabled={isJoining}
      />
    );
  }

  if (isClassroomMode && prefilledRoom) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-8" data-testid="classroom-waiting">
        <div className="flex flex-col items-center gap-3 text-neo-white font-neo-body">
          <div className="w-10 h-10 rounded-full border-4 border-neo-cyan/30 border-t-neo-cyan animate-spin" aria-hidden="true" />
          <p className="text-sm sm:text-base">{t('education.classroomGame.waitingForPlayers')}</p>
        </div>
      </div>
    );
  }

  if (isSeekingOverlay) {
    return (
      <QuickPlaySeekingOverlay
        t={t as (key: string) => string}
        onCancel={() => {
          trackGrowthEvent('mp_quickplay_seeking_dismissed', {});
          setSeekingDismissed(true);
        }}
      />
    );
  }

  // Always show RoomListView as base, with modals as overlays
  return (
    <>
      <NativeLanguageBanner />
      <FirstGameLanguageNotice />
      {showCgHero && (
        <CgLobbyHero
          variant={heroVariant.variant}
          displayName={heroVariant.displayName}
          onPlay={() => {
            heroVariant.markSeen();
            handleQuickPlay();
          }}
          onBrowse={() => {
            heroVariant.markSeen();
            setHeroExpanded(true);
            setHeroDismissed(true);
          }}
        />
      )}

      {(!showCgHero || heroExpanded) && (
        <CgAwareLobbyChrome
          isAdmin={isAdmin}
          defaultLanguage={defaultLanguage}
          activeRooms={activeRooms}
          roomsLoading={roomsLoading}
          roomFetchTimedOut={roomFetchTimedOut}
          joiningRoomCode={joiningRoomCode}
          isJoining={isJoining || isQuickPlayPending}
          onRefreshRooms={refreshRooms}
          onRoomClick={handleRoomClick}
          onCreateRoom={handleCreateClick}
          onQuickPlay={handleQuickPlay}
          matchmaking={matchmaking}
        />
      )}

      <MatchmakingOverlay
        status={matchmaking.status}
        elo={profile?.ranked_mmr ?? 1000}
        eloRange={matchmaking.eloRange}
        queueSize={matchmaking.queueSize}
        waitTime={matchmaking.waitTime}
        opponent={matchmaking.opponent}
        onCancel={matchmaking.leaveQueue}
        onCreateRoom={() => { matchmaking.leaveQueue(); setFlowState('create-modal'); }}
        t={t as (key: string, params?: Record<string, unknown>) => string}
      />

      {/* Join Room Modal */}
      <JoinRoomModal
        isOpen={flowState === 'join-modal'}
        onClose={handleModalClose}
        room={selectedRoom}
        isJoining={isJoining}
        onJoin={handleJoinFromModal}
        isAuthenticated={isAuthenticated}
        displayName={displayName || null}
        profileAvatar={profileAvatar}
      />

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={flowState === 'create-modal'}
        onClose={handleModalClose}
        isCreating={isJoining}
        onCreate={handleCreateFromModal}
        defaultLanguage={defaultLanguage}
        isAuthenticated={isAuthenticated}
        displayName={displayName || null}
        profileAvatar={profileAvatar}
      />
    </>
  );
};

export default MultiplayerFlow;
