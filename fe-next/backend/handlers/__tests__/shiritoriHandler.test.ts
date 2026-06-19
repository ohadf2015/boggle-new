/**
 * shiritoriHandler — turn enforcement, chain/dictionary validation, accept/reject
 * broadcasts, and ん-loss → game over. Uses the REAL (pure) shiritoriManager;
 * only the dictionary (trie), socket I/O, and game lookup are mocked.
 *
 * Extended tests: Verify playerWords/playerScores are populated and results are recorded.
 */
import { describe, it, expect, vi, beforeEach, type Mock, afterEach } from 'vitest';
import type { Server, Socket } from 'socket.io';

vi.mock('../../utils/logger', () => {
  const l = { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() };
  return { __esModule: true, default: l, ...l };
});
vi.mock('../../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  getGameRoom: vi.fn((code: string) => `room:${code}`),
}));
vi.mock('../../modules/gameStateManager', () => ({
  getGame: vi.fn(),
  getGameBySocketId: vi.fn(() => 'GAME1'),
  getUsernameBySocketId: vi.fn(() => 'p1'),
  transitionGameState: vi.fn(),
}));
// Dictionary: only words in this set are valid.
const DICT = new Set(['しりとり', 'りんご', 'みかん']);
vi.mock('../../modules/boggleSolver', () => ({
  getCachedTrie: vi.fn(() => ({})),
  getTrieNode: vi.fn((_t: unknown, w: string) => (DICT.has(w) ? { isWord: true } : null)),
}));
vi.mock('../../utils/timerManager', () => ({
  clearGameTimer: vi.fn(),
}));
vi.mock('../../modules/supabaseServer', () => ({
  isSupabaseConfigured: vi.fn(() => true),
}));
vi.mock('../../services/gameLifecycle/gameResults', () => ({
  recordGameResultsToSupabase: vi.fn().mockResolvedValue(undefined),
}));

import { handleSubmitShiritoriWord, handleShiritoriTimeout, handleRequestShiritoriState } from '../shiritoriHandler';
import { initShiritoriState } from '../../modules/shiritoriManager';
import { broadcastToRoom } from '../../utils/socketHelpers';
import { getGame, getUsernameBySocketId, transitionGameState } from '../../modules/gameStateManager';
import { clearGameTimer } from '../../utils/timerManager';
import { isSupabaseConfigured } from '../../modules/supabaseServer';
import { recordGameResultsToSupabase } from '../../services/gameLifecycle/gameResults';

const mkSocket = () => ({ id: 's1', emit: vi.fn() } as unknown as Socket);
const mkIo = () => ({} as Server);

const mkGame = (overrides = {}) => ({
  gameCode: 'GAME1',
  gameMode: 'shiritori',
  language: 'ja',
  users: {
    p1: { username: 'p1', socketId: 's1', isHost: false, authUserId: 'auth-p1' },
    p2: { username: 'p2', socketId: 's2', isHost: true, authUserId: 'auth-p2' },
  },
  playerScores: {},
  playerWords: {},
  shiritoriState: initShiritoriState(['p1', 'p2'], 1000, 15000), // p1's turn
  ...overrides,
});

