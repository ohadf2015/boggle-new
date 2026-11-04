'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { countTeacherClassrooms } from '@/lib/supabase/education/classrooms';

/**
 * The signed-in teacher's classroom count, or null while it loads / when the read fails.
 * One head-only count query per mount; callers decide what a threshold means.
 */
export function useTeacherClassCount(enabled = true): number | null {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled || !userId) {
      setCount(null);
      return;
    }
    let cancelled = false;
    void countTeacherClassrooms(userId).then((n) => {
      if (!cancelled) setCount(n);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, userId]);
  return enabled && userId ? count : null;
}
