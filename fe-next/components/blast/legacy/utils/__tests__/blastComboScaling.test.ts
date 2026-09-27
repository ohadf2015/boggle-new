import {
  getWordLengthScaleFactor,
  scaledRadius,
  CODEX_COMBOS,
  CODEX_COMBO_COUNT,
} from '../blastComboScaling';

describe('getWordLengthScaleFactor', () => {
  it('returns 1.0 for word length 3', () => {
    expect(getWordLengthScaleFactor(3)).toBe(1.0);
  });

  it('returns 1.0 for word length 4', () => {
    expect(getWordLengthScaleFactor(4)).toBe(1.0);
  });

  it('returns 1.5 for word length 5', () => {
    expect(getWordLengthScaleFactor(5)).toBe(1.5);
  });

  it('returns 1.5 for word length 6', () => {
    expect(getWordLengthScaleFactor(6)).toBe(1.5);
  });

  it('returns 2.0 for word length 7', () => {
    expect(getWordLengthScaleFactor(7)).toBe(2.0);
  });

  it('returns 2.0 for word length 10', () => {
    expect(getWordLengthScaleFactor(10)).toBe(2.0);
  });
});

describe('scaledRadius', () => {
  it('returns 1 for base=1 scale=1.0', () => {
    expect(scaledRadius(1, 1.0)).toBe(1);
  });

  it('returns 2 for base=1 scale=1.5 (ceil)', () => {
    expect(scaledRadius(1, 1.5)).toBe(2);
  });

  it('returns 2 for base=1 scale=2.0', () => {
    expect(scaledRadius(1, 2.0)).toBe(2);
  });

  it('returns 3 for base=2 scale=1.5 (ceil)', () => {
    expect(scaledRadius(2, 1.5)).toBe(3);
  });
});

describe('CODEX_COMBOS', () => {
  it('contains exactly 24 entries', () => {
    expect(CODEX_COMBOS.length).toBe(24);
  });

  it('does NOT contain gold_special', () => {
    expect(CODEX_COMBOS).not.toContain('gold_special');
  });

  it('does NOT contain rainbow_special', () => {
    expect(CODEX_COMBOS).not.toContain('rainbow_special');
  });

  it('does NOT contain triple_special', () => {
    expect(CODEX_COMBOS).not.toContain('triple_special');
  });
});

describe('CODEX_COMBO_COUNT', () => {
  it('equals CODEX_COMBOS.length', () => {
    expect(CODEX_COMBO_COUNT).toBe(CODEX_COMBOS.length);
  });
});
