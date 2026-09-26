/**
 * `mpChrome` (default off): the live MP round owns its HUD (MpHudBar timer /
 * score / rank, roster strip, callouts) in a SIBLING subtree, so InGameScreen
 * renders only the play surface — word pill + board. Also perf rule 4: a timer
 * tick or a leaderboard update causes ZERO board re-renders.
 */
import React from 'react';
import { render, act, screen } from '@testing-library/react';

const { gridRenders, gridProps } = vi.hoisted(() => ({
  gridRenders: { count: 0 },
  gridProps: { last: null as Record<string, unknown> | null, animated: [] as unknown[] },
}));

vi.mock('@/components/GridComponent', async () => {
  const R = await import('react');
  const Grid = R.memo((props: Record<string, unknown>) => {
    gridRenders.count += 1;
    gridProps.last = props;
    gridProps.animated.push(props.animateOnMount);
    return R.createElement('div', { 'data-testid': 'grid-component' });
  });
  return { default: Grid };
});
vi.mock('@/components/RoomChat', () => ({ default: () => null }));
const { leadSounds } = vi.hoisted(() => ({ leadSounds: { milestone: vi.fn(), brk: vi.fn() } }));
vi.mock('@/hooks/useLeadChangeDetection', () => ({
  useLeadChangeDetection: () => ({ type: 'took-lead', id: 1 }),
}));
vi.mock('@/contexts/SoundEffectsContext', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const noop = () => {};
  const api = new Proxy({}, { get: (_t, k) => (k === 'playComboMilestoneSound' ? leadSounds.milestone : k === 'playComboBreakSound' ? leadSounds.brk : noop) });
  return { ...actual, useSoundEffects: () => api };
});

import InGameScreen from '@/components/game/InGameScreen';

const grid = [
  ['C', 'A', 'T', 'S'],
  ['D', 'O', 'G', 'E'],
  ['R', 'A', 'T', 'E'],
  ['B', 'I', 'R', 'D'],
];
const t = (k: string) => k;
const noop = () => {};

function props(over: Partial<React.ComponentProps<typeof InGameScreen>> = {}) {
  return {
    username: 'me',
    gameCode: 'ABCDEF',
    isHost: false,
    isPlaying: true,
    t,
    dir: 'ltr' as const,
    socket: null,
    letterGrid: grid,
    remainingTime: 60,
    timerValue: 1,
    gameActive: true,
    showStartAnimation: false,
    gameLanguage: 'en' as const,
    minWordLength: 3,
    comboLevel: 0,
    foundWords: [],
    leaderboard: [
      { username: 'me', score: 0 },
      { username: 'bot', score: 0 },
    ],
    onExitRoom: noop,
    onWordSubmit: noop,
    gameplayFocusMode: true,
    gameMode: 'classic' as const,
    mpChrome: true,
    ...over,
  } as React.ComponentProps<typeof InGameScreen>;
}

describe('InGameScreen mpChrome — play surface only', () => {
  beforeEach(() => {
    gridRenders.count = 0;
    gridProps.last = null;
    gridProps.animated = [];
  });

  it('drops the legacy HUD (timer, score, rank rail, header exit) but keeps the board', () => {
    render(<InGameScreen {...props()} />);
    expect(screen.getByTestId('grid-component')).toBeInTheDocument();
    for (const id of ['stats-row', 'timer-container', 'score-mobile', 'combo-row-mobile', 'combo-desktop', 'mobile-rival-chip', 'leaderboard-you-status']) {
      expect(screen.queryByTestId(id)).toBeNull();
    }
    expect(screen.queryByRole('button', { name: 'playerView.exit' })).toBeNull();
  });

  it('anchors word pill + board together at the bottom (thumb zone; the space above is the callout stage)', () => {
    render(<InGameScreen {...props()} />);
    const gridContainer = screen.getByTestId('grid-container');
    expect(gridContainer.className).not.toMatch(/(^|\s)flex-1(\s|$)/);
    expect(gridContainer.parentElement!.className).toContain('justify-end');
  });

  it('never replays the tile entrance behind the countdown (the round owns the GO drop)', () => {
    render(<InGameScreen {...props()} />);
    act(() => {});
    expect(gridProps.animated.length).toBeGreaterThan(0);
    expect(gridProps.animated.every((v) => v === false)).toBe(true);
  });

  it('lead changes sound ONCE: the round juice owns the lead-change cue under mpChrome', () => {
    leadSounds.milestone.mockClear();
    leadSounds.brk.mockClear();
    render(<InGameScreen {...props()} />);
    expect(leadSounds.milestone).not.toHaveBeenCalled();
    expect(leadSounds.brk).not.toHaveBeenCalled();
  });

  it('a timer tick does not re-render the board', () => {
    const { rerender } = render(<InGameScreen {...props()} />);
    act(() => {});
    const settled = gridRenders.count;
    for (let s = 59; s >= 50; s--) rerender(<InGameScreen {...props({ remainingTime: s })} />);
    expect(gridRenders.count).toBe(settled);
  });

  it('a leaderboard update does not re-render the board', () => {
    const { rerender } = render(<InGameScreen {...props()} />);
    act(() => {});
    const settled = gridRenders.count;
    rerender(<InGameScreen {...props({ leaderboard: [{ username: 'bot', score: 12 }, { username: 'me', score: 0 }] })} />);
    rerender(<InGameScreen {...props({ leaderboard: [{ username: 'bot', score: 20 }, { username: 'me', score: 5 }] })} />);
    expect(gridRenders.count).toBe(settled);
  });
});
