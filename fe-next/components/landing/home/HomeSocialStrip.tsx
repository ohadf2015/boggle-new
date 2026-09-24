'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { NeoSkeleton } from '@/components/ui/skeleton';
import { formatLiveShort } from '@/lib/landing/homeHubFormat';

interface HomeSocialStripProps {
  activePlayers: number;
  gamesToday: number;
  /**
   * Live-room stats arrive over a WebSocket, so `activePlayers` is 0 until the
   * socket replies. Skeleton the "online" cell while loading instead of flashing
   * a stale "0" that flips to the real count a beat later.
   */
  liveStatsLoading?: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

interface StatCell {
  key: string;
  label: string;
  color: string;
  value?: string;
  loading?: boolean;
}

/**
 * HomeSocialStrip — live pulse only (Online · Games today), hub grammar: one
 * navy card, hairline divider.
 *
 * Credibility-gated like the desktop proof bar: while live stats resolve the
 * Online cell skeletons (never a stale "0"); once resolved each cell renders
 * only with genuine activity. A quiet moment renders nothing — no static
 * "N modes / N languages" filler on a returning player's home.
 */
export function HomeSocialStrip({ activePlayers, gamesToday, liveStatsLoading, t }: HomeSocialStripProps) {
  const cells: StatCell[] = [];

  // Online — live over WebSocket. Skeleton while loading; otherwise show only
  // when someone is actually in a live room.
  if (liveStatsLoading) {
    cells.push({ key: 'online', label: t('landing.home.online'), color: 'text-neo-lime', loading: true });
  } else if (activePlayers > 0) {
    cells.push({ key: 'online', label: t('landing.home.online'), color: 'text-neo-lime', value: formatLiveShort(activePlayers) });
  }

  // Games today — SSR-provided count; hide while it is still 0.
  if (gamesToday > 0) {
    cells.push({ key: 'gamesToday', label: t('landing.home.gamesToday'), color: 'text-neo-cyan', value: formatLiveShort(gamesToday) });
  }

  // Always-credible trust stats.

  if (cells.length === 0) return null;

  // Static class names (no interpolation) so Tailwind's JIT keeps them.
  const colsClass = cells.length === 2 ? 'grid-cols-2' : 'grid-cols-1';

  return (
    <div className={cn('grid overflow-hidden rounded-neo-lg border-2 border-black bg-neo-navy-light shadow-hard', colsClass)}>
      {cells.map((c, i) => (
        <div
          key={c.key}
          className={cn('px-1 py-2.5 text-center', i < cells.length - 1 && 'border-e border-white/10')}
        >
          {c.loading ? (
            <NeoSkeleton variant="text" width={28} height={17} className="mx-auto" />
          ) : (
            <div className={cn('font-neo-display text-[17px] font-bold leading-none', c.color)}>{c.value}</div>
          )}
          <div className="mt-1 font-neo-body text-[10px] font-medium text-neo-white/55">{c.label}</div>
        </div>
      ))}
    </div>
  );
}

export default HomeSocialStrip;
