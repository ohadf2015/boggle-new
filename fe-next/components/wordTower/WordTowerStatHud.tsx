'use client';

import { useState } from 'react';
import { ChevronDown, Flame, Trophy } from 'lucide-react';
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
  const [expanded, setExpanded] = useState(false);
  // Simplified readout (#4): collapsed shows only the hero altitude + the live
  // combo flame — no data overload. A tap reveals the detail row (biome · floors
  // · tier · best) for players who want it. The altitude stays the hero either way.
  const hasDetail = personalBestM > 0 || floorsCount > 0 || !!tier;
  return (
    <button
      type="button"
      onClick={() => setExpanded((v) => !v)}
      aria-expanded={expanded}
      aria-label={expanded ? t('wordTower.hud.collapse') : t('wordTower.hud.expand')}
      className="pointer-events-auto flex flex-col items-center gap-0.5 rounded-neo border-neo border-black bg-neo-navy/85 px-2.5 py-1 shadow-hard-sm backdrop-blur-sm"
    >
      <div className="flex items-baseline gap-1.5">
        <span className="font-neo-display text-2xl font-black leading-none text-neo-white tabular-nums">
          {heightM.toFixed(0)}<span className="text-sm text-neo-cyan">m</span>
        </span>
        {combo > 1 && (
          <span className="flex items-center gap-0.5 rounded-full border border-black bg-neo-orange px-1.5 py-0.5 font-neo-display text-[11px] font-black leading-none text-black tabular-nums">
            <Flame className="h-3 w-3" aria-hidden />×{mult.toFixed(1)}
          </span>
        )}
        {hasDetail && (
          <ChevronDown
            className={`h-3.5 w-3.5 text-neo-cyan transition-transform ${expanded ? 'rotate-180' : ''}`}
            aria-hidden
          />
        )}
      </div>
      {expanded && hasDetail && (
        <div className="flex items-center gap-1.5 pt-0.5 font-neo-body text-[10px] uppercase leading-none tracking-wider text-neo-cyan">
          <span>{t(`wordTower.biome.${biomeId}`)} · {t('wordTower.hud.floors', { n: floorsCount })}</span>
          {tier && (
            <span className={`rounded-sm border border-black px-1 py-px font-neo-display text-[9px] font-black uppercase leading-none tracking-wide ${TIER_CLASS[tier]}`}>
              {t(`wordTower.tier.${tier.toLowerCase()}`)}
            </span>
          )}
          {personalBestM > 0 && (
            <span className="flex items-center gap-0.5 rounded-full border border-black bg-neo-navy-light/80 px-1.5 py-0.5 font-neo-body text-[10px] font-black leading-none text-neo-yellow tabular-nums">
              <Trophy className="h-3 w-3" aria-hidden />{Math.round(personalBestM)}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
