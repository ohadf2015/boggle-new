/**
 * Language Curator — pure scope + gamification helpers.
 *
 * Shared by the server gate (lib/auth/curatorAuth.ts), the curator UI, and the
 * proposal-ratification reward path. No I/O here — all functions are pure so
 * they're trivially testable and safe to run on client or server.
 *
 * TWO INDEPENDENT AXES (deliberate):
 *   - trust_tier     → CAPABILITY. Admin-granted power level; gates which writes
 *                      a curator may perform. Never earned by activity.
 *   - curator_points → PRESTIGE. Earned per RATIFIED proposal; drives fun rank
 *                      titles, badge cosmetics, and one-time coin bonuses.
 * Keeping them separate means grinding earns fun rewards but never buys power —
 * the "gamify accuracy, not volume" guard.
 */

export type SupportedLanguage = 'en' | 'he' | 'sv' | 'ja' | 'es';

/** The five supported locales. Sorted so admin "all languages" output is stable. */
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'es', 'he', 'ja', 'sv'];

/** Highest capability tier. Admins are treated as max-tier curators everywhere. */
export const MAX_CURATOR_TIER = 3;

export type CuratorProposalKind =
  | 'word_approve'
  | 'word_reject'
  | 'word_flag_invalid'
  | 'puzzle_verdict';

/** A single row from curator_language_assignments (subset the helpers need). */
export interface CuratorAssignment {
  language: string;
  active: boolean;
  trust_tier: number;
  curator_points?: number;
}

// ---------------------------------------------------------------------------
// Access — derived purely from the assignment rows.
// ---------------------------------------------------------------------------

/** True when the user holds at least one active (non-revoked) assignment. */
export function isCurator(assignments: CuratorAssignment[]): boolean {
  return assignments.some((a) => a.active);
}

/** Active assigned languages, deduped and sorted (revoked rows excluded). */
export function curatorLanguages(assignments: CuratorAssignment[]): string[] {
  const langs = new Set<string>();
  for (const a of assignments) {
    if (a.active) langs.add(a.language);
  }
  return Array.from(langs).sort();
}

/** True when the user is an active curator for the given language. */
export function canCurate(assignments: CuratorAssignment[], language: string): boolean {
  return assignments.some((a) => a.active && a.language === language);
}

/**
 * Capability tier for a language (0 = not a curator there). Picks the highest
 * tier among active rows for that language so duplicates can't downgrade.
 */
export function curatorTier(assignments: CuratorAssignment[], language: string): number {
  let tier = 0;
  for (const a of assignments) {
    if (a.active && a.language === language && a.trust_tier > tier) tier = a.trust_tier;
  }
  return tier;
}

// ---------------------------------------------------------------------------
// Capability tiers — the SINGLE source of truth for what each trust_tier may do.
// The propose route reads this to ENFORCE (canProposeKind), the admin explainer
// reads it to DESCRIBE, and the tier badge reads it to VISUALISE. One model means
// the UI can never advertise a power the server doesn't actually gate.
//
// Cumulative by design: a tier-3 curator inherits every tier-1/2 capability.
//   tier 1 → entry moderation (flag invalid / reject a junk word)
//   tier 2 → + rescue: approve a real word into the dictionary
//   tier 3 → + dispute resolution: rule on a puzzle's quality
// Admins resolve to MAX_CURATOR_TIER (see lib/auth/curatorAuth.ts), so they pass
// every gate.
// ---------------------------------------------------------------------------

export interface CuratorTierCapability {
  tier: number;
  /** Proposal kinds THIS tier unlocks (in addition to all lower tiers). */
  unlocks: CuratorProposalKind[];
  /** i18n key for the tier's short name (e.g. "Moderator"). */
  labelKey: string;
  /** i18n key for the one-line description of what the tier adds. */
  descKey: string;
}

export const CURATOR_TIER_CAPABILITIES: ReadonlyArray<CuratorTierCapability> = [
  { tier: 1, unlocks: ['word_flag_invalid', 'word_reject'], labelKey: 'curator.tier.1.label', descKey: 'curator.tier.1.desc' },
  { tier: 2, unlocks: ['word_approve'], labelKey: 'curator.tier.2.label', descKey: 'curator.tier.2.desc' },
  { tier: 3, unlocks: ['puzzle_verdict'], labelKey: 'curator.tier.3.label', descKey: 'curator.tier.3.desc' },
];

/**
 * Minimum capability tier required to OPEN a proposal of this kind. Unknown
 * kinds fail closed at the most restrictive tier so a new kind can never slip
 * through ungated.
 */
export function minTierForProposalKind(kind: CuratorProposalKind): number {
  for (const cap of CURATOR_TIER_CAPABILITIES) {
    if (cap.unlocks.includes(kind)) return cap.tier;
  }
  return MAX_CURATOR_TIER;
}

/** True if a curator at `tier` may open a proposal of `kind` (tier 0 = none). */
export function canProposeKind(tier: number, kind: CuratorProposalKind): boolean {
  return tier >= 1 && tier >= minTierForProposalKind(kind);
}

