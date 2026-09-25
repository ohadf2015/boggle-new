import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Bug: the multiplayer route (lobby, host and player views) starts music beds
 * (lobby / beforeGame / inGame via useGameMusic and usePlayerMusic) but nothing
 * in the live tree ever called stopMusic — the only stops sat in HostView's
 * intentional-exit path, which browser-back / SPA nav to another route never
 * hits. So the in-game or lobby bed looped on the hub and every page after,
 * the same class of leak the Word Hunt fix closed in DailyChallenge
 * (7e3947017b).
 *
 * Fix: PageClient — the route-level component that stays mounted across
 * lobby → game → results — stops the music on unmount. Internal phase changes
 * never unmount it, so gameplay music is unaffected.
 *
 * Source-contract style (matches PageClient.exitToLobbyLeaveRoom.test).
 */
const source = readFileSync(resolve(__dirname, '../PageClient.tsx'), 'utf8');

describe('PageClient — music stops when leaving the multiplayer route', () => {
  it('destructures stopMusic from useMusic', () => {
    expect(source).toMatch(/const\s*{\s*[^}]*stopMusic[^}]*}\s*=\s*useMusic\(\)/);
  });

  it('stops the music on unmount with a 500ms fade (mirrors DailyChallenge)', () => {
    expect(source).toMatch(/useEffect\(\s*\(\s*\)\s*=>\s*\(\s*\)\s*=>\s*stopMusic\(500\)/);
  });
});
