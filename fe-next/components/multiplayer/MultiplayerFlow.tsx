'use client';

import React, { useState, useCallback, useEffect } from 'react';
import MultiplayerSelector from './MultiplayerSelector';
import CreateRoomSetup from './CreateRoomSetup';
import JoinRoomSetup from './JoinRoomSetup';
import InvitationQuickJoin from './InvitationQuickJoin';
import type { Language, ActiveRoom } from '@/shared/types/game';
import { getStoredUsername, getStoredAvatarId } from '@/utils/profileStorage';
import { useCrazyGamesInvite } from '@/hooks/useCrazyGamesInvite';

type FlowState = 'selector' | 'create-setup' | 'join-setup' | 'invitation-quick-join';

interface MultiplayerFlowProps {
  // Callbacks
  handleJoin: (isHostMode: boolean, roomLanguage?: Language | null, gameCode?: string) => void;
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
 * Simplified state machine: selector -> create-setup/join-setup (single step each)
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
  // Flow state - simplified to just selector and single-step setup screens
  const [flowState, setFlowState] = useState<FlowState>('selector');

  // Saved profile for invitation quick join
  const [savedUsername, setSavedUsername] = useState<string | null>(null);
  const [savedAvatarId, setSavedAvatarId] = useState<string | null>(null);

  // CrazyGames invite integration
  const { isReady: isCrazyGamesReady, inviteRoomId, isInstantMultiplayer } = useCrazyGamesInvite({
    // When player joins via CrazyGames invite link with roomId
    onInviteJoin: (roomId) => {
      // Set the game code and trigger join flow
      setGameCode(roomId);
    },
    // When player starts via "Play with Friends" (instant multiplayer)
    onInstantMultiplayer: () => {
      // Go directly to create room setup with dialog for name/avatar
      setFlowState('create-setup');
    },
  });

  // Handle CrazyGames invite room ID (similar to prefilledRoom)
  useEffect(() => {
    if (!isCrazyGamesReady || !inviteRoomId) return;

    // Check for saved profile in localStorage
    const storedUsername = getStoredUsername();
    const storedAvatarId = getStoredAvatarId();

    // Set the game code for the invite room
    setGameCode(inviteRoomId);

    if (storedUsername && storedAvatarId) {
      // User has saved profile - show quick join confirmation
      setSavedUsername(storedUsername);
      setSavedAvatarId(storedAvatarId);
      setUsername(storedUsername);
      setFlowState('invitation-quick-join');
    } else if (isAuthenticated && displayName && profileAvatarId) {
      // Authenticated user with profile - show quick join
      setSavedUsername(displayName);
      setSavedAvatarId(profileAvatarId);
      setUsername(displayName);
      setFlowState('invitation-quick-join');
    } else {
      // No saved profile - go to join setup
      setFlowState('join-setup');
    }
  }, [isCrazyGamesReady, inviteRoomId, isAuthenticated, displayName, profileAvatarId, setGameCode, setUsername]);

  // Handle invitation link: when prefilledRoom is provided, skip selector
  useEffect(() => {
    // Skip if CrazyGames invite already handled
    if (inviteRoomId) return;
    if (!prefilledRoom) return;

    // Check for saved profile in localStorage
    const storedUsername = getStoredUsername();
    const storedAvatarId = getStoredAvatarId();

    // Set the game code for the prefilled room
    setGameCode(prefilledRoom);

    if (storedUsername && storedAvatarId) {
      // User has saved profile - show quick join confirmation
      setSavedUsername(storedUsername);
      setSavedAvatarId(storedAvatarId);
      setUsername(storedUsername);
      setFlowState('invitation-quick-join');
    } else if (isAuthenticated && displayName && profileAvatarId) {
      // Authenticated user with profile - show quick join
      setSavedUsername(displayName);
      setSavedAvatarId(profileAvatarId);
      setUsername(displayName);
      setFlowState('invitation-quick-join');
    } else {
      // No saved profile - go to join setup
      setFlowState('join-setup');
    }
  }, [prefilledRoom, isAuthenticated, displayName, profileAvatarId, setGameCode, setUsername]);

