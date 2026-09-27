/**
 * Session-level guard for promotional overlays.
 *
 * Enforcement: ONE promotional overlay per session. Once any promo (install
 * modal, new modes announcement, etc.) is shown, others must not auto-open.
 *
 * Storage: sessionStorage key survives navigation within a session, but is
 * cleared on refresh or tab close (browser-defined session boundary).
 *
 * Fail-closed: if sessionStorage access throws (private mode, quota exceeded),
 * we assume a promo has been shown and return true, preventing further overlays.
 */

const SESSION_KEY = 'lexiclash_promo_shown_this_session';

/**
 * Mark that a promotional overlay has been shown in this session.
 * Subsequent checks will return true.
 */
export function markPromoShown(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch (err) {
    // sessionStorage may fail in private mode or quota exceeded. Silent fallback.
    console.warn('promoOverlaySession: failed to mark promo shown', err);
    // Fail-closed: if we can't write, we still return true to prevent multiple promos
  }
}

/**
 * Check if a promotional overlay has been shown in this session.
 * Returns true if marked, or if sessionStorage access fails (fail-closed).
 */
export function wasPromoShownThisSession(): boolean {
  try {
    return Boolean(sessionStorage.getItem(SESSION_KEY));
  } catch (err) {
    // sessionStorage access failed (private mode, etc.). Fail-closed: assume shown.
    console.warn('promoOverlaySession: failed to check promo status', err);
    return true;
  }
}

/**
 * Clear the session flag (for testing or manual reset).
 */
export function clearPromoSessionFlag(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (err) {
    // Ignore removal failures
  }
}
