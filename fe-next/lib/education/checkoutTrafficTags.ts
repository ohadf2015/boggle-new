/**
 * Tags for the server-side Teacher Pro checkout events (`checkout_started`,
 * `edu_pro_checkout_started`, `edu_pro_trial_started`).
 *
 * WHY THIS EXISTS
 * ---------------
 * Week of 2026-10-20 the dashboards showed 5 Teacher Pro checkouts and 1 trial.
 * None of them was a teacher: one was a `+lexitest…` Gmail alias (not caught by
 * the `@lexiclash.test` trigger), the other four were throwaway accounts that
 * were deleted afterwards, and none had a single browser event (no CTA tap,
 * no /teacher/upgrade pageview). They were scripted signed-in probes of the
 * route. And `edu_pro_trial_started` fires when the trial checkout URL is
 * created, not when Polar opens the trial, so the "1 trial" was never a trial.
 *
 * These tags let every reader drop that traffic without a hand-built list:
 *   - `stage: 'checkout_url_created'` — this is URL creation, not a trial or a sale.
 *   - `trial` / `checkout_mode` — which till was opened.
 *   - `is_test_account` + `test_reason` — profile flag or a QA-looking email.
 *   - `client_kind` — `browser` when the request carries Fetch Metadata
 *     (`sec-fetch-mode`, sent by every current browser on fetch()), else `script`.
 *
 * Pure apart from the optional profile lookup, which the caller bounds.
 */

export type CheckoutClientKind = 'browser' | 'script';

export interface CheckoutTrafficTags {
  stage: 'checkout_url_created';
  trial: boolean;
  checkout_mode: 'trial' | 'paid';
  is_test_account: boolean;
  test_reason: string | null;
  client_kind: CheckoutClientKind;
}

/** QA addresses: the reserved test domain, or a `+tag` alias whose tag reads as QA. */
export function testEmailReason(email: string | null | undefined): string | null {
  if (!email) return null;
  const lower = email.trim().toLowerCase();
  const at = lower.lastIndexOf('@');
  if (at < 0) return null;
  const local = lower.slice(0, at);
  const domain = lower.slice(at + 1);
  if (domain === 'lexiclash.test' || domain.endsWith('.test') || domain === 'example.com') return 'test_domain';
  const plus = local.indexOf('+');
  if (plus >= 0) {
    const tag = local.slice(plus + 1);
    if (/(test|qa|probe|e2e|gauntlet|smoke|lexitest)/.test(tag)) return 'test_alias';
  }
  return null;
}

type HeaderBag = { get(name: string): string | null };

export function checkoutClientKind(headers: HeaderBag): CheckoutClientKind {
  return headers.get('sec-fetch-mode') || headers.get('sec-fetch-site') ? 'browser' : 'script';
}

export function buildCheckoutTrafficTags(args: {
  trial: boolean;
  email: string | null | undefined;
  profileIsTest: boolean | null;
  headers: HeaderBag;
}): CheckoutTrafficTags {
  const emailReason = testEmailReason(args.email);
  const testReason = args.profileIsTest ? 'profile_flag' : emailReason;
  return {
    stage: 'checkout_url_created',
    trial: args.trial,
    checkout_mode: args.trial ? 'trial' : 'paid',
    is_test_account: testReason !== null,
    test_reason: testReason,
    client_kind: checkoutClientKind(args.headers),
  };
}
