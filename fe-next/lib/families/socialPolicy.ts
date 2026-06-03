/**
 * Google Families Policy — social capability policy (pure logic).
 *
 * One object describes what social surfaces a user may touch, derived from an
 * age-based "tier". Children (and users of unknown age) are restricted out of
 * stranger/freeform communication by default; an adult-action-gated panel may
 * RAISE specific capabilities via an override.
 *
 * Keep this file pure (no IO, no Date.now) so both client and server resolve
 * capabilities identically and it stays trivially testable. Callers pass the
 * current year in.
 *
 * See docs/2026-06-03-families-policy-social-compliance.md
 */

/** COPPA child threshold. Users who may be under this age are restricted. */
export const CHILD_AGE_THRESHOLD = 13;

/** Oldest plausible age — anything beyond is treated as a garbage entry. */
const MAX_PLAUSIBLE_AGE = 120;

export type SocialTier = 'adult' | 'child' | 'unknown';

export interface SocialCapabilities {
  /** Freeform text chat with strangers in a game room. */
  publicRoomChat: boolean;
  /** 1:1 direct messages. */
  friendMessaging: boolean;
  /** Send/accept friend requests + search users (acquire contacts). */
  friendManagement: boolean;
  /**
   * Set a freeform display name visible to other players.
   * NOTE: resolved + managed here, but the display-name WRITE path is not yet
   * gated by this flag — see docs out-of-scope. Lower-risk than chat/DM.
   */
  customDisplayName: boolean;
  /** The 6 fixed emoji reactions (no freeform). */
  emojiReactions: boolean;
}

export const ADULT_CAPABILITIES: SocialCapabilities = Object.freeze({
  publicRoomChat: true,
  friendMessaging: true,
  friendManagement: true,
  customDisplayName: true,
  emojiReactions: true,
});

/**
 * Safe default for children / unknown-age users: every freeform & contact-
 * acquisition surface OFF. Emoji reactions (fixed, non-freeform) stay on.
 */
export const CHILD_CAPABILITIES_DEFAULT: SocialCapabilities = Object.freeze({
  publicRoomChat: false,
  friendMessaging: false,
  friendManagement: false,
  customDisplayName: false,
  emojiReactions: true,
});

/**
 * Derive a social tier from a birth YEAR (we intentionally store year-only to
 * minimise PII collected from children).
 *
 * Year-only age is ±1 ambiguous (the birthday may not have passed yet), so we
 * use a conservative boundary: a user is only "adult" when they are GUARANTEED
 * to be >= CHILD_AGE_THRESHOLD, i.e. (currentYear - birthYear) >= threshold + 1.
 * Anyone who could still be under the threshold is treated as a child.
 */
export function computeSocialTier(
  birthYear: number | null | undefined,
  currentYear: number,
): SocialTier {
  if (birthYear == null || !Number.isInteger(birthYear)) return 'unknown';
  const yearAge = currentYear - birthYear;
  if (yearAge < 0 || yearAge > MAX_PLAUSIBLE_AGE) return 'unknown';
  // yearAge <= threshold → could be below threshold → restrict as child.
  return yearAge <= CHILD_AGE_THRESHOLD ? 'child' : 'adult';
}

/**
 * Resolve effective capabilities for a tier.
 * - adult: always full (override ignored — adults need no raising).
 * - child/unknown: safe default, then merged with an adult-set override. The
 *   "a child cannot raise their own caps" invariant is enforced at the write
 *   path (the override is only writable behind an adult-action gate), not here.
 */
export function resolveSocialCapabilities(
  tier: SocialTier,
  adultOverride?: Partial<SocialCapabilities> | null,
): SocialCapabilities {
  if (tier === 'adult') return { ...ADULT_CAPABILITIES };
  return { ...CHILD_CAPABILITIES_DEFAULT, ...(adultOverride ?? {}) };
}

/**
 * True when the user is blocked from any stranger/freeform exchange surface —
 * used to decide whether to show the neutral age screen / safety reminder.
 */
export function isFreeformRestricted(caps: SocialCapabilities): boolean {
  return !(caps.publicRoomChat || caps.friendMessaging || caps.customDisplayName);
}
