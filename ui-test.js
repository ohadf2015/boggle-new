const puppeteer = require('puppeteer');
const fs = require('fs');

// Test configurations
const VIEWPORTS = {
  mobile: [
    { name: 'mobile-375', width: 375, height: 667 },
    { name: 'mobile-390', width: 390, height: 844 },
    { name: 'mobile-414', width: 414, height: 896 }
  ],
  tablet: [
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'tablet-1024', width: 1024, height: 1366 }
  ],
  desktop: [
    { name: 'desktop-1280', width: 1280, height: 720 },
    { name: 'desktop-1920', width: 1920, height: 1080 }
  ]
};

const PAGES = [
  { path: '/en', name: 'landing' },
  { path: '/en/singleplayer', name: 'singleplayer' },
  { path: '/en/multiplayer', name: 'multiplayer' },
  { path: '/en/leaderboard', name: 'leaderboard' },
  { path: '/en/profile', name: 'profile' },
  { path: '/en/rules', name: 'rules' },
  { path: '/he', name: 'hebrew-rtl' }
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const issues = [];

function logIssue(severity, category, description, page, viewport, screenshot = null) {
  issues.push({ severity, category, description, page, viewport, screenshot });
  console.log(`[${severity}] ${category}: ${description} (${page} @ ${viewport})`);
}

async function testViewport(browser, page, viewport, orientation = 'portrait') {
  const width = orientation === 'portrait' ? viewport.width : viewport.height;
  const height = orientation === 'portrait' ? viewport.height : viewport.width;
  const viewportName = `${viewport.name}-${orientation}`;

  console.log(`\nTesting ${page.name} at ${viewportName} (${width}x${height})`);

  const browserPage = await browser.newPage();

  try {
    await browserPage.setViewport({ width, height });
    await browserPage.goto(`http://localhost:3001${page.path}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await sleep(2000);

    // Take screenshot
    const screenshotName = `screenshots/${page.name}-${viewportName}.png`;
    await browserPage.screenshot({ path: screenshotName, fullPage: true });

    // Check for horizontal overflow
    const hasOverflow = await browserPage.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    if (hasOverflow) {
      logIssue('HIGH', 'Layout Overflow',
        `Page has horizontal scroll (width: ${await browserPage.evaluate(() => document.documentElement.scrollWidth)}px)`,
        page.name, viewportName, screenshotName);
    }

    // Check text sizes
    const smallText = await browserPage.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, button, a, label'));
      const small = [];
      elements.forEach(el => {
        const size = parseFloat(window.getComputedStyle(el).fontSize);
        if (size < 12 && el.textContent.trim()) {
          small.push({
            text: el.textContent.substring(0, 40),
            size: size
          });
        }
      });
      return small.slice(0, 5); // Limit to first 5
    });

    smallText.forEach(item => {
      logIssue('MEDIUM', 'Text Readability',
        `Small font size ${item.size}px: "${item.text}..."`,
        page.name, viewportName);
    });

    // Check touch targets
    const smallTargets = await browserPage.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('button, a, input, [role="button"]'));
      const small = [];
      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if ((rect.width < 44 || rect.height < 44) && rect.width > 0 && rect.height > 0) {
          small.push({
            tag: el.tagName,
            text: el.textContent?.substring(0, 30) || el.getAttribute('aria-label') || '',
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          });
        }
      });
      return small.slice(0, 10); // Limit to first 10
    });

    smallTargets.forEach(item => {
      logIssue('MEDIUM', 'Touch Target',
        `${item.tag} too small (${item.width}x${item.height}px): "${item.text}"`,
        page.name, viewportName);
    });

    // Check for cut-off elements
    const cutoffElements = await browserPage.evaluate((viewportWidth, viewportHeight) => {
      const elements = Array.from(document.querySelectorAll('button, a, h1, h2, nav, main'));
      const cutoff = [];
      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          if (rect.right > viewportWidth || rect.bottom > viewportHeight || rect.left < 0 || rect.top < -100) {
            cutoff.push({
              tag: el.tagName,
              text: el.textContent?.substring(0, 30) || '',
              x: Math.round(rect.left),
              y: Math.round(rect.top),
              right: Math.round(rect.right),
              bottom: Math.round(rect.bottom)
            });
          }
        }
      });
      return cutoff.slice(0, 5);
    }, width, height);

    cutoffElements.forEach(item => {
      logIssue('HIGH', 'Element Cutoff',
        `${item.tag} outside viewport (x:${item.x}, right:${item.right}, bottom:${item.bottom}): "${item.text}"`,
        page.name, viewportName, screenshotName);
    });

    // Check for overlapping elements
    const overlaps = await browserPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a[role="button"]'));
      const overlapping = [];

      for (let i = 0; i < buttons.length; i++) {
        const rect1 = buttons[i].getBoundingClientRect();
        for (let j = i + 1; j < buttons.length; j++) {
          const rect2 = buttons[j].getBoundingClientRect();

          if (!(rect1.right < rect2.left ||
                rect1.left > rect2.right ||
                rect1.bottom < rect2.top ||
                rect1.top > rect2.bottom)) {
            overlapping.push({
              el1: buttons[i].textContent?.substring(0, 20) || buttons[i].tagName,
              el2: buttons[j].textContent?.substring(0, 20) || buttons[j].tagName
            });
          }
        }
      }
      return overlapping.slice(0, 3);
    });

    overlaps.forEach(item => {
      logIssue('HIGH', 'Element Overlap',
        `Elements overlapping: "${item.el1}" and "${item.el2}"`,
        page.name, viewportName, screenshotName);
    });

    console.log(`  ✓ Completed ${page.name} at ${viewportName}`);

  } catch (error) {
    logIssue('CRITICAL', 'Page Load',
      `Failed to test: ${error.message}`,
      page.name, viewportName);
    console.error(`  ✗ Error: ${error.message}`);
  } finally {
    await browserPage.close();
  }
}

async function runTests() {
  console.log('========================================');
  console.log('UI COMPREHENSIVE TESTING STARTING');
  console.log('========================================\n');

  if (!fs.existsSync('screenshots')) {
    fs.mkdirSync('screenshots');
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    // Test mobile (portrait & landscape)
    for (const vp of VIEWPORTS.mobile) {
      for (const pg of PAGES) {
        await testViewport(browser, pg, vp, 'portrait');
        await testViewport(browser, pg, vp, 'landscape');
      }
    }

    // Test tablet (portrait & landscape)
    for (const vp of VIEWPORTS.tablet) {
      for (const pg of PAGES) {
        await testViewport(browser, pg, vp, 'portrait');
        await testViewport(browser, pg, vp, 'landscape');
      }
    }

    // Test desktop (landscape only)
    for (const vp of VIEWPORTS.desktop) {
      for (const pg of PAGES) {
        await testViewport(browser, pg, vp, 'landscape');
      }
    }

  } finally {
    await browser.close();
  }

  // Generate report
  console.log('\n========================================');
  console.log('UI TEST REPORT SUMMARY');
  console.log('========================================\n');

  const critical = issues.filter(i => i.severity === 'CRITICAL');
  const high = issues.filter(i => i.severity === 'HIGH');
  const medium = issues.filter(i => i.severity === 'MEDIUM');
  const low = issues.filter(i => i.severity === 'LOW');

  console.log(`Total Issues: ${issues.length}`);
  console.log(`  Critical: ${critical.length}`);
  console.log(`  High: ${high.length}`);
  console.log(`  Medium: ${medium.length}`);
  console.log(`  Low: ${low.length}\n`);

  // Save detailed report
  fs.writeFileSync('ui-test-results.json', JSON.stringify({
    summary: {
      total: issues.length,
      critical: critical.length,
      high: high.length,
      medium: medium.length,
      low: low.length
    },
    issues,
    timestamp: new Date().toISOString()
  }, null, 2));

  console.log('Detailed results saved to: ui-test-results.json');
  console.log('Screenshots saved to: screenshots/\n');
  console.log('========================================\n');
}

runTests().catch(console.error);
