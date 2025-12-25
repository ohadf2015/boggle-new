/**
 * Comprehensive UI Test Suite for LexiClash Create/Join Game Card
 * Tests the refactored join/host form components
 */

const { chromium } = require('playwright');

const TEST_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = '/Users/ohadfisher/git/boggle-new/fe-next/test-screenshots';

// Test configuration
const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
};

const issues = [];

function reportIssue(severity, category, description, screenshot = null) {
  issues.push({ severity, category, description, screenshot, timestamp: new Date().toISOString() });
  console.log(`[${severity}] ${category}: ${description}`);
}

async function takeScreenshot(page, name) {
  const fs = require('fs');
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
  const path = `${SCREENSHOT_DIR}/${name}-${Date.now()}.png`;
  await page.screenshot({ path, fullPage: true });
  return path;
}

async function testJoinModeGuestUser(page, viewport) {
  console.log(`\n=== Testing Join Mode (Guest User) - ${viewport} ===`);

  await page.goto(TEST_URL);
  await page.waitForTimeout(2000); // Wait for page to load

  // Check if Join mode is active by default or switch to it
  const joinButton = page.locator('button:has-text("Join Room")').first();
  await joinButton.click();
  await page.waitForTimeout(500);

  // Test 1: Room code input with inline paste button
  console.log('Testing room code input with paste button...');
  const roomCodeInput = page.locator('input#gameCode').first();
  const pasteButton = page.locator('button[aria-label*="Paste"]').first();

  if (await roomCodeInput.isVisible()) {
    await roomCodeInput.fill('TEST123');
    const value = await roomCodeInput.inputValue();
    if (value !== 'TEST123') {
      reportIssue('High', 'Join Mode', 'Room code input not accepting values correctly');
    }

    // Check if paste button is visible and positioned correctly
    if (await pasteButton.isVisible()) {
      const pasteButtonBox = await pasteButton.boundingBox();
      const inputBox = await roomCodeInput.boundingBox();

      if (pasteButtonBox && inputBox) {
        // Button should be inside input on the right
        if (pasteButtonBox.x < inputBox.x + inputBox.width - 50) {
          reportIssue('Low', 'Join Mode', 'Paste button may not be positioned correctly inside input');
        }
      }
    } else {
      reportIssue('Medium', 'Join Mode', 'Paste button not visible in room code input');
    }
  } else {
    reportIssue('Critical', 'Join Mode', 'Room code input not visible');
  }

  // Test 2: Avatar + Name inline layout
  console.log('Testing Avatar + Name inline layout...');
  const avatarButton = page.locator('button').filter({ hasText: 'Avatar' }).or(page.locator('button').filter({ has: page.locator('div.rounded-full') })).first();
  const usernameInput = page.locator('input#username-main').first();

  if (await avatarButton.isVisible() && await usernameInput.isVisible()) {
    // Check if they are in the same row (flex container)
    const avatarBox = await avatarButton.boundingBox();
    const usernameBox = await usernameInput.boundingBox();

    if (avatarBox && usernameBox) {
      const verticalDiff = Math.abs(avatarBox.y - usernameBox.y);
      if (verticalDiff > 10) {
        reportIssue('Medium', 'Join Mode', 'Avatar and username input not aligned horizontally');
      }
    }

    // Test avatar button click
    await avatarButton.click();
    await page.waitForTimeout(500);

    // Check if avatar picker modal opens
    const avatarModal = page.locator('[role="dialog"]').first();
    if (await avatarModal.isVisible()) {
      console.log('Avatar picker modal opened successfully');

      // Try to select an avatar
      const firstAvatar = page.locator('button[data-avatar-id]').or(page.locator('[role="dialog"] button').filter({ has: page.locator('img') })).first();
      if (await firstAvatar.isVisible()) {
        await firstAvatar.click();
        await page.waitForTimeout(500);

        // Check if modal closes
        if (await avatarModal.isVisible()) {
          reportIssue('Medium', 'Join Mode', 'Avatar picker modal does not close after selection');
        }
      } else {
        reportIssue('Medium', 'Join Mode', 'No avatars visible in picker modal');
      }
    } else {
      reportIssue('High', 'Join Mode', 'Avatar picker modal does not open');
    }
  } else {
    if (!await avatarButton.isVisible()) {
      reportIssue('High', 'Join Mode', 'Avatar selector button not visible');
    }
    if (!await usernameInput.isVisible()) {
      reportIssue('Critical', 'Join Mode', 'Username input not visible');
    }
  }

  // Test username input
  await usernameInput.fill('TestPlayer');
  const usernameValue = await usernameInput.inputValue();
  if (usernameValue !== 'TestPlayer') {
    reportIssue('High', 'Join Mode', 'Username input not accepting values correctly');
  }

  await takeScreenshot(page, `join-mode-guest-${viewport}`);
}

