'use client';

import React, { useState, useCallback, useEffect, useRef, FormEvent } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Crown, User, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { validateUsername, validateRoomName, validateGameCode, sanitizeInput } from '@/utils/validation';
import { useValidation } from '@/hooks/useValidation';
import { generateRoomCode as generateCode } from '@/utils/utils';
import type { Language, ActiveRoom } from '@/shared/types/game';
import { RoomList } from '@/components/join/RoomList';
import { LanguageSelector } from '@/components/join/LanguageSelector';
import HostModeFields from '@/components/join/HostModeFields';
import JoinModeFields from '@/components/join/JoinModeFields';

export type JoinMode = 'join' | 'host';

interface MultiplayerLobbyProps {
  handleJoin: (isHostMode: boolean, roomLanguage?: Language | null, gameCode?: string) => void;
  gameCode: string;
  username: string;
  roomName: string;
  hostUsername: string;
  setGameCode: (code: string) => void;
  setUsername: (name: string) => void;
  setRoomName: (name: string) => void;
  setHostUsername: (name: string) => void;
  error: string;
  activeRooms: ActiveRoom[];
  refreshRooms: () => void;
  roomsLoading: boolean;
  isAuthenticated: boolean;
  displayName: string;
  isJoining?: boolean;
  prefilledRoom?: string;
  isAutoJoining?: boolean;
  isProfileLoading?: boolean;
}

/**
 * MultiplayerLobby - Clean multiplayer lobby component
 * Handles room creation and joining with multiplayer-specific settings
 */
