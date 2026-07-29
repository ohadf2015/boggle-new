/**
 * Soft-delete redirect predicate for /singleplayer.
 *
 * Bare /singleplayer (no recognized params) used to drop visitors directly into
 * a 1v1 vs WordBot. The new UX replaces that with /multiplayer?quickPlay=true
 * (random mode + auto-filled bots), so the route's mode-picker entry is dead.
 *
 * The route itself stays alive to serve:
 *   - Practice mode             (?autoStart=practice OR ?practice=1)
 *   - Daily challenge replay    (?returnTo=daily)
 *   - UGC community boards      (?boardCode=...)
 *   - Preset auto-launch        (?preset=...)
 *
 * Anything else → redirect to the new Quick Play flow.
 */
const PRESERVED_PARAMS = ['autoStart', 'preset', 'boardCode', 'returnTo', 'practice'] as const;

export function shouldRedirectBareSingleplayer(
  searchParams: Record<string, string | string[] | undefined>,
): boolean {
  return !PRESERVED_PARAMS.some((key) => {
    const value = searchParams[key];
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== '';
  });
}
