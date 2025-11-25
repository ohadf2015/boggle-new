import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import toast, { Toaster } from 'react-hot-toast';
import { FaTrophy, FaClock, FaUsers, FaQrcode, FaSignOutAlt, FaWhatsapp, FaLink, FaCog, FaPlus, FaMinus, FaCrown, FaTrash, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import GridComponent from '../components/GridComponent';
import ShareButton from '../components/ShareButton';
import SlotMachineText from '../components/SlotMachineText';
import ResultsPodium from '../components/results/ResultsPodium';
import ResultsPlayerCard from '../components/results/ResultsPlayerCard';
import RoomChat from '../components/RoomChat';
import GoRipplesAnimation from '../components/GoRipplesAnimation';
import CircularTimer from '../components/CircularTimer';
import '../style/animation.scss';
import { generateRandomTable, embedWordInGrid, applyHebrewFinalLetters } from '../utils/utils';
import { useWebSocket } from '../utils/WebSocketContext';
import { clearSession } from '../utils/session';
import { copyJoinUrl, shareViaWhatsApp, getJoinUrl } from '../utils/share';
import { useLanguage } from '../contexts/LanguageContext';
import { DIFFICULTIES, DEFAULT_DIFFICULTY } from '../utils/consts';
import { cn } from '../lib/utils';

const HostView = ({ gameCode, roomLanguage: roomLanguageProp, initialPlayers = [] }) => {
  const { t, language } = useLanguage();
  const ws = useWebSocket();
  const intentionalExitRef = useRef(false);
  const [difficulty, setDifficulty] = useState(DEFAULT_DIFFICULTY);
  const [tableData, setTableData] = useState(generateRandomTable());
  const [timerValue, setTimerValue] = useState('1');
  const [remainingTime, setRemainingTime] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [roomLanguage] = useState(roomLanguageProp || language); // Use prop if available, fallback to user's language

  const [playersReady, setPlayersReady] = useState(initialPlayers);
  const [showValidation, setShowValidation] = useState(false);
  const [playerWords, setPlayerWords] = useState([]);
  const [validations, setValidations] = useState({});
  const [finalScores, setFinalScores] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [playerWordCounts, setPlayerWordCounts] = useState({});
  const [showStartAnimation, setShowStartAnimation] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Host playing states
  const [hostPlaying, setHostPlaying] = useState(true); // Default: host plays
  const [hostFoundWords, setHostFoundWords] = useState([]);
  const inputRef = useRef(null);
  const [word, setWord] = useState('');

  // Animation states
  const [shufflingGrid, setShufflingGrid] = useState(null);
  const [highlightedCells, setHighlightedCells] = useState([]);

  // Combo system state
  const [comboLevel, setComboLevel] = useState(0);
  const [lastWordTime, setLastWordTime] = useState(null);
  const comboTimeoutRef = useRef(null);

  // Update players list when initialPlayers prop changes
  useEffect(() => {
    setPlayersReady(initialPlayers);
  }, [initialPlayers]);

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
        const randomPlayerEntry = playersReady[Math.floor(Math.random() * playersReady.length)];
        const randomPlayer = typeof randomPlayerEntry === 'string' ? randomPlayerEntry : randomPlayerEntry.username;
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
      // Don't show warning if user is intentionally exiting
      if (intentionalExitRef.current) return;

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
          // Update word counts without notification
          setPlayerWordCounts(prev => ({
            ...prev,
            [message.username]: message.wordCount
          }));
          break;

        case 'showValidation':
          setPlayerWords(message.playerWords);
          setShowValidation(true);
          // Initialize validations object with unique words only
          // Auto-validated words are already validated and don't need host input
          const initialValidations = {};
          const uniqueWords = new Set();
          message.playerWords.forEach(player => {
            player.words.forEach(wordObj => {
              uniqueWords.add(wordObj.word);
              // Auto-validated words are pre-set to true and locked
              if (wordObj.autoValidated) {
                initialValidations[wordObj.word] = true;
              }
            });
          });
          uniqueWords.forEach(word => {
            if (initialValidations[word] === undefined) {
              initialValidations[word] = false; // Default to invalid for manual validation
            }
          });
          setValidations(initialValidations);

          // Show notification about auto-validated words
          if (message.autoValidatedCount > 0) {
            toast.success(`${message.autoValidatedCount} ${t('hostView.autoValidatedCount')}`, {
              duration: 5000,
              icon: '✅',
            });
          }

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

        case 'roomClosedDueToInactivity':
          intentionalExitRef.current = true;
          toast.error(message.message || t('hostView.roomClosedInactivity'), {
            icon: '⏰',
            duration: 5000,
          });
          // Close connection and reload after a short delay
          setTimeout(() => {
            clearSession();
            ws.close();
            window.location.reload();
          }, 2000);
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
            toast.success(t('hostView.gameOverCheckScores'), {
              icon: '🏁',
              duration: 5000,
            });
          }
          break;

        case 'wordAccepted':
          if (hostPlaying) {
            toast.success(`✓ ${message.word}`, { duration: 2000 });

            // Combo system: only increase combo for validated words
            const now = Date.now();
            if (lastWordTime && (now - lastWordTime) < 5000) {
              // Within 5 seconds - increase combo!
              setComboLevel(prev => Math.min(prev + 1, 4)); // Max combo level 4
            } else {
              // Too slow, reset combo
              setComboLevel(0);
            }
            setLastWordTime(now);

            // Clear any existing combo timeout
            if (comboTimeoutRef.current) {
              clearTimeout(comboTimeoutRef.current);
            }

            // Reset combo after 5 seconds of inactivity
            comboTimeoutRef.current = setTimeout(() => {
              setComboLevel(0);
              setLastWordTime(null);
            }, 5000);
          }
          break;

        case 'wordAlreadyFound':
          if (hostPlaying) {
            toast.error(t('playerView.wordAlreadyFound'), { duration: 2000 });
            // Reset combo on invalid word
            setComboLevel(0);
            setLastWordTime(null);
            if (comboTimeoutRef.current) {
              clearTimeout(comboTimeoutRef.current);
            }
          }
          break;

        case 'wordNotOnBoard':
          if (hostPlaying) {
            toast.error(t('playerView.wordNotOnBoard'), { duration: 3000 });
            setHostFoundWords(prev => prev.filter(w => w !== message.word));
            // Reset combo on invalid word
            setComboLevel(0);
            setLastWordTime(null);
            if (comboTimeoutRef.current) {
              clearTimeout(comboTimeoutRef.current);
            }
          }
          break;

        default:
          break;
      }
    };


    ws.addEventListener('message', handleMessage);

    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [ws, gameStarted, t, hostPlaying, lastWordTime]);

  const startGame = () => {
    if (playersReady.length === 0) return;

    // Actually start the game
    const difficultyConfig = DIFFICULTIES[difficulty];
    const newTable = generateRandomTable(difficultyConfig.rows, difficultyConfig.cols, roomLanguage);
    setTableData(newTable);
    const seconds = timerValue * 60;
    setRemainingTime(seconds);
    setGameStarted(true);
    setShowStartAnimation(true);
    setPlayerWordCounts({}); // Reset counts
    setHostFoundWords([]); // Reset host words

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
    setShowExitConfirm(true);
  };

  const confirmExitRoom = () => {
    intentionalExitRef.current = true;
    // Clear session cookie
    clearSession();
    // Send close room message to server first
    ws.send(JSON.stringify({ action: 'closeRoom', gameCode }));
    // Wait a bit for the message to be sent, then close and reload
    setTimeout(() => {
      ws.close();
      window.location.reload();
    }, 100);
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

    toast.loading(t('hostView.validatingWords'), {
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

  // Host word submission when playing
  const submitHostWord = useCallback(() => {
    if (!word.trim() || !gameStarted || !hostPlaying) return;

    const currentLang = roomLanguage;
    const regex = currentLang === 'he' ? /^[\u0590-\u05FF]+$/ :
                  currentLang === 'sv' ? /^[a-zA-ZåäöÅÄÖ]+$/ :
                  currentLang === 'ja' ? /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/ :
                  /^[a-zA-Z]+$/;
    const trimmedWord = word.trim();

    // Min length validation
    if (trimmedWord.length < 2) {
      toast.error(t('playerView.wordTooShort'), {
        duration: 2000,
        icon: '⚠️'
      });
      return;
    }

    if (!regex.test(trimmedWord)) {
      toast.error(t('playerView.onlyLanguageWords'), {
        duration: 2500,
        icon: '❌'
      });
      setWord('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
      return;
    }

    // Send word to server just like a regular player
    ws.send(JSON.stringify({
      action: 'submitWord',
      word: trimmedWord.toLowerCase(),
    }));

    setHostFoundWords(prev => [...prev, trimmedWord]);
    setWord('');

    // Keep focus on input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [word, gameStarted, hostPlaying, ws, t, roomLanguage]);

  const removeHostWord = (index) => {
    if (!gameStarted) return;
    setHostFoundWords(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') submitHostWord();
  };



  // Note: getJoinUrl is now imported from utils/share

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
            players: [player.username],
            autoValidated: wordObj.autoValidated || false,
            inDictionary: wordObj.inDictionary
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col items-center p-2 sm:p-4 md:p-6 lg:p-8 overflow-auto transition-colors duration-300">

      {/* Start Game Animation */}
      {showStartAnimation && (
        <GoRipplesAnimation onComplete={() => setShowStartAnimation(false)} />
      )}

      {/* Validation Modal */}
      <Dialog open={showValidation} onOpenChange={setShowValidation}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto bg-white dark:bg-slate-800 border-indigo-500/30">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl sm:text-3xl text-indigo-600 dark:text-indigo-400 font-bold">
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
                      const isAutoValidated = item.autoValidated;
                      const isValid = validations[item.word] !== undefined ? validations[item.word] : true;

                      return (
                        <div
                          key={index}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg transition-colors border",
                            isDuplicate
                              ? "bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 border-orange-200 dark:border-orange-700"
                              : isAutoValidated
                                ? "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-700"
                                : "hover:bg-gray-50 dark:hover:bg-slate-700 border-gray-200 dark:border-slate-600"
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
                              {applyHebrewFinalLetters(item.word)}
                            </span>
                            {isDuplicate && (
                              <Badge variant="destructive" className="bg-orange-500">
                                ⚠ {item.playerCount}{' '}{t('joinView.players')}
                              </Badge>
                            )}
                            {isAutoValidated && !isDuplicate && (
                              <Badge variant="success" className="bg-cyan-500 text-white">
                                ✓ {t('hostView.autoValidated')}
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
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <DialogHeader>
            <DialogTitle className="text-center text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center gap-3">
              <FaTrophy className="text-yellow-500" />
              {t('hostView.finalScores')}
              <FaTrophy className="text-yellow-500" />
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Podium */}
            {finalScores && finalScores.length > 0 && (
              <ResultsPodium sortedScores={finalScores} />
            )}

            {/* Detailed Player Cards */}
            <div className="space-y-3 max-w-3xl mx-auto">
              {finalScores && finalScores.map((player, index) => (
                <ResultsPlayerCard key={player.username} player={player} index={index} />
              ))}
            </div>
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
              className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500"
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
              <QRCodeSVG value={getJoinUrl(gameCode)} size={250} level="H" />
            </div>
            <h4 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">{gameCode}</h4>
            <p className="text-sm text-center text-slate-500 dark:text-slate-400">
              {t('hostView.scanQr')} {gameCode}
            </p>
            <p className="text-xs text-center text-slate-500">
              {getJoinUrl(gameCode)}
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
      <div className="flex flex-col gap-3 sm:gap-4 md:gap-6 w-full max-w-6xl">
        {/* Top Section: Room Code + Language + Share (when not started) */}
        {!gameStarted && (
          <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md text-slate-900 dark:text-white p-3 sm:p-4 md:p-6 rounded-lg border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Room Code and Language in same row */}
              <div className="flex flex-col items-center sm:items-start gap-2">
                <div className="flex items-center gap-3">
                  <div className="text-center sm:text-left">
                    <p className="text-sm text-cyan-600 dark:text-cyan-300">{t('hostView.roomCode')}:</p>
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                      {gameCode}
                    </h2>
                  </div>
                  <Badge variant="outline" className="text-base sm:text-lg px-3 py-1 border-cyan-500/50 text-cyan-600 dark:text-cyan-300">
                    {roomLanguage === 'he' ? '🇮🇱 עברית' : roomLanguage === 'sv' ? '🇸🇪 Svenska' : roomLanguage === 'ja' ? '🇯🇵 日本語' : '🇺🇸 English'}
                  </Badge>
                </div>
              </div>

              {/* Share Buttons */}
              <div className="flex flex-wrap gap-2 justify-center">
                <ShareButton
                  variant="link"
                  onClick={() => copyJoinUrl(gameCode, t)}
                  icon={<FaLink />}
                >
                  {t('hostView.copyLink')}
                </ShareButton>
                <ShareButton
                  variant="whatsapp"
                  onClick={() => shareViaWhatsApp(gameCode, '', t)}
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
            </div>
          </Card>
        )}

        {/* Game Settings - Now below room code */}
        {!gameStarted && (
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-3 sm:p-4 md:p-5 rounded-lg border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
            <h3 className="text-base font-bold text-purple-600 dark:text-purple-300 mb-4 flex items-center gap-2">
              <FaCog className="text-cyan-600 dark:text-cyan-400 text-sm" />
              {t('hostView.gameSettings')}
            </h3>
            <div className="w-full space-y-3 sm:space-y-4">
              {!gameStarted ? (
                <>
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

                  {/* Advanced Settings Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                    className="w-full flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-700/50 rounded-md border border-purple-500/30 hover:bg-slate-200 dark:hover:bg-slate-600/50 transition-all"
                  >
                    <span className="text-sm font-medium text-purple-600 dark:text-purple-300">
                      {t('hostView.advancedSettings')}
                    </span>
                    {showAdvancedSettings ? <FaChevronUp className="text-purple-600 dark:text-purple-400" /> : <FaChevronDown className="text-purple-600 dark:text-purple-400" />}
                  </button>

                  {/* Collapsible Advanced Settings */}
                  <AnimatePresence>
                    {showAdvancedSettings && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden space-y-4"
                      >
                        {/* Host Play Option */}
                        <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-700/50 rounded-md border border-purple-500/30">
                          <Checkbox
                            id="hostPlays"
                            checked={hostPlaying}
                            onCheckedChange={setHostPlaying}
                            className="border-purple-500/50"
                          />
                          <label htmlFor="hostPlays" className="text-sm font-medium text-purple-600 dark:text-purple-300 cursor-pointer">
                            {t('hostView.hostPlays')}
                          </label>
                        </div>

                        {/* Difficulty Selection */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-purple-600 dark:text-purple-300">
                            {t('hostView.difficulty')}
                          </label>
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
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

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
        )}

        {/* Main Content Area: Player List (LEFT) + Boggle Grid (CENTER) + Chat (RIGHT on desktop when not started) */}
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 md:gap-6 transition-all duration-500 ease-in-out">
          {/* Players Section - LEFT - Neon Style */}
          <Card className={cn(
            "bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-3 sm:p-4 md:p-6 rounded-lg shadow-lg border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)] lg:min-w-[280px] transition-all duration-500 ease-in-out overflow-hidden",
            gameStarted ? "lg:w-[300px]" : "w-full lg:w-[300px]"
          )}>
            <h3 className="text-lg font-bold text-purple-600 dark:text-purple-300 mb-4 flex items-center gap-2">
              <FaUsers className="text-purple-500 dark:text-purple-400" />
              {t('hostView.playersJoined')} ({playersReady.length})
            </h3>
            <div className="flex flex-col gap-2">
              <AnimatePresence>
                {playersReady.map((player, index) => {
                  // Handle both old format (string) and new format (object)
                  const username = typeof player === 'string' ? player : player.username;
                  const avatar = typeof player === 'object' ? player.avatar : null;
                  const isHost = typeof player === 'object' ? player.isHost : false;

                  return (
                    <motion.div
                      key={username}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Badge
                        className="bg-gradient-to-r from-purple-500 to-pink-500 font-bold text-white px-3 py-2 text-base w-full justify-between shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                        style={avatar?.color ? { background: `linear-gradient(to right, ${avatar.color}, ${avatar.color}dd)` } : {}}
                      >
                        <div className="flex items-center gap-2">
                          {avatar?.emoji && <span className="text-lg">{avatar.emoji}</span>}
                          {isHost && <FaCrown className="text-yellow-300" />}
                          <SlotMachineText text={username} />
                        </div>
                        {gameStarted && (
                          <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
                            {playerWordCounts[username] || 0}
                          </span>
                        )}
                      </Badge>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
            {playersReady.length === 0 && (
              <p className="text-sm text-center text-slate-500 mt-2">
                {t('hostView.waitingForPlayers')}
              </p>
            )}
          </Card>

          {/* Letter Grid - RIGHT - Conditional rendering based on host playing */}
          {gameStarted && !hostPlaying ? (
            /* Spectator Mode - Large Grid View */
            <Card className="fixed inset-0 z-50 m-0 max-w-none h-screen w-screen justify-center bg-slate-900/95 dark:bg-slate-900/95 border-cyan-500/50 p-4 flex-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-lg shadow-lg border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)] flex flex-col items-center transition-all duration-500 ease-in-out overflow-hidden">
              {/* Circular Timer */}
              {remainingTime !== null && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, type: 'spring' }}
                  className="mb-4"
                >
                  <CircularTimer remainingTime={remainingTime} totalTime={timerValue * 60} />
                </motion.div>
              )}

              {/* Grid Container - Responsive Sizing */}
              <div className="flex-grow p-1 md:p-3 w-full flex justify-center items-center transition-all duration-500">
                <div className="max-w-[min(90vh,90vw)] max-h-[min(90vh,90vw)] w-full h-full flex items-center justify-center">
                  <GridComponent
                    grid={tableData}
                    interactive={false}
                    largeText={true}
                    selectedCells={highlightedCells}
                    className="w-full h-full aspect-square max-w-full max-h-full"
                  />
                </div>
              </div>
            </Card>
          ) : (
            /* Playing Mode or Pre-Game - Interactive Grid */
            <Card className="flex-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-1 sm:p-3 rounded-lg shadow-lg border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)] flex flex-col items-center transition-all duration-500 ease-in-out overflow-hidden">
              {/* Circular Timer - Show when game is active */}
              {gameStarted && remainingTime !== null && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, type: 'spring' }}
                  className="mb-4"
                >
                  <CircularTimer remainingTime={remainingTime} totalTime={timerValue * 60} />
                </motion.div>
              )}

              {/* Grid Container */}
              <div className="w-full flex justify-center items-center transition-all duration-500 aspect-square max-w-[500px]">
                <div className="w-full h-full flex items-center justify-center">
                  <GridComponent
                    grid={gameStarted ? tableData : (shufflingGrid || tableData)}
                    interactive={gameStarted && hostPlaying}
                    onWordSubmit={(formedWord) => {
                      if (!hostPlaying) return;

                      const regex = roomLanguage === 'he' ? /^[\u0590-\u05FF]+$/ :
                                    roomLanguage === 'sv' ? /^[a-zA-ZåäöÅÄÖ]+$/ :
                                    roomLanguage === 'ja' ? /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/ :
                                    /^[a-zA-Z]+$/;

                      if (formedWord.length < 2) {
                        toast.error(t('playerView.wordTooShort'), { duration: 1000, icon: '⚠️' });
                        return;
                      }

                      if (regex.test(formedWord)) {
                        ws.send(JSON.stringify({
                          action: 'submitWord',
                          word: formedWord.toLowerCase(),
                        }));
                        setHostFoundWords(prev => [...prev, formedWord]);
                      } else {
                        toast.error(t('playerView.onlyLanguageWords'), { duration: 1000 });
                      }
                    }}
                    selectedCells={gameStarted && hostPlaying ? undefined : highlightedCells}
                    className="w-full h-full"
                    playerView={hostPlaying}
                    comboLevel={comboLevel}
                  />
                </div>
              </div>

              {/* Host Word Input - Only show when playing */}
              {gameStarted && hostPlaying && (
                <div className="w-full mt-4 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={word}
                      onChange={(e) => setWord(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={t('playerView.enterWord')}
                      className="flex-1 text-lg bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-gray-400 text-right"
                    />
                    <Button
                      onClick={submitHostWord}
                      disabled={!word.trim()}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold shadow-lg hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                    >
                      {t('playerView.add')}
                    </Button>
                  </div>

                  {/* Host Found Words List */}
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    <p className="text-sm text-slate-600 dark:text-slate-400">{t('playerView.wordsFound')} ({hostFoundWords.length})</p>
                    <AnimatePresence>
                      {hostFoundWords.map((foundWord, index) => (
                        <motion.div
                          key={index}
                          initial={{ x: -50, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          exit={{ x: 50, opacity: 0 }}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg",
                            index === hostFoundWords.length - 1
                              ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/20 font-bold border border-cyan-500/30'
                              : 'bg-slate-100 dark:bg-slate-700/50',
                            'hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-900 dark:text-white'
                          )}
                        >
                          <span>{applyHebrewFinalLetters(foundWord)}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeHostWord(index)}
                            className="hover:bg-red-500/20 hover:text-red-400 text-slate-400 dark:text-gray-400"
                          >
                            <FaTrash />
                          </Button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Chat Section - RIGHT on desktop when not started */}
          {!gameStarted && (
            <div className="w-full lg:w-[350px] xl:w-[400px]">
              <RoomChat
                username="Host"
                isHost={true}
                gameCode={gameCode}
                className="h-full min-h-[400px]"
              />
            </div>
          )}
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent className="bg-white dark:bg-slate-800 border-red-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white">
              {t('hostView.confirmExit')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-gray-300">
              {t('hostView.exitWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmExitRoom}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
            >
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HostView;
