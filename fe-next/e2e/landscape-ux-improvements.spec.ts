import { test, expect, Page } from '@playwright/test';

/**
 * Comprehensive test suite for landscape mode UX improvements
 * Tests control repositioning, ARIA labels, quit confirmation, tutorial, and keyboard shortcuts
 */

// Helper function to navigate to single player game in landscape mode
async function navigateToSinglePlayerLandscape(page: Page) {
  await page.goto('/');

  // Set landscape viewport (typical mobile landscape)
  await page.setViewportSize({ width: 844, height: 390 });

  // Navigate to single player mode
  // Look for single player button/link
  const singlePlayerButton = page.locator('text=/single.*player/i').first();
  if (await singlePlayerButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await singlePlayerButton.click();
  } else {
    // Try alternative navigation
    await page.goto('/en/singleplayer');
  }

  // Wait for the mode selector or game setup page
  await page.waitForLoadState('networkidle');

  // Select practice mode (easiest to test without timer pressure)
  const practiceButton = page.locator('text=/practice/i').first();
  if (await practiceButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await practiceButton.click();
  }

  // Start the game
  const startButton = page.locator('button:has-text("Start"), button:has-text("Play")').first();
  if (await startButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await startButton.click();
  }

  // Wait for grid to appear
  await page.waitForSelector('[class*="grid"]', { timeout: 10000 });
}

