import type { Tile } from '../types';
import type { UpgradeId } from '../upgrades';
import { calculateDamage } from './damageCalculator';

const VOWELS_EN = new Set(['A', 'E', 'I', 'O', 'U']);
const VOWELS_HE = new Set(['א', 'ה', 'ו', 'י']);

function isVowel(letter: string, locale: 'en' | 'he'): boolean {
  return locale === 'he' ? VOWELS_HE.has(letter) : VOWELS_EN.has(letter.toUpperCase());
}

interface PlayerDamageContext {
  tiles: Tile[];
  word: string;
  upgrades: ReadonlyArray<UpgradeId>;
  locale: 'en' | 'he';
  heroAtk?: number;
}

export interface PlayerDamageResult {
  damage: number;
  crit: boolean;
}

export function calculatePlayerDamage(ctx: PlayerDamageContext): PlayerDamageResult {
  const upgrades = new Set(ctx.upgrades);
  let runeBonusSum = 0;
  let tiles = ctx.tiles;

  if (upgrades.has('vowel_surge')) {
    const vowelCount = ctx.tiles.filter((t) => isVowel(t.letter, ctx.locale)).length;
    if (vowelCount >= 3) runeBonusSum += 0.5;
  }

  if (upgrades.has('long_word_rage') && ctx.word.length >= 6) {
    runeBonusSum += 0.5;
  }

  if (upgrades.has('rare_treasure')) {
    tiles = tiles.map((t) =>
      t.rarity === 'rare' ? { ...t, letterValue: t.letterValue * 3 } : t,
    );
  }

  let critRoll = 1.0;
  let crit = false;
  if (upgrades.has('critical_spell') && Math.random() < 0.25) {
    critRoll = 2.0;
    crit = true;
  }

  const damage = calculateDamage(tiles, {
    critRoll,
    runeBonusSum,
    heroAtk: ctx.heroAtk ?? 1,
  });

  return { damage, crit };
}
