/**
 * Server twin for "Play today's practice round" on the ended-game screen
 * (app/api/education/late-join-practice). sendBeacon first so it survives the
 * navigation to the practice round; keepalive fetch otherwise. Never throws.
 */
export function reportLateJoinPracticeStarted(args: { gameCode: string; door?: 'join_flow' }): void {
  const path = '/api/education/late-join-practice';
  const payload = JSON.stringify({ gameCode: args.gameCode, door: args.door ?? 'join_flow' });
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const sent = navigator.sendBeacon(path, new Blob([payload], { type: 'application/json' }));
      if (sent) return;
    }
    if (typeof fetch !== 'function') return;
    void fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
      credentials: 'same-origin',
    }).catch(() => {});
  } catch {
    /* analytics must never block */
  }
}
