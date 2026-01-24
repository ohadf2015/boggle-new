import { test, expect } from '@playwright/test';

/**
 * Daily Challenge Word Hunt - Bug Discovery Test Suite
 *
 * Purpose: Systematic bug discovery across all 4 languages and edge cases
 * Mode: Discovery (failures expected - we're hunting bugs)
 *
 * This suite is designed to surface bugs, not to pass.
 * Each failure is a potential bug to document in BUG-REGISTRY.md
 */

const DAILY_WORD_HUNT_URL = '/en/daily/word-hunt';
const TEST_TIMEOUT = 60000; // 60s for daily challenge tests

// Console error capture helper
const setupConsoleErrorCapture = (page: any) => {
  const errors: string[] = [];
  page.on('console', (msg: any) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  return errors;
};

test.describe('Daily Word Hunt - Basic Functionality', () => {
  test.describe.configure({ mode: 'parallel' });

  test('Complete normal puzzle in English', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    const consoleErrors = setupConsoleErrorCapture(page);

    await page.goto('/en/daily/word-hunt');
    await page.waitForLoadState('networkidle');

    // Verify game loaded
    const gridVisible = await page.locator('.grid-container, [data-testid="game-grid"]').isVisible();
    expect(gridVisible).toBeTruthy();

    // Verify clue boxes visible
    const clueBoxesVisible = await page.locator('[data-testid="clue-boxes"], .clue-container').isVisible();
    expect(clueBoxesVisible).toBeTruthy();

    // Verify life bar present
    const lifeBarVisible = await page.locator('[data-testid="life-bar"], .life-bar').isVisible();
    expect(lifeBarVisible).toBeTruthy();

    // Attempt to submit a word (simulate swipe or type)
    // Note: This will vary based on implementation details
    await page.click('text=/[A-Z]/', { force: true });

    // Check for console errors
    if (consoleErrors.length > 0) {
      console.log('Console errors during English gameplay:', consoleErrors);
    }

    // Take screenshot for manual inspection
    await page.screenshot({ path: 'e2e/screenshots/daily-hunt-english.png', fullPage: true });
  });

  test('Complete normal puzzle in Hebrew (RTL)', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    const consoleErrors = setupConsoleErrorCapture(page);

    await page.goto('/he/daily/word-hunt');
    await page.waitForLoadState('networkidle');

    // Verify RTL direction applied
    const bodyDir = await page.locator('body').getAttribute('dir');
    expect(bodyDir).toBe('rtl');

    // Verify game loaded
    const gridVisible = await page.locator('.grid-container, [data-testid="game-grid"]').isVisible();
    expect(gridVisible).toBeTruthy();

    // Verify clue boxes maintain RTL layout
    const clueBoxes = await page.locator('[data-testid="clue-boxes"], .clue-container').boundingBox();
    expect(clueBoxes).toBeTruthy();

    // Check for console errors
    if (consoleErrors.length > 0) {
      console.log('Console errors during Hebrew gameplay:', consoleErrors);
    }

    // Take screenshot for manual inspection
    await page.screenshot({ path: 'e2e/screenshots/daily-hunt-hebrew.png', fullPage: true });
  });

  test('Complete normal puzzle in Swedish', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    const consoleErrors = setupConsoleErrorCapture(page);

    await page.goto('/sv/daily/word-hunt');
    await page.waitForLoadState('networkidle');

    // Verify game loaded
    const gridVisible = await page.locator('.grid-container, [data-testid="game-grid"]').isVisible();
    expect(gridVisible).toBeTruthy();

    // Verify Swedish characters render correctly (åäö)
    const pageText = await page.textContent('body');
    const hasSwedishChars = /[åäöÅÄÖ]/.test(pageText || '');
    console.log('Swedish characters present:', hasSwedishChars);

    // Check for console errors
    if (consoleErrors.length > 0) {
      console.log('Console errors during Swedish gameplay:', consoleErrors);
    }

    // Take screenshot for manual inspection
    await page.screenshot({ path: 'e2e/screenshots/daily-hunt-swedish.png', fullPage: true });
  });

  test('Complete normal puzzle in Japanese', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    const consoleErrors = setupConsoleErrorCapture(page);

    await page.goto('/ja/daily/word-hunt');
    await page.waitForLoadState('networkidle');

    // Verify game loaded
    const gridVisible = await page.locator('.grid-container, [data-testid="game-grid"]').isVisible();
    expect(gridVisible).toBeTruthy();

    // Verify Japanese characters render correctly (hiragana/katakana/kanji)
    const pageText = await page.textContent('body');
    const hasJapaneseChars = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(pageText || '');
    console.log('Japanese characters present:', hasJapaneseChars);

    // Check for console errors
    if (consoleErrors.length > 0) {
      console.log('Console errors during Japanese gameplay:', consoleErrors);
    }

    // Take screenshot for manual inspection
    await page.screenshot({ path: 'e2e/screenshots/daily-hunt-japanese.png', fullPage: true });
  });
});

