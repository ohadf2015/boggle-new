'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import RoomListView from './RoomListView';
import JoinRoomModal from './JoinRoomModal';
import CreateRoomModal from './CreateRoomModal';
import type { Language, ActiveRoom } from '@/shared/types/game';
import {
  getStoredUsername,
  hasCompleteStoredProfile,
} from '@/utils/profileStorage';
import { useCrazyGamesInvite } from '@/hooks/useCrazyGamesInvite';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { SeasonBanner } from '@/components/multiplayer/SeasonBanner';
import { MatchmakingOverlay } from '@/components/multiplayer/MatchmakingOverlay';
import { useMatchmaking } from '@/hooks/useMatchmaking';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

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
    options?: { isPrivate?: boolean; quickPlay?: boolean },
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
  profileAvatar,
  setGameCode,
  setUsername,
  setRoomName,
  setHostUsername,
}) => {
  const { t } = useLanguage();
  const { isAdmin, profile } = useAuth();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
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

  // UX-007: Track which room is being joined to show per-card loading state
  const [joiningRoomCode, setJoiningRoomCode] = useState<string | null>(null);

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
      if (hasProfile()) {
        // Auto-join directly - no modal needed
        const profile = getProfileData();
        setGameCode(roomCode);
        setUsername(profile.username);
        // Classroom host flow: teacher pre-generated gameCode upstream, so we
        // must CREATE a private room with that exact code rather than join.
        if (host) {
          setRoomName(`${profile.username} Room`);
          setHostUsername(profile.username);
          handleJoin(true, defaultLanguage, roomCode, `${profile.username} Room`, profile.username, { isPrivate: true });
          return;
        }
        // Pass username as override to avoid stale closure in handleJoin
        handleJoin(false, null, roomCode, undefined, profile.username);
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
    [hasProfile, getProfileData, handleJoin, setGameCode, setUsername, setRoomName, setHostUsername, defaultLanguage, host]
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
    if (!isJoining) setJoiningRoomCode(null);
  }, [isJoining]);

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
    // Get or generate username for quick play
    const quickPlayUsername = isAuthenticated && displayName
      ? displayName
      : getStoredUsername() || `Player${Math.floor(Math.random() * 1000)}`;

    const gameCode = generateGameCode();
    const roomName = `${quickPlayUsername} Room`;

    setGameCode(gameCode);
    setRoomName(roomName);
    setHostUsername(quickPlayUsername);
    setUsername(quickPlayUsername);

    // Create public room immediately with host playing and auto-start the game.
    // Public so other players (web + CrazyGames) can discover it in the lobby.
    handleJoin(true, defaultLanguage, gameCode, roomName, quickPlayUsername, { quickPlay: true });

    // Show CrazyGames invite button so host can invite friends
    cgShowInvite(gameCode);

  }, [isAuthenticated, displayName, defaultLanguage, handleJoin, setGameCode, setRoomName, setHostUsername, setUsername, cgShowInvite]);

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

  // CrazyGames Smart Auto-Join: join an open room or quick-play on first load
  useEffect(() => {
    if (!isOnCrazyGamesPlatform) return;
    // Wait for the CG SDK to finish handshaking so leaderboard/ad calls
    // emitted as a side-effect of joining a room don't no-op silently.
    if (!isCrazyGamesReady) return;
    if (cgAutoJoinHandledRef.current) return;
    if (cgInviteHandledRef.current) return;
    if (prefilledRoom) return;
    if (autoCreate) return;
    if (roomsLoading) return;

    // Only auto-join on the very first visit this session — not after quitting a room
    try {
      if (sessionStorage.getItem('boggle_cg_auto_joined')) return;
    } catch { /* storage blocked */ }

    cgAutoJoinHandledRef.current = true;

    try {
      sessionStorage.setItem('boggle_cg_auto_joined', '1');
    } catch { /* storage blocked */ }

    const joinableRoom = activeRooms.find(
      (r) => r.gameState === 'waiting' && r.playerCount < (r.maxPlayers || 8),
    );

    const decision = joinableRoom ? 'auto_join_room' : 'quick_play';
    trackGrowthEvent('cg_lobby_arrival', {
      decision,
      activeRoomCount: activeRooms.length,
      joinableRoomCount: activeRooms.filter(
        (r) => r.gameState === 'waiting' && r.playerCount < (r.maxPlayers || 8),
      ).length,
    });

    if (joinableRoom) {
      handleRoomClick(joinableRoom);
    } else {
      handleQuickPlay();
    }
  }, [isOnCrazyGamesPlatform, isCrazyGamesReady, roomsLoading, activeRooms, prefilledRoom, autoCreate, handleRoomClick, handleQuickPlay]);

  // CG SDK initializes async — but blocking the lobby on it kills first-paint
  // and tanks gameplay-conversion. Show the lobby immediately; auto-join waits
  // for SDK ready (effect above) so platform calls fire correctly when they fire.

  // Always show RoomListView as base, with modals as overlays
  return (
    <>
      {/* SeasonBanner returns null for unranked users — render its wrapper
          padding only when something will actually appear, so non-admin
          unranked players don't get a 12px ghost gap above ARENA HUB. */}
      <SeasonBanner />
      {isAdmin && (
        <div className="px-4 pt-3">
          <button
            onClick={() => matchmaking.joinQueue('classic', defaultLanguage)}
            disabled={matchmaking.status !== 'idle'}
            className="w-full rounded-neo border-neo bg-neo-pink px-4 py-3 font-neo-display text-neo-white shadow-hard-sm transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed disabled:opacity-50"
          >
            ⚔️ {t('matchmaking.rankedMatch')}
          </button>
        </div>
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

      {/* UX-014: Room fetch timeout retry banner */}
      {roomFetchTimedOut && !roomsLoading && activeRooms.length === 0 && (
        <div className="mx-4 mb-3 p-3 bg-neo-red/20 border-2 border-neo-red rounded-neo flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-neo-white">
            {t('multiplayerFlow.roomList.fetchTimeout')}
          </p>
          <button
            onClick={refreshRooms}
            className="text-sm font-black uppercase text-neo-red border-2 border-neo-red rounded-neo px-3 py-1 hover:bg-neo-red/30 transition-colors"
          >
            {t('multiplayerFlow.roomList.retry')}
          </button>
        </div>
      )}

      <RoomListView
        activeRooms={activeRooms}
        roomsLoading={roomsLoading}
        onRefreshRooms={refreshRooms}
        onRoomClick={handleRoomClick}
        onCreateRoom={handleCreateClick}
        onQuickPlay={handleQuickPlay}
        isQuickPlayLoading={!!joiningRoomCode || isJoining}
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
