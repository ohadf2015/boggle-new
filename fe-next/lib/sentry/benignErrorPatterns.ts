/**
 * Reusable, side-effect-free regexes for Sentry `ignoreErrors`.
 *
 * Kept out of `sentry.client.config.ts` (which runs `Sentry.init()` on import)
 * so the patterns can be unit-tested in isolation.
 */

/**
 * PixiJS basis-transcoder WASM streaming-compile failure. Pixi catches this and
 * falls back to `WebAssembly.instantiate(arrayBuffer)`, which succeeds — the
 * page renders fine, so the console.error is benign noise. Matches every
 * variant (MIME type, "HTTP status code is not ok", etc.).
 * Covers JAVASCRIPT-NEXTJS-14J/14K/14M/14N.
 */
export const WASM_STREAMING_COMPILE_FAILED = /wasm streaming compile failed/i;

/**
 * Next.js internally injects `<link rel="prefetch"|"stylesheet">` elements for
 * route/chunk prefetching. When one fails to load, Next's internal promise
 * rejects with the raw DOM `error` Event instead of an Error, so it can't be
 * matched by message string and surfaces in Sentry as `<unknown>`
 * (JAVASCRIPT-NEXTJS-1R3). ChunkErrorRecovery's capture-phase `error` listener
 * already handles recovery for the same underlying asset failure — this
 * promise rejection is a redundant signal and pure Sentry noise.
 */
export function isStaleAssetLinkRejection(reason: unknown): boolean {
  if (!reason || typeof reason !== 'object') return false;
  const target = (reason as { target?: unknown }).target;
  if (!target || typeof target !== 'object') return false;
  const tagName = (target as { tagName?: unknown }).tagName;
  return tagName === 'LINK' || tagName === 'SCRIPT';
}
