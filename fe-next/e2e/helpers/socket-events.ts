import type { Page } from '@playwright/test';

export type SocketEvent = { event: string; data: unknown };

/** Collects every Socket.IO event name and payload the page receives over its websocket. */
export function recordSocketEvents(page: Page): SocketEvent[] {
  const events: SocketEvent[] = [];
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

export function unlockedAchievementKeys(events: SocketEvent[]): string[] {
  return events
    .filter((e) => e.event === 'liveAchievementUnlocked')
    .flatMap((e) => ((e.data as { achievements?: Array<{ key: string }> })?.achievements ?? []).map((a) => a.key));
}

/** Highest score any player holds in the latest leaderboard broadcast this page received */
export function topLeaderboardScore(events: SocketEvent[]): number {
  const boards = events.filter((e) => e.event === 'updateLeaderboard');
  const last = boards[boards.length - 1]?.data as { leaderboard?: Array<{ score?: number }> } | Array<{ score?: number }> | undefined;
  const rows = Array.isArray(last) ? last : last?.leaderboard ?? [];
  return rows.reduce((max, r) => Math.max(max, r.score ?? 0), 0);
}
