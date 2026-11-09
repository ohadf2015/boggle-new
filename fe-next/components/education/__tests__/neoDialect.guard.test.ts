// Ratchet: a file may keep its known count of an off-dialect class, never gain one; new files start at zero.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const DIRS = ['components/education', 'components/teacher', 'components/student'];

const PATTERNS = {
  bgWhite: /\bbg-white\b/g,
  borderBlack: /\bborder-black\b/g,
  offRadius: /\brounded-(?:md|lg|xl|2xl)\b/g,
  // body.screen-fit already pads the top inset; only viewport-pinned (fixed) surfaces may add it again.
  safeAreaTop: /safe-area-inset-top|safeArea\.top|combined-safe-area-top/g,
} as const;
type PatternName = keyof typeof PATTERNS;

const ALLOW: Record<PatternName, Record<string, number>> = {
  bgWhite: {
    // Off-screen PDF renderer: literal paper white on purpose.
    'components/teacher/reports/ClassroomRosterProgress.tsx': 1,
    // Printable join slips: paper white, and the QR needs a white quiet zone to scan.
    'components/teacher/joinSheet/JoinSheet.tsx': 3,
  },
  borderBlack: {
    'components/teacher/TeacherPlanBadge.tsx': 1,
    'components/teacher/TeacherProUsagePromptCard.tsx': 2,
    'components/teacher/analytics/AnalyticsDashboard.tsx': 1,
    'components/teacher/assignments/AssignmentCreatorDueDate.tsx': 1,
    'components/teacher/assignments/AssignmentResultsView.tsx': 1,
    'components/teacher/assignments/AssignmentStep.tsx': 1,
    'components/teacher/assignments/AssignmentWordcraftOption.tsx': 1,
    'components/teacher/assignments/CompletionTracker.tsx': 1,
    'components/teacher/assignments/CreateFirstAssignmentCta.tsx': 1,
    'components/teacher/classroom/RosterNameEditor.tsx': 1,
    'components/teacher/classroom/RosterRemoveButton.tsx': 1,
    'components/teacher/digest/MissGapUnpluggedReteachLiveCta.tsx': 2,
    'components/teacher/digest/ProgressDigestDashboard.tsx': 1,
    'components/teacher/digest/ScheduleReteachLiveButton.tsx': 1,
    'components/teacher/digest/WeeklyEmailReport.tsx': 1,
    'components/teacher/digest/WeeklyProgressDigestCard.tsx': 1,
    'components/teacher/hq/HqLoadError.tsx': 1,
    'components/teacher/hq/StartLiveClassCta.tsx': 2,
    'components/teacher/pro/ProInlineLock.tsx': 1,
    // print: variant only.
    'components/teacher/report/WordStudentGrid.tsx': 1,
    'components/teacher/reports/AssignmentCompletionReport.tsx': 1,
    'components/teacher/reports/AssignmentProgressReport.tsx': 2,
    'components/teacher/reports/ClassProgressReport.tsx': 2,
    'components/teacher/reports/ClassroomPicker.tsx': 1,
    'components/teacher/reports/ClassroomRosterProgress.tsx': 1,
    'components/teacher/reports/GoogleClassroomGradePassback.tsx': 1,
    'components/teacher/reports/HardestWordsList.tsx': 1,
    'components/teacher/reports/MasteryHeatmap.tsx': 1,
    'components/teacher/reports/MasteryWordCards.tsx': 1,
    'components/teacher/reports/MissedPracticeAction.tsx': 3,
    'components/teacher/reports/ReportChrome.tsx': 3,
    'components/teacher/reports/ReportEmptyState.tsx': 1,
    'components/teacher/reports/ReportsNoClasses.tsx': 1,
    'components/teacher/reports/StudentPracticeAction.tsx': 2,
    'components/teacher/reports/StudentProgressReport.tsx': 2,
    'components/teacher/reports/masteryTones.tsx': 3,
  },
  offRadius: {},
  safeAreaTop: {
    // Sticky offset inside its own slot, not added padding.
    'components/education/EducationHeader.tsx': 2,
    'components/education/academyModes/AcademyChrome.tsx': 1,
    'components/education/economy/RewardChest.tsx': 1,
    'components/teacher/hq/HqProjectorSheet.tsx': 1,
    'components/teacher/nb/nbDialogStyles.ts': 1,
    'components/student/academy/AcademyHub.tsx': 2,
    'components/student/pages/AcademyPageFrame.tsx': 2,
  },
};

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') out.push(...sourceFiles(rel));
    } else if (/\.(tsx?|css)$/.test(entry.name) && !/\.(test|spec)\./.test(entry.name)) {
      out.push(rel);
    }
  }
  return out;
}

const FILES = DIRS.flatMap(sourceFiles);

describe('education neo dialect guard', () => {
  it('scans a plausible number of files', () => {
    expect(FILES.length).toBeGreaterThan(300);
  });

  for (const name of Object.keys(PATTERNS) as PatternName[]) {
    it(`adds no new ${name}`, () => {
      const over: string[] = [];
      for (const file of FILES) {
        const count = readFileSync(path.join(ROOT, file), 'utf8').match(PATTERNS[name])?.length ?? 0;
        const allowed = ALLOW[name][file] ?? 0;
        if (count > allowed) over.push(`${file}: ${count} (allowed ${allowed})`);
      }
      expect(over).toEqual([]);
    });
  }
});
