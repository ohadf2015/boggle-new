import { describe, it, expect } from 'vitest';
import {
  CHILD_AGE_THRESHOLD,
  ADULT_CAPABILITIES,
  CHILD_CAPABILITIES_DEFAULT,
  computeSocialTier,
  resolveSocialCapabilities,
  isFreeformRestricted,
  type SocialCapabilities,
} from './socialPolicy';

const NOW_YEAR = 2026;

describe('computeSocialTier', () => {
  it('returns "unknown" when no birth year is on record', () => {
    expect(computeSocialTier(null, NOW_YEAR)).toBe('unknown');
    expect(computeSocialTier(undefined, NOW_YEAR)).toBe('unknown');
  });

  it('returns "unknown" for garbage / impossible birth years', () => {
    expect(computeSocialTier(NaN, NOW_YEAR)).toBe('unknown');
    expect(computeSocialTier(0, NOW_YEAR)).toBe('unknown');
    expect(computeSocialTier(NOW_YEAR + 1, NOW_YEAR)).toBe('unknown'); // future
    expect(computeSocialTier(1800, NOW_YEAR)).toBe('unknown'); // >120y old
    expect(computeSocialTier(2026.5 as unknown as number, NOW_YEAR)).toBe('unknown');
  });

  it('treats anyone possibly under 13 as "child" (conservative boundary)', () => {
    // year-age <= 13 → could still be 12 → child
    expect(computeSocialTier(NOW_YEAR - 5, NOW_YEAR)).toBe('child'); // ~5
    expect(computeSocialTier(NOW_YEAR - 12, NOW_YEAR)).toBe('child'); // ~12
    expect(computeSocialTier(NOW_YEAR - 13, NOW_YEAR)).toBe('child'); // 12 or 13 → restrict
  });

  it('treats users guaranteed >= 13 as "adult" (year-age >= 14)', () => {
    expect(computeSocialTier(NOW_YEAR - 14, NOW_YEAR)).toBe('adult');
    expect(computeSocialTier(NOW_YEAR - 30, NOW_YEAR)).toBe('adult');
  });

  it('exposes the COPPA threshold as 13', () => {
    expect(CHILD_AGE_THRESHOLD).toBe(13);
  });
});

describe('resolveSocialCapabilities', () => {
  it('grants every social capability to adults', () => {
    expect(resolveSocialCapabilities('adult')).toEqual(ADULT_CAPABILITIES);
  });

  it('lets an adult voluntarily REDUCE their own functionality via override', () => {
    // The adult-action gate means only an adult can write their own override;
    // it can only restrict (never elevate beyond the adult baseline).
    const caps = resolveSocialCapabilities('adult', { publicRoomChat: false });
    expect(caps.publicRoomChat).toBe(false);
    expect(caps.friendMessaging).toBe(true); // untouched keys stay full
  });

  it('restricts children to the safe default (no stranger/freeform surfaces)', () => {
    const caps = resolveSocialCapabilities('child');
    expect(caps).toEqual(CHILD_CAPABILITIES_DEFAULT);
    expect(caps.publicRoomChat).toBe(false);
    expect(caps.friendMessaging).toBe(false);
    expect(caps.friendManagement).toBe(false);
    expect(caps.customDisplayName).toBe(false);
  });

  it('restricts unknown-age users exactly like children (airtight default)', () => {
    expect(resolveSocialCapabilities('unknown')).toEqual(CHILD_CAPABILITIES_DEFAULT);
  });

  it('lets an adult-set override RAISE specific capabilities for a child', () => {
    // adult enables friends-only chat for their kid
    const caps = resolveSocialCapabilities('child', {
      friendMessaging: true,
      friendManagement: true,
    });
    expect(caps.friendMessaging).toBe(true);
    expect(caps.friendManagement).toBe(true);
    // surfaces not in the override stay off
    expect(caps.publicRoomChat).toBe(false);
    expect(caps.customDisplayName).toBe(false);
  });

  it('lets an adult-set override turn a default-on capability OFF (level of functionality)', () => {
    const caps = resolveSocialCapabilities('child', { emojiReactions: false });
    expect(caps.emojiReactions).toBe(false);
  });

  it('does not mutate the shared default constant', () => {
    resolveSocialCapabilities('child', { publicRoomChat: true });
    expect(CHILD_CAPABILITIES_DEFAULT.publicRoomChat).toBe(false);
  });

  it('keeps emoji reactions on for children by default', () => {
    expect(CHILD_CAPABILITIES_DEFAULT.emojiReactions).toBe(true);
  });
});

describe('isFreeformRestricted', () => {
  it('is true for children and unknown-age users', () => {
    expect(isFreeformRestricted(resolveSocialCapabilities('child'))).toBe(true);
    expect(isFreeformRestricted(resolveSocialCapabilities('unknown'))).toBe(true);
  });

  it('is false for adults', () => {
    expect(isFreeformRestricted(resolveSocialCapabilities('adult'))).toBe(false);
  });

  it('becomes false once an adult re-enables the freeform surfaces', () => {
    const caps: SocialCapabilities = resolveSocialCapabilities('child', {
      publicRoomChat: true,
      friendMessaging: true,
      customDisplayName: true,
    });
    expect(isFreeformRestricted(caps)).toBe(false);
  });
});
