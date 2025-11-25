import React from 'react';
import { motion } from 'framer-motion';
import { FaTrophy, FaMedal, FaStar } from 'react-icons/fa';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '../lib/utils';

const TournamentStandings = ({ standings, currentRound, totalRounds, isComplete = false }) => {
  const { t } = useLanguage();

  if (!standings || standings.length === 0) {
    return null;
  }

  const getMedalIcon = (placement) => {
    switch (placement) {
      case 1:
        return <FaTrophy className="text-yellow-500 text-2xl" />;
      case 2:
        return <FaMedal className="text-gray-400 text-xl" />;
      case 3:
        return <FaMedal className="text-amber-600 text-xl" />;
      default:
        return null;
    }
  };

  const getPlacementColor = (placement) => {
    switch (placement) {
      case 1:
        return 'from-yellow-400 to-amber-500';
      case 2:
        return 'from-gray-300 to-gray-400';
      case 3:
        return 'from-amber-500 to-amber-600';
      default:
        return 'from-purple-500 to-pink-500';
    }
  };

  return (
    <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-4 sm:p-6 rounded-lg shadow-xl border-2 border-amber-500/50">
      <div className="space-y-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <FaTrophy className="text-amber-500 text-2xl" />
            <h2 className="text-2xl font-bold text-amber-700 dark:text-amber-300">
              {isComplete ? t('hostView.tournamentComplete') : t('hostView.tournamentStandings')}
            </h2>
          </div>

          {!isComplete && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {t('hostView.tournamentRound')} {currentRound}/{totalRounds}
            </p>
          )}
        </div>

        {/* Standings List */}
        <div className="space-y-2">
          {standings.map((player, index) => {
            const isTopThree = player.placement <= 3;

            return (
              <motion.div
                key={player.playerId}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <div
                  className={cn(
                    'relative overflow-hidden rounded-lg border-2 p-3 transition-all duration-300',
                    isTopThree
                      ? 'border-amber-500/50 shadow-lg'
                      : 'border-purple-500/30 shadow-md'
                  )}
                >
                  {/* Background gradient for top 3 */}
                  {isTopThree && (
                    <div
                      className={cn(
                        'absolute inset-0 bg-gradient-to-r opacity-10',
                        getPlacementColor(player.placement)
                      )}
                    />
                  )}

                  <div className="relative flex items-center justify-between">
                    {/* Left side: Placement, Avatar, Name */}
                    <div className="flex items-center gap-3">
                      {/* Placement */}
                      <div className="flex items-center justify-center w-10">
                        {isTopThree ? (
                          getMedalIcon(player.placement)
                        ) : (
                          <span className="text-lg font-bold text-slate-600 dark:text-slate-300">
                            {player.placement}
                          </span>
                        )}
                      </div>

                      {/* Avatar & Name */}
                      <div className="flex items-center gap-2">
                        {player.avatar?.emoji && (
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-xl border-2 border-white dark:border-slate-700"
                            style={{ backgroundColor: player.avatar.color }}
                          >
                            {player.avatar.emoji}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">
                            {player.username}
                          </p>
                          {player.roundScores && player.roundScores.length > 0 && (
                            <div className="flex gap-1 mt-0.5">
                              {player.roundScores.map((score, i) => (
                                <span
                                  key={i}
                                  className="text-xs bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded"
                                  title={`Round ${i + 1}: ${score}`}
                                >
                                  {score}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right side: Total Score */}
                    <div className="text-right">
                      <Badge
                        className={cn(
                          'text-lg font-bold px-3 py-1',
                          isTopThree
                            ? `bg-gradient-to-r ${getPlacementColor(player.placement)} text-white`
                            : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        )}
                      >
                        {player.totalScore}
                      </Badge>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {t('hostView.totalScore')}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Winner announcement for completed tournament */}
        {isComplete && standings[0] && (
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="text-center p-4 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-lg shadow-xl"
          >
            <FaStar className="text-white text-3xl mx-auto mb-2 animate-pulse" />
            <p className="text-sm font-medium text-yellow-900">
              {t('hostView.tournamentWinner')}
            </p>
            <p className="text-2xl font-bold text-white mt-1">
              {standings[0].username}
            </p>
            <p className="text-lg font-semibold text-yellow-100">
              {standings[0].totalScore} {t('hostView.totalScore').toLowerCase()}
            </p>
          </motion.div>
        )}
      </div>
    </Card>
  );
};

export default TournamentStandings;
