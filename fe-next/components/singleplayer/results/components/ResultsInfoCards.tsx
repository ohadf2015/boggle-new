'use client';

import { memo } from 'react';
import { TrendingUp, TrendingDown, Minus, Coins, Flame, Lock, Trophy, Zap, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import PlayerArchetypeBadge from '@/components/results/PlayerArchetypeBadge';
import { MiniSparkline } from '@/components/charts/MiniSparkline';
import { RankBadge } from '@/components/ui/RankBadge';
import { useSparklineTrend } from '@/hooks/useSparklineTrend';
import type { PlayerArchetype } from '@/utils/playerArchetypes';
import type { Participant } from '../useResultsData';
import type { CoinReward } from '@/components/results/CoinRewardDisplay';
import type { WinStreakDisplayData } from '../hooks/useWinStreakTracking';

interface ResultsInfoCardsProps {
  // Performance card
  currentScore: number;
  archetype: PlayerArchetype | null;
  // Leaderboard card
  participants: Participant[];
  mode: 'solo-bots' | 'practice' | 'challenge';
  // Rewards card
  coinReward: CoinReward | null;
  isAuthenticated: boolean;
  winStreakData: WinStreakDisplayData | null;
  achievementCount: number;
}

// ─── Card wrapper - cream neo-card style ───

function InfoCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      'bg-neo-cream text-neo-black border-4 border-neo-black rounded-neo-lg shadow-hard-lg p-4',
      className,
    )}>
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-black/40 mb-3">
      {children}
    </h4>
  );
}

// ─── Main component ───

