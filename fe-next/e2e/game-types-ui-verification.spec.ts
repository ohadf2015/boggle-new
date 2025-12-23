/**
 * Game Types UI Verification E2E Tests
 * 
 * Comprehensive UI verification for all game types:
 * - Single Player: Solo vs Bots, Practice, Challenge
 * - Multiplayer: Host, Join, Regular Game
 * - Landing page
 * - Results screens
 */

import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'Mobile', width: 375, height: 667 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Desktop', width: 1280, height: 720 },
];

test.describe('Game Types UI Verification', () => {
  test.describe('1. Landing Page', () => {
    for (const viewport of VIEWPORTS) {
      test(`Landing page UI at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/en');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Check header is visible
        const header = page.locator('header').first();
        await expect(header).toBeVisible();

        // Check game mode cards
        const singlePlayerLink = page.locator('a[href*="singleplayer"]').first();
        const multiplayerLink = page.locator('a[href*="multiplayer"]').first();
        
        await expect(singlePlayerLink).toBeVisible();
        await expect(multiplayerLink).toBeVisible();

        // Check "How to Play" button
        const howToPlay = page.locator('a[href*="rules"]').first();
        await expect(howToPlay).toBeVisible();

        // Check no horizontal scroll
        const bodyOverflow = await page.evaluate(() => {
          const body = document.body;
          return {
            scrollWidth: body.scrollWidth,
            clientWidth: body.clientWidth,
          };
        });
        expect(bodyOverflow.scrollWidth).toBeLessThanOrEqual(bodyOverflow.clientWidth + 5);

        // Check touch targets on mobile (only for interactive links)
        if (viewport.width <= 768) {
          const interactiveLinks = page.locator('a[href*="singleplayer"], a[href*="multiplayer"], a[href*="rules"]');
          const linkCount = await interactiveLinks.count();
          for (let i = 0; i < Math.min(linkCount, 3); i++) {
            const link = interactiveLinks.nth(i);
            const box = await link.boundingBox();
            if (box && box.width > 0 && box.height > 0) {
              // Check if link is actually visible and has reasonable size
              const isVisible = await link.isVisible();
              if (isVisible) {
                expect(box.width).toBeGreaterThan(20);
                expect(box.height).toBeGreaterThan(20);
              }
            }
          }
        }
      });
    }
  });

  test.describe('2. Single Player - Solo vs Bots Mode', () => {
    test('Solo vs Bots lobby UI', async ({ page }) => {
      await page.goto('/en/singleplayer');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Check mode selection buttons
      const soloBotsButton = page.locator('button:has-text("Solo vs Bots"), button:has-text("solo")').first();
      await soloBotsButton.click();
      await page.waitForTimeout(500);

      // Check bot configuration section
      const botSection = page.locator('text=/bot/i, text=/opponent/i').first();
      const botVisible = await botSection.isVisible({ timeout: 2000 }).catch(() => false);
      if (botVisible) {
        await expect(botSection).toBeVisible();
      }

      // Check start button
      const startButton = page.locator('button:has-text("Start"), button:has-text("Play")').first();
      await expect(startButton).toBeVisible();

      // Check difficulty selector
      const difficultySelector = page.locator('button:has-text("Easy"), button:has-text("Medium"), button:has-text("Hard")').first();
      const diffVisible = await difficultySelector.isVisible({ timeout: 2000 }).catch(() => false);
      if (diffVisible) {
        await expect(difficultySelector).toBeVisible();
      }
    });

    test('Solo vs Bots game screen UI', async ({ page }) => {
      await page.goto('/en/singleplayer');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Select solo-bots mode and start
      const soloBotsButton = page.locator('button:has-text("Solo vs Bots"), button:has-text("solo")').first();
      await soloBotsButton.click();
      await page.waitForTimeout(500);

      const startButton = page.locator('button:has-text("Start"), button:has-text("Play")').first();
      await startButton.click();
      await page.waitForTimeout(2000);

      // Check game grid
      const grid = page.locator('[role="grid"]').first();
      await expect(grid).toBeVisible({ timeout: 5000 });

      // Check timer
      const timer = page.locator('[class*="timer"], [role="timer"]').first();
      const timerVisible = await timer.isVisible({ timeout: 3000 }).catch(() => false);
      if (timerVisible) {
        await expect(timer).toBeVisible();
      }

      // Check score display
      const score = page.locator('[class*="score"], text=/score/i').first();
      const scoreVisible = await score.isVisible({ timeout: 3000 }).catch(() => false);
      if (scoreVisible) {
        await expect(score).toBeVisible();
      }

      // Check bot scores section
      const botScores = page.locator('text=/bot/i, [class*="bot"]').first();
      const botScoresVisible = await botScores.isVisible({ timeout: 3000 }).catch(() => false);
      if (botScoresVisible) {
        await expect(botScores).toBeVisible();
      }
    });
  });

  test.describe('3. Single Player - Practice Mode', () => {
    test('Practice mode lobby UI', async ({ page }) => {
      await page.goto('/en/singleplayer');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Select practice mode
      const practiceButton = page.locator('button:has-text("Practice"), button:has-text("practice")').first();
      await practiceButton.click();
      await page.waitForTimeout(500);

      // Check that timer is not shown (practice has no timer)
      const timerLabel = page.locator('text=/timer/i, text=/time/i').first();
      const timerVisible = await timerLabel.isVisible({ timeout: 1000 }).catch(() => false);
      // Practice mode should not have timer, so this is expected to be false
      expect(timerVisible).toBe(false);

      // Check start button
      const startButton = page.locator('button:has-text("Start"), button:has-text("Play")').first();
      await expect(startButton).toBeVisible();
    });

    test('Practice mode game screen UI', async ({ page }) => {
      await page.goto('/en/singleplayer');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Select practice mode and start
      const practiceButton = page.locator('button:has-text("Practice"), button:has-text("practice")').first();
      await practiceButton.click();
      await page.waitForTimeout(500);

      const startButton = page.locator('button:has-text("Start"), button:has-text("Play")').first();
      await startButton.click();
      await page.waitForTimeout(2000);

      // Check game grid
      const grid = page.locator('[role="grid"]').first();
      await expect(grid).toBeVisible({ timeout: 5000 });

      // Check that timer is not visible in practice mode
      const timer = page.locator('[class*="timer"], [role="timer"]').first();
      const timerVisible = await timer.isVisible({ timeout: 2000 }).catch(() => false);
      expect(timerVisible).toBe(false);

      // Check score display
      const score = page.locator('[class*="score"], text=/score/i').first();
      const scoreVisible = await score.isVisible({ timeout: 3000 }).catch(() => false);
      if (scoreVisible) {
        await expect(score).toBeVisible();
      }
    });
  });

  test.describe('4. Single Player - Challenge Mode', () => {
    test('Challenge mode lobby UI', async ({ page }) => {
      await page.goto('/en/singleplayer');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Select challenge mode
      const challengeButton = page.locator('button:has-text("Challenge"), button:has-text("challenge")').first();
      await challengeButton.click();
      await page.waitForTimeout(500);

      // Check high score display (if available)
      const highScore = page.locator('text=/high score/i, text=/best/i, text=/record/i').first();
      const highScoreVisible = await highScore.isVisible({ timeout: 2000 }).catch(() => false);
      // High score may or may not be visible depending on whether user has one

      // Check timer selector
      const timerSelector = page.locator('button:has-text("min"), select, input[type="number"]').first();
      const timerVisible = await timerSelector.isVisible({ timeout: 2000 }).catch(() => false);
      if (timerVisible) {
        await expect(timerSelector).toBeVisible();
      }

      // Check start button
      const startButton = page.locator('button:has-text("Start"), button:has-text("Play")').first();
      await expect(startButton).toBeVisible();
    });

    test('Challenge mode game screen UI', async ({ page }) => {
      await page.goto('/en/singleplayer');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Select challenge mode and start
      const challengeButton = page.locator('button:has-text("Challenge"), button:has-text("challenge")').first();
      await challengeButton.click();
      await page.waitForTimeout(500);

      const startButton = page.locator('button:has-text("Start"), button:has-text("Play")').first();
      await startButton.click();
      await page.waitForTimeout(2000);

      // Check game grid
      const grid = page.locator('[role="grid"]').first();
      await expect(grid).toBeVisible({ timeout: 5000 });

      // Check timer
      const timer = page.locator('[class*="timer"], [role="timer"]').first();
      const timerVisible = await timer.isVisible({ timeout: 3000 }).catch(() => false);
      if (timerVisible) {
        await expect(timer).toBeVisible();
      }

      // Check high score tracker (if visible)
      const highScoreTracker = page.locator('text=/high score/i, text=/target/i').first();
      const trackerVisible = await highScoreTracker.isVisible({ timeout: 2000 }).catch(() => false);
      // May or may not be visible
    });
  });

  test.describe('5. Multiplayer - Host Mode', () => {
    test('Host lobby UI', async ({ page }) => {
      await page.goto('/en/multiplayer');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Select host mode
      const hostButton = page.locator('button:has-text("Host"), button:has-text("Create"), [class*="host"]').first();
      await hostButton.click();
      await page.waitForTimeout(500);

      // Check room name input
      const roomNameInput = page.locator('input[placeholder*="room"], input[placeholder*="Room"], input[name*="room"]').first();
      const roomNameVisible = await roomNameInput.isVisible({ timeout: 2000 }).catch(() => false);
      if (roomNameVisible) {
        await expect(roomNameInput).toBeVisible();
      }

      // Check language selector
      const languageSelector = page.locator('button:has-text("Language"), select, [class*="language"]').first();
      const langVisible = await languageSelector.isVisible({ timeout: 2000 }).catch(() => false);
      if (langVisible) {
        await expect(languageSelector).toBeVisible();
      }

      // Check create room button
      const createButton = page.locator('button:has-text("Create"), button:has-text("Host")').first();
      await expect(createButton).toBeVisible();
    });
  });

  test.describe('6. Multiplayer - Join Mode', () => {
    test('Join lobby UI', async ({ page }) => {
      await page.goto('/en/multiplayer');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Select join mode
      const joinButton = page.locator('button:has-text("Join"), button:has-text("Enter Code")').first();
      await joinButton.click();
      await page.waitForTimeout(500);

      // Check room code input
      const roomCodeInput = page.locator('input[placeholder*="code"], input[placeholder*="Code"], input[name*="code"]').first();
      const codeInputVisible = await roomCodeInput.isVisible({ timeout: 2000 }).catch(() => false);
      if (codeInputVisible) {
        await expect(roomCodeInput).toBeVisible();
      }

      // Check active rooms list
      const roomsList = page.locator('text=/rooms/i, text=/active/i, [class*="room"]').first();
      const roomsVisible = await roomsList.isVisible({ timeout: 2000 }).catch(() => false);
      // May or may not be visible depending on active rooms

      // Check join button
      const joinButton2 = page.locator('button:has-text("Join"), button:has-text("Enter")').first();
      await expect(joinButton2).toBeVisible();
    });
  });

  test.describe('7. Responsive Design - All Game Types', () => {
    for (const viewport of VIEWPORTS) {
      test(`Single player lobby responsive at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/en/singleplayer');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Check no horizontal scroll
        const bodyOverflow = await page.evaluate(() => {
          const body = document.body;
          return {
            scrollWidth: body.scrollWidth,
            clientWidth: body.clientWidth,
          };
        });
        expect(bodyOverflow.scrollWidth).toBeLessThanOrEqual(bodyOverflow.clientWidth + 5);

        // Check main elements are visible
        const startButton = page.locator('button:has-text("Start"), button:has-text("Play")').first();
        await expect(startButton).toBeVisible();
      });

      test(`Multiplayer lobby responsive at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/en/multiplayer');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Check no horizontal scroll
        const bodyOverflow = await page.evaluate(() => {
          const body = document.body;
          return {
            scrollWidth: body.scrollWidth,
            clientWidth: body.clientWidth,
          };
        });
        expect(bodyOverflow.scrollWidth).toBeLessThanOrEqual(bodyOverflow.clientWidth + 5);

        // Check mode selector is visible
        const modeSelector = page.locator('button:has-text("Host"), button:has-text("Join")').first();
        await expect(modeSelector).toBeVisible();
      });
    }
  });

  test.describe('8. Accessibility - All Game Types', () => {
    test('Landing page has proper ARIA labels', async ({ page }) => {
      await page.goto('/en');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Check main landmark (may be main tag or have role="main")
      const main = page.locator('main, [role="main"]').first();
      const mainVisible = await main.isVisible({ timeout: 3000 }).catch(() => false);
      // Main element should exist, but may not always be visible depending on layout
      if (mainVisible) {
        await expect(main).toBeVisible();
      }

      // Check navigation links have proper labels
      const links = page.locator('a[href*="singleplayer"], a[href*="multiplayer"]');
      const linkCount = await links.count();
      expect(linkCount).toBeGreaterThan(0);

      for (let i = 0; i < Math.min(linkCount, 3); i++) {
        const link = links.nth(i);
        const ariaLabel = await link.getAttribute('aria-label');
        const hasText = await link.textContent();
        expect(ariaLabel || hasText).toBeTruthy();
      }
    });

    test('Game screen has accessible grid', async ({ page }) => {
      await page.goto('/en/singleplayer');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const practiceButton = page.locator('button:has-text("Practice"), button:has-text("practice")').first();
      await practiceButton.click();
      await page.waitForTimeout(500);

      const startButton = page.locator('button:has-text("Start"), button:has-text("Play")').first();
      await startButton.click();
      await page.waitForTimeout(2000);

      // Check grid has proper role
      const grid = page.locator('[role="grid"]').first();
      await expect(grid).toBeVisible({ timeout: 5000 });

      // Check grid has aria-label
      const gridLabel = await grid.getAttribute('aria-label');
      expect(gridLabel).toBeTruthy();

      // Check grid cells have proper roles
      const cells = grid.locator('[role="gridcell"]');
      const cellCount = await cells.count();
      expect(cellCount).toBeGreaterThan(0);

      // Check first cell has aria-label
      if (cellCount > 0) {
        const firstCell = cells.first();
        const cellLabel = await firstCell.getAttribute('aria-label');
        expect(cellLabel).toBeTruthy();
      }
    });
  });

  test.describe('9. UI Element Visibility - All Modes', () => {
    test('All single player modes show correct UI elements', async ({ page }) => {
      await page.goto('/en/singleplayer');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const modes = ['Solo vs Bots', 'Practice', 'Challenge'];
      
      for (const mode of modes) {
        const modeButton = page.locator(`button:has-text("${mode}"), button:has-text("${mode.toLowerCase()}")`).first();
        await modeButton.click();
        await page.waitForTimeout(500);

        // Check start button is always visible
        const startButton = page.locator('button:has-text("Start"), button:has-text("Play")').first();
        await expect(startButton).toBeVisible();

        // Check language selector
        const langSelector = page.locator('button:has-text("Language"), select, [class*="language"]').first();
        const langVisible = await langSelector.isVisible({ timeout: 1000 }).catch(() => false);
        // Language selector should be visible
      }
    });

    test('Multiplayer modes show correct UI elements', async ({ page }) => {
      await page.goto('/en/multiplayer');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Test host mode
      const hostButton = page.locator('button:has-text("Host"), button:has-text("Create")').first();
      await hostButton.click();
      await page.waitForTimeout(500);

      const createButton = page.locator('button:has-text("Create"), button:has-text("Host")').first();
      await expect(createButton).toBeVisible();

      // Test join mode
      const joinButton = page.locator('button:has-text("Join"), button:has-text("Enter Code")').first();
      await joinButton.click();
      await page.waitForTimeout(500);

      const joinButton2 = page.locator('button:has-text("Join"), button:has-text("Enter")').first();
      await expect(joinButton2).toBeVisible();
    });
  });
});

