import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { AchievementBadge } from '../components/AchievementBadge';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import { FaTrophy, FaDoorOpen, FaUsers, FaCrown, FaRandom, FaLink, FaWhatsapp, FaQrcode } from 'react-icons/fa';
import { useSocket } from '../utils/SocketContext';
import { clearSession } from '../utils/session';
import { useLanguage } from '../contexts/LanguageContext';
import gsap from 'gsap';
import GridComponent from '../components/GridComponent';
import SlotMachineGrid from '../components/SlotMachineGrid';
import { applyHebrewFinalLetters } from '../utils/utils';
import RoomChat from '../components/RoomChat';
import GoRipplesAnimation from '../components/GoRipplesAnimation';
import CircularTimer from '../components/CircularTimer';
import { copyJoinUrl, shareViaWhatsApp, getJoinUrl } from '../utils/share';
import ShareButton from '../components/ShareButton';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import TournamentStandings from '../components/TournamentStandings';
import SlotMachineText from '../components/SlotMachineText';
import { sanitizeInput } from '../utils/validation';

const PlayerView = ({ onShowResults, initialPlayers = [], username, gameCode }) => {
  const { t, dir } = useLanguage();
  const { socket } = useSocket();
  const inputRef = useRef(null);
  const wordListRef = useRef(null);
  const intentionalExitRef = useRef(false);

  const [word, setWord] = useState('');
  const [foundWords, setFoundWords] = useState([]); // Array of { word: string, isValid: boolean | null }
  const [leaderboard, setLeaderboard] = useState([]);
  const [gameActive, setGameActive] = useState(false);
  const [achievements, setAchievements] = useState([]);
  const [letterGrid, setLetterGrid] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);
  const [waitingForResults, setWaitingForResults] = useState(false);
  const [showStartAnimation, setShowStartAnimation] = useState(false);

  const [playersReady, setPlayersReady] = useState(initialPlayers);
  const [shufflingGrid, setShufflingGrid] = useState(null);
  const [highlightedCells, setHighlightedCells] = useState([]);
  const [gameLanguage, setGameLanguage] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Track if player was in an active game session (to distinguish late joiners after game ended)
  const [wasInActiveGame, setWasInActiveGame] = useState(false);

  // Combo system state
  const [comboLevel, setComboLevel] = useState(0);
  const [lastWordTime, setLastWordTime] = useState(null);
  const comboTimeoutRef = useRef(null);

  // Tournament state
  const [tournamentData, setTournamentData] = useState(null);
  const [tournamentStandings, setTournamentStandings] = useState([]);
  const [showTournamentStandings, setShowTournamentStandings] = useState(false);

  // Pre-game shuffling animation - Disabled, now receives from host
  // Players will receive the shuffling grid from the host via socket event
  useEffect(() => {
    if (gameActive) {
      setShufflingGrid(null);
      setHighlightedCells([]);
    }
  }, [gameActive]);

  // Clear game state when entering
  useEffect(() => {
    localStorage.removeItem('boggle_player_state');
    setFoundWords([]);
    setAchievements([]);
  }, []);

  // Update players list when initialPlayers prop changes
  useEffect(() => {
    setPlayersReady(initialPlayers);
  }, [initialPlayers]);

  // Prevent accidental page refresh/close only when game is active or has data
  useEffect(() => {
    const shouldWarn = gameActive || foundWords.length > 0 || waitingForResults;

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
  }, [gameActive, foundWords.length, waitingForResults]);

  // Socket.IO event handlers
  useEffect(() => {
    if (!socket) return;

    const handleUpdateUsers = (data) => {
      setPlayersReady(data.users || []);
    };

    const handleShufflingGridUpdate = (data) => {
      if (data.grid) {
        setShufflingGrid(data.grid);
      }
      if (data.highlightedCells !== undefined) {
        setHighlightedCells(data.highlightedCells);
      }
    };

    const handleStartGame = (data) => {
      setWasInActiveGame(true);
      setFoundWords([]);
      setAchievements([]);
      if (data.letterGrid) setLetterGrid(data.letterGrid);
      if (data.timerSeconds) setRemainingTime(data.timerSeconds);
      if (data.language) setGameLanguage(data.language);
      setGameActive(true);
      setShowStartAnimation(true);

      // Send acknowledgment to server (skip for late-join/reconnect scenarios)
      if (data.messageId && !data.skipAck) {
        socket.emit('startGameAck', { messageId: data.messageId });
        console.log('[PLAYER] Sent startGameAck for messageId:', data.messageId);
      }

      toast.success(t('playerView.gameStarted'), {
        icon: '🚀',
        duration: 3000,
        style: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        },
      });
    };

    const handleEndGame = () => {
      setGameActive(false);
      setRemainingTime(0);
      if (wasInActiveGame) {
        setWaitingForResults(true);
        toast(t('playerView.gameOver'), { icon: '⏱️', duration: 4000 });
      }
    };

    const handleWordAccepted = (data) => {
      // Only animate input if it exists (may not exist when using grid swiping)
      if (inputRef.current) {
        gsap.fromTo(inputRef.current,
          { scale: 1.1, borderColor: '#4ade80' },
          { scale: 1, borderColor: '', duration: 0.3 }
        );
      }

      // Mark the word as valid in foundWords
      setFoundWords(prev => prev.map(fw =>
        fw.word.toLowerCase() === data.word.toLowerCase()
          ? { ...fw, isValid: true }
          : fw
      ));

      if (data.autoValidated) {
        toast.success(`✓ ${data.word}`, { duration: 2000, icon: '✅' });

        const now = Date.now();
        let newComboLevel;
        // Combo chain window scales with current combo level (5s base + 1.5s per level, max 15s)
        const comboChainWindow = Math.min(5000 + comboLevel * 1500, 15000);
        if (lastWordTime && (now - lastWordTime) < comboChainWindow) {
          newComboLevel = comboLevel + 1;
          setComboLevel(newComboLevel);
        } else {
          newComboLevel = 0;
          setComboLevel(0);
        }
        setLastWordTime(now);

        if (comboTimeoutRef.current) {
          clearTimeout(comboTimeoutRef.current);
        }

        // Timeout to reset combo if no word submitted (same scaling)
        const comboTimeout = Math.min(5000 + newComboLevel * 1500, 15000);
        comboTimeoutRef.current = setTimeout(() => {
          setComboLevel(0);
          setLastWordTime(null);
        }, comboTimeout);
      } else {
        toast.success(`✓ ${data.word}`, { duration: 2000 });
      }
    };

    const handleWordNeedsValidation = (data) => {
      toast(data.message || `⏳ ${data.word} - Needs host validation`, {
        duration: 3000,
        icon: '⏳',
        style: {
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: 'white',
        },
      });

      setComboLevel(0);
      setLastWordTime(null);
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
      }
    };

    const handleWordAlreadyFound = () => {
      toast.error(t('playerView.wordAlreadyFound'), { duration: 2000 });
      setComboLevel(0);
      setLastWordTime(null);
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
      }
    };

    const handleWordNotOnBoard = (data) => {
      toast.error(t('playerView.wordNotOnBoard'), { duration: 3000 });
      // Mark the word as invalid (red-pink) instead of removing it
      setFoundWords(prev => prev.map(fw =>
        fw.word.toLowerCase() === data.word.toLowerCase()
          ? { ...fw, isValid: false }
          : fw
      ));
      setComboLevel(0);
      setLastWordTime(null);
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
      }
    };

    const handleTimeUpdate = (data) => {
      setRemainingTime(data.remainingTime);

      // If we receive letterGrid in timeUpdate, update it (for late joiners who missed startGame)
      if (data.letterGrid && !letterGrid) {
        console.log('[PLAYER] Received letterGrid in timeUpdate - late join sync');
        setLetterGrid(data.letterGrid);
      }
      if (data.language && !gameLanguage) {
        setGameLanguage(data.language);
      }

      // Auto-activate game if timer is running and we have the grid
      const hasGrid = letterGrid || data.letterGrid;
      if (!gameActive && data.remainingTime > 0 && hasGrid) {
        console.log('[PLAYER] Timer started on server, activating game (remainingTime:', data.remainingTime, ')');
        setGameActive(true);
        setShowStartAnimation(true);
      }

      if (data.remainingTime === 0) {
        setGameActive(false);
        setWaitingForResults(true);
      }
    };

    const handleUpdateLeaderboard = (data) => {
      setLeaderboard(data.leaderboard);
    };

    const handleLiveAchievementUnlocked = (data) => {
      data.achievements.forEach(achievement => {
        toast.success(`🎉 ${achievement.icon} ${achievement.name}!`, {
          duration: 4000,
          style: {
            background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
            color: 'white',
            fontWeight: 'bold',
          },
        });
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      });
      setAchievements(prev => [...prev, ...data.achievements]);
    };

    const handleValidatedScores = (data) => {
      setWaitingForResults(false);
      if (onShowResults) {
        onShowResults({
          scores: data.scores,
          letterGrid: data.letterGrid,
        });
      }
    };

    const handleFinalScores = (data) => {
      setTimeout(() => {
        setWaitingForResults(false);
        if (onShowResults) {
          onShowResults({
            scores: data.scores,
            letterGrid: letterGrid,
          });
        }
      }, 10000);
    };

    const handleHostLeftRoomClosing = (data) => {
      intentionalExitRef.current = true;
      clearSession();
      toast.error(data.message || t('playerView.roomClosed'), {
        icon: '🚪',
        duration: 5000,
      });
      setTimeout(() => {
        socket.disconnect();
        window.location.reload();
      }, 2000);
    };

    const handleResetGame = (data) => {
      setGameActive(false);
      setWasInActiveGame(false);
      setFoundWords([]);
      setAchievements([]);
      setLeaderboard([]);
      setRemainingTime(null);
      setWaitingForResults(false);
      setLetterGrid(null);
      setPlayersReady([]);
      toast.success(data.message || t('playerView.startingNewGame'), {
        icon: '🔄',
        duration: 3000,
      });
    };

    const handleTournamentCreated = (data) => {
      setTournamentData(data.tournament);
      toast.success(t('hostView.tournamentCreated') || 'Tournament created!', {
        icon: '🏆',
        duration: 3000,
        style: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        },
      });
    };

    const handleTournamentRoundStarting = (data) => {
      if (data.tournament) {
        setTournamentData(data.tournament);
      }
      if (data.standings) {
        setTournamentStandings(data.standings);
      }
      const roundNum = data.tournament?.currentRound || 1;
      const totalRounds = data.tournament?.totalRounds || 3;
      toast.success(
        `${t('hostView.tournamentRound')} ${roundNum}/${totalRounds}`,
        {
          icon: '🎯',
          duration: 3000,
          style: {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
          },
        }
      );
    };

    const handleTournamentRoundCompleted = (data) => {
      if (data.standings) {
        setTournamentStandings(data.standings);
        setShowTournamentStandings(true);
      }
      if (data.tournament) {
        setTournamentData(data.tournament);
      }
    };

    const handleTournamentComplete = (data) => {
      if (data.standings) {
        setTournamentStandings(data.standings);
        setShowTournamentStandings(true);
      }
      if (data.tournament) {
        setTournamentData(data.tournament);
      }
      const winner = data.standings?.[0];
      if (winner) {
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
        });
        toast.success(
          `🏆 ${winner.username} ${t('hostView.wonTournament')}!`,
          {
            duration: 5000,
            style: {
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
              color: 'white',
              fontWeight: 'bold',
            },
          }
        );
      }
    };

    const handleTournamentCancelled = (data) => {
      setTournamentData(null);
      setTournamentStandings([]);
      setShowTournamentStandings(false);
      toast.error(data?.message || t('hostView.tournamentCancelled'), {
        icon: '❌',
        duration: 3000,
      });
    };

    // Register all event listeners
    socket.on('updateUsers', handleUpdateUsers);
    socket.on('shufflingGridUpdate', handleShufflingGridUpdate);
    socket.on('startGame', handleStartGame);
    socket.on('endGame', handleEndGame);
    socket.on('wordAccepted', handleWordAccepted);
    socket.on('wordNeedsValidation', handleWordNeedsValidation);
    socket.on('wordAlreadyFound', handleWordAlreadyFound);
    socket.on('wordNotOnBoard', handleWordNotOnBoard);
    socket.on('timeUpdate', handleTimeUpdate);
    socket.on('updateLeaderboard', handleUpdateLeaderboard);
    socket.on('liveAchievementUnlocked', handleLiveAchievementUnlocked);
    socket.on('validatedScores', handleValidatedScores);
    socket.on('finalScores', handleFinalScores);
    socket.on('hostLeftRoomClosing', handleHostLeftRoomClosing);
    socket.on('resetGame', handleResetGame);
    socket.on('tournamentCreated', handleTournamentCreated);
    socket.on('tournamentRoundStarting', handleTournamentRoundStarting);
    socket.on('tournamentRoundCompleted', handleTournamentRoundCompleted);
    socket.on('tournamentComplete', handleTournamentComplete);
    socket.on('tournamentCancelled', handleTournamentCancelled);

    return () => {
      socket.off('updateUsers', handleUpdateUsers);
      socket.off('shufflingGridUpdate', handleShufflingGridUpdate);
      socket.off('startGame', handleStartGame);
      socket.off('endGame', handleEndGame);
      socket.off('wordAccepted', handleWordAccepted);
      socket.off('wordNeedsValidation', handleWordNeedsValidation);
      socket.off('wordAlreadyFound', handleWordAlreadyFound);
      socket.off('wordNotOnBoard', handleWordNotOnBoard);
      socket.off('timeUpdate', handleTimeUpdate);
      socket.off('updateLeaderboard', handleUpdateLeaderboard);
      socket.off('liveAchievementUnlocked', handleLiveAchievementUnlocked);
      socket.off('validatedScores', handleValidatedScores);
      socket.off('finalScores', handleFinalScores);
      socket.off('hostLeftRoomClosing', handleHostLeftRoomClosing);
      socket.off('resetGame', handleResetGame);
      socket.off('tournamentCreated', handleTournamentCreated);
      socket.off('tournamentRoundStarting', handleTournamentRoundStarting);
      socket.off('tournamentRoundCompleted', handleTournamentRoundCompleted);
      socket.off('tournamentComplete', handleTournamentComplete);
      socket.off('tournamentCancelled', handleTournamentCancelled);
    };
  }, [socket, onShowResults, t, letterGrid, lastWordTime, comboLevel, wasInActiveGame, gameActive, gameLanguage]);

  const submitWord = useCallback(() => {
    if (!word.trim() || !gameActive) return;

    // Language validation - ONLY use game language (never UI language)
    // Game language is set when the game starts from the server
    const currentLang = gameLanguage; // Don't fallback to UI language!
    if (!currentLang) {
      // Game hasn't started yet, shouldn't happen
      return;
    }

    let regex;
    if (currentLang === 'he') {
      regex = /^[\u0590-\u05FF]+$/;
    } else if (currentLang === 'sv') {
      regex = /^[a-zA-ZåäöÅÄÖ]+$/;
    } else if (currentLang === 'ja') {
      regex = /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/;
    } else {
      regex = /^[a-zA-Z]+$/;
    }
    const trimmedWord = sanitizeInput(word, 20).trim();

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

      // Keep focus on input
      if (inputRef.current) {
        inputRef.current.focus();
      }
      return;
    }

    socket.emit('submitWord', {
      word: trimmedWord.toLowerCase(),
    });

    setFoundWords(prev => [...prev, { word: trimmedWord, isValid: null }]);
    setWord('');

    // Keep focus on input and prevent scroll
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.scrollIntoView({ behavior: 'instant', block: 'nearest' });


    }
  }, [word, gameActive, socket, t, gameLanguage]);

  const removeWord = (index) => {
    if (!gameActive) return;
    setFoundWords(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') submitWord();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const paddedSecs = secs < 10 ? `0${secs}` : secs;
    return `${mins}:${paddedSecs}`;
  };

  const handleExitRoom = (e) => {
    // Prevent any event bubbling that might interfere
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowExitConfirm(true);
  };

  const confirmExitRoom = () => {
    console.log('[PLAYER] Exit confirmed, closing connection');
    intentionalExitRef.current = true;

    // Emit explicit leave event BEFORE disconnecting
    try {
      if (socket && gameCode && username) {
        console.log('[PLAYER] Emitting leaveRoom event');
        socket.emit('leaveRoom', { gameCode, username });
      }
    } catch (error) {
      console.error('[PLAYER] Error emitting leaveRoom event:', error);
    }

    clearSession();

    // Safely disconnect socket after a brief delay to allow event to send
    setTimeout(() => {
      try {
        if (socket) {
          socket.disconnect();
        }
      } catch (error) {
        console.error('[PLAYER] Error disconnecting socket:', error);
      }

      // Force reload after disconnect
      window.location.reload();
    }, 200);
  };

  // Show waiting for results screen after game ends
  if (waitingForResults) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-3 sm:p-4 md:p-8 flex flex-col transition-colors duration-300">

        {/* Exit Button */}
        <div className="w-full max-w-md mx-auto flex justify-end mb-4 relative z-50">
          <Button
            type="button"
            onClick={handleExitRoom}
            size="sm"
            className="shadow-lg hover:scale-105 transition-transform bg-red-500 hover:bg-red-600 border border-red-400/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)] cursor-pointer"
          >
            <FaDoorOpen className="mr-2" />
            {t('playerView.exit')}
          </Button>
        </div>

        {/* Centered Content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-2xl w-full space-y-3 sm:space-y-4 md:space-y-6">
            {/* Waiting for Results Message */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-2xl border border-cyan-500/30 p-4 sm:p-6 md:p-8">
                <div className="mb-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="inline-block text-5xl mb-4"
                  >
                    ⏳
                  </motion.div>
                </div>
                <motion.h2
                  animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.8, 1, 0.8],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-purple-400 mb-2"
                >
                  {t('playerView.waitingForResults')}
                </motion.h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-4">
                  {t('playerView.hostValidating') || 'Host is validating words...'}
                </p>
              </Card>
            </motion.div>

            {/* Leaderboard */}
            {leaderboard.length > 0 && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-xl border border-purple-500/30 ">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-600 dark:text-purple-300 text-xl">
                      <FaTrophy className="text-yellow-500 dark:text-yellow-400" />
                      {t('playerView.leaderboard')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
                    {leaderboard.map((player, index) => {
                      const isMe = player.username === username;
                      return (
                      <motion.div
                        key={player.username}
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className={`flex items-center p-4 rounded-lg
                                ${index === 0 ? 'bg-gradient-to-r from-yellow-500/80 to-orange-500/80 text-white shadow-lg border border-yellow-400/50' :
                            index === 1 ? 'bg-gradient-to-r from-gray-400/80 to-gray-500/80 text-white shadow-md border border-gray-400/50' :
                              index === 2 ? 'bg-gradient-to-r from-orange-500/80 to-orange-600/80 text-white shadow-md border border-orange-400/50' :
                                'bg-slate-100 dark:bg-slate-700/50 text-slate-900 dark:text-white'}`}
                        style={player.avatar?.color && index > 2 ? {
                          background: `linear-gradient(to right, ${player.avatar.color}40, ${player.avatar.color}60)`,
                          justifyContent: dir === 'rtl' ? 'flex-end' : 'flex-start'
                        } : {
                          justifyContent: dir === 'rtl' ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''} flex-1`}>
                          <div className="text-2xl font-bold min-w-[40px] text-center">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                          </div>
                          {player.avatar?.emoji && (
                            <div className="text-2xl">
                              {player.avatar.emoji}
                            </div>
                          )}
                          <div className="flex-1">
                            <div className={`font-bold flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                              <SlotMachineText text={player.username} />
                              {isMe && (
                                <span className="text-xs bg-white/30 px-2 py-0.5 rounded-full">
                                  ({t('playerView.me')})
                                </span>
                              )}
                            </div>
                            <div className="text-sm opacity-75">{player.wordCount} {t('playerView.wordCount')}</div>
                          </div>
                          <div className="text-2xl font-bold">
                            {player.score}
                          </div>
                        </div>
                      </motion.div>
                    );
                    })}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Chat Section */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <RoomChat
                username={username}
                isHost={false}
                gameCode={gameCode}
                className="min-h-[300px]"
              />
            </motion.div>
          </div>
        </div>

        {/* Exit Confirmation Dialog */}
        <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
          <AlertDialogContent className="bg-white dark:bg-slate-800 border-red-500/30">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-slate-900 dark:text-white">
                {t('playerView.exitConfirmation')}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-600 dark:text-gray-300">
                {t('playerView.exitWarning')}
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
  }

  // Show waiting screen if game hasn't started yet
  if (!gameActive && !waitingForResults) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-3 sm:p-4 md:p-8 flex flex-col transition-colors duration-300">

        {/* Exit Button */}
        <div className="w-full max-w-md mx-auto flex justify-end mb-4 relative z-50">
          <Button
            type="button"
            onClick={handleExitRoom}
            size="sm"
            className="shadow-lg hover:scale-105 transition-transform bg-red-500 hover:bg-red-600 border border-red-400/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)] cursor-pointer"
          >
            <FaDoorOpen className="mr-2" />
            {t('playerView.exit')}
          </Button>
        </div>



        {/* Centered Waiting Content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md w-full space-y-3 sm:space-y-4 md:space-y-6">
            {/* Waiting Message */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="text-center"
            >
              <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-2xl border border-cyan-500/30 p-8">
                <motion.h2
                  animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.8, 1, 0.8],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-purple-400"
                >
                  {t('playerView.waitForGameStart')}
                </motion.h2>
              </Card>
            </motion.div>

            {/* Shuffling Letter Grid Preview */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              <Card className="bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.2)] overflow-hidden">
                <div className="p-4 flex flex-col items-center justify-center bg-slate-900/90">
                  {shufflingGrid ? (
                    <SlotMachineGrid
                      grid={shufflingGrid}
                      highlightedCells={highlightedCells}
                      language={gameLanguage || 'en'}
                      className="w-full max-w-xs"
                      animationDuration={600}
                      staggerDelay={40}
                      animationPattern="cascade"
                    />
                  ) : (
                    // Loading skeleton for the grid
                    <div className="w-full max-w-xs aspect-square grid grid-cols-4 gap-2 p-2">
                      {Array.from({ length: 16 }).map((_, i) => (
                        <motion.div
                          key={i}
                          className="aspect-square rounded-lg bg-slate-700/50"
                          animate={{
                            opacity: [0.3, 0.6, 0.3],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            delay: i * 0.05,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>

            {/* Players List */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)] p-4 sm:p-5 md:p-6">
                <h3 className="text-lg font-bold text-purple-600 dark:text-purple-300 mb-4 flex items-center gap-2 justify-center">
                  <FaUsers className="text-purple-500 dark:text-purple-400" />
                  {t('playerView.players')} ({playersReady.length})
                </h3>
                <div className="flex flex-col gap-2">
                  <AnimatePresence>
                    {playersReady.map((player, index) => {
                      // Handle both old format (string) and new format (object)
                      const playerUsername = typeof player === 'string' ? player : player.username;
                      const avatar = typeof player === 'object' ? player.avatar : null;
                      const isHost = typeof player === 'object' ? player.isHost : false;
                      const isMe = playerUsername === username;

                      return (
                        <motion.div
                          key={playerUsername}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Badge
                            className="bg-gradient-to-r from-purple-500 to-pink-500 font-bold text-white px-3 py-2 text-base w-full shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                            style={avatar?.color ? {
                              background: `linear-gradient(to right, ${avatar.color}, ${avatar.color}dd)`,
                              justifyContent: dir === 'rtl' ? 'flex-end' : 'flex-start'
                            } : {
                              justifyContent: dir === 'rtl' ? 'flex-end' : 'flex-start'
                            }}
                          >
                            <div className="flex items-center gap-2">
                              {avatar?.emoji && <span className="text-lg">{avatar.emoji}</span>}
                              {isHost && <FaCrown className="text-yellow-300" />}
                              <SlotMachineText text={playerUsername} />
                              {isMe && (
                                <span className="text-xs bg-white/30 px-2 py-0.5 rounded-full">
                                  ({t('playerView.me')})
                                </span>
                              )}
                            </div>
                          </Badge>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
                {playersReady.length === 0 && (
                  <p className="text-sm text-center text-slate-500 dark:text-gray-400 mt-2">
                    {t('hostView.waitingForPlayers')}
                  </p>
                )}
              </Card>
            </motion.div>

            {/* Share Game Section */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.1)] p-3 sm:p-4">
                <h3 className="text-sm font-bold text-teal-600 dark:text-teal-300 mb-3 text-center">
                  {t('playerView.inviteFriends') || 'Invite Friends'}
                </h3>
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
                    onClick={() => shareViaWhatsApp(gameCode, '', t)}
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
                <div className="mt-3 text-center">
                  <Badge className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-3 py-1">
                    {t('hostView.roomCode')}: {gameCode}
                  </Badge>
                </div>
              </Card>
            </motion.div>

            {/* Chat Section */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <RoomChat
                username={username}
                isHost={false}
                gameCode={gameCode}
                className="min-h-[300px]"
              />
            </motion.div>
          </div>
        </div>

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

        {/* Exit Confirmation Dialog */}
        <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
          <AlertDialogContent className="bg-white dark:bg-slate-800 border-red-500/30">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-slate-900 dark:text-white">
                {t('playerView.exitConfirmation')}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-600 dark:text-gray-300">
                {t('playerView.exitWarning')}
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
  }

  // Normal game UI (when game is active or waiting for results)
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-1 md:p-4 flex flex-col transition-colors duration-300">

      {/* GO Animation */}
      {showStartAnimation && (
        <GoRipplesAnimation onComplete={() => setShowStartAnimation(false)} />
      )}

      {/* Top Bar with Title and Exit Button */}
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between mb-1">
        <Button
          type="button"
          onClick={handleExitRoom}
          size="sm"
          className="shadow-lg hover:scale-105 transition-transform bg-red-500 hover:bg-red-600 border border-red-400/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)] cursor-pointer relative z-50"
        >
          <FaDoorOpen className="mr-2" />
          {t('playerView.exit')}
        </Button>
      </div>

      {/* Timer with Circular Progress */}
      {remainingTime !== null && gameActive && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex justify-center mb-1 md:mb-2 relative z-10"
        >
          <CircularTimer remainingTime={remainingTime} totalTime={180} />
        </motion.div>
      )}

      {/* Tournament Progress Banner */}
      {tournamentData && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="max-w-7xl mx-auto mb-2"
        >
          <Card className="bg-gradient-to-r from-purple-600/90 to-pink-600/90 dark:from-purple-700/90 dark:to-pink-700/90 backdrop-blur-md border border-purple-400/50 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
            <CardContent className="py-2 px-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FaTrophy className="text-yellow-300 text-xl drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                  <div>
                    <div className="text-white font-bold text-sm md:text-base">
                      {tournamentData.name || t('hostView.tournament')}
                    </div>
                    <div className="text-purple-100 text-xs md:text-sm">
                      {t('hostView.tournamentRound')} {tournamentData.currentRound || 1} / {tournamentData.totalRounds || 3}
                    </div>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border-white/30 text-xs md:text-sm">
                  {t('hostView.tournamentProgress')}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Achievements */}
      {achievements.length > 0 && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="max-w-7xl mx-auto mb-1"
        >
          <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-xl border border-purple-500/30">
            <CardHeader className="py-2">
              <CardTitle className="text-base md:text-xl flex items-center gap-2 text-purple-600 dark:text-purple-300">
                🏆 {t('playerView.yourAchievements')}
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <div className="flex flex-wrap gap-2">
                {achievements.map((ach, index) => (
                  <AchievementBadge key={index} achievement={ach} index={index} />
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* 3 Column Layout: Found Words | Grid | Ranking */}
      <div className="flex flex-col lg:flex-row gap-1 md:gap-2 max-w-7xl mx-auto flex-grow w-full overflow-hidden">
        {/* Left Column: Found Words (Hidden on mobile, shown on desktop) */}
        <div className="hidden lg:flex lg:flex-col lg:w-64 xl:w-80 gap-2">
          <Card className="bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-md border border-teal-500/40 shadow-[0_0_25px_rgba(20,184,166,0.2)] flex flex-col flex-grow overflow-hidden">
            <CardHeader className="py-3 border-b border-teal-500/30 bg-gradient-to-r from-teal-900/50 to-cyan-900/50">
              <CardTitle className="text-white text-base uppercase tracking-widest font-bold">
                {t('playerView.wordsFound')}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-3 bg-slate-900/90">
              <div className="space-y-2">
                <AnimatePresence>
                  {foundWords.map((foundWordObj, index) => {
                    const wordText = foundWordObj.word;
                    const isInvalid = foundWordObj.isValid === false;
                    const isLatest = index === foundWords.length - 1;
                    return (
                      <motion.div
                        key={index}
                        initial={{ x: -30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -30, opacity: 0 }}
                        className={`p-3 rounded-lg text-center font-bold transition-all
                          ${isInvalid
                            ? 'bg-gradient-to-r from-red-500/80 to-pink-500/80 border border-red-400/60 text-white shadow-lg shadow-red-500/30 line-through opacity-70'
                            : isLatest
                              ? 'bg-gradient-to-r from-cyan-500/80 to-teal-500/80 border border-cyan-400/60 text-white shadow-lg shadow-cyan-500/30'
                              : 'bg-slate-800/70 border border-slate-700/80 text-white hover:bg-slate-800/90'}`}
                      >
                        {applyHebrewFinalLetters(wordText).toUpperCase()}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {foundWords.length === 0 && gameActive && (
                  <p className="text-center text-slate-400 py-6 text-sm">
                    {t('playerView.noWordsYet') || 'No words found yet'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center Column: Letter Grid */}
        <div className="flex-1 flex flex-col gap-2 min-w-0 min-h-0">
          <Card className="bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.2)] flex flex-col flex-grow overflow-hidden">
            <CardContent className="flex-grow flex flex-col items-center justify-center p-1 md:p-2 bg-slate-900/90">
              {(letterGrid || shufflingGrid) ? (
                <>
                  <GridComponent
                    key={letterGrid ? 'game-grid' : 'waiting-grid'}
                    grid={letterGrid || shufflingGrid}
                    interactive={gameActive}
                    animateOnMount={!!letterGrid}
                    onWordSubmit={(formedWord) => {
                      // Direct submission logic - ONLY use game language
                      const currentLang = gameLanguage;
                      if (!currentLang) return; // Game hasn't started

                      let regex;
                      if (currentLang === 'he') {
                        regex = /^[\u0590-\u05FF]+$/;
                      } else if (currentLang === 'sv') {
                        regex = /^[a-zA-ZåäöÅÄÖ]+$/;
                      } else if (currentLang === 'ja') {
                        regex = /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/;
                      } else {
                        regex = /^[a-zA-Z]+$/;
                      }

                      if (formedWord.length < 2) {
                        toast.error(t('playerView.wordTooShort'), { duration: 1000, icon: '⚠️' });
                        return;
                      }

                      if (regex.test(formedWord)) {
                        socket.emit('submitWord', {
                          word: formedWord.toLowerCase(),
                        });
                        setFoundWords(prev => [...prev, { word: formedWord, isValid: null }]);
                      } else {
                        toast.error(t('playerView.onlyLanguageWords'), { duration: 1000 });
                      }
                      setWord(''); // Clear input
                    }}
                    playerView={true}
                    comboLevel={comboLevel}
                    className="w-full max-w-2xl"
                  />

                  {/* Shuffle Button - Only visible for host in waiting state */}
                  {!gameActive && (
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 border-slate-300 dark:border-slate-600"
                        disabled
                      >
                        <FaRandom className="mr-2" />
                        {t('playerView.shuffle') || 'SHUFFLE'}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                // Loading skeleton for the grid while waiting
                <div className="w-full max-w-2xl aspect-square grid grid-cols-4 gap-2 sm:gap-3 p-2 sm:p-4">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="aspect-square rounded-xl bg-slate-700/50"
                      animate={{
                        opacity: [0.3, 0.6, 0.3],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.05,
                      }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mobile: Word count display (input removed - use board to form words) */}
          <div className="lg:hidden">
            <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.1)]">
              <CardContent className="p-3">
                <div className="text-center text-lg text-teal-600 dark:text-teal-300 font-bold">
                  {foundWords.length} {t('playerView.wordsFound') || 'words found'}
                </div>
                <div className="text-center text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('playerView.swipeToFormWords') || 'Swipe on the board to form words'}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: Live Ranking */}
        <div className="lg:w-64 xl:w-80 flex flex-col gap-2">
          <Card className="bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-md border border-purple-500/40 shadow-[0_0_25px_rgba(168,85,247,0.2)] flex flex-col overflow-hidden max-h-[40vh] lg:max-h-none lg:flex-grow">
            <CardHeader className="py-3 border-b border-purple-500/30 bg-gradient-to-r from-purple-900/50 to-pink-900/50">
              <CardTitle className="flex items-center gap-2 text-white text-base uppercase tracking-widest font-bold">
                <FaTrophy className="text-yellow-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                {t('playerView.leaderboard')}
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto flex-1 p-3 bg-slate-900/90">
              <div className="space-y-2">
                {leaderboard.map((player, index) => {
                  const isMe = player.username === username;
                  return (
                  <motion.div
                    key={player.username}
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all hover:scale-[1.02]
                      ${index === 0 ? 'bg-gradient-to-r from-yellow-500/90 to-orange-500/90 text-white shadow-lg shadow-yellow-500/30 border border-yellow-400/60' :
                        index === 1 ? 'bg-gradient-to-r from-gray-400/90 to-gray-500/90 text-white shadow-md shadow-gray-500/20 border border-gray-400/60' :
                          index === 2 ? 'bg-gradient-to-r from-orange-500/90 to-orange-600/90 text-white shadow-md shadow-orange-500/20 border border-orange-400/60' :
                            'bg-slate-800/70 text-white border border-slate-700/80 hover:bg-slate-800/90'} ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
                    style={player.avatar?.color && index > 2 ? { background: `linear-gradient(to right, ${player.avatar.color}60, ${player.avatar.color}90)`, borderColor: `${player.avatar.color}80` } : {}}
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl bg-black/20 backdrop-blur-sm shadow-inner">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </div>
                    {player.avatar?.emoji && (
                      <div className="text-2xl">
                        {player.avatar.emoji}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold truncate text-base flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        <SlotMachineText text={player.username} />
                        {isMe && (
                          <span className="text-xs bg-white/30 px-2 py-0.5 rounded-full">
                            ({t('playerView.me')})
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold opacity-90">{player.score} pts</div>
                    </div>
                  </motion.div>
                );
                })}
                {leaderboard.length === 0 && (
                  <p className="text-center text-slate-400 py-6 text-sm">
                    {t('playerView.noPlayersYet') || 'No players yet'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chat Component - Desktop only */}
          <div className="hidden lg:block">
            <RoomChat
              username={username}
              isHost={false}
              gameCode={gameCode}
              className="max-h-[200px]"
            />
          </div>
        </div>
      </div>

      {/* Tournament Standings Modal */}
      <Dialog open={showTournamentStandings} onOpenChange={setShowTournamentStandings}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 border-purple-500/30">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400">
              {tournamentData?.status === 'completed' ? t('hostView.tournamentComplete') : t('hostView.tournamentStandings')}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <TournamentStandings
              standings={tournamentStandings}
              tournament={tournamentData}
              isComplete={tournamentData?.status === 'completed'}
            />
          </div>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={() => setShowTournamentStandings(false)}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]"
            >
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent className="bg-white dark:bg-slate-800 border-red-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white">
              {t('playerView.exitConfirmation')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-gray-300">
              {t('playerView.exitWarning')}
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
    </div >
  );
};

export default PlayerView;
