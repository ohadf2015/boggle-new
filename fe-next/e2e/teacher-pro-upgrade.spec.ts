import { test, expect, type Page, type Request } from '@playwright/test';
import { goto } from './helpers/test-utils';
import { applyStorageFixture, ONBOARDED_USER } from './helpers/storage-fixtures';

/**
 * Teacher Pro is the only revenue surface. qa-smoke's #1 durable finding
 * (approved 6+ times): no spec in fe-next/e2e/ clicked "Upgrade to Pro Now"
 * through to Polar checkout.
 *
 * Polar is mocked — this must not gate on a live sandbox key. The assertion
 * is the funnel hand-off: CTA click → POST /api/subscription/checkout (paid,
 * not trial) → browser lands on a Polar checkout URL.
 */

const POLAR_CHECKOUT_URL = 'https://sandbox.polar.sh/checkout/e2e-mock-teacher-pro';

function isCheckoutPost(request: Request): boolean {
  const url = request.url();
  return request.method() === 'POST' && url.includes('/api/subscription/checkout');
}

async function mockPolarCheckout(page: Page) {
  await page.route('**/api/subscription/checkout', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ url: POLAR_CHECKOUT_URL }),
    });
  });

  await page.route('https://sandbox.polar.sh/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><html><body><h1>Polar checkout (e2e mock)</h1></body></html>',
    });
  });
}

async function openUpgradePage(page: Page) {
  // Seed storage on a cheap first paint, then reload. Do NOT wait for
  // networkidle — analytics/websocket keep the page "busy" forever on prod.
  await goto(page, '/teacher/upgrade', 'en');
  await applyStorageFixture(page, {
    ...ONBOARDED_USER,
    'cookie-consent': 'accepted',
  });
  await page.evaluate(() => {
    localStorage.setItem('cookie-consent', 'accepted');
    document.cookie = 'cookie-consent=accepted; path=/';
  });
  await goto(page, '/teacher/upgrade', 'en');
  await page.waitForLoadState('domcontentloaded');

  const notNow = page.getByRole('button', { name: /not now/i });
  if (await notNow.isVisible().catch(() => false)) await notNow.click();
}

test.describe('Teacher Pro money path', () => {
  test('Upgrade to Pro Now POSTs paid checkout and redirects to Polar', async ({ page }) => {
    test.setTimeout(45_000);
    await mockPolarCheckout(page);
    await openUpgradePage(page);

    await expect(page).toHaveURL(/\/en\/teacher\/upgrade/);

    const cta = page.getByRole('button', { name: /^Upgrade to Pro$/i });
    await expect(cta).toBeVisible();
    await expect(cta).toBeEnabled();
    await cta.scrollIntoViewIfNeeded();

    const checkoutPost = page.waitForRequest(isCheckoutPost, { timeout: 15_000 });
    const polarLand = page.waitForURL(/sandbox\.polar\.sh\/checkout/, { timeout: 15_000 });

    await cta.click();

    const request = await checkoutPost;
    const rawBody = request.postData() ?? '';
    if (rawBody.trim()) {
      expect(JSON.parse(rawBody)).not.toEqual(expect.objectContaining({ trial: true }));
    }

    await polarLand;
    expect(page.url()).toContain('sandbox.polar.sh/checkout');
    await expect(page.getByText('Polar checkout (e2e mock)')).toBeVisible();
  });
});
