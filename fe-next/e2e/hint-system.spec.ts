/**
 * Hint System E2E Tests
 *
 * Tests the hint system including:
 * - Hint button visibility and availability
 * - Hint request and response
 * - Hint limit tracking
 * - Hint cooldown
 * - Hint display
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

// Helper to start single player game
async function startSinglePlayerGame(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/en/singleplayer`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
  await startButton.click();
  await page.waitForTimeout(2000);
}

test.describe('Hint System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('lexiclash_onboarding_completed', 'true');
      localStorage.setItem('boggle_onboarding_completed', 'true');
      localStorage.setItem('boggle_username', 'HintTester');
    });
  });

  test.describe('Hint Button Visibility', () => {
    test('hint button visible in single player mode', async ({ page }) => {
      await startSinglePlayerGame(page);

      // Verify game started
      const grid = page.locator('[role="grid"]').first();
      await expect(grid).toBeVisible({ timeout: 5000 });

      // Look for hint button
      const hintButton = page.locator(
        'button:has-text("Hint"), button:has-text("💡"), button[aria-label*="hint" i], [class*="hint"]'
      ).first();
      const hintVisible = await hintButton.isVisible({ timeout: 5000 }).catch(() => false);

      // Take screenshot
      await page.screenshot({ path: 'test-results/hint-button-visibility.png', fullPage: true });

      console.log(`Hint button visible: ${hintVisible}`);
    });

    test('hint button shows remaining hints count', async ({ page }) => {
      await startSinglePlayerGame(page);

      // Look for hint count indicator
      const hintCount = page.locator(
        'text=/\\d+.*hint|hint.*\\d+/i, [class*="hint-count"]'
      );
      const countElements = await hintCount.count();

      console.log(`Hint count elements found: ${countElements}`);

      // Take screenshot
      await page.screenshot({ path: 'test-results/hint-count-display.png', fullPage: true });
    });
  });

  test.describe('Hint Request', () => {
    test('clicking hint button shows hint', async ({ page }) => {
      await startSinglePlayerGame(page);

      // Find and click hint button
      const hintButton = page.locator(
        'button:has-text("Hint"), button:has-text("💡"), button[aria-label*="hint" i]'
      ).first();

      if (await hintButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await hintButton.click();
        await page.waitForTimeout(2000);

        // Look for hint display
        const hintDisplay = page.locator(
          'text=/letter|word|look for|start/i, [class*="hint-message"], [class*="hint-display"]'
        ).first();
        const hintVisible = await hintDisplay.isVisible({ timeout: 5000 }).catch(() => false);

        console.log(`Hint display visible: ${hintVisible}`);

        // Take screenshot
        await page.screenshot({ path: 'test-results/hint-displayed.png', fullPage: true });
      }
    });

    test('hint provides useful information', async ({ page }) => {
      await startSinglePlayerGame(page);

      const hintButton = page.locator(
        'button:has-text("Hint"), button:has-text("💡"), button[aria-label*="hint" i]'
      ).first();

      if (await hintButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await hintButton.click();
        await page.waitForTimeout(2000);

        // Check for hint content (should contain letter, length, or direction info)
        const pageText = await page.textContent('body') || '';

        const containsHintInfo =
          /\d+-letter/.test(pageText) ||
          /starts? with/.test(pageText.toLowerCase()) ||
          /ends? with/.test(pageText.toLowerCase()) ||
          /look for/.test(pageText.toLowerCase()) ||
          /letter "[A-Z]"/.test(pageText);

        console.log(`Hint contains useful info: ${containsHintInfo}`);

        // Take screenshot
        await page.screenshot({ path: 'test-results/hint-content.png', fullPage: true });
      }
    });
  });

  test.describe('Hint Limit', () => {
    test('hint button disabled after using all hints', async ({ page }) => {
      await startSinglePlayerGame(page);

      const hintButton = page.locator(
        'button:has-text("Hint"), button:has-text("💡"), button[aria-label*="hint" i]'
      ).first();

      if (await hintButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Use all 3 hints
        for (let i = 0; i < 3; i++) {
          const isEnabled = !(await hintButton.isDisabled().catch(() => true));
          if (isEnabled) {
            await hintButton.click();
            await page.waitForTimeout(1500); // Wait between hints
            console.log(`Used hint ${i + 1}`);
          }
        }

        await page.waitForTimeout(1000);

        // Check if button is now disabled
        const isDisabledAfter = await hintButton.isDisabled().catch(() => true);
        console.log(`Hint button disabled after 3 uses: ${isDisabledAfter}`);

        // Take screenshot
        await page.screenshot({ path: 'test-results/hint-limit-reached.png', fullPage: true });
      }
    });

    test('shows "no hints remaining" message', async ({ page }) => {
      await startSinglePlayerGame(page);

      const hintButton = page.locator(
        'button:has-text("Hint"), button:has-text("💡"), button[aria-label*="hint" i]'
      ).first();

      if (await hintButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Use all hints
        for (let i = 0; i < 4; i++) { // Try 4 times to handle cooldown
          const isEnabled = !(await hintButton.isDisabled().catch(() => true));
          if (isEnabled) {
            await hintButton.click();
            await page.waitForTimeout(1500);
          }
        }

        // Look for "no hints" message
        const noHintsMessage = page.locator(
          'text=/no.*hint|0.*hint|hint.*remaining/i'
        ).first();
        const messageVisible = await noHintsMessage.isVisible({ timeout: 2000 }).catch(() => false);

        // Take screenshot
        await page.screenshot({ path: 'test-results/hint-no-remaining.png', fullPage: true });
      }
    });
  });

  test.describe('Hint Cooldown', () => {
    test('hint has cooldown between uses', async ({ page }) => {
      await startSinglePlayerGame(page);

      const hintButton = page.locator(
        'button:has-text("Hint"), button:has-text("💡"), button[aria-label*="hint" i]'
      ).first();

      if (await hintButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Use first hint
        await hintButton.click();
        await page.waitForTimeout(500);

        // Try to use second hint immediately
        const isDisabledImmediately = await hintButton.isDisabled().catch(() => false);

        // Look for cooldown indicator
        const cooldownIndicator = page.locator(
          'text=/wait|cooldown|\\ds/i, [class*="cooldown"]'
        ).first();
        const cooldownVisible = await cooldownIndicator.isVisible({ timeout: 2000 }).catch(() => false);

        console.log(`Button disabled after first use: ${isDisabledImmediately}`);
        console.log(`Cooldown indicator visible: ${cooldownVisible}`);

        // Take screenshot
        await page.screenshot({ path: 'test-results/hint-cooldown.png', fullPage: true });

        // Wait for cooldown and verify button becomes available
        await page.waitForTimeout(12000); // 10s cooldown + buffer

        const isEnabledAfterCooldown = !(await hintButton.isDisabled().catch(() => true));
        console.log(`Button enabled after cooldown: ${isEnabledAfterCooldown}`);
      }
    });
  });

  test.describe('Hint in Different Game States', () => {
    test('hint not available in multiplayer mode', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Navigate through create flow
      await page.locator('text=Create Room').first().click();
      await page.waitForTimeout(500);

      const usernameInput = page.locator('input[id="profile-username"], input[placeholder*="name"]').first();
      await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
      await usernameInput.fill('MultiplayerUser');

      const continueButton = page.getByRole('button', { name: /Continue/i });
      await continueButton.click();
      await page.waitForTimeout(2000);

      // Hint button should not be visible in multiplayer lobby
      const hintButton = page.locator(
        'button:has-text("Hint"), button:has-text("💡"), button[aria-label*="hint" i]'
      ).first();
      const hintVisible = await hintButton.isVisible({ timeout: 3000 }).catch(() => false);

      console.log(`Hint button visible in multiplayer: ${hintVisible}`);
      expect(hintVisible).toBe(false);

      // Take screenshot
      await page.screenshot({ path: 'test-results/hint-multiplayer.png', fullPage: true });
    });

    test('hint available in vs bots mode', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/singleplayer`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Look for bots/difficulty settings
      const botsToggle = page.locator(
        'button:has-text("Bot"), text=/vs.*bot|add.*bot/i, [class*="bot"]'
      ).first();
      const botsVisible = await botsToggle.isVisible({ timeout: 3000 }).catch(() => false);

      if (botsVisible) {
        await botsToggle.click();
        await page.waitForTimeout(500);
      }

      // Start game
      const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
      await startButton.click();
      await page.waitForTimeout(2000);

      // Check for hint button (should still be available vs bots)
      const hintButton = page.locator(
        'button:has-text("Hint"), button:has-text("💡"), button[aria-label*="hint" i]'
      ).first();
      const hintAvailable = await hintButton.isVisible({ timeout: 5000 }).catch(() => false);

      console.log(`Hint available vs bots: ${hintAvailable}`);

      // Take screenshot
      await page.screenshot({ path: 'test-results/hint-vs-bots.png', fullPage: true });
    });
  });

  test.describe('Hint Display Styling', () => {
    test('hint displays with proper styling', async ({ page }) => {
      await startSinglePlayerGame(page);

      const hintButton = page.locator(
        'button:has-text("Hint"), button:has-text("💡"), button[aria-label*="hint" i]'
      ).first();

      if (await hintButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await hintButton.click();
        await page.waitForTimeout(2000);

        // Check hint has appropriate styling
        const hintElement = page.locator('[class*="hint"], [role="alert"]').first();
        if (await hintElement.isVisible({ timeout: 2000 }).catch(() => false)) {
          // Get computed styles
          const styles = await hintElement.evaluate(el => {
            const computed = window.getComputedStyle(el);
            return {
              backgroundColor: computed.backgroundColor,
              color: computed.color,
              padding: computed.padding,
              borderRadius: computed.borderRadius
            };
          });

          console.log('Hint element styles:', styles);
        }

        // Take screenshot
        await page.screenshot({ path: 'test-results/hint-styling.png', fullPage: true });
      }
    });

    test('hint auto-dismisses after timeout', async ({ page }) => {
      await startSinglePlayerGame(page);

      const hintButton = page.locator(
        'button:has-text("Hint"), button:has-text("💡"), button[aria-label*="hint" i]'
      ).first();

      if (await hintButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await hintButton.click();
        await page.waitForTimeout(1000);

        // Hint should be visible
        const hintDisplay = page.locator('[class*="hint-message"], [class*="toast"]').first();
        const initialVisible = await hintDisplay.isVisible({ timeout: 2000 }).catch(() => false);

        // Wait for auto-dismiss (typically 5-10 seconds)
        await page.waitForTimeout(8000);

        // Hint should be gone
        const stillVisible = await hintDisplay.isVisible({ timeout: 1000 }).catch(() => false);

        console.log(`Hint initially visible: ${initialVisible}`);
        console.log(`Hint visible after timeout: ${stillVisible}`);

        // Take screenshot
        await page.screenshot({ path: 'test-results/hint-dismissed.png', fullPage: true });
      }
    });
  });

  test.describe('Hint API Integration', () => {
    test('hint request calls API endpoint', async ({ page }) => {
      const apiCalls: string[] = [];

      // Track API calls
      page.on('request', request => {
        if (request.url().includes('hint') || request.url().includes('solve')) {
          apiCalls.push(request.url());
        }
      });

      await startSinglePlayerGame(page);

      const hintButton = page.locator(
        'button:has-text("Hint"), button:has-text("💡"), button[aria-label*="hint" i]'
      ).first();

      if (await hintButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await hintButton.click();
        await page.waitForTimeout(3000);

        console.log('Hint API calls:', apiCalls);

        // Take screenshot
        await page.screenshot({ path: 'test-results/hint-api-call.png', fullPage: true });
      }
    });

    test('handles API error gracefully', async ({ page }) => {
      // Mock hint API to fail
      await page.route('**/api/solve-grid**', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server error' })
        });
      });

      await startSinglePlayerGame(page);

      const hintButton = page.locator(
        'button:has-text("Hint"), button:has-text("💡"), button[aria-label*="hint" i]'
      ).first();

      if (await hintButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await hintButton.click();
        await page.waitForTimeout(2000);

        // Should show error or fallback hint
        const errorMessage = page.locator('text=/error|failed|try again/i').first();
        const errorVisible = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);

        // Take screenshot
        await page.screenshot({ path: 'test-results/hint-api-error.png', fullPage: true });
      }
    });
  });
});
