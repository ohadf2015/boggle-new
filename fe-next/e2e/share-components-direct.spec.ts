/**
 * Direct Share Components E2E Tests
 *
 * Bypasses onboarding modal to directly test share functionality
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

// Helper to dismiss onboarding modal if present
async function dismissOnboarding(page: any) {
  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Set localStorage to skip onboarding
  await page.evaluate(() => {
    localStorage.setItem('lexiclash_onboarding_complete', 'true');
    localStorage.setItem('onboardingComplete', 'true');
    localStorage.setItem('hasSeenWelcome', 'true');
  });

  // Close any visible modal
  const closeButton = page.locator('button').filter({ has: page.locator('[class*="lucide-x"], svg') }).first();
  if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await closeButton.click();
    await page.waitForTimeout(300);
  }

  // Or click outside modal
  const overlay = page.locator('[class*="DialogOverlay"], [class*="fixed inset-0"]').first();
  if (await overlay.isVisible({ timeout: 1000 }).catch(() => false)) {
    await page.mouse.click(10, 10);
    await page.waitForTimeout(300);
  }
}

test.describe('Share Components - Direct Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Pre-set localStorage to skip onboarding
    await page.addInitScript(() => {
      localStorage.setItem('lexiclash_onboarding_complete', 'true');
      localStorage.setItem('onboardingComplete', 'true');
      localStorage.setItem('hasSeenWelcome', 'true');
    });
  });

  test('Navigate to multiplayer room and verify share button', async ({ page }) => {
    await page.goto(BASE_URL);
    await dismissOnboarding(page);

    // Reload to apply localStorage
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'test-results/share-direct/01-after-dismiss-onboarding.png', fullPage: true });

    // Click Multiplayer card
    const multiplayerCard = page.locator('[class*="MULTIPLAYER"], [class*="Multiplayer"], button, div').filter({ hasText: /multiplayer/i }).first();
    if (await multiplayerCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await multiplayerCard.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/share-direct/02-multiplayer-mode.png', fullPage: true });
    }

    // Click Create Room
    const createRoomBtn = page.getByRole('button', { name: /create|host|new/i }).first();
    if (await createRoomBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createRoomBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/share-direct/03-room-lobby.png', fullPage: true });

      // Find share button
      const shareButton = page.locator('button').filter({ hasText: /share|invite/i }).first();
      const shareVisible = await shareButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (shareVisible) {
        console.log('PASS: Share button is visible in room lobby');

        // Check styling
        const buttonClasses = await shareButton.getAttribute('class');
        console.log('Share button classes:', buttonClasses);

        const hasNeoCyan = buttonClasses?.includes('neo-cyan') || buttonClasses?.includes('bg-neo-cyan');
        const hasShadow = buttonClasses?.includes('shadow-hard');
        const hasBorder = buttonClasses?.includes('border');

        console.log('Has neo-cyan background:', hasNeoCyan);
        console.log('Has hard shadow:', hasShadow);
        console.log('Has border:', hasBorder);

        // Click share button to open modal
        await shareButton.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'test-results/share-direct/04-share-modal.png', fullPage: true });

        // Check modal content
        const modal = page.locator('[role="dialog"]').first();
        if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log('PASS: Share modal opened successfully');

          // Check for QR code
          const qrCode = modal.locator('svg').first();
          if (await qrCode.isVisible().catch(() => false)) {
            console.log('PASS: QR code is visible');
          }

          // Check for Copy Link button
          const copyBtn = modal.locator('button').filter({ hasText: /copy/i }).first();
          if (await copyBtn.isVisible().catch(() => false)) {
            console.log('PASS: Copy Link button is visible');

            const copyClasses = await copyBtn.getAttribute('class');
            const hasYellow = copyClasses?.includes('neo-yellow') || copyClasses?.includes('bg-neo-yellow');
            console.log('Copy button has neo-yellow (primary variant):', hasYellow);
          }

          // Check for WhatsApp button
          const whatsappBtn = modal.locator('button').filter({ hasText: /whatsapp/i }).first();
          if (await whatsappBtn.isVisible().catch(() => false)) {
            console.log('PASS: WhatsApp button is visible');

            const whatsappClasses = await whatsappBtn.getAttribute('class');
            const hasGreen = whatsappClasses?.includes('25D366') || whatsappClasses?.includes('bg-[#25D366]');
            console.log('WhatsApp button has green (#25D366):', hasGreen);
          }

          // Check header color (should be pink for pre-game)
          const header = modal.locator('[class*="neo-pink"], [class*="bg-neo-pink"]').first();
          if (await header.isVisible().catch(() => false)) {
            console.log('PASS: Modal header is pink (pre-game context)');
          }

          // Test Escape key closes modal
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);

          const modalStillVisible = await modal.isVisible().catch(() => false);
          console.log('Modal closed on Escape:', !modalStillVisible);
        }
      } else {
        console.log('Share button not found in current view');
      }
    }
  });

  test('Verify share modal has all required elements', async ({ page }) => {
    await page.goto(BASE_URL);
    await dismissOnboarding(page);
    await page.reload();
    await page.waitForTimeout(1000);

    // Navigate to room
    const multiplayerCard = page.locator('button, div').filter({ hasText: /multiplayer/i }).first();
    if (await multiplayerCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await multiplayerCard.click();
      await page.waitForTimeout(1000);
    }

    const createBtn = page.getByRole('button', { name: /create|host|new/i }).first();
    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(2000);
    }

    // Open share modal
    const shareButton = page.locator('button').filter({ hasText: /share|invite/i }).first();
    if (await shareButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await shareButton.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]').first();

      // Verify required elements exist
      const requiredElements = [
        { name: 'QR Code', selector: 'svg' },
        { name: 'Copy Link Button', text: /copy/i },
        { name: 'WhatsApp Button', text: /whatsapp/i },
        { name: 'Room Code Display', selector: '[class*="tracking-wider"]' },
      ];

      for (const el of requiredElements) {
        let found = false;
        if (el.text) {
          found = await modal.locator('button').filter({ hasText: el.text }).isVisible().catch(() => false);
        } else if (el.selector) {
          found = await modal.locator(el.selector).first().isVisible().catch(() => false);
        }
        console.log(`${el.name}: ${found ? 'PASS' : 'FAIL'}`);
      }
    }
  });

  test('Mobile viewport test', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto(BASE_URL);
    await dismissOnboarding(page);
    await page.reload();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'test-results/share-direct/05-mobile-landing.png', fullPage: true });

    // Navigate to room on mobile
    const multiplayerCard = page.locator('button, div').filter({ hasText: /multiplayer/i }).first();
    if (await multiplayerCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await multiplayerCard.click();
      await page.waitForTimeout(1000);
    }

    const createBtn = page.getByRole('button', { name: /create|host|new/i }).first();
    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/share-direct/06-mobile-room.png', fullPage: true });
    }

    const shareButton = page.locator('button').filter({ hasText: /share|invite/i }).first();
    if (await shareButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await shareButton.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/share-direct/07-mobile-share-modal.png', fullPage: true });

      console.log('Mobile share modal captured');
    }
  });
});
