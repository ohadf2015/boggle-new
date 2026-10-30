import { vi, type Mock } from 'vitest';
import { registerTournamentHandlers } from '../tournamentHandler';
import {
  getGame,
  getGameBySocketId,
  updateGame,
  setTournamentIdForGame,
  getGameUsers,
  resetGameForNewRound,
  transitionGameState,
} from '../../modules/gameStateManager';
import {
  createTournament,
  getTournament,
  getTournamentStandings,
  startTournamentRound,
  deleteTournament,
} from '../../modules/tournamentManager';
import { checkRateLimit } from '../../utils/rateLimiter';
import { emitError, ErrorCodes } from '../../utils/errorHandler';
import { broadcastToRoom } from '../../utils/socketHelpers';
import { generateRandomTable } from '../../utils/gameUtils';
import { makePositionsMap } from '../../modules/wordValidator';
import gameStartCoordinator from '../../utils/gameStartCoordinator';
import { tryAcquireGameStart, releaseGameStart } from '../gameStartMutex';

vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../../modules/gameStateManager');
vi.mock('../../modules/tournamentManager');
vi.mock('../../utils/rateLimiter');
vi.mock('../../utils/errorHandler', () => ({
  emitError: vi.fn(),
  ErrorCodes: {
    PLAYER_NOT_IN_GAME: 'PLAYER_NOT_IN_GAME',
    GAME_NOT_FOUND: 'GAME_NOT_FOUND',
    PLAYER_NOT_HOST: 'PLAYER_NOT_HOST',
    TOURNAMENT_INVALID_STATE: 'TOURNAMENT_INVALID_STATE',
    TOURNAMENT_NOT_FOUND: 'TOURNAMENT_NOT_FOUND',
    GAME_ALREADY_STARTED: 'GAME_ALREADY_STARTED',
  },
}));
vi.mock('../../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  getGameRoom: vi.fn((c: string) => `game-${c}`),
  safeEmit: vi.fn(),
}));
vi.mock('../../utils/gameUtils', () => ({ generateRandomTable: vi.fn(() => [['A']]) }));
vi.mock('../../modules/wordValidator', () => ({ makePositionsMap: vi.fn(() => new Map()) }));
vi.mock('../../utils/gameStartCoordinator', () => ({
  default: {
    initializeSequence: vi.fn(() => 'msg-1'),
    setAcknowledgmentTimeout: vi.fn(),
  },
}));
vi.mock('../shared', () => ({ startGameTimer: vi.fn() }));
vi.mock('../../modules/botManager', () => ({ resetBotsForNewRound: vi.fn() }));

const mGetGame = getGame as Mock;
const mGetGameBySocketId = getGameBySocketId as Mock;
const mUpdateGame = updateGame as Mock;
const mSetTournamentId = setTournamentIdForGame as Mock;
const mGetGameUsers = getGameUsers as Mock;
const mCreateTournament = createTournament as Mock;
const mGetTournament = getTournament as Mock;
const mGetStandings = getTournamentStandings as Mock;
const mStartRound = startTournamentRound as Mock;
const mDeleteTournament = deleteTournament as Mock;
const mRateLimit = checkRateLimit as Mock;
const mEmitError = emitError as Mock;
const mBroadcast = broadcastToRoom as Mock;

function createSocket(id = 'socket-host') {
  const handlers: Record<string, Function> = {};
  return {
    socket: {
      id,
      on: vi.fn((ev: string, h: Function) => { handlers[ev] = h; }),
      emit: vi.fn(),
    } as any,
    handlers,
  };
}

function makeGame(over: Record<string, unknown> = {}) {
  return {
    gameCode: 'G1',
    hostSocketId: 'socket-host',
    hostPlayerId: 'player-host',
    hostUsername: 'HostUser',
    language: 'en',
    timerSeconds: 120,
    minWordLength: 3,
    tournamentId: null,
    ...over,
  };
}

describe('startTournamentRound: round boundary safety', () => {
  const mockIo = {} as any;

  function start(game: Record<string, unknown>) {
    mGetGameBySocketId.mockReturnValue('G1');
    mGetGame.mockReturnValue(game);
    mGetTournament.mockReturnValue({ id: 'T1', name: 'T', totalRounds: 3, currentRound: 1 });
    mGetGameUsers.mockReturnValue([{ username: 'A', isBot: false }]);
    const { socket, handlers } = createSocket();
    registerTournamentHandlers(mockIo, socket);
    handlers['startTournamentRound']();
    return socket;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mRateLimit.mockReturnValue(true);
    mGetStandings.mockReturnValue([]);
    (resetGameForNewRound as Mock).mockReturnValue(true);
    (transitionGameState as Mock).mockReturnValue({ success: true });
    releaseGameStart('G1');
  });

  it('refuses to start a round while one is still being played', () => {
    const socket = start(makeGame({ tournamentId: 'T1', gameState: 'in-progress' }));

    expect(mEmitError).toHaveBeenCalledWith(socket, 'TOURNAMENT_INVALID_STATE', expect.anything());
    expect(mStartRound).not.toHaveBeenCalled();
    expect(resetGameForNewRound).not.toHaveBeenCalled();
  });

  it('resets the room through the shared round reset, then starts through the state machine', () => {
    start(makeGame({ tournamentId: 'T1', gameState: 'finished' }));

    expect(resetGameForNewRound).toHaveBeenCalledWith('G1');
    expect(transitionGameState).toHaveBeenCalledWith('G1', 'START');
    const resetOrder = (resetGameForNewRound as Mock).mock.invocationCallOrder[0];
    const startOrder = (transitionGameState as Mock).mock.invocationCallOrder[0];
    expect(resetOrder).toBeLessThan(startOrder);
    expect(mStartRound).toHaveBeenCalledWith('T1', 'G1');
  });

  it('does not race a startGame that already holds the room start lock', () => {
    expect(tryAcquireGameStart('G1')).toBe(true);
    const socket = start(makeGame({ tournamentId: 'T1', gameState: 'waiting' }));

    expect(mEmitError).toHaveBeenCalledWith(socket, 'GAME_ALREADY_STARTED', expect.anything());
    expect(mStartRound).not.toHaveBeenCalled();
  });

  it('releases the start lock once the round is under way', () => {
    start(makeGame({ tournamentId: 'T1', gameState: 'waiting' }));
    expect(tryAcquireGameStart('G1')).toBe(true);
  });
});
