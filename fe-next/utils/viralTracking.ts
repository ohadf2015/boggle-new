/**
 * Viral tracking utilities — track referral invite events for growth analytics.
 */

const REFERRAL_INVITE_COUNT_KEY = 'lexiclash_referral_invites_sent';

/**
 * Track that the user sent a referral invite (share link).
 * Increments a local counter and logs for analytics.
 */
export function trackReferralInviteSent(): void {
  if (typeof window === 'undefined') return;

  try {
    const stored = localStorage.getItem(REFERRAL_INVITE_COUNT_KEY);
    const count = stored ? parseInt(stored, 10) : 0;
    localStorage.setItem(REFERRAL_INVITE_COUNT_KEY, String(count + 1));
  } catch {
    // Storage unavailable
  }
}

/**
 * Get the total number of referral invites sent by this user.
 */
export function getReferralInviteCount(): number {
  if (typeof window === 'undefined') return 0;

  try {
    const stored = localStorage.getItem(REFERRAL_INVITE_COUNT_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}
