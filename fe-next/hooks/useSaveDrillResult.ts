import { useState, useCallback } from 'react';
import type { DrillType, CognitiveDomain, BrainTier } from '@/shared/types/cognitive';

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
}

interface UseSaveDrillResultReturn {
  saveDrillResult: (result: DrillResult) => Promise<SaveDrillResultResponse>;
  isSaving: boolean;
}

export function useSaveDrillResult(): UseSaveDrillResultReturn {
  const [isSaving, setIsSaving] = useState(false);

  const saveDrillResult = useCallback(async (result: DrillResult): Promise<SaveDrillResultResponse> => {
    setIsSaving(true);
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
      };
    } catch (error) {
      const err = error as Error;
      console.error('Error saving drill result:', err);
      return { success: false, error: err.message || 'Failed to save drill result' };
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { saveDrillResult, isSaving };
}
