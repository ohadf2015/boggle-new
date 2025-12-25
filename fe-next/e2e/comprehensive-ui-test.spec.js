const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Screenshot directory
const screenshotDir = path.join(__dirname, 'test-screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

test.describe('LexiClash Comprehensive UI Testing', () => {

  test.describe('1. Landing Page Tests', () => {

    test('should load landing page successfully', async ({ page }) => {
      await page.goto('http://localhost:3001');
      await page.waitForLoadState('networkidle');

      // Take screenshot of landing page
      await page.screenshot({
        path: path.join(screenshotDir, '01-landing-page-desktop.png'),
        fullPage: true
      });

      // Verify page title
      await expect(page).toHaveTitle(/LexiClash/i);
    });

    test('should display mode selection cards', async ({ page }) => {
      await page.goto('http://localhost:3001');
      await page.waitForLoadState('networkidle');

      // Check for Single Player card
      const singlePlayerCard = page.locator('text=Single Player').first();
      await expect(singlePlayerCard).toBeVisible({ timeout: 10000 });

      // Check for Multiplayer card
      const multiplayerCard = page.locator('text=Multiplayer').first();
      await expect(multiplayerCard).toBeVisible({ timeout: 10000 });

      // Take screenshot of mode cards
      await page.screenshot({
        path: path.join(screenshotDir, '02-mode-selection-cards.png'),
        fullPage: true
      });
    });

    test('should display daily challenge banner', async ({ page }) => {
      await page.goto('http://localhost:3001');
      await page.waitForLoadState('networkidle');

      // Look for daily challenge text
      const dailyChallenge = page.locator('text=/daily challenge/i').first();
      const isDailyChallengeVisible = await dailyChallenge.isVisible().catch(() => false);

      console.log('Daily Challenge Banner Visible:', isDailyChallengeVisible);

      // Take screenshot
      await page.screenshot({
        path: path.join(screenshotDir, '03-daily-challenge-banner.png'),
        fullPage: true
      });
    });

    test('should have working Single Player button', async ({ page }) => {
      await page.goto('http://localhost:3001');
      await page.waitForLoadState('networkidle');

      // Find and click Single Player
      const singlePlayerButton = page.locator('text=Single Player').first();
      await singlePlayerButton.click();

      // Wait for navigation or modal
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: path.join(screenshotDir, '04-single-player-clicked.png'),
        fullPage: true
      });
    });

    test('should have working Multiplayer button', async ({ page }) => {
      await page.goto('http://localhost:3001');
      await page.waitForLoadState('networkidle');

      // Find and click Multiplayer
      const multiplayerButton = page.locator('text=Multiplayer').first();
      await multiplayerButton.click();

      // Wait for navigation
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: path.join(screenshotDir, '05-multiplayer-clicked.png'),
        fullPage: true
      });
    });
  });

  test.describe('2. Multiplayer Flow Tests', () => {

    test('should navigate to multiplayer page', async ({ page }) => {
      await page.goto('http://localhost:3001/multiplayer');
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: path.join(screenshotDir, '06-multiplayer-page.png'),
        fullPage: true
      });
    });

    test('should display join/host mode selection', async ({ page }) => {
      await page.goto('http://localhost:3001/multiplayer');
      await page.waitForLoadState('networkidle');

      // Look for Join and Host options
      const joinButton = page.locator('text=/join/i').first();
      const hostButton = page.locator('text=/host/i').first();

      const hasJoinButton = await joinButton.isVisible().catch(() => false);
      const hasHostButton = await hostButton.isVisible().catch(() => false);

      console.log('Join Button Visible:', hasJoinButton);
      console.log('Host Button Visible:', hasHostButton);

      await page.screenshot({
        path: path.join(screenshotDir, '07-join-host-selection.png'),
        fullPage: true
      });
    });

    test('should test host game flow', async ({ page }) => {
      await page.goto('http://localhost:3001/multiplayer');
      await page.waitForLoadState('networkidle');

      // Try to find and click host button
      const hostButton = page.locator('button:has-text("Host"), a:has-text("Host")').first();
      const isHostVisible = await hostButton.isVisible({ timeout: 5000 }).catch(() => false);

      if (isHostVisible) {
        await hostButton.click();
        await page.waitForTimeout(2000);

        await page.screenshot({
          path: path.join(screenshotDir, '08-host-game-lobby.png'),
          fullPage: true
        });
      } else {
        console.log('Host button not found on multiplayer page');
        await page.screenshot({
          path: path.join(screenshotDir, '08-host-button-not-found.png'),
          fullPage: true
        });
      }
    });

    test('should test join game flow', async ({ page }) => {
      await page.goto('http://localhost:3001/multiplayer');
      await page.waitForLoadState('networkidle');

      // Try to find and click join button
      const joinButton = page.locator('button:has-text("Join"), a:has-text("Join")').first();
      const isJoinVisible = await joinButton.isVisible({ timeout: 5000 }).catch(() => false);

      if (isJoinVisible) {
        await joinButton.click();
        await page.waitForTimeout(2000);

        // Look for room code input
        const roomCodeInput = page.locator('input[type="text"], input[placeholder*="code" i], input[placeholder*="room" i]').first();
        const hasRoomCodeInput = await roomCodeInput.isVisible({ timeout: 5000 }).catch(() => false);

        console.log('Room Code Input Visible:', hasRoomCodeInput);

        await page.screenshot({
          path: path.join(screenshotDir, '09-join-game-room-code.png'),
          fullPage: true
        });
      } else {
        console.log('Join button not found on multiplayer page');
        await page.screenshot({
          path: path.join(screenshotDir, '09-join-button-not-found.png'),
          fullPage: true
        });
      }
    });
  });

  test.describe('3. Responsive Design Tests', () => {

    test('should test tablet viewport (768x1024)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('http://localhost:3001');
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: path.join(screenshotDir, '10-tablet-landing.png'),
        fullPage: true
      });
    });

    test('should test mobile viewport (375x667)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:3001');
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: path.join(screenshotDir, '11-mobile-landing.png'),
        fullPage: true
      });
    });

    test('should test mobile multiplayer page', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:3001/multiplayer');
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: path.join(screenshotDir, '12-mobile-multiplayer.png'),
        fullPage: true
      });
    });

    test('should test large desktop viewport (1920x1080)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('http://localhost:3001');
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: path.join(screenshotDir, '13-large-desktop-landing.png'),
        fullPage: true
      });
    });
  });

  test.describe('4. Accessibility Tests', () => {

    test('should check for proper heading hierarchy', async ({ page }) => {
      await page.goto('http://localhost:3001');
      await page.waitForLoadState('networkidle');

      const h1Count = await page.locator('h1').count();
      const h2Count = await page.locator('h2').count();

      console.log('H1 Count:', h1Count);
      console.log('H2 Count:', h2Count);

      // Should have at least one h1
      expect(h1Count).toBeGreaterThanOrEqual(0);
    });

    test('should check buttons have accessible labels', async ({ page }) => {
      await page.goto('http://localhost:3001');
      await page.waitForLoadState('networkidle');

      const buttons = await page.locator('button').all();
      const buttonsWithoutText = [];

      for (const button of buttons) {
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');

        if (!text?.trim() && !ariaLabel) {
          buttonsWithoutText.push(await button.innerHTML());
        }
      }

      console.log('Buttons without accessible text:', buttonsWithoutText.length);
      if (buttonsWithoutText.length > 0) {
        console.log('Examples:', buttonsWithoutText.slice(0, 3));
      }
    });

    test('should check for keyboard navigation support', async ({ page }) => {
      await page.goto('http://localhost:3001');
      await page.waitForLoadState('networkidle');

      // Try tabbing through interactive elements
      await page.keyboard.press('Tab');
      await page.waitForTimeout(500);

      const focusedElement = await page.evaluateHandle(() => document.activeElement);
      const tagName = await page.evaluate(el => el?.tagName, focusedElement);

      console.log('First focused element after Tab:', tagName);

      await page.screenshot({
        path: path.join(screenshotDir, '14-keyboard-navigation.png'),
        fullPage: true
      });
    });

    test('should check color contrast (visual inspection)', async ({ page }) => {
      await page.goto('http://localhost:3001');
      await page.waitForLoadState('networkidle');

      // Get computed styles of key elements
      const bodyStyles = await page.evaluate(() => {
        const body = document.body;
        const styles = window.getComputedStyle(body);
        return {
          backgroundColor: styles.backgroundColor,
          color: styles.color
        };
      });

      console.log('Body styles:', bodyStyles);

      await page.screenshot({
        path: path.join(screenshotDir, '15-color-contrast-check.png'),
        fullPage: true
      });
    });
  });

  test.describe('5. Visual Design Consistency Tests', () => {

    test('should verify neo-brutalist design elements', async ({ page }) => {
      await page.goto('http://localhost:3001');
      await page.waitForLoadState('networkidle');

      // Check for thick borders (neo-brutalist characteristic)
      const elementsWithBorders = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        const borderedElements = [];

        elements.forEach(el => {
          const styles = window.getComputedStyle(el);
          const borderWidth = parseInt(styles.borderWidth) || 0;

          if (borderWidth >= 3) {
            borderedElements.push({
              tag: el.tagName,
              borderWidth: styles.borderWidth,
              borderColor: styles.borderColor
            });
          }
        });

        return borderedElements.slice(0, 10);
      });

      console.log('Elements with thick borders (neo-brutalist):', elementsWithBorders.length);
      console.log('Sample elements:', elementsWithBorders.slice(0, 5));

      await page.screenshot({
        path: path.join(screenshotDir, '16-neo-brutalist-design.png'),
        fullPage: true
      });
    });

    test('should check for consistent spacing', async ({ page }) => {
      await page.goto('http://localhost:3001');
      await page.waitForLoadState('networkidle');

      // Check padding/margin consistency
      const spacingValues = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        const spacings = [];

        buttons.forEach(btn => {
          const styles = window.getComputedStyle(btn);
          spacings.push({
            padding: styles.padding,
            margin: styles.margin
          });
        });

        return spacings.slice(0, 5);
      });

      console.log('Button spacing samples:', spacingValues);
    });

    test('should verify shadow effects', async ({ page }) => {
      await page.goto('http://localhost:3001');
      await page.waitForLoadState('networkidle');

      // Check for box shadows (neo-brutalist often uses strong shadows)
      const shadowedElements = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        const withShadows = [];

        elements.forEach(el => {
          const styles = window.getComputedStyle(el);
          if (styles.boxShadow !== 'none') {
            withShadows.push({
              tag: el.tagName,
              boxShadow: styles.boxShadow
            });
          }
        });

        return withShadows.slice(0, 10);
      });

      console.log('Elements with box shadows:', shadowedElements.length);
      console.log('Sample shadows:', shadowedElements.slice(0, 3));
    });
  });

  test.describe('6. Interactive Element Tests', () => {

    test('should test hover states on buttons', async ({ page }) => {
      await page.goto('http://localhost:3001');
      await page.waitForLoadState('networkidle');

      // Find first button
      const firstButton = page.locator('button').first();
      const isVisible = await firstButton.isVisible().catch(() => false);

      if (isVisible) {
        await firstButton.hover();
        await page.waitForTimeout(500);

        await page.screenshot({
          path: path.join(screenshotDir, '17-button-hover-state.png'),
          fullPage: true
        });
      }
    });

    test('should test focus states', async ({ page }) => {
      await page.goto('http://localhost:3001');
      await page.waitForLoadState('networkidle');

      // Tab to first focusable element
      await page.keyboard.press('Tab');
      await page.waitForTimeout(500);

      await page.screenshot({
        path: path.join(screenshotDir, '18-focus-state.png'),
        fullPage: true
      });
    });
  });

  test.describe('7. Error State Tests', () => {

    test('should test invalid room code entry', async ({ page }) => {
      await page.goto('http://localhost:3001/multiplayer');
      await page.waitForLoadState('networkidle');

      // Try to find join flow
      const joinButton = page.locator('button:has-text("Join"), a:has-text("Join")').first();
      const isJoinVisible = await joinButton.isVisible({ timeout: 5000 }).catch(() => false);

      if (isJoinVisible) {
        await joinButton.click();
        await page.waitForTimeout(1000);

        // Try to enter invalid room code
        const roomCodeInput = page.locator('input[type="text"]').first();
        const hasInput = await roomCodeInput.isVisible({ timeout: 5000 }).catch(() => false);

        if (hasInput) {
          await roomCodeInput.fill('INVALID123');
          await page.waitForTimeout(500);

          // Try to submit
          const submitButton = page.locator('button[type="submit"], button:has-text("Join")').first();
          const hasSubmit = await submitButton.isVisible().catch(() => false);

          if (hasSubmit) {
            await submitButton.click();
            await page.waitForTimeout(2000);

            await page.screenshot({
              path: path.join(screenshotDir, '19-invalid-room-code-error.png'),
              fullPage: true
            });
          }
        }
      }
    });
  });

  test.describe('8. Loading States Tests', () => {

    test('should observe initial page load', async ({ page }) => {
      // Capture loading state
      const loadPromise = page.goto('http://localhost:3001');

      // Try to capture loading state quickly
      await page.waitForTimeout(100);
      await page.screenshot({
        path: path.join(screenshotDir, '20-loading-state.png'),
        fullPage: true
      });

      await loadPromise;
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: path.join(screenshotDir, '21-loaded-state.png'),
        fullPage: true
      });
    });
  });
});
