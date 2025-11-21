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
import { FaTrophy, FaTrash, FaDoorOpen, FaUsers } from 'react-icons/fa';
import { useWebSocket } from '../utils/WebSocketContext';
import { clearSession } from '../utils/session';
import gsap from 'gsap';
import GridComponent from '../components/GridComponent';

const PlayerView = ({ onShowResults }) => {
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

  const [playersReady, setPlayersReady] = useState([]);
  const [shufflingGrid, setShufflingGrid] = useState(null);


  // Pre-game shuffling animation
  useEffect(() => {
    if (gameActive) {
      setShufflingGrid(null);
      return;
    }

    const hebrewLetters = 'אבגדהוזחטיכלמנסעפצקרשת';
    const rows = 4;
    const cols = 4;

    const interval = setInterval(() => {
      const newGrid = Array(rows).fill(null).map(() =>
        Array(cols).fill(null).map(() =>
          hebrewLetters[Math.floor(Math.random() * hebrewLetters.length)]
        )
      );
      setShufflingGrid(newGrid);
    }, 2000); // Shuffle every 2 seconds

    return () => clearInterval(interval);
  }, [gameActive]);

  // Clear game state when entering
  useEffect(() => {
    localStorage.removeItem('boggle_player_state');
    setFoundWords([]);
    setAchievements([]);
  }, []);

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

  // Auto-focus on input when game becomes active
  useEffect(() => {
    if (gameActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [gameActive]);

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

          toast.success('המשחק התחיל! 🎮', {
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
          toast('המשחק נגמר! 🏁', { icon: '⏱️', duration: 4000 });
          break;

        case 'wordAccepted':
          gsap.fromTo(inputRef.current,
            { scale: 1.1, borderColor: '#4ade80' },
            { scale: 1, borderColor: '', duration: 0.3 }
          );
          toast.success(`✓ ${message.word}`, { duration: 2000 });
          break;

        case 'wordAlreadyFound':
          toast.error('כבר מצאת את המילה! ❌', { duration: 2000 });
          break;

        case 'wordNotOnBoard':
          toast.error('המילה לא על הלוח! 🚫', { duration: 3000 });
          setFoundWords(prev => prev.filter(w => w !== message.word));
          break;

        case 'timeUpdate':
          setRemainingTime(message.remainingTime);
          if (message.remainingTime === 0) {
            setGameActive(false);
          }
          break;

        case 'updateLeaderboard':
          setLeaderboard(message.leaderboard);
          break;

        case 'playerFoundWord':
          const hint = message.hint || '✨ מילה חדשה!';
          toast(`${message.username}: ${hint}`, {
            icon: '🔍',
            duration: 2500,
          });
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
          toast.success('הציונים מוכנים! ✅', { duration: 2000 });
          setTimeout(() => {
            if (onShowResults) {
              onShowResults({
                scores: message.scores,
                letterGrid: message.letterGrid,
              });
            }
          }, 2000);
          break;

        case 'hostLeftRoomClosing':
          clearSession();
          toast.error(message.message || 'החדר נסגר', {
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
          toast.success(message.message || 'מתחיל משחק חדש!', {
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
  }, [ws, onShowResults]);

  const submitWord = useCallback(() => {
    if (!word.trim() || !gameActive) return;

    // Hebrew-only validation (Hebrew Unicode range: \u0590-\u05FF)
    const hebrewRegex = /^[\u0590-\u05FF]+$/;
    const trimmedWord = word.trim();

    if (!hebrewRegex.test(trimmedWord)) {
      toast.error('רק מילים בעברית! 🚫', {
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
  }, [word, gameActive, ws]);

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
    if (window.confirm('לצאת מהחדר?')) {
      clearSession();
      ws.close();
      window.location.reload();
    }
  };

  // Show waiting screen if game hasn't started yet
  if (!gameActive && !waitingForResults) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 md:p-8 flex flex-col transition-colors duration-300">
        <Toaster position="top-center" />

        {/* Exit Button */}
        <div className="absolute top-4 right-4 z-50">
          <Button
            onClick={handleExitRoom}
            size="sm"
            className="shadow-lg hover:scale-105 transition-transform bg-red-500/80 hover:bg-red-500 border border-red-400/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]"
          >
            <FaDoorOpen className="mr-2" />
            יציאה
          </Button>
        </div>

        {/* Title */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8 mt-8"
        >
          <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-purple-400">
            BOGGLE
          </h1>
        </motion.div>

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
                  המתן לתחילת המשחק
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
                        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 font-bold text-white px-3 py-2 text-base w-full justify-center shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                          {user}
                        </Badge>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                {playersReady.length === 0 && (
                  <p className="text-sm text-center text-slate-500 dark:text-gray-400 mt-2">
                    ממתין לשחקנים...
                  </p>
                )}
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // Normal game UI (when game is active or waiting for results)
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 md:p-8 flex flex-col transition-colors duration-300">
      <Toaster position="top-center" />

      {/* Exit Button */}
      <div className="absolute top-4 right-4 z-50">
        <Button
          onClick={handleExitRoom}
          size="sm"
          className="shadow-lg hover:scale-105 transition-transform bg-red-500/80 hover:bg-red-500 border border-red-400/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]"
        >
          <FaDoorOpen className="mr-2" />
          יציאה
        </Button>
      </div>

      {/* Title - Only show when game is NOT active to save space */}
      {!gameActive && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-purple-400">
            BOGGLE
          </h1>
        </motion.div>
      )}

      {/* Timer */}
      {remainingTime !== null && gameActive && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="max-w-md mx-auto mb-6"
        >
          <Card className={`${remainingTime < 30
            ? 'bg-gradient-to-r from-red-500/80 to-orange-500/80 border-red-400/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
            : 'bg-gradient-to-r from-teal-500/80 to-cyan-500/80 border-teal-400/50 shadow-[0_0_20px_rgba(20,184,166,0.3)]'}
                          border backdrop-blur-md shadow-2xl`}>
            <CardContent className="p-6 text-center">
              <div className="text-5xl font-bold text-white">
                {formatTime(remainingTime)}
              </div>
              <div className="text-white/80 text-sm mt-2">זמן נותר</div>
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
                🏆 ההישגים שלך
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

      <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto h-full flex-grow">
        {/* Letter Grid - Takes maximum space */}
        {(letterGrid || shufflingGrid) && (
          <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-2xl flex-grow lg:flex-[2] border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)] flex flex-col">
            <CardHeader className="py-3">
              <CardTitle className="text-center text-cyan-600 dark:text-cyan-300">
                {gameActive ? 'לוח האותיות' : 'ממתין למשחק...'}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex items-center justify-center p-4">
              <GridComponent
                grid={letterGrid || shufflingGrid}
                interactive={gameActive}
                onWordSubmit={(formedWord) => {
                  // Direct submission logic to avoid state update delay issues
                  const hebrewRegex = /^[\u0590-\u05FF]+$/;
                  if (hebrewRegex.test(formedWord)) {
                    ws.send(JSON.stringify({
                      action: 'submitWord',
                      word: formedWord.toLowerCase(),
                    }));
                    setFoundWords(prev => [...prev, formedWord]);
                    toast.success(`נשלח: ${formedWord}`, { duration: 1000, icon: '📤' });
                  } else {
                    toast.error('רק מילים בעברית!', { duration: 1000 });
                  }
                  setWord(''); // Clear input
                }}

                className="w-full max-w-2xl"
              />
            </CardContent>
          </Card>
        )}

        {/* Right Column: Word Input, List & Leaderboard */}
        <div className="flex flex-col gap-4 lg:flex-1 lg:max-w-md">
          {/* Word Input & List */}
          <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-2xl border border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.1)] flex flex-col max-h-[50vh] lg:max-h-[60vh]">
            <CardHeader>
              <CardTitle className="text-teal-600 dark:text-teal-300">מילים שנמצאו ({foundWords.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-row-reverse">
                <Button
                  onClick={submitWord}
                  disabled={!gameActive || !word.trim()}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400
                         hover:to-pink-400 text-white font-bold shadow-lg hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                >
                  הוסף
                </Button>
                <Input
                  ref={inputRef}
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={!gameActive}
                  placeholder="הזן מילה..."
                  className="text-lg bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-gray-400 text-right"
                  autoFocus
                />
              </div>

              {!gameActive && !waitingForResults && (
                <div className="text-center py-4">
                  <Progress value={50} className="mb-2" />
                  <p className="text-sm text-slate-500 dark:text-gray-400">ממתין להתחלת המשחק...</p>
                </div>
              )}

              {waitingForResults && (
                <div className="text-center py-4">
                  <Progress value={75} className="mb-2" />
                  <p className="text-sm text-slate-500 dark:text-gray-400">ממתין לתוצאות...</p>
                </div>
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
                      <span>{foundWord}</span>
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
          <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-2xl border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)] flex-1 overflow-hidden flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-600 dark:text-purple-300">
                <FaTrophy className="text-yellow-500 dark:text-yellow-400" />
                טבלת המובילים
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto flex-1">
              <div className="space-y-3">
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
                        <div className="text-sm opacity-75">{player.wordCount} מילים</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold">
                      {player.score}
                    </div>
                  </motion.div>
                ))}
                {leaderboard.length === 0 && (
                  <p className="text-center text-slate-500 dark:text-gray-400 py-8">אין שחקנים עדיין</p>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div >
  );
};

export default PlayerView;
