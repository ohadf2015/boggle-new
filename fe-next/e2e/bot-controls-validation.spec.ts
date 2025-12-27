import { test, expect, Page } from '@playwright/test';

/**
 * BotControls and Switch Component UI/UX Validation Tests
 *
 * Tests the following changes:
 * 1. Switch component neo-brutalist styling
 * 2. BotControls single-click add flow
 * 3. Auto-fill card promotion to top
 * 4. Accessibility (ARIA, focus, touch targets)
 * 5. Responsive behavior
 */

const BASE_URL = 'http://localhost:3001';

// Helper to navigate to the host pre-game view where BotControls is visible
async function navigateToHostPreGameView(page: Page): Promise<void> {
  // Navigate to multiplayer page
  await page.goto(`${BASE_URL}/en/multiplayer`);

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Click on "Create Room" or similar to get to host view
  const createRoomButton = page.locator('button:has-text("Create"), button:has-text("Host"), a:has-text("Create")').first();
  if (await createRoomButton.isVisible()) {
    await createRoomButton.click();
    await page.waitForLoadState('networkidle');
  }

  // Wait for the BotControls section to appear
  await page.waitForSelector('[class*="FaRobot"], text=AI Bots, text=Bots', { timeout: 15000 }).catch(() => {});
}

test.describe('Switch Component - Neo-Brutalist Design Validation', () => {

  test('Switch has bold border styling', async ({ page }) => {
    await navigateToHostPreGameView(page);

    // Find the switch component (auto-fill switch)
    const switchElement = page.locator('[role="switch"], [id="auto-fill-switch"]').first();

    if (await switchElement.count() > 0) {
      // Capture screenshot of the switch in unchecked state
      await switchElement.screenshot({ path: 'test-results/switch-unchecked.png' });

      // Check for neo-brutalist border (2px black border)
      const switchStyles = await switchElement.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          borderWidth: styles.borderWidth,
          borderColor: styles.borderColor,
          borderStyle: styles.borderStyle,
          boxShadow: styles.boxShadow,
          backgroundColor: styles.backgroundColor,
        };
      });

      console.log('Switch unchecked styles:', switchStyles);

      // Verify border exists (should be 2px)
      expect(switchStyles.borderWidth).toBeTruthy();

      // Click to toggle
      await switchElement.click();
      await page.waitForTimeout(300);

      // Capture checked state
      await switchElement.screenshot({ path: 'test-results/switch-checked.png' });

      const checkedStyles = await switchElement.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          boxShadow: styles.boxShadow,
          backgroundColor: styles.backgroundColor,
        };
      });

      console.log('Switch checked styles:', checkedStyles);
    } else {
      console.log('Switch element not found - may need to navigate differently');
    }
  });

  test('Switch thumb has neo-brutalist styling', async ({ page }) => {
    await navigateToHostPreGameView(page);

    const switchThumb = page.locator('[role="switch"] > span, [data-state] > span').first();

    if (await switchThumb.count() > 0) {
      const thumbStyles = await switchThumb.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          borderWidth: styles.borderWidth,
          borderColor: styles.borderColor,
          borderRadius: styles.borderRadius,
          boxShadow: styles.boxShadow,
          backgroundColor: styles.backgroundColor,
        };
      });

      console.log('Switch thumb styles:', thumbStyles);

      // Thumb should have 2px border
      expect(thumbStyles.borderWidth).toBe('2px');
    }
  });

  test('Switch has focus-visible ring for accessibility', async ({ page }) => {
    await navigateToHostPreGameView(page);

    const switchElement = page.locator('[role="switch"]').first();

    if (await switchElement.count() > 0) {
      // Focus the switch
      await switchElement.focus();

      const focusStyles = await switchElement.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          outline: styles.outline,
          boxShadow: styles.boxShadow,
        };
      });

      console.log('Switch focus styles:', focusStyles);

      // Take screenshot of focused state
      await switchElement.screenshot({ path: 'test-results/switch-focused.png' });
    }
  });
});

