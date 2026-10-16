/**
 * Landing mobile PSI: rejected AdSense + Sentry chunk 78883 must stay off
 * first paint, and GSI must not afterInteractive-load on `/` `/en`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const feRoot = join(__dirname, '..');

describe('landing PSI third-party first-paint guards', () => {
  it('does not ship AdSenseLoader or adsbygoogle.js in locale layout', () => {
    const layout = readFileSync(join(feRoot, '[locale]', 'layout.tsx'), 'utf8');
    expect(layout).not.toContain('AdSenseLoader');
    expect(layout).not.toMatch(/src=["'][^"']*adsbygoogle\.js/);
    expect(layout).not.toMatch(/src=["'][^"']*pagead2\.googlesyndication\.com/);
    expect(existsSync(join(feRoot, '..', 'components', 'ads', 'AdSenseLoader.tsx'))).toBe(false);
  });

  it('does not auto-inject a root sentry.client.config into main-app', () => {
    expect(existsSync(join(feRoot, '..', 'sentry.client.config.ts'))).toBe(false);
    const instr = readFileSync(join(feRoot, '..', 'instrumentation-client.ts'), 'utf8');
    expect(instr).not.toMatch(/^import[^;]*@sentry/m);
    expect(instr).toMatch(/60_000|60000/);
  });

  it('defers GSI on the PSI landing until pointer engagement', () => {
    const src = readFileSync(
      join(feRoot, '..', 'components', 'auth', 'GoogleOneTapInitializer.tsx'),
      'utf8',
    );
    expect(src).toContain('isLandingPath');
    expect(src).toContain('landingGsiArmed');
    expect(src).toContain('pointerdown');
  });

  it('does not afterInteractive-preload GSI on every guest landing session', () => {
    const src = readFileSync(
      join(feRoot, '..', 'components', 'auth', 'SignupPromptHost.tsx'),
      'utf8',
    );
    expect(src).toContain('showSignupModal && <GsiClientPreloader');
    expect(src).not.toMatch(/!isAuthenticated && <GsiClientPreloader/);
  });
});
