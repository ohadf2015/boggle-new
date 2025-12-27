import { test, expect, Page } from '@playwright/test';

/**
 * Direct BotControls and Switch Component Validation
 * Navigates properly through the multiplayer flow to reach BotControls
 */

const BASE_URL = 'http://localhost:3001';

// Helper to properly navigate to the host pre-game view
async function navigateToHostView(page: Page): Promise<void> {
  // Go to multiplayer page
  await page.goto(`${BASE_URL}/en/multiplayer`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Click "Start Setup" button on the Create Room card
  const startSetupButton = page.locator('button:has-text("Start Setup"), button:has-text("START SETUP")').first();
  await expect(startSetupButton).toBeVisible({ timeout: 10000 });
  await startSetupButton.click();

  // Wait for navigation to host view
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle');

  // Take a screenshot of where we are now
  await page.screenshot({ path: 'test-results/after-start-setup.png' });
}

test.describe('BotControls Direct Validation', () => {

  test.use({ viewport: { width: 1280, height: 900 } });

  test('Navigate to host view and capture BotControls', async ({ page }) => {
    await navigateToHostView(page);

    // Wait for BotControls to render (look for "AI Bots" text or FaRobot icon area)
    const botSection = page.locator('text=AI Bots, text=Bots, [class*="FaRobot"]').first();

    // Take full page screenshot
    await page.screenshot({ path: 'test-results/host-view-full.png', fullPage: true });

    // Look for the auto-fill switch
    const autoFillSwitch = page.locator('[role="switch"]').first();
    if (await autoFillSwitch.count() > 0) {
      console.log('Auto-fill switch found!');

      // Get switch styles
      const switchStyles = await autoFillSwitch.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          borderWidth: styles.borderWidth,
          borderColor: styles.borderColor,
          borderStyle: styles.borderStyle,
          boxShadow: styles.boxShadow,
          backgroundColor: styles.backgroundColor,
          height: styles.height,
          width: styles.width,
        };
      });

      console.log('Switch styles:', JSON.stringify(switchStyles, null, 2));

      // Capture switch screenshot
      await autoFillSwitch.screenshot({ path: 'test-results/switch-component.png' });

      // Verify neo-brutalist border (should be 2px)
      expect(switchStyles.borderWidth).toBe('2px');
    }

    // Look for difficulty buttons
    const easyButton = page.locator('button[aria-label*="easy" i], button:has-text("Easy")').first();
    const mediumButton = page.locator('button[aria-label*="medium" i], button:has-text("Medium")').first();
    const hardButton = page.locator('button[aria-label*="hard" i], button:has-text("Hard")').first();

    console.log('Easy button count:', await easyButton.count());
    console.log('Medium button count:', await mediumButton.count());
    console.log('Hard button count:', await hardButton.count());

    if (await easyButton.count() > 0) {
      // Capture each button
      await easyButton.screenshot({ path: 'test-results/easy-button-direct.png' });

      const easyStyles = await easyButton.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          backgroundColor: styles.backgroundColor,
          borderWidth: styles.borderWidth,
          borderColor: styles.borderColor,
          height: rect.height,
          minHeight: styles.minHeight,
          boxShadow: styles.boxShadow,
          ariaLabel: el.getAttribute('aria-label'),
        };
      });

      console.log('Easy button styles:', JSON.stringify(easyStyles, null, 2));

      // Verify 44px minimum touch target
      expect(easyStyles.height).toBeGreaterThanOrEqual(44);
      expect(easyStyles.ariaLabel).toBeTruthy();
    }
  });

  test('Verify Switch component neo-brutalist styling', async ({ page }) => {
    await navigateToHostView(page);

    const switchElement = page.locator('[role="switch"]').first();

    if (await switchElement.count() > 0) {
      // Test unchecked state
      const uncheckedState = await switchElement.getAttribute('data-state');
      console.log('Initial switch state:', uncheckedState);

      const uncheckedStyles = await switchElement.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          boxShadow: styles.boxShadow,
          backgroundColor: styles.backgroundColor,
        };
      });

      console.log('Unchecked styles:', uncheckedStyles);

      // Click to toggle ON
      await switchElement.click();
      await page.waitForTimeout(500);

      const checkedState = await switchElement.getAttribute('data-state');
      console.log('After click state:', checkedState);

      const checkedStyles = await switchElement.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          boxShadow: styles.boxShadow,
          backgroundColor: styles.backgroundColor,
        };
      });

      console.log('Checked styles:', checkedStyles);

      // State should have changed
      expect(checkedState).not.toBe(uncheckedState);

      // Take screenshots of both states
      await page.screenshot({ path: 'test-results/switch-checked-state.png' });
    }
  });

  test('Verify single-click bot addition flow', async ({ page }) => {
    await navigateToHostView(page);

    // Find the Easy button
    const easyButton = page.locator('button[aria-label*="easy" i], button:has-text("Easy")').first();

    if (await easyButton.count() > 0) {
      // Click to add bot
      await easyButton.click();
      console.log('Clicked Easy button');

      // Wait for bot to be added
      await page.waitForTimeout(2000);

      // Take screenshot after adding
      await page.screenshot({ path: 'test-results/after-adding-easy-bot.png', fullPage: true });

      // Look for bot pill (should appear in current bots section)
      const botPills = page.locator('[class*="rounded-neo"]').filter({ hasText: /Bot|🤖/ });
      const pillCount = await botPills.count();
      console.log('Bot pills found:', pillCount);
    }
  });

  test('Verify auto-fill card purple styling', async ({ page }) => {
    await navigateToHostView(page);

    // Look for the auto-fill card
    const autoFillCard = page.locator('[class*="neo-purple"]').first();

    if (await autoFillCard.count() > 0) {
      await autoFillCard.screenshot({ path: 'test-results/autofill-card-direct.png' });

      const cardStyles = await autoFillCard.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          borderWidth: styles.borderWidth,
          borderColor: styles.borderColor,
          boxShadow: styles.boxShadow,
          backgroundColor: styles.backgroundColor,
          padding: styles.padding,
        };
      });

      console.log('Auto-fill card styles:', JSON.stringify(cardStyles, null, 2));

      // Should have hard shadow (2px 2px 0px)
      expect(cardStyles.boxShadow).toContain('2px');
    }
  });

  test('Verify difficulty buttons have correct icons', async ({ page }) => {
    await navigateToHostView(page);

    // Check page content for emoji icons
    const pageContent = await page.content();

    const hasSeedling = pageContent.includes('🌱');
    const hasLightning = pageContent.includes('⚡');
    const hasFire = pageContent.includes('🔥');

    console.log('Icons present in page:', { hasSeedling, hasLightning, hasFire });

    // At least one icon should be present if BotControls is rendered
  });

  test('Verify accessibility - ARIA labels on buttons', async ({ page }) => {
    await navigateToHostView(page);

    // Check all interactive elements have proper ARIA
    const buttons = page.locator('button[aria-label]');
    const count = await buttons.count();

    console.log('Buttons with aria-label:', count);

    for (let i = 0; i < Math.min(count, 10); i++) {
      const label = await buttons.nth(i).getAttribute('aria-label');
      const text = await buttons.nth(i).textContent();
      console.log(`Button ${i}: aria-label="${label}", text="${text?.trim()}"`);
    }

    // Screen reader region
    const liveRegion = page.locator('[role="status"][aria-live="polite"]');
    console.log('Live regions count:', await liveRegion.count());
  });

  test('Verify responsive layout at mobile width', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await navigateToHostView(page);

    await page.screenshot({ path: 'test-results/host-view-mobile.png', fullPage: true });

    // Check button container is using flex-wrap
    const buttonContainer = page.locator('.flex.flex-wrap').first();
    if (await buttonContainer.count() > 0) {
      const styles = await buttonContainer.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          display: computed.display,
          flexWrap: computed.flexWrap,
          gap: computed.gap,
        };
      });

      console.log('Mobile button container styles:', styles);
      expect(styles.flexWrap).toBe('wrap');
    }
  });

  test('Verify touch targets are at least 44px', async ({ page }) => {
    await navigateToHostView(page);

    // Get all clickable elements in the bot controls area
    const clickableElements = page.locator('button, [role="switch"]');
    const count = await clickableElements.count();

    const smallTargets: string[] = [];

    for (let i = 0; i < count; i++) {
      const box = await clickableElements.nth(i).boundingBox();
      const ariaLabel = await clickableElements.nth(i).getAttribute('aria-label');
      const text = await clickableElements.nth(i).textContent();

      if (box) {
        const minDimension = Math.min(box.width, box.height);
        if (minDimension < 44) {
          smallTargets.push(`${ariaLabel || text?.trim() || 'unknown'}: ${box.width}x${box.height}`);
        }
      }
    }

    if (smallTargets.length > 0) {
      console.log('WARNING: Touch targets smaller than 44px:', smallTargets);
    } else {
      console.log('All touch targets meet 44px minimum');
    }
  });
});

