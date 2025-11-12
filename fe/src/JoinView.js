import React, { useState } from 'react';
import {
  TextField,
  Button,
  Typography,
  Paper,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  Divider,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { motion } from 'framer-motion';
import { FaGamepad, FaCrown, FaUser, FaDice, FaSync, FaQrcode } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import './style/animation.scss';

const JoinView = ({ handleJoin, gameCode, username, setGameCode, setUsername, error, activeRooms, refreshRooms }) => {
  const [mode, setMode] = useState('join'); // 'join' or 'host'
  const [showQR, setShowQR] = useState(false);
  const [usernameError, setUsernameError] = useState(false);

  const handleModeChange = (event, newMode) => {
    if (newMode !== null) {
      setMode(newMode);
      // Auto-generate code when switching to host mode
      if (newMode === 'host') {
        generateRoomCode();
      }
    }
  };

  const generateRoomCode = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGameCode(code);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Check if username is filled
    if (!username || !username.trim()) {
      setUsernameError(true);
      setTimeout(() => setUsernameError(false), 2000);
      return;
    }

    handleJoin(mode === 'host');
  };

  const handleRoomSelect = (roomCode) => {
    setGameCode(roomCode);
  };

  // Get the join URL for QR code
  const getJoinUrl = () => {
    return `${window.location.origin}?room=${gameCode}`;
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
        padding: { xs: 2, sm: 3 },
        overflow: 'auto',
      }}
    >
      {/* Animated Title */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="animated-title"
        style={{ marginBottom: '30px' }}
      >
        <span className="text" style={{ fontSize: 'clamp(2rem, 8vw, 4rem)' }}>Boggle</span>
      </motion.div>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 3,
          width: '100%',
          maxWidth: '1200px',
          alignItems: { xs: 'stretch', md: 'flex-start' },
        }}
      >
        {/* Active Rooms Panel */}
        {mode === 'join' && (
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            style={{ flex: 1, minWidth: 0 }}
          >
            <Paper
              elevation={8}
              sx={{
                padding: { xs: 2, sm: 3 },
                borderRadius: 4,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                height: '100%',
                maxHeight: { xs: '300px', md: '500px' },
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold" color="#667eea">
                  Active Rooms
                </Typography>
                <Tooltip title="Refresh">
                  <IconButton onClick={refreshRooms} size="small" sx={{ color: '#667eea' }}>
                    <FaSync />
                  </IconButton>
                </Tooltip>
              </Box>

              <Divider sx={{ mb: 2 }} />

              {activeRooms.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  <Typography variant="body2">No active rooms</Typography>
                  <Typography variant="caption">Create one to get started!</Typography>
                </Box>
              ) : (
                <List sx={{ overflow: 'auto', flex: 1 }}>
                  {activeRooms.map((room) => (
                    <ListItem key={room.gameCode} disablePadding sx={{ mb: 1 }}>
                      <ListItemButton
                        onClick={() => handleRoomSelect(room.gameCode)}
                        selected={gameCode === room.gameCode}
                        sx={{
                          borderRadius: 2,
                          '&.Mui-selected': {
                            backgroundColor: 'rgba(102, 126, 234, 0.1)',
                            '&:hover': {
                              backgroundColor: 'rgba(102, 126, 234, 0.2)',
                            },
                          },
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body1" fontWeight="bold">
                                {room.gameCode}
                              </Typography>
                              <Chip
                                label={`${room.playerCount} player${room.playerCount !== 1 ? 's' : ''}`}
                                size="small"
                                color="primary"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            </Box>
                          }
                          secondary="Waiting for players"
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </motion.div>
        )}

        {/* Main Join/Host Form */}
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          style={{ flex: 1, minWidth: 0 }}
        >
          <Paper
            elevation={12}
            sx={{
              padding: { xs: 3, sm: 4 },
              minWidth: { xs: '100%', sm: '400px' },
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Box sx={{ textAlign: 'center', marginBottom: 3 }}>
              <FaGamepad size={48} color="#667eea" />
              <Typography
                variant="h4"
                fontWeight="bold"
                sx={{
                  marginTop: 2,
                  color: '#667eea',
                  fontSize: { xs: '1.5rem', sm: '2rem' }
                }}
              >
                Welcome to Boggle!
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ marginTop: 1, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
              >
                Choose your role to get started
              </Typography>
            </Box>

            {/* Error Alert */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              </motion.div>
            )}

            {/* Mode Selection */}
            <Box sx={{ marginBottom: 3, display: 'flex', justifyContent: 'center' }}>
              <ToggleButtonGroup
                value={mode}
                exclusive
                onChange={handleModeChange}
                aria-label="game mode"
                fullWidth
                sx={{
                  '& .MuiToggleButton-root': {
                    fontSize: { xs: '0.8rem', sm: '0.875rem' },
                    padding: { xs: '8px', sm: '11px' },
                  },
                }}
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
                      inputProps={{
                        maxLength: 4,
                        pattern: '[0-9]*',
                        inputMode: 'numeric',
                      }}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        fullWidth
                        label="Game Code"
                        variant="outlined"
                        value={gameCode}
                        onChange={(e) => setGameCode(e.target.value)}
                        required
                        placeholder="4-digit code"
                        helperText="Auto-generated code (click dice to regenerate)"
                        inputProps={{
                          maxLength: 4,
                          pattern: '[0-9]*',
                          inputMode: 'numeric',
                        }}
                      />
                      <Tooltip title="Generate new code">
                        <IconButton
                          onClick={generateRoomCode}
                          sx={{
                            background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                            color: 'white',
                            '&:hover': {
                              background: 'linear-gradient(45deg, #764ba2 30%, #667eea 90%)',
                            },
                          }}
                        >
                          <FaDice />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </motion.div>
                )}

                <motion.div
                  animate={usernameError ? { x: [-10, 10, -10, 10, 0] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  <TextField
                    fullWidth
                    label="Username"
                    variant="outlined"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (usernameError) setUsernameError(false);
                    }}
                    required
                    error={usernameError}
                    helperText={usernameError ? "שם משתמש נדרש! אנא מלא את השדה" : ""}
                    placeholder="Enter your name"
                    inputProps={{
                      maxLength: 20,
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: usernameError ? 'rgba(255, 0, 0, 0.05)' : 'inherit',
                      },
                    }}
                  />
                </motion.div>

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
                      padding: { xs: '10px', sm: '12px' },
                      fontSize: { xs: '1rem', sm: '1.1rem' },
                      fontWeight: 'bold',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #764ba2 30%, #667eea 90%)',
                      },
                      '&:disabled': {
                        background: '#ccc',
                        color: '#999',
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

              {/* QR Code Button for Hosts */}
              {mode === 'host' && gameCode && (
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<FaQrcode />}
                    onClick={() => setShowQR(true)}
                    sx={{
                      borderColor: '#667eea',
                      color: '#667eea',
                      '&:hover': {
                        borderColor: '#764ba2',
                        backgroundColor: 'rgba(102, 126, 234, 0.04)',
                      },
                    }}
                  >
                    הצג קוד QR
                  </Button>
                </Box>
              )}
            </Box>
          </Paper>
        </motion.div>
      </Box>

      {/* QR Code Dialog */}
      <Dialog
        open={showQR}
        onClose={() => setShowQR(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', color: '#667eea' }}>
          <FaQrcode style={{ marginLeft: 8 }} />
          קוד QR להצטרפות
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
          <Box
            sx={{
              padding: 3,
              background: 'white',
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            <QRCodeSVG value={getJoinUrl()} size={250} level="H" includeMargin />
          </Box>
          <Typography variant="h4" fontWeight="bold" color="primary">
            {gameCode}
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            סרוק את הקוד כדי להצטרף למשחק או השתמש בקוד {gameCode}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button
            onClick={() => setShowQR(false)}
            variant="contained"
            sx={{
              background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
              color: 'white',
            }}
          >
            סגור
          </Button>
        </DialogActions>
      </Dialog>

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
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
            }}
            animate={{
              y: [null, Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000)],
              x: [null, Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000)],
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
