'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useIsGuest } from '@/hooks/useIsGuest';
import { useTeacherAccess } from '@/lib/education/useTeacherAccess';
import { useStudentClassroom } from '@/hooks/useStudentClassroom';
import { HomeEducationCard } from './HomeEducationCard';

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
 *
 * Guests and unenrolled players always see the promo — education stays on the
 * homepage every visit, not a one-shot that vanishes after the first paint.
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
 * lookup is in flight or when the user isn't enrolled. Unenrolled players fall
 * through to the always-on promo. */
function StudentHomeCard() {
  const { classroomId, classroom, isLoading } = useStudentClassroom();
  if (isLoading) return null;
  if (!classroomId) return <EducationPromoCard />;
  return <HomeEducationCard role="student" classroomName={classroom?.name ?? null} />;
}

/** Always-on pitch for everyone education has never enrolled: guests and
 * unenrolled players. Shown on every homepage visit so teachers can find
 * classroom mode without having seen it "once" in a previous session. */
function EducationPromoCard() {
  return <HomeEducationCard role="promo" />;
}
