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

export function chestArtSrc(rarity: ChestRarity, revealed: boolean): string {
  return `/images/classroom-chests/classroom-chest-${rarity}-${revealed ? 'open' : 'closed'}.webp`;
}

export function rarityTone(rarity: ChestRarity): { glow: string; text: string; ring: string } {
  if (rarity === 'epic') return { glow: 'bg-neo-pink/60', text: 'text-neo-pink', ring: 'border-neo-pink' };
  if (rarity === 'rare') return { glow: 'bg-neo-cyan/50', text: 'text-neo-cyan', ring: 'border-neo-cyan' };
  return { glow: 'bg-white/25', text: 'text-white', ring: 'border-white' };
}
