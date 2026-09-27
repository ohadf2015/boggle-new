import { describe, it, expect } from 'vitest';
import { WASM_STREAMING_COMPILE_FAILED, isStaleAssetLinkRejection } from '../benignErrorPatterns';

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

/**
 * Next.js internally injects `<link rel="prefetch"|"stylesheet">` elements for
 * route/chunk prefetching. When one fails to load, Next's internal promise
 * rejects with the raw DOM `error` Event instead of an Error — Sentry can't
 * parse a message from that, so it surfaces as `<unknown>`
 * (JAVASCRIPT-NEXTJS-1R3). The synchronous capture-phase `error` listener in
 * ChunkErrorRecovery already handles recovery for the same underlying asset
 * failure; this promise rejection is a redundant signal that's pure Sentry
 * noise and should be dropped in beforeSend.
 */
describe('isStaleAssetLinkRejection', () => {
  it('matches a raw Event rejection whose target is a <link> element', () => {
    const target = { tagName: 'LINK', href: 'https://example.com/_next/static/css/1.css' };
    const reason = { type: 'error', target } as unknown as Event;
    expect(isStaleAssetLinkRejection(reason)).toBe(true);
  });

  it('matches a raw Event rejection whose target is a <script> element', () => {
    const target = { tagName: 'SCRIPT', src: 'https://example.com/_next/static/chunks/1.js' };
    const reason = { type: 'error', target } as unknown as Event;
    expect(isStaleAssetLinkRejection(reason)).toBe(true);
  });

  it('does NOT match a raw Event whose target is an unrelated element', () => {
    const target = { tagName: 'DIV' };
    const reason = { type: 'error', target } as unknown as Event;
    expect(isStaleAssetLinkRejection(reason)).toBe(false);
  });

  it('does NOT match a real Error', () => {
    expect(isStaleAssetLinkRejection(new Error('boom'))).toBe(false);
  });

  it('does NOT match a plain string reason', () => {
    expect(isStaleAssetLinkRejection('some rejection reason')).toBe(false);
  });

  it('does NOT match null/undefined', () => {
    expect(isStaleAssetLinkRejection(null)).toBe(false);
    expect(isStaleAssetLinkRejection(undefined)).toBe(false);
  });
});
