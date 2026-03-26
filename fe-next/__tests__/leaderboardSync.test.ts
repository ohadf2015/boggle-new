import { vi } from 'vitest';
/**
 * Tests for Single-Player Leaderboard Sync
 */

describe('Single-Player Leaderboard Sync', () => {
  beforeEach(() => {
    // Reset fetch mock
    global.fetch = vi.fn();
  });

  describe('API endpoint', () => {
    it('should accept valid sync request', async () => {
      const mockResponse = {
        success: true,
        totalScore: 150,
        gamesPlayed: 1,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await fetch('/api/single-player/sync-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestFingerprint: 'test-fingerprint',
          score: 150,
          wordCount: 10,
          username: 'TestUser',
        }),
      });

      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.success).toBe(true);
      expect(result.totalScore).toBe(150);
      expect(result.gamesPlayed).toBe(1);
    });

    it('should handle missing guestFingerprint', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid request: guestFingerprint and score are required' }),
      });

      const response = await fetch('/api/single-player/sync-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: 150,
          wordCount: 10,
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it('should accumulate scores across multiple games', async () => {
      const mockResponse1 = {
        success: true,
        totalScore: 150,
        gamesPlayed: 1,
      };

      const mockResponse2 = {
        success: true,
        totalScore: 300, // 150 + 150
        gamesPlayed: 2,
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse1,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse2,
        });

      // First game
      const response1 = await fetch('/api/single-player/sync-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestFingerprint: 'test-fingerprint',
          score: 150,
          wordCount: 10,
        }),
      });

      const result1 = await response1.json();
      expect(result1.totalScore).toBe(150);
      expect(result1.gamesPlayed).toBe(1);

      // Second game
      const response2 = await fetch('/api/single-player/sync-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestFingerprint: 'test-fingerprint',
          score: 150,
          wordCount: 10,
        }),
      });

      const result2 = await response2.json();
      expect(result2.totalScore).toBe(300);
      expect(result2.gamesPlayed).toBe(2);
    });
  });
});
