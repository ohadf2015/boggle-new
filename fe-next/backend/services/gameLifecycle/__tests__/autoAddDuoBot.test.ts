/**
 * exp-mp-duo-bot-v1: a public 1v1 room gets ONE bot at game start, so a
 * two-human room plays as three. 28d: in 2-player rooms where the player found
 * 0 words only 67% started another game, vs ~89% in rooms of 3+.
 * Only in rooms Quick Play created; never in a friend room, a classroom, a
 * ranked game, a private room or a tournament.
 */
import { vi } from 'vitest';
import { autoAddBotForDuo } from '../autoAddBots';

vi.mock('../../../modules/gameStateManager', () => ({
  addUserToGame: vi.fn(),
  getGameUsers: vi.fn(() => []),
}));

const { mockBotManager } = vi.hoisted(() => ({
  mockBotManager: {
    getGameBots: vi.fn(),
    addBot: vi.fn(),
    addBotWithAdaptiveDifficulty: vi.fn(),
  },
}));
vi.mock('../../../modules/botManager', () => ({ default: mockBotManager, ...mockBotManager }));
vi.mock('../../../utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { addUserToGame } from '../../../modules/gameStateManager';

const duo = (over: Record<string, unknown> = {}) => ({
  users: {
    Alice: { socketId: 's1', isHost: true, isBot: false },
    Bob: { socketId: 's2', isHost: false, isBot: false },
  } as Record<string, Record<string, unknown>>,
  language: 'en',
  gameState: 'in-progress',
  isPrivate: false,
  isQuickPlay: true,
  isClassroom: false,
  isRanked: false,
  tournamentId: null,
  ...over,
});

describe('autoAddBotForDuo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBotManager.getGameBots.mockReturnValue([]);
    mockBotManager.addBot.mockImplementation((_gc: string, difficulty: string) => ({
      id: 'b1', username: `Bot-${difficulty}`, difficulty, avatar: { emoji: '🤖' },
    }));
  });

  it('Given a public room with exactly 2 humans and no bots, When the game starts, Then one easy bot joins', async () => {
    const game = duo();
    const result = await autoAddBotForDuo('GAME1', game as never);

    expect(result.botsAdded).toBe(1);
    expect(mockBotManager.addBot).toHaveBeenCalledTimes(1);
    expect(mockBotManager.addBot).toHaveBeenCalledWith('GAME1', 'easy', game.users, 'en');
    expect(addUserToGame).toHaveBeenCalledWith('GAME1', 'Bot-easy', 'bot-b1', expect.objectContaining({ isHost: false, playerId: 'b1' }));
  });

  it('marks the seated user as a bot so later rounds see it (no second bot next round)', async () => {
    const game = duo();
    (addUserToGame as unknown as ReturnType<typeof vi.fn>).mockImplementation((_gc: string, name: string) => {
      game.users[name] = { socketId: 'bot-b1' };
    });
    await autoAddBotForDuo('GAME1', game as never);
    expect(game.users['Bot-easy']).toMatchObject({ isBot: true, botDifficulty: 'easy' });

    // Next round: the bot is already seated.
    const again = await autoAddBotForDuo('GAME1', game as never);
    expect(again.botsAdded).toBe(0);
  });

  it.each([
    ['a classroom room', { isClassroom: true }],
    ['a ranked game', { isRanked: true }],
    ['a private room', { isPrivate: true }],
    ['a tournament', { tournamentId: 't1' }],
    // Friend rooms are public in code (only classrooms are private), but two
    // friends who made a room to play each other did not ask for a third seat.
    ['a room a player made with Create Room (not Quick Play)', { isQuickPlay: false }],
    ['a room whose origin was lost on restore', { isQuickPlay: undefined }],
  ])('never adds a bot to %s', async (_label, over) => {
    const result = await autoAddBotForDuo('GAME1', duo(over) as never);
    expect(result.botsAdded).toBe(0);
    expect(mockBotManager.addBot).not.toHaveBeenCalled();
  });

  it('does nothing with 1 human (the solo path owns that) or 3+ humans', async () => {
    const solo = duo({ users: { Alice: { isHost: true } } });
    const trio = duo({ users: { A: { isHost: true }, B: {}, C: {} } });
    expect((await autoAddBotForDuo('GAME1', solo as never)).botsAdded).toBe(0);
    expect((await autoAddBotForDuo('GAME1', trio as never)).botsAdded).toBe(0);
  });

  it('does not count a disconnected human (2 seats, 1 present = not a duo)', async () => {
    const game = duo({ users: { Alice: { isHost: true }, Bob: { disconnected: true } } });
    expect((await autoAddBotForDuo('GAME1', game as never)).botsAdded).toBe(0);
  });

  it('does nothing when a bot is already seated, even if the in-memory registry was wiped', async () => {
    const game = duo({ users: { Alice: { isHost: true }, Bob: {}, Botty: { isBot: true } } });
    expect((await autoAddBotForDuo('GAME1', game as never)).botsAdded).toBe(0);
    mockBotManager.getGameBots.mockReturnValue([{ id: 'x' }]);
    expect((await autoAddBotForDuo('GAME1', duo() as never)).botsAdded).toBe(0);
  });

  it('only acts at game start (in-progress), never in the lobby or after the game', async () => {
    expect((await autoAddBotForDuo('GAME1', duo({ gameState: 'waiting' }) as never)).botsAdded).toBe(0);
    expect((await autoAddBotForDuo('GAME1', duo({ gameState: 'finished' }) as never)).botsAdded).toBe(0);
  });

  it('survives a bot-creation failure (start is never blocked)', async () => {
    mockBotManager.addBot.mockImplementation(() => { throw new Error('boom'); });
    const result = await autoAddBotForDuo('GAME1', duo() as never);
    expect(result.botsAdded).toBe(0);
  });
});
