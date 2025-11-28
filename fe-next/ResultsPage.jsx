import React, { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaTrophy, FaSignOutAlt, FaStar } from 'react-icons/fa';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import GridComponent from './components/GridComponent';
import confetti from 'canvas-confetti';
import { useLanguage } from './contexts/LanguageContext';
import ResultsPlayerCard from './components/results/ResultsPlayerCard';
import ResultsWinnerBanner from './components/results/ResultsWinnerBanner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './components/ui/alert-dialog';
import { clearSession } from './utils/session';

// Helper functions for finding word paths on the board (client-side version)
const normalizeHebrewLetter = (letter) => {
  const finalToRegular = { 'ץ': 'צ', 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ' };
  return finalToRegular[letter] || letter;
};

const searchWordPath = (board, word, row, col, index, visited, path) => {
  if (index === word.length) return [...path];
  if (row < 0 || row >= board.length || col < 0 || col >= board[0].length) return null;

  const cellKey = `${row},${col}`;
  if (visited.has(cellKey)) return null;

  const cellNormalized = normalizeHebrewLetter(board[row][col].toLowerCase());
  if (cellNormalized !== word[index]) return null;

  visited.add(cellKey);
  path.push({ row, col });

  const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  for (const [dx, dy] of directions) {
    const result = searchWordPath(board, word, row + dx, col + dy, index + 1, visited, path);
    if (result) {
      visited.delete(cellKey);
      return result;
    }
  }

  visited.delete(cellKey);
  path.pop();
  return null;
};

const getWordPath = (word, board) => {
  if (!word || !board || board.length === 0) return null;
  const wordNormalized = word.toLowerCase().split('').map(normalizeHebrewLetter).join('');
  const firstChar = wordNormalized[0];

  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board[0].length; j++) {
      if (normalizeHebrewLetter(board[i][j].toLowerCase()) === firstChar) {
        const path = searchWordPath(board, wordNormalized, i, j, 0, new Set(), []);
        if (path) return path;
      }
    }
  }
  return null;
};

