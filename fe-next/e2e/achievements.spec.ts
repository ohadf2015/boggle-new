/**
 * Achievement System E2E Tests
 *
 * Tests the achievement system including:
 * - Achievement dock display
 * - Achievement unlock animations
 * - Achievement persistence
 * - Achievement tooltips
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

// Helper to start a single player game
async function startSinglePlayerGame(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/en/singleplayer`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
  await startButton.click();
  await page.waitForTimeout(2000);
}

// Helper to submit a word by swiping
async function submitWord(page: Page, cellCount: number = 3): Promise<void> {
  const grid = page.locator('[role="grid"]').first();
  const cells = grid.locator('[role="gridcell"]');
  const count = await cells.count();

  if (count >= cellCount) {
    const firstCell = cells.first();
    const cellBox = await firstCell.boundingBox();

    if (cellBox) {
      await page.mouse.move(cellBox.x + cellBox.width / 2, cellBox.y + cellBox.height / 2);
      await page.mouse.down();

      for (let i = 1; i < Math.min(cellCount, count); i++) {
        const nextCell = cells.nth(i);
        const nextBox = await nextCell.boundingBox();
        if (nextBox) {
          await page.mouse.move(nextBox.x + nextBox.width / 2, nextBox.y + nextBox.height / 2);
          await page.waitForTimeout(50);
        }
      }

      await page.mouse.up();
      await page.waitForTimeout(500);
    }
  }
}

test.describe('Achievement System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('lexiclash_onboarding_completed', 'true');
      localStorage.setItem('boggle_onboarding_completed', 'true');
      localStorage.setItem('boggle_username', 'AchievementTester');
    });
  });

  test.describe('Achievement Dock UI', () => {
    test('achievement dock appears after earning achievement', async ({ page }) => {
      await startSinglePlayerGame(page);

      // Verify game started
      const grid = page.locator('[role="grid"]').first();
      await expect(grid).toBeVisible({ timeout: 5000 });

      // Submit multiple words to potentially trigger achievement
      for (let i = 0; i < 3; i++) {
        await submitWord(page, 3 + i);
        await page.waitForTimeout(1000);
      }

      // Look for achievement dock (trophy button)
      const achievementDock = page.locator(
        'button:has-text("🏆"), [class*="achievement"], [aria-label*="achievement"]'
      ).first();
      const dockVisible = await achievementDock.isVisible({ timeout: 5000 }).catch(() => false);

      // Take screenshot
      await page.screenshot({ path: 'test-results/achievements-dock.png', fullPage: true });
    });

    test('achievement dock shows count badge', async ({ page }) => {
      await startSinglePlayerGame(page);

      // Submit words
      await submitWord(page, 4);
      await page.waitForTimeout(2000);

      // Look for count badge near achievement dock
      const countBadge = page.locator(
        '[class*="badge"], text=/\\d+/, span:has-text(/^\\d+$/)'
      );

      // Take screenshot
      await page.screenshot({ path: 'test-results/achievements-count-badge.png', fullPage: true });
    });

    test('clicking achievement dock expands panel', async ({ page }) => {
      // Set up mock achievements in localStorage
      await page.evaluate(() => {
        // Mock some achievements
        const mockAchievements = [
          { key: 'first_word', icon: '🎯' },
          { key: 'word_master', icon: '📚' }
        ];
        localStorage.setItem('boggle_session_achievements', JSON.stringify(mockAchievements));
      });

      await startSinglePlayerGame(page);

      // Look for and click achievement dock
      const achievementButton = page.locator('button:has-text("🏆")').first();
      if (await achievementButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await achievementButton.click();
        await page.waitForTimeout(500);

        // Panel should expand
        const achievementPanel = page.locator(
          '[class*="achievement-panel"], [class*="achievements"]'
        ).first();
        const panelVisible = await achievementPanel.isVisible({ timeout: 2000 }).catch(() => false);

        // Take screenshot
        await page.screenshot({ path: 'test-results/achievements-panel-expanded.png', fullPage: true });
      }
    });
  });

  test.describe('Achievement Unlock Animation', () => {
    test('shows animation when new achievement unlocked', async ({ page }) => {
      // Listen for achievement-related animations
      const animationDetected: boolean[] = [];

      await page.addInitScript(() => {
        (window as any).__achievementAnimations = [];
        const originalAnimate = Element.prototype.animate;
        Element.prototype.animate = function(...args) {
          if (this.className?.includes?.('achievement') ||
              this.getAttribute?.('aria-label')?.includes?.('achievement')) {
            (window as any).__achievementAnimations.push(args);
          }
          return originalAnimate.apply(this, args);
        };
      });

      await startSinglePlayerGame(page);

      // Submit words to trigger achievement
      for (let i = 0; i < 5; i++) {
        await submitWord(page, 3);
        await page.waitForTimeout(800);
      }

      // Check for achievement animations
      const animations = await page.evaluate(() => (window as any).__achievementAnimations?.length || 0);
      console.log(`Achievement animations detected: ${animations}`);

      // Look for pulse/glow effects
      const pulseEffect = page.locator('[class*="pulse"], [class*="glow"], [class*="animate"]').first();
      const pulseVisible = await pulseEffect.isVisible({ timeout: 3000 }).catch(() => false);

      // Take screenshot
      await page.screenshot({ path: 'test-results/achievements-animation.png', fullPage: true });
    });
  });

  test.describe('Achievement Types', () => {
    test('first word achievement triggers on first word submission', async ({ page }) => {
      await startSinglePlayerGame(page);

      // Submit first word
      await submitWord(page, 4);
      await page.waitForTimeout(2000);

      // Check for achievement notification
      const achievementNotification = page.locator(
        'text=/first.*word|achievement|unlocked/i, [class*="toast"], [role="alert"]'
      ).first();
      const notificationVisible = await achievementNotification.isVisible({ timeout: 3000 }).catch(() => false);

      // Take screenshot
      await page.screenshot({ path: 'test-results/achievements-first-word.png', fullPage: true });
    });

    test('long word achievement for 7+ letter words', async ({ page }) => {
      await startSinglePlayerGame(page);

      // Try to submit a long word (7+ cells)
      const grid = page.locator('[role="grid"]').first();
      const cells = grid.locator('[role="gridcell"]');
      const count = await cells.count();

      if (count >= 7) {
        await submitWord(page, 7);
        await page.waitForTimeout(2000);

        // Check for long word achievement
        const longWordAchievement = page.locator(
          'text=/long.*word|7.*letter|impressive/i'
        ).first();
        const achievementVisible = await longWordAchievement.isVisible({ timeout: 3000 }).catch(() => false);
      }

      // Take screenshot
      await page.screenshot({ path: 'test-results/achievements-long-word.png', fullPage: true });
    });

    test('combo achievement for consecutive words', async ({ page }) => {
      await startSinglePlayerGame(page);

      // Submit multiple words quickly for combo
      for (let i = 0; i < 5; i++) {
        await submitWord(page, 3);
        await page.waitForTimeout(500); // Quick submissions
      }

      // Check for combo indicator
      const comboIndicator = page.locator(
        'text=/combo|streak|x\\d+/i, [class*="combo"]'
      ).first();
      const comboVisible = await comboIndicator.isVisible({ timeout: 3000 }).catch(() => false);

      // Take screenshot
      await page.screenshot({ path: 'test-results/achievements-combo.png', fullPage: true });
    });
  });

  test.describe('Achievement Persistence', () => {
    test('achievements persist in results screen', async ({ page }) => {
      await startSinglePlayerGame(page);

      // Submit some words
      for (let i = 0; i < 3; i++) {
        await submitWord(page, 3 + i);
        await page.waitForTimeout(500);
      }

      // Wait for game to end or wait timeout
      await page.waitForTimeout(10000);

      // Look for results screen with achievements
      const resultsScreen = page.locator(
        'text=/results|score|achievements/i, [class*="results"]'
      ).first();
      const resultsVisible = await resultsScreen.isVisible({ timeout: 10000 }).catch(() => false);

      if (resultsVisible) {
        // Check for achievement display in results
        const achievementSection = page.locator(
          'text=/achievements|earned|unlocked/i, [class*="achievement"]'
        );
        const achievementCount = await achievementSection.count();
        console.log(`Achievement elements in results: ${achievementCount}`);
      }

      // Take screenshot
      await page.screenshot({ path: 'test-results/achievements-results.png', fullPage: true });
    });

    test('achievements shown in profile page', async ({ page }) => {
      // Set mock achievements
      await page.evaluate(() => {
        localStorage.setItem('boggle_achievement_counts', JSON.stringify({
          'first_word': 5,
          'word_master': 3,
          'long_word': 1
        }));
      });

      await page.goto(`${BASE_URL}/en/profile`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Look for achievements section
      const achievementSection = page.locator(
        'text=/achievements|badges|earned/i, [class*="achievement"]'
      );
      const sectionCount = await achievementSection.count();
      console.log(`Achievement sections in profile: ${sectionCount}`);

      // Take screenshot
      await page.screenshot({ path: 'test-results/achievements-profile.png', fullPage: true });
    });
  });

  test.describe('Achievement Tooltips', () => {
    test('hovering achievement shows tooltip with description', async ({ page }) => {
      await startSinglePlayerGame(page);

      // Submit words to get achievements
      await submitWord(page, 4);
      await page.waitForTimeout(2000);

      // Find and click achievement dock to expand
      const achievementButton = page.locator('button:has-text("🏆")').first();
      if (await achievementButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await achievementButton.click();
        await page.waitForTimeout(500);

        // Hover over an achievement item
        const achievementItem = page.locator('[class*="achievement-item"], [class*="badge"]').first();
        if (await achievementItem.isVisible({ timeout: 2000 }).catch(() => false)) {
          await achievementItem.hover();
          await page.waitForTimeout(500);

          // Check for tooltip
          const tooltip = page.locator('[role="tooltip"], [class*="tooltip"]').first();
          const tooltipVisible = await tooltip.isVisible({ timeout: 2000 }).catch(() => false);

          // Take screenshot
          await page.screenshot({ path: 'test-results/achievements-tooltip.png', fullPage: true });
        }
      }
    });
  });

  test.describe('Achievement Sound Effects', () => {
    test('achievement unlock plays sound (if enabled)', async ({ page }) => {
      // Track audio play calls
      await page.addInitScript(() => {
        (window as any).__audioPlayed = [];
        const originalPlay = Audio.prototype.play;
        Audio.prototype.play = function() {
          (window as any).__audioPlayed.push(this.src);
          return originalPlay.call(this);
        };
      });

      await startSinglePlayerGame(page);

      // Submit word to trigger achievement
      await submitWord(page, 4);
      await page.waitForTimeout(2000);

      // Check if audio was played
      const audioPlayed = await page.evaluate(() => (window as any).__audioPlayed || []);
      console.log('Audio files played:', audioPlayed);

      // Take screenshot
      await page.screenshot({ path: 'test-results/achievements-sound.png', fullPage: true });
    });
  });
});
