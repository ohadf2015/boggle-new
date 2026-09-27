'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Trophy, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import Avatar from '../Avatar';
import SessionStatsCard from './SessionStatsCard';
import type { SeriesStanding } from '@/hooks/useSeriesTracker';

interface SeriesStandingsBannerProps {
  standings: SeriesStanding[];
  roundNumber: number;
  totalGames?: number;
  seriesLeader?: string | null;
  currentUsername?: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Compact mode for mobile */
  compact?: boolean;
}

const RANK_COLORS = ['text-neo-yellow', 'text-slate-300', 'text-amber-600'];
const RANK_BG = ['bg-neo-yellow/20', 'bg-slate-300/10', 'bg-amber-600/10'];

const SeriesStandingsBanner: React.FC<SeriesStandingsBannerProps> = ({
  standings,
  roundNumber,
  totalGames,
  seriesLeader,
  currentUsername,
  t,
  compact = false,
}) => {
  // Only show after 2+ rounds
  if (roundNumber < 2 || standings.length === 0) return null;

  const sessionStandings = standings.map(s => ({
    username: s.username,
    totalScore: s.totalScore,
    roundScores: s.roundScores,
  }));

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="bg-neo-navy-light/60 border-3 border-neo-white/20 rounded-neo p-3 shadow-hard"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-neo-yellow" />
          <span className="text-xs font-black uppercase tracking-widest text-neo-white">
            {t('results.series.title')}
          </span>
        </div>
        <span className="text-xs font-bold text-neo-white">
          {totalGames
            ? t('results.series.gameXofY', { current: roundNumber, total: totalGames })
            : t('results.series.gameCount', { count: roundNumber })}
        </span>
      </div>

      {/* Standings List */}
      <div className="space-y-1">
        {standings.map((player, index) => {
          const isCurrentUser = player.username === currentUsername;
          const isTopThree = index < 3;

          return (
            <div
              key={player.username}
              data-testid={`series-player-${player.username}`}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded-neo border-2 transition-colors',
                isCurrentUser
                  ? 'border-neo-cyan bg-neo-cyan/10'
                  : 'border-transparent',
                isTopThree && !isCurrentUser && RANK_BG[index]
              )}
            >
              {/* Rank */}
              <span
                className={cn(
                  'w-5 text-center font-black text-sm',
                  isTopThree ? RANK_COLORS[index] : 'text-neo-white'
                )}
              >
                {player.currentRank}
              </span>

              {/* Avatar */}
              <Avatar
                customAvatar={player.avatar?.customAvatar}
                userId={player.username}
                size="sm"
              />

              {/* Name + Round Scores */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      'text-sm font-bold truncate',
                      isCurrentUser ? 'text-neo-cyan' : 'text-neo-white'
                    )}
                  >
                    {player.username}
                  </span>
                  {/* Rank Change Arrow */}
                  {player.rankChange > 0 && (
                    <span
                      data-testid={`rank-up-${player.username}`}
                      className="text-neo-lime flex items-center"
                    >
                      <ArrowUp className="w-3 h-3" />
                      <span className="text-[10px] font-bold">{player.rankChange}</span>
                    </span>
                  )}
                  {player.rankChange < 0 && (
                    <span
                      data-testid={`rank-down-${player.username}`}
                      className="text-neo-pink flex items-center"
                    >
                      <ArrowDown className="w-3 h-3" />
                      <span className="text-[10px] font-bold">{Math.abs(player.rankChange)}</span>
                    </span>
                  )}
                </div>
                {/* Round score pills */}
                {!compact && (
                  <div className="flex gap-0.5 mt-0.5">
                    {player.roundScores.map((score, i) => (
                      <span
                        key={`round-${i}`}
                        className={cn(
                          'text-[10px] px-1 py-0 rounded bg-neo-white/10 text-neo-white',
                          i === player.roundScores.length - 1 && 'bg-neo-white/20 text-neo-white font-bold'
                        )}
                        title={`${t('results.series.round', { num: i + 1 }) || `R${i + 1}`}: ${score}`}
                      >
                        {score}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Wins + Total Score */}
              <div className="flex items-center gap-2">
                {player.roundWins > 0 && (
                  <span className="text-[10px] font-bold text-neo-lime bg-neo-lime/15 px-1 rounded">
                    {player.roundWins}W
                  </span>
                )}
                <span
                  className={cn(
                    'text-sm font-black',
                    isCurrentUser ? 'text-neo-cyan' : 'text-neo-white',
                    seriesLeader === player.username && 'text-neo-lime'
                  )}
                >
                  {player.totalScore}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Session Stats (interesting facts) */}
      <SessionStatsCard
        standings={sessionStandings}
        currentRound={roundNumber}
        currentUsername={currentUsername}
        t={t}
      />
    </m.div>
  );
};

export default SeriesStandingsBanner;