describe('handleSubmitShiritoriWord', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // clearAllMocks resets call history but not mockReturnValue — re-establish the default.
    (getUsernameBySocketId as unknown as Mock).mockReturnValue('p1');
    (transitionGameState as unknown as Mock).mockReturnValue({ success: true });
    (isSupabaseConfigured as unknown as Mock).mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('accepts a valid first word and broadcasts the new required head + next player', () => {
    const game = mkGame();
    (getGame as unknown as Mock).mockReturnValue(game);
    handleSubmitShiritoriWord(mkIo(), mkSocket(), { word: 'しりとり' });
    expect(broadcastToRoom).toHaveBeenCalledWith(
      expect.anything(), 'room:GAME1', 'shiritoriWordAccepted',
      expect.objectContaining({ word: 'しりとり', by: 'p1', requiredHead: 'り', nextPlayer: 'p2', chainLength: 1 }),
    );
    expect(game.shiritoriState.chain).toEqual(['しりとり']);
  });

  it('rejects when it is not the submitter\'s turn', () => {
    (getGame as unknown as Mock).mockReturnValue(mkGame());
    (getUsernameBySocketId as unknown as Mock).mockReturnValue('p2'); // p1 is current
    const sock = mkSocket();
    handleSubmitShiritoriWord(mkIo(), sock, { word: 'しりとり' });
    expect(sock.emit).toHaveBeenCalledWith('shiritoriWordRejected', { word: 'しりとり', error: 'not-your-turn' });
    expect(broadcastToRoom).not.toHaveBeenCalled();
  });

  it('rejects a non-dictionary word', () => {
    (getGame as unknown as Mock).mockReturnValue(mkGame());
    const sock = mkSocket();
    handleSubmitShiritoriWord(mkIo(), sock, { word: 'ねこ' });
    expect(sock.emit).toHaveBeenCalledWith('shiritoriWordRejected', { word: 'ねこ', error: 'not-a-word' });
  });

  it('a ん-ending word ends the game (2 players) with the other player winning', () => {
    const game = mkGame({ shiritoriState: { ...initShiritoriState(['p1', 'p2'], 1000, 15000), requiredHead: 'み' } });
    (getGame as unknown as Mock).mockReturnValue(game);
    handleSubmitShiritoriWord(mkIo(), mkSocket(), { word: 'みかん' });
    expect(broadcastToRoom).toHaveBeenCalledWith(
      expect.anything(), 'room:GAME1', 'shiritoriGameOver',
      { winner: 'p2', reason: 'ends-in-n', loser: 'p1' },
    );
    expect(game.shiritoriState.finished).toBe(true);
  });

  it('populates playerWords and playerScores on valid word submission', () => {
    const game = mkGame();
    (getGame as unknown as Mock).mockReturnValue(game);
    handleSubmitShiritoriWord(mkIo(), mkSocket(), { word: 'しりとり' });
    expect(game.playerWords['p1']).toEqual(['しりとり']);
    expect(game.playerScores['p1']).toBe(4); // 'しりとり' = 4 characters
  });

  it('populates playerWords and playerScores for ん-ending word before elimination', () => {
    const game = mkGame({ shiritoriState: { ...initShiritoriState(['p1', 'p2'], 1000, 15000), requiredHead: 'み' } });
    (getGame as unknown as Mock).mockReturnValue(game);
    handleSubmitShiritoriWord(mkIo(), mkSocket(), { word: 'みかん' });
    expect(game.playerWords['p1']).toEqual(['みかん']);
    expect(game.playerScores['p1']).toBe(3); // 'みかん' = 3 characters
  });

  it('records game results when ん ends the game', async () => {
    const game = mkGame({ shiritoriState: { ...initShiritoriState(['p1', 'p2'], 1000, 15000), requiredHead: 'み' } });
    (getGame as unknown as Mock).mockReturnValue(game);
    handleSubmitShiritoriWord(mkIo(), mkSocket(), { word: 'みかん' });

    // Give async operations a chance to run
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify finalization was called (state transitioned, timer cleared)
    expect(transitionGameState).toHaveBeenCalledWith('GAME1', 'END', { immediate: true });
    expect(clearGameTimer).toHaveBeenCalledWith('GAME1');

    // Verify results were recorded
    expect(recordGameResultsToSupabase).toHaveBeenCalled();
    const callArgs = (recordGameResultsToSupabase as unknown as Mock).mock.calls[0];
    const scoresArray = callArgs[2];
    expect(scoresArray).toHaveLength(2); // p1 and p2
    expect(scoresArray.find((s: any) => s.username === 'p1')).toMatchObject({
      username: 'p1',
      totalScore: 3, // 'みかん' = 3 characters
      wordDetails: [{ word: 'みかん', score: 3, isValid: true, isDuplicate: false }],
      achievements: [], // p1 is loser, not winner
    });
    expect(scoresArray.find((s: any) => s.username === 'p2')).toMatchObject({
      username: 'p2',
      totalScore: 0,
      wordDetails: [],
      achievements: [{ key: 'shiritori_win', icon: '🏆' }], // p2 is winner
    });
  });

  it('does not record results if Supabase is not configured', async () => {
    (isSupabaseConfigured as unknown as Mock).mockReturnValue(false);
    const game = mkGame({ shiritoriState: { ...initShiritoriState(['p1', 'p2'], 1000, 15000), requiredHead: 'み' } });
    (getGame as unknown as Mock).mockReturnValue(game);
    handleSubmitShiritoriWord(mkIo(), mkSocket(), { word: 'みかん' });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(recordGameResultsToSupabase).not.toHaveBeenCalled();
  });

  it('does not record results twice if transitionGameState fails', async () => {
    const game = mkGame({ shiritoriState: { ...initShiritoriState(['p1', 'p2'], 1000, 15000), requiredHead: 'み' } });
    (getGame as unknown as Mock).mockReturnValue(game);

    // First call succeeds, second call fails (game already ended)
    let callCount = 0;
    (transitionGameState as unknown as Mock).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return { success: true };
      return { success: false, error: 'Already ended' };
    });

    handleSubmitShiritoriWord(mkIo(), mkSocket(), { word: 'みかん' });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const firstCallCount = (recordGameResultsToSupabase as unknown as Mock).mock.calls.length;

    // Simulate second finalization attempt (should not record again)
    game.shiritoriState.finished = true;
    handleShiritoriTimeout(mkIo(), 'GAME1');

    await new Promise((resolve) => setTimeout(resolve, 50));

    // recordGameResultsToSupabase should NOT be called again
    expect((recordGameResultsToSupabase as unknown as Mock).mock.calls.length).toBe(firstCallCount);
  });
});

