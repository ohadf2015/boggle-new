import { describe, it, expect, beforeEach } from 'vitest';
import { getCurrentLevel, setCurrentLevel, resetLevel, LEVEL_STORAGE_KEY } from '../levelStore';

describe('levelStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to 1 when no value stored', () => {
    expect(getCurrentLevel('en')).toBe(1);
    expect(getCurrentLevel('he')).toBe(1);
  });

  it('persists per locale', () => {
    setCurrentLevel('en', 17);
    setCurrentLevel('he', 42);
    expect(getCurrentLevel('en')).toBe(17);
    expect(getCurrentLevel('he')).toBe(42);
  });

  it('clamps writes to >= 1', () => {
    setCurrentLevel('en', 0);
    expect(getCurrentLevel('en')).toBe(1);
    setCurrentLevel('en', -5);
    expect(getCurrentLevel('en')).toBe(1);
  });

  it('uses LEVEL_STORAGE_KEY pattern', () => {
    setCurrentLevel('en', 9);
    expect(localStorage.getItem(LEVEL_STORAGE_KEY('en'))).toBe('9');
  });

  it('resetLevel returns to 1', () => {
    setCurrentLevel('en', 50);
    resetLevel('en');
    expect(getCurrentLevel('en')).toBe(1);
  });

  it('returns 1 if stored value is non-numeric garbage', () => {
    localStorage.setItem(LEVEL_STORAGE_KEY('en'), 'banana');
    expect(getCurrentLevel('en')).toBe(1);
  });
});
