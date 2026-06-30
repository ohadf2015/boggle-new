'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { NeoSkeleton } from '@/components/ui/skeleton';
import { formatLiveShort } from '@/lib/landing/homeHubFormat';

interface HomeSocialStripProps {
  activePlayers: number;
  gamesToday: number;
  gameModes: number;
  languages: number;
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
 * HomeSocialStrip — a tight stat bar (Online · Games today · Modes · Languages).
 * Condenses `LandingSocialProofBar` into the hub grammar: one navy card, hairline
 * dividers, each stat number in a cycling brand hue.
 *
 * The two live cells (Online, Games today) are credibility-gated like the desktop
 * proof bar: while live stats resolve the Online cell skeletons (never a stale
 * "0"), and once resolved each live cell only renders when it has genuine
 * activity. A bald "0 online / 0 games today" reads as broken, so we drop those
 * cells and let the always-true trust stats (Modes, Languages) carry the strip.
 * The grid tracks the visible cell count so the layout stays balanced.
 */
export function HomeSocialStrip({ activePlayers, gamesToday, gameModes, languages, liveStatsLoading, t }: HomeSocialStripProps) {
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
  if (gameModes > 0) {
    cells.push({ key: 'modes', label: t('landing.home.modes'), color: 'text-neo-pink', value: String(gameModes) });
  }
  if (languages > 0) {
    cells.push({ key: 'languages', label: t('landing.home.languages'), color: 'text-neo-purple', value: String(languages) });
  }

  if (cells.length === 0) return null;

  // Static class names (no interpolation) so Tailwind's JIT keeps them.
  const colsClass =
    cells.length >= 4 ? 'grid-cols-4' : cells.length === 3 ? 'grid-cols-3' : 'grid-cols-2';

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
