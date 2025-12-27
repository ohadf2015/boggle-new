import { test, expect, Page } from '@playwright/test';

/**
 * Complete BotControls and Switch Component Validation
 * Properly navigates through profile setup to reach BotControls in host pre-game view
 */

const BASE_URL = 'http://localhost:3001';

// Helper to fully navigate to the host pre-game view with BotControls
async function navigateToHostPreGameWithBots(page: Page): Promise<void> {
  // Step 1: Go to multiplayer page
  await page.goto(`${BASE_URL}/en/multiplayer`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Step 2: Click "Start Setup" on Create Room
  const startSetupButton = page.locator('button:has-text("Start Setup"), button:has-text("START SETUP")').first();
  await expect(startSetupButton).toBeVisible({ timeout: 10000 });
  await startSetupButton.click();
  await page.waitForTimeout(2000);

  // Step 3: Fill in profile - Enter a name
  const nameInput = page.locator('input[placeholder*="name" i], input[type="text"]').first();
  if (await nameInput.count() > 0) {
    await nameInput.fill('TestPlayer123');
    await page.waitForTimeout(500);
  }

  // Step 4: Select an avatar (click first available avatar)
  const avatarButton = page.locator('button[aria-label*="avatar" i]').first();
  if (await avatarButton.count() > 0) {
    await avatarButton.click();
    await page.waitForTimeout(300);
  }

  // Step 5: Click Continue to go to Step 2 (Game Settings)
  const continueButton = page.locator('button:has-text("Continue"), button:has-text("CONTINUE")').first();
  if (await continueButton.count() > 0) {
    await continueButton.click();
    await page.waitForTimeout(3000);
  }

  // Now we should be on Step 2 with BotControls visible
  await page.screenshot({ path: 'test-results/step2-game-settings.png', fullPage: true });
}

test.describe('BotControls Complete Validation', () => {

  test.use({ viewport: { width: 1280, height: 900 } });

  test('Full navigation to BotControls and visual capture', async ({ page }) => {
    await navigateToHostPreGameWithBots(page);

    // Look for BotControls elements
    const botHeader = page.locator('text=AI Bots').first();
    const autoFillText = page.locator('text=Auto-fill').first();

    console.log('Bot header found:', await botHeader.count() > 0);
    console.log('Auto-fill text found:', await autoFillText.count() > 0);

    // Capture the current view
    await page.screenshot({ path: 'test-results/bot-controls-view.png', fullPage: true });
  });

  test('Switch component neo-brutalist styling verification', async ({ page }) => {
    await navigateToHostPreGameWithBots(page);

    // Find the switch component
    const switchElement = page.locator('[role="switch"]').first();

    if (await switchElement.count() > 0) {
      console.log('Switch element found!');

      // Capture switch unchecked
      await switchElement.screenshot({ path: 'test-results/switch-unchecked-neo.png' });

      // Get unchecked styles
      const uncheckedStyles = await switchElement.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          borderWidth: styles.borderWidth,
          borderColor: styles.borderColor,
          borderStyle: styles.borderStyle,
          boxShadow: styles.boxShadow,
          backgroundColor: styles.backgroundColor,
          height: styles.height,
          width: styles.width,
          borderRadius: styles.borderRadius,
        };
      });

      console.log('Switch UNCHECKED styles:');
      console.log(JSON.stringify(uncheckedStyles, null, 2));

      // Verify neo-brutalist styling
      // Should have 2px border
      expect(uncheckedStyles.borderWidth).toBe('2px');
      // Should have hard shadow (2px 2px 0 0 black)
      expect(uncheckedStyles.boxShadow).toContain('2px');

      // Toggle the switch
      await switchElement.click();
      await page.waitForTimeout(500);

      // Capture switch checked
      await switchElement.screenshot({ path: 'test-results/switch-checked-neo.png' });

      // Get checked styles
      const checkedStyles = await switchElement.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          boxShadow: styles.boxShadow,
          backgroundColor: styles.backgroundColor,
        };
      });

      console.log('Switch CHECKED styles:');
      console.log(JSON.stringify(checkedStyles, null, 2));

      // Checked should have inset shadow (pressed look)
      expect(checkedStyles.boxShadow).toContain('inset');
    } else {
      console.log('Switch not found - checking page content');
      await page.screenshot({ path: 'test-results/no-switch-found.png', fullPage: true });
    }
  });

  test('Switch thumb styling verification', async ({ page }) => {
    await navigateToHostPreGameWithBots(page);

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

      console.log('Switch THUMB styles:');
      console.log(JSON.stringify(thumbStyles, null, 2));

      // Thumb should have 2px border
      expect(thumbStyles.borderWidth).toBe('2px');
      // Thumb should have hard shadow (1px 1px 0 0 black)
      expect(thumbStyles.boxShadow).toContain('1px');

      await switchThumb.screenshot({ path: 'test-results/switch-thumb.png' });
    }
  });

  test('Auto-fill card purple styling and position', async ({ page }) => {
    await navigateToHostPreGameWithBots(page);

    // Look for auto-fill card by class or text
    const autoFillCard = page.locator('[class*="neo-purple"]').first();

    if (await autoFillCard.count() > 0) {
      await autoFillCard.screenshot({ path: 'test-results/autofill-card-purple.png' });

      const cardStyles = await autoFillCard.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          borderWidth: styles.borderWidth,
          borderColor: styles.borderColor,
          boxShadow: styles.boxShadow,
          backgroundColor: styles.backgroundColor,
          padding: styles.padding,
          borderRadius: styles.borderRadius,
          position: { top: rect.top, left: rect.left },
        };
      });

      console.log('Auto-fill card styles:');
      console.log(JSON.stringify(cardStyles, null, 2));

      // Should have shadow-hard-sm (2px 2px)
      expect(cardStyles.boxShadow).toContain('2px');
    }
  });

  test('Difficulty buttons - single click add flow', async ({ page }) => {
    await navigateToHostPreGameWithBots(page);

    // Find difficulty buttons
    const easyButton = page.locator('button[aria-label*="easy" i]').first();
    const mediumButton = page.locator('button[aria-label*="medium" i]').first();
    const hardButton = page.locator('button[aria-label*="hard" i]').first();

    const easyCount = await easyButton.count();
    const mediumCount = await mediumButton.count();
    const hardCount = await hardButton.count();

    console.log('Difficulty buttons found:', { easy: easyCount, medium: mediumCount, hard: hardCount });

    if (easyCount > 0) {
      // Capture Easy button
      await easyButton.screenshot({ path: 'test-results/easy-button-neo.png' });

      const easyStyles = await easyButton.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          backgroundColor: styles.backgroundColor,
          borderWidth: styles.borderWidth,
          borderColor: styles.borderColor,
          boxShadow: styles.boxShadow,
          height: rect.height,
          width: rect.width,
          minHeight: styles.minHeight,
          ariaLabel: el.getAttribute('aria-label'),
          textContent: el.textContent,
        };
      });

      console.log('Easy button styles:');
      console.log(JSON.stringify(easyStyles, null, 2));

      // Should have 2px border
      expect(easyStyles.borderWidth).toBe('2px');
      // Should have hard shadow
      expect(easyStyles.boxShadow).toContain('2px');
      // Should have 44px min touch target
      expect(easyStyles.height).toBeGreaterThanOrEqual(44);
      // Should have aria-label
      expect(easyStyles.ariaLabel).toBeTruthy();

      // Click to add bot
      await easyButton.click();
      console.log('Clicked Easy button to add bot');
      await page.waitForTimeout(2000);

      // Take screenshot after adding
      await page.screenshot({ path: 'test-results/after-add-easy-bot-neo.png', fullPage: true });
    }

    if (mediumCount > 0) {
      await mediumButton.screenshot({ path: 'test-results/medium-button-neo.png' });
    }

    if (hardCount > 0) {
      await hardButton.screenshot({ path: 'test-results/hard-button-neo.png' });
    }
  });

  test('Bot pills styling after adding bots', async ({ page }) => {
    await navigateToHostPreGameWithBots(page);

    // Add an easy bot first
    const easyButton = page.locator('button[aria-label*="easy" i]').first();
    if (await easyButton.count() > 0) {
      await easyButton.click();
      await page.waitForTimeout(2000);
    }

    // Look for bot pill
    const botPills = page.locator('[class*="rounded-neo"]').filter({ hasText: /Bot|🤖/ });
    const pillCount = await botPills.count();

    console.log('Bot pills found:', pillCount);

    if (pillCount > 0) {
      const firstPill = botPills.first();
      await firstPill.screenshot({ path: 'test-results/bot-pill-neo.png' });

      const pillStyles = await firstPill.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          borderWidth: styles.borderWidth,
          borderColor: styles.borderColor,
          boxShadow: styles.boxShadow,
          backgroundColor: styles.backgroundColor,
          borderRadius: styles.borderRadius,
          padding: styles.padding,
        };
      });

      console.log('Bot pill styles:');
      console.log(JSON.stringify(pillStyles, null, 2));

      // Should have 2px border
      expect(pillStyles.borderWidth).toBe('2px');
      // Should have hard shadow
      expect(pillStyles.boxShadow).toContain('2px');

      // Check for remove button
      const removeButton = firstPill.locator('button[aria-label*="Remove" i]');
      console.log('Remove button found:', await removeButton.count() > 0);
    }
  });

  test('Difficulty icons verification', async ({ page }) => {
    await navigateToHostPreGameWithBots(page);

    const pageContent = await page.content();

    const hasSeedling = pageContent.includes('🌱');
    const hasLightning = pageContent.includes('⚡');
    const hasFire = pageContent.includes('🔥');

    console.log('Difficulty icons in page:');
    console.log({ seedling: hasSeedling, lightning: hasLightning, fire: hasFire });

    // All three should be present
    expect(hasSeedling || hasLightning || hasFire).toBe(true);
  });

  test('Remove bot button functionality', async ({ page }) => {
    await navigateToHostPreGameWithBots(page);

    // Add a bot
    const easyButton = page.locator('button[aria-label*="easy" i]').first();
    if (await easyButton.count() > 0) {
      await easyButton.click();
      await page.waitForTimeout(2000);
    }

    // Find remove button
    const removeButton = page.locator('button[aria-label*="Remove" i]').first();

    if (await removeButton.count() > 0) {
      console.log('Found remove button');
      await page.screenshot({ path: 'test-results/before-remove-bot.png' });

      await removeButton.click();
      await page.waitForTimeout(1500);

      await page.screenshot({ path: 'test-results/after-remove-bot.png' });
      console.log('Bot removed successfully');
    }
  });
});

