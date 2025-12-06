'use client';

import React, { useState, useEffect, useRef, useCallback, FormEvent } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { FaGamepad, FaCrown, FaUser, FaDice, FaSync, FaQrcode, FaQuestionCircle } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { generateRoomCode as generateCode } from '@/utils/utils';
import { setGuestName } from '@/utils/guestManager';
import { trackGuestJoin } from '@/utils/growthTracking';
import type { JoinViewProps, JoinMode } from '@/types/components';
import type { Language } from '@/shared/types/game';

// Extracted sub-components
import {
  AutoJoiningState,
  QuickJoinForm,
  RoomList,
  LanguageSelector,
  ModeSelector,
} from '@/components/join';

// Dynamic imports for heavy animation components
const HowToPlay = dynamic(() => import('@/components/HowToPlay'), { ssr: false });
const NewPlayerWelcome = dynamic(() => import('@/components/NewPlayerWelcome'), { ssr: false });
const MenuAnimation = dynamic(() => import('@/components/MenuAnimation'), { ssr: false });
const Particles = dynamic(() => import('@/components/Particles'), { ssr: false });

// Import helper for first-time player detection
import { isFirstTimePlayer, markTutorialSeen } from '@/components/NewPlayerWelcome';

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
  isAutoJoining,
  roomsLoading,
  isAuthenticated,
  displayName,
  isProfileLoading,
  isJoining = false
}) => {
  const { t, language, dir } = useLanguage();
  const [mode, setMode] = useState<JoinMode>('join');
  const [showQR, setShowQR] = useState<boolean>(false);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);
  const [showNewPlayerWelcome, setShowNewPlayerWelcome] = useState<boolean>(false);
  const [usernameError, setUsernameError] = useState<boolean>(false);
  const [roomNameError, setRoomNameError] = useState<boolean>(false);
  const [gameCodeError, setGameCodeError] = useState<boolean>(false);
  const [usernameErrorKey, setUsernameErrorKey] = useState<string | undefined>(undefined);
  const [roomNameErrorKey, setRoomNameErrorKey] = useState<string | undefined>(undefined);
  const [gameCodeErrorKey, setGameCodeErrorKey] = useState<string | undefined>(undefined);
  const [showFullForm, setShowFullForm] = useState<boolean>(!prefilledRoom);
  const [roomLanguage, setRoomLanguage] = useState<Language>(language as Language);
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

  const handleJoinGuest = useCallback(() => {
    handleJoin(false);
  }, [handleJoin]);

  const handleShowFullForm = useCallback(() => {
    setShowFullForm(true);
  }, []);

  const handleClearAndRestart = useCallback(() => {
    setGameCode('');
    setUsername('');
  }, [setGameCode, setUsername]);

  const handleShowHowToPlay = useCallback(() => setShowHowToPlay(true), []);
  const handleCloseHowToPlay = useCallback(() => setShowHowToPlay(false), []);
  const handleCloseNewPlayerWelcome = useCallback(() => setShowNewPlayerWelcome(false), []);
  const handleNewPlayerShowTutorial = useCallback(() => {
    setShowNewPlayerWelcome(false);
    markTutorialSeen();
    setShowHowToPlay(true);
  }, []);
  const handleCloseQR = useCallback(() => setShowQR(false), []);

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
      LogRocket.identify(rn.trim(), { name: rn.trim(), role: 'host', gameCode });
      if (!isAuthenticated) {
        setGuestName(rn.trim());
        trackGuestJoin(rn.trim(), gameCode, roomLanguage);
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

  // Main join/host form
  return (
    <div dir={dir} className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 pt-4 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col items-center justify-start md:justify-center p-2 sm:p-4 md:p-6 overflow-auto transition-colors duration-300">
      <div className="flex flex-col md:flex-row gap-4 sm:gap-6 w-full max-w-6xl relative z-10 px-2 sm:px-4 md:px-6">
        {/* Main Join/Host Form */}
        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex-1 max-w-md mx-auto w-full"
        >
          <Card className="backdrop-blur-md bg-white/90 dark:bg-slate-800/90 shadow-2xl border border-purple-500/30">
            <CardHeader className="text-center space-y-4" />
            <CardContent className="space-y-3 sm:space-y-6">
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

              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
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
                      "w-full h-12 text-lg",
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

              <div className="text-center space-y-3">
                <p className="text-sm text-slate-600 dark:text-gray-400">
                  {mode === 'host' ? t('joinView.createGameInstructions') : t('validation.enterGameCode')}
                </p>
              </div>
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

      {/* Floating How to Play Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
        className="fixed bottom-6 left-6 z-50"
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleShowHowToPlay}
                size="lg"
                className="rounded-full w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 shadow-2xl hover:shadow-[0_0_25px_rgba(20,184,166,0.6)] p-0"
              >
                <FaQuestionCircle className="text-xl sm:text-2xl" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t('joinView.howToPlay')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </motion.div>

      {/* New Player Welcome Modal */}
      <NewPlayerWelcome
        isOpen={showNewPlayerWelcome}
        onClose={handleCloseNewPlayerWelcome}
        onShowTutorial={handleNewPlayerShowTutorial}
      />

      {/* How to Play Dialog */}
      <Dialog open={showHowToPlay} onOpenChange={setShowHowToPlay}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">{t('joinView.howToPlayTitle')}</DialogTitle>
          </DialogHeader>
          <HowToPlay onClose={handleCloseHowToPlay} />
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 border-cyan-500/30">
          <DialogHeader>
            <DialogTitle className="text-center text-cyan-300 flex items-center justify-center gap-2">
              <FaQrcode />
              {t('joinView.qrCodeTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="p-6 bg-white rounded-lg shadow-md">
              <QRCodeSVG value={getJoinUrl(gameCode)} size={250} level="H" includeMargin />
            </div>
            <h4 className="text-3xl font-bold text-cyan-400">{gameCode}</h4>
            <p className="text-sm text-center text-slate-600 dark:text-gray-300">
              {t('joinView.scanToJoin')} {gameCode}
            </p>
            <p className="text-xs text-center text-slate-500 dark:text-gray-400 mt-2">
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

// ==========================================
// Form Field Components
// ==========================================

interface JoinModeFieldsProps {
  gameCode: string;
  setGameCode: (code: string) => void;
  gameCodeError: boolean;
  setGameCodeError: (error: boolean) => void;
  gameCodeErrorKey: string | undefined;
  username: string;
  setUsername: (name: string) => void;
  usernameError: boolean;
  setUsernameError: (error: boolean) => void;
  usernameErrorKey: string | undefined;
  isAuthenticated: boolean;
  displayName: string;
  t: (key: string) => string;
}

const JoinModeFields: React.FC<JoinModeFieldsProps> = ({
  gameCode,
  setGameCode,
  gameCodeError,
  setGameCodeError,
  gameCodeErrorKey,
  username,
  setUsername,
  usernameError,
  setUsernameError,
  usernameErrorKey,
  isAuthenticated,
  displayName,
  t,
}) => (
  <>
    <motion.div
      initial={{ x: -50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-2"
    >
      <Label htmlFor="gameCode" className="text-slate-700 dark:text-gray-300">{t('hostView.roomCode')}</Label>
      <Input
        id="gameCode"
        value={gameCode}
        onChange={(e) => {
          setGameCode(e.target.value);
          if (gameCodeError) setGameCodeError(false);
        }}
        required
        placeholder={t('validation.enterFourDigitCode')}
        maxLength={4}
        pattern="[0-9]*"
        inputMode="numeric"
        className={cn(
          "bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-gray-400",
          gameCodeError && "border-red-500 bg-red-900/30 focus-visible:ring-red-500"
        )}
      />
      {gameCodeError && (
        <p className="text-sm text-red-400">{t(gameCodeErrorKey || 'validation.gameCodeInvalid')}</p>
      )}
    </motion.div>

    {/* Username field for guest users */}
    {!isAuthenticated && (
      <motion.div
        animate={usernameError ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="space-y-2"
      >
        <Label htmlFor="username-main" className="text-slate-700 dark:text-gray-300">{t('joinView.playerNamePlaceholder')}</Label>
        <Input
          id="username-main"
          value={username}
          onChange={(e) => {
            setUsername(sanitizeInput(e.target.value, 20));
            if (usernameError) setUsernameError(false);
          }}
          required
          className={cn(
            "bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-gray-400",
            usernameError && "border-red-500 bg-red-900/30 focus-visible:ring-red-500"
          )}
          placeholder={t('joinView.playerNamePlaceholder')}
          maxLength={20}
        />
        {usernameError && (
          <p className="text-sm text-red-400">{t(usernameErrorKey || 'validation.usernameRequired')}</p>
        )}
      </motion.div>
    )}

    {/* Show "Joining as" for authenticated users */}
    {isAuthenticated && displayName && (
      <div className="p-3 rounded-neo bg-neo-navy border-3 border-neo-cyan/50 shadow-hard-sm">
        <p className="text-sm text-neo-cream font-bold">
          {t('joinView.joiningAs') || 'Joining as'}{' '}
          <span className="text-neo-cyan">{displayName}</span>
        </p>
      </div>
    )}
  </>
);

interface HostModeFieldsProps {
  gameCode: string;
  setGameCode: (code: string) => void;
  gameCodeError: boolean;
  setGameCodeError: (error: boolean) => void;
  gameCodeErrorKey: string | undefined;
  roomName: string;
  setRoomName: (name: string) => void;
  roomNameError: boolean;
  setRoomNameError: (error: boolean) => void;
  roomNameErrorKey: string | undefined;
  generateRoomCode: () => void;
  isAuthenticated: boolean;
  displayName: string;
  isProfileLoading: boolean;
  t: (key: string) => string;
}

const HostModeFields: React.FC<HostModeFieldsProps> = ({
  gameCode,
  setGameCode,
  gameCodeError,
  setGameCodeError,
  gameCodeErrorKey,
  roomName,
  setRoomName,
  roomNameError,
  setRoomNameError,
  roomNameErrorKey,
  generateRoomCode,
  isAuthenticated,
  displayName,
  isProfileLoading,
  t,
}) => (
  <>
    {/* Host Player Name - show for guests OR authenticated users without displayName */}
    {(!isAuthenticated || !displayName) && !isProfileLoading && (
      <motion.div
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="space-y-2"
      >
        <Label htmlFor="roomName" className="text-slate-700 dark:text-gray-300">{t('joinView.yourName')}</Label>
        <Input
          id="roomName"
          value={roomName}
          onChange={(e) => {
            setRoomName(sanitizeInput(e.target.value, 30));
            if (roomNameError) setRoomNameError(false);
          }}
          required
          className={cn(
            "bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-gray-400",
            roomNameError && "border-red-500 bg-red-900/30 focus-visible:ring-red-500"
          )}
          placeholder={t('joinView.enterYourName')}
          maxLength={30}
        />
        {roomNameError && (
          <p className="text-sm text-red-400">{t(roomNameErrorKey || 'joinView.pleaseEnterYourName')}</p>
        )}
        {!roomNameError && (
          <p className="text-sm text-slate-500 dark:text-gray-400">{t('joinView.playerAndRoomName')}</p>
        )}
      </motion.div>
    )}

    {/* Show loading indicator when profile is loading */}
    {isAuthenticated && !displayName && isProfileLoading && (
      <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <p className="text-sm text-amber-600 dark:text-amber-400">
          {t('joinView.loadingProfile') || 'Loading your profile...'}
        </p>
      </div>
    )}

    {/* Show "Hosting as" for authenticated users in host mode */}
    {isAuthenticated && displayName && (
      <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
        <p className="text-sm text-slate-600 dark:text-gray-400">
          {t('joinView.hostingAs') || 'Hosting as'}{' '}
          <span className="font-semibold text-purple-600 dark:text-purple-400">{displayName}</span>
        </p>
      </div>
    )}

    {/* Room Code */}
    <motion.div
      initial={{ x: 50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="space-y-2"
    >
      <Label htmlFor="gameCode" className="text-slate-700 dark:text-gray-300">{t('hostView.roomCode')}</Label>
      <div className="flex gap-2">
        <Input
          id="gameCode"
          value={gameCode}
          onChange={(e) => {
            setGameCode(e.target.value);
            if (gameCodeError) setGameCodeError(false);
          }}
          required
          placeholder={t('validation.fourDigitCode')}
          maxLength={4}
          pattern="[0-9]*"
          inputMode="numeric"
          className={cn(
            "flex-1 bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-gray-400",
            gameCodeError && "border-red-500 bg-red-900/30 focus-visible:ring-red-500"
          )}
        />
        {gameCodeError && (
          <p className="text-sm text-red-400">{t(gameCodeErrorKey || 'validation.gameCodeInvalid')}</p>
        )}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                onClick={generateRoomCode}
                size="icon"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]"
              >
                <FaDice />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('joinView.generateNewCode')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <p className="text-sm text-slate-500 dark:text-gray-400">
        {t('validation.codeHelper')}
      </p>
    </motion.div>
  </>
);

export default JoinView;
