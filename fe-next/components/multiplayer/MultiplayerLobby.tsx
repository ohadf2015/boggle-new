'use client';

import React, { useState, useCallback, useEffect, useRef, FormEvent } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { FaCrown, FaUser, FaDice, FaArrowLeft } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getJoinUrl } from '@/utils/share';
import { useLanguage } from '@/contexts/LanguageContext';
import { validateUsername, validateRoomName, validateGameCode, sanitizeInput } from '@/utils/validation';
import { useValidation } from '@/hooks/useValidation';
import { useDebouncedValidation, getValidationClasses } from '@/hooks/useDebouncedValidation';
import { generateRoomCode as generateCode } from '@/utils/utils';
import type { Language, ActiveRoom } from '@/shared/types/game';
import {
  RoomList,
  LanguageSelector,
  ModeSelector,
} from '@/components/join';

export type JoinMode = 'join' | 'host';

interface MultiplayerLobbyProps {
  handleJoin: (isHostMode: boolean, roomLanguage?: Language | null, gameCode?: string) => void;
  gameCode: string;
  username: string;
  roomName: string;
  setGameCode: (code: string) => void;
  setUsername: (name: string) => void;
  setRoomName: (name: string) => void;
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
  setGameCode,
  setUsername,
  setRoomName,
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
  const [showQR, setShowQR] = useState(false);
  const [usernameError, setUsernameError] = useState(false);
  const [roomNameError, setRoomNameError] = useState(false);
  const [gameCodeError, setGameCodeError] = useState(false);
  const [usernameErrorKey, setUsernameErrorKey] = useState<string | undefined>();
  const [roomNameErrorKey, setRoomNameErrorKey] = useState<string | undefined>();
  const [gameCodeErrorKey, setGameCodeErrorKey] = useState<string | undefined>();
  const [roomLanguage, setRoomLanguage] = useState<Language>(language as Language);
  const [mobileRoomsExpanded, setMobileRoomsExpanded] = useState(false);
  const hasAutoSwitchedToHostRef = useRef(false);
  const { notifyError } = useValidation(t);

  // Debounced validation
  const usernameValidation = useDebouncedValidation(username, { validate: validateUsername, delay: 300 });
  const roomNameValidation = useDebouncedValidation(roomName, { validate: validateRoomName, delay: 300 });
  const gameCodeValidation = useDebouncedValidation(gameCode, { validate: validateGameCode, delay: 300 });

  // Mode change handler
  const handleModeChange = useCallback((newMode: string) => {
    if (newMode && (newMode === 'join' || newMode === 'host')) {
      setMode(newMode as JoinMode);
      if (newMode === 'host' && !gameCode) {
        setGameCode(generateCode());
      }
    }
  }, [gameCode, setGameCode]);

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

  // Handle prefilled room from URL
  useEffect(() => {
    if (prefilledRoom && gameCode === prefilledRoom) {
      setMode('join');
    }
  }, [prefilledRoom, gameCode]);

  // Generate new room code
  const generateRoomCode = useCallback(() => {
    setGameCode(generateCode());
  }, [setGameCode]);

