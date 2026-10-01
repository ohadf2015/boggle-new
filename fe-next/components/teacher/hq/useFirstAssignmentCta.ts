'use client';

import { useEffect, useState } from 'react';
import { getClassroomAssignments } from '@/lib/supabase/education/assignments';
import { readHqLiveRoom } from '@/lib/education/firstAssignmentCta';

const ASSIGNMENTS_CHANGED_EVENT = 'lexiclash:assignments-changed';

/**
 * Assignment count + live-room flag for the HQ first-assignment panel.
 * Count stays `null` on error so a failed read cannot look like "zero".
 */
export function useFirstAssignmentCta(classroomId: string | null): {
  assignmentCount: number | null;
  hasActiveRoom: boolean;
} {
  const [assignmentCount, setAssignmentCount] = useState<number | null>(
    classroomId ? null : 0,
  );
  const [hasActiveRoom, setHasActiveRoom] = useState(() => readHqLiveRoom(classroomId));

  useEffect(() => {
    setHasActiveRoom(readHqLiveRoom(classroomId));
  }, [classroomId]);

  useEffect(() => {
    if (!classroomId) {
      setAssignmentCount(0);
      return;
    }
    let cancelled = false;
    setAssignmentCount(null);

    const load = () => {
      void getClassroomAssignments(classroomId).then((res) => {
        if (cancelled) return;
        if (res.error) return;
        setAssignmentCount(res.data.length);
      });
    };
    load();

    const onChanged = () => load();
    window.addEventListener(ASSIGNMENTS_CHANGED_EVENT, onChanged);
    return () => {
      cancelled = true;
      window.removeEventListener(ASSIGNMENTS_CHANGED_EVENT, onChanged);
    };
  }, [classroomId]);

  return { assignmentCount, hasActiveRoom };
}
