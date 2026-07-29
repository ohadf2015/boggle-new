/**
 * Sanitize a multiplayer game/room code before it is emitted to the socket
 * server or shown in the join input.
 *
 * The backend `GameCodeSchema` (shared/schemas/socketSchemas.ts) rejects any
 * non-alphanumeric code with "Game code must be alphanumeric". Stray characters
 * leak in from share-links/deeplinks (`?room=JPX9SL\`), autofill, and manual
 * paste/typing — see Sentry JAVASCRIPT-NEXTJS-1NE (a trailing backslash made a
 * real user's join silently fail). Mirrors the existing paste-button cleaner so
 * every entry path (typed, pasted, URL param, auto-join) behaves identically.
 *
 * Strips everything outside [A-Za-z0-9] and caps at the backend's 10-char max.
 * Case is preserved — the backend upper-cases on validation.
 */
export function sanitizeGameCode(raw: string): string {
  if (!raw) return '';
  return raw.trim().replace(/[^A-Za-z0-9]/g, '').slice(0, 10);
}
