import React, { useState, useEffect, useRef } from 'react';
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
import HowToPlay from './components/HowToPlay';
import ShareButton from './components/ShareButton';
import MenuAnimation from './components/MenuAnimation';
import Particles from './components/Particles';
import { cn } from './lib/utils';
import { copyJoinUrl, shareViaWhatsApp, getJoinUrl } from './utils/share';
import { useLanguage } from './contexts/LanguageContext';
import LogRocket from 'logrocket';
import { validateUsername, validateRoomName, validateGameCode, sanitizeInput } from './utils/validation';
import { useValidation } from './hooks/useValidation';

const JoinView = ({ handleJoin, gameCode, username, setGameCode, setUsername, error, activeRooms, refreshRooms, prefilledRoom, roomName, setRoomName, isAutoJoining, roomsLoading, isAuthenticated, displayName, isProfileLoading }) => {
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
  const usernameInputRef = useRef(null);
  const { notifyError } = useValidation(t);

  // Sync showFullForm when prefilledRoom prop changes (from URL params loaded after mount)
  useEffect(() => {
    if (prefilledRoom) {
      setShowFullForm(false);
    }
  }, [prefilledRoom]);

  const handleModeChange = (newMode) => {
    if (newMode) {
      setMode(newMode);
      // Auto-generate code when switching to host mode
      if (newMode === 'host') {
        generateRoomCode();
      }
    }
  };

  const generateRoomCode = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGameCode(code);
  };

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
        setTimeout(() => {
          setRoomNameError(false);
          setGameCodeError(false);
          setRoomNameErrorKey(null);
          setGameCodeErrorKey(null);
        }, 2500);
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
        setTimeout(() => {
          setUsernameError(false);
          setGameCodeError(false);
          setUsernameErrorKey(null);
          setGameCodeErrorKey(null);
        }, 2500);
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
    setGameCode(roomCode);
    setMode('join');
    setShowFullForm(true);

    // Auto-join if username is already set
    if (username && username.trim()) {
      // Small delay to let state update, then auto-join
      setTimeout(() => {
        handleJoin(false);
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
      setTimeout(() => {
        setUsernameError(false);
        setUsernameErrorKey(null);
      }, 2500);
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
      <div className="min-h-screen bg-gradient-to-b pt-4 from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col items-center justify-center p-2 sm:p-4 md:p-6 transition-colors duration-300">
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="w-full max-w-md"
        >
          <Card className="backdrop-blur-md bg-white/90 h-full dark:bg-slate-800/90 shadow-2xl border border-cyan-500/30">
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <FaGamepad size={48} className="text-cyan-400" />
                </motion.div>
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">
                {t('joinView.joiningRoom')}
              </CardTitle>
              <div className="flex justify-center">
                <Badge className="text-2xl px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-600">
                  {t('joinView.room')} {gameCode}
                </Badge>
              </div>
              <p className="text-slate-600 dark:text-gray-400">
                {t('joinView.welcomeBack')}, <span className="font-semibold text-cyan-600 dark:text-cyan-400">{username}</span>!
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Error Alert */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}

              {/* Loading animation */}
              <div className="flex justify-center py-4">
                <motion.div
                  className="flex space-x-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-3 h-3 bg-cyan-500 rounded-full"
                      animate={{
                        y: [-5, 5, -5],
                        opacity: [1, 0.5, 1],
                      }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </motion.div>
              </div>

              <p className="text-center text-slate-500 dark:text-gray-400 text-sm">
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
      <div className="min-h-screen bg-gradient-to-b pt-4 from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col items-center justify-center p-2 sm:p-4 md:p-6 transition-colors duration-300">
        {/* Quick Join Form */}
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="w-full max-w-md"
        >
          <Card className="backdrop-blur-md bg-white/90 dark:bg-slate-800/90 shadow-2xl border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <FaGamepad size={48} className="text-cyan-400" />
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">
                {t('joinView.inviteTitle')}
              </CardTitle>
              {/* Room number prominently displayed */}
              <div className="flex justify-center">
                <Badge className="text-2xl px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500">
                  {t('joinView.room')} {gameCode}
                </Badge>
              </div>
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
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}

              {/* Authenticated user - simplified view */}
              {isAuthenticated && displayName ? (
                <div className="space-y-3 sm:space-y-6">
                  <div className="text-center py-4">
                    <p className="text-slate-600 dark:text-gray-400 mb-2">
                      {t('joinView.welcomeBack') || 'Welcome back'},
                    </p>
                    <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                      {displayName}
                    </p>
                  </div>

                  {/* Error Alert */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    </motion.div>
                  )}

                  {/* Play button */}
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Button
                      onClick={() => handleJoin(false)}
                      className="w-full h-14 text-xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 hover:shadow-[0_0_25px_rgba(34,197,94,0.5)] transition-all"
                    >
                      <FaGamepad className="mr-3" size={24} />
                      {t('joinView.joinGame')}
                    </Button>
                  </motion.div>

                  {/* Switch to full form - subtle link */}
                  <div className="text-center pt-2">
                    <Button
                      variant="link"
                      size="sm"
                      type="button"
                      onClick={() => setShowFullForm(true)}
                      className="text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 underline"
                    >
                      {t('joinView.wantToHostOrJoinOther')}
                    </Button>
                  </div>
                </div>
              ) : (
                /* Guest user - needs name input */
                <form onSubmit={handleQuickJoin} className="space-y-3 sm:space-y-6">
                  {/* Simple name input */}
                  <motion.div
                    animate={usernameError ? { x: [-10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="username" className="text-base font-semibold text-slate-700 dark:text-gray-300">
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
                        "h-14 text-lg bg-slate-100 dark:bg-slate-700/50 border-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500",
                        usernameError && "border-red-500 bg-red-50 dark:bg-red-900/30 focus-visible:ring-red-500"
                      )}
                      placeholder={t('joinView.playerNamePlaceholder')}
                      maxLength={20}
                    />
                    {usernameError && (
                      <p className="text-sm text-red-500 dark:text-red-400">{t(usernameErrorKey || 'validation.usernameRequired')}</p>
                    )}
                  </motion.div>

                  {/* Play button */}
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Button
                      type="submit"
                      disabled={!username}
                      className="w-full h-14 text-xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 hover:shadow-[0_0_25px_rgba(34,197,94,0.5)] transition-all"
                    >
                      <FaGamepad className="mr-3" size={24} />
                      {t('joinView.joinGame')}
                    </Button>
                  </motion.div>

                  {/* Switch to full form - subtle link */}
                  <div className="text-center pt-2">
                    <Button
                      variant="link"
                      size="sm"
                      type="button"
                      onClick={() => setShowFullForm(true)}
                      className="text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 underline"
                    >
                      {t('joinView.wantToHostOrJoinOther')}
                    </Button>
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


      <div className="flex flex-col-reverse md:flex-row gap-4 sm:gap-6 w-full max-w-6xl relative z-10 px-2 sm:px-4 md:px-6">
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
                            onClick={() => {
                              setGameCode('');
                              setUsername('');
                            }}
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
                  <ToggleGroupItem value="join" className="flex-1 border-slate-600 text-gray-300 data-[state=on]:bg-gradient-to-r data-[state=on]:from-cyan-500 data-[state=on]:to-teal-500 data-[state=on]:text-white data-[state=on]:border-transparent">
                    <span className="mr-2"><FaUser /></span>
                    {t('joinView.joinRoom')}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="host" className="flex-1 border-slate-600 text-gray-300 data-[state=on]:bg-gradient-to-r data-[state=on]:from-purple-500 data-[state=on]:to-pink-500 data-[state=on]:text-white data-[state=on]:border-transparent">
                    <span className="mr-2"><FaCrown /></span>
                    {t('joinView.createRoom')}
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {/* Language Selection (Only for Host) - Button Style */}
              {mode === 'host' && (
                <div className="space-y-2">
                    <CardDescription className="text-sm sm:text-base text-slate-600 dark:text-gray-300">
                        {t('joinView.selectLanguage')}
                   </CardDescription>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => setRoomLanguage('en')}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all duration-300",
                        roomLanguage === 'en'
                          ? "border-cyan-500 bg-cyan-500/20 shadow-lg shadow-cyan-500/30"
                          : "border-slate-300 dark:border-slate-600 hover:border-cyan-400 dark:hover:border-cyan-500"
                      )}
                    >
                      <span className="text-2xl">🇺🇸</span>
                      <span className={cn(
                        "font-medium text-xs",
                        roomLanguage === 'en' ? "text-cyan-600 dark:text-cyan-300" : "text-slate-600 dark:text-gray-400"
                      )}>{t('joinView.english')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoomLanguage('he')}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all duration-300",
                        roomLanguage === 'he'
                          ? "border-cyan-500 bg-cyan-500/20 shadow-lg shadow-cyan-500/30"
                          : "border-slate-300 dark:border-slate-600 hover:border-cyan-400 dark:hover:border-cyan-500"
                      )}
                    >
                      <span className="text-2xl">🇮🇱</span>
                      <span className={cn(
                        "font-medium text-xs",
                        roomLanguage === 'he' ? "text-cyan-600 dark:text-cyan-300" : "text-slate-600 dark:text-gray-400"
                      )}>{t('joinView.hebrew')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoomLanguage('sv')}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all duration-300",
                        roomLanguage === 'sv'
                          ? "border-cyan-500 bg-cyan-500/20 shadow-lg shadow-cyan-500/30"
                          : "border-slate-300 dark:border-slate-600 hover:border-cyan-400 dark:hover:border-cyan-500"
                      )}
                    >
                      <span className="text-2xl">🇸🇪</span>
                      <span className={cn(
                        "font-medium text-xs",
                        roomLanguage === 'sv' ? "text-cyan-600 dark:text-cyan-300" : "text-slate-600 dark:text-gray-400"
                      )}>{t('joinView.swedish')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoomLanguage('ja')}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all duration-300",
                        roomLanguage === 'ja'
                          ? "border-cyan-500 bg-cyan-500/20 shadow-lg shadow-cyan-500/30"
                          : "border-slate-300 dark:border-slate-600 hover:border-cyan-400 dark:hover:border-cyan-500"
                      )}
                    >
                      <span className="text-2xl">🇯🇵</span>
                      <span className={cn(
                        "font-medium text-xs",
                        roomLanguage === 'ja' ? "text-cyan-600 dark:text-cyan-300" : "text-slate-600 dark:text-gray-400"
                      )}>{t('joinView.japanese')}</span>
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
                      onChange={(e) => setGameCode(e.target.value)}
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
                          onChange={(e) => setGameCode(e.target.value)}
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

                {/* Show "Joining as" for authenticated users in join mode */}
                {mode === 'join' && isAuthenticated && displayName && (
                  <div className="p-3 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800">
                    <p className="text-sm text-slate-600 dark:text-gray-400">
                      {t('joinView.joiningAs') || 'Joining as'}{' '}
                      <span className="font-semibold text-cyan-600 dark:text-cyan-400">{displayName}</span>
                    </p>
                  </div>
                )}

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    type="submit"
                    disabled={
                      isProfileLoading ||
                      (mode === 'join'
                        ? (!gameCode || (!isAuthenticated && !username))
                        : (!gameCode || (isAuthenticated && !displayName)))
                    }
                    className="w-full h-12 text-lg font-bold bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.5)]"
                  >
                    {mode === 'host' ? (
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

                {/* Share Buttons for Hosts */}
                {mode === 'host' && gameCode && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    <ShareButton
                      variant="link"
                      onClick={() => copyJoinUrl(gameCode, t)}
                      icon={<FaLink />}
                    >
                      {t('joinView.copyLink')}
                    </ShareButton>
                    <ShareButton
                      variant="whatsapp"
                      onClick={() => shareViaWhatsApp(gameCode, roomName, t)}
                      icon={<FaWhatsapp />}
                    >
                      {t('joinView.shareWhatsapp')}
                    </ShareButton>
                    <ShareButton
                      variant="qr"
                      onClick={() => setShowQR(true)}
                      icon={<FaQrcode />}
                    >
                      {t('hostView.qrCode')}
                    </ShareButton>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Rooms Panel */}
        {mode === 'join' && (
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex-1 relative z-10"
          >
            <Card className={cn(
              "backdrop-blur-md bg-white/90 dark:bg-slate-800/90 shadow-xl flex h-full flex-col border border-teal-500/30",
            )}>
              <CardHeader>
                <div className="flex h-full justify-between items-center">
                  <CardTitle className="text-teal-400">{t('joinView.roomsList')}</CardTitle>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={refreshRooms}
                          className="text-teal-400 hover:text-teal-300 hover:bg-slate-700/50"
                        >
                          <FaSync />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('common.refresh')}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                {roomsLoading ? (
                  // Loading skeleton for rooms
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="w-full p-3 rounded-lg bg-slate-700/30 animate-pulse"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-slate-600/50 rounded-full" />
                            <div>
                              <div className="h-5 w-24 bg-slate-600/50 rounded mb-1" />
                              <div className="h-3 w-16 bg-slate-600/30 rounded" />
                            </div>
                          </div>
                          <div className="h-5 w-16 bg-slate-600/50 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activeRooms.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 dark:text-gray-400 space-y-4">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={() => handleModeChange('host')}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                      >
                        <span className="mr-2"><FaCrown /></span>
                        {t('joinView.createRoom')}
                      </Button>
                    </motion.div>
                    <div className="flex justify-center">
                      <FaGamepad size={48} className="text-slate-400 dark:text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t('joinView.noRooms')}</p>
                      <p className="text-xs mt-1">{t('joinView.createNewRoom')}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeRooms.map((room) => (
                      <button
                        key={room.gameCode}
                        onClick={() => handleRoomSelect(room.gameCode)}
                        className={cn(
                          "w-full p-3 rounded-lg text-left transition-colors",
                          gameCode === room.gameCode
                            ? "bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50"
                            : "hover:bg-slate-700/50"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl" title={room.language === 'he' ? t('joinView.hebrew') : room.language === 'sv' ? t('joinView.swedish') : room.language === 'ja' ? t('joinView.japanese') : t('joinView.english')}>
                              {room.language === 'he' ? '🇮🇱' : room.language === 'sv' ? '🇸🇪' : room.language === 'ja' ? '🇯🇵' : '🇺🇸'}
                            </span>
                            <div>
                              <div className="font-bold text-lg text-cyan-400">{room.roomName || room.gameCode}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {t('joinView.host')}: {room.gameCode}
                              </div>
                            </div>
                          </div>
                          <Badge variant="secondary" className="h-5 text-xs bg-slate-700 text-gray-300">
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
        )}
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
                onClick={() => setShowHowToPlay(true)}
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
              onClick={() => setShowHowToPlay(false)}
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
              onClick={() => setShowQR(false)}
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
