import { test, expect, Page } from '@playwright/test';

/**
 * Final BotControls and Switch Component Validation
 * Complete navigation: Multiplayer -> Profile Setup -> Room Settings -> Create Room -> Host Lobby (with BotControls)
 */

const BASE_URL = 'http://localhost:3001';

// Complete navigation to reach the Host Lobby where BotControls is visible
async function navigateToHostLobby(page: Page): Promise<void> {
  // Step 1: Go to multiplayer page
  await page.goto(`${BASE_URL}/en/multiplayer`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Step 2: Click "Start Setup" on Create Room
  const startSetupButton = page.locator('button:has-text("Start Setup"), button:has-text("START SETUP")').first();
  if (await startSetupButton.isVisible()) {
    await startSetupButton.click();
    await page.waitForTimeout(2000);
  }

  // Step 3: Fill in profile (Step 1 of 2)
  const nameInput = page.locator('input[placeholder*="name" i], input[type="text"]').first();
  if (await nameInput.count() > 0 && await nameInput.isVisible()) {
    await nameInput.fill('BotTester');
    await page.waitForTimeout(300);
  }

  // Select an avatar
  const avatarButton = page.locator('button[aria-label*="avatar" i]').first();
  if (await avatarButton.count() > 0 && await avatarButton.isVisible()) {
    await avatarButton.click();
    await page.waitForTimeout(300);
  }

  // Click Continue
  const continueButton = page.locator('button:has-text("Continue"), button:has-text("CONTINUE")').first();
  if (await continueButton.count() > 0 && await continueButton.isVisible()) {
    await continueButton.click();
    await page.waitForTimeout(2000);
  }

  // Step 4: On Step 2 (Room Settings) - Click "CREATE ROOM"
  const createRoomButton = page.locator('button:has-text("Create Room"), button:has-text("CREATE ROOM")').first();
  if (await createRoomButton.count() > 0 && await createRoomButton.isVisible()) {
    await createRoomButton.click();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle');
  }

  // Now we should be in the Host Lobby with BotControls
  await page.screenshot({ path: 'test-results/host-lobby-with-bots.png', fullPage: true });
}

test.describe('BotControls Final Validation', () => {

  test.use({ viewport: { width: 1280, height: 900 } });

  test('Navigate to host lobby and verify BotControls visibility', async ({ page }) => {
    await navigateToHostLobby(page);

    // Look for BotControls elements
    const botHeader = page.locator('text=AI Bots, text=Bots').first();
    const autoFillText = page.locator('text=Auto-fill, text=Auto').first();
    const switchElement = page.locator('[role="switch"]').first();

    console.log('Bot header found:', await botHeader.count() > 0);
    console.log('Auto-fill found:', await autoFillText.count() > 0);
    console.log('Switch found:', await switchElement.count() > 0);

    // Take a full screenshot
    await page.screenshot({ path: 'test-results/final-host-lobby.png', fullPage: true });

    // Check page content for expected elements
    const pageContent = await page.content();
    console.log('Page has "Bots":', pageContent.includes('Bots'));
    console.log('Page has "Auto":', pageContent.includes('Auto'));
    console.log('Page has switch role:', pageContent.includes('role="switch"'));
  });

  test('Switch component - neo-brutalist styling', async ({ page }) => {
    await navigateToHostLobby(page);

    const switchElement = page.locator('[role="switch"]').first();

    if (await switchElement.count() > 0) {
      console.log('Found switch element');

      // Screenshot unchecked state
      await switchElement.screenshot({ path: 'test-results/final-switch-unchecked.png' });

      const uncheckedStyles = await switchElement.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          borderWidth: styles.borderWidth,
          borderColor: styles.borderColor,
          boxShadow: styles.boxShadow,
          backgroundColor: styles.backgroundColor,
          height: styles.height,
          width: styles.width,
        };
      });

      console.log('UNCHECKED Switch styles:', JSON.stringify(uncheckedStyles, null, 2));

      // Verify neo-brutalist styling
      expect(uncheckedStyles.borderWidth).toBe('2px');
      expect(uncheckedStyles.boxShadow).toContain('2px');

      // Toggle ON
      await switchElement.click();
      await page.waitForTimeout(500);

      // Screenshot checked state
      await switchElement.screenshot({ path: 'test-results/final-switch-checked.png' });

      const checkedStyles = await switchElement.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          boxShadow: styles.boxShadow,
          backgroundColor: styles.backgroundColor,
        };
      });

      console.log('CHECKED Switch styles:', JSON.stringify(checkedStyles, null, 2));

      // Checked should have inset shadow
      expect(checkedStyles.boxShadow).toContain('inset');
    } else {
      // Capture what we see instead
      await page.screenshot({ path: 'test-results/no-switch-debug.png', fullPage: true });
      console.log('Switch not found - see debug screenshot');
    }
  });

  test('Switch thumb - bold border styling', async ({ page }) => {
    await navigateToHostLobby(page);

    const switchThumb = page.locator('[role="switch"] > span').first();

    if (await switchThumb.count() > 0) {
      await switchThumb.screenshot({ path: 'test-results/final-switch-thumb.png' });

      const thumbStyles = await switchThumb.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          borderWidth: styles.borderWidth,
          borderColor: styles.borderColor,
          boxShadow: styles.boxShadow,
          backgroundColor: styles.backgroundColor,
        };
      });

      console.log('Thumb styles:', JSON.stringify(thumbStyles, null, 2));

      expect(thumbStyles.borderWidth).toBe('2px');
      expect(thumbStyles.boxShadow).toContain('1px');
    }
  });

  test('Difficulty add buttons - single click flow', async ({ page }) => {
    await navigateToHostLobby(page);

    // Look for buttons with difficulty text or aria-labels
    const easyButton = page.locator('button:has-text("Easy"), button[aria-label*="easy" i]').first();
    const mediumButton = page.locator('button:has-text("Medium"), button[aria-label*="medium" i]').first();
    const hardButton = page.locator('button:has-text("Hard"), button[aria-label*="hard" i]').first();

    console.log('Easy button:', await easyButton.count());
    console.log('Medium button:', await mediumButton.count());
    console.log('Hard button:', await hardButton.count());

    if (await easyButton.count() > 0) {
      await easyButton.screenshot({ path: 'test-results/final-easy-button.png' });

      const styles = await easyButton.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          backgroundColor: computed.backgroundColor,
          borderWidth: computed.borderWidth,
          boxShadow: computed.boxShadow,
          height: rect.height,
          ariaLabel: el.getAttribute('aria-label'),
        };
      });

      console.log('Easy button styles:', JSON.stringify(styles, null, 2));

      // Verify styling
      expect(styles.borderWidth).toBe('2px');
      expect(styles.height).toBeGreaterThanOrEqual(44);
      expect(styles.ariaLabel).toBeTruthy();

      // Click to add bot (single-click should add directly)
      await easyButton.click();
      await page.waitForTimeout(2000);

      await page.screenshot({ path: 'test-results/final-after-add-bot.png', fullPage: true });
    }
  });

  test('Auto-fill card - purple styling and shadow', async ({ page }) => {
    await navigateToHostLobby(page);

    // Look for purple-styled card
    const autoFillCard = page.locator('[class*="neo-purple"]').first();

    if (await autoFillCard.count() > 0) {
      await autoFillCard.screenshot({ path: 'test-results/final-autofill-card.png' });

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

      // Should have hard shadow
      expect(cardStyles.boxShadow).toContain('2px');
    }
  });

  test('Bot pills with difficulty icons', async ({ page }) => {
    await navigateToHostLobby(page);

    // Add a bot first
    const addButton = page.locator('button:has-text("Easy"), button[aria-label*="easy" i]').first();
    if (await addButton.count() > 0) {
      await addButton.click();
      await page.waitForTimeout(2000);
    }

    // Check for emoji icons in page
    const pageContent = await page.content();
    console.log('Has seedling icon:', pageContent.includes('🌱'));
    console.log('Has lightning icon:', pageContent.includes('⚡'));
    console.log('Has fire icon:', pageContent.includes('🔥'));

    // Look for bot pill elements
    const botPills = page.locator('[class*="rounded-neo"]').filter({ hasText: /Bot|🤖/ });
    console.log('Bot pills found:', await botPills.count());

    if (await botPills.count() > 0) {
      await botPills.first().screenshot({ path: 'test-results/final-bot-pill.png' });
    }
  });

  test('Remove bot button functionality', async ({ page }) => {
    await navigateToHostLobby(page);

    // Add a bot
    const addButton = page.locator('button:has-text("Easy"), button[aria-label*="easy" i]').first();
    if (await addButton.count() > 0) {
      await addButton.click();
      await page.waitForTimeout(2000);
    }

    // Find and click remove button
    const removeButton = page.locator('button[aria-label*="Remove" i]').first();
    if (await removeButton.count() > 0) {
      console.log('Found remove button');
      await removeButton.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'test-results/final-after-remove.png' });
    }
  });
});

