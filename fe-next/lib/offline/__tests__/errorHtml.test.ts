import { describe, expect, it } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { LAUNCHER_MODES } from '../offlineCapableModes';
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

  it('embeds a Play offline section with every launcher mode href', () => {
    expect(html).toMatch(/play offline/i);
    for (const loc of locales) {
      for (const mode of LAUNCHER_MODES) {
        expect(html, `missing launcher href ${mode.entry(loc)}`).toContain(`"${mode.entry(loc)}"`);
      }
    }
  });

  it('does not reveal unreleased modes (crossword, wordfall)', () => {
    expect(html).not.toContain('"/en/crossword"');
    expect(html).not.toContain('"/en/blast/v2"');
    expect(html).not.toContain('playCrossword');
    expect(html).not.toContain('playWordfall');
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
