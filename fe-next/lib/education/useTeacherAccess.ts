'use client';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getWithAuth } from '@/utils/authFetch';
import type { TeacherAccessRequest, TeacherAccessStatus } from './types';
import { teacherTrialStatus, type TrialStatus } from './trial';
import { isTeacherProfile } from './teacherRole';

/** How long a signed-in user may sit with no profile before the read counts as failed. */
export const PROFILE_WAIT_MS = 8_000;

export type TeacherAccessError = 'request' | 'profile' | null;

interface UseTeacherAccessResult {
  hasAccess: boolean;
  status: TeacherAccessStatus | 'none';
  latestRequest: TeacherAccessRequest | null;
  /** Trial countdown for the latest approved request, or null when none/active-unbounded. */
  trial: TrialStatus | null;
  isLoading: boolean;
  /** A lookup failed: show an error with retry, never the "no access" form. */
  error: TeacherAccessError;
  retry: () => void;
}

export function useTeacherAccess(): UseTeacherAccessResult {
  const { profile, user, loading: authLoading, refreshProfile } = useAuth();
  const [latestRequest, setLatestRequest] = useState<TeacherAccessRequest | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [answeredFor, setAnsweredFor] = useState<string | null>(null);
  const [requestFailed, setRequestFailed] = useState(false);
  // Tick a clock so the trial countdown stays live without re-deriving Date.now()
  // impurely during render.
  const [nowMs, setNowMs] = useState(() => Date.now());

  const hasAccess = isTeacherProfile(profile);
  const userId = user?.id ?? null;
  const requestKey = userId ? `${userId}:${attempt}` : null;

  // Fetch the latest request even for users who already have access — approved
  // teachers need their trial deadline to render the activation-urgency banner.
  useEffect(() => {
    if (!requestKey) return;
    let live = true;
    getWithAuth('/api/education/access-request')
      .then((r) => {
        if (!r.ok) throw new Error(`access request lookup failed: ${r.status}`);
        return r.json();
      })
      .then((j) => {
        if (!live) return;
        setLatestRequest(j?.row || null);
        setRequestFailed(false);
      })
      .catch(() => {
        if (live) setRequestFailed(true);
      })
      .finally(() => {
        if (live) setAnsweredFor(requestKey);
      });
    return () => {
      live = false;
    };
  }, [requestKey]);
  const reqLoading = requestKey !== null && answeredFor !== requestKey;

  // AuthContext gives no signal when the profile read fails for good, so a bounded wait stands in for one.
  const awaitingProfile = !authLoading && !!userId && !profile;
  const [profileTimedOutFor, setProfileTimedOutFor] = useState<number | null>(null);
  useEffect(() => {
    if (!awaitingProfile) return;
    const id = setTimeout(() => setProfileTimedOutFor(attempt), PROFILE_WAIT_MS);
    // Leaving the wait (profile arrived, or Retry) clears it, so a later blip starts a fresh full wait.
    return () => {
      clearTimeout(id);
      setProfileTimedOutFor(null);
    };
  }, [awaitingProfile, attempt]);
  const profileFailed = awaitingProfile && profileTimedOutFor === attempt;

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // The request says approved but the profile has not been promoted yet: the gate
  // would bounce, the access page would link back. Refresh once before answering.
  const [refreshedFor, setRefreshedFor] = useState<string | null>(null);
  const canRefresh = typeof refreshProfile === 'function';
  const profileStale =
    !hasAccess && !!profile && !!user?.id && latestRequest?.status === 'approved' && canRefresh && refreshedFor !== user.id;
  const refreshStartedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!profileStale || !user?.id || !refreshProfile || refreshStartedFor.current === user.id) return;
    const id = user.id;
    refreshStartedFor.current = id;
    Promise.resolve()
      .then(() => refreshProfile())
      .catch(() => {})
      .finally(() => setRefreshedFor(id));
  }, [profileStale, user?.id, refreshProfile]);

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

  const retry = () => {
    if (profileFailed && refreshProfile) {
      Promise.resolve()
        .then(() => refreshProfile())
        .catch(() => {});
    }
    setAttempt((n) => n + 1);
  };

  return {
    hasAccess,
    status,
    latestRequest,
    trial,
    isLoading: authLoading || reqLoading || profileLoading || profileStale,
    error: profileFailed ? 'profile' : requestFailed && !reqLoading ? 'request' : null,
    retry,
  };
}
