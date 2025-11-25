import React, { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaTrophy, FaSignOutAlt } from 'react-icons/fa';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import GridComponent from './components/GridComponent';
import confetti from 'canvas-confetti';
import { useLanguage } from './contexts/LanguageContext';
import ResultsPodium from './components/results/ResultsPodium';
import ResultsPlayerCard from './components/results/ResultsPlayerCard';
import ResultsWinnerBanner from './components/results/ResultsWinnerBanner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './components/ui/alert-dialog';

const LetterGrid = ({ letterGrid }) => {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="mb-6 text-center"
    >
      <h3 className="text-lg font-bold text-cyan-600 dark:text-cyan-400 mb-3 flex items-center justify-center gap-2">
        <span className="text-xl drop-shadow-md">📝</span>
        {t('playerView.letterGrid')}
      </h3>
      <div className="inline-block p-3 rounded-xl bg-gradient-to-br from-white/90 to-slate-50/90 dark:from-slate-800/90 dark:to-slate-900/90 border-2 border-cyan-500/20 shadow-[0_4px_24px_rgba(6,182,212,0.15)] backdrop-blur-xl">
        <GridComponent
          grid={letterGrid}
          interactive={false}
          className="max-w-[200px] mx-auto"
        />
      </div>
    </motion.div>
  );
};

const ResultsPage = ({ finalScores, letterGrid, gameCode, onReturnToRoom, isHost = false }) => {
  const { t } = useLanguage();
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const handleExitRoom = () => {
    setShowExitConfirm(true);
  };

  const confirmExitRoom = () => {
    window.location.reload();
  };

  const sortedScores = useMemo(() => {
    return finalScores ? [...finalScores].sort((a, b) => b.score - a.score) : [];
  }, [finalScores]);

  const winner = sortedScores[0];

  // Celebration effect when results load
  useEffect(() => {
    if (winner) {
      // Initial confetti burst
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#22d3ee', '#a78bfa', '#2dd4bf', '#FFD700']
      });

      // Continuous celebration for winner
      const interval = setInterval(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.8 },
          colors: ['#22d3ee', '#a78bfa']
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.8 },
          colors: ['#2dd4bf', '#FFD700']
        });
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [winner]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col items-center p-3 sm:p-4 md:p-6 overflow-auto transition-colors duration-300">
      {/* Exit Button */}
      <div className="absolute top-5 right-5 z-50">
        <Button
          onClick={handleExitRoom}
          className="font-bold bg-red-500 hover:bg-red-600 border border-red-400/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all duration-300"
        >
          <FaSignOutAlt className="mr-2" />
          {t('results.exitRoom')}
        </Button>
      </div>

      {/* Title */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-4 text-center"
      >
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-purple-400 drop-shadow-lg">
          {t('joinView.title')}
        </h1>
      </motion.div>

      {/* Winner Announcement Banner - Only show for host */}
      {isHost && winner && <ResultsWinnerBanner winner={winner} />}

      {/* Main Results Card */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 150, damping: 25 }}
        className="w-full max-w-6xl relative"
      >
        {/* Enhanced glow effect around card */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-teal-500/20 rounded-2xl blur-2xl"
             style={{ animation: 'gradient-x 6s ease infinite' }} />

        <Card className="relative p-3 sm:p-4 md:p-6 max-h-[85vh] overflow-auto bg-white/98 dark:bg-slate-800/98 backdrop-blur-xl border-2 border-purple-500/30 shadow-[0_8px_32px_rgba(168,85,247,0.2),0_0_60px_rgba(6,182,212,0.1)] rounded-2xl">
          {/* Title */}
          <motion.h2
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', delay: 0.2, stiffness: 120 }}
            className="text-2xl sm:text-3xl font-black text-center mb-6 flex items-center justify-center gap-3 relative"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            >
              <FaTrophy className="text-yellow-500 text-2xl drop-shadow-[0_0_15px_rgba(234,179,8,0.6)]" />
            </motion.div>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500"
                  style={{
                    textShadow: '0 0 30px rgba(234,179,8,0.3)',
                    backgroundSize: '200% 200%',
                    animation: 'gradient-x 3s ease infinite'
                  }}>
              {t('results.finalScores')}
            </span>
            <motion.div
              animate={{ rotate: [0, 10, -10, 10, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1, delay: 0.5 }}
            >
              <FaTrophy className="text-yellow-500 text-2xl drop-shadow-[0_0_15px_rgba(234,179,8,0.6)]" />
            </motion.div>
          </motion.h2>

          {/* Letter Grid */}
          {letterGrid && <LetterGrid letterGrid={letterGrid} />}

          {/* Podium */}
          <ResultsPodium sortedScores={sortedScores.slice(0, 3)} />

          {/* Remaining Players List (4th place and beyond) */}
          {sortedScores.length > 3 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-8 max-w-2xl mx-auto"
            >
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-4 text-center">
                {t('results.otherPlayers') || 'Other Players'}
              </h3>
              <div className="space-y-2">
                {sortedScores.slice(3).map((player, index) => (
                  <motion.div
                    key={player.username}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-800 border border-slate-300 dark:border-slate-600 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-slate-600 dark:text-slate-400 min-w-[2rem]">
                        #{index + 4}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-white">
                        {player.username}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {player.wordCount} {t('playerView.wordCount')}
                      </span>
                      <span className="font-bold text-lg text-cyan-600 dark:text-cyan-400">
                        {player.score} {t('results.points').slice(0, 3)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Detailed Player Cards (All Players) */}
          <div className="space-y-4 max-w-4xl mx-auto mt-8">
            {sortedScores.map((player, index) => (
              <ResultsPlayerCard key={player.username} player={player} index={index} />
            ))}
          </div>

          {/* Play Again Prompt */}
          {gameCode && onReturnToRoom && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-4 sm:mt-6 md:mt-8"
            >
              <Card className="p-4 sm:p-5 md:p-6 bg-gradient-to-r from-cyan-500/10 to-purple-600/10 dark:from-cyan-500/20 dark:to-purple-600/20 border-2 border-cyan-500/30 shadow-lg">
                <div className="text-center space-y-4">
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                    {t('results.playAgainQuestion')}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 text-sm">
                    {t('results.playAgainDescription')}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
                    <Button
                      onClick={onReturnToRoom}
                      size="lg"
                      className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] font-bold text-lg px-10 transition-all duration-300"
                    >
                      ✓ {t('results.stayInRoom')}
                    </Button>
                    <Button
                      onClick={handleExitRoom}
                      size="lg"
                      variant="outline"
                      className="font-bold text-lg px-10 border-2 hover:bg-red-50 dark:hover:bg-red-950 transition-all duration-300"
                    >
                      ✗ {t('results.leaveRoom')}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </Card>
      </motion.div>

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
