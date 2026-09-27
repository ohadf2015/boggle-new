import { describe, it, expect } from 'vitest';
import {
  AVATAR_MOODS,
  MOOD_EXPRESSIONS,
  applyMood,
  getMoodEffect,
  getMoodAnimationClass,
  type AvatarMood,
} from '@/lib/avatar/avatarMood';
// Single import from customAvatar (was split across two lines → no-duplicate-imports).
import {
  AVATAR_EYE_STYLES,
  AVATAR_EYEBROW_STYLES,
  AVATAR_MOUTH_STYLES,
  type CustomAvatarConfig,
} from '@/shared/types/customAvatar';

// Representative config — mapper only reads/overrides eyes/eyebrows/mouth + spreads the rest.
const baseConfig = {
  gender: 'female',
  base: 'round',
  skinColor: '#F0C8A0',
  hair: 'longWavy',
  hairColor: '#3A2A1A',
  eyes: 'galaxy', // a premium part — must be restored after a mood clears
  eyeColor: '#7B5CFF',
  eyebrows: 'arched',
  mouth: 'lipstick',
  accessory: 'crown',
} as unknown as CustomAvatarConfig;

describe('avatarMood — pure core', () => {
  describe('applyMood', () => {
    it('is identity for undefined mood (byte-identical render guarantee)', () => {
      expect(applyMood(baseConfig)).toBe(baseConfig);
    });

    it('is identity for idle mood', () => {
      expect(applyMood(baseConfig, 'idle')).toBe(baseConfig);
    });

    it('overrides eyes/eyebrows/mouth for an emotive mood', () => {
      const out = applyMood(baseConfig, 'correct');
      expect(out.eyes).toBe(MOOD_EXPRESSIONS.correct.eyes);
      expect(out.eyebrows).toBe(MOOD_EXPRESSIONS.correct.eyebrows);
      expect(out.mouth).toBe(MOOD_EXPRESSIONS.correct.mouth);
    });

    it('never mutates the input config (transient, not permanent)', () => {
      const snapshot = { ...baseConfig };
      applyMood(baseConfig, 'wrong');
      expect(baseConfig).toEqual(snapshot);
      // premium eyes survive on the original
      expect(baseConfig.eyes).toBe('galaxy');
    });

    it('preserves all non-expression fields', () => {
      const out = applyMood(baseConfig, 'streak');
      expect(out.skinColor).toBe(baseConfig.skinColor);
      expect(out.accessory).toBe(baseConfig.accessory);
      expect(out.hair).toBe(baseConfig.hair);
      expect(out.eyeColor).toBe(baseConfig.eyeColor);
    });
  });

  describe('MOOD_EXPRESSIONS vocabulary', () => {
    it('covers every mood in AVATAR_MOODS', () => {
      for (const mood of AVATAR_MOODS) {
        expect(MOOD_EXPRESSIONS[mood]).toBeDefined();
      }
    });

    it('maps only to valid avatar part enum values', () => {
      for (const mood of AVATAR_MOODS) {
        const e = MOOD_EXPRESSIONS[mood];
        if (e.eyes) expect(AVATAR_EYE_STYLES).toContain(e.eyes);
        if (e.eyebrows) expect(AVATAR_EYEBROW_STYLES).toContain(e.eyebrows);
        if (e.mouth) expect(AVATAR_MOUTH_STYLES).toContain(e.mouth);
      }
    });

    it('idle has no overrides', () => {
      expect(MOOD_EXPRESSIONS.idle.eyes).toBeUndefined();
      expect(MOOD_EXPRESSIONS.idle.mouth).toBeUndefined();
      expect(MOOD_EXPRESSIONS.idle.effect).toBe('none');
    });
  });

  describe('getMoodEffect / getMoodAnimationClass', () => {
    it('returns none/empty for undefined + idle', () => {
      expect(getMoodEffect()).toBe('none');
      expect(getMoodEffect('idle')).toBe('none');
      expect(getMoodAnimationClass()).toBe('');
      expect(getMoodAnimationClass('idle')).toBe('');
    });

    it('returns shake class for wrong', () => {
      expect(getMoodEffect('wrong')).toBe('shake');
      expect(getMoodAnimationClass('wrong')).toBe('avatar-mood-shake');
    });

    it('returns pop class for correct + win', () => {
      expect(getMoodAnimationClass('correct')).toBe('avatar-mood-pop');
      expect(getMoodAnimationClass('win')).toBe('avatar-mood-pop');
    });

    it('returns pulse class for streak', () => {
      expect(getMoodAnimationClass('streak')).toBe('avatar-mood-pulse');
    });
  });
});
