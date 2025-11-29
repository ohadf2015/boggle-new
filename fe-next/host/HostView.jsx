import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIdleTimer } from 'react-idle-timer';
import confetti from 'canvas-confetti';
import { wordAcceptedToast, wordErrorToast, neoSuccessToast, neoErrorToast, neoInfoToast } from '../components/NeoToast';
import { FaTrophy, FaClock, FaUsers, FaQrcode, FaSignOutAlt, FaWhatsapp, FaLink, FaCog, FaPlus, FaMinus, FaCrown, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import GridComponent from '../components/GridComponent';
import SlotMachineGrid from '../components/SlotMachineGrid';
import ShareButton from '../components/ShareButton';
import SlotMachineText from '../components/SlotMachineText';
import Avatar from '../components/Avatar';
import ResultsPlayerCard from '../components/results/ResultsPlayerCard';
import RoomChat from '../components/RoomChat';
import GoRipplesAnimation from '../components/GoRipplesAnimation';
import CircularTimer from '../components/CircularTimer';
import TournamentStandings from '../components/TournamentStandings';
import GameTypeSelector from '../components/GameTypeSelector';
import '../style/animation.scss';
import { generateRandomTable, embedWordInGrid, applyHebrewFinalLetters } from '../utils/utils';
import { useSocket } from '../utils/SocketContext';
import { clearSession } from '../utils/session';
import { copyJoinUrl, shareViaWhatsApp, getJoinUrl } from '../utils/share';
import { useLanguage } from '../contexts/LanguageContext';
import { useMusic } from '../contexts/MusicContext';
import { useSoundEffects } from '../contexts/SoundEffectsContext';
import { useAchievementQueue } from '../components/achievements';
import { DIFFICULTIES, DEFAULT_DIFFICULTY, MIN_WORD_LENGTH_OPTIONS, DEFAULT_MIN_WORD_LENGTH } from '../utils/consts';
import { cn } from '../lib/utils';
import logger from '@/utils/logger';

const HostView = ({ gameCode, roomLanguage: roomLanguageProp, initialPlayers = [], username, onShowResults }) => {
  const { t, language, dir } = useLanguage();
  const { socket } = useSocket();
  const { fadeToTrack, stopMusic, TRACKS } = useMusic();
  const { playComboSound } = useSoundEffects();
  const { queueAchievement } = useAchievementQueue();
  const intentionalExitRef = useRef(false);
  const [difficulty, setDifficulty] = useState(DEFAULT_DIFFICULTY);
  const [minWordLength, setMinWordLength] = useState(DEFAULT_MIN_WORD_LENGTH);
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
  const [hostAchievements, setHostAchievements] = useState([]); // Host's own achievements

  // Tournament mode states
  const [gameType, setGameType] = useState('regular'); // 'regular' or 'tournament'
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
  const comboLevelRef = useRef(0);
  const lastWordTimeRef = useRef(null);

  // Idle detection for validation - using ref to avoid dependency issues
  const submitValidationRef = useRef(null);

  // Track if urgent music has been triggered (to prevent re-triggering)
  const hasTriggeredUrgentMusicRef = useRef(false);

  // Music: Play in_game music when game starts
  useEffect(() => {
    if (gameStarted) {
      fadeToTrack(TRACKS.IN_GAME, 800, 800);
      hasTriggeredUrgentMusicRef.current = false; // Reset for new game
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStarted]);

  // Music: Play urgent music when 20 seconds remaining
  useEffect(() => {
    if (gameStarted && remainingTime !== null && remainingTime <= 20 && remainingTime > 0 && !hasTriggeredUrgentMusicRef.current) {
      hasTriggeredUrgentMusicRef.current = true;
      fadeToTrack(TRACKS.ALMOST_OUT_OF_TIME, 500, 500);
    }
    // Stop music when game ends (remainingTime hits 0)
    if (remainingTime === 0) {
      stopMusic(1500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingTime, gameStarted]);

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
      // 50% chance to show a player name if players exist (increased from 30%)
      const showPlayerName = playersReady.length > 0 && Math.random() < 0.5;

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

          // Wait before starting letter animation for visibility
          setTimeout(() => {
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
                setTimeout(animateSelection, 150); // 150ms per letter (slower for visibility)
              } else {
                // Keep highlight visible longer after completing the word
                setTimeout(() => {
                  setHighlightedCells([]);
                  if (socket) {
                    socket.emit('broadcastShufflingGrid', {
                      grid: result.grid,
                      highlightedCells: []
                    });
                  }
                }, 1500); // 1.5 seconds to keep name highlighted
              }
            };
            animateSelection();
          }, 400); // 400ms delay before starting letter animation
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
    }, 3500); // Increased interval to 3.5 seconds for better visibility

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
      const newUsers = data.users || [];
      setPlayersReady(newUsers);

      // Clean up scores/stats for players who left
      const currentUsernames = new Set(newUsers.map(u =>
        typeof u === 'string' ? u : u.username
      ));

      setPlayerScores(prev => {
        const filtered = {};
        Object.keys(prev).forEach(username => {
          if (currentUsernames.has(username)) {
            filtered[username] = prev[username];
          }
        });
        return filtered;
      });

      setPlayerWordCounts(prev => {
        const filtered = {};
        Object.keys(prev).forEach(username => {
          if (currentUsernames.has(username)) {
            filtered[username] = prev[username];
          }
        });
        return filtered;
      });

      setPlayerAchievements(prev => {
        const filtered = {};
        Object.keys(prev).forEach(username => {
          if (currentUsernames.has(username)) {
            filtered[username] = prev[username];
          }
        });
        return filtered;
      });
    };

    const handlePlayerJoinedLate = (data) => {
      neoInfoToast(`${data.username} ${t('hostView.playerJoinedLate')}`, {
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

    // Handle host's own live achievements
    const handleLiveAchievementUnlocked = (data) => {
      // Validate achievement data
      if (!data || !data.achievements || !Array.isArray(data.achievements)) {
        logger.warn('[HOST] Received invalid achievement data:', data);
        return;
      }

      logger.log(`[HOST] Received ${data.achievements.length} live achievements:`,
        data.achievements.map(a => a?.name || 'unknown').join(', '));

      // Queue achievements for popup display (works whether host is playing or not)
      data.achievements.forEach(achievement => {
        if (achievement && achievement.name) {
          queueAchievement(achievement);
        } else {
          logger.warn('[HOST] Skipping invalid achievement:', achievement);
        }
      });

      // Store achievements if host is playing
      if (hostPlaying) {
        const validAchievements = data.achievements.filter(a => a && a.name);
        setHostAchievements(prev => [...prev, ...validAchievements]);
        logger.log(`[HOST] Added ${validAchievements.length} achievements to host state`);
      }
    };

    const handleShowValidation = (data) => {
      // If all words are auto-validated, skip validation screen entirely
      if (data.skipValidation) {
        // Build validations array with all auto-validated words marked as valid
        const validationArray = [];
        data.playerWords.forEach(player => {
          player.words.forEach(wordObj => {
            // Only add unique words
            if (!validationArray.some(v => v.word === wordObj.word)) {
              validationArray.push({
                word: wordObj.word,
                isValid: wordObj.autoValidated,
              });
            }
          });
        });

        // Auto-submit validation
        socket.emit('validateWords', {
          validations: validationArray,
        });

        neoSuccessToast(t('hostView.allWordsAutoValidated') || 'All words auto-validated!', {
          icon: '✅',
          duration: 3000,
        });
        return;
      }

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
        neoSuccessToast(`${data.autoValidatedCount} ${t('hostView.autoValidatedCount')}`, {
          duration: 5000,
          icon: '✅',
        });
      }

      neoInfoToast(t('hostView.validateWords'), {
        icon: '✅',
        duration: 5000,
      });
    };

    const handleValidationComplete = (data) => {
      logger.log('[HOST] Received validationComplete event:', data);
      setShowValidation(false);
      neoSuccessToast(t('hostView.validationComplete'), {
        icon: '🎉',
        duration: 3000,
      });
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
      });
      // Show results page like players do
      if (onShowResults) {
        onShowResults({
          scores: data.scores,
          letterGrid: tableData
        });
      } else {
        // Fallback to modal if no callback provided
        setFinalScores(data.scores);
      }
    };

    const handleAutoValidationOccurred = (data) => {
      neoInfoToast(data.message || t('hostView.autoValidationCompleted'), {
        icon: '⏱️',
        duration: 4000,
      });
    };

    const handleRoomClosedDueToInactivity = (data) => {
      intentionalExitRef.current = true;
      neoErrorToast(data.message || t('hostView.roomClosedInactivity'), {
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
        neoSuccessToast(t('hostView.gameOverCheckScores'), {
          icon: '🏁',
          duration: 5000,
        });
      }
    };

    // Handle gameStarted event from server (used by tournament mode)
    const handleGameStarted = (data) => {
      if (data.letterGrid) {
        setTableData(data.letterGrid);
      }
      if (data.timerSeconds !== undefined) {
        setRemainingTime(data.timerSeconds);
      }
      setGameStarted(true);
      setShowStartAnimation(true);
      setPlayerWordCounts({});
      setPlayerScores({});  // Clear scores for new round
      setHostFoundWords([]);
      setHostAchievements([]); // Reset host achievements for new game
    };

    const handleWordAccepted = (data) => {
      if (hostPlaying) {
        const now = Date.now();
        let newComboLevel;
        // Use refs to get current values (avoids stale closure bug)
        const currentComboLevel = comboLevelRef.current;
        const currentLastWordTime = lastWordTimeRef.current;

        // Combo chain window scales with current combo level (3s base + 1s per level, max 10s)
        const comboChainWindow = Math.min(3000 + currentComboLevel * 1000, 10000);
        if (currentLastWordTime && (now - currentLastWordTime) < comboChainWindow) {
          newComboLevel = currentComboLevel + 1;
          setComboLevel(newComboLevel);
          comboLevelRef.current = newComboLevel;
          // Play combo sound with increasing pitch
          playComboSound(newComboLevel);
        } else {
          newComboLevel = 0;
          setComboLevel(0);
          comboLevelRef.current = 0;
        }
        setLastWordTime(now);
        lastWordTimeRef.current = now;

        if (comboTimeoutRef.current) {
          clearTimeout(comboTimeoutRef.current);
        }

        // Timeout to reset combo if no word submitted (same scaling)
        const comboTimeout = Math.min(3000 + newComboLevel * 1000, 10000);
        comboTimeoutRef.current = setTimeout(() => {
          setComboLevel(0);
          comboLevelRef.current = 0;
          setLastWordTime(null);
          lastWordTimeRef.current = null;
        }, comboTimeout);

        // Calculate combo bonus for display
        const baseScore = data.word.length - 1; // Base score without combo
        const comboBonus = (data.score || baseScore) - baseScore;

        // Neo-Brutalist word accepted toast with score and combo bonus
        wordAcceptedToast(data.word, {
          score: data.score || baseScore,
          comboBonus: comboBonus > 0 ? comboBonus : 0,
          comboLevel: newComboLevel,
          duration: 2000
        });
      }
    };

    const handleWordAlreadyFound = () => {
      if (hostPlaying) {
        wordErrorToast(t('playerView.wordAlreadyFound'), { duration: 2000 });
        setComboLevel(0);
        comboLevelRef.current = 0;
        setLastWordTime(null);
        lastWordTimeRef.current = null;
        if (comboTimeoutRef.current) {
          clearTimeout(comboTimeoutRef.current);
        }
      }
    };

    const handleWordNotOnBoard = (data) => {
      if (hostPlaying) {
        wordErrorToast(t('playerView.wordNotOnBoard'), { duration: 3000 });
        setHostFoundWords(prev => prev.filter(w => w !== data.word));
        setComboLevel(0);
        comboLevelRef.current = 0;
        setLastWordTime(null);
        lastWordTimeRef.current = null;
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
      neoSuccessToast(`${t('hostView.tournamentMode')}: ${data.tournament.totalRounds} ${t('hostView.rounds')}`, {
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
      neoInfoToast(`${t('hostView.tournamentRound')} ${data.roundNumber}/${data.totalRounds}`, {
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
        neoSuccessToast(t('hostView.tournamentComplete'), {
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
      setGameType('regular');
      neoErrorToast('Tournament cancelled', {
        icon: '🚫',
        duration: 3000,
      });
    };

    // Register all event listeners
    socket.on('updateUsers', handleUpdateUsers);
    socket.on('playerJoinedLate', handlePlayerJoinedLate);
    socket.on('playerFoundWord', handlePlayerFoundWord);
    socket.on('achievementUnlocked', handleAchievementUnlocked);
    socket.on('liveAchievementUnlocked', handleLiveAchievementUnlocked);
    socket.on('showValidation', handleShowValidation);
    socket.on('validationComplete', handleValidationComplete);
    socket.on('autoValidationOccurred', handleAutoValidationOccurred);
    socket.on('roomClosedDueToInactivity', handleRoomClosedDueToInactivity);
    socket.on('timeUpdate', handleTimeUpdate);
    socket.on('gameStarted', handleGameStarted);
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
      socket.off('liveAchievementUnlocked', handleLiveAchievementUnlocked);
      socket.off('showValidation', handleShowValidation);
      socket.off('validationComplete', handleValidationComplete);
      socket.off('autoValidationOccurred', handleAutoValidationOccurred);
      socket.off('roomClosedDueToInactivity', handleRoomClosedDueToInactivity);
      socket.off('timeUpdate', handleTimeUpdate);
      socket.off('gameStarted', handleGameStarted);
      socket.off('wordAccepted', handleWordAccepted);
      socket.off('wordAlreadyFound', handleWordAlreadyFound);
      socket.off('wordNotOnBoard', handleWordNotOnBoard);
      socket.off('tournamentCreated', handleTournamentCreated);
      socket.off('tournamentRoundStarting', handleTournamentRoundStarting);
      socket.off('tournamentRoundCompleted', handleTournamentRoundCompleted);
      socket.off('tournamentComplete', handleTournamentComplete);
      socket.off('tournamentCancelled', handleTournamentCancelled);
    };
  }, [socket, gameStarted, t, hostPlaying, onShowResults, tableData, queueAchievement, playComboSound]);

  const startGame = () => {
    if (playersReady.length === 0) return;

    // If tournament mode is enabled and no tournament exists, create one first
    if (gameType === 'tournament' && !tournamentData) {
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
          neoErrorToast(t('hostView.tournamentCreateFailed'), {
            icon: '❌',
            duration: 5000,
          });
        }
      }, 5000);

      // Wait for tournament creation, then start first round
      return;
    }

    // If tournament mode and tournament exists, start next round
    if (gameType === 'tournament' && tournamentData) {
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
    setPlayerScores({}); // Reset scores
    setHostFoundWords([]); // Reset host words
    setHostAchievements([]); // Reset host achievements

    // Send start game message with letter grid and timer
    socket.emit('startGame', {
      letterGrid: newTable,
      timerSeconds: seconds,
      language: roomLanguage,
      hostPlaying: hostPlaying,
      minWordLength: minWordLength
    });

    neoSuccessToast(t('common.gameStarted'), {
      icon: '🎮',
      duration: 3000,
    });
  };

  const stopGame = () => {
    socket.emit('endGame', { gameCode });
    setRemainingTime(null);
    setGameStarted(false);

    neoInfoToast(t('hostView.gameStopped'), {
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
    neoErrorToast(t('hostView.tournamentCancelled') || 'Tournament cancelled', {
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

    logger.log('[HOST] Submitting validation:', {
      validationArrayLength: validationArray.length,
      validations: validationArray
    });

    socket.emit('validateWords', {
      validations: validationArray,
    });

    neoInfoToast(t('hostView.validatingWords'), {
      duration: 2000,
      icon: '⏳',
    });
  }, [validations, socket, t]);

  // Update ref whenever submitValidation changes
  useEffect(() => {
    submitValidationRef.current = submitValidation;
  }, [submitValidation]);

  // Idle timer for auto-submitting validation after 15 seconds
  const handleValidationIdle = useCallback(() => {
    if (showValidation && submitValidationRef.current) {
      neoInfoToast(t('hostView.autoSubmittingValidation') || 'Auto-submitting validation due to inactivity', {
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
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col bg-slate-900 border-cyan-500/40">
          <DialogHeader className="flex-shrink-0 pb-2">
            <DialogTitle className="text-center text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
              {t('hostView.validation')}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {showValidation && (() => {
              const uniqueWords = getUniqueWords();
              const nonAutoVerifiedWords = uniqueWords.filter(item => !item.autoValidated);
              const autoVerifiedWords = uniqueWords.filter(item => item.autoValidated);

              return (
                <div className="flex-1 flex flex-col min-h-0 gap-3">
                  {/* Words to validate - Grid layout for better visibility */}
                  <div className="flex-1 overflow-auto min-h-0">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-1">
                      {nonAutoVerifiedWords.map((item, index) => {
                        const isDuplicate = item.playerCount > 1;
                        const isValid = validations[item.word] !== undefined ? validations[item.word] : true;

                        return (
                          <motion.button
                            key={`word-${index}`}
                            type="button"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: Math.min(index * 0.02, 0.3) }}
                            onClick={() => !isDuplicate && toggleWordValidation(null, item.word)}
                            disabled={isDuplicate}
                            className={cn(
                              "p-3 rounded-lg text-center transition-all border-2 cursor-pointer",
                              isDuplicate
                                ? "bg-orange-900/40 border-orange-500/50 opacity-50 cursor-not-allowed"
                                : isValid
                                  ? "bg-gradient-to-br from-cyan-600/80 to-teal-600/80 border-cyan-400/60 hover:border-cyan-300 shadow-lg shadow-cyan-500/20"
                                  : "bg-slate-800/80 border-slate-600/50 hover:border-slate-500"
                            )}
                          >
                            <span className={cn(
                              "text-xl font-bold block",
                              isDuplicate ? "line-through text-orange-300/60" :
                              isValid ? "text-white" : "text-slate-500"
                            )}>
                              {applyHebrewFinalLetters(item.word).toUpperCase()}
                            </span>
                            {isDuplicate && (
                              <span className="text-xs text-orange-400 mt-1 block">
                                {item.playerCount} {t('joinView.players')}
                              </span>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Auto-validated summary */}
                  {autoVerifiedWords.length > 0 && (
                    <div className="flex-shrink-0 py-2 px-3 bg-teal-900/30 rounded-lg border border-teal-500/40 text-center">
                      <span className="text-sm text-teal-300">
                        ✓ {autoVerifiedWords.length} {t('hostView.wordsAutoValidated') || 'auto-validated'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <DialogFooter className="flex-shrink-0 pt-3 border-t border-cyan-500/30">
            <Button
              onClick={submitValidation}
              className="w-full h-12 text-lg font-bold bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 text-white"
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
                  setGameType('regular');

                  // Clear word-related state for new game
                  setValidations({});
                  setPlayerWords([]);
                  setPlayerWordCounts({});
                  setPlayerScores({});  // Clear scores
                  setHostFoundWords([]); // Clear host's found words
                  setHostAchievements([]); // Clear host's achievements

                  setTimerValue('1');

                  neoSuccessToast(`${t('common.newGameReady')}`, {
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
          onClick={handleExitRoom}
          size="sm"
          className="shadow-lg hover:scale-105 transition-transform bg-red-500 hover:bg-red-600 border border-red-400/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]"
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
          <Card className="bg-slate-800/95 text-neo-white p-3 sm:p-4 md:p-6 border-4 border-neo-black shadow-hard-lg">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Room Code and Language in same row */}
              <div className="flex flex-col items-center sm:items-start gap-2">
                <div className="flex items-center gap-3">
                  <div className="text-center sm:text-left">
                    <p className="text-sm text-neo-cyan font-bold uppercase">{t('hostView.roomCode')}:</p>
                    <h2 className="text-3xl sm:text-4xl font-black tracking-wide text-neo-yellow">
                      {gameCode}
                    </h2>
                  </div>
                  <Badge className="text-base sm:text-lg px-3 py-1 bg-neo-cream text-neo-black border-3 border-neo-black shadow-hard-sm font-bold">
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
          <div className="flex flex-col lg:flex-row lg:items-stretch gap-3 sm:gap-4 md:gap-6">
            {/* Game Settings - LEFT - Neo-Brutalist Dark */}
          <Card className="flex-1 p-3 sm:p-4 md:p-5 bg-slate-800/95 text-neo-white border-4 border-neo-black shadow-hard-lg">
            <h3 className="text-base font-black uppercase text-neo-cream mb-4 flex items-center gap-2">
              <FaCog className="text-neo-cyan text-sm" />
              {t('hostView.gameSettings')}
            </h3>
            <div className="w-full space-y-3 sm:space-y-4">
              {!gameStarted ? (
                <>
                  {/* Timer Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase text-neo-cream flex items-center gap-2">
                      <FaClock className="text-neo-cyan text-sm" />
                      {t('hostView.roundDuration')}
                    </label>
                    <div className="flex items-center gap-3">
                      {/* Minus Button */}
                      <button
                        type="button"
                        onClick={() => setTimerValue(prev => {
                          const current = parseInt(prev) || 0;
                          return Math.max(1, current - 1).toString();
                        })}
                        disabled={gameStarted}
                        className="w-10 h-10 flex items-center justify-center rounded-neo bg-neo-cream text-neo-black border-2 border-neo-black shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed font-black"
                      >
                        <FaMinus size={14} />
                      </button>

                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-black text-neo-yellow w-12 text-center">
                          {timerValue || '1'}
                        </span>
                        <span className="text-base text-neo-cream font-bold">{t('hostView.minutes')}</span>
                      </div>

                      {/* Plus Button */}
                      <button
                        type="button"
                        onClick={() => setTimerValue(prev => {
                          const current = parseInt(prev) || 0;
                          return (current + 1).toString();
                        })}
                        disabled={gameStarted}
                        className="w-10 h-10 flex items-center justify-center rounded-neo bg-neo-cream text-neo-black border-2 border-neo-black shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed font-black"
                      >
                        <FaPlus size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Game Type Selector */}
                  <GameTypeSelector
                    gameType={gameType}
                    setGameType={setGameType}
                    tournamentRounds={tournamentRounds}
                    setTournamentRounds={setTournamentRounds}
                  />

                  {/* Advanced Settings Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                    className="w-full flex items-center justify-between py-2 text-neo-cream/70 hover:text-neo-cream transition-colors duration-100"
                  >
                    <span className="text-sm font-bold uppercase">
                      {t('hostView.advancedSettings')}
                    </span>
                    {showAdvancedSettings ? <FaChevronUp /> : <FaChevronDown />}
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
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id="hostPlays"
                            checked={hostPlaying}
                            onCheckedChange={setHostPlaying}
                          />
                          <label htmlFor="hostPlays" className="text-sm font-bold text-neo-cream cursor-pointer">
                            {t('hostView.hostPlays')}
                          </label>
                        </div>

                        {/* Cancel Tournament Button - Only show if tournament has started - Neo-Brutalist */}
                        {tournamentData && (
                          <Button
                            onClick={() => setShowCancelTournamentDialog(true)}
                            className="w-full bg-neo-red text-neo-white text-xs py-2"
                          >
                            {t('hostView.cancelTournament') || 'Cancel Tournament'}
                          </Button>
                        )}

                        {/* Difficulty Selection - Neo-Brutalist Dark */}
                        <div className="space-y-2">
                          <label className="text-sm font-bold uppercase text-neo-cream">
                            {t('hostView.difficulty')}
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {Object.keys(DIFFICULTIES).map((key) => {
                              const isSelected = difficulty === key;
                              // Neo-Brutalist colors for difficulty
                              const difficultyColors = {
                                easy: 'bg-neo-lime',
                                normal: 'bg-neo-yellow',
                                medium: 'bg-neo-orange',
                                hard: 'bg-neo-red text-neo-white',
                                extreme: 'bg-neo-purple text-neo-white'
                              };
                              return (
                                <motion.button
                                  key={key}
                                  onClick={() => setDifficulty(key)}
                                  whileHover={{ x: -1, y: -1 }}
                                  whileTap={{ x: 2, y: 2 }}
                                  className={cn(
                                    "px-3 py-2 rounded-neo font-bold transition-all duration-100 border-3 border-neo-black",
                                    isSelected
                                      ? `${difficultyColors[key] || 'bg-neo-cyan'} shadow-none translate-x-[2px] translate-y-[2px]`
                                      : "bg-neo-cream text-neo-black shadow-hard-sm hover:shadow-hard"
                                  )}
                                >
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="font-black text-sm">{t(DIFFICULTIES[key].nameKey)}</span>
                                    <span className="text-xs font-bold opacity-80">
                                      ({DIFFICULTIES[key].rows}x{DIFFICULTIES[key].cols})
                                    </span>
                                  </div>
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Minimum Word Length Selection - Neo-Brutalist Dark */}
                        <div className="space-y-2">
                          <label className="text-sm font-bold uppercase text-neo-cream">
                            {t('hostView.minWordLength') || 'Minimum Word Length'}
                          </label>
                          <div className="flex gap-2">
                            {MIN_WORD_LENGTH_OPTIONS.map((option) => {
                              const isSelected = minWordLength === option.value;
                              return (
                                <motion.button
                                  key={option.value}
                                  onClick={() => setMinWordLength(option.value)}
                                  whileHover={{ x: -1, y: -1 }}
                                  whileTap={{ x: 2, y: 2 }}
                                  className={cn(
                                    "px-4 py-2 rounded-neo font-bold transition-all duration-100 border-3 border-neo-black",
                                    isSelected
                                      ? "bg-neo-cyan text-neo-black shadow-none translate-x-[2px] translate-y-[2px]"
                                      : "bg-neo-cream text-neo-black shadow-hard-sm hover:shadow-hard"
                                  )}
                                >
                                  {t(option.labelKey) || `${option.value} letters`}
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Start Button - Neo-Brutalist */}
                  <div className="pt-2 flex justify-center">
                    <Button
                      onClick={startGame}
                      disabled={!timerValue || playersReady.length === 0}
                      className="w-full max-w-xs h-11 text-base bg-neo-lime text-neo-black"
                    >
                      {t('hostView.startGame')}
                    </Button>
                  </div>
                </>
              ) : (
                <Button
                  onClick={stopGame}
                  variant="destructive"
                  className="w-full max-w-xs h-12 text-base bg-neo-red text-neo-white"
                >
                  {t('hostView.stopGame')}
                </Button>
              )}
            </div>
          </Card>

          {/* Players List - RIGHT - Neo-Brutalist Dark */}
          <Card className="lg:w-[350px] h-auto p-3 sm:p-4 md:p-6 flex flex-col bg-slate-800/95 text-neo-white border-4 border-neo-black shadow-hard-lg">
            <h3 className="text-lg font-black uppercase text-neo-cream mb-4 flex items-center gap-2 flex-shrink-0">
              <FaUsers className="text-neo-pink" />
              {t('hostView.playersJoined')} ({playersReady.length})
            </h3>
            <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
              <AnimatePresence>
                {playersReady.map((player, index) => {
                  // Handle both old format (string) and new format (object)
                  const username = typeof player === 'string' ? player : player.username;
                  const avatar = typeof player === 'object' ? player.avatar : null;
                  const isHost = typeof player === 'object' ? player.isHost : false;

                  return (
                    <motion.div
                      key={username}
                      initial={{ scale: 0, opacity: 0, rotate: -5 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Badge
                        className={cn(
                          "font-black px-3 py-2 text-base w-full justify-between border-3 border-neo-black shadow-hard-sm",
                          isHost ? "bg-neo-yellow text-neo-black" : "bg-neo-cream text-neo-black"
                        )}
                        style={avatar?.color && !isHost ? { backgroundColor: avatar.color } : {}}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar
                            profilePictureUrl={avatar?.profilePictureUrl}
                            avatarEmoji={avatar?.emoji}
                            avatarColor={avatar?.color}
                            size="sm"
                          />
                          {isHost && <FaCrown className="text-neo-black" />}
                          <SlotMachineText text={username} />
                        </div>
                        {gameStarted && (
                          <span className="bg-neo-black/20 px-2 py-0.5 rounded-neo text-sm font-black">
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
              <p className="text-sm text-center text-neo-cream/60 font-bold mt-2">
                {t('hostView.waitingForPlayers')}
              </p>
            )}
          </Card>
          </div>
        )}

        {/* Row 3: Letter Grid + Chat (side by side on desktop when not started) */}
        {!gameStarted && (
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 md:gap-6">
            {/* Letter Grid - LEFT - Neo-Brutalist */}
            <Card className="flex-1 p-1 sm:p-3 flex flex-col items-center bg-slate-800/95 border-4 border-neo-black shadow-hard-lg">
              {/* Grid Container with Slot Machine Animation */}
              <div className="w-full flex justify-center items-center transition-all duration-500 aspect-square max-w-full">
                <div className="w-full h-full flex items-center justify-center">
                  <SlotMachineGrid
                    grid={shufflingGrid || tableData}
                    highlightedCells={highlightedCells}
                    language={roomLanguage || language}
                    className="w-full h-full"
                    animationDuration={600}
                    staggerDelay={40}
                    animationPattern="cascade"
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

        {/* Game Started View - Same layout as PlayerView */}
        {gameStarted && (
          <div className="flex flex-col lg:flex-row gap-1 md:gap-2 flex-grow w-full overflow-hidden transition-all duration-500 ease-in-out">
            {/* Left Column: Found Words (only when host is playing) */}
            {hostPlaying && (
              <div className="hidden lg:flex lg:flex-col lg:w-64 xl:w-80 gap-2 min-h-0">
                <div
                  className="bg-neo-cream border-4 border-neo-black rounded-neo-lg shadow-hard-lg flex flex-col min-h-0 max-h-[60vh] overflow-hidden"
                  style={{ transform: 'rotate(1deg)' }}
                >
                  {/* Header */}
                  <div className="py-3 px-4 border-b-4 border-neo-black bg-neo-cyan">
                    <h3 className="text-neo-black text-base uppercase tracking-widest font-black">
                      {t('playerView.wordsFound')}
                    </h3>
                  </div>
                  {/* Content with fixed height */}
                  <div className="flex-1 overflow-y-auto p-3 min-h-0">
                    <div className="space-y-2">
                      <AnimatePresence>
                        {hostFoundWords.map((foundWord, index) => {
                          const isLatest = index === hostFoundWords.length - 1;
                          return (
                            <motion.div
                              key={index}
                              initial={{ x: -30, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              exit={{ x: -30, opacity: 0 }}
                              className={`p-2 text-center font-black uppercase border-3 border-neo-black rounded-neo transition-all
                                ${isLatest
                                  ? 'bg-neo-yellow text-neo-black shadow-hard'
                                  : 'bg-neo-cream text-neo-black shadow-hard-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard'}`}
                            >
                              {applyHebrewFinalLetters(foundWord).toUpperCase()}
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                      {hostFoundWords.length === 0 && (
                        <p className="text-center text-neo-black/60 py-6 text-sm font-bold">
                          {t('playerView.noWordsYet') || 'No words found yet'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Center Column: Letter Grid */}
            <div className="flex-1 flex flex-col gap-2 min-w-0 min-h-0">
              {/* Timer with Circular Progress */}
              {remainingTime !== null && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex justify-center mb-1 md:mb-2 relative z-10"
                >
                  <CircularTimer remainingTime={remainingTime} totalTime={timerValue * 60} />
                </motion.div>
              )}

              <Card className="bg-slate-800/95 dark:bg-slate-800/95 backdrop-blur-md border border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.2)] flex flex-col flex-grow overflow-hidden">
                <CardContent className="flex-grow flex flex-col items-center justify-center p-1 md:p-2 bg-slate-900/90">
                  <GridComponent
                    key={hostPlaying ? 'host-playing-grid' : 'host-spectating-grid'}
                    grid={tableData}
                    interactive={hostPlaying}
                    animateOnMount={true}
                    onWordSubmit={(formedWord) => {
                      if (!hostPlaying) return;

                      const regex = roomLanguage === 'he' ? /^[\u0590-\u05FF]+$/ :
                                    roomLanguage === 'sv' ? /^[a-zA-ZåäöÅÄÖ]+$/ :
                                    roomLanguage === 'ja' ? /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/ :
                                    /^[a-zA-Z]+$/;

                      if (formedWord.length < minWordLength) {
                        wordErrorToast(t('playerView.wordTooShort'), { duration: 1000 });
                        return;
                      }

                      if (regex.test(formedWord)) {
                        socket.emit('submitWord', {
                          word: formedWord.toLowerCase(),
                          comboLevel: comboLevelRef.current,
                        });
                        setHostFoundWords(prev => [...prev, formedWord]);
                      } else {
                        wordErrorToast(t('playerView.onlyLanguageWords'), { duration: 1000 });
                      }
                    }}
                    className="w-full max-w-2xl"
                    playerView={hostPlaying}
                    comboLevel={comboLevel}
                  />
                </CardContent>
              </Card>

              {/* Mobile: Word count display (when host is playing) */}
              {hostPlaying && (
                <div className="lg:hidden">
                  <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.1)]">
                    <CardContent className="p-3">
                      <div className="text-center text-lg text-teal-600 dark:text-teal-300 font-bold">
                        {hostFoundWords.length} {t('playerView.wordsFound') || 'words found'}
                      </div>
                      <div className="text-center text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {t('playerView.swipeToFormWords') || 'Swipe on the board to form words'}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            {/* Right Column: Live Leaderboard - Neo-Brutalist */}
            <div className="lg:w-64 xl:w-80 flex flex-col gap-2">
              <div
                className="bg-neo-cream border-4 border-neo-black rounded-neo-lg shadow-hard-lg flex flex-col overflow-hidden max-h-[40vh] lg:max-h-none lg:flex-grow"
                style={{ transform: 'rotate(-1deg)' }}
              >
                {/* Header */}
                <div className="py-3 px-4 border-b-4 border-neo-black bg-neo-purple">
                  <h3 className="flex items-center gap-2 text-neo-cream text-base uppercase tracking-widest font-black">
                    <FaTrophy className="text-neo-yellow" style={{ filter: 'drop-shadow(2px 2px 0px var(--neo-black))' }} />
                    {t('playerView.leaderboard')}
                  </h3>
                </div>
                {/* Content */}
                <div className="overflow-y-auto flex-1 p-3">
                  <div className="space-y-2">
                    {(() => {
                      const sortedPlayers = [...playersReady].map(player => {
                        const playerUsername = typeof player === 'string' ? player : player.username;
                        const avatar = typeof player === 'object' ? player.avatar : null;
                        const isHostPlayer = typeof player === 'object' ? player.isHost : false;
                        return {
                          username: playerUsername,
                          score: playerScores[playerUsername] || 0,
                          wordCount: playerWordCounts[playerUsername] || 0,
                          avatar,
                          isHost: isHostPlayer
                        };
                      }).sort((a, b) => b.score - a.score);

                      // Neo-Brutalist rank colors (solid, no gradients)
                      const getRankStyle = (index) => {
                        if (index === 0) return 'bg-neo-yellow text-neo-black border-neo-black';
                        if (index === 1) return 'bg-slate-300 text-neo-black border-neo-black';
                        if (index === 2) return 'bg-neo-orange text-neo-black border-neo-black';
                        return 'bg-neo-cream text-neo-black border-neo-black';
                      };

                      return sortedPlayers.map((player, index) => (
                        <motion.div
                          key={player.username}
                          initial={{ x: 50, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className={`flex items-center gap-3 p-2 rounded-neo border-3 shadow-hard-sm transition-all
                            hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard
                            ${getRankStyle(index)}`}
                        >
                          <div className="w-10 h-10 rounded-neo flex items-center justify-center font-black text-lg bg-neo-black text-neo-cream border-2 border-neo-black">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                          </div>
                          <Avatar
                            profilePictureUrl={player.avatar?.profilePictureUrl}
                            avatarEmoji={player.avatar?.emoji}
                            avatarColor={player.avatar?.color}
                            size="sm"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-black truncate text-sm flex items-center gap-1">
                              {player.isHost && <FaCrown className="text-neo-yellow" style={{ filter: 'drop-shadow(1px 1px 0px var(--neo-black))' }} />}
                              <SlotMachineText text={player.username} />
                            </div>
                            <div className="text-xs font-bold">{player.wordCount} {t('hostView.words') || 'words'}</div>
                          </div>
                          <div className="text-lg font-black">
                            {player.score} <span className="text-xs font-bold">pts</span>
                          </div>
                        </motion.div>
                      ));
                    })()}
                    {playersReady.length === 0 && (
                      <p className="text-center text-neo-black/60 py-6 text-sm font-bold">
                        {t('hostView.waitingForPlayers')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Chat Component - Desktop only */}
              <div className="hidden lg:block">
                <RoomChat
                  username="Host"
                  isHost={true}
                  gameCode={gameCode}
                  className="max-h-[200px]"
                />
              </div>
            </div>
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
