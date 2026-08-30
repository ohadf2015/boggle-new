import { describe, it, expect } from 'vitest';
import { shouldRedirectBareSingleplayer } from '../redirectLogic';

describe('shouldRedirectBareSingleplayer', () => {
  it('redirects when no params are present', () => {
    expect(shouldRedirectBareSingleplayer({})).toBe(true);
  });

  it('redirects when only unrelated params are present', () => {
    expect(shouldRedirectBareSingleplayer({ utm_source: 'twitter' })).toBe(true);
  });

  it('does NOT redirect when autoStart is present (Practice)', () => {
    expect(shouldRedirectBareSingleplayer({ autoStart: 'practice' })).toBe(false);
  });

  it('does NOT redirect when preset is present', () => {
    expect(shouldRedirectBareSingleplayer({ preset: 'speed-run' })).toBe(false);
  });

  it('does NOT redirect when boardCode is present (UGC)', () => {
    expect(shouldRedirectBareSingleplayer({ boardCode: 'abc123' })).toBe(false);
  });

  // returnTo was retired 2026-08-30: nothing in the codebase ever constructed
  // `?returnTo=…`. It was read in three places (this predicate, the config hook,
  // and SinglePlayerView's post-results redirect) and written in none, so the
  // daily-replay branch it gated was unreachable. Any stale external link now
  // degrades to Quick Play rather than 404ing.
  it('redirects when only returnTo is present — that entry point is retired', () => {
    expect(shouldRedirectBareSingleplayer({ returnTo: 'daily' })).toBe(true);
  });

  it('does NOT redirect when practice flag is present', () => {
    expect(shouldRedirectBareSingleplayer({ practice: '1' })).toBe(false);
  });

  it('handles array values from Next.js searchParams shape', () => {
    expect(shouldRedirectBareSingleplayer({ autoStart: ['practice'] })).toBe(false);
  });
});
