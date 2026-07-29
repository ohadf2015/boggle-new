import { describe, it, expect, afterEach, vi } from 'vitest';
import { safeRandomUUID } from './safeRandomUUID';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('safeRandomUUID', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses native crypto.randomUUID when available', () => {
    const native = vi.fn(() => '11111111-1111-4111-8111-111111111111');
    vi.stubGlobal('crypto', { randomUUID: native });

    expect(safeRandomUUID()).toBe('11111111-1111-4111-8111-111111111111');
    expect(native).toHaveBeenCalledTimes(1);
  });

  // The exact Sentry scenario (JAVASCRIPT-NEXTJS-1JC): crypto exists but
  // randomUUID is undefined — non-secure context (http) or older WebView.
  it('falls back to a valid v4 UUID when crypto.randomUUID is missing', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) arr[i] = (i * 17 + 3) & 0xff;
        return arr;
      },
    });

    expect(() => safeRandomUUID()).not.toThrow();
    expect(safeRandomUUID()).toMatch(UUID_V4);
  });

  it('falls back to a valid v4 UUID when crypto is entirely absent', () => {
    vi.stubGlobal('crypto', undefined);

    expect(() => safeRandomUUID()).not.toThrow();
    expect(safeRandomUUID()).toMatch(UUID_V4);
  });

  it('returns distinct ids across calls in the fallback path', () => {
    vi.stubGlobal('crypto', undefined);
    expect(safeRandomUUID()).not.toBe(safeRandomUUID());
  });
});
