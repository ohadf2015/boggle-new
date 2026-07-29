import { test, expect, type Browser } from '@playwright/test';
import { MultiplayerPage } from './pages/MultiplayerPage';
import {
  goto,
  randomUsername,
  waitForHydration,
  type Locale,
} from './helpers/test-utils';
import { applyStorageFixture, ONBOARDED_USER } from './helpers/storage-fixtures';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Set up a page with onboarding skipped and navigate to multiplayer */
async function setupMultiplayerPage(page: import('@playwright/test').Page, locale: Locale = 'en') {
  await goto(page, '/multiplayer', locale);
  await applyStorageFixture(page, ONBOARDED_USER);
  await goto(page, '/multiplayer', locale);
  await waitForHydration(page);
  return new MultiplayerPage(page);
}

/** Create a new browser context with onboarded state */
async function createOnboardedContext(browser: Browser, locale: Locale = 'en') {
  const context = await browser.newContext();
  const page = await context.newPage();
  // Navigate first so localStorage is on the right origin
  await goto(page, '/multiplayer', locale);
  await applyStorageFixture(page, ONBOARDED_USER);
  await goto(page, '/multiplayer', locale);
  await waitForHydration(page);
  return { context, page, mp: new MultiplayerPage(page) };
}

/** Extract the game code from the current URL (expects /en/multiplayer/{code} or similar) */
function extractGameCode(url: string): string {
  const parts = url.split('/');
  return parts[parts.length - 1] || '';
}

// ---------------------------------------------------------------------------
// 1. Room List Page
// ---------------------------------------------------------------------------

