'use client';

import { useEffect, useState } from 'react';
import { getClassroomLeaderboardVisibility } from '@/lib/supabase/education/classrooms';
import type { LeaderboardVisibility } from '@/lib/supabase/education/types';

/**
 * The teacher's standings setting for this class. `null` while it loads, so the
 * sheet never flashes the full table before a "top 3" or "off" answer arrives.
 */
export function useLeaderboardVisibility(classroomId: string): LeaderboardVisibility | null {
  const [state, setState] = useState<{ id: string; value: LeaderboardVisibility } | null>(null);
  useEffect(() => {
    if (!classroomId) return;
    let alive = true;
    void getClassroomLeaderboardVisibility(classroomId).then((value) => {
      if (alive) setState({ id: classroomId, value });
    });
    return () => {
      alive = false;
    };
  }, [classroomId]);
  return state && state.id === classroomId ? state.value : null;
}