  // Handle selector choices - go directly to single-step setup
  const handleSelectCreate = useCallback(() => {
    setFlowState('create-setup');
  }, []);

  const handleSelectJoin = useCallback(() => {
    setFlowState('join-setup');
  }, []);

  // Handle quick join from selector
  const handleQuickJoin = useCallback((roomCode: string) => {
    // Check if we have saved profile in localStorage
    const storedUsername = getStoredUsername();
    const storedAvatarId = getStoredAvatarId();

    if (storedUsername && storedAvatarId) {
      // Already have profile, join directly
      setGameCode(roomCode);
      setUsername(storedUsername);
      handleJoin(false, null, roomCode);
    } else {
      // Need to go through join setup
      setGameCode(roomCode);
      setFlowState('join-setup');
    }
  }, [handleJoin, setGameCode, setUsername]);

  // Handle back navigation
  const handleBackToSelector = useCallback(() => {
    setFlowState('selector');
  }, []);

  // Handle invitation quick join
  const handleInvitationJoin = useCallback(() => {
    const roomCode = inviteRoomId || prefilledRoom;
    if (roomCode && savedUsername) {
      handleJoin(false, null, roomCode);
    }
  }, [inviteRoomId, prefilledRoom, savedUsername, handleJoin]);

  // Handle change profile from invitation quick join
  const handleChangeProfileFromInvitation = useCallback(() => {
    setFlowState('join-setup');
  }, []);

  // Handle create room submission
  const handleCreateSubmit = useCallback((config: {
    gameCode: string;
    roomName: string;
    language: Language;
    hostUsername: string;
    avatarId: string;
  }) => {
    setGameCode(config.gameCode);
    setRoomName(config.roomName);
    setHostUsername(config.hostUsername);
    setUsername(config.hostUsername);
    handleJoin(true, config.language, config.gameCode);
  }, [handleJoin, setGameCode, setRoomName, setHostUsername, setUsername]);

  // Handle join room submission
  const handleJoinSubmit = useCallback((config: {
    gameCode: string;
    username: string;
    avatarId: string;
  }) => {
    setGameCode(config.gameCode);
    setUsername(config.username);
    handleJoin(false, null, config.gameCode);
  }, [handleJoin, setGameCode, setUsername]);

  // Render based on flow state
  switch (flowState) {
    case 'selector':
      return (
        <MultiplayerSelector
          onSelectCreate={handleSelectCreate}
          onSelectJoin={handleSelectJoin}
          activeRooms={activeRooms}
          onQuickJoin={handleQuickJoin}
          roomsLoading={roomsLoading}
          onRefreshRooms={refreshRooms}
        />
      );

    case 'create-setup':
      return (
        <CreateRoomSetup
          isAuthenticated={isAuthenticated}
          displayName={displayName || null}
          profilePictureUrl={profilePictureUrl}
          initialAvatarId={profileAvatarId}
          defaultLanguage={defaultLanguage}
          isSubmitting={isJoining}
          onSubmit={handleCreateSubmit}
          onBack={handleBackToSelector}
        />
      );

    case 'join-setup':
      return (
        <JoinRoomSetup
          isAuthenticated={isAuthenticated}
          displayName={displayName || null}
          profilePictureUrl={profilePictureUrl}
          initialAvatarId={profileAvatarId}
          activeRooms={activeRooms}
          roomsLoading={roomsLoading}
          isSubmitting={isJoining}
          prefilledCode={prefilledRoom}
          onSubmit={handleJoinSubmit}
          onBack={handleBackToSelector}
          onRefreshRooms={refreshRooms}
        />
      );

    case 'invitation-quick-join':
      return (
        <InvitationQuickJoin
          gameCode={inviteRoomId || prefilledRoom || ''}
          username={savedUsername || ''}
          avatarId={savedAvatarId || ''}
          profilePictureUrl={profilePictureUrl}
          isJoining={isJoining}
          onJoin={handleInvitationJoin}
          onChangeProfile={handleChangeProfileFromInvitation}
        />
      );

    default:
      return null;
  }
};

export default MultiplayerFlow;
