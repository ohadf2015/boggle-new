'use client';

import { Anchor, Coins, Crown, ShieldCheck, Timer } from 'lucide-react';
import type { PlotSlot, Perks } from '@/lib/wordTowerV2/estate';
import { perkChips } from './estateArt';

type T = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  t: T;
  perks: Perks;
  onOpen: () => void;
}

const ICON: Record<PlotSlot, typeof Anchor> = {
  foundation: Anchor,
  craneYard: Timer,
  vault: Coins,
  insurance: ShieldCheck,
  landmark: Crown,
};

const CHIP_CLASS: Record<PlotSlot, string> = {
  foundation: 'bg-neo-cyan',
  craneYard: 'bg-neo-purple',
  vault: 'bg-neo-yellow',
  insurance: 'bg-neo-cream',
  landmark: 'bg-neo-pink',
};

/**
 * What the district is doing for THIS run, shown once at the top of it. Perks
 * that are invisible are perks nobody upgrades for, so they are stated in the
 * run itself — and with nothing built yet the row is the invitation.
 */
export function PerkChips({ t, perks, onOpen }: Props) {
  const chips = perkChips(perks);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="pointer-events-auto absolute inset-x-0 bottom-[calc(var(--wt2-dock,17rem)+3.5rem)] z-40 mx-auto flex w-fit max-w-[92vw] flex-wrap items-center justify-center gap-1.5 px-2 animate-neo-pop"
    >
      {chips.length === 0 ? (
        <span className="rounded-neo border-neo border-black bg-neo-cream/90 px-2.5 py-1 font-neo-display text-xs font-bold text-neo-navy shadow-hard-sm">
          {t('wordTowerV2.estate.perksNone')}
        </span>
      ) : (
        chips.map((chip) => {
          const Icon = ICON[chip.id];
          return (
            <span
              key={chip.id}
              className={`flex items-center gap-1 rounded-neo border-neo border-black px-2 py-0.5 font-neo-display text-xs font-black text-neo-navy shadow-hard-sm ${CHIP_CLASS[chip.id]}`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {t(chip.key, chip.params)}
            </span>
          );
        })
      )}
    </button>
  );
}
