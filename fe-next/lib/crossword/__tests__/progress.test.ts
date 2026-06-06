// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  emptyProgress,
  loadProgress,
  saveProgress,
  clearProgress,
  setEntry,
  storageKey,
} from '../progress';

describe('crossword progress (localStorage)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('emptyProgress starts a playing puzzle with no entries', () => {
    const p = emptyProgress('en-mini-001', 1000);
    expect(p.puzzleId).toBe('en-mini-001');
    expect(p.status).toBe('playing');
    expect(p.entries).toEqual({});
    expect(p.startedAt).toBe(1000);
  });

  it('returns null when no progress is stored', () => {
    expect(loadProgress('missing')).toBeNull();
  });

  it('round-trips save -> load', () => {
    const p = emptyProgress('en-mini-001', 1000);
    const withLetter = setEntry(p, 0, 0, 'C');
    saveProgress(withLetter);
    const loaded = loadProgress('en-mini-001');
    expect(loaded?.entries['0,0']).toBe('C');
    expect(loaded?.puzzleId).toBe('en-mini-001');
  });

  it('setEntry is immutable and normalizes empty letters by removing them', () => {
    const p = emptyProgress('x', 0);
    const a = setEntry(p, 1, 2, 'a');
    expect(p.entries['1,2']).toBeUndefined(); // original untouched
    expect(a.entries['1,2']).toBe('a');
    const b = setEntry(a, 1, 2, '');
    expect(b.entries['1,2']).toBeUndefined(); // clearing removes the key
  });

  it('clearProgress removes stored progress', () => {
    saveProgress(emptyProgress('y', 0));
    expect(loadProgress('y')).not.toBeNull();
    clearProgress('y');
    expect(loadProgress('y')).toBeNull();
  });

  it('returns null on corrupt stored JSON instead of throwing', () => {
    localStorage.setItem(storageKey('bad'), '{not json');
    expect(loadProgress('bad')).toBeNull();
  });
});
