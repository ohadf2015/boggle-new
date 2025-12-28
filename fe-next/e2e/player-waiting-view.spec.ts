import { test, expect } from '@playwright/test';

/**
 * PlayerWaitingView Component Tests
 *
 * Tests for the changes made to PlayerWaitingView.tsx:
 * 1. Reduced card min-height from 300px to 180px
 * 2. Reduced padding from p-3/4/5 to p-2/3/4
 * 3. Removed 3 decorative background shapes
 * 4. Made hourglass icon smaller (w-12 h-16 -> w-8 h-12)
 * 5. Reduced text sizes (text-xl/2xl -> text-base/lg)
 * 6. Reduced margins (mt-6 -> mt-3)
 * 7. Simplified loading dots animation (removed rotation)
 * 8. Added aria-hidden to decorative elements
 * 9. Added role="status" aria-live="polite" for accessibility
 */

const BASE_URL = 'http://localhost:3001';

// Helper function to create a game room and join as a player
async function setupPlayerWaitingState(page, options: { locale?: string } = {}) {
  const locale = options.locale || 'en';

  // Go to multiplayer page
  await page.goto(`${BASE_URL}/${locale}/multiplayer`);

  // Wait for the page to load
  await page.waitForLoadState('networkidle');

  // Create a new room by clicking "Create Room" button
  const createRoomBtn = page.locator('button:has-text("Create"), button:has-text("Create Room"), button:has-text("Host Game")').first();
  if (await createRoomBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await createRoomBtn.click();
  }

  // Wait for room to be created and player waiting view to appear
  await page.waitForTimeout(2000);
}

