'use client';

/**
 * ChaseBanner — one line above the daily leaderboard naming the single player to
 * beat and the points it takes to do it.
 *
 * A rank is a verdict; a gap is an invitation. On boards of 2–8 players a
 * percentile means nothing, but "42 behind Maya" is a target the next word can
 * close — so this is the surface that carries the competitive motivation.
 */

import React, { memo, useMemo } from 'react';
import { Swords, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { computeChaseTarget, type ChaseParticipant } from './chaseTarget';

export interface ChaseBannerProps {
  participants: ChaseParticipant[];
  playerId?: string | null;
  guestFingerprint?: string | null;
  /** Full board size when `participants` is a paginated slice. */
  totalPlayers?: number;
  /** Suppresses render until the board resolves — never show a rank we may flip. */
  loading?: boolean;
  t: (key: string) => string;
  className?: string;
}

function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (out, [key, value]) => out.replace(`{${key}}`, String(value)),
    template,
  );
}

const ChaseBanner: React.FC<ChaseBannerProps> = memo(({
  participants,
  playerId,
  guestFingerprint,
  totalPlayers,
  loading = false,
  t,
  className,
}) => {
  const target = useMemo(
    () => computeChaseTarget(participants, { playerId, guestFingerprint, totalPlayers }),
    [participants, playerId, guestFingerprint, totalPlayers],
  );

  // Rank arrives from the network while the local score is already on screen —
  // rendering an optimistic placement the server later corrects would flash a
  // wrong rank on the highest-stakes moment in the app. Stay silent until it lands.
  if (loading || !target) return null;

  const leading = target.mode === 'leading';
  const Icon = leading ? Shield : Swords;

  // pointsGap is null when the board ranks on something other than the number it
  // shows — name the target, skip the number. See computeChaseTarget.
  const headlineKey = target.pointsGap === null
    ? (leading ? 'daily.chaseLeadingNoGap' : 'daily.chaseChasingNoGap')
    : (leading ? 'daily.chaseLeading' : 'daily.chaseChasing');

  const headline = fill(t(headlineKey), {
    name: target.targetName,
    points: target.pointsGap ?? 0,
  });

  const nudge = t(leading ? 'daily.chaseLeadingCta' : 'daily.chaseChasingCta');
  const rankLabel = fill(t('daily.chaseRank'), {
    rank: target.rank,
    total: target.totalPlayers,
  });

  return (
    <div
      role="status"
      data-testid="chase-banner"
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-neo border-3 border-black shadow-hard-sm',
        leading
          ? 'bg-neo-lime/15 border-neo-lime/50'
          : 'bg-neo-cyan/15 border-neo-cyan/50',
        className,
      )}
    >
      <Icon
        className={cn('w-5 h-5 shrink-0', leading ? 'text-neo-lime' : 'text-neo-cyan')}
        aria-hidden="true"
      />

      <div className="min-w-0 flex-1">
        <p className="font-neo-display font-black text-sm text-neo-white truncate">
          {headline}
        </p>
        <p className="text-[11px] font-bold uppercase tracking-wide text-neo-white/60 truncate">
          {nudge}
        </p>
      </div>

      <span
        className={cn(
          'shrink-0 px-2.5 py-1 rounded-full text-xs font-black tabular-nums border-2',
          leading
            ? 'bg-neo-lime/20 border-neo-lime/50 text-neo-lime'
            : 'bg-neo-cyan/20 border-neo-cyan/50 text-neo-cyan',
        )}
      >
        {rankLabel}
      </span>
    </div>
  );
});

ChaseBanner.displayName = 'ChaseBanner';

export default ChaseBanner;
