import { describe, it, expect } from 'vitest';
import { WASM_STREAMING_COMPILE_FAILED } from '../benignErrorPatterns';

/**
 * PixiJS lazily loads its basis-transcoder WASM. When the browser rejects
 * `WebAssembly.instantiateStreaming` (bad MIME type, non-200 asset response,
 * etc.) Pixi logs "wasm streaming compile failed: ..." and AUTOMATICALLY falls
 * back to `WebAssembly.instantiate(arrayBuffer)`, which succeeds — the page
 * renders fine. These console.errors are pure noise.
 *
 * Sentry historically only filtered the "Unexpected response MIME type" variant
 * (JAVASCRIPT-NEXTJS-14J/14K/14M). Production then surfaced a new variant,
 * "HTTP status code is not ok" (JAVASCRIPT-NEXTJS-14N), which leaked through.
 * The pattern must match ALL streaming-compile-failed variants — it is safe to
 * broaden because the paired "falling back to ArrayBuffer instantiation" and
 * "failed to asynchronously prepare wasm" lines are already filtered, so a
 * genuine wasm failure is already invisible regardless.
 */
describe('WASM_STREAMING_COMPILE_FAILED', () => {
  it('matches the MIME-type variant (14J/14K/14M)', () => {
    expect(
      WASM_STREAMING_COMPILE_FAILED.test(
        "wasm streaming compile failed: TypeError: Failed to execute 'compile' on 'WebAssembly': Incorrect response MIME type. Expected 'application/wasm'.",
      ),
    ).toBe(true);
  });

  it('matches the "HTTP status code is not ok" variant (14N)', () => {
    expect(
      WASM_STREAMING_COMPILE_FAILED.test(
        "wasm streaming compile failed: TypeError: Failed to execute 'compile' on 'WebAssembly': HTTP status code is not ok",
      ),
    ).toBe(true);
  });

  it('does NOT match unrelated errors', () => {
    expect(WASM_STREAMING_COMPILE_FAILED.test('TypeError: Cannot read properties of null')).toBe(
      false,
    );
  });
});
