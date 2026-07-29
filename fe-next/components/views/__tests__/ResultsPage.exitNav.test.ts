import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * ResultsPage — exit navigation contract (native-safe).
 *
 * The old exit did `window.location.href = exitHref` inside a setTimeout. That is
 * a HARD navigation to an app route, which blanks the Capacitor static-export
 * WebView (no server resolves the route). The fix:
 *   - non-classroom exit: reset multiplayer state IN PLACE via an `onExitToLobby`
 *     callback (the proven host-left-grace-modal pattern — no reload, no blank).
 *   - classroom exit: `router.replace(/education)` — a client-side nav the SPA
 *     router resolves in-memory (safe in native).
 *
 * No `window.location.href` hard navigation may remain in confirmExitRoom.
 */
const source = readFileSync(
  resolve(__dirname, '../ResultsPage.tsx'),
  'utf8',
);

const confirmBody = (() => {
  const start = source.indexOf('const confirmExitRoom');
  expect(start).toBeGreaterThan(-1);
  // Slice to the next handler/decl so the whole body is covered.
  const after = source.indexOf('useDeferredValue', start);
  return source.slice(start, after > start ? after : start + 2200);
})();

describe('ResultsPage exit navigation (native-safe)', () => {
  it('no longer hard-navigates via window.location.href in confirmExitRoom', () => {
    expect(confirmBody).not.toMatch(/window\.location\.href\s*=/);
  });

  it('accepts an onExitToLobby callback prop', () => {
    expect(source).toMatch(/onExitToLobby/);
  });

  it('resets to lobby in place (onExitToLobby) for the normal exit', () => {
    expect(confirmBody).toMatch(/onExitToLobby/);
  });

  it('uses client-side router.replace for the classroom exit route', () => {
    expect(confirmBody).toMatch(/router\.replace/);
  });
});
