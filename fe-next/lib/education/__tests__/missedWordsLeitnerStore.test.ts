import { describe, it, expect, beforeEach } from 'vitest';
import { loadLeitnerState, saveLeitnerState, leitnerStorageKey } from '../missedWordsLeitnerStore';

describe('missedWordsLeitnerStore', () => {
  beforeEach(() => localStorage.clear());

  it('GIVEN two students on one device WHEN each saves THEN neither sees the other', () => {
    saveLeitnerState('s1', { 'L::dog': { box: 3, due: 1, lapses: 0 } });
    expect(loadLeitnerState('s1')).toEqual({ 'L::dog': { box: 3, due: 1, lapses: 0 } });
    expect(loadLeitnerState('s2')).toEqual({});
  });

  it('GIVEN corrupt storage WHEN loaded THEN it is empty, and malformed entries are dropped', () => {
    localStorage.setItem(leitnerStorageKey('s1'), '{not json');
    expect(loadLeitnerState('s1')).toEqual({});
    localStorage.setItem(leitnerStorageKey('s1'), JSON.stringify({ a: { box: 1, due: 2, lapses: 0 }, b: { box: 'x' } }));
    expect(Object.keys(loadLeitnerState('s1'))).toEqual(['a']);
  });
});
