import { describe, it, expect } from 'vitest';
import { flagFromQuery, resolveWordTowerFlag, WORD_TOWER_FLAGS } from '../flags';

describe('flagFromQuery', () => {
  it('reads truthy/falsey overrides, undefined when absent', () => {
    expect(flagFromQuery('?wt-hazards=1', 'wt-hazards')).toBe(true);
    expect(flagFromQuery('?wt-hazards=true', 'wt-hazards')).toBe(true);
    expect(flagFromQuery('?wt-hazards=on', 'wt-hazards')).toBe(true);
    expect(flagFromQuery('?wt-hazards=0', 'wt-hazards')).toBe(false);
    expect(flagFromQuery('?wt-hazards=false', 'wt-hazards')).toBe(false);
    expect(flagFromQuery('?other=1', 'wt-hazards')).toBeUndefined();
    expect(flagFromQuery('', 'wt-hazards')).toBeUndefined();
  });
});

describe('resolveWordTowerFlag', () => {
  it('uses the PostHog value when there is no query override', () => {
    expect(resolveWordTowerFlag('hazards', true, '')).toBe(true);
    expect(resolveWordTowerFlag('hazards', false, '')).toBe(false);
  });

  it('lets a query override win over PostHog (founder live-verify)', () => {
    expect(resolveWordTowerFlag('hazards', false, '?wt-hazards=1')).toBe(true);
    expect(resolveWordTowerFlag('zoneTease', true, '?wt-tease=0')).toBe(false);
  });
});

describe('WORD_TOWER_FLAGS defaults', () => {
  it('keeps the behaviour-changing hazard mechanic OFF until rolled out', () => {
    expect(WORD_TOWER_FLAGS.hazards.default).toBe(false);
    expect(WORD_TOWER_FLAGS.dailyTower.default).toBe(false);
    expect(WORD_TOWER_FLAGS.zoneTease.default).toBe(true); // harmless polish, on by default
  });
});
