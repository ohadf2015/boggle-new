/**
 * Centralized Query Key Factory
 *
 * All TanStack Query keys in one place to prevent:
 * - Key mismatches during invalidation
 * - Typo-induced stale cache bugs
 * - Inconsistent key structures across hooks
 *
 * Pattern: hierarchical keys with `.all` → `.lists()` → `.detail()` granularity.
 * Use `._def` to invalidate an entire subtree.
 */

export const queryKeys = {
  // ─── Player ───────────────────────────────
  playerProfile: {
    _def: ['playerProfile'] as const,
    byId: (userId: string) => ['playerProfile', userId] as const,
  },

  // ─── Leaderboard ──────────────────────────
  leaderboard: {
    _def: ['leaderboard'] as const,
    byPeriod: (period: string, limit: number) =>
      ['leaderboard', period, limit] as const,
  },

  // ─── Gifts ────────────────────────────────
  gifts: {
    _def: ['gifts'] as const,
    unclaimedCount: () => ['gifts', 'unclaimed-count'] as const,
    list: () => ['gifts', 'list'] as const,
  },

  // ─── Events ───────────────────────────────
  events: {
    _def: ['events'] as const,
    all: () => ['events'] as const,
  },

  // ─── Admin Auth ───────────────────────────
  adminAuth: {
    _def: ['admin-auth'] as const,
    token: () => ['admin-auth', 'token'] as const,
  },

  // ─── Adventure ────────────────────────────
  adventure: {
    _def: ['adventure'] as const,
    solveGrid: (language: string, gridKey: string) =>
      ['adventure', 'solve-grid', language, gridKey] as const,
    hintsSolveGrid: (language: string, gridKey: string) =>
      ['adventure', 'hints-solve-grid', language, gridKey] as const,
  },

  // ─── Spaced Repetition ────────────────────
  spacedRepetition: {
    _def: ['spaced-repetition'] as const,
    byLesson: (lessonId: string, wordsKey: string) =>
      ['spaced-repetition', lessonId, wordsKey] as const,
  },

  // ─── Referral ─────────────────────────────
  referral: {
    _def: ['referral'] as const,
    stats: () => ['referral', 'stats'] as const,
  },

  // ─── Education ────────────────────────────
  education: {
    _def: ['education'] as const,
    templates: (lessonId: string | undefined) =>
      ['education', 'templates', lessonId] as const,
    template: (templateId: string | undefined) =>
      ['education', 'template', templateId] as const,
  },

  // ─── Activity ─────────────────────────────
  activity: {
    _def: ['activity'] as const,
    recent: () => ['activity', 'recent'] as const,
  },

  // ─── Avatar ───────────────────────────────
  avatar: {
    _def: ['avatar'] as const,
    premiumParts: () => ['avatar', 'premium-parts'] as const,
  },
} as const;
