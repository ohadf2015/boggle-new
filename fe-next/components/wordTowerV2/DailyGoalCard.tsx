'use client';

import { Flag } from 'lucide-react';

type T = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  t: T;
  growthM: number;
  onKeepClimbing: () => void;
  /** The tower is already saved; this leaves for the daily hub. */
  onBank: () => void;
}

/** The daily finish line: the goal toast it replaces vanished in 3s and offered no way to stop on a high. */
export function DailyGoalCard({ t, growthM, onKeepClimbing, onBank }: Props) {
  return (
    <div
      role="status"
      data-wt2-goal-toast
      className="pointer-events-auto absolute inset-x-4 top-1/4 z-[60] mx-auto flex max-w-xs flex-col items-center gap-3 rounded-neo border-neo-thick border-black bg-neo-yellow px-4 py-4 text-center shadow-hard-lg animate-neo-pop"
    >
      <span className="font-neo-display text-xl font-black text-neo-navy">{t('wordTowerV2.dailyTower.goalToast', { m: growthM })}</span>
      <div className="flex w-full gap-2">
        <button
          type="button"
          onClick={onKeepClimbing}
          className="flex-1 rounded-neo border-neo-thick border-black bg-neo-cream px-2 py-2 font-neo-display text-sm font-black text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
        >
          {t('wordTowerV2.dailyTower.goalKeep')}
        </button>
        <button
          type="button"
          onClick={onBank}
          className="flex flex-1 items-center justify-center gap-1 rounded-neo border-neo-thick border-black bg-neo-lime px-2 py-2 font-neo-display text-sm font-black text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
        >
          <Flag className="h-4 w-4" aria-hidden />
          {t('wordTowerV2.dailyTower.goalBank')}
        </button>
      </div>
    </div>
  );
}
