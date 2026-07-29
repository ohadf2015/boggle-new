import { describe, it, expect } from 'vitest';
import { generateWordForgeGrid } from '../gridGenerator';

const isHebrew = (ch: string) => {
  const c = ch.charCodeAt(0);
  return c >= 0x05d0 && c <= 0x05ea; // alef..tav (regular forms only)
};
const isLatinUpper = (ch: string) => /^[A-Z]$/.test(ch);

describe('generateWordForgeGrid language support', () => {
  it('defaults to English letters (no regression)', () => {
    const grid = generateWordForgeGrid(5);
    expect(grid).toHaveLength(5);
    expect(grid.every((row) => row.length === 5)).toBe(true);
    const flat = grid.flat();
    expect(flat.every(isLatinUpper)).toBe(true);
  });

  it('generates a Hebrew grid when language is "he"', () => {
    const grid = generateWordForgeGrid(5, 'he');
    expect(grid).toHaveLength(5);
    expect(grid.every((row) => row.length === 5)).toBe(true);
    const flat = grid.flat();
    // Every tile is a Hebrew letter, none are Latin
    expect(flat.every(isHebrew)).toBe(true);
    expect(flat.some(isLatinUpper)).toBe(false);
  });

  it('Hebrew grid uses only regular (non-sofit) forms on the board', () => {
    // Bag holds regular forms; sofit is a display-only transform applied to
    // the selected word, never to static board tiles.
    const sofits = new Set(['ך', 'ם', 'ן', 'ף', 'ץ']);
    const grid = generateWordForgeGrid(5, 'he');
    expect(grid.flat().some((ch) => sofits.has(ch))).toBe(false);
  });

  it('honors a 4×4 size for the shrink constraint', () => {
    const grid = generateWordForgeGrid(4, 'he');
    expect(grid).toHaveLength(4);
    expect(grid.every((row) => row.length === 4)).toBe(true);
  });
});