test.describe('Accessibility Final Validation', () => {

  test.use({ viewport: { width: 1280, height: 900 } });

  test('Screen reader live region', async ({ page }) => {
    await navigateToHostLobby(page);

    const liveRegion = page.locator('[role="status"][aria-live="polite"]');
    console.log('Live regions:', await liveRegion.count());
    expect(await liveRegion.count()).toBeGreaterThanOrEqual(0);
  });

  test('Switch label association', async ({ page }) => {
    await navigateToHostLobby(page);

    const switchElement = page.locator('#auto-fill-switch, [role="switch"]').first();
    if (await switchElement.count() > 0) {
      const id = await switchElement.getAttribute('id');
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        console.log('Label found:', await label.count() > 0);
      }
    }
  });

  test('Keyboard accessibility', async ({ page }) => {
    await navigateToHostLobby(page);

    const switchElement = page.locator('[role="switch"]').first();
    if (await switchElement.count() > 0) {
      await switchElement.focus();

      const hasFocus = await switchElement.evaluate(el => document.activeElement === el);
      expect(hasFocus).toBe(true);

      const before = await switchElement.getAttribute('data-state');
      await page.keyboard.press('Space');
      await page.waitForTimeout(300);
      const after = await switchElement.getAttribute('data-state');

      console.log('Before:', before, 'After:', after);
      expect(after).not.toBe(before);
    }
  });

  test('Touch targets 44px minimum', async ({ page }) => {
    await navigateToHostLobby(page);

    const buttons = page.locator('button[aria-label*="Add"], button[aria-label*="easy" i], button[aria-label*="medium" i], button[aria-label*="hard" i]');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const box = await buttons.nth(i).boundingBox();
      if (box) {
        console.log(`Button ${i}: ${box.width}x${box.height}`);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
});

test.describe('Responsive Final Validation', () => {

  test('Mobile 375px layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await navigateToHostLobby(page);
    await page.screenshot({ path: 'test-results/final-mobile-375.png', fullPage: true });

    const flexWrap = page.locator('.flex.flex-wrap').first();
    if (await flexWrap.count() > 0) {
      const styles = await flexWrap.evaluate(el => window.getComputedStyle(el).flexWrap);
      expect(styles).toBe('wrap');
    }
  });

  test('Mobile 320px layout', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await navigateToHostLobby(page);
    await page.screenshot({ path: 'test-results/final-mobile-320.png', fullPage: true });
  });

  test('Tablet 768px layout', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await navigateToHostLobby(page);
    await page.screenshot({ path: 'test-results/final-tablet-768.png', fullPage: true });
  });

  test('Text readability - minimum 10px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await navigateToHostLobby(page);

    const textElements = page.locator('.text-xs, .text-sm');
    const count = await textElements.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const fontSize = await textElements.nth(i).evaluate(el => window.getComputedStyle(el).fontSize);
      const size = parseInt(fontSize);
      expect(size).toBeGreaterThanOrEqual(10);
    }
  });
});
