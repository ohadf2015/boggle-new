import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object for the Daily Word Hunt flow.
 * Covers landing, game play, and streak tracking. Results-phase assertions
 * live in component tests (see components/daily/__tests__/DailyWordHuntResults.*).
 */
export class DailyWordHuntPage {
  readonly page: Page;

  // Landing
  readonly wordHuntHero: Locator;
  readonly streakCounter: Locator;
  readonly leaderboardTeaser: Locator;
  readonly dailyMissionsHeader: Locator;
  readonly dateCard: Locator;
  readonly countdownTimer: Locator;
  readonly xpProgressBar: Locator;
  readonly questCards: Locator;
  readonly wonBadge: Locator;
  readonly lostBadge: Locator;
  readonly confettiBackground: Locator;

  // Game UI
  readonly gameGrid: Locator;
  readonly lifeBar: Locator;
  readonly clueBoxes: Locator;
  readonly scoreDisplay: Locator;
  readonly liveRanks: Locator;
  readonly lootPanel: Locator;
  readonly mobileInfoToggle: Locator;
  readonly mobileInfoExpanded: Locator;

  constructor(page: Page) {
    this.page = page;

    // Landing
    this.wordHuntHero = page.locator('[data-testid="word-hunt-hero"]');
    this.streakCounter = page.locator('[data-testid="streak-counter"]');
    this.leaderboardTeaser = page.locator('[data-testid="leaderboard-teaser"]');
    this.dailyMissionsHeader = page.locator('[data-testid="daily-missions-header"]');
    this.dateCard = page.locator('[data-testid="date-card"]');
    this.countdownTimer = page.locator('[data-testid="countdown-timer"]');
    this.xpProgressBar = page.locator('[data-testid="xp-progress-bar"]');
    this.questCards = page.locator('[data-testid^="quest-card-"]');
    this.wonBadge = page.locator('[data-testid="won-badge"]');
    this.lostBadge = page.locator('[data-testid="lost-badge"]');
    this.confettiBackground = page.locator('[data-testid="confetti-background"]');

    // Game UI
    this.gameGrid = page.locator('[data-testid="desktop-grid"], [class*="grid-container"]');
    this.lifeBar = page.locator('[data-testid="life-bar"], [class*="life-bar"]');
    this.clueBoxes = page.locator('[data-testid="clue-boxes"]');
    this.scoreDisplay = page.locator('[data-testid="score-display"]');
    this.liveRanks = page.locator('[data-testid="live-ranks"]');
    this.lootPanel = page.locator('[data-testid="loot-panel"]');
    this.mobileInfoToggle = page.locator('[data-testid="mobile-info-toggle"]');
    this.mobileInfoExpanded = page.locator('[data-testid="mobile-info-expanded"]');

  }

  /** Navigate to the daily challenge landing */
  async visitLanding(locale = 'en') {
    await this.page.goto(`/${locale}/daily/word-hunt`);
    await this.page.waitForLoadState('networkidle');
  }

  /** Click on the Word Hunt quest card to start */
  async startWordHunt() {
    // Click the word hunt hero card or quest card
    const heroCard = this.wordHuntHero;
    if (await heroCard.isVisible().catch(() => false)) {
      await heroCard.click();
    } else {
      // Fallback: click a quest card
      await this.questCards.first().click();
    }
  }

  /** Wait for game to load (grid visible) */
  async waitForGameReady() {
    await expect(this.gameGrid).toBeVisible({ timeout: 15_000 });
  }

  /** Check if streak counter shows expected value */
  async expectStreak(value: number) {
    await expect(this.streakCounter).toContainText(String(value));
  }

  /** Check that the correct date is shown */
  async expectTodaysDate() {
    const day = String(new Date().getDate());
    await expect(this.dateCard).toContainText(day);
  }

  /** Verify mobile info panel toggles */
  async toggleMobileInfo() {
    await this.mobileInfoToggle.click();
    await expect(this.mobileInfoExpanded).toBeVisible();
  }

  /** Get a specific clue box by index */
  getClueBox(index: number) {
    return this.page.locator(`[data-testid="clue-box-${index}"]`);
  }
}
