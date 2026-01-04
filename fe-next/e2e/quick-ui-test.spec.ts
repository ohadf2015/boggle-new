import { test, expect, Page } from '@playwright/test';

/**
 * Quick UI Testing for LexiClash Word Game
 * Focused tests across key screen sizes
 */

// Key viewport configurations
const VIEWPORTS = {
  mobileSmall: { width: 320, height: 568, name: 'Mobile Small (320x568)' },
  mobileMedium: { width: 375, height: 667, name: 'Mobile Medium (375x667)' },
  mobileLarge: { width: 414, height: 896, name: 'Mobile Large (414x896)' },
  mobileLandscape: { width: 667, height: 375, name: 'Mobile Landscape (667x375)' },
  tablet: { width: 768, height: 1024, name: 'Tablet (768x1024)' },
  desktop: { width: 1280, height: 720, name: 'Desktop (1280x720)' },
};

interface UIIssue {
  viewport: string;
  page: string;
  issue: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  element?: string;
  details?: string;
}

const allIssues: UIIssue[] = [];

// Reduce timeout for faster tests
test.setTimeout(15000);

async function checkForHorizontalScroll(page: Page, viewportName: string, pageName: string) {
  const scrollInfo = await page.evaluate(() => {
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
  });

  if (scrollInfo.hasHorizontalScroll) {
    allIssues.push({
      viewport: viewportName,
      page: pageName,
      issue: 'Horizontal scroll detected',
      severity: 'High',
      details: `Content width: ${scrollInfo.scrollWidth}px, Viewport: ${scrollInfo.clientWidth}px`,
    });
    return true;
  }
  return false;
}

async function checkButtonSizes(page: Page, viewportName: string, pageName: string) {
  const buttons = await page.locator('button, a[href]').all();
  const smallButtons: string[] = [];

  for (const btn of buttons.slice(0, 20)) {
    try {
      if (await btn.isVisible({ timeout: 500 })) {
        const box = await btn.boundingBox();
        if (box && (box.width < 44 || box.height < 44) && box.width > 0 && box.height > 0) {
          const text = await btn.textContent().catch(() => 'unknown');
          smallButtons.push(`"${(text || 'icon').substring(0, 20)}" (${Math.round(box.width)}x${Math.round(box.height)})`);
        }
      }
    } catch {
      // Skip inaccessible buttons
    }
  }

  if (smallButtons.length > 0) {
    allIssues.push({
      viewport: viewportName,
      page: pageName,
      issue: `Touch targets too small (< 44x44px)`,
      severity: 'High',
      details: smallButtons.join(', '),
    });
  }
}

async function checkOverflow(page: Page, viewportName: string, pageName: string) {
  const overflowElements = await page.evaluate(() => {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const elements = document.querySelectorAll('button, a, div, section, main, article');
    const overflowing: string[] = [];

    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        if (rect.right > viewport.width + 10 || rect.left < -10) {
          const id = el.id || el.className?.toString().split(' ')[0] || el.tagName;
          overflowing.push(`${id} (left:${Math.round(rect.left)}, right:${Math.round(rect.right)})`);
        }
      }
    });

    return overflowing.slice(0, 5);
  });

  if (overflowElements.length > 0) {
    allIssues.push({
      viewport: viewportName,
      page: pageName,
      issue: 'Elements overflow viewport',
      severity: 'High',
      details: overflowElements.join(', '),
    });
  }
}

async function checkElementOverlap(page: Page, viewportName: string, pageName: string) {
  const overlaps = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button:not([hidden])'));
    const overlapping: string[] = [];

    for (let i = 0; i < buttons.length && i < 10; i++) {
      for (let j = i + 1; j < buttons.length && j < 10; j++) {
        const rect1 = buttons[i].getBoundingClientRect();
        const rect2 = buttons[j].getBoundingClientRect();

        if (rect1.width === 0 || rect2.width === 0) continue;

        const overlap = !(rect1.right < rect2.left ||
                         rect2.right < rect1.left ||
                         rect1.bottom < rect2.top ||
                         rect2.bottom < rect1.top);

        if (overlap && rect1.width > 20 && rect2.width > 20) {
          const text1 = (buttons[i].textContent || 'btn1').substring(0, 15);
          const text2 = (buttons[j].textContent || 'btn2').substring(0, 15);
          overlapping.push(`"${text1}" overlaps "${text2}"`);
        }
      }
    }

    return overlapping;
  });

  if (overlaps.length > 0) {
    allIssues.push({
      viewport: viewportName,
      page: pageName,
      issue: 'Button overlap detected',
      severity: 'Critical',
      details: overlaps.join('; '),
    });
  }
}

