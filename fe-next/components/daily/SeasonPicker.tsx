'use client';

import React from 'react';
import { getSeasonIdentity } from '@/lib/seasons';
import { DailySeasonRibbon } from './DailySeasonRibbon';
import type { DailySeasonSummary, T } from './leaderboardTypes';

interface SeasonPickerProps {
  t: T;
  seasons: DailySeasonSummary[] | null;
  selected: DailySeasonSummary | null;
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export default function SeasonPicker({ t, seasons, selected, selectedId, onSelect }: SeasonPickerProps) {
  return (
    <div className="mb-4 space-y-2.5">
      {selected && <DailySeasonRibbon season={selected} isCurrent={selected.isCurrent} t={t} />}
      {seasons && seasons.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-0.5 px-0.5" role="group" aria-label={t('wordHunt.leaderboard.seasonPicker')}>
          {seasons.map((s) => {
            const active = s.id === selectedId;
            const identity = getSeasonIdentity(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelect(s.id)}
                aria-pressed={active}
                title={s.name}
                className={`
                  shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-neo border-2 border-neo-black
                  text-[11px] sm:text-xs font-black transition-[transform,box-shadow,background-color] shadow-hard-sm
                  hover:-translate-y-px hover:shadow-hard active:translate-y-0.5 active:shadow-none
                  ${active ? 'text-neo-black' : 'bg-neo-navy text-neo-white/80'}
                `}
                style={active ? { backgroundColor: identity.accentColor } : undefined}
              >
                <span aria-hidden>{identity.twist.emoji}</span>
                <span>{t('wordHunt.leaderboard.season')} {s.id}</span>
                {s.isCurrent && (
                  <span className="ms-0.5 px-1 rounded-full bg-neo-black/80 text-neo-lime text-[9px] uppercase tracking-wide">
                    {t('wordHunt.leaderboard.currentSeason')}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
