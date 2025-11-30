import React, { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTrophy, FaSignOutAlt, FaStar, FaUser, FaFire, FaChartBar } from 'react-icons/fa';
import confetti from 'canvas-confetti';
import { useLanguage } from './contexts/LanguageContext';
import { useAuth } from './contexts/AuthContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './components/ui/alert-dialog';
import { Button } from './components/ui/button';
import { clearSessionPreservingUsername } from './utils/session';
import { shouldShowUpgradePrompt, getGuestStatsSummary, updateGuestStatsAfterGame, isFirstWin } from './utils/guestManager';
import { useWinStreak } from './hooks/useWinStreak';
import { trackGameCompletion, trackStreakMilestone } from './utils/growthTracking';
import logger from './utils/logger';
import { levelUpToast } from './components/NeoToast';
import { FaArrowDown } from 'react-icons/fa';

// Dynamic imports for heavy components (loaded after initial render)
const GridComponent = dynamic(() => import('./components/GridComponent'), { ssr: false });
const ResultsPlayerCard = dynamic(() => import('./components/results/ResultsPlayerCard'), { ssr: false });
const ResultsWinnerBanner = dynamic(() => import('./components/results/ResultsWinnerBanner'), { ssr: false });
const AuthModal = dynamic(() => import('./components/auth/AuthModal'), { ssr: false });
const FirstWinSignupModal = dynamic(() => import('./components/auth/FirstWinSignupModal'), { ssr: false });
const ShareWinPrompt = dynamic(() => import('./components/results/ShareWinPrompt'), { ssr: false });
const WinStreakDisplay = dynamic(() => import('./components/results/WinStreakDisplay'), { ssr: false });
const WordFeedbackModal = dynamic(() => import('./components/voting/WordFeedbackModal'), { ssr: false });
const XpBreakdownCard = dynamic(() => import('./components/results/XpBreakdownCard'), { ssr: false });

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

const LetterGrid = ({ letterGrid, heatMapData, showHeatmap, onToggleHeatmap }) => {
  const { t } = useLanguage();
  return (
    <div className="w-full">
      {/* Heatmap Toggle Button - Always visible */}
      {heatMapData && heatMapData.maxCount > 0 && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={onToggleHeatmap}
          className={`mb-3 mx-auto flex items-center gap-2 px-4 py-2 rounded-neo border-3 border-neo-black font-bold text-sm uppercase transition-all shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-pressed ${
            showHeatmap
              ? 'bg-neo-orange text-neo-black'
              : 'bg-neo-cream text-neo-black'
          }`}
        >
          <FaFire className={`text-lg ${showHeatmap ? 'text-neo-red' : 'text-neo-black/60'}`} />
          <span>{showHeatmap ? (t('results.hideHeatmap') || 'Hide Heatmap') : (t('results.showHeatmap') || 'Show Heatmap')}</span>
          <FaChartBar className={`text-lg ${showHeatmap ? 'text-neo-black' : 'text-neo-black/60'}`} />
        </motion.button>
      )}

      {/* Grid - Only shown when heatmap is enabled */}
      <AnimatePresence>
        {showHeatmap && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="w-full max-w-full mx-auto p-2 sm:p-3 rounded-xl bg-gradient-to-br from-slate-800/40 to-slate-900/40 dark:from-slate-800/40 dark:to-slate-900/40 border-2 border-cyan-500/50 shadow-[0_4px_24px_rgba(6,182,212,0.3)] relative overflow-hidden">
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
        )}
      </AnimatePresence>
    </div>
  );
};

