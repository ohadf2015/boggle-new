'use client';

import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { signInAsGuestStudent, waitForProfile } from '@/lib/education/guestStudent';
import { runGuestJoinPreflight } from '@/lib/education/joinGuestPreflight';
import logger from '@/utils/logger';

/**
 * Why `code` exists alongside `error`: the route's failure prose is written on the
 * server, in English, and is not translatable at the point it reaches a student. The
 * caller needs something stable to branch on — the same shape the class-limit path
 * already uses (`CLASS_LIMIT_REACHED` in `ClassroomManager`). `error` stays for logs
 * and for the generic fallback; it is not fit to render on its own.
 */
export type JoinClassroomErrorCode = 'STUDENT_LIMIT_REACHED' | 'INVALID_CODE' | 'NAME_TAKEN';

export interface JoinClassroomResult {
  success: boolean;
  classroomId?: string;
  /** Set when the code the student typed was a LIVE GAME code — the room to enter now. */
  gameCode?: string;
  code?: JoinClassroomErrorCode;
  /** For NAME_TAKEN: a nickname that is actually free, for one-tap acceptance. */
  suggestedName?: string;
  /** Set to true when the student is already enrolled in the classroom. */
  alreadyMember?: boolean;
  error?: string;
}

/**
 * Hook for students to join a classroom
 */
export function useJoinClassroom() {
  const { user } = useAuth();

  const joinClassroom = useCallback(async (
    joinCode: string,
    options?: { guestName?: string }
  ): Promise<JoinClassroomResult> => {
    try {
      // Account-less path: a logged-out student who supplied a name joins as an
      // anonymous guest. We mint the anon identity and await the trigger-created
      // profile (race-safe) BEFORE joining, so the server route sees an
      // authenticated session. Without a name we keep the not-authenticated guard.
      if (!user?.id) {
        const guestName = options?.guestName?.trim();
        if (!guestName) {
          return { success: false, error: 'Not authenticated' };
        }
        // Nothing may be created until both the CODE and the NICKNAME have
        // had their say — an anonymous `auth.users` row cannot be un-created,
        // and the checks must be server-side (own-row RLS would report every
        // name free to this browser). Only a confident refusal stops the join;
        // `runGuestJoinPreflight` carries on through our own outages.
        const refusal = await runGuestJoinPreflight(joinCode, guestName);
        if (refusal) return { success: false, ...refusal };

        const supabase = createClient();
        const guest = await signInAsGuestStudent(supabase, guestName);
        if (guest.error || !guest.user) {
          return { success: false, error: guest.error || 'Failed to start guest session' };
        }
        await waitForProfile(supabase, guest.user.id);
      }

      // Server-side API route enforces the free-tier student cap and reads the
      // (now authenticated, possibly guest) session to identify the student.
      const response = await fetch('/api/education/classroom/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          joinCode,
          guestName: options?.guestName,
        }),
      });

      if (response.status === 403) {
        const data = await response.json();
        // The class is full. The student can do nothing about it and must not be shown
        // the server's reason — it names our free-tier limit. Hand back the code; the
        // caller renders a localized, student-appropriate line.
        return {
          success: false,
          code: 'STUDENT_LIMIT_REACHED',
          error: data.message,
        };
      }

      if (!response.ok) {
        const data = await response.json();
        // Every 400 this route emits is a bad code (malformed JSON, failed Zod parse, or
        // no such classroom); a missing guest name is a 401, so it does not land here.
        return {
          success: false,
          ...(response.status === 400 ? { code: 'INVALID_CODE' as const } : {}),
          error: data.error || 'Failed to join classroom',
        };
      }

      // `gameCode` is present only when the student joined by typing the LIVE GAME code
      // (the one on the projector) rather than the permanent roster code. It is the room
      // they should walk straight into — being on the roster is not the thing they came for.
      const { classroomId, gameCode, alreadyMember } = await response.json();

      return { success: true, classroomId, ...(gameCode ? { gameCode } : {}), ...(alreadyMember ? { alreadyMember } : {}) };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to join classroom';
      logger.error('Exception in joinClassroom:', error);
      return { success: false, error };
    }
  }, [user]);

  return { joinClassroom };
}
