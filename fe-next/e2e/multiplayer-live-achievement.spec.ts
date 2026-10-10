import { test, expect, type Browser, type Page } from '@playwright/test';
import { MultiplayerPage } from './pages/MultiplayerPage';
import { open, randomUsername } from './helpers/test-utils';
import { applyStorageFixture, ONBOARDED_USER } from './helpers/storage-fixtures';

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
  await open(page, '/multiplayer', 'en');
  await applyStorageFixture(page, ONBOARDED_USER);
  await open(page, '/multiplayer', 'en');
  const mp = new MultiplayerPage(page);
  await mp.waitForEntryReady();
  return { context, page, events, mp };
}

function unlockedKeys(events: Array<{ event: string; data: unknown }>): string[] {
  return events
    .filter((e) => e.event === 'liveAchievementUnlocked')
    .flatMap((e) => ((e.data as { achievements?: Array<{ key: string }> })?.achievements ?? []).map((a) => a.key));
}

test.describe('Multiplayer live achievements', () => {
  test.slow();

  test('first valid word in a classic room unlocks FIRST_BLOOD for the submitter only', async ({ browser, baseURL }) => {
    test.setTimeout(150_000);

    const host = await createOnboardedContext(browser);
    await host.mp.createRoom(randomUsername('Host'));
    const gameCode = await host.mp.waitForHostLobby();
    await host.mp.selectClassicMode();

    const player = await createOnboardedContext(browser);
    await player.mp.joinByInvite('en', gameCode, randomUsername('Player'));
    await host.mp.waitForPlayerCount(2);

    await host.mp.startGameButton.click();
    await host.mp.waitForGameStart();
    await player.mp.waitForGameStart();

    const word = await host.mp.submitRealWord(baseURL!, 'en');
    await expect(host.mp.wordLadderRow(word)).toBeVisible({ timeout: 10_000 });

    await expect.poll(() => unlockedKeys(host.events), { timeout: 10_000 }).toContain('FIRST_BLOOD');
    expect(unlockedKeys(player.events)).not.toContain('FIRST_BLOOD');

    await host.context.close();
    await player.context.close();
  });
});
