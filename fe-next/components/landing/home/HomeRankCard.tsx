'use client';

import React, { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { getUserRank } from '@/lib/supabase';
import { getXpProgress, getLevelTier } from '@/backend/modules/xpManager';
import { clampPercent } from '@/lib/landing/homeHubFormat';

interface HomeRankCardProps {
  /** all-time best score from usePlayerStats (null when none yet) */
  playerAllTimeBest: { score: number } | null;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * HomeRankCard — "Your Rank" progress card for the mobile Home Hub.
 * Left: global rank (#N, from `getUserRank`). Right: current league tier + a
 * striped XP bar (real `xpManager` within-level progress) + best score.
 * All real data — rank shows a dash until it loads; XP/level derive from
 * `profile.total_xp`; best-score line hides when the player has no score yet.
 */
export function HomeRankCard({ playerAllTimeBest, t }: HomeRankCardProps) {
  const { isAuthenticated, profile } = useAuth();
  const [rank, setRank] = useState<number | null>(null);
  // Gate profile/score-derived values behind mount so SSR + first client render
  // agree (auth + player stats resolve client-side; `.toLocaleString()` is
  // locale-dependent) → no hydration mismatch. Real values commit after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isAuthenticated || !profile?.id) return;
    let cancelled = false;
    getUserRank(profile.id).then(({ data }) => {
      if (!cancelled && data) setRank(data.rank_position);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, profile?.id]);

  const p = mounted ? profile : null;
  const progress = getXpProgress(p?.total_xp ?? 0);
  const level = p?.current_level ?? progress.currentLevel;
  const tier = getLevelTier(level);
  const tierLabel = t(`landing.home.tier.${tier.toLowerCase()}`);
  const xpToNext = Math.max(0, progress.xpNeededForNextLevel - progress.xpInCurrentLevel);
  const barPct = clampPercent(progress.progressPercent);
  const best = mounted ? playerAllTimeBest?.score ?? 0 : 0;

  return (
    <div className="flex items-center gap-3.5 rounded-neo-xl border-neo-thick border-black bg-neo-navy-light p-3.5 shadow-hard-lg">
      {/* rank */}
      <div className="flex shrink-0 flex-col items-center">
        <span className="font-neo-body text-[10px] font-semibold uppercase tracking-wider text-neo-white/55">
          {t('landing.home.rank')}
        </span>
        <span className="font-neo-display text-[26px] font-bold leading-none text-neo-cream tabular-nums">
          {rank ? `#${rank.toLocaleString()}` : '—'}
        </span>
        {progress.isMaxLevel && (
          <span className="inline-flex items-center gap-0.5 font-neo-display text-[11px] font-semibold text-neo-lime">
            <ArrowUp className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" /> {t('landing.home.maxLevel')}
          </span>
        )}
      </div>

      {/* league + xp */}
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="truncate font-neo-display text-[13px] font-semibold text-neo-cream">{tierLabel}</span>
          {!progress.isMaxLevel && (
            <span className="shrink-0 font-neo-body text-[11px] font-medium text-neo-white/55 tabular-nums">
              {t('landing.home.xpToNext', { xp: xpToNext.toLocaleString(), level: level + 1 })}
            </span>
          )}
        </div>
        {/* striped XP bar */}
        <div className="relative h-[13px] overflow-hidden rounded-neo-pill border-2 border-black bg-neo-navy">
          <div
            className="absolute inset-y-0 start-0 border-e-2 border-black"
            style={{
              width: `${barPct}%`,
              background: 'repeating-linear-gradient(45deg, var(--neo-lime) 0 7px, #a8e600 7px 14px)',
            }}
          />
        </div>
        {best > 0 && (
          <div className="mt-1.5 font-neo-body text-[11px] font-medium text-neo-white/55">
            {t('landing.home.bestScore')}:{' '}
            <span className="font-semibold text-neo-cyan tabular-nums">{best.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default HomeRankCard;
