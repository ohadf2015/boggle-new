import { describe, it, expect } from 'vitest';
import { buildDropVerdict, formatHeightGain, verdictLabelKey, verdictTone } from '../dropVerdict';
import type { PlacementOutcome } from '../cranePlacement';

const outcome = (q: PlacementOutcome['quality'], over = 1, topples = false): PlacementOutcome => ({
  quality: q,
  overlap: over,
  heightMultiplier: q === 'perfect' ? 1.4 : q === 'good' ? 1 : q === 'sloppy' ? 0.6 : 0.3,
  perfect: q === 'perfect',
  topples,
});

describe('verdictLabelKey', () => {
  it('maps each quality to its own i18n key', () => {
    expect(verdictLabelKey('perfect')).toBe('wordTower.verdict.perfect');
    expect(verdictLabelKey('good')).toBe('wordTower.verdict.good');
    expect(verdictLabelKey('sloppy')).toBe('wordTower.verdict.sloppy');
    expect(verdictLabelKey('miss')).toBe('wordTower.verdict.miss');
  });
});

describe('verdictTone — band colour family', () => {
  it('matches the live band tint families (lime/cyan/yellow/red)', () => {
    expect(verdictTone('perfect')).toBe('lime');
    expect(verdictTone('good')).toBe('cyan');
    expect(verdictTone('sloppy')).toBe('yellow');
    expect(verdictTone('miss')).toBe('red');
  });
});

describe('formatHeightGain', () => {
  it('renders a signed, rounded metre string', () => {
    expect(formatHeightGain(12.4)).toBe('+12m');
    expect(formatHeightGain(0.6)).toBe('+1m');
  });

  it('never shows a misleading +0m for a positive gain — floors at +1m', () => {
    expect(formatHeightGain(0.2)).toBe('+1m');
  });

  it('shows +0m only for a genuine zero gain', () => {
    expect(formatHeightGain(0)).toBe('+0m');
  });

  it('clamps negatives to +0m (height never decreases on a drop)', () => {
    expect(formatHeightGain(-3)).toBe('+0m');
  });
});

describe('buildDropVerdict', () => {
  it('bundles label key, tone, gain text and perfect flag', () => {
    const v = buildDropVerdict(outcome('perfect'), 9);
    expect(v).toEqual({
      labelKey: 'wordTower.verdict.perfect',
      tone: 'lime',
      gainText: '+9m',
      perfect: true,
      toppled: false,
    });
  });

  it('flags a toppling miss so the UI can show the harsher beat', () => {
    const v = buildDropVerdict(outcome('miss', 0.2, true), 2);
    expect(v.labelKey).toBe('wordTower.verdict.miss');
    expect(v.tone).toBe('red');
    expect(v.toppled).toBe(true);
    expect(v.perfect).toBe(false);
  });
});
