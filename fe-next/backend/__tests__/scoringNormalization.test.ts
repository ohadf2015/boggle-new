/**
 * Scoring Normalization Tests
 * Ensures all multiplayer game modes produce comparable score ranges.
 *
 * Target: all modes should produce winning scores in the ~100-250 range.
 */

import { BLAST_TILE_BONUSES, BLAST_RAINBOW_FLAT_BONUS } from '@/shared/constants/blastMultiplayerConstants';
import { HUNT_FIRST_FINDER_BONUS } from '@/shared/constants/wordHuntMultiplayerConstants';
import { calculateBlastTileBonus } from '../modules/blastModeManager';
import { calculateGameScores } from '../modules/scoringEngine';
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

describe('Scoring Normalization - Blast Tile Bonuses', () => {
  test('gold tile bonus should be reduced from 3 to 1.5', () => {
    expect(BLAST_TILE_BONUSES.gold).toBe(1.5);
  });

  test('diamond tile bonus should be reduced from 5 to 2.5', () => {
    expect(BLAST_TILE_BONUSES.diamond).toBe(2.5);
  });

  test('gem tile bonus should be reduced from 2.5 to 1.5', () => {
    expect(BLAST_TILE_BONUSES.gem).toBe(1.5);
  });

  test('bomb tile bonus should be reduced from 2 to 1.25', () => {
    expect(BLAST_TILE_BONUSES.bomb).toBe(1.25);
  });

  test('lightning tile bonus should be reduced from 2 to 1.25', () => {
    expect(BLAST_TILE_BONUSES.lightning).toBe(1.25);
  });

  test('prism tile bonus should be reduced from 2 to 1.25', () => {
    expect(BLAST_TILE_BONUSES.prism).toBe(1.25);
  });

  test('ice tile bonus should be reduced from 1.5 to 1', () => {
    expect(BLAST_TILE_BONUSES.ice).toBe(1);
  });

  test('magnet tile bonus should be reduced from 1.5 to 1', () => {
    expect(BLAST_TILE_BONUSES.magnet).toBe(1);
  });

  test('frozen tile bonus should be reduced from 1.5 to 1', () => {
    expect(BLAST_TILE_BONUSES.frozen).toBe(1);
  });

  test('standard tile remains at 1', () => {
    expect(BLAST_TILE_BONUSES.standard).toBe(1);
  });

  test('rainbow tile remains at 1 (flat bonus separate)', () => {
    expect(BLAST_TILE_BONUSES.rainbow).toBe(1);
  });

  test('rainbow flat bonus should be reduced from 5 to 3', () => {
    expect(BLAST_RAINBOW_FLAT_BONUS).toBe(3);
  });

  test('typical word path tile bonus is lower after normalization', () => {
    // A word crossing gold + gem + standard (3 tiles)
    const bonus = calculateBlastTileBonus(['gold', 'gem', 'standard']);
    // Old: 3 + 2.5 + 1 = 6.5
    // New: 1.5 + 1.5 + 1 = 4
    expect(bonus).toBe(4);
  });

  test('best-case word path tile bonus is reasonable', () => {
    // A word crossing diamond + gem + gold (rare best case on canonical tile set)
    const bonus = calculateBlastTileBonus(['diamond', 'gem', 'gold']);
    // 2.5 + 1.5 + 1.5 = 5.5
    expect(bonus).toBe(5.5);
  });
});

describe('Scoring Normalization - Word Hunt First Finder', () => {
  test('first finder bonus should be 20 (reduced from 35 to reduce dominance over vocabulary skill)', () => {
    expect(HUNT_FIRST_FINDER_BONUS).toBe(20);
  });
});

describe('Scoring Normalization - Blast Rarity Disabled', () => {
  test('blast mode scores should NOT receive rarity multiplier', () => {
    // GIVEN: A blast game with 7 players where only 1 found a rare word
    const game = createMockGame({
      gameMode: 'blast',
      users: Object.fromEntries(
        Array.from({ length: 7 }, (_, i) => [`Player${i + 1}`, createTestUser(`Player${i + 1}`)])
      ),
      playerWords: {
        'Player1': ['zephyr'],
      },
      playerWordDetails: {
        'Player1': [{ word: 'zephyr', score: 5, validated: true }],
      },
    });

    // 1 out of 7 = 14.3% → would be rare (1.5x) in classic, but should be 1.0x in blast
    const wordCountMap = { 'zephyr': 1 };
    const dictionaryWords = new Set(['zephyr']);

    const result = calculateGameScores(game, wordCountMap, dictionaryWords, new Set(), new Map(), { playerCount: 7, gameMode: 'blast' });

    const player1 = result.find(r => r.username === 'Player1')!;

    // THEN: Score should be 5 (no rarity — blast mode skips rarity)
    // In classic mode this would be round(5 * 1.5) = 8
    expect(player1.totalScore).toBe(5);
  });

  test('classic mode scores SHOULD still receive rarity multiplier', () => {
    // GIVEN: A classic game with 7 players where only 1 found a word
    // Note: rarity is disabled for rooms >7 players (duplicateRuleDisabled)
    const game = createMockGame({
      gameMode: 'classic',
      users: Object.fromEntries(
        Array.from({ length: 7 }, (_, i) => [`Player${i + 1}`, createTestUser(`Player${i + 1}`)])
      ),
      playerWords: {
        'Player1': ['zephyr'],
      },
      playerWordDetails: {
        'Player1': [{ word: 'zephyr', score: 5, validated: true }],
      },
    });

    // 1 out of 7 players found it = 14.3% = rare (1.5x)
    const wordCountMap = { 'zephyr': 1 };
    const dictionaryWords = new Set(['zephyr']);

    const result = calculateGameScores(game, wordCountMap, dictionaryWords, new Set(), new Map(), { playerCount: 7 });

    const player1 = result.find(r => r.username === 'Player1')!;

    // THEN: Score should be 7 (round(5 * 1.3) = 7, rare multiplier is 1.3 per GD-023)
    expect(player1.totalScore).toBe(7);
  });
});
