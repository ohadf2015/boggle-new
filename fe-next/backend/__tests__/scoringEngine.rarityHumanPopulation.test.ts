/**
 * Rarity scoring's percentage denominator must match wordCountMap's
 * human-only numerator (the caller already excludes bots from finder counts
 * — "bots must not strip uniqueness bonuses"). Before this, gameScores.ts
 * passed the ALL-users count (humans + bots) as the denominator, so a bot-
 * filled room could tag a word every human found as rare/uncommon purely
 * because bots inflated the denominator without ever appearing in the
 * numerator — a rarity bonus results shows that live scoring never applied
 * (live's rarity multiplier is always 1, see wordScore.ts).
 */

import { calculateGameScores, countHumanPlayers } from '../modules/scoringEngine';
import type { Game, GameUser, Avatar } from '@/shared/types/game';

function createTestUser(username: string, overrides: Partial<GameUser> = {}): GameUser {
  return {
    username,
    socketId: `socket-${username}`,
    avatar: null as unknown as Avatar,
    isHost: false,
    isBot: false,
    ...overrides,
  };
}

function createMockGame(overrides: Record<string, unknown> = {}): Game {
  return {
    gameCode: 'TEST1',
    hostSocketId: 'host-socket',
    hostUsername: 'TestHost',
    hostPlayerId: 'host-player-id',
    roomName: 'Test Room',
    language: 'en',
    gameState: 'finished',
    users: {},
    playerScores: {},
    playerWords: {},
    playerWordDetails: {},
    playerAchievements: {},
    lastActivity: Date.now(),
    createdAt: Date.now(),
    isRanked: false,
    allowLateJoin: true,
    ...overrides,
  } as Game;
}

describe('countHumanPlayers', () => {
  it('counts only non-bot users', () => {
    const users = {
      alice: createTestUser('alice'),
      bot1: createTestUser('bot1', { isBot: true }),
      bot2: createTestUser('bot2', { isBot: true }),
    };
    expect(countHumanPlayers(users)).toBe(1);
  });

  it('returns 0 for empty/missing users', () => {
    expect(countHumanPlayers({})).toBe(0);
    expect(countHumanPlayers(null)).toBe(0);
    expect(countHumanPlayers(undefined)).toBe(0);
  });
});

describe('calculateGameScores — rarity population matches the human-only finder count', () => {
  it('a solo human playing with bots gets no rarity bonus (matches live, which never applies one)', () => {
    // 1 human + 3 bots = 4 users. wordCountMap only counts the human (1).
    // Buggy denominator (playerCount=4): 1/4=25% -> "uncommon" (1.15x) -> 12.
    // Fixed denominator (humanPlayerCount=1): rarityPopulation>1 is false -> common -> 10.
    const game = createMockGame({
      gameMode: 'classic',
      users: {
        alice: createTestUser('alice'),
        bot1: createTestUser('bot1', { isBot: true }),
        bot2: createTestUser('bot2', { isBot: true }),
        bot3: createTestUser('bot3', { isBot: true }),
      },
      playerWords: { alice: ['zephyr'] },
      playerWordDetails: { alice: [{ word: 'zephyr', score: 10, validated: true }] },
    });
    const wordCountMap = { zephyr: 1 };
    const dictionaryWords = new Set(['zephyr']);

    const result = calculateGameScores(game, wordCountMap, dictionaryWords, new Set(), new Map(), {
      playerCount: 4,
      humanPlayerCount: countHumanPlayers(game.users),
      gameMode: 'classic',
    });

    expect(result.find((r) => r.username === 'alice')!.totalScore).toBe(10);
  });

  it('a word every human found is never tagged rare just because bots are in the room', () => {
    // 2 humans (both found it) + 6 bots = 8 users. wordCountMap counts both humans (2).
    // Buggy denominator (playerCount=8): 2/8=25% -> "uncommon" (1.15x) -> 12.
    // Fixed denominator (humanPlayerCount=2): 2/2=100% -> common -> 10.
    const users: Record<string, GameUser> = {
      alice: createTestUser('alice'),
      bob: createTestUser('bob'),
    };
    for (let i = 1; i <= 6; i++) users[`bot${i}`] = createTestUser(`bot${i}`, { isBot: true });

    const game = createMockGame({
      gameMode: 'classic',
      users,
      playerWords: { alice: ['zephyr'], bob: ['zephyr'] },
      playerWordDetails: {
        alice: [{ word: 'zephyr', score: 10, validated: true }],
        bob: [{ word: 'zephyr', score: 10, validated: true }],
      },
    });
    const wordCountMap = { zephyr: 2 };
    const dictionaryWords = new Set(['zephyr']);

    const result = calculateGameScores(game, wordCountMap, dictionaryWords, new Set(), new Map(), {
      playerCount: 8,
      humanPlayerCount: countHumanPlayers(game.users),
      gameMode: 'classic',
    });

    expect(result.find((r) => r.username === 'alice')!.totalScore).toBe(10);
    expect(result.find((r) => r.username === 'bob')!.totalScore).toBe(10);
  });

  it('omitting humanPlayerCount falls back to playerCount (unchanged default behaviour)', () => {
    // Same shape as the pre-existing scoringNormalization.test.ts pin: 7 all-human
    // players, no bots, 1 finder -> 14.3% -> rare (1.3x) -> round(5*1.3)=7.
    const game = createMockGame({
      gameMode: 'classic',
      users: Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`Player${i + 1}`, createTestUser(`Player${i + 1}`)])),
      playerWords: { Player1: ['zephyr'] },
      playerWordDetails: { Player1: [{ word: 'zephyr', score: 5, validated: true }] },
    });
    const wordCountMap = { zephyr: 1 };
    const dictionaryWords = new Set(['zephyr']);

    const result = calculateGameScores(game, wordCountMap, dictionaryWords, new Set(), new Map(), { playerCount: 7 });

    expect(result.find((r) => r.username === 'Player1')!.totalScore).toBe(7);
  });
});
