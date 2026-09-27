'use client';

/**
 * One guard for the student sub-pages (lessons, awards).
 *
 * Decides on the SESSION only (`loading` + `user`). Never on `profile` or the
 * derived `isAuthenticated`: the profile row is a second round-trip that lands
 * after `loading` flips false, and gating on it either bounced signed-in
 * students or held them on a loader (pitfall class 1). The hub keeps its own
 * profile wait because it must route teachers away; these pages don't.
 *
 * No session → the auth-free student entry, never '/' or '/{locale}'.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export type SubpageGuardStatus = 'pending' | 'ready' | 'redirecting';

export function subpageGuardStatus(loading: boolean, hasUser: boolean): SubpageGuardStatus {
  if (loading) return 'pending';
  return hasUser ? 'ready' : 'redirecting';
}

export function useStudentSubpageGuard(locale: string) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const status = subpageGuardStatus(!!loading, !!user);

  useEffect(() => {
    if (status === 'redirecting') router.push(`/${locale}/student/join`);
  }, [status, router, locale]);

  return { status, user: status === 'ready' ? user : null };
}
