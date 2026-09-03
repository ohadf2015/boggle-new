import { describe, expect, it } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { offlineCapableRoutes } from '../offlineCapableModes';
import { locales } from '@/i18n/config';

const htmlPath = path.resolve(__dirname, '../../../capacitor-assets/error.html');

describe('capacitor-assets/error.html', () => {
  const html = readFileSync(htmlPath, 'utf8');

  it('stays a dependency-free static page under 15KB', () => {
    expect(html).not.toMatch(/<script[^>]+src=/i);
    expect(statSync(htmlPath).size).toBeLessThan(15 * 1024);
  });

  it('keeps Retry + auto-recover-on-online', () => {
    expect(html).toContain('id="retry"');
    expect(html).toContain('addEventListener("online"');
    expect(html).toContain('https://www.lexiclash.live');
  });

  it('embeds a Play offline section with every offlineCapableRoutes() href', () => {
    expect(html).toMatch(/play offline/i);
    for (const route of offlineCapableRoutes()) {
      expect(html, `missing precache href ${route}`).toContain(route);
    }
  });

  it('covers all five primary locales (and ru) in the inline strings map', () => {
    for (const loc of locales) {
      expect(html).toContain(`${loc}:`);
    }
  });

  it('does not auto-redirect to the remote host while navigator.onLine is false', () => {
    // The previous bootstrap did location.href = HOME while offline, which
    // re-triggered Chromium's stock interstitial. Stay on this page instead.
    expect(html).not.toMatch(/lc_offline_boot/);
    expect(html).not.toMatch(/attemptOfflineBootstrap/);
  });
});
