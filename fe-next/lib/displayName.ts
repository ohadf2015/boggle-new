/**
 * Display-name resolution shared by UI and notification code.
 *
 * The DB assigns every nameless signup a placeholder username of the form
 * `Player_<8hex>` (migration 20260504160000 -> `'Player_' || substr(id, 1, 8)`)
 * and guests get `Player-XXXX` / `Guest_*`. These are truthy strings, so the
 * common `username || 'Fallback'` guard never fires and the placeholder — which
 * literally embeds the start of the user's UUID — leaks straight into the UI
 * ("Player_00952ce3 challenged you"). That is the "name sometimes shows the id"
 * complaint.
 *
 * This module is dependency-free so it is safe to import from both client
 * components and the Node backend. `lib/pushDisplayName.ts` reuses
 * `isPlaceholderName` from here and layers the push-locale fallback on top.
 */

/**
 * True when `name` is a system-generated placeholder rather than a name the
 * user chose. Matches the DB defaults (`Player_<hex>`, `Player-XXXX`,
 * `Guest_*`, bare `Guest`) and empty/whitespace/nullish. A separator after
 * "Player"/"Guest" is required so a deliberately chosen handle like
 * "PlayerOne" is treated as real.
 */
export function isPlaceholderName(name: string | null | undefined): boolean {
  if (name == null) return true;
  const trimmed = name.trim();
  if (trimmed === '') return true;
  // Player_<hex>, Player-XXXX, Guest_1234, or bare "Guest".
  return /^(player[_-]|guest($|[_-]))/i.test(trimmed);
}

/**
 * Resolve the best display name from an ordered candidate list (best first,
 * e.g. `[displayName, username]`). Returns the first real (non-placeholder)
 * candidate, trimmed; otherwise the caller-supplied fallback (already
 * localized at the call site via `t()`).
 */
export function resolveDisplayName(
  candidates: Array<string | null | undefined>,
  fallback: string
): string {
  for (const c of candidates) {
    if (!isPlaceholderName(c)) return (c as string).trim();
  }
  return fallback;
}
