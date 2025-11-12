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
          toast(`${message.username} found "${message.word}"! +${message.score}`, {
            icon: '🎯',
            duration: 2000,
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
    setRemainingTime(timerValue * 60);
    setGameStarted(true);

    // Send start game message with letter grid
    ws.send(
      JSON.stringify({
        action: 'startGame',
        letterGrid: newTable,
      })
    );

    toast.success('Game Started!', {
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

  const getLetterColor = (i, j) => {
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#FFA07A',
      '#98D8C8',
      '#F7DC6F',
      '#BB8FCE',
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
        padding: 3,
      }}
    >
      <Toaster position="top-center" />

      {/* Animated Title */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="animated-title"
        style={{ marginBottom: '20px' }}
      >
        <span className="text">Boggle</span>
      </motion.div>

      {/* Game Code Display */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <Paper
          elevation={6}
          sx={{
            padding: 2,
            marginBottom: 3,
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            color: 'white',
            textAlign: 'center',
          }}
        >
          <Typography variant="h4" fontWeight="bold">
            Game Code: {gameCode}
          </Typography>
        </Paper>
      </motion.div>

      <Box sx={{ display: 'flex', gap: 3, width: '100%', maxWidth: 1400, flexWrap: 'wrap' }}>
        {/* Players Section */}
        <Paper elevation={6} sx={{ minWidth: 250, padding: 3 }}>
          <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
            <FaUsers style={{ marginRight: 8 }} />
            Players ({playersReady.length})
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
              Waiting for players...
            </Typography>
          )}
        </Paper>

        {/* Game Board */}
        <Paper elevation={6} sx={{ flex: 1, padding: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Timer */}
          {remainingTime !== null && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring' }}
            >
              <Box
                sx={{
                  padding: 2,
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
                <Typography variant="h4" fontWeight="bold">
                  {formatTime(remainingTime)}
                </Typography>
              </Box>
            </motion.div>
          )}

          {/* Letter Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 70px)',
              gap: '12px',
              marginBottom: 3,
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
                      width: '70px',
                      height: '70px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      fontSize: '32px',
                      fontWeight: 'bold',
                      background: `linear-gradient(135deg, ${getLetterColor(i, j)} 0%, ${getLetterColor(i + 1, j + 1)} 100%)`,
                      color: 'white',
                      borderRadius: '12px',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
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
                  label="Timer (minutes)"
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
                  Start Game
                </Button>
                {playersReady.length === 0 && (
                  <Typography variant="caption" color="error" sx={{ textAlign: 'center' }}>
                    Waiting for players to join...
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
                Stop Game
              </Button>
            )}
          </Box>
        </Paper>

        {/* Live Leaderboard */}
        <Paper elevation={6} sx={{ minWidth: 300, padding: 3 }}>
          <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
            <FaTrophy style={{ marginRight: 8, color: '#FFD700' }} />
            Live Scores
          </Typography>
          {gameStarted && leaderboard.length === 0 && (
            <Box sx={{ marginY: 2 }}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                Waiting for first words...
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
                          {player.wordCount} words
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
              Scores will appear here during the game
            </Typography>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default HostView;
