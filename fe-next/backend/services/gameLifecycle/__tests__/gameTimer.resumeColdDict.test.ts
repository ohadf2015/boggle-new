/**
 * Test: resumeGameTimerIfMissing warms the dictionary BEFORE starting the timer.
 *
 * On server-restart recovery the in-memory dictionary trie is COLD (only the
 * fresh-start path in gameStartHandler calls ensureLanguageLoaded). The classic
 * and word-hunt bot drivers (botManager.startBot) do NOT self-load the dict —
 * only the wheel-rush and blast drivers do. So a rehydrated classic/word-hunt
 * game resumed via this path runs with a cold dict: bot solvers find nothing
 * (score 0) and human word validation at endGame can reject valid words.
 *
 * Contract: resume must `await ensureLanguageLoaded(game.language)` before the
 * round timer (and thus bot launch) starts.
 */

vi.mock('../../../modules/gameStateManager', () => ({
  getGame: vi.fn(),
  updateGame: vi.fn(),
}));
vi.mock('../../../modules/communityWordManager', () => ({ resetGameAIValidationCount: vi.fn() }));
vi.mock('../../../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  getGameRoom: vi.fn().mockReturnValue('room:G1'),
}));
vi.mock('../../../utils/timerManager', () => ({
  default: { clearGameTimer: vi.fn(), setGameTimer: vi.fn(), hasTimer: vi.fn() },
  clearGameTimer: vi.fn(),
  setGameTimer: vi.fn(),
  hasGameTimer: vi.fn(),
}));
vi.mock('../../../modules/wordHuntManager', () => ({ drainLife: vi.fn(), areAllPlayersEliminated: vi.fn() }));
vi.mock('../botGame', () => ({ startBotsForGame: vi.fn(), restoreBotsForGame: vi.fn().mockReturnValue(0) }));
vi.mock('../gameEnd', () => ({ endGame: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../utils/gameStateMachine', () => ({ isInProgress: vi.fn() }));
vi.mock('../../../dictionary', () => ({ ensureLanguageLoaded: vi.fn().mockResolvedValue(undefined) }));

import { vi, type Mock } from 'vitest';
import { getGame } from '../../../modules/gameStateManager';
import { hasGameTimer, setGameTimer } from '../../../utils/timerManager';
import { isInProgress } from '../../../utils/gameStateMachine';
import { ensureLanguageLoaded } from '../../../dictionary';
import { resumeGameTimerIfMissing } from '../gameTimer';

const mGetGame = getGame as Mock;
const mHasTimer = hasGameTimer as Mock;
const mSetTimer = setGameTimer as Mock;
const mInProgress = isInProgress as Mock;
const mEnsureLang = ensureLanguageLoaded as Mock;

describe('resumeGameTimerIfMissing — cold-dictionary recovery', () => {
  const io = {} as never;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('warms the dictionary for the game language before starting the timer', async () => {
    mGetGame.mockReturnValue({
      gameState: 'in-progress',
      gameMode: 'classic',
      language: 'es',
      gameDuration: 90,
      users: {},
    });
    mInProgress.mockReturnValue(true);
    mHasTimer.mockReturnValue(false);

    const resumed = await resumeGameTimerIfMissing(io, 'G1');

    expect(resumed).toBe(true);
    expect(mEnsureLang).toHaveBeenCalledWith('es');
    // Dictionary warmed BEFORE the timer/bots launched.
    expect(mEnsureLang.mock.invocationCallOrder[0]).toBeLessThan(
      mSetTimer.mock.invocationCallOrder[0],
    );
  });

  it('falls back to en when the game has no language', async () => {
    mGetGame.mockReturnValue({
      gameState: 'in-progress',
      gameMode: 'classic',
      gameDuration: 90,
      users: {},
    });
    mInProgress.mockReturnValue(true);
    mHasTimer.mockReturnValue(false);

    await resumeGameTimerIfMissing(io, 'G1');

    expect(mEnsureLang).toHaveBeenCalledWith('en');
  });

  it('does not warm the dictionary when the game is not resumable (timer already running)', async () => {
    mGetGame.mockReturnValue({ gameState: 'in-progress', gameMode: 'classic', language: 'es', users: {} });
    mInProgress.mockReturnValue(true);
    mHasTimer.mockReturnValue(true);

    const resumed = await resumeGameTimerIfMissing(io, 'G1');

    expect(resumed).toBe(false);
    expect(mEnsureLang).not.toHaveBeenCalled();
  });
});
