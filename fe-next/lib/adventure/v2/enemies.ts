import type { Locale, Tile } from './types';

const VOWELS_EN = new Set(['A', 'E', 'I', 'O', 'U']);
const VOWELS_HE = new Set(['א', 'ה', 'ו', 'י']);

export type Weakness =
  | { type: 'min-length'; n: number }
  | { type: 'vowel-heavy'; min: number }
  | { type: 'gold-used' }
  | { type: 'rare-used' };

export interface EnemyDef {
  id: string;
  name: string;
  nameHe: string;
  hp: number;
  atk: number;
  isBoss: boolean;
  weakness: Weakness;
  weaknessLabel: string;
  weaknessLabelHe: string;
}

export const ENEMY_DEFS: Record<string, EnemyDef> = {
  apprentice: {
    id: 'apprentice',
    name: 'APPRENTICE',
    nameHe: 'מתלמד',
    hp: 25,
    atk: 4,
    isBoss: false,
    weakness: { type: 'min-length', n: 4 },
    weaknessLabel: 'WEAK: 4+ LETTERS',
    weaknessLabelHe: 'חלש: 4 אותיות+',
  },
  hoarder: {
    id: 'hoarder',
    name: 'HOARDER',
    nameHe: 'אוגר',
    hp: 30,
    atk: 5,
    isBoss: false,
    weakness: { type: 'vowel-heavy', min: 3 },
    weaknessLabel: 'WEAK: VOWEL-HEAVY',
    weaknessLabelHe: 'חלש: עתיר תנועות',
  },
  predator: {
    id: 'predator',
    name: 'PREDATOR',
    nameHe: 'טורף',
    hp: 32,
    atk: 5,
    isBoss: false,
    weakness: { type: 'gold-used' },
    weaknessLabel: 'WEAK: GOLD TILES',
    weaknessLabelHe: 'חלש: אריחי זהב',
  },
  pressure: {
    id: 'pressure',
    name: 'THE PRESSURE',
    nameHe: 'הלחץ',
    hp: 40,
    atk: 6,
    isBoss: true,
    weakness: { type: 'min-length', n: 6 },
    weaknessLabel: 'WEAK: 6+ LETTERS',
    weaknessLabelHe: 'חלש: 6 אותיות+',
  },
};

/** Pick the enemy for a given combat number (1-based, last is the boss). */
export function enemyForCombat(combatNumber: number, isLast: boolean): EnemyDef {
  if (isLast) return ENEMY_DEFS.pressure;
  // Rotate non-boss enemies for variety
  const pool = ['apprentice', 'hoarder', 'predator'];
  const id = pool[(combatNumber - 1) % pool.length];
  return ENEMY_DEFS[id];
}

export function checkWeakness(
  weakness: Weakness,
  tiles: Tile[],
  word: string,
  locale: Locale,
): boolean {
  switch (weakness.type) {
    case 'min-length':
      return word.length >= weakness.n;
    case 'vowel-heavy': {
      const vset = locale === 'he' ? VOWELS_HE : VOWELS_EN;
      const count = tiles.filter((t) => vset.has(t.letter.toUpperCase())).length;
      return count >= weakness.min;
    }
    case 'gold-used':
      return tiles.some((t) => t.isGold);
    case 'rare-used':
      return tiles.some((t) => t.rarity === 'rare');
  }
}
