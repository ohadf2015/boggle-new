'use client';

import { Flame, Trophy } from 'lucide-react';
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
  // Compact card (founder ask 2026-06-26: "the high record can be more compact,
  // use icons, and sit a bit to the side"). The live altitude is the hero; the
  // combo flame rides beside it; the personal best is demoted to a small trophy
  // ICON chip set to the trailing side, so the card reads as one tight unit
  // instead of a wordy "BEST 245m" string competing with the live number.
  return (
    <div className="pointer-events-none flex items-stretch gap-2 rounded-neo border-neo border-black bg-neo-navy/85 px-2.5 py-1 shadow-hard-sm backdrop-blur-sm">
      <div className="flex flex-col items-center text-center">
        <div className="flex items-baseline gap-1.5">
          <span className="font-neo-display text-2xl font-black leading-none text-neo-white tabular-nums">
            {heightM.toFixed(0)}<span className="text-sm text-neo-cyan">m</span>
          </span>
          {combo > 1 && (
            <span className="flex items-center gap-0.5 rounded-full border border-black bg-neo-orange px-1.5 py-0.5 font-neo-display text-[11px] font-black leading-none text-black tabular-nums">
              <Flame className="h-3 w-3" aria-hidden />×{mult.toFixed(1)}
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
      {/* Personal best — compact trophy chip, to the side, de-emphasised. */}
      {personalBestM > 0 && (
        <span
          className="flex items-center gap-0.5 self-center rounded-full border border-black bg-neo-navy-light/80 px-1.5 py-0.5 font-neo-body text-[10px] font-black leading-none text-neo-yellow tabular-nums"
          title={t('wordTower.hud.best', { m: Math.round(personalBestM) })}
          aria-label={t('wordTower.hud.best', { m: Math.round(personalBestM) })}
        >
          <Trophy className="h-3 w-3" aria-hidden />{Math.round(personalBestM)}
        </span>
      )}
    </div>
  );
}
