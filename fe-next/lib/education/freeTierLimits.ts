/**
 * The free-tier caps and Teacher Pro pricing — the paywall, in one place.
 *
 * Lives in its own module, not in lib/lemonsqueezy.ts, because the upgrade PAGE has to
 * render these numbers and it is a client component: importing the tier config directly
 * would pull LemonSqueezyClient (and its API key handling) into the client bundle. So the
 * config imports from here, the page imports from here, and there is exactly one place the
 * numbers exist. `lib/education/__tests__/tierLimits.parity.test.ts` asserts the enforced
 * limits and the advertised copy still agree.
 *
 * Tightened 2026-08-23 from 2 classes / 30 students. At 30 per class the cap could never
 * bind — a real class is 25-30 — so two classes of 30 covered a single teacher's whole
 * actual need and Teacher Pro had nothing left to sell.
 *
 * Class count reopened to 3 on 2026-08-27, student cap deliberately left alone. At `classes: 1`
 * a teacher's first classroom was also their last: anyone who made a throwaway "Test" class
 * while finding their feet was permanently blocked from creating the real one. Production had
 * 35 approved teachers and 2 classrooms total, and no approved teacher has ever been active on
 * a second day — so a trap sprung at first use is a trap sprung at the only use.
 *
 * The paywall still holds, because `studentsPerClass` is what actually binds: a real class is
 * 25-30, so ten is felt by every genuine classroom no matter how many classes you may open.
 * Generosity goes on the class COUNT; the per-class cap is the product.
 * `__tests__/freeTierLimits.test.ts` pins both halves so neither drifts by accident.
 */
export const FREE_TIER_LIMITS = {
  /** Classrooms a free teacher may own. */
  classes: 3,
  /** Students per classroom on the free tier. The upsell — do not widen. */
  studentsPerClass: 10,
} as const;

/** Teacher Pro monthly price in USD. Used by client-side upgrade/landing pages. */
export const TEACHER_PRO_PRICE_USD = 9;
