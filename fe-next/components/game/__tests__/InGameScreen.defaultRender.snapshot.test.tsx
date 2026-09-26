/**
 * Default-render lock for the MP round rebuild's opt-in props.
 *
 * ROUND may add default-off props (`mpChrome`, …) to InGameScreen /
 * PortraitLayout / GameHeader. Without the prop, quick-play (solo) and every
 * other caller must render byte-identically. These snapshots were recorded
 * against the files BEFORE any prop was added.
 */
import React from 'react';
import { render, act } from '@testing-library/react';

vi.mock('@/components/GridComponent', () => ({
  default: (p: { interactive?: boolean; animateOnMount?: boolean }) => (
    <div data-testid="grid-component" data-interactive={String(!!p.interactive)} data-animate={String(!!p.animateOnMount)} />
  ),
}));
vi.mock('@/components/RoomChat', () => ({ default: () => <div data-testid="room-chat" /> }));

import InGameScreen from '@/components/game/InGameScreen';
import type { HintsState } from '@/components/game/in-game/types';

const grid = [
  ['C', 'A', 'T', 'S'],
  ['D', 'O', 'G', 'E'],
  ['R', 'A', 'T', 'E'],
  ['B', 'I', 'R', 'D'],
];
const t = (k: string) => k;
const noop = () => {};
const DISABLED_HINTS: HintsState = {
  hint: null,
  hintType: null,
  hintsRemaining: 0,
  isLoading: false,
  error: null,
  isAvailable: false,
  isSinglePlayer: true,
  requestHint: noop,
  clearHint: noop,
};

function snap(ui: React.ReactElement): string {
  const { container, unmount } = render(ui);
  act(() => {});
  const html = container.innerHTML;
  unmount();
  return html;
}

describe('InGameScreen default render (no MP opt-in props)', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
  });
  afterEach(() => vi.restoreAllMocks());

  it('quick-play solo board is unchanged', () => {
    expect(
      snap(
        <InGameScreen
          username="you"
          gameCode="quick"
          isHost={false}
          isPlaying
          gameplayFocusMode
          t={t}
          dir="ltr"
          socket={null}
          letterGrid={grid}
          remainingTime={42}
          timerValue={1}
          gameActive
          showStartAnimation={false}
          gameLanguage="en"
          minWordLength={3}
          comboLevel={0}
          foundWords={[{ word: 'cats', isValid: true, score: 4 }]}
          leaderboard={[{ username: 'you', score: 4 }, { username: 'ghost', score: 2 }]}
          onExitRoom={noop}
          onWordSubmit={noop}
          hints={DISABLED_HINTS}
          gameMode="classic"
          clientAuthoritative
        />,
      ),
    ).toMatchSnapshot();
  });

  it('live MP classic board (legacy caller) is unchanged', () => {
    expect(
      snap(
        <InGameScreen
          username="me"
          gameCode="ABCDEF"
          isHost={false}
          isPlaying
          gameplayFocusMode
          t={t}
          dir="ltr"
          socket={null}
          letterGrid={grid}
          remainingTime={30}
          timerValue={1}
          gameActive
          showStartAnimation={false}
          gameLanguage="en"
          minWordLength={3}
          comboLevel={2}
          foundWords={[]}
          leaderboard={[{ username: 'bot', score: 9 }, { username: 'me', score: 3 }]}
          onExitRoom={noop}
          onWordSubmit={noop}
          gameMode="classic"
        />,
      ),
    ).toMatchSnapshot();
  });
});
