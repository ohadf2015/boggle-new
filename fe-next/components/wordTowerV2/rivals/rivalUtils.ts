import type { PlotSlot } from '@/lib/wordTowerV2/estateCatalog';
import type { TowerBlock } from '@/lib/wordTowerV2/estateTower';
import type { RivalView } from '../useEstate';

export type T = (key: string, params?: Record<string, string | number>) => string;

/** One column of the compare board: you, or a real rival. */
export interface Standing {
  key: string;
  name: string;
  heightM: number;
  tower: TowerBlock[];
  /** null = you. */
  rival: RivalView | null;
  rank: number;
}

/** Tallest first, ties keep the order they came in; ranks are 1-based. */
export function rankStandings(entries: Array<Omit<Standing, 'rank'>>): Standing[] {
  return [...entries]
    .map((e, i) => ({ e, i }))
    .sort((a, b) => b.e.heightM - a.e.heightM || a.i - b.i)
    .map(({ e }, i) => ({ ...e, rank: i + 1 }));
}

/** Rival display name, already sanitized server-side; never blank. */
export function rivalName(r: RivalView | null, t: T): string {
  const name = (r?.displayName ?? '').trim();
  return name || t('wordTowerV2.rivals.someone');
}

export function plotLabel(slot: PlotSlot | null, t: T): string {
  return slot ? t(`wordTowerV2.rivals.plot.${slot}`) : t('wordTowerV2.rivals.plot.lot');
}

/** Blurred stand-ins so a guest can SEE what signing in unlocks. */
export function teaserTowers(): TowerBlock[][] {
  const make = (floors: number, seed: number): TowerBlock[] =>
    Array.from({ length: floors }, (_, i) => ({
      word: '',
      w: 220 + ((i * 37 + seed * 11) % 60),
      x: ((i * 17 + seed * 5) % 21) - 10,
      y: -(i * 120 + 60),
      angle: 0,
      color: 0,
    }));
  return [make(7, 1), make(11, 2), make(5, 3)];
}
