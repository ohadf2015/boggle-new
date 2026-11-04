import { test, expect, type Page } from '@playwright/test';
import { LOCALES, VIEWPORTS, measureChestTag, measureFit, measureIslands, signInAs, type HubPersona } from './edu-no-scroll.harness';

const SHOTS = process.env.EDU_SHOTS_DIR;
const HUB_KEYS = ['academy-hub', 'academy-hud', 'academy-cta', 'academy-dock-lessons', 'academy-dock-me'];
/** Fewest map nodes (islands + boss) a screen this size must show: a phone under the first-visit cookie banner keeps the next island and the castle. */
const MIN_NODES: Record<string, number> = { phone: 2, tablet: 4, projector: 4 };

async function expectIslandsClear(page: Page, minNodes: number) {
  const isl = await measureIslands(page);
  const detail = JSON.stringify(isl);
  expect(isl.islands, detail).toBeGreaterThanOrEqual(minNodes);
  expect(isl.covered, detail).toEqual([]);
  expect(isl.overlapping, detail).toEqual([]);
  expect(isl.artShare, detail).toBeGreaterThanOrEqual(0.7);
}

for (const vp of VIEWPORTS) {
  test.describe(`student hub at ${vp.width}x${vp.height}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const locale of LOCALES) {
      for (const persona of ['student-full', 'student-busy', 'student-empty', 'guest'] as HubPersona[]) {
        test(`${locale} ${persona}: one screen, no scroll, hero and dock on screen`, async ({ page, context, baseURL }) => {
          await signInAs(context, page, baseURL!, persona);
          await page.goto(`/${locale}/student`);
          await expect(page.getByTestId('academy-hub')).toBeVisible({ timeout: 30_000 });
          await expect(page.getByTestId('academy-cta')).toBeVisible({ timeout: 15_000 });
          await expect(page.getByTestId('academy-cta-pending')).toHaveCount(0, { timeout: 15_000 });
          await page.waitForTimeout(1200);
          expect(new URL(page.url()).pathname).toBe(`/${locale}/student`);

          const fit = await measureFit(page, HUB_KEYS);
          const detail = JSON.stringify(fit);
          if (SHOTS) await page.screenshot({ path: `${SHOTS}/hub-${vp.name}-${locale}-${persona}.png` });

          expect(fit.scrollHeight, detail).toBeLessThanOrEqual(fit.innerHeight);
          expect(fit.scrollWidth, detail).toBeLessThanOrEqual(fit.innerWidth);
          expect(fit.offscreen, detail).toEqual([]);
          expect(fit.hiddenScrollers, detail).toEqual([]);
          expect(fit.dir, detail).toBe(locale === 'he' ? 'rtl' : 'ltr');

          if (persona === 'student-full' || persona === 'student-busy') await expectIslandsClear(page, MIN_NODES[vp.name]);
          expect(await measureChestTag(page)).toEqual([]);
        });
      }
    }

    test('he mirrors the hub: the profile dock item sits on the opposite side to en', async ({ page, context, baseURL }) => {
      await signInAs(context, page, baseURL!, 'student-full');
      const meX = async (locale: string) => {
        await page.goto(`/${locale}/student`);
        const me = page.getByTestId('academy-dock-me');
        await expect(me).toBeVisible({ timeout: 30_000 });
        const lessons = await page.getByTestId('academy-dock-lessons').boundingBox();
        const box = await me.boundingBox();
        return box!.x - lessons!.x;
      };
      const en = await meX('en');
      const he = await meX('he');
      expect(Math.sign(en)).toBe(-Math.sign(he));
    });
  });
}

test.describe('a returning student on a phone (cookie choice made)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const locale of LOCALES) {
    for (const persona of ['student-full', 'student-busy'] as HubPersona[]) {
      test(`${locale} ${persona}: the map shows a path (two islands and the castle), nothing covered`, async ({ page, context, baseURL }) => {
        await signInAs(context, page, baseURL!, persona);
        await context.addInitScript(() => {
          localStorage.setItem('cookie-consent-v2', JSON.stringify({ essential: true, analytics: false, advertising: false, timestamp: Date.now() }));
        });
        await page.goto(`/${locale}/student`);
        await expect(page.getByTestId('academy-cta')).toBeVisible({ timeout: 30_000 });
        await expect(page.getByTestId('academy-cta-pending')).toHaveCount(0, { timeout: 15_000 });
        await page.waitForTimeout(1200);
        if (SHOTS) await page.screenshot({ path: `${SHOTS}/hub-phone-returning-${locale}-${persona}.png` });
        const fit = await measureFit(page, HUB_KEYS);
        expect(fit.scrollHeight, JSON.stringify(fit)).toBeLessThanOrEqual(fit.innerHeight);
        expect(fit.offscreen, JSON.stringify(fit)).toEqual([]);
        await expectIslandsClear(page, 3);
      });
    }
  }
});

test.describe('who lands on the student hub', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('signed-out visitor goes to the student join, not the homepage', async ({ page }) => {
    await page.goto('/en/student');
    await page.waitForURL(/\/en\/student\/join/, { timeout: 30_000 });
  });

  test('a teacher is sent to the teacher home', async ({ page, context, baseURL }) => {
    await signInAs(context, page, baseURL!, 'teacher');
    await page.goto('/en/student');
    await page.waitForURL(/\/en\/teacher/, { timeout: 30_000 });
  });
});