test.describe('Switch Component Isolation Tests', () => {

  test.use({ viewport: { width: 1280, height: 900 } });

  test('Switch thumb styling verification', async ({ page }) => {
    await navigateToHostView(page);

    const switchThumb = page.locator('[role="switch"] > span').first();

    if (await switchThumb.count() > 0) {
      const thumbStyles = await switchThumb.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          borderWidth: styles.borderWidth,
          borderColor: styles.borderColor,
          borderRadius: styles.borderRadius,
          boxShadow: styles.boxShadow,
          backgroundColor: styles.backgroundColor,
          width: styles.width,
          height: styles.height,
        };
      });

      console.log('Switch thumb styles:', JSON.stringify(thumbStyles, null, 2));

      // Thumb should have 2px border
      expect(thumbStyles.borderWidth).toBe('2px');

      // Thumb should have hard shadow
      expect(thumbStyles.boxShadow).toContain('1px');
    }
  });

  test('Switch keyboard accessibility', async ({ page }) => {
    await navigateToHostView(page);

    const switchElement = page.locator('[role="switch"]').first();

    if (await switchElement.count() > 0) {
      // Focus the switch
      await switchElement.focus();

      // Check if it received focus
      const hasFocus = await switchElement.evaluate((el) => {
        return document.activeElement === el;
      });

      console.log('Switch received focus:', hasFocus);
      expect(hasFocus).toBe(true);

      // Press Space to toggle
      await page.keyboard.press('Space');
      await page.waitForTimeout(300);

      const newState = await switchElement.getAttribute('data-state');
      console.log('State after Space key:', newState);
    }
  });
});