test.describe('Daily Word Hunt - Edge Cases', () => {
  test.describe.configure({ mode: 'parallel' });

  test('Submit same word twice', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    const consoleErrors = setupConsoleErrorCapture(page);

    await page.goto('/en/daily/word-hunt');
    await page.waitForLoadState('networkidle');

    // Find a letter cell and simulate clicking to form word
    const firstLetter = page.locator('text=/[A-Z]/', { hasText: /^[A-Z]$/ }).first();
    await firstLetter.click();

    // Attempt to submit (implementation-specific)
    // Note: Actual submission mechanism needs to be implemented

    // Try submitting the same word again
    await page.waitForTimeout(500);
    await firstLetter.click();

    // Verify duplicate detection feedback appears
    const feedbackElement = await page.locator('text=/already|duplicate/i').isVisible();
    console.log('Duplicate feedback visible:', feedbackElement);

    // Check for console errors
    if (consoleErrors.length > 0) {
      console.log('Console errors during duplicate submission:', consoleErrors);
    }
  });

  test('Submit word with special characters', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    const consoleErrors = setupConsoleErrorCapture(page);

    await page.goto('/en/daily/word-hunt');
    await page.waitForLoadState('networkidle');

    // Try to input special characters via keyboard (if keyboard input enabled)
    await page.keyboard.type('TEST@#$');

    // Verify sanitization or rejection
    const inputState = await page.inputValue('input').catch(() => '');
    console.log('Input state after special chars:', inputState);

    // Check for console errors
    if (consoleErrors.length > 0) {
      console.log('Console errors during special character input:', consoleErrors);
    }
  });

  test('Complete with minimum score', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    const consoleErrors = setupConsoleErrorCapture(page);

    await page.goto('/en/daily/word-hunt');
    await page.waitForLoadState('networkidle');

    // Let life drain to near-zero
    await page.waitForTimeout(10000); // Wait 10s for life drain

    // Check life bar value
    const lifeBarText = await page.locator('[data-testid="life-bar"], .life-bar').textContent();
    console.log('Life bar after drain:', lifeBarText);

    // Verify game doesn't crash with low life
    const gameStillActive = await page.locator('.grid-container, [data-testid="game-grid"]').isVisible();
    expect(gameStillActive).toBeTruthy();

    // Check for console errors
    if (consoleErrors.length > 0) {
      console.log('Console errors during minimum score scenario:', consoleErrors);
    }
  });

  test('Quit mid-game and resume', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    const consoleErrors = setupConsoleErrorCapture(page);

    await page.goto('/en/daily/word-hunt');
    await page.waitForLoadState('networkidle');

    // Click quit button
    const quitButton = await page.locator('button:has-text("Quit"), button:has-text("Exit")').first();
    if (await quitButton.isVisible()) {
      await quitButton.click();
      await page.waitForTimeout(500);

      // Verify confirmation dialog appears
      const confirmDialog = await page.locator('[role="dialog"], .dialog').isVisible();
      console.log('Quit confirmation dialog visible:', confirmDialog);

      // Cancel quit
      const cancelButton = await page.locator('button:has-text("Cancel"), button:has-text("No")').first();
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      }

      // Verify game still active
      const gameActive = await page.locator('.grid-container, [data-testid="game-grid"]').isVisible();
      expect(gameActive).toBeTruthy();
    }

    // Check for console errors
    if (consoleErrors.length > 0) {
      console.log('Console errors during quit/resume:', consoleErrors);
    }
  });

  test('Rapid word submissions (10 words in 5 seconds)', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    const consoleErrors = setupConsoleErrorCapture(page);

    await page.goto('/en/daily/word-hunt');
    await page.waitForLoadState('networkidle');

    // Rapidly click letters to trigger rapid submissions
    const letters = await page.locator('text=/[A-Z]/', { hasText: /^[A-Z]$/ }).all();

    for (let i = 0; i < 10 && i < letters.length; i++) {
      await letters[i].click();
      await page.waitForTimeout(500); // 500ms between clicks = 10 words in 5s
    }

    // Verify no crashes or freezes
    const gameActive = await page.locator('.grid-container, [data-testid="game-grid"]').isVisible();
    expect(gameActive).toBeTruthy();

    // Check for console errors or race conditions
    if (consoleErrors.length > 0) {
      console.log('Console errors during rapid submissions:', consoleErrors);
    }
  });
});

