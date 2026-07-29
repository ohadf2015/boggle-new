import { describe, it, expect, vi } from 'vitest';
import { getModeLabel } from './modeLabels';
import { OTHER_MODE } from './xpByMode';

describe('getModeLabel', () => {
  it('maps known modes to their leaderboard.gameModes i18n key', () => {
    const t = vi.fn((key: string) => `T(${key})`);
    expect(getModeLabel('classic', t)).toBe('T(leaderboard.gameModes.classic)');
    expect(getModeLabel('blast', t)).toBe('T(leaderboard.gameModes.blast)');
    expect(getModeLabel('word-hunt', t)).toBe('T(leaderboard.gameModes.wordHunt)');
    expect(getModeLabel('wheel-rush', t)).toBe('T(leaderboard.gameModes.wheelRush)');
    expect(getModeLabel('word-tower', t)).toBe('T(leaderboard.gameModes.wordTower)');
  });

  it('humanizes an unknown hyphenated mode id without calling t', () => {
    const t = vi.fn((key: string) => `T(${key})`);
    expect(getModeLabel('mystery-mode', t)).toBe('Mystery Mode');
    expect(t).not.toHaveBeenCalled();
  });

  it('humanizes a single-word unknown mode', () => {
    const t = vi.fn((key: string) => `T(${key})`);
    expect(getModeLabel('shiritori', t)).toBe('Shiritori');
  });

  it('labels the Other bucket via its dedicated i18n key', () => {
    const t = vi.fn((key: string) => `T(${key})`);
    expect(getModeLabel(OTHER_MODE, t)).toBe('T(profile.xpByMode.other)');
  });
});
