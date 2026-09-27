/**
 * "Make this avatar yours" nudge — pure logic.
 *
 * On signup every user gets a RANDOM avatar, so the avatar config can never
 * tell us whether it's truly theirs. The `avatar_customized` flag (flipped the
 * moment they save from the builder) is the real signal. See spec
 * docs/2026-06-04-avatar-make-it-yours-nudge-spec.md.
 */

import type { ProfileData } from '@/contexts/auth/authTypes';

export interface AvatarNudgeInput {
  isAuthenticated: boolean;
  /** profiles.avatar_customized — undefined when the projection didn't fetch it. */
  avatarCustomized: boolean | undefined;
  /** Remote kill-switch (PostHog). */
  enabled: boolean;
  /** Snooze timestamp (ms) from a prior dismissal, or null. */
  dismissedUntil: number | null;
  /** Current time (ms) — injected for testability. */
  now: number;
}

/**
 * Decide whether to show the gentle avatar-customization hint.
 *
 * Fail-safe by design: only fires when `avatarCustomized === false` *explicitly*.
 * `undefined` (e.g. a profile loaded via a lean projection) is treated as
 * customized and suppressed, so we never nag a possible customizer.
 */
export function selectAvatarNudge({
  isAuthenticated,
  avatarCustomized,
  enabled,
  dismissedUntil,
  now,
}: AvatarNudgeInput): boolean {
  if (!isAuthenticated) return false;
  if (avatarCustomized !== false) return false;
  if (!enabled) return false;
  if (dismissedUntil !== null && now < dismissedUntil) return false;
  return true;
}

/**
 * Chokepoint helper: every deliberate avatar-builder save routes through
 * `useProfileManagement.updateUserProfile`. When an update carries an
 * `avatar_config` (and the caller hasn't set the flag), mark the avatar as
 * deliberately customized. The silent auto-assign + signup-insert paths use the
 * lower-level lib functions and never reach here, so they stay unflagged.
 *
 * Pure and non-mutating.
 */
export function withAvatarCustomizedFlag(
  updates: Partial<ProfileData>
): Partial<ProfileData> {
  if (!('avatar_config' in updates)) return updates;
  if (updates.avatar_customized !== undefined) return updates;
  return { ...updates, avatar_customized: true };
}
