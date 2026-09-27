// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStoredPlayerStyle,
  setStoredPlayerStyle,
  clearStoredPlayerStyle,
  hasPlayerStyleModalBeenShown,
  markPlayerStyleModalShown,
} from './playerStyleStorage';

describe('playerStyleStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('returns null when no style is stored', () => {
    expect(getStoredPlayerStyle()).toBeNull();
  });

  it('round-trips a valid style key', () => {
    setStoredPlayerStyle('jazz');
    expect(getStoredPlayerStyle()).toBe('jazz');
  });

  it('ignores an invalid stored value (returns null, never a bogus key)', () => {
    localStorage.setItem('boggle_player_style', 'not-a-style');
    expect(getStoredPlayerStyle()).toBeNull();
  });

  it('clears a stored style', () => {
    setStoredPlayerStyle('rock');
    clearStoredPlayerStyle();
    expect(getStoredPlayerStyle()).toBeNull();
  });

  it('gates the one-time modal flag', () => {
    expect(hasPlayerStyleModalBeenShown()).toBe(false);
    markPlayerStyleModalShown();
    expect(hasPlayerStyleModalBeenShown()).toBe(true);
  });
});
