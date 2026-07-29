/**
 * Test: Play Games local award state (one-time flags + distinct-languages set).
 */

import {
  hasAwardedFirstWord,
  markFirstWordAwarded,
  hasAwardedPolyglot,
  markPolyglotAwarded,
  hasAwardedOnARoll,
  markOnARollAwarded,
  getPlayStreak,
  recordLanguagePlayed,
} from './awardState';

describe('awardState', () => {
  beforeEach(() => localStorage.clear());

  it('First Word flag is false until marked, then true', () => {
    expect(hasAwardedFirstWord()).toBe(false);
    markFirstWordAwarded();
    expect(hasAwardedFirstWord()).toBe(true);
  });

  it('Polyglot flag is false until marked, then true', () => {
    expect(hasAwardedPolyglot()).toBe(false);
    markPolyglotAwarded();
    expect(hasAwardedPolyglot()).toBe(true);
  });

  it('counts distinct languages, ignoring repeats', () => {
    expect(recordLanguagePlayed('en')).toBe(1);
    expect(recordLanguagePlayed('en')).toBe(1);
    expect(recordLanguagePlayed('he')).toBe(2);
    expect(recordLanguagePlayed('sv')).toBe(3);
  });

  it('returns 0 for an empty language', () => {
    expect(recordLanguagePlayed('')).toBe(0);
  });

  it('On a Roll flag is false until marked, then true', () => {
    expect(hasAwardedOnARoll()).toBe(false);
    markOnARollAwarded();
    expect(hasAwardedOnARoll()).toBe(true);
  });

  it('reads the global play-streak from localStorage', () => {
    expect(getPlayStreak()).toBe(0);
    localStorage.setItem('lexiclash_win_streak', '7');
    expect(getPlayStreak()).toBe(7);
  });
});
