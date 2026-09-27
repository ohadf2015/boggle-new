import { describe, it, expect, afterEach } from 'vitest';
import { getH5Client, isH5EnvEnabled } from '../h5GamesAds';

/**
 * The web-ad runbook (docs/2026-07-18-game-portals-web-ads-application-status.md,
 * "Env-flip cheat sheet") tells the operator to set `NEXT_PUBLIC_H5_GAMES_ENABLED`
 * and `NEXT_PUBLIC_H5_GAMES_CLIENT` once AdSense re-approval lands. The code read
 * `NEXT_PUBLIC_H5_ADS_ENABLED` / `NEXT_PUBLIC_ADSENSE_H5_CLIENT` — so following the
 * runbook would have been a silent no-op and web rewarded would have stayed dark
 * with no error anywhere. Accept both spellings. (Same class as the AdSense client
 * id drift and the LemonSqueezy variant id drift.)
 */
describe('h5GamesAds — env var names the runbook actually documents', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_H5_ADS_ENABLED;
    delete process.env.NEXT_PUBLIC_H5_GAMES_ENABLED;
    delete process.env.NEXT_PUBLIC_ADSENSE_H5_CLIENT;
    delete process.env.NEXT_PUBLIC_H5_GAMES_CLIENT;
  });

  it('is disabled by default', () => {
    expect(isH5EnvEnabled()).toBe(false);
  });

  it('enables on the code name NEXT_PUBLIC_H5_ADS_ENABLED', () => {
    process.env.NEXT_PUBLIC_H5_ADS_ENABLED = 'true';
    expect(isH5EnvEnabled()).toBe(true);
  });

  it('enables on the documented name NEXT_PUBLIC_H5_GAMES_ENABLED', () => {
    process.env.NEXT_PUBLIC_H5_GAMES_ENABLED = 'true';
    expect(isH5EnvEnabled()).toBe(true);
  });

  it('reads the client id from either name, code name winning', () => {
    process.env.NEXT_PUBLIC_H5_GAMES_CLIENT = 'ca-pub-3333333333333333';
    expect(getH5Client()).toBe('ca-pub-3333333333333333');
    process.env.NEXT_PUBLIC_ADSENSE_H5_CLIENT = 'ca-pub-4444444444444444';
    expect(getH5Client()).toBe('ca-pub-4444444444444444');
  });
});
