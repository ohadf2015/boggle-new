import React from 'react';
import { render } from '@testing-library/react';

const { coachArgs } = vi.hoisted(() => ({ coachArgs: [] as Array<{ active: boolean }> }));

vi.mock('@/hooks/useStuckCoach', () => ({
  useStuckCoach: (args: { active: boolean }) => {
    coachArgs.push(args);
    const noop = () => {};
    return { mode: 'classic', stage: 'none', visible: false, exampleWord: null, dismiss: noop, markActivity: noop, markTap: noop, markDragStart: noop, markSubmit: noop };
  },
}));
vi.mock('@/components/GridComponent', () => ({ default: () => <div data-testid="grid-component" /> }));
vi.mock('@/components/RoomChat', () => ({ default: () => null }));

import InGameScreen from '@/components/game/InGameScreen';

const grid = [
  ['C', 'A', 'T', 'S'],
  ['D', 'O', 'G', 'E'],
  ['R', 'A', 'T', 'E'],
  ['B', 'I', 'R', 'D'],
];

function props(over: Partial<React.ComponentProps<typeof InGameScreen>> = {}) {
  return {
    username: 'me',
    gameCode: 'ABCDEF',
    isPlaying: true,
    t: (k: string) => k,
    dir: 'ltr' as const,
    socket: null,
    letterGrid: grid,
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
    ...over,
  } as React.ComponentProps<typeof InGameScreen>;
}

describe('InGameScreen stuck coach owner', () => {
  beforeEach(() => {
    coachArgs.length = 0;
  });

  it('arms the stuck coach in a real multiplayer round', () => {
    render(<InGameScreen {...props()} />);
    expect(coachArgs.at(-1)?.active).toBe(true);
  });

  it('stays off outside the classic mode', () => {
    render(<InGameScreen {...props({ gameMode: 'blast' as never })} />);
    expect(coachArgs.every((a) => a.active === false)).toBe(true);
  });

  it('stays off on the Quick Play board, which shows its own coach hint', () => {
    render(<InGameScreen {...props({ clientAuthoritative: true })} />);
    expect(coachArgs.every((a) => a.active === false)).toBe(true);
  });
});
