'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getWithAuth } from '@/utils/authFetch';
import type { TeacherAccessRequest, TeacherAccessStatus } from './types';
import { teacherTrialStatus, type TrialStatus } from './trial';

interface UseTeacherAccessResult {
  hasAccess: boolean;
  status: TeacherAccessStatus | 'none';
  latestRequest: TeacherAccessRequest | null;
  /** Trial countdown for the latest approved request, or null when none/active-unbounded. */
  trial: TrialStatus | null;
  isLoading: boolean;
}

export function useTeacherAccess(): UseTeacherAccessResult {
  const { profile, user, loading: authLoading } = useAuth();
  const [latestRequest, setLatestRequest] = useState<TeacherAccessRequest | null>(null);
  const [reqLoading, setReqLoading] = useState(false);
  // Tick a clock so the trial countdown stays live without re-deriving Date.now()
  // impurely during render.
  const [nowMs, setNowMs] = useState(() => Date.now());

  const role = profile?.user_role;
  const hasAccess = role === 'teacher' || role === 'admin' || profile?.is_admin === true;

  // Fetch the latest request even for users who already have access — approved
  // teachers need their trial deadline to render the activation-urgency banner.
  useEffect(() => {
    if (!user?.id) return;
    setReqLoading(true);
    getWithAuth('/api/education/access-request')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setLatestRequest(j?.row || null))
      .catch(() => setLatestRequest(null))
      .finally(() => setReqLoading(false));
  }, [user?.id]);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const status: TeacherAccessStatus | 'none' = hasAccess
    ? 'approved'
    : (latestRequest?.status as TeacherAccessStatus) || 'none';

  const trial = teacherTrialStatus(latestRequest?.trial_expires_at, nowMs);

  return { hasAccess, status, latestRequest, trial, isLoading: authLoading || reqLoading };
}
