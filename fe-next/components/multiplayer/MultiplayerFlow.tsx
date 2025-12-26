'use client';

import React, { useState, useCallback } from 'react';
import MultiplayerSelector from './MultiplayerSelector';
import ProfileSetup, { type ProfileData } from './ProfileSetup';
import CreateRoomForm from './CreateRoomForm';
import JoinRoomForm from './JoinRoomForm';
import type { Language, ActiveRoom } from '@/shared/types/game';

type FlowState = 'selector' | 'profile-setup' | 'create-form' | 'join-form';
type Mode = 'create' | 'join' | null;

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

  // Form state setters (for compatibility)
  setGameCode: (code: string) => void;
  setUsername: (name: string) => void;
  setRoomName: (name: string) => void;
  setHostUsername: (name: string) => void;
}

/**
 * MultiplayerFlow - Orchestrator for the new multiplayer flow
 * Manages state machine: selector -> profile-setup -> create-form/join-form
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
  setGameCode,
  setUsername,
  setRoomName,
  setHostUsername,
}) => {
  // Flow state
  const [flowState, setFlowState] = useState<FlowState>('selector');
  const [mode, setMode] = useState<Mode>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  // Handle selector choices
  const handleSelectCreate = useCallback(() => {
    setMode('create');
    setFlowState('profile-setup');
  }, []);

  const handleSelectJoin = useCallback(() => {
    setMode('join');
    setFlowState('profile-setup');
  }, []);

  // Handle quick join from selector (skip profile if already set)
  const handleQuickJoin = useCallback((roomCode: string) => {
    // Check if we have saved profile in localStorage
    const savedUsername = typeof window !== 'undefined' ? localStorage.getItem('boggle_username') : null;
    const savedAvatarId = typeof window !== 'undefined' ? localStorage.getItem('boggle_avatar_id') : null;

    if (savedUsername && savedAvatarId) {
      // Already have profile, join directly
      setGameCode(roomCode);
      setUsername(savedUsername);
      handleJoin(false, null, roomCode);
    } else {
      // Need profile setup first
      setMode('join');
      setFlowState('profile-setup');
      // Store room code for later
      setGameCode(roomCode);
    }
  }, [handleJoin, setGameCode, setUsername]);

  // Handle profile complete
  const handleProfileComplete = useCallback((profileData: ProfileData) => {
    setProfile(profileData);
    setUsername(profileData.username);

    if (mode === 'create') {
      setHostUsername(profileData.username);
      if (profileData.roomName) {
        setRoomName(profileData.roomName);
      }
      setFlowState('create-form');
    } else {
      setFlowState('join-form');
    }
  }, [mode, setUsername, setHostUsername, setRoomName]);

  // Handle back navigation
  const handleBackToSelector = useCallback(() => {
    setFlowState('selector');
    setMode(null);
  }, []);

  const handleBackToProfile = useCallback(() => {
    setFlowState('profile-setup');
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
    handleJoin(true, config.language, config.gameCode);
  }, [handleJoin, setGameCode, setRoomName, setHostUsername]);

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
        />
      );

    case 'profile-setup':
      return (
        <ProfileSetup
          mode={mode!}
          isAuthenticated={isAuthenticated}
          displayName={displayName || null}
          onComplete={handleProfileComplete}
          onBack={handleBackToSelector}
        />
      );

    case 'create-form':
      return (
        <CreateRoomForm
          profile={profile!}
          defaultLanguage={defaultLanguage}
          isSubmitting={isJoining}
          onSubmit={handleCreateSubmit}
          onBack={handleBackToProfile}
        />
      );

    case 'join-form':
      return (
        <JoinRoomForm
          profile={profile!}
          activeRooms={activeRooms}
          roomsLoading={roomsLoading}
          isSubmitting={isJoining}
          prefilledCode={prefilledRoom}
          onSubmit={handleJoinSubmit}
          onBack={handleBackToProfile}
          onRefreshRooms={refreshRooms}
        />
      );

    default:
      return null;
  }
};

export default MultiplayerFlow;
