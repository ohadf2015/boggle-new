'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { formatLiveShort } from '@/lib/landing/homeHubFormat';

interface HomeSocialStripProps {
  activePlayers: number;
  gamesToday: number;
  gameModes: number;
  languages: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * HomeSocialStrip — a tight 4-cell stat bar (Online · Games today · Modes ·
 * Languages). Condenses `LandingSocialProofBar` into the hub grammar: one navy
 * card, hairline dividers, each stat number in a cycling brand hue.
 */
export function HomeSocialStrip({ activePlayers, gamesToday, gameModes, languages, t }: HomeSocialStripProps) {
  const cells = [
    { value: formatLiveShort(activePlayers), label: t('landing.home.online'), color: 'text-neo-lime' },
    { value: formatLiveShort(gamesToday), label: t('landing.home.gamesToday'), color: 'text-neo-cyan' },
    { value: String(gameModes), label: t('landing.home.modes'), color: 'text-neo-pink' },
    { value: String(languages), label: t('landing.home.languages'), color: 'text-neo-purple' },
  ];

  return (
    <div className="grid grid-cols-4 overflow-hidden rounded-neo-lg border-2 border-black bg-neo-navy-light shadow-hard">
      {cells.map((c, i) => (
        <div
          key={c.label}
          className={cn('px-1 py-2.5 text-center', i < cells.length - 1 && 'border-e border-white/10')}
        >
          <div className={cn('font-neo-display text-[17px] font-bold leading-none', c.color)}>{c.value}</div>
          <div className="mt-1 font-neo-body text-[10px] font-medium text-neo-white/55">{c.label}</div>
        </div>
      ))}
    </div>
  );
}

export default HomeSocialStrip;
