import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Button,
  TextField,
  List,
  ListItem,
  IconButton,
  Paper,
  Box,
  Chip,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import toast, { Toaster } from 'react-hot-toast';
import { FaTrophy, FaFire, FaStar } from 'react-icons/fa';
import '../style/animation.scss';
import { useWebSocket } from '../utils/WebSocketContext';

const PlayerView = ({ onShowResults }) => {
  const ws = useWebSocket();
  const inputRef = React.useRef(null);
  const [word, setWord] = useState('');
  const [foundWords, setFoundWords] = useState([]);
  const [score, setScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [gameActive, setGameActive] = useState(false);
  const [combo, setCombo] = useState(0);
  const [lastWordScore, setLastWordScore] = useState(0);
  const [achievements, setAchievements] = useState([]);
  const [letterGrid, setLetterGrid] = useState(null);
  const [finalScores, setFinalScores] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);
  const [showScores, setShowScores] = useState(false); // Only show after validation
  const [waitingForResults, setWaitingForResults] = useState(false);

  // Load game state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('boggle_player_state');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (state.foundWords) setFoundWords(state.foundWords);
        if (state.achievements) setAchievements(state.achievements);
      } catch (e) {
        console.error('Failed to load saved state:', e);
      }
    }
  }, []);

  // Save game state to localStorage whenever it changes
  useEffect(() => {
    if (foundWords.length > 0 || achievements.length > 0) {
      const state = {
        foundWords,
        achievements,
        timestamp: Date.now()
      };
      localStorage.setItem('boggle_player_state', JSON.stringify(state));
    }
  }, [foundWords, achievements]);

  // Clear saved state when game ends
  useEffect(() => {
    if (!gameActive && foundWords.length === 0) {
      localStorage.removeItem('boggle_player_state');
    }
  }, [gameActive, foundWords]);

  // Timer countdown - now synced from server, no local countdown needed

  // Handle WebSocket messages
  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event) => {
      const message = JSON.parse(event.data);
      const { action } = message;

      switch (action) {
        case 'startGame':
          setGameActive(true);
          setFoundWords([]);
          setScore(0);
          setCombo(0);
          setAchievements([]);
          setFinalScores(null);
          setShowScores(false);
          if (message.letterGrid) {
            setLetterGrid(message.letterGrid);
          }
          if (message.timerSeconds) {
            setRemainingTime(message.timerSeconds);
          }

          // Show different message for late joins
          if (message.isLateJoin) {
            toast.success('הצטרפת למשחק פעיל! בהצלחה!', {
              icon: '🚀',
              duration: 4000,
            });
          } else {
            toast.success('המשחק התחיל! מצא כמה שיותר מילים!', {
              icon: '🎮',
              duration: 3000,
            });
          }
          break;

        case 'endGame':
          setGameActive(false);
          setRemainingTime(null);
          setWaitingForResults(true); // Start showing loader
          toast('המשחק נגמר! ממתין לאימות המנהל', {
            icon: '🏁',
            duration: 4000,
          });
          break;

        case 'wordAccepted':
          const { word: acceptedWord } = message;
          setCombo(prev => prev + 1);

          // Simple confirmation without score
          toast.success(`המילה "${acceptedWord}" נוספה!`, {
            icon: '✓',
          });
          break;

        case 'wordAlreadyFound':
          toast.error('כבר מצאת את המילה הזו!', {
            icon: '❌',
          });
          break;

        case 'wordNotOnBoard':
          // Word doesn't exist on the board
          toast.error(message.message || 'המילה לא נמצאת על הלוח!', {
            icon: '🚫',
            duration: 3000,
          });
          // Remove the word from found words list
          setFoundWords(prev => prev.filter(w => w !== message.word));
          break;

        case 'timeUpdate':
          // Server-synced timer update
          setRemainingTime(message.remainingTime);
          break;

        case 'updateLeaderboard':
          setLeaderboard(message.leaderboard);
          break;

        case 'playerFoundWord':
          // Display psychological hint instead of actual word
          const hint = message.hint || '✨ מילה חדשה!';
          toast(`${message.username}: ${hint}`, {
            icon: '🔍',
            duration: 2500,
          });
          break;

        case 'liveAchievementUnlocked':
          // Show live achievement notification
          message.achievements.forEach(achievement => {
            toast.success(`🎉 הישג חדש: ${achievement.icon} ${achievement.name}!`, {
              duration: 4000,
              style: {
                background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                color: 'white',
                fontWeight: 'bold',
              },
            });
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.7 },
            });
          });
          // Add to achievements list
          setAchievements(prev => [...prev, ...message.achievements]);
          break;

        case 'validatedScores':
          const { scores: validatedScores, winner: finalWinner, letterGrid: validationGrid } = message;

          setWaitingForResults(false); // Hide loader

          toast.success('הציונים המאומתים הגיעו!', {
            icon: '✅',
            duration: 2000,
          });

          if (finalWinner) {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
            });
          }

          // Navigate to results page after a short delay
          setTimeout(() => {
            if (onShowResults) {
              onShowResults({
                scores: validatedScores,
                letterGrid: validationGrid,
              });
            }
          }, 2000);
          break;

        case 'hostLeftRoomClosing':
          // Host disconnected, room is closing
          setGameActive(false);
          setWaitingForResults(false);
          toast.error(message.message || 'המנחה עזב את החדר. החדר נסגר.', {
            icon: '🚪',
            duration: 5000,
          });

          // Clear local state and redirect after delay
          setTimeout(() => {
            setFoundWords([]);
            setScore(0);
            setAchievements([]);
            setLetterGrid(null);
            setFinalScores(null);
            localStorage.removeItem('boggle_player_state');
            // Could redirect to home or show a "room closed" message
          }, 2000);
          break;

        default:
          break;
      }
    };

    ws.onmessage = handleMessage;

    return () => {
      ws.onmessage = null;
    };
  }, [ws]);

  const submitWord = useCallback(() => {
    if (!word.trim() || !gameActive) return;

    // Send word immediately to server for real-time validation
    ws.send(
      JSON.stringify({
        action: 'submitWord',
        word: word.trim().toLowerCase(),
      })
    );

    setFoundWords(prev => [...prev, word.trim()]);
    setWord('');
    
    // Refocus the input after submit
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  }, [word, gameActive, ws]);

  const removeWord = (index) => {
    // Only allow removing words if the game is still active
    if (!gameActive) return;
    setFoundWords(prevWords => prevWords.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      submitWord();
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 0) return <FaTrophy style={{ color: '#FFD700' }} />;
    if (rank === 1) return <FaTrophy style={{ color: '#C0C0C0' }} />;
    if (rank === 2) return <FaTrophy style={{ color: '#CD7F32' }} />;
    return null;
  };

  const getLetterColor = () => {
    // Modern cyan/teal color for tiles
    return 'linear-gradient(135deg, #0EA5E9 0%, #14B8A6 100%)';
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExitRoom = () => {
    if (window.confirm('האם אתה בטוח שברצונך לצאת מהחדר?')) {
      // Close the WebSocket connection which will trigger cleanup
      ws.close();
      // Reload the page to reset the app state
      window.location.reload();
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0EA5E9 0%, #06B6D4 50%, #14B8A6 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: { xs: 2, sm: 3 },
        overflow: 'auto',
      }}
    >
      <Toaster position="top-center" />

      {/* Exit Button */}
      <Box sx={{ position: 'absolute', top: 20, right: 20 }}>
        <Button
          variant="contained"
          color="error"
          startIcon={<ExitToAppIcon />}
          onClick={handleExitRoom}
          sx={{
            fontWeight: 'bold',
          }}
        >
          יציאה מהחדר
        </Button>
      </Box>

      {/* Animated Title */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="animated-title"
        style={{ marginBottom: '20px' }}
      >
        <span className="text" style={{ fontSize: 'clamp(2rem, 8vw, 4rem)' }}>Boggle</span>
      </motion.div>

      {/* Timer Display */}
      {remainingTime !== null && gameActive && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          style={{ width: '100%', maxWidth: '400px' }}
        >
          <Paper
            elevation={6}
            sx={{
              padding: { xs: 2, sm: 3 },
              marginBottom: 3,
              background:
                remainingTime < 30
                  ? 'linear-gradient(45deg, #FF6B6B 30%, #FF8E53 90%)'
                  : 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)',
              color: 'white',
              textAlign: 'center',
            }}
          >
            <Typography
              variant="h3"
              fontWeight="bold"
              sx={{ fontSize: { xs: '2rem', sm: '3rem' } }}
            >
              {formatTime(remainingTime)}
            </Typography>
            <Typography variant="body2">זמן נותר</Typography>
          </Paper>
        </motion.div>
      )}

      {/* Score Display (Only after validation) */}
      {showScores && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          style={{ width: '100%', maxWidth: '400px' }}
        >
          <Paper
            elevation={6}
            sx={{
              padding: { xs: 2, sm: 3 },
              marginBottom: 3,
              background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
              color: 'white',
              textAlign: 'center',
            }}
          >
            <Typography
              variant="h3"
              fontWeight="bold"
              sx={{ fontSize: { xs: '2rem', sm: '3rem' } }}
            >
              {score}
            </Typography>
            <Typography variant="body2">נקודות</Typography>
          </Paper>
        </motion.div>
      )}

      {/* Achievements Bar (Show during game if unlocked live) */}
      {achievements.length > 0 && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{ marginBottom: 16, width: '100%', maxWidth: '800px' }}
        >
          <Paper elevation={6} sx={{ padding: { xs: 1.5, sm: 2 }, background: 'rgba(255, 255, 255, 0.95)' }}>
            <Typography
              variant="h6"
              gutterBottom
              fontWeight="bold"
              color="primary"
              sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
            >
              🏆 ההישגים שלך
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {achievements.map((ach, index) => (
                <Tooltip
                  key={index}
                  title={
                    <Box sx={{ p: 0.5 }}>
                      <Typography variant="body2" fontWeight="bold">
                        {ach.name}
                      </Typography>
                      <Typography variant="caption">
                        {ach.description}
                      </Typography>
                    </Box>
                  }
                  arrow
                  placement="top"
                >
                  <Chip
                    label={`${ach.icon} ${ach.name}`}
                    sx={{
                      background: '#f5f5f5',
                      border: '2px solid #4CAF50',
                      color: '#2E7D32',
                      fontWeight: '600',
                      fontSize: { xs: '0.7rem', sm: '0.9rem' },
                      cursor: 'help',
                      '&:hover': {
                        background: '#e8f5e9',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
                      },
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  />
                </Tooltip>
              ))}
            </Box>
          </Paper>
        </motion.div>
      )}

      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', lg: 'row' },
        gap: 3,
        width: '100%',
        maxWidth: 1400,
        alignItems: 'stretch'
      }}>
        {/* Letter Grid */}
        {letterGrid && (
          <Paper elevation={6} sx={{
            padding: { xs: 1, sm: 2, md: 3 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: { xs: '100%', sm: 'auto' },
            maxWidth: { xs: '100%', sm: 'fit-content' }
          }}>
            <Typography
              variant="h6"
              gutterBottom
              fontWeight="bold"
              color="primary"
              sx={{ fontSize: { xs: '0.9rem', sm: '1rem', md: '1.25rem' }, mb: { xs: 1, sm: 2 } }}
            >
              לוח האותיות
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: `repeat(${letterGrid[0]?.length || 7}, minmax(28px, 1fr))`,
                  sm: `repeat(${letterGrid[0]?.length || 7}, minmax(38px, 45px))`,
                  md: `repeat(${letterGrid[0]?.length || 7}, minmax(45px, 55px))`,
                },
                gap: { xs: '4px', sm: '6px', md: '8px' },
                width: '100%',
                maxWidth: { xs: '320px', sm: '400px', md: '500px' },
              }}
            >
              {letterGrid.map((row, i) =>
                row.map((cell, j) => (
                  <motion.div
                    key={`${i}-${j}`}
                    whileHover={{ scale: 1.1 }}
                  >
                    <Box
                      sx={{
                        width: '100%',
                        aspectRatio: '1',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        fontSize: { xs: '1rem', sm: '1.3rem', md: '1.5rem' },
                        fontWeight: 'bold',
                        background: getLetterColor(),
                        color: 'white',
                        borderRadius: { xs: '4px', sm: '6px', md: '8px' },
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'scale(1.05)',
                          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                        }
                      }}
                    >
                      {cell}
                    </Box>
                  </motion.div>
                ))
              )}
            </Box>
          </Paper>
        )}

        {/* Word Input and List */}
        <Paper elevation={6} sx={{
          flex: 1,
          padding: { xs: 2, sm: 3 },
          maxHeight: '70vh',
          overflow: 'auto',
          minWidth: { xs: '100%', sm: 300 }
        }}>
          <Typography
            variant="h5"
            gutterBottom
            fontWeight="bold"
            color="primary"
            sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
          >
            מילים שנמצאו ({foundWords.length})
          </Typography>

          <Box sx={{ marginBottom: 3, display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              label="הזן מילה"
              variant="outlined"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!gameActive}
              autoFocus
              inputRef={inputRef}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={submitWord}
              disabled={!gameActive || !word.trim()}
              size="large"
              sx={{ minWidth: '120px' }}
            >
              הוסף
            </Button>
          </Box>

          {!gameActive && !waitingForResults && (
            <Box sx={{ marginY: 2 }}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                ממתין להתחלת המשחק...
              </Typography>
            </Box>
          )}

          {waitingForResults && (
            <Box sx={{ marginY: 2 }}>
              <LinearProgress color="secondary" />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                ממתין לתוצאות המשחק...
              </Typography>
            </Box>
          )}

          <List>
            <AnimatePresence>
              {foundWords.map((foundWord, index) => (
                <motion.div
                  key={index}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 50, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ListItem
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      backgroundColor: index === foundWords.length - 1 ? '#e3f2fd' : 'transparent',
                      borderRadius: 1,
                      marginBottom: 1,
                    }}
                  >
                    <Typography fontWeight={index === foundWords.length - 1 ? 'bold' : 'normal'}>
                      {foundWord}
                    </Typography>
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => removeWord(index)}
                      disabled={!gameActive}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItem>
                </motion.div>
              ))}
            </AnimatePresence>
          </List>
        </Paper>

        {/* Live Leaderboard */}
        <Paper elevation={6} sx={{
          width: { xs: '100%', sm: 300 },
          padding: { xs: 2, sm: 3 }
        }}>
          <Typography
            variant="h5"
            gutterBottom
            fontWeight="bold"
            color="primary"
            sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
          >
            <FaTrophy style={{ marginRight: 8, color: '#FFD700' }} />
            טבלת המובילים
          </Typography>
          <List>
            {leaderboard.map((player, index) => (
              <motion.div
                key={player.username}
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <ListItem
                  sx={{
                    background:
                      index === 0
                        ? 'linear-gradient(45deg, #FFD700 30%, #FFA500 90%)'
                        : index === 1
                        ? 'linear-gradient(45deg, #C0C0C0 30%, #E8E8E8 90%)'
                        : index === 2
                        ? 'linear-gradient(45deg, #CD7F32 30%, #D4A76A 90%)'
                        : 'transparent',
                    borderRadius: 2,
                    marginBottom: 1,
                    color: index < 3 ? 'white' : 'inherit',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                    <Box sx={{ minWidth: { xs: 40, sm: 50 }, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {getRankIcon(index) ? (
                        <Box sx={{ fontSize: { xs: '1.8rem', sm: '2rem' } }}>
                          {getRankIcon(index)}
                        </Box>
                      ) : (
                        <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.8rem', sm: '2rem' } }}>
                          #{index + 1}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.1rem' } }}>
                        {player.username}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' } }}>
                        {player.wordCount} מילים
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" fontWeight="bold" sx={{ fontSize: { xs: '1.3rem', sm: '1.5rem' } }}>
                        {showScores ? player.score : player.wordCount}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '0.7rem', opacity: 0.8 }}>
                        {showScores ? 'נקודות' : 'מילים'}
                      </Typography>
                    </Box>
                  </Box>
                </ListItem>
              </motion.div>
            ))}
          </List>
          {leaderboard.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
              אין שחקנים עדיין
            </Typography>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default PlayerView;
