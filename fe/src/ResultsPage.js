import React from 'react';
import {
  Typography,
  Button,
  Paper,
  Box,
  Chip,
  Tooltip,
} from '@mui/material';
import { motion } from 'framer-motion';
import { FaTrophy } from 'react-icons/fa';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import './style/animation.scss';

const ResultsPage = ({ finalScores, letterGrid, gameCode, onReturnToRoom }) => {
  const handleExitRoom = () => {
    if (window.confirm('האם אתה בטוח שברצונך לצאת מהחדר?')) {
      window.location.reload();
    }
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

      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        style={{ width: '100%', maxWidth: 800 }}
      >
        <Paper
          elevation={24}
          sx={{
            padding: { xs: 2, sm: 4 },
            width: '100%',
            maxHeight: '85vh',
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

          {finalScores && finalScores.map((player, index) => (
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
                        <Tooltip
                          key={i}
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
                            size="small"
                            sx={{
                              background: '#f5f5f5',
                              border: '2px solid #4CAF50',
                              color: '#2E7D32',
                              fontWeight: '600',
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
                  </Box>
                )}
              </Paper>
            </motion.div>
          ))}

          {/* Return to Room Button */}
          {gameCode && onReturnToRoom && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                size="large"
                onClick={onReturnToRoom}
                sx={{
                  background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                  color: 'white',
                  fontWeight: 'bold',
                  padding: '12px 32px',
                  fontSize: '1.1rem',
                }}
              >
                חזור לחדר הפעיל
              </Button>
            </Box>
          )}
        </Paper>
      </motion.div>
    </Box>
  );
};

export default ResultsPage;
