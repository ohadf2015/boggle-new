import { describe, it, expect } from 'vitest';
import {
  idleMascotPose,
  reactionMascotPose,
  ERROR_MASCOT_POSE,
  TRANSPARENT_TOWER_POSES,
} from '../mascotPose';
import type { WordTowerBiomeId } from '@/shared/constants/wordTowerConstants';

const ALL_BIOMES: WordTowerBiomeId[] = ['city', 'sky', 'stratosphere', 'orbit', 'nebula', 'galaxy'];

describe('mascotPose', () => {
  it('every idle pose is a transparent (over-the-sky safe) variant', () => {
    for (const b of ALL_BIOMES) {
      expect(TRANSPARENT_TOWER_POSES).toContain(idleMascotPose(b));
    }
  });

  it('every reaction + error pose is transparent', () => {
    for (const tier of ['none', 'highRise', 'tall', 'skyscraper'] as const) {
      expect(TRANSPARENT_TOWER_POSES).toContain(reactionMascotPose(tier));
    }
    expect(TRANSPARENT_TOWER_POSES).toContain(ERROR_MASCOT_POSE);
  });

  it('starts grounded as an explorer and ends in cosmic awe', () => {
    expect(idleMascotPose('city')).toBe('explorerNobg');
    expect(idleMascotPose('galaxy')).toBe('mindblown');
  });

  it('a skyscraper word triggers the biggest reaction', () => {
    expect(reactionMascotPose('skyscraper')).toBe('mindblown');
    expect(reactionMascotPose('tall')).toBe('trophyNobg');
    expect(reactionMascotPose('highRise')).toBe('trophyNobg');
    expect(reactionMascotPose('none')).toBe('powerup');
  });

  it('a rejected word makes the mascot sulk', () => {
    expect(ERROR_MASCOT_POSE).toBe('cryingNobg');
  });
});
