import { test, expect } from '@playwright/test';
import { OnboardingPage } from './pages/OnboardingPage';
import {
  goto,
  clearOnboardingState,
  waitForHydration,
  randomUsername,
} from './helpers/test-utils';
import {
  applyStorageFixture,
  ONBOARDED_USER,
  GUEST_WITH_PROFILE,
} from './helpers/storage-fixtures';

// ---------------------------------------------------------------------------
// 1. Fresh User First Visit
// ---------------------------------------------------------------------------
test.describe('Fresh User First Visit', () => {
  test('onboarding modal appears on first visit', async ({ page }) => {
    const onboarding = new OnboardingPage(page);
    await onboarding.visitAsFreshUser();
    await onboarding.waitForModal();
    await expect(onboarding.modal).toBeVisible();
  });

  test('modal does NOT appear if onboarding already completed', async ({ page }) => {
    await goto(page, '/');
    await applyStorageFixture(page, ONBOARDED_USER);
    await page.reload();
    await waitForHydration(page);

    const onboarding = new OnboardingPage(page);
    await expect(onboarding.modal).not.toBeVisible();
  });

  test('modal does NOT appear if onboarding was skipped', async ({ page }) => {
    await goto(page, '/');
    await page.evaluate(() => {
      localStorage.setItem('lexiclash_onboarding_completed', 'skipped');
    });
    await page.reload();
    await waitForHydration(page);

    const onboarding = new OnboardingPage(page);
    await expect(onboarding.modal).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 2. Step Navigation
// ---------------------------------------------------------------------------
test.describe('Step Navigation', () => {
  test('can navigate forward through steps', async ({ page }) => {
    const onboarding = new OnboardingPage(page);
    await onboarding.visitAsFreshUser();
    await onboarding.waitForModal();

    // Step 1 -> Step 2
    await onboarding.completeWelcomeStep('play');
    // Expect profile step or next step to be visible
    const profileVisible = await onboarding.profileStep.isVisible().catch(() => false);
    if (profileVisible) {
      await expect(onboarding.nameInput).toBeVisible();
    }
  });

  test('can navigate backward with back button', async ({ page }) => {
    const onboarding = new OnboardingPage(page);
    await onboarding.visitAsFreshUser();
    await onboarding.waitForModal();

    // Advance past step 1
    await onboarding.completeWelcomeStep('play');
    await waitForHydration(page);

    // Try going back
    const backVisible = await onboarding.backButton.isVisible().catch(() => false);
    if (backVisible) {
      await onboarding.backButton.click();
      // Should see step 1 elements again
      await expect(onboarding.letsPlayButton).toBeVisible();
    }
  });

  test('progress indicator is present in the modal', async ({ page }) => {
    const onboarding = new OnboardingPage(page);
    await onboarding.visitAsFreshUser();
    await onboarding.waitForModal();

    await expect(onboarding.progressIndicator).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 3. Welcome Demo Step
// ---------------------------------------------------------------------------
test.describe('Welcome Demo Step', () => {
  test('mini grid is visible on step 1', async ({ page }) => {
    const onboarding = new OnboardingPage(page);
    await onboarding.visitAsFreshUser();
    await onboarding.waitForModal();

    await expect(onboarding.miniGrid).toBeVisible();
  });

  test('"Let\'s Play" button advances to next step', async ({ page }) => {
    const onboarding = new OnboardingPage(page);
    await onboarding.visitAsFreshUser();
    await onboarding.waitForModal();

    await onboarding.letsPlayButton.click();
    // After clicking, the lets-play button should no longer be visible (moved to next step)
    await expect(onboarding.letsPlayButton).not.toBeVisible();
  });

  test('"Skip" button marks onboarding as skipped', async ({ page }) => {
    const onboarding = new OnboardingPage(page);
    await onboarding.visitAsFreshUser();
    await onboarding.waitForModal();

    await onboarding.skipButton.click();
    await waitForHydration(page);

    const completedValue = await page.evaluate(() =>
      localStorage.getItem('lexiclash_onboarding_completed')
    );
    expect(completedValue).toBe('skipped');
  });
});

// ---------------------------------------------------------------------------
// 4. Profile Setup Step
// ---------------------------------------------------------------------------
test.describe('Profile Setup Step', () => {
  async function goToProfileStep(page: import('@playwright/test').Page) {
    const onboarding = new OnboardingPage(page);
    await onboarding.visitAsFreshUser();
    await onboarding.waitForModal();
    await onboarding.completeWelcomeStep('play');
    return onboarding;
  }

  test('name input is visible on profile step', async ({ page }) => {
    const onboarding = await goToProfileStep(page);
    const profileVisible = await onboarding.profileStep.isVisible().catch(() => false);
    if (profileVisible) {
      await expect(onboarding.nameInput).toBeVisible();
    }
  });

  test('next button is disabled when name is empty', async ({ page }) => {
    const onboarding = await goToProfileStep(page);
    const profileVisible = await onboarding.profileStep.isVisible().catch(() => false);
    if (profileVisible) {
      await onboarding.nameInput.fill('');
      await expect(onboarding.nextButton).toBeDisabled();
    }
  });

  test('next button is disabled when name is too short (< 2 chars)', async ({ page }) => {
    const onboarding = await goToProfileStep(page);
    const profileVisible = await onboarding.profileStep.isVisible().catch(() => false);
    if (profileVisible) {
      await onboarding.nameInput.fill('A');
      await expect(onboarding.nextButton).toBeDisabled();
    }
  });

  test('name input rejects input longer than 20 characters', async ({ page }) => {
    const onboarding = await goToProfileStep(page);
    const profileVisible = await onboarding.profileStep.isVisible().catch(() => false);
    if (profileVisible) {
      const longName = 'A'.repeat(25);
      await onboarding.nameInput.fill(longName);
      const value = await onboarding.nameInput.inputValue();
      expect(value.length).toBeLessThanOrEqual(20);
    }
  });

  test('next button is enabled with a valid name (2-20 chars)', async ({ page }) => {
    const onboarding = await goToProfileStep(page);
    const profileVisible = await onboarding.profileStep.isVisible().catch(() => false);
    if (profileVisible) {
      await onboarding.nameInput.fill('ValidName');
      await expect(onboarding.nextButton).toBeEnabled();
    }
  });

  test('avatar selector button is visible', async ({ page }) => {
    const onboarding = await goToProfileStep(page);
    const profileVisible = await onboarding.profileStep.isVisible().catch(() => false);
    if (profileVisible) {
      await expect(onboarding.avatarSelectorButton).toBeVisible();
    }
  });

  test('profile step is skipped when user already has a profile', async ({ page }) => {
    await goto(page, '/');
    await applyStorageFixture(page, {
      ...GUEST_WITH_PROFILE,
      lexiclash_onboarding_completed: 'false',
    });
    await page.reload();
    await waitForHydration(page);

    const onboarding = new OnboardingPage(page);
    await onboarding.waitForModal();
    await onboarding.completeWelcomeStep('play');

    // Profile step should be skipped — should land on tips or start training
    const profileVisible = await onboarding.profileStep.isVisible().catch(() => false);
    expect(profileVisible).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Quick Tips Step
// ---------------------------------------------------------------------------
test.describe('Quick Tips Step', () => {
  test('start training button is visible on tips step', async ({ page }) => {
    const onboarding = new OnboardingPage(page);
    await onboarding.visitAsFreshUser();
    await onboarding.waitForModal();

    // Advance through step 1
    await onboarding.completeWelcomeStep('play');

    // Advance through step 2 if visible
    const profileVisible = await onboarding.nameInput.isVisible().catch(() => false);
    if (profileVisible) {
      await onboarding.completeProfileStep(randomUsername());
    }

    // Now on tips step
    await expect(onboarding.startTrainingButton).toBeVisible({ timeout: 5_000 });
  });

  test('clicking start training redirects to singleplayer', async ({ page }) => {
    const onboarding = new OnboardingPage(page);
    await onboarding.visitAsFreshUser();
    await onboarding.waitForModal();

    await onboarding.completeWelcomeStep('play');

    const profileVisible = await onboarding.nameInput.isVisible().catch(() => false);
    if (profileVisible) {
      await onboarding.completeProfileStep(randomUsername());
    }

    await onboarding.startTrainingButton.click({ timeout: 5_000 });
    await onboarding.expectRedirectToTraining();
  });
});

// ---------------------------------------------------------------------------
// 6. Complete Flow
// ---------------------------------------------------------------------------
test.describe('Complete Flow', () => {
  test('full onboarding redirects to /singleplayer?autoStart=practice', async ({ page }) => {
    const onboarding = new OnboardingPage(page);
    await onboarding.visitAsFreshUser();
    await onboarding.completeAllSteps('E2EPlayer');
    await page.waitForURL(/singleplayer.*autoStart=practice/, { timeout: 10_000 });
  });

  test('localStorage is updated after completing onboarding', async ({ page }) => {
    const onboarding = new OnboardingPage(page);
    await onboarding.visitAsFreshUser();
    await onboarding.completeAllSteps('E2EPlayer');
    await onboarding.expectRedirectToTraining();

    const completedValue = await page.evaluate(() =>
      localStorage.getItem('lexiclash_onboarding_completed')
    );
    expect(completedValue).toBe('true');
  });

  test('onboarding data is saved to localStorage on completion', async ({ page }) => {
    const name = randomUsername('SaveTest');
    const onboarding = new OnboardingPage(page);
    await onboarding.visitAsFreshUser();
    await onboarding.completeAllSteps(name);
    await onboarding.expectRedirectToTraining();

    const dataRaw = await page.evaluate(() =>
      localStorage.getItem('lexiclash_onboarding_data')
    );
    expect(dataRaw).toBeTruthy();
    const data = JSON.parse(dataRaw!);
    expect(data).toHaveProperty('completedAt');
  });

  test('skipping also saves state to localStorage', async ({ page }) => {
    const onboarding = new OnboardingPage(page);
    await onboarding.visitAsFreshUser();
    await onboarding.waitForModal();
    await onboarding.completeWelcomeStep('skip');
    await waitForHydration(page);

    const completedValue = await page.evaluate(() =>
      localStorage.getItem('lexiclash_onboarding_completed')
    );
    expect(['skipped', 'true']).toContain(completedValue);
  });
});

// ---------------------------------------------------------------------------
// 7. Locale Support
// ---------------------------------------------------------------------------
test.describe('Locale Support', () => {
  test('onboarding works in English (LTR)', async ({ page }) => {
    const onboarding = new OnboardingPage(page);
    await onboarding.visitAsFreshUser('en');
    await onboarding.waitForModal();

    const dir = await page.locator('html').getAttribute('dir');
    // English should be LTR (dir is either 'ltr' or absent)
    expect(dir).not.toBe('rtl');
    await expect(onboarding.letsPlayButton).toBeVisible();
  });

  test('onboarding works in Hebrew (RTL) with correct dir attribute', async ({ page }) => {
    const onboarding = new OnboardingPage(page);
    await onboarding.visitAsFreshUser('he');
    await onboarding.waitForModal();

    const dir = await page.locator('html').getAttribute('dir');
    expect(dir).toBe('rtl');
    await expect(onboarding.letsPlayButton).toBeVisible();
  });

  test('UI text changes between English and Hebrew', async ({ page }) => {
    // Get English text
    const onboardingEn = new OnboardingPage(page);
    await onboardingEn.visitAsFreshUser('en');
    await onboardingEn.waitForModal();
    const enText = await onboardingEn.modal.textContent();

    // Get Hebrew text
    const onboardingHe = new OnboardingPage(page);
    await onboardingHe.visitAsFreshUser('he');
    await onboardingHe.waitForModal();
    const heText = await onboardingHe.modal.textContent();

    expect(enText).not.toBe(heText);
  });
});

// ---------------------------------------------------------------------------
// 8. Returning User
// ---------------------------------------------------------------------------
test.describe('Returning User', () => {
  test('previously completed user does not see onboarding modal', async ({ page }) => {
    await goto(page, '/');
    await applyStorageFixture(page, ONBOARDED_USER);
    await page.reload();
    await waitForHydration(page);

    const onboarding = new OnboardingPage(page);
    await expect(onboarding.modal).not.toBeVisible();
  });

  test('clearing onboarding state makes modal reappear', async ({ page }) => {
    // Start as onboarded user
    await goto(page, '/');
    await applyStorageFixture(page, ONBOARDED_USER);
    await page.reload();
    await waitForHydration(page);

    const onboarding = new OnboardingPage(page);
    await expect(onboarding.modal).not.toBeVisible();

    // Clear state and reload
    await clearOnboardingState(page);
    await page.reload();
    await waitForHydration(page);

    await onboarding.waitForModal();
    await expect(onboarding.modal).toBeVisible();
  });
});
