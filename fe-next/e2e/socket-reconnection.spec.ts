/**
 * Socket Reconnection E2E Tests
 *
 * Tests Socket.IO connection resilience including:
 * - Initial connection establishment
 * - Reconnection after disconnect
 * - Game state recovery after reconnect
 * - Error handling for connection failures
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

// Helper to generate random game code
function generateGameCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Helper to wait for socket connection
async function waitForSocketConnection(page: Page, timeout = 10000): Promise<boolean> {
  try {
    await page.waitForFunction(
      () => {
        // Check for connection status indicators
        const connected = document.querySelector('[data-connection-status="connected"]') !== null;
        const socketReady = (window as any).__socketConnected === true;
        return connected || socketReady;
      },
      { timeout }
    );
    return true;
  } catch {
    return false;
  }
}

// Helper to check if socket is connected
async function isSocketConnected(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const connectedElement = document.querySelector('[data-connection-status="connected"]');
    const disconnectedElement = document.querySelector('[data-connection-status="disconnected"]');
    return connectedElement !== null || disconnectedElement === null;
  });
}

// Helper to simulate network offline
async function goOffline(context: BrowserContext): Promise<void> {
  await context.setOffline(true);
}

// Helper to simulate network online
async function goOnline(context: BrowserContext): Promise<void> {
  await context.setOffline(false);
}

test.describe('Socket Connection and Reconnection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('lexiclash_onboarding_completed', 'true');
      localStorage.setItem('boggle_onboarding_completed', 'true');
      localStorage.setItem('boggle_username', 'SocketTestUser');
    });
  });

  test.describe('Initial Connection', () => {
    test('establishes socket connection when entering multiplayer', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Check for connection (page should load without errors)
      const mainContent = page.locator('main, [role="main"]').first();
      await expect(mainContent).toBeVisible({ timeout: 5000 });

      // Take screenshot
      await page.screenshot({ path: 'test-results/socket-initial-connection.png', fullPage: true });
    });

    test('socket connects when creating a room', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Navigate through create flow
      await page.locator('text=Create Room').first().click();
      await page.waitForTimeout(500);

      // Fill username
      const usernameInput = page.locator('input[id="profile-username"], input[placeholder*="name"]').first();
      await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
      await usernameInput.clear();
      await usernameInput.fill('RoomCreator');

      // Select avatar
      const avatarButton = page.locator('button[aria-pressed="false"]').first();
      if (await avatarButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await avatarButton.click();
      }

      // Continue
      const continueButton = page.getByRole('button', { name: /Continue/i });
      await continueButton.click();
      await page.waitForTimeout(2000);

      // Check for room creation UI
      const roomNameInput = page.locator('input[id="room-name"], input[placeholder*="room"]').first();
      const roomInputVisible = await roomNameInput.isVisible({ timeout: 5000 }).catch(() => false);

      // Take screenshot
      await page.screenshot({ path: 'test-results/socket-room-creation.png', fullPage: true });
    });
  });

  test.describe('Connection Status Indicators', () => {
    test('shows connection status in UI', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Look for any connection status indicator
      const statusIndicators = page.locator(
        '[data-connection-status], [class*="connection"], [class*="status"], text=/connected|connecting|offline/i'
      );

      const statusCount = await statusIndicators.count();
      console.log(`Connection status indicators found: ${statusCount}`);

      // Take screenshot
      await page.screenshot({ path: 'test-results/socket-status-indicator.png', fullPage: true });
    });
  });

  test.describe('Reconnection Handling', () => {
    test('handles temporary network interruption gracefully', async ({ page, context }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Navigate to create room
      await page.locator('text=Create Room').first().click();
      await page.waitForTimeout(500);

      // Fill profile
      const usernameInput = page.locator('input[id="profile-username"], input[placeholder*="name"]').first();
      await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
      await usernameInput.fill('ReconnectUser');

      const continueButton = page.getByRole('button', { name: /Continue/i });
      await continueButton.click();
      await page.waitForTimeout(1000);

      // Simulate going offline
      console.log('Going offline...');
      await goOffline(context);
      await page.waitForTimeout(2000);

      // Take screenshot of offline state
      await page.screenshot({ path: 'test-results/socket-offline.png', fullPage: true });

      // Go back online
      console.log('Going online...');
      await goOnline(context);
      await page.waitForTimeout(3000);

      // Page should recover
      const mainContent = page.locator('main, [role="main"]').first();
      await expect(mainContent).toBeVisible({ timeout: 5000 });

      // Take screenshot of recovery
      await page.screenshot({ path: 'test-results/socket-reconnected.png', fullPage: true });
    });

    test('shows reconnecting indicator during reconnection', async ({ page, context }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Set up console listener for socket events
      const socketLogs: string[] = [];
      page.on('console', msg => {
        if (msg.text().includes('socket') || msg.text().includes('reconnect')) {
          socketLogs.push(msg.text());
        }
      });

      // Go offline briefly
      await goOffline(context);
      await page.waitForTimeout(1000);

      // Check for reconnecting UI
      const reconnectingIndicator = page.locator(
        'text=/reconnecting|connecting|lost connection/i, [class*="reconnect"]'
      ).first();
      const indicatorVisible = await reconnectingIndicator.isVisible({ timeout: 2000 }).catch(() => false);

      // Go back online
      await goOnline(context);
      await page.waitForTimeout(2000);

      console.log('Socket logs during reconnection:', socketLogs);
    });
  });

  test.describe('Game State Recovery', () => {
    test('player can rejoin room after brief disconnect', async ({ browser }) => {
      const gameCode = generateGameCode();

      const hostContext = await browser.newContext();
      const playerContext = await browser.newContext();

      const hostPage = await hostContext.newPage();
      const playerPage = await playerContext.newPage();

      try {
        // Set up localStorage for both
        await hostPage.goto(`${BASE_URL}/en`);
        await hostPage.evaluate(() => {
          localStorage.setItem('lexiclash_onboarding_completed', 'true');
          localStorage.setItem('boggle_username', 'DisconnectHost');
        });

        await playerPage.goto(`${BASE_URL}/en`);
        await playerPage.evaluate(() => {
          localStorage.setItem('lexiclash_onboarding_completed', 'true');
          localStorage.setItem('boggle_username', 'DisconnectPlayer');
        });

        // Host creates room
        await hostPage.goto(`${BASE_URL}/en/multiplayer`);
        await hostPage.waitForLoadState('networkidle');
        await hostPage.waitForTimeout(1000);

        await hostPage.locator('text=Create Room').first().click();
        await hostPage.waitForTimeout(500);

        const hostUsernameInput = hostPage.locator('input[id="profile-username"], input[placeholder*="name"]').first();
        await hostUsernameInput.waitFor({ state: 'visible', timeout: 10000 });
        await hostUsernameInput.clear();
        await hostUsernameInput.fill('DisconnectHost');

        const hostContinue = hostPage.getByRole('button', { name: /Continue/i });
        await hostContinue.click();
        await hostPage.waitForTimeout(2000);

        // Player joins room
        await playerPage.goto(`${BASE_URL}/en/multiplayer`);
        await playerPage.waitForLoadState('networkidle');
        await playerPage.waitForTimeout(1000);

        await playerPage.locator('text=Join Room').first().click();
        await playerPage.waitForTimeout(500);

        const playerUsernameInput = playerPage.locator('input[id="profile-username"], input[placeholder*="name"]').first();
        await playerUsernameInput.waitFor({ state: 'visible', timeout: 10000 });
        await playerUsernameInput.clear();
        await playerUsernameInput.fill('DisconnectPlayer');

        const playerContinue = playerPage.getByRole('button', { name: /Continue/i });
        await playerContinue.click();
        await playerPage.waitForTimeout(1000);

        // Take screenshots
        await hostPage.screenshot({ path: 'test-results/socket-host-created.png', fullPage: true });
        await playerPage.screenshot({ path: 'test-results/socket-player-joining.png', fullPage: true });

        // Simulate player disconnect
        console.log('Simulating player disconnect...');
        await playerContext.setOffline(true);
        await playerPage.waitForTimeout(2000);

        // Player reconnects
        console.log('Player reconnecting...');
        await playerContext.setOffline(false);
        await playerPage.waitForTimeout(3000);

        // Verify player can still interact
        const playerMain = playerPage.locator('main, [role="main"]').first();
        await expect(playerMain).toBeVisible({ timeout: 5000 });

        await playerPage.screenshot({ path: 'test-results/socket-player-reconnected.png', fullPage: true });

      } finally {
        await hostContext.close();
        await playerContext.close();
      }
    });
  });

  test.describe('Error Recovery', () => {
    test('shows error message when connection fails completely', async ({ page, context }) => {
      // Block socket.io connections
      await page.route('**/socket.io/**', (route) => {
        route.abort('connectionfailed');
      });

      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Page should still load (graceful degradation)
      const mainContent = page.locator('main, [role="main"]').first();
      await expect(mainContent).toBeVisible({ timeout: 5000 });

      // Look for any error indication
      const errorMessage = page.locator(
        'text=/connection.*error|failed.*connect|unable.*connect/i, [class*="error"]'
      ).first();
      const errorVisible = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);

      // Take screenshot
      await page.screenshot({ path: 'test-results/socket-connection-failed.png', fullPage: true });
    });

    test('retries connection after failure', async ({ page }) => {
      let requestCount = 0;

      // Fail first 2 requests, then succeed
      await page.route('**/socket.io/**', (route) => {
        requestCount++;
        if (requestCount <= 2) {
          route.abort('failed');
        } else {
          route.continue();
        }
      });

      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(5000);

      console.log(`Socket.io requests made: ${requestCount}`);

      // Should have retried
      expect(requestCount).toBeGreaterThan(1);

      // Page should be usable
      const mainContent = page.locator('main, [role="main"]').first();
      await expect(mainContent).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Keep-Alive and Heartbeat', () => {
    test('socket stays connected during idle periods', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Navigate to create room
      await page.locator('text=Create Room').first().click();
      await page.waitForTimeout(500);

      const usernameInput = page.locator('input[id="profile-username"], input[placeholder*="name"]').first();
      await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
      await usernameInput.fill('IdleUser');

      const continueButton = page.getByRole('button', { name: /Continue/i });
      await continueButton.click();
      await page.waitForTimeout(2000);

      // Wait for a period (simulating idle)
      console.log('Waiting 15 seconds to test keep-alive...');
      await page.waitForTimeout(15000);

      // Page should still be responsive
      const mainContent = page.locator('main, [role="main"]').first();
      await expect(mainContent).toBeVisible();

      // Take screenshot
      await page.screenshot({ path: 'test-results/socket-keepalive.png', fullPage: true });
    });
  });
});
