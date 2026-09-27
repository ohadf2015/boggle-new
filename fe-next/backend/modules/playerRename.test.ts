/**
 * renamePlayerInGame — in-place re-keying of all lobby state when a player
 * (guest OR host) changes their display name in the waiting room.
 *
 * Context: the `updateGuestName` socket handler used to silently reject hosts
 * (`if (user.isHost) return`) and only migrated a couple of maps. Hosts could
 * never rename on the spot; their localStorage name only took effect on the
 * next reconnect → "takes multiple tries". This helper centralizes the
 * migration so host + guest renames are atomic and complete.
 *
 * Rename is lobby-only (gameState === 'waiting'), so gameplay maps are empty in
 * practice — but we re-key the top-level username-keyed records anyway so the
 * helper stays correct if the waiting-guard is ever relaxed.
 */
import { describe, it, expect } from 'vitest';
import { renamePlayerInGame } from './playerRename';
import type { GameState } from './gameState/types';

function makeGame(overrides: Partial<GameState> = {}): GameState {
  return {
    hostUsername: null,
    users: {},
    playersReadyForNextGame: {},
    playerScores: {},
    playerWords: {},
    playerAchievements: {},
    playerCombos: {},
    peerValidationVotes: {},
    ...overrides,
  } as unknown as GameState;
}

describe('renamePlayerInGame', () => {
  it('re-keys the user record and updates its username field', () => {
    const game = makeGame({
      users: { Alice: { username: 'Alice', isHost: false } as never },
    });

    renamePlayerInGame(game, 'Alice', 'Bob');

    expect(game.users.Alice).toBeUndefined();
    expect(game.users.Bob).toBeDefined();
    expect(game.users.Bob.username).toBe('Bob');
  });

  it('preserves the isHost flag through the re-key', () => {
    const game = makeGame({
      hostUsername: 'Alice',
      users: { Alice: { username: 'Alice', isHost: true } as never },
    });

    renamePlayerInGame(game, 'Alice', 'Bob');

    expect(game.users.Bob.isHost).toBe(true);
  });

  it('updates hostUsername when the host renames (load-bearing for reconnect/kick/boost)', () => {
    const game = makeGame({
      hostUsername: 'Alice',
      users: { Alice: { username: 'Alice', isHost: true } as never },
    });

    renamePlayerInGame(game, 'Alice', 'Bob');

    expect(game.hostUsername).toBe('Bob');
  });

  it('leaves hostUsername untouched when a non-host renames', () => {
    const game = makeGame({
      hostUsername: 'Host',
      users: {
        Host: { username: 'Host', isHost: true } as never,
        Alice: { username: 'Alice', isHost: false } as never,
      },
    });

    renamePlayerInGame(game, 'Alice', 'Bob');

    expect(game.hostUsername).toBe('Host');
    expect(game.users.Host).toBeDefined();
  });

  it('migrates playersReadyForNextGame to the new name', () => {
    const game = makeGame({
      users: { Alice: { username: 'Alice', isHost: false } as never },
      playersReadyForNextGame: { Alice: true },
    });

    renamePlayerInGame(game, 'Alice', 'Bob');

    expect(game.playersReadyForNextGame.Alice).toBeUndefined();
    expect(game.playersReadyForNextGame.Bob).toBe(true);
  });

  it('migrates top-level username-keyed records (robustness if rename ever allowed mid-game)', () => {
    const game = makeGame({
      users: { Alice: { username: 'Alice', isHost: false } as never },
      playerScores: { Alice: 42 },
    });

    renamePlayerInGame(game, 'Alice', 'Bob');

    expect(game.playerScores.Alice).toBeUndefined();
    expect(game.playerScores.Bob).toBe(42);
  });

  it('rewrites only the renamer\'s chatHistory entries', () => {
    const game = makeGame({
      users: { Alice: { username: 'Alice', isHost: false } as never },
      chatHistory: [
        { username: 'Alice', message: 'hi', timestamp: 1 },
        { username: 'Carol', message: 'yo', timestamp: 2 },
        { username: 'Alice', message: 'ready?', timestamp: 3 },
      ],
    });

    renamePlayerInGame(game, 'Alice', 'Bob');

    expect(game.chatHistory?.map((e) => e.username)).toEqual(['Bob', 'Carol', 'Bob']);
  });

  it('is a no-op when oldName equals newName', () => {
    const game = makeGame({
      hostUsername: 'Alice',
      users: { Alice: { username: 'Alice', isHost: true } as never },
      playerScores: { Alice: 10 },
    });

    renamePlayerInGame(game, 'Alice', 'Alice');

    expect(game.users.Alice).toBeDefined();
    expect(game.playerScores.Alice).toBe(10);
    expect(game.hostUsername).toBe('Alice');
  });

  it('does not throw when optional structures are absent', () => {
    const game = makeGame({
      users: { Alice: { username: 'Alice', isHost: false } as never },
    });
    // No chatHistory / playerWordsSet / playerBoosts on this game
    expect(() => renamePlayerInGame(game, 'Alice', 'Bob')).not.toThrow();
    expect(game.users.Bob).toBeDefined();
  });
});