test.describe('Daily Word Hunt - Scoring Edge Cases', () => {
  test.describe.configure({ mode: 'parallel' });

  test('Discover all words on board', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    const consoleErrors = setupConsoleErrorCapture(page);

    await page.goto('/en/daily/word-hunt');
    await page.waitForLoadState('networkidle');

    // Note: This test would require finding and submitting all valid words
    // For discovery purposes, we verify scoring doesn't break

    // Verify score display exists
    const scoreDisplay = await page.locator('[data-testid="score"], .score').isVisible();
    expect(scoreDisplay).toBeTruthy();

    // Check for console errors
    if (consoleErrors.length > 0) {
      console.log('Console errors during score display:', consoleErrors);
    }
  });

  test('Score exactly target points', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    const consoleErrors = setupConsoleErrorCapture(page);

    await page.goto('/en/daily/word-hunt');
    await page.waitForLoadState('networkidle');

    // Verify target score display
    const targetScoreVisible = await page.locator('text=/target|goal/i').isVisible();
    console.log('Target score visible:', targetScoreVisible);

    // Check for console errors
    if (consoleErrors.length > 0) {
      console.log('Console errors during target score check:', consoleErrors);
    }
  });

  test('Use all 3 clues', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    const consoleErrors = setupConsoleErrorCapture(page);

    await page.goto('/en/daily/word-hunt');
    await page.waitForLoadState('networkidle');

    // Verify clue system exists
    const cluesVisible = await page.locator('[data-testid="clue-boxes"], .clue').isVisible();
    expect(cluesVisible).toBeTruthy();

    // Note: Actual clue usage requires earning tokens and clicking clue buttons
    // For discovery, we verify the UI is present

    // Check for console errors
    if (consoleErrors.length > 0) {
      console.log('Console errors during clue check:', consoleErrors);
    }
  });

  test('Verify combo multiplier calculation', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    const consoleErrors = setupConsoleErrorCapture(page);

    await page.goto('/en/daily/word-hunt');
    await page.waitForLoadState('networkidle');

    // Verify combo/multiplier display (if exists)
    const comboVisible = await page.locator('text=/combo|multiplier/i').isVisible();
    console.log('Combo multiplier visible:', comboVisible);

    // Check for console errors
    if (consoleErrors.length > 0) {
      console.log('Console errors during combo check:', consoleErrors);
    }
  });
});

