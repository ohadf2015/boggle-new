/**
 * Bare /singleplayer entry detection.
 *
 * History:
 * - Phase 5 soft-deleted the mode picker by 308-redirecting bare hits into
 *   /multiplayer?quickPlay=true (cold SEO traffic auto-matched with strangers).
 * - #897 retargeted that 308 to /{locale}/singleplayer?autoStart=bots so new
 *   visitors got the first-win-fast solo game. Returning players still re-route
 *   to MP Quick Play client-side via hasPlayedBotsGame.
 *
 * Post-#897 regression (2026-09-06 audit): /es/singleplayer stayed at 100%
 * bounce while /en/singleplayer was 0%. Root cause was the 308 itself —
 * Next.js App Router soft-nav (<Link> / router.push) into a server
 * permanentRedirect fails the client RSC payload (see DesktopGameNav comment:
 * "308 redirect stub → client RSC fail"). Spanish SEO landings (e.g.
 * /es/juego-de-palabras-multijugador "Probar solo") soft-link to bare
 * /es/singleplayer and hit that dead end. Full-document Google landings still
 * worked via meta-refresh, which is why some game_started events still fired.
 *
 * Fix: do NOT 308 from the server. The client treats bare entries as
 * autoStart=bots (same product intent, soft-nav safe). Landing CTAs should
 * also link straight to ?autoStart=bots to skip any client hop.
 *
 * The route itself stays alive to serve:
 *   - Practice / challenge / bots (?autoStart=..., ?practice=1)
 *   - UGC community boards        (?boardCode=...)
 *   - Preset auto-launch          (?preset=...)
 */
const PRESERVED_PARAMS = ['autoStart', 'preset', 'boardCode', 'practice'] as const;

export function shouldRedirectBareSingleplayer(
  searchParams: Record<string, string | string[] | undefined>,
): boolean {
  return !PRESERVED_PARAMS.some((key) => {
    const value = searchParams[key];
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== '';
  });
}

/** @deprecated Prefer client-side bare→bots handling; kept for URL builders/tests. */
export function bareSingleplayerRedirectTarget(locale: string): string {
  return `/${locale}/singleplayer?autoStart=bots`;
}

/**
 * Convert Next.js useSearchParams() (or a get-only test mock) into the shape
 * shouldRedirectBareSingleplayer expects.
 */
export function searchParamsToRecord(
  searchParams:
    | {
        forEach?: (cb: (value: string, key: string) => void) => void;
        entries?: () => IterableIterator<[string, string]>;
        get?: (key: string) => string | null;
      }
    | null
    | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!searchParams) return out;

  if (typeof searchParams.forEach === 'function') {
    searchParams.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }

  if (typeof searchParams.entries === 'function') {
    for (const [key, value] of searchParams.entries()) {
      out[key] = value;
    }
    return out;
  }

  // get-only mocks (vitest): probe known preserved keys + common UTMs so bare
  // detection still works without a full ReadonlyURLSearchParams polyfill.
  if (typeof searchParams.get === 'function') {
    for (const key of [...PRESERVED_PARAMS, 'utm_source', 'utm_medium', 'utm_campaign', 'mpHandoff', 'mastery', 'returnTo']) {
      const value = searchParams.get(key);
      if (value !== null && value !== undefined && value !== '') out[key] = value;
    }
  }
  return out;
}
