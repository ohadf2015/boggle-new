/**
 * Teacher Pro funnel — the client-side steps.
 *
 * Full funnel (all `$host`-visible):
 *   trial_cta_view                 client  — Polar 14-day trial CTA rendered
 *   trial_cta_tap                  client  — trial CTA tap (HQ banner or upgrade page)
 *   checkout_started               server  — Polar trial checkout session created
 *   trial_activated                server  — Polar webhook status=trialing (teacher row upgraded)
 *   edu_pro_upgrade_clicked        client  — pricing page or dashboard *paid* CTA tap
 *   edu_pro_checkout_started       server  — /api/subscription/checkout made a paid Polar checkout
 *   edu_pro_checkout_succeeded     server  — Polar webhook `subscription.active` (authoritative)
 *   edu_pro_checkout_success_seen  client  — teacher landed back on Teacher HQ, Pro welcome shown
 *
 * The last one deliberately does NOT reuse the server's name: the webhook is the
 * truth about money, the client step is only "the teacher saw it land". One
 * name for both would count every conversion twice.
 *
 * Never throws — a telemetry failure must never block a checkout click.
 *
 * Growth Radar mirror: the client steps are ALSO sent through trackGrowthEvent
 * (same event names, same source props) so Growth Radar's run_funnel can measure
 * landing → education_upsell_impression → edu_pro_upgrade_clicked → trial_cta_tap
 * next to the existing growth:* events. The bare PostHog names above are
 * unchanged; the mirror lands as `growth:<name>` (not in CANONICAL_DUAL_EMIT), so
 * PostHog dashboards that count the bare names never double-count. Server steps
 * (checkout_started, edu_pro_checkout_started, ...) stay server-side only.
 */

import posthog from '@/lib/analytics/lazyPosthog';
import { trackGrowthEvent, type GrowthEvent } from '@/utils/growthTracking';

type Capture = (event: string, props?: Record<string, unknown>) => void;

function safeCapture(event: string, props: Record<string, unknown>): void {
  try {
    (posthog.capture as unknown as Capture)(event, props);
  } catch {
    /* analytics must never break the money path */
  }
}

/** Same step, same props, into Growth Radar's growth:* stream. Never throws. */
function mirrorToGrowth(event: GrowthEvent, props: Record<string, unknown>): void {
  try {
    trackGrowthEvent(event, { ...props });
  } catch {
    /* analytics must never break the money path */
  }
}

function captureStep(event: GrowthEvent, props: Record<string, unknown>): void {
  safeCapture(event, props);
  mirrorToGrowth(event, props);
}

export type ProUpgradeSource =
  | 'pricing_page'
  | 'dashboard_trial_lifecycle'
  | 'dashboard_trial_ended';

export type TrialCtaSource = 'dashboard_trial_offer' | 'upgrade_page' | 'activation_checklist';

export function trackTrialCtaView(args: { source: TrialCtaSource }): void {
  captureStep('trial_cta_view', { source: args.source, product: 'teacher_pro' });
}

export function trackTrialCtaTap(args: { source: TrialCtaSource }): void {
  captureStep('trial_cta_tap', { source: args.source, product: 'teacher_pro' });
}

export function trackEduProUpgradeClicked(args: { source: ProUpgradeSource }): void {
  captureStep('edu_pro_upgrade_clicked', { source: args.source });
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

  captureStep('edu_pro_checkout_success_seen', {});
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

/** Placement for teacher_pro_upgrade_click — where the CTA lived. */
export type TeacherProUpgradePlacement =
  | 'teacher_upgrade'
  | 'education_packages'
  | 'education_compare_strip'
  | 'results_upsell'
  | 'education_landing'
  | 'other';

/**
 * Client click on any Teacher Pro CTA (education pages, results upsell, /teacher/upgrade).
 * Pairs with education_upsell_impression. Also mirrors to Growth Radar.
 */
export function trackTeacherProUpgradeClick(args: {
  page: string;
  locale: string;
  placement: TeacherProUpgradePlacement;
}): void {
  const props = { page: args.page, locale: args.locale, placement: args.placement };
  safeCapture('teacher_pro_upgrade_click', props);
  mirrorToGrowth('teacher_pro_upgrade_click', props);
}

/** Fired immediately before POST /api/subscription/checkout. */
export function trackTeacherProCheckoutStarted(args: { trial: boolean; signed_in: boolean }): void {
  const props = { trial: args.trial, signed_in: args.signed_in };
  safeCapture('teacher_pro_checkout_started', props);
  mirrorToGrowth('teacher_pro_checkout_started', props);
}

/** Fired when the checkout provider returns a redirect URL. */
export function trackTeacherProCheckoutRedirect(args?: { trial?: boolean }): void {
  const props = args?.trial !== undefined ? { trial: args.trial } : {};
  safeCapture('teacher_pro_checkout_redirect', props);
  mirrorToGrowth('teacher_pro_checkout_redirect', props);
}

/** Successful school quote form submit (for-schools or upgrade school tab). */
export function trackSchoolQuoteRequested(args: {
  page: string;
  locale: string;
  teachers: number;
}): void {
  const props = { page: args.page, locale: args.locale, teachers: args.teachers };
  safeCapture('school_quote_requested', props);
  mirrorToGrowth('school_quote_requested', props);
}
