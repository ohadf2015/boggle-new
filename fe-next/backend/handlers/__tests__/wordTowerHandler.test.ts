/**
 * Word Tower (versus) handler tests — outcome → emit/broadcast mapping.
 * The pure match brain is unit-tested in lib/wordTower; here it's mocked so we
 * verify the socket plumbing only.
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Server, Socket } from 'socket.io';

vi.mock('../../utils/logger', () => {
  const l = { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() };
  return { __esModule: true, default: l, ...l };
});
vi.mock('../../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  volatileBroadcastToRoom: vi.fn(),
  getGameRoom: vi.fn((code: string) => `room:${code}`),
}));
vi.mock('../../utils/rateLimiter', () => ({ checkRateLimit: vi.fn(() => true) }));
vi.mock('../../utils/socketValidation', () => ({ validatePayload: vi.fn() }));
vi.mock('../../dictionary', () => ({ isValidWord: vi.fn(() => true) }));
vi.mock('../../modules/gameStateManager', () => ({
  getGame: vi.fn(),
  getGameBySocketId: vi.fn(() => 'GAME1'),
  getUsernameBySocketId: vi.fn(() => 'p1'),
  updatePlayerScore: vi.fn(),
}));
vi.mock('@/lib/wordTower/versusMatch', () => ({
  submitVersusWord: vi.fn(),
  scrambleVersus: vi.fn((s: unknown) => s),
  sendVersusBomb: vi.fn(),
  versusStandings: vi.fn(() => []),
}));
vi.mock('@/lib/wordTower/wordTowerManager', () => ({
  serializeWordTowerState: vi.fn(() => ({ version: 1 })),
}));

import { handleSubmitTowerWord, handleSendTowerBomb } from '../wordTowerHandler';
import { broadcastToRoom, volatileBroadcastToRoom } from '../../utils/socketHelpers';
import { getGame, updatePlayerScore } from '../../modules/gameStateManager';
import { submitVersusWord, sendVersusBomb } from '@/lib/wordTower/versusMatch';

const mkSocket = () => ({ id: 's1', emit: vi.fn() } as unknown as Socket);
const mkIo = () => ({} as Server);

const matchState = { players: { p1: { game: {} }, p2: { game: {} } }, endsAtMs: 1 };
const gameBase = {
  gameState: 'in-progress',
  gameMode: 'word-tower',
  language: 'en',
  wordTowerVersusState: matchState,
};

describe('wordTowerHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('emits accepted result + standings + score on a valid word', () => {
    (getGame as unknown as Mock).mockReturnValue(gameBase);
    (submitVersusWord as unknown as Mock).mockReturnValue({ state: matchState, accepted: true, result: { meters: 5, tier: 'highRise' } });
    const sock = mkSocket();
    handleSubmitTowerWord(mkIo(), sock, { word: 'CAT' });
    expect(sock.emit).toHaveBeenCalledWith('towerWordResult', expect.objectContaining({ accepted: true }));
    expect(updatePlayerScore).toHaveBeenCalledWith('GAME1', 'p1', 5, true);
    expect(volatileBroadcastToRoom).toHaveBeenCalledWith(expect.anything(), 'room:GAME1', 'towerStandings', expect.anything());
  });

  it('emits rejection without scoring on an invalid word', () => {
    (getGame as unknown as Mock).mockReturnValue(gameBase);
    (submitVersusWord as unknown as Mock).mockReturnValue({ state: matchState, accepted: false, error: 'bad_chain' });
    const sock = mkSocket();
    handleSubmitTowerWord(mkIo(), sock, { word: 'XYZ' });
    expect(sock.emit).toHaveBeenCalledWith('towerWordResult', { accepted: false, error: 'bad_chain' });
    expect(updatePlayerScore).not.toHaveBeenCalled();
  });

  it('errors when not in a word-tower game', () => {
    (getGame as unknown as Mock).mockReturnValue({ ...gameBase, gameMode: 'wheel-rush' });
    const sock = mkSocket();
    handleSubmitTowerWord(mkIo(), sock, { word: 'CAT' });
    expect(sock.emit).toHaveBeenCalledWith('error', expect.objectContaining({ message: expect.stringContaining('word-tower') }));
  });

  it('broadcasts towerBombHit on a successful bomb', () => {
    (getGame as unknown as Mock).mockReturnValue(gameBase);
    (sendVersusBomb as unknown as Mock).mockReturnValue({ state: matchState, sent: true, targetId: 'p2', removed: 3, damage: 4 });
    const sock = mkSocket();
    handleSendTowerBomb(mkIo(), sock, { targetPlayerId: 'p2' });
    expect(sock.emit).toHaveBeenCalledWith('towerBombResult', { sent: true, targetId: 'p2', removed: 3, damage: 4 });
    expect(broadcastToRoom).toHaveBeenCalledWith(expect.anything(), 'room:GAME1', 'towerBombHit', expect.objectContaining({ fromId: 'p1', targetId: 'p2', removed: 3 }));
  });

  it('emits bomb failure reason when blocked', () => {
    (getGame as unknown as Mock).mockReturnValue(gameBase);
    (sendVersusBomb as unknown as Mock).mockReturnValue({ state: matchState, sent: false, error: 'no_lead' });
    const sock = mkSocket();
    handleSendTowerBomb(mkIo(), sock, { targetPlayerId: 'p2' });
    expect(sock.emit).toHaveBeenCalledWith('towerBombResult', { sent: false, error: 'no_lead' });
    expect(broadcastToRoom).not.toHaveBeenCalled();
  });
});
