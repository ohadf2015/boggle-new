/**
 * Celebrity / politician lookalike bots — funny viral opponents.
 * Each celeb ships a handcrafted CustomAvatarConfig that caricatures the real person
 * (config, not image). These tests guard that the avatars actually render and that
 * the injection branch swaps in the handcrafted avatar (not the random seeded one).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateBotName } from './botCreation';
import { CELEBRITY_BOTS, CELEBRITY_CHANCE } from './botCelebrities';
import { customAvatarSchema } from '@/shared/types/customAvatar';

describe('celebrity bots', () => {
  afterEach(() => vi.restoreAllMocks());

  it('ships a sizable roster with unique names', () => {
    expect(CELEBRITY_BOTS.length).toBeGreaterThanOrEqual(12);
    const names = CELEBRITY_BOTS.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
    expect(CELEBRITY_CHANCE).toBeGreaterThan(0);
    expect(CELEBRITY_CHANCE).toBeLessThan(1);
  });

  it('every celebrity avatar is a valid CustomAvatarConfig (renders, not just types)', () => {
    for (const c of CELEBRITY_BOTS) {
      const r = customAvatarSchema.safeParse(c.customAvatar);
      expect(r.success ? '' : `${c.name}: ${JSON.stringify(r.error?.issues)}`).toBe('');
    }
  });

  it('injects a celebrity with its handcrafted avatar when the roll hits', () => {
    // Math.random=0 → 0 < CELEBRITY_CHANCE → celeb branch; index 0 of the available pool
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { name, avatar } = generateBotName('hard', [], 'en');
    const celeb = CELEBRITY_BOTS[0];
    expect(name).toContain(celeb.name);
    expect(avatar.customAvatar).toEqual(celeb.customAvatar);
    expect(avatar.emoji).toBe(celeb.emoji);
    expect(avatar.color).toBe(celeb.color);
  });

  it('does not repeat a celebrity already in the room', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const taken = `${CELEBRITY_BOTS[0].name} Bot`;
    const { name } = generateBotName('hard', [taken], 'en');
    // index 0 is filtered out, so the chosen celeb must be a different one
    expect(name).not.toContain(CELEBRITY_BOTS[0].name);
  });

  it('falls back to the regular pool when the roll misses', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999); // > CELEBRITY_CHANCE → regular
    const { name } = generateBotName('easy', [], 'en');
    const isCeleb = CELEBRITY_BOTS.some((c) => name.includes(c.name));
    expect(isCeleb).toBe(false);
  });
});
