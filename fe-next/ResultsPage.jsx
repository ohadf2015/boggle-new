import React, { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTrophy, FaSignOutAlt, FaCrown, FaMedal, FaStar } from 'react-icons/fa';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import GridComponent from './components/GridComponent';
import confetti from 'canvas-confetti';
import { useLanguage } from './contexts/LanguageContext';
import ResultsPlayerCard from './components/results/ResultsPlayerCard';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './components/ui/alert-dialog';
import { clearSession } from './utils/session';

const celebrationImages = [
  '/winner-celebration/trophy-confetti.png',
  '/winner-celebration/crown-sparkles.png',
  '/winner-celebration/medal-stars.png',
  '/winner-celebration/fireworks-burst.png',
  '/winner-celebration/champion-ribbon.png',
  '/winner-celebration/laurel-wreath.png',
  '/winner-celebration/celebration-balloons.png',
  '/winner-celebration/winner-podium.png',
  '/winner-celebration/star-burst.png',
  '/winner-celebration/thumbs-up.png',
];

const LetterGrid = ({ letterGrid }) => {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="text-center"
    >
      <div className="inline-block p-3 rounded-xl bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-2 border-cyan-500/30 shadow-[0_4px_24px_rgba(6,182,212,0.2)] backdrop-blur-xl">
        <GridComponent
          grid={letterGrid}
          interactive={false}
          className="max-w-[180px] mx-auto"
        />
      </div>
    </motion.div>
  );
};

