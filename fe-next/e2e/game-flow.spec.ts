import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Game Flow
 * Tests the critical path: Join/Host -> Game -> Results
 */

test.describe('Game Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays join page correctly', async ({ page }) => {
    // Check main elements are visible
    await expect(page.getByRole('button', { name: /join/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /create|host/i })).toBeVisible();
  });

  test('can switch between join and host modes', async ({ page }) => {
    // Find and click the host/create button
    const hostButton = page.getByRole('button', { name: /create|host/i });
    await hostButton.click();

    // Should show host mode content - game code input
    await expect(page.getByLabel(/room code/i)).toBeVisible();
  });

  test('validates empty username in join mode', async ({ page }) => {
    // Enter a game code but not a username
    await page.fill('[id="gameCode"]', '1234');

    // Try to submit
    const joinButton = page.getByRole('button', { name: /join/i });

    // The button should be disabled without a username
    await expect(joinButton).toBeDisabled();
  });

  test('validates game code format', async ({ page }) => {
    // Enter invalid game code (special characters)
    await page.fill('[id="gameCode"]', '12!@');

    // Should show validation error or reject input
    const gameCodeInput = page.locator('[id="gameCode"]');
    // The input should only contain valid characters
    await expect(gameCodeInput).toHaveValue(/^[0-9A-Za-z]*$/);
  });
});

test.describe('Room List', () => {
  test('displays active rooms panel', async ({ page }) => {
    await page.goto('/');

    // Check rooms list is visible
    await expect(page.getByText(/rooms|active/i)).toBeVisible();
  });

  test('refresh button works', async ({ page }) => {
    await page.goto('/');

    // Find and click refresh button
    const refreshButton = page.getByRole('button', { name: /refresh/i });
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      // Should not throw error
    }
  });
});

test.describe('How to Play', () => {
  test('opens how to play dialog', async ({ page }) => {
    await page.goto('/');

    // Find and click the help/how to play button
    const helpButton = page.getByRole('button', { name: /how to play|help|\?/i });
    if (await helpButton.isVisible()) {
      await helpButton.click();

      // Dialog should be visible
      await expect(page.getByRole('dialog')).toBeVisible();
    }
  });
});

test.describe('Accessibility', () => {
  test('has no critical accessibility violations on join page', async ({ page }) => {
    await page.goto('/');

    // Check for basic accessibility features
    // All buttons should have accessible names
    const buttons = page.getByRole('button');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const name = await button.getAttribute('aria-label') || await button.textContent();
        expect(name).toBeTruthy();
      }
    }
  });

  test('inputs have associated labels', async ({ page }) => {
    await page.goto('/');

    // Check main inputs have labels
    const inputs = page.locator('input[type="text"]');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      if (await input.isVisible()) {
        const id = await input.getAttribute('id');
        if (id) {
          // Should have a label with matching 'for' attribute or be inside a label
          const label = page.locator(`label[for="${id}"]`);
          const hasLabel = await label.count() > 0;
          const hasAriaLabel = await input.getAttribute('aria-label');

          expect(hasLabel || hasAriaLabel).toBeTruthy();
        }
      }
    }
  });
});

test.describe('Responsive Design', () => {
  test('works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto('/');

    // Main elements should still be visible
    await expect(page.getByRole('button', { name: /join|create/i }).first()).toBeVisible();
  });

  test('works on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await page.goto('/');

    // Main elements should still be visible
    await expect(page.getByRole('button', { name: /join|create/i }).first()).toBeVisible();
  });
});
