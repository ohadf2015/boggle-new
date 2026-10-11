import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object for the Daily Word Hunt flow: the /daily hub (missions header,
 * Word Hunt hero card, leaderboard teaser) and the Word Hunt run itself.
 * Results-phase assertions live in component tests (see components/daily/__tests__/DailyWordHuntResults.*).
 */
export class DailyWordHuntPage {
  readonly page: Page;

  // Hub
  readonly wordHuntHero: Locator;
  readonly streakCounter: Locator;
  readonly leaderboardTeaser: Locator;
  readonly dailyMissionsHeader: Locator;
  readonly dateCard: Locator;
  readonly countdownTimer: Locator;
  readonly xpProgressBar: Locator;
  readonly questCards: Locator;
  readonly doneBadge: Locator;

  // Game UI
  readonly gameGrid: Locator;
  readonly lifeBar: Locator;
  readonly clueBoxes: Locator;
  readonly scoreDisplay: Locator;
  readonly liveRanks: Locator;
  readonly lootPanel: Locator;
  readonly discoveredWordsSlot: Locator;

  constructor(page: Page) {
    this.page = page;

    this.wordHuntHero = page.getByTestId('quest-card-word-hunt');
    this.streakCounter = page.getByTestId('streak-counter');
    this.leaderboardTeaser = page.getByTestId('leaderboard-teaser');
    this.dailyMissionsHeader = page.getByTestId('daily-missions-header');
    this.dateCard = page.getByTestId('date-card');
    this.countdownTimer = page.getByTestId('countdown-timer');
    this.xpProgressBar = page.getByTestId('xp-progress-bar');
    this.questCards = page.locator('[data-testid^="quest-card-"]:not([data-testid^="quest-card-accent"]):not([data-testid^="quest-card-image"])');
    this.doneBadge = page.locator('[data-testid=won-badge], [data-testid=lost-badge], [data-testid$="-done-badge"]');

    this.gameGrid = page.locator('[role=grid]:has([role=gridcell][data-letter])');
    this.lifeBar = page.getByTestId('life-bar');
    this.clueBoxes = page.getByTestId('clue-boxes');
    this.scoreDisplay = page.getByTestId('score-display');
    this.liveRanks = page.getByTestId('game-shell-left').getByText(/live ranks/i);
    this.lootPanel = page.getByTestId('game-shell-right').getByTestId('shell-words');
    this.discoveredWordsSlot = page.getByTestId('wordhunt-discovered-words-slot');
  }

  /** The hub is ready once its missions header has rendered (networkidle never settles: the socket stays open). */
  async waitForHub() {
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.dailyMissionsHeader).toBeVisible({ timeout: 30_000 });
  }

  async visitLanding(locale = 'en') {
    await this.page.goto(`/${locale}/daily`);
    await this.waitForHub();
  }

  /** Hub hero card → Word Hunt intro → Play. */
  async startWordHunt() {
    await this.wordHuntHero.click();
    await this.page.waitForURL(/\/daily\/word-hunt/, { timeout: 30_000 });
    const play = this.page.getByRole('button', { name: /^play$/i }).first();
    await expect(play).toBeVisible({ timeout: 30_000 });
    await play.click();
  }

  async waitForGameReady() {
    await expect(this.gameGrid).toBeVisible({ timeout: 30_000 });
  }

  async expectStreak(value: number) {
    await expect(this.streakCounter).toContainText(String(value));
  }

  /** Dailies reset at midnight UTC, so the date card shows the UTC day. */
  async expectTodaysDate() {
    await expect(this.dateCard).toContainText(String(new Date().getUTCDate()));
  }

  getClueBox(index: number) {
    return this.page.getByTestId(`clue-box-${index}`);
  }
}
