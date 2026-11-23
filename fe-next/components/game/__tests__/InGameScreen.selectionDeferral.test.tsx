import React from 'react';
import { render } from '@testing-library/react';
import { resetSelection, useSelectionStore } from '@/hooks/useSelectionStore';

const grid = vi.hoisted(() => ({ onWordChange: null as null | ((word: string, count: number) => void) }));

vi.mock('@/components/GridComponent', () => ({
  default: (p: { onWordChange?: (word: string, count: number) => void }) => {
    grid.onWordChange = p.onWordChange ?? null;
    return <div data-testid="grid-component" />;
  },
}));
vi.mock('@/components/RoomChat', () => ({ default: () => null }));

import InGameScreen from '@/components/game/InGameScreen';

const letters = [
  ['C', 'A', 'T', 'S'],
  ['D', 'O', 'G', 'E'],
  ['R', 'A', 'T', 'E'],
  ['B', 'I', 'R', 'D'],
];

const props = {
  username: 'me',
  gameCode: 'ABCDEF',
  isPlaying: true,
  t: (k: string) => k,
  dir: 'ltr' as const,
  socket: null,
  letterGrid: letters,
  remainingTime: 60,
  gameActive: true,
  showStartAnimation: false,
  gameLanguage: 'en' as const,
  minWordLength: 3,
  comboLevel: 0,
  foundWords: [],
  leaderboard: [{ username: 'me', score: 0 }],
  onExitRoom: () => {},
  onWordSubmit: () => {},
  gameMode: 'classic' as const,
} as unknown as React.ComponentProps<typeof InGameScreen>;

describe('InGameScreen tile selection', () => {
  beforeEach(() => resetSelection());
  afterEach(() => vi.useRealTimers());

  it('given a tile tap, when the board reports the path, then the word pill updates only after the board has painted', () => {
    render(<InGameScreen {...props} />);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] });

    grid.onWordChange?.('C', 1);
    expect(useSelectionStore.getState().letterCount).toBe(0);

    vi.advanceTimersToNextFrame();
    vi.runOnlyPendingTimers();
    expect(useSelectionStore.getState()).toMatchObject({ formedWord: 'C', letterCount: 1 });
  });
});
