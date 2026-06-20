'use client';

import { Flame } from 'lucide-react';
import { comboMult } from '@/lib/wordTower/wordTowerManager';
import type { WordTowerBiomeId } from '@/shared/constants/wordTowerConstants';
import type { ArchitectTier } from '@/lib/wordTower/architectTier';

interface Props {
  heightM: number;
  biomeId: WordTowerBiomeId;
  floorsCount: number;
  personalBestM: number;
  /** Live combo chain — shows a streak chip (×mult) once it's above 1. */
  combo: number;
  /** Mastery tier based on rare-letter usage + word variety. */
  tier?: ArchitectTier | null;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * Compact altitude readout. Lives in the top-bar's CENTRE column (back button
 * left, actions right) so it shares the header's flex row — it can never sit
 * behind the back button by construction, regardless of locale label width. Adds
 * the live combo streak chip the old corner card lacked (the multiplier used to
 * flash only in the transient reward popup).
 */
const TIER_CLASS: Record<ArchitectTier, string> = {
  Apprentice: 'bg-neo-cyan text-black',
  Journeyman: 'bg-neo-purple text-neo-white',
  Master: 'bg-neo-yellow text-black',
};

export function WordTowerStatHud({ heightM, biomeId, floorsCount, personalBestM, combo, tier, t }: Props) {
  const mult = comboMult(combo);
  // Compact two-line card (founder ask 2026-06-20: the stat card was a tall
  // 4-row stack that overlapped the next-zone chip + mode toggle). Line 1: the
  // big altitude + combo + best. Line 2: biome · floors with the tier badge
  // inline. Shorter footprint → no collision with the top-centre banners.
  return (
    <div className="pointer-events-none flex flex-col items-center rounded-neo border-neo border-black bg-neo-navy/85 px-3 py-1 text-center shadow-hard-sm backdrop-blur-sm">
      <div className="flex items-baseline gap-2">
        <span className="font-neo-display text-2xl font-black leading-none text-neo-white tabular-nums">
          {heightM.toFixed(0)}<span className="text-sm text-neo-cyan">m</span>
        </span>
        {combo > 1 && (
          <span className="flex items-center gap-0.5 rounded-full border border-black bg-neo-orange px-1.5 py-0.5 font-neo-display text-[11px] font-black leading-none text-black tabular-nums">
            <Flame className="h-3 w-3" aria-hidden />×{mult.toFixed(1)}
          </span>
        )}
        {personalBestM > 0 && (
          <span className="font-neo-body text-[10px] font-bold leading-none text-neo-yellow tabular-nums">
            {t('wordTower.hud.best', { m: Math.round(personalBestM) })}
          </span>
        )}
      </div>
      <span className="mt-0.5 flex items-center gap-1.5 font-neo-body text-[10px] uppercase leading-none tracking-wider text-neo-cyan">
        <span>{t(`wordTower.biome.${biomeId}`)} · {t('wordTower.hud.floors', { n: floorsCount })}</span>
        {tier && (
          <span className={`rounded-sm border border-black px-1 py-px font-neo-display text-[9px] font-black uppercase leading-none tracking-wide ${TIER_CLASS[tier]}`}>
            {t(`wordTower.tier.${tier.toLowerCase()}`)}
          </span>
        )}
      </span>
    </div>
  );
}
