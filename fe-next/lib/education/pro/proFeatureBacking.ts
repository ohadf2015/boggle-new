/** Every Pro feature we sell must name the server route that enforces it (pinned by proFeatureBacking.test.ts). */
export interface ProFeatureBacking {
  route: string;
  guard: string;
  ui: string;
  tapsFromHq: number;
}

export const PRO_FEATURE_BACKING: Record<string, ProFeatureBacking> = {
  classes: {
    route: 'app/api/education/classroom/create/route.ts',
    guard: 'canCreateClass(',
    ui: 'components/teacher/setup/ClassSetupFlow.tsx',
    tapsFromHq: 1,
  },
  studentsPerClass: {
    route: 'app/api/education/classroom/join/route.ts',
    guard: 'canAddStudent(',
    ui: 'components/teacher/StudentCapMeter.tsx',
    tapsFromHq: 1,
  },
  analytics: {
    route: 'app/api/education/classroom/[id]/members/[studentId]/insights/route.ts',
    guard: 'requireTeacherPro(',
    ui: 'components/teacher/reports/StudentParentPreview.tsx',
    tapsFromHq: 2,
  },
  mastery: {
    route: 'app/api/education/classroom/[id]/word-mastery/route.ts',
    guard: 'teacherHasProAccess(',
    ui: 'components/teacher/reports/WordMasteryReport.tsx',
    tapsFromHq: 1,
  },
  missedPractice: {
    route: 'app/api/education/classroom/[id]/missed-practice/route.ts',
    guard: 'requireTeacherPro(',
    ui: 'components/teacher/reports/MissedPracticeAction.tsx',
    tapsFromHq: 2,
  },
  parentReport: {
    route: 'app/api/education/classroom/[id]/members/[studentId]/parent-report/route.ts',
    guard: 'requireTeacherPro(',
    ui: 'components/teacher/analytics/ShareParentReportButton.tsx',
    tapsFromHq: 2,
  },
};