const LetterGrid = ({ letterGrid, heatMapData }) => {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="w-full"
    >
      <div className="w-full max-w-[500px] mx-auto p-2 sm:p-3 rounded-xl bg-gradient-to-br from-slate-800/40 to-slate-900/40 dark:from-slate-800/40 dark:to-slate-900/40 border-2 border-cyan-500/50 shadow-[0_4px_24px_rgba(6,182,212,0.3)] relative overflow-hidden">
        {/* Glass glare effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />
        <GridComponent
          grid={letterGrid}
          interactive={false}
          className="w-full relative z-10"
          heatMapData={heatMapData}
        />
      </div>
    </motion.div>
  );
};

const ResultsPage = ({ finalScores, letterGrid, gameCode, onReturnToRoom, username }) => {
  const { t } = useLanguage();
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const handleExitRoom = () => {
    setShowExitConfirm(true);
  };

  const confirmExitRoom = () => {
    // Clear session before reloading to prevent auto-redirect
    clearSession();
    window.location.reload();
  };

  const sortedScores = useMemo(() => {
    return finalScores ? [...finalScores].sort((a, b) => b.score - a.score) : [];
  }, [finalScores]);

  // Create a map of all player words for duplicate detection
  const allPlayerWords = useMemo(() => {
    const wordMap = {};
    if (finalScores) {
      finalScores.forEach(player => {
        wordMap[player.username] = player.allWords || [];
      });
    }
    return wordMap;
  }, [finalScores]);

  // Calculate heat map data from all valid words found
  const heatMapData = useMemo(() => {
    if (!finalScores || !letterGrid) return null;

    const cellUsageCounts = {};
    let maxCount = 0;

    // Collect all unique valid words from all players
    const processedWords = new Set();
    finalScores.forEach(player => {
      const words = player.allWords || [];
      words.forEach(wordObj => {
        // Only count validated words that scored points (not duplicates)
        if (wordObj.validated && wordObj.score > 0 && !processedWords.has(wordObj.word)) {
          processedWords.add(wordObj.word);
          const path = getWordPath(wordObj.word, letterGrid);
          if (path) {
            path.forEach(({ row, col }) => {
              const key = `${row},${col}`;
              cellUsageCounts[key] = (cellUsageCounts[key] || 0) + 1;
              maxCount = Math.max(maxCount, cellUsageCounts[key]);
            });
          }
        }
      });
    });

    return { cellUsageCounts, maxCount };
  }, [finalScores, letterGrid]);

  const winner = sortedScores[0];

  // Celebration effect when results load
  useEffect(() => {
    if (winner) {
      // Single celebratory confetti burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [winner]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col overflow-auto transition-colors duration-300 px-1 py-3 sm:px-4 sm:py-4 md:p-8">
      {/* Top Bar with Exit Button */}
      <div className="w-full max-w-4xl mx-auto flex justify-end mb-4">
        <Button
          onClick={handleExitRoom}
          size="sm"
          className="shadow-lg hover:scale-105 transition-transform bg-red-500 hover:bg-red-600 border border-red-400/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]"
        >
          <FaSignOutAlt className="mr-2" />
          {t('results.exitRoom')}
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full">
        {/* Header Section - Centered */}
        <div className="max-w-4xl mx-auto">
          {/* Winner Banner */}
          {winner && <ResultsWinnerBanner winner={winner} isCurrentUserWinner={winner.username === username} />}

          {/* Letter Grid */}
          {letterGrid && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mb-6 px-0 sm:px-4"
            >
              <LetterGrid letterGrid={letterGrid} heatMapData={heatMapData} />
            </motion.div>
          )}

          {/* Final Scores Title */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-3 mb-6"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
            >
              <FaTrophy className="text-2xl text-yellow-500 dark:text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
            </motion.div>
            <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 dark:from-yellow-300 dark:via-orange-300 dark:to-yellow-400">
              {t('results.finalScores')}
            </h2>
            <motion.div
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 2, delay: 0.5 }}
            >
              <FaTrophy className="text-2xl text-yellow-500 dark:text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
            </motion.div>
          </motion.div>

        </div>

        {/* Player Results Cards */}
        <div className="w-full max-w-2xl mx-auto px-2 sm:px-4 space-y-4">
          {sortedScores.map((player, index) => (
            <ResultsPlayerCard
              key={player.username}
              player={player}
              index={index}
              allPlayerWords={allPlayerWords}
              currentUsername={username}
              isWinner={index === 0}
            />
          ))}
        </div>

        {/* Play Again Section - Centered */}
        {gameCode && onReturnToRoom && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 + sortedScores.length * 0.1 }}
            className="mt-8 max-w-4xl mx-auto"
          >
            <Card className="p-5 sm:p-6 bg-gradient-to-r from-slate-800/40 to-slate-900/40 border-2 border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.3)] rounded-2xl relative overflow-hidden">
              {/* Glass glare effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent pointer-events-none" />
              <div className="text-center space-y-4 relative z-10">
                <motion.h3
                  className="text-xl sm:text-2xl font-bold text-white"
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {t('results.playAgainQuestion')}
                </motion.h3>
                <p className="text-slate-400 text-sm">
                  {t('results.playAgainDescription')}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={onReturnToRoom}
                      size="lg"
                      className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] font-bold text-lg px-8 transition-all duration-300"
                    >
                      <FaStar className="mr-2" />
                      {t('results.stayInRoom')}
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={handleExitRoom}
                      size="lg"
                      className="w-full sm:w-auto font-bold text-lg px-8 shadow-lg hover:scale-105 transition-transform bg-red-500 hover:bg-red-600 border border-red-400/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                    >
                      <FaSignOutAlt className="mr-2" />
                      {t('results.leaveRoom')}
                    </Button>
                  </motion.div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent className="bg-white dark:bg-slate-800 border-red-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white">
              {t('playerView.exitConfirmation')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-gray-300">
              {t('results.exitWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmExitRoom}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
            >
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ResultsPage;
