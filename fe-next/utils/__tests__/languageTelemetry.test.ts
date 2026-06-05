/**
 * languageTelemetry — Sentry tripwire for the "unresolved game language" bug.
 *
 * Regression guard: a word submitted during active play while the game language
 * is null/empty means the language wasn't threaded to the validator → the
 * `|| 'en'` fallback rejects valid accented words (Spanish á é í ó ú ü ñ) with
 * "Use only letters from this language". A healthy game ALWAYS has a language,
 * so this state is by construction the defect — report it to Sentry so a future
 * recurrence is visible in telemetry instead of being a silent client toast.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../sentry', () => ({ captureError: vi.fn() }));

import { captureError } from '../sentry';
import {
  reportUnresolvedGameLanguage,
  __resetUnresolvedGameLanguageThrottle,
} from '../languageTelemetry';

describe('reportUnresolvedGameLanguage', () => {
  beforeEach(() => {
    __resetUnresolvedGameLanguageThrottle();
    vi.clearAllMocks();
  });

  it('captures a Sentry error with a stable name + context when language is unresolved', () => {
    reportUnresolvedGameLanguage({ where: 'mp-word-submit', hasBoard: true });

    expect(captureError).toHaveBeenCalledTimes(1);
    const [err, ctx] = (captureError as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).name).toBe('UnresolvedGameLanguageError');
    // Stable message → groups into a single Sentry issue.
    expect((err as Error).message).toMatch(/unresolved game language/i);
    expect(ctx).toMatchObject({ where: 'mp-word-submit', hasBoard: true });
  });

  it('throttles repeat reports from the same site (no per-keystroke spam)', () => {
    reportUnresolvedGameLanguage({ where: 'mp-word-submit', hasBoard: true });
    reportUnresolvedGameLanguage({ where: 'mp-word-submit', hasBoard: true });
    reportUnresolvedGameLanguage({ where: 'mp-word-submit', hasBoard: true });

    expect(captureError).toHaveBeenCalledTimes(1);
  });

  it('reports separately for distinct submission sites', () => {
    reportUnresolvedGameLanguage({ where: 'mp-word-submit', hasBoard: true });
    reportUnresolvedGameLanguage({ where: 'wordhunt-submit', hasBoard: true });

    expect(captureError).toHaveBeenCalledTimes(2);
  });
});
