import React, { useState, useEffect } from 'react';
import {
  Typography,
  List,
  ListItem,
  Button,
  TextField,
  Paper,
  Box,
  Chip,
  LinearProgress,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import toast, { Toaster } from 'react-hot-toast';
import { FaTrophy, FaClock, FaUsers } from 'react-icons/fa';
import '../style/animation.scss';
import { generateRandomTable } from '../utils/utils';
import { useWebSocket } from '../utils/WebSocketContext';

const HostView = ({ gameCode, users }) => {
  const ws = useWebSocket();
  const [tableData, setTableData] = useState(generateRandomTable());
  const [timerValue, setTimerValue] = useState('');
  const [remainingTime, setRemainingTime] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [playersReady, setPlayersReady] = useState(users || []);
  const [showValidation, setShowValidation] = useState(false);
  const [playerWords, setPlayerWords] = useState([]);
  const [validations, setValidations] = useState({});
  const [finalScores, setFinalScores] = useState(null);

  // Handle WebSocket messages
  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event) => {
      const message = JSON.parse(event.data);
      const { action } = message;

      switch (action) {
        case 'updateUsers':
          setPlayersReady(message.users);
          break;

        case 'updateLeaderboard':
          setLeaderboard(message.leaderboard);
          break;

        case 'playerFoundWord':
          toast(`${message.username} מצא "${message.word}"!`, {
            icon: '🎯',
            duration: 2000,
          });
          break;

        case 'showValidation':
          setPlayerWords(message.playerWords);
          setShowValidation(true);
          // Initialize validations object
          const initialValidations = {};
          message.playerWords.forEach(player => {
            player.words.forEach(wordObj => {
              const key = `${player.username}-${wordObj.word}`;
              initialValidations[key] = true; // Default to valid
            });
          });
          setValidations(initialValidations);
          toast.success('סקור ואשר את כל המילים', {
            icon: '✅',
            duration: 5000,
          });
          break;

        case 'validationComplete':
          setFinalScores(message.scores);
          setShowValidation(false);
          toast.success('האימות הושלם!', {
            icon: '🎉',
            duration: 3000,
          });
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
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

  // Timer countdown
  useEffect(() => {
    let timer;
    if (remainingTime !== null && remainingTime > 0) {
      timer = setInterval(() => {
        setRemainingTime((prevTime) => Math.max(prevTime - 1, 0));
      }, 1000);
    } else if (gameStarted && remainingTime === 0) {
      console.log('Game Over!');
      ws.send(JSON.stringify({ action: 'endGame', gameCode }));
      clearInterval(timer);

      // Celebration
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
      });

      toast.success('Game Over! Check final scores', {
        icon: '🏁',
        duration: 5000,
      });

      setGameStarted(false);
    }

    return () => clearInterval(timer);
  }, [remainingTime, gameStarted, ws, gameCode]);

  const startGame = () => {
    const newTable = generateRandomTable();
    setTableData(newTable);
    const seconds = timerValue * 60;
    setRemainingTime(seconds);
    setGameStarted(true);

    // Send start game message with letter grid and timer
    ws.send(
      JSON.stringify({
        action: 'startGame',
        letterGrid: newTable,
        timerSeconds: seconds,
      })
    );

    toast.success('המשחק התחיל!', {
      icon: '🎮',
      duration: 3000,
    });
  };

  const stopGame = () => {
    ws.send(JSON.stringify({ action: 'endGame', gameCode }));
    setRemainingTime(null);
    setGameStarted(false);

    toast('Game Stopped', {
      icon: '⏹️',
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const submitValidation = () => {
    // Convert validations object to array for backend
    const validationArray = [];
    playerWords.forEach(player => {
      player.words.forEach(wordObj => {
        const key = `${player.username}-${wordObj.word}`;
        validationArray.push({
          username: player.username,
          word: wordObj.word,
          isValid: validations[key],
        });
      });
    });

    ws.send(JSON.stringify({
      action: 'validateWords',
      validations: validationArray,
    }));

    toast.loading('Validating words...', {
      duration: 2000,
    });
  };

  const toggleWordValidation = (username, word) => {
    const key = `${username}-${word}`;
    setValidations(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const getLetterColor = () => {
    // Single color for all tiles during gameplay
    return '#667eea';
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

      {/* Validation Modal */}
      {showValidation && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: { xs: 2, sm: 3 },
            overflow: 'auto',
          }}
        >
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            style={{ width: '100%', maxWidth: 900 }}
          >
            <Paper
              elevation={24}
              sx={{
                padding: { xs: 2, sm: 4 },
                maxHeight: '90vh',
                overflow: 'auto',
                borderRadius: 3,
              }}
            >
              <Typography
                variant="h4"
                align="center"
                gutterBottom
                sx={{
                  color: '#667eea',
                  fontWeight: 'bold',
                  fontSize: { xs: '1.5rem', sm: '2rem' }
                }}
              >
                ✅ אימות מילים
              </Typography>
              <Typography variant="body1" align="center" gutterBottom sx={{ mb: 3, color: 'text.secondary' }}>
                לחץ על מילים כדי לסמן אותן כלא תקינות (אדום). מילים ירוקות תקינות.
              </Typography>

              {playerWords.map((player, index) => (
                <motion.div
                  key={player.username}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Paper
                    elevation={4}
                    sx={{
                      padding: { xs: 2, sm: 3 },
                      marginBottom: 3,
                      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                    }}
                  >
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      gutterBottom
                      color="primary"
                      sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
                    >
                      {player.username} ({player.words.length} מילים)
                    </Typography>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {player.words.map((wordObj, wordIndex) => {
                        const key = `${player.username}-${wordObj.word}`;
                        const isValid = validations[key];
                        return (
                          <motion.div
                            key={wordIndex}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Chip
                              label={`${wordObj.word} (${wordObj.score}pts)`}
                              onClick={() => toggleWordValidation(player.username, wordObj.word)}
                              sx={{
                                background: isValid
                                  ? 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)'
                                  : 'linear-gradient(45deg, #f44336 30%, #e91e63 90%)',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: { xs: '0.8rem', sm: '1rem' },
                                padding: { xs: '16px 8px', sm: '20px 12px' },
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                  boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                                },
                              }}
                              icon={isValid ? <span>✓</span> : <span>✗</span>}
                            />
                          </motion.div>
                        );
                      })}
                    </Box>
                  </Paper>
                </motion.div>
              ))}

              <Box sx={{ display: 'flex', gap: 2, marginTop: 3 }}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={submitValidation}
                  sx={{
                    background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                    color: 'white',
                    padding: '12px',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                  }}
                >
                  שלח אימות
                </Button>
              </Box>
            </Paper>
          </motion.div>
        </Box>
      )}

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
                maxWidth: 700,
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
                      מילים: {player.wordCount} {player.validWordCount !== undefined && `(${player.validWordCount} תקינות)`}
                    </Typography>

                    {player.longestWord && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        הארוכה ביותר: <strong>{player.longestWord}</strong>
                      </Typography>
                    )}

                    {/* Word Visualization with colors */}
                    {player.allWords && player.allWords.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" fontWeight="bold" gutterBottom>
                          מילים:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {player.allWords.map((wordObj, i) => (
                            <Chip
                              key={i}
                              label={`${wordObj.word} ${wordObj.validated ? `(${wordObj.score})` : '(✗)'}`}
                              size="small"
                              sx={{
                                background: wordObj.validated
                                  ? ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'][i % 7]
                                  : '#9e9e9e',
                                color: 'white',
                                fontWeight: 'bold',
                                opacity: wordObj.validated ? 1 : 0.6,
                              }}
                            />
                          ))}
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

              <Button
                fullWidth
                variant="contained"
                onClick={() => setFinalScores(null)}
                sx={{ marginTop: 3 }}
              >
                סגור
              </Button>
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

      {/* Game Code Display */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        style={{ width: '100%', maxWidth: '600px', marginBottom: '24px' }}
      >
        <Paper
          elevation={6}
          sx={{
            padding: { xs: 1.5, sm: 2 },
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            color: 'white',
            textAlign: 'center',
          }}
        >
          <Typography
            variant="h4"
            fontWeight="bold"
            sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
          >
            קוד משחק: {gameCode}
          </Typography>
        </Paper>
      </motion.div>

      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', lg: 'row' },
        gap: 3,
        width: '100%',
        maxWidth: 1400,
        alignItems: 'stretch'
      }}>
        {/* Players Section */}
        <Paper elevation={6} sx={{ minWidth: { xs: '100%', sm: 250 }, padding: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
            <FaUsers style={{ marginRight: 8 }} />
            שחקנים ({playersReady.length})
          </Typography>
          <List>
            <AnimatePresence>
              {playersReady.map((user, index) => (
                <motion.div
                  key={user}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -50, opacity: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <ListItem
                    sx={{
                      backgroundColor: '#e3f2fd',
                      borderRadius: 1,
                      marginBottom: 1,
                    }}
                  >
                    <Chip label={user} color="primary" sx={{ fontWeight: 'bold' }} />
                  </ListItem>
                </motion.div>
              ))}
            </AnimatePresence>
          </List>
          {playersReady.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
              ממתין לשחקנים...
            </Typography>
          )}
        </Paper>

        {/* Game Board */}
        <Paper elevation={6} sx={{
          flex: 1,
          padding: { xs: 2, sm: 3 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          {/* Timer */}
          {remainingTime !== null && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring' }}
            >
              <Box
                sx={{
                  padding: { xs: 1.5, sm: 2 },
                  marginBottom: 3,
                  background:
                    remainingTime < 30
                      ? 'linear-gradient(45deg, #FF6B6B 30%, #FF8E53 90%)'
                      : 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)',
                  color: 'white',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <FaClock />
                <Typography
                  variant="h4"
                  fontWeight="bold"
                  sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
                >
                  {formatTime(remainingTime)}
                </Typography>
              </Box>
            </motion.div>
          )}

          {/* Letter Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(7, minmax(35px, 1fr))',
                sm: 'repeat(7, 60px)',
                md: 'repeat(7, 70px)',
              },
              gap: { xs: '6px', sm: '10px', md: '12px' },
              marginBottom: 3,
              width: '100%',
              maxWidth: { xs: '100%', sm: '500px', md: '580px' },
            }}
          >
            {tableData.map((row, i) =>
              row.map((cell, j) => (
                <motion.div
                  key={`${i}-${j}`}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 260,
                    damping: 20,
                    delay: (i * 7 + j) * 0.02,
                  }}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <Box
                    sx={{
                      width: '100%',
                      aspectRatio: '1',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      fontSize: { xs: '1.2rem', sm: '1.8rem', md: '2rem' },
                      fontWeight: 'bold',
                      background: getLetterColor(),
                      color: 'white',
                      borderRadius: { xs: '8px', sm: '10px', md: '12px' },
                      boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'scale(1.05)',
                        boxShadow: '0 6px 12px rgba(0,0,0,0.3)',
                      }
                    }}
                  >
                    {cell}
                  </Box>
                </motion.div>
              ))
            )}
          </Box>

          {/* Game Controls */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 200 }}>
            {!gameStarted ? (
              <>
                <TextField
                  label="טיימר (דקות)"
                  variant="outlined"
                  type="number"
                  value={timerValue}
                  onChange={(e) => setTimerValue(e.target.value)}
                  fullWidth
                />
                <Button
                  variant="contained"
                  color="success"
                  disabled={!timerValue || playersReady.length === 0}
                  onClick={startGame}
                  size="large"
                  fullWidth
                >
                  התחל משחק
                </Button>
                {playersReady.length === 0 && (
                  <Typography variant="caption" color="error" sx={{ textAlign: 'center' }}>
                    ממתין לשחקנים להצטרף...
                  </Typography>
                )}
              </>
            ) : (
              <Button
                variant="contained"
                color="error"
                onClick={stopGame}
                size="large"
                fullWidth
              >
                עצור משחק
              </Button>
            )}
          </Box>
        </Paper>

        {/* Live Leaderboard */}
        <Paper elevation={6} sx={{ minWidth: { xs: '100%', sm: 300 }, padding: { xs: 2, sm: 3 } }}>
          <Typography
            variant="h6"
            gutterBottom
            fontWeight="bold"
            color="primary"
            sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
          >
            <FaTrophy style={{ marginRight: 8, color: '#FFD700' }} />
            ציונים חיים
          </Typography>
          {gameStarted && leaderboard.length === 0 && (
            <Box sx={{ marginY: 2 }}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                ממתין למילים ראשונות...
              </Typography>
            </Box>
          )}
          <List>
            <AnimatePresence>
              {leaderboard.map((player, index) => (
                <motion.div
                  key={player.username}
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 50, opacity: 0 }}
                  transition={{ delay: index * 0.05 }}
                  layout
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
                          : '#f5f5f5',
                      borderRadius: 2,
                      marginBottom: 1,
                      color: index < 3 ? 'white' : 'inherit',
                      boxShadow: index < 3 ? '0 4px 8px rgba(0,0,0,0.3)' : 'none',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Typography variant="h6" sx={{ marginRight: 2, minWidth: 30 }}>
                        #{index + 1}
                      </Typography>
                      <Box sx={{ flex: 1 }}>
                        <Typography fontWeight="bold">{player.username}</Typography>
                        <Typography variant="caption">
                          {player.wordCount} מילים
                        </Typography>
                      </Box>
                      <Typography variant="h5" fontWeight="bold">
                        {player.score}
                      </Typography>
                    </Box>
                  </ListItem>
                </motion.div>
              ))}
            </AnimatePresence>
          </List>
          {!gameStarted && leaderboard.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
              הציונים יופיעו כאן במהלך המשחק
            </Typography>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default HostView;
