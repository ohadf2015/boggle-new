import { test, expect, type Browser } from '@playwright/test';
import { MultiplayerPage } from './pages/MultiplayerPage';
import { open, randomUsername, type Locale } from './helpers/test-utils';
import { applyStorageFixture, ONBOARDED_USER } from './helpers/storage-fixtures';
import { recordSocketEvents, topLeaderboardScore } from './helpers/socket-events';

/**
 * Covers the product's only critical path end to end: create room -> second
 * player joins via invite code -> board generates -> a real word is dragged
 * in and scored -> the round ends. This is the flow every real user hits in
 * their first session; previously nothing exercised word submission/scoring
 * across two browser contexts.
 */

/** Create a new browser context with onboarding skipped, on the multiplayer page */
async function createOnboardedContext(browser: Browser, locale: Locale = 'en') {
  const context = await browser.newContext();
  const page = await context.newPage();
  const events = recordSocketEvents(page);
  await open(page, '/multiplayer', locale);
  await applyStorageFixture(page, ONBOARDED_USER);
  await open(page, '/multiplayer', locale);
  const mp = new MultiplayerPage(page);
  await mp.waitForEntryReady();
  return { context, page, events, mp };
}

const ROUND_TRIP_LOCALES: { locale: Locale; language: string }[] = [
  { locale: 'en', language: 'en' },
  { locale: 'he', language: 'he' },
];

test.describe('Multiplayer round trip', () => {
  test.slow();

  for (const { locale, language } of ROUND_TRIP_LOCALES) {
    test(`${locale}: create room -> join -> submit real word -> scored for both players -> round ends`, async ({
      browser,
      baseURL,
    }) => {
      test.setTimeout(150_000);

      const host = await createOnboardedContext(browser, locale);
      const hostName = randomUsername('Host');
      await host.mp.createRoom(hostName);
      const gameCode = await host.mp.waitForHostLobby();
      await host.mp.selectClassicMode();

      // Second player joins via the invite code/link.
      const player = await createOnboardedContext(browser, locale);
      await player.mp.joinByInvite(locale, gameCode, randomUsername('Player'));
      await host.mp.waitForPlayerCount(2);

      // Host starts the round; the board generates for both players.
      await host.mp.startGameButton.click();
      await host.mp.waitForGameStart();
      await player.mp.waitForGameStart();

      // Submit a real, board-verified word by dragging across the host's grid.
      const word = await host.mp.submitRealWord(baseURL!, language);

      // Scoring round-trips through the server: the submitter's word list has it,
      // and the leaderboard BOTH players receive carries the new score.
      await expect(host.mp.wordLadderRow(word)).toBeVisible({ timeout: 10_000 });
      await expect.poll(() => topLeaderboardScore(host.events), { timeout: 10_000 }).toBeGreaterThan(0);
      await expect.poll(() => topLeaderboardScore(player.events), { timeout: 10_000 }).toBeGreaterThan(0);

      // Round ends and both players leave the grid for the results screen.
      await expect(host.mp.gameGrid).toBeHidden({ timeout: 120_000 });
      await expect(player.mp.gameGrid).toBeHidden({ timeout: 120_000 });

      await host.context.close();
      await player.context.close();
    });
  }
});
