import { test, expect } from '@playwright/test';
import topPaths from './fixtures/top-paths.json';

/**
 * Smoke test over the pages users ACTUALLY load, ranked by real sessions.
 *
 * The rest of e2e/ tests flows someone decided were important. This one tests the flows the
 * traffic decided were important: `e2e/fixtures/top-paths.json` is generated from the self-hosted
 * Umami database (company-brain `scripts/qa/flow-mine.mjs paths --out <this fixture>`), ranked by
 * DISTINCT SESSIONS over the last 30 days. Ranking by hits instead puts /he/admin near the top —
 * 145 hits from 13 sessions, one person reloading a dashboard — so sessions it is.
 *
 * Re-generate the fixture whenever traffic shifts; the test list follows it with no code change.
 *
 * Against production: `npm run test:e2e:prod`.
 *
 * Standing result, 2026-08-28: 12 of 14 pass. `/es` and `/es/multiplayer` — 217 sessions between
 * them, the Spanish landing and the Spanish multiplayer entry — throw React #418, a hydration
 * mismatch (`args[]=text` and `args[]=HTML`). Not a test artefact: PostHog error tracking has the
 * same minified #418 as its top active issue, 12 occurrences over 4 sessions since 2026-08-22. It
 * is intermittent — an earlier run of this same file passed all 14 — which is exactly why it wants
 * a suite rather than a spot check.
 */

/**
 * What counts as "broken" here is an UNCAUGHT exception (page.on('pageerror')), not a console
 * message. Production consoles are full of third-party ad and analytics noise, and a suite that
 * goes red on someone else's script is a suite nobody reads. These two are ours-but-harmless:
 * ResizeObserver's loop notice is a browser quirk with no user impact, and hydration mismatch
 * warnings are logged, not thrown.
 */
const IGNORED_ERRORS = [
  /ResizeObserver loop/i,
  /Failed to fetch.*(googlesyndication|doubleclick|monetag|adsbygoogle)/i,
];

const isOurs = (message: string) => !IGNORED_ERRORS.some((re) => re.test(message));

/**
 * Budget, and why it is generous: the first run against production timed out 12 of these 14 pages
 * at Playwright's default 30s with 4 workers. The cause is COLD START, not a concurrency ceiling —
 * measured both ways: first byte on a cold `/` took 33.7s, while four concurrent requests against a
 * warm instance all returned 200 in 0.85s. A parallel run is simply four browsers queued behind one
 * cold boot. So the suite runs one page at a time (`--workers=1` in `npm run test:e2e:prod`) and
 * allows 90s, which absorbs a cold boot without hiding a genuinely broken page.
 *
 * Deliberately NOT `describe.configure({ mode: 'serial' })`: serial mode SKIPS every later test in
 * the group once one fails, which would turn "3 of my top paths are broken" into "1 broken, 13
 * unknown". A smoke suite exists to report the whole list.
 */
test.describe.configure({ timeout: 90_000 });

test.describe('top real-traffic paths', () => {
  for (const { path, sessions } of topPaths.paths) {
    test(`${path} loads clean (${sessions} sessions/30d)`, async ({ page }) => {
      const thrown: string[] = [];
      page.on('pageerror', (e) => {
        if (isOurs(String(e))) thrown.push(String(e));
      });

      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });

      // A redirect is fine (locale/canonical); a 4xx/5xx on a page this many people open is not.
      expect(response, `no response for ${path}`).not.toBeNull();
      expect(response!.status(), `${path} returned ${response!.status()}`).toBeLessThan(400);

      // Rendered, not just delivered: an empty shell returns 200 too.
      await expect(page.locator('body')).toBeVisible();
      expect((await page.title()).trim(), `${path} has no <title>`).not.toBe('');
      const bodyText = (await page.locator('body').innerText()).trim();
      expect(bodyText.length, `${path} rendered an empty body`).toBeGreaterThan(40);

      // Give client-side work a beat to throw before we judge the page.
      await page.waitForTimeout(2_000);
      expect(thrown, `${path} threw: ${thrown.join(' | ')}`).toEqual([]);
    });
  }
});
