'use client';

import { useCallback, useEffect, useState } from 'react';
import { signOut } from '@/lib/supabase';
import { clearStoredProfile, getStoredUsername } from '@/utils/profileStorage';
import { isDefaultPlayerName } from '@/utils/defaultPlayerNames';

export interface ReturningUser {
  is_anonymous?: boolean;
  user_metadata?: Record<string, unknown>;
}

/** Who this device would join as without asking; null when nobody (fresh device, or a real account). */
export function returningName(user: ReturningUser | null, stored: string | null): string | null {
  if (user && !user.is_anonymous) return null;
  const remembered = stored?.trim() || '';
  if (user) {
    // The session's own name: "Yes" enrols whoever owns the cookie, not whoever typed last.
    const own = user.user_metadata?.full_name;
    return typeof own === 'string' && own.trim() ? own.trim() : remembered;
  }
  return remembered && !isDefaultPlayerName(remembered) ? remembered : null;
}

export interface ReturningStudent {
  /** The name to confirm while the prompt is up, else null. '' = a guest session with no name. */
  askName: string | null;
  /** "Yes" joins with the existing guest session rather than a remembered name. */
  hasSession: boolean;
  /** "Not me" is still signing the old guest out. */
  leaving: boolean;
  leaveFailed: boolean;
  /** Every automatic join waits on this: the device may belong to someone else. */
  holdJoin: boolean;
  confirm: () => void;
  reject: () => Promise<void>;
}

export function useReturningStudent(user: ReturningUser | null, authLoading: boolean): ReturningStudent {
  const [stored, setStored] = useState<string | null | undefined>(undefined);
  const [answer, setAnswer] = useState<'yes' | 'no' | null>(null);
  const [leaveFailed, setLeaveFailed] = useState(false);

  useEffect(() => setStored(getStoredUsername()), []);

  const candidate = authLoading || stored === undefined ? null : returningName(user, stored);
  const leaving = answer === 'no' && !!user?.is_anonymous;
  const asking = candidate !== null && answer === null;

  const confirm = useCallback(() => setAnswer('yes'), []);

  const reject = useCallback(async () => {
    setLeaveFailed(false);
    setAnswer('no');
    clearStoredProfile();
    setStored(null);
    if (!user?.is_anonymous) return;
    const result = await signOut().catch(() => ({ error: true }));
    if (result?.error) {
      setAnswer(null);
      setLeaveFailed(true);
    }
  }, [user]);

  return {
    askName: asking || leaving ? (candidate ?? '') : null,
    hasSession: !!user?.is_anonymous,
    leaving,
    leaveFailed,
    holdJoin: stored === undefined || asking || leaving,
    confirm,
    reject,
  };
}
