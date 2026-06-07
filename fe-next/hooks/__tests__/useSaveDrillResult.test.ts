/**
 * useSaveDrillResult Hook Tests
 *
 * Tests for the drill result saving hook that should return brain score data
 */

import { vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Default mocks: online + flag off so existing tests keep their current
// behaviour. Individual offline tests below override these.
const mockUseNetworkState = vi.fn(() => ({ online: true, slow: false, type: 'wifi', rttMs: 0 }));
vi.mock('@/hooks/useNetworkState', () => ({
  useNetworkState: () => mockUseNetworkState(),
}));

const mockUseOfflineModeFlag = vi.fn(() => false);
vi.mock('@/hooks/useOfflineModeFlag', () => ({
  useOfflineModeFlag: () => mockUseOfflineModeFlag(),
}));

const mockEnqueueScore = vi.fn();
vi.mock('@/lib/offline/scoreQueue', () => ({
  enqueueScore: (...args: unknown[]) => mockEnqueueScore(...args),
}));

const mockGetOfflineStore = vi.fn();
vi.mock('@/lib/offline', () => ({
  getOfflineStore: () => mockGetOfflineStore(),
}));

// Completion analytics is a separate, independently-tested concern
// (lib/brain/__tests__/drillAnalytics.test.ts). Stub it so these tests stay
// isolated from the growthTracking persistence path.
const mockEmitBrainDrillGameEnd = vi.fn();
vi.mock('@/lib/brain/drillAnalytics', () => ({
  emitBrainDrillGameEnd: (...args: unknown[]) => mockEmitBrainDrillGameEnd(...args),
}));

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

    it('should send correct request body to API with idempotency key', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBrainScoreResponse,
      });

      const { result } = renderHook(() => useSaveDrillResult());

      await act(async () => {
        await result.current.saveDrillResult(mockDrillResult);
      });

      // Idempotency: hook must inject a per-submission UUID into extraData
      // and mirror it as the Idempotency-Key header so the server can dedupe
      // retries (network blip, double-click) without double-crediting.
      const call = (global.fetch as any).mock.calls[0];
      expect(call[0]).toBe('/api/drills/submit');
      expect(call[1].method).toBe('POST');
      expect(call[1].headers['Content-Type']).toBe('application/json');
      const submissionId = call[1].headers['Idempotency-Key'];
      expect(typeof submissionId).toBe('string');
      expect(submissionId.length).toBeGreaterThan(0);
      const body = JSON.parse(call[1].body);
      expect(body.drillType).toBe(mockDrillResult.drillType);
      expect(body.score).toBe(mockDrillResult.score);
      expect(body.extraData.submissionId).toBe(submissionId);
      expect(body.extraData.maxCombo).toBe(mockDrillResult.extraData?.maxCombo);
    });

    it('should generate a unique submissionId per call', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockBrainScoreResponse,
      });
      const { result } = renderHook(() => useSaveDrillResult());

      await act(async () => {
        await result.current.saveDrillResult(mockDrillResult);
        await result.current.saveDrillResult(mockDrillResult);
      });

      const id1 = (global.fetch as any).mock.calls[0][1].headers['Idempotency-Key'];
      const id2 = (global.fetch as any).mock.calls[1][1].headers['Idempotency-Key'];
      expect(id1).not.toBe(id2);
    });
  });

  describe('offline queueing (phase 1.5 producer wire-up)', () => {
    beforeEach(() => {
      mockEnqueueScore.mockReset().mockResolvedValue('queued-uuid');
      mockGetOfflineStore.mockReset().mockResolvedValue({ /* stub store */ });
      mockUseNetworkState.mockReset().mockReturnValue({ online: true, slow: false, type: 'wifi', rttMs: 0 });
      mockUseOfflineModeFlag.mockReset().mockReturnValue(false);
    });

    it('when flag ON + offline: enqueues to score_queue, skips fetch, returns queued response', async () => {
      mockUseOfflineModeFlag.mockReturnValue(true);
      mockUseNetworkState.mockReturnValue({ online: false, slow: false, type: 'none', rttMs: 0 });

      const { result } = renderHook(() => useSaveDrillResult());

      let saveResult: Awaited<ReturnType<typeof result.current.saveDrillResult>>;
      await act(async () => {
        saveResult = await result.current.saveDrillResult(mockDrillResult);
      });

      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockEnqueueScore).toHaveBeenCalledTimes(1);
      const [, mode, payload] = mockEnqueueScore.mock.calls[0];
      expect(mode).toBe('brain');
      expect((payload as Record<string, unknown>).drillType).toBe(mockDrillResult.drillType);
      expect(saveResult!.success).toBe(true);
      expect(saveResult!.queued).toBe(true);
      expect(saveResult!.xpAwarded).toBe(0);
    });

    it('when flag OFF + offline: still hits fetch (no queue branch unless flag enabled)', async () => {
      mockUseOfflineModeFlag.mockReturnValue(false);
      mockUseNetworkState.mockReturnValue({ online: false, slow: false, type: 'none', rttMs: 0 });
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useSaveDrillResult());

      let saveResult: Awaited<ReturnType<typeof result.current.saveDrillResult>>;
      await act(async () => {
        saveResult = await result.current.saveDrillResult(mockDrillResult);
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(mockEnqueueScore).not.toHaveBeenCalled();
      expect(saveResult!.success).toBe(false);
    });

    it('when flag ON + online: live fetch path (no queue)', async () => {
      mockUseOfflineModeFlag.mockReturnValue(true);
      mockUseNetworkState.mockReturnValue({ online: true, slow: false, type: 'wifi', rttMs: 0 });
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBrainScoreResponse,
      });

      const { result } = renderHook(() => useSaveDrillResult());

      await act(async () => {
        await result.current.saveDrillResult(mockDrillResult);
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(mockEnqueueScore).not.toHaveBeenCalled();
    });
  });
});
