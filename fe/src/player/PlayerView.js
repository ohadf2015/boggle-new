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
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import toast, { Toaster } from 'react-hot-toast';
import { FaTrophy, FaFire, FaStar } from 'react-icons/fa';
import '../style/animation.scss';
import { useWebSocket } from '../utils/WebSocketContext';

const PlayerView = () => {
  const ws = useWebSocket();
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

  // Timer countdown
  useEffect(() => {
    let timer;
    if (remainingTime !== null && remainingTime > 0 && gameActive) {
      timer = setInterval(() => {
        setRemainingTime((prevTime) => Math.max(prevTime - 1, 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [remainingTime, gameActive]);

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
          toast.success('המשחק התחיל! מצא כמה שיותר מילים!', {
            icon: '🎮',
            duration: 3000,
          });
          break;

        case 'endGame':
          setGameActive(false);
          setRemainingTime(null);
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

        case 'updateLeaderboard':
          setLeaderboard(message.leaderboard);
          break;

        case 'playerFoundWord':
          // Display blurred word notification
          const displayWord = message.word; // Already blurred by server
          const wordInfo = message.wordLength ? ` (${message.wordLength} אותיות)` : '';
          toast(`${message.username} מצא מילה: "${displayWord}"${wordInfo}`, {
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
          setFinalScores(validatedScores);
          setShowScores(true);

          // Store the letter grid for display in final scores
          if (validationGrid) {
            setLetterGrid(validationGrid);
          }

          // Set achievements and scores from validated results
          const myUsername = validatedScores.find(s => s.username)?.username; // Get current player's username
          const myScore = validatedScores.find(s => s.username === myUsername);
          if (myScore) {
            setScore(myScore.score);
            setAchievements(myScore.achievements || []);
          }

          toast.success('הציונים המאומתים הגיעו!', {
            icon: '✅',
            duration: 4000,
          });

          if (finalWinner) {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
            });
            toast(
              <div>
                <strong>🏆 המנצח: {finalWinner}</strong>
              </div>,
              {
                duration: 5000,
                style: {
                  background: '#4CAF50',
                  color: 'white',
                },
              }
            );
          }
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
  }, [word, gameActive, ws]);

  const removeWord = (index) => {
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
    // Single color for all tiles during gameplay
    return '#667eea';
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: { xs: 2, sm: 3 },
        overflow: 'auto',
      }}
    >
      <Toaster position="top-center" />

      {/* Final Scores Modal */}
      {finalScores && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: { xs: 2, sm: 3 },
          }}
        >
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <Paper
              elevation={24}
              sx={{
                padding: { xs: 2, sm: 4 },
                maxWidth: 600,
                width: '100%',
                maxHeight: '80vh',
                overflow: 'auto',
                borderRadius: 3,
              }}
            >
              <Typography
                variant="h3"
                align="center"
                gutterBottom
                sx={{
                  color: '#FFD700',
                  fontSize: { xs: '1.75rem', sm: '2.5rem' }
                }}
              >
                <FaTrophy /> תוצאות סופיות
              </Typography>

              {/* Game Board Display */}
              {letterGrid && (
                <Box sx={{ mb: 3, textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: '#667eea' }}>
                    לוח המשחק
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, minmax(30px, 1fr))',
                      gap: '4px',
                      maxWidth: '300px',
                      margin: '0 auto',
                    }}
                  >
                    {letterGrid.map((row, i) =>
                      row.map((cell, j) => (
                        <Box
                          key={`${i}-${j}`}
                          sx={{
                            aspectRatio: '1',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            fontSize: { xs: '0.9rem', sm: '1rem' },
                            fontWeight: 'bold',
                            background: '#667eea',
                            color: 'white',
                            borderRadius: '6px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          }}
                        >
                          {cell}
                        </Box>
                      ))
                    )}
                  </Box>
                </Box>
              )}

              {finalScores.map((player, index) => (
                <motion.div
                  key={player.username}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.2 }}
                >
                  <Paper
                    elevation={index === 0 ? 12 : 4}
                    sx={{
                      padding: 3,
                      marginBottom: 2,
                      background: index === 0
                        ? 'linear-gradient(45deg, #FFD700 30%, #FFA500 90%)'
                        : index === 1
                        ? 'linear-gradient(45deg, #C0C0C0 30%, #E8E8E8 90%)'
                        : index === 2
                        ? 'linear-gradient(45deg, #CD7F32 30%, #D4A76A 90%)'
                        : 'white',
                      color: index < 3 ? 'white' : 'inherit',
                      transform: index === 0 ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h5" fontWeight="bold">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`} {player.username}
                      </Typography>
                      <Typography variant="h4" fontWeight="bold">
                        {player.score}
                      </Typography>
                    </Box>

                    <Typography variant="body2" sx={{ mb: 1 }}>
                      מילים שנמצאו: {player.wordCount} {player.validWordCount !== undefined && `(${player.validWordCount} תקינות)`}
                    </Typography>

                    {player.longestWord && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        המילה הארוכה ביותר: <strong>{player.longestWord}</strong>
                      </Typography>
                    )}

                    {/* Word Visualization with colors and duplicate indicators */}
                    {player.allWords && player.allWords.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" fontWeight="bold" gutterBottom>
                          מילים:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {player.allWords.map((wordObj, i) => {
                            const isDuplicate = wordObj.isDuplicate;
                            const isValid = wordObj.validated;
                            const label = isDuplicate
                              ? `${wordObj.word} (כפול ❌)`
                              : `${wordObj.word} ${isValid ? `(${wordObj.score})` : '(✗)'}`;

                            return (
                              <Chip
                                key={i}
                                label={label}
                                size="small"
                                sx={{
                                  background: isDuplicate
                                    ? '#ff9800'
                                    : isValid
                                    ? ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'][i % 7]
                                    : '#9e9e9e',
                                  color: 'white',
                                  fontWeight: 'bold',
                                  opacity: isValid && !isDuplicate ? 1 : 0.7,
                                  textDecoration: isDuplicate ? 'line-through' : 'none',
                                }}
                              />
                            );
                          })}
                        </Box>
                      </Box>
                    )}

                    {player.achievements && player.achievements.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" fontWeight="bold" gutterBottom>
                          הישגים:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {player.achievements.map((ach, i) => (
                            <Chip
                              key={i}
                              label={`${ach.icon} ${ach.name}`}
                              size="small"
                              sx={{
                                background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                                color: 'white',
                                fontWeight: 'bold',
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Paper>
                </motion.div>
              ))}
            </Paper>
          </motion.div>
        </Box>
      )}

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
                <Chip
                  key={index}
                  label={`${ach.icon} ${ach.name}`}
                  sx={{
                    background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: { xs: '0.7rem', sm: '0.9rem' },
                  }}
                />
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
            padding: { xs: 2, sm: 3 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: { xs: '100%', sm: 'auto' }
          }}>
            <Typography
              variant="h6"
              gutterBottom
              fontWeight="bold"
              color="primary"
              sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
            >
              לוח האותיות
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(7, minmax(35px, 1fr))',
                  sm: 'repeat(7, 50px)',
                  md: 'repeat(7, 60px)',
                },
                gap: { xs: '6px', sm: '8px' },
                width: '100%',
                maxWidth: { xs: '100%', sm: '400px', md: '480px' },
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
                        fontSize: { xs: '1.2rem', sm: '1.5rem' },
                        fontWeight: 'bold',
                        background: getLetterColor(),
                        color: 'white',
                        borderRadius: { xs: '6px', sm: '8px' },
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

          <Box sx={{ marginBottom: 3 }}>
            <TextField
              fullWidth
              label="הזן מילה"
              variant="outlined"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!gameActive}
              autoFocus
              sx={{ marginBottom: 2 }}
            />
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={submitWord}
              disabled={!gameActive || !word.trim()}
              size="large"
            >
              הוסף מילה
            </Button>
          </Box>

          {!gameActive && (
            <Box sx={{ marginY: 2 }}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                ממתין להתחלת המשחק...
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
                    <IconButton edge="end" aria-label="delete" onClick={() => removeWord(index)}>
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
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Box sx={{ marginRight: 2, minWidth: 30 }}>
                      {getRankIcon(index) || `#${index + 1}`}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography fontWeight="bold">{player.username}</Typography>
                      <Typography variant="caption">
                        {player.wordCount} מילים
                      </Typography>
                    </Box>
                    <Typography variant="h6" fontWeight="bold">
                      {showScores ? player.score : player.wordCount}
                    </Typography>
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
