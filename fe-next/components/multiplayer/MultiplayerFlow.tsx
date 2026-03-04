'use client';

import React, { useState, useCallback, useEffect } from 'react';
import RoomListView from './RoomListView';
import JoinRoomModal from './JoinRoomModal';
import CreateRoomModal from './CreateRoomModal';
import type { Language, ActiveRoom } from '@/shared/types/game';
import {
  getStoredUsername,
  getStoredAvatarId,
  hasCompleteStoredProfile,
} from '@/utils/profileStorage';
import { useCrazyGamesInvite } from '@/hooks/useCrazyGamesInvite';
import { getAvatarEmojiAndColor } from '@/utils/avatarConfig';
import { PROFILE_AVATAR_ID } from '@/components/EmojiAvatarPicker';

type FlowState = 'room-list' | 'join-modal' | 'create-modal';

interface MultiplayerFlowProps {
  // Callbacks
  handleJoin: (
    isHostMode: boolean,
    roomLanguage?: Language | null,
    gameCode?: string,
    roomName?: string,
    overrideUsername?: string,
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

  // Profile avatar info for authenticated users
  profileAvatarId?: string;
  profilePictureUrl?: string | null;

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
  defaultLanguage,
  profileAvatarId,
  profilePictureUrl,
  setGameCode,
  setUsername,
  setRoomName,
  setHostUsername,
}) => {
  // Flow state - simplified to room-list with modal overlays
  const [flowState, setFlowState] = useState<FlowState>('room-list');
  const [selectedRoom, setSelectedRoom] = useState<ActiveRoom | null>(null);

  // CrazyGames invite integration
  const {
    isReady: isCrazyGamesReady,
    inviteRoomId,
    isInstantMultiplayer,
  } = useCrazyGamesInvite({
    // When player joins via CrazyGames invite link with roomId
    onInviteJoin: (roomId) => {
      // Try to auto-join if profile exists
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
      return !!(displayName && profileAvatarId);
    }
    return hasCompleteStoredProfile();
  }, [isAuthenticated, displayName, profileAvatarId]);

  // Get user profile data for auto-join
  const getProfileData = useCallback(() => {
    if (isAuthenticated && displayName) {
      return {
        username: displayName,
        avatarId: profileAvatarId || PROFILE_AVATAR_ID,
      };
    }
    return {
      username: getStoredUsername() || '',
      avatarId: getStoredAvatarId() || '',
    };
  }, [isAuthenticated, displayName, profileAvatarId]);

  // Handle auto-join for invitation links
  const handleInvitationAutoJoin = useCallback(
    (roomCode: string) => {
      if (hasProfile()) {
        // Auto-join directly - no modal needed
        const profile = getProfileData();
        setGameCode(roomCode);
        setUsername(profile.username);
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
    [hasProfile, getProfileData, handleJoin, setGameCode, setUsername, defaultLanguage]
  );

  // Handle CrazyGames invite room ID
  useEffect(() => {
    if (!isCrazyGamesReady || !inviteRoomId) return;
    handleInvitationAutoJoin(inviteRoomId);
  }, [isCrazyGamesReady, inviteRoomId, handleInvitationAutoJoin]);

  // Handle URL prefilled room code (invitation links)
  useEffect(() => {
    // Skip if CrazyGames invite already handled
    if (inviteRoomId) return;
    if (!prefilledRoom) return;

    handleInvitationAutoJoin(prefilledRoom);
  }, [inviteRoomId, prefilledRoom, handleInvitationAutoJoin]);

  // Handle room click from list
  const handleRoomClick = useCallback((room: ActiveRoom) => {
    setSelectedRoom(room);
    setFlowState('join-modal');
  }, []);

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
    (username: string, avatarId: string) => {
      if (!selectedRoom) return;

      setGameCode(selectedRoom.gameCode);
      setUsername(username);

      // Store avatar so handleJoin can pick it up via getStoredAvatarId()
      // (JoinRoomModal already calls setStoredAvatarId, but ensure consistency)

      // Pass username as override to avoid stale closure in handleJoin
      handleJoin(false, null, selectedRoom.gameCode, undefined, username);
    },
    [selectedRoom, handleJoin, setGameCode, setUsername]
  );

  // Generate a random game code - defined before useCallback that uses it
  const generateGameCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Handle create from modal
  const handleCreateFromModal = useCallback(
    (config: {
      hostUsername: string;
      avatarId: string;
      roomName: string;
      language: Language;
    }) => {
      // Generate a random game code
      const gameCode = generateGameCode();

      setGameCode(gameCode);
      setRoomName(config.roomName);
      setHostUsername(config.hostUsername);
      setUsername(config.hostUsername);

      // Pass username as override to avoid stale closure in handleJoin
      handleJoin(true, config.language, gameCode, config.roomName, config.hostUsername);
    },
    [handleJoin, setGameCode, setRoomName, setHostUsername, setUsername]
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

    // Create room immediately with host playing (dual mode)
    // Pass username as override to avoid stale closure in handleJoin
    handleJoin(true, defaultLanguage, gameCode, roomName, quickPlayUsername);
  }, [isAuthenticated, displayName, defaultLanguage, handleJoin, setGameCode, setRoomName, setHostUsername, setUsername]);

  // Show brief loading while CrazyGames SDK initializes (prevents flash of wrong UI)
  if (!isCrazyGamesReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neo-navy">
        <div className="text-neo-cream text-lg font-bold">Loading...</div>
      </div>
    );
  }

  // Always show RoomListView as base, with modals as overlays
  return (
    <>
      <RoomListView
        activeRooms={activeRooms}
        roomsLoading={roomsLoading}
        onRefreshRooms={refreshRooms}
        onRoomClick={handleRoomClick}
        onCreateRoom={handleCreateClick}
        onQuickPlay={handleQuickPlay}
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
        profilePictureUrl={profilePictureUrl}
        profileAvatarId={profileAvatarId}
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
        profilePictureUrl={profilePictureUrl}
        profileAvatarId={profileAvatarId}
      />
    </>
  );
};

export default MultiplayerFlow;
