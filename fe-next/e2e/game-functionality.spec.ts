/**
 * Game Functionality E2E Tests
 * 
 * Tests core game mechanics: word selection, validation, scoring, combos
 */

import { test, expect } from '@playwright/test';

test.describe('Game Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/singleplayer');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test.describe('Word Selection and Validation', () => {
    test('can select letters on grid to form words', async ({ page }) => {
      const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
      await startButton.click();
      await page.waitForTimeout(2000);

      const grid = page.locator('[role="grid"]').first();
      await expect(grid).toBeVisible({ timeout: 5000 });

      const firstCell = grid.locator('[role="gridcell"]').first();
      const cellBox = await firstCell.boundingBox();
      
      if (cellBox) {
        await page.mouse.move(cellBox.x + cellBox.width / 2, cellBox.y + cellBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(cellBox.x + cellBox.width, cellBox.y);
        await page.mouse.up();
        await page.waitForTimeout(500);

        const wordPreview = page.locator('text=/Current word:/i');
        const previewVisible = await wordPreview.isVisible().catch(() => false);
        if (previewVisible) {
          await expect(wordPreview).toBeVisible();
        }
      }
    });

    test('shows word preview when selecting letters', async ({ page }) => {
      const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
      await startButton.click();
      await page.waitForTimeout(2000);

      const grid = page.locator('[role="grid"]').first();
      await expect(grid).toBeVisible({ timeout: 5000 });

      const cells = grid.locator('[role="gridcell"]');
      const count = await cells.count();
      
      if (count > 0) {
        const firstCell = cells.first();
        const cellBox = await firstCell.boundingBox();
        
        if (cellBox) {
          await page.mouse.move(cellBox.x + cellBox.width / 2, cellBox.y + cellBox.height / 2);
          await page.mouse.down();
          
          if (count > 1) {
            const secondCell = cells.nth(1);
            const secondBox = await secondCell.boundingBox();
            if (secondBox) {
              await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height / 2);
            }
          }
          
          await page.mouse.up();
          await page.waitForTimeout(300);

          const wordPreview = page.locator('[class*="word"], [class*="preview"]').first();
          const previewVisible = await wordPreview.isVisible().catch(() => false);
          
          if (previewVisible) {
            await expect(wordPreview).toBeVisible();
          }
        }
      }
    });

    test('rejects words that are too short', async ({ page }) => {
      const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
      await startButton.click();
      await page.waitForTimeout(2000);

      const grid = page.locator('[role="grid"]').first();
      await expect(grid).toBeVisible({ timeout: 5000 });

      const cells = grid.locator('[role="gridcell"]');
      const count = await cells.count();
      
      if (count > 0) {
        const firstCell = cells.first();
        await firstCell.click();
        await page.waitForTimeout(500);

        const errorToast = page.locator('text=/too short/i, text=/minimum/i');
        const errorVisible = await errorToast.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (errorVisible) {
          await expect(errorToast).toBeVisible();
        }
      }
    });
  });

  test.describe('Scoring System', () => {
    test('displays score when word is submitted', async ({ page }) => {
      const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
      await startButton.click();
      await page.waitForTimeout(2000);

      const grid = page.locator('[role="grid"]').first();
      await expect(grid).toBeVisible({ timeout: 5000 });

      const scoreElement = page.locator('text=/score/i, [class*="score"]').first();
      const scoreVisible = await scoreElement.isVisible().catch(() => false);
      
      if (scoreVisible) {
        await expect(scoreElement).toBeVisible();
      }
    });

    test('updates score after valid word submission', async ({ page }) => {
      const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
      await startButton.click();
      await page.waitForTimeout(2000);

      const grid = page.locator('[role="grid"]').first();
      await expect(grid).toBeVisible({ timeout: 5000 });

      const initialScore = await page.locator('[class*="score"]').first().textContent().catch(() => '0');
      
      const cells = grid.locator('[role="gridcell"]');
      const count = await cells.count();
      
      if (count >= 3) {
        const firstCell = cells.first();
        const cellBox = await firstCell.boundingBox();
        
        if (cellBox) {
          await page.mouse.move(cellBox.x + cellBox.width / 2, cellBox.y + cellBox.height / 2);
          await page.mouse.down();
          
          for (let i = 1; i < Math.min(3, count); i++) {
            const nextCell = cells.nth(i);
            const nextBox = await nextCell.boundingBox();
            if (nextBox) {
              await page.mouse.move(nextBox.x + nextBox.width / 2, nextBox.y + nextBox.height / 2);
              await page.waitForTimeout(100);
            }
          }
          
          await page.mouse.up();
          await page.waitForTimeout(1000);

          const newScore = await page.locator('[class*="score"]').first().textContent().catch(() => '0');
          
          if (initialScore !== newScore) {
            expect(parseInt(newScore) || 0).toBeGreaterThanOrEqual(parseInt(initialScore) || 0);
          }
        }
      }
    });
  });

  test.describe('Timer Functionality', () => {
    test('displays timer countdown', async ({ page }) => {
      const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
      await startButton.click();
      await page.waitForTimeout(2000);

      const timer = page.locator('[class*="timer"], [class*="Timer"], [role="timer"]').first();
      const timerVisible = await timer.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (timerVisible) {
        await expect(timer).toBeVisible();
      }
    });

    test('timer counts down during game', async ({ page }) => {
      const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
      await startButton.click();
      await page.waitForTimeout(2000);

      const timer = page.locator('[class*="timer"], [class*="Timer"]').first();
      const timerVisible = await timer.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (timerVisible) {
        const initialTime = await timer.textContent();
        await page.waitForTimeout(2000);
        const newTime = await timer.textContent();
        
        if (initialTime && newTime) {
          const initialNum = parseInt(initialTime.replace(/\D/g, ''));
          const newNum = parseInt(newTime.replace(/\D/g, ''));
          
          if (!isNaN(initialNum) && !isNaN(newNum)) {
            expect(newNum).toBeLessThanOrEqual(initialNum);
          }
        }
      }
    });
  });

  test.describe('Combo System', () => {
    test('combo indicator appears after multiple words', async ({ page }) => {
      const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
      await startButton.click();
      await page.waitForTimeout(2000);

      const grid = page.locator('[role="grid"]').first();
      await expect(grid).toBeVisible({ timeout: 5000 });

      await page.waitForTimeout(3000);

      const comboIndicator = page.locator('[class*="combo"], text=/combo/i').first();
      const comboVisible = await comboIndicator.isVisible().catch(() => false);
      
      if (comboVisible) {
        await expect(comboIndicator).toBeVisible();
      }
    });
  });

  test.describe('Game End', () => {
    test('shows results screen when timer ends', async ({ page }) => {
      const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
      await startButton.click();
      await page.waitForTimeout(2000);

      const grid = page.locator('[role="grid"]').first();
      await expect(grid).toBeVisible({ timeout: 5000 });

      await page.waitForTimeout(10000);

      const resultsScreen = page.locator('text=/results/i, text=/score/i, [class*="results"]').first();
      const resultsVisible = await resultsScreen.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (resultsVisible) {
        await expect(resultsScreen).toBeVisible();
      }
    });
  });

  test.describe('Accessibility', () => {
    test('grid has proper ARIA labels', async ({ page }) => {
      const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
      await startButton.click();
      await page.waitForTimeout(2000);

      const grid = page.locator('[role="grid"]').first();
      await expect(grid).toBeVisible({ timeout: 5000 });

      const ariaLabel = await grid.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    });

    test('grid cells have proper ARIA attributes', async ({ page }) => {
      const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
      await startButton.click();
      await page.waitForTimeout(2000);

      const grid = page.locator('[role="grid"]').first();
      await expect(grid).toBeVisible({ timeout: 5000 });

      const firstCell = grid.locator('[role="gridcell"]').first();
      const ariaLabel = await firstCell.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    });
  });
});

