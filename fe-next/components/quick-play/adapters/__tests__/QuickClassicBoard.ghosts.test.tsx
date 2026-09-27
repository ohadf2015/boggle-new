/**
 * A quick classic round is a race, not a solo score screen: the MP board's
 * standings chrome (mobile rank rail, live leaderboard, closest-rivals gap) all
 * switch on at leaderboard.length > 1, so the ghosts have to arrive as extra
 * leaderboard rows that climb with the clock.
 */
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuickClassicBoard } from '../QuickClassicBoard';
import type { QuickRoundConfig } from '../../types';

type Row = { username: string; score: number };
const captured: { leaderboard: Row[]; username: string }[] = [];

let coreState = { score: 0, remainingTime: 60 };

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr' }),
}));

vi.mock('@/components/singleplayer/game/hooks/useSinglePlayerCore', () => ({
  useSinglePlayerCore: () => ({
    grid: [['A', 'B'], ['C', 'D']],
    score: coreState.score,
    foundWords: [],
    isPaused: false,
    isGameOver: false,
    timer: { remainingTime: coreState.remainingTime },
    combo: { comboLevelRef: { current: 0 } },
    fireRoundActive: false,
    fireRoundRemaining: 0,
    earthquakeState: null,
    handleWordSubmit: vi.fn(),
  }),
}));

vi.mock('@/components/game/InGameScreen', () => ({
  __esModule: true,
  default: (props: { leaderboard: Row[]; username: string }) => {
    captured.push({ leaderboard: props.leaderboard, username: props.username });
    return <div data-testid="in-game-screen" />;
  },
}));

const config = {
  mode: 'classic',
  seed: 's-ghost',
  language: 'en',
  durationSec: 60,
  grid: [['A', 'B'], ['C', 'D']],
  totalWords: 20,
  perfectScore: 200,
  ghosts: [
    { userId: 'u1', name: 'Ada', customAvatar: null, scorePct: 50 },
    { userId: 'u2', name: 'Bo', customAvatar: null, scorePct: 90 },
  ],
} as QuickRoundConfig;

function lastBoard() {
  return captured[captured.length - 1];
}

describe('QuickClassicBoard — ghost rivals', () => {
  beforeEach(() => {
    captured.length = 0;
    coreState = { score: 0, remainingTime: 60 };
  });

  it('feeds the MP board a multi-row leaderboard so the race chrome unlocks', () => {
    render(<QuickClassicBoard config={config} onDone={vi.fn()} onQuit={vi.fn()} />);
    const { leaderboard, username } = lastBoard();
    expect(leaderboard.length).toBe(3);
    expect(leaderboard.map((r) => r.username)).toContain(username);
    expect(leaderboard.map((r) => r.username)).toEqual(expect.arrayContaining(['Ada', 'Bo']));
  });

  it('starts the rivals at zero — nobody has banked a score at kickoff', () => {
    render(<QuickClassicBoard config={config} onDone={vi.fn()} onQuit={vi.fn()} />);
    const rivals = lastBoard().leaderboard.filter((r) => r.username !== lastBoard().username);
    expect(rivals.every((r) => r.score === 0)).toBe(true);
  });

  it('climbs the rivals as the clock runs down', () => {
    const { rerender } = render(
      <QuickClassicBoard config={config} onDone={vi.fn()} onQuit={vi.fn()} />
    );
    coreState = { score: 10, remainingTime: 30 };
    rerender(<QuickClassicBoard config={config} onDone={vi.fn()} onQuit={vi.fn()} />);
    const mid = lastBoard().leaderboard.find((r) => r.username === 'Bo')!.score;

    coreState = { score: 20, remainingTime: 0 };
    rerender(<QuickClassicBoard config={config} onDone={vi.fn()} onQuit={vi.fn()} />);
    const end = lastBoard().leaderboard.find((r) => r.username === 'Bo')!.score;

    expect(mid).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(mid);
    // 90% of a 200-point board at full time.
    expect(end).toBe(180);
  });

  it('carries my own live score on my row', () => {
    coreState = { score: 77, remainingTime: 30 };
    render(<QuickClassicBoard config={config} onDone={vi.fn()} onQuit={vi.fn()} />);
    const { leaderboard, username } = lastBoard();
    expect(leaderboard.find((r) => r.username === username)!.score).toBe(77);
  });

  it('falls back to the solo single-row board when nobody has played the mode', () => {
    render(
      <QuickClassicBoard
        config={{ ...config, ghosts: [] } as QuickRoundConfig}
        onDone={vi.fn()}
        onQuit={vi.fn()}
      />
    );
    expect(lastBoard().leaderboard.length).toBe(1);
  });
});
