import { captureError } from './sentry';

/**
 * Sentry tripwire for the "unresolved game language" defect.
 *
 * A word submitted during active play while the game language is null/empty
 * means the language was not threaded to the client word validator. Downstream,
 * `validateWordLocally` falls back to the English regex (`/^[a-zA-Z]+$/`), which
 * rejects valid accented letters the board itself generates (Spanish á é í ó ú
 * ü ñ) with the toast "Use only letters from this language".
 *
 * In a healthy game the language is ALWAYS resolved, so this state is by
 * construction a bug — surface it as a Sentry issue instead of a silent client
 * toast, so a future regression is caught in telemetry.
 */

/** Per-session throttle so a stuck round doesn't emit one event per keystroke. */
const reportedSites = new Set<string>();

export interface UnresolvedGameLanguageContext {
  /** Submission site, e.g. 'mp-word-submit' | 'wordhunt-submit'. Groups + throttles. */
  where: string;
  /** True when a board exists but language is null — the unmistakable bug shape. */
  hasBoard?: boolean;
  /** Optional extra context (game mode, etc.). */
  [key: string]: unknown;
}

export function reportUnresolvedGameLanguage(ctx: UnresolvedGameLanguageContext): void {
  if (reportedSites.has(ctx.where)) return; // throttle: once per site per session
  reportedSites.add(ctx.where);

  const err = new Error(
    'Word submitted with unresolved game language (null/empty) — language not threaded ' +
      'to the validator; falls back to English regex and rejects valid accented letters.',
  );
  err.name = 'UnresolvedGameLanguageError';
  captureError(err, { ...ctx });
}

/** Test-only: reset the per-session throttle between cases. */
export function __resetUnresolvedGameLanguageThrottle(): void {
  reportedSites.clear();
}
