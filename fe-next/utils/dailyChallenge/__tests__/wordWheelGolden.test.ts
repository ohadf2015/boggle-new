import { describe, it, expect } from 'vitest';
import { GOLDEN_MIN_LENGTH, goldenWordKey, pangramCandidates, pickGoldenWord } from '../wordWheelGolden';

const dict = (words: string[]) => {
  const set = new Set(words.map((w) => w.toUpperCase()));
  return (w: string) => set.has(w.toUpperCase());
};

describe('pangramCandidates', () => {
  it('Given a 7-letter wheel, Then returns every dictionary word that uses all 7 letters once', () => {
    const letters = ['S', 'T', 'R', 'A', 'I', 'N', 'E'];
    const found = pangramCandidates(letters, dict(['retains', 'nastier', 'stainer', 'rain', 'retinas']));
    expect(found.sort()).toEqual(['NASTIER', 'RETAINS', 'RETINAS', 'STAINER']);
  });

  it('Given no 7+ letter word on the wheel, Then there are no candidates', () => {
    expect(pangramCandidates(['S', 'T', 'R', 'A', 'I', 'N', 'E'], dict(['rain', 'stain']))).toEqual([]);
    expect(GOLDEN_MIN_LENGTH).toBe(7);
  });

  it('Given fewer than 7 letters, Then there are no candidates', () => {
    expect(pangramCandidates(['C', 'A', 'T'], dict(['cat', 'act']))).toEqual([]);
  });
});

describe('pickGoldenWord', () => {
  it('is deterministic per date and language, whatever the candidate order', () => {
    const a = pickGoldenWord(['RETAINS', 'NASTIER', 'STAINER'], '2026-11-09', 'en');
    const b = pickGoldenWord(['STAINER', 'RETAINS', 'NASTIER'], '2026-11-09', 'en');
    expect(a).toBe(b);
    expect(['RETAINS', 'NASTIER', 'STAINER']).toContain(a);
  });

  it('Given no candidates, Then there is no golden word', () => {
    expect(pickGoldenWord([], '2026-11-09', 'en')).toBeNull();
  });
});

describe('goldenWordKey', () => {
  it('matches only the same word, date and language, case-insensitively', () => {
    const key = goldenWordKey('retains', '2026-11-09', 'en');
    expect(goldenWordKey('RETAINS', '2026-11-09', 'en')).toBe(key);
    expect(goldenWordKey('NASTIER', '2026-11-09', 'en')).not.toBe(key);
    expect(goldenWordKey('RETAINS', '2026-11-10', 'en')).not.toBe(key);
    expect(key).not.toContain('RETAINS');
  });
});
