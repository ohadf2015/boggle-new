import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * MP results — exit navigation contract, native-safe (moved from
 * components/views/__tests__/ResultsPage.exitNav.test.ts).
 *
 * The old exit did `window.location.href = exitHref`, a HARD navigation that
 * blanks the Capacitor static-export WebView. ResultsPage then reset in place
 * via `onExitToLobby` and used `router.replace(/education)` for the classroom.
 * Under the MP rebuild rule (FOUNDATION), no MP screen navigates itself: every
 * way out is `useMpExit()(reason)`. The page's exit (useMpPageState.exitMp →
 * handleExitToLobby) owns the leaveRoom emit, the in-place reset and the
 * classroom hub route. So the contract becomes:
 *   - confirmExitRoom never hard-navigates and never routes by itself;
 *   - it exits through useMpExit with the in-room reason 'leave-room'.
 */
const source = readFileSync(resolve(__dirname, '../useMpResultsController.ts'), 'utf8');

const confirmBody = (() => {
  const start = source.indexOf('const confirmExitRoom');
  expect(start).toBeGreaterThan(-1);
  const after = source.indexOf('useDeferredValue', start);
  return source.slice(start, after > start ? after : start + 1200);
})();

describe('MP results exit navigation (native-safe)', () => {
  it('never hard-navigates via window.location in confirmExitRoom', () => {
    expect(confirmBody).not.toMatch(/window\.location\.(href\s*=|assign\(|replace\()/);
  });

  it('never routes by itself (no router.push/replace) — the page exit owns the destination', () => {
    expect(confirmBody).not.toMatch(/router\.(push|replace)\(/);
  });

  it('exits through useMpExit with the in-room reason', () => {
    expect(source).toMatch(/useMpExit\(\)/);
    expect(confirmBody).toMatch(/mpExit\('leave-room'\)/);
  });

  it('clears the lesson payload so a later reload cannot restage it', () => {
    expect(confirmBody).toMatch(/sessionStorage\.removeItem\('lessonGameData'\)/);
  });
});
