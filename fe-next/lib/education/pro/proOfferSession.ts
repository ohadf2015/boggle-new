/**
 * Teacher Pro offer frequency cap + impression de-duplication (browser session).
 *
 * Why: the offer card was shown on every results screen, class-ready screen and
 * dashboard visit, so a teacher could see the same full card dozens of times a
 * day, and every remount of a placement re-sent `edu_pro_offer_rendered` /
 * `edu_pro_offer_impression`.
 *
 * Rules:
 * - One full offer card per browser session (sessionStorage) per teacher, across
 *   every placement (class_created, classroom_results, dashboard). The first
 *   placement that mounts claims the slot; it keeps the full card for as long as
 *   that same mount lives. Every later mount, on any placement, gets the compact
 *   one-line link instead (same offer, same single-trial wording, same checkout).
 * - `rendered` / `viewed` server events fire at most once per placement, format
 *   and stage per session per teacher, however many times the component
 *   re-renders or remounts. Clicks are never de-duplicated.
 *
 * Storage failures (private mode, quota) fail open: full card, events sent.
 */

export type ProOfferFormat = 'card' | 'link' | 'report_button' | 'report_teaser';
export type ProOfferSlot = 'full' | 'compact';

const PREFIX = 'lexi:proOffer:v1';
const slotKey = (userId: string) => `${PREFIX}:slot:${userId}`;
const seenKey = (userId: string, placement: string, format: ProOfferFormat, stage: string) =>
  `${PREFIX}:seen:${userId}:${placement}:${format}:${stage}`;

function store(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.sessionStorage ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

/** Fresh id for one component mount (kept in a ref by the caller). */
export function newProOfferMountId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Which form this mount shows. The first mount in the session claims the full
 * card; the same mount asking again keeps it; everything else is compact.
 */
export function claimProOfferSlot(userId: string | null | undefined, mountId: string): ProOfferSlot {
  const s = store();
  if (!s) return 'full';
  const key = slotKey(userId || 'anon');
  try {
    const owner = s.getItem(key);
    if (!owner) {
      s.setItem(key, mountId);
      return 'full';
    }
    return owner === mountId ? 'full' : 'compact';
  } catch {
    return 'full';
  }
}

/**
 * True the first time (per session) this placement/format/stage is reported for
 * this teacher; false afterwards. Marks it as reported.
 */
export function firstProOfferReport(
  userId: string | null | undefined,
  placement: string,
  format: ProOfferFormat,
  stage: string,
): boolean {
  const s = store();
  if (!s) return true;
  const key = seenKey(userId || 'anon', placement, format, stage);
  try {
    if (s.getItem(key)) return false;
    s.setItem(key, '1');
    return true;
  } catch {
    return true;
  }
}

/** Test helper: forget every cap/dedupe key in this session. */
export function resetProOfferSession(): void {
  const s = store();
  if (!s) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => s.removeItem(k));
  } catch {
    /* ignore */
  }
}