async function testHostModeGuestUser(page, viewport) {
  console.log(`\n=== Testing Host Mode (Guest User) - ${viewport} ===`);

  await page.goto(TEST_URL);
  await page.waitForTimeout(2000);

  // Switch to Host mode
  const hostButton = page.locator('button:has-text("Create Room")').first();
  await hostButton.click();
  await page.waitForTimeout(500);

  // Test 1: Avatar + Name inline layout
  console.log('Testing Avatar + Name inline layout in host mode...');
  const avatarButton = page.locator('button').filter({ has: page.locator('div.rounded-full') }).first();
  const hostUsernameInput = page.locator('input#hostUsername').first();

  if (await avatarButton.isVisible() && await hostUsernameInput.isVisible()) {
    const avatarBox = await avatarButton.boundingBox();
    const usernameBox = await hostUsernameInput.boundingBox();

    if (avatarBox && usernameBox) {
      const verticalDiff = Math.abs(avatarBox.y - usernameBox.y);
      if (verticalDiff > 10) {
        reportIssue('Medium', 'Host Mode', 'Avatar and username input not aligned horizontally');
      }
    }
  } else {
    if (!await avatarButton.isVisible()) {
      reportIssue('High', 'Host Mode', 'Avatar selector button not visible');
    }
    if (!await hostUsernameInput.isVisible()) {
      reportIssue('Critical', 'Host Mode', 'Host username input not visible');
    }
  }

  // Test 2: Room code with inline generate button
  console.log('Testing room code generation...');
  const roomCodeInput = page.locator('input#gameCode').first();
  const generateButton = page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: '' }).first();

  if (await roomCodeInput.isVisible()) {
    const initialCode = await roomCodeInput.inputValue();

    if (await generateButton.isVisible()) {
      await generateButton.click();
      await page.waitForTimeout(300);

      const newCode = await roomCodeInput.inputValue();
      if (newCode === initialCode || !newCode) {
        reportIssue('High', 'Host Mode', 'Generate button does not update room code');
      }
    } else {
      reportIssue('Medium', 'Host Mode', 'Generate button not visible in room code input');
    }
  } else {
    reportIssue('Critical', 'Host Mode', 'Room code input not visible');
  }

  // Test 3: Language dropdown
  console.log('Testing language dropdown...');
  const languageSelector = page.locator('[role="combobox"]').or(page.locator('button[aria-haspopup="listbox"]')).first();

  if (await languageSelector.isVisible()) {
    await languageSelector.click();
    await page.waitForTimeout(500);

    // Check if dropdown opens
    const dropdownOptions = page.locator('[role="option"]').or(page.locator('[role="listbox"] [role="menuitem"]'));
    const optionCount = await dropdownOptions.count();

    if (optionCount === 0) {
      reportIssue('High', 'Host Mode', 'Language dropdown does not show options');
    } else if (optionCount < 4) {
      reportIssue('Medium', 'Host Mode', `Language dropdown shows ${optionCount} options, expected at least 4`);
    }

    // Try to select a language
    if (optionCount > 0) {
      const secondOption = dropdownOptions.nth(1);
      await secondOption.click();
      await page.waitForTimeout(300);

      // Check if selection persists
      const selectedValue = await languageSelector.textContent();
      if (!selectedValue || selectedValue.length === 0) {
        reportIssue('Medium', 'Host Mode', 'Language selection does not persist');
      }
    }
  } else {
    reportIssue('High', 'Host Mode', 'Language selector not visible');
  }

  await takeScreenshot(page, `host-mode-guest-${viewport}`);
}

