/**
 * Polar Teacher Pro churn watch — daily poll, alert on status change.
 *
 * Webhook dunning (lib/education/dunning.ts) emails the teacher on
 * subscription.past_due. This module is the founder-facing belt: if Polar
 * flips the only paying Teacher Pro sub to past_due/canceled (or the row
 * disappears), Ohad gets a Telegram instead of finding out from a missing
 * $9 renewal.
 *
 * Pure functions live here so the cron route and tests share one policy.
 */

export const TEACHER_PRO_CHURN_ALERT_STATUSES = [
  'past_due',
  'canceled',
  'unpaid',
  'incomplete_expired',
] as const;

export type TeacherProChurnAlertStatus =
  (typeof TEACHER_PRO_CHURN_ALERT_STATUSES)[number];

export type TeacherProSubSnapshot = {
  id: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  email: string | null;
  amount: number | null;
  currency: string | null;
  currentPeriodEnd: string | null;
  startedAt: string | null;
};

export const TEACHER_PRO_CHURN_REDIS_KEY = 'cron:teacher-pro-churn-watch:last';

export function isTeacherProChurnAlertStatus(
  status: string,
): status is TeacherProChurnAlertStatus {
  return (TEACHER_PRO_CHURN_ALERT_STATUSES as readonly string[]).includes(status);
}

export function isAlertingSnapshot(sub: TeacherProSubSnapshot): boolean {
  return isTeacherProChurnAlertStatus(sub.status) || sub.cancelAtPeriodEnd;
}

export function snapshotFingerprint(sub: TeacherProSubSnapshot): string {
  return `${sub.id}|${sub.status}|${sub.cancelAtPeriodEnd ? '1' : '0'}`;
}

export function snapshotsFingerprint(subs: TeacherProSubSnapshot[]): string {
  return [...subs]
    .map(snapshotFingerprint)
    .sort()
    .join(';');
}

export type PolarSubscriptionLike = {
  id?: string | null;
  status?: string | null;
  cancel_at_period_end?: boolean | null;
  amount?: number | null;
  currency?: string | null;
  current_period_end?: string | null;
  started_at?: string | null;
  created_at?: string | null;
  customer?: { email?: string | null } | null;
};

export function snapshotFromPolar(sub: PolarSubscriptionLike): TeacherProSubSnapshot | null {
  const id = String(sub.id ?? '');
  if (!id) return null;
  return {
    id,
    status: String(sub.status ?? 'unknown'),
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    email: sub.customer?.email ?? null,
    amount: typeof sub.amount === 'number' ? sub.amount : null,
    currency: sub.currency ?? null,
    currentPeriodEnd: sub.current_period_end ?? null,
    startedAt: sub.started_at ?? sub.created_at ?? null,
  };
}

export type ChurnTransition = {
  shouldNotify: boolean;
  reasons: string[];
  alerting: TeacherProSubSnapshot[];
  missingIds: string[];
};

/**
 * Compare yesterday's snapshot to Polar's current list.
 *
 * First healthy run is silent (baseline). First run that already looks like
 * churn still notifies — better a one-time false alarm than missing customer #1.
 */
export function detectChurnTransitions(
  prev: TeacherProSubSnapshot[] | null,
  curr: TeacherProSubSnapshot[],
): ChurnTransition {
  const alerting = curr.filter(isAlertingSnapshot);
  const missingIds =
    prev?.filter((p) => !curr.some((c) => c.id === p.id)).map((p) => p.id) ?? [];
  const reasons: string[] = [];

  if (prev === null) {
    if (curr.length === 0) {
      reasons.push('no Teacher Pro subscriptions returned from Polar');
    }
    for (const sub of alerting) {
      reasons.push(describeAlert(sub, null));
    }
    return {
      shouldNotify: reasons.length > 0,
      reasons,
      alerting,
      missingIds: [],
    };
  }

  if (snapshotsFingerprint(prev) === snapshotsFingerprint(curr) && missingIds.length === 0) {
    return { shouldNotify: false, reasons: [], alerting, missingIds };
  }

  if (curr.length === 0 && prev.length > 0) {
    reasons.push(
      `Teacher Pro subscription list emptied (had ${prev.length}; Polar returned none)`,
    );
  }

  for (const id of missingIds) {
    const was = prev.find((p) => p.id === id);
    reasons.push(
      `subscription ${id} disappeared from Polar (last status ${was?.status ?? 'unknown'})`,
    );
  }

  const prevById = new Map(prev.map((s) => [s.id, s]));
  for (const sub of curr) {
    const before = prevById.get(sub.id) ?? null;
    if (!isAlertingSnapshot(sub)) continue;
    if (before && snapshotFingerprint(before) === snapshotFingerprint(sub)) continue;
    reasons.push(describeAlert(sub, before));
  }

  return {
    shouldNotify: reasons.length > 0,
    reasons,
    alerting,
    missingIds,
  };
}

function describeAlert(
  sub: TeacherProSubSnapshot,
  before: TeacherProSubSnapshot | null,
): string {
  const bits = [`subscription ${sub.id} status=${sub.status}`];
  if (before && before.status !== sub.status) {
    bits.push(`(was ${before.status})`);
  }
  if (sub.cancelAtPeriodEnd) bits.push('cancel_at_period_end=true');
  if (sub.currentPeriodEnd) bits.push(`period_end=${sub.currentPeriodEnd}`);
  return bits.join(' ');
}

export function parseStoredSnapshots(raw: string | null | undefined): TeacherProSubSnapshot[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (row): row is TeacherProSubSnapshot =>
        !!row && typeof row === 'object' && typeof row.id === 'string' && typeof row.status === 'string',
    );
  } catch {
    return null;
  }
}
