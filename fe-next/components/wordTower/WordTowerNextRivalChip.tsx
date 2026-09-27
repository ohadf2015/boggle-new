'use client';

import { useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { nearestRivalAbove, type RivalMarker } from '@/lib/wordTower/rivals';

/** How long the chase chip stays up after a new target appears before it
 *  auto-hides — long enough to register the goal, short enough that it never
 *  "sticks" permanently on screen. */
const CHASE_CHIP_MS = 6000;

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
  const targetId = target?.id ?? null;

  // Flash the chase goal when the target CHANGES (you climb past one → the next
  // becomes the goal), then auto-hide. Keyed on the target id so it re-appears
  // for each new rival but never lingers indefinitely — the founder's "these
  // notifications stay stuck" fix.
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (targetId == null) return;
    setVisible(true);
    const id = setTimeout(() => setVisible(false), CHASE_CHIP_MS);
    return () => clearTimeout(id);
  }, [targetId]);

  if (!target || !visible) return null;

  return (
    <div
      className={`pointer-events-none absolute end-2 top-[30%] z-[8] flex items-center gap-1.5 rounded-neo border-neo-thick border-black bg-neo-navy/95 px-2 py-1.5 shadow-hard ${reducedMotion ? '' : 'animate-neo-pop'}`}
      dir={dir}
      role="status"
      aria-live="polite"
      aria-label={t('wordTower.hud.chaseAria', { name: target.name, m: target.gapM })}
    >
      <ChevronUp className={`h-4 w-4 text-neo-cyan ${reducedMotion ? '' : 'animate-bounce'}`} aria-hidden />
      {/* The rival's REAL avatar (their generated identity face), not a flat
          emoji — seeded fallback from playerId when they have no custom one.
          Mirrors the rail/leaderboard so the chase target reads as a person. */}
      <Avatar
        customAvatar={target.customAvatar ?? undefined}
        userId={target.playerId ?? target.id}
        pixelSize={20}
        disableEffects
        className="shrink-0 rounded-full border border-black"
      />
      <span className="flex flex-col items-start leading-none" aria-hidden>
        <span className="max-w-[88px] truncate font-neo-body text-[11px] font-bold text-neo-white">{target.name}</span>
        <span className="font-neo-display text-xs font-black text-neo-cyan tabular-nums">
          {t('wordTower.hud.chaseGap', { m: target.gapM })}
        </span>
      </span>
    </div>
  );
}
