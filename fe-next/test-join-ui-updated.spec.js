/**
 * Comprehensive UI Test Suite for LexiClash Create/Join Game Card
 * Tests the refactored join/host form components
 * Updated to test /en/multiplayer route
 */

const { chromium } = require('playwright');

const TEST_URL = 'http://localhost:3000/en/multiplayer';
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

async function waitForPageLoad(page) {
  // Wait for network to be idle and main content to load
  await page.waitForLoadState('networkidle', { timeout: 10000 });
  await page.waitForTimeout(2000); // Additional wait for dynamic content
}

async function testJoinModeGuestUser(page, viewport) {
  console.log(`\n=== Testing Join Mode (Guest User) - ${viewport} ===`);

  try {
    await page.goto(TEST_URL, { waitUntil: 'networkidle' });
    await waitForPageLoad(page);

    // Look for the mode selector toggle
    const modeSelectorButtons = page.locator('button[data-state], button[role="radio"], div[role="radiogroup"] button');
    const buttonCount = await modeSelectorButtons.count();
    console.log(`Found ${buttonCount} mode selector buttons`);

    // Find and click Join mode button
    let joinButtonClicked = false;
    for (let i = 0; i < buttonCount; i++) {
      const button = modeSelectorButtons.nth(i);
      const text = await button.textContent();
      if (text && (text.includes('Join') || text.includes('join'))) {
        await button.click();
        await page.waitForTimeout(500);
        joinButtonClicked = true;
        console.log('Clicked Join mode button');
        break;
      }
    }

    if (!joinButtonClicked) {
      console.log('Join button not found in mode selector, Join mode may already be active');
    }

    // Test 1: Room code input with inline paste button
    console.log('Testing room code input with paste button...');
    const roomCodeInput = page.locator('input#gameCode, input[placeholder*="code" i], input[placeholder*="room" i]').first();
    const pasteButton = page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: '' });

    const isRoomCodeVisible = await roomCodeInput.isVisible({ timeout: 3000 }).catch(() => false);
    if (isRoomCodeVisible) {
      await roomCodeInput.fill('TEST123');
      const value = await roomCodeInput.inputValue();
      if (value !== 'TEST123') {
        reportIssue('High', 'Join Mode', `Room code input not accepting values correctly. Expected: TEST123, Got: ${value}`);
      } else {
        console.log('✓ Room code input accepts values correctly');
      }

      // Check for paste button - find button with paste icon near room code input
      const roomCodeBox = await roomCodeInput.boundingBox();
      if (roomCodeBox) {
        // Look for buttons near the input
        const allButtons = await page.locator('button').all();
        let foundPasteButton = false;

        for (const button of allButtons) {
          const buttonBox = await button.boundingBox();
          if (buttonBox && Math.abs(buttonBox.y - roomCodeBox.y) < 50) {
            // Button is roughly aligned with room code input
            const ariaLabel = await button.getAttribute('aria-label');
            const text = await button.textContent();

            if ((ariaLabel && ariaLabel.toLowerCase().includes('paste')) ||
                (text && text.toLowerCase().includes('paste')) ||
                (await button.locator('svg').count()) > 0) {
              foundPasteButton = true;
              console.log('✓ Found paste button near room code input');

              // Check if button is inside the input (inline)
              if (buttonBox.x > roomCodeBox.x && buttonBox.x < roomCodeBox.x + roomCodeBox.width) {
                console.log('✓ Paste button is positioned inside room code input');
              } else {
                reportIssue('Low', 'Join Mode', 'Paste button may not be positioned inside the input field');
              }
              break;
            }
          }
        }

        if (!foundPasteButton) {
          reportIssue('Medium', 'Join Mode', 'Paste button not found near room code input');
        }
      }
    } else {
      reportIssue('Critical', 'Join Mode', 'Room code input not visible');
    }

    // Test 2: Avatar + Name inline layout
    console.log('Testing Avatar + Name inline layout...');

    // Look for avatar button and username input
    const avatarButton = page.locator('button').filter({ has: page.locator('[class*="rounded-full"], [class*="avatar"]') }).or(
      page.locator('button').filter({ hasText: /avatar/i })
    ).first();

    const usernameInput = page.locator('input#username-main, input[placeholder*="name" i], input[placeholder*="player" i]').first();

    const isAvatarVisible = await avatarButton.isVisible({ timeout: 3000 }).catch(() => false);
    const isUsernameVisible = await usernameInput.isVisible({ timeout: 3000 }).catch(() => false);

    if (isAvatarVisible && isUsernameVisible) {
      const avatarBox = await avatarButton.boundingBox();
      const usernameBox = await usernameInput.boundingBox();

      if (avatarBox && usernameBox) {
        const verticalDiff = Math.abs(avatarBox.y - usernameBox.y);
        if (verticalDiff > 15) {
          reportIssue('Medium', 'Join Mode', `Avatar and username input not aligned horizontally (vertical difference: ${verticalDiff}px)`);
        } else {
          console.log(`✓ Avatar and username aligned horizontally (vertical difference: ${verticalDiff}px)`);
        }

        // Check if they're in the same horizontal row
        if (avatarBox.x < usernameBox.x) {
          console.log('✓ Avatar positioned to the left of username input');
        } else {
          reportIssue('Low', 'Join Mode', 'Avatar and username input layout may be incorrect');
        }
      }

      // Test avatar picker modal
      await avatarButton.click();
      await page.waitForTimeout(800);

      const modal = page.locator('[role="dialog"], .modal, [class*="dialog"]').first();
      const isModalVisible = await modal.isVisible({ timeout: 2000 }).catch(() => false);

      if (isModalVisible) {
        console.log('✓ Avatar picker modal opens successfully');

        // Look for avatar options in the modal
        const avatarOptions = page.locator('[role="dialog"] button, .modal button').filter({ has: page.locator('img, svg, [class*="emoji"]') });
        const optionCount = await avatarOptions.count();

        if (optionCount > 0) {
          console.log(`✓ Found ${optionCount} avatar options in modal`);

          // Try to select an avatar
          await avatarOptions.first().click();
          await page.waitForTimeout(500);

          // Check if modal closes
          const isModalStillVisible = await modal.isVisible({ timeout: 1000 }).catch(() => false);
          if (isModalStillVisible) {
            reportIssue('Medium', 'Join Mode', 'Avatar picker modal does not close after selection');
          } else {
            console.log('✓ Avatar picker modal closes after selection');
          }
        } else {
          reportIssue('High', 'Join Mode', 'No avatar options found in picker modal');
        }
      } else {
        reportIssue('High', 'Join Mode', 'Avatar picker modal does not open on button click');
      }
    } else {
      if (!isAvatarVisible) {
        reportIssue('High', 'Join Mode', 'Avatar selector button not visible');
      }
      if (!isUsernameVisible) {
        reportIssue('Critical', 'Join Mode', 'Username input not visible');
      }
    }

    // Test username input functionality
    if (isUsernameVisible) {
      await usernameInput.fill('TestPlayer123');
      const value = await usernameInput.inputValue();
      if (value !== 'TestPlayer123') {
        reportIssue('High', 'Join Mode', `Username input not accepting values correctly. Expected: TestPlayer123, Got: ${value}`);
      } else {
        console.log('✓ Username input accepts values correctly');
      }
    }

    await takeScreenshot(page, `join-mode-guest-${viewport}`);
  } catch (error) {
    reportIssue('Critical', 'Join Mode Test', `Test failed with error: ${error.message}`);
    await takeScreenshot(page, `join-mode-error-${viewport}`);
  }
}

