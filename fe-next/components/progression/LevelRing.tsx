'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { levelProgress, type LevelProgress } from '@/shared/xp/levelCurve';

export const LAST_SEEN_LEVEL_KEY = 'lc:lastSeenLevel';
const PULSE_MS = 1200;

/** Level and in-level percent from one source (total XP), so the number and the ring never disagree. */
export function profileLevelProgress(profile: { total_xp?: number | null; current_level?: number | null } | null | undefined): LevelProgress {
  const stored = Math.max(1, profile?.current_level ?? 1);
  if (profile?.total_xp != null) {
    const fromXp = levelProgress(profile.total_xp);
    if (fromXp.level >= stored) return fromXp;
  }
  return { level: stored, xpIntoLevel: 0, xpForNext: 0, pct: 0, isMax: false };
}

function readSeen(): number | null {
  try {
    const raw = localStorage.getItem(LAST_SEEN_LEVEL_KEY);
    return raw == null ? null : Number(raw);
  } catch {
    return null;
  }
}

function writeSeen(level: number) {
  try {
    localStorage.setItem(LAST_SEEN_LEVEL_KEY, String(level));
  } catch {
    /* storage blocked: the pulse just repeats next visit */
  }
}

function useLevelPulse(level: number, enabled: boolean): boolean {
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const seen = readSeen();
    if (seen == null || !Number.isFinite(seen) || level <= seen) {
      if (seen !== level) writeSeen(level);
      return;
    }
    setPulse(true);
    const id = setTimeout(() => {
      writeSeen(level);
      setPulse(false);
    }, PULSE_MS);
    return () => clearTimeout(id);
  }, [level, enabled]);
  return pulse;
}

const RING_CLASS =
  'relative inline-flex shrink-0 items-center justify-center rounded-full ' +
  '[background:conic-gradient(var(--neo-lime)_0_var(--ring-fill),color-mix(in_srgb,var(--neo-white)_16%,transparent)_var(--ring-fill)_100%)]';

export interface LevelRingProps {
  pct: number;
  level: number;
  /** Outer diameter in px; omit to size it with classes. */
  size?: number;
  thickness?: number;
  /** Pulse once when the level is higher than the last one this device saw. */
  trackLevel?: boolean;
  className?: string;
  children?: ReactNode;
}

export function LevelRing({ pct, level, size, thickness = 3, trackLevel = false, className, children }: LevelRingProps) {
  const pulse = useLevelPulse(level, trackLevel);
  const fill = Math.min(100, Math.max(0, Math.round(pct)));
  return (
    <span
      data-testid="level-ring"
      data-pulse={pulse ? 'true' : undefined}
      aria-hidden="true"
      className={cn(RING_CLASS, pulse && 'animate-mp-bump', className)}
      style={{ ...(size ? { width: size, height: size } : null), padding: thickness, ['--ring-fill' as string]: `${fill}%` }}
    >
      {children}
    </span>
  );
}
