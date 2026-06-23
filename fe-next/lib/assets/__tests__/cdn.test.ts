import { describe, it, expect, afterEach, vi } from 'vitest';
import { getAssetUrl } from '../cdn';

// getAssetUrl reads process.env.NEXT_PUBLIC_ASSET_CDN_BASE at call time.
// In Next, that var is inlined at build; in tests we stub it per-case.
const ENV = 'NEXT_PUBLIC_ASSET_CDN_BASE';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getAssetUrl', () => {
  it('returns the path unchanged when no CDN base is set (dev / un-set prod)', () => {
    vi.stubEnv(ENV, '');
    expect(getAssetUrl('/sounds/combo.mp3')).toBe('/sounds/combo.mp3');
  });

  it('prefixes the CDN base when set', () => {
    vi.stubEnv(ENV, 'https://cdn.example.co/static');
    expect(getAssetUrl('/sounds/combo.mp3')).toBe('https://cdn.example.co/static/sounds/combo.mp3');
  });

  it('normalizes a trailing slash on the base (no double slash)', () => {
    vi.stubEnv(ENV, 'https://cdn.example.co/static/');
    expect(getAssetUrl('/music/in_game.mp3')).toBe('https://cdn.example.co/static/music/in_game.mp3');
  });

  it('leaves an already-absolute http(s) url untouched (idempotent)', () => {
    vi.stubEnv(ENV, 'https://cdn.example.co/static');
    expect(getAssetUrl('https://other.cdn/x.mp3')).toBe('https://other.cdn/x.mp3');
  });

  it('handles a path without a leading slash', () => {
    vi.stubEnv(ENV, 'https://cdn.example.co/static');
    expect(getAssetUrl('sounds/combo.mp3')).toBe('https://cdn.example.co/static/sounds/combo.mp3');
  });

  it('passes through empty/blob/data urls unchanged', () => {
    vi.stubEnv(ENV, 'https://cdn.example.co/static');
    expect(getAssetUrl('')).toBe('');
    expect(getAssetUrl('data:audio/mp3;base64,AAAA')).toBe('data:audio/mp3;base64,AAAA');
    expect(getAssetUrl('blob:abc')).toBe('blob:abc');
  });
});
