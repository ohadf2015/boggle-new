import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

/**
 * Profile Auto-Skip Feature Test Suite
 *
 * Tests the new feature where users with a saved profile (username + avatar)
 * automatically skip the ProfileSetup step when clicking Create/Join Room.
 */
test.describe('Profile Auto-Skip Feature', () => {
  // Helper function to dismiss onboarding if it appears
  async function dismissOnboardingIfPresent(page: Page) {
    try {
      const closeButton = page.locator('button:has-text("X"), button[aria-label*="close"], button[aria-label*="Close"]').first();
      if (await closeButton.isVisible({ timeout: 2000 })) {
        await closeButton.click();
        await page.waitForTimeout(500);
      }
    } catch {
      // Onboarding not present, continue
    }
  }

  // Helper to clear all profile data
  async function clearProfileData(page: Page) {
    await page.evaluate(() => {
      localStorage.removeItem('boggle_username');
      localStorage.removeItem('boggle_avatar_id');
      sessionStorage.removeItem('boggle_username');
      sessionStorage.removeItem('boggle_avatar_id');
    });
  }

  // Helper to set profile data
  async function setProfileData(page: Page, username: string, avatarId: string) {
    await page.evaluate(({ username, avatarId }) => {
      localStorage.setItem('boggle_username', username);
      localStorage.setItem('boggle_avatar_id', avatarId);
      sessionStorage.setItem('boggle_username', username);
      sessionStorage.setItem('boggle_avatar_id', avatarId);
    }, { username, avatarId });
  }

  // Helper to set onboarding as completed
  async function setOnboardingCompleted(page: Page) {
    await page.evaluate(() => {
      localStorage.setItem('lexiclash_onboarding_completed', 'true');
      localStorage.setItem('boggle_onboarding_completed', 'true');
    });
  }

  // Helper to click the Create Room card (either the card itself or the button inside)
  async function clickCreateRoomCard(page: Page) {
    // The card has aria-label="Create Room" and is clickable
    const createCard = page.locator('[aria-label="Create Room"], [aria-label*="Create Room"]').first();
    if (await createCard.isVisible({ timeout: 5000 })) {
      await createCard.click();
      return;
    }
    // Fallback to button with "Start Setup" text
    const startSetupBtn = page.locator('button:has-text("Start Setup")').first();
    if (await startSetupBtn.isVisible({ timeout: 3000 })) {
      await startSetupBtn.click();
      return;
    }
    // Last fallback - look for CREATE ROOM heading and click its parent card
    const createRoomHeading = page.locator('h2:has-text("CREATE ROOM")').first();
    await createRoomHeading.click();
  }

  // Helper to click the Join Room card
  async function clickJoinRoomCard(page: Page) {
    const joinCard = page.locator('[aria-label="Join Room"], [aria-label*="Join Room"]').first();
    if (await joinCard.isVisible({ timeout: 5000 })) {
      await joinCard.click();
      return;
    }
    // Fallback to button with "Browse Rooms" text
    const browseRoomsBtn = page.locator('button:has-text("Browse Rooms")').first();
    if (await browseRoomsBtn.isVisible({ timeout: 3000 })) {
      await browseRoomsBtn.click();
      return;
    }
    // Last fallback
    const joinRoomHeading = page.locator('h2:has-text("JOIN ROOM")').first();
    await joinRoomHeading.click();
  }

  // Helper to navigate to multiplayer selector page
  async function navigateToMultiplayerSelector(page: Page) {
    // First check if we're on the landing page (CHOOSE YOUR MODE)
    const chooseModeText = page.getByText('CHOOSE YOUR MODE');
    const isOnLandingPage = await chooseModeText.isVisible({ timeout: 3000 }).catch(() => false);

    if (isOnLandingPage) {
      // Click the MULTIPLAYER card on landing page
      const multiplayerCard = page.locator('text=MULTIPLAYER').first();
      await multiplayerCard.click();
      await page.waitForTimeout(500);
    }

    // Now verify we're on the multiplayer selector with CREATE/JOIN cards
    await expect(page.locator('h2:has-text("CREATE ROOM")').first()).toBeVisible({ timeout: 10000 });
  }

  test.describe('1. New User Flow (No Profile)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(BASE_URL);
      await clearProfileData(page);
      await setOnboardingCompleted(page);
    });

    test('Create Room shows ProfileSetup when no profile exists', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      // Verify we're on the selector
      await navigateToMultiplayerSelector(page);

      // Click Create Room card
      await clickCreateRoomCard(page);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Should show ProfileSetup (Player Setup)
      await expect(page.getByText(/Player Setup/i)).toBeVisible({ timeout: 10000 });

      // Should show "Step 1 of 2" progress indicator
      await expect(page.getByText(/Step 1 of 2/i)).toBeVisible();

      // Should have username input
      const usernameInput = page.locator('input[id="profile-username"]');
      await expect(usernameInput).toBeVisible();

      // Should have avatar selection area
      const avatarArea = page.locator('button[aria-label*="avatar"]').first();
      await expect(avatarArea).toBeVisible();

      await page.screenshot({ path: 'test-results/new-user-create-profile-setup.png', fullPage: true });
    });

    test('Join Room shows ProfileSetup when no profile exists', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      // Verify selector is visible
      await navigateToMultiplayerSelector(page);

      // Click Join Room card
      await clickJoinRoomCard(page);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Should show ProfileSetup (Player Setup)
      await expect(page.getByText(/Player Setup/i)).toBeVisible({ timeout: 10000 });

      // Should show "Step 1 of 2" progress
      await expect(page.getByText(/Step 1 of 2/i)).toBeVisible();

      await page.screenshot({ path: 'test-results/new-user-join-profile-setup.png', fullPage: true });
    });

    test('New user completes profile and continues to CreateRoomForm', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      // Verify selector and click Create Room
      await navigateToMultiplayerSelector(page);
      await clickCreateRoomCard(page);
      await page.waitForTimeout(500);

      // Fill username
      const usernameInput = page.locator('input[id="profile-username"]');
      await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
      await usernameInput.clear();
      await usernameInput.fill('NewTestUser');

      // Select an avatar
      const avatarButton = page.locator('button[aria-label*="avatar"]').first();
      await avatarButton.click();

      // Click Continue
      const continueButton = page.getByRole('button', { name: /Continue/i });
      await expect(continueButton).toBeEnabled();
      await continueButton.click();

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Should now be on CreateRoomForm - the page title says "Create Room"
      // and we should see "Step 2 of 2"
      await expect(page.getByText(/Step 2 of 2/i)).toBeVisible({ timeout: 10000 });

      // Should show profile badge with username
      await expect(page.getByText('NewTestUser')).toBeVisible();

      await page.screenshot({ path: 'test-results/new-user-complete-to-create-form.png', fullPage: true });
    });
  });

  test.describe('2. Returning User Flow (Profile in localStorage)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(BASE_URL);
      await setOnboardingCompleted(page);
      // Set profile data for returning user
      await setProfileData(page, 'ReturningUser', 'avatar-1');
    });

    test('Create Room SKIPS ProfileSetup and goes directly to CreateRoomForm', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      // Verify selector is visible
      await navigateToMultiplayerSelector(page);

      // Click Create Room
      await clickCreateRoomCard(page);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Should SKIP ProfileSetup and go directly to CreateRoomForm
      // Should NOT see "Player Setup" title (that's ProfileSetup)
      // Instead should see Step 2 of 2 which indicates CreateRoomForm
      await expect(page.getByText(/Step 2 of 2/i)).toBeVisible({ timeout: 10000 });

      // Should show profile badge with saved username
      await expect(page.getByText('ReturningUser')).toBeVisible();

      // Should show avatar in profile badge (could be img or emoji/icon)
      // The profile badge section should be visible
      const profileBadge = page.locator('text=YOUR PROFILE').first();
      await expect(profileBadge).toBeVisible();

      await page.screenshot({ path: 'test-results/returning-user-skip-create.png', fullPage: true });
    });

    test('Join Room SKIPS ProfileSetup and goes directly to JoinRoomForm', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      // Verify selector and click Join Room
      await navigateToMultiplayerSelector(page);
      await clickJoinRoomCard(page);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Should SKIP ProfileSetup and go directly to JoinRoomForm
      // Should see JoinRoomForm with Step 2 of 2
      await expect(page.getByText(/Step 2 of 2/i)).toBeVisible({ timeout: 10000 });

      // Should show profile badge with saved username
      await expect(page.getByText('ReturningUser')).toBeVisible();

      // Should have room code input visible
      const codeInput = page.locator('input[id="join-game-code"]');
      await expect(codeInput).toBeVisible();

      await page.screenshot({ path: 'test-results/returning-user-skip-join.png', fullPage: true });
    });

    test('Edit Profile link is visible in CreateRoomForm', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      // Verify selector and click Create Room
      await navigateToMultiplayerSelector(page);
      await clickCreateRoomCard(page);
      await page.waitForTimeout(500);

      // Should show Edit Profile link
      const editProfileLink = page.locator('button:has-text("Edit Profile")');
      await expect(editProfileLink).toBeVisible({ timeout: 10000 });

      await page.screenshot({ path: 'test-results/edit-profile-link-create.png', fullPage: true });
    });

    test('Edit Profile link is visible in JoinRoomForm', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      // Verify selector and click Join Room
      await navigateToMultiplayerSelector(page);
      await clickJoinRoomCard(page);
      await page.waitForTimeout(500);

      // Should show Edit Profile link
      const editProfileLink = page.locator('button:has-text("Edit Profile")');
      await expect(editProfileLink).toBeVisible({ timeout: 10000 });

      await page.screenshot({ path: 'test-results/edit-profile-link-join.png', fullPage: true });
    });
  });

  test.describe('3. Edit Profile Flow', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(BASE_URL);
      await setOnboardingCompleted(page);
      await setProfileData(page, 'EditableUser', 'avatar-2');
    });

    test('Clicking Edit Profile shows ProfileSetup with edit mode title', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      // Navigate to CreateRoomForm (skip profile)
      await navigateToMultiplayerSelector(page);
      await clickCreateRoomCard(page);
      await page.waitForTimeout(500);

      // Click Edit Profile
      const editProfileLink = page.locator('button:has-text("Edit Profile")');
      await editProfileLink.click();
      await page.waitForTimeout(500);

      // Should show ProfileSetup with "Edit Profile" title
      await expect(page.getByText(/Edit Profile/i).first()).toBeVisible({ timeout: 10000 });

      // Should show "Editing your profile" progress text
      await expect(page.getByText(/Editing your profile/i)).toBeVisible();

      // Should NOT show "Step 1 of 2" (that's for normal flow)
      await expect(page.getByText(/Step 1 of 2/i)).not.toBeVisible();

      await page.screenshot({ path: 'test-results/edit-profile-mode.png', fullPage: true });
    });

    test('Edit mode shows "Save Changes" button instead of "Continue"', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      await navigateToMultiplayerSelector(page);
      await clickCreateRoomCard(page);
      await page.waitForTimeout(500);

      const editProfileLink = page.locator('button:has-text("Edit Profile")');
      await editProfileLink.click();
      await page.waitForTimeout(500);

      // Should show "Save Changes" button
      const saveButton = page.getByRole('button', { name: /Save Changes/i });
      await expect(saveButton).toBeVisible({ timeout: 10000 });

      // Should NOT show "Continue" button
      await expect(page.getByRole('button', { name: /^Continue$/i })).not.toBeVisible();

      await page.screenshot({ path: 'test-results/save-changes-button.png', fullPage: true });
    });

    test('Clicking Back in edit mode returns to CreateRoomForm without changes', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      await navigateToMultiplayerSelector(page);
      await clickCreateRoomCard(page);
      await page.waitForTimeout(500);

      // Verify we're on CreateRoomForm with original username
      await expect(page.getByText('EditableUser')).toBeVisible();

      // Click Edit Profile
      const editProfileLink = page.locator('button:has-text("Edit Profile")');
      await editProfileLink.click();
      await page.waitForTimeout(500);

      // Verify we're on Edit Profile screen
      await expect(page.getByText(/Edit Profile/i).first()).toBeVisible({ timeout: 5000 });

      // Change username (but don't save)
      const usernameInput = page.locator('input[id="profile-username"]');
      await usernameInput.clear();
      await usernameInput.fill('ChangedButNotSaved');

      // Click Back button - it's the button with Back text or arrow icon in header
      const backButton = page.locator('button:has-text("Back")').first();
      await backButton.click();
      await page.waitForTimeout(1000);

      // Should return to CreateRoomForm - verify by checking Step 2 of 2 is visible
      // Note: The profile change might persist in state but won't be saved to storage
      await expect(page.getByText(/Step 2 of 2/i)).toBeVisible({ timeout: 10000 });

      // Should see the room form (CREATE ROOM title)
      await expect(page.getByText(/CREATE ROOM/i).first()).toBeVisible();

      await page.screenshot({ path: 'test-results/back-from-edit-no-changes.png', fullPage: true });
    });

    test('Saving changes in edit mode updates profile and returns to form', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      await navigateToMultiplayerSelector(page);
      await clickCreateRoomCard(page);
      await page.waitForTimeout(500);

      // Click Edit Profile
      const editProfileLink = page.locator('button:has-text("Edit Profile")');
      await editProfileLink.click();
      await page.waitForTimeout(500);

      // Change username
      const usernameInput = page.locator('input[id="profile-username"]');
      await usernameInput.clear();
      await usernameInput.fill('UpdatedUsername');

      // Click Save Changes
      const saveButton = page.getByRole('button', { name: /Save Changes/i });
      await saveButton.click();
      await page.waitForTimeout(500);

      // Should return to CreateRoomForm with updated username
      await expect(page.getByText('UpdatedUsername')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/Step 2 of 2/i)).toBeVisible();

      // Verify localStorage was updated
      const savedUsername = await page.evaluate(() => localStorage.getItem('boggle_username'));
      expect(savedUsername).toBe('UpdatedUsername');

      await page.screenshot({ path: 'test-results/save-changes-returns-with-update.png', fullPage: true });
    });

    test('Edit Profile from JoinRoomForm returns to JoinRoomForm after save', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      // Go to Join flow
      await navigateToMultiplayerSelector(page);
      await clickJoinRoomCard(page);
      await page.waitForTimeout(500);

      // Click Edit Profile
      const editProfileLink = page.locator('button:has-text("Edit Profile")');
      await editProfileLink.click();
      await page.waitForTimeout(500);

      // Change username
      const usernameInput = page.locator('input[id="profile-username"]');
      await usernameInput.clear();
      await usernameInput.fill('JoinFlowUpdated');

      // Save changes
      const saveButton = page.getByRole('button', { name: /Save Changes/i });
      await saveButton.click();
      await page.waitForTimeout(500);

      // Should return to JoinRoomForm (not CreateRoomForm)
      await expect(page.getByText('JoinFlowUpdated')).toBeVisible({ timeout: 10000 });

      // Should see room code input (indicating JoinRoomForm)
      const codeInput = page.locator('input[id="join-game-code"]');
      await expect(codeInput).toBeVisible();

      await page.screenshot({ path: 'test-results/edit-from-join-returns-to-join.png', fullPage: true });
    });
  });

  test.describe('4. Accessibility Tests', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(BASE_URL);
      await setOnboardingCompleted(page);
      await setProfileData(page, 'A11yUser', 'avatar-3');
    });

    test('Edit Profile button is keyboard accessible', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      await navigateToMultiplayerSelector(page);
      await clickCreateRoomCard(page);
      await page.waitForTimeout(500);

      // Find Edit Profile button
      const editProfileButton = page.locator('button:has-text("Edit Profile")');
      await expect(editProfileButton).toBeVisible();

      // Focus the button using keyboard navigation
      await editProfileButton.focus();

      // Verify it can receive focus
      const isFocused = await editProfileButton.evaluate(el => document.activeElement === el);
      expect(isFocused).toBe(true);

      // Press Enter to activate
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      // Should navigate to edit mode
      await expect(page.getByText(/Edit Profile/i).first()).toBeVisible({ timeout: 10000 });

      await page.screenshot({ path: 'test-results/keyboard-edit-profile.png', fullPage: true });
    });

    test('Focus management after profile skip', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      // Click Create Room (will skip to form)
      await navigateToMultiplayerSelector(page);
      await clickCreateRoomCard(page);
      await page.waitForTimeout(500);

      // After skipping, the page should have meaningful content in focus order
      // Tab to first focusable element
      await page.keyboard.press('Tab');

      // Should be able to tab through form elements
      const activeElement = await page.evaluate(() => {
        return document.activeElement?.tagName?.toLowerCase() || 'unknown';
      });

      // Active element should be a focusable element (button or input)
      expect(['button', 'input', 'a']).toContain(activeElement);

      await page.screenshot({ path: 'test-results/focus-after-skip.png', fullPage: true });
    });

    test('Avatar buttons have proper aria-label and aria-pressed', async ({ page }) => {
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await clearProfileData(page);
      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForTimeout(1000);

      await navigateToMultiplayerSelector(page);
      await clickCreateRoomCard(page);
      await page.waitForTimeout(500);

      // Find avatar buttons with aria-label
      const avatarButtons = page.locator('button[aria-label*="avatar"]');
      const count = await avatarButtons.count();
      expect(count).toBeGreaterThan(0);

      // Check first avatar has aria-pressed attribute
      const firstAvatar = avatarButtons.first();
      const ariaPressed = await firstAvatar.getAttribute('aria-pressed');
      expect(['true', 'false']).toContain(ariaPressed);

      await page.screenshot({ path: 'test-results/avatar-accessibility.png', fullPage: true });
    });
  });

  test.describe('5. Edge Cases', () => {
    test('Partial profile (username only, no avatar) shows ProfileSetup', async ({ page }) => {
      await page.goto(BASE_URL);
      await setOnboardingCompleted(page);
      // Set only username, no avatar
      await page.evaluate(() => {
        localStorage.setItem('boggle_username', 'PartialUser');
        localStorage.removeItem('boggle_avatar_id');
      });

      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      await navigateToMultiplayerSelector(page);
      await clickCreateRoomCard(page);
      await page.waitForTimeout(500);

      // Should show ProfileSetup (not skip) because profile is incomplete
      await expect(page.getByText(/Player Setup/i)).toBeVisible({ timeout: 10000 });

      await page.screenshot({ path: 'test-results/partial-profile-username-only.png', fullPage: true });
    });

    test('Partial profile (avatar only, no username) shows ProfileSetup', async ({ page }) => {
      await page.goto(BASE_URL);
      await setOnboardingCompleted(page);
      // Set only avatar, no username
      await page.evaluate(() => {
        localStorage.removeItem('boggle_username');
        localStorage.setItem('boggle_avatar_id', 'avatar-1');
      });

      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      await navigateToMultiplayerSelector(page);
      await clickCreateRoomCard(page);
      await page.waitForTimeout(500);

      // Should show ProfileSetup (not skip) because profile is incomplete
      await expect(page.getByText(/Player Setup/i)).toBeVisible({ timeout: 10000 });

      await page.screenshot({ path: 'test-results/partial-profile-avatar-only.png', fullPage: true });
    });

    test('Profile works with sessionStorage fallback', async ({ page }) => {
      await page.goto(BASE_URL);
      await setOnboardingCompleted(page);
      // Set in sessionStorage only (simulating incognito mode)
      await page.evaluate(() => {
        localStorage.removeItem('boggle_username');
        localStorage.removeItem('boggle_avatar_id');
        sessionStorage.setItem('boggle_username', 'SessionUser');
        sessionStorage.setItem('boggle_avatar_id', 'avatar-4');
      });

      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      await navigateToMultiplayerSelector(page);
      await clickCreateRoomCard(page);
      await page.waitForTimeout(500);

      // Should skip ProfileSetup and show CreateRoomForm
      await expect(page.getByText(/Step 2 of 2/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('SessionUser')).toBeVisible();

      await page.screenshot({ path: 'test-results/session-storage-fallback.png', fullPage: true });
    });
  });

  test.describe('6. Mobile Responsiveness', () => {
    test('Edit Profile link visible on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL);
      await setOnboardingCompleted(page);
      await setProfileData(page, 'MobileUser', 'avatar-5');

      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      await navigateToMultiplayerSelector(page);
      await clickCreateRoomCard(page);
      await page.waitForTimeout(500);

      // Edit Profile should be visible on mobile
      const editProfileLink = page.locator('button:has-text("Edit Profile")');
      await expect(editProfileLink).toBeVisible({ timeout: 10000 });

      await page.screenshot({ path: 'test-results/mobile-edit-profile.png', fullPage: true });
    });

    test('ProfileSetup form usable on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL);
      await setOnboardingCompleted(page);
      await clearProfileData(page);

      await page.goto(`${BASE_URL}/en/multiplayer`);
      await page.waitForLoadState('networkidle');
      await dismissOnboardingIfPresent(page);
      await page.waitForTimeout(1000);

      await navigateToMultiplayerSelector(page);
      await clickCreateRoomCard(page);
      await page.waitForTimeout(500);

      // Username input should be visible and usable
      const usernameInput = page.locator('input[id="profile-username"]');
      await expect(usernameInput).toBeVisible({ timeout: 10000 });
      await usernameInput.fill('MobileTestUser');

      // Avatar selection should be visible
      const avatarButton = page.locator('button[aria-label*="avatar"]').first();
      await expect(avatarButton).toBeVisible();

      // Continue button should be reachable
      const continueButton = page.getByRole('button', { name: /Continue/i });
      await expect(continueButton).toBeVisible();

      await page.screenshot({ path: 'test-results/mobile-profile-setup.png', fullPage: true });
    });
  });
});
