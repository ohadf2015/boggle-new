import type { Perk, PerkId, PerkMods, PerkRarity } from './types';

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mixSeed(a: number, b: number): number {
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (b | 0) ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

export const RARITY_WEIGHT: Record<PerkRarity, number> = { common: 60, rare: 30, epic: 10 };

export const PERKS: Perk[] = [
  { id: 'wideLoad', rarity: 'common', glyph: '↔', mods: { widthMul: 1.12 } },
  { id: 'steadyHands', rarity: 'common', glyph: '✋', mods: { perfectWindowMul: 1.25 } },
  { id: 'longWordBonus', rarity: 'common', glyph: 'Aa', mods: { wordLenBonusPerLetter: 0.05 } },
  { id: 'slowSwing', rarity: 'common', glyph: '⏱', mods: { swingSpeedMul: 0.88 } },
  { id: 'perfectStreak', rarity: 'rare', glyph: '🔥', mods: { comboGainMul: 1.5 } },
  { id: 'luckyCrates', rarity: 'rare', glyph: '🎁', mods: { crateChanceMul: 1.5 } },
  { id: 'magnetBase', rarity: 'rare', glyph: '🧲', mods: { perfectWindowMul: 1.1, widthMul: 1.04 } },
  { id: 'momentum', rarity: 'rare', glyph: '⚡', mods: { perfectBonusMul: 1.5 } },
  { id: 'goldRush', rarity: 'epic', glyph: '★', mods: { goldChanceMul: 2 } },
  { id: 'safetyNet', rarity: 'epic', glyph: '🛟', mods: { freeRecoveries: 1 } },
];

const PERK_BY_ID = new Map(PERKS.map((p) => [p.id, p]));

const ADDITIVE_FIELDS = new Set<keyof PerkMods>(['wordLenBonusPerLetter', 'freeRecoveries']);

function neutralMods(): PerkMods {
  return {
    widthMul: 1,
    swingSpeedMul: 1,
    perfectWindowMul: 1,
    perfectBonusMul: 1,
    wordLenBonusPerLetter: 0,
    comboGainMul: 1,
    crateChanceMul: 1,
    goldChanceMul: 1,
    freeRecoveries: 0,
  };
}

export function combineMods(owned: PerkId[]): PerkMods {
  const mods = neutralMods();
  for (const id of owned) {
    const perk = PERK_BY_ID.get(id);
    if (!perk) continue;
    for (const [key, value] of Object.entries(perk.mods) as [keyof PerkMods, number][]) {
      mods[key] = ADDITIVE_FIELDS.has(key) ? mods[key] + value : mods[key] * value;
    }
  }
  return mods;
}

export function rollDraft(seed: number, floorIndex: number, owned: PerkId[]): Perk[] {
  const ownedSet = new Set(owned);
  const pool = PERKS.filter((p) => !ownedSet.has(p.id));
  const rng = mulberry32(mixSeed(seed, floorIndex));
  const picks: Perk[] = [];

  while (picks.length < 3 && pool.length > 0) {
    const total = pool.reduce((sum, p) => sum + RARITY_WEIGHT[p.rarity], 0);
    let roll = rng() * total;
    let index = pool.length - 1;
    for (let i = 0; i < pool.length; i++) {
      roll -= RARITY_WEIGHT[pool[i].rarity];
      if (roll < 0) {
        index = i;
        break;
      }
    }
    picks.push(pool.splice(index, 1)[0]);
  }
  return picks;
}
