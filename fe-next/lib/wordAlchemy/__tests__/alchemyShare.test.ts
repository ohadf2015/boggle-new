import { buildAlchemyShareText, stepEmoji, deriveScore } from '../alchemyShare';

const STEPS_PERFECT = [
  { wild: false, attempts: 0 },
  { wild: false, attempts: 0 },
];
const STEPS_MIXED = [
  { wild: true, attempts: 0 },
  { wild: false, attempts: 2 },
  { wild: false, attempts: 5 },
];

describe('stepEmoji', () => {
  it('returns 🔮 for wildcard step', () => {
    expect(stepEmoji({ wild: true, attempts: 0 })).toBe('🔮');
  });
  it('returns ✨ for 0-attempt step', () => {
    expect(stepEmoji({ wild: false, attempts: 0 })).toBe('✨');
  });
  it('returns 🟨 for 1–3 wrong attempts', () => {
    expect(stepEmoji({ wild: false, attempts: 1 })).toBe('🟨');
    expect(stepEmoji({ wild: false, attempts: 3 })).toBe('🟨');
  });
  it('returns 🟥 for 4+ wrong attempts', () => {
    expect(stepEmoji({ wild: false, attempts: 4 })).toBe('🟥');
    expect(stepEmoji({ wild: false, attempts: 9 })).toBe('🟥');
  });
});

describe('deriveScore', () => {
  it('100 per perfect step', () => {
    expect(deriveScore(STEPS_PERFECT)).toBe(200);
  });
  it('60 per wildcard step, 50 per 1-3 wrong, 20 per 4+ wrong', () => {
    expect(deriveScore(STEPS_MIXED)).toBe(60 + 50 + 20);
  });
  it('empty steps → 0', () => {
    expect(deriveScore([])).toBe(0);
  });
});

describe('buildAlchemyShareText', () => {
  it('includes mode name and emoji row', () => {
    const text = buildAlchemyShareText(STEPS_PERFECT, 1);
    expect(text).toContain('Word Alchemy');
    expect(text).toContain('✨✨');
  });
  it('includes puzzle number', () => {
    const text = buildAlchemyShareText(STEPS_PERFECT, 3);
    expect(text).toContain('3');
  });
  it('wildcard shown as 🔮', () => {
    const text = buildAlchemyShareText(STEPS_MIXED, 1);
    expect(text).toContain('🔮');
  });
  it('includes URL', () => {
    const text = buildAlchemyShareText(STEPS_PERFECT, 1);
    expect(text).toContain('lexiclash.com');
  });
});
