import { describe, it, expect } from 'vitest';
import { flowStepHref, flowStepMeta, DEFAULT_FLOW_STEPS } from '../flowSteps';

describe('flowStepHref', () => {
  it('locale-prefixes the mode path and appends the flow marker', () => {
    expect(flowStepHref('word-hunt', 'en')).toBe('/en/daily/word-hunt?flow=1');
    expect(flowStepHref('word-wheel', 'he')).toBe('/he/daily/word-wheel?flow=1');
  });

  it('merges the flow marker into a path that already has a query', () => {
    // word-tower ships as `/word-tower?daily=1` — must not clobber the query.
    expect(flowStepHref('word-tower', 'en')).toBe('/en/word-tower?daily=1&flow=1');
  });
});

describe('flowStepMeta', () => {
  it('returns display metadata for a known mode', () => {
    const meta = flowStepMeta('word-hunt');
    expect(meta).not.toBeNull();
    expect(meta?.titleKey).toBe('daily.wordHunt.title');
    expect(meta?.mascot).toBe('/daily/word-hunt-mascot.jpg');
  });
});

describe('DEFAULT_FLOW_STEPS', () => {
  it('chains the two public daily modes in play order', () => {
    expect(DEFAULT_FLOW_STEPS).toEqual(['word-hunt', 'word-wheel']);
  });
});
