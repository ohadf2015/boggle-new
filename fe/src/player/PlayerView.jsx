import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { AchievementBadge } from '../components/AchievementBadge';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import toast, { Toaster } from 'react-hot-toast';
import { FaTrophy, FaTrash, FaDoorOpen } from 'react-icons/fa';
import { useWebSocket } from '../utils/WebSocketContext';
import { clearSession } from '../utils/session';
import gsap from 'gsap';

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

  // WebSocket message handler
  useEffect(() => {
    if (!ws) {
      return;
    }

    const handleMessage = (event) => {
      const message = JSON.parse(event.data);
      const { action } = message;

      switch (action) {
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

    ws.send(JSON.stringify({
      action: 'submitWord',
      word: word.trim().toLowerCase(),
    }));

    setFoundWords(prev => [...prev, word.trim()]);
    setWord('');

    setTimeout(() => inputRef.current?.focus(), 0);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-500 via-blue-500 to-teal-500 p-4 md:p-8">
      <Toaster position="top-center" />

      {/* Exit Button */}
      <div className="absolute top-4 right-4 z-50">
        <Button
          onClick={handleExitRoom}
          variant="destructive"
          size="sm"
          className="shadow-lg hover:scale-105 transition-transform"
        >
          <FaDoorOpen className="mr-2" />
          יציאה
        </Button>
      </div>

      {/* Title */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-8"
      >
        <h1 className="text-6xl md:text-8xl font-black text-white drop-shadow-2xl
                       bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300
                       bg-clip-text text-transparent animate-pulse">
          Boggle
        </h1>
      </motion.div>

      {/* Timer */}
      {remainingTime !== null && gameActive && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="max-w-md mx-auto mb-6"
        >
          <Card className={`${remainingTime < 30 ? 'bg-gradient-to-r from-red-500 to-orange-500' :
                                   'bg-gradient-to-r from-green-500 to-emerald-500'}
                          border-none shadow-2xl`}>
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
          <Card className="bg-white/95 backdrop-blur shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {/* Letter Grid */}
        {letterGrid && (
          <Card className="bg-white/95 backdrop-blur shadow-2xl lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-center">לוח האותיות</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`grid gap-2 mx-auto max-w-sm`}
                   style={{
                     gridTemplateColumns: `repeat(${letterGrid[0]?.length || 7}, minmax(0, 1fr))`
                   }}>
                {letterGrid.map((row, i) =>
                  row.map((cell, j) => (
                    <motion.div
                      key={`${i}-${j}`}
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: (i * row.length + j) * 0.02 }}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className="aspect-square flex items-center justify-center text-2xl font-bold
                               bg-gradient-to-br from-cyan-400 to-blue-500 text-white rounded-lg
                               shadow-lg hover:shadow-2xl transition-all cursor-pointer"
                    >
                      {cell}
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Word Input & List */}
        <Card className="bg-white/95 backdrop-blur shadow-2xl lg:col-span-1">
          <CardHeader>
            <CardTitle>מילים שנמצאו ({foundWords.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={submitWord}
                disabled={!gameActive || !word.trim()}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600
                         hover:to-pink-600 text-white font-bold shadow-lg"
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
                className="text-lg"
                autoFocus
              />
            </div>

            {!gameActive && !waitingForResults && (
              <div className="text-center py-4">
                <Progress value={50} className="mb-2" />
                <p className="text-sm text-gray-600">ממתין להתחלת המשחק...</p>
              </div>
            )}

            {waitingForResults && (
              <div className="text-center py-4">
                <Progress value={75} className="mb-2" />
                <p className="text-sm text-gray-600">ממתין לתוצאות...</p>
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
                                'bg-gradient-to-r from-blue-100 to-cyan-100 font-bold' :
                                'bg-gray-50'}
                              hover:bg-blue-50 transition-colors`}
                  >
                    <span>{foundWord}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeWord(index)}
                      disabled={!gameActive}
                      className="hover:bg-red-100 hover:text-red-600"
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
        <Card className="bg-white/95 backdrop-blur shadow-2xl lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaTrophy className="text-yellow-500" />
              טבלת המובילים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leaderboard.map((player, index) => (
                <motion.div
                  key={player.username}
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center justify-between p-4 rounded-lg
                            ${index === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg' :
                              index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800 shadow-md' :
                              index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-md' :
                              'bg-gray-100'}`}
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
                <p className="text-center text-gray-500 py-8">אין שחקנים עדיין</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlayerView;
