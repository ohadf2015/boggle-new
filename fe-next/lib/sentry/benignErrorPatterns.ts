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
