import { describe, it, expect } from 'vitest';
import {
  presenceBreakdown,
  isStalled,
  hostName,
  STALLED_MS,
} from '../liveGameInsights';
import type { DetailedGamePlayer } from '@/backend/modules/gameQueryManager';

describe('liveGameInsights', () => {
  describe('presenceBreakdown', () => {
    it('should return empty breakdown for no players', () => {
      const result = presenceBreakdown([]);
      expect(result).toEqual({
        active: 0,
        idle: 0,
        afk: 0,
        disconnected: 0,
        total: 0,
      });
    });

    it('should count all active players', () => {
      const players = [
        { presence: 'active' as const },
        { presence: 'active' as const },
      ];
      const result = presenceBreakdown(players as DetailedGamePlayer[]);
      expect(result).toEqual({
        active: 2,
        idle: 0,
        afk: 0,
        disconnected: 0,
        total: 2,
      });
    });

    it('should count mixed presence states', () => {
      const players = [
        { presence: 'active' as const },
        { presence: 'idle' as const },
        { presence: 'afk' as const },
        { presence: 'disconnected' as const },
        { presence: 'active' as const },
        { presence: 'idle' as const },
      ];
      const result = presenceBreakdown(players as DetailedGamePlayer[]);
      expect(result).toEqual({
        active: 2,
        idle: 2,
        afk: 1,
        disconnected: 1,
        total: 6,
      });
    });
  });

  describe('isStalled', () => {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const twoMinutesAgo = now - 2 * 60 * 1000;

    it('should return false for in-progress game', () => {
      const game = {
        gameState: 'in-progress' as const,
        createdAt: twoMinutesAgo,
      };
      const result = isStalled(game, now);
      expect(result).toBe(false);
    });

    it('should return false for finished game', () => {
      const game = {
        gameState: 'finished' as const,
        createdAt: twoMinutesAgo,
      };
      const result = isStalled(game, now);
      expect(result).toBe(false);
    });

    it('should return false for waiting game created recently', () => {
      const game = {
        gameState: 'waiting' as const,
        createdAt: oneMinuteAgo,
      };
      const result = isStalled(game, now);
      expect(result).toBe(false);
    });

    it('should return true for waiting game older than STALLED_MS', () => {
      const game = {
        gameState: 'waiting' as const,
        createdAt: now - STALLED_MS - 10000, // 10s over threshold
      };
      const result = isStalled(game, now);
      expect(result).toBe(true);
    });

    it('should return false for validating game created recently', () => {
      const game = {
        gameState: 'validating' as const,
        createdAt: oneMinuteAgo,
      };
      const result = isStalled(game, now);
      expect(result).toBe(false);
    });

    it('should return true for validating game older than STALLED_MS', () => {
      const game = {
        gameState: 'validating' as const,
        createdAt: now - STALLED_MS - 5000,
      };
      const result = isStalled(game, now);
      expect(result).toBe(true);
    });

    it('should use STALLED_MS threshold (90s)', () => {
      expect(STALLED_MS).toBe(90 * 1000);
    });
  });

  describe('hostName', () => {
    it('should return null for empty players', () => {
      const result = hostName([]);
      expect(result).toBeNull();
    });

    it('should find host by isHost flag', () => {
      const players = [
        { username: 'alice', isHost: false },
        { username: 'bob', isHost: true },
        { username: 'charlie', isHost: false },
      ];
      const result = hostName(players as DetailedGamePlayer[]);
      expect(result).toBe('bob');
    });

    it('should return null if no host found', () => {
      const players = [
        { username: 'alice', isHost: false },
        { username: 'bob', isHost: false },
      ];
      const result = hostName(players as DetailedGamePlayer[]);
      expect(result).toBeNull();
    });

    it('should return first host if multiple exist (defensive)', () => {
      const players = [
        { username: 'alice', isHost: true },
        { username: 'bob', isHost: true },
      ];
      const result = hostName(players as DetailedGamePlayer[]);
      expect(result).toBe('alice');
    });
  });
});
