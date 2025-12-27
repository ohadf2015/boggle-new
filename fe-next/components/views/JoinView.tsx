'use client';

import React, { useState, useEffect, useRef, useCallback, FormEvent } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FaCrown, FaUser, FaSync, FaQrcode, FaQuestionCircle } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getJoinUrl } from '@/utils/share';
import { useLanguage } from '@/contexts/LanguageContext';
import LogRocket from 'logrocket';
import { validateUsername, validateRoomName, validateGameCode, sanitizeInput } from '@/utils/validation';
import { useValidation } from '@/hooks/useValidation';
import { generateRoomCode as generateCode, generateRandomRoomName } from '@/utils/utils';
import { setGuestName } from '@/utils/guestManager';
import { trackGuestJoin } from '@/utils/growthTracking';
import type { JoinViewProps, JoinMode } from '@/types/components';
import type { Language } from '@/shared/types/game';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';

// Extracted sub-components
import {
  AutoJoiningState,
  QuickJoinForm,
  RoomList,
  LanguageSelector,
  ModeSelector,
  JoinModeFields,
  HostModeFields,
} from '@/components/join';

// Dynamic imports for heavy animation components
const NewPlayerWelcome = dynamic(() => import('@/components/NewPlayerWelcome'), { ssr: false });
const MenuAnimation = dynamic(() => import('@/components/MenuAnimation'), { ssr: false });
const Particles = dynamic(() => import('@/components/Particles'), { ssr: false });

// Import helper for first-time player detection
import { isFirstTimePlayer } from '@/components/NewPlayerWelcome';

