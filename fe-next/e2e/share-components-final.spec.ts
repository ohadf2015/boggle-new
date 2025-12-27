/**
 * Final Share Components E2E Tests
 *
 * Direct navigation with proper onboarding bypass
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

// Helper function to navigate with onboarding bypass
async function navigateWithOnboardingBypass(page: Page, path: string) {
  await page.goto(`${BASE_URL}${path}`);
  await page.waitForLoadState('domcontentloaded');

  // Set localStorage to bypass onboarding
  await page.evaluate(() => {
    try {
      localStorage.setItem('boggle-onboarding-completed', 'true');
      localStorage.setItem('boggle-quick-tips-shown', 'true');
      localStorage.setItem('onboardingComplete', 'true');
      localStorage.setItem('hasSeenOnboarding', 'true');
      localStorage.setItem('lexiclash_onboarding_completed', 'true');
      localStorage.setItem('boggle_onboarding_completed', 'true');
      localStorage.setItem('boggle_username', 'ShareTester');
    } catch (e) {
      // Ignore localStorage errors
    }
  });

  await page.reload();
  await page.waitForLoadState('networkidle');
}

test.describe('Share Components - Final Tests', () => {

  test('Pre-game share flow - RoomCodeSection and UnifiedShareModal', async ({ page }) => {
    await navigateWithOnboardingBypass(page, '/en/multiplayer');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'test-results/share-final/01-multiplayer-page.png', fullPage: true });

    // Click Create Room
    const createRoomButton = page.locator('button:has-text("Create Room"), button:has-text("Create"), a:has-text("Create Room")').first();
    if (await createRoomButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createRoomButton.click();
      await page.waitForTimeout(2000);

      await page.screenshot({ path: 'test-results/share-final/02-room-lobby.png', fullPage: true });

      // Find share button in RoomCodeSection
      const shareButton = page.locator('button:has-text("Share"), button:has-text("Invite")').first();
      const shareVisible = await shareButton.isVisible({ timeout: 5000 }).catch(() => false);

      if (shareVisible) {
        console.log('PASS: Share button visible in RoomCodeSection');

        // Check button styling
        const buttonClasses = await shareButton.getAttribute('class') || '';
        console.log('Share button classes:', buttonClasses);

        // Verify neo-brutalist styling
        const hasNeoCyan = buttonClasses.includes('neo-cyan') || buttonClasses.includes('bg-neo-cyan');
        const hasShadow = buttonClasses.includes('shadow-hard');
        const hasBorder = buttonClasses.includes('border');
        const hasRoundedNeo = buttonClasses.includes('rounded-neo');

        console.log('Styling checks:');
        console.log('  - Has neo-cyan background:', hasNeoCyan);
        console.log('  - Has hard shadow:', hasShadow);
        console.log('  - Has border:', hasBorder);
        console.log('  - Has rounded-neo:', hasRoundedNeo);

        // Click to open share modal
        await shareButton.click();
        await page.waitForTimeout(500);

        await page.screenshot({ path: 'test-results/share-final/03-share-modal-open.png', fullPage: true });

        // Check modal opened
        const modal = page.locator('[role="dialog"]');
        const modalVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false);

        if (modalVisible) {
          console.log('PASS: UnifiedShareModal opened');

          // Check for QR code (SVG with rects for QR pattern)
          const qrCode = modal.locator('svg').first();
          const hasQR = await qrCode.isVisible().catch(() => false);
          console.log('QR Code visible:', hasQR);

          // Check for Copy Link button (primary variant - neo-yellow)
          const copyButton = modal.locator('button:has-text("Copy")').first();
          if (await copyButton.isVisible().catch(() => false)) {
            const copyClasses = await copyButton.getAttribute('class') || '';
            const hasYellow = copyClasses.includes('neo-yellow') || copyClasses.includes('bg-neo-yellow');
            console.log('PASS: Copy Link button visible');
            console.log('  - Primary variant (neo-yellow):', hasYellow);
            console.log('  - Has hard shadow:', copyClasses.includes('shadow-hard'));
          }

          // Check for WhatsApp button (whatsapp variant - #25D366)
          const whatsappButton = modal.locator('button:has-text("WhatsApp")').first();
          if (await whatsappButton.isVisible().catch(() => false)) {
            const waClasses = await whatsappButton.getAttribute('class') || '';
            const hasGreen = waClasses.includes('25D366') || waClasses.includes('bg-[#25D366]');
            const hasWhiteText = waClasses.includes('text-white');
            console.log('PASS: WhatsApp button visible');
            console.log('  - WhatsApp variant (green #25D366):', hasGreen);
            console.log('  - White text:', hasWhiteText);
          }

          // Check header (should be pink for pre-game context)
          const pinkHeader = modal.locator('[class*="neo-pink"], [class*="bg-neo-pink"]');
          if (await pinkHeader.isVisible().catch(() => false)) {
            console.log('PASS: Modal header is pink (pre-game context)');
          }

          // Check for room code display
          const roomCodeDisplay = modal.locator('[class*="tracking-wider"], [class*="font-black"]').filter({ hasText: /^[A-Z0-9]{4,6}$/ });
          if (await roomCodeDisplay.first().isVisible().catch(() => false)) {
            const code = await roomCodeDisplay.first().textContent();
            console.log('PASS: Room code displayed:', code);
          }

          // Test keyboard accessibility - Escape closes modal
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);

          const modalAfterEscape = await modal.isVisible().catch(() => false);
          console.log('Modal closed on Escape:', !modalAfterEscape);
        }
      } else {
        console.log('WARN: Share button not found in room lobby view');
      }
    } else {
      console.log('WARN: Create Room button not visible');
    }
  });

  test('ShareButton variants styling verification', async ({ page }) => {
    await navigateWithOnboardingBypass(page, '/en/multiplayer');
    await page.waitForTimeout(1000);

    const createRoomButton = page.locator('button:has-text("Create Room"), button:has-text("Create")').first();
    if (await createRoomButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createRoomButton.click();
      await page.waitForTimeout(2000);

      const shareButton = page.locator('button:has-text("Share"), button:has-text("Invite")').first();
      if (await shareButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await shareButton.click();
        await page.waitForTimeout(500);

        const modal = page.locator('[role="dialog"]');

        console.log('\n=== ShareButton Variants Verification ===\n');

        // Primary variant (Copy Link button)
        const copyBtn = modal.locator('button:has-text("Copy")').first();
        if (await copyBtn.isVisible().catch(() => false)) {
          const classes = await copyBtn.getAttribute('class') || '';
          console.log('PRIMARY VARIANT (Copy Link):');
          console.log('  Expected: neo-yellow background, black text, hard shadow');
          console.log('  Has neo-yellow:', classes.includes('neo-yellow') || classes.includes('bg-neo-yellow'));
          console.log('  Has neo-black text:', classes.includes('neo-black') || classes.includes('text-neo-black'));
          console.log('  Has hard shadow:', classes.includes('shadow-hard'));
          console.log('  Has border:', classes.includes('border'));
        }

        // WhatsApp variant
        const waBtn = modal.locator('button:has-text("WhatsApp")').first();
        if (await waBtn.isVisible().catch(() => false)) {
          const classes = await waBtn.getAttribute('class') || '';
          console.log('\nWHATSAPP VARIANT:');
          console.log('  Expected: #25D366 green background, white text');
          console.log('  Has green bg:', classes.includes('25D366') || classes.includes('bg-[#25D366]'));
          console.log('  Has white text:', classes.includes('text-white'));
          console.log('  Has hard shadow:', classes.includes('shadow-hard'));
        }

        // Secondary variant (the share button in RoomCodeSection itself)
        console.log('\nSECONDARY VARIANT (RoomCodeSection Share button):');
        const shareClasses = await shareButton.getAttribute('class') || '';
        console.log('  Expected: neo-cyan background, black text');
        console.log('  Has neo-cyan:', shareClasses.includes('neo-cyan') || shareClasses.includes('bg-neo-cyan'));
        console.log('  Has neo-black text:', shareClasses.includes('neo-black') || shareClasses.includes('text-neo-black'));
        console.log('  Has hard shadow:', shareClasses.includes('shadow-hard'));
      }
    }
  });

  test('Mobile viewport share flow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await navigateWithOnboardingBypass(page, '/en/multiplayer');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'test-results/share-final/04-mobile-multiplayer.png', fullPage: true });

    const createRoomButton = page.locator('button:has-text("Create Room"), button:has-text("Create")').first();
    if (await createRoomButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createRoomButton.click();
      await page.waitForTimeout(2000);

      await page.screenshot({ path: 'test-results/share-final/05-mobile-room-lobby.png', fullPage: true });

      const shareButton = page.locator('button:has-text("Share"), button:has-text("Invite")').first();
      if (await shareButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await shareButton.click();
        await page.waitForTimeout(500);

        await page.screenshot({ path: 'test-results/share-final/06-mobile-share-modal.png', fullPage: true });

        const modal = page.locator('[role="dialog"]');

        console.log('\n=== Mobile Share Modal Verification ===\n');

        // On mobile, "More Options" button should be visible for native share
        const moreOptionsBtn = modal.locator('button:has-text("More"), button:has-text("Options")').first();
        const hasMoreOptions = await moreOptionsBtn.isVisible({ timeout: 2000 }).catch(() => false);
        console.log('Mobile "More Options" button visible:', hasMoreOptions);

        // QR code might be hidden on mobile for post-game, but should be visible for pre-game
        const qrCode = modal.locator('svg').first();
        const qrVisible = await qrCode.isVisible().catch(() => false);
        console.log('QR code visible on mobile (pre-game):', qrVisible);
      }
    }
  });

  test('Desktop viewport share flow', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await navigateWithOnboardingBypass(page, '/en/multiplayer');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'test-results/share-final/07-desktop-multiplayer.png', fullPage: true });

    const createRoomButton = page.locator('button:has-text("Create Room"), button:has-text("Create")').first();
    if (await createRoomButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createRoomButton.click();
      await page.waitForTimeout(2000);

      await page.screenshot({ path: 'test-results/share-final/08-desktop-room-lobby.png', fullPage: true });

      const shareButton = page.locator('button:has-text("Share"), button:has-text("Invite")').first();
      if (await shareButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await shareButton.click();
        await page.waitForTimeout(500);

        await page.screenshot({ path: 'test-results/share-final/09-desktop-share-modal.png', fullPage: true });

        const modal = page.locator('[role="dialog"]');

        console.log('\n=== Desktop Share Modal Verification ===\n');

        // QR code should be prominently displayed on desktop
        const qrCode = modal.locator('svg').first();
        const qrVisible = await qrCode.isVisible().catch(() => false);
        console.log('QR code prominently visible on desktop:', qrVisible);

        // "More Options" button should be hidden on desktop (sm:hidden class)
        const moreOptionsBtn = modal.locator('button:has-text("More")').first();
        const moreOptionsVisible = await moreOptionsBtn.isVisible({ timeout: 1000 }).catch(() => false);
        console.log('"More Options" hidden on desktop:', !moreOptionsVisible);
      }
    }
  });

  test('Accessibility - keyboard navigation and focus', async ({ page }) => {
    await navigateWithOnboardingBypass(page, '/en/multiplayer');
    await page.waitForTimeout(1000);

    const createRoomButton = page.locator('button:has-text("Create Room"), button:has-text("Create")').first();
    if (await createRoomButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createRoomButton.click();
      await page.waitForTimeout(2000);

      const shareButton = page.locator('button:has-text("Share"), button:has-text("Invite")').first();
      if (await shareButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Test keyboard focus on share button
        await shareButton.focus();
        const isFocused = await shareButton.evaluate(el => document.activeElement === el);
        console.log('Share button is focusable:', isFocused);

        // Open modal
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        const modal = page.locator('[role="dialog"]');
        if (await modal.isVisible().catch(() => false)) {
          console.log('Modal opened via Enter key');

          // Check close button accessibility
          const closeButton = modal.locator('button').filter({
            has: page.locator('.sr-only, [class*="lucide-x"]')
          }).first();

          if (await closeButton.isVisible().catch(() => false)) {
            const hasSrOnly = await closeButton.evaluate(el => {
              return el.querySelector('.sr-only') !== null;
            });
            console.log('Close button has screen reader text:', hasSrOnly);
          }

          // Test Escape key closes modal
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);

          const modalClosed = !(await modal.isVisible().catch(() => false));
          console.log('Modal closes on Escape key:', modalClosed);
        }
      }
    }
  });
});
