import React, { useState } from 'react';
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
import './style/animation.scss';
import { cn } from './lib/utils';
import { copyJoinUrl, shareViaWhatsApp, getJoinUrl } from './utils/share';

const JoinView = ({ handleJoin, gameCode, username, setGameCode, setUsername, error, activeRooms, refreshRooms, prefilledRoom, roomName, setRoomName }) => {
  const [mode, setMode] = useState('join'); // 'join' or 'host'
  const [showQR, setShowQR] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [usernameError, setUsernameError] = useState(false);
  const [roomNameError, setRoomNameError] = useState(false);
  const [showFullForm, setShowFullForm] = useState(!prefilledRoom); // Show simplified form if room is prefilled

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
      // Host needs room name
      if (!roomName || !roomName.trim()) {
        setRoomNameError(true);
        setTimeout(() => setRoomNameError(false), 2000);
        return;
      }
    } else {
      // Player needs username
      if (!username || !username.trim()) {
        setUsernameError(true);
        setTimeout(() => setUsernameError(false), 2000);
        return;
      }
    }

    handleJoin(mode === 'host');
  };

  const handleRoomSelect = (roomCode) => {
    setGameCode(roomCode);
  };

  const handleQuickJoin = (e) => {
    e.preventDefault();
    if (!username || !username.trim()) {
      setUsernameError(true);
      setTimeout(() => setUsernameError(false), 2000);
      return;
    }
    handleJoin(false); // Always join mode for quick join
  };

  // Handle logo click to clear room params
  const handleLogoClick = () => {
    const url = new URL(window.location);
    url.searchParams.delete('room');
    window.history.replaceState({}, '', url.pathname);
    setShowFullForm(true);
    setGameCode('');
  };

  // Removed - now using utility function from utils/share

  // Show simplified quick join interface when room is prefilled
  if (prefilledRoom && !showFullForm) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4 sm:p-6">
        {/* Animated Title */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
          onClick={handleLogoClick}
          style={{ cursor: 'pointer' }}
        >
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-purple-400">
            BOGGLE
          </h1>
        </motion.div>

        {/* Quick Join Form */}
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="w-full max-w-md"
        >
          <Card className="backdrop-blur-md bg-slate-800/90 shadow-2xl border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <FaGamepad size={48} className="text-cyan-400" />
              </div>
              <CardTitle className="text-2xl sm:text-3xl text-cyan-300">
                הצטרפות למשחק
              </CardTitle>
              <CardDescription className="text-sm sm:text-base text-gray-300">
                אתה מצטרף לחדר <strong className="text-purple-400">{gameCode}</strong>
              </CardDescription>
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

              {/* Room Code Display */}
              <div className="flex justify-center">
                <Badge className="text-xl px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500">
                  Room: {gameCode}
                </Badge>
              </div>

              <form onSubmit={handleQuickJoin} className="space-y-4">
                <motion.div
                  animate={usernameError ? { x: [-10, 10, -10, 10, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  className="space-y-2"
                >
                  <Label htmlFor="username" className="text-gray-300">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (usernameError) setUsernameError(false);
                    }}
                    required
                    autoFocus
                    className={cn(
                      "h-11 bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400",
                      usernameError && "border-red-500 bg-red-900/30 focus-visible:ring-red-500"
                    )}
                    placeholder="Enter your name"
                    maxLength={20}
                  />
                  {usernameError && (
                    <p className="text-sm text-red-400">שם משתמש נדרש! אנא מלא את השדה</p>
                  )}
                  {!usernameError && (
                    <p className="text-sm text-gray-400">Enter your name to join</p>
                  )}
                </motion.div>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    type="submit"
                    disabled={!username}
                    className="w-full h-12 text-lg font-bold bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.5)]"
                  >
                    <FaUser className="mr-2" />
                    Join Game
                  </Button>
                </motion.div>

                {/* Switch to full form */}
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setShowFullForm(true)}
                  className="w-full text-cyan-400 hover:text-cyan-300 hover:bg-slate-700/50"
                >
                  Want to host or join a different room?
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 overflow-auto">
      {/* Animated Title */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
        onClick={handleLogoClick}
        style={{ cursor: 'pointer' }}
      >
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-purple-400">
          BOGGLE
        </h1>
      </motion.div>

      <div className="flex flex-col-reverse md:flex-row gap-6 w-full max-w-6xl">
        {/* Main Join/Host Form */}
        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex-1"
        >
          <Card className="backdrop-blur-md bg-slate-800/90 shadow-2xl border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <FaGamepad size={48} className="text-purple-400" />
              </div>
              <CardTitle className="text-2xl sm:text-3xl text-purple-300">
                Welcome to Boggle!
              </CardTitle>
              <CardDescription className="text-sm sm:text-base text-gray-300">
                בחר את התפקיד שלך כדי להתחיל
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                      {error.includes('הסשן הקודם') && (
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
                            נקה והתחל מחדש
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
                    <FaUser className="mr-2" />
                    הצטרף למשחק
                  </ToggleGroupItem>
                  <ToggleGroupItem value="host" className="flex-1 border-slate-600 text-gray-300 data-[state=on]:bg-gradient-to-r data-[state=on]:from-purple-500 data-[state=on]:to-pink-500 data-[state=on]:text-white data-[state=on]:border-transparent">
                    <FaCrown className="mr-2" />
                    צור משחק
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'join' ? (
                  <motion.div
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="gameCode" className="text-gray-300">קוד משחק</Label>
                    <Input
                      id="gameCode"
                      value={gameCode}
                      onChange={(e) => setGameCode(e.target.value)}
                      required
                      placeholder="הזן קוד בן 4 ספרות"
                      maxLength={4}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400"
                    />
                  </motion.div>
                ) : (
                  <>
                    {/* Room Name */}
                    <motion.div
                      initial={{ x: 50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-2"
                    >
                      <Label htmlFor="roomName" className="text-gray-300">שם החדר</Label>
                      <Input
                        id="roomName"
                        value={roomName}
                        onChange={(e) => {
                          setRoomName(e.target.value);
                          if (roomNameError) setRoomNameError(false);
                        }}
                        required
                        className={cn(
                          "bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400",
                          roomNameError && "border-red-500 bg-red-900/30 focus-visible:ring-red-500"
                        )}
                        placeholder="הזן שם לחדר (לדוגמה: משחק שישי)"
                        maxLength={30}
                      />
                      {roomNameError && (
                        <p className="text-sm text-red-400">שם חדר נדרש! אנא מלא את השדה</p>
                      )}
                      {!roomNameError && (
                        <p className="text-sm text-gray-400">שם לזיהוי החדר שלך</p>
                      )}
                    </motion.div>

                    {/* Room Code */}
                    <motion.div
                      initial={{ x: 50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className="space-y-2"
                    >
                      <Label htmlFor="gameCode" className="text-gray-300">קוד משחק</Label>
                      <div className="flex gap-2">
                        <Input
                          id="gameCode"
                          value={gameCode}
                          onChange={(e) => setGameCode(e.target.value)}
                          required
                          placeholder="קוד בן 4 ספרות"
                          maxLength={4}
                          pattern="[0-9]*"
                          inputMode="numeric"
                          className="flex-1 bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400"
                        />
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
                            <TooltipContent>צור קוד חדש</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <p className="text-sm text-gray-400">
                        קוד שישתפו השחקנים כדי להצטרף
                      </p>
                    </motion.div>
                  </>
                )}

                {/* Only show username field for join mode, not host mode */}
                {mode === 'join' && (
                  <motion.div
                    animate={usernameError ? { x: [-10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="username-main" className="text-gray-300">Username</Label>
                    <Input
                      id="username-main"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (usernameError) setUsernameError(false);
                      }}
                      required
                      className={cn(
                        "bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400",
                        usernameError && "border-red-500 bg-red-900/30 focus-visible:ring-red-500"
                      )}
                      placeholder="Enter your name"
                      maxLength={20}
                    />
                    {usernameError && (
                      <p className="text-sm text-red-400">שם משתמש נדרש! אנא מלא את השדה</p>
                    )}
                  </motion.div>
                )}

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    type="submit"
                    disabled={mode === 'join' ? (!gameCode || !username) : !gameCode}
                    className="w-full h-12 text-lg font-bold bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.5)]"
                  >
                    {mode === 'host' ? (
                      <>
                        <FaCrown className="mr-2" />
                        צור חדר
                      </>
                    ) : (
                      <>
                        <FaUser className="mr-2" />
                        הצטרף למשחק
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>

              <div className="text-center space-y-3">
                <p className="text-sm text-gray-400">
                  {mode === 'host'
                    ? 'צור משחק ושתף את הקוד עם חברים!'
                    : 'הזן את קוד המשחק ששותף על ידי המארח'}
                </p>

                {/* Share Buttons for Hosts */}
                {mode === 'host' && gameCode && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    <ShareButton
                      variant="link"
                      onClick={() => copyJoinUrl(gameCode)}
                      icon={<FaLink />}
                    >
                      העתק קישור
                    </ShareButton>
                    <ShareButton
                      variant="whatsapp"
                      onClick={() => shareViaWhatsApp(gameCode, roomName)}
                      icon={<FaWhatsapp />}
                    >
                      שתף בוואטסאפ
                    </ShareButton>
                    <ShareButton
                      variant="qr"
                      onClick={() => setShowQR(true)}
                      icon={<FaQrcode />}
                    >
                      ברקוד
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
            className="flex-1"
          >
            <Card className="backdrop-blur-md bg-slate-800/90 shadow-xl h-full max-h-[500px] flex flex-col border border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.1)]">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-teal-400">חדרים פעילים</CardTitle>
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
                      <TooltipContent>רענן</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                {activeRooms.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-sm">אין חדרים פעילים</p>
                    <p className="text-xs mt-1">צור חדר חדש כדי להתחיל!</p>
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
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-bold text-cyan-400">{room.roomName || room.gameCode}</p>
                            <p className="text-sm text-gray-400">קוד: {room.gameCode}</p>
                          </div>
                          <Badge variant="secondary" className="h-5 text-xs bg-slate-700 text-gray-300">
                            {room.playerCount} player{room.playerCount !== 1 ? 's' : ''}
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
                className="rounded-full w-16 h-16 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 shadow-2xl hover:shadow-[0_0_25px_rgba(20,184,166,0.6)]"
              >
                <FaQuestionCircle size={28} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">איך משחקים?</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </motion.div>

      {/* How to Play Dialog */}
      <Dialog open={showHowToPlay} onOpenChange={setShowHowToPlay}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-800 border-cyan-500/30">
          <DialogHeader>
            <DialogTitle className="sr-only">איך משחקים בבוגל</DialogTitle>
          </DialogHeader>
          <HowToPlay />
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={() => setShowHowToPlay(false)}
              className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] text-lg px-8"
            >
              הבנתי, בוא נשחק!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="sm:max-w-md bg-slate-800 border-cyan-500/30">
          <DialogHeader>
            <DialogTitle className="text-center text-cyan-300 flex items-center justify-center gap-2">
              <FaQrcode />
              קוד QR להצטרפות
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="p-6 bg-white rounded-lg shadow-md">
              <QRCodeSVG value={getJoinUrl()} size={250} level="H" includeMargin />
            </div>
            <h4 className="text-3xl font-bold text-cyan-400">{gameCode}</h4>
            <p className="text-sm text-center text-gray-300">
              סרוק את הקוד כדי להצטרף למשחק או השתמש בקוד {gameCode}
            </p>
            <p className="text-xs text-center text-gray-400 mt-2">
              {getJoinUrl()}
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={() => setShowQR(false)}
              className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)]"
            >
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating particles effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
            }}
            animate={{
              y: [null, Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000)],
              x: [null, Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000)],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
            className="absolute rounded-full bg-cyan-400/20"
            style={{
              width: Math.random() * 10 + 5,
              height: Math.random() * 10 + 5,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default JoinView;
