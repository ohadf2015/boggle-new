import { test, expect } from '@playwright/test';

/**
 * Manual landscape mode testing - simplified approach with detailed screenshots
 */

test.describe('Manual Landscape Mode Testing', () => {
  test('comprehensive landscape mode walkthrough', async ({ page }) => {
    // Set landscape viewport from the start
    await page.setViewportSize({ width: 844, height: 390 });

    // Clear localStorage to test first-time experience
    await page.goto('http://localhost:3001');
    await page.evaluate(() => localStorage.clear());

    console.log('Step 1: Navigating to home page...');
    await page.screenshot({ path: '/tmp/test-step-1-home.png', fullPage: true });

    // Navigate to single player
    await page.goto('http://localhost:3001/en/singleplayer');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    console.log('Step 2: Single player setup page...');
    await page.screenshot({ path: '/tmp/test-step-2-setup.png', fullPage: true });

    // Select practice mode
    const practiceButton = page.locator('text=PRACTICE, text=/practice/i').first();
    if (await practiceButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await practiceButton.click();
      await page.waitForTimeout(500);
      console.log('Step 3: Selected practice mode');
      await page.screenshot({ path: '/tmp/test-step-3-practice-selected.png', fullPage: true });
    }

    // Click start game
    const startButton = page.locator('button:has-text("START GAME"), button:has-text("Start")').first();
    if (await startButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startButton.click();
      await page.waitForTimeout(2000);
      console.log('Step 4: Started game');
      await page.screenshot({ path: '/tmp/test-step-4-game-started.png', fullPage: true });
    }

    // Check for tutorial overlay
    const tutorialVisible = await page.locator('text=/got it/i').isVisible({ timeout: 2000 }).catch(() => false);
    console.log('Tutorial visible:', tutorialVisible);

    if (tutorialVisible) {
      console.log('Step 5: Tutorial overlay detected');
      await page.screenshot({ path: '/tmp/test-step-5-tutorial.png', fullPage: true });

      // Dismiss tutorial
      await page.locator('button:has-text("Got it!")').click();
      await page.waitForTimeout(1000);
      console.log('Step 6: Tutorial dismissed');
      await page.screenshot({ path: '/tmp/test-step-6-tutorial-dismissed.png', fullPage: true });
    }

    // Capture game board layout
    console.log('Step 7: Analyzing game board layout');
    await page.screenshot({ path: '/tmp/test-step-7-game-layout.png', fullPage: true });

    // Get button positions
    const finishButton = page.locator('button:has-text("FINISH"), button[aria-label*="Finish"]').first();
    const quitButton = page.locator('button[aria-label*="Quit"]').first();

    const finishVisible = await finishButton.isVisible({ timeout: 1000 }).catch(() => false);
    const quitVisible = await quitButton.isVisible({ timeout: 1000 }).catch(() => false);

    console.log('Finish button visible:', finishVisible);
    console.log('Quit button visible:', quitVisible);

    if (finishVisible) {
      const box = await finishButton.boundingBox();
      console.log('Finish button position:', box);
    }

    if (quitVisible) {
      const box = await quitButton.boundingBox();
      console.log('Quit button position:', box);
    }

    // Test clicking quit
    if (quitVisible) {
      await quitButton.click();
      await page.waitForTimeout(1000);
      console.log('Step 8: Clicked quit button');
      await page.screenshot({ path: '/tmp/test-step-8-quit-clicked.png', fullPage: true });
    }
  });

  test('check for help button in landscape mode', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('http://localhost:3001/en/singleplayer');
    await page.evaluate(() => localStorage.setItem('landscape-tutorial-seen', 'true'));
    await page.waitForLoadState('networkidle');

    // Start game
    const practiceButton = page.locator('text=/practice/i').first();
    if (await practiceButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await practiceButton.click();
    }

    const startButton = page.locator('button:has-text("START GAME")').first();
    if (await startButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startButton.click();
      await page.waitForTimeout(2000);
    }

    // Look for help button
    const helpButton = page.locator('button[aria-label*="Help"]');
    const helpVisible = await helpButton.isVisible({ timeout: 2000 }).catch(() => false);

    console.log('Help button found:', helpVisible);
    await page.screenshot({ path: '/tmp/test-help-button-check.png', fullPage: true });

    if (helpVisible) {
      const helpBox = await helpButton.boundingBox();
      console.log('Help button position:', helpBox);
      console.log('Help button should be in top-right corner');

      const viewport = page.viewportSize();
      if (helpBox && viewport) {
        const isTopRight = helpBox.x > viewport.width / 2 && helpBox.y < viewport.height / 2;
        console.log('Help button in top-right:', isTopRight);
      }
    }
  });

  test('inspect all buttons and their properties', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('http://localhost:3001/en/singleplayer');
    await page.evaluate(() => localStorage.setItem('landscape-tutorial-seen', 'true'));
    await page.waitForLoadState('networkidle');

    // Start game
    const practiceButton = page.locator('text=/practice/i').first();
    if (await practiceButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await practiceButton.click();
    }

    const startButton = page.locator('button:has-text("START GAME")').first();
    if (await startButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startButton.click();
      await page.waitForTimeout(2000);
    }

    // Get all buttons
    const buttons = await page.locator('button').all();
    console.log(`Found ${buttons.length} buttons on page`);

    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      const isVisible = await button.isVisible().catch(() => false);

      if (isVisible) {
        const ariaLabel = await button.getAttribute('aria-label');
        const text = await button.textContent();
        const box = await button.boundingBox();

        console.log(`Button ${i}:`, {
          ariaLabel,
          text: text?.trim(),
          position: box,
          size: box ? `${box.width}x${box.height}` : 'unknown'
        });
      }
    }

    await page.screenshot({ path: '/tmp/test-all-buttons-inspection.png', fullPage: true });
  });
});
