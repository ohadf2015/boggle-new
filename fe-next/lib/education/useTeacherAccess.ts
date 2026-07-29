'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { TeacherAccessRequest, TeacherAccessStatus } from './types';

interface UseTeacherAccessResult {
  hasAccess: boolean;
  status: TeacherAccessStatus | 'none';
  latestRequest: TeacherAccessRequest | null;
  isLoading: boolean;
}

export function useTeacherAccess(): UseTeacherAccessResult {
  const { profile, user, loading: authLoading } = useAuth();
  const [latestRequest, setLatestRequest] = useState<TeacherAccessRequest | null>(null);
  const [reqLoading, setReqLoading] = useState(false);

  const role = profile?.user_role;
  const hasAccess = role === 'teacher' || role === 'admin' || profile?.is_admin === true;

  useEffect(() => {
    if (!user?.id || hasAccess) return;
    setReqLoading(true);
    fetch('/api/education/access-request')
      .then((r) => r.ok ? r.json() : null)
      .then((j) => setLatestRequest(j?.row || null))
      .finally(() => setReqLoading(false));
  }, [user?.id, hasAccess]);

  const status: TeacherAccessStatus | 'none' = hasAccess
    ? 'approved'
    : (latestRequest?.status as TeacherAccessStatus) || 'none';

  return { hasAccess, status, latestRequest, isLoading: authLoading || reqLoading };
}
