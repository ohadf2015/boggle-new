/**
 * No-JS reachability guard for the Boggle SEO landing pages.
 *
 * Live-site QA (2026-08-23) fetched /en/play-boggle-online-free with a headless
 * browser that could NOT execute JavaScript and reported the JS status as
 * unclear. The page turned out to be fine: it is a server component, so the full
 * HTML (copy + Schema.org blocks) is in the initial response, and its CTAs are
 * real <Link> elements that render as plain <a href> — a visitor with JS off or
 * still loading can click through to the game. The interactive game itself needs
 * JS by nature and is out of scope here; what matters is that the crawlable
 * landing page and the click-path into the game never become JS-dependent.
 *
 * These pages are the highest-traffic organic entry points, so the invariant is
 * worth pinning: the day someone adds 'use client' or swaps a CTA for an
 * onClick+router.push button, no-JS visitors and crawlers silently lose both the
 * content and the path into gameplay. Raw source is scanned rather than rendered
 * so the guard is independent of each page's export shape.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const PAGES = [
  'app/[locale]/play-boggle-online-free/page.tsx',
  'app/[locale]/boggle-word-shake-free/page.tsx',
];

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

describe('boggle landing pages — reachable without JavaScript', () => {
  it.each(PAGES)('%s stays a server component (HTML present with JS off)', (rel) => {
    expect(read(rel)).not.toMatch(/^\s*['"]use client['"]/m);
  });

  it.each(PAGES)('%s links into gameplay with a real href', (rel) => {
    // A <Link href> renders as <a href> in the server HTML; an onClick+router.push
    // button renders as dead markup until hydration. Matching the interpolated
    // locale var loosely (not its exact spelling, and not the closing backtick)
    // keeps a prettier reflow or an added ?quickPlay=true from failing the guard.
    expect(read(rel)).toMatch(/href=\{`\/\$\{\w+\}\/(?:singleplayer|multiplayer)/);
  });
});
