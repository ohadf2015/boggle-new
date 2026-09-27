/**
 * useRankedTier Hook Tests
 *
 * Tests tier resolution, progress calculation, and override behavior.
 */

import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';

// --- Mocks ---

const mockProfile = { ranked_mmr: 0 };
const mockUseAuth = vi.fn(() => ({ profile: mockProfile }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

import { useRankedTier } from '../useRankedTier';

// --- Tests ---

describe('useRankedTier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ profile: mockProfile });
  });

  describe('Given 0 elo', () => {
    it('should return bronze tier', () => {
      mockUseAuth.mockReturnValue({ profile: { ranked_mmr: 0 } });

      const { result } = renderHook(() => useRankedTier());

      expect(result.current.tier.id).toBe('bronze');
      expect(result.current.tier.name).toBe('Bronze');
      expect(result.current.elo).toBe(0);
      expect(result.current.progress).toBe(0);
    });
  });

  describe('Given various elo ratings', () => {
    it('should return silver for 1000 elo', () => {
      mockUseAuth.mockReturnValue({ profile: { ranked_mmr: 1000 } });

      const { result } = renderHook(() => useRankedTier());

      expect(result.current.tier.id).toBe('silver');
      expect(result.current.elo).toBe(1000);
    });

    it('should return gold for 1500 elo', () => {
      mockUseAuth.mockReturnValue({ profile: { ranked_mmr: 1500 } });

      const { result } = renderHook(() => useRankedTier());

      expect(result.current.tier.id).toBe('gold');
    });

    it('should return platinum for 2000 elo', () => {
      mockUseAuth.mockReturnValue({ profile: { ranked_mmr: 2000 } });

      const { result } = renderHook(() => useRankedTier());

      expect(result.current.tier.id).toBe('platinum');
    });

    it('should return diamond for 2500+ elo', () => {
      mockUseAuth.mockReturnValue({ profile: { ranked_mmr: 3000 } });

      const { result } = renderHook(() => useRankedTier());

      expect(result.current.tier.id).toBe('diamond');
    });

    it('should return bronze for 999 elo (upper boundary)', () => {
      mockUseAuth.mockReturnValue({ profile: { ranked_mmr: 999 } });

      const { result } = renderHook(() => useRankedTier());

      expect(result.current.tier.id).toBe('bronze');
    });
  });

  describe('progress calculation', () => {
    it('should return 0 at tier minimum', () => {
      mockUseAuth.mockReturnValue({ profile: { ranked_mmr: 1000 } });

      const { result } = renderHook(() => useRankedTier());

      expect(result.current.progress).toBe(0);
    });

    it('should return ~0.5 at tier midpoint', () => {
      // Silver is 1000-1499, range 499, midpoint ~1250
      mockUseAuth.mockReturnValue({ profile: { ranked_mmr: 1250 } });

      const { result } = renderHook(() => useRankedTier());

      expect(result.current.progress).toBeCloseTo(0.5, 1);
    });

    it('should return close to 1 near tier max', () => {
      // Gold is 1500-1999, range 499
      mockUseAuth.mockReturnValue({ profile: { ranked_mmr: 1990 } });

      const { result } = renderHook(() => useRankedTier());

      expect(result.current.progress).toBeGreaterThan(0.9);
      expect(result.current.progress).toBeLessThanOrEqual(1);
    });
  });

  describe('overrideElo parameter', () => {
    it('should use overrideElo instead of profile elo', () => {
      mockUseAuth.mockReturnValue({ profile: { ranked_mmr: 500 } });

      const { result } = renderHook(() => useRankedTier(2000));

      expect(result.current.elo).toBe(2000);
      expect(result.current.tier.id).toBe('platinum');
    });

    it('should use 0 when no profile and no override', () => {
      mockUseAuth.mockReturnValue({ profile: null as any });

      const { result } = renderHook(() => useRankedTier());

      expect(result.current.elo).toBe(0);
      expect(result.current.tier.id).toBe('bronze');
    });
  });

  describe('nextTier', () => {
    it('should return silver as next tier for bronze', () => {
      mockUseAuth.mockReturnValue({ profile: { ranked_mmr: 500 } });

      const { result } = renderHook(() => useRankedTier());

      expect(result.current.nextTier).not.toBeNull();
      expect(result.current.nextTier?.id).toBe('silver');
    });

    it('should return null for diamond (highest tier)', () => {
      mockUseAuth.mockReturnValue({ profile: { ranked_mmr: 3000 } });

      const { result } = renderHook(() => useRankedTier());

      expect(result.current.nextTier).toBeNull();
    });
  });

  describe('season info', () => {
    it('should return a positive season number', () => {
      const { result } = renderHook(() => useRankedTier());

      expect(result.current.season).toBeGreaterThanOrEqual(1);
    });

    it('should return non-negative days remaining', () => {
      const { result } = renderHook(() => useRankedTier());

      expect(result.current.daysRemaining).toBeGreaterThanOrEqual(0);
    });
  });
});
