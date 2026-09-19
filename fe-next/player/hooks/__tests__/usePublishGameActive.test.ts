/**
 * The page reads "is a round being played?" from the STORE (`useGameActive`) to
 * hide the classroom 'Game Settings' banner. PlayerView kept its own local
 * `gameActive` and, on a normal first join, never wrote the store (only the
 * late-join / reconnect branches did). So during play the banner stayed up,
 * pushed the board down and covered the StudentRankRail — recurring-pitfall
 * Class 1, one value in two places. PlayerView now publishes its flag.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderHook, act } from '@testing-library/react';
import { useGameStore } from '@/hooks/gameState/store';
import { usePublishGameActive } from '../usePublishGameActive';

describe('usePublishGameActive', () => {
  beforeEach(() => {
    act(() => useGameStore.setState({ gameActive: false }));
  });

  it('writes the player round flag to the store and clears it when play stops', () => {
    // GIVEN a player whose countdown just finished
    const { rerender, unmount } = renderHook(({ active }) => usePublishGameActive(active), {
      initialProps: { active: true },
    });
    // THEN the page sees a live round
    expect(useGameStore.getState().gameActive).toBe(true);

    // WHEN the round ends
    rerender({ active: false });
    expect(useGameStore.getState().gameActive).toBe(false);

    // AND leaving the room never leaves a stale `true` behind
    rerender({ active: true });
    unmount();
    expect(useGameStore.getState().gameActive).toBe(false);
  });

  it('is wired into PlayerView with its local round flag', () => {
    const source = readFileSync(resolve(__dirname, '../../PlayerView.tsx'), 'utf8');
    expect(source).toMatch(/usePublishGameActive\(gameActive\)/);
  });
});
