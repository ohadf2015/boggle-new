import React, { useState } from 'react';
import { TextField, Button, Typography, Paper, Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { motion } from 'framer-motion';
import { FaGamepad, FaCrown, FaUser } from 'react-icons/fa';
import './style/animation.scss';

const JoinView = ({ handleJoin, gameCode, username, setGameCode, setUsername }) => {
  const [mode, setMode] = useState('join'); // 'join' or 'host'

  const handleModeChange = (event, newMode) => {
    if (newMode !== null) {
      setMode(newMode);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleJoin(mode === 'host');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 3,
      }}
    >
      {/* Animated Title */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="animated-title"
        style={{ marginBottom: '40px' }}
      >
        <span className="text">Boggle</span>
      </motion.div>

      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <Paper
          elevation={12}
          sx={{
            padding: 4,
            minWidth: 400,
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Box sx={{ textAlign: 'center', marginBottom: 3 }}>
            <FaGamepad size={48} color="#667eea" />
            <Typography variant="h4" fontWeight="bold" sx={{ marginTop: 2, color: '#667eea' }}>
              Welcome to Boggle!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ marginTop: 1 }}>
              Choose your role to get started
            </Typography>
          </Box>

          {/* Mode Selection */}
          <Box sx={{ marginBottom: 3, display: 'flex', justifyContent: 'center' }}>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={handleModeChange}
              aria-label="game mode"
              fullWidth
            >
              <ToggleButton value="join" aria-label="join game">
                <FaUser style={{ marginRight: 8 }} />
                Join Game
              </ToggleButton>
              <ToggleButton value="host" aria-label="host game">
                <FaCrown style={{ marginRight: 8 }} />
                Host Game
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {mode === 'join' ? (
                <motion.div
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <TextField
                    fullWidth
                    label="Game Code"
                    variant="outlined"
                    value={gameCode}
                    onChange={(e) => setGameCode(e.target.value)}
                    required
                    placeholder="Enter 4-digit code"
                  />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <TextField
                    fullWidth
                    label="Game Code"
                    variant="outlined"
                    value={gameCode}
                    onChange={(e) => setGameCode(e.target.value)}
                    required
                    placeholder="Create 4-digit code"
                    helperText="Create a unique code for your game"
                  />
                </motion.div>
              )}

              <TextField
                fullWidth
                label="Username"
                variant="outlined"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter your name"
              />

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  type="submit"
                  disabled={!gameCode || !username}
                  sx={{
                    background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                    color: 'white',
                    padding: '12px',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #764ba2 30%, #667eea 90%)',
                    },
                  }}
                >
                  {mode === 'host' ? (
                    <>
                      <FaCrown style={{ marginRight: 8 }} />
                      Create Game
                    </>
                  ) : (
                    <>
                      <FaUser style={{ marginRight: 8 }} />
                      Join Game
                    </>
                  )}
                </Button>
              </motion.div>
            </Box>
          </form>

          <Box sx={{ marginTop: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              {mode === 'host'
                ? 'Host a game and share the code with friends!'
                : 'Enter the game code shared by your host'}
            </Typography>
          </Box>
        </Paper>
      </motion.div>

      {/* Floating particles effect */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          overflow: 'hidden',
          zIndex: 0,
        }}
      >
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              y: [null, Math.random() * window.innerHeight],
              x: [null, Math.random() * window.innerWidth],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
            style={{
              position: 'absolute',
              width: Math.random() * 10 + 5,
              height: Math.random() * 10 + 5,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.3)',
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

export default JoinView;
