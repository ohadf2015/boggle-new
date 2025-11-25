import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIdleTimer } from 'react-idle-timer';
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
import ResultsPlayerCard from '../components/results/ResultsPlayerCard';
import RoomChat from '../components/RoomChat';
import GoRipplesAnimation from '../components/GoRipplesAnimation';
import CircularTimer from '../components/CircularTimer';
import TournamentStandings from '../components/TournamentStandings';
import '../style/animation.scss';
import { generateRandomTable, embedWordInGrid, applyHebrewFinalLetters } from '../utils/utils';
import { useSocket } from '../utils/SocketContext';
import { clearSession } from '../utils/session';
import { copyJoinUrl, shareViaWhatsApp, getJoinUrl } from '../utils/share';
import { useLanguage } from '../contexts/LanguageContext';
import { DIFFICULTIES, DEFAULT_DIFFICULTY } from '../utils/consts';
import { cn } from '../lib/utils';

const HostView = ({ gameCode, roomLanguage: roomLanguageProp, initialPlayers = [], username }) => {
  const { t, language } = useLanguage();
  const { socket } = useSocket();
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
  const [playerScores, setPlayerScores] = useState({});
  const [playerAchievements, setPlayerAchievements] = useState({});
  const [showStartAnimation, setShowStartAnimation] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Host playing states
  const [hostPlaying, setHostPlaying] = useState(true); // Default: host plays
  const [hostFoundWords, setHostFoundWords] = useState([]);
  const inputRef = useRef(null);
  const [word, setWord] = useState('');

  // Tournament mode states
  const [tournamentMode, setTournamentMode] = useState(false);
  const [tournamentRounds, setTournamentRounds] = useState(3);
  const [tournamentData, setTournamentData] = useState(null);
  const [tournamentCreating, setTournamentCreating] = useState(false);
  const [showCancelTournamentDialog, setShowCancelTournamentDialog] = useState(false);
  const tournamentTimeoutRef = useRef(null);

  // Animation states
  const [shufflingGrid, setShufflingGrid] = useState(null);
  const [highlightedCells, setHighlightedCells] = useState([]);

  // Combo system state
  const [comboLevel, setComboLevel] = useState(0);
  const [lastWordTime, setLastWordTime] = useState(null);
  const comboTimeoutRef = useRef(null);

  // Idle detection for validation - using ref to avoid dependency issues
  const submitValidationRef = useRef(null);

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

          // Broadcast grid to all players immediately
          if (socket) {
            socket.emit('broadcastShufflingGrid', {
              grid: result.grid,
              highlightedCells: []
            });
          }

          // Animate letter-by-letter selection
          let currentIndex = 0;
          const animateSelection = () => {
            if (currentIndex < result.path.length) {
              const newHighlightedCells = result.path.slice(0, currentIndex + 1);
              setHighlightedCells(newHighlightedCells);

              // Broadcast highlighted cells to all players
              if (socket) {
                socket.emit('broadcastShufflingGrid', {
                  grid: result.grid,
                  highlightedCells: newHighlightedCells
                });
              }

              currentIndex++;
              setTimeout(animateSelection, 100); // 100ms per letter
            } else {
              // Clear highlight after completing the word
              setTimeout(() => {
                setHighlightedCells([]);
                if (socket) {
                  socket.emit('broadcastShufflingGrid', {
                    grid: result.grid,
                    highlightedCells: []
                  });
                }
              }, 500);
            }
          };
          animateSelection();
        } else {
          // Fallback to random grid if name couldn't be placed
          const randomGrid = generateRandomTable(rows, cols, currentLang);
          setShufflingGrid(randomGrid);
          setHighlightedCells([]);

          // Broadcast random grid to all players
          if (socket) {
            socket.emit('broadcastShufflingGrid', {
              grid: randomGrid,
              highlightedCells: []
            });
          }
        }
      } else {
        const randomGrid = generateRandomTable(rows, cols, currentLang);
        setShufflingGrid(randomGrid);
        setHighlightedCells([]);

        // Broadcast random grid to all players
        if (socket) {
          socket.emit('broadcastShufflingGrid', {
            grid: randomGrid,
            highlightedCells: []
          });
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [gameStarted, difficulty, roomLanguage, language, playersReady, socket]);

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

  // Handle Socket.IO events
  useEffect(() => {
    if (!socket) return;

    const handleUpdateUsers = (data) => {
      setPlayersReady(data.users || []);
    };

    const handlePlayerJoinedLate = (data) => {
      toast.success(`${data.username} ${t('hostView.playerJoinedLate')} ⏰`, {
        icon: '🚀',
        duration: 4000,
      });
    };

    const handlePlayerFoundWord = (data) => {
      setPlayerWordCounts(prev => ({
        ...prev,
        [data.username]: data.wordCount
      }));
      if (data.score !== undefined) {
        setPlayerScores(prev => ({
          ...prev,
          [data.username]: data.score
        }));
      }
    };

    const handleAchievementUnlocked = (data) => {
      if (!hostPlaying && data.username && data.achievement) {
        setPlayerAchievements(prev => ({
          ...prev,
          [data.username]: [...(prev[data.username] || []), data.achievement]
        }));
      }
    };

    const handleShowValidation = (data) => {
      setPlayerWords(data.playerWords);
      setShowValidation(true);
      const initialValidations = {};
      const uniqueWords = new Set();
      data.playerWords.forEach(player => {
        player.words.forEach(wordObj => {
          uniqueWords.add(wordObj.word);
          if (wordObj.autoValidated) {
            initialValidations[wordObj.word] = true;
          }
        });
      });
      uniqueWords.forEach(word => {
        if (initialValidations[word] === undefined) {
          initialValidations[word] = false;
        }
      });
      setValidations(initialValidations);

      if (data.autoValidatedCount > 0) {
        toast.success(`${data.autoValidatedCount} ${t('hostView.autoValidatedCount')}`, {
          duration: 5000,
          icon: '✅',
        });
      }

      toast.success(t('hostView.validateWords'), {
        icon: '✅',
        duration: 5000,
      });
    };

    const handleValidationComplete = (data) => {
      console.log('[HOST] Received validationComplete event:', data);
      setFinalScores(data.scores);
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
    };

    const handleAutoValidationOccurred = (data) => {
      toast(data.message || t('hostView.autoValidationCompleted'), {
        icon: '⏱️',
        duration: 4000,
      });
    };

    const handleRoomClosedDueToInactivity = (data) => {
      intentionalExitRef.current = true;
      toast.error(data.message || t('hostView.roomClosedInactivity'), {
        icon: '⏰',
        duration: 5000,
      });
      setTimeout(() => {
        clearSession();
        socket.disconnect();
        window.location.reload();
      }, 2000);
    };

    const handleTimeUpdate = (data) => {
      setRemainingTime(data.remainingTime);
      if (data.remainingTime === 0 && gameStarted) {
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
    };

    const handleWordAccepted = (data) => {
      if (hostPlaying) {
        toast.success(`✓ ${data.word}`, { duration: 2000 });

        const now = Date.now();
        if (lastWordTime && (now - lastWordTime) < 5000) {
          setComboLevel(prev => Math.min(prev + 1, 4));
        } else {
          setComboLevel(0);
        }
        setLastWordTime(now);

        if (comboTimeoutRef.current) {
          clearTimeout(comboTimeoutRef.current);
        }

        comboTimeoutRef.current = setTimeout(() => {
          setComboLevel(0);
          setLastWordTime(null);
        }, 5000);
      }
    };

    const handleWordAlreadyFound = () => {
      if (hostPlaying) {
        toast.error(t('playerView.wordAlreadyFound'), { duration: 2000 });
        setComboLevel(0);
        setLastWordTime(null);
        if (comboTimeoutRef.current) {
          clearTimeout(comboTimeoutRef.current);
        }
      }
    };

    const handleWordNotOnBoard = (data) => {
      if (hostPlaying) {
        toast.error(t('playerView.wordNotOnBoard'), { duration: 3000 });
        setHostFoundWords(prev => prev.filter(w => w !== data.word));
        setComboLevel(0);
        setLastWordTime(null);
        if (comboTimeoutRef.current) {
          clearTimeout(comboTimeoutRef.current);
        }
      }
    };

    const handleTournamentCreated = (data) => {
      if (tournamentTimeoutRef.current) {
        clearTimeout(tournamentTimeoutRef.current);
        tournamentTimeoutRef.current = null;
      }
      setTournamentCreating(false);
      setTournamentData(data.tournament);
      toast.success(`${t('hostView.tournamentMode')}: ${data.tournament.totalRounds} ${t('hostView.rounds')}`, {
        icon: '🏆',
        duration: 4000,
      });
      setTimeout(() => {
        socket.emit('startTournamentRound');
      }, 1500);
    };

    const handleTournamentRoundStarting = (data) => {
      setTournamentData(prev => ({
        ...prev,
        currentRound: data.roundNumber,
        standings: data.standings,
      }));
      toast(`${t('hostView.tournamentRound')} ${data.roundNumber}/${data.totalRounds}`, {
        icon: '🏁',
        duration: 3000,
      });
    };

    const handleTournamentRoundCompleted = (data) => {
      setTournamentData(prev => ({
        ...prev,
        standings: data.standings,
        isComplete: data.isComplete,
      }));

      if (data.isComplete) {
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.5 },
        });
        toast.success(t('hostView.tournamentComplete'), {
          icon: '🏆',
          duration: 5000,
        });
      }
    };

    const handleTournamentComplete = (data) => {
      setTournamentData(prev => ({
        ...prev,
        standings: data.standings,
        isComplete: true,
      }));
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.5 },
      });
    };

    const handleTournamentCancelled = () => {
      setTournamentData(null);
      setTournamentMode(false);
      toast('Tournament cancelled', {
        icon: '🚫',
        duration: 3000,
      });
    };

    // Register all event listeners
    socket.on('updateUsers', handleUpdateUsers);
    socket.on('playerJoinedLate', handlePlayerJoinedLate);
    socket.on('playerFoundWord', handlePlayerFoundWord);
    socket.on('achievementUnlocked', handleAchievementUnlocked);
    socket.on('showValidation', handleShowValidation);
    socket.on('validationComplete', handleValidationComplete);
    socket.on('autoValidationOccurred', handleAutoValidationOccurred);
    socket.on('roomClosedDueToInactivity', handleRoomClosedDueToInactivity);
    socket.on('timeUpdate', handleTimeUpdate);
    socket.on('wordAccepted', handleWordAccepted);
    socket.on('wordAlreadyFound', handleWordAlreadyFound);
    socket.on('wordNotOnBoard', handleWordNotOnBoard);
    socket.on('tournamentCreated', handleTournamentCreated);
    socket.on('tournamentRoundStarting', handleTournamentRoundStarting);
    socket.on('tournamentRoundCompleted', handleTournamentRoundCompleted);
    socket.on('tournamentComplete', handleTournamentComplete);
    socket.on('tournamentCancelled', handleTournamentCancelled);

    return () => {
      socket.off('updateUsers', handleUpdateUsers);
      socket.off('playerJoinedLate', handlePlayerJoinedLate);
      socket.off('playerFoundWord', handlePlayerFoundWord);
      socket.off('achievementUnlocked', handleAchievementUnlocked);
      socket.off('showValidation', handleShowValidation);
      socket.off('validationComplete', handleValidationComplete);
      socket.off('autoValidationOccurred', handleAutoValidationOccurred);
      socket.off('roomClosedDueToInactivity', handleRoomClosedDueToInactivity);
      socket.off('timeUpdate', handleTimeUpdate);
      socket.off('wordAccepted', handleWordAccepted);
      socket.off('wordAlreadyFound', handleWordAlreadyFound);
      socket.off('wordNotOnBoard', handleWordNotOnBoard);
      socket.off('tournamentCreated', handleTournamentCreated);
      socket.off('tournamentRoundStarting', handleTournamentRoundStarting);
      socket.off('tournamentRoundCompleted', handleTournamentRoundCompleted);
      socket.off('tournamentComplete', handleTournamentComplete);
      socket.off('tournamentCancelled', handleTournamentCancelled);
    };
  }, [socket, gameStarted, t, hostPlaying, lastWordTime]);

  const startGame = () => {
    if (playersReady.length === 0) return;

    // If tournament mode is enabled and no tournament exists, create one first
    if (tournamentMode && !tournamentData) {
      setTournamentCreating(true);

      socket.emit('createTournament', {
        name: 'Tournament',
        totalRounds: tournamentRounds,
        timerSeconds: timerValue * 60,
        difficulty: difficulty,
        language: roomLanguage,
      });

      // Set timeout in case backend doesn't respond
      tournamentTimeoutRef.current = setTimeout(() => {
        if (!tournamentData) {
          setTournamentCreating(false);
          toast.error(t('hostView.tournamentCreateFailed'), {
            icon: '❌',
            duration: 5000,
          });
        }
      }, 5000);

      // Wait for tournament creation, then start first round
      return;
    }

    // If tournament mode and tournament exists, start next round
    if (tournamentMode && tournamentData) {
      socket.emit('startTournamentRound');
      return;
    }

    // Regular game mode - start the game immediately (no countdown)
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
    socket.emit('startGame', {
      letterGrid: newTable,
      timerSeconds: seconds,
      language: roomLanguage,
      hostPlaying: hostPlaying
    });

    toast.success(t('hostView.gameStarted'), {
      icon: '🎮',
      duration: 3000,
    });
  };

  const stopGame = () => {
    socket.emit('endGame', { gameCode });
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
    socket.emit('closeRoom', { gameCode });
    // Wait a bit for the message to be sent, then disconnect and reload
    setTimeout(() => {
      socket.disconnect();
      window.location.reload();
    }, 100);
  };

  // Cancel tournament handler
  const handleCancelTournament = () => {
    if (!socket || !tournamentData) return;

    socket.emit('cancelTournament');

    setShowCancelTournamentDialog(false);
    toast.success(t('hostView.tournamentCancelled') || 'Tournament cancelled', {
      icon: '❌',
      duration: 3000,
    });
  };

  const submitValidation = useCallback(() => {
    // Convert validations object to array with unique words only
    const validationArray = [];
    Object.keys(validations).forEach(word => {
      validationArray.push({
        word: word,
        isValid: validations[word],
      });
    });

    console.log('[HOST] Submitting validation:', {
      validationArrayLength: validationArray.length,
      validations: validationArray
    });

    socket.emit('validateWords', {
      validations: validationArray,
    });

    toast.loading(t('hostView.validatingWords'), {
      duration: 2000,
    });
  }, [validations, socket, t]);

  // Update ref whenever submitValidation changes
  useEffect(() => {
    submitValidationRef.current = submitValidation;
  }, [submitValidation]);

  // Idle timer for auto-submitting validation after 15 seconds
  const handleValidationIdle = useCallback(() => {
    if (showValidation && submitValidationRef.current) {
      toast.info(t('hostView.autoSubmittingValidation') || 'Auto-submitting validation due to inactivity', {
        icon: '⏱️',
        duration: 2000,
      });
      submitValidationRef.current();
    }
  }, [showValidation, t]);

  const { reset: resetIdleTimer } = useIdleTimer({
    timeout: 15000, // 15 seconds
    onIdle: handleValidationIdle,
    disabled: !showValidation, // Only active during validation
    throttle: 500,
  });

  // Reset idle timer when validation state changes or validations are updated
  useEffect(() => {
    if (showValidation) {
      resetIdleTimer();
    }
  }, [showValidation, validations, resetIdleTimer]);

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
    socket.emit('submitWord', {
      word: trimmedWord.toLowerCase(),
    });

    setHostFoundWords(prev => [...prev, trimmedWord]);
    setWord('');

    // Keep focus on input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [word, gameStarted, hostPlaying, socket, t, roomLanguage]);

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

      {/* GO Animation */}
      {showStartAnimation && (
        <GoRipplesAnimation onComplete={() => setShowStartAnimation(false)} />
      )}

      {/* Validation Modal */}
      <Dialog open={showValidation} onOpenChange={setShowValidation}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-gradient-to-b from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-indigo-950">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-center text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 flex items-center justify-center gap-3">
              ✓ {t('hostView.validation')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="flex-shrink-0 text-center space-y-2 bg-white/50 dark:bg-slate-800/50 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800 mb-4">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {t('hostView.validateIntro')}
              </p>
              <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 flex items-center justify-center gap-2">
                <span className="text-lg">⚠</span> {t('hostView.duplicateWarning')}
              </p>
            </div>

            {showValidation && (() => {
              const uniqueWords = getUniqueWords();

              // Separate words into auto-verified and non-auto-verified
              const nonAutoVerifiedWords = uniqueWords.filter(item => !item.autoValidated);
              const autoVerifiedWords = uniqueWords.filter(item => item.autoValidated);

              const validCount = uniqueWords.filter(item => {
                const isValid = validations[item.word] !== undefined ? validations[item.word] : true;
                return isValid && item.playerCount === 1;
              }).length;
              const duplicateCount = uniqueWords.filter(item => item.playerCount > 1).length;

              return (
                <div className="flex-1 flex flex-col min-h-0 space-y-3">
                  <div className="flex-shrink-0 flex justify-center gap-4 text-sm">
                    <div className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full border border-indigo-300 dark:border-indigo-700">
                      <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                        {t('hostView.totalWords')} {uniqueWords.length}
                      </span>
                    </div>
                    <div className="px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full border border-green-300 dark:border-green-700">
                      <span className="font-semibold text-green-700 dark:text-green-300">
                        ✓ {validCount}
                      </span>
                    </div>
                    {duplicateCount > 0 && (
                      <div className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 rounded-full border border-orange-300 dark:border-orange-700">
                        <span className="font-semibold text-orange-700 dark:text-orange-300">
                          ⚠ {duplicateCount}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 overflow-auto space-y-2 px-1 min-h-0">
                    {/* Non-Auto-Verified Words Section */}
                    {nonAutoVerifiedWords.map((item, index) => {
                      const isDuplicate = item.playerCount > 1;
                      const isAutoValidated = item.autoValidated;
                      const isValid = validations[item.word] !== undefined ? validations[item.word] : true;

                      return (
                        <motion.div
                          key={`non-auto-${index}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(index * 0.02, 0.5) }}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl transition-all border-2",
                            isDuplicate
                              ? "bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-300 dark:border-orange-700"
                              : isAutoValidated
                                ? "bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border-cyan-300 dark:border-cyan-700"
                                : isValid
                                  ? "bg-white dark:bg-slate-800 border-indigo-200 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500"
                                  : "bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-500 opacity-60"
                          )}
                        >
                          <Checkbox
                            checked={isValid}
                            onCheckedChange={() => toggleWordValidation(null, item.word)}
                            disabled={isDuplicate}
                            className={cn(
                              "w-6 h-6 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-indigo-600 data-[state=checked]:to-purple-600",
                              isDuplicate && "opacity-30 cursor-not-allowed"
                            )}
                          />
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className={cn(
                              "text-lg font-bold",
                              isDuplicate && "line-through text-gray-400 dark:text-gray-600",
                              !isDuplicate && !isValid && "text-gray-400 dark:text-gray-600"
                            )}>
                              {applyHebrewFinalLetters(item.word)}
                            </span>
                            {isDuplicate && (
                              <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 shadow-md">
                                ⚠ {item.playerCount} {t('joinView.players')}
                              </Badge>
                            )}
                            {isAutoValidated && !isDuplicate && (
                              <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0 shadow-md">
                                ✓ {t('hostView.autoValidated')}
                              </Badge>
                            )}
                            {item.playerCount === 1 && (
                              <span className="text-sm font-medium text-slate-500 dark:text-slate-400 ml-auto truncate">
                                {item.players[0]}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}

                    {/* Divider - Only show if both sections have words */}
                    {nonAutoVerifiedWords.length > 0 && autoVerifiedWords.length > 0 && (
                      <div className="flex items-center gap-3 py-3">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
                        <span className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 flex items-center gap-2">
                          <span className="text-lg">✓</span>
                          {t('hostView.autoValidated')}
                        </span>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
                      </div>
                    )}

                    {/* Auto-Verified Words Section */}
                    {autoVerifiedWords.map((item, index) => {
                      const isDuplicate = item.playerCount > 1;
                      const isAutoValidated = item.autoValidated;
                      const isValid = validations[item.word] !== undefined ? validations[item.word] : true;

                      return (
                        <motion.div
                          key={`auto-${index}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min((nonAutoVerifiedWords.length + index) * 0.02, 0.5) }}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl transition-all border-2",
                            isDuplicate
                              ? "bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-300 dark:border-orange-700"
                              : isAutoValidated
                                ? "bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border-cyan-300 dark:border-cyan-700"
                                : isValid
                                  ? "bg-white dark:bg-slate-800 border-indigo-200 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500"
                                  : "bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-500 opacity-60"
                          )}
                        >
                          <Checkbox
                            checked={isValid}
                            onCheckedChange={() => toggleWordValidation(null, item.word)}
                            disabled={isDuplicate}
                            className={cn(
                              "w-6 h-6 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-indigo-600 data-[state=checked]:to-purple-600",
                              isDuplicate && "opacity-30 cursor-not-allowed"
                            )}
                          />
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className={cn(
                              "text-lg font-bold",
                              isDuplicate && "line-through text-gray-400 dark:text-gray-600",
                              !isDuplicate && !isValid && "text-gray-400 dark:text-gray-600"
                            )}>
                              {applyHebrewFinalLetters(item.word)}
                            </span>
                            {isDuplicate && (
                              <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 shadow-md">
                                ⚠ {item.playerCount} {t('joinView.players')}
                              </Badge>
                            )}
                            {isAutoValidated && !isDuplicate && (
                              <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0 shadow-md">
                                ✓ {t('hostView.autoValidated')}
                              </Badge>
                            )}
                            {item.playerCount === 1 && (
                              <span className="text-sm font-medium text-slate-500 dark:text-slate-400 ml-auto truncate">
                                {item.players[0]}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
          <DialogFooter className="flex-shrink-0 mt-4 pt-4 border-t border-indigo-200 dark:border-indigo-800">
            <Button
              onClick={submitValidation}
              className="w-full h-14 text-xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all duration-200 text-white"
            >
              {t('hostView.submitValidation')} →
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
              {tournamentData ? t('hostView.tournamentRound') + ' ' + tournamentData.currentRound : t('hostView.finalScores')}
              <FaTrophy className="text-yellow-500" />
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Tournament Mode: Show both round results AND tournament standings */}
            {tournamentData && (
              <>
                {/* Current Round Results */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-center text-purple-600 dark:text-purple-300">
                    Round {tournamentData.currentRound} Results
                  </h3>
                  {finalScores && finalScores.length > 0 && (
                    <div className="space-y-3 max-w-3xl mx-auto">
                      {finalScores.map((player, index) => {
                        // Create allPlayerWords map for duplicate detection
                        const allPlayerWords = {};
                        finalScores.forEach(p => {
                          allPlayerWords[p.username] = p.allWords || [];
                        });
                        return (
                          <ResultsPlayerCard
                            key={player.username}
                            player={player}
                            index={index}
                            allPlayerWords={allPlayerWords}
                            currentUsername={username}
                            isWinner={index === 0}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Overall Tournament Standings */}
                {tournamentData.standings && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-center text-amber-600 dark:text-amber-300">
                      Tournament Standings (After Round {tournamentData.currentRound})
                    </h3>
                    <div className="max-w-3xl mx-auto">
                      <TournamentStandings
                        standings={tournamentData.standings}
                        currentRound={tournamentData.currentRound}
                        totalRounds={tournamentData.totalRounds}
                        isComplete={tournamentData.isComplete}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Regular Game Mode: Show only game results */}
            {!tournamentData && finalScores && finalScores.length > 0 && (
              <div className="space-y-3 max-w-3xl mx-auto">
                {finalScores.map((player, index) => {
                  // Create allPlayerWords map for duplicate detection
                  const allPlayerWords = {};
                  finalScores.forEach(p => {
                    allPlayerWords[p.username] = p.allWords || [];
                  });
                  return (
                    <ResultsPlayerCard
                      key={player.username}
                      player={player}
                      index={index}
                      allPlayerWords={allPlayerWords}
                      currentUsername={username}
                      isWinner={index === 0}
                    />
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {tournamentData && !tournamentData.isComplete && (
              <Button
                onClick={() => {
                  setFinalScores(null);
                  // Start next round
                  socket.emit('startTournamentRound');
                }}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500"
              >
                🏁 {t('hostView.nextRound')}
              </Button>
            )}
            {(!tournamentData || tournamentData.isComplete) && (
              <Button
                onClick={() => {
                  // Send reset message to all players
                  socket.emit('resetGame');

                  // Reset host local state
                  setFinalScores(null);
                  setGameStarted(false);
                  setRemainingTime(null);
                  setTournamentData(null);
                  setTournamentMode(false);

                  // Clear word-related state for new game
                  setValidations({});
                  setPlayerWords([]);
                  setPlayerWordCounts({});

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
            )}
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
        {/* Row 1: Room Code + Language + Share (when not started) */}
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
                  {tournamentData && (
                    <Badge className="text-sm px-3 py-1 bg-gradient-to-r from-amber-500 to-yellow-600 text-white border-0">
                      <FaTrophy className="mr-1" />
                      {t('hostView.tournamentMode')} - {t('hostView.tournamentRound')} {tournamentData.currentRound}/{tournamentData.totalRounds}
                    </Badge>
                  )}
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

        {/* Row 2: Game Settings + Players List (side by side on desktop) */}
        {!gameStarted && (
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 md:gap-6">
            {/* Game Settings - LEFT */}
          <Card className="flex-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-3 sm:p-4 md:p-5 rounded-lg border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
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

                        {/* Tournament Mode */}
                        <div className="space-y-3 p-3 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-md border-2 border-amber-500/50">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="tournamentMode"
                              checked={tournamentMode}
                              onCheckedChange={setTournamentMode}
                              className="border-amber-500/50"
                            />
                            <label htmlFor="tournamentMode" className="text-sm font-bold text-amber-700 dark:text-amber-300 cursor-pointer flex items-center gap-2">
                              <FaTrophy className="text-amber-500" />
                              {t('hostView.tournamentMode') || 'Tournament Mode'}
                            </label>
                          </div>

                          {tournamentMode && (
                            <>
                              <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 p-2 rounded-md border border-amber-500/30">
                                <span className="text-xs font-medium text-amber-700 dark:text-amber-300 whitespace-nowrap">
                                  {t('hostView.rounds') || 'Rounds'}:
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setTournamentRounds(prev => Math.max(2, prev - 1))}
                                  className="w-7 h-7 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-amber-500/50 text-amber-600 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/20 transition-all duration-300"
                                >
                                  <FaMinus size={10} />
                                </button>
                                <span className="w-8 text-center text-sm font-bold text-amber-700 dark:text-amber-300">
                                  {tournamentRounds}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setTournamentRounds(prev => Math.min(10, prev + 1))}
                                  className="w-7 h-7 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-amber-500/50 text-amber-600 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/20 transition-all duration-300"
                                >
                                  <FaPlus size={10} />
                                </button>
                              </div>

                              {/* Cancel Tournament Button - Only show if tournament has started */}
                              {tournamentData && (
                                <Button
                                  onClick={() => setShowCancelTournamentDialog(true)}
                                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-xs py-2"
                                >
                                  ❌ {t('hostView.cancelTournament') || 'Cancel Tournament'}
                                </Button>
                              )}
                            </>
                          )}
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

          {/* Players List - RIGHT */}
          <Card className="lg:w-[350px] bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-3 sm:p-4 md:p-6 rounded-lg shadow-lg border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
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
          </div>
        )}

        {/* Row 3: Letter Grid + Chat (side by side on desktop when not started) */}
        {!gameStarted && (
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 md:gap-6">
            {/* Letter Grid - LEFT */}
            <Card className="flex-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-1 sm:p-3 rounded-lg shadow-lg border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)] flex flex-col items-center">
              {/* Grid Container */}
              <div className="w-full flex justify-center items-center transition-all duration-500 aspect-square max-w-[500px]">
                <div className="w-full h-full flex items-center justify-center">
                  <GridComponent
                    grid={shufflingGrid || tableData}
                    interactive={false}
                    selectedCells={highlightedCells}
                    className="w-full h-full"
                    playerView={false}
                    comboLevel={0}
                  />
                </div>
              </div>
            </Card>

            {/* Chat - RIGHT */}
            <div className="lg:w-[350px] xl:w-[400px]">
              <RoomChat
                username="Host"
                isHost={true}
                gameCode={gameCode}
                className="h-full min-h-[400px]"
              />
            </div>
          </div>
        )}

        {/* Game Started View */}
        {gameStarted && (
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 md:gap-6 transition-all duration-500 ease-in-out">
            {/* Players Section - LEFT during game */}
            <Card className="lg:w-[300px] bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-3 sm:p-4 md:p-6 rounded-lg shadow-lg border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
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
            /* Spectator Mode - Live Results Dashboard */
            <div className="flex-1 space-y-4">
              {/* Timer Display */}
              {remainingTime !== null && (
                <div className="flex items-center justify-center mb-4">
                  <CircularTimer remainingTime={remainingTime} totalTime={timerValue * 60} />
                </div>
              )}

              {/* Live Player Results */}
              {(() => {
                const sortedPlayers = [...playersReady].map(player => {
                  const username = typeof player === 'string' ? player : player.username;
                  const avatar = typeof player === 'object' ? player.avatar : null;
                  return {
                    username,
                    score: playerScores[username] || 0,
                    wordCount: playerWordCounts[username] || 0,
                    achievements: playerAchievements[username] || [],
                    avatar,
                    allWords: []
                  };
                }).sort((a, b) => b.score - a.score);

                return sortedPlayers.map((player, index) => (
                  <ResultsPlayerCard
                    key={player.username}
                    player={player}
                    index={index}
                    allPlayerWords={{}}
                    currentUsername={username}
                    isWinner={false}
                  />
                ));
              })()}
            </div>
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
                        socket.emit('submitWord', {
                          word: formedWord.toLowerCase(),
                        });
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
        </div>
        )}
      </div>

      {/* Cancel Tournament Confirmation Dialog */}
      <AlertDialog open={showCancelTournamentDialog} onOpenChange={setShowCancelTournamentDialog}>
        <AlertDialogContent className="bg-white dark:bg-slate-800 border-red-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white">
              {t('hostView.confirmCancelTournament') || 'Cancel Tournament?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-gray-300">
              {t('hostView.cancelTournamentWarning') || 'Are you sure you want to cancel the tournament? All progress will be lost and this cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelTournament}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
            >
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
