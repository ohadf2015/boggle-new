/**
 * Teacher pause — classic-mode bots freeze with the class.
 *
 * The bot word schedule keeps chaining (botLifecycle.scheduleNextWord) so we
 * cannot stop it cheaply mid-round; instead the submission callback drops
 * words that land inside a pause. Nothing is scored or broadcast.
 */
import { vi, type Mock } from 'vitest';

vi.mock('../../../modules/gameStateManager', () => ({
  getLeaderboard: vi.fn(() => []),
  getLeaderboardThrottled: vi.fn(),
  addPlayerWord: vi.fn(),
  updatePlayerScore: vi.fn(),
  trackBotWord: vi.fn(),
  getGame: vi.fn(),
  recordFirstFinder: vi.fn(),
  getFirstFinder: vi.fn(),
  playerHasWord: vi.fn(() => false),
}));
vi.mock('../../../modules/botManager', () => ({
  getGameBots: vi.fn(),
  startBot: vi.fn(),
  isBot: vi.fn(() => true),
}));
vi.mock('../../../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  volatileBroadcastToRoom: vi.fn(),
  getGameRoom: vi.fn((code: string) => `room:${code}`),
}));
vi.mock('../../../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../botWordHunt', () => ({ startBotsForWordHunt: vi.fn() }));
vi.mock('../botWheelRush', () => ({ startBotsForWheelRush: vi.fn() }));
vi.mock('../botBlast', () => ({ startBotsForBlast: vi.fn() }));
vi.mock('../../../modules/blastModeManager', () => ({
  getOrInitPlayerBoard: vi.fn(), getTilesOnPath: vi.fn(() => []), calculateBlastTileBonus: vi.fn(() => 0), recordBlastMove: vi.fn(),
}));
vi.mock('../../../modules/wordValidator', () => ({ makePositionsMap: vi.fn() }));

import { getGame, updatePlayerScore, addPlayerWord } from '../../../modules/gameStateManager';
import { getGameBots, startBot } from '../../../modules/botManager';
import { broadcastToRoom, volatileBroadcastToRoom } from '../../../utils/socketHelpers';
import { startBotsForGame } from '../botGame';

describe('botGame — teacher pause drops bot submissions', () => {
  const io = {} as any;
  const bot: any = { username: 'Botty', isActive: true, score: 0, difficulty: 'medium', words: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    (getGameBots as Mock).mockReturnValue([bot]);
  });

  async function submitViaCapturedCallback() {
    (getGame as Mock).mockReturnValue({ gameMode: 'classic', isPaused: false, letterGrid: [['A']], language: 'en', users: {} });
    startBotsForGame(io, 'CLS1', [['A']], 'en', 120);
    const callback = (startBot as Mock).mock.calls[0][3] as (s: unknown) => Promise<void>;
    return callback;
  }

  it('ignores a bot word that arrives while the round is paused', async () => {
    const callback = await submitViaCapturedCallback();
    (getGame as Mock).mockReturnValue({ gameMode: 'classic', isPaused: true, letterGrid: [['A']], language: 'en', users: {} });

    await callback({ username: 'Botty', word: 'apple', score: 8, comboLevel: 0 });

    expect(updatePlayerScore).not.toHaveBeenCalled();
    expect(addPlayerWord).not.toHaveBeenCalled();
    expect(broadcastToRoom).not.toHaveBeenCalled();
    expect(volatileBroadcastToRoom).not.toHaveBeenCalled();
  });
});
