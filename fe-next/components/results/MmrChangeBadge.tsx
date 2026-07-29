'use client';

import React, { useEffect, useState } from 'react';
import { getMmdChanges, clearMmdChanges } from '@/lib/results/rankedResultStore';
import { getTierFromElo, type RankedTier } from '@/lib/ranked/tiers';

const TIER_ICONS: Record<string, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  platinum: '💎',
  diamond: '👑',
};

function getIcon(tier: RankedTier): string {
  return TIER_ICONS[tier.id] || '⭐';
}

interface MmdChangeBadgeProps {
  username: string;
}

/**
 * Displays the player's MMR change (ELO delta) from the most recent ranked match.
 * Shows an animated +/- value with the new rank tier icon.
 * Data comes from the shared rankedResultStore, set on validatedScores.
 */
export default function MmrChangeBadge({ username }: MmdChangeBadgeProps) {
  const [delta, setDelta] = useState<number | null>(null);
  const [newMmr, setNewMmr] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const changes = getMmdChanges();
    if (changes?.[username]) {
      setDelta(changes[username].delta);
      setNewMmr(changes[username].newMmr);
      // Animate in after a brief delay
      const timer = setTimeout(() => setVisible(true), 600);
      // Clean up so we don't show stale data on the next results page
      const clearTimer = setTimeout(() => clearMmdChanges(), 5000);
      return () => {
        clearTimeout(timer);
        clearTimeout(clearTimer);
      };
    }
    return undefined;
  }, [username]);

  if (!visible || delta === null || newMmr === null) return null;

  const isPositive = delta > 0;
  const tier = getTierFromElo(newMmr);
  const sign = isPositive ? '+' : '';
  const colorClass = isPositive
    ? 'text-emerald-400'
    : delta === 0
      ? 'text-gray-400'
      : 'text-red-400';

  return (
    <div className="flex items-center gap-2 text-sm animate-fadeIn">
      {/* MMR delta badge */}
      <span
        className={`font-bold text-lg tabular-nums ${colorClass}`}
        style={{
          animation: 'mmrDeltaPulse 0.4s ease-out',
        }}
      >
        {sign}{delta}
      </span>
      {/* Rank tier icon */}
      {tier && (
        <span className="text-lg" title={`${tier.name} (${newMmr})`}>
          {getIcon(tier)}
        </span>
      )}
    </div>
  );
}

/**
 * Creates the MMR rank badge displayed on the player's profile
 */
export function RankBadge({ mmr }: { mmr: number }) {
  const tier = getTierFromElo(mmr);
  if (!tier) return null;

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-semibold"
      style={{
        background: tier.color,
        color: '#fff',
        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
      }}
      title={`ELO: ${mmr}`}
    >
      <span>{getIcon(tier)}</span>
      <span>{tier.name}</span>
      <span className="opacity-70 text-xs ml-0.5">{mmr}</span>
    </div>
  );
}