/**
 * Quick Play classic renders the MULTIPLAYER board (InGameScreen via
 * QuickClassicBoard) for EVERY player, not just admins — the whole point of
 * quick play is the MP game run solo, and a live rival race needs the MP board's
 * standings chrome. The legacy single-player board must not be reachable: a dead
 * sibling path is how the two diverge (Class 3).
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuickModeAdapter } from '../QuickModeAdapter';
import type { QuickRoundConfig } from '../../types';

vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => vi.fn(),
}));

const useAuthMock = vi.fn(() => ({ isAdmin: false }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../QuickClassicBoard', () => ({
  __esModule: true,
  default: () => <div data-testid="mp-classic-board" />,
  QuickClassicBoard: () => <div data-testid="mp-classic-board" />,
}));
vi.mock('@/components/singleplayer/SinglePlayerGame', () => ({
  __esModule: true,
  default: () => <div data-testid="legacy-sp-board" />,
}));
const huntProps: { rivals?: Array<{ username: string; score: number }> }[] = [];
vi.mock('@/components/daily/DailyWordHuntSurvival', () => ({
  __esModule: true,
  default: (props: { rivals?: Array<{ username: string; score: number }> }) => {
    huntProps.push(props);
    return <div data-testid="mock-hunt" />;
  },
}));
const wheelProps: { rivals?: Array<{ name: string; score: number }> }[] = [];
vi.mock('@/components/daily/WordWheelGame', () => ({
  __esModule: true,
  default: (props: { rivals?: Array<{ name: string; score: number }> }) => {
    wheelProps.push(props);
    return <div data-testid="mock-wheel" />;
  },
}));
vi.mock('../BlastQuickRound', () => ({
  BlastQuickRound: () => <div data-testid="mock-blast" />,
}));

const config = {
  mode: 'classic',
  seed: 's-mp',
  language: 'en',
  durationSec: 60,
  grid: [['A', 'B'], ['C', 'D']],
  totalWords: 4,
  perfectScore: 50,
} as QuickRoundConfig;

async function renderClassic() {
  const utils = render(<QuickModeAdapter config={config} onDone={vi.fn()} onQuit={vi.fn()} />);
  // QuickClassicBoard is next/dynamic — let the lazy chunk resolve.
  await screen.findByTestId('mp-classic-board');
  return utils;
}

describe('QuickModeAdapter — classic runs the MP board', () => {
  it('renders the MP board for a non-admin player', async () => {
    useAuthMock.mockReturnValue({ isAdmin: false });
    await renderClassic();
    expect(screen.queryByTestId('legacy-sp-board')).not.toBeInTheDocument();
  });

  it('renders the same MP board for an admin — no admin-only fork left', async () => {
    useAuthMock.mockReturnValue({ isAdmin: true });
    await renderClassic();
    expect(screen.queryByTestId('legacy-sp-board')).not.toBeInTheDocument();
  });
});

describe('QuickModeAdapter — wheel races the same ghosts', () => {
  const wheelConfig = {
    ...config,
    mode: 'wheel-rush',
    perfectScore: 200,
    wheel: { centerLetter: 'A', outerLetters: ['B'], allLetters: ['A', 'B'], puzzleDate: '2026-08-15', language: 'en', puzzleNumber: 0 },
    words: ['ab'],
    ghosts: [
      { userId: 'u1', name: 'Ada', customAvatar: null, scorePct: 50 },
      { userId: 'u2', name: 'Bo', customAvatar: null, scorePct: 90 },
    ],
  } as unknown as QuickRoundConfig;

  beforeEach(() => {
    wheelProps.length = 0;
  });

  it('hands the wheel its ghosts instead of letting it fetch the daily board', async () => {
    render(<QuickModeAdapter config={wheelConfig} onDone={vi.fn()} onQuit={vi.fn()} />);
    await screen.findByTestId('mock-wheel');
    const rivals = wheelProps[wheelProps.length - 1].rivals!;
    expect(rivals.map((r) => r.name)).toEqual(['Ada', 'Bo']);
    expect(rivals.map((r) => r.score)).toEqual([100, 180]);
  });

  it('passes no rivals when nobody has played the mode, so the pill stays hidden', async () => {
    render(
      <QuickModeAdapter
        config={{ ...wheelConfig, ghosts: [] } as QuickRoundConfig}
        onDone={vi.fn()}
        onQuit={vi.fn()}
      />
    );
    await screen.findByTestId('mock-wheel');
    expect(wheelProps[wheelProps.length - 1].rivals).toBeUndefined();
  });
});

describe('QuickModeAdapter — word hunt shows the same rivals', () => {
  const huntConfig = {
    ...config,
    mode: 'word-hunt',
    perfectScore: 200,
    targetWord: 'CAB',
    ghosts: [
      { userId: 'u1', name: 'Ada', customAvatar: null, scorePct: 50 },
      { userId: 'u2', name: 'Bo', customAvatar: null, scorePct: 90 },
    ],
  } as unknown as QuickRoundConfig;

  beforeEach(() => {
    huntProps.length = 0;
  });

  it('hands survival the rivals to stand against', async () => {
    render(<QuickModeAdapter config={huntConfig} onDone={vi.fn()} onQuit={vi.fn()} />);
    await screen.findByTestId('mock-hunt');
    const rivals = huntProps[huntProps.length - 1].rivals!;
    expect(rivals).toEqual([
      { username: 'Ada', score: 100 },
      { username: 'Bo', score: 180 },
    ]);
  });

  it('passes nothing when there are no ghosts, so the header stays as it was', async () => {
    render(
      <QuickModeAdapter
        config={{ ...huntConfig, ghosts: [] } as QuickRoundConfig}
        onDone={vi.fn()}
        onQuit={vi.fn()}
      />
    );
    await screen.findByTestId('mock-hunt');
    expect(huntProps[huntProps.length - 1].rivals).toBeUndefined();
  });
});
