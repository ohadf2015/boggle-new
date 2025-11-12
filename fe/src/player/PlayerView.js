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
          if (message.letterGrid) {
            setLetterGrid(message.letterGrid);
          }
          toast.success('Game Started! Find as many words as you can!', {
            icon: '🎮',
            duration: 3000,
          });
          break;

        case 'endGame':
          setGameActive(false);
          toast('Game Over! Check the final scores', {
            icon: '🏁',
            duration: 4000,
          });
          break;

        case 'wordAccepted':
          const { word: acceptedWord, score: wordScore, totalScore, achievements: playerAch } = message;
          setScore(totalScore);
          setCombo(prev => prev + 1);
          setLastWordScore(wordScore);
          if (playerAch) {
            setAchievements(playerAch);
          }

          // Celebration effects based on word score
          if (wordScore >= 5) {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.6 },
              colors: ['#FFD700', '#FFA500', '#FF6347'],
            });
            toast.success(`Amazing! +${wordScore} points!`, {
              icon: '🔥',
              style: {
                background: '#FFD700',
                color: '#000',
                fontWeight: 'bold',
              },
            });
          } else if (wordScore >= 3) {
            toast.success(`Great word! +${wordScore} points`, {
              icon: '⭐',
            });
          } else {
            toast.success(`+${wordScore} point${wordScore !== 1 ? 's' : ''}`, {
              icon: '✓',
            });
          }
          break;

        case 'wordAlreadyFound':
          toast.error('You already found this word!', {
            icon: '❌',
          });
          break;

        case 'updateLeaderboard':
          setLeaderboard(message.leaderboard);
          break;

        case 'playerFoundWord':
          if (message.score >= 5) {
            toast(`${message.username} found "${message.word}"!`, {
              icon: '👀',
              duration: 2000,
            });
          }
          break;

        case 'achievementUnlocked':
          if (message.achievements && message.achievements.length > 0) {
            message.achievements.forEach(ach => {
              toast(
                <div>
                  <strong>{ach.icon} {ach.name}</strong>
                  <br />
                  <small>{ach.description}</small>
                </div>,
                {
                  icon: '🎉',
                  duration: 4000,
                  style: {
                    background: 'linear-gradient(45deg, #FF6B6B 30%, #4ECDC4 90%)',
                    color: 'white',
                  },
                }
              );
            });
            confetti({
              particleCount: 30,
              spread: 50,
              origin: { y: 0.6 },
            });
          }
          break;

        case 'finalScores':
          const { scores, winner } = message;
          setFinalScores(scores);
          toast(
            <div>
              <strong>🏆 Winner: {winner}</strong>
              <br />
              Final Scores Available!
            </div>,
            {
              duration: 5000,
              style: {
                background: '#4CAF50',
                color: 'white',
              },
            }
          );
          if (winner) {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
            });
          }
          break;

        case 'validatedScores':
          const { scores: validatedScores, winner: finalWinner } = message;
          setFinalScores(validatedScores);
          toast.success('Final validated scores are in!', {
            icon: '✅',
            duration: 4000,
          });
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

  const getLetterColor = (i, j) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE',
    ];
    return colors[(i + j) % colors.length];
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
                <FaTrophy /> Final Results
              </Typography>

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
                      Words found: {player.wordCount} {player.validWordCount !== undefined && `(${player.validWordCount} valid)`}
                    </Typography>

                    {player.longestWord && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        Longest word: <strong>{player.longestWord}</strong>
                      </Typography>
                    )}

                    {player.achievements && player.achievements.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" fontWeight="bold" gutterBottom>
                          Achievements:
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

      {/* Score Display */}
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
          <Typography variant="body2">POINTS</Typography>
          {combo > 2 && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
              <FaFire style={{ color: '#FFD700', marginRight: 5 }} />
              <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                {combo}x COMBO!
              </Typography>
            </Box>
          )}
        </Paper>
      </motion.div>

      {/* Achievements Bar */}
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
              🏆 Your Achievements
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {achievements.map((ach, index) => (
                <Chip
                  key={index}
                  label={`${ach} ${ach}`}
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
              Letter Grid
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
                        background: `linear-gradient(135deg, ${getLetterColor(i, j)} 0%, ${getLetterColor(i + 1, j + 1)} 100%)`,
                        color: 'white',
                        borderRadius: { xs: '6px', sm: '8px' },
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
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
            Found Words ({foundWords.length})
          </Typography>

          <Box sx={{ marginBottom: 3 }}>
            <TextField
              fullWidth
              label="Enter word"
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
              Submit Word
            </Button>
          </Box>

          {!gameActive && (
            <Box sx={{ marginY: 2 }}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Waiting for game to start...
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
            Leaderboard
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
                        {player.wordCount} words
                      </Typography>
                    </Box>
                    <Typography variant="h6" fontWeight="bold">
                      {player.score}
                    </Typography>
                  </Box>
                </ListItem>
              </motion.div>
            ))}
          </List>
          {leaderboard.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
              No players yet
            </Typography>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default PlayerView;
