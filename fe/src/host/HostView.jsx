import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import toast, { Toaster } from 'react-hot-toast';
import { FaTrophy, FaClock, FaUsers, FaQrcode, FaSignOutAlt, FaWhatsapp, FaLink, FaCog } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Progress } from '../components/ui/progress';
import { AchievementBadge } from '../components/AchievementBadge';
import '../style/animation.scss';
import { generateRandomTable } from '../utils/utils';
import { useWebSocket } from '../utils/WebSocketContext';
import { clearSession } from '../utils/session';
import { copyJoinUrl, shareViaWhatsApp } from '../utils/share';
import { DIFFICULTIES, DEFAULT_DIFFICULTY } from '../utils/consts';
import { cn } from '../lib/utils';

const HostView = ({ gameCode }) => {
  const ws = useWebSocket();
  const [difficulty, setDifficulty] = useState(DEFAULT_DIFFICULTY);
  const [tableData, setTableData] = useState(generateRandomTable());
  const [timerValue, setTimerValue] = useState('');
  const [remainingTime, setRemainingTime] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [playersReady, setPlayersReady] = useState([]);
  const [showValidation, setShowValidation] = useState(false);
  const [playerWords, setPlayerWords] = useState([]);
  const [validations, setValidations] = useState({});
  const [finalScores, setFinalScores] = useState(null);
  const [showQR, setShowQR] = useState(false);

  // Prevent accidental page refresh/close only when there are players or game is active
  useEffect(() => {
    const shouldWarn = playersReady.length > 0 || gameStarted;

    if (!shouldWarn) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = ''; // Chrome requires returnValue to be set
      return ''; // Some browsers require a return value
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [playersReady.length, gameStarted]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!ws) {
      return;
    }

    const handleMessage = (event) => {
      const message = JSON.parse(event.data);
      const { action } = message;

      switch (action) {
        case 'updateUsers':
          setPlayersReady(message.users || []);
          break;

        case 'playerJoinedLate':
          toast.success(`${message.username} הצטרף למשחק באמצע! ⏰`, {
            icon: '🚀',
            duration: 4000,
          });
          break;

        case 'updateLeaderboard':
          setLeaderboard(message.leaderboard);
          break;

        case 'playerFoundWord':
          toast(`${message.username} מצא "${message.word}"!`, {
            icon: '🎯',
            duration: 2000,
          });
          break;

        case 'showValidation':
          setPlayerWords(message.playerWords);
          setShowValidation(true);
          // Initialize validations object with unique words only
          const initialValidations = {};
          const uniqueWords = new Set();
          message.playerWords.forEach(player => {
            player.words.forEach(wordObj => {
              uniqueWords.add(wordObj.word);
            });
          });
          uniqueWords.forEach(word => {
            initialValidations[word] = true; // Default to valid
          });
          setValidations(initialValidations);
          toast.success('סקור ואשר את כל המילים', {
            icon: '✅',
            duration: 5000,
          });
          break;

        case 'validationComplete':
          setFinalScores(message.scores);
          setShowValidation(false);
          toast.success('האימות הושלם!', {
            icon: '🎉',
            duration: 3000,
          });
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
          });
          break;

        case 'timeUpdate':
          // Server-synced timer update
          setRemainingTime(message.remainingTime);
          // Check if game just ended
          if (message.remainingTime === 0 && gameStarted) {
            setGameStarted(false);
            confetti({
              particleCount: 150,
              spread: 80,
              origin: { y: 0.6 },
            });
            toast.success('Game Over! Check final scores', {
              icon: '🏁',
              duration: 5000,
            });
          }
          break;

        default:
          break;
      }
    };

    // Store the original handler to chain them (don't overwrite App-level handler)
    const originalHandler = ws.onmessage;

    const chainedHandler = (event) => {
      // First let HostView handle its messages
      handleMessage(event);
      
      // Then let the original App handler process any messages it needs
      if (originalHandler && typeof originalHandler === 'function') {
        originalHandler(event);
      }
    };

    ws.onmessage = chainedHandler;

    return () => {
      // Restore the original handler when component unmounts
      if (originalHandler) {
        ws.onmessage = originalHandler;
      }
    };
  }, [ws, gameStarted]);

  const startGame = () => {
    const difficultyConfig = DIFFICULTIES[difficulty];
    const newTable = generateRandomTable(difficultyConfig.rows, difficultyConfig.cols);
    setTableData(newTable);
    const seconds = timerValue * 60;
    setRemainingTime(seconds);
    setGameStarted(true);

    // Send start game message with letter grid and timer
    ws.send(
      JSON.stringify({
        action: 'startGame',
        letterGrid: newTable,
        timerSeconds: seconds,
      })
    );

    toast.success('המשחק התחיל!', {
      icon: '🎮',
      duration: 3000,
    });
  };

  const stopGame = () => {
    ws.send(JSON.stringify({ action: 'endGame', gameCode }));
    setRemainingTime(null);
    setGameStarted(false);

    toast('Game Stopped', {
      icon: '⏹️',
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExitRoom = () => {
    if (window.confirm('האם אתה בטוח שברצונך לצאת? זה יסגור את החדר לכל השחקנים.')) {
      // Clear session cookie
      clearSession();
      // Send close room message to server first
      ws.send(JSON.stringify({ action: 'closeRoom', gameCode }));
      // Wait a bit for the message to be sent, then close and reload
      setTimeout(() => {
        ws.close();
        window.location.reload();
      }, 100);
    }
  };

  const submitValidation = () => {
    // Convert validations object to array with unique words only
    const validationArray = [];
    Object.keys(validations).forEach(word => {
      validationArray.push({
        word: word,
        isValid: validations[word],
      });
    });

    ws.send(JSON.stringify({
      action: 'validateWords',
      validations: validationArray,
    }));

    toast.loading('Validating words...', {
      duration: 2000,
    });
  };

  const toggleWordValidation = (username, word) => {
    // username is not used anymore - we validate by word only
    setValidations(prev => ({
      ...prev,
      [word]: !prev[word],
    }));
  };

  const getLetterColor = () => {
    // Single color for all tiles during gameplay
    return '#667eea';
  };

  // Get the join URL for QR code - use public URL if available
  const getJoinUrl = () => {
    const publicUrl = process.env.REACT_APP_PUBLIC_URL || window.location.origin;
    return `${publicUrl}?room=${gameCode}`;
  };

  // Collect unique words and count duplicates for validation modal
  const getUniqueWords = () => {
    const uniqueWordsMap = new Map();
    playerWords.forEach(player => {
      player.words.forEach(wordObj => {
        const word = wordObj.word;
        if (!uniqueWordsMap.has(word)) {
          uniqueWordsMap.set(word, {
            word: word,
            playerCount: 1,
            players: [player.username]
          });
        } else {
          const existing = uniqueWordsMap.get(word);
          existing.playerCount++;
          existing.players.push(player.username);
        }
      });
    });

    // Convert to array and sort alphabetically
    const uniqueWords = Array.from(uniqueWordsMap.values());
    uniqueWords.sort((a, b) => a.word.localeCompare(b.word));
    return uniqueWords;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-600 via-purple-600 to-pink-600 flex flex-col items-center p-4 sm:p-6 overflow-auto">
      <Toaster position="top-center" />

      {/* Validation Modal */}
      <Dialog open={showValidation} onOpenChange={setShowValidation}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl sm:text-3xl text-indigo-600 font-bold">
              ✅ אימות מילים
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-center text-muted-foreground">
              סמן את המילים התקינות. מילים לא מסומנות יוסרו מהציון הסופי.
            </p>
            <p className="text-center text-sm text-orange-600 font-bold">
              ⚠ מילים שמופיעות אצל יותר משחקן אחד יוסרו אוטומטית
            </p>

            {showValidation && (() => {
              const uniqueWords = getUniqueWords();

              return (
                <div className="space-y-3">
                  <p className="text-center text-sm text-muted-foreground">
                    סה"כ {uniqueWords.length} מילים למאמת
                  </p>

                  <div className="max-h-[50vh] overflow-auto space-y-2">
                    {uniqueWords.map((item, index) => {
                      const isDuplicate = item.playerCount > 1;
                      const isValid = validations[item.word] !== undefined ? validations[item.word] : true;

                      return (
                        <div
                          key={index}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg transition-colors border",
                            isDuplicate
                              ? "bg-orange-50 hover:bg-orange-100 border-orange-200"
                              : "hover:bg-gray-50 border-gray-200"
                          )}
                        >
                          <Checkbox
                            checked={isValid}
                            onCheckedChange={() => toggleWordValidation(null, item.word)}
                            disabled={isDuplicate}
                            className={cn(isDuplicate && "opacity-50")}
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <span className={cn(
                              "text-lg font-medium",
                              isDuplicate && "line-through text-gray-500"
                            )}>
                              {item.word}
                            </span>
                            {isDuplicate && (
                              <Badge variant="destructive" className="bg-orange-500">
                                ⚠ {item.playerCount} שחקנים
                              </Badge>
                            )}
                            {item.playerCount === 1 && (
                              <span className="text-sm text-muted-foreground ml-auto">
                                {item.players[0]}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button
              onClick={submitValidation}
              className="w-full h-12 text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-purple-600 hover:to-indigo-600"
            >
              שלח אימות
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Final Scores Modal */}
      <Dialog open={!!finalScores} onOpenChange={() => setFinalScores(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-3xl sm:text-4xl text-yellow-500 font-bold flex items-center justify-center gap-2">
              <FaTrophy /> תוצאות סופיות
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {finalScores && finalScores.map((player, index) => (
              <motion.div
                key={player.username}
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.2 }}
              >
                <Card className={cn(
                  "p-4",
                  index === 0 && "bg-gradient-to-r from-yellow-400 to-orange-500 text-white scale-105 shadow-xl",
                  index === 1 && "bg-gradient-to-r from-gray-300 to-gray-400 shadow-lg",
                  index === 2 && "bg-gradient-to-r from-orange-400 to-orange-600 text-white shadow-lg"
                )}>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xl font-bold">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`} {player.username}
                    </h3>
                    <span className="text-3xl font-bold">{player.score}</span>
                  </div>

                  <p className="text-sm mb-1">
                    מילים: {player.wordCount} {player.validWordCount !== undefined && `(${player.validWordCount} תקינות)`}
                  </p>

                  {player.longestWord && (
                    <p className="text-sm mb-2">
                      הארוכה ביותר: <strong>{player.longestWord}</strong>
                    </p>
                  )}

                  {/* Word Visualization with colors */}
                  {player.allWords && player.allWords.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-bold mb-2">מילים:</p>
                      <div className="flex flex-wrap gap-2">
                        {player.allWords.map((wordObj, i) => (
                          <Badge
                            key={i}
                            className={cn(
                              "font-bold",
                              wordObj.validated
                                ? "text-white"
                                : "bg-gray-400 text-white opacity-60"
                            )}
                            style={{
                              backgroundColor: wordObj.validated
                                ? ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'][i % 7]
                                : undefined
                            }}
                          >
                            {wordObj.word} {wordObj.validated ? `(${wordObj.score})` : '(✗)'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {player.achievements && player.achievements.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-bold mb-2">הישגים:</p>
                      <div className="flex flex-wrap gap-2">
                        {player.achievements.map((ach, i) => (
                          <AchievementBadge key={i} achievement={ach} index={i} />
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              onClick={() => {
                // Send reset message to all players
                ws.send(JSON.stringify({ action: 'resetGame' }));

                // Reset host local state
                setFinalScores(null);
                setGameStarted(false);
                setRemainingTime(null);
                setLeaderboard([]);
                setTimerValue('');

                toast.success('מוכן למשחק חדש! 🎮', {
                  icon: '🔄',
                  duration: 2000,
                });
              }}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              🎮 התחל משחק חדש
            </Button>
            <Button onClick={() => setFinalScores(null)} variant="outline" className="w-full">
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exit Button */}
      <div className="absolute top-5 right-5">
        <Button
          variant="outline"
          onClick={handleExitRoom}
          className="font-medium bg-gradient-to-r from-rose-500 to-pink-500 text-white border-rose-400/60 hover:from-rose-600 hover:to-pink-600 shadow-md backdrop-blur-sm"
        >
          <FaSignOutAlt className="mr-2" />
          יציאה מהחדר
        </Button>
      </div>

      {/* Animated Title */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="animated-title mb-5"
        onClick={() => window.location.href = '/'}
      >
        <span className="text text-5xl sm:text-6xl md:text-7xl">Boggle</span>
      </motion.div>

      {/* Game Code Display with Share Buttons */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="w-full max-w-2xl mb-6"
      >
        <Card className="bg-gradient-to-r from-blue-600 to-cyan-600 backdrop-blur-sm text-white text-center p-4 sm:p-6 rounded-lg shadow-md">
          <p className="text-sm text-blue-100 mb-2">קוד משחק:</p>
          <h2 className="text-4xl sm:text-5xl font-bold mb-4 tracking-wide">
            {gameCode}
          </h2>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyJoinUrl(gameCode)}
              className="bg-white/20 text-white border-white/60 hover:bg-white/30 hover:border-white font-medium backdrop-blur-sm"
            >
              <FaLink className="mr-2" />
              העתק קישור
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => shareViaWhatsApp(gameCode)}
              className="bg-white/20 text-white border-white/60 hover:bg-white/30 hover:border-white font-medium backdrop-blur-sm"
            >
              <FaWhatsapp className="mr-2" />
              שתף בוואטסאפ
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQR(true)}
              className="bg-white/20 text-white border-white/60 hover:bg-white/30 hover:border-white font-medium backdrop-blur-sm"
            >
              <FaQrcode className="mr-2" />
              ברקוד
            </Button>
          </div>
        </Card>
      </motion.div>

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
              <QRCodeSVG value={getJoinUrl()} size={250} level="H" />
            </div>
            <h4 className="text-3xl font-bold text-indigo-600">{gameCode}</h4>
            <p className="text-sm text-center text-muted-foreground">
              סרוק את הקוד כדי להצטרף למשחק או השתמש בקוד {gameCode}
            </p>
            <p className="text-xs text-center text-muted-foreground">
              {getJoinUrl()}
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowQR(false)}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-purple-600 hover:to-indigo-600"
            >
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refined Layout */}
      <div className="flex flex-col gap-6 w-full max-w-6xl">
        {/* Game Settings - TOP (below Game Code) */}
        <Card className="bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-lg shadow-md border border-gray-200/50">
          <h3 className="text-base font-bold text-gray-700 mb-4 flex items-center gap-2">
            <FaCog className="text-cyan-600 text-sm" />
            הגדרות משחק
          </h3>
          <div className="w-full max-w-5xl mx-auto space-y-4">
            {!gameStarted ? (
              <>
                {/* Difficulty Selection + Timer - Inline Layout with Separator */}
                <div className="flex flex-wrap gap-4 items-center">
                  {/* Difficulty Buttons Group */}
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(DIFFICULTIES).map((key) => {
                      const isSelected = difficulty === key;
                      return (
                        <motion.button
                          key={key}
                          onClick={() => setDifficulty(key)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={cn(
                            "px-3 py-2 rounded-md font-medium transition-all shadow-sm",
                            isSelected
                              ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-sm"
                              : "bg-gray-200 text-gray-600 text-xs hover:bg-gray-300"
                          )}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="font-bold">{DIFFICULTIES[key].name}</span>
                            <span className="text-xs opacity-90">
                              ({DIFFICULTIES[key].rows}x{DIFFICULTIES[key].cols})
                            </span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Vertical Separator */}
                  <div className="hidden sm:block w-px h-12 bg-gradient-to-b from-transparent via-gray-300 to-transparent"></div>

                  {/* Timer Input - Adjacent to difficulty buttons */}
                  <div className="flex items-center gap-2 bg-gradient-to-r from-purple-100 to-pink-100 px-3 py-2 rounded-md">
                    <FaClock className="text-purple-600 text-sm" />
                    <Input
                      id="timer"
                      type="number"
                      value={timerValue}
                      onChange={(e) => setTimerValue(e.target.value)}
                      className="h-8 w-16 text-sm border-purple-300 bg-white/80"
                      placeholder="1"
                    />
                    <span className="text-xs text-purple-700 font-medium">דקות</span>
                  </div>
                </div>

                {/* Start Button - Below difficulty and timer */}
                <div className="pt-2">
                  <Button
                    onClick={startGame}
                    disabled={!timerValue || playersReady.length === 0}
                    className="w-full h-11 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-base font-bold text-white shadow-md"
                  >
                    התחל משחק
                  </Button>
                  {playersReady.length === 0 && (
                    <p className="text-xs text-center text-rose-600 font-medium mt-2">
                      ממתין לשחקנים להצטרף...
                    </p>
                  )}
                </div>
              </>
            ) : (
              <Button
                onClick={stopGame}
                variant="destructive"
                className="w-full h-12 text-base font-bold shadow-md bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
              >
                עצור משחק
              </Button>
            )}
          </div>
        </Card>

        {/* Main Content Area: Player List (LEFT) + Boggle Grid (RIGHT) */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Players Section - LEFT */}
          <Card className="bg-white/90 backdrop-blur-md p-4 sm:p-6 rounded-lg shadow-md border border-purple-200/30 lg:min-w-[280px]">
            <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
              <FaUsers className="text-purple-600" />
              שחקנים ({playersReady.length})
            </h3>
            <div className="flex flex-col gap-2">
              <AnimatePresence>
                {playersReady.map((user, index) => (
                  <motion.div
                    key={user}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Badge className="bg-gradient-to-r from-indigo-500 to-purple-500 font-bold text-white px-3 py-1.5 text-base w-full justify-center shadow-sm">
                      {user}
                    </Badge>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {playersReady.length === 0 && (
              <p className="text-sm text-center text-gray-500 mt-2">
                ממתין לשחקנים...
              </p>
            )}
          </Card>

          {/* Boggle Letter Grid - RIGHT */}
          <Card className="flex-1 bg-white/90 backdrop-blur-md p-4 sm:p-6 rounded-lg shadow-md border border-blue-200/30 flex flex-col items-center">
            <h3 className="text-xl font-bold text-gray-700 mb-4">לוח האותיות</h3>

            {/* Timer */}
            {remainingTime !== null && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring' }}
                className="mb-6"
              >
                <div className={cn(
                  "flex items-center gap-2 px-4 py-3 sm:px-6 sm:py-4 rounded-lg text-white font-bold text-2xl sm:text-3xl shadow-md backdrop-blur-sm",
                  remainingTime < 30
                    ? "bg-gradient-to-r from-rose-500 to-pink-500"
                    : "bg-gradient-to-r from-emerald-500 to-green-500"
                )}>
                  <FaClock />
                  <span>{formatTime(remainingTime)}</span>
                </div>
              </motion.div>
            )}

            {/* Letter Grid - Compact with larger letters */}
            <div
              className="grid gap-0.5 sm:gap-1 w-full max-w-lg mx-auto"
              style={{
                gridTemplateColumns: `repeat(${tableData[0]?.length || 7}, minmax(32px, 1fr))`,
              }}
            >
              {tableData.map((row, i) =>
                row.map((cell, j) => (
                  <motion.div
                    key={`${i}-${j}`}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 260,
                      damping: 20,
                      delay: (i * row.length + j) * 0.02,
                    }}
                    whileHover={{ scale: 1.05, rotate: 3 }}
                    className="aspect-square flex items-center justify-center text-2xl sm:text-3xl md:text-4xl font-bold text-white rounded shadow-md cursor-pointer hover:shadow-lg transition-all"
                    style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                  >
                    {cell}
                  </motion.div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HostView;