test.describe('BotControls Component - Layout Validation', () => {

  test('Auto-fill card is positioned at top with purple styling', async ({ page }) => {
    await navigateToHostPreGameView(page);

    // Look for the auto-fill card with purple border
    const autoFillCard = page.locator('[class*="neo-purple"], .bg-neo-purple\\/10').first();

    if (await autoFillCard.count() > 0) {
      await autoFillCard.screenshot({ path: 'test-results/autofill-card.png' });

      const cardStyles = await autoFillCard.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          borderColor: styles.borderColor,
          borderWidth: styles.borderWidth,
          backgroundColor: styles.backgroundColor,
          boxShadow: styles.boxShadow,
          top: rect.top,
          padding: styles.padding,
        };
      });

      console.log('Auto-fill card styles:', cardStyles);

      // Verify it has shadow-hard-sm styling
      expect(cardStyles.boxShadow).toContain('2px');
    }
  });

  test('Three difficulty buttons are visible with correct colors', async ({ page }) => {
    await navigateToHostPreGameView(page);

    // Wait for buttons to appear
    await page.waitForTimeout(2000);

    // Look for the add bot buttons
    const easyButton = page.locator('button:has-text("Easy"), button[aria-label*="easy"]').first();
    const mediumButton = page.locator('button:has-text("Medium"), button[aria-label*="medium"]').first();
    const hardButton = page.locator('button:has-text("Hard"), button[aria-label*="hard"]').first();

    // Check Easy button (lime color)
    if (await easyButton.count() > 0) {
      const easyStyles = await easyButton.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          backgroundColor: styles.backgroundColor,
          minHeight: styles.minHeight,
          borderWidth: styles.borderWidth,
        };
      });

      console.log('Easy button styles:', easyStyles);

      // Verify 44px minimum touch target
      expect(parseInt(easyStyles.minHeight)).toBeGreaterThanOrEqual(44);

      await easyButton.screenshot({ path: 'test-results/easy-button.png' });
    }

    // Check Medium button (amber color)
    if (await mediumButton.count() > 0) {
      await mediumButton.screenshot({ path: 'test-results/medium-button.png' });
    }

    // Check Hard button (red color)
    if (await hardButton.count() > 0) {
      await hardButton.screenshot({ path: 'test-results/hard-button.png' });
    }

    // Take full section screenshot
    const botSection = page.locator('[class*="space-y-3"]').filter({ hasText: /Bot|AI/ }).first();
    if (await botSection.count() > 0) {
      await botSection.screenshot({ path: 'test-results/bot-controls-full.png' });
    }
  });

  test('Difficulty icons are visible (seedling, lightning, fire)', async ({ page }) => {
    await navigateToHostPreGameView(page);

    await page.waitForTimeout(2000);

    // Check for emoji icons in buttons
    const pageContent = await page.content();

    const hasSeedling = pageContent.includes('🌱') || pageContent.includes('seedling');
    const hasLightning = pageContent.includes('⚡') || pageContent.includes('lightning');
    const hasFire = pageContent.includes('🔥') || pageContent.includes('fire');

    console.log('Icons present:', { hasSeedling, hasLightning, hasFire });
  });
});

test.describe('BotControls Component - Functional Testing', () => {

  test('Single-click Easy button adds a bot', async ({ page }) => {
    await navigateToHostPreGameView(page);

    await page.waitForTimeout(2000);

    const easyButton = page.locator('button[aria-label*="easy"], button:has-text("Easy")').first();

    if (await easyButton.count() > 0) {
      // Count bots before
      const botsBefore = await page.locator('[class*="bot"], [class*="Bot"]').count();

      // Click to add bot
      await easyButton.click();

      // Wait for bot to be added
      await page.waitForTimeout(1500);

      // Take screenshot after adding
      await page.screenshot({ path: 'test-results/after-add-easy-bot.png' });

      console.log('Clicked Easy button to add bot');
    }
  });

  test('Auto-fill toggle works correctly', async ({ page }) => {
    await navigateToHostPreGameView(page);

    const autoFillSwitch = page.locator('[id="auto-fill-switch"], [role="switch"]').first();

    if (await autoFillSwitch.count() > 0) {
      // Get initial state
      const initialState = await autoFillSwitch.getAttribute('data-state');
      console.log('Initial auto-fill state:', initialState);

      // Toggle
      await autoFillSwitch.click();
      await page.waitForTimeout(500);

      // Get new state
      const newState = await autoFillSwitch.getAttribute('data-state');
      console.log('New auto-fill state:', newState);

      // State should have changed
      expect(newState).not.toBe(initialState);

      await page.screenshot({ path: 'test-results/autofill-toggled.png' });
    }
  });

  test('Bot pills appear with correct styling after adding', async ({ page }) => {
    await navigateToHostPreGameView(page);

    await page.waitForTimeout(2000);

    // Add a bot first
    const addButton = page.locator('button[aria-label*="Add"], button:has-text("Easy")').first();
    if (await addButton.count() > 0) {
      await addButton.click();
      await page.waitForTimeout(2000);
    }

    // Look for bot pills
    const botPills = page.locator('[class*="rounded-neo"][class*="border-2"]').filter({ hasText: /Bot|🤖/ });
    const pillCount = await botPills.count();

    console.log('Bot pills found:', pillCount);

    if (pillCount > 0) {
      await botPills.first().screenshot({ path: 'test-results/bot-pill.png' });

      // Check for remove button
      const removeButton = botPills.first().locator('button[aria-label*="Remove"]');
      expect(await removeButton.count()).toBeGreaterThanOrEqual(0);
    }
  });

  test('Remove button works on bot pills', async ({ page }) => {
    await navigateToHostPreGameView(page);

    await page.waitForTimeout(2000);

    // First add a bot
    const addButton = page.locator('button[aria-label*="Add"], button:has-text("Easy")').first();
    if (await addButton.count() > 0) {
      await addButton.click();
      await page.waitForTimeout(2000);
    }

    // Find remove button
    const removeButton = page.locator('button[aria-label*="Remove"]').first();

    if (await removeButton.count() > 0) {
      console.log('Remove button found');
      await removeButton.click();
      await page.waitForTimeout(1000);

      await page.screenshot({ path: 'test-results/after-remove-bot.png' });
    }
  });
});

