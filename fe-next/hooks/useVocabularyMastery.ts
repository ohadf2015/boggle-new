import { useState, useEffect, useCallback } from 'react';
import { getVocabularyHeatmapData, VocabularyHeatmapData } from '@/lib/supabase/analytics';

export interface UseVocabularyMasteryOptions {
  classroomId: string;
  lessonId?: string;  // Optional filter by lesson
}

export interface UseVocabularyMasteryReturn {
  heatmapData: VocabularyHeatmapData | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching vocabulary mastery heatmap data
 *
 * @param options - Classroom ID and optional lesson ID
 * @returns Heatmap data, loading state, error, and refresh function
 */
export function useVocabularyMastery(
  options: UseVocabularyMasteryOptions
): UseVocabularyMasteryReturn {
  const { classroomId, lessonId } = options;
  const [heatmapData, setHeatmapData] = useState<VocabularyHeatmapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getVocabularyHeatmapData(classroomId, lessonId);

      if (result.error) {
        setError(new Error(result.error.message));
        setHeatmapData(null);
      } else {
        setHeatmapData(result.data);
        setError(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(new Error(errorMessage));
      setHeatmapData(null);
    } finally {
      setIsLoading(false);
    }
  }, [classroomId, lessonId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    heatmapData,
    isLoading,
    error,
    refresh: fetchData,
  };
}
