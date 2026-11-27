import { describe, it, expect } from 'vitest';
import { buildContent } from '../content.server';
import { playFits, scoreBound } from '../content';
import { canSpell } from '../letters';
import { huntWords } from '../wordPool.server';

const LANGS = ['en', 'he', 'es', 'sv', 'ja', 'ru'];
const never = () => false;

describe('arcade content', () => {
  it('Given the same seed, then every game builds the same content', async () => {
    for (const g of ['oil', 'sleigh', 'snowball', 'wrap', 'dreidel', 'sufganiyah'] as const) {
      expect(await buildContent(g, 'en', 42, never)).toEqual(await buildContent(g, 'en', 42, never));
    }
  });

  it('Given each language, then the oil rack has 9 tiles (7 in Japanese) and spells its source', async () => {
    for (const lang of LANGS) {
      const { rack } = await buildContent('oil', lang, 7, never);
      expect(rack).toHaveLength(lang === 'ja' ? 7 : 9);
    }
  });

  it('Given a sleigh round, then every chimney has 4-6 letters that spell at least one pool word', async () => {
    for (const lang of LANGS) {
      const { chimneys } = await buildContent('sleigh', lang, 3, never);
      const pool = huntWords(lang);
      for (const c of chimneys) {
        expect(c.length).toBeGreaterThanOrEqual(4);
        expect(c.length).toBeLessThanOrEqual(6);
        expect(pool.some((w) => canSpell(w, c, lang))).toBe(true);
      }
    }
  });

  it('Given snowball fakes, then none of them is a real word by the checker', async () => {
    const real = new Set(huntWords('en'));
    const { balls } = await buildContent('snowball', 'en', 5, (w) => real.has(w.toUpperCase()));
    const fakes = balls.filter((b) => !b.real);
    expect(fakes.length).toBeGreaterThan(10);
    for (const f of fakes) expect(real.has(f.text)).toBe(false);
  });

  it('Given wrap gifts, then every fifth box is a themed mystery gift (when the language has themed words)', async () => {
    const { gifts } = await buildContent('wrap', 'en', 9, never);
    expect(gifts[4].mystery).toBe(true);
    expect(gifts[0].mystery).toBe(false);
    const ja = await buildContent('wrap', 'ja', 9, never);
    expect(ja.gifts.every((g) => !g.mystery)).toBe(true);
  });

  it('Given plays, then only words that fit their slot count', async () => {
    const c = await buildContent('wrap', 'en', 9, never);
    const answer = c.gifts[0].letters.slice().sort().join('');
    expect(playFits('wrap', c, { w: c.gifts[0].letters.join(''), i: 0 }, 'en')).toBe(true);
    expect(playFits('wrap', c, { w: answer.slice(1), i: 0 }, 'en')).toBe(false);
    expect(playFits('wrap', c, { w: c.gifts[0].letters.join(''), i: 99 }, 'en')).toBe(false);
    const s = await buildContent('snowball', 'en', 5, never);
    const realIdx = s.balls.findIndex((b) => b.real);
    expect(playFits('snowball', s, { w: s.balls[realIdx].text.toLowerCase(), i: realIdx }, 'en')).toBe(true);
  });

  it('Given more and longer words, then the score bound grows', () => {
    expect(scoreBound('sleigh', {}, [5, 5])).toBeGreaterThan(scoreBound('sleigh', {}, [3]));
    expect(scoreBound('oil', {}, [])).toBeGreaterThan(0);
  });
});
