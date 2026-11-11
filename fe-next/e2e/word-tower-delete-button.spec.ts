import { test, expect } from '@playwright/test';

/**
 * Delete was the #1 rageclick target on Word Tower (PostHog, 140 clicks/7d):
 * it rendered `disabled` with nothing to clear, so a tap vanished silently.
 * It now stays enabled and shakes instead.
 */
test.describe('Word Tower Delete button', () => {
  test('stays usable and clears the word under repeated taps', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/en/word-tower', { waitUntil: 'domcontentloaded' });
    const deleteButton = page.getByRole('button', { name: 'Delete' });
    await expect(deleteButton).toBeVisible({ timeout: 30_000 });

    // Nothing selected yet: the button must not be the inert `disabled` state
    // that caused the silent, unfelt taps.
    await expect(deleteButton).toBeEnabled();

    // Hammer it with nothing to clear (the rageclick scenario) — no crash.
    for (let i = 0; i < 5; i++) await deleteButton.click();
    await expect(deleteButton).toBeEnabled();

    // Spell a partial word, then clear it with repeated taps (more taps than
    // letters) and confirm every tile ends up unselected — no stuck state.
    const tiles = page.locator('[data-wheel-letter]');
    await tiles.nth(0).click();
    await tiles.nth(1).click();
    await expect(page.locator('[data-wheel-letter][aria-pressed="true"]')).toHaveCount(2);

    for (let i = 0; i < 4; i++) await deleteButton.click();
    await expect(page.locator('[data-wheel-letter][aria-pressed="true"]')).toHaveCount(0);

    expect(errors).toEqual([]);
  });
});
