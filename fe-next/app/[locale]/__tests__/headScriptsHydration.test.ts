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

  /**
   * This layout used to ALSO load adsbygoogle.js through `<Script strategy="lazyOnload">`,
   * which was wrong twice over. next/script stamps `data-nscript` on the tag and AdSense
   * rejects it — 405 warnings, 8 users (Sentry JAVASCRIPT-NEXTJS-1PQ). And because the tag
   * was rendered UNCONDITIONALLY, it beat `AdSenseLoader` to the shared `adsbygoogle-init`
   * id, so the loader's `getElementById` guard returned early forever: the advertising-consent,
   * child-tier, native/CrazyGames and FTUE gates it exists to enforce were all dead code while
   * the script itself loaded for everyone regardless.
   *
   * AdSenseLoader is the single injector now: a plain `<script>` (no `data-nscript`) appended
   * from a `useEffect`, which is strictly later than lazyOnload and so keeps the hydration
   * property this file pins.
   */
  it('does not load AdSense from the layout at all — AdSenseLoader owns it', () => {
    // Tags only. Prose naming the script is how this file explains itself.
    const scriptTags: string[] = SOURCE.match(/<[Ss]cript\b[^>]*>/g) ?? [];
    expect(scriptTags.filter((t) => t.includes('adsbygoogle'))).toEqual([]);
    // The consent-gated component must still be mounted, or web ads go dark entirely.
    expect(SOURCE).toContain('<AdSenseLoader />');
  });

  it('still keeps the storage shim as a same-document inline script, which must be first', () => {
    // The shim has to run before any app code touches localStorage, so it stays inline and
    // positional — which is exactly why nothing else in <head> may shift it.
    const headStart = SOURCE.indexOf('<head>');
    const shimAt = SOURCE.indexOf('STORAGE_SHIM_SCRIPT', headStart);
    const firstNextScriptAt = SOURCE.indexOf('<Script', headStart);
    expect(headStart).toBeGreaterThan(-1);
    expect(shimAt).toBeGreaterThan(headStart);
    // No next/script tag may be emitted ahead of the shim and shift it.
    expect(shimAt).toBeLessThan(firstNextScriptAt);
  });
});
