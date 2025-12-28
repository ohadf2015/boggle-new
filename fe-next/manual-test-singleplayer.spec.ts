import { test, expect } from '@playwright/test';

/**
 * Manual testing script to capture screenshots and inspect the actual UI state
 */

test('Capture single player page screenshots for manual inspection', async ({ page }) => {
  // Navigate to single player page
  await page.goto('http://localhost:3001/en/singleplayer');

  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // Extra wait for any animations

  // Take full page screenshot
  await page.screenshot({
    path: 'singleplayer-full-page.png',
    fullPage: true
  });

  console.log('Full page screenshot saved');

  // Get page HTML for inspection
  const html = await page.content();
  console.log('Page loaded successfully');

  // Check if mode cards are present
  const modeButtons = await page.locator('button[aria-pressed]').count();
  console.log(`Mode cards found: ${modeButtons}`);

  // Check preset cards with grid sizes
  const gridSizes = await page.locator('text=/[579]×[579]/').count();
  console.log(`Grid size elements found: ${gridSizes}`);

  // Check for Daily Challenge
  const dailyCard = await page.locator('button').filter({ hasText: /Daily/i }).count();
  console.log(`Daily Challenge card found: ${dailyCard > 0}`);

  // Click Practice mode and capture
  try {
    await page.getByRole('button', { name: /Practice/i }).first().click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'singleplayer-practice-mode.png', fullPage: true });
    console.log('Practice mode screenshot saved');
  } catch (e) {
    console.log('Could not switch to Practice mode:', e);
  }

  // Click Challenge mode and capture
  await page.goto('http://localhost:3001/en/singleplayer');
  await page.waitForTimeout(2000);
  try {
    await page.getByRole('button', { name: /Challenge/i }).first().click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'singleplayer-challenge-mode.png', fullPage: true });
    console.log('Challenge mode screenshot saved');
  } catch (e) {
    console.log('Could not switch to Challenge mode:', e);
  }

  // Test mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('http://localhost:3001/en/singleplayer');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'singleplayer-mobile.png', fullPage: true });
  console.log('Mobile screenshot saved');

  // Test dark mode
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('http://localhost:3001/en/singleplayer');
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'singleplayer-dark-mode.png', fullPage: true });
  console.log('Dark mode screenshot saved');
});