async function testHostModeGuestUser(page, viewport) {
  console.log(`\n=== Testing Host Mode (Guest User) - ${viewport} ===`);

  try {
    await page.goto(TEST_URL, { waitUntil: 'networkidle' });
    await waitForPageLoad(page);

    // Find and click Host/Create mode button
    const modeSelectorButtons = page.locator('button[data-state], button[role="radio"], div[role="radiogroup"] button');
    const buttonCount = await modeSelectorButtons.count();

    let hostButtonClicked = false;
    for (let i = 0; i < buttonCount; i++) {
      const button = modeSelectorButtons.nth(i);
      const text = await button.textContent();
      if (text && (text.includes('Create') || text.includes('Host') || text.includes('create') || text.includes('host'))) {
        await button.click();
        await page.waitForTimeout(500);
        hostButtonClicked = true;
        console.log('Clicked Host/Create mode button');
        break;
      }
    }

    if (!hostButtonClicked) {
      reportIssue('Critical', 'Host Mode', 'Could not find or click Host/Create mode button');
      return;
    }

    // Test 1: Avatar + Name inline layout
    console.log('Testing Avatar + Name inline layout in host mode...');
    const avatarButton = page.locator('button').filter({ has: page.locator('[class*="rounded-full"], [class*="avatar"]') }).first();
    const hostUsernameInput = page.locator('input#hostUsername, input[placeholder*="host" i], input[placeholder*="name" i]').first();

    const isAvatarVisible = await avatarButton.isVisible({ timeout: 3000 }).catch(() => false);
    const isHostUsernameVisible = await hostUsernameInput.isVisible({ timeout: 3000 }).catch(() => false);

    if (isAvatarVisible && isHostUsernameVisible) {
      const avatarBox = await avatarButton.boundingBox();
      const usernameBox = await hostUsernameInput.boundingBox();

      if (avatarBox && usernameBox) {
        const verticalDiff = Math.abs(avatarBox.y - usernameBox.y);
        if (verticalDiff > 15) {
          reportIssue('Medium', 'Host Mode', `Avatar and username input not aligned horizontally (vertical difference: ${verticalDiff}px)`);
        } else {
          console.log(`✓ Avatar and username aligned horizontally (vertical difference: ${verticalDiff}px)`);
        }
      }
    } else {
      if (!isAvatarVisible) {
        reportIssue('High', 'Host Mode', 'Avatar selector button not visible');
      }
      if (!isHostUsernameVisible) {
        reportIssue('Critical', 'Host Mode', 'Host username input not visible');
      }
    }

    // Test 2: Room code with inline generate button
    console.log('Testing room code generation...');
    const roomCodeInput = page.locator('input#gameCode, input[placeholder*="code" i]').first();

    const isRoomCodeVisible = await roomCodeInput.isVisible({ timeout: 3000 }).catch(() => false);
    if (isRoomCodeVisible) {
      const initialCode = await roomCodeInput.inputValue();
      console.log(`Initial room code: "${initialCode}"`);

      // Look for generate button (dice icon button)
      const generateButton = page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: '' });
      const roomCodeBox = await roomCodeInput.boundingBox();

      if (roomCodeBox) {
        const allButtons = await page.locator('button').all();
        let foundGenerateButton = false;

        for (const button of allButtons) {
          const buttonBox = await button.boundingBox();
          if (buttonBox && Math.abs(buttonBox.y - roomCodeBox.y) < 50) {
            const hasSvg = await button.locator('svg').count() > 0;
            const ariaLabel = await button.getAttribute('aria-label');

            if (hasSvg || (ariaLabel && ariaLabel.toLowerCase().includes('generate'))) {
              foundGenerateButton = true;
              console.log('✓ Found generate button near room code input');

              // Click to generate new code
              await button.click();
              await page.waitForTimeout(500);

              const newCode = await roomCodeInput.inputValue();
              console.log(`New room code: "${newCode}"`);

              if (newCode === initialCode) {
                reportIssue('High', 'Host Mode', 'Generate button does not change room code');
              } else if (!newCode || newCode.length === 0) {
                reportIssue('High', 'Host Mode', 'Generated room code is empty');
              } else {
                console.log('✓ Generate button successfully creates new room code');
              }
              break;
            }
          }
        }

        if (!foundGenerateButton) {
          reportIssue('Medium', 'Host Mode', 'Generate button not found near room code input');
        }
      }
    } else {
      reportIssue('Critical', 'Host Mode', 'Room code input not visible');
    }

    // Test 3: Language dropdown
    console.log('Testing language dropdown...');

    // Look for language selector
    const languageSelector = page.locator('[role="combobox"], button[aria-haspopup="listbox"], button').filter({ hasText: /language|select/i }).first();
    const isLanguageSelectorVisible = await languageSelector.isVisible({ timeout: 3000 }).catch(() => false);

    if (isLanguageSelectorVisible) {
      console.log('✓ Language selector found');

      await languageSelector.click();
      await page.waitForTimeout(800);

      // Look for dropdown options
      const dropdownOptions = page.locator('[role="option"], [role="listbox"] [role="menuitem"], [data-radix-collection-item]');
      const optionCount = await dropdownOptions.count();

      console.log(`Found ${optionCount} language options`);

      if (optionCount === 0) {
        reportIssue('High', 'Host Mode', 'Language dropdown does not show options when clicked');
      } else if (optionCount < 4) {
        reportIssue('Medium', 'Host Mode', `Language dropdown shows only ${optionCount} options, expected at least 4 languages`);
      } else {
        console.log(`✓ Language dropdown shows ${optionCount} options`);
      }

      // Try to select a language
      if (optionCount > 1) {
        const selectedOption = dropdownOptions.nth(1);
        const optionText = await selectedOption.textContent();
        console.log(`Selecting language option: ${optionText}`);

        await selectedOption.click();
        await page.waitForTimeout(500);

        // Check if selection persists
        const currentSelectorText = await languageSelector.textContent();
        if (currentSelectorText && currentSelectorText.trim().length > 0) {
          console.log(`✓ Language selection persists: ${currentSelectorText}`);
        } else {
          reportIssue('Medium', 'Host Mode', 'Language selection does not persist after selection');
        }
      }
    } else {
      reportIssue('High', 'Host Mode', 'Language selector not visible in host mode');
    }

    await takeScreenshot(page, `host-mode-guest-${viewport}`);
  } catch (error) {
    reportIssue('Critical', 'Host Mode Test', `Test failed with error: ${error.message}`);
    await takeScreenshot(page, `host-mode-error-${viewport}`);
  }
}

