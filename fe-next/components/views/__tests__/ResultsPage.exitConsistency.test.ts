import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * ResultsPage — exit-button placement contract.
 *
 * The exit (DoorOpen) button must sit on the START edge (left in LTR) to match
 * the in-game header (GameHeader / PortraitLayout), so it does NOT jump from
 * one side to the other on the game→results transition. Both the desktop and
 * mobile results headers render `<ExitRoomButton onClick={handleExitRoom} ...>`
 * and each must live in a `justify-start` container.
 */
const source = readFileSync(
  resolve(__dirname, '../ResultsPage.tsx'),
  'utf8',
);

describe('ResultsPage exit-button placement', () => {
  it('renders the exit button on both the desktop and mobile headers', () => {
    const matches = source.match(/<ExitRoomButton onClick=\{handleExitRoom\}/g) ?? [];
    expect(matches.length).toBe(2);
  });

  it('places every exit button in a justify-start container (consistent with in-game)', () => {
    const segments = source.split('<ExitRoomButton onClick={handleExitRoom}');
    // segments[0] is everything before the first button; each subsequent split
    // boundary is preceded by that button's wrapper. Check the wrapper that
    // immediately precedes each button.
    for (let i = 1; i < segments.length; i++) {
      const before = segments[i - 1].slice(-260);
      expect(before).toMatch(/justify-start/);
      expect(before).not.toMatch(/justify-end/);
    }
  });
});
