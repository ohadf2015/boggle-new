/**
 * UTM Parameter and Referral Capture Utility
 * Captures UTM parameters and referrer data for analytics tracking
 */

import logger from '@/utils/logger';

const UTM_STORAGE_KEY = 'lexiclash_utm_data';

export interface UtmData {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  referrer: string | null;
  ref: string | null; // Custom referral code from share links
  captured_at: number;
}

/**
 * Extract UTM parameters from current URL
 */
export function extractUtmFromUrl(): Partial<UtmData> {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);

  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_term: params.get('utm_term'),
    utm_content: params.get('utm_content'),
    ref: params.get('ref'),
  };
}

/**
 * Get HTTP referrer domain
 */
export function getReferrerDomain(): string | null {
  if (typeof window === 'undefined') return null;

  const referrer = document.referrer;
  if (!referrer) return null;

  try {
    const url = new URL(referrer);
    // Exclude self-referrals
    if (url.hostname === window.location.hostname) return null;
    return url.hostname;
  } catch {
    return referrer; // Return raw if URL parsing fails
  }
}

/**
 * Get full referrer URL
 */
export function getReferrerUrl(): string | null {
  if (typeof window === 'undefined') return null;

  const referrer = document.referrer;
  if (!referrer) return null;

  try {
    const url = new URL(referrer);
    // Exclude self-referrals
    if (url.hostname === window.location.hostname) return null;
    return referrer;
  } catch {
    return referrer;
  }
}

/**
 * First-touch attribution (t_a80f937b).
 *
 * profiles.utm_source/referrer were NULL on 0/1,011 profiles since 2026-05:
 * the write path existed but nothing ever fed it, and consent-gated analytics
 * only see ~63% of real accounts. This record is first-party functional
 * storage (no third-party analytics), written once on the first pageview and
 * persisted to the profile at account creation.
 *
 * Rules: FIRST TOUCH WINS (a later visit never overwrites an unexpired
 * record), 90-day expiry, and no PII beyond referrer DOMAIN + landing PATH —
 * query strings are stripped except utm_* params.
 */
const FIRST_TOUCH_KEY = 'lexiclash_first_touch';
export const FIRST_TOUCH_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

export interface FirstTouchAttribution {
  referrer_domain: string | null;
  landing_path: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  captured_at: number;
}

const UTM_PARAM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

/**
 * Build a privacy-safe landing path: pathname + utm_* params only.
 * All other query params (tokens, emails, room codes) are dropped.
 */
export function sanitizeLandingPath(pathname: string, search: string): string {
  const params = new URLSearchParams(search);
  const kept = new URLSearchParams();
  for (const key of UTM_PARAM_KEYS) {
    const value = params.get(key);
    if (value) kept.set(key, value);
  }
  const qs = kept.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function readFirstTouch(now: number): FirstTouchAttribution | null {
  try {
    const raw = localStorage.getItem(FIRST_TOUCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FirstTouchAttribution;
    if (!parsed || typeof parsed.captured_at !== 'number') return null;
    if (now - parsed.captured_at >= FIRST_TOUCH_TTL_MS) return null; // expired
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Record the first touch of this device, once. An existing unexpired record
 * always wins; an expired or corrupt record is replaced by the current visit.
 */
export function captureFirstTouch(now: number = Date.now()): void {
  if (typeof window === 'undefined') return;
  if (readFirstTouch(now)) return; // first touch wins

  const params = new URLSearchParams(window.location.search);
  const record: FirstTouchAttribution = {
    referrer_domain: getReferrerDomain(),
    landing_path: sanitizeLandingPath(window.location.pathname, window.location.search),
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    captured_at: now,
  };
  try {
    localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(record));
  } catch {
    // storage unavailable (private mode / quota) — attribution is best-effort
  }
}

/**
 * Read the stored first touch, or null when absent/expired. Never throws.
 */
export function getFirstTouchAttribution(now: number = Date.now()): FirstTouchAttribution | null {
  if (typeof window === 'undefined') return null;
  return readFirstTouch(now);
}

/**
 * Capture and store UTM data on page load
 * Should be called once when the app initializes
 */
export function captureUtmData(): void {
  if (typeof window === 'undefined') return;

  // Check if we already have stored UTM data
  const existing = getStoredUtmData();

  const urlUtm = extractUtmFromUrl();
  const referrer = getReferrerUrl();

  // Only update if we have new UTM data or referrer
  const hasNewData = urlUtm.utm_source || urlUtm.utm_medium || urlUtm.utm_campaign ||
                     urlUtm.ref || referrer;

  if (hasNewData) {
    // Merge with existing, preferring new values
    const utmData: UtmData = {
      utm_source: urlUtm.utm_source || existing?.utm_source || null,
      utm_medium: urlUtm.utm_medium || existing?.utm_medium || null,
      utm_campaign: urlUtm.utm_campaign || existing?.utm_campaign || null,
      utm_term: urlUtm.utm_term || existing?.utm_term || null,
      utm_content: urlUtm.utm_content || existing?.utm_content || null,
      referrer: referrer || existing?.referrer || null,
      ref: urlUtm.ref || existing?.ref || null,
      captured_at: Date.now(),
    };

    try {
      localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utmData));
      logger.info('[UTM] Captured UTM data:', utmData);
    } catch (error) {
      logger.warn('[UTM] Failed to store UTM data:', error);
    }
  }
}

/**
 * Get stored UTM data from localStorage
 */
export function getStoredUtmData(): UtmData | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(UTM_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as UtmData;
  } catch {
    return null;
  }
}

