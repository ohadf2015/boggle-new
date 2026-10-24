// One "finish your checkout" email for a teacher who opened Polar checkout and never paid.
// Pure so the window, dedupe and exclusions are testable without a DB or an email provider.

import { testEmailReason } from './checkoutTrafficTags';

const HOUR_MS = 60 * 60 * 1000;
const SITE = 'https://www.lexiclash.live';

// Neither name nor payload may mention "trial": several readers treat any such event as a used trial.
export const CHECKOUT_STARTED_EVENT = 'checkout_started';
export const ABANDONED_CHECKOUT_EMAIL_EVENT = 'abandoned_checkout_email_sent';

export const ABANDONED_MIN_HOURS = 1;
export const ABANDONED_MAX_HOURS = 24;

export type CheckoutMode = 'trial' | 'paid';

/**
 * `client_kind` is 'browser' | 'script' from checkoutTrafficTags (Fetch Metadata).
 * Rows written before it existed have none and are treated as unknown, not script.
 */
export function checkoutStartedPayload({
  trial,
  locale,
  clientKind,
}: {
  trial: boolean;
  locale: string;
  clientKind?: 'browser' | 'script';
}) {
  return {
    mode: (trial ? 'trial' : 'paid') as CheckoutMode,
    locale,
    ...(clientKind ? { client_kind: clientKind } : {}),
  };
}

/**
 * Who must never get the abandoned-checkout email, beyond Pro and already-sent:
 * the profile test flag, a QA-looking address (same rule as checkoutTrafficTags),
 * a non-teacher role, or a teacher with no classroom. The week of 2026-10-20 every
 * checkout was a scripted probe from an account like that.
 */
export function abandonedCheckoutExcludedUserIds(args: {
  profiles: ReadonlyArray<{ id: string; is_test_account?: boolean | null; user_role?: string | null }>;
  emailsByUser: ReadonlyMap<string, string>;
  classroomTeacherIds: ReadonlySet<string>;
  userIds: readonly string[];
}): Set<string> {
  const out = new Set<string>();
  const profileById = new Map(args.profiles.map((p) => [p.id, p]));
  for (const id of args.userIds) {
    const p = profileById.get(id);
    if (!p) { out.add(id); continue; }
    if (p.is_test_account) { out.add(id); continue; }
    if (p.user_role !== 'teacher') { out.add(id); continue; }
    if (testEmailReason(args.emailsByUser.get(id))) { out.add(id); continue; }
    if (!args.classroomTeacherIds.has(id)) out.add(id);
  }
  return out;
}

export function abandonedCheckoutUpgradeUrl(locale: string): string {
  return `${SITE}/${locale || 'en'}/teacher/upgrade?utm_source=email&utm_campaign=abandoned_checkout`;
}

function isCompletion(eventType: string): boolean {
  return (
    eventType === 'checkout.completed' || eventType.startsWith('order.') || eventType.startsWith('subscription.')
  );
}

export interface CheckoutStartedRow {
  id: string;
  user_id: string | null;
  created_at: string;
  payload: unknown;
}

export interface CheckoutUserEventRow {
  user_id: string | null;
  event_type: string;
  created_at: string;
}

export interface AbandonedCheckoutDue {
  userId: string;
  checkoutEventId: string;
  startedAt: string;
  mode: CheckoutMode;
  locale: string | null;
}

export interface AbandonedCheckoutPlan {
  due: AbandonedCheckoutDue[];
  skipped: { tooRecent: number; stale: number; completed: number; alreadySent: number; pro: number; test: number; script: number };
}

export function planAbandonedCheckouts(args: {
  started: readonly CheckoutStartedRow[];
  userEvents: readonly CheckoutUserEventRow[];
  proUserIds: ReadonlySet<string>;
  testUserIds: ReadonlySet<string>;
  nowMs: number;
}): AbandonedCheckoutPlan {
  const skipped = { tooRecent: 0, stale: 0, completed: 0, alreadySent: 0, pro: 0, test: 0, script: 0 };
  const latest = new Map<string, CheckoutStartedRow>();
  for (const row of args.started) {
    if (!row.user_id || Number.isNaN(Date.parse(row.created_at))) continue;
    const prev = latest.get(row.user_id);
    if (!prev || Date.parse(row.created_at) > Date.parse(prev.created_at)) latest.set(row.user_id, row);
  }

  const eventsByUser = new Map<string, CheckoutUserEventRow[]>();
  for (const e of args.userEvents) {
    if (!e.user_id) continue;
    const list = eventsByUser.get(e.user_id) ?? [];
    list.push(e);
    eventsByUser.set(e.user_id, list);
  }

  const due: AbandonedCheckoutDue[] = [];
  for (const [userId, row] of latest) {
    const startedMs = Date.parse(row.created_at);
    const ageHours = (args.nowMs - startedMs) / HOUR_MS;
    if (ageHours < ABANDONED_MIN_HOURS) {
      skipped.tooRecent++;
      continue;
    }
    if (ageHours > ABANDONED_MAX_HOURS) {
      skipped.stale++;
      continue;
    }
    if (args.testUserIds.has(userId)) {
      skipped.test++;
      continue;
    }
    const kind = (row.payload && typeof row.payload === 'object' ? (row.payload as { client_kind?: unknown }).client_kind : null);
    if (kind === 'script') {
      skipped.script++;
      continue;
    }
    if (args.proUserIds.has(userId)) {
      skipped.pro++;
      continue;
    }
    const events = eventsByUser.get(userId) ?? [];
    if (events.some((e) => e.event_type === ABANDONED_CHECKOUT_EMAIL_EVENT)) {
      skipped.alreadySent++;
      continue;
    }
    if (events.some((e) => isCompletion(e.event_type) && Date.parse(e.created_at) >= startedMs)) {
      skipped.completed++;
      continue;
    }
    const payload = (row.payload && typeof row.payload === 'object' ? row.payload : {}) as {
      mode?: unknown;
      locale?: unknown;
    };
    due.push({
      userId,
      checkoutEventId: row.id,
      startedAt: row.created_at,
      mode: payload.mode === 'trial' ? 'trial' : 'paid',
      locale: typeof payload.locale === 'string' ? payload.locale : null,
    });
  }
  return { due, skipped };
}
