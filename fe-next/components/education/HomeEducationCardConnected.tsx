'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsGuest } from '@/hooks/useIsGuest';
import { useTeacherAccess } from '@/lib/education/useTeacherAccess';
import { useStudentClassroom } from '@/hooks/useStudentClassroom';
import { HomeEducationCard } from './HomeEducationCard';

/** Show-time marker for the one-shot education promo. Bump the suffix to re-promote. */
const PROMO_SEEN_KEY = 'edu_home_promo_seen_v1';

/**
 * Decides whether the homepage should surface an education entry point, and for
 * which role. A user "has education access" if they're an approved teacher/admin
 * OR they've been added to a classroom as a student. Teacher takes precedence —
 * an approved teacher who also sits in a class still lands on the teacher
 * dashboard.
 *
 * The role split is deliberate for load reasons: the teacher branch is gated on
 * the cheap profile signal (user_role / is_admin — already in auth context) so
 * the trial fetch (an API route with a server auth round-trip) only fires for
 * actual teachers, never for the whole authed user base. `user_role` defaults to
 * 'student' for everyone, so enrolment can't be read off the profile — only a
 * classroom-membership lookup proves a student was added, and that lookup is a
 * single indexed client-side point read.
 */
export function HomeEducationCardConnected() {
  const { isAuthenticated, isTeacher, isAdmin } = useAuth();
  const isGuest = useIsGuest(isAuthenticated);

  if (isTeacher || isAdmin) return <TeacherHomeCard />;
  // Guests get the promo but no classroom lookup — there is no session to look up.
  if (isGuest) return <EducationPromoCard />;
  // Neither a guest nor authed yet = auth still resolving. Render nothing rather than
  // flashing the guest promo at a signed-in teacher (pitfall Class 1).
  if (!isAuthenticated) return null;
  return <StudentHomeCard />;
}

/** Teacher/admin: render immediately from the profile signal; the trial pill
 * fills in once the countdown resolves (no loading gate — the card is useful
 * without it). */
function TeacherHomeCard() {
  const { trial } = useTeacherAccess();
  return <HomeEducationCard role="teacher" trial={trial} />;
}

/** Non-teacher authed user: show the card only once we've confirmed a classroom
 * membership. Nothing renders (pessimistic default, pitfall Class 1) while the
 * lookup is in flight or when the user isn't enrolled. */
function StudentHomeCard() {
  const { classroomId, classroom, isLoading } = useStudentClassroom();
  if (isLoading) return null;
  if (!classroomId) return <EducationPromoCard />;
  return <HomeEducationCard role="student" classroomName={classroom?.name ?? null} />;
}

/**
 * One-shot pitch for everyone education has never reached: the card appears on the home
 * surface exactly once per browser, then never again.
 *
 * The marker is written when the card RENDERS, not when it is dismissed — there is no
 * dismiss control, and a dismiss-time marker means a reload without interaction re-pops it
 * forever (pitfall Class 1). Storage failures (private mode, quota) drop the promo rather
 * than showing it on every visit.
 */
function EducationPromoCard() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(PROMO_SEEN_KEY)) return;
      localStorage.setItem(PROMO_SEEN_KEY, '1');
      setShow(true);
    } catch {
      // no-op: no storage means no way to cap it at once, so don't show it at all
    }
  }, []);

  if (!show) return null;
  return <HomeEducationCard role="promo" />;
}