/**
 * Get UTM data for profile creation (flattened for database)
 */
export function getUtmDataForProfile(): {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
} {
  const utmData = getStoredUtmData();

  // If we have a ref code but no utm_source, use ref as the source
  let utm_source = utmData?.utm_source || null;
  if (!utm_source && utmData?.ref) {
    utm_source = `ref:${utmData.ref}`;
  }

  return {
    utm_source,
    utm_medium: utmData?.utm_medium || null,
    utm_campaign: utmData?.utm_campaign || null,
    referrer: utmData?.referrer || null,
  };
}

/**
 * Clear stored UTM data (e.g., after successful profile creation)
 * Note: We don't clear this to preserve attribution across sessions
 */
export function clearUtmData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(UTM_STORAGE_KEY);
}

/**
 * Get utm_source for event tracking (prioritizes current URL over stored)
 */
export function getUtmSourceForTracking(): string | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);

  // First check current URL
  const urlSource = params.get('utm_source') || params.get('ref');
  if (urlSource) return urlSource;

  // Fall back to stored
  const stored = getStoredUtmData();
  return stored?.utm_source || stored?.ref || null;
}

/**
 * utm_source values that identify a physical QR / barcode scan (printed
 * stickers, posters, table tents). Kept in sync with the admin-dashboard
 * classifier's QR bucket so a scan is both attributed AND funnel-routed the
 * same way. Deliberately narrower than the classifier list: we only auto-redirect
 * the explicit "scan me" codes, not every offline touchpoint.
 */
export const QR_SCAN_UTM_SOURCES = ['barcode', 'qr', 'qrcode', 'qr-code'] as const;

/**
 * True when the CURRENT URL indicates the visitor arrived by scanning a printed
 * QR / barcode (e.g. `?utm_source=barcode`). Reads the live URL (not stored UTM)
 * so it only fires on the actual landing hop, never on later in-app navigation.
 */
export function isQrScanArrival(): boolean {
  if (typeof window === 'undefined') return false;
  const source = new URLSearchParams(window.location.search)
    .get('utm_source')?.toLowerCase().trim();
  if (!source) return false;
  return (QR_SCAN_UTM_SOURCES as readonly string[]).includes(source);
}

/**
 * Check if user came from WhatsApp (detected via referrer)
 */
export function isWhatsAppReferral(): boolean {
  if (typeof window === 'undefined') return false;

  const referrer = document.referrer.toLowerCase();
  return referrer.includes('whatsapp') || referrer.includes('wa.me');
}

/**
 * Initialize UTM capture on app load
 * Call this in the root layout or app component
 */
export function initUtmCapture(): void {
  if (typeof window === 'undefined') return;

  // First-touch record (first pageview wins, 90d expiry) — persisted to the
  // profile at account creation. Runs before the merge-capture below.
  captureFirstTouch();

  // Capture immediately on load
  captureUtmData();

  // Also capture if user navigates back with UTM params
  window.addEventListener('popstate', () => {
    captureUtmData();
  });
}

const utmCapture = {
  captureUtmData,
  getStoredUtmData,
  getUtmDataForProfile,
  getUtmSourceForTracking,
  isWhatsAppReferral,
  isQrScanArrival,
  initUtmCapture,
  extractUtmFromUrl,
  getReferrerDomain,
  getReferrerUrl,
  clearUtmData,
  captureFirstTouch,
  getFirstTouchAttribution,
  sanitizeLandingPath,
};

export default utmCapture;
