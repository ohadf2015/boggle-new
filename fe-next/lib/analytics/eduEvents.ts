/**
 * Canonical education PostHog event names. Admin dashboards and funnels
 * import from here so a rename is a compile error, not a silent zero.
 */
export const EDU_EVENTS = {
  classroomCreated: 'edu_classroom_created',
  studentJoined: 'edu_student_joined',
  liveRoundStarted: 'edu_live_round_started',
  liveRoundCompleted: 'edu_live_round_completed',
  studentReturned: 'edu_student_returned',
  teacherFirstLiveGame: 'edu_teacher_first_live_game',
  teacherSecondLiveGameDay: 'edu_teacher_second_live_game_day',
  firstStudentJoined: 'edu_first_student_joined',
  liveGameEnded: 'edu_live_game_ended',
  joinCodeCopyRecorded: 'edu_join_code_copy_recorded',
  teacherOnboardingStep: 'edu_teacher_onboarding_step',
  classroomGameStarted: 'edu_classroom_game_started',
  classroomGameCompleted: 'edu_classroom_game_completed',
  classroomJoinRefused: 'edu_classroom_join_refused',
  // A student who reached an ended classroom game started today's practice round instead.
  latePracticeStarted: 'edu_late_join_practice_started',
  // A teacher refused on their own class code tapped the next step the join page offered.
  teacherOwnClassAction: 'edu_teacher_own_class_action',
} as const;

export type EduEventName = (typeof EDU_EVENTS)[keyof typeof EDU_EVENTS];