async function testFormValidation(page) {
  console.log('\n=== Testing Form Validation ===');

  try {
    await page.goto(TEST_URL, { waitUntil: 'networkidle' });
    await waitForPageLoad(page);

    // Test Join mode validation
    console.log('Testing Join mode validation...');

    // Try with empty fields
    const submitButton = page.locator('button[type="submit"]').first();
    const roomCodeInput = page.locator('input#gameCode, input[placeholder*="code" i]').first();
    const usernameInput = page.locator('input#username-main, input[placeholder*="name" i]').first();

    if (await roomCodeInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await roomCodeInput.fill('');
    }

    if (await usernameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await usernameInput.fill('');
    }

    await page.waitForTimeout(500);

    // Check if submit button is properly disabled
    const isDisabled = await submitButton.isDisabled().catch(() => false);
    if (isDisabled) {
      console.log('✓ Submit button is disabled when fields are empty');
    } else {
      // Try to click and see if validation appears
      await submitButton.click();
      await page.waitForTimeout(500);

      const errorMessages = page.locator('[role="alert"], .text-red-400, [class*="error"]');
      const errorCount = await errorMessages.count();

      if (errorCount === 0) {
        reportIssue('High', 'Validation', 'No validation errors shown when submitting empty form');
      } else {
        console.log(`✓ Validation errors shown (${errorCount} error messages)`);
      }
    }

    // Test invalid input
    if (await roomCodeInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await roomCodeInput.fill('ab'); // Too short
      await page.waitForTimeout(800); // Wait for debounced validation

      const errorMessages = page.locator('[role="alert"], .text-red-400, [class*="error"]');
      const errorCount = await errorMessages.count();

      if (errorCount > 0) {
        console.log('✓ Validation error shown for too-short room code');
      }
    }

    await takeScreenshot(page, 'form-validation');
  } catch (error) {
    reportIssue('Critical', 'Form Validation Test', `Test failed with error: ${error.message}`);
    await takeScreenshot(page, 'validation-error');
  }
}

