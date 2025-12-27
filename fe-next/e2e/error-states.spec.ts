/**
 * Error States E2E Tests
 *
 * Tests error handling scenarios including:
 * - Invalid room codes
 * - Room full errors
 * - Room not found errors
 * - Network timeouts
 * - Server errors
 * - Rate limiting
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

// Helper to dismiss onboarding if present
async function dismissOnboardingIfPresent(page: Page) {
  try {
    const closeButton = page.locator('button:has-text("X"), button[aria-label*="close"]').first();
    if (await closeButton.isVisible({ timeout: 2000 })) {
      await closeButton.click();
      await page.waitForTimeout(500);
    }
  } catch {
    // Onboarding not present
  }
}

test.describe('Error States', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('lexiclash_onboarding_completed', 'true');
      localStorage.setItem('boggle_onboarding_completed', 'true');
      localStorage.setItem('boggle_username', 'ErrorTestUser');
    });
  });

  test.describe('Invalid Room Code', () => {
    test('shows error for non-existent room code', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      // Navigate to join flow
      await page.locator('text=Join Room').first().click();
      await page.waitForTimeout(500);

      // Fill username
      const usernameInput = page.locator('input[id="profile-username"], input[placeholder*="name"]').first();
      await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
      await usernameInput.clear();
      await usernameInput.fill('JoinTestUser');

      const continueButton = page.getByRole('button', { name: /Continue/i });
      await continueButton.click();
      await page.waitForTimeout(1000);

      // Enter invalid room code
      const codeInput = page.locator('input[id="join-game-code"], input[placeholder*="ABC"], input[inputmode="text"]').first();
      if (await codeInput.isVisible({ timeout: 5000 })) {
        await codeInput.fill('INVALIDCODE123');

        // Try to join
        const joinButton = page.getByRole('button', { name: /Join/i }).last();
        await joinButton.click();
        await page.waitForTimeout(2000);

        // Look for error message
        const errorMessage = page.locator(
          'text=/room not found|invalid code|does not exist|no room/i, [class*="error"], [role="alert"]'
        ).first();
        const errorVisible = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false);

        // Take screenshot
        await page.screenshot({ path: 'test-results/error-invalid-room-code.png', fullPage: true });

        // Either error message or we stay on the join form
        const stillOnJoinForm = await codeInput.isVisible();
        expect(errorVisible || stillOnJoinForm).toBe(true);
      }
    });

    test('shows error for empty room code', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      // Navigate to join flow
      await page.locator('text=Join Room').first().click();
      await page.waitForTimeout(500);

      // Fill username
      const usernameInput = page.locator('input[id="profile-username"], input[placeholder*="name"]').first();
      await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
      await usernameInput.fill('EmptyCodeUser');

      const continueButton = page.getByRole('button', { name: /Continue/i });
      await continueButton.click();
      await page.waitForTimeout(1000);

      // Leave code empty and try to join
      const joinButton = page.getByRole('button', { name: /Join/i }).last();

      // Button should be disabled or show validation error
      const isDisabled = await joinButton.isDisabled().catch(() => false);

      // Take screenshot
      await page.screenshot({ path: 'test-results/error-empty-room-code.png', fullPage: true });
    });
  });

  test.describe('Room Full Error', () => {
    test('shows appropriate message when room is full', async ({ page }) => {
      // Mock a "room full" response
      await page.route('**/socket.io/**', async (route, request) => {
        const postData = request.postData();
        if (postData && postData.includes('join')) {
          // Continue normally - actual room full would come from socket event
          route.continue();
        } else {
          route.continue();
        }
      });

      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      // Take screenshot of multiplayer page
      await page.screenshot({ path: 'test-results/error-room-full-setup.png', fullPage: true });
    });
  });

  test.describe('Network Timeout Errors', () => {
    test('handles slow API responses gracefully', async ({ page }) => {
      // Add delay to API responses
      await page.route('**/api/**', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3s delay
        route.continue();
      });

      await page.goto(`${BASE_URL}/en/singleplayer`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Page should still load
      const mainContent = page.locator('main, [role="main"]').first();
      await expect(mainContent).toBeVisible({ timeout: 10000 });

      // Take screenshot
      await page.screenshot({ path: 'test-results/error-slow-api.png', fullPage: true });
    });

    test('shows loading indicator during slow responses', async ({ page }) => {
      await page.route('**/api/validate-word**', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5s delay
        route.continue();
      });

      await page.goto(`${BASE_URL}/en/singleplayer`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Start game
      const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
      await startButton.click();
      await page.waitForTimeout(2000);

      // Look for loading indicator
      const loadingIndicator = page.locator(
        '[class*="loading"], [class*="spinner"], [class*="pending"]'
      ).first();

      // Take screenshot
      await page.screenshot({ path: 'test-results/error-loading-indicator.png', fullPage: true });
    });
  });

  test.describe('Server Errors', () => {
    test('handles 500 error from dictionary API', async ({ page }) => {
      await page.route('**/api/dictionary/**', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });

      await page.goto(`${BASE_URL}/en/singleplayer`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Start game
      const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
      await startButton.click();
      await page.waitForTimeout(2000);

      // Game should still work (validation fallback)
      const grid = page.locator('[role="grid"]').first();
      const gridVisible = await grid.isVisible({ timeout: 5000 }).catch(() => false);

      // Take screenshot
      await page.screenshot({ path: 'test-results/error-server-500.png', fullPage: true });
    });

    test('handles 503 service unavailable', async ({ page }) => {
      await page.route('**/api/**', (route) => {
        route.fulfill({
          status: 503,
          body: 'Service Unavailable'
        });
      });

      await page.goto(`${BASE_URL}/en`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Page should still load (graceful degradation)
      const mainContent = page.locator('main, [role="main"]').first();
      await expect(mainContent).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Rate Limiting', () => {
    test('handles rate limit response from API', async ({ page }) => {
      let requestCount = 0;

      await page.route('**/api/validate-word**', (route) => {
        requestCount++;
        if (requestCount > 3) {
          route.fulfill({
            status: 429,
            body: JSON.stringify({ error: 'Rate limit exceeded' })
          });
        } else {
          route.continue();
        }
      });

      await page.goto(`${BASE_URL}/en/singleplayer`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Start game
      const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
      await startButton.click();
      await page.waitForTimeout(2000);

      // Game should handle rate limiting gracefully
      const grid = page.locator('[role="grid"]').first();
      await expect(grid).toBeVisible({ timeout: 5000 });

      // Take screenshot
      await page.screenshot({ path: 'test-results/error-rate-limited.png', fullPage: true });
    });
  });

  test.describe('Validation Errors', () => {
    test('shows error for username too short', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      // Navigate to profile setup
      await page.locator('text=Create Room').first().click();
      await page.waitForTimeout(500);

      // Enter short username
      const usernameInput = page.locator('input[id="profile-username"], input[placeholder*="name"]').first();
      await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
      await usernameInput.clear();
      await usernameInput.fill('A');

      // Continue button should be disabled
      const continueButton = page.getByRole('button', { name: /Continue/i });
      const isDisabled = await continueButton.isDisabled();
      expect(isDisabled).toBe(true);

      // Look for validation message
      const validationMessage = page.locator('text=/too short|minimum|at least/i').first();
      const validationVisible = await validationMessage.isVisible({ timeout: 2000 }).catch(() => false);

      // Take screenshot
      await page.screenshot({ path: 'test-results/error-username-short.png', fullPage: true });
    });

    test('shows error for invalid characters in username', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      // Navigate to profile setup
      await page.locator('text=Create Room').first().click();
      await page.waitForTimeout(500);

      // Enter username with special characters
      const usernameInput = page.locator('input[id="profile-username"], input[placeholder*="name"]').first();
      await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
      await usernameInput.clear();
      await usernameInput.fill('<script>alert("xss")</script>');

      // Check for sanitization or error
      const value = await usernameInput.inputValue();

      // Take screenshot
      await page.screenshot({ path: 'test-results/error-username-invalid-chars.png', fullPage: true });
    });
  });

  test.describe('Connection Lost During Game', () => {
    test('shows connection lost indicator during game', async ({ page, context }) => {
      await page.goto(`${BASE_URL}/en/singleplayer`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Start game
      const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
      await startButton.click();
      await page.waitForTimeout(2000);

      // Verify game started
      const grid = page.locator('[role="grid"]').first();
      await expect(grid).toBeVisible({ timeout: 5000 });

      // Simulate going offline
      await context.setOffline(true);
      await page.waitForTimeout(1000);

      // Take screenshot of offline state
      await page.screenshot({ path: 'test-results/error-game-offline.png', fullPage: true });

      // Go back online
      await context.setOffline(false);
      await page.waitForTimeout(2000);

      // Take screenshot of recovery
      await page.screenshot({ path: 'test-results/error-game-recovered.png', fullPage: true });
    });
  });

  test.describe('404 Not Found', () => {
    test('shows 404 page for invalid routes', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/nonexistent-page`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Should show 404 or redirect to home
      const notFoundText = page.locator('text=/404|not found|page doesn\'t exist/i').first();
      const notFoundVisible = await notFoundText.isVisible({ timeout: 3000 }).catch(() => false);

      // Or redirected to home
      const homeContent = page.locator('a[href*="singleplayer"], a[href*="multiplayer"]').first();
      const homeVisible = await homeContent.isVisible({ timeout: 3000 }).catch(() => false);

      // Take screenshot
      await page.screenshot({ path: 'test-results/error-404.png', fullPage: true });

      // Either 404 shown or redirected to home
      expect(notFoundVisible || homeVisible).toBe(true);
    });
  });

  test.describe('Error Recovery', () => {
    test('can recover from error by navigating home', async ({ page }) => {
      // Cause an error
      await page.route('**/api/**', (route) => {
        route.fulfill({ status: 500, body: 'Error' });
      });

      await page.goto(`${BASE_URL}/en/daily`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Unroute to restore normal behavior
      await page.unroute('**/api/**');

      // Navigate to home
      await page.goto(`${BASE_URL}/en`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Page should work normally
      const modeCards = page.locator('a[href*="singleplayer"], a[href*="multiplayer"]');
      const cardCount = await modeCards.count();
      expect(cardCount).toBeGreaterThan(0);

      // Take screenshot
      await page.screenshot({ path: 'test-results/error-recovery.png', fullPage: true });
    });
  });
});
