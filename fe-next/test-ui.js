const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1024 }
  });
  const page = await context.newPage();

  console.log('=== BOGGLE UI TEST REPORT ===\n');

  try {
    // Step 1: Navigate to singleplayer page
    console.log('1. Navigating to http://localhost:3001/en/singleplayer');
    await page.goto('http://localhost:3001/en/singleplayer', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/boggle_01_singleplayer_page.png', fullPage: true });
    console.log('   ✓ Screenshot saved: /tmp/boggle_01_singleplayer_page.png\n');

    // Step 2: Select Practice mode
    console.log('2. Selecting Practice mode');
    const practiceButton = await page.locator('text=Practice').first();
    if (await practiceButton.isVisible()) {
      await practiceButton.click();
      console.log('   ✓ Clicked Practice button');
    }
    await page.waitForTimeout(1000);

    // Step 3: Click START GAME button
    console.log('3. Starting the game');
    const startButton = await page.locator('text=START GAME').first();
    if (await startButton.isVisible()) {
      await startButton.click();
      console.log('   ✓ Clicked START GAME button');
    } else {
      console.log('   ⚠ START GAME button not found, trying alternative selector');
      const buttons = await page.locator('button').all();
      for (const btn of buttons) {
        const text = await btn.textContent();
        if (text && text.toUpperCase().includes('START')) {
          await btn.click();
          console.log('   ✓ Clicked START button (alternative selector)');
          break;
        }
      }
    }

    await page.waitForTimeout(4000);
    await page.screenshot({ path: '/tmp/boggle_02_game_started.png', fullPage: true });
    console.log('   ✓ Screenshot saved: /tmp/boggle_02_game_started.png\n');

    // Step 4: Check for WordFormingArea
    console.log('4. Checking WordFormingArea component');

    // Try multiple approaches to find the WordFormingArea
    let wordFormingInfo = await page.evaluate(() => {
      const allDivs = Array.from(document.querySelectorAll('div'));

      // Look for elements with "Swipe letters" text
      const swipeElement = Array.from(document.querySelectorAll('*')).find(el =>
        el.textContent && el.textContent.includes('Swipe letters')
      );

      if (swipeElement) {
        const style = window.getComputedStyle(swipeElement);
        const parent = swipeElement.parentElement;
        const parentStyle = parent ? window.getComputedStyle(parent) : null;
        const rect = swipeElement.getBoundingClientRect();

        return {
          found: true,
          hasPlaceholder: true,
          text: swipeElement.textContent,
          position: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          },
          styling: {
            backgroundColor: style.backgroundColor,
            color: style.color,
            border: style.border,
            boxShadow: style.boxShadow,
            padding: style.padding
          },
          parentStyling: parentStyle ? {
            backgroundColor: parentStyle.backgroundColor,
            border: parentStyle.border,
            boxShadow: parentStyle.boxShadow
          } : null
        };
      }

      // Look for cyan background elements
      const cyanElements = allDivs.filter(el => {
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;
        return bg.includes('cyan') || bg.includes('0, 255, 255');
      });

      return {
        found: false,
        cyanElementsFound: cyanElements.length
      };
    });

    if (wordFormingInfo.found) {
      console.log('   ✓ WordFormingArea found!');
      console.log('   ✓ Has placeholder text: ' + wordFormingInfo.hasPlaceholder);
      console.log('   ✓ Placeholder text: "' + wordFormingInfo.text + '"');
      console.log('   ✓ Position: x=' + Math.round(wordFormingInfo.position.x) + ', y=' + Math.round(wordFormingInfo.position.y) + ', width=' + Math.round(wordFormingInfo.position.width) + ', height=' + Math.round(wordFormingInfo.position.height));
      console.log('   Styling:');
      console.log('     - Background: ' + wordFormingInfo.styling.backgroundColor);
      console.log('     - Color: ' + wordFormingInfo.styling.color);
      console.log('     - Border: ' + wordFormingInfo.styling.border);
      console.log('     - Shadow: ' + wordFormingInfo.styling.boxShadow);
      if (wordFormingInfo.parentStyling) {
        console.log('   Parent Container Styling:');
        console.log('     - Background: ' + wordFormingInfo.parentStyling.backgroundColor);
        console.log('     - Border: ' + wordFormingInfo.parentStyling.border);
        console.log('     - Shadow: ' + wordFormingInfo.parentStyling.boxShadow);
      }
    } else {
      console.log('   ⚠ WordFormingArea not found');
      console.log('   Found ' + wordFormingInfo.cyanElementsFound + ' cyan elements on page');
    }
    console.log('');

    // Step 5: Check for GameNotificationArea
    console.log('5. Checking GameNotificationArea component');
    const notificationInfo = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'));

      // Look for notification-related elements
      const notificationWords = ['notification', 'alert', 'message', 'toast'];
      const potentialNotifications = allElements.filter(el => {
        const classes = el.className ? el.className.toLowerCase() : '';
        const id = el.id ? el.id.toLowerCase() : '';
        return notificationWords.some(word => classes.includes(word) || id.includes(word));
      });

      if (potentialNotifications.length > 0) {
        const el = potentialNotifications[0];
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);

        return {
          found: true,
          position: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          },
          styling: {
            backgroundColor: style.backgroundColor,
            border: style.border,
            display: style.display
          }
        };
      }

      return { found: false };
    });

    if (notificationInfo.found) {
      console.log('   ✓ GameNotificationArea found!');
      console.log('   ✓ Position: x=' + Math.round(notificationInfo.position.x) + ', y=' + Math.round(notificationInfo.position.y) + ', width=' + Math.round(notificationInfo.position.width) + ', height=' + Math.round(notificationInfo.position.height));
    } else {
      console.log('   ⚠ GameNotificationArea not found or empty (may appear during gameplay)');
    }
    console.log('');

    // Step 6: Check for game UI elements
    console.log('6. Verifying game UI elements are visible');

    const gameUIElements = await page.evaluate(() => {
      const body = document.body;
      const text = body.textContent || '';

      // Look for timer pattern
      const timerMatch = text.match(/\d+:\d+/);

      // Look for score
      const scoreMatch = text.match(/Score|Points|\d+\s*pts/i);

      // Look for combo
      const comboMatch = text.match(/combo|chain|streak/i);

      // Get all visible text elements
      const allElements = Array.from(document.querySelectorAll('*'));
      const visibleElements = allElements.filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      });

      return {
        timerFound: !!timerMatch,
        timerText: timerMatch ? timerMatch[0] : null,
        scoreFound: !!scoreMatch,
        comboFound: !!comboMatch,
        visibleElementsCount: visibleElements.length
      };
    });

    console.log('   Timer found: ' + (gameUIElements.timerFound ? '✓ ' + gameUIElements.timerText : '✗'));
    console.log('   Score found: ' + (gameUIElements.scoreFound ? '✓' : '✗'));
    console.log('   Combo found: ' + (gameUIElements.comboFound ? '✓' : '✗'));
    console.log('   Total visible elements: ' + gameUIElements.visibleElementsCount);
    console.log('');

    // Step 7: Take screenshot before letter selection
    await page.screenshot({ path: '/tmp/boggle_03_before_selection.png', fullPage: true });
    console.log('7. Screenshot before letter selection saved: /tmp/boggle_03_before_selection.png\n');

    // Step 8: Find and click on grid letters
    console.log('8. Testing letter selection and word formation');

    // Find all clickable letter elements
    const letterInfo = await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));

      // Filter buttons that look like letter tiles (single character or short text)
      const letterButtons = allButtons.filter(btn => {
        const text = btn.textContent?.trim() || '';
        const rect = btn.getBoundingClientRect();
        return text.length <= 3 && rect.width > 20 && rect.height > 20;
      });

      return {
        totalButtons: allButtons.length,
        letterButtons: letterButtons.length,
        letterTexts: letterButtons.slice(0, 5).map(btn => btn.textContent?.trim())
      };
    });

    console.log('   Total buttons on page: ' + letterInfo.totalButtons);
    console.log('   Potential letter buttons: ' + letterInfo.letterButtons);
    console.log('   First 5 letters: ' + letterInfo.letterTexts.join(', '));

    if (letterInfo.letterButtons >= 3) {
      console.log('\n   Clicking first 3 letter buttons...');

      // Get all button elements
      const allButtons = await page.locator('button').all();

      // Filter to likely letter buttons and click first 3
      let clickedCount = 0;
      for (const btn of allButtons) {
        if (clickedCount >= 3) break;

        const text = await btn.textContent();
        const trimmedText = text?.trim() || '';

        if (trimmedText.length <= 3 && trimmedText.length > 0) {
          try {
            await btn.click();
            await page.waitForTimeout(400);
            console.log('   ✓ Clicked letter: ' + trimmedText);
            clickedCount++;
          } catch (e) {
            console.log('   ⚠ Failed to click letter: ' + e.message);
          }
        }
      }

      await page.waitForTimeout(1000);
      await page.screenshot({ path: '/tmp/boggle_04_word_forming.png', fullPage: true });
      console.log('\n   ✓ Screenshot after letter selection saved: /tmp/boggle_04_word_forming.png');

      // Check if word appears in WordFormingArea
      const wordDisplayed = await page.evaluate(() => {
        const body = document.body.textContent || '';
        const swipeElement = Array.from(document.querySelectorAll('*')).find(el =>
          el.textContent && el.textContent.includes('Swipe letters')
        );

        if (swipeElement) {
          // Check if placeholder is still visible or replaced with letters
          const text = swipeElement.textContent;
          return {
            placeholderStillVisible: text.includes('Swipe letters'),
            currentText: text
          };
        }

        return { placeholderStillVisible: true, currentText: 'Not found' };
      });

      console.log('\n   Word Formation Check:');
      console.log('   - Placeholder still visible: ' + wordDisplayed.placeholderStillVisible);
      console.log('   - Current text in area: "' + wordDisplayed.currentText + '"');

    } else {
      console.log('   ⚠ Not enough letter buttons found to test');
    }
    console.log('');

    // Step 9: Layout and spacing analysis
    console.log('9. Analyzing layout and Neo-Brutalist design elements');
    const layoutAnalysis = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'));

      // Find cyan elements
      const cyanElements = allElements.filter(el => {
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;
        return bg.includes('cyan') || bg.includes('0, 255, 255') || bg === 'rgb(0, 255, 255)';
      });

      // Find yellow elements
      const yellowElements = allElements.filter(el => {
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;
        return bg.includes('yellow') || bg.includes('255, 255, 0') || bg === 'rgb(255, 255, 0)';
      });

      // Find black bordered elements
      const blackBorderElements = allElements.filter(el => {
        const style = window.getComputedStyle(el);
        const border = style.border;
        return border.includes('0px 0px 0px') || border.includes('black') ||
               border.includes('rgb(0, 0, 0)') || style.borderColor.includes('rgb(0, 0, 0)');
      });

      // Find elements with box shadows
      const shadowElements = allElements.filter(el => {
        const style = window.getComputedStyle(el);
        return style.boxShadow && style.boxShadow !== 'none';
      });

      // Get viewport info
      return {
        cyanCount: cyanElements.length,
        yellowCount: yellowElements.length,
        blackBorderCount: blackBorderElements.length,
        shadowCount: shadowElements.length,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        scrollHeight: document.body.scrollHeight,
        scrollWidth: document.body.scrollWidth
      };
    });

    console.log('   Neo-Brutalist Design Elements:');
    console.log('   - Cyan elements (expected for word area): ' + layoutAnalysis.cyanCount);
    console.log('   - Yellow elements: ' + layoutAnalysis.yellowCount);
    console.log('   - Black border elements: ' + layoutAnalysis.blackBorderCount);
    console.log('   - Elements with shadows: ' + layoutAnalysis.shadowCount);
    console.log('\n   Layout Dimensions:');
    console.log('   - Viewport: ' + layoutAnalysis.viewportWidth + 'x' + layoutAnalysis.viewportHeight);
    console.log('   - Content: ' + layoutAnalysis.scrollWidth + 'x' + layoutAnalysis.scrollHeight);
    console.log('');

    // Step 10: Final screenshots
    console.log('10. Taking final comprehensive screenshots');
    await page.screenshot({ path: '/tmp/boggle_05_final_fullpage.png', fullPage: true });
    console.log('   ✓ Full page: /tmp/boggle_05_final_fullpage.png');

    await page.screenshot({ path: '/tmp/boggle_06_final_viewport.png', fullPage: false });
    console.log('   ✓ Viewport: /tmp/boggle_06_final_viewport.png');
    console.log('');

    console.log('=== TEST COMPLETED SUCCESSFULLY ===');
    console.log('All screenshots saved to /tmp/ directory');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    await page.screenshot({ path: '/tmp/boggle_error.png', fullPage: true });
    console.log('Error screenshot saved: /tmp/boggle_error.png');
  } finally {
    await browser.close();
  }
})();
