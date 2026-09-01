/**
 * Soft-delete redirect predicate for /singleplayer.
 *
 * Bare /singleplayer (no recognized params) used to drop visitors directly into
 * a 1v1 vs WordBot. The new UX replaces that with /multiplayer?quickPlay=true
 * (random mode + auto-filled bots), so the route's mode-picker entry is dead.
 *
 * The route itself stays alive to serve:
 *   - Practice / challenge / bots (?autoStart=..., ?practice=1)
 *   - UGC community boards        (?boardCode=...)
 *   - Preset auto-launch          (?preset=...)
 *
 * Anything else → redirect to the new Quick Play flow.
 *
 * `returnTo` was retired 2026-08-30. Nothing in the codebase ever built a
 * `?returnTo=` URL — it was read by this predicate, useSinglePlayerConfig and
 * SinglePlayerView's post-results redirect, and written nowhere, so the
 * daily-replay branch was unreachable. Stale external links now degrade to
 * Quick Play instead of 404ing.
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

/**
 * Where a bare /singleplayer entry lands.
 *
 * Was `/multiplayer?quickPlay=true` (Phase 5 soft delete), which dumped cold
 * solo-intent SEO traffic into an auto-match with strangers — /es/singleplayer
 * measured a 100% bounce on that path. Now the entry goes straight into the
 * first-win-fast solo bots game (`autoStart=bots`: EASY 60s vs 1 easy bot for
 * new players) — a clear path into play with zero socket wait.
 *
 * Returning players are unaffected: useSinglePlayerConfig's hasPlayedBotsGame
 * gate still re-routes `autoStart=bots` to MP Quick Play client-side, so the
 * Phase-5 "SP-vs-bots is FTUE-only" intent survives for the audience it was
 * designed for.
 */
export function bareSingleplayerRedirectTarget(locale: string): string {
  return `/${locale}/singleplayer?autoStart=bots`;
}
