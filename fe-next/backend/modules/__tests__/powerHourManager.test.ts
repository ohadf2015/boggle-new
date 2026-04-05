/**
 * Power Hour Manager Tests
 *
 * Backend module for managing Power Hour boost state.
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import {
  activatePowerHour,
  getPowerHourStatus,
  isPowerHourActive,
  POWER_HOUR_DURATION_MS,
} from '../powerHourManager';

// Mock Supabase
const { mockSelect, mockUpdate, mockUpsert, mockEq, mockSingle } = vi.hoisted(() => {
  const mockSelect = vi.fn();
  const mockUpdate = vi.fn();
  const mockUpsert = vi.fn();
  const mockEq = vi.fn();
  const mockSingle = vi.fn();
  return { mockSelect, mockUpdate, mockUpsert, mockEq, mockSingle };
});

vi.mock('../supabaseServer', () => ({
  getSupabase: () => ({
    from: () => ({
      select: (...args: unknown[]) => {
        mockSelect(...args);
        return { eq: (col: string, val: string) => { mockEq(col, val); return { single: () => mockSingle() }; } };
      },
      update: (data: unknown) => {
        mockUpdate(data);
        return { eq: (col: string, val: string) => { mockEq(col, val); return Promise.resolve({ error: null }); } };
      },
      upsert: (data: unknown) => {
        mockUpsert(data);
        return { eq: (col: string, val: string) => { mockEq(col, val); return Promise.resolve({ error: null }); } };
      },
    }),
  }),
}));

describe('powerHourManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POWER_HOUR_DURATION_MS', () => {
    it('should be 60 minutes', () => {
      expect(POWER_HOUR_DURATION_MS).toBe(60 * 60 * 1000);
    });
  });

  describe('activatePowerHour', () => {
    it('should activate power hour for player without existing record', async () => {
      mockSingle.mockResolvedValue({ data: null, error: null });

      const result = await activatePowerHour('player-1');

      expect(result.active).toBe(true);
      expect(result.expiresAt).toBeTruthy();
      expect(result.remainingMinutes).toBeGreaterThan(58);
      expect(result.remainingMinutes).toBeLessThanOrEqual(60);
    });

    it('should not re-activate if already active today', async () => {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const today = new Date().toISOString().split('T')[0];

      mockSingle.mockResolvedValue({
        data: {
          power_hour_expires_at: expiresAt,
          power_hour_activated_date: today,
        },
        error: null,
      });

      const result = await activatePowerHour('player-1');

      expect(result.active).toBe(true);
      expect(result.remainingMinutes).toBeLessThanOrEqual(30);
      // Should not have called update (no re-activation)
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('getPowerHourStatus', () => {
    it('should return inactive when no record exists', async () => {
      mockSingle.mockResolvedValue({ data: null, error: null });

      const status = await getPowerHourStatus('player-1');

      expect(status.active).toBe(false);
      expect(status.remainingMinutes).toBe(0);
    });

    it('should return active status with remaining time', async () => {
      const expiresAt = new Date(Date.now() + 45 * 60 * 1000).toISOString();
      const today = new Date().toISOString().split('T')[0];

      mockSingle.mockResolvedValue({
        data: {
          power_hour_expires_at: expiresAt,
          power_hour_activated_date: today,
        },
        error: null,
      });

      const status = await getPowerHourStatus('player-1');

      expect(status.active).toBe(true);
      expect(status.remainingMinutes).toBeGreaterThan(43);
      expect(status.remainingMinutes).toBeLessThanOrEqual(45);
    });

    it('should return inactive when expired', async () => {
      const expiresAt = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const today = new Date().toISOString().split('T')[0];

      mockSingle.mockResolvedValue({
        data: {
          power_hour_expires_at: expiresAt,
          power_hour_activated_date: today,
        },
        error: null,
      });

      const status = await getPowerHourStatus('player-1');

      expect(status.active).toBe(false);
      expect(status.remainingMinutes).toBe(0);
    });
  });

  describe('isPowerHourActive', () => {
    it('should return true when power hour is active', async () => {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const today = new Date().toISOString().split('T')[0];

      mockSingle.mockResolvedValue({
        data: {
          power_hour_expires_at: expiresAt,
          power_hour_activated_date: today,
        },
        error: null,
      });

      expect(await isPowerHourActive('player-1')).toBe(true);
    });

    it('should return false when expired', async () => {
      mockSingle.mockResolvedValue({ data: null, error: null });

      expect(await isPowerHourActive('player-1')).toBe(false);
    });
  });
});
