import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  readGuestProgress,
  writeGuestProgress,
  clearGuestProgress,
  readResumeHint,
  writeResumeHint,
  GUEST_PROGRESS_KEY,
  RESUME_HINT_KEY,
} from '../guestProgress';

/**
 * Guest progress localStorage helper — Plan 3b.
 * Guests persist only their level position (+ locale); coins/chests are
 * server-only (need a user_id), so they are intentionally not stored here.
 */
describe('guestProgress', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns null when nothing is stored', () => {
    expect(readGuestProgress()).toBeNull();
  });

  it('round-trips a written value', () => {
    writeGuestProgress({ currentLevel: 5, locale: 'sv' });
    expect(readGuestProgress()).toEqual({ currentLevel: 5, locale: 'sv' });
  });

  it('clear empties the stored value', () => {
    writeGuestProgress({ currentLevel: 3, locale: 'en' });
    clearGuestProgress();
    expect(readGuestProgress()).toBeNull();
  });

  it('returns null for corrupt JSON', () => {
    localStorage.setItem(GUEST_PROGRESS_KEY, '{not json');
    expect(readGuestProgress()).toBeNull();
  });

  it('returns null when currentLevel is below 1', () => {
    localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify({ currentLevel: 0, locale: 'en' }));
    expect(readGuestProgress()).toBeNull();
  });

  it('returns null when currentLevel is missing or not a number', () => {
    localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify({ locale: 'en' }));
    expect(readGuestProgress()).toBeNull();
    localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify({ currentLevel: 'x', locale: 'en' }));
    expect(readGuestProgress()).toBeNull();
  });

  it('defaults locale to "en" when missing', () => {
    localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify({ currentLevel: 4 }));
    expect(readGuestProgress()).toEqual({ currentLevel: 4, locale: 'en' });
  });

  it('write swallows quota/storage errors (best-effort)', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });
    expect(() => writeGuestProgress({ currentLevel: 2, locale: 'en' })).not.toThrow();
    spy.mockRestore();
  });
});

describe('resume hint (paint-only fast path for all users)', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('returns null when no hint is stored', () => {
    expect(readResumeHint()).toBeNull();
  });

  it('round-trips a written hint', () => {
    writeResumeHint(7);
    expect(readResumeHint()).toBe(7);
    expect(localStorage.getItem(RESUME_HINT_KEY)).not.toBeNull();
  });

  it('returns null for a non-positive / non-integer / corrupt hint', () => {
    localStorage.setItem(RESUME_HINT_KEY, '0');
    expect(readResumeHint()).toBeNull();
    localStorage.setItem(RESUME_HINT_KEY, '2.5');
    expect(readResumeHint()).toBeNull();
    localStorage.setItem(RESUME_HINT_KEY, 'abc');
    expect(readResumeHint()).toBeNull();
  });

  it('write swallows storage errors', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });
    expect(() => writeResumeHint(3)).not.toThrow();
    spy.mockRestore();
  });
});
