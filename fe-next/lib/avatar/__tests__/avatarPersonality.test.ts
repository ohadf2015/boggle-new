import { describe, it, expect } from 'vitest';
import {
  getAvatarTrait,
  applyTrait,
  AVATAR_TRAITS,
  type AvatarTrait,
} from '@/lib/avatar/avatarPersonality';

describe('getAvatarTrait', () => {
  it('is deterministic — same player always gets the same trait', () => {
    expect(getAvatarTrait('Alice')).toBe(getAvatarTrait('Alice'));
    expect(getAvatarTrait('Bob')).toBe(getAvatarTrait('Bob'));
  });

  it('always returns a valid trait', () => {
    for (const name of ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'x', '日本語', '']) {
      expect(AVATAR_TRAITS).toContain(getAvatarTrait(name));
    }
  });

  it('the majority of players are "standard" (personalities are spice, not the norm)', () => {
    const names = Array.from({ length: 400 }, (_, i) => `player_${i}`);
    const standard = names.filter((n) => getAvatarTrait(n) === 'standard').length;
    const frac = standard / names.length;
    // ~52% standard by design — assert a comfortable band.
    expect(frac).toBeGreaterThan(0.4);
    expect(frac).toBeLessThan(0.65);
  });

  it('produces a spread of non-standard traits across a population', () => {
    const names = Array.from({ length: 400 }, (_, i) => `u${i}`);
    const seen = new Set(names.map(getAvatarTrait));
    // Every trait should appear at least once in 400 players.
    for (const t of AVATAR_TRAITS) expect(seen.has(t)).toBe(true);
  });
});

describe('applyTrait', () => {
  it('standard returns the base mood unchanged', () => {
    expect(applyTrait('correct', 'standard')).toBe('correct');
    expect(applyTrait('streak', 'standard')).toBe('streak');
    expect(applyTrait('emoteShock', 'standard')).toBe('emoteShock');
  });

  it('smug celebrates a score with cool shades instead of a plain grin', () => {
    expect(applyTrait('correct', 'smug')).toBe('emoteCool');
  });

  it('hyped is extra-expressive on a score', () => {
    expect(applyTrait('correct', 'hyped')).toBe('emoteLaugh');
  });

  it('chaotic clowns a big moment (tongue out) instead of flaming', () => {
    expect(applyTrait('streak', 'chaotic')).toBe('emoteSilly');
  });

  it('stoic ignores ordinary scores (null = stay neutral)', () => {
    expect(applyTrait('correct', 'stoic')).toBeNull();
  });

  it('every trait still flinches when overtaken (the drama must always land)', () => {
    for (const t of AVATAR_TRAITS) {
      expect(applyTrait('emoteShock', t as AvatarTrait)).toBe('emoteShock');
    }
  });

  it('passes through null (no event) for every trait', () => {
    for (const t of AVATAR_TRAITS) {
      expect(applyTrait(null, t as AvatarTrait)).toBeNull();
    }
  });
});
