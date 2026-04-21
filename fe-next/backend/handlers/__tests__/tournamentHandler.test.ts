import { vi, type Mock } from 'vitest';
import { registerTournamentHandlers } from '../tournamentHandler';
import {
  getGame,
  getGameBySocketId,
  updateGame,
  setTournamentIdForGame,
  getGameUsers,
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

describe('tournamentHandler', () => {
  const mockIo = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mRateLimit.mockReturnValue(true);
    mGetStandings.mockReturnValue([]);
    mGetGameUsers.mockReturnValue([]);
  });

  it('registers four tournament events', () => {
    const { socket } = createSocket();
    registerTournamentHandlers(mockIo, socket);
    ['createTournament', 'startTournamentRound', 'getTournamentStandings', 'cancelTournament']
      .forEach(ev => expect(socket.on).toHaveBeenCalledWith(ev, expect.any(Function)));
  });

  describe('createTournament', () => {
    it('rate-limits and emits rateLimited', () => {
      mRateLimit.mockReturnValue(false);
      const { socket, handlers } = createSocket();
      registerTournamentHandlers(mockIo, socket);
      handlers['createTournament']({ name: 'T', totalRounds: 3 });
      expect(socket.emit).toHaveBeenCalledWith('rateLimited');
      expect(mCreateTournament).not.toHaveBeenCalled();
    });

    it('errors when socket not in a game', () => {
      mGetGameBySocketId.mockReturnValue(null);
      const { socket, handlers } = createSocket();
      registerTournamentHandlers(mockIo, socket);
      handlers['createTournament']({ name: 'T', totalRounds: 3 });
      expect(mEmitError).toHaveBeenCalledWith(socket, 'PLAYER_NOT_IN_GAME');
    });

    it('errors when non-host attempts creation', () => {
      mGetGameBySocketId.mockReturnValue('G1');
      mGetGame.mockReturnValue(makeGame({ hostSocketId: 'someone-else' }));
      const { socket, handlers } = createSocket();
      registerTournamentHandlers(mockIo, socket);
      handlers['createTournament']({ name: 'T', totalRounds: 3 });
      expect(mEmitError).toHaveBeenCalledWith(socket, 'PLAYER_NOT_HOST', expect.any(Object));
      expect(mCreateTournament).not.toHaveBeenCalled();
    });

    it('creates tournament, persists id, broadcasts', () => {
      mGetGameBySocketId.mockReturnValue('G1');
      mGetGame.mockReturnValue(makeGame());
      mCreateTournament.mockReturnValue({ id: 'T1', name: 'MyT', totalRounds: 5 });
      const { socket, handlers } = createSocket();
      registerTournamentHandlers(mockIo, socket);
      handlers['createTournament']({ name: 'MyT', totalRounds: 5 });
      expect(mCreateTournament).toHaveBeenCalledWith('player-host', 'HostUser', { name: 'MyT', totalRounds: 5 });
      expect(mSetTournamentId).toHaveBeenCalledWith('G1', 'T1');
      expect(mBroadcast).toHaveBeenCalledWith(
        mockIo,
        'game-G1',
        'tournamentCreated',
        expect.objectContaining({ tournament: expect.objectContaining({ id: 'T1', status: 'created' }) })
      );
    });

    it('defaults name to "Tournament" and rounds to 3 when empty', () => {
      mGetGameBySocketId.mockReturnValue('G1');
      mGetGame.mockReturnValue(makeGame());
      mCreateTournament.mockReturnValue({ id: 'T1', name: 'Tournament', totalRounds: 3 });
      const { socket, handlers } = createSocket();
      registerTournamentHandlers(mockIo, socket);
      handlers['createTournament']({ name: '', totalRounds: 0 });
      expect(mCreateTournament).toHaveBeenCalledWith('player-host', 'HostUser', { name: 'Tournament', totalRounds: 3 });
    });
  });

  describe('startTournamentRound', () => {
    it('errors when no active tournament', () => {
      mGetGameBySocketId.mockReturnValue('G1');
      mGetGame.mockReturnValue(makeGame({ tournamentId: null }));
      const { socket, handlers } = createSocket();
      registerTournamentHandlers(mockIo, socket);
      handlers['startTournamentRound']();
      expect(mEmitError).toHaveBeenCalledWith(socket, 'TOURNAMENT_INVALID_STATE', expect.any(Object));
    });

    it('errors when tournament id set but tournament missing', () => {
      mGetGameBySocketId.mockReturnValue('G1');
      mGetGame.mockReturnValue(makeGame({ tournamentId: 'T-missing' }));
      mGetTournament.mockReturnValue(null);
      const { socket, handlers } = createSocket();
      registerTournamentHandlers(mockIo, socket);
      handlers['startTournamentRound']();
      expect(mEmitError).toHaveBeenCalledWith(socket, 'TOURNAMENT_NOT_FOUND');
    });

    it('errors when non-host starts round', () => {
      mGetGameBySocketId.mockReturnValue('G1');
      mGetGame.mockReturnValue(makeGame({ hostSocketId: 'other', tournamentId: 'T1' }));
      const { socket, handlers } = createSocket();
      registerTournamentHandlers(mockIo, socket);
      handlers['startTournamentRound']();
      expect(mEmitError).toHaveBeenCalledWith(socket, 'PLAYER_NOT_HOST', expect.any(Object));
      expect(mStartRound).not.toHaveBeenCalled();
    });

    it('starts round: generates board, updates state, broadcasts', () => {
      const game = makeGame({ tournamentId: 'T1' });
      mGetGameBySocketId.mockReturnValue('G1');
      mGetGame.mockReturnValue(game);
      mGetTournament.mockReturnValue({ id: 'T1', name: 'MyT', totalRounds: 3, currentRound: 1 });
      mGetGameUsers.mockReturnValue([
        { username: 'A', isBot: false },
        { username: 'B', isBot: true },
      ]);
      const { socket, handlers } = createSocket();
      registerTournamentHandlers(mockIo, socket);
      handlers['startTournamentRound']();

      expect(mStartRound).toHaveBeenCalledWith('T1', 'G1');
      expect(mUpdateGame).toHaveBeenCalledWith('G1', expect.objectContaining({
        gameState: 'in-progress',
        timerSeconds: 120,
        remainingTime: 120,
      }));
      expect(mBroadcast).toHaveBeenCalledWith(mockIo, 'game-G1', 'tournamentRoundStarting', expect.any(Object));
      expect(mBroadcast).toHaveBeenCalledWith(mockIo, 'game-G1', 'startGame', expect.objectContaining({
        timerSeconds: 120,
        messageId: 'msg-1',
      }));
      expect(gameStartCoordinator.initializeSequence).toHaveBeenCalledWith('G1', ['A'], 120);
    });

    it('resets per-player round state (scores, words, achievements)', () => {
      const game = makeGame({
        tournamentId: 'T1',
        playerScores: { A: 50 },
        playerWords: { A: ['OLD'] },
        playerWordDetails: { A: [{ word: 'OLD' }] },
        playerAchievements: { A: [{ id: 'X' }] },
      });
      mGetGameBySocketId.mockReturnValue('G1');
      mGetGame.mockReturnValue(game);
      mGetTournament.mockReturnValue({ id: 'T1', name: 'T', totalRounds: 3, currentRound: 2 });
      mGetGameUsers.mockReturnValue([{ username: 'A', isBot: false }]);
      const { socket, handlers } = createSocket();
      registerTournamentHandlers(mockIo, socket);
      handlers['startTournamentRound']();

      expect(game.playerScores.A).toBe(0);
      expect(game.playerWords.A).toEqual([]);
      expect(game.playerWordDetails.A).toEqual([]);
      expect(game.playerAchievements.A).toEqual([]);
      expect(game.firstWordFound).toBe(false);
    });
  });

  describe('getTournamentStandings', () => {
    it('returns empty when socket has no game', () => {
      mGetGameBySocketId.mockReturnValue(null);
      const { socket, handlers } = createSocket();
      registerTournamentHandlers(mockIo, socket);
      handlers['getTournamentStandings']();
      expect(socket.emit).toHaveBeenCalledWith('tournamentStandings', { standings: [] });
    });

    it('returns empty when game has no tournament', () => {
      mGetGameBySocketId.mockReturnValue('G1');
      mGetGame.mockReturnValue(makeGame({ tournamentId: null }));
      const { socket, handlers } = createSocket();
      registerTournamentHandlers(mockIo, socket);
      handlers['getTournamentStandings']();
      expect(socket.emit).toHaveBeenCalledWith('tournamentStandings', { standings: [] });
    });

    it('returns tournament + standings when present', () => {
      mGetGameBySocketId.mockReturnValue('G1');
      mGetGame.mockReturnValue(makeGame({ tournamentId: 'T1' }));
      mGetTournament.mockReturnValue({
        id: 'T1', name: 'T', totalRounds: 3, currentRound: 1, status: 'in-progress',
      });
      mGetStandings.mockReturnValue([{ username: 'A', totalScore: 100 }]);
      const { socket, handlers } = createSocket();
      registerTournamentHandlers(mockIo, socket);
      handlers['getTournamentStandings']();
      expect(socket.emit).toHaveBeenCalledWith('tournamentStandings', expect.objectContaining({
        tournament: expect.objectContaining({ id: 'T1', status: 'in-progress' }),
        standings: [{ username: 'A', totalScore: 100 }],
      }));
    });
  });

  describe('cancelTournament', () => {
    it('errors when non-host cancels', () => {
      mGetGameBySocketId.mockReturnValue('G1');
      mGetGame.mockReturnValue(makeGame({ hostSocketId: 'other', tournamentId: 'T1' }));
      const { socket, handlers } = createSocket();
      registerTournamentHandlers(mockIo, socket);
      handlers['cancelTournament']();
      expect(mEmitError).toHaveBeenCalledWith(socket, 'PLAYER_NOT_HOST', expect.any(Object));
      expect(mDeleteTournament).not.toHaveBeenCalled();
    });

    it('errors when no tournament active', () => {
      mGetGameBySocketId.mockReturnValue('G1');
      mGetGame.mockReturnValue(makeGame({ tournamentId: null }));
      const { socket, handlers } = createSocket();
      registerTournamentHandlers(mockIo, socket);
      handlers['cancelTournament']();
      expect(mEmitError).toHaveBeenCalledWith(socket, 'TOURNAMENT_INVALID_STATE', expect.any(Object));
    });

    it('deletes, clears id, broadcasts cancellation', () => {
      mGetGameBySocketId.mockReturnValue('G1');
      mGetGame.mockReturnValue(makeGame({ tournamentId: 'T1' }));
      const { socket, handlers } = createSocket();
      registerTournamentHandlers(mockIo, socket);
      handlers['cancelTournament']();
      expect(mDeleteTournament).toHaveBeenCalledWith('T1');
      expect(mSetTournamentId).toHaveBeenCalledWith('G1', null);
      expect(mBroadcast).toHaveBeenCalledWith(mockIo, 'game-G1', 'tournamentCancelled', expect.any(Object));
    });
  });
});
