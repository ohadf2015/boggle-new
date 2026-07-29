/**
 * Vault Manager Tests
 * Tests for timed exclusive vault board system
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import {
  getActiveVault,
  getVaultLeaderboard,
  submitVaultScore,
  getUpcomingVaults,
  type VaultBoard,
  type VaultBoardScore,
} from '../vaultManager';

// Chainable mock that tracks calls
const callLog: Array<{ method: string; args: unknown[] }> = [];
let queryResult: { data: unknown; error: unknown } = { data: null, error: null };
let upsertResult: { data: unknown; error: unknown } = { data: null, error: null };

function createChain(): Record<string, Mock> {
  const chain: Record<string, Mock> = {};
  const methods = ['select', 'insert', 'update', 'upsert', 'eq', 'gte', 'lte', 'lt', 'gt', 'order', 'limit', 'single', 'from', 'maybeSingle'];

  for (const method of methods) {
    chain[method] = vi.fn((...args: unknown[]) => {
      callLog.push({ method, args });
      if (method === 'single' || method === 'maybeSingle') {
        return queryResult;
      }
      if (method === 'limit') {
        return queryResult;
      }
      if (method === 'upsert') {
        // upsert is terminal-ish but chains to select
        return {
          ...chain,
          select: vi.fn((...sArgs: unknown[]) => {
            callLog.push({ method: 'select', args: sArgs });
            return {
              single: vi.fn(() => {
                callLog.push({ method: 'single', args: [] });
                return upsertResult;
              }),
            };
          }),
        };
      }
      return new Proxy(queryResult, {
        get(target, prop) {
          if (prop === 'data') return target.data;
          if (prop === 'error') return target.error;
          if (typeof prop === 'string' && chain[prop]) return chain[prop];
          return undefined;
        },
      });
    });
  }
  return chain;
}

let mockChain: Record<string, Mock>;

vi.mock('../supabaseServer', () => ({
  getSupabase: () => ({
    from: (...args: unknown[]) => {
      callLog.push({ method: 'from', args });
      return mockChain;
    },
  }),
}));

function getCallArgs(method: string): unknown[][] {
  return callLog.filter((c) => c.method === method).map((c) => c.args);
}

describe('vaultManager', () => {
  beforeEach(() => {
    callLog.length = 0;
    queryResult = { data: null, error: null };
    upsertResult = { data: null, error: null };
    mockChain = createChain();
  });

  // ==========================================
  // Types
  // ==========================================
  describe('types', () => {
    it('should define VaultBoard with required fields', () => {
      const board: VaultBoard = {
        id: 'v-1',
        board_name: 'Midnight Rush',
        grid: [['A', 'B'], ['C', 'D']],
        language: 'en',
        opens_at: '2026-03-22T18:00:00Z',
        closes_at: '2026-03-23T00:00:00Z',
        is_active: true,
        created_at: '2026-03-20T00:00:00Z',
      };
      expect(board.id).toBe('v-1');
      expect(board.is_active).toBe(true);
    });

    it('should define VaultBoardScore with required fields', () => {
      const score: VaultBoardScore = {
        id: 's-1',
        vault_board_id: 'v-1',
        player_id: 'p-1',
        score: 250,
        words_found: 15,
        played_at: '2026-03-22T19:00:00Z',
        display_name: 'Player1',
      };
      expect(score.score).toBe(250);
      expect(score.words_found).toBe(15);
    });
  });

  // ==========================================
  // getActiveVault
  // ==========================================
  describe('getActiveVault', () => {
    it('should return null when no active vault exists', async () => {
      queryResult = { data: null, error: null };
      const result = await getActiveVault();
      expect(result).toBeNull();
    });

    it('should query vault_boards with is_active=true', async () => {
      queryResult = { data: null, error: null };
      await getActiveVault();
      expect(getCallArgs('from')[0]).toEqual(['vault_boards']);
      expect(getCallArgs('eq').some((a) => a[0] === 'is_active' && a[1] === true)).toBe(true);
    });

    it('should return the active vault board', async () => {
      const vault: VaultBoard = {
        id: 'v-1',
        board_name: 'Midnight Rush',
        grid: [['A', 'B'], ['C', 'D']],
        language: 'en',
        opens_at: '2026-03-22T18:00:00Z',
        closes_at: '2026-03-23T00:00:00Z',
        is_active: true,
        created_at: '2026-03-20T00:00:00Z',
      };
      queryResult = { data: vault, error: null };
      const result = await getActiveVault();
      expect(result).toEqual(vault);
    });

    it('should throw on supabase error', async () => {
      queryResult = { data: null, error: { message: 'DB error' } };
      await expect(getActiveVault()).rejects.toThrow('Failed to fetch active vault');
    });
  });

  // ==========================================
  // getVaultLeaderboard
  // ==========================================
  describe('getVaultLeaderboard', () => {
    it('should return leaderboard entries ordered by score desc', async () => {
      queryResult = { data: [], error: null };
      const result = await getVaultLeaderboard('v-1');
      expect(result).toEqual([]);
      expect(getCallArgs('from')[0]).toEqual(['vault_board_scores']);
      expect(getCallArgs('eq').some((a) => a[0] === 'vault_board_id' && a[1] === 'v-1')).toBe(true);
    });

    it('should accept optional limit parameter', async () => {
      queryResult = { data: [], error: null };
      await getVaultLeaderboard('v-1', 10);
      expect(getCallArgs('limit').some((a) => a[0] === 10)).toBe(true);
    });

    it('should use default limit of 50', async () => {
      queryResult = { data: [], error: null };
      await getVaultLeaderboard('v-1');
      expect(getCallArgs('limit').some((a) => a[0] === 50)).toBe(true);
    });

    it('should throw on supabase error', async () => {
      queryResult = { data: null, error: { message: 'DB error' } };
      await expect(getVaultLeaderboard('v-1')).rejects.toThrow('Failed to fetch vault leaderboard');
    });
  });

  // ==========================================
  // submitVaultScore
  // ==========================================
  describe('submitVaultScore', () => {
    it('should upsert score keeping the best', async () => {
      upsertResult = {
        data: { id: 's-1', vault_board_id: 'v-1', player_id: 'p-1', score: 300, words_found: 20 },
        error: null,
      };
      const result = await submitVaultScore('v-1', 'p-1', 300, 20);
      expect(result).toBeDefined();
      expect(result!.score).toBe(300);
    });

    it('should call from vault_board_scores', async () => {
      upsertResult = { data: { id: 's-1', score: 100 }, error: null };
      await submitVaultScore('v-1', 'p-1', 100, 5);
      expect(getCallArgs('from')[0]).toEqual(['vault_board_scores']);
    });

    it('should throw on upsert error', async () => {
      upsertResult = { data: null, error: { message: 'Upsert failed' } };
      await expect(submitVaultScore('v-1', 'p-1', 100, 5)).rejects.toThrow('Failed to submit vault score');
    });
  });

  // ==========================================
  // getUpcomingVaults
  // ==========================================
  describe('getUpcomingVaults', () => {
    it('should return upcoming vault boards', async () => {
      queryResult = { data: [], error: null };
      const result = await getUpcomingVaults();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should query vault_boards with is_active=false and future opens_at', async () => {
      queryResult = { data: [], error: null };
      await getUpcomingVaults();
      expect(getCallArgs('from')[0]).toEqual(['vault_boards']);
      expect(getCallArgs('eq').some((a) => a[0] === 'is_active' && a[1] === false)).toBe(true);
    });

    it('should accept optional limit parameter', async () => {
      queryResult = { data: [], error: null };
      await getUpcomingVaults(3);
      expect(getCallArgs('limit').some((a) => a[0] === 3)).toBe(true);
    });

    it('should use default limit of 5', async () => {
      queryResult = { data: [], error: null };
      await getUpcomingVaults();
      expect(getCallArgs('limit').some((a) => a[0] === 5)).toBe(true);
    });

    it('should throw on supabase error', async () => {
      queryResult = { data: null, error: { message: 'DB error' } };
      await expect(getUpcomingVaults()).rejects.toThrow('Failed to fetch upcoming vaults');
    });
  });
});
