'use client';

import { Home } from 'lucide-react';
import { NextQuestCta } from '@/components/daily/results/NextQuestCta';
import type { Language } from '@/types';

type T = (key: string, params?: Record<string, string | number>) => string;

interface V2OverBarProps {
  t: T;
  daily: boolean;
  language: string;
  onBadges: () => void;
  onRestart: () => void;
  onHome: () => void;
}

/**
 * Pinned above the dock once the results card is closed over the fallen tower.
 * It must never be a dead end: badges / replay / home always, and on the daily
 * a compact hand-off to the next daily quest (the results card had one; closing
 * it used to drop it).
 */
export function V2OverBar({ t, daily, language, onBadges, onRestart, onHome }: V2OverBarProps) {
  return (
    <div className="absolute inset-x-0 bottom-[calc(var(--wt2-dock,17rem)+0.75rem)] z-40 mx-auto flex w-full max-w-sm flex-col items-center gap-2 px-3">
      {daily ? (
        <NextQuestCta
          justFinished="word-tower"
          currentLanguage={language as Language}
          source="word_tower_over_bar"
          className="py-2"
        />
      ) : null}
      <div className="flex w-fit items-center gap-2">
        <button
          type="button"
          onClick={onBadges}
          className="rounded-neo border-neo border-black bg-neo-cream px-3 py-1.5 font-neo-display text-sm font-bold text-neo-navy shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          {t('wordTowerV2.results.badges')}
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="rounded-neo border-neo-thick border-black bg-neo-pink px-4 py-1.5 font-neo-display text-base font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
        >
          {t('common.playAgain')}
        </button>
        <button
          type="button"
          onClick={onHome}
          aria-label={t('wordTowerV2.results.home')}
          className="flex h-9 w-9 items-center justify-center rounded-neo border-neo border-black bg-neo-navy text-neo-cream shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          <Home className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
