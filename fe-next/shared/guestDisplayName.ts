/**
 * Clamp + strip a client-supplied display name before it's stored and
 * rendered on a daily leaderboard. A guest row has no profile to fall back to,
 * so whatever string arrives is exactly what shows up on the public board.
 */
export function sanitizeGuestDisplayName(raw: unknown, fallback = 'Anonymous'): string {
  if (typeof raw !== 'string') return fallback;
  // Code-point filter rather than a regex control-char class: ASCII control
  // codes are 0-31 plus DEL (127); printable text starts at 32 (space).
  const withoutControlChars = Array.from(raw)
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code > 31 && code !== 127;
    })
    .join('');
  const stripped = withoutControlChars.trim();
  if (!stripped) return fallback;
  return stripped.slice(0, 40);
}
