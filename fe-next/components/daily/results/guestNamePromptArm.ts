import { getDailyChallengeDate } from '@/utils/dailyChallenge/dateUtils';

/**
 * A/B exp-guest-name-closable-v1: forced = the name prompt can't be closed
 * (current behaviour); closable = "Not now" closes it into the yellow
 * random-name bar for the rest of the day, and it comes back on the next
 * day's finish.
 *
 * Assigned locally from the guest fingerprint, not through PostHog or Growth
 * Radar flags: PostHog only sees visitors who accept tracking, and this needs
 * every guest. The arm rides on every daily_guest_name_* event, which
 * analytics_events stores for everyone.
 */
export const GUEST_NAME_EXPERIMENT = 'exp-guest-name-closable-v1';

export type GuestNamePromptArm = 'forced' | 'closable';

const DISMISSED_KEY = 'lexiclash_guest_name_prompt_dismissed_on';

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

export function getGuestNamePromptArm(guestFingerprint: string | null | undefined): GuestNamePromptArm {
  if (!guestFingerprint) return 'forced';
  return fnv1a(`${GUEST_NAME_EXPERIMENT}:${guestFingerprint}`) % 2 === 0 ? 'forced' : 'closable';
}

export function markGuestNamePromptDismissedToday(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, getDailyChallengeDate());
  } catch {
    // best effort
  }
}

export function wasGuestNamePromptDismissedToday(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === getDailyChallengeDate();
  } catch {
    return false;
  }
}
