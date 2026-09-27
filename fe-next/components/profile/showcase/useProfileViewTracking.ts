'use client';

import { useEffect, useRef } from 'react';
import { trackProfileViewed } from '@/lib/avatar/avatarTelemetry';
import { parseProfileViewSource } from './profileShowcaseModel';

/**
 * Fire `profile_viewed` exactly once per profile. Waits for `ready` (auth
 * resolved) so a public page viewed by its owner doesn't log a transient
 * isOwn=false first. Source comes from `?from=<source>` on the entry link.
 */
export function useProfileViewTracking({
  profileKey,
  isOwn,
  ready,
}: {
  profileKey: string | null | undefined;
  isOwn: boolean;
  ready: boolean;
}): void {
  const fired = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || !profileKey || fired.current === profileKey) return;
    fired.current = profileKey;
    trackProfileViewed(parseProfileViewSource(typeof window === 'undefined' ? '' : window.location.search), isOwn);
  }, [ready, profileKey, isOwn]);
}

export default useProfileViewTracking;
