/**
 * Tests for Spectator Manager Module
 * Covers spectator lifecycle: add, remove, upgrade, limits, edge cases
 */

import {
  addSpectatorToGame,
  removeSpectatorFromGame,
  getGameSpectators,
  upgradeSpectatorToPlayer,
  isSpectator,
  getSpectatorCount,
  type SpectatorGameBase,
  type SpectatorOptions,
} from '../spectatorManager';

function createGame(overrides: Partial<SpectatorGameBase> = {}): SpectatorGameBase {
  return {
    users: {},
    spectators: {},
    lastActivity: Date.now(),
    ...overrides,
  };
}

describe('spectatorManager', () => {
  // ── addSpectatorToGame ──────────────────────────────────────────

  describe('addSpectatorToGame', () => {
    it('adds spectator with socketId and default options', () => {
      const game = createGame();
      const result = addSpectatorToGame(game, 'alice', 'sock-1');

      expect(result).toBe(true);
      expect(game.spectators['alice']).toBeDefined();
      expect(game.spectators['alice'].socketId).toBe('sock-1');
      expect(game.spectators['alice'].avatar).toBeNull();
      expect(game.spectators['alice'].authUserId).toBeNull();
      expect(game.spectators['alice'].guestTokenHash).toBeNull();
      expect(game.spectators['alice'].joinedAt).toBeGreaterThan(0);
    });

    it('adds spectator with full options', () => {
      const game = createGame();
      const opts: SpectatorOptions = {
        avatar: { id: 'cat', name: 'Cat', filename: 'cat.png' } as any,
        authUserId: 'auth-123',
        guestTokenHash: 'hash-abc',
        guestSessionId: 'sess-1',
      };
      addSpectatorToGame(game, 'bob', 'sock-2', opts);

      expect(game.spectators['bob'].authUserId).toBe('auth-123');
      expect(game.spectators['bob'].avatar).toEqual(opts.avatar);
    });

    it('returns false when game is null', () => {
      expect(addSpectatorToGame(null, 'alice', 'sock-1')).toBe(false);
    });

    it('updates lastActivity when present', () => {
      const game = createGame({ lastActivity: 1000 });
      addSpectatorToGame(game, 'alice', 'sock-1');
      expect(game.lastActivity).toBeGreaterThan(1000);
    });

    it('does not set lastActivity when field is absent', () => {
      const game = createGame();
      delete game.lastActivity;
      addSpectatorToGame(game, 'alice', 'sock-1');
      expect(game.lastActivity).toBeUndefined();
    });

    it('overwrites existing spectator with same username', () => {
      const game = createGame();
      addSpectatorToGame(game, 'alice', 'sock-1');
      addSpectatorToGame(game, 'alice', 'sock-2');
      expect(game.spectators['alice'].socketId).toBe('sock-2');
      expect(getSpectatorCount(game)).toBe(1);
    });
  });

  // ── removeSpectatorFromGame ─────────────────────────────────────

  describe('removeSpectatorFromGame', () => {
    it('removes existing spectator and returns true', () => {
      const game = createGame();
      addSpectatorToGame(game, 'alice', 'sock-1');
      const result = removeSpectatorFromGame(game, 'alice');

      expect(result).toBe(true);
      expect(game.spectators['alice']).toBeUndefined();
    });

    it('returns false for non-existent spectator', () => {
      const game = createGame();
      expect(removeSpectatorFromGame(game, 'ghost')).toBe(false);
    });

    it('returns false when game is null', () => {
      expect(removeSpectatorFromGame(null, 'alice')).toBe(false);
    });

    it('updates lastActivity', () => {
      const game = createGame({ lastActivity: 1000 });
      addSpectatorToGame(game, 'alice', 'sock-1');
      removeSpectatorFromGame(game, 'alice');
      expect(game.lastActivity).toBeGreaterThan(1000);
    });
  });

  // ── getGameSpectators ───────────────────────────────────────────

  describe('getGameSpectators', () => {
    it('returns empty array for null game', () => {
      expect(getGameSpectators(null)).toEqual([]);
    });

    it('returns empty array when no spectators', () => {
      expect(getGameSpectators(createGame())).toEqual([]);
    });

    it('returns all spectators with username field', () => {
      const game = createGame();
      addSpectatorToGame(game, 'alice', 'sock-1');
      addSpectatorToGame(game, 'bob', 'sock-2');

      const specs = getGameSpectators(game);
      expect(specs).toHaveLength(2);

      const names = specs.map(s => s.username).sort();
      expect(names).toEqual(['alice', 'bob']);
      expect(specs.every(s => s.socketId)).toBe(true);
    });
  });

  // ── isSpectator ─────────────────────────────────────────────────

  describe('isSpectator', () => {
    it('returns true for existing spectator', () => {
      const game = createGame();
      addSpectatorToGame(game, 'alice', 'sock-1');
      expect(isSpectator(game, 'alice')).toBe(true);
    });

    it('returns false for non-spectator', () => {
      expect(isSpectator(createGame(), 'ghost')).toBe(false);
    });

    it('returns false for null game', () => {
      expect(isSpectator(null, 'alice')).toBe(false);
    });
  });

  // ── getSpectatorCount ───────────────────────────────────────────

  describe('getSpectatorCount', () => {
    it('returns 0 for null game', () => {
      expect(getSpectatorCount(null)).toBe(0);
    });

    it('returns correct count', () => {
      const game = createGame();
      addSpectatorToGame(game, 'a', 's1');
      addSpectatorToGame(game, 'b', 's2');
      addSpectatorToGame(game, 'c', 's3');
      expect(getSpectatorCount(game)).toBe(3);
    });
  });

  // ── upgradeSpectatorToPlayer ────────────────────────────────────

  describe('upgradeSpectatorToPlayer', () => {
    it('moves spectator to users and removes from spectators', () => {
      const game = createGame();
      addSpectatorToGame(game, 'alice', 'sock-1', { authUserId: 'auth-1' });

      const result = upgradeSpectatorToPlayer(game, 'alice', 8);

      expect(result).toBe(true);
      expect(game.spectators['alice']).toBeUndefined();
      expect(game.users['alice']).toBeDefined();
      expect(game.users['alice'].socketId).toBe('sock-1');
      expect(game.users['alice'].authUserId).toBe('auth-1');
      expect(game.users['alice'].isHost).toBe(false);
      expect(game.users['alice'].presence).toBe('active');
      expect(game.users['alice'].username).toBe('alice');
    });

    it('returns false for null game', () => {
      expect(upgradeSpectatorToPlayer(null, 'alice', 8)).toBe(false);
    });

    it('returns false for non-existent spectator', () => {
      const game = createGame();
      expect(upgradeSpectatorToPlayer(game, 'ghost', 8)).toBe(false);
    });

    it('returns false when player slots are full', () => {
      const game = createGame();
      // Fill up 2 player slots
      game.users['p1'] = { socketId: 's1' } as any;
      game.users['p2'] = { socketId: 's2' } as any;
      addSpectatorToGame(game, 'alice', 'sock-1');

      const result = upgradeSpectatorToPlayer(game, 'alice', 2);

      expect(result).toBe(false);
      // Spectator should remain unchanged
      expect(game.spectators['alice']).toBeDefined();
      expect(game.users['alice']).toBeUndefined();
    });

    it('succeeds when exactly one slot remains', () => {
      const game = createGame();
      game.users['p1'] = { socketId: 's1' } as any;
      addSpectatorToGame(game, 'alice', 'sock-1');

      expect(upgradeSpectatorToPlayer(game, 'alice', 2)).toBe(true);
      expect(Object.keys(game.users)).toHaveLength(2);
    });

    it('preserves avatar through upgrade', () => {
      const game = createGame();
      const avatar = { id: 'cat', name: 'Cat', filename: 'cat.png' } as any;
      addSpectatorToGame(game, 'alice', 'sock-1', { avatar });

      upgradeSpectatorToPlayer(game, 'alice', 8);
      expect(game.users['alice'].avatar).toEqual(avatar);
    });

    it('updates lastActivity on successful upgrade', () => {
      const game = createGame({ lastActivity: 1000 });
      addSpectatorToGame(game, 'alice', 'sock-1');
      upgradeSpectatorToPlayer(game, 'alice', 8);
      expect(game.lastActivity).toBeGreaterThan(1000);
    });
  });

  // ── Race condition: concurrent upgrades ─────────────────────────

  describe('race condition: upgrade contention', () => {
    it('only one of two spectators can upgrade when one slot remains', () => {
      const game = createGame();
      game.users['p1'] = { socketId: 's1' } as any;
      addSpectatorToGame(game, 'alice', 'sock-a');
      addSpectatorToGame(game, 'bob', 'sock-b');

      // maxPlayers = 2, so only 1 slot left
      const r1 = upgradeSpectatorToPlayer(game, 'alice', 2);
      const r2 = upgradeSpectatorToPlayer(game, 'bob', 2);

      expect(r1).toBe(true);
      expect(r2).toBe(false);
      expect(game.users['alice']).toBeDefined();
      expect(game.spectators['bob']).toBeDefined();
    });

    it('upgrade after spectator was already removed returns false', () => {
      const game = createGame();
      addSpectatorToGame(game, 'alice', 'sock-1');
      removeSpectatorFromGame(game, 'alice');

      expect(upgradeSpectatorToPlayer(game, 'alice', 8)).toBe(false);
    });

    it('double upgrade of same spectator: second call fails', () => {
      const game = createGame();
      addSpectatorToGame(game, 'alice', 'sock-1');

      expect(upgradeSpectatorToPlayer(game, 'alice', 8)).toBe(true);
      expect(upgradeSpectatorToPlayer(game, 'alice', 8)).toBe(false);
    });
  });

  // ── Spectator disconnect edge case ──────────────────────────────

  describe('spectator disconnect', () => {
    it('removing a disconnected spectator does not affect others', () => {
      const game = createGame();
      addSpectatorToGame(game, 'alice', 'sock-1');
      addSpectatorToGame(game, 'bob', 'sock-2');

      removeSpectatorFromGame(game, 'alice');

      expect(getSpectatorCount(game)).toBe(1);
      expect(isSpectator(game, 'bob')).toBe(true);
    });
  });
});
