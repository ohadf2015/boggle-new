'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import { fetchClassStudentPreview } from '@/lib/education/classStudentPreview';

/** First few student ids per class for the home avatar stack; null until read, and stays null on failure. */
export function useClassStudentPreview(
  classrooms: readonly { id: string; member_count?: number | null }[],
  ready: boolean,
): Record<string, string[]> | null {
  const idsKey = classrooms
    .filter((c) => (c.member_count ?? 0) > 0)
    .map((c) => c.id)
    .sort()
    .join(',');
  const [state, setState] = useState<{ key: string; preview: Record<string, string[]> | null }>({
    key: '',
    preview: null,
  });

  useEffect(() => {
    if (!ready || !supabase) return;
    const ids = idsKey ? idsKey.split(',') : [];
    if (ids.length === 0) {
      setState({ key: idsKey, preview: {} });
      return;
    }
    let cancelled = false;
    fetchClassStudentPreview(supabase, ids)
      .then((preview) => !cancelled && setState({ key: idsKey, preview }))
      .catch((error: unknown) => logger.warn('class student preview unavailable', error));
    return () => {
      cancelled = true;
    };
  }, [ready, idsKey]);

  return state.key === idsKey ? state.preview : null;
}
