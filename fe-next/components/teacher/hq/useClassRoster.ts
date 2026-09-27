'use client';

import { useEffect, useRef, useState } from 'react';
import { getClassroomStudents } from '@/lib/supabase/education';
import { newArrivals, normalizeRoster, type RosterStudent } from './rosterModel';

/** Often enough that a student joining from the projector code lights up while the teacher watches. */
export const ROSTER_POLL_MS = 15_000;

export interface ClassRosterState {
  students: RosterStudent[];
  /** True until the first read for this class has settled. */
  loading: boolean;
  /** Ids that appeared since the previous read — never on the first read. */
  arrivals: string[];
}

/**
 * The selected class's roster, re-read while the page is visible so a student
 * who types the code on their phone pops onto the teacher's deck.
 *
 * Polls only while `document.visibilityState === 'visible'` — a background tab
 * must not keep hitting Supabase every 15 s for a screen nobody is looking at.
 */
export function useClassRoster(classroomId: string | null, fallbackName: string): ClassRosterState {
  const [state, setState] = useState<ClassRosterState>({ students: [], loading: true, arrivals: [] });
  const prevIds = useRef<string[] | null>(null);
  const nameRef = useRef(fallbackName);
  nameRef.current = fallbackName;

  useEffect(() => {
    prevIds.current = null;
    setState({ students: [], loading: Boolean(classroomId), arrivals: [] });
    if (!classroomId) return;

    let cancelled = false;
    const read = async () => {
      const { data, error } = await getClassroomStudents(classroomId);
      if (cancelled) return;
      // A failed re-read keeps what we had; a failed FIRST read settles to
      // empty rather than spinning forever.
      if (error && prevIds.current !== null) return;
      const students = normalizeRoster(data, nameRef.current);
      const ids = students.map((s) => s.id);
      const arrivals = newArrivals(prevIds.current, ids);
      prevIds.current = ids;
      setState({ students, loading: false, arrivals });
    };

    void read();
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      void read();
    }, ROSTER_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [classroomId]);

  return state;
}

export default useClassRoster;
