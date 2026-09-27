import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Bug: SinglePlayerView fades in BOSSA for the results phase (via useGameMusic
 * phase 'results') but never stopped music on unmount. Leaving /singleplayer
 * after a game — browser back, header nav, link to the hub — left the results
 * bed looping on every page after. Same leak class the Word Hunt fix closed in
 * DailyChallenge (7e3947017b).
 *
 * Fix: stopMusic(500) in an unmount effect, mirroring DailyChallenge.
 *
 * Source-contract style (matches PageClient.musicStopOnLeave.test).
 */
const source = readFileSync(resolve(__dirname, '../SinglePlayerView.tsx'), 'utf8');

describe('SinglePlayerView — music stops when leaving the route', () => {
  it('destructures stopMusic from useMusic', () => {
    expect(source).toMatch(/const\s*{\s*[^}]*stopMusic[^}]*}\s*=\s*useMusic\(\)/);
  });

  it('stops the music on unmount with a 500ms fade (mirrors DailyChallenge)', () => {
    expect(source).toMatch(/useEffect\(\s*\(\s*\)\s*=>\s*\(\s*\)\s*=>\s*stopMusic\(500\)/);
  });
});
