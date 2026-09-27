/**
 * Cookie consent management with Google Consent Mode v2
 *
 * Manages granular consent categories (essential, analytics, advertising)
 * and syncs state with Google's Consent Mode API for GA4/ads compliance.
 *
 * @see https://developers.google.com/tag-platform/security/guides/consent
 */

const STORAGE_KEY = 'cookie-consent-v2';
const CONSENT_EVENT = 'cookie-consent-change';

export type ConsentCategory = 'essential' | 'analytics' | 'advertising';

export interface ConsentState {
  essential: boolean; // Always true — required for site function
  analytics: boolean;
  advertising: boolean;
  timestamp: number;
}

const DEFAULT_STATE: ConsentState = {
  essential: true,
  analytics: false,
  advertising: false,
  timestamp: 0,
};

/**
 * Storage in some contexts (iOS Safari private mode, many in-app / social
 * webviews with partitioned or blocked storage) throws on write — and
 * occasionally on read. A consent DECISION must still apply in-session (so the
 * blocking modal closes and PostHog opts in/out) even when it can't be
 * PERSISTED. These helpers never throw; a failed persist just means the choice
 * is re-asked next session, which is far better than trapping the user behind
 * the consent wall with every signup entry point unreachable.
 */
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // best-effort persistence — see note above
  }
}
function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // best-effort — see note above
  }
}

/** Check if user has made any consent decision */
export function hasConsentDecision(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = safeGetItem(STORAGE_KEY);
  // Also check legacy key for migration
  if (!stored && safeGetItem('cookie-consent')) return true;
  return stored !== null;
}

/** Migrate from legacy cookie-consent (accept/decline) to v2 granular format */
function migrateLegacyConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null;
  const legacy = safeGetItem('cookie-consent');
  if (!legacy) return null;

  const accepted = legacy === 'accepted';
  const state: ConsentState = {
    essential: true,
    analytics: accepted,
    advertising: accepted,
    timestamp: Date.now(),
  };

  // Save in new format and remove legacy key
  safeSetItem(STORAGE_KEY, JSON.stringify(state));
  safeRemoveItem('cookie-consent');
  return state;
}

/** Get current consent state */
export function getConsentState(): ConsentState {
  if (typeof window === 'undefined') return DEFAULT_STATE;

  const stored = safeGetItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as ConsentState;
      return { ...parsed, essential: true }; // Essential always true
    } catch {
      return DEFAULT_STATE;
    }
  }

  // Try legacy migration
  const migrated = migrateLegacyConsent();
  if (migrated) return migrated;

  return DEFAULT_STATE;
}

/** Check if a specific consent category is granted */
export function hasConsent(category: ConsentCategory): boolean {
  if (category === 'essential') return true;
  return getConsentState()[category];
}

/** Save consent state and notify listeners */
export function setConsentState(state: Partial<Omit<ConsentState, 'essential' | 'timestamp'>>): void {
  if (typeof window === 'undefined') return;

  const current = getConsentState();
  const updated: ConsentState = {
    essential: true,
    analytics: state.analytics ?? current.analytics,
    advertising: state.advertising ?? current.advertising,
    timestamp: Date.now(),
  };

  // Persist best-effort. A failed write must NOT prevent the decision from
  // applying in-session below — otherwise the blocking consent modal never
  // closes (its Accept/Decline handler throws before setVisible(false)),
  // trapping the user with every Play / Sign-up button unreachable.
  safeSetItem(STORAGE_KEY, JSON.stringify(updated));

  // Update Google Consent Mode v2
  updateGoogleConsent(updated);

  // Dispatch custom event for reactive components
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: updated }));
}

/** Accept all non-essential cookies */
export function acceptAll(): void {
  setConsentState({ analytics: true, advertising: true });
}

/** Decline all non-essential cookies */
export function declineAll(): void {
  setConsentState({ analytics: false, advertising: false });
}

/** Reset consent (user wants to re-choose) */
export function resetConsent(): void {
  if (typeof window === 'undefined') return;
  safeRemoveItem(STORAGE_KEY);
  safeRemoveItem('cookie-consent');

  // Reset Google Consent Mode to denied
  updateGoogleConsent(DEFAULT_STATE);

  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: DEFAULT_STATE }));
}

/**
 * Subscribe to consent changes.
 * Returns unsubscribe function.
 */
export function onConsentChange(callback: (state: ConsentState) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (e: Event) => {
    callback((e as CustomEvent<ConsentState>).detail);
  };
  window.addEventListener(CONSENT_EVENT, handler);
  return () => window.removeEventListener(CONSENT_EVENT, handler);
}

// ─── Google Consent Mode v2 ──────────────────────────────────

declare global {
  interface Window {
    // dataLayer type inherited from @next/third-parties
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Initialize Google Consent Mode v2 with default denied state.
 * Must be called BEFORE any Google tags load.
 */
export function initGoogleConsentMode(): void {
  if (typeof window === 'undefined') return;

  // Initialize dataLayer for Google tags
  const dl = ((window as Record<string, unknown>).dataLayer ??= []) as unknown[];
  function gtag(...args: unknown[]) {
    dl.push(args);
  }
  window.gtag = gtag;

  const state = getConsentState();

  // Set default consent — denied until user opts in
  gtag('consent', 'default', {
    ad_storage: state.advertising ? 'granted' : 'denied',
    ad_user_data: state.advertising ? 'granted' : 'denied',
    ad_personalization: state.advertising ? 'granted' : 'denied',
    analytics_storage: state.analytics ? 'granted' : 'denied',
    functionality_storage: 'granted', // Essential cookies
    personalization_storage: 'granted', // Essential (theme, language)
    security_storage: 'granted', // Essential
    wait_for_update: 500, // Wait 500ms for consent banner interaction
  });
}

/** Update Google Consent Mode after user makes a choice */
function updateGoogleConsent(state: ConsentState): void {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('consent', 'update', {
    ad_storage: state.advertising ? 'granted' : 'denied',
    ad_user_data: state.advertising ? 'granted' : 'denied',
    ad_personalization: state.advertising ? 'granted' : 'denied',
    analytics_storage: state.analytics ? 'granted' : 'denied',
  });
}
