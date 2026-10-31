/**
 * Reusable, side-effect-free regexes for Sentry `ignoreErrors`.
 *
 * Kept out of `lib/sentry/clientInit.ts` (which runs `Sentry.init()` on import)
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

/**
 * Errors thrown by code we don't ship: Google Identity Services' minified
 * client, in-app-browser injected bridges, WebView JS bridges, and the browser's
 * WebGL driver on lost contexts. No frame of ours can act on them
 * (JAVASCRIPT-NEXTJS-2FA/2GF/2FV/1QY).
 */
export const THIRD_PARTY_SCRIPT_NOISE: RegExp[] = [
  /^TypeError: a\.Vc is not a function/,
  /window\.setDgResult is not a function/,
  /to WebGL2RenderingContext\.shaderSource must be an instance of WebGLShader/,
  /Error invoking postMessage: Java object is gone/,
  /^SecurityError: The request was denied\.?$/,
];

/**
 * Expected, handled conditions that still reach Sentry through a warn: rrweb's
 * replay recorder, a stale tab posting to a Server Action of an older deploy,
 * and socket rejections the UI already shows to the player.
 */
export const EXPECTED_CLIENT_NOISE: RegExp[] = [
  /^\[rrweb\] dropped \d+ node\(s\)/,
  /Failed to find Server Action/,
  /\[SOCKET\.IO\] Socket error event.*(SOCIAL_RESTRICTED|GAME_ALREADY_EXISTS)/,
];