  // Handle form submission
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (mode === 'host') {
      let effectiveRoomName = roomName;
      if (isAuthenticated && displayName && (!roomName || !roomName.trim())) {
        effectiveRoomName = displayName;
        setRoomName(displayName);
      }

      const rn = sanitizeInput(effectiveRoomName, 30);
      const { isValid: roomOk, error: roomErr } = validateRoomName(rn);
      const { isValid: codeOk, error: codeErr } = validateGameCode(gameCode);
      if (!roomOk || !codeOk) {
        if (!roomOk) {
          setRoomNameError(true);
          setRoomNameErrorKey(roomErr);
        }
        if (!codeOk) {
          setGameCodeError(true);
          setGameCodeErrorKey(codeErr);
        }
        notifyError(roomErr || codeErr);
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
    <div dir={dir} className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Title with back button */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex items-center justify-center mb-6"
        >
          <Link
            href="/"
            className="absolute start-0 flex items-center gap-2 px-3 py-2 rounded-neo border-3 border-neo-black dark:border-slate-600 bg-neo-cream dark:bg-slate-700 shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all text-neo-black dark:text-neo-white text-sm font-bold"
          >
            <FaArrowLeft className="w-4 h-4 rtl:rotate-180" />
            <span className="hidden sm:inline">{t('common.back') || 'Back'}</span>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-black uppercase text-center text-neo-black dark:text-neo-white">
            {t('landing.multiplayer') || 'Multiplayer'}
          </h1>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Form */}
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex-1 max-w-md mx-auto lg:mx-0 w-full"
          >
            <Card>
              <CardHeader className="pb-4">
                {/* Mode Selector */}
                <ModeSelector mode={mode} onModeChange={handleModeChange} />
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Error Alert */}
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === 'host' ? (
                    <>
                      {/* Room Name */}
                      <div className="space-y-2">
                        <Label htmlFor="roomName" className="text-sm font-bold uppercase">
                          {t('joinView.roomNamePlaceholder') || 'Room Name'}
                        </Label>
                        <Input
                          id="roomName"
                          value={roomName}
                          onChange={(e) => {
                            setRoomName(e.target.value);
                            setRoomNameError(false);
                          }}
                          placeholder={displayName || t('validation.enterRoomName') || 'Enter room name'}
                          className={cn(
                            getValidationClasses(roomNameValidation.state),
                            roomNameError && 'border-neo-red'
                          )}
                        />
                        {roomNameError && roomNameErrorKey && (
                          <p className="text-xs text-neo-red">{t(roomNameErrorKey)}</p>
                        )}
                      </div>

                      {/* Game Code */}
                      <div className="space-y-2">
                        <Label htmlFor="gameCode" className="text-sm font-bold uppercase">
                          {t('hostView.roomCode') || 'Room Code'}
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="gameCode"
                            value={gameCode}
                            onChange={(e) => {
                              setGameCode(e.target.value.toUpperCase());
                              setGameCodeError(false);
                            }}
                            placeholder="ABC123"
                            className={cn(
                              'font-mono uppercase',
                              getValidationClasses(gameCodeValidation.state),
                              gameCodeError && 'border-neo-red'
                            )}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            onClick={generateRoomCode}
                            title={t('joinView.generateNewCode') || 'Generate new code'}
                          >
                            <FaDice />
                          </Button>
                        </div>
                        {gameCodeError && gameCodeErrorKey && (
                          <p className="text-xs text-neo-red">{t(gameCodeErrorKey)}</p>
                        )}
                      </div>

                      {/* Language Selector */}
                      <LanguageSelector
                        selectedLanguage={roomLanguage}
                        onLanguageChange={setRoomLanguage}
                      />

                      {/* Create Room Button */}
                      <Button
                        type="submit"
                        className="w-full"
                        size="lg"
                        disabled={isJoining}
                      >
                        <FaCrown className="mr-2" />
                        {isJoining
                          ? t('joinView.creating') || 'Creating...'
                          : t('joinView.createRoom') || 'Create Room'}
                      </Button>
                    </>
                  ) : (
                    <>
                      {/* Username */}
                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-sm font-bold uppercase">
                          {t('joinView.yourName') || 'Your Name'}
                        </Label>
                        <Input
                          id="username"
                          value={username}
                          onChange={(e) => {
                            setUsername(e.target.value);
                            setUsernameError(false);
                          }}
                          placeholder={t('joinView.enterYourName') || 'Enter your name'}
                          className={cn(
                            getValidationClasses(usernameValidation.state),
                            usernameError && 'border-neo-red'
                          )}
                        />
                        {usernameError && usernameErrorKey && (
                          <p className="text-xs text-neo-red">{t(usernameErrorKey)}</p>
                        )}
                      </div>

                      {/* Game Code */}
                      <div className="space-y-2">
                        <Label htmlFor="gameCodeJoin" className="text-sm font-bold uppercase">
                          {t('hostView.roomCode') || 'Room Code'}
                        </Label>
                        <Input
                          id="gameCodeJoin"
                          value={gameCode}
                          onChange={(e) => {
                            setGameCode(e.target.value.toUpperCase());
                            setGameCodeError(false);
                          }}
                          placeholder={t('validation.enterGameCode') || 'Enter game code'}
                          className={cn(
                            'font-mono uppercase',
                            getValidationClasses(gameCodeValidation.state),
                            gameCodeError && 'border-neo-red'
                          )}
                        />
                        {gameCodeError && gameCodeErrorKey && (
                          <p className="text-xs text-neo-red">{t(gameCodeErrorKey)}</p>
                        )}
                      </div>

                      {/* Join Button */}
                      <Button
                        type="submit"
                        className="w-full"
                        size="lg"
                        disabled={isJoining || isAutoJoining || !gameCode}
                      >
                        <FaUser className="mr-2" />
                        {isJoining || isAutoJoining
                          ? t('joinView.joining') || 'Joining...'
                          : t('joinView.joinGame') || 'Join Game'}
                      </Button>
                    </>
                  )}
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Room List */}
          <motion.div
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex-1 max-w-lg mx-auto lg:mx-0 w-full"
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
            />
          </motion.div>
        </div>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('share.qrCodeTitle') || 'Scan to Join'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-white p-4 rounded-neo border-3 border-neo-black">
              <QRCodeSVG
                value={getJoinUrl(gameCode)}
                size={200}
                level="M"
              />
            </div>
            <p className="text-center text-sm text-neo-black/60">
              {t('joinView.scanToJoin') || 'Scan the code to join or use code'}{' '}
              <span className="font-mono font-bold">{gameCode}</span>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MultiplayerLobby;
