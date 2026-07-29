import { useState, useCallback } from 'react';
import type { DrillType, CognitiveDomain, BrainTier } from '@/shared/types/cognitive';
import type { DrillImprovement } from '@/shared/utils/drillImprovement';
import { useNetworkState } from '@/hooks/useNetworkState';
import { useOfflineModeFlag } from '@/hooks/useOfflineModeFlag';
import { getOfflineStore } from '@/lib/offline';
import { enqueueScore } from '@/lib/offline/scoreQueue';
import { emitBrainDrillGameEnd } from '@/lib/brain/drillAnalytics';

interface DrillResult {
  drillType: DrillType;
  level: number;
  score: number;
  durationSeconds: number;
  wordsFound: number;
  domainScoreEarned?: number;
  extraData?: Record<string, unknown>;
}

/** Brain score update returned after drill completion */
export interface DrillBrainScoreUpdate {
  overallScore: number;
  tier: BrainTier;
  domainScores: Record<CognitiveDomain, number>;
  scoreDelta: number;
  targetDomain: CognitiveDomain;
}

interface SaveDrillResultResponse {
  success: boolean;
  error?: string;
  brainScore?: DrillBrainScoreUpdate;
  xpAwarded?: number;
  levelPromoted?: boolean;
  newLevel?: number;
  previousLevel?: number;
  /** True when server detected a duplicate submissionId and returned the prior session without re-crediting */
  idempotent?: boolean;
  /** True when the result was enqueued for offline sync rather than submitted live. Rewards arrive on reconnect via /api/scores/sync. */
  queued?: boolean;
  /** "You got better" signals for the results screen (personal best, vs average, vs last). */
  improvement?: DrillImprovement;
}

interface UseSaveDrillResultReturn {
  saveDrillResult: (result: DrillResult) => Promise<SaveDrillResultResponse>;
  isSaving: boolean;
}

export function useSaveDrillResult(): UseSaveDrillResultReturn {
  const [isSaving, setIsSaving] = useState(false);
  const { online } = useNetworkState();
  const offlineFlag = useOfflineModeFlag();

  const saveDrillResult = useCallback(async (result: DrillResult): Promise<SaveDrillResultResponse> => {
    setIsSaving(true);
    // Record completion to analytics_events so finished drills appear in the
    // admin game log. Fired before the online/offline branch so both paths log;
    // trackGameEnd is fire-and-forget and never throws.
    emitBrainDrillGameEnd({
      drillType: result.drillType,
      level: result.level,
      score: result.score,
      durationSeconds: result.durationSeconds,
      wordsFound: result.wordsFound,
    });
    try {
      // Idempotency: generate per-submission UUID. Server dedupes against this
      // for ~5 min so retries (network blip, double-click) don't double-credit.
      const submissionId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const body = {
        ...result,
        extraData: { ...(result.extraData ?? {}), submissionId },
      };

      // Offline-mode branch: queue for sync, return optimistic success with no
      // rewards. /api/scores/sync will dispatch through processBrainDrillCompletion
      // on reconnect and the user sees rewards via the offline.sync.* toast.
      if (offlineFlag && !online) {
        const store = await getOfflineStore();
        await enqueueScore(store, 'brain', body);
        return {
          success: true,
          queued: true,
          xpAwarded: 0,
          levelPromoted: false,
        };
      }

      const response = await fetch('/api/drills/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': submissionId,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save drill result' }));
        return { success: false, error: errorData.error || 'Failed to save drill result' };
      }

      const data = await response.json();

      // Return the brainScore data from the API response
      return {
        success: true,
        brainScore: data.brainScore ? {
          overallScore: data.brainScore.overallScore,
          tier: data.brainScore.tier,
          domainScores: data.brainScore.domainScores,
          scoreDelta: data.brainScore.scoreDelta,
          targetDomain: data.brainScore.targetDomain,
        } : undefined,
        xpAwarded: data.xpAwarded ?? 0,
        levelPromoted: data.levelPromoted ?? false,
        newLevel: data.newLevel,
        previousLevel: data.previousLevel,
        idempotent: data.idempotent ?? false,
        improvement: data.improvement,
      };
    } catch (error) {
      const err = error as Error;
      console.error('Error saving drill result:', err);
      return { success: false, error: err.message || 'Failed to save drill result' };
    } finally {
      setIsSaving(false);
    }
  }, [online, offlineFlag]);

  return { saveDrillResult, isSaving };
}
