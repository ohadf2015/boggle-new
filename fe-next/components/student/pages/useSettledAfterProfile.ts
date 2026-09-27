'use client';

/**
 * "Can an empty list be trusted yet?" for hooks that gate on the profile.
 *
 * `useStudentProgress` / `usePracticeLessons` read `isAuthenticated` (user AND
 * profile). Before the profile row lands they report an empty list with
 * `isLoading: false`; when it lands they refetch WITHOUT raising `isLoading`.
 * So an empty list only means "no lessons" once each list has been delivered
 * again after the profile arrived (every delivery is a new array reference).
 *
 * If the profile was already present at mount (client navigation from the
 * map), the hooks' own `isLoading` covers it and this is settled at once. A
 * deadline stops it from holding a skeleton forever (no silent spinner).
 */

import { useEffect, useRef, useState } from 'react';

export function useSettledAfterProfile(profileReady: boolean, lists: readonly unknown[], deadlineMs = 8000): boolean {
  const neededWait = useRef(!profileReady);
  const snapshot = useRef<readonly unknown[] | null>(profileReady ? null : lists);
  const [timedOut, setTimedOut] = useState(false);

  // While the profile is missing, keep the snapshot current: the "stale" lists
  // are whatever the hooks delivered last before it landed.
  if (!profileReady && neededWait.current) snapshot.current = lists;

  const redelivered =
    profileReady && snapshot.current !== null && lists.every((l, i) => l !== snapshot.current![i]);
  const latched = useRef(false);
  if (!neededWait.current || redelivered || timedOut) latched.current = true;
  const settled = latched.current;

  useEffect(() => {
    if (settled) return;
    const timer = setTimeout(() => setTimedOut(true), deadlineMs);
    return () => clearTimeout(timer);
  }, [settled, deadlineMs]);

  return settled;
}
