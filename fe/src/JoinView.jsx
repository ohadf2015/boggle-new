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
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-purple-700 flex flex-col items-center justify-center p-4 sm:p-6">
        {/* Animated Title */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="animated-title mb-8"
          onClick={handleLogoClick}
          style={{ cursor: 'pointer' }}
        >
          <span className="text text-5xl sm:text-6xl md:text-7xl">Boggle</span>
        </motion.div>

        {/* Quick Join Form */}
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="w-full max-w-md"
        >
          <Card className="backdrop-blur-lg bg-white/95 shadow-2xl">
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <FaGamepad size={48} className="text-indigo-600" />
              </div>
              <CardTitle className="text-2xl sm:text-3xl text-indigo-600">
                הצטרפות למשחק
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                אתה מצטרף לחדר <strong>{gameCode}</strong>
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
                <Badge className="text-xl px-6 py-3 bg-indigo-600 hover:bg-indigo-700">
                  Room: {gameCode}
                </Badge>
              </div>

              <form onSubmit={handleQuickJoin} className="space-y-4">
                <motion.div
                  animate={usernameError ? { x: [-10, 10, -10, 10, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  className="space-y-2"
                >
                  <Label htmlFor="username">Username</Label>
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
                      "h-11",
                      usernameError && "border-red-500 bg-red-50 focus-visible:ring-red-500"
                    )}
                    placeholder="Enter your name"
                    maxLength={20}
                  />
                  {usernameError && (
                    <p className="text-sm text-red-500">שם משתמש נדרש! אנא מלא את השדה</p>
                  )}
                  {!usernameError && (
                    <p className="text-sm text-muted-foreground">Enter your name to join</p>
                  )}
                </motion.div>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    type="submit"
                    disabled={!username}
                    className="w-full h-12 text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-purple-600 hover:to-indigo-600"
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
                  className="w-full text-indigo-600"
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-purple-700 flex flex-col items-center justify-center p-4 sm:p-6 overflow-auto">
      {/* Animated Title */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="animated-title mb-8"
        onClick={handleLogoClick}
        style={{ cursor: 'pointer' }}
      >
        <span className="text text-5xl sm:text-6xl md:text-7xl">Boggle</span>
      </motion.div>

      <div className="flex flex-col md:flex-row gap-6 w-full max-w-6xl">
        {/* Active Rooms Panel */}
        {mode === 'join' && (
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex-1"
          >
            <Card className="backdrop-blur-lg bg-white/95 shadow-xl h-full max-h-[500px] flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-indigo-600">חדרים פעילים</CardTitle>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={refreshRooms}
                          className="text-indigo-600 hover:text-indigo-700"
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
                  <div className="text-center py-8 text-muted-foreground">
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
                            ? "bg-indigo-100 hover:bg-indigo-200"
                            : "hover:bg-gray-100"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-bold text-indigo-600">{room.roomName || room.gameCode}</p>
                            <p className="text-sm text-muted-foreground">קוד: {room.gameCode}</p>
                          </div>
                          <Badge variant="secondary" className="h-5 text-xs">
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

        {/* Main Join/Host Form */}
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="flex-1"
        >
          <Card className="backdrop-blur-lg bg-white/95 shadow-2xl">
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <FaGamepad size={48} className="text-indigo-600" />
              </div>
              <CardTitle className="text-2xl sm:text-3xl text-indigo-600">
                Welcome to Boggle!
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
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
                  <ToggleGroupItem value="join" className="flex-1 data-[state=on]:bg-indigo-600 data-[state=on]:text-white">
                    <FaUser className="mr-2" />
                    הצטרף למשחק
                  </ToggleGroupItem>
                  <ToggleGroupItem value="host" className="flex-1 data-[state=on]:bg-indigo-600 data-[state=on]:text-white">
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
                    <Label htmlFor="gameCode">קוד משחק</Label>
                    <Input
                      id="gameCode"
                      value={gameCode}
                      onChange={(e) => setGameCode(e.target.value)}
                      required
                      placeholder="הזן קוד בן 4 ספרות"
                      maxLength={4}
                      pattern="[0-9]*"
                      inputMode="numeric"
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
                      <Label htmlFor="roomName">שם החדר</Label>
                      <Input
                        id="roomName"
                        value={roomName}
                        onChange={(e) => {
                          setRoomName(e.target.value);
                          if (roomNameError) setRoomNameError(false);
                        }}
                        required
                        className={cn(
                          roomNameError && "border-red-500 bg-red-50 focus-visible:ring-red-500"
                        )}
                        placeholder="הזן שם לחדר (לדוגמה: משחק שישי)"
                        maxLength={30}
                      />
                      {roomNameError && (
                        <p className="text-sm text-red-500">שם חדר נדרש! אנא מלא את השדה</p>
                      )}
                      {!roomNameError && (
                        <p className="text-sm text-muted-foreground">שם לזיהוי החדר שלך</p>
                      )}
                    </motion.div>

                    {/* Room Code */}
                    <motion.div
                      initial={{ x: 50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className="space-y-2"
                    >
                      <Label htmlFor="gameCode">קוד משחק</Label>
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
                          className="flex-1"
                        />
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                onClick={generateRoomCode}
                                size="icon"
                                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-purple-600 hover:to-indigo-600"
                              >
                                <FaDice />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>צור קוד חדש</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <p className="text-sm text-muted-foreground">
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
                    <Label htmlFor="username-main">Username</Label>
                    <Input
                      id="username-main"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (usernameError) setUsernameError(false);
                      }}
                      required
                      className={cn(
                        usernameError && "border-red-500 bg-red-50 focus-visible:ring-red-500"
                      )}
                      placeholder="Enter your name"
                      maxLength={20}
                    />
                    {usernameError && (
                      <p className="text-sm text-red-500">שם משתמש נדרש! אנא מלא את השדה</p>
                    )}
                  </motion.div>
                )}

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    type="submit"
                    disabled={mode === 'join' ? (!gameCode || !username) : !gameCode}
                    className="w-full h-12 text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-purple-600 hover:to-indigo-600"
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
                <p className="text-sm text-muted-foreground">
                  {mode === 'host'
                    ? 'צור משחק ושתף את הקוד עם חברים!'
                    : 'הזן את קוד המשחק ששותף על ידי המארח'}
                </p>

                {/* Share Buttons for Hosts */}
                {mode === 'host' && gameCode && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => copyJoinUrl(gameCode)}
                      className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                    >
                      <FaLink className="mr-2" />
                      העתק קישור
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => shareViaWhatsApp(gameCode, roomName)}
                      className="border-green-600 text-green-600 hover:bg-green-50"
                    >
                      <FaWhatsapp className="mr-2" />
                      שתף בוואטסאפ
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => setShowQR(true)}
                      className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                    >
                      <FaQrcode className="mr-2" />
                      ברקוד
                    </Button>
                  </div>
                )}
              </div>
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
                onClick={() => setShowHowToPlay(true)}
                size="lg"
                className="rounded-full w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-emerald-600 hover:to-green-500 shadow-2xl"
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
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">איך משחקים בבוגל</DialogTitle>
          </DialogHeader>
          <HowToPlay />
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={() => setShowHowToPlay(false)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-purple-600 hover:to-indigo-600 text-lg px-8"
            >
              הבנתי, בוא נשחק! 🎮
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-indigo-600 flex items-center justify-center gap-2">
              <FaQrcode />
              קוד QR להצטרפות
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="p-6 bg-white rounded-lg shadow-md">
              <QRCodeSVG value={getJoinUrl()} size={250} level="H" includeMargin />
            </div>
            <h4 className="text-3xl font-bold text-indigo-600">{gameCode}</h4>
            <p className="text-sm text-center text-muted-foreground">
              סרוק את הקוד כדי להצטרף למשחק או השתמש בקוד {gameCode}
            </p>
            <p className="text-xs text-center text-muted-foreground mt-2">
              {getJoinUrl()}
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={() => setShowQR(false)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-purple-600 hover:to-indigo-600"
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
            className="absolute rounded-full bg-white/30"
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
