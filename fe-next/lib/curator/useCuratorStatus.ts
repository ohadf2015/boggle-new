'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { CuratorAssignment } from './curatorScope';

export interface CuratorStatus {
  isCurator: boolean;
  isAdmin: boolean;
  /** Active languages the user may curate (all five for admins). */
  languages: string[];
  assignments: CuratorAssignment[];
  isLoading: boolean;
}

const EMPTY: Omit<CuratorStatus, 'isLoading'> = {
  isCurator: false,
  isAdmin: false,
  languages: [],
  assignments: [],
};

/**
 * Client hook exposing the current user's Language Curator status by fetching
 * /api/curator/status. Returns isCurator:false for plain users (no 403), so the
 * curator UI can decide whether to render. Refetches when the user changes.
 */
export function useCuratorStatus(): CuratorStatus {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<Omit<CuratorStatus, 'isLoading'>>(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setData(EMPTY);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch('/api/curator/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j) return;
        setData({
          isCurator: !!j.isCurator,
          isAdmin: !!j.isAdmin,
          languages: Array.isArray(j.languages) ? j.languages : [],
          assignments: Array.isArray(j.assignments) ? j.assignments : [],
        });
      })
      .catch(() => {
        /* non-fatal: leave previous/empty status */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { ...data, isLoading: authLoading || loading };
}
