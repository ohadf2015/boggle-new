'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getWithAuth } from '@/utils/authFetch';
import type { TeacherAccessRequest, TeacherAccessStatus } from './types';
import { teacherTrialStatus, type TrialStatus } from './trial';
import { isTeacherProfile } from './teacherRole';

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

  const hasAccess = isTeacherProfile(profile);

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

  // `hasAccess` reads `profile.user_role`, but `profile` and `loading` are separate pieces of
  // auth state that do not resolve together — `useAuthInitialization` sets the user before
  // awaiting the profile fetch, and TOKEN_REFRESHED / same-user INITIAL_SESSION reach
  // setLoading(false) without one. In that window an approved teacher is indistinguishable
  // from a stranger, and TeacherGate redirects them to the access-request form — where, since
  // requests auto-approve, all they can do is re-request a role they already hold.
  //
  // So stay pessimistic until every source has resolved. This lives in the hook, not in
  // TeacherGate, so the gate and TeacherDashboardInner (which hand-rolled the same guard)
  // cannot drift apart again.
  const profileLoading = !!user && !profile;

  return {
    hasAccess,
    status,
    latestRequest,
    trial,
    isLoading: authLoading || reqLoading || profileLoading,
  };
}
