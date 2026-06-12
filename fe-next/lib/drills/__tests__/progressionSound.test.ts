import { describe, it, expect } from 'vitest';
import { pickProgressionSound } from '../progressionSound';

describe('pickProgressionSound', () => {
  it('plays the level-up jingle when the drill promoted a level', () => {
    expect(
      pickProgressionSound({ levelUp: { newLevel: 3, previousLevel: 2 } }),
    ).toBe('levelUp');
  });

  it('prefers level-up over personal best when both happen', () => {
    expect(
      pickProgressionSound({
        levelUp: { newLevel: 2, previousLevel: 1 },
        improvement: { isPersonalBest: true },
      }),
    ).toBe('levelUp');
  });

  it('plays the achievement sting on a personal best (no level change)', () => {
    expect(pickProgressionSound({ improvement: { isPersonalBest: true } })).toBe(
      'personalBest',
    );
  });

  it('stays silent for a plain progression — the in-drill complete sound already fired', () => {
    expect(pickProgressionSound({})).toBeNull();
    expect(pickProgressionSound({ improvement: { isPersonalBest: false } })).toBeNull();
  });

  it('does not treat a non-promotion levelUp as a level-up (banner gate parity)', () => {
    // newLevel <= previousLevel: the overlay hides the banner, so no jingle.
    expect(pickProgressionSound({ levelUp: { newLevel: 2, previousLevel: 2 } })).toBeNull();
    expect(pickProgressionSound({ levelUp: { newLevel: 1, previousLevel: 2 } })).toBeNull();
  });

  it('falls back to personal best when levelUp did not actually promote', () => {
    expect(
      pickProgressionSound({
        levelUp: { newLevel: 2, previousLevel: 2 },
        improvement: { isPersonalBest: true },
      }),
    ).toBe('personalBest');
  });
});
