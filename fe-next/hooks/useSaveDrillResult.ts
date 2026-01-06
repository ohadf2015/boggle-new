import { useState, useCallback } from 'react';
import type { DrillType } from '@/shared/types/cognitive';

interface DrillResult {
  drillType: DrillType;
  level: number;
  score: number;
  durationSeconds: number;
  wordsFound: number;
  domainScoreEarned?: number;
  extraData?: Record<string, unknown>;
}

interface UseSaveDrillResultReturn {
  saveDrillResult: (result: DrillResult) => Promise<{ success: boolean; error?: string }>;
  isSaving: boolean;
}

export function useSaveDrillResult(): UseSaveDrillResultReturn {
  const [isSaving, setIsSaving] = useState(false);

  const saveDrillResult = useCallback(async (result: DrillResult): Promise<{ success: boolean; error?: string }> => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/drills/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(result),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save drill result' }));
        return { success: false, error: errorData.error || 'Failed to save drill result' };
      }

      const data = await response.json();
      return { success: true };
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
