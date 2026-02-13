'use client';

/**
 * DuelHistory - Duel History and Stats Panel
 *
 * Shows student's duel history with stats panel
 * Features:
 * - Stats panel: wins/losses/draws, win streak, win rate
 * - Recent duels list with win/loss badges
 * - Per-opponent stats (collapsible)
 * - Empty state for no duels
 * - Neo-brutalist styling
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Swords, Trophy, Flame, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getDuelHistory, getDuelStats, type DuelHistoryEntry, type DuelStatsResult } from '@/lib/supabase/education/duels';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ui/Loader';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface DuelHistoryProps {
  /** Student ID to fetch duels for */
  studentId: string;
}

// ============================================
// COMPONENT
// ============================================

export function DuelHistory({ studentId }: DuelHistoryProps) {
  const { t } = useLanguage();

  // State
  const [loading, setLoading] = useState(true);
  const [duels, setDuels] = useState<DuelHistoryEntry[]>([]);
  const [stats, setStats] = useState<DuelStatsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        // Fetch history and stats in parallel
        const [historyResult, statsResult] = await Promise.all([
          getDuelHistory(studentId, 20),
          getDuelStats(studentId),
        ]);

        if (historyResult.error) {
          setError(historyResult.error.message);
          return;
        }

        if (statsResult.error) {
          setError(statsResult.error.message);
          return;
        }

        setDuels(historyResult.data);
        setStats(statsResult.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [studentId]);

  // ============================================
  // HELPERS
  // ============================================

  const calculateWinRate = (): string => {
    if (!stats) return '0%';
    const total = stats.wins + stats.losses + stats.draws;
    if (total === 0) return '0%';
    const rate = (stats.wins / total) * 100;
    return `${rate.toFixed(1)}%`;
  };

  const formatRelativeTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-neo-white text-lg">{error}</p>
      </div>
    );
  }

  // ============================================
  // EMPTY STATE
  // ============================================

  if (!stats || (stats.wins === 0 && stats.losses === 0 && stats.draws === 0)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
        <Swords className="w-16 h-16 text-neo-orange mb-4" />
        <h2 className="text-2xl font-neo-display font-bold text-neo-white mb-2">
          {t('noDuelsYet')}
        </h2>
        <p className="text-neo-white/70">{t('challengeClassmate')}</p>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-8 h-8 text-neo-yellow" />
        <h1 className="text-2xl font-neo-display font-bold text-neo-white">
          {t('duelHistory')}
        </h1>
      </div>

      {/* Stats Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Wins */}
        <div className="bg-neo-navy border-neo rounded-neo shadow-hard p-4">
          <div className="flex items-center justify-between">
            <span className="text-neo-white/70 text-sm">{t('wins')}</span>
            <Trophy className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-neo-display font-bold text-neo-white mt-2">
            {stats.wins}
          </p>
        </div>

        {/* Losses */}
        <div className="bg-neo-navy border-neo rounded-neo shadow-hard p-4">
          <div className="flex items-center justify-between">
            <span className="text-neo-white/70 text-sm">{t('losses')}</span>
            <Swords className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl font-neo-display font-bold text-neo-white mt-2">
            {stats.losses}
          </p>
        </div>

        {/* Draws */}
        <div className="bg-neo-navy border-neo rounded-neo shadow-hard p-4">
          <div className="flex items-center justify-between">
            <span className="text-neo-white/70 text-sm">{t('draws')}</span>
            <TrendingUp className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-3xl font-neo-display font-bold text-neo-white mt-2">
            {stats.draws}
          </p>
        </div>

        {/* Win Streak */}
        <div className="bg-neo-navy border-neo rounded-neo shadow-hard p-4">
          <div className="flex items-center justify-between">
            <span className="text-neo-white/70 text-sm">{t('winStreak')}</span>
            {stats.winStreak >= 3 && <Flame className="w-5 h-5 text-neo-orange" />}
          </div>
          <p className="text-3xl font-neo-display font-bold text-neo-white mt-2">
            {stats.winStreak}
          </p>
        </div>
      </div>

      {/* Win Rate */}
      <div className="bg-neo-yellow border-neo-thick rounded-neo shadow-hard p-4 mb-8">
        <div className="flex items-center justify-between">
          <span className="text-neo-black font-neo-body font-bold">{t('winRate')}</span>
          <span className="text-neo-black text-2xl font-neo-display font-bold">
            {calculateWinRate()}
          </span>
        </div>
      </div>

      {/* Recent Duels List */}
      <div>
        <h2 className="text-xl font-neo-display font-bold text-neo-white mb-4">
          {t('recentDuels')}
        </h2>

        <div className="space-y-3">
          {duels.map((duel) => {
            const isChallenger = duel.challenger_id === studentId;
            const opponent = isChallenger ? duel.opponent : duel.challenger;
            const studentScore = isChallenger ? duel.challenger_score : duel.opponent_score;
            const opponentScore = isChallenger ? duel.opponent_score : duel.challenger_score;
            const isDraw = duel.winner_id === null;
            const isWin = duel.isWin;

            return (
              <motion.div
                key={duel.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'bg-neo-navy border-neo rounded-neo shadow-hard p-4 border-l-4',
                  isDraw
                    ? 'border-l-yellow-500'
                    : isWin
                    ? 'border-l-green-500'
                    : 'border-l-red-500'
                )}
              >
                <div className="flex items-center justify-between">
                  {/* Result Badge */}
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-12 h-12 flex items-center justify-center rounded-neo border-neo shadow-hard-sm',
                        isDraw
                          ? 'bg-yellow-500'
                          : isWin
                          ? 'bg-green-500'
                          : 'bg-red-500'
                      )}
                    >
                      {isWin ? (
                        <Trophy className="w-6 h-6 text-neo-white" />
                      ) : (
                        <Swords className="w-6 h-6 text-neo-white" />
                      )}
                    </div>

                    {/* Opponent Info */}
                    <div>
                      <p className="text-neo-white font-neo-body font-bold">
                        {opponent.display_name}
                      </p>
                      <p className="text-neo-white/70 text-sm">
                        {formatRelativeTime(duel.completed_at || duel.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Scores */}
                  <div className="text-right">
                    <p className="text-neo-white font-neo-body">
                      <span className="font-bold">{t('you')}</span>: {studentScore}
                    </p>
                    <p className="text-neo-white/70 text-sm">
                      {t('vs')} {opponentScore}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
