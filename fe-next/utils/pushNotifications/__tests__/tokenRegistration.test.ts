/**
 * Tests for push token registration utilities
 */

import { describe, it, expect } from 'vitest';

// We test the exported helper rather than the private getDeviceId
// The helper is _generateUUID (internal export for testing)
import { _generateUUID } from '../tokenRegistration';

describe('_generateUUID', () => {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it('returns a valid UUID v4 when crypto.randomUUID is available', () => {
    const result = _generateUUID();
    expect(result).toMatch(UUID_RE);
  });

  it('returns a valid UUID v4 when crypto.randomUUID is NOT available (old WebView fallback)', () => {
    // Simulate Chrome WebView < 92 where crypto.randomUUID is undefined
    const original = crypto.randomUUID;
    (crypto as unknown as Record<string, unknown>).randomUUID = undefined;

    try {
      const result = _generateUUID();
      expect(result).toMatch(UUID_RE);
    } finally {
      (crypto as unknown as Record<string, unknown>).randomUUID = original;
    }
  });

  it('produces unique values on successive calls', () => {
    const original = crypto.randomUUID;
    (crypto as unknown as Record<string, unknown>).randomUUID = undefined;

    try {
      const a = _generateUUID();
      const b = _generateUUID();
      expect(a).not.toBe(b);
    } finally {
      (crypto as unknown as Record<string, unknown>).randomUUID = original;
    }
  });
});
