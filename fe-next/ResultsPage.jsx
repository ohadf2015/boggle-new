import React, { useMemo, useEffect } from 'react';
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

const LetterGrid = ({ letterGrid }) => {
  const { t } = useLanguage();
  return (
    <div className="mb-8 text-center">
      <h3 className="text-xl font-bold text-cyan-600 dark:text-cyan-400 mb-4 flex items-center justify-center gap-2">
        <span className="text-2xl">📝</span>
        {t('playerView.letterGrid')}
      </h3>
      <div className="inline-block p-4 rounded-xl bg-gradient-to-br from-white/80 to-slate-100/80 dark:from-slate-800/80 dark:to-slate-900/80 border-2 border-cyan-500/30 shadow-lg backdrop-blur-md">
        <GridComponent
          grid={letterGrid}
          interactive={false}
          className="max-w-sm mx-auto"
        />
      </div>
    </div>
  );
};

const ResultsPage = ({ finalScores, letterGrid, gameCode, onReturnToRoom, isHost = false }) => {
  const { t } = useLanguage();

  const handleExitRoom = () => {
    if (window.confirm(t('playerView.exitConfirmation'))) {
      window.location.reload();
    }
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col items-center p-4 sm:p-6 overflow-auto transition-colors duration-300">
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
        className="mb-6 text-center"
      >
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-purple-400 drop-shadow-lg">
          {t('joinView.title')}
        </h1>
      </motion.div>

      {/* Winner Announcement Banner - Only show for host */}
      {isHost && winner && <ResultsWinnerBanner winner={winner} />}

      {/* Main Results Card */}
      <motion.div
        initial={{ scale: 0, rotate: -5 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="w-full max-w-6xl"
      >
        <Card className="p-6 sm:p-8 max-h-[85vh] overflow-auto bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-2 border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
          {/* Title */}
          <motion.h2
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 text-center mb-8 flex items-center justify-center gap-3"
          >
            <FaTrophy className="text-yellow-500" />
            {t('results.finalScores')}
            <FaTrophy className="text-yellow-500" />
          </motion.h2>

          {/* Letter Grid */}
          {letterGrid && <LetterGrid letterGrid={letterGrid} />}

          {/* Podium */}
          <ResultsPodium sortedScores={sortedScores} />

          {/* Detailed Player Cards */}
          <div className="space-y-4 max-w-4xl mx-auto">
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
              className="mt-8"
            >
              <Card className="p-6 bg-gradient-to-r from-cyan-500/10 to-purple-600/10 dark:from-cyan-500/20 dark:to-purple-600/20 border-2 border-cyan-500/30 shadow-lg">
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
    </div>
  );
};

export default ResultsPage;
