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

/** The burst frame already shows the open chest, so the moment it bursts is never a blank glow. */
export function chestSrcForPhase(phase: ChestPhase, rarity: ChestRarity): string {
  return chestArtSrc(rarity, phase === 'bursting' || phase === 'revealed');
}

export function rarityTone(rarity: ChestRarity): { glow: string; text: string; ring: string } {
  if (rarity === 'epic') return { glow: 'bg-neo-pink/60', text: 'text-neo-pink', ring: 'border-neo-pink' };
  if (rarity === 'rare') return { glow: 'bg-neo-cyan/50', text: 'text-neo-cyan', ring: 'border-neo-cyan' };
  return { glow: 'bg-white/25', text: 'text-white', ring: 'border-white' };
}

/** Tap anywhere on the chest screen: a sealed chest starts opening, a moving one skips to the reveal. */
export function tapChestPhase(phase: ChestPhase, reducedMotion: boolean): ChestPhase {
  return phase === 'sealed' ? nextChestPhase(phase, reducedMotion) : 'revealed';
}

const RAYS: Record<ChestRarity, { rays: number; hex: string; strength: number }> = {
  common: { rays: 8, hex: '#ffe135', strength: 0.45 },
  rare: { rays: 12, hex: '#38e1ff', strength: 0.65 },
  epic: { rays: 16, hex: '#ff5fa2', strength: 0.8 },
};

export function chestRays(rarity: ChestRarity) {
  return RAYS[rarity];
}

export function chestHeadlineKey(rarity: ChestRarity): string {
  return `economy.chest.headline.${rarity}`;
}

const MAX_COINS = 10;

/** One coin per cash earned this round, capped so a big round is not a wall of coins. */
export function chestCoinCount(roundCash: number): number {
  return Math.max(0, Math.min(MAX_COINS, Math.floor(roundCash)));
}