const ResultsPage = ({ finalScores, letterGrid, gameCode, onReturnToRoom, username, socket }) => {
  const { t, language } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showFirstWinModal, setShowFirstWinModal] = useState(false);
  const [hasShownUpgradePrompt, setHasShownUpgradePrompt] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Use refs for values that don't need to trigger re-renders
  const hasUpdatedStatsRef = useRef(false);
  const hasTrackedGameRef = useRef(false);
  // previousStreak needs to be state since it's used in render
  const [previousStreak, setPreviousStreak] = useState(0);

  // Word feedback state for crowd-sourced word validation
  const [showWordFeedback, setShowWordFeedback] = useState(false);
  const [wordToVote, setWordToVote] = useState(null);

  // XP and Level state (received via socket after game ends)
  const [xpGainedData, setXpGainedData] = useState(null);
  const [levelUpData, setLevelUpData] = useState(null);

  // Scroll to new game button state
  const [showScrollButton, setShowScrollButton] = useState(false);
  const playAgainRef = useRef(null);

  // Win streak tracking
  const { currentStreak, bestStreak, recordWin } = useWinStreak();

  // Calculate if current player is the winner
  const sortedScores = useMemo(() => {
    return finalScores ? [...finalScores].sort((a, b) => b.score - a.score) : [];
  }, [finalScores]);

  const winner = sortedScores[0];
  const isCurrentUserWinner = winner?.username === username;

  // Get current player data for share prompt
  const currentPlayerData = useMemo(() => {
    if (!finalScores || !username) return null;
    return finalScores.find(p => p.username === username);
  }, [finalScores, username]);

  // Update guest stats when results load (only once)
  useEffect(() => {
    if (!isAuthenticated && !hasUpdatedStatsRef.current && finalScores && username) {
      const currentPlayerData = finalScores.find(p => p.username === username);

      if (currentPlayerData) {
        const validWords = currentPlayerData.allWords?.filter(w => w.validated && w.score > 0) || [];
        const longestValidWord = validWords.reduce((longest, w) =>
          w.word.length > (longest?.length || 0) ? w.word : longest, null
        );

        updateGuestStatsAfterGame({
          score: currentPlayerData.score || 0,
          wordCount: validWords.length,
          longestWord: longestValidWord,
          isWinner: isCurrentUserWinner,
          achievements: currentPlayerData.achievements || []
        });
        hasUpdatedStatsRef.current = true;
      }
    }
  }, [isAuthenticated, finalScores, username, isCurrentUserWinner]);

  // Track game completion and record win streak (only once)
  useEffect(() => {
    if (hasTrackedGameRef.current || !currentPlayerData) return;

    const validWords = currentPlayerData.allWords?.filter(w => w.validated && w.score > 0) || [];
    const guestStats = getGuestStatsSummary();
    const isFirstGame = guestStats.gamesPlayed <= 1;

    // Track game completion for analytics
    trackGameCompletion(
      isCurrentUserWinner,
      currentPlayerData.score || 0,
      validWords.length,
      isFirstGame
    );

    // Record win and update streak
    if (isCurrentUserWinner) {
      setPreviousStreak(currentStreak);
      recordWin();

      // Track streak milestones
      const newStreak = currentStreak + 1;
      trackStreakMilestone(newStreak);
    }

    hasTrackedGameRef.current = true;
  }, [currentPlayerData, isCurrentUserWinner, currentStreak, recordWin]);

  // Show celebratory signup prompt for guests - triggered on scroll near bottom
  // This ensures it doesn't interfere with the word feedback modal
  useEffect(() => {
    // Don't set up scroll listener if already shown, authenticated, or word feedback is showing
    if (isAuthenticated || hasShownUpgradePrompt || !hasUpdatedStatsRef.current || showWordFeedback) {
      return;
    }

    const shouldShowModal = shouldShowUpgradePrompt();
    const isFirstWinUser = isFirstWin();

    // Only proceed if we should show a modal
    if (!shouldShowModal && !(isCurrentUserWinner && isFirstWinUser)) {
      return;
    }

    const handleScroll = () => {
      // Check if user has scrolled near the bottom (80% of page)
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

      if (scrollPercentage >= 0.8 && !showWordFeedback) {
        if (isCurrentUserWinner && (isFirstWinUser || shouldShowModal)) {
          setShowFirstWinModal(true);
        } else if (shouldShowModal) {
          setShowAuthModal(true);
        }
        setHasShownUpgradePrompt(true);

        // Remove listener after showing
        window.removeEventListener('scroll', handleScroll);
      }
    };

    // Add scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Also check immediately in case page is already scrolled or short
    // But with a delay to let word feedback show first
    const initialCheckTimeout = setTimeout(() => {
      if (!showWordFeedback) {
        handleScroll();
      }
    }, 2000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(initialCheckTimeout);
    };
  }, [isAuthenticated, hasShownUpgradePrompt, isCurrentUserWinner, showWordFeedback]);

  const handleExitRoom = () => {
    setShowExitConfirm(true);
  };

  const confirmExitRoom = () => {
    // Preserve username in localStorage for smooth fallback to lobby
    clearSessionPreservingUsername();
    window.location.reload();
  };

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

  // Show scroll button after 8 seconds
  useEffect(() => {
    if (!gameCode || !onReturnToRoom) return;

    const timer = setTimeout(() => {
      setShowScrollButton(true);
    }, 8000);

    return () => clearTimeout(timer);
  }, [gameCode, onReturnToRoom]);

  // Socket event listeners for word feedback (crowd-sourced word validation) and XP
  useEffect(() => {
    if (!socket) return;

    const handleShowWordFeedback = (data) => {
      logger.log('[RESULTS] Received word feedback request:', data);
      setWordToVote({
        word: data.word,
        submittedBy: data.submittedBy,
        submitterAvatar: data.submitterAvatar,
        timeoutSeconds: data.timeoutSeconds || 10,
        gameCode: data.gameCode,
        language: data.language
      });
      setShowWordFeedback(true);
    };

    const handleVoteRecorded = (data) => {
      logger.log('[RESULTS] Vote recorded:', data);
    };

    // XP and Level Up handlers
    const handleXpGained = (data) => {
      logger.log('[RESULTS] XP gained:', data);
      setXpGainedData(data);
    };

    const handleLevelUp = (data) => {
      logger.log('[RESULTS] Level up!', data);
      setLevelUpData(data);
      // Celebratory confetti for level up
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#a855f7']
      });
      // Show level up toast notification
      levelUpToast(data.oldLevel, data.newLevel, {
        title: t('xp.levelUp') || 'Level Up!',
        newTitle: data.newTitles?.[0],
        newTitleLabel: t('xp.titleUnlocked') || 'New Title',
        duration: 5000
      });
    };

    socket.on('showWordFeedback', handleShowWordFeedback);
    socket.on('voteRecorded', handleVoteRecorded);
    socket.on('xpGained', handleXpGained);
    socket.on('levelUp', handleLevelUp);

    return () => {
      socket.off('showWordFeedback', handleShowWordFeedback);
      socket.off('voteRecorded', handleVoteRecorded);
      socket.off('xpGained', handleXpGained);
      socket.off('levelUp', handleLevelUp);
    };
  }, [socket]);

  // Handle word feedback vote
  const handleVote = useCallback((voteType) => {
    if (!socket || !wordToVote) return;

    logger.log('[RESULTS] Submitting vote:', { word: wordToVote.word, voteType });
    socket.emit('submitWordVote', {
      word: wordToVote.word,
      language: wordToVote.language,
      gameCode: wordToVote.gameCode,
      voteType,
      submittedBy: wordToVote.submittedBy
    });

    setShowWordFeedback(false);
    setWordToVote(null);
  }, [socket, wordToVote]);

  // Handle word feedback skip/timeout
  const handleFeedbackSkip = useCallback(() => {
    logger.log('[RESULTS] Skipping word feedback');
    setShowWordFeedback(false);
    setWordToVote(null);
  }, []);

  // Scroll to play again section
  const scrollToPlayAgain = useCallback(() => {
    if (playAgainRef.current) {
      playAgainRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setShowScrollButton(false);
    }
  }, []);

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
              <LetterGrid
                letterGrid={letterGrid}
                heatMapData={heatMapData}
                showHeatmap={showHeatmap}
                onToggleHeatmap={() => setShowHeatmap(prev => !prev)}
              />
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
              xpGainedData={player.username === username ? xpGainedData : null}
              levelUpData={player.username === username ? levelUpData : null}
            />
          ))}
        </div>

        {/* Growth Features Section - Appears smoothly on scroll */}
        <div className="w-full max-w-2xl mx-auto px-2 sm:px-4 mt-6 space-y-3">
          {/* Win Streak Display - Only show when NOT showing victory card (ShareWinPrompt already has streak badge) */}
          {isCurrentUserWinner && currentStreak > 0 && !(currentPlayerData && gameCode) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex justify-center"
            >
              <WinStreakDisplay
                currentStreak={currentStreak}
                bestStreak={bestStreak}
                isNewMilestone={[3, 7, 14, 30].includes(currentStreak)}
                previousStreak={previousStreak}
                compact={currentStreak < 3 && !([3, 7, 14, 30].includes(currentStreak))}
              />
            </motion.div>
          )}

          {/* Share Prompt - Compact inline for non-winners, full for winners */}
          {currentPlayerData && gameCode && (isCurrentUserWinner || currentPlayerData.score >= 50) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
            >
              <ShareWinPrompt
                isWinner={isCurrentUserWinner}
                username={username}
                score={currentPlayerData.score || 0}
                wordCount={currentPlayerData.allWords?.filter(w => w.validated && w.score > 0).length || 0}
                achievements={currentPlayerData.achievements || []}
                gameCode={gameCode}
                streakDays={isCurrentUserWinner ? currentStreak : 0}
                compact={!isCurrentUserWinner}
              />
            </motion.div>
          )}
        </div>

        {/* Play Again Section - Neo-Brutalist */}
        {gameCode && onReturnToRoom && (
          <motion.div
            ref={playAgainRef}
            initial={{ y: 30, opacity: 0, rotate: -2 }}
            animate={{ y: 0, opacity: 1, rotate: 1 }}
            transition={{ delay: 0.5 + sortedScores.length * 0.1 }}
            className="mt-8 max-w-4xl mx-auto"
          >
            <div className="p-5 sm:p-6 bg-neo-cyan border-4 border-neo-black rounded-neo-lg shadow-hard-xl relative overflow-hidden">
              {/* Halftone texture pattern */}
              <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                  backgroundImage: `radial-gradient(circle, var(--neo-black) 1px, transparent 1px)`,
                  backgroundSize: '8px 8px',
                }}
              />
              <div className="text-center space-y-4 relative z-10">
                <motion.h3
                  className="text-xl sm:text-2xl font-black text-neo-black uppercase"
                  style={{ textShadow: '2px 2px 0px var(--neo-yellow)' }}
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {t('results.playAgainQuestion')}
                </motion.h3>
                <p className="text-neo-black text-sm font-bold">
                  {t('results.playAgainDescription')}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
                  <motion.div
                    whileHover={{ x: -2, y: -2 }}
                    whileTap={{ x: 2, y: 2 }}
                  >
                    <button
                      onClick={onReturnToRoom}
                      className="w-full sm:w-auto bg-neo-yellow text-neo-black font-black text-lg px-8 py-3 uppercase border-4 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg transition-all flex items-center justify-center gap-2"
                    >
                      <FaStar />
                      {t('results.stayInRoom')}
                    </button>
                  </motion.div>
                  <motion.div
                    whileHover={{ x: -2, y: -2 }}
                    whileTap={{ x: 2, y: 2 }}
                  >
                    <button
                      onClick={handleExitRoom}
                      className="w-full sm:w-auto bg-neo-red text-neo-cream font-black text-lg px-8 py-3 uppercase border-4 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg transition-all flex items-center justify-center gap-2"
                    >
                      <FaSignOutAlt />
                      {t('results.leaveRoom')}
                    </button>
                  </motion.div>
                </div>
              </div>
            </div>
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

      {/* Sign Up Prompt for Guests (non-winners) */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        showGuestStats={true}
      />

      {/* Celebratory First Win Signup Prompt */}
      <FirstWinSignupModal
        isOpen={showFirstWinModal}
        onClose={() => setShowFirstWinModal(false)}
      />

      {/* Word Feedback Modal - Crowd-sourced word validation */}
      <WordFeedbackModal
        isOpen={showWordFeedback && wordToVote !== null}
        word={wordToVote?.word || ''}
        submittedBy={wordToVote?.submittedBy || ''}
        submitterAvatar={wordToVote?.submitterAvatar}
        timeoutSeconds={wordToVote?.timeoutSeconds || 15}
        onVote={handleVote}
        onSkip={handleFeedbackSkip}
        onTimeout={handleFeedbackSkip}
      />

      {/* Floating Scroll to New Game Button - appears after 8 seconds */}
      <AnimatePresence>
        {showScrollButton && gameCode && onReturnToRoom && (
          <motion.button
            initial={{ y: 100, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={scrollToPlayAgain}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-6 py-3 bg-neo-yellow border-4 border-neo-black rounded-neo shadow-hard-lg hover:shadow-hard-xl hover:translate-y-[-2px] transition-all font-black text-neo-black uppercase"
          >
            <motion.span
              animate={{ y: [0, 5, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <FaArrowDown className="text-lg" />
            </motion.span>
            <span className="text-sm sm:text-base">{t('results.startNewGame') || 'Start New Game'}</span>
            <motion.span
              animate={{ y: [0, 5, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
            >
              <FaArrowDown className="text-lg" />
            </motion.span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResultsPage;
