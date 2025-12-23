const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1024 }
  });
  const page = await context.newPage();

  console.log('\n========================================');
  console.log('  BOGGLE WORD FORMING AREA UI TEST');
  console.log('========================================\n');

  try {
    // Navigate and start game
    console.log('Step 1: Loading game...');
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
      await page.waitForTimeout(1000);
    }

    // Wait for game board to load - look for multiple letter buttons
    console.log('Step 2: Waiting for game board to load...');
    await page.waitForFunction(() => {
      const buttons = document.querySelectorAll('button');
      const letterButtons = Array.from(buttons).filter(btn => {
        const text = btn.textContent?.trim() || '';
        return text.length === 1 && text.match(/[A-Z]/i);
      });
      return letterButtons.length >= 16; // 7x7 grid should have 49 letters
    }, { timeout: 15000 });

    await page.waitForTimeout(2000); // Extra time for animations
    console.log('   ✓ Game board loaded\n');

    await page.screenshot({ path: '/tmp/boggle_board_loaded.png', fullPage: true });
    console.log('   Screenshot saved: /tmp/boggle_board_loaded.png\n');

    // Comprehensive analysis
    console.log('Step 3: Analyzing UI Components\n');
    console.log('----------------------------------------\n');

    const analysis = await page.evaluate(() => {
      const results = {};

      // WORD FORMING AREA - Look for "Swipe letters" text or bg-neo-cyan
      const allElements = Array.from(document.querySelectorAll('*'));

      // Method 1: Find by text content
      const swipeElement = allElements.find(el => {
        const text = el.textContent?.trim() || '';
        return text === 'Swipe letters' || text === 'SWIPE LETTERS';
      });

      if (swipeElement) {
        const rect = swipeElement.getBoundingClientRect();
        const style = window.getComputedStyle(swipeElement);
        const parent = swipeElement.parentElement;
        const parentStyle = parent ? window.getComputedStyle(parent) : null;

        results.wordFormingArea = {
          found: true,
          method: 'text-content',
          text: swipeElement.textContent.trim(),
          position: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          },
          styling: {
            backgroundColor: style.backgroundColor,
            color: style.color,
            border: style.border,
            borderStyle: style.borderStyle,
            borderWidth: style.borderWidth,
            borderColor: style.borderColor,
            boxShadow: style.boxShadow,
            padding: style.padding,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight
          },
          parentStyling: parentStyle ? {
            height: parentStyle.height,
            minHeight: parentStyle.minHeight,
            display: parentStyle.display,
            alignItems: parentStyle.alignItems,
            justifyContent: parentStyle.justifyContent
          } : null
        };
      }

      // Method 2: Find any neo-cyan element
      const cyanElements = allElements.filter(el => {
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;
        const classes = el.className || '';
        return bg === 'rgb(0, 255, 255)' ||
               classes.includes('bg-neo-cyan') ||
               classes.includes('cyan');
      });

      results.cyanElementsCount = cyanElements.length;
      if (cyanElements.length > 0 && !results.wordFormingArea) {
        const el = cyanElements[0];
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        results.wordFormingArea = {
          found: true,
          method: 'cyan-background',
          text: el.textContent?.substring(0, 50) || '',
          position: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          },
          styling: {
            backgroundColor: style.backgroundColor,
            border: style.border,
            boxShadow: style.boxShadow
          }
        };
      }

      // GRID - Find the letter grid
      const gridButtons = allElements.filter(el => {
        if (el.tagName !== 'BUTTON') return false;
        const text = el.textContent?.trim() || '';
        const rect = el.getBoundingClientRect();
        return text.length === 1 && text.match(/[A-Z]/i) && rect.width > 30;
      });

      if (gridButtons.length > 0) {
        // Find the container of the grid
        const firstButton = gridButtons[0];
        let gridContainer = firstButton.parentElement;
        while (gridContainer && gridContainer.querySelectorAll('button').length < 16) {
          gridContainer = gridContainer.parentElement;
        }

        if (gridContainer) {
          const rect = gridContainer.getBoundingClientRect();
          results.grid = {
            found: true,
            letterCount: gridButtons.length,
            position: {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              top: Math.round(rect.top)
            }
          };
        }
      }

      // GAME UI ELEMENTS
      const bodyText = document.body.textContent || '';
      results.gameUI = {
        scoreVisible: bodyText.includes('SCORE') || bodyText.includes('Score'),
        wordsVisible: bodyText.includes('WORDS') || bodyText.includes('Words'),
        finishVisible: bodyText.includes('FINISH') || bodyText.includes('Finish')
      };

      // NEO-BRUTALIST DESIGN ELEMENTS
      results.design = {
        hardShadows: allElements.filter(el => {
          const shadow = window.getComputedStyle(el).boxShadow;
          // Hard shadows have no blur (4th value is 0)
          return shadow && shadow !== 'none' && !shadow.includes('blur');
        }).length,
        blackBorders: allElements.filter(el => {
          const style = window.getComputedStyle(el);
          return (style.borderColor.includes('0, 0, 0') ||
                  style.borderColor === 'black') &&
                 parseInt(style.borderWidth) >= 2;
        }).length,
        yellowElements: allElements.filter(el => {
          const bg = window.getComputedStyle(el).backgroundColor;
          return bg.includes('255, 225') || // neo-yellow
                 bg === 'rgb(255, 225, 53)';
        }).length
      };

      // LAYOUT INFO
      results.layout = {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        bodyHeight: document.body.scrollHeight,
        isScrollable: document.body.scrollHeight > window.innerHeight
      };

      // Calculate spacing if both word area and grid found
      if (results.wordFormingArea && results.grid) {
        const wordBottom = results.wordFormingArea.position.y + results.wordFormingArea.position.height;
        const gridTop = results.grid.position.top;
        results.spacing = {
          betweenWordAreaAndGrid: Math.round(gridTop - wordBottom)
        };
      }

      return results;
    });

    // PRINT RESULTS
    console.log('=== WORD FORMING AREA ===');
    if (analysis.wordFormingArea) {
      console.log('✓ FOUND');
      console.log('  Detection method: ' + analysis.wordFormingArea.method);
      console.log('  Text content: "' + analysis.wordFormingArea.text + '"');
      console.log('\n  Position:');
      console.log('    X: ' + analysis.wordFormingArea.position.x + 'px');
      console.log('    Y: ' + analysis.wordFormingArea.position.y + 'px');
      console.log('    Width: ' + analysis.wordFormingArea.position.width + 'px');
      console.log('    Height: ' + analysis.wordFormingArea.position.height + 'px');

      if (analysis.wordFormingArea.styling) {
        console.log('\n  Styling:');
        console.log('    Background: ' + analysis.wordFormingArea.styling.backgroundColor);
        console.log('    Color: ' + analysis.wordFormingArea.styling.color);
        console.log('    Border: ' + analysis.wordFormingArea.styling.border);
        console.log('    Border Style: ' + analysis.wordFormingArea.styling.borderStyle);
        console.log('    Box Shadow: ' + analysis.wordFormingArea.styling.boxShadow);
        console.log('    Font Size: ' + analysis.wordFormingArea.styling.fontSize);
        console.log('    Font Weight: ' + analysis.wordFormingArea.styling.fontWeight);
      }

      if (analysis.wordFormingArea.parentStyling) {
        console.log('\n  Parent Container:');
        console.log('    Height: ' + analysis.wordFormingArea.parentStyling.height);
        console.log('    Min Height: ' + analysis.wordFormingArea.parentStyling.minHeight);
        console.log('    Display: ' + analysis.wordFormingArea.parentStyling.display);
        console.log('    Alignment: ' + analysis.wordFormingArea.parentStyling.alignItems);
      }
    } else {
      console.log('✗ NOT FOUND');
      console.log('  Cyan elements found: ' + analysis.cyanElementsCount);
    }

    console.log('\n=== GAME GRID ===');
    if (analysis.grid) {
      console.log('✓ FOUND');
      console.log('  Letter buttons: ' + analysis.grid.letterCount);
      console.log('  Position: ' + analysis.grid.position.x + 'px, ' + analysis.grid.position.y + 'px');
      console.log('  Size: ' + analysis.grid.position.width + 'x' + analysis.grid.position.height + 'px');
    } else {
      console.log('✗ NOT FOUND');
    }

    if (analysis.spacing) {
      console.log('\n=== SPACING ===');
      console.log('  Between Word Area and Grid: ' + analysis.spacing.betweenWordAreaAndGrid + 'px');
      if (analysis.spacing.betweenWordAreaAndGrid < 0) {
        console.log('  ⚠ WARNING: Negative spacing indicates overlap!');
      } else if (analysis.spacing.betweenWordAreaAndGrid === 0) {
        console.log('  ⚠ WARNING: No spacing between elements');
      } else {
        console.log('  ✓ Good spacing - elements don\'t overlap');
      }
    }

    console.log('\n=== GAME UI ELEMENTS ===');
    console.log('  Score display: ' + (analysis.gameUI.scoreVisible ? '✓ Visible' : '✗ Not found'));
    console.log('  Words counter: ' + (analysis.gameUI.wordsVisible ? '✓ Visible' : '✗ Not found'));
    console.log('  Finish button: ' + (analysis.gameUI.finishVisible ? '✓ Visible' : '✗ Not found'));

    console.log('\n=== NEO-BRUTALIST DESIGN ===');
    console.log('  Hard shadows (no blur): ' + analysis.design.hardShadows);
    console.log('  Black borders (2px+): ' + analysis.design.blackBorders);
    console.log('  Yellow elements: ' + analysis.design.yellowElements);

    console.log('\n=== LAYOUT ===');
    console.log('  Viewport: ' + analysis.layout.viewportWidth + 'x' + analysis.layout.viewportHeight + 'px');
    console.log('  Body height: ' + analysis.layout.bodyHeight + 'px');
    console.log('  Scrollable: ' + (analysis.layout.isScrollable ? 'Yes' : 'No'));

    // TEST LETTER SELECTION
    console.log('\n\n========================================');
    console.log('Step 4: Testing Letter Selection');
    console.log('========================================\n');

    const buttons = await page.locator('button').all();
    let clickedLetters = [];

    for (const btn of buttons) {
      if (clickedLetters.length >= 4) break;
      const text = await btn.textContent();
      const trimmed = text?.trim() || '';
      if (trimmed.length === 1 && trimmed.match(/[A-Z]/i)) {
        try {
          await btn.click();
          clickedLetters.push(trimmed);
          console.log('  ✓ Clicked letter: ' + trimmed);
          await page.waitForTimeout(500);
        } catch (e) {
          // Skip if can't click
        }
      }
    }

    await page.waitForTimeout(1500);
    await page.screenshot({ path: '/tmp/boggle_word_selected.png', fullPage: true });
    console.log('\n  Screenshot saved: /tmp/boggle_word_selected.png\n');

    // Check word display
    const wordDisplay = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'));

      // Look for cyan bg element with text (word being formed)
      const cyanWithText = allElements.find(el => {
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;
        const text = el.textContent?.trim() || '';
        return (bg === 'rgb(0, 255, 255)' || el.className.includes('bg-neo-cyan')) &&
               text.length > 0 &&
               text.length < 20 &&
               !text.includes('Swipe');
      });

      if (cyanWithText) {
        const rect = cyanWithText.getBoundingClientRect();
        const style = window.getComputedStyle(cyanWithText);
        return {
          found: true,
          word: cyanWithText.textContent.trim(),
          styling: {
            backgroundColor: style.backgroundColor,
            border: style.border,
            boxShadow: style.boxShadow,
            fontSize: style.fontSize
          },
          position: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          }
        };
      }

      return { found: false };
    });

    console.log('=== WORD FORMATION TEST ===');
    console.log('  Clicked letters: ' + clickedLetters.join(', '));
    if (wordDisplay.found) {
      console.log('  ✓ Word displayed in WordFormingArea');
      console.log('  Displayed word: "' + wordDisplay.word + '"');
      console.log('  Background: ' + wordDisplay.styling.backgroundColor + ' (should be cyan)');
      console.log('  Border: ' + wordDisplay.styling.border);
      console.log('  Shadow: ' + wordDisplay.styling.boxShadow);
      console.log('  Position: ' + wordDisplay.position.x + 'px, ' + wordDisplay.position.y + 'px');
    } else {
      console.log('  ⚠ Word not clearly displayed or still showing placeholder');
    }

    // Final screenshots
    console.log('\n\n========================================');
    console.log('Step 5: Final Screenshots');
    console.log('========================================\n');

    await page.screenshot({ path: '/tmp/boggle_final_fullpage.png', fullPage: true });
    console.log('  ✓ Full page: /tmp/boggle_final_fullpage.png');

    await page.screenshot({ path: '/tmp/boggle_final_viewport.png', fullPage: false });
    console.log('  ✓ Viewport: /tmp/boggle_final_viewport.png');

    console.log('\n========================================');
    console.log('  TEST COMPLETED SUCCESSFULLY');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    await page.screenshot({ path: '/tmp/boggle_error_final.png', fullPage: true });
    console.log('Error screenshot: /tmp/boggle_error_final.png\n');
  } finally {
    await browser.close();
  }
})();
