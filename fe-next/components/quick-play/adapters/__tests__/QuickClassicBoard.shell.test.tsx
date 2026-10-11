import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuickClassicBoard } from '../QuickClassicBoard';
import type { QuickRoundConfig } from '../../types';

const boardProps: Array<Record<string, unknown>> = [];

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr' }),
}));

vi.mock('@/components/singleplayer/game/hooks/useSinglePlayerCore', () => ({
  useSinglePlayerCore: () => ({
    grid: [['A', 'B'], ['C', 'D']],
    score: 30,
    foundWords: [
      { word: 'cab', score: 10, timestamp: 1, timeSinceStart: 1, isValid: true },
      { word: 'xq', score: 0, timestamp: 2, timeSinceStart: 2, isValid: false },
      { word: 'bead', score: 20, timestamp: 3, timeSinceStart: 3, isValid: true },
    ],
    isPaused: false,
    isGameOver: false,
    timer: { remainingTime: 42 },
    combo: { comboLevelRef: { current: 0 } },
    fireRoundActive: false,
    fireRoundRemaining: 0,
    earthquakeState: null,
    handleWordSubmit: vi.fn(),
  }),
}));

vi.mock('@/components/game/InGameScreen', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    boardProps.push(props);
    return <div data-testid="in-game-screen" />;
  },
}));

const config = {
  mode: 'classic',
  seed: 's-shell',
  language: 'en',
  durationSec: 60,
  grid: [['A', 'B'], ['C', 'D']],
  totalWords: 20,
  perfectScore: 200,
  ghosts: [{ userId: 'u1', name: 'Ada', customAvatar: null, scorePct: 50 }],
} as QuickRoundConfig;

function setViewport(desktop: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: desktop,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe('QuickClassicBoard — desktop shell', () => {
  beforeEach(() => {
    boardProps.length = 0;
    setViewport(true);
  });

  it('given a round, then the board sits in the shared shell and drops its own side columns', () => {
    render(<QuickClassicBoard config={config} onDone={vi.fn()} onQuit={vi.fn()} />);
    expect(screen.getByTestId('game-shell').getAttribute('data-game-shell')).toBe('quick-classic');
    expect(within(screen.getByTestId('game-shell-stage')).getByTestId('in-game-screen')).toBeInTheDocument();
    expect(boardProps.at(-1)?.inDesktopShell).toBe(true);
  });

  it('given a phone, then the board keeps its own clock because there are no rails', () => {
    setViewport(false);
    render(<QuickClassicBoard config={config} onDone={vi.fn()} onQuit={vi.fn()} />);
    expect(boardProps.at(-1)?.inDesktopShell).toBe(false);
  });

  it('given ghosts, then the start rail carries the clock, the race and the keyboard card', () => {
    render(<QuickClassicBoard config={config} onDone={vi.fn()} onQuit={vi.fn()} />);
    const left = within(screen.getByTestId('game-shell-left'));
    expect(left.getByTestId('shell-clock-value').textContent).toBe('0:42');
    expect(left.getByTestId('shell-standings')).toBeInTheDocument();
    expect(left.getByTestId('shell-keys')).toBeInTheDocument();
  });

  it('given found words, then the end rail lists only valid ones, newest first', () => {
    render(<QuickClassicBoard config={config} onDone={vi.fn()} onQuit={vi.fn()} />);
    const rows = within(screen.getByTestId('game-shell-right')).getAllByTestId(/^shell-word-row-/);
    expect(rows.map((r) => r.getAttribute('data-word'))).toEqual(['bead', 'cab']);
  });
});
