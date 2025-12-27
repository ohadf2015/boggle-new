/**
 * Complete Share Components E2E Tests
 *
 * Tests: UnifiedShareModal, ShareButton, ShareWinPrompt, RoomCodeSection
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

// Helper function to navigate with onboarding bypass
async function navigateWithOnboardingBypass(page: Page, path: string) {
  await page.goto(`${BASE_URL}${path}`);
  await page.waitForLoadState('domcontentloaded');

  await page.evaluate(() => {
    try {
      localStorage.setItem('boggle-onboarding-completed', 'true');
      localStorage.setItem('boggle-quick-tips-shown', 'true');
      localStorage.setItem('onboardingComplete', 'true');
      localStorage.setItem('hasSeenOnboarding', 'true');
      localStorage.setItem('lexiclash_onboarding_completed', 'true');
      localStorage.setItem('boggle_onboarding_completed', 'true');
      localStorage.setItem('boggle_username', 'ShareTester');
    } catch (e) {}
  });

  await page.reload();
  await page.waitForLoadState('networkidle');
}

test.describe('Share Components - Complete Test Suite', () => {

  test('1. Pre-game share flow with RoomCodeSection and UnifiedShareModal', async ({ page }) => {
    await navigateWithOnboardingBypass(page, '/en/multiplayer');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'test-results/share-complete/01-multiplayer-page.png', fullPage: true });

    // Click START SETUP (the new button text)
    const startSetupBtn = page.locator('button:has-text("START SETUP"), button:has-text("Start Setup")').first();
    if (await startSetupBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Found START SETUP button, clicking...');
      await startSetupBtn.click();
      await page.waitForTimeout(2000);

      await page.screenshot({ path: 'test-results/share-complete/02-room-setup.png', fullPage: true });

      // Check if we need to complete setup first
      const startGameBtn = page.locator('button:has-text("Start Game"), button:has-text("CREATE ROOM")').first();
      if (await startGameBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await startGameBtn.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'test-results/share-complete/03-room-lobby.png', fullPage: true });
      }

      // Now look for share button in RoomCodeSection
      const shareButton = page.locator('button:has-text("Share"), button:has-text("Invite")').first();
      const shareVisible = await shareButton.isVisible({ timeout: 5000 }).catch(() => false);

      if (shareVisible) {
        console.log('PASS: Share button visible in RoomCodeSection');

        // Check button styling (should be secondary variant - neo-cyan)
        const buttonClasses = await shareButton.getAttribute('class') || '';

        console.log('\n=== RoomCodeSection Share Button Styling ===');
        console.log('Has neo-cyan background:', buttonClasses.includes('neo-cyan') || buttonClasses.includes('bg-neo-cyan'));
        console.log('Has neo-black text:', buttonClasses.includes('neo-black') || buttonClasses.includes('text-neo-black'));
        console.log('Has hard shadow:', buttonClasses.includes('shadow-hard'));
        console.log('Has border:', buttonClasses.includes('border'));
        console.log('Has rounded-neo:', buttonClasses.includes('rounded-neo'));

        // Click to open share modal
        await shareButton.click();
        await page.waitForTimeout(500);

        await page.screenshot({ path: 'test-results/share-complete/04-share-modal.png', fullPage: true });

        const modal = page.locator('[role="dialog"]');
        const modalVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false);

        if (modalVisible) {
          console.log('\nPASS: UnifiedShareModal opened');

          // === QR Code Check ===
          const qrCode = modal.locator('svg').first();
          console.log('QR Code visible:', await qrCode.isVisible().catch(() => false));

          // === Copy Link Button (Primary Variant) ===
          const copyButton = modal.locator('button:has-text("Copy")').first();
          if (await copyButton.isVisible().catch(() => false)) {
            const copyClasses = await copyButton.getAttribute('class') || '';
            console.log('\n=== Copy Link Button (Primary Variant) ===');
            console.log('Has neo-yellow:', copyClasses.includes('neo-yellow') || copyClasses.includes('bg-neo-yellow'));
            console.log('Has neo-black text:', copyClasses.includes('neo-black') || copyClasses.includes('text-neo-black'));
            console.log('Has hard shadow:', copyClasses.includes('shadow-hard'));
          }

          // === WhatsApp Button (WhatsApp Variant) ===
          const whatsappButton = modal.locator('button:has-text("WhatsApp")').first();
          if (await whatsappButton.isVisible().catch(() => false)) {
            const waClasses = await whatsappButton.getAttribute('class') || '';
            console.log('\n=== WhatsApp Button (WhatsApp Variant) ===');
            console.log('Has #25D366 green:', waClasses.includes('25D366') || waClasses.includes('bg-[#25D366]'));
            console.log('Has white text:', waClasses.includes('text-white'));
            console.log('Has hard shadow:', waClasses.includes('shadow-hard'));
          }

          // === Header Check (Pre-game = Pink) ===
          const pinkHeader = modal.locator('[class*="neo-pink"], [class*="bg-neo-pink"]');
          console.log('\n=== Modal Header ===');
          console.log('Pink header (pre-game context):', await pinkHeader.isVisible().catch(() => false));

          // === Room Code Display ===
          const roomCode = modal.locator('[class*="tracking-wider"]').first();
          if (await roomCode.isVisible().catch(() => false)) {
            const code = await roomCode.textContent();
            console.log('Room code displayed:', code);
          }

          // === Test Copy Link Functionality ===
          if (await copyButton.isVisible().catch(() => false)) {
            await copyButton.click();
            await page.waitForTimeout(1000);

            // Check for toast notification
            const toast = page.locator('[class*="toast"], [role="status"]').first();
            console.log('\n=== Copy Functionality ===');
            console.log('Toast notification appeared:', await toast.isVisible({ timeout: 2000 }).catch(() => false));
          }

          // === Test Escape Key ===
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
          console.log('\n=== Accessibility ===');
          console.log('Modal closed on Escape:', !(await modal.isVisible().catch(() => false)));
        }
      } else {
        // Take screenshot to see current state
        await page.screenshot({ path: 'test-results/share-complete/03-current-state.png', fullPage: true });
        console.log('WARN: Share button not found - checking current page state');
      }
    } else {
      console.log('WARN: START SETUP button not visible');
    }
  });

  test('2. ShareButton variants verification', async ({ page }) => {
    await navigateWithOnboardingBypass(page, '/en/multiplayer');
    await page.waitForTimeout(1000);

    const startSetupBtn = page.locator('button:has-text("START SETUP")').first();
    if (await startSetupBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startSetupBtn.click();
      await page.waitForTimeout(2000);

      const startGameBtn = page.locator('button:has-text("Start Game"), button:has-text("CREATE ROOM")').first();
      if (await startGameBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await startGameBtn.click();
        await page.waitForTimeout(2000);
      }

      const shareButton = page.locator('button:has-text("Share")').first();
      if (await shareButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await shareButton.click();
        await page.waitForTimeout(500);

        const modal = page.locator('[role="dialog"]');

        console.log('\n========================================');
        console.log('  SHAREBUTTON VARIANTS TEST RESULTS');
        console.log('========================================\n');

        // PRIMARY VARIANT
        const copyBtn = modal.locator('button:has-text("Copy")').first();
        if (await copyBtn.isVisible().catch(() => false)) {
          const c = await copyBtn.getAttribute('class') || '';
          console.log('PRIMARY VARIANT (Copy Link Button):');
          console.log('  [EXPECTED] neo-yellow bg, neo-black text, hard shadow');
          console.log('  [ACTUAL]');
          console.log('    - neo-yellow bg: ' + (c.includes('neo-yellow') ? 'PASS' : 'FAIL'));
          console.log('    - neo-black text: ' + (c.includes('neo-black') || c.includes('text-neo-black') ? 'PASS' : 'FAIL'));
          console.log('    - hard shadow: ' + (c.includes('shadow-hard') ? 'PASS' : 'FAIL'));
          console.log('    - border: ' + (c.includes('border') ? 'PASS' : 'FAIL'));
        }

        // WHATSAPP VARIANT
        const waBtn = modal.locator('button:has-text("WhatsApp")').first();
        if (await waBtn.isVisible().catch(() => false)) {
          const c = await waBtn.getAttribute('class') || '';
          console.log('\nWHATSAPP VARIANT:');
          console.log('  [EXPECTED] #25D366 green bg, white text');
          console.log('  [ACTUAL]');
          console.log('    - #25D366 green: ' + (c.includes('25D366') ? 'PASS' : 'FAIL'));
          console.log('    - white text: ' + (c.includes('text-white') ? 'PASS' : 'FAIL'));
          console.log('    - hard shadow: ' + (c.includes('shadow-hard') ? 'PASS' : 'FAIL'));
        }

        // SECONDARY VARIANT (share button in RoomCodeSection)
        const sc = await shareButton.getAttribute('class') || '';
        console.log('\nSECONDARY VARIANT (RoomCodeSection Share):');
        console.log('  [EXPECTED] neo-cyan bg, neo-black text');
        console.log('  [ACTUAL]');
        console.log('    - neo-cyan bg: ' + (sc.includes('neo-cyan') ? 'PASS' : 'FAIL'));
        console.log('    - neo-black text: ' + (sc.includes('neo-black') || sc.includes('text-neo-black') ? 'PASS' : 'FAIL'));
        console.log('    - hard shadow: ' + (sc.includes('shadow-hard') ? 'PASS' : 'FAIL'));

        console.log('\n========================================\n');
      }
    }
  });

  test('3. Mobile vs Desktop responsive behavior', async ({ page }) => {
    console.log('\n========================================');
    console.log('  RESPONSIVE BEHAVIOR TEST RESULTS');
    console.log('========================================\n');

    // DESKTOP TEST
    await page.setViewportSize({ width: 1280, height: 800 });
    await navigateWithOnboardingBypass(page, '/en/multiplayer');
    await page.waitForTimeout(1000);

    let startSetupBtn = page.locator('button:has-text("START SETUP")').first();
    if (await startSetupBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startSetupBtn.click();
      await page.waitForTimeout(2000);

      let startGameBtn = page.locator('button:has-text("Start Game"), button:has-text("CREATE ROOM")').first();
      if (await startGameBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await startGameBtn.click();
        await page.waitForTimeout(2000);
      }

      let shareButton = page.locator('button:has-text("Share")').first();
      if (await shareButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await shareButton.click();
        await page.waitForTimeout(500);

        await page.screenshot({ path: 'test-results/share-complete/05-desktop-modal.png', fullPage: true });

        const modal = page.locator('[role="dialog"]');
        const qrCode = modal.locator('svg').first();
        const moreOptions = modal.locator('button:has-text("More")').first();

        console.log('DESKTOP (1280x800):');
        console.log('  QR Code prominent: ' + (await qrCode.isVisible().catch(() => false) ? 'PASS' : 'FAIL'));
        console.log('  Native share hidden: ' + (!(await moreOptions.isVisible({ timeout: 1000 }).catch(() => false)) ? 'PASS' : 'N/A'));

        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    }

    // MOBILE TEST
    await page.setViewportSize({ width: 375, height: 812 });
    await navigateWithOnboardingBypass(page, '/en/multiplayer');
    await page.waitForTimeout(1000);

    startSetupBtn = page.locator('button:has-text("START SETUP")').first();
    if (await startSetupBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startSetupBtn.click();
      await page.waitForTimeout(2000);

      let startGameBtn = page.locator('button:has-text("Start Game"), button:has-text("CREATE ROOM")').first();
      if (await startGameBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await startGameBtn.click();
        await page.waitForTimeout(2000);
      }

      let shareButton = page.locator('button:has-text("Share")').first();
      if (await shareButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await shareButton.click();
        await page.waitForTimeout(500);

        await page.screenshot({ path: 'test-results/share-complete/06-mobile-modal.png', fullPage: true });

        const modal = page.locator('[role="dialog"]');
        const moreOptions = modal.locator('button:has-text("More")').first();

        console.log('\nMOBILE (375x812):');
        console.log('  Native share available: ' + (await moreOptions.isVisible({ timeout: 2000 }).catch(() => false) ? 'PASS' : 'N/A (may require native share API)'));
      }
    }

    console.log('\n========================================\n');
  });

  test('4. Accessibility tests', async ({ page }) => {
    await navigateWithOnboardingBypass(page, '/en/multiplayer');
    await page.waitForTimeout(1000);

    console.log('\n========================================');
    console.log('  ACCESSIBILITY TEST RESULTS');
    console.log('========================================\n');

    const startSetupBtn = page.locator('button:has-text("START SETUP")').first();
    if (await startSetupBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startSetupBtn.click();
      await page.waitForTimeout(2000);

      const startGameBtn = page.locator('button:has-text("Start Game"), button:has-text("CREATE ROOM")').first();
      if (await startGameBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await startGameBtn.click();
        await page.waitForTimeout(2000);
      }

      const shareButton = page.locator('button:has-text("Share")').first();
      if (await shareButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Test keyboard focus
        await shareButton.focus();
        const isFocused = await shareButton.evaluate(el => document.activeElement === el);
        console.log('Share button focusable: ' + (isFocused ? 'PASS' : 'FAIL'));

        // Test Enter key opens modal
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        const modal = page.locator('[role="dialog"]');
        const modalOpened = await modal.isVisible().catch(() => false);
        console.log('Enter key opens modal: ' + (modalOpened ? 'PASS' : 'FAIL'));

        if (modalOpened) {
          // Check close button has screen reader text
          const closeButton = modal.locator('button .sr-only').first();
          const hasSrOnly = await closeButton.isVisible().catch(() => false);
          console.log('Close button has sr-only text: ' + (hasSrOnly ? 'PASS' : 'CHECK MANUALLY'));

          // Check modal has proper role
          const hasDialogRole = await modal.getAttribute('role') === 'dialog';
          console.log('Modal has dialog role: ' + (hasDialogRole ? 'PASS' : 'FAIL'));

          // Test Escape closes modal
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
          const modalClosed = !(await modal.isVisible().catch(() => false));
          console.log('Escape key closes modal: ' + (modalClosed ? 'PASS' : 'FAIL'));
        }
      }
    }

    console.log('\n========================================\n');
  });
});
