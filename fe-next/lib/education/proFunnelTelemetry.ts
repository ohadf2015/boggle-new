/**
 * Teacher Pro funnel — the client-side steps.
 *
 * Full funnel (all `$host`-visible):
 *   edu_pro_upgrade_clicked        client  — pricing page "Upgrade now" tap
 *   edu_pro_checkout_started       server  — /api/subscription/checkout made a Polar checkout
 *   edu_pro_checkout_succeeded     server  — Polar webhook `subscription.active` (authoritative)
 *   edu_pro_checkout_success_seen  client  — teacher landed back on Teacher HQ, Pro welcome shown
 *
 * The last one deliberately does NOT reuse the server's name: the webhook is the
 * truth about money, the client step is only "the teacher saw it land". One
 * name for both would count every conversion twice.
 *
 * Never throws — a telemetry failure must never block a checkout click.
 */

import posthog from '@/lib/analytics/lazyPosthog';

type Capture = (event: string, props?: Record<string, unknown>) => void;

function safeCapture(event: string, props: Record<string, unknown>): void {
  try {
    (posthog.capture as unknown as Capture)(event, props);
  } catch {
    /* analytics must never break the money path */
  }
}

export type ProUpgradeSource = 'pricing_page';

export function trackEduProUpgradeClicked(args: { source: ProUpgradeSource }): void {
  safeCapture('edu_pro_upgrade_clicked', { source: args.source });
}

export const PRO_SUCCESS_SEEN_STORAGE_KEY = 'lexi_edu_pro_success_seen_at';
/** A reload within this window is the same return from checkout, not a new one. */
const SUCCESS_DEDUPE_MS = 24 * 3_600_000;

/**
 * Fire `edu_pro_checkout_success_seen` at most once per return from checkout.
 * `?checkout=success` survives a reload until the dialog is closed, so without
 * the flag every reload would count again. Returns whether it fired.
 */
export function trackEduProCheckoutSuccessSeen(now: number = Date.now()): boolean {
  let last: number | null = null;
  try {
    const raw = localStorage.getItem(PRO_SUCCESS_SEEN_STORAGE_KEY);
    last = raw ? Number(raw) : null;
  } catch {
    /* storage blocked — count it; a rare double beats a silent zero */
  }
  if (last !== null && Number.isFinite(last) && now - last < SUCCESS_DEDUPE_MS) return false;

  safeCapture('edu_pro_checkout_success_seen', {});
  try {
    localStorage.setItem(PRO_SUCCESS_SEEN_STORAGE_KEY, String(now));
  } catch {
    /* best effort */
  }
  return true;
}

/**
 * Pro feature USE (not the funnel): the teacher assigned missed-words homework.
 * The answer to "what do Pro teachers actually do with it".
 */
export function trackEduProMissedHomeworkAssigned(args: {
  classroomId: string;
  studentCount: number;
  wordCount: number;
  lessonCount: number;
}): void {
  safeCapture('edu_pro_missed_homework_assigned', {
    classroom_id: args.classroomId,
    student_count: args.studentCount,
    word_count: args.wordCount,
    lesson_count: args.lessonCount,
  });
}
