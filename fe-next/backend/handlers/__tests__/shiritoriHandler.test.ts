/**
 * shiritoriHandler — turn enforcement, chain/dictionary validation, accept/reject
 * broadcasts, and ん-loss → game over. Uses the REAL (pure) shiritoriManager;
 * only the dictionary (trie), socket I/O, and game lookup are mocked.
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
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
}));
// Dictionary: only words in this set are valid.
const DICT = new Set(['しりとり', 'りんご', 'みかん']);
vi.mock('../../modules/boggleSolver', () => ({
  getCachedTrie: vi.fn(() => ({})),
  getTrieNode: vi.fn((_t: unknown, w: string) => (DICT.has(w) ? { isWord: true } : null)),
}));

import { handleSubmitShiritoriWord } from '../shiritoriHandler';
import { initShiritoriState } from '../../modules/shiritoriManager';
import { broadcastToRoom } from '../../utils/socketHelpers';
import { getGame, getUsernameBySocketId } from '../../modules/gameStateManager';

const mkSocket = () => ({ id: 's1', emit: vi.fn() } as unknown as Socket);
const mkIo = () => ({} as Server);

const mkGame = (overrides = {}) => ({
  gameMode: 'shiritori',
  language: 'ja',
  shiritoriState: initShiritoriState(['p1', 'p2'], 1000, 15000), // p1's turn
  ...overrides,
});

describe('handleSubmitShiritoriWord', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // clearAllMocks resets call history but not mockReturnValue — re-establish the default.
    (getUsernameBySocketId as unknown as Mock).mockReturnValue('p1');
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
});
