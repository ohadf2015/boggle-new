import type { LandingMods } from '@/lib/wordTowerV2/run';
import { combineMods } from '@/lib/wordTowerV2/rush/perks';
import type { TraitQueue } from '@/lib/wordTowerV2/rush/traits';
import type { BlockTrait, GhostRival, NextUpSlot, PerkMods } from '@/lib/wordTowerV2/rush/types';
import { scoreFromHeightM } from '@/lib/wordTowerV2/scoring';

export interface RushBoardRow {
  id: string;
  name: string;
  bestHeightM: number;
  isYou?: boolean;
}

const FEATHER_WINDOW_MUL = 1.2;

export function boardToRivalRows(rows: RushBoardRow[]): { name: string; score: number; id: string }[] {
  return rows.filter((r) => !r.isYou).map((r) => ({ id: r.id, name: r.name, score: scoreFromHeightM(r.bestHeightM) }));
}

export function sameRivals(a: GhostRival[], b: GhostRival[]): boolean {
  return a.length === b.length && a.every((r, i) => r.id === b[i].id && r.peakM === b[i].peakM);
}

export function slotsWithCarry(queue: TraitQueue, carry: BlockTrait | null): NextUpSlot[] {
  return carry ? [{ trait: carry, sealed: false }, ...queue.peek(2)] : queue.peek(3);
}

/** The ONE perfect-window product: the judge and the band the canvas draws both read it. */
export function perfectWindowMult(estateMult: number, rushMult: number, trait: BlockTrait | undefined): number {
  return estateMult * rushMult * (trait === 'feather' ? FEATHER_WINDOW_MUL : 1);
}

/** A magnet block leaves the hook with less sideways throw, so it drifts less off centre. */
export const MAGNET_VX_MUL = 0.6;

export const NEUTRAL_RUSH_MODS: PerkMods = combineMods([]);

export function landingModsFor(mods: PerkMods, trait: BlockTrait | undefined): LandingMods {
  return {
    perfectBonusMul: mods.perfectBonusMul,
    comboGainMul: mods.comboGainMul,
    wordLenBonusPerLetter: mods.wordLenBonusPerLetter,
    chanceMul: mods.crateChanceMul,
    trait,
  };
}
