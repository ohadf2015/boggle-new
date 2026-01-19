'use client';

import React, { useState, useCallback, useEffect, useRef, FormEvent } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Crown, User, ArrowLeft } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getJoinUrl } from '@/utils/share';
import { useLanguage } from '@/contexts/LanguageContext';
import { validateUsername, validateRoomName, validateGameCode, sanitizeInput } from '@/utils/validation';
import { useValidation } from '@/hooks/useValidation';
import { generateRoomCode as generateCode } from '@/utils/utils';
import type { Language, ActiveRoom } from '@/shared/types/game';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import LandscapeIndicator from '@/components/LandscapeIndicator';
import {
  RoomList,
  LanguageSelector,
  ModeSelector,
  HostModeFields,
  JoinModeFields,
} from '@/components/join';

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
  const isLandscape = useMobileLandscape();
  const [mode, setMode] = useState<JoinMode>('join');
  const [showQR, setShowQR] = useState(false);
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

  // Landscape mode layout - optimized 2-column: form left, room list right
  if (isLandscape) {
    return (
      <>
        {/* Landscape mode suggestion banner */}
        <LandscapeIndicator />

        <div dir={dir} className="flex h-dvh w-full overflow-hidden bg-neo-navy text-white p-3 gap-4 landscape-full-height">
        {/* Left column: Form */}
        <div className="w-[45%] flex flex-col gap-3 overflow-y-auto">
          {/* Header with back + title */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-neo border-3 border-neo-black bg-neo-cream shadow-hard hover:shadow-hard-lg transition-all"
              aria-label={t('common.back') || 'Back'}
            >
              <ArrowLeft className="text-sm text-neo-black rtl:rotate-180" />
            </Link>
            <h1 className="text-xl font-black uppercase text-neo-white flex-1">
              {t('landing.multiplayer') || 'Multiplayer'}
            </h1>
          </div>

          {/* Mode Selector - compact */}
          <ModeSelector mode={mode} onModeChange={handleModeChange} />

          {/* Error */}
          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {/* Form fields */}
          <form onSubmit={handleSubmit} className="flex flex-col space-y-3 flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto space-y-3">
              {mode === 'host' ? (
                <div className="space-y-3 text-sm">
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
                  <div>
                    <Label className="text-sm font-bold uppercase text-neo-white mb-1 block">
                      {t('joinView.language') || 'Language'}
                    </Label>
                    <LanguageSelector selectedLanguage={roomLanguage} onLanguageChange={setRoomLanguage} hideLabel />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
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
                </div>
              )}
            </div>

            {/* Submit Button - fixed at bottom */}
            <Button
              type="submit"
              disabled={isJoining}
              className="w-full h-12 font-black uppercase text-base bg-neo-lime hover:bg-neo-lime/90 text-neo-black border-3 border-neo-black shadow-hard hover:shadow-hard-lg transition-all flex-shrink-0"
            >
              {mode === 'host' ? <Crown className="mr-2 w-5 h-5" /> : <User className="mr-2 w-5 h-5" />}
              {isJoining ? (t('common.loading') || 'Loading...') : mode === 'host' ? (t('joinView.createRoom') || 'Create Room') : (t('joinView.joinRoom') || 'Join Room')}
            </Button>
          </form>
        </div>

        {/* Right column: Room List */}
        <div className="w-[55%] flex flex-col gap-3 overflow-hidden">
          <h2 className="text-base font-black uppercase text-neo-white text-center">
            {t('joinView.activeRooms') || 'Active Rooms'}
          </h2>
          <div className="flex-1 overflow-y-auto bg-neo-navy text-white rounded-neo border-3 border-neo-black p-3 shadow-hard">
            <RoomList
              activeRooms={activeRooms}
              onRoomSelect={handleRoomSelect}
              selectedGameCode={gameCode}
              roomsLoading={roomsLoading}
              onRefresh={refreshRooms}
              onSwitchToHostMode={() => setMode('host')}
              isJoinMode={mode === 'join'}
              mobileExpanded={true}
              onToggleMobileExpand={() => {}}
            />
          </div>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      {/* Landscape mode suggestion banner */}
      <LandscapeIndicator />

      <div dir={dir} className="min-h-dvh bg-neo-navy flex flex-col">
      <div className="w-[94%] max-w-7xl mx-auto py-3 sm:py-4 flex-1 flex flex-col min-h-0">
        {/* Compact Header: back button + title inline with premium gradient accent */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-4 flex-shrink-0"
        >
          <Link
            href="/"
            className="flex items-center justify-center w-10 h-10 rounded-neo border-3 border-neo-black bg-neo-cream shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-pressed transition-all text-neo-black"
            aria-label={t('common.back') || 'Back'}
          >
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-black uppercase text-neo-white flex items-center gap-2">
              <span className="inline-block w-3 h-6 bg-neo-pink rounded-sm" />
              {t('landing.multiplayer') || 'Multiplayer'}
            </h1>
            <p className="text-neo-white/60 text-xs sm:text-sm font-medium mt-0.5">
              {t('multiplayer.subtitle') || 'Compete with friends in real-time'}
            </p>
          </div>
        </motion.div>

        {/* Desktop: Single row layout - Form | Rooms side by side without scroll */}
        {/* Mobile: Stack vertically, rooms first when available */}
        <div className={cn(
          "flex-1 flex gap-4 lg:gap-6 lg:flex-row lg:items-stretch",
          activeRooms.length > 0 ? "flex-col-reverse" : "flex-col"
        )}>
          {/* Main Form - Premium card styling with gradient accent */}
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-full lg:w-[45%] lg:max-w-md flex flex-col"
          >
            <div className="rounded-neo-lg border-4 border-neo-black bg-slate-800 shadow-hard-lg p-4 flex flex-col h-full relative overflow-hidden">
              {/* Decorative top accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-neo-pink" />
              {/* Mode Selector - direct, no header wrapper */}
              <ModeSelector mode={mode} onModeChange={handleModeChange} />

              {/* Error Alert */}
              {error && (
                <Alert variant="destructive" className="mt-3">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="flex-1 flex flex-col mt-3 space-y-3">
                <div className="flex-1 space-y-3">
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

                      {/* Language Selector - no label, inline */}
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

                {/* Submit Button - fixed at bottom */}
                <Button
                  type="submit"
                  variant={mode === 'host' ? 'success' : 'default'}
                  className="w-full mt-auto"
                  size="lg"
                  disabled={isJoining || (mode === 'join' && (isAutoJoining || !gameCode))}
                >
                  {mode === 'host' ? <Crown className="mr-2" /> : <User className="mr-2" />}
                  {mode === 'host'
                    ? (isJoining ? t('joinView.creating') || 'Creating...' : t('joinView.createRoom') || 'Create Room')
                    : (isJoining || isAutoJoining ? t('joinView.joining') || 'Joining...' : t('joinView.joinGame') || 'Join Game')}
                </Button>
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

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent noDescription>
          <DialogHeader>
            <DialogTitle>{t('share.qrCodeTitle') || 'Scan to Join'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-white text-neo-black p-4 rounded-neo border-3 border-neo-black">
              <QRCodeSVG
                value={getJoinUrl(gameCode)}
                size={200}
                level="M"
              />
            </div>
            <p className="text-center text-sm text-neo-black/75">
              {t('joinView.scanToJoin') || 'Scan the code to join or use code'}{' '}
              <span className="font-mono font-bold">{gameCode}</span>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
};

export default MultiplayerLobby;
