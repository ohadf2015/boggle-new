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
import { FaTrophy, FaTrash, FaDoorOpen, FaUsers, FaMousePointer } from 'react-icons/fa';
import { useWebSocket } from '../utils/WebSocketContext';
import { clearSession } from '../utils/session';
import { useLanguage } from '../contexts/LanguageContext';
import gsap from 'gsap';
import GridComponent from '../components/GridComponent';
import { applyHebrewFinalLetters } from '../utils/utils';
import RoomChat from '../components/RoomChat';

const PlayerView = ({ onShowResults, initialPlayers = [], username, gameCode }) => {
  const { t } = useLanguage();
  const ws = useWebSocket();
  const inputRef = useRef(null);
  const wordListRef = useRef(null);

  const [word, setWord] = useState('');
  const [foundWords, setFoundWords] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [gameActive, setGameActive] = useState(false);
  const [achievements, setAchievements] = useState([]);
  const [letterGrid, setLetterGrid] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);
  const [waitingForResults, setWaitingForResults] = useState(false);

  const [playersReady, setPlayersReady] = useState(initialPlayers);
  const [shufflingGrid, setShufflingGrid] = useState(null);
  const [gameLanguage, setGameLanguage] = useState(null);


  // Pre-game shuffling animation
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
      const newGrid = Array(rows).fill(null).map(() =>
        Array(cols).fill(null).map(() =>
          letters[Math.floor(Math.random() * letters.length)]
        )
      );
      setShufflingGrid(newGrid);
    }, 2000); // Shuffle every 2 seconds

    return () => clearInterval(interval);
  }, [gameActive, gameLanguage]);

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
          break;

        case 'wordAlreadyFound':
          toast.error(t('playerView.wordAlreadyFound'), { duration: 2000 });
          break;

        case 'wordNotOnBoard':
          toast.error(t('playerView.wordNotOnBoard'), { duration: 3000 });
          setFoundWords(prev => prev.filter(w => w !== message.word));
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
          setWaitingForResults(false);
          toast.success(t('playerView.scoresReady'), { duration: 2000 });
          setTimeout(() => {
            if (onShowResults) {
              onShowResults({
                scores: message.scores,
                letterGrid: message.letterGrid,
              });
            }
          }, 2000);
          break;

        case 'finalScores':
          setWaitingForResults(false);
          toast.success(t('playerView.scoresReady'), { duration: 2000 });
          setTimeout(() => {
            if (onShowResults) {
              onShowResults({
                scores: message.scores,
                letterGrid: letterGrid,
              });
            }
          }, 2000);
          break;

        case 'hostLeftRoomClosing':
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

    // Store the original handler to chain them
    const originalHandler = ws.onmessage;

    const chainedHandler = (event) => {
      // First let PlayerView handle its messages
      handleMessage(event);

      // Then let the original App handler process any messages it needs
      if (originalHandler) {
        originalHandler(event);
      }
    };

    ws.onmessage = chainedHandler;

    return () => {
      // Restore the original handler when component unmounts
      ws.onmessage = originalHandler;
    };
  }, [ws, onShowResults, t]);

  const submitWord = useCallback(() => {
    if (!word.trim() || !gameActive) return;

    // Language validation - ONLY use game language (never UI language)
    // Game language is set when the game starts from the server
    const currentLang = gameLanguage; // Don't fallback to UI language!
    if (!currentLang) {
      // Game hasn't started yet, shouldn't happen
      return;
    }

    const regex = currentLang === 'he' ? /^[\u0590-\u05FF]+$/ : /^[a-zA-Z]+$/;
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
                    {playersReady.map((user, index) => (
                      <motion.div
                        key={user}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 font-bold text-white px-3 py-2 text-base w-full justify-center shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                          {user}
                        </Badge>
                      </motion.div>
                    ))}
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 md:p-8 flex flex-col transition-colors duration-300">
      <Toaster position="top-center" toastOptions={{ limit: 3 }} />

      {/* Top Bar with Exit Button */}
      <div className="w-full max-w-7xl mx-auto flex justify-end mb-4">
        <Button
          onClick={handleExitRoom}
          size="sm"
          className="shadow-lg hover:scale-105 transition-transform bg-red-500 hover:bg-red-600 border border-red-400/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]"
        >
          <FaDoorOpen className="mr-2" />
          {t('playerView.exit')}
        </Button>
      </div>



      {/* Timer */}
      {remainingTime !== null && gameActive && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="max-w-md mx-auto mb-4"
        >
          <Card className={`${remainingTime < 30
            ? 'bg-gradient-to-r from-red-500 to-orange-500 border-red-400/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
            : 'bg-gradient-to-r from-teal-500 to-cyan-500 border-teal-400/50 shadow-[0_0_20px_rgba(20,184,166,0.3)]'}
                          border backdrop-blur-md shadow-2xl`}
          >
            <CardContent className="p-4 text-center">
              <div className="text-4xl font-bold text-white">
                {formatTime(remainingTime)}
              </div>
              <div className="text-white/80 text-xs mt-1">{t('playerView.timeRemaining')}</div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Achievements */}
      {achievements.length > 0 && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="max-w-4xl mx-auto mb-6"
        >
          <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-xl border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2 text-purple-600 dark:text-purple-300">
                🏆 {t('playerView.yourAchievements')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {achievements.map((ach, index) => (
                  <AchievementBadge key={index} achievement={ach} index={index} />
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 max-w-7xl mx-auto h-full flex-grow">
        {/* Letter Grid - Takes maximum space */}
        {(letterGrid || shufflingGrid) && (
          <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-2xl flex-grow lg:flex-[3] border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)] flex flex-col">
            <CardHeader className="py-2">
              <CardTitle className="text-center text-cyan-600 dark:text-cyan-300 text-lg flex items-center justify-center gap-2">
                {gameActive ? (
                  <>
                    <FaMousePointer className="text-sm" />
                    {t('playerView.clickToSelect') || 'Click letters to select words'}
                  </>
                ) : (
                  t('playerView.waitingForGame')
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex items-center justify-center p-2">
              <GridComponent
                grid={letterGrid || shufflingGrid}
                interactive={gameActive}
                onWordSubmit={(formedWord) => {
                  // Direct submission logic - ONLY use game language
                  const currentLang = gameLanguage;
                  if (!currentLang) return; // Game hasn't started

                  const regex = currentLang === 'he' ? /^[\u0590-\u05FF]+$/ : /^[a-zA-Z]+$/;

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
                    toast.success(`${t('playerView.wordSubmitted')}: ${formedWord}`, { duration: 1000, icon: '📤' });
                  } else {
                    toast.error(t('playerView.onlyLanguageWords'), { duration: 1000 });
                  }
                  setWord(''); // Clear input
                }}
                playerView={true}
                className="w-full max-w-3xl"
              />
            </CardContent>
          </Card>
        )}

        {/* Right Column: Word Input, List & Leaderboard */}
        <div className="flex flex-col gap-3 lg:flex-1 lg:max-w-sm">
          {/* Word Input & List */}
          <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-2xl border border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.1)] flex flex-col max-h-[45vh] lg:max-h-[55vh]">
            <CardHeader className="py-2">
              <CardTitle className="text-teal-600 dark:text-teal-300 text-base">{t('playerView.wordsFound')} ({foundWords.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 flex-1 flex flex-col overflow-hidden">
              <div className="flex gap-2 flex-row-reverse">
                <Button
                  onClick={submitWord}
                  disabled={!gameActive || !word.trim()}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400
                         hover:to-pink-400 text-white font-bold shadow-lg hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                >
                  {t('playerView.add')}
                </Button>
                <Input
                  ref={inputRef}
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={!gameActive}
                  placeholder={t('playerView.enterWord')}
                  className="text-lg bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-gray-400 text-right"
                />
              </div>

              {!gameActive && !waitingForResults && (
                <div className="text-center py-4">
                  <Progress value={50} className="mb-2" />
                  <p className="text-sm text-slate-500 dark:text-gray-400">{t('playerView.waitingForGame')}</p>
                </div>
              )}

              {waitingForResults && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-6 px-4"
                >
                  <div className="mb-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="inline-block text-4xl mb-2"
                    >
                      ⏳
                    </motion.div>
                  </div>
                  <Progress value={75} className="mb-3" />
                  <p className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">
                    {t('playerView.waitingForResults')}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('playerView.hostValidating') || 'Host is validating words...'}
                  </p>
                </motion.div>
              )}

              <div ref={wordListRef} className="max-h-96 overflow-y-auto space-y-2">
                <AnimatePresence>
                  {foundWords.map((foundWord, index) => (
                    <motion.div
                      key={index}
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 50, opacity: 0 }}
                      className={`flex items-center justify-between p-3 rounded-lg
                              ${index === foundWords.length - 1 ?
                          'bg-gradient-to-r from-cyan-500/20 to-teal-500/20 font-bold border border-cyan-500/30' :
                          'bg-slate-100 dark:bg-slate-700/50'}
                              hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-900 dark:text-white`}
                    >
                      <span>{applyHebrewFinalLetters(foundWord)}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeWord(index)}
                        disabled={!gameActive}
                        className="hover:bg-red-500/20 hover:text-red-400 text-slate-400 dark:text-gray-400"
                      >
                        <FaTrash />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>



          {/* Leaderboard */}
          <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-2xl border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)] overflow-hidden flex flex-col max-h-[35vh]">
            <CardHeader className="py-2">
              <CardTitle className="flex items-center gap-2 text-purple-600 dark:text-purple-300 text-base">
                <FaTrophy className="text-yellow-500 dark:text-yellow-400" />
                {t('playerView.leaderboard')}
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto flex-1 py-2">
              <div className="space-y-2">
                {leaderboard.map((player, index) => (
                  <motion.div
                    key={player.username}
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center justify-between p-4 rounded-lg
                            ${index === 0 ? 'bg-gradient-to-r from-yellow-500/80 to-orange-500/80 text-white shadow-lg border border-yellow-400/50 shadow-[0_0_15px_rgba(234,179,8,0.3)]' :
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
                {leaderboard.length === 0 && (
                  <p className="text-center text-slate-500 dark:text-gray-400 py-8">{t('playerView.noPlayersYet')}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chat Component */}
          <RoomChat
            username={username}
            isHost={false}
            gameCode={gameCode}
            className="flex-1 min-h-[250px]"
          />

        </div>
      </div>
    </div >
  );
};

export default PlayerView;
