/**
 * Tests for useIsPracticeVeteran hook
 *
 * A "practice veteran" is a player who has outgrown the practice-mode UX.
 * Graduation rule:
 *   - Signed-in user: server has set `profile.practice_graduated_at`, OR
 *     (fallback) `profile.total_words >= 20`.
 *   - Guest: localStorage `GuestStats.words >= 20`.
 *
 * The server flag is the authoritative source; the guest rule is purely
 * client-side and disappears once the user signs in (server takes over).
 */

import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useIsPracticeVeteran } from '../useIsPracticeVeteran';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/utils/guestManager', () => ({
  getGuestStats: vi.fn(),
}));

import { useAuth } from '@/contexts/AuthContext';
import { getGuestStats } from '@/utils/guestManager';

const mockUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>;
const mockGetGuestStats = getGuestStats as unknown as ReturnType<typeof vi.fn>;

describe('useIsPracticeVeteran', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGuestStats.mockReturnValue({ games: 0, wins: 0, score: 0, words: 0 });
  });

  describe('signed-in users', () => {
    test('returns true when profile.practice_graduated_at is set', () => {
      mockUseAuth.mockReturnValue({
        profile: { practice_graduated_at: '2026-01-01T00:00:00Z', total_words: 0 },
      });

      const { result } = renderHook(() => useIsPracticeVeteran());
      expect(result.current).toBe(true);
    });

    test('returns true when total_words >= 20 even without server timestamp (fallback)', () => {
      mockUseAuth.mockReturnValue({
        profile: { practice_graduated_at: null, total_words: 20 },
      });

      const { result } = renderHook(() => useIsPracticeVeteran());
      expect(result.current).toBe(true);
    });

    test('returns false when total_words < 20 and no graduation timestamp', () => {
      mockUseAuth.mockReturnValue({
        profile: { practice_graduated_at: null, total_words: 10 },
      });

      const { result } = renderHook(() => useIsPracticeVeteran());
      expect(result.current).toBe(false);
    });

    test('returns false when profile has no words yet', () => {
      mockUseAuth.mockReturnValue({
        profile: { practice_graduated_at: null },
      });

      const { result } = renderHook(() => useIsPracticeVeteran());
      expect(result.current).toBe(false);
    });
  });

  describe('guest users', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ profile: null });
    });

    test('returns true when guest stats show 20+ words', () => {
      mockGetGuestStats.mockReturnValue({ games: 2, wins: 0, score: 500, words: 25 });

      const { result } = renderHook(() => useIsPracticeVeteran());
      expect(result.current).toBe(true);
    });

    test('returns false when guest has fewer than 20 words', () => {
      mockGetGuestStats.mockReturnValue({ games: 1, wins: 0, score: 100, words: 8 });

      const { result } = renderHook(() => useIsPracticeVeteran());
      expect(result.current).toBe(false);
    });

    test('returns false when guest has no stats', () => {
      mockGetGuestStats.mockReturnValue({ games: 0, wins: 0, score: 0, words: 0 });

      const { result } = renderHook(() => useIsPracticeVeteran());
      expect(result.current).toBe(false);
    });
  });

  test('server timestamp wins even if total_words field is missing', () => {
    mockUseAuth.mockReturnValue({
      profile: { practice_graduated_at: '2026-03-15T12:00:00Z' },
    });

    const { result } = renderHook(() => useIsPracticeVeteran());
    expect(result.current).toBe(true);
  });
});