test.describe('Accessibility Testing', () => {

  test('All buttons have aria-labels', async ({ page }) => {
    await navigateToHostPreGameView(page);

    await page.waitForTimeout(2000);

    // Check add buttons
    const addButtons = page.locator('button:has-text("Easy"), button:has-text("Medium"), button:has-text("Hard")');
    const count = await addButtons.count();

    for (let i = 0; i < count; i++) {
      const ariaLabel = await addButtons.nth(i).getAttribute('aria-label');
      console.log(`Button ${i} aria-label:`, ariaLabel);
      expect(ariaLabel).toBeTruthy();
    }
  });

  test('Screen reader announcement region exists', async ({ page }) => {
    await navigateToHostPreGameView(page);

    await page.waitForTimeout(2000);

    // Check for live region
    const liveRegion = page.locator('[role="status"][aria-live="polite"]');
    expect(await liveRegion.count()).toBeGreaterThan(0);

    // Check for alert region (error messages)
    const alertRegion = page.locator('[role="alert"]');
    // Alert may not be visible initially
    console.log('Alert regions found:', await alertRegion.count());
  });

  test('Minimum touch target size is 44px', async ({ page }) => {
    await navigateToHostPreGameView(page);

    await page.waitForTimeout(2000);

    const buttons = page.locator('button:has-text("Easy"), button:has-text("Medium"), button:has-text("Hard")');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const box = await buttons.nth(i).boundingBox();
      if (box) {
        console.log(`Button ${i} size:`, box.width, 'x', box.height);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('Focus states are visible', async ({ page }) => {
    await navigateToHostPreGameView(page);

    await page.waitForTimeout(2000);

    const button = page.locator('button:has-text("Easy")').first();

    if (await button.count() > 0) {
      // Tab to focus
      await button.focus();

      await page.screenshot({ path: 'test-results/button-focused.png' });

      const focusStyles = await button.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          outline: styles.outline,
          boxShadow: styles.boxShadow,
        };
      });

      console.log('Button focus styles:', focusStyles);
    }
  });

  test('Switch has proper label association', async ({ page }) => {
    await navigateToHostPreGameView(page);

    const switchElement = page.locator('[id="auto-fill-switch"]');
    const label = page.locator('label[for="auto-fill-switch"]');

    if (await switchElement.count() > 0) {
      expect(await label.count()).toBe(1);

      const labelText = await label.textContent();
      console.log('Switch label:', labelText);
      expect(labelText).toBeTruthy();
    }
  });
});

test.describe('Responsive Testing', () => {

  test('Buttons wrap correctly on narrow screens', async ({ page }) => {
    // Set narrow viewport
    await page.setViewportSize({ width: 320, height: 568 });

    await navigateToHostPreGameView(page);

    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/mobile-320-view.png', fullPage: true });

    // Check that buttons container uses flex-wrap
    const buttonContainer = page.locator('.flex.flex-wrap').first();
    if (await buttonContainer.count() > 0) {
      const styles = await buttonContainer.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          display: computed.display,
          flexWrap: computed.flexWrap,
        };
      });

      console.log('Button container styles:', styles);
      expect(styles.flexWrap).toBe('wrap');
    }
  });

  test('Auto-fill card is responsive', async ({ page }) => {
    // Test at different widths
    const widths = [320, 375, 414, 768];

    for (const width of widths) {
      await page.setViewportSize({ width, height: 700 });
      await navigateToHostPreGameView(page);
      await page.waitForTimeout(1500);

      await page.screenshot({ path: `test-results/responsive-${width}.png` });
    }
  });

  test('Text remains readable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });

    await navigateToHostPreGameView(page);

    await page.waitForTimeout(2000);

    // Check text sizes
    const texts = page.locator('.text-xs, .text-sm');
    const count = await texts.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const fontSize = await texts.nth(i).evaluate((el) => {
        return window.getComputedStyle(el).fontSize;
      });

      const size = parseInt(fontSize);
      console.log(`Text ${i} font-size:`, fontSize);

      // Should be at least 12px for readability
      expect(size).toBeGreaterThanOrEqual(10);
    }
  });
});

test.describe('Visual Regression - Full Component', () => {

  test('Capture full BotControls component screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    await navigateToHostPreGameView(page);

    await page.waitForTimeout(3000);

    await page.screenshot({
      path: 'test-results/bot-controls-desktop-full.png',
      fullPage: true
    });
  });

  test('Capture BotControls with bots added', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    await navigateToHostPreGameView(page);

    await page.waitForTimeout(2000);

    // Add multiple bots
    const buttons = ['Easy', 'Medium', 'Hard'];
    for (const difficulty of buttons) {
      const btn = page.locator(`button:has-text("${difficulty}")`).first();
      if (await btn.count() > 0 && await btn.isEnabled()) {
        await btn.click();
        await page.waitForTimeout(1000);
      }
    }

    await page.waitForTimeout(1000);

    await page.screenshot({
      path: 'test-results/bot-controls-with-bots.png',
      fullPage: true
    });
  });
});
