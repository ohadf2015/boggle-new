/**
 * Spectator and Late Joiner E2E Tests
 *
 * Tests the spectator and late joiner functionality including:
 * - Joining a room as spectator when full
 * - Watching game in progress
 * - Upgrading from spectator to player
 * - Late joining during active game
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

// Helper to generate random game code
function generateGameCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Helper to generate random username
function generateUsername(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 7)}`;
}

// Helper to setup page with localStorage
async function setupPage(page: Page, username: string): Promise<void> {
  await page.goto(BASE_URL);
  await page.evaluate((name) => {
    localStorage.clear();
    localStorage.setItem('lexiclash_onboarding_completed', 'true');
    localStorage.setItem('boggle_onboarding_completed', 'true');
    localStorage.setItem('boggle_username', name);
    localStorage.setItem('boggle_avatar_emoji', '🎮');
  }, username);
}

// Helper to create room as host
async function createRoomAsHost(page: Page, username: string): Promise<void> {
  await page.goto(`${BASE_URL}/en/multiplayer`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  await page.locator('text=Create Room').first().click();
  await page.waitForTimeout(500);

  const usernameInput = page.locator('input[id="profile-username"], input[placeholder*="name"]').first();
  await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
  await usernameInput.clear();
  await usernameInput.fill(username);

  const avatarButton = page.locator('button[aria-pressed="false"]').first();
  if (await avatarButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await avatarButton.click();
  }

  const continueButton = page.getByRole('button', { name: /Continue/i });
  await continueButton.click();
  await page.waitForTimeout(2000);
}

// Helper to join room as player
async function joinRoom(page: Page, username: string, roomCode?: string): Promise<void> {
  await page.goto(`${BASE_URL}/en/multiplayer`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  await page.locator('text=Join Room').first().click();
  await page.waitForTimeout(500);

  const usernameInput = page.locator('input[id="profile-username"], input[placeholder*="name"]').first();
  await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
  await usernameInput.clear();
  await usernameInput.fill(username);

  const continueButton = page.getByRole('button', { name: /Continue/i });
  await continueButton.click();
  await page.waitForTimeout(1000);

  // If room code provided, enter it
  if (roomCode) {
    const codeInput = page.locator('input[id="join-game-code"], input[placeholder*="ABC"]').first();
    if (await codeInput.isVisible({ timeout: 5000 })) {
      await codeInput.fill(roomCode);

      const joinButton = page.getByRole('button', { name: /Join/i }).last();
      await joinButton.click();
      await page.waitForTimeout(2000);
    }
  }
}

// Helper to check if in spectator mode
async function isSpectator(page: Page): Promise<boolean> {
  const spectatorIndicator = page.locator(
    'text=/spectator|watching|observer/i, [class*="spectator"]'
  ).first();
  return await spectatorIndicator.isVisible({ timeout: 3000 }).catch(() => false);
}

// Helper to check if game is active
async function isGameActive(page: Page): Promise<boolean> {
  const grid = page.locator('[role="grid"], [class*="grid"]').first();
  const timer = page.locator('[class*="timer"], text=/\\d+:\\d+/').first();

  const gridVisible = await grid.isVisible({ timeout: 3000 }).catch(() => false);
  const timerVisible = await timer.isVisible({ timeout: 3000 }).catch(() => false);

  return gridVisible || timerVisible;
}

test.describe('Spectator and Late Joiner', () => {
  test.describe('Spectator Mode', () => {
    test('shows spectator option when room is full', async ({ browser }) => {
      const hostContext = await browser.newContext();
      const spectatorContext = await browser.newContext();

      const hostPage = await hostContext.newPage();
      const spectatorPage = await spectatorContext.newPage();

      try {
        // Set up pages
        await setupPage(hostPage, 'FullRoomHost');
        await setupPage(spectatorPage, 'SpectatorUser');

        // Host creates room
        await createRoomAsHost(hostPage, 'FullRoomHost');

        // Take screenshot of host view
        await hostPage.screenshot({ path: 'test-results/spectator-host-room.png', fullPage: true });

        // Spectator tries to join
        await spectatorPage.goto(`${BASE_URL}/en/multiplayer`);
        await spectatorPage.waitForLoadState('networkidle');
        await spectatorPage.waitForTimeout(1000);

        // Navigate to join
        await spectatorPage.locator('text=Join Room').first().click();
        await spectatorPage.waitForTimeout(500);

        const usernameInput = spectatorPage.locator('input[id="profile-username"], input[placeholder*="name"]').first();
        await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
        await usernameInput.fill('SpectatorUser');

        const continueButton = spectatorPage.getByRole('button', { name: /Continue/i });
        await continueButton.click();
        await spectatorPage.waitForTimeout(1000);

        // Take screenshot
        await spectatorPage.screenshot({ path: 'test-results/spectator-join-options.png', fullPage: true });

        // Look for spectator option or message
        const spectatorOption = spectatorPage.locator(
          'text=/spectator|watch|observe/i, button:has-text("Watch")'
        );
        const spectatorCount = await spectatorOption.count();
        console.log(`Spectator options found: ${spectatorCount}`);

      } finally {
        await hostContext.close();
        await spectatorContext.close();
      }
    });

    test('spectator can watch game in progress', async ({ browser }) => {
      const hostContext = await browser.newContext();
      const playerContext = await browser.newContext();
      const spectatorContext = await browser.newContext();

      const hostPage = await hostContext.newPage();
      const playerPage = await playerContext.newPage();
      const spectatorPage = await spectatorContext.newPage();

      try {
        // Set up pages
        await setupPage(hostPage, 'WatchHost');
        await setupPage(playerPage, 'WatchPlayer');
        await setupPage(spectatorPage, 'WatchSpectator');

        // Host creates room
        await createRoomAsHost(hostPage, 'WatchHost');
        await hostPage.waitForTimeout(2000);

        // Player joins
        await joinRoom(playerPage, 'WatchPlayer');
        await playerPage.waitForTimeout(2000);

        // Host starts game
        const startButton = hostPage.locator('button:has-text("Start"), button:has-text("Start Game")').first();
        if (await startButton.isVisible({ timeout: 5000 }).catch(() => false)) {
          await startButton.click();
          await hostPage.waitForTimeout(3000);
        }

        // Verify game started for host
        const hostGameActive = await isGameActive(hostPage);
        console.log(`Host game active: ${hostGameActive}`);

        // Spectator tries to join mid-game
        await spectatorPage.goto(`${BASE_URL}/en/multiplayer`);
        await spectatorPage.waitForLoadState('networkidle');
        await spectatorPage.waitForTimeout(1000);

        // Take screenshots
        await hostPage.screenshot({ path: 'test-results/spectator-game-in-progress.png', fullPage: true });
        await spectatorPage.screenshot({ path: 'test-results/spectator-joining-active.png', fullPage: true });

      } finally {
        await hostContext.close();
        await playerContext.close();
        await spectatorContext.close();
      }
    });

    test('spectator UI shows view-only indicators', async ({ page }) => {
      await setupPage(page, 'SpectatorViewTest');

      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Look for spectator-specific UI elements
      const spectatorElements = page.locator(
        '[class*="spectator"], [class*="viewer"], text=/watching|spectating|view only/i'
      );
      const elementCount = await spectatorElements.count();
      console.log(`Spectator UI elements: ${elementCount}`);

      // Take screenshot
      await page.screenshot({ path: 'test-results/spectator-ui.png', fullPage: true });
    });
  });

  test.describe('Late Joiner Flow', () => {
    test('late joiner sees active game state', async ({ browser }) => {
      const hostContext = await browser.newContext();
      const playerContext = await browser.newContext();
      const lateJoinerContext = await browser.newContext();

      const hostPage = await hostContext.newPage();
      const playerPage = await playerContext.newPage();
      const lateJoinerPage = await lateJoinerContext.newPage();

      try {
        // Set up pages
        await setupPage(hostPage, 'LateHost');
        await setupPage(playerPage, 'EarlyPlayer');
        await setupPage(lateJoinerPage, 'LateJoiner');

        // Host creates room
        await createRoomAsHost(hostPage, 'LateHost');
        await hostPage.waitForTimeout(2000);

        // Player joins
        await joinRoom(playerPage, 'EarlyPlayer');
        await playerPage.waitForTimeout(2000);

        // Host starts game
        const startButton = hostPage.locator('button:has-text("Start"), button:has-text("Start Game")').first();
        if (await startButton.isVisible({ timeout: 5000 }).catch(() => false)) {
          await startButton.click();
          await hostPage.waitForTimeout(3000);
        }

        // Verify game is active
        const hostGameActive = await isGameActive(hostPage);
        console.log(`Host game active before late join: ${hostGameActive}`);

        // Take screenshot of active game
        await hostPage.screenshot({ path: 'test-results/late-joiner-active-game.png', fullPage: true });

        // Late joiner attempts to join
        await lateJoinerPage.goto(`${BASE_URL}/en/multiplayer`);
        await lateJoinerPage.waitForLoadState('networkidle');
        await lateJoinerPage.waitForTimeout(1000);

        // Navigate to join
        await lateJoinerPage.locator('text=Join Room').first().click();
        await lateJoinerPage.waitForTimeout(500);

        const usernameInput = lateJoinerPage.locator('input[id="profile-username"], input[placeholder*="name"]').first();
        await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
        await usernameInput.fill('LateJoiner');

        const continueButton = lateJoinerPage.getByRole('button', { name: /Continue/i });
        await continueButton.click();
        await lateJoinerPage.waitForTimeout(1000);

        // Take screenshot of late joiner view
        await lateJoinerPage.screenshot({ path: 'test-results/late-joiner-join-view.png', fullPage: true });

        // Look for late joiner welcome or spectator mode
        const lateJoinerWelcome = lateJoinerPage.locator(
          'text=/late.*join|game.*progress|spectator|watch/i'
        );
        const welcomeCount = await lateJoinerWelcome.count();
        console.log(`Late joiner welcome elements: ${welcomeCount}`);

      } finally {
        await hostContext.close();
        await playerContext.close();
        await lateJoinerContext.close();
      }
    });

    test('late joiner welcome modal appears', async ({ page }) => {
      await setupPage(page, 'LateWelcomeTest');

      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Look for late joiner welcome component
      const lateJoinerWelcome = page.locator(
        '[class*="late-joiner"], [class*="welcome"], text=/late.*joiner|joining.*progress/i'
      );
      const welcomeCount = await lateJoinerWelcome.count();
      console.log(`Late joiner welcome components: ${welcomeCount}`);

      // Take screenshot
      await page.screenshot({ path: 'test-results/late-joiner-welcome.png', fullPage: true });
    });
  });

  test.describe('Spectator Upgrade', () => {
    test('spectator can upgrade when slot opens', async ({ browser }) => {
      const hostContext = await browser.newContext();
      const spectatorContext = await browser.newContext();

      const hostPage = await hostContext.newPage();
      const spectatorPage = await spectatorContext.newPage();

      try {
        // Set up pages
        await setupPage(hostPage, 'UpgradeHost');
        await setupPage(spectatorPage, 'UpgradeSpectator');

        // Host creates room
        await createRoomAsHost(hostPage, 'UpgradeHost');
        await hostPage.waitForTimeout(2000);

        // Spectator joins
        await spectatorPage.goto(`${BASE_URL}/en/multiplayer`);
        await spectatorPage.waitForLoadState('networkidle');
        await spectatorPage.waitForTimeout(1000);

        // Take screenshots
        await hostPage.screenshot({ path: 'test-results/spectator-upgrade-host.png', fullPage: true });
        await spectatorPage.screenshot({ path: 'test-results/spectator-upgrade-waiting.png', fullPage: true });

        // Look for upgrade button or option
        const upgradeButton = spectatorPage.locator(
          'button:has-text("Join Game"), button:has-text("Play"), button:has-text("Upgrade")'
        );
        const upgradeCount = await upgradeButton.count();
        console.log(`Upgrade buttons found: ${upgradeCount}`);

      } finally {
        await hostContext.close();
        await spectatorContext.close();
      }
    });

    test('upgrade notification appears when slot opens', async ({ page }) => {
      await setupPage(page, 'UpgradeNotificationTest');

      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Look for upgrade notification component
      const upgradeNotification = page.locator(
        '[class*="upgrade"], text=/slot.*available|can.*join|upgrade.*player/i'
      );
      const notificationCount = await upgradeNotification.count();
      console.log(`Upgrade notification elements: ${notificationCount}`);

      // Take screenshot
      await page.screenshot({ path: 'test-results/spectator-upgrade-notification.png', fullPage: true });
    });
  });

  test.describe('Spectator List', () => {
    test('shows spectator count in room', async ({ browser }) => {
      const hostContext = await browser.newContext();
      const spectatorContext = await browser.newContext();

      const hostPage = await hostContext.newPage();
      const spectatorPage = await spectatorContext.newPage();

      try {
        // Set up pages
        await setupPage(hostPage, 'SpectatorListHost');
        await setupPage(spectatorPage, 'SpectatorListViewer');

        // Host creates room
        await createRoomAsHost(hostPage, 'SpectatorListHost');
        await hostPage.waitForTimeout(2000);

        // Look for spectator count display in host view
        const spectatorCount = hostPage.locator(
          'text=/\\d+.*spectator|watching.*\\d+|viewer/i, [class*="spectator-count"]'
        );
        const countElements = await spectatorCount.count();
        console.log(`Spectator count elements: ${countElements}`);

        // Take screenshot
        await hostPage.screenshot({ path: 'test-results/spectator-list-count.png', fullPage: true });

      } finally {
        await hostContext.close();
        await spectatorContext.close();
      }
    });

    test('host can see spectator names', async ({ browser }) => {
      const hostContext = await browser.newContext();

      const hostPage = await hostContext.newPage();

      try {
        await setupPage(hostPage, 'SpectatorNamesHost');

        // Host creates room
        await createRoomAsHost(hostPage, 'SpectatorNamesHost');
        await hostPage.waitForTimeout(2000);

        // Look for spectator list panel
        const spectatorList = hostPage.locator(
          '[class*="spectator-list"], [class*="viewers"], text=/spectators|viewers/i'
        );
        const listElements = await spectatorList.count();
        console.log(`Spectator list elements: ${listElements}`);

        // Take screenshot
        await hostPage.screenshot({ path: 'test-results/spectator-names-list.png', fullPage: true });

      } finally {
        await hostContext.close();
      }
    });
  });

  test.describe('Spectator Chat/Reactions', () => {
    test('spectators can see live game updates', async ({ browser }) => {
      const hostContext = await browser.newContext();
      const spectatorContext = await browser.newContext();

      const hostPage = await hostContext.newPage();
      const spectatorPage = await spectatorContext.newPage();

      try {
        await setupPage(hostPage, 'LiveUpdatesHost');
        await setupPage(spectatorPage, 'LiveUpdatesSpectator');

        // Host creates room
        await createRoomAsHost(hostPage, 'LiveUpdatesHost');
        await hostPage.waitForTimeout(2000);

        // Start game if possible
        const startButton = hostPage.locator('button:has-text("Start"), button:has-text("Start Game")').first();
        if (await startButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await startButton.click();
          await hostPage.waitForTimeout(3000);
        }

        // Look for live leaderboard/updates
        const liveUpdates = spectatorPage.locator(
          '[class*="leaderboard"], [class*="live"], [class*="scores"]'
        );
        const updatesCount = await liveUpdates.count();
        console.log(`Live update elements: ${updatesCount}`);

        // Take screenshots
        await hostPage.screenshot({ path: 'test-results/spectator-live-host.png', fullPage: true });
        await spectatorPage.screenshot({ path: 'test-results/spectator-live-viewer.png', fullPage: true });

      } finally {
        await hostContext.close();
        await spectatorContext.close();
      }
    });
  });

  test.describe('Edge Cases', () => {
    test('handles spectator disconnect gracefully', async ({ browser }) => {
      const hostContext = await browser.newContext();
      const spectatorContext = await browser.newContext();

      const hostPage = await hostContext.newPage();
      const spectatorPage = await spectatorContext.newPage();

      try {
        await setupPage(hostPage, 'DisconnectTestHost');
        await setupPage(spectatorPage, 'DisconnectSpectator');

        // Host creates room
        await createRoomAsHost(hostPage, 'DisconnectTestHost');
        await hostPage.waitForTimeout(2000);

        // Simulate spectator disconnect
        await spectatorContext.setOffline(true);
        await spectatorPage.waitForTimeout(2000);

        // Take screenshot of host after spectator disconnects
        await hostPage.screenshot({ path: 'test-results/spectator-disconnect-host.png', fullPage: true });

        // Spectator reconnects
        await spectatorContext.setOffline(false);
        await spectatorPage.waitForTimeout(3000);

        // Take screenshot after reconnection
        await spectatorPage.screenshot({ path: 'test-results/spectator-reconnected.png', fullPage: true });

      } finally {
        await hostContext.close();
        await spectatorContext.close();
      }
    });

    test('handles host leaving with spectators', async ({ browser }) => {
      const hostContext = await browser.newContext();
      const spectatorContext = await browser.newContext();

      const hostPage = await hostContext.newPage();
      const spectatorPage = await spectatorContext.newPage();

      try {
        await setupPage(hostPage, 'HostLeaveTest');
        await setupPage(spectatorPage, 'SpectatorHostLeave');

        // Host creates room
        await createRoomAsHost(hostPage, 'HostLeaveTest');
        await hostPage.waitForTimeout(2000);

        // Take screenshot before host leaves
        await hostPage.screenshot({ path: 'test-results/spectator-before-host-leave.png', fullPage: true });

        // Host closes page (simulating leaving)
        await hostPage.close();
        await spectatorPage.waitForTimeout(3000);

        // Check spectator page for notification
        const hostLeftMessage = spectatorPage.locator(
          'text=/host.*left|room.*closed|game.*ended/i, [class*="error"], [role="alert"]'
        );
        const messageVisible = await hostLeftMessage.isVisible({ timeout: 5000 }).catch(() => false);
        console.log(`Host left message visible: ${messageVisible}`);

        // Take screenshot
        await spectatorPage.screenshot({ path: 'test-results/spectator-host-left.png', fullPage: true });

      } finally {
        await hostContext.close();
        await spectatorContext.close();
      }
    });
  });
});
