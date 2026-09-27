'use client';

import { useAuth } from '@/contexts/AuthContext';

/**
 * True only once the session has resolved AND the viewer has no account.
 *
 * `isAuthenticated` starts false on every first paint and flips when the
 * session resolves, so gating a layout on it alone shows the guest layout to a
 * logged-in player for a frame (see .claude/rules/60 Class 1 — dual source of
 * truth + async resolution). Anything that *removes* UI for guests must use
 * this instead, so the pessimistic state (full UI) holds until auth resolves.
 *
 * The caller passes its own `isAuthenticated` (usually a prop threaded down
 * from the same context) so the component's declared API stays authoritative;
 * the hook only adds the "has auth resolved yet" half.
 */
export function useIsGuest(isAuthenticated: boolean): boolean {
  const { loading } = useAuth();
  return !loading && !isAuthenticated;
}

export default useIsGuest;
