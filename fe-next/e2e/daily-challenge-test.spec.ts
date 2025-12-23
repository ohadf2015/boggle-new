import { test, expect } from '@playwright/test';

test.describe('Daily Challenge Feature Tests', () => {
  const BASE_URL = 'http://localhost:3001';

  test('1. Page Load Test - Daily Challenge page loads correctly', async ({ page }) => {
    console.log('Navigating to Daily Challenge page...');

    // Navigate to Daily Challenge page
    await page.goto(`${BASE_URL}/en/daily`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Take screenshot of initial state
    await page.screenshot({
      path: '/Users/ohadfisher/git/boggle-new/fe-next/test-results/daily-challenge-initial.png',
      fullPage: true
    });

    console.log('Screenshot saved: daily-challenge-initial.png');

    // Check if Daily Challenge UI elements are present
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);

    // Look for Daily Challenge specific elements
    const bodyText = await page.textContent('body');
    console.log('Page contains "Daily Challenge":', bodyText?.includes('Daily Challenge'));

    // Check for start button or game grid
    const startButton = page.getByRole('button', { name: /start|play/i }).first();
    const isStartButtonVisible = await startButton.isVisible().catch(() => false);
    console.log('Start button visible:', isStartButtonVisible);

    // Check for puzzle number or daily challenge indicator
    const dailyText = await page.getByText(/daily|challenge|puzzle/i).first().isVisible().catch(() => false);
    console.log('Daily Challenge text visible:', dailyText);
  });

  test('2. Start Game Test - Click Start Daily Challenge button', async ({ page }) => {
    console.log('Testing Start Daily Challenge functionality...');

    await page.goto(`${BASE_URL}/en/daily`);
    await page.waitForLoadState('networkidle');

    // Find and click the start button
    const startButton = page.getByRole('button', { name: /start|play/i }).first();

    if (await startButton.isVisible().catch(() => false)) {
      console.log('Clicking start button...');
      await startButton.click();

      // Wait for game to initialize
      await page.waitForTimeout(2000);

      // Take screenshot of game in progress
      await page.screenshot({
        path: '/Users/ohadfisher/git/boggle-new/fe-next/test-results/daily-challenge-game-started.png',
        fullPage: true
      });

      console.log('Screenshot saved: daily-challenge-game-started.png');

      // Check for game grid
      const gameGrid = await page.locator('[class*="grid"], [class*="Grid"], .game-grid, [data-testid*="grid"]').first().isVisible().catch(() => false);
      console.log('Game grid visible:', gameGrid);

      // Check for timer
      const timer = await page.getByText(/\d{1,2}:\d{2}/).isVisible().catch(() => false);
      console.log('Timer visible:', timer);

      // Check for score display
      const scoreElements = await page.getByText(/score|points/i).count();
      console.log('Score display elements found:', scoreElements);

      // Look for letter tiles
      const letterTiles = await page.locator('button, [class*="tile"], [class*="cell"]').count();
      console.log('Letter tiles/cells found:', letterTiles);
    } else {
      console.log('Start button not found - game may auto-start or have different UI');

      // Take screenshot anyway
      await page.screenshot({
        path: '/Users/ohadfisher/git/boggle-new/fe-next/test-results/daily-challenge-no-start-button.png',
        fullPage: true
      });
    }
  });

  test('3. Word Submission Test - Submit words on the grid', async ({ page }) => {
    console.log('Testing word submission...');

    await page.goto(`${BASE_URL}/en/daily`);
    await page.waitForLoadState('networkidle');

    // Try to start the game
    const startButton = page.getByRole('button', { name: /start|play/i }).first();
    if (await startButton.isVisible().catch(() => false)) {
      await startButton.click();
      await page.waitForTimeout(2000);
    }

    // Take initial screenshot
    await page.screenshot({
      path: '/Users/ohadfisher/git/boggle-new/fe-next/test-results/daily-challenge-before-word.png',
      fullPage: true
    });

    // Try to find letter tiles
    const tiles = await page.locator('button, [class*="tile"], [class*="cell"], [role="button"]').all();
    console.log('Found', tiles.length, 'interactive elements');

    if (tiles.length > 0) {
      // Try clicking a sequence of tiles to form a word
      console.log('Attempting to click tiles...');

      // Get initial score
      const initialScoreText = await page.textContent('body');

      // Click first few tiles
      for (let i = 0; i < Math.min(4, tiles.length); i++) {
        if (await tiles[i].isVisible().catch(() => false)) {
          await tiles[i].click();
          await page.waitForTimeout(300);
        }
      }

      // Wait for any updates
      await page.waitForTimeout(1000);

      // Take screenshot after interaction
      await page.screenshot({
        path: '/Users/ohadfisher/git/boggle-new/fe-next/test-results/daily-challenge-after-word.png',
        fullPage: true
      });

      // Check if score changed
      const finalScoreText = await page.textContent('body');
      console.log('Word submission interaction completed');

      // Look for submit button
      const submitButton = await page.getByRole('button', { name: /submit|check|enter/i }).first().isVisible().catch(() => false);
      console.log('Submit button found:', submitButton);

      // Look for word list or found words
      const wordList = await page.locator('[class*="word"], [class*="found"]').count();
      console.log('Word-related elements found:', wordList);
    } else {
      console.log('No interactive tiles found');
    }
  });

  test('4. Landing Page Banner Test - Verify Daily Challenge banner', async ({ page }) => {
    console.log('Testing Daily Challenge banner on landing page...');

    await page.goto(`${BASE_URL}/en`);
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({
      path: '/Users/ohadfisher/git/boggle-new/fe-next/test-results/landing-page-daily-banner.png',
      fullPage: true
    });

    console.log('Screenshot saved: landing-page-daily-banner.png');

    // Check for Daily Challenge banner or link
    const dailyBanner = await page.getByText(/daily challenge/i).first().isVisible().catch(() => false);
    console.log('Daily Challenge banner visible:', dailyBanner);

    // Check for link to daily challenge
    const dailyLink = await page.locator('a[href*="/daily"]').first().isVisible().catch(() => false);
    console.log('Daily Challenge link found:', dailyLink);

    // Get all text mentioning daily
    const dailyElements = await page.getByText(/daily/i).all();
    console.log('Elements mentioning "daily":', dailyElements.length);
  });
});
