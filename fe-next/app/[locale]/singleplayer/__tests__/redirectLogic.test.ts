import { describe, it, expect } from 'vitest';
import {
  shouldRedirectBareSingleplayer,
  bareSingleplayerRedirectTarget,
  searchParamsToRecord,
} from '../redirectLogic';

describe('shouldRedirectBareSingleplayer (bare → bots entry predicate)', () => {
  // Server no longer 308s; client treats bare as autoStart=bots. Predicate still
  // identifies bare SEO/CTA hits so soft-nav does not depend on a redirect stub.
  it('flags bare entries (no preserved params)', () => {
    expect(shouldRedirectBareSingleplayer({})).toBe(true);
  });

  it('flags entries that only have unrelated params (utm etc.)', () => {
    expect(shouldRedirectBareSingleplayer({ utm_source: 'twitter' })).toBe(true);
  });

  it('does NOT flag when autoStart is present (Practice)', () => {
    expect(shouldRedirectBareSingleplayer({ autoStart: 'practice' })).toBe(false);
  });

  it('does NOT flag when preset is present', () => {
    expect(shouldRedirectBareSingleplayer({ preset: 'speed-run' })).toBe(false);
  });

  it('does NOT flag when boardCode is present (UGC)', () => {
    expect(shouldRedirectBareSingleplayer({ boardCode: 'abc123' })).toBe(false);
  });

  // returnTo was retired 2026-08-30: nothing in the codebase ever constructed
  // `?returnTo=…`. It was read in three places (this predicate, the config hook,
  // and SinglePlayerView's post-results redirect) and written in none, so the
  // daily-replay branch it gated was unreachable. Any stale external link now
  // degrades to Quick Play rather than 404ing.
  it('flags when only returnTo is present — that entry point is retired', () => {
    expect(shouldRedirectBareSingleplayer({ returnTo: 'daily' })).toBe(true);
  });

  it('does NOT flag when practice flag is present', () => {
    expect(shouldRedirectBareSingleplayer({ practice: '1' })).toBe(false);
  });

  it('handles array values from Next.js searchParams shape', () => {
    expect(shouldRedirectBareSingleplayer({ autoStart: ['practice'] })).toBe(false);
  });
});

describe('bareSingleplayerRedirectTarget', () => {
  it('builds the soft-nav-safe bots URL for landing CTAs', () => {
    // Prefer linking here directly (no server 308). Client also maps bare → bots.
    expect(bareSingleplayerRedirectTarget('es')).toBe('/es/singleplayer?autoStart=bots');
  });

  it('preserves the locale segment', () => {
    expect(bareSingleplayerRedirectTarget('he')).toBe('/he/singleplayer?autoStart=bots');
    expect(bareSingleplayerRedirectTarget('en')).toBe('/en/singleplayer?autoStart=bots');
  });
});

describe('searchParamsToRecord', () => {
  it('copies URLSearchParams-like entries into a plain record', () => {
    const sp = new URLSearchParams('utm_source=google&autoStart=bots');
    expect(searchParamsToRecord(sp)).toEqual({ utm_source: 'google', autoStart: 'bots' });
  });

  it('returns {} for nullish input', () => {
    expect(searchParamsToRecord(null)).toEqual({});
    expect(searchParamsToRecord(undefined)).toEqual({});
  });

  it('supports get-only searchParams mocks used in component tests', () => {
    const mock = {
      get: (key: string) => (key === 'autoStart' ? 'bots' : null),
    };
    expect(searchParamsToRecord(mock)).toEqual({ autoStart: 'bots' });
    expect(shouldRedirectBareSingleplayer(searchParamsToRecord(mock))).toBe(false);
  });
});
