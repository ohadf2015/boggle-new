/**
 * Request budgets for the async-homework endpoints.
 *
 * `lib/apiRateLimit.ts` keys every budget on `${ip}:${endpoint}`. For most
 * routes that is one person. For homework it is a whole school: thirty students
 * finishing during one period sit behind a single NAT address, so the endpoint
 * sees thirty completions from one "client".
 *
 * The first live pass on 2026-09-12 hit exactly that — `/complete` answered 429
 * and the finish screen said the run could not be saved, with three stars and a
 * class streak already on screen. The budget was 20/60s.
 *
 * The sharper edge is the abuse guard: once a window exceeds
 * `maxRequests * IP_BLOCK_MULTIPLIER`, that IP is blocked for five minutes
 * across EVERY api route, not just this one. An honest class doing its homework
 * must never come near it, replays included — hence the ×2 headroom below.
 *
 * These stay real limits: a minute-long window and a ceiling a scripted flood
 * still trips. They are sized off a class, not off a person.
 */

/** Biggest class the homework link is designed to carry on one IP. */
export const MISS_GAP_MAX_CLASS_SIZE = 45;

/**
 * Mirrors the `data.count > config.maxRequests * 2` abuse check in
 * `lib/apiRateLimit.ts`. Named here so the sizing test fails loudly if that
 * multiplier ever changes underneath us.
 */
export const IP_BLOCK_MULTIPLIER = 2;

/** POST /api/education/miss-gap/complete — one per student per finished run. */
export const MISS_GAP_COMPLETE_RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: MISS_GAP_MAX_CLASS_SIZE * 4,
} as const;

/**
 * GET /api/education/miss-gap/progress — every finish screen reads the roster
 * once, on top of the teacher's own card, so it needs at least the completion
 * budget.
 */
export const MISS_GAP_PROGRESS_RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: MISS_GAP_MAX_CLASS_SIZE * 6,
} as const;