async function testFormValidation(page) {
  console.log('\n=== Testing Form Validation ===');

  await page.goto(TEST_URL);
  await page.waitForTimeout(2000);

  // Test Join mode validation
  const joinButton = page.locator('button:has-text("Join Room")').first();
  await joinButton.click();
  await page.waitForTimeout(500);

  // Try to submit without filling fields
  const submitButton = page.locator('button[type="submit"]').first();

  // Clear any pre-filled values
  const roomCodeInput = page.locator('input#gameCode').first();
  const usernameInput = page.locator('input#username-main').first();

  await roomCodeInput.fill('');
  if (await usernameInput.isVisible()) {
    await usernameInput.fill('');
  }

  // Check if submit button is disabled
  const isDisabled = await submitButton.isDisabled();
  if (!isDisabled) {
    // Try to submit and check for validation errors
    await submitButton.click();
    await page.waitForTimeout(500);

    // Look for error messages
    const errorMessages = page.locator('[role="alert"]').or(page.locator('.text-red-400'));
    const errorCount = await errorMessages.count();

    if (errorCount === 0) {
      reportIssue('High', 'Validation', 'No validation errors shown when submitting empty join form');
    }
  }

  // Test invalid room code
  await roomCodeInput.fill('ab'); // Too short
  if (await usernameInput.isVisible()) {
    await usernameInput.fill('TestPlayer');
  }
  await page.waitForTimeout(500);

  // Test Host mode validation
  const hostButton = page.locator('button:has-text("Create Room")').first();
  await hostButton.click();
  await page.waitForTimeout(500);

  const hostUsernameInput = page.locator('input#hostUsername').first();
  if (await hostUsernameInput.isVisible()) {
    await hostUsernameInput.fill('a'); // Too short
    await page.waitForTimeout(500);

    const errorMessages = page.locator('[role="alert"]').or(page.locator('.text-red-400'));
    const errorCount = await errorMessages.count();

    if (errorCount === 0) {
      reportIssue('Medium', 'Validation', 'No validation error for username that is too short');
    }
  }

  await takeScreenshot(page, 'form-validation');
}

async function testResponsiveDesign(browser) {
  console.log('\n=== Testing Responsive Design ===');

  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    console.log(`\nTesting ${name} viewport (${viewport.width}x${viewport.height})`);
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();

    await page.goto(TEST_URL);
    await page.waitForTimeout(2000);

    // Check if form is visible
    const form = page.locator('form').first();
    const isFormVisible = await form.isVisible();

    if (!isFormVisible) {
      reportIssue('Critical', 'Responsive', `Form not visible on ${name} viewport`);
    } else {
      // Check if content fits without horizontal scrolling
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = viewport.width;

      if (bodyWidth > viewportWidth + 10) {
        reportIssue('Medium', 'Responsive', `Horizontal overflow detected on ${name} viewport`);
      }

      // Check if buttons are tappable on mobile
      if (name === 'mobile') {
        const submitButton = page.locator('button[type="submit"]').first();
        const buttonBox = await submitButton.boundingBox();

        if (buttonBox && buttonBox.height < 44) {
          reportIssue('Medium', 'Responsive', `Submit button height (${buttonBox.height}px) is less than recommended 44px touch target on mobile`);
        }
      }
    }

    await takeScreenshot(page, `responsive-${name}`);
    await context.close();
  }
}

async function testAccessibility(page) {
  console.log('\n=== Testing Accessibility ===');

  await page.goto(TEST_URL);
  await page.waitForTimeout(2000);

  // Test keyboard navigation
  console.log('Testing keyboard navigation...');

  // Focus on first interactive element
  await page.keyboard.press('Tab');
  await page.waitForTimeout(200);

  let focusedElement = await page.evaluate(() => document.activeElement?.tagName);
  if (!focusedElement || focusedElement === 'BODY') {
    reportIssue('Medium', 'Accessibility', 'No element receives focus on first Tab press');
  }

  // Tab through form elements
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
  }

  // Check for focus indicators
  const focusedElementStyle = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    const styles = window.getComputedStyle(el);
    return {
      outline: styles.outline,
      outlineWidth: styles.outlineWidth,
      boxShadow: styles.boxShadow,
    };
  });

  if (focusedElementStyle && focusedElementStyle.outlineWidth === '0px' && !focusedElementStyle.boxShadow.includes('rgb')) {
    reportIssue('Medium', 'Accessibility', 'No visible focus indicator detected');
  }

  // Check ARIA attributes
  console.log('Checking ARIA attributes...');
  const inputs = page.locator('input');
  const inputCount = await inputs.count();

  for (let i = 0; i < inputCount; i++) {
    const input = inputs.nth(i);
    const id = await input.getAttribute('id');
    const ariaLabel = await input.getAttribute('aria-label');
    const ariaLabelledBy = await input.getAttribute('aria-labelledby');

    // Check if input has associated label
    if (id) {
      const label = page.locator(`label[for="${id}"]`);
      const labelExists = await label.count() > 0;

      if (!labelExists && !ariaLabel && !ariaLabelledBy) {
        reportIssue('Medium', 'Accessibility', `Input with id="${id}" has no associated label or aria-label`);
      }
    }
  }

  // Check for required attribute on required fields
  const requiredInputs = page.locator('input[required]');
  const requiredCount = await requiredInputs.count();

  if (requiredCount === 0) {
    reportIssue('Low', 'Accessibility', 'No inputs marked with required attribute');
  }

  await takeScreenshot(page, 'accessibility');
}

