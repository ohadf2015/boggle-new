import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { FaGamepad, FaCrown, FaUser, FaDice, FaSync, FaQrcode, FaWhatsapp, FaLink, FaQuestionCircle } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Alert, AlertDescription } from './components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from './components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip';
import ShareButton from './components/ShareButton';
import { cn } from './lib/utils';
import { copyJoinUrl, shareViaWhatsApp, getJoinUrl } from './utils/share';
import { useLanguage } from './contexts/LanguageContext';
import LogRocket from 'logrocket';
import { validateUsername, validateRoomName, validateGameCode, sanitizeInput } from './utils/validation';
import { useValidation } from './hooks/useValidation';
import { generateRoomCode as generateCode } from './utils/utils';

// Dynamic imports for heavy animation components (reduces initial bundle by ~50KB)
const HowToPlay = dynamic(() => import('./components/HowToPlay'), { ssr: false });
const MenuAnimation = dynamic(() => import('./components/MenuAnimation'), { ssr: false });
const Particles = dynamic(() => import('./components/Particles'), { ssr: false });

const JoinView = ({ handleJoin, gameCode, username, setGameCode, setUsername, error, activeRooms, refreshRooms, prefilledRoom, roomName, setRoomName, isAutoJoining, roomsLoading, isAuthenticated, displayName, isProfileLoading, isJoining = false }) => {
  const { t, language, dir } = useLanguage();
  const [mode, setMode] = useState('join'); // 'join' or 'host'
  const [showQR, setShowQR] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [usernameError, setUsernameError] = useState(false);
  const [roomNameError, setRoomNameError] = useState(false);
  const [gameCodeError, setGameCodeError] = useState(false);
  const [usernameErrorKey, setUsernameErrorKey] = useState(null);
  const [roomNameErrorKey, setRoomNameErrorKey] = useState(null);
  const [gameCodeErrorKey, setGameCodeErrorKey] = useState(null);
  const [showFullForm, setShowFullForm] = useState(!prefilledRoom); // Show simplified form if room is prefilled
  const [roomLanguage, setRoomLanguage] = useState(language); // Separate state for room/game language
  const [mobileRoomsExpanded, setMobileRoomsExpanded] = useState(false); // Mobile rooms list expansion
  const usernameInputRef = useRef(null);
  const prevPrefilledRoomRef = useRef(prefilledRoom);
  const { notifyError } = useValidation(t);
  const hasAutoSwitchedToHostRef = useRef(false);

  // Define handleModeChange before effects that use it
  const handleModeChange = useCallback((newMode) => {
    if (newMode) {
      setMode(newMode);
      // Auto-generate code when switching to host mode
      if (newMode === 'host') {
        setGameCode(generateCode());
      }
    }
  }, [setGameCode]);

  // Sync showFullForm when prefilledRoom prop changes (from URL params loaded after mount)
  // Using ref to track previous value and only update when it actually changes to a truthy value
  useEffect(() => {
    if (prefilledRoom && !prevPrefilledRoomRef.current) {
      // Schedule the state update for the next tick to avoid synchronous setState in effect
      Promise.resolve().then(() => setShowFullForm(false));
    }
    prevPrefilledRoomRef.current = prefilledRoom;
  }, [prefilledRoom]);

  // Auto-switch to host mode when no rooms exist and not loading
  useEffect(() => {
    if (!roomsLoading && activeRooms.length === 0 && mode === 'join' && !hasAutoSwitchedToHostRef.current) {
      hasAutoSwitchedToHostRef.current = true;
      handleModeChange('host');
    }
    // Reset the flag when rooms become available again
    if (activeRooms.length > 0) {
      hasAutoSwitchedToHostRef.current = false;
    }
  }, [roomsLoading, activeRooms.length, mode, handleModeChange]);

  const generateRoomCode = useCallback(() => {
    setGameCode(generateCode());
  }, [setGameCode]);

  // Memoized handlers
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

  const handleSetLanguageEn = useCallback(() => setRoomLanguage('en'), []);
  const handleSetLanguageHe = useCallback(() => setRoomLanguage('he'), []);
  const handleSetLanguageSv = useCallback(() => setRoomLanguage('sv'), []);
  const handleSetLanguageJa = useCallback(() => setRoomLanguage('ja'), []);

  const handleSwitchToHostMode = useCallback(() => {
    handleModeChange('host');
  }, [handleModeChange]);

  const handleShowHowToPlay = useCallback(() => {
    setShowHowToPlay(true);
  }, []);

  const handleCloseHowToPlay = useCallback(() => {
    setShowHowToPlay(false);
  }, []);

  const handleCloseQR = useCallback(() => {
    setShowQR(false);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate based on mode
    if (mode === 'host') {
      // For authenticated users with displayName but empty roomName, use displayName
      let effectiveRoomName = roomName;
      if (isAuthenticated && displayName && (!roomName || !roomName.trim())) {
        effectiveRoomName = displayName;
        setRoomName(displayName);
      }

      // Host needs room name
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
        // Errors stay visible until user corrects input (cleared in onChange handlers)
        return;
      }
      // Identify host in LogRocket
      LogRocket.identify(rn.trim(), {
        name: rn.trim(),
        role: 'host',
        gameCode: gameCode,
      });
    } else {
      // Player needs username
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
        // Errors stay visible until user corrects input (cleared in onChange handlers)
        return;
      }
      // Identify player in LogRocket
      LogRocket.identify(un.trim(), {
        name: un.trim(),
        role: 'player',
        gameCode: gameCode,
      });
    }

    handleJoin(mode === 'host', roomLanguage);
  };

  const handleRoomSelect = (roomCode) => {
    // Check if clicking the same room that's already selected
    const isSameRoom = gameCode === roomCode;

    setGameCode(roomCode);
    setMode('join');
    setShowFullForm(true);

    // Auto-join if username is already set AND this is a different room
    // (prevents duplicate join attempts when clicking the same room multiple times)
    if (username && username.trim() && !isSameRoom) {
      // Small delay to let state update, then auto-join
      // Pass roomCode directly to avoid stale state issues
      setTimeout(() => {
        handleJoin(false, null, roomCode);
      }, 100);
    }
  };

  const handleQuickJoin = (e) => {
    e.preventDefault();
    const un = sanitizeInput(username, 20);
    const { isValid: userOk, error: userErr } = validateUsername(un);
    if (!userOk) {
      setUsernameError(true);
      setUsernameErrorKey(userErr);
      usernameInputRef.current?.focus();
      notifyError(userErr);
      // Errors stay visible until user corrects input (cleared in onChange handlers)
      return;
    }
    // Identify player in LogRocket
    LogRocket.identify(un.trim(), {
      name: un.trim(),
      role: 'player',
      gameCode: gameCode,
    });
    handleJoin(false); // Always join mode for quick join
  };



  // Removed - now using utility function from utils/share

  // Show auto-joining loading state when user has saved name and came via invitation
  if (prefilledRoom && isAutoJoining && username && username.trim()) {
    return (
      <div className="min-h-screen bg-neo-black pt-4 flex flex-col items-center justify-center p-2 sm:p-4 md:p-6">
        <motion.div
          initial={{ scale: 0, rotate: -3 }}
          animate={{ scale: 1, rotate: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="w-full max-w-md"
        >
          <Card className="bg-neo-navy border-4 border-neo-cream rounded-neo shadow-hard">
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="p-4 bg-neo-cyan rounded-neo border-3 border-neo-black shadow-hard-sm"
                >
                  <FaGamepad size={48} className="text-neo-black" />
                </motion.div>
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-black uppercase text-neo-cream tracking-tight">
                {t('joinView.joiningRoom')}
              </CardTitle>
              <div className="flex justify-center">
                <div className="text-2xl px-8 py-4 bg-neo-pink text-neo-white font-black uppercase rounded-neo border-3 border-neo-black shadow-hard -rotate-1">
                  {t('joinView.room')} {gameCode}
                </div>
              </div>
              <p className="text-neo-cream/70 font-bold uppercase text-sm">
                {t('joinView.welcomeBack')}, <span className="text-neo-cyan">{username}</span>!
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Error Alert - Neo-Brutalist */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="p-4 bg-neo-pink/20 border-3 border-neo-pink rounded-neo">
                    <p className="text-neo-pink font-bold uppercase text-sm">{error}</p>
                  </div>
                </motion.div>
              )}

              {/* Loading animation - Neo-Brutalist blocks */}
              <div className="flex justify-center py-4">
                <motion.div
                  className="flex space-x-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-4 h-4 bg-neo-cyan border-2 border-neo-black rounded-neo"
                      animate={{
                        y: [-8, 8, -8],
                        rotate: [0, 180, 360],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </motion.div>
              </div>

              <p className="text-center text-neo-cream/60 text-sm font-bold uppercase">
                {t('joinView.connectingToRoom')}
              </p>
            </CardContent>
          </Card>
        </motion.div>
        <MenuAnimation />
      </div>
    );
  }

  // Show simplified quick join interface when room is prefilled (no saved username)
  if (prefilledRoom && !showFullForm) {
    return (
      <div className="min-h-screen bg-neo-black pt-4 flex flex-col items-center justify-center p-2 sm:p-4 md:p-6">
        {/* Quick Join Form - Neo-Brutalist */}
        <motion.div
          initial={{ scale: 0, rotate: -3 }}
          animate={{ scale: 1, rotate: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="w-full max-w-md"
        >
          <Card className="bg-neo-navy border-4 border-neo-cream rounded-neo shadow-hard">
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-neo-cyan rounded-neo border-3 border-neo-black shadow-hard-sm rotate-3">
                  <FaGamepad size={48} className="text-neo-black" />
                </div>
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-black uppercase text-neo-cream tracking-tight">
                {t('joinView.inviteTitle')}
              </CardTitle>
              {/* Room number prominently displayed - Neo-Brutalist Badge */}
              <div className="flex justify-center">
                <div className="text-2xl px-8 py-4 bg-neo-pink text-neo-white font-black uppercase rounded-neo border-3 border-neo-black shadow-hard -rotate-1">
                  {t('joinView.room')} {gameCode}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-6">
              {/* Error Alert - Neo-Brutalist */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="p-4 bg-neo-pink/20 border-3 border-neo-pink rounded-neo">
                    <p className="text-neo-pink font-bold uppercase text-sm">{error}</p>
                  </div>
                </motion.div>
              )}

              {/* Authenticated user - simplified view */}
              {isAuthenticated && displayName ? (
                <div className="space-y-4 sm:space-y-6">
                  {/* Display name input section */}
                  <div className="space-y-3">
                    <Label htmlFor="auth-display-name" className="text-base font-black uppercase text-neo-cream">
                      {t('joinView.joiningAs') || 'Joining as'}
                    </Label>
                    <Input
                      id="auth-display-name"
                      value={username || displayName}
                      onChange={(e) => setUsername(sanitizeInput(e.target.value, 20))}
                      className="w-full h-16 sm:h-14 text-xl sm:text-lg text-center font-black text-neo-cyan uppercase tracking-tight bg-neo-navy border-3 border-neo-cyan/50 rounded-neo shadow-hard-sm placeholder:text-neo-cyan/50 focus:border-neo-cyan focus:ring-0"
                      placeholder={displayName}
                      maxLength={20}
                    />
                    <p className="text-neo-cream/50 text-xs font-bold uppercase text-center">
                      {t('joinView.tapToChangeDisplayName') || 'Tap to change display name'}
                    </p>
                  </div>

                  {/* Play button - Neo-Brutalist */}
                  <motion.div whileHover={!isJoining ? { x: -2, y: -2 } : {}} whileTap={!isJoining ? { x: 2, y: 2 } : {}}>
                    <Button
                      onClick={handleJoinGuest}
                      disabled={isJoining}
                      className="w-full h-16 sm:h-14 text-xl font-black uppercase bg-neo-lime text-neo-black border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:bg-neo-lime/90 transition-all disabled:opacity-70"
                    >
                      {isJoining ? (
                        <>
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="mr-3 inline-block"
                          >
                            <FaSync size={24} />
                          </motion.span>
                          {t('joinView.joining')}
                        </>
                      ) : (
                        <>
                          <FaGamepad className="mr-3" size={24} />
                          {t('joinView.joinGame')}
                        </>
                      )}
                    </Button>
                  </motion.div>

                  {/* Switch to full form - Neo-Brutalist link */}
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={handleShowFullForm}
                      className="text-sm text-neo-cyan font-bold uppercase underline underline-offset-4 hover:text-neo-cyan/80 transition-colors"
                    >
                      {t('joinView.wantToHostOrJoinOther')}
                    </button>
                  </div>
                </div>
              ) : (
                /* Guest user - needs name input */
                <form onSubmit={handleQuickJoin} className="space-y-3 sm:space-y-6">
                  {/* Simple name input - Neo-Brutalist */}
                  <motion.div
                    animate={usernameError ? { x: [-10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="username" className="text-base font-black uppercase text-neo-cream">
                      {t('joinView.enterNameToPlay')}
                    </Label>
                    <Input
                      ref={usernameInputRef}
                      id="username"
                      value={username}
                      onChange={(e) => {
                        setUsername(sanitizeInput(e.target.value, 20));
                        if (usernameError) setUsernameError(false);
                      }}
                      required
                      autoFocus
                      className={cn(
                        "h-14 text-lg bg-neo-cream text-neo-black font-bold border-3 border-neo-black rounded-neo shadow-hard-sm placeholder:text-neo-black/50 focus:border-neo-cyan focus:ring-0",
                        usernameError && "border-neo-pink bg-neo-pink/20 text-neo-pink"
                      )}
                      placeholder={t('joinView.playerNamePlaceholder')}
                      maxLength={20}
                    />
                    {usernameError && (
                      <p className="text-sm text-neo-pink font-bold uppercase">{t(usernameErrorKey || 'validation.usernameRequired')}</p>
                    )}
                  </motion.div>

                  {/* Play button - Neo-Brutalist */}
                  <motion.div whileHover={!isJoining ? { x: -2, y: -2 } : {}} whileTap={!isJoining ? { x: 2, y: 2 } : {}}>
                    <Button
                      type="submit"
                      disabled={!username || isJoining}
                      className="w-full h-14 text-xl font-black uppercase bg-neo-lime text-neo-black border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:bg-neo-lime/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isJoining ? (
                        <>
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="mr-3 inline-block"
                          >
                            <FaSync size={24} />
                          </motion.span>
                          {t('joinView.joining')}
                        </>
                      ) : (
                        <>
                          <FaGamepad className="mr-3" size={24} />
                          {t('joinView.joinGame')}
                        </>
                      )}
                    </Button>
                  </motion.div>

                  {/* Switch to full form - Neo-Brutalist link */}
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={handleShowFullForm}
                      className="text-sm text-neo-cyan font-bold uppercase underline underline-offset-4 hover:text-neo-cyan/80 transition-colors"
                    >
                      {t('joinView.wantToHostOrJoinOther')}
                    </button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* MenuAnimation - Flying Letters Background */}
        <MenuAnimation />
      </div>
    );
  }

  return (
    <div dir={dir} className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 pt-4 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col items-center justify-start md:justify-center p-2 sm:p-4 md:p-6 overflow-auto transition-colors duration-300">
      {/* Animated Title */}


      <div className="flex flex-col md:flex-row gap-4 sm:gap-6 w-full max-w-6xl relative z-10 px-2 sm:px-4 md:px-6">
        {/* Main Join/Host Form */}
        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex-1 max-w-md mx-auto w-full"
        >
          <Card className="backdrop-blur-md bg-white/90 dark:bg-slate-800/90 shadow-2xl border border-purple-500/30">
            <CardHeader className="text-center space-y-4">
            </CardHeader>
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
              <div className="flex justify-center">
                <ToggleGroup
                  type="single"
                  value={mode}
                  onValueChange={handleModeChange}
                  className="w-full"
                  variant="outline"
                >
                  <ToggleGroupItem value="join" className="flex-1 data-[state=on]:bg-neo-cyan data-[state=on]:text-neo-black">
                    <span className="mr-2"><FaUser /></span>
                    {t('joinView.joinRoom')}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="host" className="flex-1 data-[state=on]:bg-neo-pink data-[state=on]:text-neo-white">
                    <span className="mr-2"><FaCrown /></span>
                    {t('joinView.createRoom')}
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {/* Language Selection (Only for Host) - Neo-Brutalist Dark Mode */}
              {mode === 'host' && (
                <div className="space-y-2">
                    <CardDescription className="text-sm sm:text-base font-bold uppercase text-neo-cream">
                        {t('joinView.selectLanguage')}
                   </CardDescription>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={handleSetLanguageEn}
                      className={cn(
                        "flex flex-col items-center gap-1 p-3 rounded-neo border-3 transition-all duration-100",
                        roomLanguage === 'en'
                          ? "bg-neo-cyan border-neo-cyan text-neo-black shadow-hard"
                          : "bg-white border-neo-black text-neo-black shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] hover:border-neo-cyan"
                      )}
                    >
                      <span className="text-2xl">🇺🇸</span>
                      <span className="font-bold text-xs uppercase">{t('joinView.english')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSetLanguageHe}
                      className={cn(
                        "flex flex-col items-center gap-1 p-3 rounded-neo border-3 transition-all duration-100",
                        roomLanguage === 'he'
                          ? "bg-neo-cyan border-neo-cyan text-neo-black shadow-hard"
                          : "bg-white border-neo-black text-neo-black shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] hover:border-neo-cyan"
                      )}
                    >
                      <span className="text-2xl">🇮🇱</span>
                      <span className="font-bold text-xs uppercase">{t('joinView.hebrew')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSetLanguageSv}
                      className={cn(
                        "flex flex-col items-center gap-1 p-3 rounded-neo border-3 transition-all duration-100",
                        roomLanguage === 'sv'
                          ? "bg-neo-cyan border-neo-cyan text-neo-black shadow-hard"
                          : "bg-white border-neo-black text-neo-black shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] hover:border-neo-cyan"
                      )}
                    >
                      <span className="text-2xl">🇸🇪</span>
                      <span className="font-bold text-xs uppercase">{t('joinView.swedish')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSetLanguageJa}
                      className={cn(
                        "flex flex-col items-center gap-1 p-3 rounded-neo border-3 transition-all duration-100",
                        roomLanguage === 'ja'
                          ? "bg-neo-cyan border-neo-cyan text-neo-black shadow-hard"
                          : "bg-white border-neo-black text-neo-black shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] hover:border-neo-cyan"
                      )}
                    >
                      <span className="text-2xl">🇯🇵</span>
                      <span className="font-bold text-xs uppercase">{t('joinView.japanese')}</span>
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                {mode === 'join' ? (
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
                ) : (
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

                    {/* Show loading indicator when profile is loading for authenticated users */}
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
                )}

                {/* Only show username field for join mode (guest users only) */}
                {mode === 'join' && !isAuthenticated && (
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

                {/* Show "Joining as" for authenticated users in join mode - Neo-Brutalist Dark */}
                {mode === 'join' && isAuthenticated && displayName && (
                  <div className="p-3 rounded-neo bg-neo-navy border-3 border-neo-cyan/50 shadow-hard-sm">
                    <p className="text-sm text-neo-cream font-bold">
                      {t('joinView.joiningAs') || 'Joining as'}{' '}
                      <span className="text-neo-cyan">{displayName}</span>
                    </p>
                  </div>
                )}

                {/* Neo-Brutalist Submit Button */}
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
                      mode === 'host'
                        ? "bg-neo-pink text-neo-white"
                        : "bg-neo-cyan text-neo-black"
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
                  {mode === 'host'
                    ? t('joinView.createGameInstructions')
                    : t('validation.enterGameCode')}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Rooms Panel - Collapsible on mobile */}
        <motion.div
          initial={{ x: -50, opacity: 0, rotate: 2 }}
          animate={{ x: 0, opacity: 1, rotate: 1 }}
          transition={{ duration: 0.5 }}
          className="flex-1 relative z-10"
        >
          <Card className="flex h-full flex-col">
            {/* Mobile: Clickable header to expand/collapse */}
            <CardHeader
              className="md:cursor-default cursor-pointer"
              onClick={() => setMobileRoomsExpanded(!mobileRoomsExpanded)}
            >
              <div className="flex h-full justify-between items-center">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle>{t('joinView.roomsList')}</CardTitle>
                  {/* Social proof: Show total players online */}
                  {activeRooms.length > 0 && (
                    <Badge className="bg-neo-lime text-neo-black border-2 border-neo-black">
                      {activeRooms.reduce((sum, room) => sum + (room.playerCount || 0), 0)} {t('joinView.playersOnline')}
                    </Badge>
                  )}
                  {/* Mobile: Expand/collapse indicator */}
                  <span className="md:hidden text-slate-500 dark:text-slate-400 text-sm">
                    {mobileRoomsExpanded ? '▲' : '▼'}
                  </span>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          refreshRooms();
                        }}
                      >
                        <FaSync />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('common.refresh')}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            {/* Content: Always visible on desktop, collapsible on mobile */}
            <CardContent className={cn(
              "flex-1 overflow-auto transition-all duration-300",
              "md:block", // Always visible on desktop
              mobileRoomsExpanded ? "block" : "hidden md:block" // Collapsible on mobile
            )}>
              {roomsLoading ? (
                // Loading skeleton for rooms - Neo-Brutalist
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-full p-3 rounded-neo bg-neo-navy/50 border-3 border-neo-cream/20 animate-pulse"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-neo-cream/20 rounded-neo" />
                          <div>
                            <div className="h-5 w-24 bg-neo-cream/20 rounded-neo mb-1" />
                            <div className="h-3 w-16 bg-neo-cream/10 rounded-neo" />
                          </div>
                        </div>
                        <div className="h-5 w-16 bg-neo-cream/20 rounded-neo" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activeRooms.length === 0 ? (
                <div className="text-center py-6 text-neo-cream/60 space-y-4">
                  {mode === 'join' && (
                    <motion.div whileHover={{ x: -2, y: -2 }} whileTap={{ x: 2, y: 2 }}>
                      <Button
                        onClick={handleSwitchToHostMode}
                        className="bg-neo-pink text-neo-white"
                      >
                        <span className="mr-2"><FaCrown /></span>
                        {t('joinView.createRoom')}
                      </Button>
                    </motion.div>
                  )}
                  <div className="flex justify-center">
                    <FaGamepad size={48} className="text-neo-cream/30" />
                  </div>
                  <div>
                    <p className="text-base font-bold uppercase text-black">{t('joinView.noRooms')}</p>
                    <p className="text-sm mt-1 text-black/70">{t('joinView.createNewRoom')}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeRooms.map((room) => (
                    <button
                      key={room.gameCode}
                      onClick={() => handleRoomSelect(room.gameCode)}
                      className={cn(
                        "w-full p-3 rounded-neo text-left transition-all duration-100 border-3",
                        gameCode === room.gameCode
                          ? "bg-neo-cyan border-neo-cyan text-neo-black shadow-hard"
                          : "bg-neo-navy border-neo-cream/50 text-neo-cream shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] hover:border-neo-cyan"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl" title={room.language === 'he' ? t('joinView.hebrew') : room.language === 'sv' ? t('joinView.swedish') : room.language === 'ja' ? t('joinView.japanese') : t('joinView.english')}>
                            {room.language === 'he' ? '🇮🇱' : room.language === 'sv' ? '🇸🇪' : room.language === 'ja' ? '🇯🇵' : '🇺🇸'}
                          </span>
                          <div>
                            <div className={cn("font-black text-lg", gameCode === room.gameCode ? "text-neo-black" : "text-neo-cream")}>{room.roomName || room.gameCode}</div>
                            <div className={cn("text-xs font-bold", gameCode === room.gameCode ? "text-neo-black/60" : "text-neo-cream/60")}>
                              {t('joinView.host')}: {room.gameCode}
                            </div>
                          </div>
                        </div>
                        <Badge className="bg-neo-cyan text-neo-black border-2 border-neo-black">
                          {room.playerCount}{' '}{t('joinView.players')}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
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

      {/* How to Play Dialog */}
      <Dialog open={showHowToPlay} onOpenChange={setShowHowToPlay}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 border-cyan-500/30">
          <DialogHeader>
            <DialogTitle className="sr-only">{t('joinView.howToPlayTitle')}</DialogTitle>
          </DialogHeader>
          <HowToPlay />
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={handleCloseHowToPlay}
              className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] text-lg px-8"
            >
              {t('common.understood')}
            </Button>
          </DialogFooter>
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

      {/* Floating particles effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <Particles />
      </div>
      {/* MenuAnimation - Flying Letters Background */}
      <MenuAnimation />
    </div>
  );
};

export default JoinView;