async function testResponsiveDesign(browser) {
  console.log('\n=== Testing Responsive Design ===');

  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    console.log(`\nTesting ${name} viewport (${viewport.width}x${viewport.height})`);

    try {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();

      await page.goto(TEST_URL, { waitUntil: 'networkidle' });
      await waitForPageLoad(page);

      // Check if form is visible
      const form = page.locator('form').first();
      const isFormVisible = await form.isVisible({ timeout: 5000 }).catch(() => false);

      if (!isFormVisible) {
        reportIssue('Critical', 'Responsive', `Form not visible on ${name} viewport`);
      } else {
        console.log(`✓ Form is visible on ${name} viewport`);

        // Check for horizontal overflow
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        const viewportWidth = viewport.width;

        if (bodyWidth > viewportWidth + 10) {
          reportIssue('Medium', 'Responsive', `Horizontal overflow detected on ${name} viewport (body: ${bodyWidth}px, viewport: ${viewportWidth}px)`);
        } else {
          console.log(`✓ No horizontal overflow on ${name} viewport`);
        }

        // Check touch target sizes on mobile
        if (name === 'mobile') {
          const submitButton = page.locator('button[type="submit"]').first();
          const buttonBox = await submitButton.boundingBox().catch(() => null);

          if (buttonBox) {
            if (buttonBox.height < 44) {
              reportIssue('Medium', 'Responsive', `Submit button height (${buttonBox.height}px) is less than recommended 44px touch target on mobile`);
            } else {
              console.log(`✓ Submit button meets minimum touch target size (${buttonBox.height}px)`);
            }
          }

          // Check if avatar button is large enough
          const avatarButton = page.locator('button').filter({ has: page.locator('[class*="rounded-full"]') }).first();
          const avatarBox = await avatarButton.boundingBox().catch(() => null);

          if (avatarBox && (avatarBox.width < 40 || avatarBox.height < 40)) {
            reportIssue('Low', 'Responsive', `Avatar button (${avatarBox.width}x${avatarBox.height}px) may be too small for touch on mobile`);
          }
        }
      }

      await takeScreenshot(page, `responsive-${name}`);
      await context.close();
    } catch (error) {
      reportIssue('High', 'Responsive', `Error testing ${name} viewport: ${error.message}`);
    }
  }
}