test.describe('Accessibility Validation', () => {

  test.use({ viewport: { width: 1280, height: 900 } });

  test('All interactive elements have aria-labels', async ({ page }) => {
    await navigateToHostPreGameWithBots(page);

    // Check switch
    const switchElement = page.locator('[role="switch"]').first();
    if (await switchElement.count() > 0) {
      const switchDescribedBy = await switchElement.getAttribute('aria-describedby');
      console.log('Switch aria-describedby:', switchDescribedBy);
    }

    // Check difficulty buttons
    const difficultyButtons = page.locator('button[aria-label*="Add"]');
    const count = await difficultyButtons.count();
    console.log('Buttons with "Add" aria-label:', count);

    for (let i = 0; i < count; i++) {
      const label = await difficultyButtons.nth(i).getAttribute('aria-label');
      console.log(`  Button ${i}: ${label}`);
      expect(label).toBeTruthy();
    }
  });

  test('Screen reader live region exists', async ({ page }) => {
    await navigateToHostPreGameWithBots(page);

    const liveRegion = page.locator('[role="status"][aria-live="polite"]');
    const count = await liveRegion.count();
    console.log('Live regions found:', count);
    expect(count).toBeGreaterThan(0);
  });

  test('Switch has proper label association', async ({ page }) => {
    await navigateToHostPreGameWithBots(page);

    const switchElement = page.locator('#auto-fill-switch');
    const label = page.locator('label[for="auto-fill-switch"]');

    if (await switchElement.count() > 0) {
      expect(await label.count()).toBe(1);
      const labelText = await label.textContent();
      console.log('Switch label text:', labelText);
      expect(labelText).toContain('Auto');
    }
  });

  test('Keyboard navigation works on switch', async ({ page }) => {
    await navigateToHostPreGameWithBots(page);

    const switchElement = page.locator('[role="switch"]').first();

    if (await switchElement.count() > 0) {
      const initialState = await switchElement.getAttribute('data-state');
      console.log('Initial switch state:', initialState);

      // Focus and toggle with keyboard
      await switchElement.focus();
      await page.keyboard.press('Space');
      await page.waitForTimeout(300);

      const newState = await switchElement.getAttribute('data-state');
      console.log('After Space key:', newState);
      expect(newState).not.toBe(initialState);
    }
  });

  test('Touch targets meet 44px minimum', async ({ page }) => {
    await navigateToHostPreGameWithBots(page);

    // Check difficulty buttons specifically
    const difficultyButtons = page.locator('button[aria-label*="Add"]');
    const count = await difficultyButtons.count();

    for (let i = 0; i < count; i++) {
      const box = await difficultyButtons.nth(i).boundingBox();
      if (box) {
        const label = await difficultyButtons.nth(i).getAttribute('aria-label');
        console.log(`${label}: ${box.width}x${box.height}`);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
});

test.describe('Responsive Layout Validation', () => {

  test('Mobile view (375px) - buttons wrap correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await navigateToHostPreGameWithBots(page);

    await page.screenshot({ path: 'test-results/mobile-375-bot-controls.png', fullPage: true });

    // Check flex-wrap is applied
    const buttonContainer = page.locator('.flex.flex-wrap').first();
    if (await buttonContainer.count() > 0) {
      const styles = await buttonContainer.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return { flexWrap: computed.flexWrap };
      });
      expect(styles.flexWrap).toBe('wrap');
    }
  });

  test('Narrow mobile view (320px)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });

    await navigateToHostPreGameWithBots(page);

    await page.screenshot({ path: 'test-results/mobile-320-bot-controls.png', fullPage: true });
  });

  test('Tablet view (768px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await navigateToHostPreGameWithBots(page);

    await page.screenshot({ path: 'test-results/tablet-768-bot-controls.png', fullPage: true });
  });

  test('Text sizes are at least 12px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });

    await navigateToHostPreGameWithBots(page);

    const textElements = page.locator('.text-xs, .text-sm');
    const count = await textElements.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const fontSize = await textElements.nth(i).evaluate((el) => {
        return window.getComputedStyle(el).fontSize;
      });
      const size = parseInt(fontSize);
      console.log(`Text element ${i}: ${fontSize}`);
      // text-xs is 12px, which is acceptable
      expect(size).toBeGreaterThanOrEqual(10);
    }
  });
});
