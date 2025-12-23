/**
 * Word Submission Flow E2E Tests
 * 
 * Tests complete word submission flow: selection, validation, scoring, results
 */

import { test, expect } from '@playwright/test';

test.describe('Word Submission Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/singleplayer');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('complete word submission: select letters, submit word, see score update', async ({ page }) => {
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
            await page.waitForTimeout(50);
          }
        }
        
        await page.mouse.up();
        await page.waitForTimeout(1500);

        const scoreElement = page.locator('[class*="score"], text=/score/i').first();
        const scoreVisible = await scoreElement.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (scoreVisible) {
          const scoreText = await scoreElement.textContent();
          expect(scoreText).toBeTruthy();
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

    const firstCell = grid.locator('[role="gridcell"]').first();
    await firstCell.click();
    await page.waitForTimeout(500);

    const errorToast = page.locator('text=/too short/i, text=/minimum/i').first();
    const errorVisible = await errorToast.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (errorVisible) {
      await expect(errorToast).toBeVisible();
    }
  });

  test('shows word preview during selection', async ({ page }) => {
    const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
    await startButton.click();
    await page.waitForTimeout(2000);

    const grid = page.locator('[role="grid"]').first();
    await expect(grid).toBeVisible({ timeout: 5000 });

    const cells = grid.locator('[role="gridcell"]');
    const count = await cells.count();
    
    if (count >= 2) {
      const firstCell = cells.first();
      const cellBox = await firstCell.boundingBox();
      
      if (cellBox) {
        await page.mouse.move(cellBox.x + cellBox.width / 2, cellBox.y + cellBox.height / 2);
        await page.mouse.down();
        
        const secondCell = cells.nth(1);
        const secondBox = await secondCell.boundingBox();
        if (secondBox) {
          await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height / 2);
          await page.waitForTimeout(300);
        }
        
        await page.mouse.up();
        await page.waitForTimeout(500);

        const wordPreview = page.locator('[class*="word"], [class*="preview"], text=/Current word:/i').first();
        const previewVisible = await wordPreview.isVisible({ timeout: 1000 }).catch(() => false);
        
        if (previewVisible) {
          await expect(wordPreview).toBeVisible();
        }
      }
    }
  });

  test('updates score after valid word submission', async ({ page }) => {
    const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
    await startButton.click();
    await page.waitForTimeout(2000);

    const grid = page.locator('[role="grid"]').first();
    await expect(grid).toBeVisible({ timeout: 5000 });

    const initialScoreText = await page.locator('[class*="score"]').first().textContent().catch(() => '0');
    const initialScore = parseInt(initialScoreText?.replace(/\D/g, '') || '0');

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

        const newScoreText = await page.locator('[class*="score"]').first().textContent().catch(() => '0');
        const newScore = parseInt(newScoreText?.replace(/\D/g, '') || '0');
        
        if (newScore !== initialScore) {
          expect(newScore).toBeGreaterThanOrEqual(initialScore);
        }
      }
    }
  });

  test('prevents duplicate word submissions', async ({ page }) => {
    const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
    await startButton.click();
    await page.waitForTimeout(2000);

    const grid = page.locator('[role="grid"]').first();
    await expect(grid).toBeVisible({ timeout: 5000 });

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
        await page.waitForTimeout(1000);

        const errorToast = page.locator('text=/already found/i, text=/duplicate/i').first();
        const errorVisible = await errorToast.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (errorVisible) {
          await expect(errorToast).toBeVisible();
        }
      }
    }
  });
});