async function testAccessibility(page) {
  console.log('\n=== Testing Accessibility ===');

  try {
    await page.goto(TEST_URL, { waitUntil: 'networkidle' });
    await waitForPageLoad(page);

    // Test keyboard navigation
    console.log('Testing keyboard navigation...');

    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);

    let focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tag: el?.tagName,
        id: el?.id,
        className: el?.className
      };
    });

    if (!focusedElement || focusedElement.tag === 'BODY') {
      reportIssue('Medium', 'Accessibility', 'No element receives focus on first Tab press');
    } else {
      console.log(`✓ First Tab focuses: ${focusedElement.tag}#${focusedElement.id}`);
    }

    // Tab through multiple elements
    const focusedElements = [];
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);

      const el = await page.evaluate(() => {
        const element = document.activeElement;
        return element ? element.tagName : null;
      });

      if (el) focusedElements.push(el);
    }

    console.log(`✓ Keyboard navigation through ${focusedElements.length} elements: ${focusedElements.join(' → ')}`);

    // Check for visible focus indicators
    const hasFocusIndicator = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return false;

      const styles = window.getComputedStyle(el);
      return (
        styles.outline !== 'none' &&
        styles.outlineWidth !== '0px'
      ) || (
        styles.boxShadow && styles.boxShadow !== 'none'
      );
    });

    if (!hasFocusIndicator) {
      reportIssue('Medium', 'Accessibility', 'No visible focus indicator detected on focused element');
    } else {
      console.log('✓ Visible focus indicators present');
    }

    // Check ARIA attributes
    console.log('Checking ARIA attributes...');
    const inputs = await page.locator('input').all();

    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');

      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        const hasLabel = await label.count() > 0;

        if (!hasLabel && !ariaLabel && !ariaLabelledBy) {
          reportIssue('Medium', 'Accessibility', `Input with id="${id}" has no associated label or ARIA label`);
        } else {
          console.log(`✓ Input id="${id}" has proper labeling`);
        }
      }
    }

    // Check for required attributes
    const requiredInputs = await page.locator('input[required]').count();
    console.log(`Found ${requiredInputs} inputs with required attribute`);

    await takeScreenshot(page, 'accessibility');
  } catch (error) {
    reportIssue('High', 'Accessibility Test', `Test failed with error: ${error.message}`);
    await takeScreenshot(page, 'accessibility-error');
  }
}

