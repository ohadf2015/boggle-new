/**
 * Cookie consent bar must stay inside the phone screen.
 *
 * Measured on the Hebrew homepage at 411×891 (Galaxy S25 / LexiClashApp WebView):
 * the bar is full-bleed (`left-0 right-0 bottom-0`) and `shadow-hard-lg` paints
 * 6px past the left edge (RTL) and 6px past the bottom. The Android app is
 * edge-to-edge, and this bar never reads the gesture inset, so its buttons sit
 * under the system nav bar.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const SRC = readFileSync(resolve(__dirname, '../CookieConsent.tsx'), 'utf8');

describe('CookieConsent stays inside the phone viewport', () => {
  it('does not use a sideways hard shadow on the full-bleed bar', () => {
    expect(SRC).not.toContain('shadow-hard-lg');
    expect(SRC).toContain('shadow-[0_-4px_0_0_#000]');
  });

  it('pads the bar above the Android gesture / home inset', () => {
    expect(SRC).toContain(
      'max(0.5rem, var(--cap-safe-area-bottom, env(safe-area-inset-bottom, 0px)))'
    );
  });
});
