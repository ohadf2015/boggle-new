import { describe, it, expect } from 'vitest';
import { canSpell, displayWord, fold, minWordLength, wordPoints } from '../letters';
import { ARCADE_GAMES, gamesFor, isArcadeGame, roundCoins } from '../games';

describe('arcade letters', () => {
  it('Given accents, finals and case, when folded, then letters compare in one canonical form', () => {
    expect(fold('Canción', 'es')).toBe('CANCION');
    expect(fold('שלום', 'he')).toBe('שלומ');
    expect(fold('ёлка', 'ru')).toBe('ЕЛКА');
    expect(fold('snö', 'sv')).toBe('SNÖ');
    expect(fold('ゆき', 'ja')).toBe('ゆき');
  });

  it('Given a folded Hebrew word, when shown, then its last letter takes the final form', () => {
    expect(displayWord('שלומ', 'he')).toBe('שלום');
    expect(displayWord('SNOW', 'en')).toBe('SNOW');
  });

  it('Given a rack, when spelling, then each tile is used at most once', () => {
    const rack = ['L', 'A', 'T', 'K', 'E', 'S'];
    expect(canSpell('latke', rack, 'en')).toBe(true);
    expect(canSpell('stalk', rack, 'en')).toBe(true);
    expect(canSpell('tattle', rack, 'en')).toBe(false);
    expect(canSpell('שלום', ['ש', 'ל', 'ו', 'מ'], 'he')).toBe(true);
  });

  it('Given language, then the shortest word is 2 for he/ja and 3 elsewhere', () => {
    expect(minWordLength('he')).toBe(2);
    expect(minWordLength('ja')).toBe(2);
    expect(minWordLength('en')).toBe(3);
  });

  it('Given longer words, then points grow faster than length', () => {
    expect(wordPoints(3)).toBeLessThan(wordPoints(4));
    expect(wordPoints(8) / 8).toBeGreaterThan(wordPoints(4) / 4);
    expect(wordPoints(1)).toBe(0);
  });
});

describe('arcade games', () => {
  it('Given a holiday, then it keeps its three word games after the family games', () => {
    expect(gamesFor('hanukkah').slice(-3)).toEqual(['oil', 'dreidel', 'sufganiyah']);
    expect(gamesFor('christmas').slice(-3)).toEqual(['sleigh', 'snowball', 'wrap']);
    expect(isArcadeGame('oil')).toBe(true);
    expect(isArcadeGame('nope')).toBe(false);
    for (const g of Object.values(ARCADE_GAMES)) expect(g.cover).toMatch(/^\/holidays\/arcade[-/][a-z-]+\.webp$/);
  });

  it('Given a score, then round coins scale and stop at the round cap', () => {
    expect(roundCoins(0)).toBe(0);
    expect(roundCoins(250)).toBe(10);
    expect(roundCoins(1_000_000)).toBe(20);
  });
});
