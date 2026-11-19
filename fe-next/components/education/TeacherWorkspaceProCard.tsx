'use client';

import * as React from 'react';
import { TeacherProCheckoutCta, teacherProCheckoutCtaLabel } from '@/components/education/TeacherProCheckoutCta';

/**
 * Contextual Teacher Pro checkout card for the signed-in teacher workspace.
 *
 * Renders the exact landing CTA (`TeacherProCheckoutCta`, same copy module and
 * the same `/{locale}/teacher/upgrade` checkout href) only at the moment of
 * realized value: an approved teacher on the free plan whose classroom list
 * shows at least one student who joined. Everyone else — anonymous viewers,
 * students, teachers whose classes are still empty, and anyone already on Pro
 * (paid or access trial) — renders nothing, so the pitch can never sit on a
 * loading state or in front of the wrong audience.
 *
 * The caller owns screen-level ask arbitration: the teacher desk suppresses
 * this card while another ask owns the screen (account banners, the rail Pro
 * offer) or a live game is running. This component only enforces the audience
 * gate, so it stays safe to mount anywhere in the teacher module.
 */

export interface TeacherWorkspaceProCardProps {
  locale: string;
  className?: string;
  /** Signed-in approved teacher (not anonymous, teacher role per lib/education/teacherRole). */
  isApprovedTeacher: boolean;
  /** The teacher's classes; null while the first read is in flight. */
  classrooms: { member_count?: number | null }[] | null;
  /** True only once the Pro entitlement read has settled on "free". */
  isFreeTeacher: boolean;
}

export function TeacherWorkspaceProCard({
  locale,
  className = '',
  isApprovedTeacher,
  classrooms,
  isFreeTeacher,
}: TeacherWorkspaceProCardProps): React.JSX.Element | null {
  const hasJoinedStudents =
    Array.isArray(classrooms) && classrooms.some((c) => (c?.member_count ?? 0) > 0);
  if (!isApprovedTeacher || !isFreeTeacher || !hasJoinedStudents) return null;
  return (
    <TeacherProCheckoutCta
      locale={locale}
      className={className}
      variant="card"
      impression={{ cta: teacherProCheckoutCtaLabel(locale), placement: 'teacher_desk' }}
    />
  );
}