export const ResultsInfoCards = memo(function ResultsInfoCards({
  currentScore,
  archetype,
  participants,
  mode,
  coinReward,
  isAuthenticated,
  winStreakData,
  achievementCount,
}: ResultsInfoCardsProps) {
  const { t } = useLanguage();
  const { sparklineScores, trend, hasSparkline } = useSparklineTrend(currentScore);
  const top5 = participants.slice(0, 5);
  const showLeaderboard = mode === 'solo-bots' && top5.length > 1;
  const coins = coinReward?.awarded || 0;
  const streak = winStreakData?.currentStreak || 0;

  return (
    <div className={cn(
      'grid gap-3 sm:gap-4',
      showLeaderboard ? 'md:grid-cols-3' : 'md:grid-cols-2',
    )}>
      {/* ── Card 1: Your Performance ── */}
      <InfoCard>
        <CardTitle>{t('results.yourPerformance') || 'Your Performance'}</CardTitle>

        {hasSparkline && (
          <div className="flex items-center gap-3 mb-3">
            <MiniSparkline data={sparklineScores} trend={trend} width={100} height={44} variant="light" />
            {trend && (
              <div className="flex items-center gap-1.5">
                <div className={cn(
                  'w-5 h-5',
                  trend.direction === 'up' && 'text-green-700',
                  trend.direction === 'down' && 'text-red-600',
                  trend.direction === 'stable' && 'text-cyan-700',
                )}>
                  {trend.direction === 'up' && <TrendingUp className="w-5 h-5" />}
                  {trend.direction === 'down' && <TrendingDown className="w-5 h-5" />}
                  {trend.direction === 'stable' && <Minus className="w-5 h-5" />}
                </div>
                <span className={cn(
                  'text-xs font-bold',
                  trend.direction === 'up' && 'text-green-700',
                  trend.direction === 'down' && 'text-red-600',
                  trend.direction === 'stable' && 'text-black/50',
                )}>
                  {trend.direction === 'up' && `+${Math.min(Math.abs(trend.percentChange), 999)}%`}
                  {trend.direction === 'down' && `${Math.max(trend.percentChange, -999)}%`}
                  {trend.direction === 'stable' && (t('chart.stable') || 'Stable')}
                </span>
              </div>
            )}
            {/* Archetype inline with sparkline when space allows */}
            {archetype && (
              <div className="ms-auto">
                <PlayerArchetypeBadge archetype={archetype} size="sm" showTooltip />
              </div>
            )}
          </div>
        )}

        {/* Stats row - always show when we have trend data */}
        {trend && (
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <div>
                <span className="text-sm font-black text-neo-black">{trend.bestScore}</span>
                <span className="text-[9px] text-black/40 block font-bold uppercase">{t('results.best') || 'Best'}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-cyan-700" />
              <div>
                <span className="text-sm font-black text-neo-black">{trend.averageScore}</span>
                <span className="text-[9px] text-black/40 block font-bold uppercase">{t('results.avg') || 'Avg'}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px]">🎮</span>
              <div>
                <span className="text-sm font-black text-neo-black">{trend.totalGames}</span>
                <span className="text-[9px] text-black/40 block font-bold uppercase">{t('results.games') || 'Games'}</span>
              </div>
            </div>
          </div>
        )}

        {!hasSparkline && !trend && (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-neo border-2 border-black/10 bg-black/5 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-black/30" />
            </div>
            <p className="text-black/40 text-xs">{t('chart.noHistory') || 'Play more games to see trends'}</p>
            {/* Archetype shown here when no sparkline */}
            {archetype && (
              <div className="ms-auto">
                <PlayerArchetypeBadge archetype={archetype} size="sm" showTooltip />
              </div>
            )}
          </div>
        )}
      </InfoCard>

      {/* ── Card 2: Leaderboard (solo-bots only) ── */}
      {showLeaderboard && (
        <InfoCard>
          <CardTitle>{t('results.standings') || 'Standings'}</CardTitle>
          <div className="space-y-0">
            {top5.map((p, i) => (
              <div
                key={p.name}
                className={cn(
                  'flex items-center justify-between py-1.5',
                  i < top5.length - 1 && 'border-b border-black/10',
                  p.isPlayer && 'bg-neo-lime/50 -mx-2 px-2 rounded border-2 border-neo-black/20',
                )}
              >
                <div className="flex items-center gap-2">
                  <RankBadge rank={i + 1} />
                  <span className={cn(
                    'text-sm font-bold truncate max-w-[120px]',
                    p.isPlayer ? 'text-neo-black' : 'text-black/70',
                  )}>
                    {p.name}
                  </span>
                </div>
                <span className={cn(
                  'text-sm font-black',
                  p.isPlayer ? 'text-neo-black' : 'text-black/50',
                )}>
                  {p.score}
                </span>
              </div>
            ))}
          </div>
        </InfoCard>
      )}

      {/* ── Card 3: Rewards ── */}
      <InfoCard>
        <CardTitle>{t('results.rewards') || 'Rewards'}</CardTitle>
        <div className="space-y-3">
          {/* Coins */}
          {coins > 0 && (
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 sm:w-12 sm:h-12 rounded-neo border-3 border-neo-black flex items-center justify-center shadow-hard-sm',
                isAuthenticated ? 'bg-neo-lime text-neo-black' : 'bg-slate-400 text-amber-600',
              )}>
                {isAuthenticated ? <Coins className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </div>
              <div>
                <span className={cn(
                  'font-black text-lg',
                  isAuthenticated ? 'text-green-800' : 'text-amber-700',
                )}>
                  +{coins}
                </span>
                <span className="text-[10px] text-black/40 block font-bold uppercase">
                  {t('results.dailyPlayBonus') || 'Daily Play Bonus'}
                </span>
              </div>
            </div>
          )}

          {/* Win Streak */}
          {streak > 0 && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-neo border-3 border-neo-black bg-neo-orange text-neo-black flex items-center justify-center shadow-hard-sm">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <span className="font-black text-lg text-orange-800">{streak}</span>
                <span className="text-[10px] text-black/40 block font-bold uppercase">
                  {t('results.keepItUp') || 'Keep it up!'}
                </span>
              </div>
            </div>
          )}

          {/* Achievements count */}
          {achievementCount > 0 && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-neo border-3 border-neo-black bg-neo-purple text-white flex items-center justify-center shadow-hard-sm">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <span className="font-black text-lg text-purple-800">{achievementCount}</span>
                <span className="text-[10px] text-black/40 block font-bold uppercase">
                  {t('results.achievementsUnlocked') || 'Trophies'}
                </span>
              </div>
            </div>
          )}

          {/* Guest CTA */}
          {!isAuthenticated && coins > 0 && (
            <div className="bg-neo-navy rounded-neo border-2 border-neo-black p-3 mt-2">
              <p className="text-xs font-bold text-neo-cream">
                {t('results.guestSavePrompt') || 'Sign in to save rewards'}
              </p>
            </div>
          )}

          {/* No rewards fallback */}
          {coins === 0 && streak === 0 && achievementCount === 0 && (
            <p className="text-black/40 text-xs">{t('results.noRewards') || 'Play more to earn rewards!'}</p>
          )}
        </div>
      </InfoCard>
    </div>
  );
});
