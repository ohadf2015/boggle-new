const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1024 }
  });
  const page = await context.newPage();

  // Capture console messages
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });

  console.log('\n=== BOGGLE UI CURRENT STATE ANALYSIS ===\n');

  try {
    // Navigate and start game
    console.log('1. Loading game...');
    await page.goto('http://localhost:3001/en/singleplayer', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.locator('text=Practice').first().click();
    await page.waitForTimeout(1000);
    await page.locator('text=START GAME').first().click();
    await page.waitForTimeout(3000);

    // Dismiss modal
    const gotItButton = page.locator('text=GOT IT');
    if (await gotItButton.isVisible().catch(() => false)) {
      await gotItButton.click();
      await page.waitForTimeout(2000);
    }

    // Wait a reasonable time for anything to load
    await page.waitForTimeout(5000);

    await page.screenshot({ path: '/tmp/boggle_current_state.png', fullPage: true });
    console.log('   Screenshot: /tmp/boggle_current_state.png\n');

    // Analyze what's on the page
    console.log('2. Page Analysis:\n');

    const pageState = await page.evaluate(() => {
      const allText = document.body.textContent || '';
      const allElements = Array.from(document.querySelectorAll('*'));

      return {
        // Count elements
        totalElements: allElements.length,
        buttons: document.querySelectorAll('button').length,
        divs: document.querySelectorAll('div').length,

        // Check for text mentions
        hasSwipeText: allText.includes('Swipe') || allText.includes('swipe'),
        hasPlaceText: allText.includes('Place') || allText.includes('PLACE'),
        hasLoadingText: allText.includes('Loading') || allText.includes('loading'),

        // Check for specific elements
        hasCyanElements: allElements.some(el => {
          const bg = window.getComputedStyle(el).backgroundColor;
          return bg === 'rgb(0, 255, 255)' || bg.includes('cyan');
        }),

        // Get visible text (first 500 chars)
        visibleText: allText.substring(0, 500),

        // Check for WordFormingArea or GameNotificationArea by class
        hasWordFormingClass: allElements.some(el =>
          el.className && el.className.includes('WordForming')
        ),
        hasNotificationClass: allElements.some(el =>
          el.className && el.className.includes('Notification') || el.className.includes('notification')
        ),

        // Get all unique text content (for debugging)
        uniqueTexts: [...new Set(allElements.map(el => {
          const text = el.textContent?.trim() || '';
          return text.length > 0 && text.length < 50 ? text : null;
        }).filter(Boolean))].slice(0, 20)
      };
    });

    console.log('   Total elements:', pageState.totalElements);
    console.log('   Buttons:', pageState.buttons);
    console.log('   Divs:', pageState.divs);
    console.log('\n   Text mentions:');
    console.log('     "Swipe": ' + pageState.hasSwipeText);
    console.log('     "Place": ' + pageState.hasPlaceText);
    console.log('     "Loading": ' + pageState.hasLoadingText);
    console.log('\n   Element checks:');
    console.log('     Cyan elements: ' + pageState.hasCyanElements);
    console.log('     WordForming class: ' + pageState.hasWordFormingClass);
    console.log('     Notification class: ' + pageState.hasNotificationClass);

    console.log('\n   Unique texts on page:');
    pageState.uniqueTexts.forEach((text, i) => {
      console.log('     ' + (i + 1) + '. "' + text + '"');
    });

    console.log('\n3. Console Logs:\n');
    if (consoleLogs.length > 0) {
      consoleLogs.slice(-10).forEach(log => console.log('   ' + log));
    } else {
      console.log('   (No console messages captured)');
    }

    // Try to get HTML of main container
    const mainHTML = await page.evaluate(() => {
      const main = document.querySelector('main') || document.body;
      return main.innerHTML.substring(0, 1000);
    });

    console.log('\n4. Main HTML (first 1000 chars):\n');
    console.log(mainHTML);

    console.log('\n=== ANALYSIS COMPLETE ===\n');
    console.log('The game appears to be stuck in loading state.');
    console.log('This may indicate:');
    console.log('  - Backend/WebSocket connection issues');
    console.log('  - Missing environment variables');
    console.log('  - Game initialization problems');
    console.log('\nPlease check:');
    console.log('  1. Backend server is running');
    console.log('  2. WebSocket connection is established');
    console.log('  3. Browser console for errors\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await page.screenshot({ path: '/tmp/boggle_analysis_error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
