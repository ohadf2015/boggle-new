import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TEACHER_ONBOARDING_FUNNEL_EVENTS } from '../teacherOnboardingFunnel';
import { FIRST_ROUND_GUIDE_EVENTS } from '../firstRoundGuideTelemetry';
import { TRIAL_CHECKLIST_EVENTS } from '../trialChecklistEvents';

const src = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');

describe('teacher first-run funnel event names (dashboards query these strings)', () => {
  it('keeps every funnel event name', () => {
    expect(TEACHER_ONBOARDING_FUNNEL_EVENTS).toEqual({
      teacherOnboardingViewed: 'teacher_onboarding_viewed',
      classroomCreated: 'classroom_created',
      assignmentCreated: 'assignment_created',
      studentJoined: 'student_joined',
      trialStarted: 'trial_started',
      teacherProUpgraded: 'teacher_pro_upgraded',
    });
    expect(FIRST_ROUND_GUIDE_EVENTS).toEqual({ shown: 'edu_first_round_guide_shown', clicked: 'edu_first_round_guide_clicked' });
    expect(TRIAL_CHECKLIST_EVENTS).toEqual({
      shown: 'trial_checklist_shown',
      stepCompleted: 'trial_checklist_step_completed',
      allCompleted: 'trial_checklist_all_completed',
    });
    const telemetry = src('lib/education/telemetry.ts');
    for (const name of ['edu_classroom_create_ui_done', 'edu_join_code_shown', 'edu_join_code_copied', 'edu_join_code_shared', 'edu_first_student_seen', 'edu_teacher_onboarding_step']) {
      expect(telemetry).toContain(`'${name}'`);
    }
  });

  it('still fires them from the one first-run path', () => {
    const flow = src('components/teacher/setup/ClassSetupFlow.tsx');
    for (const call of [
      'trackEduClassroomCreated(',
      'TEACHER_ONBOARDING_FUNNEL_EVENTS.classroomCreated',
      'TEACHER_ONBOARDING_FUNNEL_EVENTS.studentJoined',
      'trackEduFirstStudentJoined(',
      'trackEduJoinCodeShown(',
      'trackEduJoinCodeCopied(',
      'trackEduJoinCodeShared(',
    ]) {
      expect(flow).toContain(call);
    }
    const ready = src('components/teacher/setup/ClassReady.tsx');
    expect(ready).toContain('trackFirstRoundGuideShown(');
    expect(ready).toContain("step: 'start_round'");
    expect(ready).toContain("step: 'practice_bots'");
    expect(src('components/education/TeacherOnboarding.tsx')).toContain('trackEduTeacherOnboardingStep(');
  });
});
