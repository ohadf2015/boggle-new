import { vi, type Mock } from 'vitest';

vi.mock('../../modules/gameStateManager', () => ({
  addPlayerWord: vi.fn(),
  updatePlayerScore: vi.fn(),
  addPlayerEventBonus: vi.fn(),
  recordFirstFinder: vi.fn().mockReturnValue(true),
}));
vi.mock('../../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  getGameRoom: vi.fn((c: string) => `game:${c}`),
  getSocketById: vi.fn(),
  safeEmit: vi.fn(),
}));
vi.mock('../../utils/opponentWordFeedBatcher', () => ({ queueOpponentWord: vi.fn() }));
vi.mock('../../utils/playerFoundWordBatcher', () => ({ queuePlayerFoundWord: vi.fn() }));
vi.mock('../../modules/achievementManager', () => ({ checkAndAwardAchievements: vi.fn().mockReturnValue([]) }));
vi.mock('../../modules/supabaseServer', () => ({ isSupabaseConfigured: vi.fn().mockReturnValue(false), savePlayerWord: vi.fn() }));
vi.mock('../../utils/metrics', () => ({ inc: vi.fn(), incPerGame: vi.fn() }));
vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('../engagementHandler', () => ({ processLongWordEngagement: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../classroomEconomyHandler', () => ({ economyOnWordAccepted: vi.fn(), economyUserIdOf: vi.fn().mockReturnValue(null), roundIdOf: vi.fn() }));

import { handleValidatedWord } from '../wordValidationHandler';
import { updatePlayerScore, addPlayerEventBonus } from '../../modules/gameStateManager';
import { scoreAcceptedWord } from '../../modules/wordScore';
import { SERVER_COMBO_SCORING_CAP } from '../../modules/comboDecay';

const io = { to: vi.fn().mockReturnThis(), emit: vi.fn() } as any;

function makeGame(overrides: Record<string, unknown> = {}): any {
  return {
    gameCode: 'RWD1',
    gameState: 'in-progress',
    gameMode: 'classic',
    language: 'en',
    letterGrid: [['C', 'A', 'T'], ['D', 'O', 'G']],
    playerWords: {},
    playerScores: { alice: 0, bob: 0 },
    playerCombos: {},
    users: { alice: {}, bob: {} },
    ...overrides,
  };
}

function submit(game: any, word: string): Record<string, any> {
  const socket = { id: 's', emit: vi.fn() } as any;
  handleValidatedWord(io, socket, game, 'RWD1', 'alice', word, true);
  const accepted = socket.emit.mock.calls.find((c: unknown[]) => c[0] === 'wordAccepted');
  return accepted?.[1];
}

const lastDelta = (): number => (updatePlayerScore as Mock).mock.calls.at(-1)![2];

describe('handleValidatedWord rewards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('pays the advertised meteor bonus (+50%) on words using a meteor tile letter', () => {
    const game = makeGame({ activeRoundEvent: 'meteor', meteorTiles: [{ row: 0, col: 0 }] });
    const base = scoreAcceptedWord({ word: 'cat', comboLevel: 0 }).total;

    const payload = submit(game, 'cat');

    const meteor = Math.ceil(base * 0.5);
    expect(payload.meteorBonus).toBe(meteor);
    expect(lastDelta()).toBe(base + meteor);
    expect(addPlayerEventBonus).toHaveBeenCalledWith('RWD1', 'alice', meteor);
  });

  it('pays no meteor bonus once the meteor event is over', () => {
    const payload = submit(makeGame({ activeRoundEvent: null, meteorTiles: [{ row: 0, col: 0 }] }), 'cat');
    expect(payload.meteorBonus).toBeUndefined();
  });

  it('gives a trailing human in a 3+ human room a catch-up bonus that survives to results', () => {
    const game = makeGame({
      users: { alice: {}, bob: {}, carol: {} },
      playerScores: { alice: 0, bob: 500, carol: 300 },
    });
    const base = scoreAcceptedWord({ word: 'cat', comboLevel: 0 }).total;

    const payload = submit(game, 'cat');

    expect(payload.catchUp).toEqual({ bonus: expect.any(Number), pct: expect.any(Number) });
    expect(payload.catchUp.bonus).toBeGreaterThan(0);
    expect(payload.catchUp.bonus).toBeLessThanOrEqual(Math.round(base * 0.2));
    expect(lastDelta()).toBe(base + payload.catchUp.bonus);
    expect(addPlayerEventBonus).toHaveBeenCalledWith('RWD1', 'alice', payload.catchUp.bonus);
  });

  it('gives no catch-up bonus in a two-player room', () => {
    const payload = submit(makeGame({ playerScores: { alice: 0, bob: 900 } }), 'cat');
    expect(payload.catchUp).toBeUndefined();
  });

  it('lets a classic combo lapse after the chain window, like the client HUD', () => {
    const now = vi.spyOn(Date, 'now');
    const game = makeGame();
    now.mockReturnValue(1_000);
    submit(game, 'cat');
    now.mockReturnValue(2_000);
    expect(submit(game, 'dog').comboLevel).toBe(1);
    now.mockReturnValue(60_000);
    expect(submit(game, 'cog').comboLevel).toBe(0);
  });

  it('caps the combo level that scores in classic', () => {
    const payload = submit(makeGame({ playerCombos: { alice: 40 } }), 'cat');
    expect(payload.comboLevel).toBe(SERVER_COMBO_SCORING_CAP);
  });
});
