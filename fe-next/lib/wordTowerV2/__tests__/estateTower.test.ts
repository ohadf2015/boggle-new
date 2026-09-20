import { describe, expect, it } from 'vitest';
import { MAX_TOWER_BLOCKS, type TowerBlock, decodeTower, encodeTower } from '../estateTower';

const block = (i: number, word = `w${i}`): TowerBlock => ({
  word,
  w: 300,
  x: i % 2 ? 4.4 : -3.6,
  y: -60 - i * 120,
  angle: 0.01234,
  color: 0xa3e635,
});

describe('tower codec', () => {
  it('given a tower, when encoded and decoded, then it round-trips (rounded)', () => {
    const out = decodeTower(encodeTower([block(0), block(1)]));
    expect(out).toEqual([
      { word: 'w0', w: 300, x: -4, y: -60, angle: 0.012, color: 0xa3e635 },
      { word: 'w1', w: 300, x: 4, y: -180, angle: 0.012, color: 0xa3e635 },
    ]);
  });

  it('given an encoded tower, when serialised, then it is compact (tuples, not objects)', () => {
    const enc = encodeTower([block(0)]);
    expect(Array.isArray(enc[0])).toBe(true);
  });

  it('given a huge tower, when encoded, then it keeps the lowest MAX_TOWER_BLOCKS floors', () => {
    const blocks = Array.from({ length: 200 }, (_, i) => block(i));
    const out = decodeTower(encodeTower(blocks));
    expect(out).toHaveLength(MAX_TOWER_BLOCKS);
    expect(out[0].word).toBe('w0');
    expect(MAX_TOWER_BLOCKS).toBeLessThanOrEqual(60);
  });

  it('given bidi overrides and control chars in a word, when decoded, then they are stripped', () => {
    const out = decodeTower([['\u202Eevil\u0007', 300, 0, -60, 0, 0]]);
    expect(out[0].word).toBe('evil');
  });

  it('given hostile numbers, when decoded, then everything is clamped and junk rows dropped', () => {
    const out = decodeTower([
      ['ok', 1e9, -1e9, 1e9, 99, -1],
      ['', 300, 0, 0, 0, 0],
      'junk',
      [42, 'x'],
      { word: 'obj', w: 250, x: 1, y: -2, angle: 0, color: 0x123456 },
    ]);
    expect(out.map((b) => b.word)).toEqual(['ok', 'obj']);
    expect(out[0].w).toBeLessThanOrEqual(2000);
    expect(out[0].x).toBeGreaterThanOrEqual(-3000);
    expect(out[0].y).toBeLessThanOrEqual(200);
    expect(Math.abs(out[0].angle)).toBeLessThanOrEqual(Math.PI);
    expect(out[0].color).toBe(0);
  });

  it('given a non-array, when decoded, then it is empty', () => {
    expect(decodeTower(null)).toEqual([]);
    expect(decodeTower({ a: 1 })).toEqual([]);
  });
});
