import { describe, it, expect } from 'vitest';
import { commitSoundKeys, heatBeatSound, captureSound, gameOverSound } from '../soundPlan';

describe('commitSoundKeys', () => {
  it('every valid commit at least confirms the word', () => {
    expect(commitSoundKeys('soft', false, false)[0]).toBe('wordAccepted');
  });

  it('escalates the celebration sound by tier', () => {
    expect(commitSoundKeys('nice', false, false)).toContain('comboMilestone');
    expect(commitSoundKeys('great', false, false)).toContain('streakFire');
    expect(commitSoundKeys('huge', false, false)).toContain('streakMilestone');
    expect(commitSoundKeys('bingo', false, false)).toContain('megaCascade');
  });

  it('adds a rare-tile flourish when a rare tile is used', () => {
    expect(commitSoundKeys('great', true, false)).toContain('rareWord');
  });

  it('returns no duplicate keys', () => {
    const keys = commitSoundKeys('bingo', true, false);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('cosy mode clamps loud tiers down to a calm ceiling', () => {
    const bingoCosy = commitSoundKeys('bingo', false, true);
    // no mega/legendary blasts in cosy
    expect(bingoCosy).not.toContain('megaCascade');
    expect(bingoCosy).not.toContain('streakLegendary');
    // still confirms the word so the play never feels dead
    expect(bingoCosy[0]).toBe('wordAccepted');
    // cosy also suppresses the rare-tile sparkle layer
    expect(commitSoundKeys('great', true, true)).not.toContain('rareWord');
  });
});

describe('captureSound', () => {
  it('is silent when nothing was captured', () => {
    expect(captureSound(0)).toBeNull();
  });
  it('rings a coin for a small capture', () => {
    expect(captureSound(1)).toBe('coinCollect');
  });
  it('opens a chest for a big multi-cell capture', () => {
    expect(captureSound(3)).toBe('chestOpen');
  });
});

describe('heatBeatSound', () => {
  it('powers up entering overdrive', () => {
    expect(heatBeatSound('enter-overdrive')).toBe('powerUp');
  });
  it('breaks on burnout', () => {
    expect(heatBeatSound('enter-burnout')).toBe('comboBreak');
  });
  it('rewards recovery', () => {
    expect(heatBeatSound('recover')).toBe('levelUp');
  });
  it('is silent on a quiet exit', () => {
    expect(heatBeatSound('exit-overdrive')).toBeNull();
  });
});

describe('gameOverSound', () => {
  it('crowns a win, stings a loss, fanfares a draw', () => {
    expect(gameOverSound('win')).toBe('crownVictory');
    expect(gameOverSound('lose')).toBe('defeatSting');
    expect(gameOverSound('draw')).toBe('victoryFanfare');
  });
});
