/**
 * TV broadcast game-mode label resolver.
 *
 * Known modes map to real translation keys. Unknown modes are humanized from
 * their slug instead of calling t(`tvBroadcast.mode.${mode}`) with a key that
 * does not exist — the latter logs "Translation missing" to Sentry
 * (JAVASCRIPT-NEXTJS-1K7, seen for an unmapped `random` mode).
 */

const KNOWN_MODE_KEYS: Record<string, string> = {
  classic: 'tvBroadcast.modeClassic',
  blast: 'tvBroadcast.modeBlast',
  'word-hunt': 'tvBroadcast.modeWordHunt',
};

export function tvModeLabel(
  gameMode: string | undefined | null,
  t: (key: string) => string,
): string {
  if (!gameMode) return '';
  const key = KNOWN_MODE_KEYS[gameMode];
  if (key) return t(key);
  return gameMode.replace(/[-_]+/g, ' ').trim().toUpperCase();
}
