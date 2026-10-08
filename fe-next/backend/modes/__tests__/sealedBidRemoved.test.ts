import { describe, it, expect } from 'vitest';
import { getGameModeModule, getGameModeRules } from '../index';
import { classicMode } from '../classic';

describe('sealed-bid mode removed', () => {
  it('falls back to classic for a legacy sealed-bid mode string', () => {
    expect(getGameModeModule('sealed-bid')).toBe(classicMode);
    expect(getGameModeRules('sealed-bid')).toBe(getGameModeRules('classic'));
  });
});