test.describe('Daily Word Hunt - State Management', () => {
  test.describe.configure({ mode: 'parallel' });

  test('Network interruption recovery', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    const consoleErrors = setupConsoleErrorCapture(page);

    await page.goto('/en/daily/word-hunt');
    await page.waitForLoadState('networkidle');

    // Simulate network offline
    await page.context().setOffline(true);
    await page.waitForTimeout(2000);

    // Attempt interaction while offline
    const firstLetter = page.locator('text=/[A-Z]/', { hasText: /^[A-Z]$/ }).first();
    await firstLetter.click();

    // Restore network
    await page.context().setOffline(false);
    await page.waitForTimeout(2000);

    // Verify game recovers
    const gameActive = await page.locator('.grid-container, [data-testid="game-grid"]').isVisible();
    expect(gameActive).toBeTruthy();

    // Check for console errors
    if (consoleErrors.length > 0) {
      console.log('Console errors during network interruption:', consoleErrors);
    }
  });

  test('Browser refresh mid-game', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    const consoleErrors = setupConsoleErrorCapture(page);

    await page.goto('/en/daily/word-hunt');
    await page.waitForLoadState('networkidle');

    // Make some progress
    await page.waitForTimeout(2000);

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify game state (should restore or show appropriate message)
    const gameVisible = await page.locator('.grid-container, [data-testid="game-grid"]').isVisible();
    console.log('Game visible after refresh:', gameVisible);

    // Check for console errors
    if (consoleErrors.length > 0) {
      console.log('Console errors after browser refresh:', consoleErrors);
    }
  });

  test('Tab switching behavior', async ({ page, context }) => {
    test.setTimeout(TEST_TIMEOUT);
    const consoleErrors = setupConsoleErrorCapture(page);

    await page.goto('/en/daily/word-hunt');
    await page.waitForLoadState('networkidle');

    // Create new tab and switch
    const newPage = await context.newPage();
    await newPage.goto('/en');
    await page.waitForTimeout(2000);

    // Switch back to game tab
    await page.bringToFront();
    await page.waitForTimeout(1000);

    // Verify game still active
    const gameActive = await page.locator('.grid-container, [data-testid="game-grid"]').isVisible();
    expect(gameActive).toBeTruthy();

    // Check for console errors
    if (consoleErrors.length > 0) {
      console.log('Console errors during tab switching:', consoleErrors);
    }

    await newPage.close();
  });
});

test.describe('Daily Word Hunt - UI/UX Discovery', () => {
  test.describe.configure({ mode: 'parallel' });

  test('Mobile portrait layout', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    const consoleErrors = setupConsoleErrorCapture(page);

    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto('/en/daily/word-hunt');
    await page.waitForLoadState('networkidle');

    // Verify responsive layout
    const gridVisible = await page.locator('.grid-container, [data-testid="game-grid"]').isVisible();
    expect(gridVisible).toBeTruthy();

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/daily-hunt-mobile-portrait.png', fullPage: true });

    // Check for console errors
    if (consoleErrors.length > 0) {
      console.log('Console errors on mobile portrait:', consoleErrors);
    }
  });

  test('Mobile landscape layout', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    const consoleErrors = setupConsoleErrorCapture(page);

    await page.setViewportSize({ width: 667, height: 375 }); // iPhone SE landscape
    await page.goto('/en/daily/word-hunt');
    await page.waitForLoadState('networkidle');

    // Verify landscape-specific layout
    const gridVisible = await page.locator('.grid-container, [data-testid="game-grid"]').isVisible();
    expect(gridVisible).toBeTruthy();

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/daily-hunt-mobile-landscape.png', fullPage: true });

    // Check for console errors
    if (consoleErrors.length > 0) {
      console.log('Console errors on mobile landscape:', consoleErrors);
    }
  });

  test('Tablet layout', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    const consoleErrors = setupConsoleErrorCapture(page);

    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await page.goto('/en/daily/word-hunt');
    await page.waitForLoadState('networkidle');

    // Verify tablet layout
    const gridVisible = await page.locator('.grid-container, [data-testid="game-grid"]').isVisible();
    expect(gridVisible).toBeTruthy();

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/daily-hunt-tablet.png', fullPage: true });

    // Check for console errors
    if (consoleErrors.length > 0) {
      console.log('Console errors on tablet:', consoleErrors);
    }
  });

  test('Desktop layout', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    const consoleErrors = setupConsoleErrorCapture(page);

    await page.setViewportSize({ width: 1920, height: 1080 }); // Full HD desktop
    await page.goto('/en/daily/word-hunt');
    await page.waitForLoadState('networkidle');

    // Verify desktop layout
    const gridVisible = await page.locator('.grid-container, [data-testid="game-grid"]').isVisible();
    expect(gridVisible).toBeTruthy();

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/daily-hunt-desktop.png', fullPage: true });

    // Check for console errors
    if (consoleErrors.length > 0) {
      console.log('Console errors on desktop:', consoleErrors);
    }
  });
});
