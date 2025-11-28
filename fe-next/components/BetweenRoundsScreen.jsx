import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTrophy, FaMedal, FaClock } from 'react-icons/fa';
import { cn } from '../lib/utils';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';

/**
 * Between Rounds Screen Component
 * Shows tournament standings between rounds with countdown to next round
 */
const BetweenRoundsScreen = ({
  standings = [],
  currentRound,
  totalRounds,
  isHost = false,
  onStartNextRound,
  autoStartDelay = 10, // seconds until auto-start
}) => {
  const { t } = useLanguage();
  const [countdown, setCountdown] = useState(autoStartDelay);
  const [isPaused, setIsPaused] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (isPaused || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Auto-start next round
          if (onStartNextRound) {
            onStartNextRound();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, countdown, onStartNextRound]);

  // Get placement suffix
  const getPlacementSuffix = (placement) => {
    if (placement === 1) return 'st';
    if (placement === 2) return 'nd';
    if (placement === 3) return 'rd';
    return 'th';
  };

  // Get medal/trophy for top 3
  const getPlacementIcon = (placement) => {
    if (placement === 1) return <FaTrophy className="text-yellow-400 text-xl" />;
    if (placement === 2) return <FaMedal className="text-gray-400 text-xl" />;
    if (placement === 3) return <FaMedal className="text-amber-600 text-xl" />;
    return null;
  };

  // Get background color for placements
  const getPlacementStyle = (placement) => {
    if (placement === 1) {
      return 'bg-gradient-to-r from-yellow-500/30 to-amber-500/30 border-yellow-500/50';
    }
    if (placement === 2) {
      return 'bg-gradient-to-r from-gray-400/30 to-gray-500/30 border-gray-400/50';
    }
    if (placement === 3) {
      return 'bg-gradient-to-r from-amber-600/30 to-orange-600/30 border-amber-600/50';
    }
    return 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700';
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-slate-900/95 via-indigo-900/95 to-slate-900/95 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-6"
      >
        <h2 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500 mb-2">
          {t('hostView.betweenRoundsStandings') || 'Tournament Standings'}
        </h2>
        <p className="text-lg text-amber-300/80">
          {t('hostView.tournamentRound') || 'Round'} {currentRound} / {totalRounds} {t('results.complete') || 'Complete'}
        </p>
      </motion.div>

      {/* Standings List */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-lg space-y-3 max-h-[50vh] overflow-y-auto px-2"
      >
        <AnimatePresence>
          {standings.map((player, index) => (
            <motion.div
              key={player.playerId || player.username}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 * Math.min(index, 5) }}
              className={cn(
                "flex items-center justify-between p-4 rounded-xl border-2 transition-all",
                getPlacementStyle(player.placement || index + 1)
              )}
            >
              <div className="flex items-center gap-3">
                {/* Placement */}
                <div className="w-10 h-10 flex items-center justify-center">
                  {getPlacementIcon(player.placement || index + 1) || (
                    <span className="text-lg font-bold text-slate-400">
                      #{player.placement || index + 1}
                    </span>
                  )}
                </div>

                {/* Avatar & Name */}
                <div className="flex items-center gap-2">
                  {player.avatar?.emoji && (
                    <span className="text-2xl">{player.avatar.emoji}</span>
                  )}
                  <span className="font-bold text-white text-lg">
                    {player.username}
                  </span>
                </div>
              </div>

              {/* Score */}
              <div className="text-right">
                <div className="text-2xl font-bold text-amber-400">
                  {player.totalScore}
                </div>
                <div className="text-xs text-slate-400">
                  {player.roundScores?.length > 0 && (
                    <span>
                      ({player.roundScores.join(' + ')})
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Next Round Section */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-center"
      >
        {currentRound < totalRounds ? (
          <>
            <div className="flex items-center justify-center gap-2 text-xl text-cyan-300 mb-4">
              <FaClock className="animate-pulse" />
              <span>
                {t('hostView.nextRoundIn') || 'Next round in'}: <span className="font-bold text-2xl text-white">{countdown}</span>s
              </span>
            </div>

            {isHost && (
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => {
                    setIsPaused(false);
                    if (onStartNextRound) onStartNextRound();
                  }}
                  className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-white font-bold px-8 py-3 text-lg shadow-lg hover:shadow-[0_0_25px_rgba(245,158,11,0.5)]"
                >
                  {t('hostView.startNow') || 'Start Now'} 🚀
                </Button>
                <Button
                  onClick={() => setIsPaused(!isPaused)}
                  variant="outline"
                  className="border-slate-500 text-slate-300 hover:bg-slate-800"
                >
                  {isPaused ? '▶️' : '⏸️'}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-2xl font-bold text-green-400">
            🏆 {t('hostView.tournamentComplete') || 'Tournament Complete!'} 🏆
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default BetweenRoundsScreen;
