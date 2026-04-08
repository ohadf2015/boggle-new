/**
 * useSaveDrillResult Hook Tests
 *
 * Tests for the drill result saving hook that should return brain score data
 */

import { vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSaveDrillResult } from '../useSaveDrillResult';

describe('useSaveDrillResult', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.clearAllMocks();
    (global.fetch as any).mockReset();
  });

  const mockDrillResult = {
    drillType: 'combo-master' as const,
    level: 1,
    score: 450,
    durationSeconds: 120,
    wordsFound: 12,
    extraData: { maxCombo: 8 },
  };

  const mockBrainScoreResponse = {
    success: true,
    data: { id: 'session-123' },
    brainScore: {
      overallScore: 55,
      tier: 'intermediate',
      domainScores: {
        processingSpeed: 50,
        workingMemory: 50,
        attention: 65,
        flexibility: 50,
        vocabulary: 50,
      },
      scoreDelta: 5,
    },
  };

  describe('saveDrillResult', () => {
    it('should return success and brainScore data on successful save', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBrainScoreResponse,
      });

      const { result } = renderHook(() => useSaveDrillResult());

      let saveResult: Awaited<ReturnType<typeof result.current.saveDrillResult>>;

      await act(async () => {
        saveResult = await result.current.saveDrillResult(mockDrillResult);
      });

      expect(saveResult!.success).toBe(true);
      expect(saveResult!.brainScore).toBeDefined();
      expect(saveResult!.brainScore?.overallScore).toBe(55);
      expect(saveResult!.brainScore?.scoreDelta).toBe(5);
      expect(saveResult!.brainScore?.tier).toBe('intermediate');
    });

    it('should return domain scores in the brainScore response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBrainScoreResponse,
      });

      const { result } = renderHook(() => useSaveDrillResult());

      let saveResult: Awaited<ReturnType<typeof result.current.saveDrillResult>>;

      await act(async () => {
        saveResult = await result.current.saveDrillResult(mockDrillResult);
      });

      expect(saveResult!.brainScore?.domainScores).toBeDefined();
      expect(saveResult!.brainScore?.domainScores?.attention).toBe(65);
    });

    it('should return targetDomain for the drill type', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockBrainScoreResponse,
          brainScore: {
            ...mockBrainScoreResponse.brainScore,
            targetDomain: 'attention',
          },
        }),
      });

      const { result } = renderHook(() => useSaveDrillResult());

      let saveResult: Awaited<ReturnType<typeof result.current.saveDrillResult>>;

      await act(async () => {
        saveResult = await result.current.saveDrillResult(mockDrillResult);
      });

      expect(saveResult!.brainScore?.targetDomain).toBe('attention');
    });

    it('should set isSaving to true during save operation', async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as any).mockReturnValueOnce(pendingPromise);

      const { result } = renderHook(() => useSaveDrillResult());

      expect(result.current.isSaving).toBe(false);

      // Start save without awaiting
      act(() => {
        result.current.saveDrillResult(mockDrillResult);
      });

      await waitFor(() => {
        expect(result.current.isSaving).toBe(true);
      });

      // Resolve the promise
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: async () => mockBrainScoreResponse,
        });
      });

      await waitFor(() => {
        expect(result.current.isSaving).toBe(false);
      });
    });

    it('should return error on failed API response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Unauthorized' }),
      });

      const { result } = renderHook(() => useSaveDrillResult());

      let saveResult: Awaited<ReturnType<typeof result.current.saveDrillResult>>;

      await act(async () => {
        saveResult = await result.current.saveDrillResult(mockDrillResult);
      });

      expect(saveResult!.success).toBe(false);
      expect(saveResult!.error).toBe('Unauthorized');
      expect(saveResult!.brainScore).toBeUndefined();
    });

    it('should return error on network failure', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useSaveDrillResult());

      let saveResult: Awaited<ReturnType<typeof result.current.saveDrillResult>>;

      await act(async () => {
        saveResult = await result.current.saveDrillResult(mockDrillResult);
      });

      expect(saveResult!.success).toBe(false);
      expect(saveResult!.error).toBe('Network error');
      expect(saveResult!.brainScore).toBeUndefined();
    });

    it('should send correct request body to API', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBrainScoreResponse,
      });

      const { result } = renderHook(() => useSaveDrillResult());

      await act(async () => {
        await result.current.saveDrillResult(mockDrillResult);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/drills/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockDrillResult),
      });
    });
  });
});
