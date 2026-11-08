/**
 * Quick Play classic runs the solo engine (useSinglePlayerCore) under the MP
 * board. The engine deals a timed board and then waits for a Start tap before
 * the clock runs (startsBehindGate) — but the MP board has no Start card, so
 * the clock sat at 1:00 forever and the round never ended (reproduced live on
 * Nov 7 2026; quick_play_results has no classic round since Sep 14).
 *
 * The engine also owns its own keyboard (typing + Esc quits + Space pauses),
 * while the MP board already has one: both would fire on every key.
 */
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuickClassicBoard } from '../QuickClassicBoard';
import type { QuickRoundConfig } from '../../types';

const handleStart = vi.fn();
const coreOptions: any[] = [];
const boardProps: any[] = [];
let core = { awaitingStart: true, grid: [['A', 'B'], ['C', 'D']] as string[][] | null };

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr' }),
}));

vi.mock('@/components/singleplayer/game/hooks/useSinglePlayerCore', () => ({
  useSinglePlayerCore: (opts: unknown) => {
    coreOptions.push(opts);
    return {
      grid: core.grid,
      score: 0,
      foundWords: [],
      isPaused: false,
      isGameOver: false,
      awaitingStart: core.awaitingStart,
      handleStart,
      timer: { remainingTime: 60 },
      combo: { comboLevelRef: { current: 0 } },
      fireRoundActive: false,
      fireRoundRemaining: 0,
      earthquakeState: null,
      handleWordSubmit: vi.fn(),
    };
  },
}));

vi.mock('@/components/game/InGameScreen', () => ({
  __esModule: true,
  default: (props: unknown) => {
    boardProps.push(props);
    return <div data-testid="in-game-screen" />;
  },
}));

const config = {
  mode: 'classic',
  seed: 's-clock',
  language: 'en',
  durationSec: 60,
  grid: [['A', 'B'], ['C', 'D']],
  totalWords: 20,
  perfectScore: 200,
} as QuickRoundConfig;

describe('QuickClassicBoard — the round clock', () => {
  beforeEach(() => {
    handleStart.mockClear();
    coreOptions.length = 0;
    boardProps.length = 0;
    core = { awaitingStart: true, grid: [['A', 'B'], ['C', 'D']] };
  });

  it('starts the clock as soon as the board is dealt (no Start card exists on this board)', () => {
    render(<QuickClassicBoard config={config} onDone={vi.fn()} onQuit={vi.fn()} />);
    expect(handleStart).toHaveBeenCalledTimes(1);
  });

  it('does not start before there is a board', () => {
    core = { awaitingStart: true, grid: null };
    render(<QuickClassicBoard config={config} onDone={vi.fn()} onQuit={vi.fn()} />);
    expect(handleStart).not.toHaveBeenCalled();
  });

  it('does not restart a round that is already running', () => {
    core = { awaitingStart: false, grid: [['A']] };
    render(<QuickClassicBoard config={config} onDone={vi.fn()} onQuit={vi.fn()} />);
    expect(handleStart).not.toHaveBeenCalled();
  });

  it('the board is not live while the engine still holds the clock', () => {
    render(<QuickClassicBoard config={config} onDone={vi.fn()} onQuit={vi.fn()} />);
    expect(boardProps[boardProps.length - 1].gameActive).toBe(false);
  });

  it("leaves the keyboard to the MP board (the engine's own typing, Esc-quit and Space-pause stay off)", () => {
    render(<QuickClassicBoard config={config} onDone={vi.fn()} onQuit={vi.fn()} />);
    expect(coreOptions[0].externalInput).toBe(true);
  });
});
