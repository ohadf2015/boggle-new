import { FREE_TIER_LIMITS } from './freeTierLimits';

/**
 * The Free-vs-Pro comparison matrix, as data.
 *
 * Imports `freeTierLimits.ts` and NOTHING else on purpose. The matrix renders inside a
 * client component, and `lib/lemonsqueezy.ts` — where `TIER_CONFIGS` lives — drags
 * LemonSqueezyClient and its API key handling into any bundle that touches it. The two are
 * held in agreement by `__tests__/planMatrix.test.ts`, which is allowed to import both.
 *
 * Why a fourth description of the same two tiers exists at all: the upgrade page's two cards
 * cannot be read across. The Free card lists "Unlimited classes ✗" while the Pro card beside
 * it says "Unlimited classes without cap worry" — different words, different order, no shared
 * rows. A teacher deciding on $9 has to hold both columns in their head and diff them. This
 * is the same information with the rows aligned, which is the one thing the cards structurally
 * cannot do.
 */

/**
 * A cell value.
 * - `number` — a hard cap, rendered as the figure.
 * - `null`   — unlimited. Same convention as `TierConfig.classes_limit`.
 * - `boolean`— has it / does not, rendered as a tick or a cross.
 */
export type PlanMatrixCell = number | null | boolean;

export interface PlanMatrixRow {
  /** i18n key suffix under `teacher.subscription.matrix`. */
  key: string;
  free: PlanMatrixCell;
  pro: PlanMatrixCell;
}

/**
 * Order matters: the two caps lead because they are the only rows where Free and Pro differ
 * by a number, and they are the reason a growing teacher upgrades. The three shared ticks sit
 * in the middle — they are load-bearing, not filler, because a column of crosses reads as a
 * crippled free tier and ours genuinely is not. Analytics lands last, alone, as the one thing
 * the money buys.
 */
export const PLAN_MATRIX_ROWS: readonly PlanMatrixRow[] = [
  { key: 'classes', free: FREE_TIER_LIMITS.classes, pro: null },
  { key: 'studentsPerClass', free: FREE_TIER_LIMITS.studentsPerClass, pro: null },
  { key: 'customLists', free: true, pro: true },
  { key: 'duels', free: true, pro: true },
  { key: 'noAds', free: true, pro: true },
  { key: 'analytics', free: false, pro: true },
] as const;
