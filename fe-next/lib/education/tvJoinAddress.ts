/**
 * The address a class actually types to join a live game.
 *
 * INCIDENT (2026-08-30): the projector bar showed the hardcoded literal
 * "lexiclash.live" under "JOIN AT", next to a big game code. That page has no
 * game-code input at all, and neither does /en/multiplayer — classroom rooms
 * are private, so they never appear in the open-arena list either. Only
 * `/[locale]/join/[code]` resolves. So a student who could not scan the QR had
 * the code and nowhere to put it. Show the address that works instead.
 *
 * Protocol and `www.` are stripped: this is read off a wall, not clicked.
 */
const FALLBACK_HOST = 'lexiclash.live';

export function tvJoinAddress(baseUrl: string, language: string, gameCode: string): string {
  let host: string;
  try {
    host = new URL(baseUrl).host.replace(/^www\./, '');
  } catch {
    return FALLBACK_HOST;
  }
  if (!host) return FALLBACK_HOST;
  if (!gameCode) return host;
  return `${host}/${language}/join/${gameCode}`;
}
