const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 720 }
  });
  const page = await browser.newPage();

  // Capture console messages and errors
  const consoleLogs = [];
  const errors = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    console.log(`Browser console [${msg.type()}]: ${text}`);
  });

  page.on('pageerror', error => {
    errors.push(error.message);
    console.error('Page error:', error.message);
  });

  try {
    console.log('=== Boggle UI Test - Word Forming Area & Notification Area ===\n');

    // Navigate to the singleplayer page
    console.log('1. Navigating to http://localhost:3001/en/singleplayer...');
    await page.goto('http://localhost:3001/en/singleplayer', { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Take initial screenshot
    console.log('2. Taking screenshot of setup page...');
    await page.screenshot({ path: '/Users/ohadfisher/git/boggle-new/test-screenshots/01-setup-page.png', fullPage: true });

    // Click the START GAME button
    console.log('3. Clicking START GAME button...');
    const buttons = await page.$$('button');
    let startButtonClicked = false;
    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text.includes('START GAME') || text.includes('Start Game')) {
        await button.click();
        startButtonClicked = true;
        console.log('   - START GAME button clicked');
        break;
      }
    }
    if (!startButtonClicked) {
      console.log('   - WARNING: Could not find START GAME button');
    }

    console.log('4. Waiting for game to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Take screenshot of the game page
    await page.screenshot({ path: '/Users/ohadfisher/git/boggle-new/test-screenshots/02-game-loaded.png', fullPage: true });

    // Check for and dismiss any help/tutorial dialogs
    console.log('4a. Checking for help dialogs to dismiss...');
    const gotItButtons = await page.$$('button');
    for (const button of gotItButtons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text.includes('GOT IT') || text.includes('Got it') || text.includes('OK') || text.includes('Close')) {
        await button.click();
        console.log('   - Dismissed help dialog');
        await new Promise(resolve => setTimeout(resolve, 1000));
        break;
      }
    }

    await page.screenshot({ path: '/Users/ohadfisher/git/boggle-new/test-screenshots/02b-after-dialog-dismiss.png', fullPage: true });

    // Wait for grid to load (check for letter buttons)
    console.log('4b. Waiting for letter grid to appear...');
    let gridLoaded = false;
    for (let i = 0; i < 15; i++) {
      const letterButtons = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button')).filter(btn =>
          btn.textContent.trim().length === 1 && /[A-Z]/i.test(btn.textContent)
        );
        return buttons.length;
      });
      if (letterButtons > 0) {
        gridLoaded = true;
        console.log(`   - Grid loaded with ${letterButtons} letter buttons`);
        break;
      }
      console.log(`   - Attempt ${i + 1}/15: Grid not loaded yet, waiting...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!gridLoaded) {
      console.log('   - WARNING: Grid did not load after 15 seconds');
      console.log('\n=== Console Logs ===');
      console.log(consoleLogs.join('\n'));
      console.log('\n=== Errors ===');
      console.log(errors.join('\n'));

      // Get page HTML for debugging
      const html = await page.content();
      console.log('\n=== Page HTML (first 1000 chars) ===');
      console.log(html.substring(0, 1000));
    }

    await page.screenshot({ path: '/Users/ohadfisher/git/boggle-new/test-screenshots/02c-grid-state.png', fullPage: true });

    // Even if grid didn't load, check for the components
    console.log('\n5. Checking for Word Forming Area...');
    const wordFormingAreaInfo = await page.evaluate(() => {
      // Try multiple selectors
      let wordFormingArea = document.querySelector('[class*="WordFormingArea"]');
      if (!wordFormingArea) {
        wordFormingArea = document.querySelector('[data-testid="word-forming-area"]');
      }
      if (!wordFormingArea) {
        // Look for element with "Swipe letters" text
        const allDivs = Array.from(document.querySelectorAll('div'));
        wordFormingArea = allDivs.find(div => {
          const text = div.textContent || '';
          return text.toLowerCase().includes('swipe') && text.length < 50;
        });
      }

      if (wordFormingArea) {
        const rect = wordFormingArea.getBoundingClientRect();
        const style = window.getComputedStyle(wordFormingArea);
        return {
          exists: true,
          visible: rect.width > 0 && rect.height > 0,
          position: { x: rect.x, y: rect.y },
          size: { width: rect.width, height: rect.height },
          className: wordFormingArea.className,
          textContent: wordFormingArea.textContent,
          hasPlaceholder: (wordFormingArea.textContent || '').toLowerCase().includes('swipe'),
          cssPosition: style.position,
          zIndex: style.zIndex
        };
      }
      return { exists: false };
    });

    console.log(`   - Word Forming Area exists: ${wordFormingAreaInfo.exists}`);
    if (wordFormingAreaInfo.exists) {
      console.log(`   - Word Forming Area visible: ${wordFormingAreaInfo.visible}`);
      console.log(`   - Position: x=${wordFormingAreaInfo.position.x}, y=${wordFormingAreaInfo.position.y}`);
      console.log(`   - Size: width=${wordFormingAreaInfo.size.width}px, height=${wordFormingAreaInfo.size.height}px`);
      console.log(`   - Has "Swipe letters" placeholder: ${wordFormingAreaInfo.hasPlaceholder}`);
      console.log(`   - CSS Position: ${wordFormingAreaInfo.cssPosition}, z-index: ${wordFormingAreaInfo.zIndex}`);
      console.log(`   - Class: ${wordFormingAreaInfo.className}`);
      console.log(`   - Text content: "${wordFormingAreaInfo.textContent.substring(0, 100)}"`);

      // Highlight the word forming area
      await page.evaluate(() => {
        const wordForming = document.querySelector('[class*="WordFormingArea"]') ||
                           document.querySelector('[data-testid="word-forming-area"]') ||
                           Array.from(document.querySelectorAll('div')).find(div => {
                             const text = div.textContent || '';
                             return text.toLowerCase().includes('swipe') && text.length < 50;
                           });
        if (wordForming) {
          wordForming.style.outline = '3px solid red';
          wordForming.style.outlineOffset = '2px';
        }
      });
      await page.screenshot({ path: '/Users/ohadfisher/git/boggle-new/test-screenshots/03-word-forming-area-highlighted.png', fullPage: true });
    } else {
      console.log('   - WARNING: Word Forming Area not found!');
    }

    // Check for Notification Area
    console.log('\n6. Checking for Notification Area...');
    const notificationAreaInfo = await page.evaluate(() => {
      let notificationArea = document.querySelector('[class*="NotificationArea"]') ||
                            document.querySelector('[class*="GameNotificationArea"]') ||
                            document.querySelector('[data-testid="notification-area"]');

      if (notificationArea) {
        const rect = notificationArea.getBoundingClientRect();
        const style = window.getComputedStyle(notificationArea);
        return {
          exists: true,
          visible: rect.width > 0 && rect.height > 0,
          position: { x: rect.x, y: rect.y },
          size: { width: rect.width, height: rect.height },
          className: notificationArea.className,
          textContent: notificationArea.textContent,
          cssPosition: style.position,
          zIndex: style.zIndex
        };
      }
      return { exists: false };
    });

    console.log(`   - Notification Area exists: ${notificationAreaInfo.exists}`);
    if (notificationAreaInfo.exists) {
      console.log(`   - Notification Area visible: ${notificationAreaInfo.visible}`);
      console.log(`   - Position: x=${notificationAreaInfo.position.x}, y=${notificationAreaInfo.position.y}`);
      console.log(`   - Size: width=${notificationAreaInfo.size.width}px, height=${notificationAreaInfo.size.height}px`);
      console.log(`   - CSS Position: ${notificationAreaInfo.cssPosition}, z-index: ${notificationAreaInfo.zIndex}`);
      console.log(`   - Class: ${notificationAreaInfo.className}`);
      console.log(`   - Text content: "${notificationAreaInfo.textContent.substring(0, 100)}"`);

      // Highlight notification area
      await page.evaluate(() => {
        const notification = document.querySelector('[class*="NotificationArea"]') ||
                           document.querySelector('[class*="GameNotificationArea"]') ||
                           document.querySelector('[data-testid="notification-area"]');
        if (notification) {
          notification.style.outline = '3px solid blue';
          notification.style.outlineOffset = '2px';
        }
      });
      await page.screenshot({ path: '/Users/ohadfisher/git/boggle-new/test-screenshots/04-notification-area-highlighted.png', fullPage: true });
    } else {
      console.log('   - WARNING: Notification Area not found!');
    }

    console.log('\n=== TEST SUMMARY ===');
    console.log(`Grid Loaded: ${gridLoaded}`);
    console.log(`Word Forming Area Found: ${wordFormingAreaInfo.exists}`);
    console.log(`Notification Area Found: ${notificationAreaInfo.exists}`);
    console.log(`\nConsole Errors: ${errors.length}`);
    if (errors.length > 0) {
      console.log('Errors:');
      errors.forEach((err, idx) => console.log(`  ${idx + 1}. ${err}`));
    }

    console.log('\nScreenshots saved to: /Users/ohadfisher/git/boggle-new/test-screenshots/');

    // Keep browser open for manual inspection
    console.log('\n=== Browser will remain open for 30 seconds for manual inspection ===');
    await new Promise(resolve => setTimeout(resolve, 30000));

  } catch (error) {
    console.error('\n=== Error during testing ===');
    console.error(error);
    await page.screenshot({ path: '/Users/ohadfisher/git/boggle-new/test-screenshots/error-screenshot.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
