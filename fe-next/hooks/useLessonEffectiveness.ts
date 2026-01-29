import { useState, useEffect, useCallback } from 'react';
import { getLessonEffectiveness, type LessonEffectivenessData } from '@/lib/supabase/analytics';

export interface UseLessonEffectivenessOptions {
  classroomId: string;
}

export interface UseLessonEffectivenessReturn {
  effectiveness: LessonEffectivenessData[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useLessonEffectiveness(
  options: UseLessonEffectivenessOptions
): UseLessonEffectivenessReturn {
  const { classroomId } = options;
  const [effectiveness, setEffectiveness] = useState<LessonEffectivenessData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchEffectiveness = useCallback(async () => {
    if (!classroomId) {
      setEffectiveness([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await getLessonEffectiveness(classroomId);

    if (fetchError) {
      setError(new Error(fetchError.message));
      setEffectiveness([]);
    } else {
      setEffectiveness(data);
    }

    setIsLoading(false);
  }, [classroomId]);

  useEffect(() => {
    fetchEffectiveness();
  }, [fetchEffectiveness]);

  return {
    effectiveness,
    isLoading,
    error,
    refresh: fetchEffectiveness,
  };
}
