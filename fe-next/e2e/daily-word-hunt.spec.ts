import { test, expect, type Page } from '@playwright/test';
import { DailyWordHuntPage } from './pages/DailyWordHuntPage';
import { goto, clearDailyState, type Locale } from './helpers/test-utils';
import { applyStorageFixture, ONBOARDED_USER, DAILY_PLAYER } from './helpers/storage-fixtures';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const COACH_SEEN = { lc_coach_wordHunt: '99' };

async function setupFreshDaily(page: Page, locale: Locale = 'en') {
  await goto(page, '/daily', locale);
  await applyStorageFixture(page, { ...ONBOARDED_USER, ...COACH_SEEN });
  await clearDailyState(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await new DailyWordHuntPage(page).waitForHub();
}

async function setupStreakUser(page: Page, locale: Locale = 'en') {
  await goto(page, '/daily', locale);
  await applyStorageFixture(page, DAILY_PLAYER);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await new DailyWordHuntPage(page).waitForHub();
}

async function startFreshRun(page: Page) {
  await setupFreshDaily(page);
  const dwh = new DailyWordHuntPage(page);
  await dwh.startWordHunt();
  await dwh.waitForGameReady();
  return dwh;
}

function alreadyPlayedFixture(language = 'en') {
  const today = new Date().toISOString().slice(0, 10);
  const completedAt = new Date().toISOString();
  return {
    ...ONBOARDED_USER,
    lexiclash_daily_streak: JSON.stringify({ currentStreak: 3, longestStreak: 7, lastPlayedDate: today, totalDailiesCompleted: 9 }),
    [`lexiclash_word_hunt_${language}_${today}`]: JSON.stringify({
      date: today,
      puzzleNumber: 1,
      completedAt,
      submittedToServer: true,
      result: {
        puzzleNumber: 1,
        puzzleDate: today,
        language,
        solved: true,
        attemptsUsed: 3,
        targetWord: 'HOUSE',
        attempts: [],
        wordsDiscovered: [],
        streakDays: 3,
        completedAt,
      },
    }),
  };
}

async function setupAlreadyPlayed(page: Page) {
  await goto(page, '/daily');
  await applyStorageFixture(page, alreadyPlayedFixture());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await new DailyWordHuntPage(page).waitForHub();
}

// ---------------------------------------------------------------------------
// 1. Hub -- Fresh User
// ---------------------------------------------------------------------------
test.describe('Landing Page -- Fresh User', () => {
  test.beforeEach(async ({ page }) => {
    await setupFreshDaily(page);
  });

  test('daily missions header is visible', async ({ page }) => {
    await expect(new DailyWordHuntPage(page).dailyMissionsHeader).toBeVisible();
  });

  test("date card shows today's date", async ({ page }) => {
    await new DailyWordHuntPage(page).expectTodaysDate();
  });

  test('Word Hunt hero card is visible', async ({ page }) => {
    await expect(new DailyWordHuntPage(page).wordHuntHero).toBeVisible();
  });

  test('streak counter shows 0 for fresh user', async ({ page }) => {
    await new DailyWordHuntPage(page).expectStreak(0);
  });

  test('leaderboard teaser is visible', async ({ page }) => {
    await expect(new DailyWordHuntPage(page).leaderboardTeaser).toBeVisible();
  });

  test('XP progress bar is visible and starts empty', async ({ page }) => {
    const bar = new DailyWordHuntPage(page).xpProgressBar;
    await expect(bar).toBeVisible();
    await expect(bar).toHaveAttribute('aria-valuenow', '0');
  });

  test('countdown timer is visible and ticking', async ({ page }) => {
    const timer = new DailyWordHuntPage(page).countdownTimer;
    await expect(timer).toBeVisible();
    await expect(timer).toHaveText(/^\d{2}:\d{2}:\d{2}$/);
  });
});

// ---------------------------------------------------------------------------
// 2. Hub -- User with Streak
// ---------------------------------------------------------------------------
test.describe('Landing Page -- User with Streak', () => {
  test.beforeEach(async ({ page }) => {
    await setupStreakUser(page);
  });

  test('streak counter shows 5', async ({ page }) => {
    await new DailyWordHuntPage(page).expectStreak(5);
  });

  test('quest cards are visible', async ({ page }) => {
    await expect(new DailyWordHuntPage(page).questCards.first()).toBeVisible();
  });

  test('quest cards show correct count', async ({ page }) => {
    expect(await new DailyWordHuntPage(page).questCards.count()).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Hub -- Already Played Today
// ---------------------------------------------------------------------------
test.describe('Landing Page -- Already Played Today', () => {
  test.beforeEach(async ({ page }) => {
    await setupAlreadyPlayed(page);
  });

  test('won badge is visible for completed puzzle', async ({ page }) => {
    await expect(new DailyWordHuntPage(page).doneBadge.first()).toBeVisible({ timeout: 10_000 });
  });

  test('cannot restart same day puzzle -- the Word Hunt page does not deal a new board', async ({ page }) => {
    const dwh = new DailyWordHuntPage(page);
    await goto(page, '/daily/word-hunt');
    await expect(page.locator(':text-matches("^target word$", "i"):visible').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(':text-is("3/10"):visible').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^play$/i })).toHaveCount(0);
    await expect(dwh.gameGrid).toBeHidden();
  });
});

// ---------------------------------------------------------------------------
// 4. Game Start
// ---------------------------------------------------------------------------
test.describe('Game Start', () => {
  test.beforeEach(async () => {
    test.slow();
  });

  test('clicking Word Hunt hero transitions to game', async ({ page }) => {
    const dwh = await startFreshRun(page);
    await expect(dwh.gameGrid).toBeVisible();
    await expect(page).toHaveURL(/\/daily\/word-hunt/);
  });

  test('life bar is visible and starts full', async ({ page }) => {
    const dwh = await startFreshRun(page);
    await expect(dwh.lifeBar).toBeVisible();
    expect(Number(await dwh.lifeBar.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(90);
  });

  test('score display is visible at game start', async ({ page }) => {
    const dwh = await startFreshRun(page);
    await expect(dwh.scoreDisplay).toBeVisible();
  });

  test('clue boxes are visible at game start', async ({ page }) => {
    const dwh = await startFreshRun(page);
    await expect(dwh.clueBoxes).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 5. Game UI -- Desktop
// ---------------------------------------------------------------------------
test.describe('Game UI -- Desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop layout only');
    test.slow();
    await startFreshRun(page);
  });

  test('desktop grid renders inside the game shell', async ({ page }) => {
    const shell = page.locator('[data-game-shell=hunt]');
    await expect(shell).toBeVisible();
    await expect(shell.getByTestId('game-shell-stage').getByRole('grid')).toBeVisible();
  });

  test('life bar, clue boxes, and score display all visible', async ({ page }) => {
    const dwh = new DailyWordHuntPage(page);
    await expect(dwh.lifeBar).toBeVisible();
    await expect(dwh.clueBoxes).toBeVisible();
    await expect(dwh.scoreDisplay).toBeVisible();
  });

  test('live ranks panel is visible', async ({ page }) => {
    await expect(new DailyWordHuntPage(page).liveRanks).toBeVisible();
  });

  test('loot panel is visible', async ({ page }) => {
    await expect(new DailyWordHuntPage(page).lootPanel).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 6. Game UI -- Mobile
// ---------------------------------------------------------------------------
test.describe('Game UI -- Mobile', () => {
  test.use({ viewport: { width: 393, height: 851 } }); // Pixel 5

  test.beforeEach(async ({ page }) => {
    test.slow();
    await startFreshRun(page);
  });

  test('the life bar keeps its own row under the clues', async ({ page }) => {
    const row = page.getByTestId('hunt-life-row');
    await expect(row.getByTestId('life-bar')).toBeVisible();
    const clues = await new DailyWordHuntPage(page).clueBoxes.boundingBox();
    const life = await row.boundingBox();
    expect(clues!.y + clues!.height).toBeLessThanOrEqual(life!.y + 1);
  });

  test('found words land in a strip under the board', async ({ page }) => {
    const dwh = new DailyWordHuntPage(page);
    await expect(dwh.discoveredWordsSlot).toBeAttached();
    const grid = await dwh.gameGrid.boundingBox();
    const slot = await dwh.discoveredWordsSlot.boundingBox();
    expect(slot!.y).toBeGreaterThanOrEqual(grid!.y + grid!.height - 1);
  });

  test('the desktop rails stay hidden, so the board owns the width', async ({ page }) => {
    await expect(page.getByTestId('game-shell-left')).toBeHidden();
    await expect(page.getByTestId('game-shell-right')).toBeHidden();
  });

  test('the score rides in the header', async ({ page }) => {
    await expect(page.getByTestId('survival-header').getByTestId('score-display')).toBeVisible();
  });

  test('clue boxes are visible on a phone', async ({ page }) => {
    await expect(new DailyWordHuntPage(page).clueBoxes).toBeVisible();
  });

  test('grid is responsive on mobile viewport', async ({ page }) => {
    const box = await new DailyWordHuntPage(page).gameGrid.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeLessThanOrEqual(393);
  });
});

// ---------------------------------------------------------------------------
// 7. Clue Boxes
// ---------------------------------------------------------------------------
test.describe('Clue Boxes', () => {
  test.beforeEach(async ({ page }) => {
    test.slow();
    await startFreshRun(page);
  });

  test('individual clue boxes are visible (clue-box-0, clue-box-1)', async ({ page }) => {
    const dwh = new DailyWordHuntPage(page);
    await expect(dwh.getClueBox(0)).toBeVisible();
    await expect(dwh.getClueBox(1)).toBeVisible();
  });

  test('multiple clue boxes render for the target word', async ({ page }) => {
    await expect(new DailyWordHuntPage(page).getClueBox(2)).toBeVisible();
    expect(await page.locator('[data-testid^="clue-box-"]').count()).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// 8. Scoring & Life
// ---------------------------------------------------------------------------
test.describe('Scoring & Life', () => {
  test.beforeEach(async () => {
    test.slow();
  });

  test('score display shows initial value', async ({ page }) => {
    const dwh = await startFreshRun(page);
    await expect(dwh.scoreDisplay).toBeVisible();
    await expect(dwh.scoreDisplay).toContainText(/\d/);
  });

  test('life bar is present and has visual content', async ({ page }) => {
    const dwh = await startFreshRun(page);
    await expect(dwh.lifeBar).toBeVisible();
    const box = await dwh.lifeBar.boundingBox();
    expect(box!.width).toBeGreaterThan(0);
  });
});

// Results-phase coverage (win cinematic, results container, share button,
// score-gauntlet banner) lives in component tests that mount
// <DailyWordHuntResults> directly with seed props:
//   - components/daily/__tests__/DailyWordHuntResults.winCinematic.test.tsx
//   - components/daily/__tests__/DailyWordHuntResults.emojiCard.test.tsx
//   - components/daily/__tests__/WordHuntResultsContent.test.tsx

// ---------------------------------------------------------------------------
// 11. Streak Updates
// ---------------------------------------------------------------------------
test.describe('Streak Updates', () => {
  test('localStorage streak is present after applying DAILY_PLAYER fixture', async ({ page }) => {
    await setupStreakUser(page);
    const raw = await page.evaluate(() => localStorage.getItem('lexiclash_daily_streak'));
    const data = JSON.parse(raw!);
    expect(data.currentStreak).toBe(5);
    expect(data.longestStreak).toBe(12);
  });

  test('clearing daily state removes streak from localStorage', async ({ page }) => {
    await setupStreakUser(page);
    await clearDailyState(page);
    expect(await page.evaluate(() => localStorage.getItem('lexiclash_daily_streak'))).toBeNull();
  });

  test('streak lastPlayedDate matches today', async ({ page }) => {
    await setupStreakUser(page);
    const data = JSON.parse((await page.evaluate(() => localStorage.getItem('lexiclash_daily_streak')))!);
    expect(data.lastPlayedDate).toBe(new Date().toISOString().slice(0, 10));
  });
});

// ---------------------------------------------------------------------------
// 12. Locale Support
// ---------------------------------------------------------------------------
test.describe('Locale Support', () => {
  test('English layout works (LTR)', async ({ page }) => {
    await setupFreshDaily(page, 'en');
    expect(await page.locator('html').getAttribute('dir')).not.toBe('rtl');
    await expect(new DailyWordHuntPage(page).wordHuntHero).toBeVisible();
  });

  test('Hebrew layout works (RTL) -- check dir attribute', async ({ page }) => {
    await setupFreshDaily(page, 'he');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(new DailyWordHuntPage(page).wordHuntHero).toBeVisible();
  });

  test('landing page text translates between locales', async ({ page }) => {
    await setupFreshDaily(page, 'en');
    const enText = await page.getByTestId('daily-missions-header').textContent();
    await setupFreshDaily(page, 'he');
    const heText = await page.getByTestId('daily-missions-header').textContent();
    expect(enText).toBeTruthy();
    expect(heText).toBeTruthy();
    expect(enText).not.toBe(heText);
  });
});

// ---------------------------------------------------------------------------
// 13. Hub art & completion
// ---------------------------------------------------------------------------
test.describe('Floating Decorations & Confetti', () => {
  test('the Word Hunt hero card carries its art', async ({ page }) => {
    await setupFreshDaily(page);
    await expect(new DailyWordHuntPage(page).wordHuntHero.getByTestId('quest-card-image-overlay')).toBeVisible();
  });

  test('a finished puzzle fills a missions segment', async ({ page }) => {
    await setupAlreadyPlayed(page);
    await expect
      .poll(async () => Number(await new DailyWordHuntPage(page).xpProgressBar.getAttribute('aria-valuenow')), { timeout: 10_000 })
      .toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 14. Navigation
// ---------------------------------------------------------------------------
test.describe('Navigation', () => {
  test('browser back mid-run asks first, then leaving lands on the daily hub', async ({ page }) => {
    test.slow();
    const dwh = await startFreshRun(page);
    await page.goBack();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await dialog.getByRole('button', { name: /leave anyway/i }).click();
    await expect(dwh.dailyMissionsHeader).toBeVisible({ timeout: 15_000 });
    await expect(dwh.gameGrid).toBeHidden();
  });

  test('daily landing is accessible via direct URL navigation', async ({ page }) => {
    await goto(page, '/daily');
    await applyStorageFixture(page, ONBOARDED_USER);
    await page.reload({ waitUntil: 'domcontentloaded' });
    const dwh = new DailyWordHuntPage(page);
    await dwh.waitForHub();
    await expect(dwh.dailyMissionsHeader).toBeVisible();
  });
});
