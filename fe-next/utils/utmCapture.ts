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

  // Capture immediately on load
  captureUtmData();

  // Also capture if user navigates back with UTM params
  window.addEventListener('popstate', () => {
    captureUtmData();
  });
}

export default {
  captureUtmData,
  getStoredUtmData,
  getUtmDataForProfile,
  getUtmSourceForTracking,
  isWhatsAppReferral,
  initUtmCapture,
  extractUtmFromUrl,
  getReferrerDomain,
  getReferrerUrl,
  clearUtmData,
};
