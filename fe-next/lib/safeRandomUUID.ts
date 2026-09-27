/**
 * RFC-4122 v4 UUID generator that never throws.
 *
 * `crypto.randomUUID` is only defined in secure contexts (https / localhost) and
 * modern engines. On http origins and older/embedded WebViews (e.g. Android
 * Chrome WebView < 92) it is `undefined`, so calling it directly throws
 * `TypeError: crypto.randomUUID is not a function`.
 * See Sentry JAVASCRIPT-NEXTJS-1JC / 1JB (route /:locale/brain/drills/*).
 *
 * Tiers, strongest first:
 *  1. native `crypto.randomUUID()` when present
 *  2. `crypto.getRandomValues()` — available far more widely than randomUUID,
 *     including non-secure contexts; still cryptographically strong
 *  3. `Math.random()` — last resort only when no `crypto` exists at all
 */
export function safeRandomUUID(): string {
  const c = typeof crypto !== 'undefined' ? crypto : undefined;

  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }

  if (c && typeof c.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
    return (
      hex.slice(0, 4).join('') +
      '-' +
      hex.slice(4, 6).join('') +
      '-' +
      hex.slice(6, 8).join('') +
      '-' +
      hex.slice(8, 10).join('') +
      '-' +
      hex.slice(10, 16).join('')
    );
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
