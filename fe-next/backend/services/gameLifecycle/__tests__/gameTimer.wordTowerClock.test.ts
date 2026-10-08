/** Word Tower versus: the match clock starts with the round clock, not at setup (before the 3-2-1). */
import { vi, type Mock } from 'vitest';

vi.mock('../../../modules/gameStateManager', () => ({
  getGame: vi.fn(),
  updateGame: vi.fn(),
}));

vi.mock('../../../modules/communityWordManager', () => ({
  resetGameAIValidationCount: vi.fn(),
}));

vi.mock('../../../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  getGameRoom: (c: string) => `room:${c}`,
}));

// Real setInterval handles need real clearInterval; otherwise the timer keeps
// firing past expiry inside fake-timers and double-invokes endGame (test-only
// artifact). Track the id on set, clear it for real on clear.
const intervalIds = new Map<string, NodeJS.Timeout>();
vi.mock('../../../utils/timerManager', () => ({
  default: {
    clearGameTimer: (code: string) => {
      const id = intervalIds.get(`game:${code}`);
      if (id) clearInterval(id);
      intervalIds.delete(`game:${code}`);
    },
    setGameTimer: (code: string, id: NodeJS.Timeout) => {
      intervalIds.set(`game:${code}`, id);
    },
  },
  clearGameTimer: (code: string) => {
    const id = intervalIds.get(`game:${code}`);
    if (id) clearInterval(id);
    intervalIds.delete(`game:${code}`);
  },
  setGameTimer: (code: string, id: NodeJS.Timeout) => {
    intervalIds.set(`game:${code}`, id);
  },
}));

vi.mock('../botGame', () => ({
  startBotsForGame: vi.fn(),
}));

vi.mock('../gameEnd', () => ({
  endGame: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../modules/wordHuntManager', () => ({
  drainLife: vi.fn(),
  areAllPlayersEliminated: vi.fn(() => false),
}));

vi.mock('../../../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../../dictionary', () => ({ ensureLanguageLoaded: vi.fn() }));

import { getGame, updateGame } from '../../../modules/gameStateManager';
import { startGameTimer } from '../gameTimer';
import timerManager from '../../../utils/timerManager';

describe('startGameTimer — word tower versus clock', () => {
  afterEach(() => {
    timerManager.clearGameTimer('WT');
    vi.useRealTimers();
  });

  it('re-anchors the versus match end to when the round clock actually starts', () => {
    vi.useFakeTimers();
    vi.setSystemTime(50_000);
    const game = {
      gameCode: 'WT',
      gameState: 'in-progress',
      users: {},
      language: 'en',
      letterGrid: [],
      wordTowerVersusState: { startedAtMs: 42_000, endsAtMs: 42_000 + 180_000, towers: {} },
    };
    (getGame as Mock).mockReturnValue(game);

    startGameTimer({ to: () => ({ emit: vi.fn() }) } as never, 'WT', 180);

    const patch = (updateGame as Mock).mock.calls.map((c) => c[1]).find((p) => p.wordTowerVersusState);
    expect(patch?.wordTowerVersusState).toMatchObject({ startedAtMs: 50_000, endsAtMs: 230_000 });
  });

  it('leaves rooms without a versus match alone', () => {
    vi.useFakeTimers();
    (updateGame as Mock).mockClear();
    (getGame as Mock).mockReturnValue({ gameCode: 'WT', gameState: 'in-progress', users: {}, language: 'en', letterGrid: [] });
    startGameTimer({ to: () => ({ emit: vi.fn() }) } as never, 'WT', 60);
    expect((updateGame as Mock).mock.calls.some((c) => 'wordTowerVersusState' in c[1])).toBe(false);
  });
});
