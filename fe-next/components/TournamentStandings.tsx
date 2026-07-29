import React from 'react';
import { m } from 'framer-motion';
import { Trophy, Medal, Star } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '../lib/utils';
import SessionStatsCard from './results/SessionStatsCard';
import type { Avatar } from '@/types';

interface TournamentPlayerStanding {
  playerId?: string;
  username: string;
  avatar?: Avatar;
  placement?: number;
  rank?: number;
  totalScore: number;
  roundScores?: number[];
}

interface TournamentStandingsProps {
  standings: TournamentPlayerStanding[];
  currentRound: number;
  totalRounds: number;
  isComplete?: boolean;
}

const TournamentStandings: React.FC<TournamentStandingsProps> = ({
  standings,
  currentRound,
  totalRounds,
  isComplete = false,
}): React.ReactElement | null => {
  const { t } = useLanguage();

  if (!standings || standings.length === 0) {
    return null;
  }

  const getMedalIcon = (placement: number): React.ReactElement | null => {
    switch (placement) {
      case 1:
        return <Trophy className="text-yellow-500 text-2xl" />;
      case 2:
        return <Medal className="text-gray-600 text-xl" />;
      case 3:
        return <Medal className="text-amber-600 text-xl" />;
      default:
        return null;
    }
  };

  const getPlacementColor = (placement: number): string => {
    switch (placement) {
      case 1:
        return 'bg-neo-lime text-neo-black';
      case 2:
        return 'bg-slate-300 text-neo-black';
      case 3:
        return 'bg-neo-lime text-neo-black';
      default:
        return 'bg-neo-pink text-neo-white';
    }
  };

  return (
    <Card className="bg-neo-navy text-neo-white p-4 sm:p-6 rounded-neo shadow-hard-lg border-neo-thick border-neo-black">
      <div className="space-y-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Trophy className="text-neo-yellow text-2xl" />
            <h2 className="text-2xl font-bold text-neo-yellow">
              {isComplete ? t('hostView.tournamentComplete') : t('hostView.tournamentStandings')}
            </h2>
          </div>

          {!isComplete && (
            <p className="text-sm text-neo-yellow/80">
              {t('hostView.tournamentRound')} {currentRound}/{totalRounds}
            </p>
          )}
        </div>

        {/* Standings List */}
        <div className="space-y-2">
          {standings.map((player, index) => {
            const placement = player.placement ?? player.rank ?? index + 1;
            const isTopThree = placement <= 3;

            return (
              <m.div
                key={player.playerId ?? player.username}
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
                  {/* Background solid color for top 3 - Neo-Brutalist */}
                  {isTopThree && (
                    <div
                      className={cn(
                        'absolute inset-0 opacity-10',
                        getPlacementColor(placement)
                      )}
                    />
                  )}

                  <div className="relative flex items-center justify-between">
                    {/* Left side: Placement, Avatar, Name */}
                    <div className="flex items-center gap-3">
                      {/* Placement */}
                      <div className="flex items-center justify-center w-10">
                        {isTopThree ? (
                          getMedalIcon(placement)
                        ) : (
                          <span className="text-lg font-bold text-slate-600 dark:text-slate-300">
                            {placement}
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
                                  key={`round-${i + 1}`}
                                  className="text-xs bg-slate-200 dark:bg-neo-navy-elevated px-1.5 py-0.5 rounded"
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
                          getPlacementColor(placement)
                        )}
                      >
                        {player.totalScore}
                      </Badge>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                        {t('hostView.totalScore')}
                      </p>
                    </div>
                  </div>
                </div>
              </m.div>
            );
          })}
        </div>

        {/* Session Stats */}
        <SessionStatsCard
          standings={standings}
          currentRound={currentRound}
          t={t}
        />

        {/* Winner announcement for completed tournament */}
        {isComplete && standings[0] && (
          <m.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="text-center p-4 bg-neo-lime rounded-lg shadow-xl border-3 border-neo-black"
          >
            <Star className="text-neo-black text-3xl mx-auto mb-2 animate-pulse" />
            <p className="text-sm font-medium text-neo-black">
              {t('hostView.tournamentWinner')}
            </p>
            <p className="text-2xl font-bold text-neo-black mt-1">
              {standings[0].username}
            </p>
            <p className="text-lg font-semibold text-neo-black">
              {standings[0].totalScore} {t('hostView.totalScore').toLowerCase()}
            </p>
          </m.div>
        )}
      </div>
    </Card>
  );
};

export default TournamentStandings;
