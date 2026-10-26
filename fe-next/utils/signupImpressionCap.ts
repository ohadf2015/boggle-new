/**
 * Daily impression cap for the results_inline signup CTA (t_561836a1).
 *
 * UR audit 2026-10-26: 73% of results_inline impressions were a guest's 4th+
 * that local day and produced 1 of 19 clicks; 0 signups in 3 days while MP
 * power players in auto-advancing series saw it 6-11x/day. So the surface
 * renders at most RESULTS_INLINE_DAILY_CAP times per guest per LOCAL day.
 *
 * The counter is a date-stamped localStorage key (lexiclash_ri_cap_<yyyy-mm-dd>)
 * so it resets on its own at local midnight — no cleanup pass, no schema, and
 * yesterday's keys harmlessly age out. A memory fallback covers storage-less
 * contexts (private mode) with the same day scoping.
 */

const KEY_PREFIX = 'lexiclash_ri_cap_';

/** Max results_inline renders per guest per local day. */
export const RESULTS_INLINE_DAILY_CAP = 3;

/** Local calendar day stamp, yyyy-mm-dd — deliberately NOT UTC. */
export const localDayStamp = (d: Date = new Date()): string => {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

export const resultsInlineCapKey = (d: Date = new Date()): string => `${KEY_PREFIX}${localDayStamp(d)}`;

let memoryDay = '';
let memoryCount = 0;

const memoryCountFor = (now: Date): number => (memoryDay === localDayStamp(now) ? memoryCount : 0);

export const getResultsInlineImpressionCount = (now: Date = new Date()): number => {
  if (typeof window === 'undefined') return memoryCountFor(now);
  try {
    const raw = localStorage.getItem(resultsInlineCapKey(now));
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return memoryCountFor(now);
  }
};

/** True once today's shows reached the cap — the card must not render again. */
export const isResultsInlineCapped = (now: Date = new Date()): boolean =>
  getResultsInlineImpressionCount(now) >= RESULTS_INLINE_DAILY_CAP;

/**
 * Count one actual render; returns the 1-based `cap_rank` for the
 * signup_prompt_shown event. Call ONLY when the prompt is really shown —
 * this counter is the cap, so counting a suppressed render would burn an
 * impression the guest never saw.
 */
export const recordResultsInlineImpression = (now: Date = new Date()): number => {
  const next = getResultsInlineImpressionCount(now) + 1;
  if (typeof window === 'undefined') {
    memoryDay = localDayStamp(now);
    memoryCount = next;
    return next;
  }
  try {
    localStorage.setItem(resultsInlineCapKey(now), String(next));
  } catch {
    memoryDay = localDayStamp(now);
    memoryCount = next;
  }
  return next;
};

export const __resetResultsInlineCapForTests = (now: Date = new Date()): void => {
  memoryDay = '';
  memoryCount = 0;
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(resultsInlineCapKey(now));
  } catch {
    /* noop */
  }
};
