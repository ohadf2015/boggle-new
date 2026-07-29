'use client';

/**
 * CreatorProfileStats
 *
 * Displays a creator's UGC stats in a neo-brutalist card.
 * Shown on the profile page when the user has created at least one board.
 */

import React from 'react';
import Link from 'next/link';
import { LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

// ─── Types ─────────────────────────────────────────────────────────────────

interface CreatorStats {
  boardsCreated: number;
  totalPlays: number;
  totalRatings: number;
  averageRating: number;
}

interface CreatorProfileStatsProps {
  stats: CreatorStats;
  className?: string;
}

// ─── Tier logic ────────────────────────────────────────────────────────────

type CreatorTierKey =
  | 'ugc.creator.tier.apprentice'
  | 'ugc.creator.tier.puzzleMaker'
  | 'ugc.creator.tier.crowdPleaser'
  | 'ugc.creator.tier.masterCrafter';

interface CreatorTier {
  labelKey: CreatorTierKey;
  icon: string;
}

function calculateCreatorTier(stats: CreatorStats): CreatorTier {
  const { boardsCreated, totalPlays } = stats;

  // MASTER_CRAFTER: prolific AND popular
  if (boardsCreated >= 20 && totalPlays >= 500) {
    return { labelKey: 'ugc.creator.tier.masterCrafter', icon: '👑' };
  }
  // PUZZLE_MAKER: created enough boards (board count takes priority)
  if (boardsCreated >= 3) {
    return { labelKey: 'ugc.creator.tier.puzzleMaker', icon: '🧩' };
  }
  // CROWD_PLEASER: viral board — lots of plays even without many creations
  if (totalPlays >= 100) {
    return { labelKey: 'ugc.creator.tier.crowdPleaser', icon: '🎭' };
  }
  // APPRENTICE: first board
  return { labelKey: 'ugc.creator.tier.apprentice', icon: '🌱' };
}

// ─── Sub-components ────────────────────────────────────────────────────────

interface StatCellProps {
  value: string | number;
  labelKey: string;
}

function StatCell({ value, labelKey }: StatCellProps) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center gap-0.5 p-2 rounded-neo border-2 border-neo-black bg-neo-navy">
      <span className="text-xl font-black text-neo-yellow leading-none">{value}</span>
      <span className="text-[10px] font-bold uppercase tracking-wide text-neo-white text-center">
        {t(labelKey)}
      </span>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export default function CreatorProfileStats({ stats, className }: CreatorProfileStatsProps) {
  const { t } = useLanguage();

  if (!stats || stats.boardsCreated === 0) return null;

  const tier = calculateCreatorTier(stats);

  return (
    <section
      className={cn(
        'rounded-neo border-3 border-neo-black shadow-hard bg-neo-navy p-4',
        className
      )}
      aria-label={t('ugc.creator.stats')}
    >
      {/* Heading row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-neo-yellow" aria-hidden="true" />
          <h2 className="text-sm font-black uppercase tracking-wide text-neo-white">
            {t('ugc.creator.stats')}
          </h2>
        </div>

        {/* Tier badge */}
        <div
          data-testid="creator-tier-badge"
          className="flex items-center gap-1 px-2 py-0.5 rounded border-2 border-neo-black bg-neo-yellow"
        >
          <span aria-hidden="true">{tier.icon}</span>
          <span className="text-[10px] font-black uppercase text-neo-black">
            {t(tier.labelKey)}
          </span>
        </div>
      </div>

      {/* 2×2 stat grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <StatCell value={stats.boardsCreated} labelKey="ugc.creator.boardsCreated" />
        <StatCell value={stats.totalPlays} labelKey="ugc.creator.totalPlays" />
        <StatCell value={stats.totalRatings} labelKey="ugc.creator.totalRatings" />
        <StatCell value={stats.averageRating.toFixed(1)} labelKey="ugc.creator.avgRating" />
      </div>

      {/* My Boards link */}
      <Link
        href="/community?tab=mine"
        className={cn(
          'block w-full text-center py-2 rounded-neo border-2 border-neo-black',
          'bg-neo-yellow text-neo-black font-black text-sm',
          'shadow-hard-sm hover:shadow-none hover:translate-x-1 hover:translate-y-1',
          'transition-all duration-100'
        )}
        aria-label={t('ugc.creator.myBoards')}
      >
        {t('ugc.creator.myBoards')}
      </Link>
    </section>
  );
}
