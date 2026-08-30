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
 * ── History ──
 * 2026-08-23  tightened to 2 classes / 10 students, reasoning that at 30 the cap "could
 *             never bind" and Teacher Pro would have nothing to sell.
 * 2026-08-27  class count reopened to 3: at `classes: 1` a throwaway "Test" class
 *             permanently blocked the real one. Student cap deliberately left at 10.
 * 2026-08-31  student cap raised to 50. Reasoning below — this reverses the 08-23 call.
 *
 * ── Why the per-class cap moved off 10 ──
 * The 10-student cap was designed to bind on every real class (25-30), and it did. What it
 * did NOT do is monetize. Production over the module's entire history: 35 approved teachers,
 * 2 classrooms, and no approved teacher ever active on a second day. A paywall that trips
 * before the teacher has run one successful lesson does not convert them — it removes them.
 * You cannot upsell someone who never got to value.
 *
 * The category confirms where the paywall belongs. Verified first-party 2026-08-30:
 *   Blooket  free = up to 60 players per game; paid = extra modes, folders, reports
 *   Gimkit   free = unlimited players on featured modes; paid = pro modes, reports
 *   Kahoot   free = 10-40 by account type; paid = larger sessions + features
 * Blooket and Gimkit both let the whole class play for nothing and charge for REPORTING and
 * advanced modes. At 10 students we had the least usable free tier in the category while
 * charging for the same thing they charge for.
 *
 * So the paywall moved rather than opened. Teacher Pro still sells:
 *   - Analytics & printable reports (gated by components/teacher/ProGate.tsx — the one
 *     genuinely paid feature, and precisely what Blooket and Gimkit charge for)
 *   - Unlimited classes, for the secondary teacher with five or six sections
 * What it no longer sells is "may your class attend the lesson".
 *
 * 50 is not arbitrary: it is `MAX_PLAYERS_PER_ROOM` in shared/constants/gameConstants.ts,
 * the real technical ceiling of a live game. Setting the free cap to the engineering limit
 * means the advertised promise ("your whole class plays free") is one the product can keep.
 *
 * `__tests__/freeTierLimits.test.ts` pins the intent so neither half drifts by accident.
 */
export const FREE_TIER_LIMITS = {
  /** Classrooms a free teacher may own. Pro lifts this — the multi-section upsell. */
  classes: 3,
  /**
   * Students per classroom on the free tier. Matches MAX_PLAYERS_PER_ROOM (50) so a whole
   * real class fits. Do not lower this below ~35 without re-reading the header: a cap that
   * binds on an ordinary class blocks first use, and first use is the only use we get.
   */
  studentsPerClass: 50,
} as const;

/** Teacher Pro monthly price in USD. Used by client-side upgrade/landing pages. */
export const TEACHER_PRO_PRICE_USD = 9;
