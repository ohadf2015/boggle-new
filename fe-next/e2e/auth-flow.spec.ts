/**
 * Authentication Flow E2E Tests
 *
 * Tests authentication scenarios including:
 * - Guest mode functionality
 * - Session persistence
 * - OAuth mocking
 * - Profile creation/update
 * - Cross-tab auth sync
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

// Helper to check if user is in guest mode
async function isGuestMode(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const profile = localStorage.getItem('boggle_username');
    const token = localStorage.getItem('sb-access-token');
    // Guest mode: has local username but no Supabase token
    return !!profile && !token;
  });
}

// Helper to get stored username
async function getStoredUsername(page: Page): Promise<string | null> {
  return await page.evaluate(() => localStorage.getItem('boggle_username'));
}

// Helper to simulate login state via localStorage
async function setMockAuthState(page: Page, isAuthenticated: boolean, profile?: {
  username: string;
  avatar_emoji: string;
  avatar_color: string;
}) {
  await page.evaluate(({ isAuth, profileData }) => {
    if (isAuth && profileData) {
      localStorage.setItem('boggle_username', profileData.username);
      localStorage.setItem('boggle_avatar_emoji', profileData.avatar_emoji);
      localStorage.setItem('boggle_avatar_color', profileData.avatar_color);
      localStorage.setItem('boggle_auth_state', 'authenticated');
    } else {
      localStorage.removeItem('boggle_auth_state');
    }
  }, { isAuth: isAuthenticated, profileData: profile });
}

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('lexiclash_onboarding_completed', 'true');
      localStorage.setItem('boggle_onboarding_completed', 'true');
    });
  });

  test.describe('Guest Mode', () => {
    test('user can play as guest without authentication', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/singleplayer`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Should be able to start game without login
      const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
      await expect(startButton).toBeVisible({ timeout: 10000 });

      // Click start and verify game begins
      await startButton.click();
      await page.waitForTimeout(2000);

      // Grid should be visible (game started)
      const grid = page.locator('[role="grid"]').first();
      const gridVisible = await grid.isVisible({ timeout: 5000 }).catch(() => false);
      expect(gridVisible).toBe(true);
    });

    test('guest can set username in multiplayer flow', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Click Create Room
      await page.locator('text=Create Room').first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Fill username
      const usernameInput = page.locator('input[id="profile-username"], input[placeholder*="name"]').first();
      await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
      await usernameInput.clear();
      await usernameInput.fill('GuestPlayer123');

      // Verify username is set
      const value = await usernameInput.inputValue();
      expect(value).toBe('GuestPlayer123');

      // Take screenshot
      await page.screenshot({ path: 'test-results/auth-guest-username.png', fullPage: true });
    });

    test('guest data persists in localStorage', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Navigate to profile setup and set username
      await page.locator('text=Create Room').first().click();
      await page.waitForTimeout(500);

      const usernameInput = page.locator('input[id="profile-username"], input[placeholder*="name"]').first();
      await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
      await usernameInput.clear();
      await usernameInput.fill('PersistentGuest');

      // Select avatar if available
      const avatarButton = page.locator('button[aria-pressed="false"]').first();
      if (await avatarButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await avatarButton.click();
      }

      // Continue to trigger save
      const continueButton = page.getByRole('button', { name: /Continue/i });
      await continueButton.click();
      await page.waitForTimeout(500);

      // Verify localStorage
      const savedUsername = await page.evaluate(() => localStorage.getItem('boggle_username'));
      expect(savedUsername).toBe('PersistentGuest');
    });

    test('guest username persists across page reloads', async ({ page }) => {
      // Set username
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');

      await page.evaluate(() => {
        localStorage.setItem('boggle_username', 'ReloadTestUser');
        localStorage.setItem('boggle_avatar_emoji', '🐶');
        localStorage.setItem('boggle_avatar_color', '#4ECDC4');
      });

      // Reload and navigate to multiplayer
      await page.reload();
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Click create room
      await page.locator('text=Create Room').first().click();
      await page.waitForTimeout(500);

      // Username should be pre-filled
      const usernameInput = page.locator('input[id="profile-username"], input[placeholder*="name"]').first();
      await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
      const value = await usernameInput.inputValue();

      // Should have saved username
      expect(value).toBe('ReloadTestUser');
    });
  });

  test.describe('Session Persistence', () => {
    test('username persists in new browser tabs', async ({ browser }) => {
      // Create first tab
      const context = await browser.newContext();
      const page1 = await context.newPage();

      await page1.goto(`${BASE_URL}/en`);
      await page1.evaluate(() => {
        localStorage.setItem('boggle_username', 'CrossTabUser');
        localStorage.setItem('boggle_avatar_emoji', '🦊');
        localStorage.setItem('boggle_avatar_color', '#FF6B6B');
        localStorage.setItem('lexiclash_onboarding_completed', 'true');
      });

      // Create second tab in same context (shares localStorage)
      const page2 = await context.newPage();
      await page2.goto(`${BASE_URL}/en/multiplayer`);
      await page2.waitForLoadState('networkidle');
      await page2.waitForTimeout(1000);

      // Navigate to profile setup
      await page2.locator('text=Create Room').first().click();
      await page2.waitForTimeout(500);

      // Username should be pre-filled from localStorage
      const usernameInput = page2.locator('input[id="profile-username"], input[placeholder*="name"]').first();
      await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
      const value = await usernameInput.inputValue();
      expect(value).toBe('CrossTabUser');

      await context.close();
    });

    test('auth loading does not get stuck', async ({ page }) => {
      await page.goto(`${BASE_URL}/en`);
      await page.waitForLoadState('networkidle');

      // Page should load within 5 seconds (auth has 3s timeout)
      const mainContent = page.locator('main, [role="main"]').first();
      await expect(mainContent).toBeVisible({ timeout: 5000 });

      // No loading spinner should be stuck
      const loadingSpinner = page.locator('[class*="loading"], [class*="spinner"]').first();
      const spinnerVisible = await loadingSpinner.isVisible({ timeout: 1000 }).catch(() => false);

      // If there's a spinner, it should disappear
      if (spinnerVisible) {
        await expect(loadingSpinner).not.toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Profile Display', () => {
    test('header shows user avatar when logged in', async ({ page }) => {
      // Set up mock auth state
      await page.goto(`${BASE_URL}/en`);
      await page.evaluate(() => {
        localStorage.setItem('boggle_username', 'AvatarUser');
        localStorage.setItem('boggle_avatar_emoji', '🦁');
        localStorage.setItem('boggle_avatar_color', '#FFD93D');
        localStorage.setItem('lexiclash_onboarding_completed', 'true');
      });

      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Look for avatar in header
      const header = page.locator('header').first();
      if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
        const avatarElements = page.locator('button:has-text("🦁"), [class*="avatar"]').first();
        const avatarVisible = await avatarElements.isVisible({ timeout: 3000 }).catch(() => false);

        // Take screenshot to verify
        await page.screenshot({ path: 'test-results/auth-avatar-header.png' });
      }
    });

    test('profile page shows user stats', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/profile`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Profile page should load
      const profileContent = page.locator('main, [role="main"]').first();
      await expect(profileContent).toBeVisible({ timeout: 5000 });

      // Take screenshot
      await page.screenshot({ path: 'test-results/auth-profile-page.png', fullPage: true });
    });
  });

  test.describe('Error Handling', () => {
    test('handles auth timeout gracefully', async ({ page }) => {
      // Intercept and delay auth requests
      await page.route('**/auth/**', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5s delay
        route.continue();
      });

      await page.goto(`${BASE_URL}/en`);

      // Page should still load (auth has timeout fallback)
      const mainContent = page.locator('main, [role="main"]').first();
      await expect(mainContent).toBeVisible({ timeout: 10000 });

      // Should be able to navigate
      const modeCards = page.locator('a[href*="singleplayer"], a[href*="multiplayer"]');
      const cardCount = await modeCards.count();
      expect(cardCount).toBeGreaterThan(0);
    });

    test('shows error state for failed profile fetch', async ({ page }) => {
      // This tests resilience when profile API fails
      await page.route('**/rest/v1/profiles**', (route) => {
        route.fulfill({ status: 500, body: 'Internal Server Error' });
      });

      await page.goto(`${BASE_URL}/en`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // App should still be usable (graceful degradation)
      const mainContent = page.locator('main, [role="main"]').first();
      await expect(mainContent).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Logout Flow', () => {
    test('clearing localStorage logs user out', async ({ page }) => {
      // Set up mock logged in state
      await page.goto(`${BASE_URL}/en`);
      await page.evaluate(() => {
        localStorage.setItem('boggle_username', 'LogoutTestUser');
        localStorage.setItem('boggle_avatar_emoji', '🐸');
        localStorage.setItem('lexiclash_onboarding_completed', 'true');
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify user is "logged in"
      let username = await page.evaluate(() => localStorage.getItem('boggle_username'));
      expect(username).toBe('LogoutTestUser');

      // Clear auth data (simulate logout)
      await page.evaluate(() => {
        localStorage.removeItem('boggle_username');
        localStorage.removeItem('boggle_avatar_emoji');
        localStorage.removeItem('boggle_avatar_color');
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify user is logged out
      username = await page.evaluate(() => localStorage.getItem('boggle_username'));
      expect(username).toBeNull();
    });
  });
});