/** Cumulative list of proposal kinds a tier can perform — for UI display. */
export function proposalKindsForTier(tier: number): CuratorProposalKind[] {
  const kinds: CuratorProposalKind[] = [];
  for (const cap of CURATOR_TIER_CAPABILITIES) {
    if (tier >= cap.tier) kinds.push(...cap.unlocks);
  }
  return kinds;
}

// ---------------------------------------------------------------------------
// Gamification — points are awarded ONLY when a proposal is ratified, so spam
// (un-ratified proposals) earns nothing. Positive contributions weigh highest.
// ---------------------------------------------------------------------------

export const CURATOR_POINTS: Record<CuratorProposalKind, number> = {
  word_approve: 10, // a real word rescued into the dictionary — highest value
  puzzle_verdict: 8, // a puzzle quality call the loop acted on
  word_reject: 6,
  word_flag_invalid: 6,
};

/** Points for a ratified proposal of the given kind (0 for unknown kinds). */
export function pointsForRatifiedProposal(kind: CuratorProposalKind): number {
  return CURATOR_POINTS[kind] ?? 0;
}

/** A fun prestige rank on the curator ladder. titleKey is an i18n key. */
export interface CuratorRank {
  key: string;
  titleKey: string;
  minPoints: number;
  /** Cosmetic flair tier (badge rarity hint), NOT a capability tier. */
  badgeTier: number;
}

/**
 * Lexicography-themed ladder. Thresholds are deliberately gentle early (fast
 * first win) and steepen later (long-tail prestige). titleKey resolves under
 * the `curator.rank.*` i18n namespace (×5 locales).
 */
export const CURATOR_RANKS: CuratorRank[] = [
  { key: 'apprentice', titleKey: 'curator.rank.apprentice', minPoints: 0, badgeTier: 1 },
  { key: 'scribe', titleKey: 'curator.rank.scribe', minPoints: 50, badgeTier: 2 },
  { key: 'lexicographer', titleKey: 'curator.rank.lexicographer', minPoints: 200, badgeTier: 3 },
  { key: 'wordsmith', titleKey: 'curator.rank.wordsmith', minPoints: 600, badgeTier: 4 },
  { key: 'loremaster', titleKey: 'curator.rank.loremaster', minPoints: 1500, badgeTier: 5 },
];

/** Highest rank whose threshold the points total meets. */
export function curatorRankForPoints(points: number): CuratorRank {
  let rank = CURATOR_RANKS[0];
  for (const r of CURATOR_RANKS) {
    if (points >= r.minPoints) rank = r;
  }
  return rank;
}

/**
 * If a points total moved up into a NEW rank, return that new rank — else null.
 * Drives the one-time rank-up celebration. Only fires on an actual increase, so
 * a no-op refresh or a decrease never celebrates.
 */
export function detectRankUp(previousPoints: number, currentPoints: number): CuratorRank | null {
  if (currentPoints <= previousPoints) return null;
  const before = curatorRankForPoints(previousPoints);
  const after = curatorRankForPoints(currentPoints);
  return after.key !== before.key ? after : null;
}

/** The next rank up, or null if already at the top. */
export function nextCuratorRank(points: number): CuratorRank | null {
  const current = curatorRankForPoints(points);
  const idx = CURATOR_RANKS.findIndex((r) => r.key === current.key);
  return CURATOR_RANKS[idx + 1] ?? null;
}

export interface CuratorRankProgress {
  current: CuratorRank;
  next: CuratorRank | null;
  pointsInto: number;
  pointsNeeded: number;
  /** 0..1 toward the next rank; 1 when already at the top. */
  ratio: number;
}

/** Progress of a points total toward the next rank (for a UI progress bar). */
export function progressToNextRank(points: number): CuratorRankProgress {
  const current = curatorRankForPoints(points);
  const next = nextCuratorRank(points);
  if (!next) {
    return { current, next: null, pointsInto: 0, pointsNeeded: 0, ratio: 1 };
  }
  const span = next.minPoints - current.minPoints;
  const into = points - current.minPoints;
  return {
    current,
    next,
    pointsInto: into,
    pointsNeeded: span,
    ratio: span > 0 ? Math.min(1, Math.max(0, into / span)) : 1,
  };
}

// ---------------------------------------------------------------------------
// Coin bonus milestones — one-time "fun bonus" payouts redeemed into the
// existing coin economy (profiles.total_coins via the award path). Each
// milestone pays once, when the curator's lifetime points cross it.
// ---------------------------------------------------------------------------

export const CURATOR_COIN_MILESTONES: ReadonlyArray<{ points: number; coins: number }> = [
  { points: 50, coins: 100 },
  { points: 200, coins: 300 },
  { points: 600, coins: 750 },
  { points: 1500, coins: 2000 },
];

/**
 * Total coin bonus owed for moving a lifetime-points total from `prevPoints`
 * to `newPoints` — the sum of every milestone strictly above prev and at/below
 * new. Idempotent by construction: re-crossing an already-passed milestone pays
 * nothing, so callers can safely recompute.
 */
export function coinBonusForCrossing(prevPoints: number, newPoints: number): number {
  let coins = 0;
  for (const m of CURATOR_COIN_MILESTONES) {
    if (m.points > prevPoints && m.points <= newPoints) coins += m.coins;
  }
  return coins;
}
