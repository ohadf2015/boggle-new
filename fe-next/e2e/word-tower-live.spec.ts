import { test, expect } from '@playwright/test';

test.describe('Word Tower live entry points', () => {
  test('/word-tower loads without a runtime error', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    const res = await page.goto('/en/word-tower');
    expect(res?.status()).toBe(200);
    await page.waitForLoadState('domcontentloaded');
    expect(errors).toEqual([]);
  });
});
