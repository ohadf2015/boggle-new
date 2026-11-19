'use client';

import { useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { trackEduFirstStudentJoined, trackEduJoinCodeShown } from '@/lib/education/telemetry';
import {
  captureTeacherOnboardingFunnel,
  TEACHER_ONBOARDING_FUNNEL_EVENTS,
  teacherFunnelPlan,
} from '@/lib/education/teacherOnboardingFunnel';
import { useClassRoster } from '../hq/useClassRoster';
import { useHqJuice } from '../hq/useHqJuice';
import { useRisingCount } from '../hq/useRisingCount';
import { STUDENT_GOAL } from '../hq/studentGoal';

/** The live "1 joined, aim for 3" line for a class still filling up, with its join sound and (on Home only) funnel events. */
export function HomeJoinGoal({ classroom, track = true }: { classroom: { id: string }; track?: boolean }) {
  const { t: rawT, language } = useLanguage();
  const t = rawT as (key: string, params?: Record<string, string | number>) => string;
  const { reduced, sfx } = useHqJuice();
  const { hasPro, status, loading: proLoading } = useTeacherPro();
  const { students, arrivals, loading } = useClassRoster(classroom.id, t('teacher.classrooms.students.unknown'));
  const count = students.length;
  const shown = useRisingCount(count, !reduced && arrivals.length > 0);

  const lastArrivals = useRef('');
  useEffect(() => {
    const key = arrivals.join(',');
    if (!key || key === lastArrivals.current) return;
    lastArrivals.current = key;
    sfx.playPlayerJoinedSound();
  }, [arrivals, sfx]);

  const shownFor = useRef<string | null>(null);
  const prevCount = useRef<number | null>(null);
  const trackedId = useRef(classroom.id);
  if (trackedId.current !== classroom.id) {
    trackedId.current = classroom.id;
    shownFor.current = null;
    prevCount.current = null;
  }
  useEffect(() => {
    if (!track || loading || count > 0 || shownFor.current === classroom.id) return;
    shownFor.current = classroom.id;
    trackEduJoinCodeShown({ classroomId: classroom.id });
  }, [track, loading, count, classroom.id]);

  useEffect(() => {
    if (loading) return;
    if (track && prevCount.current === 0 && count >= 1) {
      trackEduFirstStudentJoined({ classroomId: classroom.id });
      captureTeacherOnboardingFunnel(TEACHER_ONBOARDING_FUNNEL_EVENTS.studentJoined, {
        locale: language,
        plan: teacherFunnelPlan({ hasPro, status, loading: proLoading }),
      });
    }
    prevCount.current = count;
  }, [track, loading, count, classroom.id, language, hasPro, status, proLoading]);

  return (
    <p data-testid="hq-joined-goal" aria-live="polite" className="min-h-5 font-neo-body text-sm font-bold leading-tight text-neo-black/80">
      {loading ? null : (
        <span data-testid="hq-joined-goal-count" className="tabular-nums">
          {count < STUDENT_GOAL ? t('academy.hq.joinedGoal', { count: shown, goal: STUDENT_GOAL }) : `${shown} ${t('academy.hq.joinedLabel')}`}
        </span>
      )}
    </p>
  );
}

export default HomeJoinGoal;
