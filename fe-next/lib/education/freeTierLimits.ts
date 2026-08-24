/**
 * The free-tier caps — the paywall, in one place.
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
 */
export const FREE_TIER_LIMITS = {
  /** Classrooms a free teacher may own. */
  classes: 1,
  /** Students per classroom on the free tier. */
  studentsPerClass: 10,
} as const;
