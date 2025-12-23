const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1024 }
  });
  const page = await context.newPage();

  console.log('=== BOGGLE WORD FORMING AREA UI TEST ===\n');

  try {
    // Navigate and start game
    console.log('1. Loading singleplayer page...');
    await page.goto('http://localhost:3001/en/singleplayer', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('2. Selecting Practice mode...');
    await page.locator('text=Practice').first().click();
    await page.waitForTimeout(1000);

    console.log('3. Starting game...');
    await page.locator('text=START GAME').first().click();
    await page.waitForTimeout(3000);

    // Dismiss any modals
    console.log('4. Dismissing any modals...');
    const gotItButton = page.locator('text=GOT IT');
    if (await gotItButton.isVisible().catch(() => false)) {
      await gotItButton.click();
      console.log('   ✓ Dismissed landscape controls modal');
    }
    await page.waitForTimeout(2000);

    await page.screenshot({ path: '/tmp/boggle_game_loaded.png', fullPage: true });
    console.log('   ✓ Screenshot: /tmp/boggle_game_loaded.png\n');

    // Comprehensive analysis
    console.log('5. Analyzing UI components...\n');
    const analysis = await page.evaluate(() => {
      const results = {
        wordFormingArea: null,
        notificationArea: null,
        gameUI: {},
        design: {},
        layout: {}
      };

      const allElements = Array.from(document.querySelectorAll('*'));

      // Find WordFormingArea by looking for "Swipe letters" text or cyan background
      const swipeElement = allElements.find(el => {
        const text = el.textContent || '';
        return text.trim() === 'Swipe letters' || text.includes('Swipe letters');
      });

      if (swipeElement) {
        const rect = swipeElement.getBoundingClientRect();
        const style = window.getComputedStyle(swipeElement);
        const parent = swipeElement.closest('div');
        const parentStyle = parent ? window.getComputedStyle(parent) : null;

        results.wordFormingArea = {
          found: true,
          text: swipeElement.textContent.trim(),
          position: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            top: Math.round(rect.top),
            bottom: Math.round(rect.bottom)
          },
          style: {
            backgroundColor: style.backgroundColor,
            color: style.color,
            border: style.border,
            borderColor: style.borderColor,
            borderWidth: style.borderWidth,
            boxShadow: style.boxShadow,
            padding: style.padding,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            textAlign: style.textAlign
          },
          parent: parentStyle ? {
            backgroundColor: parentStyle.backgroundColor,
            border: parentStyle.border,
            borderColor: parentStyle.borderColor,
            boxShadow: parentStyle.boxShadow,
            padding: parentStyle.padding,
            margin: parentStyle.margin,
            width: parentStyle.width,
            height: parentStyle.height
          } : null
        };
      } else {
        // Try to find any cyan-background element
        const cyanElement = allElements.find(el => {
          const style = window.getComputedStyle(el);
          const bg = style.backgroundColor;
          return bg === 'rgb(0, 255, 255)' || bg.includes('cyan');
        });

        if (cyanElement) {
          const rect = cyanElement.getBoundingClientRect();
          const style = window.getComputedStyle(cyanElement);
          results.wordFormingArea = {
            found: true,
            foundBy: 'cyan-background',
            text: cyanElement.textContent.trim().substring(0, 100),
            position: {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            },
            style: {
              backgroundColor: style.backgroundColor,
              border: style.border,
              boxShadow: style.boxShadow
            }
          };
        } else {
          results.wordFormingArea = { found: false };
        }
      }

      // Find game grid to understand spacing
      const gridElement = allElements.find(el => {
        const rect = el.getBoundingClientRect();
        // Grid is likely a large square element with buttons inside
        return rect.width > 200 && rect.height > 200 &&
               el.querySelectorAll('button').length >= 16;
      });

      if (gridElement) {
        const rect = gridElement.getBoundingClientRect();
        results.layout.grid = {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom)
        };
      }

      // Find timer, score, combo
      const bodyText = document.body.textContent || '';
      results.gameUI.timer = bodyText.match(/\d+:\d+/) ? bodyText.match(/\d+:\d+/)[0] : 'Not found';
      results.gameUI.scoreVisible = bodyText.toUpperCase().includes('SCORE') || bodyText.includes('0 SCORE');
      results.gameUI.wordsVisible = bodyText.toUpperCase().includes('WORDS');

      // Count design elements
      results.design.cyanElements = allElements.filter(el => {
        const bg = window.getComputedStyle(el).backgroundColor;
        return bg === 'rgb(0, 255, 255)' || bg.includes('cyan');
      }).length;

      results.design.yellowElements = allElements.filter(el => {
        const bg = window.getComputedStyle(el).backgroundColor;
        return bg === 'rgb(255, 255, 0)' || bg.includes('yellow');
      }).length;

      results.design.blackBorders = allElements.filter(el => {
        const style = window.getComputedStyle(el);
        return style.borderColor.includes('rgb(0, 0, 0)') ||
               style.border.includes('black');
      }).length;

      results.design.shadows = allElements.filter(el => {
        const shadow = window.getComputedStyle(el).boxShadow;
        return shadow && shadow !== 'none';
      }).length;

      // Layout info
      results.layout.viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      results.layout.bodyHeight = document.body.scrollHeight;

      return results;
    });

    // Print results
    if (analysis.wordFormingArea && analysis.wordFormingArea.found) {
      console.log('✓ WORD FORMING AREA FOUND');
      console.log('  Text: "' + analysis.wordFormingArea.text + '"');
      console.log('  Position:');
      console.log('    X: ' + analysis.wordFormingArea.position.x + 'px');
      console.log('    Y: ' + analysis.wordFormingArea.position.y + 'px');
      console.log('    Width: ' + analysis.wordFormingArea.position.width + 'px');
      console.log('    Height: ' + analysis.wordFormingArea.position.height + 'px');
      if (analysis.wordFormingArea.style) {
        console.log('  Styling:');
        console.log('    Background: ' + analysis.wordFormingArea.style.backgroundColor);
        console.log('    Color: ' + analysis.wordFormingArea.style.color);
        console.log('    Border: ' + analysis.wordFormingArea.style.border);
        console.log('    Box Shadow: ' + analysis.wordFormingArea.style.boxShadow);
        console.log('    Font Size: ' + analysis.wordFormingArea.style.fontSize);
      }
      if (analysis.wordFormingArea.parent) {
        console.log('  Parent Container:');
        console.log('    Background: ' + analysis.wordFormingArea.parent.backgroundColor);
        console.log('    Border: ' + analysis.wordFormingArea.parent.border);
        console.log('    Box Shadow: ' + analysis.wordFormingArea.parent.boxShadow);
        console.log('    Padding: ' + analysis.wordFormingArea.parent.padding);
      }
    } else {
      console.log('✗ WORD FORMING AREA NOT FOUND');
    }

    console.log('\n✓ GAME UI ELEMENTS');
    console.log('  Timer: ' + analysis.gameUI.timer);
    console.log('  Score visible: ' + analysis.gameUI.scoreVisible);
    console.log('  Words counter visible: ' + analysis.gameUI.wordsVisible);

    if (analysis.layout.grid) {
      console.log('\n✓ GRID LAYOUT');
      console.log('  Position: ' + analysis.layout.grid.x + 'px, ' + analysis.layout.grid.y + 'px');
      console.log('  Size: ' + analysis.layout.grid.width + 'x' + analysis.layout.grid.height + 'px');

      if (analysis.wordFormingArea && analysis.wordFormingArea.found && analysis.wordFormingArea.position) {
        const wordAreaBottom = analysis.wordFormingArea.position.bottom || analysis.wordFormingArea.position.y + analysis.wordFormingArea.position.height;
        const gridTop = analysis.layout.grid.top;
        const spacing = gridTop - wordAreaBottom;
        console.log('  Spacing between word area and grid: ' + spacing + 'px');
      }
    }

    console.log('\n✓ NEO-BRUTALIST DESIGN');
    console.log('  Cyan elements: ' + analysis.design.cyanElements);
    console.log('  Yellow elements: ' + analysis.design.yellowElements);
    console.log('  Black borders: ' + analysis.design.blackBorders);
    console.log('  Box shadows: ' + analysis.design.shadows);

    console.log('\n✓ LAYOUT');
    console.log('  Viewport: ' + analysis.layout.viewport.width + 'x' + analysis.layout.viewport.height + 'px');
    console.log('  Body height: ' + analysis.layout.bodyHeight + 'px');
    console.log('  Scrollable: ' + (analysis.layout.bodyHeight > analysis.layout.viewport.height ? 'Yes' : 'No'));

    // Test letter selection
    console.log('\n6. Testing letter selection...');
    const buttons = await page.locator('button').all();
    let clickedLetters = [];

    for (const btn of buttons) {
      if (clickedLetters.length >= 3) break;
      const text = await btn.textContent();
      const trimmed = text?.trim() || '';
      if (trimmed.length === 1 && trimmed.match(/[A-Z]/i)) {
        try {
          await btn.click();
          clickedLetters.push(trimmed);
          console.log('   ✓ Clicked: ' + trimmed);
          await page.waitForTimeout(400);
        } catch (e) {
          // Skip if can't click
        }
      }
    }

    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/boggle_with_word.png', fullPage: true });
    console.log('\n   ✓ Screenshot after clicks: /tmp/boggle_with_word.png');

    // Check if word is displayed
    const wordCheck = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'));
      const swipeElement = allElements.find(el => {
        const text = el.textContent || '';
        return text.includes('Swipe letters');
      });

      if (swipeElement) {
        return {
          placeholderGone: !swipeElement.textContent.includes('Swipe letters'),
          currentText: swipeElement.textContent.trim()
        };
      }
      return { placeholderGone: false, currentText: 'Element not found' };
    });

    console.log('\n7. Word formation verification:');
    console.log('   Clicked letters: ' + clickedLetters.join(', '));
    console.log('   Placeholder removed: ' + wordCheck.placeholderGone);
    console.log('   Current display: "' + wordCheck.currentText + '"');

    // Final viewport screenshot
    await page.screenshot({ path: '/tmp/boggle_final_viewport.png', fullPage: false });
    console.log('\n✓ Final viewport screenshot: /tmp/boggle_final_viewport.png');

    console.log('\n=== TEST COMPLETED ===\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    await page.screenshot({ path: '/tmp/boggle_test_error.png', fullPage: true });
    console.log('Error screenshot: /tmp/boggle_test_error.png');
  } finally {
    await browser.close();
  }
})();
