import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCurrentLives,
  setCurrentLives,
  resetLives,
  LIVES_STORAGE_KEY,
  MAX_LIVES,
} from '../livesStore';

describe('livesStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to MAX_LIVES when no value stored', () => {
    expect(getCurrentLives('en')).toBe(MAX_LIVES);
    expect(getCurrentLives('he')).toBe(MAX_LIVES);
  });

  it('persists per locale', () => {
    setCurrentLives('en', 2);
    setCurrentLives('he', 1);
    expect(getCurrentLives('en')).toBe(2);
    expect(getCurrentLives('he')).toBe(1);
  });

  it('clamps writes to [0..MAX_LIVES]', () => {
    setCurrentLives('en', -1);
    expect(getCurrentLives('en')).toBe(0);
    setCurrentLives('en', MAX_LIVES + 5);
    expect(getCurrentLives('en')).toBe(MAX_LIVES);
  });

  it('uses LIVES_STORAGE_KEY pattern', () => {
    setCurrentLives('en', 2);
    expect(localStorage.getItem(LIVES_STORAGE_KEY('en'))).toBe('2');
  });

  it('resetLives returns to MAX_LIVES', () => {
    setCurrentLives('en', 0);
    resetLives('en');
    expect(getCurrentLives('en')).toBe(MAX_LIVES);
  });

  it('returns MAX_LIVES if stored value is non-numeric garbage', () => {
    localStorage.setItem(LIVES_STORAGE_KEY('en'), 'banana');
    expect(getCurrentLives('en')).toBe(MAX_LIVES);
  });

  it('zero is a valid stored value (out-of-lives state)', () => {
    setCurrentLives('en', 0);
    expect(getCurrentLives('en')).toBe(0);
  });
});