// Test Landing Page
for (const [key, viewport] of Object.entries(VIEWPORTS)) {
  test(`Landing - ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    await page.screenshot({ path: `./e2e/screenshots/landing-${key}.png` });

    await checkForHorizontalScroll(page, viewport.name, 'Landing');
    await checkButtonSizes(page, viewport.name, 'Landing');
    await checkOverflow(page, viewport.name, 'Landing');
    await checkElementOverlap(page, viewport.name, 'Landing');

    // Check key elements exist
    const singlePlayerLink = page.locator('[href*="/singleplayer"]').first();
    const multiplayerLink = page.locator('[href*="/multiplayer"]').first();

    await expect(singlePlayerLink).toBeVisible({ timeout: 3000 });
    await expect(multiplayerLink).toBeVisible({ timeout: 3000 });
  });
}

// Test Single Player Config
for (const [key, viewport] of Object.entries(VIEWPORTS)) {
  test(`SinglePlayer - ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/en/singleplayer', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    await page.screenshot({ path: `./e2e/screenshots/singleplayer-${key}.png` });

    await checkForHorizontalScroll(page, viewport.name, 'SinglePlayer');
    await checkButtonSizes(page, viewport.name, 'SinglePlayer');
    await checkOverflow(page, viewport.name, 'SinglePlayer');
  });
}

// Test Multiplayer Flow
for (const [key, viewport] of Object.entries(VIEWPORTS)) {
  test(`Multiplayer - ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/en/multiplayer', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    await page.screenshot({ path: `./e2e/screenshots/multiplayer-${key}.png` });

    await checkForHorizontalScroll(page, viewport.name, 'Multiplayer');
    await checkButtonSizes(page, viewport.name, 'Multiplayer');
    await checkOverflow(page, viewport.name, 'Multiplayer');
  });
}

// Test Leaderboard
for (const [key, viewport] of Object.entries(VIEWPORTS)) {
  test(`Leaderboard - ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/en/leaderboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    await page.screenshot({ path: `./e2e/screenshots/leaderboard-${key}.png` });

    await checkForHorizontalScroll(page, viewport.name, 'Leaderboard');
    await checkButtonSizes(page, viewport.name, 'Leaderboard');
  });
}

// Mobile-specific stress test on smallest viewport
test('Smallest Viewport Stress Test', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });

  // Test all pages on smallest viewport
  const pages = ['/en', '/en/singleplayer', '/en/multiplayer', '/en/leaderboard', '/en/daily'];

  for (const url of pages) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    const pageName = url.split('/').pop() || 'landing';
    await page.screenshot({ path: `./e2e/screenshots/stress-${pageName}.png` });

    await checkForHorizontalScroll(page, 'Mobile Small (320x568)', pageName);
    await checkOverflow(page, 'Mobile Small (320x568)', pageName);
  }
});

// Input accessibility test
test('Input Accessibility', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/en/multiplayer', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const inputs = await page.locator('input').all();

  for (const input of inputs) {
    try {
      if (await input.isVisible({ timeout: 500 })) {
        const box = await input.boundingBox();
        if (box && box.height < 44) {
          allIssues.push({
            viewport: 'Mobile Medium (375x667)',
            page: 'Multiplayer',
            issue: 'Input field too small for touch',
            severity: 'Medium',
            details: `Height: ${Math.round(box.height)}px (min: 44px)`,
          });
        }
      }
    } catch {
      // Skip
    }
  }
});

// Navigation test
test('Navigation Flow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });

  // Landing -> SinglePlayer
  await page.goto('/en', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  const singlePlayerLink = page.locator('[href*="/singleplayer"]').first();
  await singlePlayerLink.click();
  await page.waitForURL('**/singleplayer', { timeout: 5000 });

  // SinglePlayer -> Back
  const backButton = page.locator('button:has-text("Quit"), button:has-text("Back"), a[href="/en"]').first();
  if (await backButton.isVisible({ timeout: 2000 })) {
    await backButton.click();
    await page.waitForTimeout(500);
  }
});

// Print final report after all tests
test.afterAll(async () => {
  console.log('\n');
  console.log('='.repeat(60));
  console.log('         LEXICLASH UI TEST REPORT');
  console.log('='.repeat(60));
  console.log('\n');

  if (allIssues.length === 0) {
    console.log('SUCCESS: No UI issues detected across all viewports!\n');
  } else {
    const critical = allIssues.filter(i => i.severity === 'Critical');
    const high = allIssues.filter(i => i.severity === 'High');
    const medium = allIssues.filter(i => i.severity === 'Medium');
    const low = allIssues.filter(i => i.severity === 'Low');

    console.log(`TOTAL ISSUES: ${allIssues.length}`);
    console.log(`  Critical: ${critical.length}`);
    console.log(`  High: ${high.length}`);
    console.log(`  Medium: ${medium.length}`);
    console.log(`  Low: ${low.length}`);
    console.log('\n');

    const printIssues = (issues: UIIssue[], label: string) => {
      if (issues.length === 0) return;
      console.log(`--- ${label} ---\n`);
      issues.forEach((issue, idx) => {
        console.log(`${idx + 1}. ${issue.issue}`);
        console.log(`   Viewport: ${issue.viewport}`);
        console.log(`   Page: ${issue.page}`);
        if (issue.details) console.log(`   Details: ${issue.details}`);
        console.log('');
      });
    };

    printIssues(critical, 'CRITICAL ISSUES');
    printIssues(high, 'HIGH PRIORITY ISSUES');
    printIssues(medium, 'MEDIUM PRIORITY ISSUES');
    printIssues(low, 'LOW PRIORITY ISSUES');
  }

  console.log('='.repeat(60));
  console.log('                  END OF REPORT');
  console.log('='.repeat(60));
  console.log('\n');
});