const JoinView: React.FC<JoinViewProps> = ({
  handleJoin,
  gameCode,
  username,
  setGameCode,
  setUsername,
  error,
  activeRooms,
  refreshRooms,
  prefilledRoom,
  roomName,
  setRoomName,
  hostUsername,
  setHostUsername,
  isAutoJoining,
  roomsLoading,
  isAuthenticated,
  displayName,
  isProfileLoading,
  isJoining = false
}) => {
  const { t, language, dir } = useLanguage();
  const isLandscape = useMobileLandscape();
  const [mode, setMode] = useState<JoinMode>('join');
  const [showQR, setShowQR] = useState<boolean>(false);
  const [showNewPlayerWelcome, setShowNewPlayerWelcome] = useState<boolean>(false);
  const [usernameError, setUsernameError] = useState<boolean>(false);
  const [roomNameError, setRoomNameError] = useState<boolean>(false);
  const [hostUsernameError, setHostUsernameError] = useState<boolean>(false);
  const [gameCodeError, setGameCodeError] = useState<boolean>(false);
  const [usernameErrorKey, setUsernameErrorKey] = useState<string | undefined>(undefined);
  const [roomNameErrorKey, setRoomNameErrorKey] = useState<string | undefined>(undefined);
  const [hostUsernameErrorKey, setHostUsernameErrorKey] = useState<string | undefined>(undefined);
  const [gameCodeErrorKey, setGameCodeErrorKey] = useState<string | undefined>(undefined);
  const [showFullForm, setShowFullForm] = useState<boolean>(!prefilledRoom);
  // Map UI language to valid game language (game only supports en, he, sv, ja)
  const validGameLanguages: Language[] = ['en', 'he', 'sv', 'ja'];
  const defaultGameLanguage: Language = validGameLanguages.includes(language as Language)
    ? (language as Language)
    : 'en';
  const [roomLanguage, setRoomLanguage] = useState<Language>(defaultGameLanguage);
  const [mobileRoomsExpanded, setMobileRoomsExpanded] = useState<boolean>(false);
  const prevPrefilledRoomRef = useRef<string | null>(prefilledRoom);
  const { notifyError } = useValidation(t);
  const hasAutoSwitchedToHostRef = useRef<boolean>(false);
  const hasCheckedFirstTimePlayerRef = useRef<boolean>(false);

  // Mode change handler
  const handleModeChange = useCallback((newMode: string) => {
    if (newMode && (newMode === 'join' || newMode === 'host')) {
      setMode(newMode as JoinMode);
      if (newMode === 'host') {
        setGameCode(generateCode());
      }
    }
  }, [setGameCode]);

  // Sync showFullForm when prefilledRoom prop changes
  useEffect(() => {
    if (prefilledRoom && !prevPrefilledRoomRef.current) {
      Promise.resolve().then(() => setShowFullForm(false));
    }
    prevPrefilledRoomRef.current = prefilledRoom;
  }, [prefilledRoom]);

  // Auto-switch to host mode when no rooms exist
  useEffect(() => {
    if (!roomsLoading && activeRooms.length === 0 && mode === 'join' && !hasAutoSwitchedToHostRef.current) {
      hasAutoSwitchedToHostRef.current = true;
      handleModeChange('host');
    }
    if (activeRooms.length > 0) {
      hasAutoSwitchedToHostRef.current = false;
    }
  }, [roomsLoading, activeRooms.length, mode, handleModeChange]);

  // Check for first-time player
  useEffect(() => {
    if (hasCheckedFirstTimePlayerRef.current) return;
    hasCheckedFirstTimePlayerRef.current = true;

    const timer = setTimeout(() => {
      if (isFirstTimePlayer()) {
        setShowNewPlayerWelcome(true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Memoized handlers
  const generateRoomCode = useCallback(() => {
    setGameCode(generateCode());
  }, [setGameCode]);

  const handleShowFullForm = useCallback(() => {
    setShowFullForm(true);
  }, []);

  const handleClearAndRestart = useCallback(() => {
    setGameCode('');
    setUsername('');
  }, [setGameCode, setUsername]);

  const handleCloseNewPlayerWelcome = useCallback(() => setShowNewPlayerWelcome(false), []);
  const handleCloseQR = useCallback(() => setShowQR(false), []);

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
      } else if (!roomName || !roomName.trim()) {
        // For guests without a room name, generate a random one
        effectiveRoomName = generateRandomRoomName();
        setRoomName(effectiveRoomName);
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

      // Use hostUsername for player identification, roomName for room display
      const playerName = effectiveHostUsername.trim();
      LogRocket.identify(playerName, { name: playerName, role: 'host', gameCode, roomName: rn.trim() });
      if (!isAuthenticated) {
        setGuestName(playerName);
        trackGuestJoin(playerName, gameCode, roomLanguage);
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
      LogRocket.identify(un.trim(), { name: un.trim(), role: 'player', gameCode });
      if (!isAuthenticated) {
        setGuestName(un.trim());
        trackGuestJoin(un.trim(), gameCode, language);
      }
    }

    handleJoin(mode === 'host', roomLanguage);
  };

  const handleRoomSelect = (roomCode: string) => {
    const isSameRoom = gameCode === roomCode;
    setGameCode(roomCode);
    setMode('join');
    setShowFullForm(true);

    if (username && username.trim() && !isSameRoom) {
      setTimeout(() => {
        handleJoin(false, null, roomCode);
      }, 100);
    }
  };

  const handleQuickJoin = (e?: FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    const un = sanitizeInput(username, 20);
    const { isValid: userOk, error: userErr } = validateUsername(un);
    if (!userOk) {
      setUsernameError(true);
      setUsernameErrorKey(userErr);
      notifyError(userErr);
      return;
    }
    LogRocket.identify(un.trim(), { name: un.trim(), role: 'player', gameCode });
    if (!isAuthenticated) {
      setGuestName(un.trim());
      trackGuestJoin(un.trim(), gameCode, language);
    }
    handleJoin(false);
  };

  // Show auto-joining loading state
  if (prefilledRoom && isAutoJoining && username && username.trim()) {
    return (
      <>
        <AutoJoiningState gameCode={gameCode} username={username} error={error} />
        <MenuAnimation />
      </>
    );
  }

  // Show simplified quick join interface when room is prefilled
  if (prefilledRoom && !showFullForm) {
    return (
      <>
        <QuickJoinForm
          gameCode={gameCode}
          username={username}
          setUsername={setUsername}
          error={error}
          isAuthenticated={isAuthenticated}
          displayName={displayName}
          isJoining={isJoining}
          usernameError={usernameError}
          usernameErrorKey={usernameErrorKey}
          setUsernameError={setUsernameError}
          onJoin={handleQuickJoin}
          onShowFullForm={handleShowFullForm}
        />
        <MenuAnimation />
      </>
    );
  }

  // Landscape mode layout - 2-column: form left, room list right
  if (isLandscape) {
    return (
      <div dir={dir} className="flex h-screen w-full overflow-hidden bg-slate-900 text-white p-2 gap-2">
        {/* Left column: Form */}
        <div className="w-1/2 flex flex-col gap-2 overflow-y-auto">
          {/* Mode Selector */}
          <ModeSelector mode={mode} onModeChange={handleModeChange} />

          {/* Error */}
          {error && (
            <Alert variant="destructive" className="py-1">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-2 flex-1 overflow-y-auto">
            <div className="space-y-2">
              {mode === 'host' ? (
                <div className="space-y-2 text-sm">
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
                    <Label className="text-xs font-bold uppercase text-neo-white">{t('joinView.language') || 'Language'}</Label>
                    <LanguageSelector selectedLanguage={roomLanguage} onLanguageChange={setRoomLanguage} />
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
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

            <Button type="submit" disabled={isJoining} className="w-full h-11 min-h-[44px] font-bold uppercase bg-neo-yellow hover:bg-neo-yellow/90 text-neo-black border-2 border-neo-black">
              {mode === 'host' ? <FaCrown className="mr-2" /> : <FaUser className="mr-2" />}
              {isJoining ? (t('common.loading') || 'Loading...') : mode === 'host' ? (t('joinView.createRoom') || 'Create') : (t('joinView.joinRoom') || 'Join')}
            </Button>
          </form>
        </div>

        {/* Right column: Room List */}
        <div className="w-1/2 flex flex-col gap-2 overflow-hidden">
          <h2 className="text-xs font-black uppercase text-neo-white text-center">{t('joinView.activeRooms') || 'Active Rooms'}</h2>
          <div className="flex-1 overflow-y-auto bg-slate-800 text-white rounded-neo border-2 border-neo-black p-2">
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
    );
  }

  // Main join/host form
  return (
    <div dir={dir} className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 pt-4 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col items-center justify-start md:justify-center p-2 sm:p-4 md:p-6 overflow-auto transition-colors duration-300">
      {/* SEO H1 - visible on landing page for search engines */}
      <h1 className="sr-only">LexiClash: Real-Time Word Battle</h1>
      <div className="flex flex-col md:flex-row gap-4 sm:gap-6 w-full max-w-6xl relative z-10 px-2 sm:px-4 md:px-6">
        {/* Main Join/Host Form */}
        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex-1 max-w-md mx-auto w-full"
        >
          <Card className="backdrop-blur-md bg-white/90 text-neo-black dark:bg-slate-800/90 dark:text-white shadow-2xl border border-purple-500/30">
            <CardHeader className="text-center space-y-4" />
            <CardContent className="space-y-2 sm:space-y-4 p-4 sm:p-5">
              {/* Error Alert */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Alert variant="destructive">
                    <AlertDescription>
                      {error}
                      {error.includes(t('errors.sessionExpired').substring(0, 10)) && (
                        <div className="mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleClearAndRestart}
                            className="border-white text-white hover:bg-white/20"
                          >
                            {t('joinView.clearAndRestart')}
                          </Button>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}

              {/* Mode Selection */}
              <ModeSelector mode={mode} onModeChange={handleModeChange} />

              {/* Language Selection (Only for Host) */}
              {mode === 'host' && (
                <LanguageSelector
                  selectedLanguage={roomLanguage}
                  onLanguageChange={setRoomLanguage}
                />
              )}

              <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3">
                {mode === 'join' ? (
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
                ) : (
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
                )}

                {/* Submit Button */}
                <motion.div whileHover={!isJoining ? { x: -2, y: -2 } : {}} whileTap={!isJoining ? { x: 2, y: 2 } : {}}>
                  <Button
                    type="submit"
                    disabled={
                      isJoining ||
                      isProfileLoading ||
                      (mode === 'join'
                        ? (!gameCode || (!isAuthenticated && !username))
                        : (!gameCode || (isAuthenticated && !displayName)))
                    }
                    className={cn(
                      "w-full h-11 text-base font-bold",
                      mode === 'host' ? "bg-neo-pink text-neo-white" : "bg-neo-cyan text-neo-black"
                    )}
                  >
                    {isJoining ? (
                      <>
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="mr-2 inline-block"
                        >
                          <FaSync />
                        </motion.span>
                        {mode === 'host' ? t('joinView.creating') : t('joinView.joining')}
                      </>
                    ) : mode === 'host' ? (
                      <>
                        <span className="mr-2"><FaCrown /></span>
                        {t('joinView.createRoom')}
                      </>
                    ) : (
                      <>
                        <span className="mr-2"><FaUser /></span>
                        {t('joinView.joinRoom')}
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Rooms Panel */}
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
      </div>

      {/* Floating How to Play Button - Links to rules page */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
        className="fixed bottom-6 left-6 z-50 safe-area-bottom"
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={`/${language}/rules`}>
                <Button
                  size="lg"
                  className="rounded-full w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 shadow-2xl hover:shadow-[0_0_25px_rgba(20,184,166,0.6)] p-0"
                >
                  <FaQuestionCircle className="text-xl sm:text-2xl" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{t('joinView.howToPlay')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </motion.div>

      {/* New Player Welcome Modal */}
      <NewPlayerWelcome
        isOpen={showNewPlayerWelcome}
        onClose={handleCloseNewPlayerWelcome}
        rulesPageUrl={`/${language}/rules`}
      />

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="sm:max-w-md bg-white text-neo-black dark:bg-slate-800 dark:text-white border-cyan-500/30">
          <DialogHeader>
            <DialogTitle className="text-center text-cyan-300 flex items-center justify-center gap-2">
              <FaQrcode />
              {t('joinView.qrCodeTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="p-6 bg-white text-neo-black rounded-lg shadow-md">
              <QRCodeSVG value={getJoinUrl(gameCode)} size={250} level="H" includeMargin />
            </div>
            <h4 className="text-3xl font-bold text-cyan-400">{gameCode}</h4>
            <p className="text-sm text-center text-slate-600 dark:text-gray-300">
              {t('joinView.scanToJoin')} {gameCode}
            </p>
            <p className="text-xs text-center text-slate-500 dark:text-gray-300 mt-2">
              {getJoinUrl(gameCode)}
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={handleCloseQR}
              className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)]"
            >
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <Particles />
      </div>
      <MenuAnimation />
    </div>
  );
};

export default JoinView;
