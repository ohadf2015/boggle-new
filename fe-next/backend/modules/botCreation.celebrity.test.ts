/**
 * Celebrity / politician lookalike bots — funny viral opponents.
 * Each celeb ships a handcrafted CustomAvatarConfig that caricatures the real person
 * (config, not image). These tests guard that the avatars actually render and that
 * the injection branch swaps in the handcrafted avatar (not the random seeded one).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateBotName } from './botCreation';
import { CELEBRITY_BOTS, CELEBRITY_CHANCE } from './botCelebrities';
import {
  customAvatarSchema,
  isLegendaryPart,
  isPremiumPart,
  getPartPrice,
  getRandomAvatarConfig,
} from '@/shared/types/customAvatar';

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

describe('celebrity legendary part gating (bots free, players pay)', () => {
  it('trumpSwoop is a legendary, premium, priced part', () => {
    expect(isLegendaryPart('hair', 'trumpSwoop')).toBe(true);
    expect(isPremiumPart('hair', 'trumpSwoop')).toBe(true);
    expect(getPartPrice('hair', 'trumpSwoop')).toBeGreaterThanOrEqual(5000);
  });

  it('the Trump bot wears the legendary trumpSwoop (bots bypass purchase via config)', () => {
    const trump = CELEBRITY_BOTS.find((c) => c.name === 'Trump');
    expect(trump?.customAvatar.hair).toBe('trumpSwoop');
    // render path is ownership-agnostic: a valid config renders regardless of tier
    expect(customAvatarSchema.safeParse(trump?.customAvatar).success).toBe(true);
  });

  it('never hands a legendary celebrity part to a free random player avatar', () => {
    for (let i = 0; i < 200; i++) {
      expect(getRandomAvatarConfig().hair).not.toBe('trumpSwoop');
    }
  });
});