async function testDarkMode(page) {
  console.log('\n=== Testing Dark Mode ===');

  try {
    await page.goto(TEST_URL, { waitUntil: 'networkidle' });
    await waitForPageLoad(page);

    // Check if dark mode is active
    const hasDarkClass = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark') ||
             document.body.classList.contains('dark');
    });

    console.log(`Dark mode class present: ${hasDarkClass}`);

    if (!hasDarkClass) {
      // Try to enable dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      console.log('Enabled dark mode for testing');
    }

    await page.waitForTimeout(500);
    await takeScreenshot(page, 'dark-mode');

    // Check that key elements render in dark mode
    const darkModeElements = await page.evaluate(() => {
      const elements = [];
      const selectors = ['input', 'button', 'label'];

      selectors.forEach(selector => {
        const nodes = document.querySelectorAll(selector);
        nodes.forEach(node => {
          if (node.offsetParent !== null) {
            const styles = window.getComputedStyle(node);
            const bgColor = styles.backgroundColor;
            const color = styles.color;

            // Check if using dark colors
            const isDark = bgColor.includes('rgb') && (
              bgColor.includes('slate') ||
              bgColor.includes('gray') ||
              parseInt(bgColor.match(/\d+/)?.[0] || '255') < 100
            );

            elements.push({
              selector,
              isDark,
              bgColor,
              color
            });
          }
        });
      });

      return elements;
    });

    console.log(`✓ Checked ${darkModeElements.length} elements for dark mode rendering`);

  } catch (error) {
    reportIssue('Low', 'Dark Mode Test', `Test failed with error: ${error.message}`);
    await takeScreenshot(page, 'dark-mode-error');
  }
}

async function runTests() {
  console.log('Starting Comprehensive UI Tests for LexiClash Join/Host Card\n');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: false }); // Set to true for CI

  try {
    // Desktop tests
    const context = await browser.newContext({ viewport: VIEWPORTS.desktop });
    const page = await context.newPage();

    // Run all test suites
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
    reportIssue('Critical', 'Test Execution', `Test suite failed with error: ${error.message}`);
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

  console.log('\nDetailed Issues:');
  issues.forEach((issue, index) => {
    console.log(`\n${index + 1}. [${issue.severity}] ${issue.category}`);
    console.log(`   ${issue.description}`);
  });

  // Save detailed report
  const fs = require('fs');
  const reportPath = '/Users/ohadfisher/git/boggle-new/fe-next/test-report.json';
  fs.writeFileSync(reportPath, JSON.stringify({
    testDate: new Date().toISOString(),
    totalIssues: issues.length,
    severityCounts,
    issues,
    summary: {
      criticalCount: severityCounts.Critical,
      highCount: severityCounts.High,
      mediumCount: severityCounts.Medium,
      lowCount: severityCounts.Low,
    }
  }, null, 2));

  console.log(`\nDetailed report saved to: ${reportPath}`);
  console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);

  return issues;
}

// Run tests
runTests().then(issues => {
  const criticalIssues = issues.filter(i => i.severity === 'Critical').length;
  const highIssues = issues.filter(i => i.severity === 'High').length;

  console.log(`\nTest Result: ${criticalIssues + highIssues === 0 ? 'PASS' : 'FAIL'}`);
  process.exit(criticalIssues > 0 ? 1 : 0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
