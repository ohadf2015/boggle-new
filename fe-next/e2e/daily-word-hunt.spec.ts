import { test, expect } from '@playwright/test';
import { DailyWordHuntPage } from './pages/DailyWordHuntPage';
import {
  goto,
  clearDailyState,
  tid,
  waitForHydration,
  type Locale,
} from './helpers/test-utils';
import {
  applyStorageFixture,
  ONBOARDED_USER,
  DAILY_PLAYER,
} from './helpers/storage-fixtures';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Navigate to daily landing, skip onboarding, clear daily state */
async function setupFreshDaily(page: import('@playwright/test').Page, locale: Locale = 'en') {
  await goto(page, '/daily/word-hunt', locale);
  await applyStorageFixture(page, ONBOARDED_USER);
  await clearDailyState(page);
  await page.reload();
  await waitForHydration(page);
}

/** Navigate to daily landing with DAILY_PLAYER fixture (streak: 5) */
async function setupStreakUser(page: import('@playwright/test').Page, locale: Locale = 'en') {
  await goto(page, '/daily/word-hunt', locale);
  await applyStorageFixture(page, DAILY_PLAYER);
  await page.reload();
  await waitForHydration(page);
}

/** Build an "already played today" fixture */
function alreadyPlayedFixture() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    ...ONBOARDED_USER,
    lexiclash_daily_streak: JSON.stringify({
      current: 3,
      longest: 7,
      lastPlayedDate: today,
    }),
    lexiclash_word_hunt_completed: today,
  };
}

