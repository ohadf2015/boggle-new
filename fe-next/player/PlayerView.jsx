import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { AchievementBadge } from '../components/AchievementBadge';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import toast, { Toaster } from 'react-hot-toast';
import { FaTrophy, FaTrash, FaDoorOpen, FaUsers, FaMousePointer, FaCrown, FaRandom } from 'react-icons/fa';
import { useWebSocket } from '../utils/WebSocketContext';
import { clearSession } from '../utils/session';
import { useLanguage } from '../contexts/LanguageContext';
import gsap from 'gsap';
import GridComponent from '../components/GridComponent';
import { applyHebrewFinalLetters } from '../utils/utils';
import RoomChat from '../components/RoomChat';
import CubeCrashAnimation from '../components/CubeCrashAnimation';
import CircularTimer from '../components/CircularTimer';

const PlayerView = ({ onShowResults, initialPlayers = [], username, gameCode }) => {
  const { t } = useLanguage();
  const ws = useWebSocket();
  const inputRef = useRef(null);
  const wordListRef = useRef(null);
  const intentionalExitRef = useRef(false);

  const [word, setWord] = useState('');
  const [foundWords, setFoundWords] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [gameActive, setGameActive] = useState(false);
  const [achievements, setAchievements] = useState([]);
  const [letterGrid, setLetterGrid] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);
  const [waitingForResults, setWaitingForResults] = useState(false);
  const [showStartAnimation, setShowStartAnimation] = useState(false);

  const [playersReady, setPlayersReady] = useState(initialPlayers);
  const [shufflingGrid, setShufflingGrid] = useState(null);
  const [gameLanguage, setGameLanguage] = useState(null);

  // Combo system state
  const [comboLevel, setComboLevel] = useState(0);
  const [lastWordTime, setLastWordTime] = useState(null);
  const comboTimeoutRef = useRef(null);


  // Pre-game shuffling animation with player names
  useEffect(() => {
    if (gameActive) {
      setShufflingGrid(null);
      return;
    }

    // Use game language if available (set when game starts), otherwise use Hebrew as default
    const currentLang = gameLanguage || 'he';
    const hebrewLetters = 'אבגדהוזחטיכלמנסעפצקרשת';
    const englishLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const letters = currentLang === 'he' ? hebrewLetters : englishLetters;
    const rows = 4;
    const cols = 4;

    const interval = setInterval(() => {
      // 30% chance to show a player name if players exist
      const showPlayerName = playersReady.length > 0 && Math.random() < 0.3;

      if (showPlayerName) {
        const randomPlayerEntry = playersReady[Math.floor(Math.random() * playersReady.length)];
        const randomPlayer = typeof randomPlayerEntry === 'string' ? randomPlayerEntry : randomPlayerEntry.username;

        // Simple embed function for player view
        const embedWordInGrid = (rows, cols, word) => {
          const grid = Array(rows).fill(null).map(() =>
            Array(cols).fill(null).map(() =>
              letters[Math.floor(Math.random() * letters.length)]
            )
          );

          // Try to place word horizontally in a random row
          const wordLength = Math.min(word.length, cols);
          const row = Math.floor(Math.random() * rows);
          const maxStartCol = cols - wordLength;
          const startCol = maxStartCol > 0 ? Math.floor(Math.random() * maxStartCol) : 0;

          for (let i = 0; i < wordLength; i++) {
            grid[row][startCol + i] = word[i];
          }

          return grid;
        };

        setShufflingGrid(embedWordInGrid(rows, cols, randomPlayer));
      } else {
        const newGrid = Array(rows).fill(null).map(() =>
          Array(cols).fill(null).map(() =>
            letters[Math.floor(Math.random() * letters.length)]
          )
        );
        setShufflingGrid(newGrid);
      }
    }, 2000); // Shuffle every 2 seconds

    return () => clearInterval(interval);
  }, [gameActive, gameLanguage, playersReady]);

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

  // WebSocket message handler
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

        case 'startGame':
          setGameActive(true);
          setFoundWords([]);
          setAchievements([]);
          if (message.letterGrid) setLetterGrid(message.letterGrid);
          if (message.timerSeconds) setRemainingTime(message.timerSeconds);
          if (message.language) setGameLanguage(message.language);
          setShowStartAnimation(true);

          toast.success(t('playerView.gameStarted'), {
            icon: '🚀',
            duration: 3000,
            style: {
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
            },
          });
          break;

        case 'endGame':
          setGameActive(false);
          setRemainingTime(0);
          setWaitingForResults(true);
          toast(t('playerView.gameOver'), { icon: '⏱️', duration: 4000 });
          break;

        case 'wordAccepted':
          gsap.fromTo(inputRef.current,
            { scale: 1.1, borderColor: '#4ade80' },
            { scale: 1, borderColor: '', duration: 0.3 }
          );
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
          break;

        case 'wordAlreadyFound':
          toast.error(t('playerView.wordAlreadyFound'), { duration: 2000 });
          // Reset combo on invalid word
          setComboLevel(0);
          setLastWordTime(null);
          if (comboTimeoutRef.current) {
            clearTimeout(comboTimeoutRef.current);
          }
          break;

        case 'wordNotOnBoard':
          toast.error(t('playerView.wordNotOnBoard'), { duration: 3000 });
          setFoundWords(prev => prev.filter(w => w !== message.word));
          // Reset combo on invalid word
          setComboLevel(0);
          setLastWordTime(null);
          if (comboTimeoutRef.current) {
            clearTimeout(comboTimeoutRef.current);
          }
          break;

        case 'timeUpdate':
          setRemainingTime(message.remainingTime);
          if (message.remainingTime === 0) {
            setGameActive(false);
            setWaitingForResults(true);
            toast(t('playerView.gameOver'), { icon: '⏱️', duration: 4000 });
          }
          break;

        case 'updateLeaderboard':
          setLeaderboard(message.leaderboard);
          break;

        case 'liveAchievementUnlocked':
          message.achievements.forEach(achievement => {
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
          setAchievements(prev => [...prev, ...message.achievements]);
          break;

        case 'validatedScores':
          // Show results immediately after host validation
          setWaitingForResults(false);
          toast.success(t('playerView.scoresReady'), { duration: 2000 });
          if (onShowResults) {
            onShowResults({
              scores: message.scores,
              letterGrid: message.letterGrid,
            });
          }
          break;

        case 'finalScores':
          // Delay showing results to ensure waiting screen is seen
          setTimeout(() => {
            setWaitingForResults(false);
            toast.success(t('playerView.scoresReady'), { duration: 2000 });
            if (onShowResults) {
              onShowResults({
                scores: message.scores,
                letterGrid: letterGrid,
              });
            }
          }, 10000);
          break;

        case 'hostLeftRoomClosing':
          intentionalExitRef.current = true;
          clearSession();
          toast.error(message.message || t('playerView.roomClosed'), {
            icon: '🚪',
            duration: 5000,
          });
          setTimeout(() => {
            ws.close();
            window.location.reload();
          }, 2000);
          break;

        case 'resetGame':
          // Reset player state for new game
          setGameActive(false);
          setFoundWords([]);
          setAchievements([]);
          setLeaderboard([]);
          setRemainingTime(null);
          setWaitingForResults(false);
          setLetterGrid(null);
          setPlayersReady([]);
          toast.success(message.message || t('playerView.startingNewGame'), {
            icon: '🔄',
            duration: 3000,
          });
          break;

        default:
          // Let other messages pass through to App-level handler
          break;
      }
    };

    ws.addEventListener('message', handleMessage);

    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [ws, onShowResults, t, letterGrid, lastWordTime]);

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

      // Keep focus on input
      if (inputRef.current) {
        inputRef.current.focus();
      }
      return;
    }

    ws.send(JSON.stringify({
      action: 'submitWord',
      word: trimmedWord.toLowerCase(),
    }));

    setFoundWords(prev => [...prev, trimmedWord]);
    setWord('');

    // Keep focus on input and prevent scroll
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.scrollIntoView({ behavior: 'instant', block: 'nearest' });


    }
  }, [word, gameActive, ws, t, gameLanguage]);

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

  const handleExitRoom = () => {
    if (window.confirm(t('playerView.exitConfirmation'))) {
      intentionalExitRef.current = true;
      clearSession();
      ws.close();
      window.location.reload();
    }
  };

  // Show waiting for results screen after game ends
  if (waitingForResults) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 md:p-8 flex flex-col transition-colors duration-300">
        <Toaster position="top-center" limit={3} />

        {/* Exit Button */}
        <div className="w-full max-w-md mx-auto flex justify-end mb-4 relative z-50">
          <Button
            onClick={handleExitRoom}
            size="sm"
            className="shadow-lg hover:scale-105 transition-transform bg-red-500 hover:bg-red-600 border border-red-400/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]"
          >
            <FaDoorOpen className="mr-2" />
            {t('playerView.exit')}
          </Button>
        </div>

        {/* Centered Content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-2xl w-full space-y-6">
            {/* Waiting for Results Message */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-2xl border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)] p-8">
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
                <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-xl border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-600 dark:text-purple-300 text-xl">
                      <FaTrophy className="text-yellow-500 dark:text-yellow-400" />
                      {t('playerView.leaderboard')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
                    {leaderboard.map((player, index) => (
                      <motion.div
                        key={player.username}
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className={`flex items-center justify-between p-4 rounded-lg
                                ${index === 0 ? 'bg-gradient-to-r from-yellow-500/80 to-orange-500/80 text-white shadow-lg border border-yellow-400/50' :
                            index === 1 ? 'bg-gradient-to-r from-gray-400/80 to-gray-500/80 text-white shadow-md border border-gray-400/50' :
                              index === 2 ? 'bg-gradient-to-r from-orange-500/80 to-orange-600/80 text-white shadow-md border border-orange-400/50' :
                                'bg-slate-100 dark:bg-slate-700/50 text-slate-900 dark:text-white'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl font-bold min-w-[40px] text-center">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                          </div>
                          <div>
                            <div className="font-bold">{player.username}</div>
                            <div className="text-sm opacity-75">{player.wordCount} {t('playerView.wordCount')}</div>
                          </div>
                        </div>
                        <div className="text-2xl font-bold">
                          {player.score}
                        </div>
                      </motion.div>
                    ))}
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
      </div>
    );
  }

  // Show waiting screen if game hasn't started yet
  if (!gameActive && !waitingForResults) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 md:p-8 flex flex-col transition-colors duration-300">
        <Toaster position="top-center" limit={3} />

        {/* Exit Button */}
        <div className="w-full max-w-md mx-auto flex justify-end mb-4 relative z-50">
          <Button
            onClick={handleExitRoom}
            size="sm"
            className="shadow-lg hover:scale-105 transition-transform bg-red-500 hover:bg-red-600 border border-red-400/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]"
          >
            <FaDoorOpen className="mr-2" />
            {t('playerView.exit')}
          </Button>
        </div>



        {/* Centered Waiting Content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md w-full space-y-6">
            {/* Waiting Message */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="text-center"
            >
              <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-2xl border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)] p-8">
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

            {/* Players List */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-xl border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)] p-6">
                <h3 className="text-lg font-bold text-purple-600 dark:text-purple-300 mb-4 flex items-center gap-2 justify-center">
                  <FaUsers className="text-purple-500 dark:text-purple-400" />
                  {t('playerView.players')} ({playersReady.length})
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
                            className="bg-gradient-to-r from-purple-500 to-pink-500 font-bold text-white px-3 py-2 text-base w-full justify-center shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                            style={avatar?.color ? { background: `linear-gradient(to right, ${avatar.color}, ${avatar.color}dd)` } : {}}
                          >
                            <div className="flex items-center gap-2">
                              {avatar?.emoji && <span className="text-lg">{avatar.emoji}</span>}
                              {isHost && <FaCrown className="text-yellow-300" />}
                              <span>{username}</span>
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
      </div>
    );
  }

  // Normal game UI (when game is active or waiting for results)
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-2 md:p-4 flex flex-col transition-colors duration-300">
      <Toaster position="top-center" toastOptions={{ limit: 3 }} />

      {/* Start Game Animation */}
      {showStartAnimation && (
        <CubeCrashAnimation onComplete={() => setShowStartAnimation(false)} />
      )}

      {/* Top Bar with Title and Exit Button */}
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between mb-2">
        {/* LEXICLASH Title */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl md:text-5xl font-bold tracking-wider flex items-center gap-1"
          style={{ fontFamily: "'Outfit', 'Rubik', sans-serif" }}
        >
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
            LEXI
          </span>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)] italic" style={{ transform: 'skewX(-10deg)' }}>
            CLASH
          </span>
        </motion.h1>

        <Button
          onClick={handleExitRoom}
          size="sm"
          className="shadow-lg hover:scale-105 transition-transform bg-red-500 hover:bg-red-600 border border-red-400/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]"
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
          className="flex justify-center mb-4 relative z-10"
        >
          <CircularTimer remainingTime={remainingTime} totalTime={180} />
        </motion.div>
      )}

      {/* Achievements */}
      {achievements.length > 0 && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="max-w-7xl mx-auto mb-2"
        >
          <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-xl border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
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
      <div className="flex flex-col lg:flex-row gap-2 md:gap-4 max-w-7xl mx-auto flex-grow w-full overflow-hidden">
        {/* Left Column: Found Words (Hidden on mobile, shown on desktop) */}
        <div className="hidden lg:flex lg:flex-col lg:w-64 xl:w-80 gap-2">
          <Card className="bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl border border-teal-500/40 shadow-[0_0_25px_rgba(20,184,166,0.2)] flex flex-col flex-grow overflow-hidden">
            <CardHeader className="py-3 border-b border-teal-500/30 bg-gradient-to-r from-teal-900/50 to-cyan-900/50">
              <CardTitle className="text-white text-base uppercase tracking-widest font-bold">
                FOUND WORDS
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-3 bg-slate-900/90">
              <div className="space-y-2">
                <AnimatePresence>
                  {foundWords.map((foundWord, index) => (
                    <motion.div
                      key={index}
                      initial={{ x: -30, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -30, opacity: 0 }}
                      className={`p-3 rounded-lg text-center font-bold transition-all
                        ${index === foundWords.length - 1 ?
                          'bg-gradient-to-r from-cyan-500/80 to-teal-500/80 border border-cyan-400/60 text-white shadow-lg shadow-cyan-500/30' :
                          'bg-slate-800/70 border border-slate-700/80 text-white hover:bg-slate-800/90'}`}
                    >
                      {applyHebrewFinalLetters(foundWord).toUpperCase()}
                    </motion.div>
                  ))}
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
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          {(letterGrid || shufflingGrid) && (
            <Card className="bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl border border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.2)] flex flex-col flex-grow overflow-hidden">
              <CardContent className="flex-grow flex flex-col items-center justify-center p-2 md:p-4 bg-slate-900/90">
                <GridComponent
                  grid={letterGrid || shufflingGrid}
                  interactive={gameActive}
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
                      ws.send(JSON.stringify({
                        action: 'submitWord',
                        word: formedWord.toLowerCase(),
                      }));
                      setFoundWords(prev => [...prev, formedWord]);
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
              </CardContent>
            </Card>
          )}

          {/* Mobile: Word Input below grid */}
          <div className="lg:hidden">
            <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-xl border border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.1)]">
              <CardContent className="p-2">
                <Input
                  ref={inputRef}
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={!gameActive}
                  placeholder={t('playerView.enterWord')}
                  className="text-lg bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-gray-400 text-center"
                />
                <div className="mt-2 text-center text-sm text-teal-600 dark:text-teal-300 font-semibold">
                  {foundWords.length} {t('playerView.wordsFound') || 'words found'}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: Live Ranking */}
        <div className="lg:w-64 xl:w-80 flex flex-col gap-2">
          <Card className="bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl border border-purple-500/40 shadow-[0_0_25px_rgba(168,85,247,0.2)] flex flex-col overflow-hidden max-h-[40vh] lg:max-h-none lg:flex-grow">
            <CardHeader className="py-3 border-b border-purple-500/30 bg-gradient-to-r from-purple-900/50 to-pink-900/50">
              <CardTitle className="flex items-center gap-2 text-white text-base uppercase tracking-widest font-bold">
                <FaTrophy className="text-yellow-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                LIVE RANKING
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto flex-1 p-3 bg-slate-900/90">
              <div className="space-y-2">
                {leaderboard.map((player, index) => (
                  <motion.div
                    key={player.username}
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all hover:scale-[1.02]
                      ${index === 0 ? 'bg-gradient-to-r from-yellow-500/90 to-orange-500/90 text-white shadow-lg shadow-yellow-500/30 border border-yellow-400/60' :
                        index === 1 ? 'bg-gradient-to-r from-gray-400/90 to-gray-500/90 text-white shadow-md shadow-gray-500/20 border border-gray-400/60' :
                          index === 2 ? 'bg-gradient-to-r from-orange-500/90 to-orange-600/90 text-white shadow-md shadow-orange-500/20 border border-orange-400/60' :
                            'bg-slate-800/70 text-white border border-slate-700/80 hover:bg-slate-800/90'}`}
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl bg-black/20 backdrop-blur-sm shadow-inner">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate text-base">{player.username}</div>
                      <div className="text-sm font-semibold opacity-90">{player.score} pts</div>
                    </div>
                  </motion.div>
                ))}
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
    </div >
  );
};

export default PlayerView;
