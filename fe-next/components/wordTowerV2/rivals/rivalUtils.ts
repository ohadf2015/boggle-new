import { PLOT_SLOTS, type PlotSlot } from '@/lib/wordTowerV2/estateCatalog';
import type { TowerBlock } from '@/lib/wordTowerV2/estateTower';
import type { RevengeEntry, RivalView } from '../useEstate';

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

/**
 * A raid row carries whatever slot it was written with. A slot this build's
 * catalogue no longer knows has no key, and `t()` echoes a missing key, so an
 * old row would print `wordTowerV2.rivals.plot.<slot>` inside the accusation.
 * Unknown reads as the empty lot instead.
 */
export function plotLabel(slot: PlotSlot | null, t: T): string {
  const known = slot !== null && (PLOT_SLOTS as readonly string[]).includes(slot);
  return known ? t(`wordTowerV2.rivals.plot.${slot}`) : t('wordTowerV2.rivals.plot.lot');
}

/** What the payback takeover does the moment the game opens. */
export type Greeting = { kind: 'none' } | { kind: 'list' } | { kind: 'target'; entry: RevengeEntry };

/**
 * Coin Master's bargain: someone hit you, so the answer is waiting for you the
 * moment you come back — one attacker opens straight onto THEIR tower, several
 * open the list of faces. Two guards keep it from nagging:
 *
 *  - `unseen` (raids not yet marked seen): wave the offer off and the debt
 *    drops back to the pill instead of re-taking the screen.
 *  - `greeted` (raid ids already greeted this visit): answering one of four
 *    raids must not shove you into the next one — but a raid that lands later
 *    is a new id, so it still gets its moment.
 */
export function greetingFor(debts: RevengeEntry[], unseen: number, greeted: ReadonlySet<string>): Greeting {
  if (debts.length === 0 || unseen === 0) return { kind: 'none' };
  if (debts.every((d) => greeted.has(d.raidId))) return { kind: 'none' };
  return debts.length === 1 ? { kind: 'target', entry: debts[0] } : { kind: 'list' };
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
