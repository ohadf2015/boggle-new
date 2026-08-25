/**
 * React reconciles <head> children BY POSITION and does not key them, so any third-party script
 * that inserts itself into <head> before hydration finishes shifts every React-owned head child
 * and mismatches the first inline one. That is not a hypothetical: an SSR'd `<script async
 * src=adsbygoogle.js>` here produced 56 React #418 hydration errors across 50 sessions in 7 days
 * on `/` alone (growth-radar rows 1867-1869/1871/1998), because adsbygoogle.js inserts its own
 * `show_ads_impl` script at head index 1 while React is still hydrating.
 *
 * The rule this pins: a third-party script tag in this layout's <head> must go through
 * next/script with `strategy="lazyOnload"` — the only strategy that cannot land before hydration
 * completes. `afterInteractive` is documented as "after SOME hydration occurs", which is the same
 * race with a smaller window, so it is rejected too.
 *
 * A source-shape test rather than a render test on purpose: the bug is invisible in a render
 * because it needs a real third party to mutate a real <head> mid-hydration. What is checkable is
 * the shape that allows it, and that is what regresses when someone re-adds a raw tag "just for
 * the crawler".
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE = readFileSync(join(__dirname, '..', 'layout.tsx'), 'utf8');

/** Third-party origins whose scripts are known to mutate <head> on load. */
const THIRD_PARTY_HOSTS = [
  'pagead2.googlesyndication.com',
  'www.googletagmanager.com',
  'connect.facebook.net',
  'analytics.tiktok.com',
  'cdn.logrocket.io',
  'growthradar.app',
];

describe('<head> scripts cannot race hydration', () => {
  it('loads no third-party script through a raw lowercase <script src>', () => {
    // Raw `<script ... src="...">` tags, as opposed to next/script's `<Script>`.
    const rawScripts: string[] = SOURCE.match(/<script\b[^>]*?src=[^>]*?>/g) ?? [];
    const offenders = rawScripts.filter((tag) => THIRD_PARTY_HOSTS.some((h) => tag.includes(h)));
    expect(offenders).toEqual([]);
  });

  it('loads the AdSense script via next/script on lazyOnload', () => {
    const tag = SOURCE.match(/<Script\b[\s\S]*?adsbygoogle\.js[\s\S]*?\/>/)?.[0];
    expect(tag, 'the AdSense loader should be a <Script>, not a raw <script>').toBeDefined();
    expect(tag).toContain('strategy="lazyOnload"');
    // AdSenseLoader's guard keys off this id; losing it lets the consent path double-inject.
    expect(tag).toContain('id="adsbygoogle-init"');
  });

  it('still keeps the storage shim as a same-document inline script, which must be first', () => {
    // The shim has to run before any app code touches localStorage, so it stays inline and
    // positional — which is exactly why nothing else in <head> may shift it.
    const headStart = SOURCE.indexOf('<head>');
    const shimAt = SOURCE.indexOf('STORAGE_SHIM_SCRIPT', headStart);
    const adsenseAt = SOURCE.indexOf('adsbygoogle.js', headStart);
    expect(headStart).toBeGreaterThan(-1);
    expect(shimAt).toBeGreaterThan(headStart);
    expect(shimAt).toBeLessThan(adsenseAt);
  });
});
