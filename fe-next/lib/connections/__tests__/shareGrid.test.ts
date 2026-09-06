import { describe, it, expect } from 'vitest';
import {
  bridgeSquare,
  gridCallout,
  buildDailyBridgeGrid,
  type BridgeOutcome,
} from '../shareGrid';

const clean = (over: Partial<BridgeOutcome> = {}): BridgeOutcome => ({
  reached: true,
  solved: true,
  wrongAttempts: 0,
  hintUsed: false,
  ...over,
});

describe('bridgeSquare — one LexiClash mark per bridge, by solve quality', () => {
  it('clean solve (0 wrong, no hint) → bolt', () => {
    expect(bridgeSquare(clean())).toBe('⚡');
  });
  it('solved with ≥1 wrong (no hint) → sparkle', () => {
    expect(bridgeSquare(clean({ wrongAttempts: 2 }))).toBe('💫');
  });
  it('solved using a hint → lightbulb (regardless of wrong count)', () => {
    expect(bridgeSquare(clean({ hintUsed: true }))).toBe('💡');
    expect(bridgeSquare(clean({ hintUsed: true, wrongAttempts: 3 }))).toBe('💡');
  });
  it('reached but not solved → miss', () => {
    expect(bridgeSquare(clean({ solved: false }))).toBe('✕');
  });
  it('never reached (ran out of lives earlier) → empty', () => {
    expect(bridgeSquare({ reached: false, solved: false, wrongAttempts: 0, hintUsed: false })).toBe('○');
  });
  it('never emits Wordle letter-squares', () => {
    const marks = [
      bridgeSquare(clean()),
      bridgeSquare(clean({ wrongAttempts: 1 })),
      bridgeSquare(clean({ hintUsed: true })),
      bridgeSquare(clean({ solved: false })),
      bridgeSquare({ reached: false, solved: false, wrongAttempts: 0, hintUsed: false }),
    ].join('');
    expect(marks).not.toContain('🟩');
    expect(marks).not.toContain('🟨');
    expect(marks).not.toContain('⬛');
    expect(marks).not.toContain('⬜');
  });
});

describe('gridCallout — the social praise hook', () => {
  it('all clean → perfect', () => {
    expect(gridCallout([clean(), clean(), clean()])).toBe('perfect');
  });
  it('all solved but with help (wrong/hint) → flawless (no fails)', () => {
    expect(gridCallout([clean(), clean({ wrongAttempts: 1 }), clean({ hintUsed: true })])).toBe('flawless');
  });
  it('exactly one unsolved → oneAway', () => {
    expect(gridCallout([clean(), clean(), clean({ solved: false })])).toBe('oneAway');
  });
  it('two-plus unsolved but at least one solved → solid', () => {
    expect(gridCallout([clean(), clean({ solved: false }), clean({ solved: false })])).toBe('solid');
  });
  it('zero solved → tough', () => {
    expect(gridCallout([clean({ solved: false }), clean({ solved: false })])).toBe('tough');
  });
});

describe('buildDailyBridgeGrid — assembled share text', () => {
  const base = {
    title: 'Word Bridge',
    dateISO: '2026-06-01',
    streak: 7,
    rank: 14 as number | null,
    url: 'play.lexiclash.app',
    callout: 'Perfect chain! ⚡',
  };

  it('puts LexiClash header on line 1, the chain on line 2, score line, then url', () => {
    const text = buildDailyBridgeGrid({
      ...base,
      outcomes: [clean(), clean(), clean({ wrongAttempts: 1 }), clean({ hintUsed: true }), clean({ solved: false })],
    });
    const lines = text.split('\n');
    expect(lines[0]).toBe('⚡ LEXICLASH · Word Bridge 2026-06-01');
    expect(lines[1]).toBe('⚡⚡💫💡✕');
    expect(text).toContain('Perfect chain! ⚡');
    expect(text).toContain('4/5'); // 4 solved of 5
    expect(text).toContain('🔥7');
    expect(text).toContain('#14');
    expect(lines[lines.length - 1]).toBe('play.lexiclash.app');
    expect(text).not.toContain('🟩');
    expect(text).not.toContain('🟨');
    expect(text).not.toContain('⬛');
    expect(text).not.toContain('⬜');
  });

  it('omits the rank token when rank is null', () => {
    const text = buildDailyBridgeGrid({ ...base, rank: null, outcomes: [clean(), clean()] });
    expect(text).not.toContain('#');
  });

  it('chain is language-agnostic — works for an RTL/Hebrew title unchanged', () => {
    const text = buildDailyBridgeGrid({
      ...base,
      title: 'גשר מילים',
      outcomes: [clean(), clean(), clean()],
    });
    expect(text.split('\n')[1]).toBe('⚡⚡⚡');
    expect(text).toContain('⚡ LEXICLASH · גשר מילים 2026-06-01');
  });

  it('counts solved correctly with a never-reached tail', () => {
    const text = buildDailyBridgeGrid({
      ...base,
      outcomes: [
        clean(),
        clean({ solved: false }),
        { reached: false, solved: false, wrongAttempts: 0, hintUsed: false },
      ],
    });
    expect(text.split('\n')[1]).toBe('⚡✕○');
    expect(text).toContain('1/3');
  });
});
