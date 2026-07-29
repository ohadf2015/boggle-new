'use client';

import { ChevronUp } from 'lucide-react';
import { nearestRivalAbove, type RivalMarker } from '@/lib/wordTower/rivals';

interface Props {
  rivals: RivalMarker[];
  /** Viewer's live altitude (m) — drives which rival is the next chase target. */
  viewerHeightM: number;
  reducedMotion?: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
}

/**
 * Persistent "next building to pass" chip. The rival rail only draws ghost towers
 * whose record line is currently on-screen, so the rival you're actually chasing
 * is usually far above and invisible. This pins the closest unbeaten record to the
 * edge — avatar + name + "+8 m" — as a constant goal that updates as you climb and
 * vanishes the instant you overtake everyone. Inert (pointer-events-none).
 */
export function WordTowerNextRivalChip({ rivals, viewerHeightM, reducedMotion, t, dir }: Props) {
  const target = nearestRivalAbove(viewerHeightM, rivals);
  if (!target) return null;

  return (
    <div
      className={`pointer-events-none absolute end-2 top-[30%] z-[8] flex items-center gap-1.5 rounded-neo border-neo-thick border-black bg-neo-navy/85 px-2 py-1.5 shadow-hard backdrop-blur-sm ${reducedMotion ? '' : 'animate-neo-pop'}`}
      dir={dir}
      role="status"
      aria-live="polite"
      aria-label={t('wordTower.hud.chaseAria', { name: target.name, m: target.gapM })}
    >
      <ChevronUp className={`h-4 w-4 text-neo-cyan ${reducedMotion ? '' : 'animate-bounce'}`} aria-hidden />
      <span
        className="flex h-5 w-5 items-center justify-center rounded-full border border-black text-[10px] leading-none"
        style={{ background: target.avatarColor ?? '#2a2a40' }}
        aria-hidden
      >
        {target.avatarEmoji ?? '🧗'}
      </span>
      <span className="flex flex-col items-start leading-none" aria-hidden>
        <span className="max-w-[88px] truncate font-neo-body text-[11px] font-bold text-neo-white">{target.name}</span>
        <span className="font-neo-display text-xs font-black text-neo-cyan tabular-nums">
          {t('wordTower.hud.chaseGap', { m: target.gapM })}
        </span>
      </span>
    </div>
  );
}