// Modern Player Rank Card Component
const PlayerRankCard = ({ player, rank, delay, isWinner }) => {
  const { t } = useLanguage();

  const getRankDisplay = (rank) => {
    if (rank === 1) return { icon: <FaCrown className="text-yellow-400" />, emoji: null, color: 'from-yellow-500/90 via-amber-500/90 to-orange-500/90', border: 'border-yellow-400/60', glow: 'shadow-[0_0_30px_rgba(234,179,8,0.4)]' };
    if (rank === 2) return { icon: <FaMedal className="text-gray-300" />, emoji: null, color: 'from-slate-400/90 via-gray-400/90 to-slate-500/90', border: 'border-gray-400/60', glow: 'shadow-[0_0_20px_rgba(156,163,175,0.3)]' };
    if (rank === 3) return { icon: <FaMedal className="text-orange-400" />, emoji: null, color: 'from-orange-500/90 via-amber-600/90 to-orange-600/90', border: 'border-orange-400/60', glow: 'shadow-[0_0_20px_rgba(249,115,22,0.3)]' };
    return { icon: null, emoji: null, color: 'from-slate-700/80 to-slate-800/80', border: 'border-slate-600/40', glow: '' };
  };

  const rankDisplay = getRankDisplay(rank);

  return (
    <motion.div
      initial={{ x: -100, opacity: 0, scale: 0.8 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      transition={{
        delay: delay,
        type: 'spring',
        stiffness: 120,
        damping: 15
      }}
      whileHover={{ scale: 1.02, x: 10 }}
      className="relative"
    >
      {/* Glow effect for top 3 */}
      {rank <= 3 && (
        <motion.div
          animate={rank === 1 ? {
            opacity: [0.4, 0.7, 0.4],
            scale: [1, 1.02, 1]
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
          className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${rankDisplay.color} blur-xl opacity-30`}
        />
      )}

      <div className={`relative flex items-center gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r ${rankDisplay.color} border-2 ${rankDisplay.border} ${rankDisplay.glow} backdrop-blur-md overflow-hidden`}>
        {/* Shimmer effect for winner */}
        {rank === 1 && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
            style={{ width: '50%' }}
          />
        )}

        {/* Rank Number/Icon */}
        <motion.div
          className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-black/30 backdrop-blur-sm flex items-center justify-center border border-white/20"
          animate={rank === 1 ? { rotate: [0, -5, 5, 0] } : {}}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          {rankDisplay.icon ? (
            <span className="text-2xl sm:text-3xl">{rankDisplay.icon}</span>
          ) : (
            <span className="text-xl sm:text-2xl font-black text-white/90">#{rank}</span>
          )}
        </motion.div>

        {/* Player Info */}
        <div className="flex-1 min-w-0">
          <motion.h3
            className={`text-lg sm:text-xl font-bold text-white truncate ${rank === 1 ? 'drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]' : ''}`}
            animate={rank === 1 ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {player.username}
            {rank === 1 && <span className="ml-2 text-yellow-300">!</span>}
          </motion.h3>
          <div className="flex items-center gap-3 mt-1 text-sm text-white/80">
            <span>{player.wordCount} {t('playerView.wordCount')}</span>
            {player.longestWord && (
              <span className="hidden sm:inline">Best: {player.longestWord}</span>
            )}
          </div>
        </div>

        {/* Score */}
        <motion.div
          className="flex-shrink-0 text-right"
          animate={rank === 1 ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div className={`text-2xl sm:text-3xl font-black text-white ${rank === 1 ? 'drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]' : ''}`}>
            {player.score}
          </div>
          <div className="text-xs text-white/70">{t('results.points')}</div>
        </motion.div>
      </div>
    </motion.div>
  );
};

const ResultsPage = ({ finalScores, letterGrid, gameCode, onReturnToRoom }) => {
  const { t } = useLanguage();
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [randomImage, setRandomImage] = useState('');
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setRandomImage(celebrationImages[Math.floor(Math.random() * celebrationImages.length)]);
      
      const newParticles = [...Array(20)].map((_, i) => ({
        id: i,
        width: 3 + Math.random() * 6,
        height: 3 + Math.random() * 6,
        left: Math.random() * 100,
        yTarget: -400 - Math.random() * 200,
        xTarget: (i % 2 === 0 ? 1 : -1) * (20 + Math.random() * 30),
        duration: 3 + Math.random() * 2,
        delay: i * 0.2
      }));
      setParticles(newParticles);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col overflow-auto transition-colors duration-300">
      {/* Hero Banner with Background Image */}
      <div className="relative w-full min-h-[300px] sm:min-h-[350px] md:min-h-[400px] overflow-hidden">
        {/* Background Image with Blur and Overlay */}
        <div className="absolute inset-0">
          <motion.img
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            src={randomImage}
            alt="celebration"
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              filter: 'blur(8px) brightness(0.8) saturate(1.3)',
            }}
          />
          {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/60 to-slate-900" />
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-teal-500/20" />
        </div>

        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute rounded-full bg-white/40"
              style={{
                width: `${particle.width}px`,
                height: `${particle.height}px`,
                left: `${particle.left}%`,
                bottom: 0,
              }}
              animate={{
                y: [0, particle.yTarget],
                x: [particle.xTarget],
                opacity: [0.6, 0],
                scale: [1, 0.3]
              }}
              transition={{
                duration: particle.duration,
                repeat: Infinity,
                delay: particle.delay,
                ease: 'easeOut'
              }}
            />
          ))}
        </div>

        {/* Exit Button */}
        <div className="absolute top-4 right-4 z-50">
          <Button
            onClick={handleExitRoom}
            className="font-bold bg-red-500/80 hover:bg-red-600 border border-red-400/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all duration-300 backdrop-blur-sm"
          >
            <FaSignOutAlt className="mr-2" />
            {t('results.exitRoom')}
          </Button>
        </div>

        {/* Winner Content */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[300px] sm:min-h-[350px] md:min-h-[400px] px-4 py-8">
          {winner && (
            <>
              {/* Animated Crown */}
              <motion.div
                initial={{ y: -50, opacity: 0, rotate: -20 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.3 }}
              >
                <motion.div
                  animate={{
                    rotate: [0, -8, 8, -8, 0],
                    y: [0, -8, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1 }}
                >
                  <FaCrown className="text-5xl sm:text-6xl md:text-7xl text-yellow-400 drop-shadow-[0_0_30px_rgba(255,215,0,0.8)]" />
                </motion.div>
              </motion.div>

              {/* Winner Name */}
              <motion.h1
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 150, damping: 15, delay: 0.5 }}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-center mt-4"
              >
                <motion.span
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #FFE066 30%, #FFD700 50%, #FFA500 70%, #FFFFFF 100%)',
                    backgroundSize: '200% 200%',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 4px 20px rgba(255,215,0,0.6))',
                    animation: 'gradient-x 4s ease infinite'
                  }}
                >
                  {winner.username}
                </motion.span>
              </motion.h1>

              {/* Winner Score */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex items-center gap-3 mt-3"
              >
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                >
                  <FaTrophy className="text-2xl sm:text-3xl text-yellow-400 drop-shadow-lg" />
                </motion.div>
                <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                  {winner.score} {t('results.points')}
                </span>
              </motion.div>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 px-3 sm:px-4 md:px-6 py-6 max-w-4xl mx-auto w-full">
        {/* Letter Grid */}
        {letterGrid && (
          <div className="mb-6 flex justify-center">
            <LetterGrid letterGrid={letterGrid} />
          </div>
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
            <FaTrophy className="text-2xl text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
          </motion.div>
          <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500">
            {t('results.finalScores')}
          </h2>
          <motion.div
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 2, delay: 0.5 }}
          >
            <FaTrophy className="text-2xl text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
          </motion.div>
        </motion.div>

        {/* Duplicate Words Clarification Banner */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-6 max-w-2xl mx-auto"
        >
          <div className="p-4 rounded-lg bg-gradient-to-r from-orange-500/20 to-red-500/20 border-2 border-orange-500/40 backdrop-blur-sm">
            <p className="text-center text-sm font-bold text-orange-800 dark:text-orange-200">
              ⚠️ {t('results.duplicateWarning')}
            </p>
          </div>
        </motion.div>

        {/* Player Rankings List */}
        <div className="space-y-3 sm:space-y-4">
          {sortedScores.map((player, index) => (
            <PlayerRankCard
              key={player.username}
              player={player}
              rank={index + 1}
              delay={0.3 + index * 0.1}
              isWinner={index === 0}
            />
          ))}
        </div>

        {/* Detailed Player Cards (All Players) */}
        <div className="space-y-4 max-w-4xl mx-auto mt-8">
          <h3 className="text-xl font-bold text-slate-300 mb-4 text-center">
            {t('results.detailedResults') || 'Detailed Results'}
          </h3>
          {sortedScores.map((player, index) => (
            <ResultsPlayerCard
              key={player.username}
              player={player}
              index={index}
              allPlayerWords={allPlayerWords}
            />
          ))}
        </div>

        {/* Play Again Section */}
        {gameCode && onReturnToRoom && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 + sortedScores.length * 0.1 }}
            className="mt-8"
          >
            <Card className="p-5 sm:p-6 bg-gradient-to-r from-slate-800/90 to-slate-900/90 border-2 border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] backdrop-blur-xl rounded-2xl">
              <div className="text-center space-y-4">
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
                      variant="outline"
                      className="w-full sm:w-auto font-bold text-lg px-8 border-2 border-slate-600 text-slate-300 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-300 transition-all duration-300"
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
        <AlertDialogContent className="bg-slate-800 border-red-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {t('playerView.exitConfirmation')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              {t('results.exitWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
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