describe('handleShiritoriTimeout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (transitionGameState as unknown as Mock).mockReturnValue({ success: true });
    (isSupabaseConfigured as unknown as Mock).mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('records results when timeout finishes the game', async () => {
    // Create a game state with only p1 remaining (p2 already eliminated)
    // When timeout fires on p1, they get eliminated and p2 wins
    const baseState = initShiritoriState(['p1', 'p2'], 1000, 15000);
    const stateWithP2Eliminated = {
      ...baseState,
      activePlayerIndex: 0, // p1's turn
      eliminatedPlayers: ['p2'],
      players: ['p1', 'p2'], // Both listed but p2 is marked as eliminated
    };
    const game = mkGame({
      shiritoriState: stateWithP2Eliminated,
    });
    game.playerWords = { p1: ['しりとり'], p2: [] };
    game.playerScores = { p1: 4, p2: 0 };
    (getGame as unknown as Mock).mockReturnValue(game);

    handleShiritoriTimeout(mkIo(), 'GAME1');

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify finalization was called
    expect(transitionGameState).toHaveBeenCalledWith('GAME1', 'END', { immediate: true });
    expect(clearGameTimer).toHaveBeenCalledWith('GAME1');
    expect(recordGameResultsToSupabase).toHaveBeenCalled();

    const scoresArray = (recordGameResultsToSupabase as unknown as Mock).mock.calls[0][2];
    // After p1 is eliminated due to timeout, p2 should be the winner
    expect(scoresArray).toBeDefined();
    expect(scoresArray.length).toBeGreaterThan(0);
    // One of the players should have the shiritori_win achievement
    const winnerEntry = scoresArray.find((s: any) => s.achievements?.length > 0);
    expect(winnerEntry?.achievements).toContainEqual({
      key: 'shiritori_win',
      icon: '🏆',
    });
  });
});

describe('handleRequestShiritoriState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getUsernameBySocketId as unknown as Mock).mockReturnValue('p1');
  });
  afterEach(() => vi.clearAllMocks());

  it('emits a shiritoriInit snapshot of the current turn-chain state', () => {
    const game = mkGame({
      shiritoriState: { ...initShiritoriState(['p1', 'p2'], 1000, 15000), chain: ['しりとり'], requiredHead: 'り', turnIndex: 1 },
    });
    (getGame as unknown as Mock).mockReturnValue(game);
    const sock = mkSocket();
    handleRequestShiritoriState(sock);
    expect(sock.emit).toHaveBeenCalledWith('shiritoriInit', expect.objectContaining({
      players: ['p1', 'p2'],
      currentPlayer: 'p2',
      requiredHead: 'り',
      chain: ['しりとり'],
    }));
  });

  it('is a no-op when the game is not shiritori', () => {
    (getGame as unknown as Mock).mockReturnValue(mkGame({ gameMode: 'classic' }));
    const sock = mkSocket();
    handleRequestShiritoriState(sock);
    expect(sock.emit).not.toHaveBeenCalled();
  });

  it('is a no-op when there is no shiritori state', () => {
    (getGame as unknown as Mock).mockReturnValue(mkGame({ shiritoriState: null }));
    const sock = mkSocket();
    handleRequestShiritoriState(sock);
    expect(sock.emit).not.toHaveBeenCalled();
  });
});