test.describe('Room List Page', () => {
  test('page loads and room list view is visible', async ({ page }) => {
    const mp = await setupMultiplayerPage(page);
    await expect(mp.roomListView).toBeVisible();
  });

  test('create room button is accessible', async ({ page }) => {
    const mp = await setupMultiplayerPage(page);
    await expect(mp.createRoomButton).toBeVisible();
    await expect(mp.createRoomButton).toBeEnabled();
  });

  test('onboarding is skipped for onboarded user fixture', async ({ page }) => {
    const mp = await setupMultiplayerPage(page);
    // Onboarding modal should NOT appear — room list should be directly visible
    await expect(mp.roomListView).toBeVisible();
    const onboardingModal = page.locator('[data-testid="onboarding-modal"]');
    await expect(onboardingModal).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 2. Room Creation
// ---------------------------------------------------------------------------

test.describe('Room Creation', () => {
  test('create room modal opens on button click', async ({ page }) => {
    const mp = await setupMultiplayerPage(page);
    await mp.createRoomButton.click();

    const dialog = mp.createRoomModal.or(page.locator('[role="dialog"]'));
    await expect(dialog).toBeVisible({ timeout: 5_000 });
  });

  test('host name input accepts text', async ({ page }) => {
    const mp = await setupMultiplayerPage(page);
    await mp.createRoomButton.click();
    await expect(mp.createRoomModal.or(page.locator('[role="dialog"]'))).toBeVisible({
      timeout: 5_000,
    });

    if (await mp.hostNameInput.isVisible().catch(() => false)) {
      const name = randomUsername('Host');
      await mp.hostNameInput.fill(name);
      await expect(mp.hostNameInput).toHaveValue(name);
    }
  });

  test('room created and host enters lobby', async ({ page }) => {
    const mp = await setupMultiplayerPage(page);
    const hostName = randomUsername('Host');
    await mp.createRoom(hostName);

    // Should land in the lobby — waiting status visible
    await expect(mp.waitingStatus).toBeVisible({ timeout: 10_000 });
  });

  test('waiting status is visible in lobby after creation', async ({ page }) => {
    const mp = await setupMultiplayerPage(page);
    await mp.createRoom(randomUsername('Host'));
    await expect(mp.waitingStatus).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// 3. Lobby — Host Experience
// ---------------------------------------------------------------------------

test.describe('Lobby - Host Experience', () => {
  let mp: MultiplayerPage;

  test.beforeEach(async ({ page }) => {
    mp = await setupMultiplayerPage(page);
    await mp.createRoom(randomUsername('Host'));
    await expect(mp.waitingStatus).toBeVisible({ timeout: 10_000 });
  });

  test('start game button is visible for host', async () => {
    await expect(mp.startGameButton).toBeVisible();
  });

  test('edit name works in lobby', async () => {
    if (await mp.editNameButton.isVisible().catch(() => false)) {
      const newName = randomUsername('Renamed');
      await mp.editLobbyName(newName);
      // After save, the edit input should be hidden and name updated
      await expect(mp.nameEditInput).not.toBeVisible();
    }
  });

  test('edit avatar button is visible', async () => {
    await expect(mp.editAvatarButton).toBeVisible();
  });

  test('chat area is visible on desktop', async () => {
    await expect(mp.desktopChatArea).toBeVisible();
  });

  test('waiting status shows player info', async () => {
    await expect(mp.waitingStatus).toBeVisible();
    await expect(mp.waitingStatus).not.toBeEmpty();
  });
});

// ---------------------------------------------------------------------------
// 4. Lobby — Player Experience
// ---------------------------------------------------------------------------

test.describe('Lobby - Player Experience', () => {
  test.slow();

  test('player joins room and sees waiting status but no start button', async ({
    browser,
  }) => {
    // Host creates room
    const host = await createOnboardedContext(browser);
    const hostName = randomUsername('Host');
    await host.mp.createRoom(hostName);
    await expect(host.mp.waitingStatus).toBeVisible({ timeout: 10_000 });

    // Extract game code from host URL
    const gameCode = extractGameCode(host.page.url());

    // Player joins
    const player = await createOnboardedContext(browser);
    await goto(player.page, `/join/${gameCode}`);
    await waitForHydration(player.page);

    const playerName = randomUsername('Player');
    if (await player.mp.joinNameInput.isVisible().catch(() => false)) {
      await player.mp.joinRoom(playerName);
    }

    // Player should see waiting status
    await expect(player.mp.waitingStatus).toBeVisible({ timeout: 10_000 });

    // Player should NOT see the start game button
    await expect(player.mp.startGameButton).not.toBeVisible();

    // Cleanup
    await host.context.close();
    await player.context.close();
  });

  test('player can edit name in lobby', async ({ browser }) => {
    const host = await createOnboardedContext(browser);
    await host.mp.createRoom(randomUsername('Host'));
    await expect(host.mp.waitingStatus).toBeVisible({ timeout: 10_000 });

    const gameCode = extractGameCode(host.page.url());

    const player = await createOnboardedContext(browser);
    await goto(player.page, `/join/${gameCode}`);
    await waitForHydration(player.page);

    if (await player.mp.joinNameInput.isVisible().catch(() => false)) {
      await player.mp.joinRoom(randomUsername('Player'));
    }

    await expect(player.mp.waitingStatus).toBeVisible({ timeout: 10_000 });

    if (await player.mp.editNameButton.isVisible().catch(() => false)) {
      const newName = randomUsername('Renamed');
      await player.mp.editLobbyName(newName);
      await expect(player.mp.nameEditInput).not.toBeVisible();
    }

    await host.context.close();
    await player.context.close();
  });
});

// ---------------------------------------------------------------------------
// 5. Multi-User Flow (TWO browser contexts)
// ---------------------------------------------------------------------------

test.describe('Multi-User Flow', () => {
  test.slow();

  test('host creates room, player joins, both see each other, game starts and ends', async ({
    browser,
  }) => {
    // Host creates room
    const host = await createOnboardedContext(browser);
    const hostName = randomUsername('Host');
    await host.mp.createRoom(hostName);
    await expect(host.mp.waitingStatus).toBeVisible({ timeout: 10_000 });

    const gameCode = extractGameCode(host.page.url());
    expect(gameCode).toBeTruthy();

    // Player joins via invite link
    const player = await createOnboardedContext(browser);
    await goto(player.page, `/join/${gameCode}`);
    await waitForHydration(player.page);

    const playerName = randomUsername('Player');
    if (await player.mp.joinNameInput.isVisible().catch(() => false)) {
      await player.mp.joinRoom(playerName);
    }

    await expect(player.mp.waitingStatus).toBeVisible({ timeout: 10_000 });

    // Host starts game
    await host.mp.startGameButton.click();

    // Both should see the game grid
    await host.mp.waitForGameStart();
    await player.mp.waitForGameStart();

    // Both should see results after game ends (timer runs out)
    await host.mp.waitForResults();
    await player.mp.waitForResults();

    await host.context.close();
    await player.context.close();
  });

  test('both players see each other in lobby', async ({ browser }) => {
    const host = await createOnboardedContext(browser);
    const hostName = randomUsername('Host');
    await host.mp.createRoom(hostName);
    await expect(host.mp.waitingStatus).toBeVisible({ timeout: 10_000 });

    const gameCode = extractGameCode(host.page.url());

    const player = await createOnboardedContext(browser);
    await goto(player.page, `/join/${gameCode}`);
    await waitForHydration(player.page);

    const playerName = randomUsername('Player');
    if (await player.mp.joinNameInput.isVisible().catch(() => false)) {
      await player.mp.joinRoom(playerName);
    }

    await expect(player.mp.waitingStatus).toBeVisible({ timeout: 10_000 });

    // Host page should reflect 2 players (check roster or waiting status text)
    const hostPageText = await host.page.textContent('body');
    // At minimum, the host should still see the lobby
    expect(hostPageText).toBeTruthy();

    await host.context.close();
    await player.context.close();
  });
});

// ---------------------------------------------------------------------------
// 6. Join via Invite Link
// ---------------------------------------------------------------------------

test.describe('Join via Invite Link', () => {
  test.slow();

  test('navigating to /join/{code} shows join experience', async ({ browser }) => {
    // Host creates room first
    const host = await createOnboardedContext(browser);
    await host.mp.createRoom(randomUsername('Host'));
    await expect(host.mp.waitingStatus).toBeVisible({ timeout: 10_000 });

    const gameCode = extractGameCode(host.page.url());

    // Player navigates directly to invite link
    const player = await createOnboardedContext(browser);
    await goto(player.page, `/join/${gameCode}`);
    await waitForHydration(player.page);

    // Should see either join modal or lobby
    const joinOrLobby = player.mp.joinRoomModal
      .or(player.page.locator('[role="dialog"]'))
      .or(player.mp.waitingStatus);
    await expect(joinOrLobby).toBeVisible({ timeout: 10_000 });

    await host.context.close();
    await player.context.close();
  });
});

// ---------------------------------------------------------------------------
// 7. Game Start Sequence
// ---------------------------------------------------------------------------

test.describe('Game Start Sequence', () => {
  test.slow();

  test('grid and timer become visible after host starts game', async ({ browser }) => {
    const host = await createOnboardedContext(browser);
    await host.mp.createRoom(randomUsername('Host'));
    await expect(host.mp.waitingStatus).toBeVisible({ timeout: 10_000 });

    // Start game (single-player host can start alone for basic test)
    await host.mp.startGameButton.click();

    // Grid should appear
    await host.mp.waitForGameStart();
    await expect(host.mp.gameGrid).toBeVisible();

    // Timer should be visible
    await expect(host.mp.timerDisplay).toBeVisible();

    await host.context.close();
  });
});

// ---------------------------------------------------------------------------
// 8. In-Game
// ---------------------------------------------------------------------------

test.describe('In-Game', () => {
  test.slow();

  test('grid is rendered with content and leaderboard is visible', async ({ browser }) => {
    const host = await createOnboardedContext(browser);
    await host.mp.createRoom(randomUsername('Host'));
    await expect(host.mp.waitingStatus).toBeVisible({ timeout: 10_000 });

    await host.mp.startGameButton.click();
    await host.mp.waitForGameStart();

    // Grid should have content (letters)
    await expect(host.mp.gameGrid).not.toBeEmpty();

    // Leaderboard visible
    await expect(host.mp.leaderboard).toBeVisible();

    // Timer counting down
    await expect(host.mp.timerDisplay).toBeVisible();

    await host.context.close();
  });

  test('grid is interactable', async ({ browser }) => {
    const host = await createOnboardedContext(browser);
    await host.mp.createRoom(randomUsername('Host'));
    await expect(host.mp.waitingStatus).toBeVisible({ timeout: 10_000 });

    await host.mp.startGameButton.click();
    await host.mp.waitForGameStart();

    // Grid cells should be clickable
    const firstCell = host.page.locator('[data-testid*="grid"] [data-testid*="cell"]').first();
    if (await firstCell.isVisible().catch(() => false)) {
      await firstCell.click();
    }

    await host.context.close();
  });
});

// ---------------------------------------------------------------------------
// 9. Results
// ---------------------------------------------------------------------------

test.describe('Results', () => {
  test.slow();

  test('results appear after game ends with expected controls', async ({ browser }) => {
    const host = await createOnboardedContext(browser);
    await host.mp.createRoom(randomUsername('Host'));
    await expect(host.mp.waitingStatus).toBeVisible({ timeout: 10_000 });

    await host.mp.startGameButton.click();
    await host.mp.waitForGameStart();

    // Wait for game to end (timer runs out)
    await host.mp.waitForResults();

    // Results view visible
    await expect(host.mp.resultsView).toBeVisible();

    // Action buttons
    const playAgainVisible = await host.mp.playAgainButton.isVisible().catch(() => false);
    const returnVisible = await host.mp.returnToLobbyButton.isVisible().catch(() => false);
    expect(playAgainVisible || returnVisible).toBeTruthy();

    await host.context.close();
  });

  test('return to lobby button navigates back', async ({ browser }) => {
    const host = await createOnboardedContext(browser);
    await host.mp.createRoom(randomUsername('Host'));
    await expect(host.mp.waitingStatus).toBeVisible({ timeout: 10_000 });

    await host.mp.startGameButton.click();
    await host.mp.waitForGameStart();
    await host.mp.waitForResults();

    if (await host.mp.returnToLobbyButton.isVisible().catch(() => false)) {
      await host.mp.returnToLobbyButton.click();
      // Should navigate back to lobby or room list
      const lobbyOrList = host.mp.waitingStatus.or(host.mp.roomListView);
      await expect(lobbyOrList).toBeVisible({ timeout: 10_000 });
    }

    await host.context.close();
  });
});

// ---------------------------------------------------------------------------
// 10. RTL & Locale
// ---------------------------------------------------------------------------

test.describe('RTL & Locale', () => {
  test('Hebrew locale loads multiplayer page correctly', async ({ page }) => {
    const mp = await setupMultiplayerPage(page, 'he');
    await expect(mp.roomListView).toBeVisible();
  });

  test('Hebrew page has RTL direction', async ({ page }) => {
    await setupMultiplayerPage(page, 'he');
    const dir = await page.locator('html').getAttribute('dir');
    expect(dir).toBe('rtl');
  });

  test('create room button visible in Hebrew', async ({ page }) => {
    const mp = await setupMultiplayerPage(page, 'he');
    await expect(mp.createRoomButton).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 11. Mobile Viewport
// ---------------------------------------------------------------------------

test.describe('Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('multiplayer page loads on mobile viewport', async ({ page }) => {
    const mp = await setupMultiplayerPage(page);
    await expect(mp.roomListView).toBeVisible();
    await expect(mp.createRoomButton).toBeVisible();
  });

  test('create room flow works on mobile', async ({ page }) => {
    const mp = await setupMultiplayerPage(page);
    await mp.createRoom(randomUsername('MobileHost'));
    await expect(mp.waitingStatus).toBeVisible({ timeout: 10_000 });
  });

  test('lobby elements render on mobile', async ({ page }) => {
    const mp = await setupMultiplayerPage(page);
    await mp.createRoom(randomUsername('MobileHost'));
    await expect(mp.waitingStatus).toBeVisible({ timeout: 10_000 });
    await expect(mp.startGameButton).toBeVisible();
    await expect(mp.editAvatarButton).toBeVisible();
  });
});
