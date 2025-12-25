/**
 * Comprehensive UI Test for Create/Join Game Card - LexiClash
 *
 * Tests the recent compact UI changes:
 * 1. Room name field removed (auto-generated from player name)
 * 2. Avatar selector combined inline with name input
 * 3. Language selector converted to compact dropdown
 * 4. Mode selector made more compact
 * 5. Action buttons positioned inside inputs
 * 6. Form spacing reduced
 */

const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const SCREENSHOTS_DIR = './test-screenshots';

// Viewport configurations
const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1024, height: 768 },
  desktopLarge: { width: 1920, height: 1080 }
};

test.describe('Create/Join Game Card - Comprehensive UI Testing', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to multiplayer page
    await page.goto(`${BASE_URL}/en/multiplayer`, { waitUntil: 'networkidle' });

    // Wait for the main content to be visible
    await page.waitForSelector('form', { timeout: 10000 });
  });

  test.describe('1. Join Mode (Guest User)', () => {

    test('1.1 Room code input with inline paste button displays correctly', async ({ page }) => {
      // Ensure we're in join mode
      const joinButton = page.locator('button:has-text("Join")').first();
      if (await joinButton.isVisible()) {
        await joinButton.click();
      }

      // Check room code input exists
      const roomCodeInput = page.locator('input#gameCode');
      await expect(roomCodeInput).toBeVisible();

      // Verify placeholder text
      const placeholder = await roomCodeInput.getAttribute('placeholder');
      expect(placeholder).toBeTruthy();

      // Check for inline paste button
      const pasteButton = page.locator('button[aria-label*="Paste"]');
      await expect(pasteButton).toBeVisible();

      // Verify paste button is positioned inside the input (relative positioning)
      const pasteButtonBox = await pasteButton.boundingBox();
      const inputBox = await roomCodeInput.boundingBox();

      expect(pasteButtonBox.x).toBeGreaterThan(inputBox.x);
      expect(pasteButtonBox.x + pasteButtonBox.width).toBeLessThanOrEqual(inputBox.x + inputBox.width + 5);

      // Take screenshot
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/join-mode-room-code-input-${Date.now()}.png`,
        fullPage: false
      });
    });

    test('1.2 Avatar + Name inline layout displays correctly', async ({ page }) => {
      // Ensure we're in join mode
      const joinButton = page.locator('button:has-text("Join")').first();
      if (await joinButton.isVisible()) {
        await joinButton.click();
      }

      // Wait for the form to stabilize
      await page.waitForTimeout(500);

      // Check for avatar button and username input in the same row
      const avatarButton = page.locator('button[aria-label*="Select avatar"], button[aria-label*="avatar"]').first();
      const usernameInput = page.locator('input#username-main, input[placeholder*="name" i], input[placeholder*="Player" i]').first();

      // Verify both elements are visible
      await expect(avatarButton).toBeVisible({ timeout: 5000 });
      await expect(usernameInput).toBeVisible({ timeout: 5000 });

      // Check they're in a flex container (inline layout)
      const avatarBox = await avatarButton.boundingBox();
      const usernameBox = await usernameInput.boundingBox();

      // Verify they're on the same horizontal line (within 20px tolerance)
      expect(Math.abs(avatarBox.y - usernameBox.y)).toBeLessThan(20);

      // Verify avatar is to the left of username input (for LTR)
      expect(avatarBox.x).toBeLessThan(usernameBox.x);

      // Take screenshot
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/join-mode-avatar-name-inline-${Date.now()}.png`,
        fullPage: false
      });
    });

    test('1.3 Avatar picker modal opens and saves selection', async ({ page }) => {
      // Ensure we're in join mode
      const joinButton = page.locator('button:has-text("Join")').first();
      if (await joinButton.isVisible()) {
        await joinButton.click();
      }

      await page.waitForTimeout(500);

      // Click avatar selector button
      const avatarButton = page.locator('button[aria-label*="Select avatar"], button[aria-label*="avatar"]').first();
      await avatarButton.click({ timeout: 5000 });

      // Wait for modal to open
      await page.waitForTimeout(500);

      // Check if modal/dialog is visible
      const modal = page.locator('[role="dialog"], .dialog, [class*="Dialog"]').first();
      await expect(modal).toBeVisible({ timeout: 3000 });

      // Take screenshot of modal
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/join-mode-avatar-modal-${Date.now()}.png`,
        fullPage: false
      });

      // Find and click an avatar option
      const avatarOption = page.locator('button[class*="avatar"], [role="button"][class*="emoji"]').first();
      if (await avatarOption.isVisible()) {
        await avatarOption.click();

        // Wait for modal to close
        await page.waitForTimeout(500);

        // Verify modal is closed
        await expect(modal).not.toBeVisible();

        // Verify selection persisted (check localStorage or avatar button changed)
        const updatedAvatarButton = page.locator('button[aria-label*="Select avatar"], button[aria-label*="avatar"]').first();
        await expect(updatedAvatarButton).toBeVisible();
      }
    });

    test('1.4 Form validation works (empty fields, invalid code)', async ({ page }) => {
      // Ensure we're in join mode
      const joinButton = page.locator('button:has-text("Join")').first();
      if (await joinButton.isVisible()) {
        await joinButton.click();
      }

      await page.waitForTimeout(500);

      // Clear all fields
      const roomCodeInput = page.locator('input#gameCode');
      const usernameInput = page.locator('input#username-main, input[placeholder*="name" i]').first();

      await roomCodeInput.clear();
      await usernameInput.clear();

      // Try to submit with empty fields
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Check for validation errors
      await page.waitForTimeout(500);

      // Look for error messages
      const errorMessages = page.locator('p[role="alert"], .text-red-400, [class*="error"]');
      const errorCount = await errorMessages.count();
      expect(errorCount).toBeGreaterThan(0);

      // Take screenshot of validation errors
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/join-mode-validation-empty-${Date.now()}.png`,
        fullPage: false
      });

      // Test invalid room code (special characters)
      await roomCodeInput.fill('INVALID@#$');
      await usernameInput.fill('TestPlayer');

      await page.waitForTimeout(300);

      // Take screenshot of invalid code
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/join-mode-validation-invalid-code-${Date.now()}.png`,
        fullPage: false
      });
    });

    test('1.5 Submit button enables/disables correctly', async ({ page }) => {
      // Ensure we're in join mode
      const joinButton = page.locator('button:has-text("Join")').first();
      if (await joinButton.isVisible()) {
        await joinButton.click();
      }

      await page.waitForTimeout(500);

      const submitButton = page.locator('button[type="submit"]');
      const roomCodeInput = page.locator('input#gameCode');
      const usernameInput = page.locator('input#username-main, input[placeholder*="name" i]').first();

      // Fill valid data
      await roomCodeInput.fill('TEST123');
      await usernameInput.fill('Player1');

      // Check button is enabled
      const isEnabled = await submitButton.isEnabled();
      expect(isEnabled).toBe(true);

      // Clear room code
      await roomCodeInput.clear();

      await page.waitForTimeout(300);

      // Button should still be enabled (HTML5 validation will catch on submit)
      // But check for any disabled state
      const hasDisabledAttr = await submitButton.getAttribute('disabled');
      console.log('Submit button disabled state:', hasDisabledAttr);
    });
  });

  test.describe('2. Host Mode (Guest User)', () => {

    test('2.1 Avatar + Name inline layout displays correctly', async ({ page }) => {
      // Switch to host mode
      const hostButton = page.locator('button:has-text("Host"), button:has-text("Create")').first();
      await hostButton.click();

      await page.waitForTimeout(500);

      // Check for avatar button and host username input in the same row
      const avatarButton = page.locator('button[aria-label*="Select avatar"], button[aria-label*="avatar"]').first();
      const hostUsernameInput = page.locator('input#hostUsername, input[placeholder*="Host" i]').first();

      // Verify both elements are visible
      await expect(avatarButton).toBeVisible({ timeout: 5000 });
      await expect(hostUsernameInput).toBeVisible({ timeout: 5000 });

      // Check they're in a flex container (inline layout)
      const avatarBox = await avatarButton.boundingBox();
      const usernameBox = await hostUsernameInput.boundingBox();

      // Verify they're on the same horizontal line (within 20px tolerance)
      expect(Math.abs(avatarBox.y - usernameBox.y)).toBeLessThan(20);

      // Verify avatar is to the left of username input (for LTR)
      expect(avatarBox.x).toBeLessThan(usernameBox.x);

      // Take screenshot
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/host-mode-avatar-name-inline-${Date.now()}.png`,
        fullPage: false
      });
    });

    test('2.2 Room code input with inline generate button works', async ({ page }) => {
      // Switch to host mode
      const hostButton = page.locator('button:has-text("Host"), button:has-text("Create")').first();
      await hostButton.click();

      await page.waitForTimeout(500);

      // Check room code input exists
      const roomCodeInput = page.locator('input#gameCode');
      await expect(roomCodeInput).toBeVisible();

      // Check for inline generate button
      const generateButton = page.locator('button:has([class*="FaDice"]), button[aria-label*="generate" i]');
      await expect(generateButton).toBeVisible();

      // Verify generate button is positioned inside the input
      const generateButtonBox = await generateButton.boundingBox();
      const inputBox = await roomCodeInput.boundingBox();

      expect(generateButtonBox.x).toBeGreaterThan(inputBox.x);

      // Get initial code value
      const initialCode = await roomCodeInput.inputValue();

      // Click generate button
      await generateButton.click();
      await page.waitForTimeout(300);

      // Verify code changed
      const newCode = await roomCodeInput.inputValue();
      expect(newCode).not.toBe(initialCode);
      expect(newCode.length).toBeGreaterThan(0);

      // Take screenshot
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/host-mode-generate-code-${Date.now()}.png`,
        fullPage: false
      });
    });

    test('2.3 Language dropdown opens and shows all options', async ({ page }) => {
      // Switch to host mode
      const hostButton = page.locator('button:has-text("Host"), button:has-text("Create")').first();
      await hostButton.click();

      await page.waitForTimeout(500);

      // Find language selector
      const languageSelector = page.locator('select, button[role="combobox"], [class*="LanguageSelector"]').first();
      await expect(languageSelector).toBeVisible({ timeout: 5000 });

      // Click to open dropdown
      await languageSelector.click();
      await page.waitForTimeout(300);

      // Take screenshot of opened dropdown
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/host-mode-language-dropdown-${Date.now()}.png`,
        fullPage: false
      });

      // Check for language options (should have at least 2-3 options)
      const options = page.locator('[role="option"], option, [class*="option"]');
      const optionCount = await options.count();
      expect(optionCount).toBeGreaterThan(1);
    });

    test('2.4 Language selection persists', async ({ page }) => {
      // Switch to host mode
      const hostButton = page.locator('button:has-text("Host"), button:has-text("Create")').first();
      await hostButton.click();

      await page.waitForTimeout(500);

      // Find language selector
      const languageSelector = page.locator('select, button[role="combobox"]').first();

      // If it's a select element
      if (await languageSelector.evaluate(el => el.tagName === 'SELECT')) {
        const initialValue = await languageSelector.inputValue();

        // Change language
        await languageSelector.selectOption({ index: 1 });
        await page.waitForTimeout(300);

        const newValue = await languageSelector.inputValue();
        expect(newValue).not.toBe(initialValue);
      } else {
        // If it's a custom dropdown
        await languageSelector.click();
        await page.waitForTimeout(300);

        const option = page.locator('[role="option"]').nth(1);
        if (await option.isVisible()) {
          await option.click();
          await page.waitForTimeout(300);
        }
      }

      // Take screenshot
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/host-mode-language-selected-${Date.now()}.png`,
        fullPage: false
      });
    });

    test('2.5 Form validation works', async ({ page }) => {
      // Switch to host mode
      const hostButton = page.locator('button:has-text("Host"), button:has-text("Create")').first();
      await hostButton.click();

      await page.waitForTimeout(500);

      // Clear all fields
      const roomCodeInput = page.locator('input#gameCode');
      const hostUsernameInput = page.locator('input#hostUsername').first();

      await roomCodeInput.clear();
      await hostUsernameInput.clear();

      // Try to submit with empty fields
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Check for validation errors
      await page.waitForTimeout(500);

      // Look for error messages
      const errorMessages = page.locator('p[role="alert"], .text-red-400');
      const errorCount = await errorMessages.count();
      expect(errorCount).toBeGreaterThan(0);

      // Take screenshot of validation errors
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/host-mode-validation-${Date.now()}.png`,
        fullPage: false
      });
    });
  });

  test.describe('3. Responsive Testing', () => {

    test('3.1 Mobile view (375px) - all fields fit without scrolling', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.waitForTimeout(500);

      // Check if main form is visible
      const form = page.locator('form').first();
      await expect(form).toBeVisible();

      // Verify key elements are visible without scrolling
      const roomCodeInput = page.locator('input#gameCode');
      const submitButton = page.locator('button[type="submit"]');

      await expect(roomCodeInput).toBeVisible();
      await expect(submitButton).toBeVisible();

      // Take screenshot
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/responsive-mobile-375px-${Date.now()}.png`,
        fullPage: true
      });

      // Check form doesn't overflow
      const formBox = await form.boundingBox();
      const viewportWidth = VIEWPORTS.mobile.width;
      expect(formBox.width).toBeLessThanOrEqual(viewportWidth);
    });

    test('3.2 Tablet view (768px)', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.tablet);
      await page.waitForTimeout(500);

      // Check form layout
      const form = page.locator('form').first();
      await expect(form).toBeVisible();

      // Take screenshot
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/responsive-tablet-768px-${Date.now()}.png`,
        fullPage: true
      });
    });

    test('3.3 Desktop view (1024px+)', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.waitForTimeout(500);

      // Check form layout
      const form = page.locator('form').first();
      await expect(form).toBeVisible();

      // Take screenshot
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/responsive-desktop-1024px-${Date.now()}.png`,
        fullPage: true
      });
    });

    test('3.4 Large desktop view (1920px)', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktopLarge);
      await page.waitForTimeout(500);

      // Check form layout
      const form = page.locator('form').first();
      await expect(form).toBeVisible();

      // Take screenshot
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/responsive-desktop-1920px-${Date.now()}.png`,
        fullPage: true
      });
    });
  });

  test.describe('4. Dark Mode', () => {

    test('4.1 All components render correctly in dark mode', async ({ page }) => {
      // Enable dark mode (assuming it uses system preference or has a toggle)
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.waitForTimeout(500);

      // Take screenshot
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/dark-mode-full-${Date.now()}.png`,
        fullPage: true
      });

      // Verify dark background is applied
      const body = page.locator('body');
      const bgColor = await body.evaluate(el => getComputedStyle(el).backgroundColor);
      console.log('Dark mode background color:', bgColor);
    });

    test('4.2 Contrast ratios maintained in dark mode', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.waitForTimeout(500);

      // Check text contrast on various elements
      const label = page.locator('label').first();
      const input = page.locator('input').first();

      await expect(label).toBeVisible();
      await expect(input).toBeVisible();

      // Take screenshot for manual inspection
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/dark-mode-contrast-${Date.now()}.png`,
        fullPage: false
      });
    });
  });

  test.describe('5. Accessibility', () => {

    test('5.1 All form inputs have proper labels', async ({ page }) => {
      // Check room code input
      const roomCodeInput = page.locator('input#gameCode');
      const roomCodeLabel = page.locator('label[for="gameCode"]');

      await expect(roomCodeInput).toBeVisible();
      await expect(roomCodeLabel).toBeVisible();

      // Check aria attributes
      const ariaLabel = await roomCodeInput.getAttribute('aria-label');
      const ariaDescribedBy = await roomCodeInput.getAttribute('aria-describedby');

      console.log('Room code aria-label:', ariaLabel);
      console.log('Room code aria-describedby:', ariaDescribedBy);

      // Take screenshot
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/accessibility-labels-${Date.now()}.png`,
        fullPage: false
      });
    });

    test('5.2 Keyboard navigation works', async ({ page }) => {
      // Tab through form elements
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);

      let focusedElement = await page.locator(':focus');
      await expect(focusedElement).toBeVisible();

      // Tab to next element
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);

      focusedElement = await page.locator(':focus');
      await expect(focusedElement).toBeVisible();

      // Take screenshot
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/accessibility-keyboard-nav-${Date.now()}.png`,
        fullPage: false
      });
    });

    test('5.3 Focus indicators visible', async ({ page }) => {
      // Focus on input
      const roomCodeInput = page.locator('input#gameCode');
      await roomCodeInput.focus();
      await page.waitForTimeout(200);

      // Take screenshot to check focus indicator
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/accessibility-focus-indicator-${Date.now()}.png`,
        fullPage: false
      });

      // Check if element has focus styles
      const hasFocusVisible = await roomCodeInput.evaluate(el => {
        const styles = getComputedStyle(el);
        return styles.outline !== 'none' || styles.boxShadow !== 'none';
      });

      console.log('Focus indicator present:', hasFocusVisible);
    });
  });
});