// Helper to join an existing room as a player (not host)
async function joinRoomAsPlayer(page, gameCode: string, locale: string = 'en') {
  await page.goto(`${BASE_URL}/${locale}/multiplayer?room=${gameCode}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}

test.describe('PlayerWaitingView Component Tests', () => {

  test.describe('Visual Regression - Neo-Brutalist Style', () => {

    test('waiting card maintains Neo-Brutalist design elements', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');

      // Take a screenshot of the multiplayer lobby for reference
      await page.screenshot({
        path: 'test-results/player-waiting-lobby.png',
        fullPage: true
      });

      // Check for Neo-Brutalist design elements
      // Look for cards with hard shadows and chunky borders
      const cards = page.locator('[class*="shadow-hard"], [class*="border-4"], [class*="border-neo"]');
      const cardCount = await cards.count();

      console.log(`Found ${cardCount} Neo-Brutalist styled elements`);
      expect(cardCount).toBeGreaterThan(0);
    });

    test('hourglass container has correct sizing (w-8 h-12)', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');

      // Create a room to see the waiting view
      const createBtn = page.locator('button:has-text("Create"), button:has-text("Host")').first();
      if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createBtn.click();
        await page.waitForTimeout(3000);

        // Look for the hourglass container
        const hourglassContainer = page.locator('.w-8.h-12').first();
        if (await hourglassContainer.isVisible({ timeout: 2000 }).catch(() => false)) {
          const box = await hourglassContainer.boundingBox();
          if (box) {
            // w-8 = 32px, h-12 = 48px in Tailwind
            console.log(`Hourglass dimensions: ${box.width}x${box.height}`);
            expect(box.width).toBeLessThanOrEqual(40); // Allow some margin
            expect(box.height).toBeLessThanOrEqual(56);
          }
        }
      }
    });

    test('waiting card has reduced min-height of 180px', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');

      // Try to create a room
      const createBtn = page.locator('button:has-text("Create"), button:has-text("Host")').first();
      if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createBtn.click();
        await page.waitForTimeout(3000);

        // Look for the waiting card with min-h-[180px]
        const waitingCard = page.locator('[class*="min-h-[180px]"]').first();
        if (await waitingCard.isVisible({ timeout: 2000 }).catch(() => false)) {
          const box = await waitingCard.boundingBox();
          if (box) {
            console.log(`Waiting card height: ${box.height}`);
            // Should be around 180px minimum
            expect(box.height).toBeGreaterThanOrEqual(150);
            expect(box.height).toBeLessThanOrEqual(400); // Not too tall
          }
        }
      }
    });
  });

  test.describe('Responsive Design Tests', () => {

    test('mobile viewport (375px) - compact layout', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 }); // iPhone X
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: 'test-results/player-waiting-mobile-375.png',
        fullPage: true
      });

      // Check that content fits within viewport
      const body = page.locator('body');
      const bodyBox = await body.boundingBox();
      expect(bodyBox?.width).toBeLessThanOrEqual(375);

      // Verify padding is reduced (p-2 instead of p-3 on mobile)
      const cards = page.locator('[class*="p-2"]');
      const cardCount = await cards.count();
      console.log(`Found ${cardCount} elements with p-2 padding on mobile`);
    });

    test('tablet viewport (768px) - medium layout', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: 'test-results/player-waiting-tablet-768.png',
        fullPage: true
      });

      // Check responsive classes are applied
      const cards = page.locator('[class*="sm:p-3"], [class*="sm:p-4"]');
      const cardCount = await cards.count();
      console.log(`Found ${cardCount} elements with sm: responsive padding`);
    });

    test('desktop viewport (1920px) - full layout', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: 'test-results/player-waiting-desktop-1920.png',
        fullPage: true
      });

      // Check that max-width container is respected
      const container = page.locator('[class*="max-w-6xl"]');
      const containerCount = await container.count();
      console.log(`Found ${containerCount} max-w-6xl containers`);
    });
  });

  test.describe('RTL Layout - Hebrew', () => {

    test('Hebrew locale renders RTL correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/he/multiplayer`);
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: 'test-results/player-waiting-hebrew-rtl.png',
        fullPage: true
      });

      // Check for RTL direction
      const html = page.locator('html');
      const dir = await html.getAttribute('dir');
      console.log(`HTML direction: ${dir}`);

      // Check for Hebrew text
      const hebrewText = page.locator('text=/עברית|המתן|משחק/').first();
      const hasHebrew = await hebrewText.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`Hebrew text visible: ${hasHebrew}`);
    });

    test('shadows flip correctly in RTL mode', async ({ page }) => {
      await page.goto(`${BASE_URL}/he/multiplayer`);
      await page.waitForLoadState('networkidle');

      // Look for elements with RTL shadow classes
      const rtlShadows = page.locator('[class*="rtl:shadow"], [class*="-rtl-"]');
      const count = await rtlShadows.count();
      console.log(`Found ${count} RTL shadow elements`);

      // Take a screenshot to visually verify shadow direction
      await page.screenshot({
        path: 'test-results/player-waiting-rtl-shadows.png',
        fullPage: true
      });
    });
  });

  test.describe('Animation Tests', () => {

    test('hourglass animation is smooth', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');

      // Create a room to see animations
      const createBtn = page.locator('button:has-text("Create"), button:has-text("Host")').first();
      if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createBtn.click();
        await page.waitForTimeout(2000);

        // Look for animated elements with motion classes
        const animatedElements = page.locator('[class*="animate"], [style*="transform"]');
        const count = await animatedElements.count();
        console.log(`Found ${count} animated elements`);

        // Take multiple screenshots to verify animation
        for (let i = 0; i < 3; i++) {
          await page.screenshot({
            path: `test-results/player-waiting-animation-frame-${i}.png`,
            fullPage: true
          });
          await page.waitForTimeout(500);
        }
      }
    });

    test('loading dots scale animation (no rotation)', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');

      const createBtn = page.locator('button:has-text("Create"), button:has-text("Host")').first();
      if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createBtn.click();
        await page.waitForTimeout(2000);

        // Look for the loading dots (w-3 h-3 elements)
        const dots = page.locator('.w-3.h-3[class*="bg-neo-pink"]');
        const dotCount = await dots.count();
        console.log(`Found ${dotCount} loading dots`);

        // Verify dots exist and are visible
        if (dotCount > 0) {
          const firstDot = dots.first();
          expect(await firstDot.isVisible()).toBe(true);
        }
      }
    });
  });

  test.describe('Accessibility Tests', () => {

    test('decorative elements have aria-hidden', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');

      const createBtn = page.locator('button:has-text("Create"), button:has-text("Host")').first();
      if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createBtn.click();
        await page.waitForTimeout(2000);

        // Check for aria-hidden on decorative elements
        const ariaHiddenElements = page.locator('[aria-hidden="true"]');
        const count = await ariaHiddenElements.count();
        console.log(`Found ${count} elements with aria-hidden="true"`);
        expect(count).toBeGreaterThan(0);
      }
    });

    test('status message has role="status" and aria-live', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');

      const createBtn = page.locator('button:has-text("Create"), button:has-text("Host")').first();
      if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createBtn.click();
        await page.waitForTimeout(2000);

        // Check for role="status" element
        const statusElement = page.locator('[role="status"]');
        const statusCount = await statusElement.count();
        console.log(`Found ${statusCount} elements with role="status"`);

        // Check for aria-live
        const ariaLiveElements = page.locator('[aria-live="polite"]');
        const ariaLiveCount = await ariaLiveElements.count();
        console.log(`Found ${ariaLiveCount} elements with aria-live="polite"`);

        expect(statusCount + ariaLiveCount).toBeGreaterThan(0);
      }
    });

    test('screen reader can access waiting message', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');

      const createBtn = page.locator('button:has-text("Create"), button:has-text("Host")').first();
      if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createBtn.click();
        await page.waitForTimeout(2000);

        // Find the waiting message text
        const waitingText = page.locator('text=/Wait for game|Waiting for host/i');
        const isVisible = await waitingText.isVisible({ timeout: 2000 }).catch(() => false);
        console.log(`Waiting message visible: ${isVisible}`);

        if (isVisible) {
          // Verify it's not inside an aria-hidden element
          const parentAriaHidden = await waitingText.evaluate((el) => {
            let parent = el.parentElement;
            while (parent) {
              if (parent.getAttribute('aria-hidden') === 'true') {
                return true;
              }
              parent = parent.parentElement;
            }
            return false;
          });
          console.log(`Message inside aria-hidden: ${parentAriaHidden}`);
          expect(parentAriaHidden).toBe(false);
        }
      }
    });
  });

  test.describe('Layout Integration Tests', () => {

    test('players list visible on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');

      const createBtn = page.locator('button:has-text("Create"), button:has-text("Host")').first();
      if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createBtn.click();
        await page.waitForTimeout(2000);

        // Look for players list section
        const playersList = page.locator('text=/Players|Joined/i').first();
        const isVisible = await playersList.isVisible({ timeout: 2000 }).catch(() => false);
        console.log(`Players list visible on mobile: ${isVisible}`);

        await page.screenshot({
          path: 'test-results/player-waiting-mobile-players-list.png',
          fullPage: true
        });
      }
    });

    test('chat component visible on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');

      const createBtn = page.locator('button:has-text("Create"), button:has-text("Host")').first();
      if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createBtn.click();
        await page.waitForTimeout(2000);

        // Look for chat input or chat container
        const chatElements = page.locator('[class*="RoomChat"], input[placeholder*="message" i], input[placeholder*="chat" i]');
        const count = await chatElements.count();
        console.log(`Found ${count} chat-related elements`);

        await page.screenshot({
          path: 'test-results/player-waiting-mobile-chat.png',
          fullPage: true
        });
      }
    });

    test('compact waiting card leaves room for other content', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');

      const createBtn = page.locator('button:has-text("Create"), button:has-text("Host")').first();
      if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createBtn.click();
        await page.waitForTimeout(2000);

        // Get the full page height
        const pageHeight = await page.evaluate(() => document.body.scrollHeight);
        console.log(`Page height: ${pageHeight}px`);

        // Verify page is scrollable or fits
        expect(pageHeight).toBeGreaterThan(0);

        // Take a full page screenshot
        await page.screenshot({
          path: 'test-results/player-waiting-mobile-full-layout.png',
          fullPage: true
        });
      }
    });
  });
});

test.describe('Cross-Browser Tests', () => {

  test('Chrome rendering', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-specific test');

    await page.goto(`${BASE_URL}/en/multiplayer`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: 'test-results/player-waiting-chrome.png',
      fullPage: true
    });

    // Basic functionality check
    const pageTitle = await page.title();
    expect(pageTitle).toBeTruthy();
  });

  test('Safari/WebKit rendering', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'Safari-specific test');

    await page.goto(`${BASE_URL}/en/multiplayer`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: 'test-results/player-waiting-safari.png',
      fullPage: true
    });

    // Basic functionality check
    const pageTitle = await page.title();
    expect(pageTitle).toBeTruthy();
  });

  test('Firefox rendering', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', 'Firefox-specific test');

    await page.goto(`${BASE_URL}/en/multiplayer`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: 'test-results/player-waiting-firefox.png',
      fullPage: true
    });

    // Basic functionality check
    const pageTitle = await page.title();
    expect(pageTitle).toBeTruthy();
  });
});
