import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object for the onboarding flow.
 * Encapsulates all selectors and actions for the 3-step onboarding modal.
 */
export class OnboardingPage {
  readonly page: Page;

  // Modal container
  readonly modal: Locator;

  // Step 1: Welcome Demo
  readonly letsPlayButton: Locator;
  readonly skipButton: Locator;
  readonly miniGrid: Locator;

  // Step 2: Profile Setup
  readonly profileStep: Locator;
  readonly nameInput: Locator;
  readonly avatarSelectorButton: Locator;

  // Step 3: Quick Tips
  readonly startTrainingButton: Locator;

  // Navigation
  readonly nextButton: Locator;
  readonly backButton: Locator;
  readonly progressIndicator: Locator;

  constructor(page: Page) {
    this.page = page;

    this.modal = page.locator('[role="dialog"]');
    this.letsPlayButton = page.locator('[data-testid="lets-play-button"]');
    this.skipButton = page.locator('[data-testid="skip-button"]');
    this.miniGrid = page.locator('[data-testid="mini-grid"]');
    this.profileStep = page.locator('[data-testid="deferred-profile-prompt"]');
    this.nameInput = page.locator('input[placeholder*="name"], input[type="text"]').first();
    this.avatarSelectorButton = page.locator('[data-testid="avatar-selector-button"]');
    this.nextButton = page.getByRole('button', { name: /next|continue|הבא/i });
    this.backButton = page.getByRole('button', { name: /back|חזרה/i });
    this.startTrainingButton = page.getByRole('button', { name: /start|play|let.*go|התחל|بدء/i });
    this.progressIndicator = page.locator('[class*="progress"], [class*="step-indicator"]');
  }

  /** Navigate to home as a fresh user (no onboarding completed) */
  async visitAsFreshUser(locale = 'en') {
    await this.page.goto(`/${locale}`);
    await this.page.evaluate(() => {
      localStorage.removeItem('lexiclash_onboarding_completed');
      localStorage.removeItem('lexiclash_onboarding_data');
    });
    await this.page.reload();
    await this.page.waitForLoadState('networkidle');
  }

  /** Wait for onboarding modal to appear */
  async waitForModal() {
    await expect(this.modal).toBeVisible({ timeout: 10_000 });
  }

  /** Complete step 1 by clicking "Let's Play" or "Skip" */
  async completeWelcomeStep(action: 'play' | 'skip' = 'play') {
    if (action === 'play') {
      await this.letsPlayButton.click();
    } else {
      await this.skipButton.click();
    }
  }

  /** Fill profile step with name and proceed */
  async completeProfileStep(name: string) {
    await expect(this.nameInput).toBeVisible({ timeout: 5_000 });
    await this.nameInput.fill(name);
    await this.nextButton.click();
  }

  /** Skip through to the final step and click start */
  async completeAllSteps(name = 'TestPlayer') {
    await this.waitForModal();
    // Step 1: Welcome
    await this.completeWelcomeStep('play');
    // Step 2: Profile (may be skipped if user has profile)
    const profileVisible = await this.nameInput.isVisible().catch(() => false);
    if (profileVisible) {
      await this.completeProfileStep(name);
    }
    // Step 3: Quick Tips - start training
    await this.startTrainingButton.click({ timeout: 5_000 }).catch(() => {
      // Fallback: try next button
      return this.nextButton.click();
    });
  }

  /** Verify the user is redirected to singleplayer after onboarding */
  async expectRedirectToTraining() {
    await this.page.waitForURL(/singleplayer/, { timeout: 10_000 });
  }
}
