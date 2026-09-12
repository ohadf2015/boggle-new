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
import { readStudentName } from '@/lib/education/duelOpponentNames';
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

      try {
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
      } catch (error) {
        console.error('[DuelHistory] Failed to load duel data:', error);
        // Leave stats/history empty so empty state renders
      } finally {
        setLoading(false);
      }
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

      {/* Record strip — one card, not five coloured squares. White-on-yellow at
          12px was 1.9:1, five accents at once broke the colour rule, and the
          grid cost ~180px on a screen that now has a fixed height budget. */}
      <div
        data-testid="duel-record-strip"
        className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-neo border-[3px] border-neo-black bg-neo-cream px-4 py-3 shadow-hard"
      >
        <div>
          <p className="font-neo-body text-[10px] font-black uppercase tracking-widest text-neo-black/70">
            {t('duels.wins')}
          </p>
          <p className="font-neo-display text-2xl font-black tabular-nums leading-none text-neo-black">
            {stats.wins}
          </p>
        </div>
        <div>
          <p className="font-neo-body text-[10px] font-black uppercase tracking-widest text-neo-black/70">
            {t('duels.losses')}
          </p>
          <p className="font-neo-display text-2xl font-black tabular-nums leading-none text-neo-black">
            {stats.losses}
          </p>
        </div>
        <div>
          <p className="font-neo-body text-[10px] font-black uppercase tracking-widest text-neo-black/70">
            {t('duels.winRate')}
          </p>
          <p className="font-neo-display text-2xl font-black tabular-nums leading-none text-neo-black">
            {winRate.toFixed(1)}%
          </p>
        </div>

        {stats.winStreak > 0 && (
          <span
            data-testid="duel-streak-chip"
            className="ms-auto inline-flex items-center gap-1.5 rounded-neo border-[2px] border-neo-black bg-neo-orange px-2.5 py-1 shadow-hard-sm"
          >
            <Flame className="h-4 w-4 text-neo-black" aria-hidden="true" />
            <span className="font-neo-display text-lg font-black tabular-nums leading-none text-neo-black">
              {stats.winStreak}
            </span>
            <span className="font-neo-body text-[10px] font-black uppercase tracking-widest text-neo-black">
              {t('duels.winStreak')}
            </span>
          </span>
        )}
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

            /**
             * Who you played — and the name may simply not exist.
             *
             * `challenger:profiles(...)` / `opponent:profiles(...)` come back
             * NULL for anybody but yourself: own-row RLS on `profiles` returns
             * zero rows with `error: null`, so the embed resolves to null
             * rather than to a row with a blank name. Reading `.display_name`
             * off that threw a TypeError and took the whole History tab into
             * the generic error boundary on every open.
             *
             * The lobby banks every classmate's name against their user id, so
             * ask that before falling back to the translated "Opponent".
             */
            const opponentProfile =
              duel.challenger_id === studentId ? duel.opponent : duel.challenger;
            const opponentUserId =
              duel.challenger_id === studentId ? duel.opponent_id : duel.challenger_id;
            const opponentName =
              opponentProfile?.display_name?.trim() ||
              (opponentUserId ? readStudentName(opponentUserId) : null) ||
              t('common.opponent');

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
                  'p-4 rounded-neo border-[2px] border-neo-cream shadow-hard flex items-center gap-4',
                  'bg-neo-navy',
                  isWin && 'border-s-4 border-s-green-500',
                  isLoss && 'border-s-4 border-s-red-500',
                  isDraw && 'border-s-4 border-s-yellow-500'
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
                    'shrink-0 w-10 h-10 rounded-neo border-[2px] border-neo-cream shadow-hard flex items-center justify-center',
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
                    {t('duels.vs')} {opponentName}
                  </p>
                  <p className="text-sm text-neo-white">
                    {t('duels.you')}: {studentScore} {t('duels.vs')} {opponentName}:{' '}
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
