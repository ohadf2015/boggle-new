import { test, expect, type Browser, type Page } from '@playwright/test';
import { MultiplayerPage } from './pages/MultiplayerPage';
import { goto, randomUsername, waitForHydration } from './helpers/test-utils';
import { applyStorageFixture, ONBOARDED_USER } from './helpers/storage-fixtures';

/** Collects every Socket.IO event name + payload the page receives over websocket. */
function recordSocketEvents(page: Page): Array<{ event: string; data: unknown }> {
  const events: Array<{ event: string; data: unknown }> = [];
  page.on('websocket', (ws) => {
    ws.on('framereceived', ({ payload }) => {
      const text = typeof payload === 'string' ? payload : payload.toString('utf8');
      const match = /^42(?:\/[^,]*,)?(\[.*\])$/s.exec(text);
      if (!match) return;
      try {
        const [event, data] = JSON.parse(match[1]) as [string, unknown];
        events.push({ event, data });
      } catch {
        // binary or partial frame
      }
    });
  });
  return events;
}

async function createOnboardedContext(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const events = recordSocketEvents(page);
  await goto(page, '/multiplayer', 'en');
  await applyStorageFixture(page, ONBOARDED_USER);
  await goto(page, '/multiplayer', 'en');
  await waitForHydration(page);
  return { context, page, events, mp: new MultiplayerPage(page) };
}

test.describe('Multiplayer live achievements', () => {
  test.slow();

  test('first valid word in a room unlocks FIRST_BLOOD for the submitter only', async ({ browser, baseURL }) => {
    test.setTimeout(150_000);

    const host = await createOnboardedContext(browser);
    await host.mp.createRoom(randomUsername('Host'));
    await expect(host.mp.waitingStatus).toBeVisible({ timeout: 10_000 });
    const gameCode = host.page.url().split('/').pop() || '';
    expect(gameCode).toBeTruthy();

    const player = await createOnboardedContext(browser);
    await goto(player.page, `/join/${gameCode}`, 'en');
    await waitForHydration(player.page);
    if (await player.mp.joinNameInput.isVisible().catch(() => false)) {
      await player.mp.joinRoom(randomUsername('Player'));
    }
    await expect(player.mp.waitingStatus).toBeVisible({ timeout: 10_000 });

    await host.mp.startGameButton.click();
    await host.mp.waitForGameStart();
    await player.mp.waitForGameStart();

    const word = await host.mp.submitRealWord(baseURL!, 'en');
    await expect(host.mp.wordLadderRow(word)).toBeVisible({ timeout: 10_000 });

    const unlockedKeys = (events: typeof host.events) =>
      events
        .filter((e) => e.event === 'liveAchievementUnlocked')
        .flatMap((e) => ((e.data as { achievements?: Array<{ key: string }> })?.achievements ?? []).map((a) => a.key));

    await expect.poll(() => unlockedKeys(host.events), { timeout: 10_000 }).toContain('FIRST_BLOOD');
    expect(unlockedKeys(player.events)).not.toContain('FIRST_BLOOD');

    await host.context.close();
    await player.context.close();
  });
});
