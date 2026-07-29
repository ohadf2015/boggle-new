import { describe, it, expect } from 'vitest';
import { isSameOrigin } from '../sameOrigin';

function req(headers: Record<string, string>) {
  const h = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    headers: { get: (k: string) => h.get(k.toLowerCase()) ?? null },
  } as unknown as import('next/server').NextRequest;
}

describe('isSameOrigin (CSRF guard)', () => {
  it('allows matching Origin + Host', () => {
    expect(isSameOrigin(req({ origin: 'https://lexiclash.app', host: 'lexiclash.app' }))).toBe(true);
  });

  it('rejects a cross-site Origin', () => {
    expect(isSameOrigin(req({ origin: 'https://evil.example', host: 'lexiclash.app' }))).toBe(false);
  });

  it('rejects when Host header is missing', () => {
    expect(isSameOrigin(req({ origin: 'https://lexiclash.app' }))).toBe(false);
  });

  it('falls back to Referer host when Origin absent', () => {
    expect(isSameOrigin(req({ referer: 'https://lexiclash.app/admin', host: 'lexiclash.app' }))).toBe(true);
    expect(isSameOrigin(req({ referer: 'https://evil.example/x', host: 'lexiclash.app' }))).toBe(false);
  });

  it('allows non-browser clients with neither Origin nor Referer (auth still gates)', () => {
    expect(isSameOrigin(req({ host: 'lexiclash.app' }))).toBe(true);
  });

  it('rejects a malformed Origin', () => {
    expect(isSameOrigin(req({ origin: 'not-a-url', host: 'lexiclash.app' }))).toBe(false);
  });
});
