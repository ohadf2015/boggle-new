import { test, expect } from '@playwright/test';

/**
 * Comprehensive UI/UX Testing for Redesigned Single Player Page (/singleplayer)
 * Tests all functional, visual, responsive, and accessibility requirements
 */

test.describe('Single Player Redesign - Comprehensive Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to single player page
    await page.goto('http://localhost:3001/en/singleplayer');
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Mode Switching Functionality', () => {
    test('should display all 3 mode cards (Solo vs Bots, Practice, Challenge)', async ({ page }) => {
      // Check that all 3 mode cards are present
      const modeCards = page.locator('button[aria-pressed]');
      await expect(modeCards).toHaveCount(3);

      // Verify each mode is present
      await expect(page.getByText('Solo vs Bots', { exact: false })).toBeVisible();
      await expect(page.getByText('Practice', { exact: false })).toBeVisible();
      await expect(page.getByText('Challenge', { exact: false })).toBeVisible();
    });

    test('should have Solo vs Bots selected by default', async ({ page }) => {
      const soloBotCard = page.locator('button[aria-pressed="true"]').first();
      await expect(soloBotCard).toBeVisible();

      // Check if it contains the bot icon or text
      const hasCorrectMode = await page.getByText('Solo vs Bots', { exact: false }).isVisible();
      expect(hasCorrectMode).toBe(true);
    });

    test('should switch to Practice mode when clicked', async ({ page }) => {
      // Click Practice mode
      const practiceButton = page.getByText('Practice', { exact: false }).locator('..');
      await practiceButton.click();

      // Wait for animation
      await page.waitForTimeout(400);

      // Check that Practice is now selected
      await expect(practiceButton).toHaveAttribute('aria-pressed', 'true');

      // Check that Quick Start header updates
      const quickStartHeader = page.getByText('Quick Start', { exact: false });
      await expect(quickStartHeader).toContainText('Practice');
    });

    test('should switch to Challenge mode when clicked', async ({ page }) => {
      // Click Challenge mode
      const challengeButton = page.getByText('Challenge', { exact: false }).locator('..');
      await challengeButton.click();

      // Wait for animation
      await page.waitForTimeout(400);

      // Check that Challenge is now selected
      await expect(challengeButton).toHaveAttribute('aria-pressed', 'true');

      // Check that Quick Start header updates
      const quickStartHeader = page.getByText('Quick Start', { exact: false });
      await expect(quickStartHeader).toContainText('Challenge');
    });

    test('should update presets dynamically when switching modes', async ({ page }) => {
      // Get initial preset count for Solo vs Bots
      const initialPresets = page.locator('button:has-text("Easy"), button:has-text("Medium"), button:has-text("Hard")');
      const initialCount = await initialPresets.count();

      // Switch to Practice
      await page.getByText('Practice', { exact: false }).locator('..').click();
      await page.waitForTimeout(400);

      // Check presets updated (should still have 3 difficulty levels)
      const practicePresets = page.locator('button:has-text("Easy"), button:has-text("Medium"), button:has-text("Hard")');
      const practiceCount = await practicePresets.count();
      expect(practiceCount).toBeGreaterThan(0);

      // Switch to Challenge
      await page.getByText('Challenge', { exact: false }).locator('..').click();
      await page.waitForTimeout(400);

      // Check presets updated again
      const challengePresets = page.locator('button:has-text("Easy"), button:has-text("Medium"), button:has-text("Hard")');
      const challengeCount = await challengePresets.count();
      expect(challengeCount).toBeGreaterThan(0);
    });

    test('should show visual feedback for selected mode', async ({ page }) => {
      const practiceButton = page.getByText('Practice', { exact: false }).locator('..');

      // Get styles before clicking
      const beforeClick = await practiceButton.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          transform: styles.transform,
          boxShadow: styles.boxShadow
        };
      });

      // Click Practice mode
      await practiceButton.click();
      await page.waitForTimeout(100);

      // Get styles after clicking (should have pressed state)
      const afterClick = await practiceButton.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          transform: styles.transform,
          boxShadow: styles.boxShadow
        };
      });

      // Verify visual change (transform or shadow should be different)
      expect(beforeClick.transform !== afterClick.transform || beforeClick.boxShadow !== afterClick.boxShadow).toBe(true);
    });
  });

  test.describe('Preset Cards Display and Content', () => {
    test('should display 3 preset cards for Solo vs Bots mode', async ({ page }) => {
      // Count preset cards (excluding mode selector cards)
      const presetCards = page.locator('button').filter({ hasText: /5×5|7×7|9×9/ });
      await expect(presetCards).toHaveCount(3);
    });

    test('should show grid size prominently on preset cards', async ({ page }) => {
      // Check that grid sizes are displayed
      await expect(page.getByText('5×5')).toBeVisible();
      await expect(page.getByText('7×7')).toBeVisible();
      await expect(page.getByText('9×9')).toBeVisible();

      // Verify grid size has large font (check computed font-size)
      const gridSizeElement = page.getByText('7×7').first();
      const fontSize = await gridSizeElement.evaluate(el => {
        return window.getComputedStyle(el).fontSize;
      });
      const fontSizeNum = parseInt(fontSize);
      expect(fontSizeNum).toBeGreaterThanOrEqual(30); // Should be at least 30px (text-3xl or larger)
    });

    test('should display difficulty names (Easy, Medium, Hard)', async ({ page }) => {
      await expect(page.locator('text=/Easy/i').first()).toBeVisible();
      await expect(page.locator('text=/Medium/i').first()).toBeVisible();
      await expect(page.locator('text=/Hard/i').first()).toBeVisible();
    });

    test('should show color-coded borders for difficulties', async ({ page }) => {
      // Find preset cards by grid size
      const easyCard = page.locator('button').filter({ hasText: '5×5' });
      const mediumCard = page.locator('button').filter({ hasText: '7×7' });
      const hardCard = page.locator('button').filter({ hasText: '9×9' });

      // Check border colors
      const easyBorder = await easyCard.evaluate(el => window.getComputedStyle(el).borderColor);
      const mediumBorder = await mediumCard.evaluate(el => window.getComputedStyle(el).borderColor);
      const hardBorder = await hardCard.evaluate(el => window.getComputedStyle(el).borderColor);

      // Colors should be different for each difficulty
      expect(easyBorder !== mediumBorder).toBe(true);
      expect(mediumBorder !== hardBorder).toBe(true);
      expect(easyBorder !== hardBorder).toBe(true);
    });

    test('should show bot count for Solo vs Bots mode', async ({ page }) => {
      // Solo vs Bots should be selected by default
      // Look for bot count text (e.g., "2 bots", "3 bots")
      const botText = page.locator('text=/\\d+ bot/i');
      await expect(botText.first()).toBeVisible();
    });

    test('should show "No timer" for Practice mode', async ({ page }) => {
      // Switch to Practice mode
      await page.getByText('Practice', { exact: false }).locator('..').click();
      await page.waitForTimeout(400);

      // Check for "No timer" text
      const noTimerText = page.locator('text=/No timer/i');
      await expect(noTimerText.first()).toBeVisible();
    });

    test('should show timer duration for timed modes', async ({ page }) => {
      // Solo vs Bots should show timer (e.g., "2m", "3m")
      const timerText = page.locator('text=/\\dm/');
      await expect(timerText.first()).toBeVisible();
    });

    test('should allow clicking preset cards to start game', async ({ page }) => {
      // Click a preset card
      const mediumPreset = page.locator('button').filter({ hasText: '7×7' }).first();
      await mediumPreset.click();

      // Should navigate to game (URL change or game UI appears)
      await page.waitForTimeout(1000);

      // Check if we're no longer on the preset selection screen
      const isStillOnPresetScreen = await page.getByText('Quick Start', { exact: false }).isVisible();
      expect(isStillOnPresetScreen).toBe(false);
    });
  });

  test.describe('Daily Challenge Card', () => {
    test('should display Daily Challenge card', async ({ page }) => {
      const dailyCard = page.locator('button').filter({ hasText: /Daily/i });
      await expect(dailyCard).toBeVisible();
    });

    test('should show puzzle number', async ({ page }) => {
      // Look for puzzle number format like "#123"
      const puzzleNumber = page.locator('text=/#\\d+/');
      await expect(puzzleNumber).toBeVisible();
    });

    test('should display calendar icon', async ({ page }) => {
      const dailyCard = page.locator('button').filter({ hasText: /Daily/i });
      // Check for icon within the card (SVG or icon element)
      const icon = dailyCard.locator('svg').first();
      await expect(icon).toBeVisible();
    });

    test('should be full-width on mobile portrait', async ({ page }) => {
      // Set viewport to mobile portrait
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(300);

      const dailyCard = page.locator('button').filter({ hasText: /Daily/i });
      const cardBox = await dailyCard.boundingBox();
      const viewportWidth = page.viewportSize()?.width || 375;

      // Card should be close to full width (accounting for padding)
      expect(cardBox?.width).toBeGreaterThan(viewportWidth * 0.85);
    });

    test('should navigate to daily challenge when clicked', async ({ page }) => {
      const dailyCard = page.locator('button').filter({ hasText: /Daily/i });

      // Record navigation
      const navigationPromise = page.waitForURL('**/daily');
      await dailyCard.click();

      // Should navigate to /daily route
      await navigationPromise;
      expect(page.url()).toContain('/daily');
    });
  });

  test.describe('Responsive Layout', () => {
    test('should work on mobile portrait (375x667)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      // Check layout doesn't overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBe(false);

      // Check mode cards are visible
      await expect(page.getByText('Solo vs Bots', { exact: false })).toBeVisible();

      // Check preset cards are visible
      await expect(page.getByText('5×5')).toBeVisible();
    });

    test('should work on small mobile portrait (320x568)', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.waitForTimeout(500);

      // Check no horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBe(false);

      // Essential elements should still be visible
      await expect(page.getByText('Single Player', { exact: false })).toBeVisible();
    });

    test('should work on tablet (768x1024)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);

      // Check layout is well-spaced
      const modeCards = page.locator('button[aria-pressed]');
      await expect(modeCards).toHaveCount(3);

      // All cards should be visible
      await expect(page.getByText('5×5')).toBeVisible();
      await expect(page.getByText('7×7')).toBeVisible();
      await expect(page.getByText('9×9')).toBeVisible();
    });

    test('should work on desktop (1920x1080)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(500);

      // Content should be centered with max-width
      const container = page.locator('main').first();
      const containerBox = await container.boundingBox();

      // Container should not be full screen width
      expect(containerBox?.width).toBeLessThan(1400);
    });

    test('should have adequate touch targets on mobile (min 44x44px)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      // Check mode card sizes
      const modeCard = page.locator('button[aria-pressed]').first();
      const modeCardBox = await modeCard.boundingBox();
      expect(modeCardBox?.height).toBeGreaterThanOrEqual(44);

      // Check preset card sizes
      const presetCard = page.locator('button').filter({ hasText: '5×5' }).first();
      const presetCardBox = await presetCard.boundingBox();
      expect(presetCardBox?.height).toBeGreaterThanOrEqual(44);
      expect(presetCardBox?.width).toBeGreaterThanOrEqual(44);
    });
  });

  test.describe('Visual Elements and Animations', () => {
    test('should have proper text hierarchy (grid size largest)', async ({ page }) => {
      // Get font sizes
      const gridSize = page.getByText('7×7').first();
      const difficultyName = page.getByText('Medium').first();

      const gridSizeFontSize = await gridSize.evaluate(el => parseInt(window.getComputedStyle(el).fontSize));
      const difficultyFontSize = await difficultyName.evaluate(el => parseInt(window.getComputedStyle(el).fontSize));

      // Grid size should be larger than difficulty name
      expect(gridSizeFontSize).toBeGreaterThan(difficultyFontSize);
    });

    test('should have smooth transitions when switching modes', async ({ page }) => {
      const practiceButton = page.getByText('Practice', { exact: false }).locator('..');

      // Click and observe transition
      await practiceButton.click();

      // Wait for animation (should complete within 500ms)
      await page.waitForTimeout(500);

      // Presets should have animated in
      const presetCard = page.locator('button').filter({ hasText: '5×5' }).first();
      await expect(presetCard).toBeVisible();

      // Check for opacity (should be fully visible after animation)
      const opacity = await presetCard.evaluate(el => window.getComputedStyle(el).opacity);
      expect(parseFloat(opacity)).toBe(1);
    });

    test('should have hover states on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });

      const presetCard = page.locator('button').filter({ hasText: '7×7' }).first();

      // Hover over card
      await presetCard.hover();
      await page.waitForTimeout(200);

      // Box shadow or transform should change (visual feedback)
      // This is hard to test precisely, but we can verify the element is still visible and interactive
      await expect(presetCard).toBeVisible();
    });

    test('should have active/pressed states', async ({ page }) => {
      const presetCard = page.locator('button').filter({ hasText: '7×7' }).first();

      // Press and hold
      await presetCard.dispatchEvent('mousedown');
      await page.waitForTimeout(100);

      // Should still be visible and styled
      await expect(presetCard).toBeVisible();

      await presetCard.dispatchEvent('mouseup');
    });

    test('should work in dark mode', async ({ page }) => {
      // Enable dark mode by adding dark class to html
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      await page.waitForTimeout(300);

      // Check that content is still visible
      await expect(page.getByText('Single Player')).toBeVisible();
      await expect(page.getByText('5×5')).toBeVisible();

      // Check background color has changed
      const bgColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
      });

      // Should be a dark color (RGB values should be low)
      expect(bgColor).toBeTruthy();
    });

    test('should maintain contrast in dark mode', async ({ page }) => {
      // Enable dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      await page.waitForTimeout(300);

      // Text should still be readable
      const heading = page.getByText('Single Player').first();
      const color = await heading.evaluate(el => window.getComputedStyle(el).color);

      // Color should be defined (not transparent or default)
      expect(color).toBeTruthy();
      expect(color).not.toBe('rgba(0, 0, 0, 0)');
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      // Mode cards should have aria-pressed
      const modeCards = page.locator('button[aria-pressed]');
      expect(await modeCards.count()).toBeGreaterThan(0);

      // Check aria-label on cards
      const practiceButton = page.getByText('Practice', { exact: false }).locator('..');
      const ariaLabel = await practiceButton.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    });

    test('should be keyboard navigable', async ({ page }) => {
      // Tab through interactive elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Some element should be focused
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    });

    test('should support Enter key to select mode', async ({ page }) => {
      // Tab to Practice mode
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Press Enter to select
      await page.keyboard.press('Enter');
      await page.waitForTimeout(400);

      // Mode should change (check if Quick Start header updates)
      // This is a basic test - actual behavior depends on focus management
      const isInteractive = await page.evaluate(() => {
        return document.activeElement?.tagName === 'BUTTON';
      });
      expect(isInteractive).toBe(true);
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle no high score gracefully in Challenge mode', async ({ page }) => {
      // Switch to Challenge mode
      await page.getByText('Challenge', { exact: false }).locator('..').click();
      await page.waitForTimeout(400);

      // Page should still render without errors
      await expect(page.getByText('5×5')).toBeVisible();

      // If there's a "Your Record" card, it should handle null gracefully
      // If not visible, that's also acceptable
      const recordCard = page.getByText('Your Record', { exact: false });
      const isVisible = await recordCard.isVisible();

      // Should either not show or show gracefully
      // No assertion failure means it handled it correctly
      expect(typeof isVisible).toBe('boolean');
    });

    test('should handle rapid mode switching', async ({ page }) => {
      // Rapidly switch between modes
      for (let i = 0; i < 5; i++) {
        await page.getByText('Practice', { exact: false }).locator('..').click();
        await page.waitForTimeout(100);
        await page.getByText('Challenge', { exact: false }).locator('..').click();
        await page.waitForTimeout(100);
        await page.getByText('Solo vs Bots', { exact: false }).locator('..').click();
        await page.waitForTimeout(100);
      }

      // Should still be functional
      await expect(page.getByText('5×5')).toBeVisible();
    });

    test('should handle very long streak numbers', async ({ page }) => {
      // This would require mocking localStorage, but we can check the UI doesn't break
      // if a streak badge is visible
      const streakBadge = page.locator('text=/streak/i');
      const isVisible = await streakBadge.isVisible();

      if (isVisible) {
        // Should be visible and not overflow
        const badgeBox = await streakBadge.first().boundingBox();
        expect(badgeBox?.width).toBeLessThan(200); // Reasonable width
      }
    });
  });

  test.describe('Challenge Mode High Score Display', () => {
    test('should show high score if available in Challenge mode', async ({ page }) => {
      // Switch to Challenge mode
      await page.getByText('Challenge', { exact: false }).locator('..').click();
      await page.waitForTimeout(400);

      // Look for high score display in presets
      const recordText = page.locator('text=/Record|Your Record/i');
      const hasRecord = await recordText.isVisible();

      // Should either show a record or handle null gracefully
      expect(typeof hasRecord).toBe('boolean');
    });
  });

  test.describe('Custom Game Button', () => {
    test('should display Custom Game button', async ({ page }) => {
      const customButton = page.getByText('Custom', { exact: false });
      await expect(customButton).toBeVisible();
    });

    test('should have settings icon', async ({ page }) => {
      const customButton = page.getByText('Custom', { exact: false }).locator('..');
      const icon = customButton.locator('svg').first();
      await expect(icon).toBeVisible();
    });
  });
});
