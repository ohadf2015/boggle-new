import { describe, it, expect } from 'vitest';
import { shouldRedirectBareSingleplayer, bareSingleplayerRedirectTarget } from '../redirectLogic';

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

describe('bareSingleplayerRedirectTarget', () => {
  it('drops bare entries straight into a solo bots game (clear path into play)', () => {
    // Cold SEO traffic (e.g. /es/singleplayer, 100% bounce when dumped into MP
    // Quick Play with strangers) gets the first-win-fast solo game instantly.
    // Returning players are re-routed to MP Quick Play client-side by
    // useSinglePlayerConfig's hasPlayedBotsGame gate, preserving the Phase-5
    // soft-delete intent for the audience it was designed for.
    expect(bareSingleplayerRedirectTarget('es')).toBe('/es/singleplayer?autoStart=bots');
  });

  it('preserves the locale segment', () => {
    expect(bareSingleplayerRedirectTarget('he')).toBe('/he/singleplayer?autoStart=bots');
    expect(bareSingleplayerRedirectTarget('en')).toBe('/en/singleplayer?autoStart=bots');
  });
});
