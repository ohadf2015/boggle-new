import { CHEST_ODDS, type ChestRarity } from '@/shared/constants/classroomEconomy';

export type ChestPhase = 'sealed' | 'shaking' | 'bursting' | 'revealed';

/** Reduced motion skips the shake and burst entirely. */
export function nextChestPhase(phase: ChestPhase, reducedMotion: boolean): ChestPhase {
  if (phase === 'sealed') return reducedMotion ? 'revealed' : 'shaking';
  if (phase === 'shaking') return 'bursting';
  return 'revealed';
}

export function oddsLabel(rarity: ChestRarity): string {
  return `${Math.round(CHEST_ODDS[rarity] * 100)}%`;
}
