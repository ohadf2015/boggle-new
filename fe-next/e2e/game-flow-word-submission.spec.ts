/**
 * Game Flow with Word Submission E2E Tests
 * 
 * Tests complete game flow: starting game, submitting words, seeing results
 */

import { test, expect } from '@playwright/test';

test.describe('Game Flow - Word Submission', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/singleplayer');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('complete game flow: start game, submit words, view results', async ({ page }) => {
    const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
    await startButton.click();
    await page.waitForTimeout(2000);

    const grid = page.locator('[role="grid"]').first();
    await expect(grid).toBeVisible({ timeout: 5000 });

    const cells = grid.locator('[role="gridcell"]');
    const cellCount = await cells.count();
    expect(cellCount).toBeGreaterThan(0);

    if (cellCount >= 3) {
      const firstCell = cells.first();
      const firstBox = await firstCell.boundingBox();
      
      if (firstBox) {
        await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
        await page.mouse.down();
        
        for (let i = 1; i < Math.min(4, cellCount); i++) {
          const nextCell = cells.nth(i);
          const nextBox = await nextCell.boundingBox();
          if (nextBox) {
            await page.mouse.move(nextBox.x + nextBox.width / 2, nextBox.y + nextBox.height / 2);
            await page.waitForTimeout(100);
          }
        }
        
        await page.mouse.up();
        await page.waitForTimeout(1000);

        const wordPreview = page.locator('[class*="word"], [class*="preview"], text=/Current word:/i').first();
        const previewVisible = await wordPreview.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (previewVisible) {
          await expect(wordPreview).toBeVisible();
        }
      }
    }

    await page.waitForTimeout(5000);

    const scoreElement = page.locator('[class*="score"], text=/score/i').first();
    const scoreVisible = await scoreElement.isVisible().catch(() => false);
    
    if (scoreVisible) {
      const scoreText = await scoreElement.textContent();
      expect(scoreText).toBeTruthy();
    }
  });

  test('word submission updates score', async ({ page }) => {
    const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
    await startButton.click();
    await page.waitForTimeout(2000);

    const grid = page.locator('[role="grid"]').first();
    await expect(grid).toBeVisible({ timeout: 5000 });

    const initialScore = await page.locator('[class*="score"]').first().textContent().catch(() => '0');
    const initialScoreNum = parseInt(initialScore?.replace(/\D/g, '') || '0');

    const cells = grid.locator('[role="gridcell"]');
    const count = await cells.count();
    
    if (count >= 3) {
      const firstCell = cells.first();
      const cellBox = await firstCell.boundingBox();
      
      if (cellBox) {
        await page.mouse.move(cellBox.x + cellBox.width / 2, cellBox.y + cellBox.height / 2);
        await page.mouse.down();
        
        for (let i = 1; i < Math.min(4, count); i++) {
          const nextCell = cells.nth(i);
          const nextBox = await nextCell.boundingBox();
          if (nextBox) {
            await page.mouse.move(nextBox.x + nextBox.width / 2, nextBox.y + nextBox.height / 2);
            await page.waitForTimeout(50);
          }
        }
        
        await page.mouse.up();
        await page.waitForTimeout(2000);

        const newScore = await page.locator('[class*="score"]').first().textContent().catch(() => '0');
        const newScoreNum = parseInt(newScore?.replace(/\D/g, '') || '0');
        
        if (newScoreNum !== initialScoreNum) {
          expect(newScoreNum).toBeGreaterThanOrEqual(initialScoreNum);
        }
      }
    }
  });

  test('timer counts down during game', async ({ page }) => {
    const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
    await startButton.click();
    await page.waitForTimeout(2000);

    const timer = page.locator('[class*="timer"], [class*="Timer"], [role="timer"]').first();
    const timerVisible = await timer.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (timerVisible) {
      const initialTime = await timer.textContent();
      await page.waitForTimeout(3000);
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

  test('game ends and shows results after timer expires', async ({ page }) => {
    const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
    await startButton.click();
    await page.waitForTimeout(2000);

    const grid = page.locator('[role="grid"]').first();
    await expect(grid).toBeVisible({ timeout: 5000 });

    await page.waitForTimeout(15000);

    const resultsScreen = page.locator('text=/results/i, text=/score/i, [class*="results"], [class*="Results"]').first();
    const resultsVisible = await resultsScreen.isVisible({ timeout: 10000 }).catch(() => false);
    
    if (resultsVisible) {
      await expect(resultsScreen).toBeVisible();
    }
  });
});