async function testDarkMode(page) {
  console.log('\n=== Testing Dark Mode ===');

  await page.goto(TEST_URL);
  await page.waitForTimeout(2000);

  // Check if dark mode class exists
  const hasDarkClass = await page.evaluate(() => {
    return document.documentElement.classList.contains('dark') ||
           document.body.classList.contains('dark');
  });

  if (!hasDarkClass) {
    console.log('Dark mode class not found, attempting to enable dark mode...');

    // Try to find and click dark mode toggle
    const darkModeToggle = page.locator('button[aria-label*="dark"]').or(
      page.locator('button').filter({ hasText: /dark/i })
    ).first();

    if (await darkModeToggle.isVisible()) {
      await darkModeToggle.click();
      await page.waitForTimeout(500);
    } else {
      // Force dark mode via evaluate
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
    }
  }

  // Take screenshot in dark mode
  await takeScreenshot(page, 'dark-mode');

  // Check contrast ratios on key elements
  const textElements = await page.evaluate(() => {
    const elements = [];
    const selectors = ['label', 'input', 'button', '.text-slate-600'];

    selectors.forEach(selector => {
      const nodes = document.querySelectorAll(selector);
      nodes.forEach(node => {
        if (node.offsetParent !== null) { // visible elements only
          const styles = window.getComputedStyle(node);
          elements.push({
            selector,
            color: styles.color,
            backgroundColor: styles.backgroundColor,
          });
        }
      });
    });

    return elements;
  });

  if (textElements.length === 0) {
    reportIssue('Low', 'Dark Mode', 'Could not verify contrast ratios in dark mode');
  }

  console.log(`Checked ${textElements.length} elements for dark mode rendering`);
}

async function runTests() {
  console.log('Starting Comprehensive UI Tests for LexiClash Join/Host Card\n');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: true });

  try {
    // Desktop tests
    const context = await browser.newContext({ viewport: VIEWPORTS.desktop });
    const page = await context.newPage();

    // Run all tests
    await testJoinModeGuestUser(page, 'desktop');
    await testHostModeGuestUser(page, 'desktop');
    await testFormValidation(page);
    await testAccessibility(page);
    await testDarkMode(page);

    await context.close();

    // Responsive tests
    await testResponsiveDesign(browser);

  } catch (error) {
    console.error('Test execution error:', error);
    reportIssue('Critical', 'Test Execution', `Test failed with error: ${error.message}`);
  } finally {
    await browser.close();
  }

  // Generate report
  console.log('\n' + '='.repeat(60));
  console.log('TEST EXECUTION COMPLETE');
  console.log('='.repeat(60));
  console.log(`\nTotal Issues Found: ${issues.length}\n`);

  const severityCounts = {
    Critical: 0,
    High: 0,
    Medium: 0,
    Low: 0,
  };

  issues.forEach(issue => {
    severityCounts[issue.severity]++;
  });

  console.log('Issues by Severity:');
  console.log(`  Critical: ${severityCounts.Critical}`);
  console.log(`  High: ${severityCounts.High}`);
  console.log(`  Medium: ${severityCounts.Medium}`);
  console.log(`  Low: ${severityCounts.Low}`);

  // Save detailed report
  const fs = require('fs');
  const reportPath = '/Users/ohadfisher/git/boggle-new/fe-next/test-report.json';
  fs.writeFileSync(reportPath, JSON.stringify({
    testDate: new Date().toISOString(),
    totalIssues: issues.length,
    severityCounts,
    issues,
  }, null, 2));

  console.log(`\nDetailed report saved to: ${reportPath}`);
  console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);

  return issues;
}

// Run tests
runTests().then(issues => {
  process.exit(issues.filter(i => i.severity === 'Critical').length > 0 ? 1 : 0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