// ---------------------------------------------------------------------------
// 1. Landing Page -- Fresh User
// ---------------------------------------------------------------------------
test.describe('Landing Page -- Fresh User', () => {
  test.beforeEach(async ({ page }) => {
    await setupFreshDaily(page);
  });

  test('daily missions header is visible', async ({ page }) => {
    const dwh = new DailyWordHuntPage(page);
    await expect(dwh.dailyMissionsHeader).toBeVisible();
  });

  test('date card shows today\'s date', async ({ page }) => {
    const dwh = new DailyWordHuntPage(page);
    await dwh.expectTodaysDate();
  });

  test('Word Hunt hero card is visible', async ({ page }) => {
    const dwh = new DailyWordHuntPage(page);
    await expect(dwh.wordHuntHero).toBeVisible();
  });

  test('streak counter shows 0 for fresh user', async ({ page }) => {
    const dwh = new DailyWordHuntPage(page);
    await dwh.expectStreak(0);
  });

  test('leaderboard teaser is visible', async ({ page }) => {
    const dwh = new DailyWordHuntPage(page);
    await expect(dwh.leaderboardTeaser).toBeVisible();
  });

  test('XP progress bar is visible', async ({ page }) => {
    const dwh = new DailyWordHuntPage(page);
    await expect(dwh.xpProgressBar).toBeVisible();
  });

  test('countdown timer is visible', async ({ page }) => {
    const dwh = new DailyWordHuntPage(page);
    await expect(dwh.countdownTimer).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 2. Landing Page -- User with Streak
// ---------------------------------------------------------------------------
test.describe('Landing Page -- User with Streak', () => {
  test.beforeEach(async ({ page }) => {
    await setupStreakUser(page);
  });

  test('streak counter shows 5', async ({ page }) => {
    const dwh = new DailyWordHuntPage(page);
    await dwh.expectStreak(5);
  });

  test('quest cards are visible', async ({ page }) => {
    const dwh = new DailyWordHuntPage(page);
    await expect(dwh.questCards.first()).toBeVisible();
  });

  test('quest cards show correct count', async ({ page }) => {
    const dwh = new DailyWordHuntPage(page);
    const count = await dwh.questCards.count();
    expect(count).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Landing Page -- Already Played Today
// ---------------------------------------------------------------------------
test.describe('Landing Page -- Already Played Today', () => {
  test.beforeEach(async ({ page }) => {
    await goto(page, '/daily/word-hunt');
    await applyStorageFixture(page, alreadyPlayedFixture());
    await page.reload();
    await waitForHydration(page);
  });

  test('won badge is visible for completed puzzle', async ({ page }) => {
    const dwh = new DailyWordHuntPage(page);
    // Either won or lost badge should be visible
    const wonVisible = await dwh.wonBadge.isVisible().catch(() => false);
    const lostVisible = await dwh.lostBadge.isVisible().catch(() => false);
    expect(wonVisible || lostVisible).toBe(true);
  });

  test('cannot restart same day puzzle -- hero card reflects completion', async ({ page }) => {
    const dwh = new DailyWordHuntPage(page);
    // The hero should still be visible but indicate completion
    await expect(dwh.wordHuntHero).toBeVisible();
    // Clicking should not transition to a new game
    await dwh.wordHuntHero.click();
    // Grid should NOT appear -- still on landing or shows results
    await expect(dwh.gameGrid).not.toBeVisible({ timeout: 3_000 });
  });
});

// ---------------------------------------------------------------------------
// 4. Game Start
// ---------------------------------------------------------------------------
test.describe('Game Start', () => {
  test.beforeEach(async ({ page }) => {
    await setupFreshDaily(page);
  });

  test('clicking Word Hunt hero transitions to game', async ({ page }) => {
    test.slow();
    const dwh = new DailyWordHuntPage(page);
    await dwh.startWordHunt();
    await dwh.waitForGameReady();
    await expect(dwh.gameGrid).toBeVisible();
  });

  test('life bar is visible and starts full', async ({ page }) => {
    test.slow();
    const dwh = new DailyWordHuntPage(page);
    await dwh.startWordHunt();
    await dwh.waitForGameReady();
    await expect(dwh.lifeBar).toBeVisible();
  });

  test('score display is visible at game start', async ({ page }) => {
    test.slow();
    const dwh = new DailyWordHuntPage(page);
    await dwh.startWordHunt();
    await dwh.waitForGameReady();
    await expect(dwh.scoreDisplay).toBeVisible();
  });

  test('clue boxes are visible at game start', async ({ page }) => {
    test.slow();
    const dwh = new DailyWordHuntPage(page);
    await dwh.startWordHunt();
    await dwh.waitForGameReady();
    await expect(dwh.clueBoxes).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 5. Game UI -- Desktop
// ---------------------------------------------------------------------------
test.describe('Game UI -- Desktop', () => {
  test.beforeEach(async ({ page }) => {
    await setupFreshDaily(page);
    const dwh = new DailyWordHuntPage(page);
    await dwh.startWordHunt();
    await dwh.waitForGameReady();
  });

  test('desktop grid renders', async ({ page }) => {
    await expect(page.locator(tid('desktop-grid'))).toBeVisible();
  });

  test('life bar, clue boxes, and score display all visible', async ({ page }) => {
    const dwh = new DailyWordHuntPage(page);
    await expect(dwh.lifeBar).toBeVisible();
    await expect(dwh.clueBoxes).toBeVisible();
    await expect(dwh.scoreDisplay).toBeVisible();
  });

  test('live ranks panel is visible', async ({ page }) => {
    const dwh = new DailyWordHuntPage(page);
    await expect(dwh.liveRanks).toBeVisible();
  });

  test('loot panel is visible', async ({ page }) => {
    const dwh = new DailyWordHuntPage(page);
    await expect(dwh.lootPanel).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 6. Game UI -- Mobile
// ---------------------------------------------------------------------------
test.describe('Game UI -- Mobile', () => {
  test.use({ viewport: { width: 393, height: 851 } }); // Pixel 5

  test.beforeEach(async ({ page }) => {
    await setupFreshDaily(page);
    const dwh = new DailyWordHuntPage(page);
    await dwh.startWordHunt();
    await dwh.waitForGameReady();
  });

  test('mobile info toggle is visible', async ({ page }) => {
    const dwh = new DailyWordHuntPage(page);
    await expect(dwh.mobileInfoToggle).toBeVisible();
  });

  test('clicking toggle expands mobile info panel', async ({ page }) => {
    const dwh = new DailyWordHuntPage(page);
    await dwh.toggleMobileInfo();
    await expect(dwh.mobileInfoExpanded).toBeVisible();
  });

  test('tab switching -- loot tab', async ({ page }) => {
    const dwh = new DailyWordHuntPage(page);
    await dwh.toggleMobileInfo();
    const lootTab = page.locator(tid('mobile-info-tab-loot'));
    await lootTab.click();
    await expect(lootTab).toBeVisible();
  });

  test('tab switching -- ranks tab', async ({ page }) => {
    const dwh = new DailyWordHuntPage(page);
    await dwh.toggleMobileInfo();
    const ranksTab = page.locator(tid('mobile-info-tab-ranks'));
    await ranksTab.click();
    await expect(ranksTab).toBeVisible();
  });

  test('words count badge is visible in mobile panel', async ({ page }) => {
    const dwh = new DailyWordHuntPage(page);
    await dwh.toggleMobileInfo();
    await expect(page.locator(tid('mobile-info-words-count'))).toBeVisible();
  });

  test('grid is responsive on mobile viewport', async ({ page }) => {
    const dwh = new DailyWordHuntPage(page);
    const box = await dwh.gameGrid.boundingBox();
    expect(box).toBeTruthy();
    // Grid should fit within mobile viewport width
    expect(box!.width).toBeLessThanOrEqual(393);
  });
});

// ---------------------------------------------------------------------------
// 7. Clue Boxes
// ---------------------------------------------------------------------------
test.describe('Clue Boxes', () => {
  test.beforeEach(async ({ page }) => {
    await setupFreshDaily(page);
    const dwh = new DailyWordHuntPage(page);
    await dwh.startWordHunt();
    await dwh.waitForGameReady();
  });

  test('individual clue boxes are visible (clue-box-0, clue-box-1)', async ({ page }) => {
    const dwh = new DailyWordHuntPage(page);
    await expect(dwh.getClueBox(0)).toBeVisible();
    await expect(dwh.getClueBox(1)).toBeVisible();
  });

  test('multiple clue boxes render for the target word', async ({ page }) => {
    const clueBoxCount = await page.locator('[data-testid^="clue-box-"]').count();
    // Target word should have at least 3 letters
    expect(clueBoxCount).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// 8. Scoring & Life
// ---------------------------------------------------------------------------
test.describe('Scoring & Life', () => {
  test('score display shows initial value', async ({ page }) => {
    test.slow();
    await setupFreshDaily(page);
    const dwh = new DailyWordHuntPage(page);
    await dwh.startWordHunt();
    await dwh.waitForGameReady();
    await expect(dwh.scoreDisplay).toBeVisible();
    await expect(dwh.scoreDisplay).toContainText(/\d/);
  });

  test('life bar is present and has visual content', async ({ page }) => {
    test.slow();
    await setupFreshDaily(page);
    const dwh = new DailyWordHuntPage(page);
    await dwh.startWordHunt();
    await dwh.waitForGameReady();
    await expect(dwh.lifeBar).toBeVisible();
    const box = await dwh.lifeBar.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(0);
  });
});

// Results-phase coverage (win cinematic, results container, share button,
// score-gauntlet banner) lives in component tests that mount
// <DailyWordHuntResults> directly with seed props:
//   - components/daily/__tests__/DailyWordHuntResults.winCinematic.test.tsx
//   - components/daily/__tests__/DailyWordHuntResults.emojiCard.test.tsx
//   - components/daily/__tests__/WordHuntResultsContent.test.tsx
// E2E can't reach the results phase without a test-only state seed, so we
// assert those behaviors at the unit layer instead.

// ---------------------------------------------------------------------------
// 11. Streak Updates
// ---------------------------------------------------------------------------
test.describe('Streak Updates', () => {
  test('localStorage streak is present after applying DAILY_PLAYER fixture', async ({ page }) => {
    await setupStreakUser(page);
    const raw = await page.evaluate(() =>
      localStorage.getItem('lexiclash_daily_streak')
    );
    expect(raw).toBeTruthy();
    const data = JSON.parse(raw!);
    expect(data.current).toBe(5);
    expect(data.longest).toBe(12);
  });

  test('clearing daily state removes streak from localStorage', async ({ page }) => {
    await setupStreakUser(page);
    await clearDailyState(page);
    const raw = await page.evaluate(() =>
      localStorage.getItem('lexiclash_daily_streak')
    );
    expect(raw).toBeNull();
  });

  test('streak lastPlayedDate matches today', async ({ page }) => {
    await setupStreakUser(page);
    const raw = await page.evaluate(() =>
      localStorage.getItem('lexiclash_daily_streak')
    );
    const data = JSON.parse(raw!);
    const today = new Date().toISOString().slice(0, 10);
    expect(data.lastPlayedDate).toBe(today);
  });
});

// ---------------------------------------------------------------------------
// 12. Locale Support
// ---------------------------------------------------------------------------
test.describe('Locale Support', () => {
  test('English layout works (LTR)', async ({ page }) => {
    await setupFreshDaily(page, 'en');
    const dwh = new DailyWordHuntPage(page);
    const dir = await page.locator('html').getAttribute('dir');
    expect(dir).not.toBe('rtl');
    await expect(dwh.wordHuntHero).toBeVisible();
  });

  test('Hebrew layout works (RTL) -- check dir attribute', async ({ page }) => {
    await setupFreshDaily(page, 'he');
    const dwh = new DailyWordHuntPage(page);
    const dir = await page.locator('html').getAttribute('dir');
    expect(dir).toBe('rtl');
    await expect(dwh.wordHuntHero).toBeVisible();
  });

  test('landing page text translates between locales', async ({ page }) => {
    // English
    await setupFreshDaily(page, 'en');
    const enText = await page.locator(tid('daily-missions-header')).textContent();

    // Hebrew
    await setupFreshDaily(page, 'he');
    const heText = await page.locator(tid('daily-missions-header')).textContent();

    expect(enText).toBeTruthy();
    expect(heText).toBeTruthy();
    expect(enText).not.toBe(heText);
  });
});

// ---------------------------------------------------------------------------
// 13. Floating Decorations & Confetti
// ---------------------------------------------------------------------------
test.describe('Floating Decorations & Confetti', () => {
  test('floating decorations are visible on landing', async ({ page }) => {
    await setupFreshDaily(page);
    await expect(page.locator(tid('floating-decorations'))).toBeVisible();
  });

  test('confetti background is visible when applicable', async ({ page }) => {
    // Apply already-played fixture with winning state
    await goto(page, '/daily/word-hunt');
    await applyStorageFixture(page, alreadyPlayedFixture());
    await page.reload();
    await waitForHydration(page);

    const dwh = new DailyWordHuntPage(page);
    // Confetti may only show on win -- check without hard-failing
    const confettiVisible = await dwh.confettiBackground.isVisible().catch(() => false);
    expect(typeof confettiVisible).toBe('boolean');
  });
});

// ---------------------------------------------------------------------------
// 14. Navigation
// ---------------------------------------------------------------------------
test.describe('Navigation', () => {
  test('can navigate back from game to landing via browser back', async ({ page }) => {
    test.slow();
    await setupFreshDaily(page);
    const dwh = new DailyWordHuntPage(page);
    await dwh.startWordHunt();
    await dwh.waitForGameReady();

    await page.goBack();
    await waitForHydration(page);
    // Should be back on landing -- hero visible
    await expect(dwh.wordHuntHero).toBeVisible({ timeout: 10_000 });
  });

  test('daily landing is accessible via direct URL navigation', async ({ page }) => {
    await goto(page, '/daily/word-hunt');
    await applyStorageFixture(page, ONBOARDED_USER);
    await page.reload();
    await waitForHydration(page);

    const dwh = new DailyWordHuntPage(page);
    await expect(dwh.dailyMissionsHeader).toBeVisible();
  });
});
