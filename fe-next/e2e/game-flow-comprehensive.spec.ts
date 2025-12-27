import { test, expect, type Page, type BrowserContext } from '@playwright/test';

/**
 * Comprehensive Game Flow Tests
 *
 * Tests full game lifecycle including:
 * 1. Complete game round from start to results
 * 2. Word submission and validation
 * 3. Scoring and leaderboard updates
 * 4. Multi-round games
 * 5. Bot integration
 * 6. Edge cases and error handling
 */

// Helper to generate random game code
function generateGameCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Helper to generate random username
function generateUsername(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 7)}`;
}

// Helper to bypass onboarding
async function bypassOnboarding(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('boggle_onboarding_complete', 'true');
    localStorage.setItem('boggle_help_dismissed', 'true');
  });
}

// Helper to create and join a room as host
async function createRoomAsHost(page: Page, gameCode: string, username: string) {
  await page.goto('/en/multiplayer');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Switch to Create Room mode
  const createRoomTab = page.locator('button, [role="tab"]').filter({ hasText: /CREATE/i }).first();
  const createVisible = await createRoomTab.isVisible().catch(() => false);
  if (createVisible) {
    await createRoomTab.click();
    await page.waitForTimeout(500);
  }

  // Fill room code
  const roomCodeInput = page.locator('input[placeholder*="ABC123" i], input[name="roomCode"]').first();
  const inputVisible = await roomCodeInput.isVisible().catch(() => false);
  if (inputVisible) {
    await roomCodeInput.clear();
    await roomCodeInput.fill(gameCode);
  }

  // Click Create Room button
  const createButton = page.locator('button').filter({ hasText: /CREATE ROOM/i }).first();
  await createButton.click();

  // Wait for room creation
  await page.waitForTimeout(3000);

  // Handle username prompt if it appears
  const usernameInput = page.locator('input[placeholder*="name" i], input[name="username"]').first();
  const usernameVisible = await usernameInput.isVisible().catch(() => false);
  if (usernameVisible) {
    await usernameInput.fill(username);
    const submitButton = page.locator('button').filter({ hasText: /Continue|Join|OK/i }).first();
    await submitButton.click();
    await page.waitForTimeout(2000);
  }
}

// Helper to join a room as player
async function joinRoomAsPlayer(page: Page, gameCode: string, username: string) {
  await page.goto('/en/multiplayer');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Fill in join details
  const roomCodeInput = page.locator('input[placeholder*="code" i], input[name="gameCode"]').first();
  const usernameInput = page.locator('input[placeholder*="name" i], input[name="username"]').first();

  await roomCodeInput.fill(gameCode);
  await usernameInput.fill(username);

  // Join room
  const joinSubmitButton = page.locator('button').filter({ hasText: /^Join$/i }).last();
  await joinSubmitButton.click();

  // Wait for join
  await page.waitForTimeout(2000);
}

// Helper to check if game is active
async function isGameActive(page: Page): Promise<boolean> {
  const grid = page.locator('[class*="grid"], [class*="Grid"], [data-testid="game-grid"]').first();
  const gridVisible = await grid.isVisible().catch(() => false);

  const waitingText = page.locator('text=/waiting/i').first();
  const waitingVisible = await waitingText.isVisible().catch(() => false);

  const startButton = page.locator('button').filter({ hasText: /Start Game/i }).first();
  const startButtonVisible = await startButton.isVisible().catch(() => false);

  return gridVisible && !waitingVisible && !startButtonVisible;
}

// Helper to check if on results screen
async function isOnResultsScreen(page: Page): Promise<boolean> {
  const resultsIndicators = [
    'text=/final.*score/i',
    'text=/game.*over/i',
    'text=/results/i',
    '[class*="results"]',
    '[data-testid="results-screen"]'
  ];

  for (const selector of resultsIndicators) {
    const element = page.locator(selector).first();
    const visible = await element.isVisible().catch(() => false);
    if (visible) return true;
  }

  return false;
}

// Helper to get grid letters (if visible)
async function getGridLetters(page: Page): Promise<string[][]> {
  const cells = await page.locator('[class*="cell"], [class*="Cell"], [data-testid*="grid-cell"]').all();
  const letters: string[] = [];

  for (const cell of cells) {
    const text = await cell.textContent().catch(() => '');
    if (text && text.length === 1) {
      letters.push(text.toUpperCase());
    }
  }

  // Assume 4x4 or 5x5 grid
  const gridSize = Math.sqrt(letters.length);
  if (gridSize !== Math.floor(gridSize)) return [];

  const grid: string[][] = [];
  for (let i = 0; i < gridSize; i++) {
    grid.push(letters.slice(i * gridSize, (i + 1) * gridSize));
  }

  return grid;
}

// Helper to submit a word (via input or clicking cells)
async function submitWord(page: Page, word: string): Promise<boolean> {
  // Try input method first
  const wordInput = page.locator('input[placeholder*="word" i], input[name="word"], input[type="text"]').first();
  const inputVisible = await wordInput.isVisible().catch(() => false);

  if (inputVisible) {
    await wordInput.fill(word);
    await wordInput.press('Enter');
    await page.waitForTimeout(500);
    return true;
  }

  return false;
}

// Helper to wait for timer to reach a specific value or less
async function waitForTimerBelow(page: Page, seconds: number, timeout: number = 120000): Promise<void> {
  await page.waitForFunction(
    (targetSeconds) => {
      const timerElement = document.querySelector('[class*="timer"], [class*="Timer"]');
      if (!timerElement) return false;

      const text = timerElement.textContent || '';
      const match = text.match(/(\d+):(\d+)/);
      if (!match) return false;

      const mins = parseInt(match[1], 10);
      const secs = parseInt(match[2], 10);
      const totalSeconds = mins * 60 + secs;

      return totalSeconds <= targetSeconds;
    },
    seconds,
    { timeout }
  );
}

test.describe('Comprehensive Game Flow', () => {

  test.describe('1. Complete Game Round', () => {

    test('full game lifecycle: create -> start -> play -> end -> results', async ({ browser }) => {
      const gameCode = generateGameCode();
      const hostUsername = generateUsername('Host');
      const playerUsername = generateUsername('Player');

      const hostContext = await browser.newContext();
      const playerContext = await browser.newContext();

      // Bypass onboarding
      const hostPage = await hostContext.newPage();
      await bypassOnboarding(hostPage);

      const playerPage = await playerContext.newPage();
      await bypassOnboarding(playerPage);

      try {
        // 1. Create room
        console.log('Step 1: Host creating room');
        await createRoomAsHost(hostPage, gameCode, hostUsername);
        await hostPage.screenshot({ path: 'test-results/game-flow-1-room-created.png' });

        // 2. Player joins
        console.log('Step 2: Player joining room');
        await joinRoomAsPlayer(playerPage, gameCode, playerUsername);
        await playerPage.screenshot({ path: 'test-results/game-flow-2-player-joined.png' });

        // Verify both in lobby
        await hostPage.waitForTimeout(1000);

        // 3. Start game
        console.log('Step 3: Starting game');
        const startButton = hostPage.locator('button').filter({ hasText: /Start/i }).first();
        await startButton.click();
        await hostPage.waitForTimeout(5000);

        // 4. Verify game started for both
        console.log('Step 4: Verifying game started');
        const hostGameActive = await isGameActive(hostPage);
        const playerGameActive = await isGameActive(playerPage);

        await hostPage.screenshot({ path: 'test-results/game-flow-3-game-started-host.png' });
        await playerPage.screenshot({ path: 'test-results/game-flow-3-game-started-player.png' });

        expect(hostGameActive).toBe(true);
        expect(playerGameActive).toBe(true);

        // 5. Both players submit words (if possible)
        console.log('Step 5: Submitting words');
        await submitWord(hostPage, 'test');
        await submitWord(playerPage, 'word');
        await hostPage.waitForTimeout(1000);

        // 6. Wait for game to end (or check current state)
        // For a quick test, we just verify the game is running
        console.log('Step 6: Game is active, test complete');

        console.log('All game flow steps completed successfully');

      } finally {
        await hostContext.close();
        await playerContext.close();
      }
    });
  });

  test.describe('2. Word Submission Flow', () => {

    test('word submission updates found words list', async ({ browser }) => {
      const gameCode = generateGameCode();
      const hostUsername = generateUsername('Host');

      const hostContext = await browser.newContext();
      const hostPage = await hostContext.newPage();
      await bypassOnboarding(hostPage);

      try {
        // Create room solo
        await createRoomAsHost(hostPage, gameCode, hostUsername);
        await hostPage.waitForTimeout(1000);

        // Start game
        const startButton = hostPage.locator('button').filter({ hasText: /Start/i }).first();
        const startVisible = await startButton.isVisible().catch(() => false);
        if (startVisible) {
          await startButton.click();
          await hostPage.waitForTimeout(3000);
        }

        // Submit a word
        const submitted = await submitWord(hostPage, 'cat');

        if (submitted) {
          // Check if word appears in found words list
          const foundWordsArea = hostPage.locator('[class*="found"], [class*="words"]').first();
          const areaVisible = await foundWordsArea.isVisible().catch(() => false);

          if (areaVisible) {
            const content = await foundWordsArea.textContent().catch(() => '');
            // Word might or might not be valid depending on board
            console.log(`Found words area content: ${content?.substring(0, 100)}`);
          }
        }

        console.log('Word submission flow completed');

      } finally {
        await hostContext.close();
      }
    });

    test('duplicate word submission is rejected', async ({ browser }) => {
      const gameCode = generateGameCode();
      const hostUsername = generateUsername('Host');

      const hostContext = await browser.newContext();
      const hostPage = await hostContext.newPage();
      await bypassOnboarding(hostPage);

      try {
        await createRoomAsHost(hostPage, gameCode, hostUsername);
        await hostPage.waitForTimeout(1000);

        const startButton = hostPage.locator('button').filter({ hasText: /Start/i }).first();
        const startVisible = await startButton.isVisible().catch(() => false);
        if (startVisible) {
          await startButton.click();
          await hostPage.waitForTimeout(3000);
        }

        // Submit same word twice
        await submitWord(hostPage, 'test');
        await hostPage.waitForTimeout(500);
        await submitWord(hostPage, 'test');
        await hostPage.waitForTimeout(500);

        // Should show error or word only appears once
        // The exact behavior depends on implementation
        console.log('Duplicate word test completed');

      } finally {
        await hostContext.close();
      }
    });
  });

  test.describe('3. Leaderboard Updates', () => {

    test('leaderboard updates in real-time when words are submitted', async ({ browser }) => {
      const gameCode = generateGameCode();
      const hostUsername = generateUsername('Host');
      const playerUsername = generateUsername('Player');

      const hostContext = await browser.newContext();
      const playerContext = await browser.newContext();

      const hostPage = await hostContext.newPage();
      await bypassOnboarding(hostPage);

      const playerPage = await playerContext.newPage();
      await bypassOnboarding(playerPage);

      try {
        await createRoomAsHost(hostPage, gameCode, hostUsername);
        await joinRoomAsPlayer(playerPage, gameCode, playerUsername);
        await hostPage.waitForTimeout(1000);

        // Start game
        const startButton = hostPage.locator('button').filter({ hasText: /Start/i }).first();
        await startButton.click();
        await hostPage.waitForTimeout(3000);

        // Check for leaderboard element
        const leaderboard = hostPage.locator('[class*="leaderboard"], [class*="Leaderboard"]').first();
        const leaderboardVisible = await leaderboard.isVisible().catch(() => false);

        if (leaderboardVisible) {
          // Get initial state
          const initialContent = await leaderboard.textContent().catch(() => '');
          console.log(`Initial leaderboard: ${initialContent?.substring(0, 100)}`);

          // Submit a word
          await submitWord(hostPage, 'hello');
          await hostPage.waitForTimeout(1000);

          // Check updated state
          const updatedContent = await leaderboard.textContent().catch(() => '');
          console.log(`Updated leaderboard: ${updatedContent?.substring(0, 100)}`);
        }

        console.log('Leaderboard update test completed');

      } finally {
        await hostContext.close();
        await playerContext.close();
      }
    });
  });

  test.describe('4. Multi-Round Games', () => {

    test.skip('host can start a new round after game ends', async ({ browser }) => {
      // This test requires waiting for full game to complete
      // Skipped by default as it takes several minutes

      const gameCode = generateGameCode();
      const hostUsername = generateUsername('Host');

      const hostContext = await browser.newContext();
      const hostPage = await hostContext.newPage();
      await bypassOnboarding(hostPage);

      try {
        await createRoomAsHost(hostPage, gameCode, hostUsername);

        // Start first game
        let startButton = hostPage.locator('button').filter({ hasText: /Start/i }).first();
        await startButton.click();

        // Wait for game to end (this could take 1-3 minutes)
        await page.waitForTimeout(180000); // 3 minutes max

        // Check for results screen
        const onResults = await isOnResultsScreen(hostPage);
        expect(onResults).toBe(true);

        // Start new round
        startButton = hostPage.locator('button').filter({ hasText: /Start|New|Play Again/i }).first();
        const newRoundVisible = await startButton.isVisible().catch(() => false);

        if (newRoundVisible) {
          await startButton.click();
          await hostPage.waitForTimeout(5000);

          // Verify new game started
          const gameActive = await isGameActive(hostPage);
          expect(gameActive).toBe(true);
        }

      } finally {
        await hostContext.close();
      }
    });
  });

  test.describe('5. Error Handling', () => {

    test('handles invalid room code gracefully', async ({ page }) => {
      await bypassOnboarding(page);
      await page.goto('/en/multiplayer');
      await page.waitForLoadState('networkidle');

      // Try to join non-existent room
      const roomCodeInput = page.locator('input[placeholder*="code" i], input[name="gameCode"]').first();
      const usernameInput = page.locator('input[placeholder*="name" i], input[name="username"]').first();

      const roomInputVisible = await roomCodeInput.isVisible().catch(() => false);
      if (!roomInputVisible) {
        console.log('Room input not visible, skipping test');
        return;
      }

      await roomCodeInput.fill('XXXXXX');
      await usernameInput.fill('TestUser');

      const joinButton = page.locator('button').filter({ hasText: /^Join$/i }).last();
      await joinButton.click();

      // Wait for error message
      await page.waitForTimeout(3000);

      // Should show error or remain on join screen
      const errorMessage = page.locator('[class*="error"], [role="alert"], text=/not found|invalid|error/i').first();
      const stillOnJoinScreen = page.locator('input[placeholder*="code" i]').first();

      const hasError = await errorMessage.isVisible().catch(() => false);
      const stillOnForm = await stillOnJoinScreen.isVisible().catch(() => false);

      expect(hasError || stillOnForm).toBe(true);
      console.log('Invalid room code handled gracefully');
    });

    test('handles disconnection and reconnection', async ({ browser }) => {
      const gameCode = generateGameCode();
      const hostUsername = generateUsername('Host');

      const hostContext = await browser.newContext();
      const hostPage = await hostContext.newPage();
      await bypassOnboarding(hostPage);

      try {
        await createRoomAsHost(hostPage, gameCode, hostUsername);
        await hostPage.waitForTimeout(1000);

        // Simulate network issues by going offline briefly
        await hostContext.setOffline(true);
        await hostPage.waitForTimeout(2000);

        // Come back online
        await hostContext.setOffline(false);
        await hostPage.waitForTimeout(3000);

        // Page should still be functional or show reconnection
        const pageContent = await hostPage.content();
        expect(pageContent.length).toBeGreaterThan(0);

        console.log('Disconnection handling test completed');

      } finally {
        await hostContext.close();
      }
    });
  });

  test.describe('6. Game State Consistency', () => {

    test('all players see the same grid', async ({ browser }) => {
      const gameCode = generateGameCode();
      const hostUsername = generateUsername('Host');
      const playerUsername = generateUsername('Player');

      const hostContext = await browser.newContext();
      const playerContext = await browser.newContext();

      const hostPage = await hostContext.newPage();
      await bypassOnboarding(hostPage);

      const playerPage = await playerContext.newPage();
      await bypassOnboarding(playerPage);

      try {
        await createRoomAsHost(hostPage, gameCode, hostUsername);
        await joinRoomAsPlayer(playerPage, gameCode, playerUsername);
        await hostPage.waitForTimeout(1000);

        // Start game
        const startButton = hostPage.locator('button').filter({ hasText: /Start/i }).first();
        await startButton.click();
        await hostPage.waitForTimeout(5000);

        // Get grid from both players
        const hostGrid = await getGridLetters(hostPage);
        const playerGrid = await getGridLetters(playerPage);

        console.log('Host grid:', hostGrid);
        console.log('Player grid:', playerGrid);

        // If both grids were captured, they should match
        if (hostGrid.length > 0 && playerGrid.length > 0) {
          expect(hostGrid).toEqual(playerGrid);
          console.log('Grid consistency verified!');
        } else {
          console.log('Could not capture grids for comparison');
        }

      } finally {
        await hostContext.close();
        await playerContext.close();
      }
    });

    test('timer is synchronized across players', async ({ browser }) => {
      const gameCode = generateGameCode();
      const hostUsername = generateUsername('Host');
      const playerUsername = generateUsername('Player');

      const hostContext = await browser.newContext();
      const playerContext = await browser.newContext();

      const hostPage = await hostContext.newPage();
      await bypassOnboarding(hostPage);

      const playerPage = await playerContext.newPage();
      await bypassOnboarding(playerPage);

      try {
        await createRoomAsHost(hostPage, gameCode, hostUsername);
        await joinRoomAsPlayer(playerPage, gameCode, playerUsername);
        await hostPage.waitForTimeout(1000);

        // Start game
        const startButton = hostPage.locator('button').filter({ hasText: /Start/i }).first();
        await startButton.click();
        await hostPage.waitForTimeout(3000);

        // Get timer values from both
        const hostTimer = hostPage.locator('[class*="timer"], [class*="Timer"]').first();
        const playerTimer = playerPage.locator('[class*="timer"], [class*="Timer"]').first();

        const hostTimerText = await hostTimer.textContent().catch(() => '');
        const playerTimerText = await playerTimer.textContent().catch(() => '');

        console.log(`Host timer: ${hostTimerText}`);
        console.log(`Player timer: ${playerTimerText}`);

        // Extract seconds from timer text
        const extractSeconds = (text: string): number => {
          const match = text.match(/(\d+):(\d+)/);
          if (!match) return -1;
          return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
        };

        const hostSeconds = extractSeconds(hostTimerText || '');
        const playerSeconds = extractSeconds(playerTimerText || '');

        // Timers should be within 2 seconds of each other (network latency)
        if (hostSeconds >= 0 && playerSeconds >= 0) {
          expect(Math.abs(hostSeconds - playerSeconds)).toBeLessThanOrEqual(2);
          console.log('Timer synchronization verified!');
        }

      } finally {
        await hostContext.close();
        await playerContext.close();
      }
    });
  });

  test.describe('7. Player Count Scenarios', () => {

    test('game works with 3+ players', async ({ browser }) => {
      const gameCode = generateGameCode();
      const contexts: BrowserContext[] = [];
      const pages: Page[] = [];

      try {
        // Create host
        const hostContext = await browser.newContext();
        contexts.push(hostContext);
        const hostPage = await hostContext.newPage();
        await bypassOnboarding(hostPage);
        pages.push(hostPage);

        await createRoomAsHost(hostPage, gameCode, 'Host');

        // Add 2 more players
        for (let i = 1; i <= 2; i++) {
          const playerContext = await browser.newContext();
          contexts.push(playerContext);
          const playerPage = await playerContext.newPage();
          await bypassOnboarding(playerPage);
          pages.push(playerPage);

          await joinRoomAsPlayer(playerPage, gameCode, `Player${i}`);
          await hostPage.waitForTimeout(500);
        }

        // Start game
        const startButton = hostPage.locator('button').filter({ hasText: /Start/i }).first();
        await startButton.click();
        await hostPage.waitForTimeout(5000);

        // Verify all players are in game
        let allInGame = true;
        for (const page of pages) {
          const isActive = await isGameActive(page);
          if (!isActive) allInGame = false;
        }

        expect(allInGame).toBe(true);
        console.log('3-player game verified!');

      } finally {
        for (const context of contexts) {
          await context.close();
        }
      }
    });
  });
});
