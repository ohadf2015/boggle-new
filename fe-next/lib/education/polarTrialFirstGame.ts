/**
 * The card (Polar) Teacher Pro trial also restarts at the teacher's first class game:
 * 14 days from that moment, once, and set rather than added so it never stacks.
 *
 * Billing stays honest: Polar charges at the new trial end, `current_period_end` follows
 * via the subscription.updated webhook, and the day-before notice is owed again for the
 * new date (the day-10 cron ignores notices sent before the restart).
 */
import { teacherTrialExpiry } from './trial';

/** subscription_events.event_type written when the card trial restarts. */
export const POLAR_FIRST_GAME_RESTART_EVENT = 'polar_trial_first_game_restart';

export interface PolarTrialSubRow {
  tier: string;
  status: string;
  source: string | null;
  current_period_end: string | null;
  cancel_at_period_end?: boolean | null;
  /** Polar subscription id (the column keeps its LemonSqueezy-era name). */
  lemon_squeezy_subscription_id: string | null;
}

export function isLivePolarTrial(sub: PolarTrialSubRow | null | undefined): boolean {
  if (!sub) return false;
  return sub.tier === 'pro' && sub.status === 'trialing' && (sub.source || 'polar') !== 'admin_grant';
}

/**
 * The new Polar trial end, or null when nothing should change: not a live card trial, a
 * trial they already cancelled (no charge is coming, nothing to move), already restarted,
 * no Polar id, or a trial that already runs past 14 days from now.
 */
export function planPolarTrialFirstGameRestart(
  sub: PolarTrialSubRow | null | undefined,
  nowMs: number,
  alreadyRestarted: boolean,
): { subscriptionId: string; trialEnd: string } | null {
  if (!sub || !isLivePolarTrial(sub) || alreadyRestarted) return null;
  if (sub.cancel_at_period_end === true) return null;
  if (!sub.lemon_squeezy_subscription_id) return null;
  const next = teacherTrialExpiry(nowMs);
  const current = sub.current_period_end ? Date.parse(sub.current_period_end) : NaN;
  if (Number.isFinite(current) && current >= Date.parse(next)) return null;
  return { subscriptionId: sub.lemon_squeezy_subscription_id, trialEnd: next };
}

/**
 * Notices sent before the restart were about the old charge date. The day-10 and day-before
 * emails are owed again for the new one, so a charge is never made without its notice.
 */
export function noticesStillCounted<T extends { user_id: string | null; created_at?: string | null }>(
  sent: readonly T[],
  restartAtByUser: ReadonlyMap<string, string>,
): T[] {
  return sent.filter((r) => {
    if (!r.user_id) return false;
    const restartAt = restartAtByUser.get(r.user_id);
    if (!restartAt || !r.created_at) return true;
    return Date.parse(r.created_at) >= Date.parse(restartAt);
  });
}
