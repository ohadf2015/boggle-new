import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Supabase client and PostHog
vi.mock('@/lib/posthog', () => ({
  getPostHogServer: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

describe('Blast v2 server-side telemetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('captureGameCompleted', () => {
    it('fires game_completed event with correct shape', async () => {
      const { getPostHogServer } = await import('@/lib/posthog');
      const mockCapture = vi.fn().mockResolvedValue(undefined);
      vi.mocked(getPostHogServer).mockReturnValue({ capture: mockCapture } as any);

      const { captureGameCompleted } = await import('../telemetry.server');
      await captureGameCompleted('user-123', 5, true);

      expect(mockCapture).toHaveBeenCalledWith({
        distinctId: 'user-123',
        event: 'game_completed',
        properties: { mode: 'blast', level: 5, success: true },
      });
    });

    it('handles failed level captures', async () => {
      const { getPostHogServer } = await import('@/lib/posthog');
      const mockCapture = vi.fn().mockResolvedValue(undefined);
      vi.mocked(getPostHogServer).mockReturnValue({ capture: mockCapture } as any);

      const { captureGameCompleted } = await import('../telemetry.server');
      await captureGameCompleted('user-456', 10, false);

      expect(mockCapture).toHaveBeenCalledWith({
        distinctId: 'user-456',
        event: 'game_completed',
        properties: { mode: 'blast', level: 10, success: false },
      });
    });
  });

  describe('grantVeteranBonus', () => {
    it('returns 500 coins for first-time v2 clear with prior play', async () => {
      const { grantVeteranBonus, setSupabaseInstance } = await import('../telemetry.server');

      const mockSupabase = {
        from: vi.fn((table) => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: { unlocks_seen: { veteran_bonus_granted: false } },
                })
              ),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: {}, error: null })),
          })),
        })),
        rpc: vi.fn(() => Promise.resolve({ data: true })), // hasPriorPlay
      };
      setSupabaseInstance(mockSupabase as any);

      const result = await grantVeteranBonus('user-vet-123');

      expect(result.grantedCoins).toBe(500);
    });

    it('returns 0 coins if bonus already granted', async () => {
      const { grantVeteranBonus, setSupabaseInstance } = await import('../telemetry.server');

      const mockSupabase = {
        from: vi.fn((table) => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: { unlocks_seen: { veteran_bonus_granted: true } },
                })
              ),
            })),
          })),
        })),
        rpc: vi.fn(),
      };
      setSupabaseInstance(mockSupabase as any);

      const result = await grantVeteranBonus('user-existing-bonus');

      expect(result.grantedCoins).toBe(0);
    });

    it('returns 0 coins if no prior Blast play', async () => {
      const { grantVeteranBonus, setSupabaseInstance } = await import('../telemetry.server');

      const mockSupabase = {
        from: vi.fn((table) => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: { unlocks_seen: { veteran_bonus_granted: false } },
                })
              ),
            })),
          })),
        })),
        rpc: vi.fn(() => Promise.resolve({ data: false })), // no prior play
      };
      setSupabaseInstance(mockSupabase as any);

      const result = await grantVeteranBonus('user-new-123');

      expect(result.grantedCoins).toBe(0);
    });
  });
});
