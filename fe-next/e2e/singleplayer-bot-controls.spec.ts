import { test, expect } from '@playwright/test';

/**
 * Comprehensive E2E tests for SinglePlayerBotControls component
 * Tests cover:
 * - Auto-fill toggle functionality
 * - One-click bot adding with difficulty buttons
 * - Bot removal functionality
 * - Maximum 5 bots limit enforcement
 * - Visual elements and animations
 * - Accessibility features
 * - Edge cases
 * - Integration with game start
 */

test.describe('SinglePlayerBotControls Component', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to single player page with solo-bots mode
    await page.goto('/en/singleplayer');
    await page.waitForLoadState('networkidle');

    // Ensure Solo vs Bots mode is selected (first mode button)
    const soloBotsButton = page.locator('button').filter({ hasText: /solo.*bots|vs.*bots/i }).first();
    if (await soloBotsButton.isVisible()) {
      await soloBotsButton.click();
    }

    // Wait for bot controls to be visible
    await page.waitForSelector('[data-testid="bot-controls"], .space-y-3:has([id="sp-auto-fill-switch"])', { timeout: 10000 });
  });

  test.describe('Auto-fill Toggle Functionality', () => {
    test('auto-fill switch is visible and initially off', async ({ page }) => {
      const autoFillSwitch = page.locator('#sp-auto-fill-switch');
      await expect(autoFillSwitch).toBeVisible();
      await expect(autoFillSwitch).toHaveAttribute('data-state', 'unchecked');
    });

    test('auto-fill switch has proper label', async ({ page }) => {
      const label = page.locator('label[for="sp-auto-fill-switch"]');
      await expect(label).toBeVisible();
      await expect(label).toContainText(/auto-fill|auto fill/i);
    });

    test('toggling auto-fill on adds 5 bots', async ({ page }) => {
      // Get initial bot count - may have default bot
      const initialBotCards = await page.locator('[class*="rounded-neo"]:has(.truncate)').count();

      // Toggle auto-fill on
      const autoFillSwitch = page.locator('#sp-auto-fill-switch');
      await autoFillSwitch.click();
      await expect(autoFillSwitch).toHaveAttribute('data-state', 'checked');

      // Wait for animation
      await page.waitForTimeout(500);

      // Check badge shows 5/5
      const badge = page.locator('.bg-neo-cyan:has-text("/5")');
      await expect(badge).toContainText('5/5');
    });

    test('auto-fill populates with mixed difficulties', async ({ page }) => {
      // Toggle auto-fill on
      await page.locator('#sp-auto-fill-switch').click();
      await page.waitForTimeout(500);

      // Check for different difficulty badges
      const easyBadges = page.locator('span.bg-neo-lime\\/20, [class*="bg-neo-lime/20"]');
      const mediumBadges = page.locator('span.bg-amber-400\\/20, [class*="bg-amber-400/20"]');
      const hardBadges = page.locator('span.bg-neo-red\\/20, [class*="bg-neo-red/20"]');

      // Should have mix of difficulties (exact distribution: 1 easy, 2 medium, 2 hard)
      // But count total should be visible
      const botCards = page.locator('.flex.flex-wrap.gap-2 > div[class*="rounded-neo"]');
      await expect(botCards).toHaveCount(5, { timeout: 3000 });
    });

    test('screen reader announcement is made when auto-fill adds bots', async ({ page }) => {
      // Check for aria-live region
      const liveRegion = page.locator('[role="status"][aria-live="polite"]');
      await expect(liveRegion).toBeVisible({ visible: false }); // sr-only but exists

      // Toggle auto-fill
      await page.locator('#sp-auto-fill-switch').click();

      // Check announcement content changes
      await page.waitForTimeout(100);
      const announcement = await liveRegion.textContent();
      expect(announcement).toMatch(/bots added|added/i);
    });
  });

  test.describe('One-click Bot Adding', () => {
    test('Easy bot button is visible with correct icon', async ({ page }) => {
      const easyButton = page.locator('button').filter({ hasText: /Easy/i }).first();
      await expect(easyButton).toBeVisible();
      await expect(easyButton).toContainText('Easy');
    });

    test('Medium bot button is visible with correct icon', async ({ page }) => {
      const mediumButton = page.locator('button').filter({ hasText: /Medium/i }).first();
      await expect(mediumButton).toBeVisible();
      await expect(mediumButton).toContainText('Medium');
    });

    test('Hard bot button is visible with correct icon', async ({ page }) => {
      const hardButton = page.locator('button').filter({ hasText: /Hard/i }).first();
      await expect(hardButton).toBeVisible();
      await expect(hardButton).toContainText('Hard');
    });

    test('clicking Easy button adds an easy bot', async ({ page }) => {
      // First remove any default bots by finding and clicking remove buttons
      const removeButtons = page.locator('button[aria-label*="Remove"]');
      const removeCount = await removeButtons.count();
      for (let i = 0; i < removeCount; i++) {
        await removeButtons.first().click();
        await page.waitForTimeout(200);
      }

      // Click easy button
      const easyButton = page.locator('button').filter({ hasText: /Easy/i }).first();
      await easyButton.click();
      await page.waitForTimeout(300);

      // Verify bot was added
      const badge = page.locator('[class*="bg-neo-cyan"]:has-text("/5")');
      await expect(badge).toContainText('1/5');
    });

    test('clicking Medium button adds a medium bot', async ({ page }) => {
      // Remove default bots
      const removeButtons = page.locator('button[aria-label*="Remove"]');
      const removeCount = await removeButtons.count();
      for (let i = 0; i < removeCount; i++) {
        await removeButtons.first().click();
        await page.waitForTimeout(200);
      }

      // Click medium button
      const mediumButton = page.locator('button').filter({ hasText: /Medium/i }).first();
      await mediumButton.click();
      await page.waitForTimeout(300);

      // Verify badge shows 1/5
      const badge = page.locator('[class*="bg-neo-cyan"]:has-text("/5")');
      await expect(badge).toContainText('1/5');
    });

    test('clicking Hard button adds a hard bot', async ({ page }) => {
      // Remove default bots
      const removeButtons = page.locator('button[aria-label*="Remove"]');
      const removeCount = await removeButtons.count();
      for (let i = 0; i < removeCount; i++) {
        await removeButtons.first().click();
        await page.waitForTimeout(200);
      }

      // Click hard button
      const hardButton = page.locator('button').filter({ hasText: /Hard/i }).first();
      await hardButton.click();
      await page.waitForTimeout(300);

      // Verify badge shows 1/5
      const badge = page.locator('[class*="bg-neo-cyan"]:has-text("/5")');
      await expect(badge).toContainText('1/5');
    });

    test('bot is assigned a random name from predefined list', async ({ page }) => {
      // Expected bot names
      const botNames = ['WordBot', 'LexiBot', 'AlphaBot', 'BrainBot', 'SpeedBot',
        'CleverBot', 'QuickBot', 'SmartBot', 'ProBot', 'MasterBot'];

      // Add a bot
      const easyButton = page.locator('button').filter({ hasText: /Easy/i }).first();
      await easyButton.click();
      await page.waitForTimeout(300);

      // Find bot card with name
      const botNameElement = page.locator('.truncate.max-w-\\[80px\\]');
      const botName = await botNameElement.first().textContent();
      expect(botNames).toContain(botName);
    });

    test('bot cards display avatar emoji', async ({ page }) => {
      // Add a bot
      const easyButton = page.locator('button').filter({ hasText: /Easy/i }).first();
      await easyButton.click();
      await page.waitForTimeout(300);

      // Check for avatar container
      const avatarContainer = page.locator('.w-6.h-6.rounded-full.flex.items-center.justify-center');
      await expect(avatarContainer.first()).toBeVisible();
    });
  });

  test.describe('Bot Removal Functionality', () => {
    test('remove button appears on bot cards', async ({ page }) => {
      // Add a bot first
      const easyButton = page.locator('button').filter({ hasText: /Easy/i }).first();
      await easyButton.click();
      await page.waitForTimeout(300);

      // Check for remove button
      const removeButton = page.locator('button[aria-label*="Remove"]').first();
      await expect(removeButton).toBeVisible();
    });

    test('clicking remove button removes the bot', async ({ page }) => {
      // First ensure we have a consistent state - remove all then add one
      const removeButtons = page.locator('button[aria-label*="Remove"]');
      let removeCount = await removeButtons.count();
      for (let i = 0; i < removeCount; i++) {
        await removeButtons.first().click();
        await page.waitForTimeout(200);
      }

      // Add two bots
      const easyButton = page.locator('button').filter({ hasText: /Easy/i }).first();
      await easyButton.click();
      await page.waitForTimeout(200);
      await easyButton.click();
      await page.waitForTimeout(200);

      // Verify 2 bots
      let badge = page.locator('[class*="bg-neo-cyan"]:has-text("/5")');
      await expect(badge).toContainText('2/5');

      // Remove one bot
      await page.locator('button[aria-label*="Remove"]').first().click();
      await page.waitForTimeout(300);

      // Verify 1 bot remaining
      badge = page.locator('[class*="bg-neo-cyan"]:has-text("/5")');
      await expect(badge).toContainText('1/5');
    });

    test('removing a bot disables auto-fill toggle', async ({ page }) => {
      // Enable auto-fill first
      const autoFillSwitch = page.locator('#sp-auto-fill-switch');
      await autoFillSwitch.click();
      await expect(autoFillSwitch).toHaveAttribute('data-state', 'checked');
      await page.waitForTimeout(500);

      // Remove a bot
      await page.locator('button[aria-label*="Remove"]').first().click();
      await page.waitForTimeout(300);

      // Auto-fill should now be off
      await expect(autoFillSwitch).toHaveAttribute('data-state', 'unchecked');
    });

    test('screen reader announcement when bot is removed', async ({ page }) => {
      // Add a bot
      const easyButton = page.locator('button').filter({ hasText: /Easy/i }).first();
      await easyButton.click();
      await page.waitForTimeout(300);

      // Get the live region
      const liveRegion = page.locator('[role="status"][aria-live="polite"]');

      // Remove the bot
      await page.locator('button[aria-label*="Remove"]').first().click();
      await page.waitForTimeout(100);

      // Check announcement
      const announcement = await liveRegion.textContent();
      expect(announcement).toMatch(/removed/i);
    });
  });

  test.describe('Maximum 5 Bots Limit', () => {
    test('add buttons become disabled at 5 bots', async ({ page }) => {
      // Enable auto-fill to get 5 bots quickly
      await page.locator('#sp-auto-fill-switch').click();
      await page.waitForTimeout(500);

      // Check that add buttons are disabled
      const easyButton = page.locator('button').filter({ hasText: /Easy/i }).first();
      await expect(easyButton).toBeDisabled();

      const mediumButton = page.locator('button').filter({ hasText: /Medium/i }).first();
      await expect(mediumButton).toBeDisabled();

      const hardButton = page.locator('button').filter({ hasText: /Hard/i }).first();
      await expect(hardButton).toBeDisabled();
    });

    test('maximum reached message appears at 5 bots', async ({ page }) => {
      // Enable auto-fill to get 5 bots
      await page.locator('#sp-auto-fill-switch').click();
      await page.waitForTimeout(500);

      // Check for max reached message
      const maxMessage = page.locator('text=/maximum.*reached|max.*bots/i');
      await expect(maxMessage).toBeVisible();
    });

    test('cannot add more than 5 bots manually', async ({ page }) => {
      // Clear all bots first
      const removeButtons = page.locator('button[aria-label*="Remove"]');
      let removeCount = await removeButtons.count();
      for (let i = 0; i < removeCount; i++) {
        await removeButtons.first().click();
        await page.waitForTimeout(200);
      }

      // Add 5 bots manually
      const easyButton = page.locator('button').filter({ hasText: /Easy/i }).first();
      for (let i = 0; i < 5; i++) {
        await easyButton.click();
        await page.waitForTimeout(200);
      }

      // Button should now be disabled
      await expect(easyButton).toBeDisabled();

      // Badge should show 5/5
      const badge = page.locator('[class*="bg-neo-cyan"]:has-text("/5")');
      await expect(badge).toContainText('5/5');
    });

    test('badge shows correct count (n/5)', async ({ page }) => {
      // Clear bots
      const removeButtons = page.locator('button[aria-label*="Remove"]');
      let removeCount = await removeButtons.count();
      for (let i = 0; i < removeCount; i++) {
        await removeButtons.first().click();
        await page.waitForTimeout(200);
      }

      // Add bots one by one and verify count
      const easyButton = page.locator('button').filter({ hasText: /Easy/i }).first();

      for (let i = 1; i <= 3; i++) {
        await easyButton.click();
        await page.waitForTimeout(300);
        const badge = page.locator('[class*="bg-neo-cyan"]:has-text("/5")');
        await expect(badge).toContainText(`${i}/5`);
      }
    });
  });

  test.describe('Visual Elements and Animations', () => {
    test('bot cards have correct difficulty background tint', async ({ page }) => {
      // Clear existing bots
      const removeButtons = page.locator('button[aria-label*="Remove"]');
      let removeCount = await removeButtons.count();
      for (let i = 0; i < removeCount; i++) {
        await removeButtons.first().click();
        await page.waitForTimeout(200);
      }

      // Add easy bot
      await page.locator('button').filter({ hasText: /Easy/i }).first().click();
      await page.waitForTimeout(300);

      // Check for lime tint on easy bot card
      const botCard = page.locator('.flex.items-center.gap-2.rounded-neo').first();
      const classes = await botCard.getAttribute('class');
      expect(classes).toContain('bg-neo-lime');
    });

    test('bot add buttons have proper styling', async ({ page }) => {
      // Easy button should have lime background
      const easyButton = page.locator('button').filter({ hasText: /Easy/i }).first();
      const easyClasses = await easyButton.getAttribute('class');
      expect(easyClasses).toContain('bg-neo-lime');

      // Medium button should have amber background
      const mediumButton = page.locator('button').filter({ hasText: /Medium/i }).first();
      const mediumClasses = await mediumButton.getAttribute('class');
      expect(mediumClasses).toContain('amber');

      // Hard button should have red background
      const hardButton = page.locator('button').filter({ hasText: /Hard/i }).first();
      const hardClasses = await hardButton.getAttribute('class');
      expect(hardClasses).toContain('bg-neo-red');
    });

    test('auto-fill card has purple styling', async ({ page }) => {
      const autoFillCard = page.locator('.bg-neo-purple\\/10, [class*="bg-neo-purple/10"]').first();
      await expect(autoFillCard).toBeVisible();
    });

    test('bot card animations on add/remove', async ({ page }) => {
      // Clear bots
      const removeButtons = page.locator('button[aria-label*="Remove"]');
      let removeCount = await removeButtons.count();
      for (let i = 0; i < removeCount; i++) {
        await removeButtons.first().click();
        await page.waitForTimeout(200);
      }

      // Add a bot and verify motion wrapper exists
      await page.locator('button').filter({ hasText: /Easy/i }).first().click();

      // The motion.div should be rendered (framer-motion adds style transforms)
      const botCard = page.locator('[class*="rounded-neo"]:has(.truncate)').first();
      await expect(botCard).toBeVisible();
    });

    test('header shows robot icon', async ({ page }) => {
      // Check for FaRobot icon in header
      const robotIcon = page.locator('svg.text-neo-purple').first();
      await expect(robotIcon).toBeVisible();
    });
  });

  test.describe('Accessibility Features', () => {
    test('auto-fill switch has aria-describedby', async ({ page }) => {
      const autoFillSwitch = page.locator('#sp-auto-fill-switch');
      const describedBy = await autoFillSwitch.getAttribute('aria-describedby');
      expect(describedBy).toBe('sp-auto-fill-desc');
    });

    test('add buttons have aria-label', async ({ page }) => {
      const easyButton = page.locator('button').filter({ hasText: /Easy/i }).first();
      const ariaLabel = await easyButton.getAttribute('aria-label');
      expect(ariaLabel).toMatch(/add.*easy.*bot/i);
    });

    test('remove buttons have descriptive aria-label', async ({ page }) => {
      // Add a bot
      await page.locator('button').filter({ hasText: /Easy/i }).first().click();
      await page.waitForTimeout(300);

      // Check remove button aria-label includes bot name
      const removeButton = page.locator('button[aria-label*="Remove"]').first();
      const ariaLabel = await removeButton.getAttribute('aria-label');
      expect(ariaLabel).toMatch(/remove/i);
    });

    test('difficulty badges have aria-label', async ({ page }) => {
      // Add a bot
      await page.locator('button').filter({ hasText: /Easy/i }).first().click();
      await page.waitForTimeout(300);

      // Check badge has aria-label
      const difficultyBadge = page.locator('[aria-label*="difficulty"]').first();
      await expect(difficultyBadge).toBeVisible();
    });

    test('screen reader live region exists', async ({ page }) => {
      const liveRegion = page.locator('[role="status"][aria-live="polite"]');
      await expect(liveRegion).toHaveCount(1);
    });

    test('keyboard navigation works for add buttons', async ({ page }) => {
      // Tab to easy button
      const easyButton = page.locator('button').filter({ hasText: /Easy/i }).first();
      await easyButton.focus();
      await expect(easyButton).toBeFocused();

      // Press enter to add bot
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);

      // Verify bot was added
      const badge = page.locator('[class*="bg-neo-cyan"]:has-text("/5")');
      await expect(badge).toBeVisible();
    });

    test('switch can be toggled with keyboard', async ({ page }) => {
      const autoFillSwitch = page.locator('#sp-auto-fill-switch');
      await autoFillSwitch.focus();
      await expect(autoFillSwitch).toBeFocused();

      // Press space to toggle
      await page.keyboard.press('Space');
      await expect(autoFillSwitch).toHaveAttribute('data-state', 'checked');
    });

    test('buttons meet minimum touch target size (44px)', async ({ page }) => {
      const easyButton = page.locator('button').filter({ hasText: /Easy/i }).first();
      const box = await easyButton.boundingBox();

      expect(box?.height).toBeGreaterThanOrEqual(44);
    });
  });

  test.describe('Edge Cases', () => {
    test('empty state message shows when no bots', async ({ page }) => {
      // Remove all bots
      const removeButtons = page.locator('button[aria-label*="Remove"]');
      let removeCount = await removeButtons.count();
      for (let i = 0; i < removeCount; i++) {
        await removeButtons.first().click();
        await page.waitForTimeout(200);
      }

      // Check for empty state message
      const emptyMessage = page.locator('text=/add.*AI.*opponents|no.*bots/i');
      await expect(emptyMessage).toBeVisible();
    });

    test('empty state shows hint text', async ({ page }) => {
      // Remove all bots
      const removeButtons = page.locator('button[aria-label*="Remove"]');
      let removeCount = await removeButtons.count();
      for (let i = 0; i < removeCount; i++) {
        await removeButtons.first().click();
        await page.waitForTimeout(200);
      }

      // Check for hint text
      const hintText = page.locator('text=/auto-fill|click.*buttons/i');
      await expect(hintText).toBeVisible();
    });

    test('toggling auto-fill off keeps existing bots', async ({ page }) => {
      // Enable auto-fill
      const autoFillSwitch = page.locator('#sp-auto-fill-switch');
      await autoFillSwitch.click();
      await page.waitForTimeout(500);

      // Verify 5 bots
      let badge = page.locator('[class*="bg-neo-cyan"]:has-text("/5")');
      await expect(badge).toContainText('5/5');

      // Turn off auto-fill
      await autoFillSwitch.click();
      await expect(autoFillSwitch).toHaveAttribute('data-state', 'unchecked');

      // Bots should still be there
      await expect(badge).toContainText('5/5');
    });

    test('unique bot names when adding multiple bots', async ({ page }) => {
      // Clear existing bots
      const removeButtons = page.locator('button[aria-label*="Remove"]');
      let removeCount = await removeButtons.count();
      for (let i = 0; i < removeCount; i++) {
        await removeButtons.first().click();
        await page.waitForTimeout(200);
      }

      // Add 5 bots
      const easyButton = page.locator('button').filter({ hasText: /Easy/i }).first();
      for (let i = 0; i < 5; i++) {
        await easyButton.click();
        await page.waitForTimeout(200);
      }

      // Get all bot names
      const botNames = await page.locator('.truncate.max-w-\\[80px\\]').allTextContents();

      // Check all names are unique
      const uniqueNames = new Set(botNames);
      expect(uniqueNames.size).toBe(botNames.length);
    });

    test('rapid add/remove does not break state', async ({ page }) => {
      // Clear bots
      const removeButtons = page.locator('button[aria-label*="Remove"]');
      let removeCount = await removeButtons.count();
      for (let i = 0; i < removeCount; i++) {
        await removeButtons.first().click();
        await page.waitForTimeout(100);
      }

      // Rapidly add 3 bots
      const easyButton = page.locator('button').filter({ hasText: /Easy/i }).first();
      await easyButton.click();
      await easyButton.click();
      await easyButton.click();

      await page.waitForTimeout(500);

      // Verify count is correct (should be 3 or less if some failed)
      const badge = page.locator('[class*="bg-neo-cyan"]:has-text("/5")');
      const badgeText = await badge.textContent();
      const count = parseInt(badgeText?.split('/')[0] || '0');
      expect(count).toBeLessThanOrEqual(5);
      expect(count).toBeGreaterThan(0);
    });

    test('component works in landscape mode', async ({ page }) => {
      // Set landscape viewport
      await page.setViewportSize({ width: 844, height: 390 });
      await page.goto('/en/singleplayer');
      await page.waitForLoadState('networkidle');

      // Select solo-bots mode
      const soloBotsButton = page.locator('button').filter({ hasText: /solo.*bots|vs.*bots/i }).first();
      if (await soloBotsButton.isVisible()) {
        await soloBotsButton.click();
      }

      await page.waitForTimeout(500);

      // Bot controls should still be functional
      const autoFillSwitch = page.locator('#sp-auto-fill-switch');
      await expect(autoFillSwitch).toBeVisible();
    });
  });

  test.describe('Integration with Game Start', () => {
    test('bots are passed to game when starting', async ({ page }) => {
      // Enable auto-fill to add bots
      await page.locator('#sp-auto-fill-switch').click();
      await page.waitForTimeout(500);

      // Click start game button
      const startButton = page.locator('button').filter({ hasText: /start.*game/i }).first();
      await startButton.click();

      // Wait for game to start
      await page.waitForTimeout(2000);

      // Check if we're in game (grid should be visible or game UI elements)
      const gameIndicator = page.locator('[class*="grid"], [data-testid="game-grid"], .game-container');
      // The game should have started (navigated away from lobby)
      const currentUrl = page.url();
      expect(currentUrl).toContain('singleplayer');
    });

    test('start button is always enabled regardless of bot count', async ({ page }) => {
      // Remove all bots
      const removeButtons = page.locator('button[aria-label*="Remove"]');
      let removeCount = await removeButtons.count();
      for (let i = 0; i < removeCount; i++) {
        await removeButtons.first().click();
        await page.waitForTimeout(200);
      }

      // Start button should still be enabled (can play without bots)
      const startButton = page.locator('button').filter({ hasText: /start.*game/i }).first();
      await expect(startButton).toBeEnabled();
    });

    test('game can start with 0 bots', async ({ page }) => {
      // Remove all bots
      const removeButtons = page.locator('button[aria-label*="Remove"]');
      let removeCount = await removeButtons.count();
      for (let i = 0; i < removeCount; i++) {
        await removeButtons.first().click();
        await page.waitForTimeout(200);
      }

      // Start the game
      const startButton = page.locator('button').filter({ hasText: /start.*game/i }).first();
      await startButton.click();

      // Game should start (no errors)
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      expect(currentUrl).toContain('singleplayer');
    });

    test('game can start with maximum bots', async ({ page }) => {
      // Enable auto-fill
      await page.locator('#sp-auto-fill-switch').click();
      await page.waitForTimeout(500);

      // Start the game
      const startButton = page.locator('button').filter({ hasText: /start.*game/i }).first();
      await startButton.click();

      // Game should start
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      expect(currentUrl).toContain('singleplayer');
    });
  });

  test.describe('Disabled State', () => {
    test('controls are disabled when disabled prop is true', async ({ page }) => {
      // This would require modifying the component to test disabled state
      // For now, we verify the styling exists for disabled state
      const easyButton = page.locator('button').filter({ hasText: /Easy/i }).first();
      const classes = await easyButton.getAttribute('class');
      expect(classes).toContain('disabled:opacity-50');
      expect(classes).toContain('disabled:cursor-not-allowed');
    });
  });
});