const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({
  handleJoin,
  gameCode,
  username,
  roomName,
  hostUsername,
  setGameCode,
  setUsername,
  setRoomName,
  setHostUsername,
  error,
  activeRooms,
  refreshRooms,
  roomsLoading,
  isAuthenticated,
  displayName,
  isJoining = false,
  prefilledRoom = '',
  isAutoJoining = false,
  isProfileLoading = false,
}) => {
  const { t, language, dir } = useLanguage();
  const [mode, setMode] = useState<JoinMode>('join');
  const [usernameError, setUsernameError] = useState(false);
  const [roomNameError, setRoomNameError] = useState(false);
  const [hostUsernameError, setHostUsernameError] = useState(false);
  const [gameCodeError, setGameCodeError] = useState(false);
  const [usernameErrorKey, setUsernameErrorKey] = useState<string | undefined>();
  const [roomNameErrorKey, setRoomNameErrorKey] = useState<string | undefined>();
  const [hostUsernameErrorKey, setHostUsernameErrorKey] = useState<string | undefined>();
  const [gameCodeErrorKey, setGameCodeErrorKey] = useState<string | undefined>();
  const [roomLanguage, setRoomLanguage] = useState<Language>(language as Language);
  // Auto-expand room list on mobile when rooms are available
  const [mobileRoomsExpanded, setMobileRoomsExpanded] = useState(activeRooms.length > 0);
  const hasAutoSwitchedToHostRef = useRef(false);
  const { notifyError } = useValidation(t);

  // Mode change handler
  const handleModeChange = useCallback((newMode: string) => {
    if (newMode && (newMode === 'join' || newMode === 'host')) {
      setMode(newMode as JoinMode);
      if (newMode === 'host' && !gameCode) {
        setGameCode(generateCode());
      }
    }
  }, [gameCode, setGameCode]);

  // Generate room code handler for HostModeFields
  const generateRoomCode = useCallback(() => {
    setGameCode(generateCode());
  }, [setGameCode]);

  // Auto-switch to host mode when no rooms exist (unless joining via prefilled room)
  useEffect(() => {
    if (prefilledRoom) return; // Don't auto-switch when joining via link
    if (!roomsLoading && activeRooms.length === 0 && mode === 'join' && !hasAutoSwitchedToHostRef.current) {
      hasAutoSwitchedToHostRef.current = true;
      handleModeChange('host');
    }
    if (activeRooms.length > 0) {
      hasAutoSwitchedToHostRef.current = false;
    }
  }, [roomsLoading, activeRooms.length, mode, handleModeChange, prefilledRoom]);

  // Auto-expand room list on mobile when rooms become available
  useEffect(() => {
    if (!roomsLoading && activeRooms.length > 0 && !mobileRoomsExpanded) {
      setMobileRoomsExpanded(true);
    }
  }, [roomsLoading, activeRooms.length, mobileRoomsExpanded]);

  // Handle prefilled room from URL
  useEffect(() => {
    if (prefilledRoom && gameCode === prefilledRoom) {
      setMode('join');
    }
  }, [prefilledRoom, gameCode]);

  // Handle form submission
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (mode === 'host') {
      let effectiveRoomName = roomName;
      let effectiveHostUsername = hostUsername;

      if (isAuthenticated && displayName) {
        // For authenticated users, use display name as player name
        effectiveHostUsername = displayName;
        // Use display name as room name fallback if no room name provided
        if (!roomName || !roomName.trim()) {
          effectiveRoomName = displayName;
          setRoomName(displayName);
        }
      }

      const rn = sanitizeInput(effectiveRoomName, 30);
      const { isValid: roomOk, error: roomErr } = validateRoomName(rn, true); // true = optional
      const { isValid: codeOk, error: codeErr } = validateGameCode(gameCode);

      // For guest hosts, validate hostUsername separately
      let hostUsernameOk = true;
      let hostUsernameErr: string | undefined;
      if (!isAuthenticated) {
        const hn = sanitizeInput(effectiveHostUsername, 20);
        const validation = validateUsername(hn);
        hostUsernameOk = validation.isValid;
        hostUsernameErr = validation.error;
        effectiveHostUsername = hn;
      }

      if (!roomOk || !codeOk || !hostUsernameOk) {
        if (!roomOk) {
          setRoomNameError(true);
          setRoomNameErrorKey(roomErr);
        }
        if (!codeOk) {
          setGameCodeError(true);
          setGameCodeErrorKey(codeErr);
        }
        if (!hostUsernameOk) {
          setHostUsernameError(true);
          setHostUsernameErrorKey(hostUsernameErr);
        }
        notifyError(roomErr || codeErr || hostUsernameErr);
        return;
      }
    } else {
      const un = sanitizeInput(username, 20);
      const { isValid: userOk, error: userErr } = validateUsername(un);
      const { isValid: codeOk, error: codeErr } = validateGameCode(gameCode);
      if (!userOk || !codeOk) {
        if (!userOk) {
          setUsernameError(true);
          setUsernameErrorKey(userErr);
        }
        if (!codeOk) {
          setGameCodeError(true);
          setGameCodeErrorKey(codeErr);
        }
        notifyError(userErr || codeErr);
        return;
      }
    }

    handleJoin(mode === 'host', roomLanguage);
  };

  // Handle room selection from list
  const handleRoomSelect = useCallback((roomCode: string) => {
    const isSameRoom = gameCode === roomCode;
    setGameCode(roomCode);
    setMode('join');

    if (username && username.trim() && !isSameRoom) {
      setTimeout(() => {
        handleJoin(false, null, roomCode);
      }, 100);
    }
  }, [gameCode, username, setGameCode, handleJoin]);

  return (
    <>
      <div dir={dir} className="min-h-dvh bg-neo-navy flex flex-col overflow-y-auto scrollable-area">
      <div className="w-[94%] max-w-7xl mx-auto py-2 short:py-1 flex-1 flex flex-col min-h-0 pb-bottom-stack">
        {/* Compact Header: back button + title inline */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-3 short:mb-1 medium-short:mb-2 shrink-0"
        >
          <Link
            href={`/${language}`}
            className="flex items-center justify-center w-10 h-10 rounded-neo border-3 border-neo-black bg-neo-cream shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-px active:translate-y-px active:shadow-hard-pressed focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime transition-all text-neo-black"
            aria-label={t('common.backToHome')}
          >
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-black uppercase text-neo-white flex items-center gap-2 flex-1">
            <span className="inline-block w-3 h-6 bg-neo-pink rounded-sm" />
            {t('landing.multiplayer')}
          </h1>
        </motion.div>

        {/* Desktop: Single row layout - Form | Rooms side by side without scroll */}
        {/* Mobile: Stack vertically, rooms first when available */}
        <div className={cn(
          "flex-1 flex gap-4 lg:gap-6 flex-col max-w-2xl mx-auto w-full",
          activeRooms.length > 0 ? "flex-col-reverse" : "flex-col"
        )}>
          {/* Main Form - Premium card styling with gradient accent */}
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-full flex flex-col"
          >
            <div className="rounded-neo-lg border-4 border-neo-black bg-slate-800 shadow-hard-lg p-3 short:p-2 flex flex-col h-full relative overflow-hidden">
              {/* Error Alert */}
              {error && (
                <Alert variant="destructive" className="mb-2">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-2">
                <div className="flex-1 space-y-2">
                  {mode === 'host' ? (
                    <>
                      <HostModeFields
                        gameCode={gameCode}
                        setGameCode={setGameCode}
                        gameCodeError={gameCodeError}
                        setGameCodeError={setGameCodeError}
                        gameCodeErrorKey={gameCodeErrorKey}
                        roomName={roomName}
                        setRoomName={setRoomName}
                        roomNameError={roomNameError}
                        setRoomNameError={setRoomNameError}
                        roomNameErrorKey={roomNameErrorKey}
                        hostUsername={hostUsername}
                        setHostUsername={setHostUsername}
                        hostUsernameError={hostUsernameError}
                        setHostUsernameError={setHostUsernameError}
                        hostUsernameErrorKey={hostUsernameErrorKey}
                        generateRoomCode={generateRoomCode}
                        isAuthenticated={isAuthenticated}
                        displayName={displayName}
                        isProfileLoading={isProfileLoading}
                        t={t}
                      />
                      <LanguageSelector
                        selectedLanguage={roomLanguage}
                        onLanguageChange={setRoomLanguage}
                        hideLabel
                      />
                    </>
                  ) : (
                    <JoinModeFields
                      gameCode={gameCode}
                      setGameCode={setGameCode}
                      gameCodeError={gameCodeError}
                      setGameCodeError={setGameCodeError}
                      gameCodeErrorKey={gameCodeErrorKey}
                      username={username}
                      setUsername={setUsername}
                      usernameError={usernameError}
                      setUsernameError={setUsernameError}
                      usernameErrorKey={usernameErrorKey}
                      isAuthenticated={isAuthenticated}
                      displayName={displayName}
                      t={t}
                    />
                  )}
                </div>

                {/* Primary submit — single focused action.
                    Disabled while profile is loading or username is empty so a
                    fast-clicker can't create a room with a blank username (audit UX-H4). */}
                <Button
                  type="submit"
                  variant={mode === 'host' ? 'success' : 'default'}
                  className="w-full"
                  size="lg"
                  disabled={
                    isJoining
                    || isProfileLoading
                    || !username.trim()
                    || (mode === 'join' && (isAutoJoining || !gameCode))
                  }
                >
                  {mode === 'host' ? <Crown className="me-2" /> : <User className="me-2" />}
                  {mode === 'host'
                    ? (isJoining ? t('joinView.creating') : t('joinView.createRoom'))
                    : (isJoining || isAutoJoining ? t('joinView.joining') : t('joinView.joinGame'))}
                </Button>

                {/* Discreet mode toggle — replaces the tab bar */}
                <button
                  type="button"
                  onClick={() => handleModeChange(mode === 'host' ? 'join' : 'host')}
                  className="text-xs font-bold uppercase text-neo-white/60 hover:text-neo-pink transition-colors underline-offset-4 hover:underline self-center"
                >
                  {mode === 'host'
                    ? t('joinView.joinGame')
                    : t('joinView.createRoom')}
                </button>
              </form>
            </div>
          </motion.div>

          {/* Room List - Max width constraint on desktop */}
          <motion.div
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-full lg:max-w-2xl"
          >
            <RoomList
              activeRooms={activeRooms}
              roomsLoading={roomsLoading}
              selectedGameCode={gameCode}
              onRoomSelect={handleRoomSelect}
              onRefresh={refreshRooms}
              onSwitchToHostMode={() => handleModeChange('host')}
              isJoinMode={mode === 'join'}
              mobileExpanded={mobileRoomsExpanded}
              onToggleMobileExpand={() => setMobileRoomsExpanded(!mobileRoomsExpanded)}
              compact
            />
          </motion.div>
        </div>
      </div>

    </div>
    </>
  );
};

export default MultiplayerLobby;
