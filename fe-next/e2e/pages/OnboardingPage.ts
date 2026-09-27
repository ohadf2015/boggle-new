import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object for the FTUE.
 *
 * The flow is ONE screen (`QuickStartStep`): language, name, avatar and an
 * always-enabled PLAY button, with the tutorial offered as a link. The previous
 * version of this object described a 3-step modal (welcome demo → profile →
 * quick tips) belonging to `components/OnboardingModal.tsx`, which no longer has
 * a live caller — every selector here now points at the flow that actually ships.
 */
export class OnboardingPage {
  readonly page: Page;

  /** Full-screen FTUE takeover. */
  readonly flow: Locator;

  /** The one screen. */
  readonly playButton: Locator;
  readonly nameInput: Locator;
  readonly avatarButton: Locator;
  readonly shuffleButton: Locator;
  readonly howToPlayLink: Locator;
  readonly haveAccountLink: Locator;

  constructor(page: Page) {
    this.page = page;

    this.flow = page.locator('[data-testid="onboarding-flow"]');
    this.playButton = page.locator('[data-testid="quick-start-play"]');
    this.nameInput = page.locator('[data-testid="quick-start-name"]');
    this.avatarButton = page.locator('[data-testid="quick-start-avatar"]');
    this.shuffleButton = page.locator('[data-testid="quick-start-shuffle"]');
    this.howToPlayLink = page.locator('[data-testid="quick-start-how-to-play"]');
    this.haveAccountLink = page.locator('[data-testid="quick-start-have-account"]');
  }

  /** A flag button in the inline language row. */
  language(code: string): Locator {
    return this.page.locator(`[data-testid="quick-start-lang-${code}"]`);
  }

  /** Navigate to home as a fresh user (no onboarding completed). */
  async visitAsFreshUser(locale = 'en') {
    await this.page.goto(`/${locale}`);
    await this.page.evaluate(() => {
      localStorage.removeItem('lexiclash_onboarding_completed');
      localStorage.removeItem('lexiclash_onboarding_data');
    });
    await this.page.reload();
    await this.page.waitForLoadState('networkidle');
  }

  async waitForFlow() {
    await expect(this.flow).toBeVisible({ timeout: 10_000 });
  }

  /** The whole FTUE: press the big button. */
  async play() {
    await expect(this.playButton).toBeVisible({ timeout: 10_000 });
    await this.playButton.click();
  }

  /** Onboarding sends the player straight into a practice game. */
  async expectRedirectToGame() {
    await this.page.waitForURL(/practice\/classic/, { timeout: 10_000 });
  }
}
