import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { loadGagHistory, saveGagHistory, GAG_HISTORY_KEY } from '../gagHistory';
import { createGagHistory } from '../gagDirector';

describe('gag history storage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('round-trips the history', () => {
    const h = { ...createGagHistory(), lastPlayedAt: 123, stage: { 'slow-clap': 2 } };
    saveGagHistory(h);
    expect(loadGagHistory()).toEqual(h);
  });

  it('a first visit has no last-played time', () => {
    expect(loadGagHistory().lastPlayedAt).toBeNull();
  });

  it('survives corrupt data and blocked storage', () => {
    localStorage.setItem(GAG_HISTORY_KEY, '{nope');
    expect(loadGagHistory()).toEqual(createGagHistory());
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => saveGagHistory(createGagHistory())).not.toThrow();
  });
});
