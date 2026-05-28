'use client';

/**
 * DuelHistory - Duel History with Stats Panel
 *
 * Shows duel statistics and recent duel history
 * Flow: Load stats → Load history → Display with visual badges
 *
 * Features:
 * - Stats panel (wins/losses/draws, win streak, win rate)
 * - Recent duels list with win/loss/draw badges
 * - Empty state for no duels
 * - Neo-brutalist styling
 * - RTL support
 */

import { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { Swords, Trophy, X, Minus, Flame } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getDuelHistory,
  getDuelStats,
  type DuelHistoryEntry,
  type DuelStatsResult,
} from '@/lib/supabase/education/duels';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ui/Loader';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface DuelHistoryProps {
  /** Student ID to show history for */
  studentId: string;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// COMPONENT
// ============================================

export function DuelHistory({ studentId, className }: DuelHistoryProps) {
  const { t } = useLanguage();

  // State
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DuelStatsResult | null>(null);
  const [history, setHistory] = useState<DuelHistoryEntry[]>([]);

  // ============================================
  // EFFECTS
  // ============================================

  // Load stats and history on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const [statsResult, historyResult] = await Promise.all([
        getDuelStats(studentId),
        getDuelHistory(studentId, 20),
      ]);

      if (statsResult.data) {
        setStats(statsResult.data);
      }

      if (historyResult.data) {
        setHistory(historyResult.data);
      }

      setLoading(false);
    }

    loadData();
  }, [studentId]);

  // ============================================
  // RENDER HELPERS
  // ============================================

  // Calculate win rate
  const winRate = stats
    ? stats.wins + stats.losses + stats.draws === 0
      ? 0
      : (stats.wins / (stats.wins + stats.losses + stats.draws)) * 100
    : 0;

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader size="lg" />
        <p className="ms-4 text-neo-white">{t('duels.loading')}</p>
      </div>
    );
  }

  // Empty state
  if (!stats || (stats.wins === 0 && stats.losses === 0 && stats.draws === 0)) {
    return (
      <div className={cn('max-w-4xl mx-auto p-6', className)}>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <Swords className="w-16 h-16 text-neo-white mb-4" />
          <h2 className="text-2xl font-neo-display font-bold text-neo-white mb-2">
            {t('duels.noDuelsYet')}
          </h2>
          <p className="text-neo-white">{t('duels.challengeClassmate')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('max-w-4xl mx-auto p-6', className)}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-6 h-6 text-neo-lime" />
        <h1 className="text-2xl font-neo-display font-bold text-neo-white">
          {t('duels.duelHistory')}
        </h1>
      </div>

      {/* Stats Panel */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {/* Wins */}
        <div className="p-4 bg-green-600 border-neo rounded-neo shadow-hard">
          <p className="text-xs text-white uppercase tracking-wide mb-1">
            {t('duels.wins')}
          </p>
          <p className="text-3xl font-neo-display font-bold text-white">{stats.wins}</p>
        </div>

        {/* Losses */}
        <div className="p-4 bg-red-600 border-neo rounded-neo shadow-hard">
          <p className="text-xs text-white uppercase tracking-wide mb-1">
            {t('duels.losses')}
          </p>
          <p className="text-3xl font-neo-display font-bold text-white">{stats.losses}</p>
        </div>

        {/* Draws */}
        <div className="p-4 bg-yellow-500 border-neo rounded-neo shadow-hard">
          <p className="text-xs text-white uppercase tracking-wide mb-1">
            {t('duels.draws')}
          </p>
          <p className="text-3xl font-neo-display font-bold text-white">{stats.draws}</p>
        </div>

        {/* Win Streak */}
        <div className="p-4 bg-neo-pink border-neo rounded-neo shadow-hard">
          <p className="text-xs text-white uppercase tracking-wide mb-1">
            {t('duels.winStreak')}
          </p>
          <div className="flex items-center gap-2">
            {stats.winStreak >= 3 && <Flame className="w-5 h-5 text-white" />}
            <p className="text-3xl font-neo-display font-bold text-white">
              {stats.winStreak}
            </p>
          </div>
        </div>

        {/* Win Rate */}
        <div className="p-4 bg-neo-cyan border-neo rounded-neo shadow-hard">
          <p className="text-xs text-neo-black/70 uppercase tracking-wide mb-1">
            {t('duels.winRate')}
          </p>
          <p className="text-3xl font-neo-display font-bold text-neo-black">
            {winRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Recent Duels */}
      <div>
        <h2 className="text-lg font-neo-display font-bold text-neo-white mb-4">
          {t('duels.recentDuels')}
        </h2>

        <div className="space-y-3">
          {history.map((duel) => {
            const isDraw = duel.winner_id === null;
            const isWin = duel.isWin;
            const isLoss = !isWin && !isDraw;

            // Determine opponent based on perspective
            const opponent =
              duel.challenger_id === studentId ? duel.opponent : duel.challenger;

            // Determine scores based on perspective
            const studentScore =
              duel.challenger_id === studentId
                ? duel.challenger_score
                : duel.opponent_score;
            const opponentScore =
              duel.challenger_id === studentId
                ? duel.opponent_score
                : duel.challenger_score;

            return (
              <m.div
                key={duel.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  'p-4 rounded-neo border-neo shadow-hard flex items-center gap-4',
                  'bg-neo-navy',
                  isWin && 'border-l-4 border-l-green-500',
                  isLoss && 'border-l-4 border-l-red-500',
                  isDraw && 'border-l-4 border-l-yellow-500'
                )}
                data-testid={
                  isDraw
                    ? 'duel-entry-draw'
                    : isWin
                    ? 'duel-entry-win'
                    : 'duel-entry-loss'
                }
              >
                {/* Badge */}
                <div
                  className={cn(
                    'shrink-0 w-10 h-10 rounded-neo border-neo shadow-hard flex items-center justify-center',
                    isWin && 'bg-green-500',
                    isLoss && 'bg-red-500',
                    isDraw && 'bg-yellow-500'
                  )}
                >
                  {isWin && <Trophy className="w-5 h-5 text-white" />}
                  {isLoss && <X className="w-5 h-5 text-white" />}
                  {isDraw && <Minus className="w-5 h-5 text-white" />}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <p className="text-neo-white font-neo-body font-bold mb-1">
                    {t('duels.vs')} {opponent.display_name}
                  </p>
                  <p className="text-sm text-neo-white">
                    {t('duels.you')}: {studentScore} {t('duels.vs')} {opponent.display_name}:{' '}
                    {opponentScore}
                  </p>
                </div>
              </m.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
