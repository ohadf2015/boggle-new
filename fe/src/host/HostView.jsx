import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import toast, { Toaster } from 'react-hot-toast';
import { FaTrophy, FaClock, FaUsers, FaQrcode, FaSignOutAlt, FaWhatsapp, FaLink, FaCog, FaPlus, FaMinus } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { AchievementBadge } from '../components/AchievementBadge';
import GridComponent from '../components/GridComponent';
import ShareButton from '../components/ShareButton';
import SlotMachineText from '../components/SlotMachineText';
import '../style/animation.scss';
import { generateRandomTable, embedWordInGrid } from '../utils/utils';
import { useWebSocket } from '../utils/WebSocketContext';
import { clearSession } from '../utils/session';
import { copyJoinUrl, shareViaWhatsApp } from '../utils/share';
import { useLanguage } from '../contexts/LanguageContext';
import { DIFFICULTIES, DEFAULT_DIFFICULTY } from '../utils/consts';
import { cn } from '../lib/utils';

const HostView = ({ gameCode, roomLanguage: roomLanguageProp }) => {
  const { t, language } = useLanguage();
  const ws = useWebSocket();
  const [difficulty, setDifficulty] = useState(DEFAULT_DIFFICULTY);
  const [tableData, setTableData] = useState(generateRandomTable());
  const [timerValue, setTimerValue] = useState('1');
  const [remainingTime, setRemainingTime] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [roomLanguage] = useState(roomLanguageProp || language); // Use prop if available, fallback to user's language

  const [playersReady, setPlayersReady] = useState([]);
  const [showValidation, setShowValidation] = useState(false);
  const [playerWords, setPlayerWords] = useState([]);
  const [validations, setValidations] = useState({});
  const [finalScores, setFinalScores] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [playerWordCounts, setPlayerWordCounts] = useState({});

  // Animation states
  const [shufflingGrid, setShufflingGrid] = useState(null);
  const [highlightedCells, setHighlightedCells] = useState([]);

  // Pre-game shuffling animation with player names
  useEffect(() => {
    if (gameStarted) {
      setShufflingGrid(null);
      setHighlightedCells([]);
      return;
    }

    const currentLang = roomLanguage || language;
    const rows = DIFFICULTIES[difficulty].rows;
    const cols = DIFFICULTIES[difficulty].cols;

    const interval = setInterval(() => {
      // 30% chance to show a player name if players exist
      const showPlayerName = playersReady.length > 0 && Math.random() < 0.3;

      if (showPlayerName) {
        const randomPlayer = playersReady[Math.floor(Math.random() * playersReady.length)];
        const result = embedWordInGrid(rows, cols, randomPlayer, currentLang);

        if (result.path && result.path.length > 0) {
          setShufflingGrid(result.grid);

          // Animate letter-by-letter selection
          let currentIndex = 0;
          const animateSelection = () => {
            if (currentIndex < result.path.length) {
              setHighlightedCells(result.path.slice(0, currentIndex + 1));
              currentIndex++;
              setTimeout(animateSelection, 100); // 100ms per letter
            } else {
              // Clear highlight after completing the word
              setTimeout(() => {
                setHighlightedCells([]);
              }, 500);
            }
          };
          animateSelection();
        } else {
          // Fallback to random grid if name couldn't be placed
          setShufflingGrid(generateRandomTable(rows, cols, currentLang));
          setHighlightedCells([]);
        }
      } else {
        setShufflingGrid(generateRandomTable(rows, cols, currentLang));
        setHighlightedCells([]);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [gameStarted, difficulty, roomLanguage, language, playersReady]);

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
          toast.success(`${message.username} ${t('hostView.playerJoinedLate')} ⏰`, {
            icon: '🚀',
            duration: 4000,
          });
          break;



        case 'playerFoundWord':
          toast(`${message.username} ${t('hostView.playerFoundWord')} (${message.wordCount} ${t('hostView.words')})`, {
            icon: '🎯',
            duration: 2000,
          });
          setPlayerWordCounts(prev => ({
            ...prev,
            [message.username]: message.wordCount
          }));
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
          toast.success(t('hostView.validateWords'), {
            icon: '✅',
            duration: 5000,
          });
          break;

        case 'validationComplete':
          setFinalScores(message.scores);
          setShowValidation(false);
          toast.success(t('hostView.validationComplete'), {
            icon: '🎉',
            duration: 3000,
          });
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
          });
          break;

        case 'autoValidationOccurred':
          toast(message.message || 'Auto-validation completed', {
            icon: '⏱️',
            duration: 4000,
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
  }, [ws, gameStarted, t]);

  const startGame = () => {
    if (playersReady.length === 0) return;

    // Actually start the game
    const difficultyConfig = DIFFICULTIES[difficulty];
    const newTable = generateRandomTable(difficultyConfig.rows, difficultyConfig.cols, roomLanguage);
    setTableData(newTable);
    const seconds = timerValue * 60;
    setRemainingTime(seconds);
    setGameStarted(true);
    setPlayerWordCounts({}); // Reset counts

    // Send start game message with letter grid and timer
    ws.send(
      JSON.stringify({
        action: 'startGame',
        letterGrid: newTable,
        timerSeconds: seconds,
        language: roomLanguage
      })
    );

    toast.success(t('hostView.gameStarted'), {
      icon: '🎮',
      duration: 3000,
    });
  };

  const stopGame = () => {
    ws.send(JSON.stringify({ action: 'endGame', gameCode }));
    setRemainingTime(null);
    setGameStarted(false);

    toast(t('hostView.gameStopped'), {
      icon: '⏹️',
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExitRoom = () => {
    if (window.confirm(t('hostView.confirmExit'))) {
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col items-center p-4 sm:p-6 md:p-8 overflow-auto transition-colors duration-300">
      <Toaster position="top-center" />

      {/* Validation Modal */}
      <Dialog open={showValidation} onOpenChange={setShowValidation}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl sm:text-3xl text-indigo-600 font-bold">
              ✅ {t('hostView.validation')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-center text-muted-foreground">
              {t('hostView.validateIntro')}
            </p>
            <p className="text-center text-sm text-orange-600 font-bold">
              ⚠ {t('hostView.duplicateWarning')}
            </p>

            {showValidation && (() => {
              const uniqueWords = getUniqueWords();

              return (
                <div className="space-y-3">
                  <p className="text-center text-sm text-muted-foreground">
                    {t('hostView.totalWords')} {uniqueWords.length}
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
                                ⚠ {item.playerCount} {t('joinView.players')}
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
              {t('hostView.submitValidation')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Final Scores Modal */}
      <Dialog open={!!finalScores} onOpenChange={() => setFinalScores(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-3xl sm:text-4xl text-yellow-500 font-bold flex items-center justify-center gap-2">
              <FaTrophy /> {t('hostView.finalScores')}
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
                    <div className="text-3xl font-bold text-white mb-2">
                      {player.score}
                    </div>
                    <p className="text-sm mb-1 text-white/80">
                      {t('hostView.words')}: {player.wordCount} {player.validWordCount !== undefined && `(${player.validWordCount} valid)`}
                    </p>

                    {player.longestWord && (
                      <p className="text-sm mb-2">
                        {t('playerView.longestWord')}: <strong>{player.longestWord}</strong>
                      </p>
                    )}
                  </div>

                  {/* Word Visualization with colors */}
                  {player.allWords && player.allWords.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-bold mb-2">{t('hostView.words')}:</p>
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
                      <p className="text-sm font-bold mb-2">{t('hostView.achievements')}:</p>
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

                setTimerValue('');

                toast.success(`${t('hostView.newGameReady')} 🎮`, {
                  icon: '🔄',
                  duration: 2000,
                });
              }}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              🎮 {t('hostView.startNewGame')}
            </Button>
            <Button onClick={() => setFinalScores(null)} variant="outline" className="w-full">
              {t('hostView.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Top Bar with Exit Button */}
      <div className="w-full max-w-6xl flex justify-end mb-4">
        <Button
          variant="outline"
          onClick={handleExitRoom}
          className="font-medium bg-white/80 dark:bg-slate-800/80 text-cyan-600 dark:text-cyan-300 border border-cyan-500/50 hover:border-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-200 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] shadow-md backdrop-blur-sm transition-all duration-300"
        >
          <FaSignOutAlt className="mr-2" />
          {t('hostView.exitRoom')}
        </Button>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 border-cyan-500/30">
          <DialogHeader>
            <DialogTitle className="text-center text-cyan-600 dark:text-cyan-300 flex items-center justify-center gap-2">
              <FaQrcode />
              {t('hostView.qrCode')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="p-6 bg-white rounded-lg shadow-md">
              <QRCodeSVG value={getJoinUrl()} size={250} level="H" />
            </div>
            <h4 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">{gameCode}</h4>
            <p className="text-sm text-center text-slate-500 dark:text-slate-400">
              {t('hostView.scanQr')} {gameCode}
            </p>
            <p className="text-xs text-center text-slate-500">
              {getJoinUrl()}
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowQR(false)}
              className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)]"
            >
              {t('hostView.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refined Layout */}
      <div className="flex flex-col gap-6 w-full max-w-6xl">
        {/* Top Row: Game Settings (LEFT) + Game Code (RIGHT) */}
        <div className={cn("flex flex-col lg:flex-row gap-6", gameStarted && "hidden")}>
          {/* Game Settings - LEFT - Neon Style */}
          <Card className="flex-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 sm:p-5 rounded-lg shadow-lg border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
            <h3 className="text-base font-bold text-purple-600 dark:text-purple-300 mb-4 flex items-center gap-2">
              <FaCog className="text-cyan-600 dark:text-cyan-400 text-sm" />
              {t('hostView.gameSettings')}
            </h3>
            <div className="w-full space-y-4">
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
                              "px-3 py-2 rounded-md font-medium transition-all duration-300",
                              isSelected
                                ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-sm shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                                : "bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 text-xs hover:bg-slate-200 dark:hover:bg-slate-600/60 border border-slate-200 dark:border-slate-600/50 hover:border-cyan-500/30"
                            )}
                          >
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="font-bold">{t(DIFFICULTIES[key].nameKey)}</span>
                              <span className="text-xs opacity-90">
                                ({DIFFICULTIES[key].rows}x{DIFFICULTIES[key].cols})
                              </span>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Vertical Separator - Neon */}
                    <div className="hidden sm:block w-px h-12 bg-gradient-to-b from-transparent via-cyan-500/50 to-transparent"></div>

                    {/* Timer Input - Neon Style */}
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700/50 border border-purple-500/30 px-3 py-2 rounded-md">
                      <FaClock className="text-purple-600 dark:text-purple-400 text-sm" />

                      {/* Minus Button */}
                      <button
                        type="button"
                        onClick={() => setTimerValue(prev => {
                          const current = parseInt(prev) || 0;
                          return Math.max(1, current - 1).toString();
                        })}
                        disabled={gameStarted}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-purple-500/50 text-purple-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-500/20 hover:border-purple-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FaMinus size={12} />
                      </button>

                      <Input
                        id="timer"
                        type="number"
                        value={timerValue}
                        onChange={(e) => setTimerValue(e.target.value)}
                        className="h-10 w-16 text-center text-lg font-bold border-none bg-transparent text-slate-900 dark:text-white placeholder:text-slate-500 focus-visible:ring-0 p-0"
                        placeholder="1"
                      />

                      {/* Plus Button */}
                      <button
                        type="button"
                        onClick={() => setTimerValue(prev => {
                          const current = parseInt(prev) || 0;
                          return (current + 1).toString();
                        })}
                        disabled={gameStarted}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-purple-500/50 text-purple-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-500/20 hover:border-purple-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FaPlus size={12} />
                      </button>

                      <span className="text-sm text-purple-600 dark:text-purple-300 font-medium mr-2">{t('hostView.minutes')}</span>
                    </div>
                  </div>

                  {/* Start Button - Neon Glow */}
                  <div className="pt-2 flex justify-center">
                    <Button
                      onClick={startGame}
                      disabled={!timerValue || playersReady.length === 0}
                      className="w-full max-w-xs h-11 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-base font-bold text-white shadow-lg hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all duration-300 disabled:opacity-50 disabled:hover:shadow-none"
                    >
                      {t('hostView.startGame')}
                    </Button>
                  </div>
                </>
              ) : (
                <Button
                  onClick={stopGame}
                  variant="destructive"
                  className="w-full max-w-xs h-12 text-base font-bold shadow-lg bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 hover:shadow-[0_0_25px_rgba(244,63,94,0.5)] transition-all duration-300"
                >
                  {t('hostView.stopGame')}
                </Button>
              )}
            </div>
          </Card>

          {/* Game Code - RIGHT - Neon Style */}
          <Card className="lg:min-w-[320px] bg-white/90 dark:bg-slate-800/90 backdrop-blur-md text-slate-900 dark:text-white text-center p-4 sm:p-6 rounded-lg shadow-lg border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)] flex flex-col justify-center">
            <p className="text-sm text-cyan-600 dark:text-cyan-300 mb-2">{t('hostView.roomCode')}:</p>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
              {gameCode}
            </h2>

            {/* Language Badge (Static) */}
            {!gameStarted && (
              <div className="mb-4 flex justify-center">
                <Badge variant="outline" className="text-lg px-4 py-1 border-cyan-500/50 text-cyan-600 dark:text-cyan-300">
                  {roomLanguage === 'he' ? '🇮🇱 עברית' : '🇺🇸 English'}
                </Badge>
              </div>
            )}

            <div className="flex flex-wrap gap-2 justify-center">
              <ShareButton
                variant="link"
                onClick={() => copyJoinUrl(gameCode)}
                icon={<FaLink />}
              >
                {t('hostView.copyLink')}
              </ShareButton>
              <ShareButton
                variant="whatsapp"
                onClick={() => shareViaWhatsApp(gameCode)}
                icon={<FaWhatsapp />}
              >
                {t('hostView.shareWhatsapp')}
              </ShareButton>
              <ShareButton
                variant="qr"
                onClick={() => setShowQR(true)}
                icon={<FaQrcode />}
              >
                {t('hostView.qrCode')}
              </ShareButton>
            </div>
          </Card>
        </div>

        {/* Main Content Area: Player List (LEFT) + Boggle Grid (RIGHT) */}
        <div className="flex flex-col lg:flex-row gap-6 transition-all duration-500 ease-in-out">
          {/* Players Section - LEFT - Neon Style */}
          <Card className={cn(
            "bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 sm:p-6 rounded-lg shadow-lg border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)] lg:min-w-[280px] transition-all duration-500 ease-in-out overflow-hidden",
            gameStarted ? "lg:w-[300px]" : "w-full lg:w-auto"
          )}>
            <h3 className="text-lg font-bold text-purple-600 dark:text-purple-300 mb-4 flex items-center gap-2">
              <FaUsers className="text-purple-500 dark:text-purple-400" />
              {t('hostView.playersJoined')} ({playersReady.length})
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
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 font-bold text-white px-3 py-2 text-base w-full justify-between shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                      <SlotMachineText text={user} />
                      {gameStarted && (
                        <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
                          {playerWordCounts[user] || 0}
                        </span>
                      )}
                    </Badge>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {playersReady.length === 0 && (
              <p className="text-sm text-center text-slate-500 mt-2">
                {t('hostView.waitingForPlayers')}
              </p>
            )}
          </Card>

          {/* Boggle Letter Grid - RIGHT - Neon Style */}
          <Card className={cn(
            "flex-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-2 sm:p-4 rounded-lg shadow-lg border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)] flex flex-col items-center transition-all duration-500 ease-in-out overflow-hidden",
            gameStarted && "fixed inset-0 z-50 m-0 max-w-none h-screen w-screen justify-center bg-slate-900/95 dark:bg-slate-900/95 border-cyan-500/50 p-4"
          )}>
            <h3 className={cn("text-xl font-bold text-cyan-600 dark:text-cyan-300 mb-4", gameStarted && "text-3xl mb-4")}>לוח האותיות</h3>

            {/* Timer - Neon Style */}
            {remainingTime !== null && gameStarted && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring' }}
                className="mb-4"
              >
                <div className={cn(
                  "text-5xl font-mono font-bold px-6 py-2 rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.3)] border-2 backdrop-blur-md",
                  remainingTime < 30
                    ? "text-red-500 border-red-500/50 bg-red-500/10 shadow-[0_0_30px_rgba(239,68,68,0.4)] animate-pulse"
                    : "text-cyan-400 border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_30px_rgba(6,182,212,0.4)]"
                )}>
                  {formatTime(remainingTime)}
                </div>
              </motion.div>
            )}

            {/* Grid Container - Responsive Sizing */}
            <div className={cn(
              "w-full flex justify-center items-center transition-all duration-500",
              gameStarted ? "flex-grow p-4" : "aspect-square max-w-[500px]"
            )}>
              <div className={cn(
                "w-full h-full flex items-center justify-center",
                gameStarted && "max-w-[min(90vh,90vw)] max-h-[min(90vh,90vw)]"
              )}>
                <GridComponent
                  grid={gameStarted ? tableData : (shufflingGrid || tableData)}
                  interactive={false}
                  largeText={gameStarted}
                  selectedCells={highlightedCells}
                  className={cn(
                    "w-full h-full",
                    gameStarted && "aspect-square max-w-full max-h-full"
                  )}
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HostView;
