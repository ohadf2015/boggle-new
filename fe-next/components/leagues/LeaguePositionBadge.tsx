'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLeague, type LeagueTier } from '@/hooks/useLeague';

const TIER_COLORS: Record<LeagueTier, string> = {
  bronze: 'text-amber-600',
  silver: 'text-gray-300',
  gold: 'text-yellow-400',
  diamond: 'text-cyan-300',
  ruby: 'text-red-400',
};

const TIER_BG: Record<LeagueTier, string> = {
  bronze: 'bg-amber-900/30',
  silver: 'bg-neo-navy-elevated/30',
  gold: 'bg-yellow-900/30',
  diamond: 'bg-cyan-900/30',
  ruby: 'bg-red-900/30',
};

const TIER_EMOJI: Record<LeagueTier, string> = {
  bronze: '\u{1F949}',
  silver: '\u{1F948}',
  gold: '\u{1F947}',
  diamond: '\u{1F48E}',
  ruby: '\u{2764}\u{FE0F}',
};

function interpolate(template: string, vars: Record<string, string | number>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(`{${key}}`, String(value));
  }
  return result;
}

/**
 * Compact badge showing the player's league tier, position, and XP gap.
 * Designed for the home/landing page — small footprint, high social pressure.
 */
export function LeaguePositionBadge() {
  const { t, language } = useLanguage();
  const { isAuthenticated, profile } = useAuth();
  const { tier, standings, myPosition, myXp, promotionZone, isLoading, error } = useLeague(
    profile?.id ?? null
  );

  const xpGap = useMemo(() => {
    if (!myPosition || standings.length === 0) return null;

    // XP to promotion boundary (position at promotionZone)
    const promoPlayer = standings[promotionZone - 1]; // 0-indexed, last promotion slot
    const xpToPromote = promoPlayer && myPosition > promotionZone
      ? promoPlayer.weeklyXp - myXp
      : null;

    // XP above relegation boundary
    const relegationStart = standings.length - 4; // bottom 5
    const relegationPlayer = standings[relegationStart]; // first player in relegation
    const xpAboveRelegation = relegationPlayer && myPosition <= relegationStart
      ? myXp - relegationPlayer.weeklyXp
      : null;

    return { xpToPromote, xpAboveRelegation };
  }, [myPosition, standings, myXp, promotionZone]);

  // Don't render for guests or while loading with no data
  if (!isAuthenticated || (!isLoading && !myPosition)) return null;

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-2 border-3 border-black rounded-neo shadow-hard-sm bg-neo-navy/60 px-3 py-1.5 animate-pulse">
        <div className="w-16 h-4 bg-neo-white/10 rounded" />
        <div className="w-12 h-4 bg-neo-white/10 rounded" />
      </div>
    );
  }

  if (error || !myPosition) return null;

  const tierName = t(`league.${tier}`) || tier;
  const positionText = interpolate(t('league.positionOf') || '#{position} of {total}', {
    position: myPosition,
    total: standings.length,
  });

  // Determine which gap message to show
  let gapText: string | null = null;
  let gapColor = 'text-neo-white';

  if (xpGap?.xpToPromote != null && xpGap.xpToPromote > 0) {
    gapText = interpolate(t('league.xpToPromote') || '{xp} XP to promote', {
      xp: xpGap.xpToPromote,
    });
    gapColor = 'text-green-400';
  } else if (xpGap?.xpAboveRelegation != null) {
    gapText = interpolate(t('league.xpAboveRelegation') || '{xp} XP above relegation', {
      xp: xpGap.xpAboveRelegation,
    });
    gapColor = xpGap.xpAboveRelegation <= 50 ? 'text-red-400' : 'text-neo-white';
  }

  return (
    <Link
      href={`/${language}/leaderboard`}
      className="inline-flex items-center gap-2 border-3 border-black rounded-neo shadow-hard-sm bg-neo-navy/80 px-3 py-1.5 hover:shadow-hard-pressed active:shadow-hard-pressed transition-shadow cursor-pointer no-underline"
    >
      {/* Tier icon + name */}
      <span className={`font-neo-display text-sm font-bold ${TIER_COLORS[tier]}`}>
        <span className="me-1" aria-hidden="true">{TIER_EMOJI[tier]}</span>
        {tierName}
      </span>

      {/* Divider */}
      <span className="w-px h-4 bg-neo-white/20" aria-hidden="true" />

      {/* Position */}
      <span className={`font-mono text-xs font-bold ${TIER_BG[tier]} ${TIER_COLORS[tier]} px-1.5 py-0.5 rounded`}>
        {positionText}
      </span>

      {/* XP gap hint */}
      {gapText && (
        <>
          <span className="w-px h-4 bg-neo-white/20" aria-hidden="true" />
          <span className={`text-xs ${gapColor}`}>{gapText}</span>
        </>
      )}
    </Link>
  );
}
