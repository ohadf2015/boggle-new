'use client';

import React from 'react';
import { MapPin } from 'lucide-react';
import type { YouReadout } from './leaderboardRows';
import type { T } from './leaderboardTypes';

const fill = (s: string, vars: Record<string, number>) =>
  s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));

/** Sticky "You: #7 of 42 · Top 17%" when the viewer's own row is off screen; tap jumps to it. */
export default function YouReadoutBar({ t, readout, onJump }: { t: T; readout: YouReadout; onJump: () => void }) {
  return (
    <button
      type="button"
      onClick={onJump}
      data-testid="you-readout"
      className="sticky bottom-[calc(var(--bottom-stack-height)+0.5rem)] md:bottom-2 z-10 w-full flex items-center gap-2 px-3 py-2 rounded-neo border-2 border-neo-black bg-neo-cyan text-neo-black shadow-hard text-start active:translate-y-0.5 active:shadow-none transition-[transform,box-shadow]"
    >
      <MapPin aria-hidden className="w-4 h-4 shrink-0" />
      <span className="flex-1 min-w-0 truncate font-black text-sm tabular-nums">
        {fill(t('daily.leaderboard.youRank'), { rank: readout.rank, total: readout.total })}
      </span>
      <span className="shrink-0 px-2 py-0.5 rounded-full bg-neo-black text-neo-cyan text-[11px] font-black uppercase tracking-wide tabular-nums">
        {fill(t('daily.leaderboard.topPercent'), { percent: readout.topPercent })}
      </span>
    </button>
  );
}