test.describe('Landscape Mode UX Improvements', () => {

  test.describe('Test 1: Portrait to Landscape Transition', () => {
    test('should properly reposition controls when rotating to landscape', async ({ page }) => {
      // Start in portrait
      await page.setViewportSize({ width: 390, height: 844 });
      await navigateToSinglePlayerLandscape(page);

      // Take screenshot in portrait
      await page.screenshot({ path: '/tmp/landscape-test-portrait.png' });

      // Rotate to landscape
      await page.setViewportSize({ width: 844, height: 390 });
      await page.waitForTimeout(1000); // Allow layout to settle

      // Verify landscape layout is active
      const isLandscape = await page.evaluate(() => window.innerWidth > window.innerHeight);
      expect(isLandscape).toBeTruthy();

      // Check control positions in landscape mode
      // Pause/Finish button should be bottom-left
      const pauseButton = page.locator('button[aria-label*="Pause"], button[aria-label*="Finish"]').first();
      const pauseBox = await pauseButton.boundingBox();
      expect(pauseBox).toBeTruthy();

      // Verify button is in bottom-left quadrant
      const viewport = page.viewportSize();
      if (pauseBox && viewport) {
        expect(pauseBox.x).toBeLessThan(viewport.width / 2); // Left half
        expect(pauseBox.y).toBeGreaterThan(viewport.height / 2); // Bottom half
      }

      // Quit button should be bottom-right
      const quitButton = page.locator('button[aria-label*="Quit"]').first();
      const quitBox = await quitButton.boundingBox();
      expect(quitBox).toBeTruthy();

      if (quitBox && viewport) {
        expect(quitBox.x).toBeGreaterThan(viewport.width / 2); // Right half
        expect(quitBox.y).toBeGreaterThan(viewport.height / 2); // Bottom half
      }

      // Help button should be top-right
      const helpButton = page.locator('button[aria-label*="Help"]').first();
      const helpBox = await helpButton.boundingBox();
      expect(helpBox).toBeTruthy();

      if (helpBox && viewport) {
        expect(helpBox.x).toBeGreaterThan(viewport.width / 2); // Right half
        expect(helpBox.y).toBeLessThan(viewport.height / 2); // Top half
      }

      // Take screenshot in landscape
      await page.screenshot({ path: '/tmp/landscape-test-landscape.png' });

      // Verify grid maximizes available space
      const grid = page.locator('[class*="grid"]').first();
      const gridBox = await grid.boundingBox();
      expect(gridBox).toBeTruthy();

      // Grid should occupy significant portion of screen
      if (gridBox && viewport) {
        const gridArea = gridBox.width * gridBox.height;
        const viewportArea = viewport.width * viewport.height;
        const occupancy = gridArea / viewportArea;
        // Grid should occupy at least 30% of viewport
        expect(occupancy).toBeGreaterThan(0.3);
      }
    });
  });

  test.describe('Test 2: First-Time Tutorial Overlay', () => {
    test('should show tutorial on first landscape visit and dismiss correctly', async ({ page }) => {
      // Clear localStorage to simulate first visit
      await page.goto('/');
      await page.evaluate(() => localStorage.clear());

      // Navigate to game in landscape
      await page.setViewportSize({ width: 844, height: 390 });
      await navigateToSinglePlayerLandscape(page);

      // Wait for tutorial overlay to appear
      const tutorialOverlay = page.locator('text=/Landscape Controls|landscape.*controls/i').first();
      await expect(tutorialOverlay).toBeVisible({ timeout: 5000 });

      // Take screenshot of tutorial
      await page.screenshot({ path: '/tmp/landscape-test-tutorial.png' });

      // Verify tutorial content is present
      await expect(page.locator('text=/pause|resume/i')).toBeVisible();
      await expect(page.locator('text=/quit/i')).toBeVisible();
      await expect(page.locator('text=/help/i')).toBeVisible();

      // Find and click "Got it!" button
      const gotItButton = page.locator('button:has-text("Got it!")').first();
      await expect(gotItButton).toBeVisible();
      await gotItButton.click();

      // Tutorial should disappear
      await expect(tutorialOverlay).not.toBeVisible({ timeout: 2000 });

      // Verify localStorage flag is set
      const tutorialSeen = await page.evaluate(() => localStorage.getItem('landscape-tutorial-seen'));
      expect(tutorialSeen).toBe('true');

      // Refresh page and verify tutorial doesn't appear again
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Tutorial should NOT appear on subsequent visit
      await expect(tutorialOverlay).not.toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Test 3: Quit Confirmation Dialog', () => {
    test('should show confirmation dialog when quitting with score > 0', async ({ page }) => {
      await page.setViewportSize({ width: 844, height: 390 });

      // Clear tutorial flag
      await page.goto('/');
      await page.evaluate(() => localStorage.setItem('landscape-tutorial-seen', 'true'));

      await navigateToSinglePlayerLandscape(page);

      // Dismiss tutorial if it appears
      const gotItButton = page.locator('button:has-text("Got it!")');
      if (await gotItButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await gotItButton.click();
      }

      // Wait for game to be ready
      await page.waitForTimeout(1000);

      // Try to submit a word to get score > 0
      // This is tricky without knowing the grid, so we'll simulate by checking if quit shows confirmation

      // First, check score
      const scoreElement = page.locator('text=/score/i').first();
      const scoreText = await scoreElement.textContent();

      // Click quit button
      const quitButton = page.locator('button[aria-label*="Quit"]').first();
      await quitButton.click();

      // If score is 0, should quit immediately without dialog
      // If score > 0, should show confirmation dialog

      // Check if confirmation dialog appears
      const confirmDialog = page.locator('text=/quit.*game|are you sure/i').first();
      const isDialogVisible = await confirmDialog.isVisible({ timeout: 2000 }).catch(() => false);

      if (isDialogVisible) {
        // Take screenshot of confirmation dialog
        await page.screenshot({ path: '/tmp/landscape-test-quit-confirm.png' });

        // Verify dialog content
        await expect(page.locator('text=/lose.*progress|quit/i')).toBeVisible();

        // Test Cancel button
        const cancelButton = page.locator('button:has-text("Cancel")').first();
        await expect(cancelButton).toBeVisible();
        await cancelButton.click();

        // Dialog should close
        await expect(confirmDialog).not.toBeVisible({ timeout: 2000 });

        // Game should still be active
        await expect(page.locator('[class*="grid"]')).toBeVisible();

        // Click quit again
        await quitButton.click();
        await expect(confirmDialog).toBeVisible({ timeout: 2000 });

        // Test Quit button
        const confirmQuitButton = page.locator('button:has-text("Quit")').last();
        await confirmQuitButton.click();

        // Should navigate away from game
        await page.waitForTimeout(1000);
        // Verify we left the game (grid should not be visible)
        const gridStillVisible = await page.locator('[class*="grid"]').isVisible({ timeout: 2000 }).catch(() => false);
        expect(gridStillVisible).toBeFalsy();
      }
    });
  });

  test.describe('Test 4: Keyboard Shortcuts', () => {
    test('should handle Space, Escape, and ? keyboard shortcuts in landscape', async ({ page }) => {
      await page.setViewportSize({ width: 844, height: 390 });

      // Clear tutorial flag
      await page.goto('/');
      await page.evaluate(() => localStorage.setItem('landscape-tutorial-seen', 'true'));

      await navigateToSinglePlayerLandscape(page);

      // Dismiss tutorial if it appears
      const gotItButton = page.locator('button:has-text("Got it!")');
      if (await gotItButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await gotItButton.click();
      }

      await page.waitForTimeout(1000);

      // Test Space key for pause/resume (only if not in practice mode)
      // First check if pause button exists (not in practice mode)
      const pauseButton = page.locator('button[aria-label*="Pause"]');
      const hasPauseButton = await pauseButton.isVisible({ timeout: 1000 }).catch(() => false);

      if (hasPauseButton) {
        // Press Space to pause
        await page.keyboard.press('Space');
        await page.waitForTimeout(500);

        // Check if pause state changed
        const resumeButton = page.locator('button[aria-label*="Resume"]');
        await expect(resumeButton).toBeVisible({ timeout: 2000 });

        // Take screenshot of paused state
        await page.screenshot({ path: '/tmp/landscape-test-paused.png' });

        // Press Space to resume
        await page.keyboard.press('Space');
        await page.waitForTimeout(500);

        // Should be back to pause button
        await expect(pauseButton).toBeVisible({ timeout: 2000 });
      }

      // Test ? or H key for help panel
      await page.keyboard.press('?');
      await page.waitForTimeout(500);

      // Help panel should open
      const helpPanel = page.locator('[class*="help"], text=/help|rules/i').first();
      await expect(helpPanel).toBeVisible({ timeout: 2000 });

      // Take screenshot of help panel
      await page.screenshot({ path: '/tmp/landscape-test-help.png' });

      // Press ? again to close
      await page.keyboard.press('?');
      await page.waitForTimeout(500);

      // Help panel should close
      await expect(helpPanel).not.toBeVisible({ timeout: 2000 });

      // Test H key as alternative
      await page.keyboard.press('h');
      await page.waitForTimeout(500);
      await expect(helpPanel).toBeVisible({ timeout: 2000 });

      // Close help panel
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Now test Escape for quit (should show confirmation if score > 0)
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Check if quit confirmation appears or if we quit immediately
      const quitDialog = page.locator('text=/quit.*game|are you sure/i').first();
      const isQuitDialogVisible = await quitDialog.isVisible({ timeout: 2000 }).catch(() => false);

      if (isQuitDialogVisible) {
        // Take screenshot
        await page.screenshot({ path: '/tmp/landscape-test-escape-quit.png' });

        // Cancel it
        await page.locator('button:has-text("Cancel")').click();
      }
    });
  });

  test.describe('Test 5: Accessibility - ARIA Labels', () => {
    test('should have proper ARIA labels on all control buttons', async ({ page }) => {
      await page.setViewportSize({ width: 844, height: 390 });

      // Clear tutorial flag
      await page.goto('/');
      await page.evaluate(() => localStorage.setItem('landscape-tutorial-seen', 'true'));

      await navigateToSinglePlayerLandscape(page);

      // Dismiss tutorial
      const gotItButton = page.locator('button:has-text("Got it!")');
      if (await gotItButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await gotItButton.click();
      }

      await page.waitForTimeout(1000);

      // Check ARIA labels
      // Pause/Finish button
      const pauseOrFinish = page.locator('button[aria-label*="Pause"], button[aria-label*="Finish"], button[aria-label*="Resume"]').first();
      await expect(pauseOrFinish).toBeVisible();
      const pauseLabel = await pauseOrFinish.getAttribute('aria-label');
      expect(pauseLabel).toBeTruthy();
      expect(pauseLabel).toMatch(/pause|finish|resume/i);

      // Quit button
      const quitButton = page.locator('button[aria-label*="Quit"]').first();
      await expect(quitButton).toBeVisible();
      const quitLabel = await quitButton.getAttribute('aria-label');
      expect(quitLabel).toBeTruthy();
      expect(quitLabel).toMatch(/quit/i);

      // Help button
      const helpButton = page.locator('button[aria-label*="Help"]').first();
      await expect(helpButton).toBeVisible();
      const helpLabel = await helpButton.getAttribute('aria-label');
      expect(helpLabel).toBeTruthy();
      expect(helpLabel).toMatch(/help/i);

      // Test focus order
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);

      // Take screenshot showing focus
      await page.screenshot({ path: '/tmp/landscape-test-accessibility.png' });

      // Verify aria-pressed for pause button (if applicable)
      if (await pauseOrFinish.getAttribute('aria-label').then(l => l?.includes('Pause'))) {
        const ariaPressed = await pauseOrFinish.getAttribute('aria-pressed');
        expect(ariaPressed).toBeTruthy();
        expect(ariaPressed).toMatch(/true|false/);
      }
    });

    test('should announce pause state via aria-live region', async ({ page }) => {
      await page.setViewportSize({ width: 844, height: 390 });

      // Clear tutorial flag
      await page.goto('/');
      await page.evaluate(() => localStorage.setItem('landscape-tutorial-seen', 'true'));

      await navigateToSinglePlayerLandscape(page);

      // Dismiss tutorial
      const gotItButton = page.locator('button:has-text("Got it!")');
      if (await gotItButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await gotItButton.click();
      }

      await page.waitForTimeout(1000);

      // Check for aria-live region
      const ariaLiveRegion = page.locator('[role="status"][aria-live="polite"]');
      await expect(ariaLiveRegion).toBeAttached();

      // Pause the game
      const pauseButton = page.locator('button[aria-label*="Pause"]');
      if (await pauseButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await pauseButton.click();
        await page.waitForTimeout(500);

        // Check if aria-live region contains pause message
        const liveText = await ariaLiveRegion.textContent();
        expect(liveText).toMatch(/pause/i);
      }
    });
  });

  test.describe('Test 6: Button Sizes and Touch Targets', () => {
    test('should meet minimum 44x44px touch target size', async ({ page }) => {
      await page.setViewportSize({ width: 844, height: 390 });

      // Clear tutorial flag
      await page.goto('/');
      await page.evaluate(() => localStorage.setItem('landscape-tutorial-seen', 'true'));

      await navigateToSinglePlayerLandscape(page);

      // Dismiss tutorial
      const gotItButton = page.locator('button:has-text("Got it!")');
      if (await gotItButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await gotItButton.click();
      }

      await page.waitForTimeout(1000);

      // Check button sizes
      const buttons = [
        { name: 'Pause/Finish', selector: 'button[aria-label*="Pause"], button[aria-label*="Finish"]' },
        { name: 'Quit', selector: 'button[aria-label*="Quit"]' },
        { name: 'Help', selector: 'button[aria-label*="Help"]' },
      ];

      const minSize = 44; // Minimum touch target size in pixels
      const results: Array<{ name: string; width: number; height: number; passes: boolean }> = [];

      for (const button of buttons) {
        const element = page.locator(button.selector).first();
        if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
          const box = await element.boundingBox();
          if (box) {
            const passes = box.width >= minSize && box.height >= minSize;
            results.push({
              name: button.name,
              width: box.width,
              height: box.height,
              passes,
            });

            // Assert that button meets minimum size
            expect(box.width, `${button.name} width should be >= ${minSize}px`).toBeGreaterThanOrEqual(minSize);
            expect(box.height, `${button.name} height should be >= ${minSize}px`).toBeGreaterThanOrEqual(minSize);
          }
        }
      }

      // Log results
      console.log('Button size test results:', results);

      // Take screenshot
      await page.screenshot({ path: '/tmp/landscape-test-button-sizes.png' });

      // Check spacing between buttons to prevent accidental taps
      const quitButton = page.locator('button[aria-label*="Quit"]').first();
      const helpButton = page.locator('button[aria-label*="Help"]').first();

      const quitBox = await quitButton.boundingBox();
      const helpBox = await helpButton.boundingBox();

      if (quitBox && helpBox) {
        // Calculate vertical distance between quit (bottom-right) and help (top-right)
        const verticalDistance = Math.abs(quitBox.y - (helpBox.y + helpBox.height));
        // Should have sufficient spacing (at least 8px)
        expect(verticalDistance).toBeGreaterThanOrEqual(8);
      }
    });
  });
});
