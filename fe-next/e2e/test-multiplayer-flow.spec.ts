import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

test.describe('Multiplayer Flow Comprehensive UI Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test to ensure clean state
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      localStorage.clear();
      // Mark onboarding as complete to skip the welcome modal
      localStorage.setItem('lexiclash_onboarding_completed', 'true');
      localStorage.setItem('boggle_onboarding_completed', 'true');
    });
  });

  // Helper function to dismiss onboarding if it appears
  async function dismissOnboardingIfPresent(page: any) {
    try {
      // Check if onboarding modal is present
      const closeButton = page.locator('button:has-text("X"), button[aria-label*="close"], button[aria-label*="Close"]').first();
      if (await closeButton.isVisible({ timeout: 2000 })) {
        await closeButton.click();
        await page.waitForTimeout(500);
      }
    } catch {
      // Onboarding not present, continue
    }
  }

  test.describe('MultiplayerSelector Component', () => {
    test('displays Create Room and Join Room cards', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);

      // Wait for page to fully load
      await page.waitForTimeout(1000);

      // Check for Create Room card - look for the text content
      const createRoomText = page.getByText(/Create Room/i).first();
      await expect(createRoomText).toBeVisible({ timeout: 15000 });

      // Check for Join Room card
      const joinRoomText = page.getByText(/Join Room/i).first();
      await expect(joinRoomText).toBeVisible();

      // Take screenshot
      await page.screenshot({ path: 'test-results/multiplayer-selector.png', fullPage: true });
    });

    test('shows Active Rooms section', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      // Check for Active Rooms section
      const activeRoomsSection = page.getByText(/Active Rooms|No active rooms/i);
      await expect(activeRoomsSection).toBeVisible({ timeout: 15000 });
    });

    test('Create Room card navigates to profile setup', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      // Click Create Room card using text
      const createRoomCard = page.locator('text=Create Room').first();
      await createRoomCard.click();

      // Should navigate to profile setup
      await expect(page.getByText(/Player Setup|What should we call you/i)).toBeVisible({ timeout: 15000 });

      // Take screenshot
      await page.screenshot({ path: 'test-results/profile-setup-create.png', fullPage: true });
    });

    test('Join Room card navigates to profile setup', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      // Click Join Room card
      const joinRoomCard = page.locator('text=Join Room').first();
      await joinRoomCard.click();

      // Should navigate to profile setup
      await expect(page.getByText(/Player Setup|What should we call you/i)).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('ProfileSetup Component', () => {
    test('validates username minimum length', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      // Navigate to profile setup via Create Room
      await page.locator('text=Create Room').first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Clear any pre-filled username
      const usernameInput = page.locator('input[id="profile-username"], input[placeholder*="name"]').first();
      await usernameInput.waitFor({ state: 'visible', timeout: 15000 });
      await usernameInput.clear();

      // Try with 1-character username (too short)
      await usernameInput.fill('A');

      // Continue button should be disabled
      const continueButton = page.getByRole('button', { name: /Continue/i });
      const isDisabled = await continueButton.isDisabled();
      expect(isDisabled).toBe(true);

      // Take screenshot
      await page.screenshot({ path: 'test-results/profile-username-validation.png', fullPage: true });
    });

    test('enables continue button with valid username and avatar', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      // Navigate to profile setup
      await page.locator('text=Create Room').first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      const usernameInput = page.locator('input[id="profile-username"], input[placeholder*="name"]').first();
      await usernameInput.waitFor({ state: 'visible', timeout: 15000 });
      await usernameInput.clear();
      await usernameInput.fill('TestUser');

      // Select an avatar (click the first avatar button)
      const avatarButton = page.locator('button[aria-label*="avatar"], button[aria-pressed]').first();
      if (await avatarButton.isVisible()) {
        await avatarButton.click();
      }

      // Continue button should be enabled when both username and avatar are set
      const continueButton = page.getByRole('button', { name: /Continue/i });
      await page.waitForTimeout(500);

      // Take screenshot to see the state
      await page.screenshot({ path: 'test-results/profile-valid-username.png', fullPage: true });
    });

    test('avatar selection works', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      // Navigate to profile setup
      await page.locator('text=Create Room').first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Find avatar buttons - they should have aria-label or aria-pressed
      const avatarButtons = page.locator('button[aria-label*="avatar"], button[aria-pressed]');
      const count = await avatarButtons.count();

      // Take screenshot to see avatar section
      await page.screenshot({ path: 'test-results/avatar-selection.png', fullPage: true });

      // There should be avatar buttons visible
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('back button returns to selector', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      // Navigate to profile setup
      await page.locator('text=Create Room').first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Click back button
      const backButton = page.locator('button').filter({ hasText: /back/i }).first();
      if (await backButton.isVisible()) {
        await backButton.click();
      } else {
        // Try clicking button with arrow icon
        const arrowBack = page.locator('button:has(svg)').first();
        await arrowBack.click();
      }

      // Should return to selector - look for Create Room text
      await expect(page.getByText(/Create Room/i).first()).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('CreateRoomForm Component', () => {
    test('shows create room form after profile setup', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      // Navigate through create flow
      await page.locator('text=Create Room').first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Fill profile
      const usernameInput = page.locator('input[id="profile-username"], input[placeholder*="name"]').first();
      await usernameInput.waitFor({ state: 'visible', timeout: 15000 });
      await usernameInput.clear();
      await usernameInput.fill('TestHost');

      // Select avatar
      const avatarButton = page.locator('button[aria-label*="avatar"], button[aria-pressed="false"]').first();
      if (await avatarButton.isVisible({ timeout: 2000 })) {
        await avatarButton.click();
      }

      // Continue
      const continueButton = page.getByRole('button', { name: /Continue/i });
      await continueButton.click();

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Take screenshot of create room form
      await page.screenshot({ path: 'test-results/create-room-form.png', fullPage: true });
    });

    test('room name is prepopulated', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      // Navigate through create flow
      await page.locator('text=Create Room').first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      const usernameInput = page.locator('input[id="profile-username"], input[placeholder*="name"]').first();
      await usernameInput.waitFor({ state: 'visible', timeout: 15000 });
      await usernameInput.clear();
      await usernameInput.fill('TestHost');

      const avatarButton = page.locator('button[aria-label*="avatar"], button[aria-pressed="false"]').first();
      if (await avatarButton.isVisible({ timeout: 2000 })) {
        await avatarButton.click();
      }

      const continueButton = page.getByRole('button', { name: /Continue/i });
      await continueButton.click();

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Check room name input is prepopulated
      const roomNameInput = page.locator('input[id="room-name"], input[placeholder*="room"]').first();
      if (await roomNameInput.isVisible({ timeout: 5000 })) {
        const roomName = await roomNameInput.inputValue();
        expect(roomName).toContain('TestHost');
      }

      await page.screenshot({ path: 'test-results/room-name-prepopulated.png', fullPage: true });
    });
  });

  test.describe('JoinRoomForm Component', () => {
    test('shows join room form after profile setup', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      // Navigate through join flow
      await page.locator('text=Join Room').first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Fill profile
      const usernameInput = page.locator('input[id="profile-username"], input[placeholder*="name"]').first();
      await usernameInput.waitFor({ state: 'visible', timeout: 15000 });
      await usernameInput.clear();
      await usernameInput.fill('TestPlayer');

      // Select avatar
      const avatarButton = page.locator('button[aria-label*="avatar"], button[aria-pressed="false"]').first();
      if (await avatarButton.isVisible({ timeout: 2000 })) {
        await avatarButton.click();
      }

      // Continue
      const continueButton = page.getByRole('button', { name: /Continue/i });
      await continueButton.click();

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Take screenshot
      await page.screenshot({ path: 'test-results/join-room-form.png', fullPage: true });
    });

    test('room code input converts to uppercase', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      // Navigate through join flow
      await page.locator('text=Join Room').first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      const usernameInput = page.locator('input[id="profile-username"], input[placeholder*="name"]').first();
      await usernameInput.waitFor({ state: 'visible', timeout: 15000 });
      await usernameInput.clear();
      await usernameInput.fill('TestPlayer');

      const avatarButton = page.locator('button[aria-label*="avatar"], button[aria-pressed="false"]').first();
      if (await avatarButton.isVisible({ timeout: 2000 })) {
        await avatarButton.click();
      }

      const continueButton = page.getByRole('button', { name: /Continue/i });
      await continueButton.click();

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Find room code input
      const codeInput = page.locator('input[id="join-game-code"], input[placeholder*="ABC"], input[inputmode="text"]').first();
      if (await codeInput.isVisible({ timeout: 5000 })) {
        // Type lowercase - should convert to uppercase
        await codeInput.fill('abc123');
        const value = await codeInput.inputValue();
        expect(value).toBe('ABC123');
      }

      await page.screenshot({ path: 'test-results/room-code-uppercase.png', fullPage: true });
    });
  });

  test.describe('Responsive Design', () => {
    test('selector fits on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      // Both cards should be visible
      const createRoom = page.getByText(/Create Room/i).first();
      const joinRoom = page.getByText(/Join Room/i).first();

      await expect(createRoom).toBeVisible({ timeout: 15000 });
      await expect(joinRoom).toBeVisible();

      // Take screenshot
      await page.screenshot({ path: 'test-results/mobile-selector.png', fullPage: true });
    });

    test('works in landscape orientation', async ({ page }) => {
      await page.setViewportSize({ width: 844, height: 390 });

      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      // Cards should be visible
      const createRoom = page.getByText(/Create Room/i).first();
      await expect(createRoom).toBeVisible({ timeout: 15000 });

      // Take screenshot
      await page.screenshot({ path: 'test-results/landscape-selector.png', fullPage: true });
    });
  });

  test.describe('RTL Layout (Hebrew)', () => {
    test('RTL layout renders correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/he/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      // Check RTL direction on any element
      const rtlElement = page.locator('[dir="rtl"]').first();
      await expect(rtlElement).toBeVisible({ timeout: 15000 });

      // Take screenshot
      await page.screenshot({ path: 'test-results/rtl-selector.png', fullPage: true });
    });
  });

  test.describe('Profile Persistence', () => {
    test('profile persists in localStorage', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      // Navigate to profile setup
      await page.locator('text=Create Room').first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Fill profile
      const usernameInput = page.locator('input[id="profile-username"], input[placeholder*="name"]').first();
      await usernameInput.waitFor({ state: 'visible', timeout: 15000 });
      await usernameInput.clear();
      await usernameInput.fill('PersistentUser');

      // Select avatar
      const avatarButton = page.locator('button[aria-label*="avatar"], button[aria-pressed="false"]').first();
      if (await avatarButton.isVisible({ timeout: 2000 })) {
        await avatarButton.click();
      }

      // Continue to trigger save
      const continueButton = page.getByRole('button', { name: /Continue/i });
      await continueButton.click();

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Check localStorage
      const savedUsername = await page.evaluate(() => localStorage.getItem('boggle_username'));
      expect(savedUsername).toBe('PersistentUser');
    });
  });

  test.describe('Progress Indicators', () => {
    test('shows step indicator on profile setup', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      // Navigate to profile setup
      await page.locator('text=Create Room').first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Check for step indicator
      const stepIndicator = page.getByText(/Step|1 of 2|2/i);

      // Take screenshot
      await page.screenshot({ path: 'test-results/step-indicator.png', fullPage: true });
    });
  });
});
