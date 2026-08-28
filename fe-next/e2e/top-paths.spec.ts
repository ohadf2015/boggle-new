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
 * Against production:
 *   CI=1 E2E_BASE_URL=https://www.lexiclash.live npx playwright test top-paths --project=chromium
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
 * Serial, with a 90s budget, because of what the first run measured rather than by preference:
 * against production these 14 pages ALL time out at the default 30s with 4 workers, and all 14 pass
 * one at a time. Cold TTFB on `/` was 33.7s in the same window (`/en` 2.0s, `/en/multiplayer` 2.9s),
 * so the single Railway instance cannot serve four concurrent page loads — that is a capacity
 * finding, not a flake, and it is why this file must not be parallelised back.
 */
test.describe.configure({ mode: 'serial', timeout: 90_000 });

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
