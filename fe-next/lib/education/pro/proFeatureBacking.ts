/** Every Pro feature we sell names the route that refuses a free teacher and the test that proves it (pinned by proFeatureBacking.test.ts). */
export interface ProFeatureBacking {
  route: string;
  guard: string;
  ui: string;
  tapsFromHq: number;
  refusal: { file: string; name: string; status: 402 | 403 };
}

export const PRO_FEATURE_BACKING: Record<string, ProFeatureBacking> = {
  classes: {
    route: 'app/api/education/classroom/create/route.ts',
    guard: 'canCreateClass(',
    ui: 'components/teacher/setup/ClassSetupFlow.tsx',
    tapsFromHq: 1,
    refusal: {
      file: 'app/api/education/classroom/create/__tests__/route.classLimit.test.ts',
      name: '403s a free teacher at the class cap and creates nothing',
      status: 403,
    },
  },
  studentsPerClass: {
    route: 'app/api/education/classroom/join/route.ts',
    guard: 'canAddStudent(',
    ui: 'components/teacher/StudentCapMeter.tsx',
    tapsFromHq: 1,
    refusal: {
      file: 'app/api/education/classroom/join/__tests__/route.endedSessionCode.test.ts',
      name: 'given the class is full, then the student cap still holds',
      status: 403,
    },
  },
  analytics: {
    route: 'app/api/education/classroom/[id]/analytics/route.ts',
    guard: 'requireTeacherPro(',
    ui: 'components/teacher/analytics/AnalyticsDashboard.tsx',
    tapsFromHq: 2,
    refusal: {
      file: 'app/api/education/classroom/[id]/analytics/__tests__/route.test.ts',
      name: '402s a free teacher and reads no student rows',
      status: 402,
    },
  },
  studentInsights: {
    route: 'app/api/education/classroom/[id]/members/[studentId]/insights/route.ts',
    guard: 'requireTeacherPro(',
    ui: 'components/teacher/reports/StudentParentPreview.tsx',
    tapsFromHq: 2,
    refusal: {
      file: 'app/api/education/classroom/[id]/members/[studentId]/insights/__tests__/route.test.ts',
      name: '402 without Teacher Pro',
      status: 402,
    },
  },
  reports: {
    route: 'app/api/education/classroom/export-all/route.ts',
    guard: 'requireTeacherPro(',
    ui: 'components/teacher/reports/ExportAllClassesButton.tsx',
    tapsFromHq: 2,
    refusal: {
      file: 'app/api/education/classroom/export-all/__tests__/route.test.ts',
      name: '402s a free teacher and reads no student rows',
      status: 402,
    },
  },
  reportsData: {
    route: 'app/api/education/classroom/[id]/report/route.ts',
    guard: 'requireTeacherPro(',
    ui: 'components/teacher/reports/ClassProgressReport.tsx',
    tapsFromHq: 2,
    refusal: {
      file: 'app/api/education/classroom/[id]/report/__tests__/route.test.ts',
      name: '402s a free teacher and reads no student rows',
      status: 402,
    },
  },
  mastery: {
    route: 'app/api/education/classroom/[id]/word-mastery/route.ts',
    guard: 'teacherHasProAccess(',
    ui: 'components/teacher/reports/WordMasteryReport.tsx',
    tapsFromHq: 1,
    refusal: {
      file: 'app/api/education/classroom/[id]/word-mastery/__tests__/route.test.ts',
      name: '402s a free teacher with a real but limited preview',
      status: 402,
    },
  },
  missedPractice: {
    route: 'app/api/education/classroom/[id]/missed-practice/route.ts',
    guard: 'requireTeacherPro(',
    ui: 'components/teacher/reports/MissedPracticeAction.tsx',
    tapsFromHq: 2,
    refusal: {
      file: 'app/api/education/classroom/[id]/missed-practice/__tests__/route.test.ts',
      name: '402s a free teacher and writes nothing',
      status: 402,
    },
  },
  parentReport: {
    route: 'app/api/education/classroom/[id]/members/[studentId]/parent-report/route.ts',
    guard: 'requireTeacherPro(',
    ui: 'components/teacher/analytics/ShareParentReportButton.tsx',
    tapsFromHq: 2,
    refusal: {
      file: 'app/api/education/classroom/[id]/members/[studentId]/parent-report/__tests__/route.test.ts',
      name: '402 when the teacher does not have Pro',
      status: 402,
    },
  },
  parentLinks: {
    route: 'app/api/teacher/pro/parent-links/route.ts',
    guard: 'requireTeacherPro',
    ui: 'components/teacher/pro/ParentReportPack.tsx',
    tapsFromHq: 2,
    refusal: {
      file: 'app/api/teacher/pro/parent-links/__tests__/route.test.ts',
      name: '402s for a free teacher, before minting anything',
      status: 402,
    },
  },
  gradePassback: {
    route: 'app/api/education/google-classroom/grades/route.ts',
    guard: 'gateProTeacher(',
    ui: 'components/teacher/reports/GoogleClassroomGradePassback.tsx',
    tapsFromHq: 2,
    refusal: {
      file: 'app/api/education/google-classroom/grades/__tests__/route.test.ts',
      name: '403 not_pro for a free teacher',
      status: 403,
    },
  },
};

/** Locked in the UI only; each names where the server gate must go. */
export const PRO_FEATURES_WITHOUT_SERVER_GATE: Record<string, string> = {};

/** Refused over the socket, not HTTP: the handler and its refusal test (no status code to pin). */
export const PRO_FEATURES_GATED_ON_SOCKET: Record<string, { handler: string; guard: string; test: string }> = {
  pressureDials: {
    handler: 'backend/handlers/classroomPressureHandler.ts',
    guard: 'teacherHasProAccess',
    test: 'backend/handlers/__tests__/classroomPressureHandler.test.ts',
  },
};
