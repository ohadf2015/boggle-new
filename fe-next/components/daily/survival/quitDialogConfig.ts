/**
 * Defensive builder for the Daily Challenge quit-confirmation dialog copy.
 *
 * Why this exists (incident: Daily Challenge exit → black screen, isolated to
 * Hebrew): the dialog previously resolved its strings inline and unguarded —
 *   title={t('daily.quitConfirmTitle')}
 *   description={t('daily.quitConfirm') || '…'}   // dead `|| fallback`
 * If a locale bundle resolves one of those keys to a non-string (a malformed or
 * nested node), t() hands React a non-string child and React throws DURING
 * RENDER. On the Daily game surface — which hides the bottom nav and arms a
 * navigation guard whose teardown can fire history.go(-1) (documented to blank
 * a Capacitor WebView) — that render throw surfaces as a black, frozen screen.
 *
 * This builder resolves each field independently and NEVER throws. Any failure
 * mode degrades that single field to a generic, locale-agnostic fallback, so a
 * broken translation can no longer take down the whole exit flow.
 */

export interface QuitDialogConfig {
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
}

/**
 * The guaranteed floor. If the locale wrapper is unusable we render THIS rather
 * than letting an exception escape render. English on purpose: it's the
 * universal fallback bundle and is always safe to show.
 */
export const GENERIC_QUIT_DIALOG: QuitDialogConfig = {
  title: 'Leave mid-game?',
  description: "Your progress won't be saved. You'll need to watch an ad to play again today.",
  confirmText: 'Leave anyway',
  cancelText: 'Cancel',
};

type TranslateFn = (
  key: string,
  fallbackOrParams?: string | Record<string, string | number>,
  paramsWhenFallback?: Record<string, string | number>,
) => string;

/**
 * Resolve one localized string defensively. Falls back when t():
 * - throws (locale bundle in a bad state, bad `t` reference),
 * - returns a non-string (malformed / nested translation node — the exact shape
 *   that makes React throw "Objects are not valid as a React child"),
 * - echoes the key path back unchanged (t()'s missing-key signal), or
 * - returns an empty / whitespace-only string.
 */
function resolveString(t: TranslateFn, key: string, fallback: string): string {
  try {
    const value = t(key, fallback);
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    // t() returns the raw key path on a miss; never render that literally.
    if (trimmed === key) return fallback;
    return value;
  } catch {
    return fallback;
  }
}

/**
 * Optional per-call overrides. Lets a second surface (e.g. the Word Wheel)
 * reuse this defensive builder with different translation keys and/or ad-free
 * fallback copy, without duplicating the resolution logic.
 */
export interface QuitDialogKeys {
  titleKey?: string;
  descriptionKey?: string;
  confirmKey?: string;
  cancelKey?: string;
  /** Per-field generic fallbacks (the English floor) when a key is unusable. */
  fallback?: Partial<QuitDialogConfig>;
}

/**
 * Build a quit-confirmation dialog config. Guaranteed to return four non-empty
 * strings and to never throw, regardless of the state of the active locale
 * bundle. Called with no options it produces the Word Hunt config unchanged;
 * pass `keys` to point specific fields at different translation keys (with an
 * optional ad-free fallback) for other surfaces like the Word Wheel.
 */
export function buildQuitDialogConfig(t: TranslateFn, keys: QuitDialogKeys = {}): QuitDialogConfig {
  const {
    titleKey = 'daily.quitConfirmTitle',
    descriptionKey = 'daily.quitConfirm',
    confirmKey = 'daily.imSure',
    cancelKey = 'common.cancel',
    fallback,
  } = keys;
  const floor: QuitDialogConfig = { ...GENERIC_QUIT_DIALOG, ...(fallback ?? {}) };
  if (typeof t !== 'function') return { ...floor };
  return {
    title: resolveString(t, titleKey, floor.title),
    description: resolveString(t, descriptionKey, floor.description),
    confirmText: resolveString(t, confirmKey, floor.confirmText),
    cancelText: resolveString(t, cancelKey, floor.cancelText),
  };
}
